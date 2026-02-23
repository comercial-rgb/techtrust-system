/**
 * EstimateSharesScreen - Browse and manage shared Written Estimates
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useI18n } from "../../i18n";
import { useAuth } from "../../contexts/AuthContext";
import * as fdacsService from "../../services/fdacs.service";

export default function EstimateSharesScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t } = useI18n();
  const isProvider = user?.role === "PROVIDER";
  const [loading, setLoading] = useState(true);
  const [shares, setShares] = useState<fdacsService.EstimateShare[]>([]);
  const [tab, setTab] = useState<"mine" | "available">("mine");

  useFocusEffect(
    useCallback(() => {
      loadShares();
    }, [tab]),
  );

  async function loadShares() {
    try {
      setLoading(true);
      if (tab === "available" && isProvider) {
        const res = await fdacsService.getAvailableSharedEstimates();
        setShares(res.data?.shares || []);
      } else {
        const res = await fdacsService.getMySharedEstimates();
        setShares(res.data?.shares || []);
      }
    } catch (error) {
      console.error("Error loading shares:", error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "OPEN":
        return {
          label: t.fdacs.statusOpen,
          color: "#3b82f6",
          bgColor: "#dbeafe",
        };
      case "CLOSED":
        return {
          label: t.fdacs.statusClosed,
          color: "#6b7280",
          bgColor: "#f3f4f6",
        };
      case "EXPIRED":
        return {
          label: t.fdacs.statusExpired,
          color: "#ef4444",
          bgColor: "#fee2e2",
        };
      default:
        return { label: status, color: "#6b7280", bgColor: "#f3f4f6" };
    }
  };

  const renderShare = ({ item }: { item: fdacsService.EstimateShare }) => {
    const statusInfo = getStatusInfo(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("CompareEstimates", { shareId: item.id })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.shareNumber}>{item.shareNumber}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusInfo.bgColor },
            ]}
          >
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <Text style={styles.vehicleInfo}>{item.vehicleInfo}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="document-text-outline" size={14} color="#6b7280" />
            <Text style={styles.metaText}>
              {item.competingQuotesCount || 0}{" "}
              {(item.competingQuotesCount || 0) !== 1
                ? t.fdacs.competingEstimates
                : t.fdacs.competingEstimate}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={14} color="#6b7280" />
            <Text style={styles.metaText}>
              {t.fdacs.originalTotal}: ${Number(item.originalTotal).toFixed(2)}
            </Text>
          </View>
        </View>

        {item.expiresAt && (
          <View style={styles.expiresRow}>
            <Ionicons name="time-outline" size={14} color="#f59e0b" />
            <Text style={styles.expiresText}>
              {t.fdacs.expires}: {new Date(item.expiresAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>{t.fdacs.estimateComparison}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs for providers */}
      {isProvider && (
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === "mine" && styles.tabActive]}
            onPress={() => setTab("mine")}
          >
            <Text
              style={[styles.tabText, tab === "mine" && styles.tabTextActive]}
            >
              {t.fdacs.myShares}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "available" && styles.tabActive]}
            onPress={() => setTab("available")}
          >
            <Text
              style={[
                styles.tabText,
                tab === "available" && styles.tabTextActive,
              ]}
            >
              {t.fdacs.available}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#2B5EA7"
          style={{ marginTop: 40 }}
        />
      ) : shares.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="git-compare-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>
            {tab === "available"
              ? t.fdacs.noAvailableEstimates
              : t.fdacs.noSharedEstimates}
          </Text>
          <Text style={styles.emptyText}>
            {tab === "available" ? t.fdacs.availableHint : t.fdacs.sharedHint}
          </Text>
        </View>
      ) : (
        <FlatList
          data={shares}
          renderItem={renderShare}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabActive: { backgroundColor: "#2B5EA7" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  tabTextActive: { color: "#fff" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  shareNumber: { fontSize: 14, fontWeight: "600", color: "#2B5EA7" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "600" },
  vehicleInfo: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13, color: "#6b7280" },
  expiresRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  expiresText: { fontSize: 12, color: "#f59e0b" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
});
