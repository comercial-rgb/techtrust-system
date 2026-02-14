/**
 * ProviderWorkOrdersScreen - Lista de Serviços (Work Orders)
 * Serviços em andamento e concluídos do fornecedor
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useI18n } from "../../i18n";

interface WorkOrder {
  id: string;
  orderNumber: string;
  status: "PENDING_START" | "IN_PROGRESS" | "AWAITING_APPROVAL" | "COMPLETED";
  finalAmount: number;
  createdAt: string;
  scheduledDate?: string;
  customer: {
    name: string;
    phone: string;
    location: string;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
  serviceRequest: {
    title: string;
  };
}

export default function ProviderWorkOrdersScreen({ navigation }: any) {
  const { t, language } = useI18n();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  // Reload data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadWorkOrders();
    }, []),
  );

  useEffect(() => {
    filterWorkOrders();
  }, [workOrders, filter]);

  const loadWorkOrders = async () => {
    setLoading(true);
    try {
      // Buscar ordens de serviço reais da API
      const response = await import("../../services/api").then((m) =>
        m.default.get("/work-orders"),
      );
      const apiWorkOrders = response.data.data || [];

      // Mapear para o formato esperado pela UI
      const mappedWorkOrders: WorkOrder[] = apiWorkOrders.map((wo: any) => ({
        id: wo.id,
        orderNumber: wo.orderNumber,
        status: wo.status,
        finalAmount: wo.finalAmount || wo.quote?.totalAmount || 0,
        createdAt: wo.createdAt,
        scheduledDate: wo.scheduledDate,
        customer: {
          name:
            wo.customer?.name ||
            wo.quote?.serviceRequest?.user?.fullName ||
            "Cliente",
          phone:
            wo.customer?.phone || wo.quote?.serviceRequest?.user?.phone || "",
          location: wo.customer?.location || "",
        },
        vehicle: {
          make:
            wo.vehicle?.make ||
            wo.quote?.serviceRequest?.vehicle?.make ||
            "N/A",
          model:
            wo.vehicle?.model ||
            wo.quote?.serviceRequest?.vehicle?.model ||
            "N/A",
          year:
            wo.vehicle?.year || wo.quote?.serviceRequest?.vehicle?.year || 0,
        },
        serviceRequest: {
          title:
            wo.serviceRequest?.title ||
            wo.quote?.serviceRequest?.title ||
            "Serviço",
        },
      }));

      setWorkOrders(mappedWorkOrders);
    } catch (error) {
      console.error("Error loading services:", error);
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filterWorkOrders = () => {
    if (filter === "all") {
      setFilteredWorkOrders(workOrders);
    } else if (filter === "active") {
      setFilteredWorkOrders(
        workOrders.filter((wo) =>
          ["PENDING_START", "IN_PROGRESS", "AWAITING_APPROVAL"].includes(
            wo.status,
          ),
        ),
      );
    } else {
      setFilteredWorkOrders(
        workOrders.filter((wo) => wo.status === "COMPLETED"),
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkOrders();
    setRefreshing(false);
  };

  const getStatusInfo = (status: string) => {
    const statuses: Record<
      string,
      { icon: string; color: string; bg: string; label: string }
    > = {
      PENDING_START: {
        icon: "clock-outline",
        color: "#f59e0b",
        bg: "#fef3c7",
        label: t.workOrder?.waiting || "Waiting",
      },
      IN_PROGRESS: {
        icon: "progress-wrench",
        color: "#3b82f6",
        bg: "#dbeafe",
        label: t.workOrder?.inProgress || "In Progress",
      },
      AWAITING_APPROVAL: {
        icon: "clock-check-outline",
        color: "#8b5cf6",
        bg: "#ede9fe",
        label: t.workOrder?.awaitingApproval || "Awaiting Approval",
      },
      COMPLETED: {
        icon: "check-circle",
        color: "#10b981",
        bg: "#d1fae5",
        label: t.workOrder?.completed || "Completed",
      },
    };
    return (
      statuses[status] || {
        icon: "help-circle",
        color: "#6b7280",
        bg: "#f3f4f6",
        label: status,
      }
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale =
      language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US";
    return date.toLocaleDateString(locale, { day: "2-digit", month: "short" });
  };

  // Stats
  const stats = {
    pendingStart: workOrders.filter((wo) => wo.status === "PENDING_START")
      .length,
    inProgress: workOrders.filter((wo) => wo.status === "IN_PROGRESS").length,
    awaitingApproval: workOrders.filter(
      (wo) => wo.status === "AWAITING_APPROVAL",
    ).length,
    completed: workOrders.filter((wo) => wo.status === "COMPLETED").length,
  };

  const renderWorkOrder = ({ item }: { item: WorkOrder }) => {
    const statusInfo = getStatusInfo(item.status);

    return (
      <TouchableOpacity
        style={styles.workOrderCard}
        onPress={() =>
          navigation.navigate("ProviderWorkOrderDetails", {
            workOrderId: item.id,
          })
        }
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.statusIcon, { backgroundColor: statusInfo.bg }]}>
            <MaterialCommunityIcons
              name={statusInfo.icon as any}
              size={22}
              color={statusInfo.color}
            />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.serviceRequest.title}
            </Text>
            <Text style={styles.vehicleText}>
              {item.vehicle.make} {item.vehicle.model} {item.vehicle.year}
            </Text>
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amountText}>
              ${item.finalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerRow}>
          <MaterialCommunityIcons name="account" size={16} color="#6b7280" />
          <Text style={styles.customerText}>{item.customer.name}</Text>
          <Text style={styles.separator}>•</Text>
          <MaterialCommunityIcons name="map-marker" size={16} color="#6b7280" />
          <Text style={styles.customerText}>{item.customer.location}</Text>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            #{item.orderNumber} • {formatDate(item.createdAt)}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}
          >
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Scheduled date hint */}
        {item.status === "PENDING_START" && item.scheduledDate && (
          <View style={styles.scheduledHint}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={14}
              color="#f59e0b"
            />
            <Text style={styles.scheduledText}>
              {t.workOrder?.scheduled || 'Scheduled'}: {formatDate(item.scheduledDate)}
            </Text>
          </View>
        )}

        {/* Action hint */}
        {(item.status === "PENDING_START" || item.status === "IN_PROGRESS") && (
          <View style={styles.actionHint}>
            <MaterialCommunityIcons
              name={
                item.status === "PENDING_START" ? "play-circle" : "check-circle"
              }
              size={16}
              color={item.status === "PENDING_START" ? "#3b82f6" : "#10b981"}
            />
            <Text
              style={[
                styles.actionHintText,
                {
                  color:
                    item.status === "PENDING_START" ? "#3b82f6" : "#10b981",
                },
              ]}
            >
              {item.status === "PENDING_START"
                ? t.workOrder?.tapToStart || 'Tap to start'
                : t.workOrder?.tapToComplete || 'Tap to complete'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statItem, { backgroundColor: "#fef3c7" }]}>
          <Text style={[styles.statValue, { color: "#92400e" }]}>
            {stats.pendingStart}
          </Text>
          <Text style={styles.statLabel}>{t.workOrder?.waiting || 'Waiting'}</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: "#dbeafe" }]}>
          <Text style={[styles.statValue, { color: "#1e40af" }]}>
            {stats.inProgress}
          </Text>
          <Text style={styles.statLabel}>{t.workOrder?.inProgress || 'In Progress'}</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: "#ede9fe" }]}>
          <Text style={[styles.statValue, { color: "#5b21b6" }]}>
            {stats.awaitingApproval}
          </Text>
          <Text style={styles.statLabel}>{t.workOrder?.approval || 'Approval'}</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: "#d1fae5" }]}>
          <Text style={[styles.statValue, { color: "#065f46" }]}>
            {stats.completed}
          </Text>
          <Text style={styles.statLabel}>{t.workOrder?.completed || 'Completed'}</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "all" && styles.filterTabTextActive,
            ]}
          >
            {t.common?.all || 'All'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === "active" && styles.filterTabActive,
          ]}
          onPress={() => setFilter("active")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "active" && styles.filterTabTextActive,
            ]}
          >
            {t.workOrder?.active || 'Active'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === "completed" && styles.filterTabActive,
          ]}
          onPress={() => setFilter("completed")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "completed" && styles.filterTabTextActive,
            ]}
          >
            {t.workOrder?.completed || 'Completed'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* FDACS Quick Action */}
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: "#fef3c7",
          marginHorizontal: 16,
          marginBottom: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#fde68a",
        }}
        onPress={() => navigation.navigate("RepairInvoices")}
      >
        <MaterialCommunityIcons
          name="file-document-check"
          size={20}
          color="#d97706"
        />
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#92400e" }}>
          {t.fdacs?.repairInvoices || "Repair Invoices"}
        </Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color="#d97706"
          style={{ marginLeft: "auto" }}
        />
      </TouchableOpacity>

      {/* List */}
      <FlatList
        data={filteredWorkOrders}
        renderItem={renderWorkOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="toolbox-outline"
              size={64}
              color="#d1d5db"
            />
            <Text style={styles.emptyTitle}>
              {t.workOrder?.noServicesFound || "No services found"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t.workOrder?.servicesWillAppear ||
                "Your services will appear here when quotes are accepted"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statItem: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#6b7280",
    textAlign: "center",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterTabActive: {
    backgroundColor: "#1976d2",
    borderColor: "#1976d2",
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterTabTextActive: {
    color: "#fff",
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  workOrderCard: {
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  vehicleText: {
    fontSize: 14,
    color: "#6b7280",
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  customerText: {
    fontSize: 13,
    color: "#6b7280",
  },
  separator: {
    color: "#d1d5db",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  scheduledHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  scheduledText: {
    fontSize: 12,
    color: "#f59e0b",
    fontWeight: "500",
  },
  actionHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 4,
  },
  actionHintText: {
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
