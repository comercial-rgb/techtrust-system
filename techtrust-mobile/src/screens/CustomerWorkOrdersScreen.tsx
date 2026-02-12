/**
 * CustomerWorkOrdersScreen - Customer Services List
 * Includes both Service Requests (open/receiving quotes) and Work Orders
 * Modern design with visual timeline
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { FadeInView, ScalePress } from "../components/Animated";
import { WorkOrderSkeleton } from "../components/Skeleton";
import { useI18n } from "../i18n";
import {
  getServiceRequests,
  getWorkOrders,
} from "../services/dashboard.service";

// Solicitações abertas (recebendo orçamentos)
interface ServiceRequest {
  id: string;
  requestNumber: string;
  title: string;
  status: "SEARCHING" | "QUOTES_RECEIVED";
  quotesCount: number;
  createdAt: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
}

interface WorkOrder {
  id: string;
  orderNumber: string;
  status: "PENDING_START" | "IN_PROGRESS" | "AWAITING_PAYMENT" | "COMPLETED";
  title: string;
  finalAmount: number;
  createdAt: string;
  completedAt?: string;
  provider: {
    businessName: string;
    rating: number;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
}

export default function CustomerWorkOrdersScreen({ navigation }: any) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"requests" | "orders">("requests");
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Reload data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function loadData() {
    try {
      // Buscar dados reais do backend
      const [serviceRequestsData, workOrdersData] = await Promise.all([
        getServiceRequests(),
        getWorkOrders(),
      ]);

      // Mapear service requests para formato esperado
      setServiceRequests(
        serviceRequestsData.map((req) => ({
          id: req.id,
          requestNumber: req.requestNumber || `SR-${req.id.substring(0, 4)}`,
          title: req.title,
          status: req.status as "SEARCHING" | "QUOTES_RECEIVED",
          quotesCount: req.quotesCount || 0,
          createdAt: req.createdAt,
          vehicle: req.vehicle,
        })),
      );

      // Mapear work orders para formato esperado
      setWorkOrders(
        workOrdersData.map((wo: any) => ({
          id: wo.id,
          orderNumber: wo.orderNumber || `WO-${wo.id.substring(0, 4)}`,
          status: wo.status as
            | "PENDING_START"
            | "IN_PROGRESS"
            | "AWAITING_PAYMENT"
            | "COMPLETED",
          title: wo.title || wo.description || "Service",
          finalAmount: wo.finalAmount || wo.amount || 0,
          createdAt: wo.createdAt,
          completedAt: wo.completedAt,
          provider: wo.provider || { businessName: "Provider", rating: 0 },
          vehicle: wo.vehicle || { make: "N/A", model: "N/A", year: 0 },
        })),
      );
    } catch (error) {
      console.error("Error loading services:", error);
      setServiceRequests([]);
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const getRequestStatusInfo = (status: string) => {
    switch (status) {
      case "SEARCHING":
      case "SEARCHING_PROVIDERS":
      case "DRAFT":
        return {
          label: t.serviceRequest?.searching || "Searching",
          color: "#3b82f6",
          bgColor: "#dbeafe",
          icon: "search",
        };
      case "QUOTES_RECEIVED":
      case "QUOTE_ACCEPTED":
        return {
          label: t.serviceRequest?.quotesReceived || "Quotes Received",
          color: "#f59e0b",
          bgColor: "#fef3c7",
          icon: "pricetag",
        };
      case "SCHEDULED":
        return {
          label: t.workOrder?.scheduled || "Scheduled",
          color: "#8b5cf6",
          bgColor: "#ede9fe",
          icon: "calendar",
        };
      case "IN_PROGRESS":
        return {
          label: t.workOrder?.inProgress || "In Progress",
          color: "#3b82f6",
          bgColor: "#dbeafe",
          icon: "construct",
        };
      case "COMPLETED":
        return {
          label: t.workOrder?.completed || "Completed",
          color: "#10b981",
          bgColor: "#d1fae5",
          icon: "checkmark-circle",
        };
      case "CANCELLED":
        return {
          label: t.common?.cancelled || "Cancelled",
          color: "#ef4444",
          bgColor: "#fee2e2",
          icon: "close-circle",
        };
      default:
        return {
          label: status,
          color: "#6b7280",
          bgColor: "#f3f4f6",
          icon: "ellipse",
        };
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "PENDING_START":
        return {
          label: t.workOrder?.pendingStart || "Pending Start",
          color: "#f59e0b",
          bgColor: "#fef3c7",
          icon: "time",
        };
      case "IN_PROGRESS":
        return {
          label: t.workOrder?.inProgress || "In Progress",
          color: "#3b82f6",
          bgColor: "#dbeafe",
          icon: "construct",
        };
      case "AWAITING_PAYMENT":
        return {
          label: t.workOrder?.awaitingPayment || "Awaiting Payment",
          color: "#8b5cf6",
          bgColor: "#ede9fe",
          icon: "card",
        };
      case "COMPLETED":
        return {
          label: t.workOrder?.completed || "Completed",
          color: "#10b981",
          bgColor: "#d1fae5",
          icon: "checkmark-circle",
        };
      default:
        return {
          label: status,
          color: "#6b7280",
          bgColor: "#f3f4f6",
          icon: "ellipse",
        };
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
    });
  };

  const filterOptions =
    activeTab === "requests"
      ? [
          { value: "all", label: t.common?.all || "All" },
          {
            value: "SEARCHING",
            label: t.serviceRequest?.searching || "Searching",
          },
          {
            value: "QUOTES_RECEIVED",
            label: t.serviceRequest?.quotes || "Quotes",
          },
        ]
      : [
          { value: "all", label: t.common?.all || "All" },
          { value: "active", label: t.workOrder?.active || "Active" },
          {
            value: "AWAITING_PAYMENT",
            label: t.workOrder?.payment || "Payment",
          },
          { value: "COMPLETED", label: t.workOrder?.completed || "Completed" },
        ];

  const filteredRequests = serviceRequests.filter((req) => {
    if (filter !== "all" && req.status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        req.title.toLowerCase().includes(query) ||
        req.vehicle.make.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const filteredOrders = workOrders.filter((wo) => {
    if (filter === "active") {
      return wo.status === "PENDING_START" || wo.status === "IN_PROGRESS";
    }
    if (filter !== "all" && wo.status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        wo.title.toLowerCase().includes(query) ||
        wo.provider.businessName.toLowerCase().includes(query) ||
        wo.vehicle.make.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    openRequests: serviceRequests.length,
    quotesReceived: serviceRequests.filter(
      (r) => r.status === "QUOTES_RECEIVED",
    ).length,
    active: workOrders.filter(
      (w) => w.status === "IN_PROGRESS" || w.status === "PENDING_START",
    ).length,
    awaitingPayment: workOrders.filter((w) => w.status === "AWAITING_PAYMENT")
      .length,
    completed: workOrders.filter((w) => w.status === "COMPLETED").length,
    totalSpent: workOrders
      .filter((w) => w.status === "COMPLETED")
      .reduce((acc, w) => acc + w.finalAmount, 0),
  };

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / (60 * 1000));
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t.workOrder?.myServices || "My Services"}
          </Text>
          <View style={{ width: 70 }} />
        </View>
        <WorkOrderSkeleton />
        <WorkOrderSkeleton />
        <WorkOrderSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.workOrder?.myServices || "My Services"}
        </Text>
        <TouchableOpacity
          style={styles.newRequestButton}
          onPress={() =>
            navigation.navigate("Dashboard", { screen: "ServiceChoice" })
          }
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newRequestText}>{t.common?.add || "New"}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <FadeInView delay={0}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "requests" && styles.tabActive]}
            onPress={() => {
              setActiveTab("requests");
              setFilter("all");
            }}
          >
            <Ionicons
              name="pricetags"
              size={18}
              color={activeTab === "requests" ? "#1976d2" : "#9ca3af"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "requests" && styles.tabTextActive,
              ]}
            >
              {t.workOrder?.tabRequests || "Requests"}
            </Text>
            {stats.openRequests > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  activeTab === "requests" && styles.tabBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === "requests" && styles.tabBadgeTextActive,
                  ]}
                >
                  {stats.openRequests}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "orders" && styles.tabActive]}
            onPress={() => {
              setActiveTab("orders");
              setFilter("all");
            }}
          >
            <Ionicons
              name="construct"
              size={18}
              color={activeTab === "orders" ? "#1976d2" : "#9ca3af"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "orders" && styles.tabTextActive,
              ]}
            >
              {t.workOrder?.tabInProgress || "In Progress"}
            </Text>
            {stats.active > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  activeTab === "orders" && styles.tabBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === "orders" && styles.tabBadgeTextActive,
                  ]}
                >
                  {stats.active}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </FadeInView>

      {/* Stats Cards */}
      <FadeInView delay={0}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          {activeTab === "requests" ? (
            <>
              <View style={[styles.statCard, { backgroundColor: "#dbeafe" }]}>
                <Ionicons name="search" size={20} color="#3b82f6" />
                <Text style={[styles.statValue, { color: "#1e40af" }]}>
                  {
                    serviceRequests.filter((r) => r.status === "SEARCHING")
                      .length
                  }
                </Text>
                <Text style={styles.statLabel}>
                  {t.serviceRequest?.searching || "Searching"}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#fef3c7" }]}>
                <Ionicons name="pricetag" size={20} color="#f59e0b" />
                <Text style={[styles.statValue, { color: "#b45309" }]}>
                  {stats.quotesReceived}
                </Text>
                <Text style={styles.statLabel}>
                  {t.serviceRequest?.withQuotes || "With Quotes"}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#d1fae5" }]}>
                <Ionicons name="document-text" size={20} color="#10b981" />
                <Text style={[styles.statValue, { color: "#047857" }]}>
                  {stats.openRequests}
                </Text>
                <Text style={styles.statLabel}>
                  {t.serviceRequest?.totalOpen || "Total Open"}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.statCard, { backgroundColor: "#dbeafe" }]}>
                <Ionicons name="construct" size={20} color="#3b82f6" />
                <Text style={[styles.statValue, { color: "#1e40af" }]}>
                  {stats.active}
                </Text>
                <Text style={styles.statLabel}>
                  {t.workOrder?.active || "Active"}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#ede9fe" }]}>
                <Ionicons name="card" size={20} color="#8b5cf6" />
                <Text style={[styles.statValue, { color: "#5b21b6" }]}>
                  {stats.awaitingPayment}
                </Text>
                <Text style={styles.statLabel}>
                  {t.workOrder?.payment || "Payment"}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#d1fae5" }]}>
                <Ionicons name="checkmark-done" size={20} color="#10b981" />
                <Text style={[styles.statValue, { color: "#047857" }]}>
                  {stats.completed}
                </Text>
                <Text style={styles.statLabel}>
                  {t.workOrder?.completed || "Completed"}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#fef3c7" }]}>
                <Ionicons name="wallet" size={20} color="#f59e0b" />
                <Text style={[styles.statValue, { color: "#b45309" }]}>
                  ${stats.totalSpent}
                </Text>
                <Text style={styles.statLabel}>
                  {t.workOrder?.spent || "Spent"}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </FadeInView>

      {/* FDACS Quick Actions */}
      <FadeInView delay={80}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingHorizontal: 16, marginBottom: 8 }}
          contentContainerStyle={{ gap: 10 }}
        >
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#f0f9ff",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#bae6fd",
            }}
            onPress={() => navigation.navigate("Appointments")}
          >
            <Ionicons name="calendar" size={18} color="#0284c7" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#0284c7" }}>
              {t.fdacs?.appointments || "Appointments"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#fef3c7",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#fde68a",
            }}
            onPress={() => navigation.navigate("RepairInvoices")}
          >
            <Ionicons name="receipt" size={18} color="#b45309" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#b45309" }}>
              {t.fdacs?.repairInvoices || "Invoices"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#f0fdf4",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#bbf7d0",
            }}
            onPress={() => navigation.navigate("EstimateShares")}
          >
            <Ionicons name="share-social" size={18} color="#16a34a" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#16a34a" }}>
              {t.fdacs?.estimateShares || "Estimates"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </FadeInView>

      {/* Search */}
      <FadeInView delay={100}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#9ca3af"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === "requests"
                ? t.serviceRequest?.searchRequests || "Search requests..."
                : t.workOrder?.searchServices || "Search services..."
            }
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </FadeInView>

      {/* Filter */}
      <FadeInView delay={150}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterButton,
                filter === option.value && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(option.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === option.value && styles.filterButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </FadeInView>

      {/* List */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "requests" ? (
          // Lista de Solicitações Abertas
          filteredRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="pricetags-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>
                {t.serviceRequest?.noOpenRequests || "No open requests"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t.serviceRequest?.createNewRequest ||
                  "Create a new request to receive quotes"}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() =>
                  navigation.navigate("Dashboard", { screen: "ServiceChoice" })
                }
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>
                  {t.common?.add || "New Request"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredRequests.map((request, index) => {
              const statusInfo = getRequestStatusInfo(request.status);

              return (
                <FadeInView key={request.id} delay={200 + index * 50}>
                  <ScalePress
                    onPress={() =>
                      navigation.navigate("Dashboard", {
                        screen: "RequestDetails",
                        params: { requestId: request.id },
                      })
                    }
                  >
                    <View style={styles.orderCard}>
                      {/* Status Indicator */}
                      <View
                        style={[
                          styles.statusLine,
                          { backgroundColor: statusInfo.color },
                        ]}
                      />

                      {/* Header */}
                      <View style={styles.orderHeader}>
                        <View
                          style={[
                            styles.orderIcon,
                            { backgroundColor: statusInfo.bgColor },
                          ]}
                        >
                          <Ionicons
                            name={statusInfo.icon as any}
                            size={20}
                            color={statusInfo.color}
                          />
                        </View>
                        <View style={styles.orderInfo}>
                          <Text style={styles.orderTitle}>{request.title}</Text>
                          <Text style={styles.orderVehicle}>
                            {request.vehicle.make} {request.vehicle.model}{" "}
                            {request.vehicle.year}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusInfo.bgColor },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: statusInfo.color },
                            ]}
                          >
                            {statusInfo.label}
                          </Text>
                        </View>
                      </View>

                      {/* Footer */}
                      <View style={styles.orderFooter}>
                        <View style={styles.dateInfo}>
                          <Text style={styles.requestNumber}>
                            #{request.requestNumber}
                          </Text>
                        </View>
                        <Text style={styles.dateText}>
                          {formatTimeAgo(request.createdAt)}{" "}
                          {t.common?.ago || "ago"}
                        </Text>
                      </View>

                      {/* Quotes Alert */}
                      {request.quotesCount > 0 && (
                        <View style={styles.quotesAlert}>
                          <Ionicons name="pricetag" size={16} color="#f59e0b" />
                          <Text style={styles.quotesAlertText}>
                            {request.quotesCount}{" "}
                            {t.common?.quotesCount || "quote(s) received"}
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color="#f59e0b"
                          />
                        </View>
                      )}

                      {request.status === "SEARCHING" && (
                        <View style={styles.searchingHint}>
                          <Ionicons name="time" size={16} color="#3b82f6" />
                          <Text style={styles.searchingHintText}>
                            {t.serviceRequest?.awaitingQuotes ||
                              "Awaiting quotes..."}
                          </Text>
                        </View>
                      )}
                    </View>
                  </ScalePress>
                </FadeInView>
              );
            })
          )
        ) : // Lista de Work Orders
        filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              {t.workOrder?.noServicesFound || "No services found"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? t.workOrder?.tryOtherTerms || "Try searching with other terms"
                : t.workOrder?.servicesWillAppear ||
                  "Your services will appear here"}
            </Text>
          </View>
        ) : (
          filteredOrders.map((wo, index) => {
            const statusInfo = getStatusInfo(wo.status);

            return (
              <FadeInView key={wo.id} delay={200 + index * 50}>
                <ScalePress
                  onPress={() =>
                    navigation.navigate("WorkOrderDetails", {
                      workOrderId: wo.id,
                    })
                  }
                >
                  <View style={styles.orderCard}>
                    {/* Status Indicator */}
                    <View
                      style={[
                        styles.statusLine,
                        { backgroundColor: statusInfo.color },
                      ]}
                    />

                    {/* Header */}
                    <View style={styles.orderHeader}>
                      <View
                        style={[
                          styles.orderIcon,
                          { backgroundColor: statusInfo.bgColor },
                        ]}
                      >
                        <Ionicons
                          name={statusInfo.icon as any}
                          size={20}
                          color={statusInfo.color}
                        />
                      </View>
                      <View style={styles.orderInfo}>
                        <Text style={styles.orderTitle}>{wo.title}</Text>
                        <Text style={styles.orderVehicle}>
                          {wo.vehicle.make} {wo.vehicle.model} {wo.vehicle.year}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusInfo.bgColor },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: statusInfo.color },
                          ]}
                        >
                          {statusInfo.label}
                        </Text>
                      </View>
                    </View>

                    {/* Provider */}
                    <View style={styles.providerRow}>
                      <Ionicons
                        name="business-outline"
                        size={16}
                        color="#6b7280"
                      />
                      <Text style={styles.providerName}>
                        {wo.provider.businessName}
                      </Text>
                      <Ionicons name="star" size={12} color="#fbbf24" />
                      <Text style={styles.providerRating}>
                        {wo.provider.rating}
                      </Text>
                    </View>

                    {/* Footer */}
                    <View style={styles.orderFooter}>
                      <View style={styles.dateInfo}>
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color="#9ca3af"
                        />
                        <Text style={styles.dateText}>
                          {formatDate(wo.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.amount}>
                        R${wo.finalAmount.toFixed(2)}
                      </Text>
                    </View>

                    {/* Action hint */}
                    {wo.status === "AWAITING_PAYMENT" && (
                      <TouchableOpacity
                        style={styles.paymentHint}
                        onPress={() =>
                          navigation.navigate("Payment", { workOrderId: wo.id })
                        }
                      >
                        <Ionicons name="card" size={16} color="#8b5cf6" />
                        <Text style={styles.paymentHintText}>
                          {t.workOrder?.makePayment || "Make Payment"}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color="#8b5cf6"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </ScalePress>
              </FadeInView>
            );
          })
        )}
        <View style={{ height: 100 }} />
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    textAlign: "center",
  },
  newRequestButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1976d2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  newRequestText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: "#e3f2fd",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#9ca3af",
  },
  tabTextActive: {
    color: "#1976d2",
    fontWeight: "600",
  },
  tabBadge: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  tabBadgeActive: {
    backgroundColor: "#1976d2",
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
  },
  tabBadgeTextActive: {
    color: "#fff",
  },
  statsContainer: {
    marginBottom: 16,
  },
  statsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginRight: 12,
    minWidth: 90,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#1976d2",
    borderColor: "#1976d2",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
    textAlign: "center",
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1976d2",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  requestNumber: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  quotesAlert: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef3c7",
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  quotesAlertText: {
    fontSize: 13,
    color: "#b45309",
    fontWeight: "600",
  },
  searchingHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  searchingHintText: {
    fontSize: 13,
    color: "#1e40af",
    fontWeight: "500",
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
    overflow: "hidden",
  },
  statusLine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  orderVehicle: {
    fontSize: 13,
    color: "#6b7280",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  providerName: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  providerRating: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 2,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1976d2",
  },
  paymentHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ede9fe",
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  paymentHintText: {
    fontSize: 13,
    color: "#8b5cf6",
    fontWeight: "600",
  },
});
