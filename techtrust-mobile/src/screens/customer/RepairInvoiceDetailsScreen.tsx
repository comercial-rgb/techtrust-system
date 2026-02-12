/**
 * RepairInvoiceDetailsScreen - Full FDACS Repair Invoice view
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useI18n } from "../../i18n";
import { useAuth } from "../../contexts/AuthContext";
import * as fdacsService from "../../services/fdacs.service";

export default function RepairInvoiceDetailsScreen({ route, navigation }: any) {
  const { invoiceId } = route.params;
  const { user } = useAuth();
  const { t } = useI18n();
  const isProvider = user?.role === "PROVIDER";

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<fdacsService.RepairInvoice | null>(
    null,
  );
  const [acting, setActing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadInvoice();
    }, [invoiceId]),
  );

  async function loadInvoice() {
    try {
      setLoading(true);
      const res = await fdacsService.getInvoice(invoiceId);
      setInvoice(res.data?.invoice || null);
    } catch (error) {
      console.error("Error loading invoice:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    Alert.alert(t.fdacs.completeInvoiceTitle, t.fdacs.completeInvoiceMessage, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.fdacs.statusCompleted,
        onPress: async () => {
          try {
            setActing(true);
            await fdacsService.completeInvoice(invoiceId);
            loadInvoice();
          } catch (error) {
            Alert.alert(t.common.error, t.fdacs.failedToComplete);
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  }

  async function handleAccept() {
    Alert.alert(t.fdacs.acceptInvoiceTitle, t.fdacs.acceptInvoiceMessage, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.fdacs.acceptInvoice,
        onPress: async () => {
          try {
            setActing(true);
            await fdacsService.acceptInvoice(invoiceId);
            loadInvoice();
          } catch (error) {
            Alert.alert(t.common.error, t.fdacs.failedToAccept);
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  }

  async function handleDispute() {
    Alert.alert(t.fdacs.disputeInvoiceTitle, t.fdacs.disputeInvoiceMessage, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.fdacs.submitDispute,
        style: "destructive",
        onPress: async () => {
          try {
            setActing(true);
            await fdacsService.disputeInvoice(
              invoiceId,
              t.fdacs.disputeSubmitted,
            );
            loadInvoice();
          } catch (error) {
            Alert.alert(t.common.error, t.fdacs.failedToDispute);
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "DRAFT":
        return {
          label: t.fdacs.statusDraft,
          color: "#6b7280",
          icon: "create-outline" as const,
        };
      case "IN_PROGRESS":
        return {
          label: t.fdacs.statusInProgress,
          color: "#3b82f6",
          icon: "construct-outline" as const,
        };
      case "COMPLETED":
        return {
          label: t.fdacs.statusReadyForReview,
          color: "#f59e0b",
          icon: "checkmark-circle-outline" as const,
        };
      case "APPROVED":
        return {
          label: t.fdacs.statusApproved,
          color: "#10b981",
          icon: "shield-checkmark-outline" as const,
        };
      case "DISPUTED":
        return {
          label: t.fdacs.statusDisputed,
          color: "#ef4444",
          icon: "warning-outline" as const,
        };
      default:
        return {
          label: status,
          color: "#6b7280",
          icon: "document-outline" as const,
        };
    }
  };

  if (loading || !invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#1976d2"
          style={{ marginTop: 40 }}
        />
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusInfo(invoice.status);
  const lineItems = (invoice as any).lineItems || [];
  const hasSupplement = Number(invoice.supplementsTotal) > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>{t.fdacs.repairInvoice}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: statusInfo.color + "15" },
          ]}
        >
          <Ionicons name={statusInfo.icon} size={28} color={statusInfo.color} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
            <Text style={styles.invoiceNum}>{invoice.invoiceNumber}</Text>
          </View>
        </View>

        {/* Vehicle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.fdacs.vehicle}</Text>
          <Text style={styles.vehicleText}>{invoice.vehicleInfo}</Text>
        </View>

        {/* Provider */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.fdacs.serviceProvider}</Text>
          <Text style={styles.providerName}>
            {invoice.providerBusinessName || invoice.providerName}
          </Text>
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.fdacs.servicesParts}</Text>
          {lineItems.length > 0 ? (
            lineItems.map((item: any, idx: number) => (
              <View key={idx} style={styles.lineItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineItemDesc}>{item.description}</Text>
                  {item.isSupplement && (
                    <View style={styles.supplementTag}>
                      <Text style={styles.supplementTagText}>
                        {t.fdacs.supplement}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.lineItemAmount}>
                  ${Number(item.amount).toFixed(2)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyItems}>{t.fdacs.noItemsListed}</Text>
          )}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t.fdacs.originalEstimate}</Text>
            <Text style={styles.totalValue}>
              ${Number(invoice.originalTotal).toFixed(2)}
            </Text>
          </View>
          {hasSupplement && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: "#f59e0b" }]}>
                {t.fdacs.supplements}
              </Text>
              <Text style={[styles.totalValue, { color: "#f59e0b" }]}>
                +${Number(invoice.supplementsTotal).toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text style={styles.totalFinalLabel}>{t.fdacs.finalTotal}</Text>
            <Text style={styles.totalFinalValue}>
              ${Number(invoice.finalTotal).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Work Performed */}
        {(invoice as any).workPerformed && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.fdacs.workPerformed}</Text>
            <Text style={styles.bodyText}>
              {(invoice as any).workPerformed}
            </Text>
          </View>
        )}

        {/* Dispute Reason */}
        {(invoice as any).disputeReason && (
          <View
            style={[
              styles.section,
              { backgroundColor: "#fef2f2", borderColor: "#ef4444" },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: "#ef4444" }]}>
              {t.fdacs.disputeReason}
            </Text>
            <Text style={styles.bodyText}>
              {(invoice as any).disputeReason}
            </Text>
          </View>
        )}

        {/* FDACS Compliance */}
        <View
          style={[
            styles.section,
            { backgroundColor: "#f0f9ff", borderColor: "#1976d2" },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <Ionicons name="shield-checkmark" size={18} color="#1976d2" />
            <Text
              style={[
                styles.sectionTitle,
                { color: "#1976d2", marginLeft: 6, marginBottom: 0 },
              ]}
            >
              {t.fdacs.fdacsCompliance}
            </Text>
          </View>
          <Text style={styles.fdacsText}>{t.fdacs.fdacsComplianceText}</Text>
          <Text style={[styles.fdacsText, { marginTop: 4 }]}>
            {t.fdacs.writtenEstimateRef}:{" "}
            {(invoice as any).estimateNumber || t.fdacs.na}
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {acting ? (
        <View style={styles.actionBar}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        <>
          {/* Provider: Complete when IN_PROGRESS */}
          {isProvider && invoice.status === "IN_PROGRESS" && (
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#10b981" }]}
                onPress={handleComplete}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>
                  {t.fdacs.markCompleted}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Customer: Accept or Dispute when COMPLETED */}
          {!isProvider && invoice.status === "COMPLETED" && (
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: "#ef4444", flex: 0.4 },
                ]}
                onPress={handleDispute}
              >
                <Ionicons name="flag" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>
                  {t.fdacs.disputeButton}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: "#10b981", flex: 0.6 },
                ]}
                onPress={handleAccept}
              >
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>
                  {t.fdacs.acceptInvoice}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statusLabel: { fontSize: 16, fontWeight: "700" },
  invoiceNum: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  vehicleText: { fontSize: 16, fontWeight: "600", color: "#111827" },
  providerName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  lineItemDesc: { fontSize: 14, color: "#374151" },
  lineItemAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 12,
  },
  supplementTag: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  supplementTagText: { fontSize: 10, fontWeight: "600", color: "#f59e0b" },
  emptyItems: { fontSize: 14, color: "#9ca3af", fontStyle: "italic" },
  totalsSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalLabel: { fontSize: 14, color: "#374151" },
  totalValue: { fontSize: 14, fontWeight: "500", color: "#111827" },
  totalFinal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#e5e7eb",
    marginBottom: 0,
  },
  totalFinalLabel: { fontSize: 16, fontWeight: "700", color: "#111827" },
  totalFinalValue: { fontSize: 18, fontWeight: "700", color: "#10b981" },
  bodyText: { fontSize: 14, color: "#374151", lineHeight: 20 },
  fdacsText: { fontSize: 13, color: "#374151", lineHeight: 18 },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    gap: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingBottom: 32,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
