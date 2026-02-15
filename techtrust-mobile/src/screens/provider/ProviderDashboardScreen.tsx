/**
 * ProviderDashboardScreen - Dashboard do Fornecedor
 * Estatísticas, pedidos pendentes, atividade recente
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
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
}

export default function ProviderDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t, formatCurrency } = useI18n();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Buscar dados reais da API
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
      console.error("Erro ao carregar dashboard:", error);
      // Dados vazios em caso de erro
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
    user?.providerProfile?.businessName || user?.fullName || "Fornecedor";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Image source={logos.noText} style={styles.headerLogo} />
            <View style={styles.headerText}>
              <Text style={styles.greeting}>
                {t.provider?.hello || "Hello"}, {providerName}! 👋
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
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>{" "}
          {/* Rating - Clickable to view reviews */}
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
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatCard
              icon="clipboard-text-outline"
              iconBg="#dbeafe"
              iconColor="#3b82f6"
              label={t.provider?.requests || "Requests"}
              value={stats?.pendingRequests || 0}
            />
            <StatCard
              icon="progress-wrench"
              iconBg="#fef3c7"
              iconColor="#f59e0b"
              label={t.provider?.inProgress || "In Progress"}
              value={stats?.activeWorkOrders || 0}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              icon="check-circle-outline"
              iconBg="#d1fae5"
              iconColor="#10b981"
              label={t.provider?.completed || "Completed"}
              value={stats?.completedThisMonth || 0}
            />
            <StatCard
              icon="cash"
              iconBg="#d1fae5"
              iconColor="#10b981"
              label={t.provider?.earnings || "Earnings (month)"}
              value={formatCurrency(Number(stats?.earningsThisMonth || 0))}
            />
          </View>
        </View>

        {/* Pending Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              🔔 {t.provider?.pendingRequests || "Pending Requests"}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("ProviderRequests")}
            >
              <Text style={styles.seeAll}>
                {t.provider?.seeAll || "See all"}
              </Text>
            </TouchableOpacity>
          </View>

          {pendingRequests.map((request) => (
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
                    <Text style={styles.requestTitle}>{request.title}</Text>
                    {request.isUrgent && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentText}>
                          🚨 {t.provider?.urgent || "Urgent"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.requestVehicle}>{request.vehicle}</Text>
                </View>
                <Text style={styles.requestTime}>{request.timeAgo}</Text>
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
                    {request.location ? `, ${request.location}` : ''}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#9ca3af"
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📊 {t.provider?.recentActivity || "Recent Activity"}
          </Text>

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

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ⚡ {t.provider?.quickActions || "Quick Actions"}
          </Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("ProviderRequests")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#dbeafe" }]}>
                <MaterialCommunityIcons
                  name="clipboard-list"
                  size={24}
                  color="#3b82f6"
                />
              </View>
              <Text style={styles.actionText}>
                {t.provider?.viewRequests || "View Requests"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("ProviderWorkOrders")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#fef3c7" }]}>
                <MaterialCommunityIcons
                  name="toolbox"
                  size={24}
                  color="#f59e0b"
                />
              </View>
              <Text style={styles.actionText}>
                {t.provider?.myServices || "My Services"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("ProviderQuotes")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#ede9fe" }]}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={24}
                  color="#8b5cf6"
                />
              </View>
              <Text style={styles.actionText}>
                {t.provider?.quotes || "Quotes"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("ChatList")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#dcfce7" }]}>
                <MaterialCommunityIcons
                  name="chat"
                  size={24}
                  color="#16a34a"
                />
              </View>
              <Text style={styles.actionText}>
                {"Messages"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("ProviderProfile")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#f3f4f6" }]}>
                <MaterialCommunityIcons name="cog" size={24} color="#6b7280" />
              </View>
              <Text style={styles.actionText}>
                {t.provider?.settings || "Settings"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("Appointments")}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#dbeafe" }]}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={24}
                  color="#2563eb"
                />
              </View>
              <Text style={styles.actionText}>
                {t.fdacs?.appointments || "Appointments"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                navigation.navigate("ProviderWorkOrders", {
                  screen: "RepairInvoices",
                })
              }
            >
              <View style={[styles.actionIcon, { backgroundColor: "#fef3c7" }]}>
                <MaterialCommunityIcons
                  name="file-document-check"
                  size={24}
                  color="#d97706"
                />
              </View>
              <Text style={styles.actionText}>
                {t.fdacs?.repairInvoices || "Invoices"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Componente StatCard
function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={24}
          color={iconColor}
        />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
