/**
 * RequestDetailsScreen - Request Details
 * With quotes and chat functionality
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../i18n";
import api from "../services/api";

interface Quote {
  id: string;
  provider: {
    id: string;
    businessName: string;
    rating: number;
    totalReviews: number;
  };
  partsCost: number;
  laborCost: number;
  totalAmount: number;
  estimatedTime: string;
  description: string;
}

export default function RequestDetailsScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const { requestId } = route.params || { requestId: "1" };
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    loadDetails();
  }, []);

  async function loadDetails() {
    try {
      setLoading(true);
      const requestRes = await api.get(`/service-requests/${requestId}`);
      const reqData = requestRes.data.data || requestRes.data;
      setRequest(reqData);

      // Quotes are already included in the service request response
      const includedQuotes = reqData?.quotes || [];
      if (includedQuotes.length > 0) {
        setQuotes(
          includedQuotes.map((q: any) => ({
            id: q.id,
            provider: {
              id: q.provider?.id || q.providerId,
              businessName:
                q.provider?.providerProfile?.businessName ||
                q.provider?.fullName ||
                "Provider",
              rating: q.provider?.providerProfile?.averageRating || 0,
              totalReviews: q.provider?.providerProfile?.totalReviews || 0,
            },
            partsCost: q.partsCost || 0,
            laborCost: q.laborCost || 0,
            totalAmount: q.totalAmount || 0,
            estimatedTime: q.estimatedTime || "",
            description: q.description || "",
          })),
        );
      } else {
        // Fallback: try the quotes endpoint
        try {
          const quotesRes = await api.get(
            `/quotes/service-requests/${requestId}`,
          );
          const quotesData = quotesRes.data.data || quotesRes.data || [];
          setQuotes(Array.isArray(quotesData) ? quotesData : []);
        } catch {
          setQuotes([]);
        }
      }
    } catch (err: any) {
      Alert.alert(
        t.common?.error || "Error",
        err?.response?.data?.message ||
          t.common?.tryAgain ||
          "Could not load details",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleAcceptQuote(quote: Quote) {
    Alert.alert(
      t.common?.acceptQuote || "Accept Quote",
      `${t.common?.acceptQuoteConfirm || "Accept"} ${quote.provider.businessName} ${t.common?.for || "for"} $${quote.totalAmount}?`,
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t.common?.accept || "Accept",
          onPress: async () => {
            try {
              await api.post(`/quotes/${quote.id}/accept`);
              Alert.alert(
                t.common?.success || "Success!",
                t.common?.quoteAccepted || "Quote accepted!",
              );
              navigation.goBack();
            } catch (err: any) {
              Alert.alert(
                t.common?.error || "Error",
                err?.response?.data?.message ||
                  t.common?.tryAgain ||
                  "Try again",
              );
            }
          },
        },
      ],
    );
  }

  function handleViewQuoteDetails(quote: Quote) {
    navigation.navigate("QuoteDetails", { quoteId: quote.id });
  }

  function handleChat(quote: Quote) {
    navigation.navigate("Messages", {
      screen: "Chat",
      params: {
        chatId: `chat-${quote.id}`,
        recipientId: quote.provider.id,
        recipientName: quote.provider.businessName,
        recipientType: "provider",
        requestId: request?.requestNumber,
      },
    });
  }

  // Find the index of the quote with the lowest total amount (best value)
  const bestValueIndex = useMemo(() => {
    if (quotes.length === 0) return -1;
    let minIndex = 0;
    let minAmount = quotes[0].totalAmount;
    quotes.forEach((quote, idx) => {
      if (quote.totalAmount < minAmount) {
        minAmount = quote.totalAmount;
        minIndex = idx;
      }
    });
    return minIndex;
  }, [quotes]);

  // Status helpers
  function getStatusColor(status?: string): string {
    const colors: Record<string, string> = {
      SEARCHING_PROVIDERS: "#f59e0b",
      QUOTES_RECEIVED: "#3b82f6",
      QUOTE_ACCEPTED: "#10b981",
      SCHEDULED: "#8b5cf6",
      IN_PROGRESS: "#f59e0b",
      COMPLETED: "#10b981",
      CANCELLED: "#ef4444",
      DRAFT: "#9ca3af",
    };
    return colors[status || ""] || "#6b7280";
  }
  function getStatusBg(status?: string): string {
    const bgs: Record<string, string> = {
      SEARCHING_PROVIDERS: "#fef3c7",
      QUOTES_RECEIVED: "#dbeafe",
      QUOTE_ACCEPTED: "#d1fae5",
      SCHEDULED: "#ede9fe",
      IN_PROGRESS: "#fef3c7",
      COMPLETED: "#d1fae5",
      CANCELLED: "#fee2e2",
      DRAFT: "#f3f4f6",
    };
    return bgs[status || ""] || "#f3f4f6";
  }
  function getStatusLabel(status?: string): string {
    const labels: Record<string, string> = {
      SEARCHING_PROVIDERS: t.common?.searching || "Searching",
      QUOTES_RECEIVED: t.common?.quotesReceived || "Quotes Received",
      QUOTE_ACCEPTED: t.common?.accepted || "Accepted",
      SCHEDULED: t.common?.scheduled || "Scheduled",
      IN_PROGRESS: t.common?.inProgress || "In Progress",
      COMPLETED: t.common?.completed || "Completed",
      CANCELLED: t.common?.cancelled || "Cancelled",
    };
    return labels[status || ""] || status || "";
  }
  function getUrgencyColor(urgency?: string): string {
    const colors: Record<string, string> = {
      low: "#10b981",
      normal: "#3b82f6",
      high: "#f59e0b",
      urgent: "#ef4444",
    };
    return colors[urgency || ""] || "#374151";
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>{t.common?.loading || "Loading..."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.common?.details || "Details"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Professional Header Card */}
        <View style={styles.card}>
          {/* Request Number & Status */}
          <View style={styles.headerRow}>
            <Text style={styles.requestNumber}>#{request?.requestNumber}</Text>
            <View
              style={[
                styles.statusChip,
                { backgroundColor: getStatusBg(request?.status) },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(request?.status) },
                ]}
              />
              <Text
                style={[
                  styles.statusChipText,
                  { color: getStatusColor(request?.status) },
                ]}
              >
                {getStatusLabel(request?.status)}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{request?.title}</Text>

          {/* Description - clean formatting, no meta duplication */}
          {request?.description &&
            (() => {
              let desc = request.description;
              // Remove enriched meta lines (Vehicle Type: ... | Scope: ...) appended during creation
              const metaSeparator = desc.indexOf("\n---\n");
              if (metaSeparator !== -1) {
                desc = desc.substring(0, metaSeparator).trim();
              }
              // If description is just the meta lines (no separator, but starts with "Vehicle Type:")
              if (/^(Vehicle Type:|Scope:)/i.test(desc)) {
                return null;
              }
              // Remove if description duplicates the title exactly
              if (desc === request?.title) {
                return null;
              }
              if (!desc) return null;

              // Parse pipe-separated sub-option details into clean lines
              // Format: "Section Label: Value1, Value2 | Section Label: Value3"
              const parts = desc
                .split(" | ")
                .map((p) => p.trim())
                .filter(Boolean);
              const cleanLines: { label: string; value: string }[] = [];
              for (const part of parts) {
                const colonIdx = part.indexOf(": ");
                if (colonIdx !== -1) {
                  let label = part.substring(0, colonIdx).trim();
                  const value = part.substring(colonIdx + 2).trim();
                  // Shorten verbose question labels
                  label = label
                    .replace(/\s*\(optional,?\s*select all that apply\)/i, "")
                    .replace(/\s*\(select all that apply\)/i, "")
                    .replace(/\s*\(optional\)/i, "")
                    .replace(/^What type of /i, "")
                    .replace(/^What needs to be /i, "")
                    .replace(/^Describe any /i, "")
                    .replace(/\?$/, "")
                    .trim();
                  // Skip if the value already appears in the title
                  if (request?.title?.includes(value)) continue;
                  if (value) cleanLines.push({ label, value });
                } else {
                  // Plain text line
                  if (!request?.title?.includes(part)) {
                    cleanLines.push({ label: "", value: part });
                  }
                }
              }

              if (cleanLines.length === 0) return null;

              return (
                <View style={styles.descriptionBox}>
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color="#6b7280"
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1, gap: 6 }}>
                    {cleanLines.map((line, i) => (
                      <View key={i}>
                        {line.label ? (
                          <>
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#9ca3af",
                                fontWeight: "600",
                                marginBottom: 2,
                              }}
                            >
                              {line.label}
                            </Text>
                            <Text style={styles.description}>{line.value}</Text>
                          </>
                        ) : (
                          <Text style={styles.description}>{line.value}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="car" size={18} color="#1976d2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>
                  {t.common?.vehicle || "Vehicle"}
                </Text>
                <Text style={styles.infoValue}>
                  {request?.vehicle?.year} {request?.vehicle?.make}{" "}
                  {request?.vehicle?.model} {request?.vehicle?.trim || ""}
                </Text>
                {(request?.vehicle?.fuelType ||
                  request?.vehicle?.vehicleType) && (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      marginTop: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    {request?.vehicle?.fuelType && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "#eff6ff",
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}
                      >
                        <Ionicons name="flash" size={10} color="#1976d2" />
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#1976d2",
                            fontWeight: "500",
                            marginLeft: 3,
                          }}
                        >
                          {request.vehicle.fuelType}
                        </Text>
                      </View>
                    )}
                    {request?.vehicle?.vehicleType && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "#f0fdf4",
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}
                      >
                        <Ionicons name="car" size={10} color="#059669" />
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#059669",
                            fontWeight: "500",
                            marginLeft: 3,
                          }}
                        >
                          {request.vehicle.vehicleType}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            {request?.serviceType && (
              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="construct" size={18} color="#1976d2" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>
                    {t.common?.serviceType || "Service Type"}
                  </Text>
                  <Text style={styles.infoValue}>
                    {request?.serviceType?.replace(/_/g, " ")}
                  </Text>
                </View>
              </View>
            )}

            {request?.serviceLocationType && (
              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="location" size={18} color="#1976d2" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>
                    {t.common?.location || "Location"}
                  </Text>
                  <Text style={styles.infoValue}>
                    {request?.serviceLocationType === "IN_SHOP"
                      ? t.common?.inShop || "In Shop"
                      : request?.serviceLocationType === "MOBILE"
                        ? t.common?.mobile || "Mobile"
                        : t.common?.roadside || "Roadside"}
                  </Text>
                </View>
              </View>
            )}

            {request?.urgency && (
              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="time" size={18} color="#1976d2" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>
                    {t.common?.urgency || "Urgency"}
                  </Text>
                  <Text
                    style={[
                      styles.infoValue,
                      {
                        color: getUrgencyColor(request?.urgency),
                        textTransform: "capitalize",
                      },
                    ]}
                  >
                    {request?.urgency}
                  </Text>
                </View>
              </View>
            )}

            {request?.vehicleCategory && (
              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="options" size={18} color="#1976d2" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>
                    {t.common?.vehicleCategory || "Vehicle Category"}
                  </Text>
                  <Text style={styles.infoValue}>
                    {request.vehicleCategory.replace(/_/g, " ")}
                  </Text>
                </View>
              </View>
            )}

            {request?.serviceScope && (
              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="layers" size={18} color="#1976d2" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>
                    {t.common?.scope || "Scope"}
                  </Text>
                  <Text style={styles.infoValue}>
                    {request.serviceScope === "service"
                      ? "Service / Labor Only"
                      : request.serviceScope === "parts"
                        ? "Parts Only"
                        : request.serviceScope === "both"
                          ? "Parts + Service"
                          : request.serviceScope}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="calendar" size={18} color="#1976d2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{t.common?.date || "Date"}</Text>
                <Text style={styles.infoValue}>
                  {request?.createdAt
                    ? new Date(request.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {t.common?.quotes || "Quotes"} ({quotes.length})
        </Text>
        {quotes.map((quote, idx) => (
          <TouchableOpacity
            key={quote.id}
            style={styles.quoteCard}
            onPress={() => handleViewQuoteDetails(quote)}
          >
            <View style={styles.providerRow}>
              <View style={styles.avatar}>
                <Ionicons name="business" size={20} color="#1976d2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>
                  {quote.provider.businessName}
                </Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#fbbf24" />
                  <Text style={styles.ratingText}>
                    {quote.provider.rating} ({quote.provider.totalReviews})
                  </Text>
                </View>
              </View>
              {idx === bestValueIndex && (
                <View style={styles.bestBadge}>
                  <Text style={styles.bestText}>
                    {t.common?.bestValue || "Best Value"}
                  </Text>
                </View>
              )}
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#9ca3af"
                style={{ marginLeft: 8 }}
              />
            </View>
            <View style={styles.detailsBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {t.workOrder?.parts || "Parts"}:
                </Text>
                <Text style={styles.detailValue}>${quote.partsCost}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {t.workOrder?.labor || "Labor"}:
                </Text>
                <Text style={styles.detailValue}>${quote.laborCost}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {t.workOrder?.estimatedTime || "Est. Time"}:
                </Text>
                <Text style={styles.detailValue}>{quote.estimatedTime}</Text>
              </View>
              <View style={[styles.detailRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>
                  {t.common?.total || "Total"}:
                </Text>
                <Text style={styles.totalValue}>${quote.totalAmount}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleChat(quote);
                }}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#1976d2" />
                <Text style={styles.chatText}>{t.common?.chat || "Chat"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleAcceptQuote(quote);
                }}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.acceptText}>
                  {t.common?.accept || "Accept"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.viewDetailsHint}>
              <Text style={styles.viewDetailsText}>
                {t.common?.tapToViewFullDetails ||
                  "Tap to view full details and share PDF"}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Renew Request Button - only for cancelled/expired requests */}
        {request?.status &&
          (() => {
            const isCancelled = request.status === "CANCELLED";
            // Consider a request "expired" if searching for providers for more than 48 hours
            const isStale =
              request.status === "SEARCHING_PROVIDERS" &&
              request.createdAt &&
              Date.now() - new Date(request.createdAt).getTime() >
                48 * 60 * 60 * 1000;
            if (!isCancelled && !isStale) return null;
            return (
              <TouchableOpacity
                style={styles.renewBtn}
                onPress={() => {
                  Alert.alert(
                    t.common?.renewRequest || "Renew Request",
                    t.common?.renewRequestConfirm ||
                      "This will reopen your request to receive more quotes from providers. Continue?",
                    [
                      { text: t.common?.cancel || "Cancel", style: "cancel" },
                      {
                        text: t.common?.renew || "Renew",
                        onPress: async () => {
                          try {
                            await api.post(
                              `/service-requests/${requestId}/renew`,
                            );
                            Alert.alert(
                              t.common?.success || "Success!",
                              t.common?.renewSuccess ||
                                "Your request has been renewed. You will receive new quotes soon.",
                            );
                            loadDetails(); // Refresh
                          } catch (err: any) {
                            Alert.alert(
                              t.common?.error || "Error",
                              err?.response?.data?.message ||
                                "Could not renew request",
                            );
                          }
                        },
                      },
                    ],
                  );
                }}
              >
                <Ionicons name="refresh" size={20} color="#1976d2" />
                <Text style={styles.renewBtnText}>
                  {t.common?.renewForMoreQuotes ||
                    "Renew Request for More Quotes"}
                </Text>
              </TouchableOpacity>
            );
          })()}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  card: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  requestNumber: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusChipText: { fontSize: 12, fontWeight: "600" },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 8 },
  descriptionBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  description: { fontSize: 14, color: "#6b7280", flex: 1, lineHeight: 20 },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginBottom: 16 },
  infoGrid: { gap: 14 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: { fontSize: 12, color: "#9ca3af", marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "500", color: "#374151" },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  vehicleText: { fontSize: 14, color: "#374151" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  quoteCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  providerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  providerName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingText: { fontSize: 13, color: "#6b7280" },
  bestBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bestText: { fontSize: 11, fontWeight: "600", color: "#047857" },
  detailsBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  detailLabel: { fontSize: 14, color: "#6b7280" },
  detailValue: { fontSize: 14, color: "#374151", fontWeight: "500" },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginBottom: 0,
  },
  totalLabel: { fontSize: 16, fontWeight: "600", color: "#111827" },
  totalValue: { fontSize: 18, fontWeight: "700", color: "#1976d2" },
  actions: { flexDirection: "row", gap: 12 },
  chatBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#dbeafe",
    paddingVertical: 12,
    borderRadius: 10,
  },
  chatText: { fontSize: 14, fontWeight: "600", color: "#1976d2" },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 10,
  },
  acceptText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  viewDetailsHint: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    alignItems: "center",
  },
  viewDetailsText: { fontSize: 12, color: "#9ca3af", fontStyle: "italic" },
  renewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 14,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  renewBtnText: { fontSize: 15, fontWeight: "600", color: "#1976d2" },
});
