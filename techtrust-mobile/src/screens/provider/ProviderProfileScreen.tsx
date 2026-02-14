/**
 * ProviderProfileScreen - Perfil do Fornecedor
 * Informações, estatísticas, configurações
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n, languages, Language } from "../../i18n";
import api from "../../services/api";

interface ProviderStats {
  totalServices: number;
  completedThisMonth: number;
  totalEarnings: number;
  rating: number;
  totalReviews: number;
  responseRate: number;
  acceptanceRate: number;
}

export default function ProviderProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [notifications, setNotifications] = useState({
    newRequests: true,
    quoteAccepted: true,
    payments: true,
    reviews: true,
  });
  const [isAvailable, setIsAvailable] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);

  const currentLanguage =
    languages.find((l) => l.code === language) || languages[0];

  const handleLanguageSelect = async (langCode: Language) => {
    await setLanguage(langCode);
    setShowLanguageModal(false);
  };

  const handleChangeLogo = () => {
    Alert.alert(
      t.provider?.changeLogo || "Change Logo",
      t.provider?.selectImageSource || "Select image source",
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t.provider?.takePhoto || "Take Photo",
          onPress: () => {
            // In production, use expo-image-picker with camera
            Alert.alert(
              t.common?.info || "Info",
              t.provider?.cameraPlaceholder ||
                "Camera feature will be available soon",
            );
          },
        },
        {
          text: t.provider?.chooseFromGallery || "Choose from Gallery",
          onPress: () => {
            Alert.alert(
              t.common?.info || "Info",
              t.provider?.galleryPlaceholder ||
                "Gallery feature will be available soon",
            );
          },
        },
      ],
    );
  };

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get("/providers/dashboard-stats");
      const data = response.data.data || response.data;
      setStats({
        totalServices: data.totalServices || 0,
        completedThisMonth: data.completedThisMonth || 0,
        totalEarnings: data.totalEarnings || 0,
        rating: data.rating || 0,
        totalReviews: data.totalReviews || 0,
        responseRate: data.responseRate || 0,
        acceptanceRate: data.acceptanceRate || 0,
      });
    } catch (err) {
      // Keep default zeros on error
    }
  };

  const handleLogout = () => {
    Alert.alert(t.provider?.logout || 'Logout', t.profile?.logoutConfirm || 'Are you sure you want to logout?', [
      { text: t.common?.cancel || 'Cancel', style: "cancel" },
      { text: t.provider?.logout || 'Logout', style: "destructive", onPress: logout },
    ]);
  };

  const providerName =
    user?.providerProfile?.businessName ||
    user?.fullName ||
    t.provider?.provider ||
    "Provider";
  const providerType = user?.providerProfile?.businessType || "AUTO_REPAIR";
  const isVerified = user?.providerProfile?.isVerified || false;

  const getBusinessTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      AUTO_REPAIR: t.common?.autoRepair || "Auto Repair",
      TIRE_SHOP: t.common?.tireShop || "Tire Shop",
      AUTO_ELECTRIC: t.common?.autoElectric || "Auto Electric",
      BODY_SHOP: t.common?.bodyShop || "Body Shop",
      DETAILING: t.common?.detailing || "Detailing",
      TOWING: t.common?.towing || "Towing",
      MULTI_SERVICE: t.common?.multiService || "Multi-Service",
    };
    return types[type] || type;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleChangeLogo}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.avatarImage} />
              ) : (
                <MaterialCommunityIcons
                  name="store"
                  size={40}
                  color="#1976d2"
                />
              )}
            </View>
            <View style={styles.editAvatarBadge}>
              <MaterialCommunityIcons name="camera" size={14} color="#fff" />
            </View>
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={20}
                  color="#10b981"
                />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.businessName}>{providerName}</Text>
          <Text style={styles.businessType}>
            {getBusinessTypeLabel(providerType)}
          </Text>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <MaterialCommunityIcons
                  key={star}
                  name={
                    star <= Math.floor(stats?.rating || 0)
                      ? "star"
                      : "star-outline"
                  }
                  size={18}
                  color="#fbbf24"
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {stats?.rating?.toFixed(1)} • {stats?.totalReviews}{" "}
              {t.provider?.reviews || 'reviews'}
            </Text>
          </View>

          {/* Availability Toggle */}
          <View style={styles.availabilityContainer}>
            <View style={styles.availabilityInfo}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isAvailable ? "#10b981" : "#ef4444" },
                ]}
              />
              <Text style={styles.availabilityText}>
                {isAvailable ? (t.provider?.available || 'Available') : (t.provider?.unavailable || 'Unavailable')}
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: "#d1d5db", true: "#86efac" }}
              thumbColor={isAvailable ? "#10b981" : "#9ca3af"}
            />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.totalServices || 0}</Text>
            <Text style={styles.statLabel}>{t.nav?.services || 'Services'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.responseRate || 0}%</Text>
            <Text style={styles.statLabel}>{t.provider?.responseRate || 'Response Rate'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.acceptanceRate || 0}%</Text>
            <Text style={styles.statLabel}>
              {t.common?.acceptance || "Acceptance"}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#10b981" }]}>
              ${((stats?.totalEarnings || 0) / 1000).toFixed(1)}k
            </Text>
            <Text style={styles.statLabel}>{t.provider?.earnings || 'Earnings'}</Text>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.provider?.myBusiness || 'My Business'}</Text>

          <MenuItem
            icon="store-edit"
            label={t.provider?.editProfile || 'Edit Profile'}
            subtitle={t.common?.nameDescContact || "Name, description, contact"}
            onPress={() => navigation.navigate("EditProfile")}
          />
          <MenuItem
            icon="wrench"
            label={t.provider?.servicesOffered || 'Services Offered'}
            subtitle={t.common?.serviceTypes || "Service types, specialties"}
            onPress={() => navigation.navigate("Services")}
          />
          <MenuItem
            icon="clock-outline"
            label={t.provider?.workingHours || 'Working Hours'}
            subtitle={t.common?.setAvailability || "Set when you are available"}
            onPress={() => navigation.navigate("WorkingHours")}
          />
          <MenuItem
            icon="map-marker-radius"
            label={t.provider?.serviceArea || 'Service Area'}
            subtitle={`${t.common?.radius || "Radius"}: 25 km`}
            onPress={() => navigation.navigate("ServiceArea")}
          />
          <MenuItem
            icon="shield-check"
            label="Compliance & Licensing"
            subtitle="FDACS, Insurance, EPA 609"
            onPress={() => navigation.navigate("Compliance")}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.provider?.notifications || 'Notifications'}</Text>

          <NotificationItem
            icon="bell-ring"
            label={t.provider?.newRequest || 'New Request'}
            subtitle={
              t.common?.newRequestAlerts || "Alerts for requests in your area"
            }
            value={notifications.newRequests}
            onToggle={(value) =>
              setNotifications({ ...notifications, newRequests: value })
            }
          />
          <NotificationItem
            icon="check-circle"
            label={t.provider?.quoteAccepted || 'Quote Accepted'}
            subtitle={
              t.common?.quoteAcceptedAlerts || "When customer accepts a quote"
            }
            value={notifications.quoteAccepted}
            onToggle={(value) =>
              setNotifications({ ...notifications, quoteAccepted: value })
            }
          />
          <NotificationItem
            icon="cash"
            label={t.common?.payments || "Payments"}
            subtitle={t.common?.paymentConfirmation || "Payment confirmations"}
            value={notifications.payments}
            onToggle={(value) =>
              setNotifications({ ...notifications, payments: value })
            }
          />
          <NotificationItem
            icon="star"
            label={t.common?.reviews || "Reviews"}
            subtitle={t.common?.newReviewsReceived || "New reviews received"}
            value={notifications.reviews}
            onToggle={(value) =>
              setNotifications({ ...notifications, reviews: value })
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t.common?.financial || "Financial"}
          </Text>

          <MenuItem
            icon="chart-line"
            label={t.provider?.reports || 'Reports'}
            subtitle={
              t.common?.earningsPerformance || "Earnings, services, performance"
            }
            onPress={() => navigation.navigate("Reports")}
          />
          <MenuItem
            icon="bank"
            label={t.provider?.bankDetails || 'Bank Details'}
            subtitle={
              t.common?.accountForReceiving || "Account for receiving payments"
            }
            onPress={() => navigation.navigate("BankDetails")}
          />
          <MenuItem
            icon="receipt"
            label={t.provider?.paymentHistory || 'Payment History'}
            subtitle={t.common?.allPaymentsReceived || "All payments received"}
            onPress={() => navigation.navigate("PaymentHistory")}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t.common?.account || "Account"}
          </Text>

          <MenuItem
            icon="lock"
            label={t.provider?.security || 'Security'}
            subtitle={t.common?.passwordAuth || "Password, authentication"}
            onPress={() => navigation.navigate("Security")}
          />
          <MenuItem
            icon="help-circle"
            label={t.provider?.help || 'Help'}
            subtitle={t.common?.faqContact || "FAQ, contact"}
            onPress={() => navigation.navigate("Help")}
          />
          <MenuItem
            icon="file-document"
            label={t.provider?.terms || 'Terms & Policies'}
            onPress={() => navigation.navigate("TermsAndPolicies")}
          />
          <MenuItem
            icon="translate"
            label={t.settings?.language || 'Language'}
            subtitle={`${currentLanguage.flag} ${currentLanguage.nativeName}`}
            onPress={() => setShowLanguageModal(true)}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={22} color="#ef4444" />
          <Text style={styles.logoutText}>{t.provider?.logout || 'Logout'}</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>TechTrust Provider v1.0.0</Text>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.languageModalContent}>
            <Text style={styles.languageModalTitle}>
              {t.settings?.selectLanguage || 'Select Language'}
            </Text>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  language === lang.code && styles.languageOptionSelected,
                ]}
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <Text style={styles.languageOptionFlag}>{lang.flag}</Text>
                <Text
                  style={[
                    styles.languageOptionText,
                    language === lang.code && styles.languageOptionTextSelected,
                  ]}
                >
                  {lang.nativeName}
                </Text>
                {language === lang.code && (
                  <MaterialCommunityIcons
                    name="check"
                    size={20}
                    color="#1976d2"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Componente MenuItem
function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={menuStyles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={menuStyles.iconContainer}>
        <MaterialCommunityIcons name={icon as any} size={22} color="#6b7280" />
      </View>
      <View style={menuStyles.content}>
        <Text style={menuStyles.label}>{label}</Text>
        {subtitle && <Text style={menuStyles.subtitle}>{subtitle}</Text>}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" />
    </TouchableOpacity>
  );
}

const menuStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },
});

