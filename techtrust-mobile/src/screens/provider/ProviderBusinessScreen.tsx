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

const { width } = Dimensions.get("window");

interface BusinessListing {
  id: string;
  name: string;
  type: "carWash" | "partsStore";
  status: string;
  address: string;
  city: string;
  state: string;
  rating: number;
  reviews: number;
}

interface BusinessMetrics {
  profileViews: number;
  directionClicks: number;
  phoneClicks: number;
  websiteClicks: number;
  totalReviews: number;
  averageRating: number;
}

export default function ProviderBusinessScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listings, setListings] = useState<BusinessListing[]>([]);
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [activeListing, setActiveListing] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const allListings: BusinessListing[] = [];

      // Load car washes
      try {
        const cwRes = await api.get("/car-wash/provider/my-car-washes");
        const cws = cwRes.data?.data || [];
        for (const cw of cws) {
          allListings.push({
            id: cw.id,
            name: cw.businessName,
            type: "carWash",
            status: cw.status,
            address: cw.address,
            city: cw.city,
            state: cw.state,
            rating: Number(cw.averageRating) || 0,
            reviews: cw.totalReviews || 0,
          });
        }
      } catch {}

      // Load parts stores
      try {
        const psRes = await api.get("/parts-store/provider/my-stores");
        const stores = psRes.data?.data || [];
        for (const s of stores) {
          allListings.push({
            id: s.id,
            name: s.storeName,
            type: "partsStore",
            status: s.isActive ? "ACTIVE" : "PENDING",
            address: s.address || "",
            city: s.city || "",
            state: s.state || "",
            rating: Number(s.averageRating) || 0,
            reviews: s.totalReviews || 0,
          });
        }
      } catch {}

      setListings(allListings);

      // Load metrics for first listing
      if (allListings.length > 0) {
        const first = allListings[0];
        setActiveListing(first.id);
        try {
          const endpoint =
            first.type === "carWash"
              ? `/car-wash/provider/${first.id}/dashboard`
              : `/parts-store/provider/${first.id}/dashboard`;
          const mRes = await api.get(endpoint);
          if (mRes.data?.data) {
            const d = mRes.data.data;
            setMetrics({
              profileViews: d.totalProfileViews || 0,
              directionClicks: d.totalDirectionClicks || 0,
              phoneClicks: d.totalPhoneCalls || 0,
              websiteClicks: d.totalWebsiteClicks || 0,
              totalReviews: d.totalReviews || 0,
              averageRating: Number(d.averageRating) || 0,
            });
          }
        } catch {}
      }
    } catch (error) {
      console.error("Error loading business data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "#10B981";
      case "PENDING_APPROVAL":
      case "PENDING":
        return "#F59E0B";
      default:
        return "#9CA3AF";
    }
  };

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
          <Text style={styles.headerTitle}>My Business</Text>
          <Text style={styles.headerSubtitle}>
            Manage your listings and track performance
          </Text>
        </View>

        {/* Metrics Cards */}
        {metrics && (
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Ionicons name="eye-outline" size={20} color="#3B82F6" />
              <Text style={styles.metricValue}>{metrics.profileViews}</Text>
              <Text style={styles.metricLabel}>Views</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="navigate-outline" size={20} color="#10B981" />
              <Text style={styles.metricValue}>{metrics.directionClicks}</Text>
              <Text style={styles.metricLabel}>Routes</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="call-outline" size={20} color="#F59E0B" />
              <Text style={styles.metricValue}>{metrics.phoneClicks}</Text>
              <Text style={styles.metricLabel}>Calls</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="star" size={20} color="#EAB308" />
              <Text style={styles.metricValue}>
                {metrics.averageRating.toFixed(1)}
              </Text>
              <Text style={styles.metricLabel}>
                {metrics.totalReviews} reviews
              </Text>
            </View>
          </View>
        )}

        {/* Listings */}
        <Text style={styles.sectionTitle}>Your Listings</Text>

        {listings.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="store-outline"
              size={48}
              color="#D1D5DB"
            />
            <Text style={styles.emptyText}>No business listings yet</Text>
            <Text style={styles.emptySubtext}>
              Register your car wash or auto parts store on the web dashboard
            </Text>
          </View>
        ) : (
          listings.map((listing) => (
            <TouchableOpacity
              key={listing.id}
              style={[
                styles.listingCard,
                activeListing === listing.id && styles.listingCardActive,
              ]}
              onPress={() => {
                setActiveListing(listing.id);
                // Reload metrics for this listing
                const endpoint =
                  listing.type === "carWash"
                    ? `/car-wash/provider/${listing.id}/dashboard`
                    : `/parts-store/provider/${listing.id}/dashboard`;
                api
                  .get(endpoint)
                  .then((res) => {
                    if (res.data?.data) {
                      const d = res.data.data;
                      setMetrics({
                        profileViews: d.totalProfileViews || 0,
                        directionClicks: d.totalDirectionClicks || 0,
                        phoneClicks: d.totalPhoneCalls || 0,
                        websiteClicks: d.totalWebsiteClicks || 0,
                        totalReviews: d.totalReviews || 0,
                        averageRating: Number(d.averageRating) || 0,
                      });
                    }
                  })
                  .catch(() => {});
              }}
            >
              <View style={styles.listingHeader}>
                <View style={styles.listingTypeContainer}>
                  <MaterialCommunityIcons
                    name={
                      listing.type === "carWash" ? "car-wash" : "car-cog"
                    }
                    size={20}
                    color={
                      listing.type === "carWash" ? "#3B82F6" : "#F97316"
                    }
                  />
                  <Text style={styles.listingType}>
                    {listing.type === "carWash" ? "Car Wash" : "Auto Parts"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor(listing.status) + "20" },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: statusColor(listing.status) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusColor(listing.status) },
                    ]}
                  >
                    {listing.status.replace(/_/g, " ")}
                  </Text>
                </View>
              </View>

              <Text style={styles.listingName}>{listing.name}</Text>

              <View style={styles.listingInfo}>
                <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                <Text style={styles.listingAddress}>
                  {listing.city}, {listing.state}
                </Text>
              </View>

              <View style={styles.listingFooter}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#EAB308" />
                  <Text style={styles.ratingText}>
                    {listing.rating.toFixed(1)}
                  </Text>
                  <Text style={styles.reviewCount}>
                    ({listing.reviews})
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              Alert.alert(
                "Web Dashboard",
                "For full business management, visit provider.techtrustautosolutions.com on your browser."
              )
            }
          >
            <MaterialCommunityIcons
              name="monitor-dashboard"
              size={24}
              color="#3B82F6"
            />
            <Text style={styles.actionText}>Full Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("ProviderReviews")}
          >
            <Ionicons name="star-outline" size={24} color="#F59E0B" />
            <Text style={styles.actionText}>Reviews</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Reports")}
          >
            <Ionicons name="bar-chart-outline" size={24} color="#10B981" />
            <Text style={styles.actionText}>Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <Ionicons name="settings-outline" size={24} color="#6B7280" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Plan CTA */}
        <View style={styles.planCard}>
          <View style={styles.planCardContent}>
            <Text style={styles.planTitle}>Listing Plan</Text>
            <Text style={styles.planDesc}>
              Upgrade your plan on the web dashboard for featured listing, priority search, and advanced analytics.
            </Text>
          </View>
          <MaterialCommunityIcons
            name="crown"
            size={32}
            color="#F59E0B"
          />
        </View>
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
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
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
  },
  listingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  listingCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  listingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  listingTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listingType: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  listingName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  listingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  listingAddress: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  listingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  reviewCount: {
    fontSize: 12,
    color: "#9CA3AF",
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
