/**
 * ProviderDashboardScreen - Provider Dashboard (Part 4 UX Overhaul)
 * Temporal greeting, onboarding checklist, enhanced request cards,
 * high-value quick actions, multi-type business support
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuth } from "../../contexts/AuthContext";
import { logos } from "../../constants/images";
import { useI18n } from "../../i18n";

const { width } = Dimensions.get("window");

// Tipos
interface Stats {
  pendingRequests: number;
  activeWorkOrders: number;
  completedThisMonth: number;
  earningsThisMonth: number;
  rating: number;
  totalReviews: number;
}

interface RecentActivity {
  id: string;
  type:
    | "new_request"
    | "quote_accepted"
    | "service_completed"
    | "payment_received";
  title: string;
  description: string;
  time: string;
  amount?: number;
}

interface PendingRequest {
  id: string;
  title: string;
  vehicle: string;
  location: string;
  serviceLocationType?: string;
  serviceAddress?: string;
  timeAgo: string;
  isUrgent: boolean;
  distanceMiles?: number;
  quotesCount?: number;
  serviceType?: string;
}

/** Get temporal greeting based on hour of day */
const getTemporalGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

/** Check if provider is "new" (no completed services, rating = 0) */
const isNewProvider = (stats: Stats | null): boolean => {
  if (!stats) return true;
  return stats.completedThisMonth === 0 && stats.rating === 0 && stats.totalReviews === 0;
};