// Componente NotificationItem
function NotificationItem({
  icon,
  label,
  subtitle,
  value,
  onToggle,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <View style={notifStyles.container}>
      <View style={notifStyles.iconContainer}>
        <MaterialCommunityIcons name={icon as any} size={22} color="#6b7280" />
      </View>
      <View style={notifStyles.content}>
        <Text style={notifStyles.label}>{label}</Text>
        {subtitle && <Text style={notifStyles.subtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
        thumbColor={value ? "#1976d2" : "#9ca3af"}
      />
    </View>
  );
}

const notifStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  profileHeader: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  editAvatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1976d2",
    borderRadius: 12,
    padding: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 2,
  },
  businessName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  businessType: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  stars: {
    flexDirection: "row",
  },
  ratingText: {
    fontSize: 14,
    color: "#6b7280",
  },
  availabilityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: "100%",
  },
  availabilityInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  availabilityText: {
    fontSize: 14,
    color: "#4b5563",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 20,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  statDivider: {
    width: 1,
    height: "70%",
    backgroundColor: "#e5e7eb",
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ef4444",
  },
  version: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 20,
  },
  // Language Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  languageModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    maxWidth: 320,
  },
  languageModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 16,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  languageOptionSelected: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#1976d2",
  },
  languageOptionFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageOptionText: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  languageOptionTextSelected: {
    color: "#1976d2",
    fontWeight: "600",
  },
});
