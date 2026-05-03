import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import { colors } from "../../constants/theme";
import { log } from "../../utils/logger";
import { useI18n } from "../../i18n";

const { width } = Dimensions.get("window");

function businessTypeLabel(raw: string, t: { common: Record<string, string> }): string {
  const norm = (raw || "").toUpperCase().replace(/\s+/g, "_");
  const c = t.common;
  switch (norm) {
    case "AUTO_REPAIR":
      return c.autoRepair || "Auto Repair Shop";
    case "TIRE_SHOP":
      return c.tireShop || "Tire Shop";
    case "AUTO_ELECTRIC":
      return c.autoElectric || "Auto Electric";
    case "BODY_SHOP":
      return c.bodyShop || "Body Shop";
    case "TOWING":
      return c.towing || "Towing";
    case "MULTI_SERVICE":
      return c.multiService || "Multi-Service";
    default:
      if (raw && !raw.includes("_")) return raw;
      return raw.replace(/_/g, " ") || c.autoRepair || "Auto Repair Shop";
  }
}

interface ProviderProfile {
  businessName: string;
  businessType: string;
  city: string;
  state: string;
  phone: string;
  averageRating: number;
  totalReviews: number;
  isVerified: boolean;
  mobileService: boolean;
  roadsideAssistance: boolean;
  serviceRadiusKm: number;
  completedServices: number;
  pendingRequests: number;
}