export default function ProviderDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t, formatCurrency } = useI18n();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  const businessType = user?.providerProfile?.businessTypeCat || 'REPAIR_SHOP';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, activityData, requestsData] = await Promise.all([
        import("../../services/dashboard.service").then((m) =>
          m.getProviderDashboardStats(),
        ),
        import("../../services/dashboard.service").then((m) =>
          m.getProviderRecentActivity(),
        ),
        import("../../services/dashboard.service").then((m) =>
          m.getProviderPendingRequests(),
        ),
      ]);

      setStats(statsData);
      setRecentActivity(activityData);
      setPendingRequests(requestsData);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      setStats({
        pendingRequests: 0,
        activeWorkOrders: 0,
        completedThisMonth: 0,
        earningsThisMonth: 0,
        rating: 0,
        totalReviews: 0,
      });
      setRecentActivity([]);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "new_request":
        return { name: "clipboard-list", color: "#3b82f6", bg: "#dbeafe" };
      case "quote_accepted":
        return { name: "check-circle", color: "#10b981", bg: "#d1fae5" };
      case "service_completed":
        return { name: "star", color: "#8b5cf6", bg: "#ede9fe" };
      case "payment_received":
        return { name: "cash", color: "#10b981", bg: "#d1fae5" };
      default:
        return { name: "bell", color: "#6b7280", bg: "#f3f4f6" };
    }
  };

  const providerName =
    user?.providerProfile?.businessName || user?.fullName || "Provider";

  const showNewProvider = isNewProvider(stats);

  // Onboarding checklist items
  const onboardingChecklist = [
    {
      id: 'profile',
      label: t.provider?.setupProfile || 'Complete your business profile',
      icon: 'account-edit' as const,
      done: !!(user?.providerProfile?.businessName && user?.providerProfile?.city),
      action: () => navigation.navigate('ProviderProfile'),
    },
    {
      id: 'services',
      label: t.provider?.addServices || 'Add your services & pricing',
      icon: 'toolbox' as const,
      done: Array.isArray(user?.providerProfile?.servicesOffered) && (user.providerProfile.servicesOffered as any[]).length > 0,
      action: () => navigation.navigate('ProviderWorkOrders'),
    },
    {
      id: 'hours',
      label: t.provider?.setHours || 'Set your working hours',
      icon: 'clock-outline' as const,
      done: !!(user?.providerProfile?.workingHours),
      action: () => navigation.navigate('ProviderProfile'),
    },
    {
      id: 'area',
      label: t.provider?.defineArea || 'Define your service area',
      icon: 'map-marker-radius' as const,
      done: !!(user?.providerProfile?.serviceRadiusKm),
      action: () => navigation.navigate('ProviderProfile'),
    },
  ];

  const completedSteps = onboardingChecklist.filter(c => c.done).length;
  const totalSteps = onboardingChecklist.length;

  // Quick actions based on business type - only high-value, non-tab-bar actions
  const getQuickActions = () => {
    const common = [
      {
        icon: 'calendar-clock',
        bg: '#dbeafe',
        color: '#2563eb',
        label: t.fdacs?.appointments || 'Appointments',
        action: () => navigation.navigate('Appointments'),
      },
      {
        icon: 'file-document-check',
        bg: '#fef3c7',
        color: '#d97706',
        label: t.fdacs?.repairInvoices || 'Invoices',
        action: () => navigation.navigate('ProviderWorkOrders', { screen: 'RepairInvoices' }),
      },
      {
        icon: 'chart-line',
        bg: '#ede9fe',
        color: '#7c3aed',
        label: t.provider?.analytics || 'Analytics',
        action: () => navigation.navigate('ProviderProfile'),
      },
      {
        icon: 'star-outline',
        bg: '#fef3c7',
        color: '#f59e0b',
        label: t.provider?.reviewsTitle || 'Reviews',
        action: () => navigation.navigate('ProviderReviews'),
      },
    ];

    if (businessType === 'CAR_WASH' || businessType === 'BOTH') {
      common.splice(2, 0, {
        icon: 'car-wash',
        bg: '#dbeafe',
        color: '#3b82f6',
        label: t.provider?.carWashQueue || 'Wash Queue',
        action: () => navigation.navigate('ProviderWorkOrders'),
      });
    }

    return common;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header — Temporal Greeting, no emoji */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Image source={logos.noText} style={styles.headerLogo} />
            <View style={styles.headerText}>
              <Text style={styles.greeting}>
                {getTemporalGreeting()}, {providerName}
              </Text>
              <Text style={styles.subGreeting}>
                {stats?.pendingRequests
                  ? `${stats.pendingRequests} ${t.provider?.newRequestsWaiting || "new requests waiting"}`
                  : t.provider?.allCaughtUp || "All caught up!"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => navigation.navigate("Notifications")}
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={24}
                color="#fff"
              />
              {(stats?.pendingRequests || 0) > 0 && <View style={styles.notificationBadge} />}
            </TouchableOpacity>
          </View>

          {/* Rating — only show when provider has reviews */}
          {!showNewProvider && (
            <TouchableOpacity
              style={styles.ratingContainer}
              onPress={() => navigation.navigate("ProviderReviews")}
            >
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialCommunityIcons
                    key={star}
                    name={
                      star <= Math.floor(Number(stats?.rating || 0))
                        ? "star"
                        : "star-outline"
                    }
                    size={16}
                    color="#fbbf24"
                  />
                ))}
              </View>
              <Text style={styles.ratingText}>
                {Number(stats?.rating || 0).toFixed(1)} • {stats?.totalReviews}{" "}
                {t.provider?.reviews || "reviews"}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={16}
                color="#fff"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          )}

          {/* Business Type Badge */}
          <View style={styles.businessBadgeRow}>
            {(businessType === 'REPAIR_SHOP' || businessType === 'BOTH') && (
              <View style={styles.businessBadge}>
                <MaterialCommunityIcons name="wrench" size={12} color="#fff" />
                <Text style={styles.businessBadgeText}>{t.provider?.repairShop || 'Repair Shop'}</Text>
              </View>
            )}
            {(businessType === 'CAR_WASH' || businessType === 'BOTH') && (
              <View style={[styles.businessBadge, { backgroundColor: 'rgba(59,130,246,0.3)' }]}>
                <MaterialCommunityIcons name="car-wash" size={12} color="#fff" />
                <Text style={styles.businessBadgeText}>{t.provider?.carWash || 'Car Wash'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Onboarding Checklist — only for new providers */}
        {showNewProvider && (
          <View style={styles.onboardingContainer}>
            <View style={styles.onboardingHeader}>
              <MaterialCommunityIcons name="rocket-launch" size={24} color="#1976d2" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.onboardingTitle}>
                  {t.provider?.getStarted || 'Get Started'}
                </Text>
                <Text style={styles.onboardingSubtitle}>
                  {t.provider?.completeSetup || `Complete your setup (${completedSteps}/${totalSteps})`}
                </Text>
              </View>
            </View>
            {/* Progress bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${(completedSteps / totalSteps) * 100}%` }]} />
            </View>
            {onboardingChecklist.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.checklistItem}
                onPress={item.action}
              >
                <MaterialCommunityIcons
                  name={item.done ? 'check-circle' : 'circle-outline'}
                  size={22}
                  color={item.done ? '#10b981' : '#d1d5db'}
                />
                <Text style={[styles.checklistLabel, item.done && styles.checklistLabelDone]}>
                  {item.label}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("ProviderRequests")}>
              <View style={[styles.statIcon, { backgroundColor: "#dbeafe" }]}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={24} color="#3b82f6" />
              </View>
              <Text style={styles.statValue}>{stats?.pendingRequests || 0}</Text>
              <Text style={styles.statLabel}>{t.provider?.requests || "Requests"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("ProviderWorkOrders")}>
              <View style={[styles.statIcon, { backgroundColor: "#fef3c7" }]}>
                <MaterialCommunityIcons name="progress-wrench" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.statValue}>{stats?.activeWorkOrders || 0}</Text>
              <Text style={styles.statLabel}>{t.provider?.inProgress || "In Progress"}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: "#d1fae5" }]}>
                <MaterialCommunityIcons name="check-circle-outline" size={24} color="#10b981" />
              </View>
              <Text style={styles.statValue}>{stats?.completedThisMonth || 0}</Text>
              <Text style={styles.statLabel}>{t.provider?.completed || "Completed"}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: "#d1fae5" }]}>
                <MaterialCommunityIcons name="cash" size={24} color="#10b981" />
              </View>
              <Text style={styles.statValue}>{formatCurrency(Number(stats?.earningsThisMonth || 0))}</Text>
              <Text style={styles.statLabel}>{t.provider?.earnings || "Earnings (month)"}</Text>
            </View>
          </View>
        </View>

        {/* Pending Requests — Enhanced Cards with Send Quote / Decline */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t.provider?.pendingRequests || "Pending Requests"}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("ProviderRequests")}
            >
              <Text style={styles.seeAll}>
                {t.provider?.seeAll || "See all"}
              </Text>
            </TouchableOpacity>
          </View>

          {pendingRequests.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>
                {t.provider?.noRequestsYet || 'No pending requests'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t.provider?.noRequestsDesc || 'New service requests from customers in your area will appear here.'}
              </Text>
            </View>
          )}

          {pendingRequests.slice(0, 3).map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              onPress={() =>
                navigation.navigate("ProviderRequests", {
                  screen: "ProviderRequestDetails",
                  params: { requestId: request.id },
                })
              }
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestInfo}>
                  <View style={styles.requestTitleRow}>
                    <Text style={styles.requestTitle} numberOfLines={1}>{request.title}</Text>
                    {request.isUrgent && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentText}>
                          {t.provider?.urgent || "Urgent"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.requestVehicle}>{request.vehicle}</Text>
                </View>
                <Text style={styles.requestTime}>{request.timeAgo}</Text>
              </View>

              {/* Distance + Quotes info */}
              <View style={styles.requestMeta}>
                {request.distanceMiles !== undefined && (
                  <View style={styles.metaChip}>
                    <MaterialCommunityIcons name="map-marker-distance" size={13} color="#6b7280" />
                    <Text style={styles.metaChipText}>{request.distanceMiles.toFixed(1)} mi</Text>
                  </View>
                )}
                {request.quotesCount !== undefined && (
                  <View style={styles.metaChip}>
                    <MaterialCommunityIcons name="file-document-outline" size={13} color="#6b7280" />
                    <Text style={styles.metaChipText}>{request.quotesCount} {t.provider?.quotesSubmitted || 'quotes'}</Text>
                  </View>
                )}
                {request.serviceType && (
                  <View style={[styles.metaChip, { backgroundColor: '#ede9fe' }]}>
                    <Text style={[styles.metaChipText, { color: '#7c3aed' }]}>{request.serviceType}</Text>
                  </View>
                )}
              </View>

              <View style={styles.requestFooter}>
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons
                    name={request.serviceLocationType === 'MOBILE' ? 'home-map-marker' : request.serviceLocationType === 'REMOTE' ? 'car-emergency' : 'store'}
                    size={14}
                    color={request.serviceLocationType === 'MOBILE' ? '#10b981' : request.serviceLocationType === 'REMOTE' ? '#f59e0b' : '#1976d2'}
                  />
                  <Text style={styles.locationText}>
                    {request.serviceLocationType === 'MOBILE'
                      ? (request.serviceAddress || t.provider?.mobileService || 'Mobile Service')
                      : request.serviceLocationType === 'REMOTE'
                        ? (request.serviceAddress || t.provider?.roadsideAssist || 'Roadside')
                        : (t.provider?.atShop || 'At Shop')}
                  </Text>
                </View>
                {/* Quick action buttons */}
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.sendQuoteBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      navigation.navigate("ProviderRequests", {
                        screen: "ProviderRequestDetails",
                        params: { requestId: request.id, action: 'quote' },
                      });
                    }}
                  >
                    <MaterialCommunityIcons name="send" size={14} color="#fff" />
                    <Text style={styles.sendQuoteBtnText}>{t.provider?.sendQuote || 'Quote'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t.provider?.recentActivity || "Recent Activity"}
          </Text>

          {recentActivity.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="history" size={40} color="#d1d5db" />
              <Text style={styles.emptySubtitle}>
                {t.provider?.noActivityYet || 'Your activity feed will appear here as you process requests.'}
              </Text>
            </View>
          )}

          {recentActivity.map((activity) => {
            const iconInfo = getActivityIcon(activity.type);
            return (
              <View key={activity.id} style={styles.activityItem}>
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: iconInfo.bg },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={iconInfo.name as any}
                    size={20}
                    color={iconInfo.color}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityDescription}>
                    {activity.description}
                  </Text>
                </View>
                <View style={styles.activityRight}>
                  {activity.amount && (
                    <Text style={styles.activityAmount}>
                      +${Number(activity.amount).toFixed(2)}
                    </Text>
                  )}
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Quick Actions — only high-value, non-redundant with tab bar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t.provider?.quickActions || "Quick Actions"}
          </Text>
          <View style={styles.actionsGrid}>
            {getQuickActions().map((qa, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.actionButton}
                onPress={qa.action}
              >
                <View style={[styles.actionIcon, { backgroundColor: qa.bg }]}>
                  <MaterialCommunityIcons
                    name={qa.icon as any}
                    size={24}
                    color={qa.color}
                  />
                </View>
                <Text style={styles.actionText}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#1976d2",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 25,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#fff",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
    borderWidth: 2,
    borderColor: "#1976d2",
  },
  businessBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  businessBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  onboardingContainer: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  onboardingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  onboardingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
  },
  onboardingSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1976d2',
    borderRadius: 3,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 10,
  },
  checklistLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  checklistLabelDone: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
  requestMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 6,
  },
  sendQuoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1976d2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  sendQuoteBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  ratingStars: {
    flexDirection: "row",
    marginRight: 8,
  },
  ratingText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "500",
  },
  statsContainer: {
    padding: 16,
    marginTop: -15,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#6b7280",
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    color: "#1976d2",
    fontWeight: "600",
  },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  urgentBadge: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  urgentText: {
    fontSize: 11,
    color: "#dc2626",
    fontWeight: "600",
  },
  requestVehicle: {
    fontSize: 14,
    color: "#6b7280",
  },
  requestTime: {
    fontSize: 12,
    color: "#9ca3af",
  },
  requestFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: "#6b7280",
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 13,
    color: "#6b7280",
  },
  activityRight: {
    alignItems: "flex-end",
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10b981",
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: "#9ca3af",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionButton: {
    width: (width - 56) / 2,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
});