export default function ProviderBusinessScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [profileRes, statsRes] = await Promise.allSettled([
        api.get("/providers/profile"),
        api.get("/providers/stats").catch(() => ({ data: null })),
      ]);

      const p =
        profileRes.status === "fulfilled"
          ? profileRes.value.data?.data ?? profileRes.value.data ?? {}
          : {};

      const s =
        statsRes.status === "fulfilled" && (statsRes.value as any).data
          ? (statsRes.value as any).data?.data ?? (statsRes.value as any).data
          : {};

      setProfile({
        businessName:
          p.businessName ||
          p.name ||
          user?.fullName ||
          t.providerBusiness?.defaultShopName ||
          "My Shop",
        businessType: p.businessType || "AUTO_REPAIR",
        city: p.city || "",
        state: p.state || "",
        phone: p.phone || "",
        averageRating: Number(p.averageRating) || 0,
        totalReviews: Number(p.totalReviews) || 0,
        isVerified: !!p.isVerified || !!p.verifiedAt,
        mobileService: !!p.mobileService,
        roadsideAssistance: !!p.roadsideAssistance,
        serviceRadiusKm: Number(p.serviceRadiusKm) || 0,
        completedServices: Number(s.completedServices ?? s.totalCompleted) || 0,
        pendingRequests: Number(s.pendingRequests ?? s.totalPending) || 0,
      });
    } catch (error) {
      log.error("Error loading business data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const radiusMiles = profile
    ? Math.round(profile.serviceRadiusKm / 1.60934)
    : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t.provider?.myBusiness || "My Business"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t.providerBusiness?.subtitle ||
              "Manage your profile and track performance"}
          </Text>
        </View>

        {/* Stats cards */}
        {profile && (
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Ionicons name="star" size={20} color="#EAB308" />
              <Text style={styles.metricValue}>
                {profile.averageRating > 0
                  ? profile.averageRating.toFixed(1)
                  : "—"}
              </Text>
              <Text style={styles.metricLabel}>
                {profile.totalReviews}{" "}
                {t.provider?.reviews || "reviews"}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
              <Text style={styles.metricValue}>{profile.completedServices}</Text>
              <Text style={styles.metricLabel}>
                {t.provider?.completed || "Completed"}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
              <Text style={styles.metricValue}>{profile.pendingRequests}</Text>
              <Text style={styles.metricLabel}>
                {t.common?.pending || "Pending"}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="navigate-circle-outline" size={20} color="#3B82F6" />
              <Text style={styles.metricValue}>
                {radiusMiles > 0
                  ? `${radiusMiles}${t.providerBusiness?.radiusMiSuffix || "mi"}`
                  : "—"}
              </Text>
              <Text style={styles.metricLabel}>
                {t.common?.radius || "Radius"}
              </Text>
            </View>
          </View>
        )}

        {/* Business Profile card */}
        <Text style={styles.sectionTitle}>
          {t.providerBusiness?.businessProfileSection || "Your Business Profile"}
        </Text>

        {!profile?.businessName ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="wrench-outline"
              size={48}
              color="#D1D5DB"
            />
            <Text style={styles.emptyText}>
              {t.providerBusiness?.emptyTitle || "Complete your profile"}
            </Text>
            <Text style={styles.emptySubtext}>
              {t.providerBusiness?.emptySubtitle ||
                "Add your shop details so customers can find and contact you"}
            </Text>
            <TouchableOpacity
              style={styles.setupButton}
              onPress={() => navigation.navigate("EditProfile")}
            >
              <Text style={styles.setupButtonText}>
                {t.providerBusiness?.setUpProfile || "Set Up Profile"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.profileCard}>
            {/* Business name + verification badge */}
            <View style={styles.profileHeader}>
              <View style={styles.profileIconContainer}>
                <MaterialCommunityIcons
                  name="car-wrench"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{profile.businessName}</Text>
                <Text style={styles.profileType}>
                  {businessTypeLabel(profile.businessType, t)}
                </Text>
              </View>
              {profile.isVerified && (
                <View style={styles.verifiedBadge}>
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>

            {/* Location */}
            {(profile.city || profile.state) && (
              <View style={styles.profileInfoRow}>
                <Ionicons name="location-outline" size={15} color="#9CA3AF" />
                <Text style={styles.profileInfoText}>
                  {[profile.city, profile.state].filter(Boolean).join(", ")}
                </Text>
              </View>
            )}

            {/* Phone */}
            {profile.phone ? (
              <View style={styles.profileInfoRow}>
                <Ionicons name="call-outline" size={15} color="#9CA3AF" />
                <Text style={styles.profileInfoText}>{profile.phone}</Text>
              </View>
            ) : null}

            {/* Services tags */}
            <View style={styles.tagsRow}>
              {profile.mobileService && (
                <View style={styles.tag}>
                  <MaterialCommunityIcons name="car-arrow-right" size={13} color="#2B5EA7" />
                  <Text style={styles.tagText}>
                    {t.provider?.mobileService || "Mobile Service"}
                  </Text>
                </View>
              )}
              {profile.roadsideAssistance && (
                <View style={[styles.tag, { backgroundColor: "#FEF2F2" }]}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#DC2626" />
                  <Text style={[styles.tagText, { color: "#DC2626" }]}>
                    {t.sos?.titleRoadsideSos || "Roadside SOS"}
                  </Text>
                </View>
              )}
              {radiusMiles > 0 && (
                <View style={[styles.tag, { backgroundColor: "#F0FDF4" }]}>
                  <MaterialCommunityIcons name="map-marker-radius-outline" size={13} color="#16A34A" />
                  <Text style={[styles.tagText, { color: "#16A34A" }]}>
                    {(t.providerBusiness?.radiusTagWithMiles || "{{miles}} mi radius").replace(
                      "{{miles}}",
                      String(radiusMiles),
                    )}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => navigation.navigate("EditProfile")}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={styles.editProfileText}>
                {t.provider?.editProfile || "Edit Profile"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>
          {t.provider?.quickActions || "Quick Actions"}
        </Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              Alert.alert(
                t.provider?.webDashboardTitle || "Web Dashboard",
                t.provider?.webDashboardMessage ||
                  "For full business management, visit provider.techtrustautosolutions.com on your browser.",
              )
            }
          >
            <MaterialCommunityIcons
              name="monitor-dashboard"
              size={24}
              color="#3B82F6"
            />
            <Text style={styles.actionText}>
              {t.providerBusiness?.fullDashboard || "Full Dashboard"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("ProviderReviews")}
          >
            <Ionicons name="star-outline" size={24} color="#F59E0B" />
            <Text style={styles.actionText}>
              {t.common?.reviews || "Reviews"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Reports")}
          >
            <Ionicons name="bar-chart-outline" size={24} color="#10B981" />
            <Text style={styles.actionText}>
              {t.provider?.reports || "Reports"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <Ionicons name="settings-outline" size={24} color="#6B7280" />
            <Text style={styles.actionText}>
              {t.provider?.settings || "Settings"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Compliance / Verification CTA */}
        {!profile?.isVerified && (
          <TouchableOpacity
            style={styles.planCard}
            onPress={() => navigation.navigate("Compliance")}
          >
            <View style={styles.planCardContent}>
              <Text style={styles.planTitle}>
                {t.providerBusiness?.getVerifiedTitle || "Get Verified"}
              </Text>
              <Text style={styles.planDesc}>
                {t.providerBusiness?.getVerifiedDesc ||
                  "Upload your license and insurance to earn the Verified Business badge and rank higher in customer searches."}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={32}
              color="#F59E0B"
            />
          </TouchableOpacity>
        )}

        {profile?.isVerified && (
          <View style={[styles.planCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <View style={styles.planCardContent}>
              <Text style={[styles.planTitle, { color: "#166534" }]}>
                {t.providerBusiness?.verifiedBusinessTitle || "Verified Business"}
              </Text>
              <Text style={[styles.planDesc, { color: "#15803D" }]}>
                {t.providerBusiness?.verifiedBusinessDesc ||
                  "Your business is verified. Customers see your Verified badge in search results, boosting trust and acceptance rates."}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="shield-check"
              size={32}
              color="#16A34A"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 8,
    padding: 4,
    alignSelf: "flex-start",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  setupButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  setupButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  profileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  profileType: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  profileInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  profileInfoText: {
    fontSize: 13,
    color: "#6B7280",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginBottom: 14,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#2B5EA7",
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary + "40",
    backgroundColor: colors.primary + "08",
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    width: (width - 42) / 2,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  planCard: {
    flexDirection: "row",
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  planCardContent: {
    flex: 1,
    marginRight: 12,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 12,
    color: "#B45309",
    lineHeight: 18,
  },
});
