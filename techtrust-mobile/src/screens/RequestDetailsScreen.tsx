/**
 * RequestDetailsScreen â€” Service Request Details (Redesigned)
 * Progress stepper, key-value layout, action buttons,
 * photos/notes prompt, contextual progress text, grouped info
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../i18n";
import api from "../services/api";

const { width } = Dimensions.get("window");

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

// Progress stepper steps
const PROGRESS_STEPS = [
  "submitted",
  "sentToShops",
  "awaitingQuotes",
  "quoteAccepted",
  "scheduled",
  "inProgress",
  "completed",
] as const;

function getStepIndex(status?: string): number {
  switch (status) {
    case "DRAFT":
      return 0;
    case "SEARCHING_PROVIDERS":
      return 2;
    case "QUOTES_RECEIVED":
      return 2;
    case "QUOTE_ACCEPTED":
      return 3;
    case "SCHEDULED":
      return 4;
    case "IN_PROGRESS":
      return 5;
    case "COMPLETED":
      return 6;
    case "CANCELLED":
      return -1;
    default:
      return 0;
  }
}

export default function RequestDetailsScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const td = (t as any).requestDetails || {};
  const { requestId } = route.params || { requestId: "1" };
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    loadDetails();
  }, []);

  // Pulse animation for current step
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  async function loadDetails() {
    try {
      setLoading(true);
      const requestRes = await api.get(`/service-requests/${requestId}`);
      const reqData = requestRes.data.data || requestRes.data;
      setRequest(reqData);

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
        try {
          const quotesRes = await api.get(`/quotes/service-requests/${requestId}`);
          const quotesData = quotesRes.data.data || quotesRes.data || [];
          setQuotes(Array.isArray(quotesData) ? quotesData : []);
        } catch {
          setQuotes([]);
        }
      }
    } catch (err: any) {
      Alert.alert(
        t.common?.error || "Error",
        err?.response?.data?.message || t.common?.tryAgain || "Could not load details",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleAcceptQuote(quote: Quote) {
    Alert.alert(
      (t.common as any)?.acceptQuote || "Accept Quote",
      `${(t.common as any)?.acceptQuoteConfirm || "Accept"} ${quote.provider.businessName} ${(t.common as any)?.for || "for"} $${quote.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}?`,
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: (t.common as any)?.accept || "Accept",
          onPress: async () => {
            try {
              await api.post(`/quotes/${quote.id}/accept`);
              Alert.alert(t.common?.success || "Success!", (t.common as any)?.quoteAccepted || "Quote accepted!");
              navigation.goBack();
            } catch (err: any) {
              Alert.alert(t.common?.error || "Error", err?.response?.data?.message || t.common?.tryAgain || "Try again");
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

  async function handleShare() {
    try {
      const v = request?.vehicle ? `${request.vehicle.year} ${request.vehicle.make} ${request.vehicle.model}` : "";
      await Share.share({
        message: `TechTrust Service Request\n${request?.title || ""}\nVehicle: ${v}\nRef: #${request?.requestNumber || ""}\nStatus: ${getStatusLabel(request?.status)}`,
        title: "TechTrust Service Request",
      });
    } catch {}
  }

  function handleEdit() {
    Alert.alert(
      td.editRequest || "Edit Request",
      td.editRequestDesc || "You can edit your request details before receiving quotes.",
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        { text: td.edit || "Edit", onPress: () => navigation.navigate("CreateRequest", { editRequestId: requestId, editData: request }) },
      ],
    );
  }

  function handleCancel() {
    Alert.alert(
      td.cancelRequest || "Cancel Request",
      td.cancelRequestConfirm || "Are you sure you want to cancel this service request? This cannot be undone.",
      [
        { text: t.common?.cancel || "No, keep it", style: "cancel" },
        {
          text: td.yesCancel || "Yes, cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post(`/service-requests/${requestId}/cancel`);
              Alert.alert(t.common?.success || "Success", td.requestCancelled || "Request cancelled.");
              loadDetails();
            } catch (err: any) {
              Alert.alert(t.common?.error || "Error", err?.response?.data?.message || "Could not cancel request");
            }
          },
        },
      ],
    );
  }

  const bestValueIndex = useMemo(() => {
    if (quotes.length === 0) return -1;
    let minIdx = 0;
    let minAmt = quotes[0].totalAmount;
    quotes.forEach((q, i) => { if (q.totalAmount < minAmt) { minAmt = q.totalAmount; minIdx = i; } });
    return minIdx;
  }, [quotes]);

  // Status helpers
  function getStatusColor(status?: string): string {
    const c: Record<string, string> = {
      SEARCHING_PROVIDERS: "#f59e0b", QUOTES_RECEIVED: "#3b82f6", QUOTE_ACCEPTED: "#10b981",
      SCHEDULED: "#8b5cf6", IN_PROGRESS: "#f59e0b", COMPLETED: "#10b981", CANCELLED: "#ef4444", DRAFT: "#9ca3af",
    };
    return c[status || ""] || "#6b7280";
  }

  function getStatusLabel(status?: string): string {
    const l: Record<string, string> = {
      SEARCHING_PROVIDERS: (t.common as any)?.searching || "Searching",
      QUOTES_RECEIVED: t.common?.quotesReceived || "Quotes Received",
      QUOTE_ACCEPTED: (t.common as any)?.accepted || "Accepted",
      SCHEDULED: (t.common as any)?.scheduled || "Scheduled",
      IN_PROGRESS: (t.common as any)?.inProgress || "In Progress",
      COMPLETED: t.common?.completed || "Completed",
      CANCELLED: t.common?.cancelled || "Cancelled",
    };
    return l[status || ""] || status || "";
  }

  // Contextual progress message
  function getProgressMessage(): string {
    if (!request) return "";
    const st = request.status;
    const hrs = request.createdAt ? (Date.now() - new Date(request.createdAt).getTime()) / 3600000 : 0;

    if (st === "CANCELLED") return td.progressCancelled || "This request has been cancelled.";
    if (st === "COMPLETED") return td.progressCompleted || "This service has been completed. Thank you for using TechTrust!";
    if (st === "IN_PROGRESS") return td.progressInProgress || "Your vehicle is being serviced. You'll be notified when it's ready.";
    if (st === "SCHEDULED") return td.progressScheduled || "Your service is scheduled. Check the date and time below.";
    if (st === "QUOTE_ACCEPTED") return td.progressAccepted || "Quote accepted! The provider will contact you to schedule.";
    if (st === "QUOTES_RECEIVED" || (st === "SEARCHING_PROVIDERS" && quotes.length > 0)) {
      return (td.progressQuotesReady || "You have %d quote(s) ready to review! Compare and choose the best one.").replace("%d", String(quotes.length));
    }
    if (st === "SEARCHING_PROVIDERS") {
      if (hrs < 2) return td.progressSearchingNew || "Your request was sent to nearby service providers. Most quotes arrive within 2-4 hours.";
      if (hrs < 24) return td.progressSearchingWait || "Still searching for quotes. Hang tight â€” providers are reviewing your request.";
      return td.progressSearchingLong || "Taking longer than usual? You can edit your request details or contact support.";
    }
    return "";
  }

  // Parse description into deduplicated key-value pairs
  function getServiceDetails(): { label: string; value: string }[] {
    if (!request?.description) return [];
    let desc = request.description;
    const metaSep = desc.indexOf("\n---\n");
    if (metaSep !== -1) desc = desc.substring(0, metaSep).trim();
    if (/^(Vehicle Type:|Scope:)/i.test(desc)) return [];
    if (desc === request?.title) return [];
    if (!desc) return [];

    const parts = desc.split(" | ").map((p: string) => p.trim()).filter(Boolean);
    const seen = new Set<string>();
    const lines: { label: string; value: string }[] = [];

    for (const part of parts) {
      const ci = part.indexOf(": ");
      if (ci !== -1) {
        let label = part.substring(0, ci).trim()
          .replace(/\s*\(optional,?\s*select all that apply\)/i, "")
          .replace(/\s*\(select all that apply\)/i, "")
          .replace(/\s*\(optional\)/i, "")
          .replace(/^What type of /i, "").replace(/^What needs to be /i, "")
          .replace(/^Describe any /i, "").replace(/\?$/, "").trim();
        const value = part.substring(ci + 2).trim();
        if (request?.title?.includes(value)) continue;
        const key = `${label}:${value}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        if (value) lines.push({ label, value });
      } else {
        if (!request?.title?.includes(part)) {
          const key = part.toLowerCase();
          if (!seen.has(key)) { seen.add(key); lines.push({ label: "", value: part }); }
        }
      }
    }
    return lines;
  }

  function getScopeLabel(s?: string): string {
    if (s === "service") return td.laborOnly || "Labor Only";
    if (s === "parts") return td.partsOnly || "Parts Only";
    if (s === "both") return td.partsAndLabor || "Parts + Labor";
    return s || "";
  }

  function getLocationLabel(l?: string): string {
    if (l === "IN_SHOP") return td.atTheShop || "At the shop (drop-off)";
    if (l === "MOBILE") return td.mobileService || "Mobile service (at your location)";
    if (l === "ROADSIDE") return td.roadsideAssist || "Roadside assistance";
    return l || "";
  }

  const currentStep = getStepIndex(request?.status);
  const isCancelled = request?.status === "CANCELLED";
  const isStale = request?.status === "SEARCHING_PROVIDERS" && request?.createdAt && Date.now() - new Date(request.createdAt).getTime() > 48 * 3600000;
  const canEdit = request?.status === "SEARCHING_PROVIDERS" || request?.status === "DRAFT";
  const canCancel = request?.status === "SEARCHING_PROVIDERS" || request?.status === "QUOTES_RECEIVED" || request?.status === "DRAFT";
  const serviceDetails = getServiceDetails();

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loading}><Text>{t.common?.loading || "Loading..."}</Text></View>
      </SafeAreaView>
    );
  }

  const stepLabels = [
    td.stepSubmitted || "Submitted",
    td.stepSentToShops || "Sent to Shops",
    td.stepAwaitingQuotes || "Awaiting Quotes",
    td.stepQuoteAccepted || "Accepted",
    td.stepScheduled || "Scheduled",
    td.stepInProgress || "In Progress",
    td.stepCompleted || "Completed",
  ];

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{td.serviceRequest || "Service Request"}</Text>
        <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
          <Ionicons name="share-outline" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: canEdit || canCancel ? 100 : 40 }}>

        {/* â•â•â• PROGRESS STEPPER â•â•â• */}
        {!isCancelled && (
          <View style={s.stepperWrap}>
            <View style={s.stepperRow}>
              {PROGRESS_STEPS.map((_, idx) => {
                const isDone = idx < currentStep;
                const isCurr = idx === currentStep;
                const isFuture = idx > currentStep;
                return (
                  <View key={idx} style={s.stepItem}>
                    {idx > 0 && <View style={[s.stepLine, isDone || isCurr ? s.stepLineDone : s.stepLineFuture]} />}
                    {isCurr ? (
                      <Animated.View style={[s.stepDot, s.stepDotCurr, { transform: [{ scale: pulseAnim }] }]}>
                        <View style={s.stepDotInner} />
                      </Animated.View>
                    ) : (
                      <View style={[s.stepDot, isDone ? s.stepDotDone : s.stepDotFuture]}>
                        {isDone && <Ionicons name="checkmark" size={10} color="#fff" />}
                      </View>
                    )}
                    {(isDone || isCurr || idx === currentStep + 1) && (
                      <Text style={[s.stepLabel, isCurr && s.stepLabelCurr, isFuture && s.stepLabelFuture]} numberOfLines={2}>
                        {stepLabels[idx]}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
            {request?.status === "SEARCHING_PROVIDERS" && (
              <View style={s.stepperInfo}>
                <Ionicons name="pricetags-outline" size={14} color="#6b7280" />
                <Text style={s.stepperInfoText}>
                  {quotes.length > 0
                    ? (td.quotesReceivedCount || "%d quote(s) received").replace("%d", String(quotes.length))
                    : td.noQuotesYet || "No quotes yet"}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <View style={s.cancelledBanner}>
            <Ionicons name="close-circle" size={20} color="#ef4444" />
            <Text style={s.cancelledText}>{td.requestCancelledMsg || "This request has been cancelled"}</Text>
          </View>
        )}

        {/* â•â•â• CONTEXTUAL PROGRESS MESSAGE â•â•â• */}
        {getProgressMessage() !== "" && (
          <View style={s.progressMsg}>
            <Ionicons name={quotes.length > 0 && request?.status !== "COMPLETED" ? "pricetags" : "information-circle"} size={18} color={quotes.length > 0 ? "#3b82f6" : "#6b7280"} />
            <Text style={s.progressMsgText}>{getProgressMessage()}</Text>
          </View>
        )}

        {/* â•â•â• SERVICE REQUESTED CARD â•â•â• */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardIconWrap}><Ionicons name="construct" size={20} color="#1976d2" /></View>
            <Text style={s.cardTitle}>{td.serviceRequested || "Service Requested"}</Text>
            <View style={[s.statusBadge, { backgroundColor: getStatusColor(request?.status) + "20" }]}>
              <View style={[s.statusDot, { backgroundColor: getStatusColor(request?.status) }]} />
              <Text style={[s.statusBadgeText, { color: getStatusColor(request?.status) }]}>{getStatusLabel(request?.status)}</Text>
            </View>
          </View>

          <Text style={s.serviceTitle}>{request?.title}</Text>

          {/* Key-value service details */}
          {serviceDetails.length > 0 && (
            <View style={s.kvSection}>
              <Text style={s.kvSectionTitle}>{td.serviceDetails || "Service Details"}</Text>
              {serviceDetails.map((item, i) => {
                const isFilter = /filter/i.test(item.label);
                return (
                  <View key={i}>
                    <View style={s.kvRow}>
                      <Text style={s.kvLabel}>{item.label || td.note || "Note"}</Text>
                      {isFilter ? (
                        <View style={{ flex: 1.5, flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 6 }}>
                          {item.value.split(",").map((f: string, fi: number) => (
                            <View key={fi} style={s.chip}>
                              <Ionicons name="funnel" size={12} color="#1976d2" />
                              <Text style={s.chipText}>{f.trim()}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={s.kvValue}>{item.value}</Text>
                      )}
                    </View>
                    {i < serviceDetails.length - 1 && <View style={s.kvDivider} />}
                  </View>
                );
              })}
            </View>
          )}

          {/* Additional info */}
          <View style={s.kvSection}>
            {request?.serviceType && (
              <><View style={s.kvRow}><Text style={s.kvLabel}>{t.common?.serviceType || "Service Type"}</Text><Text style={s.kvValue}>{request.serviceType.replace(/_/g, " ")}</Text></View><View style={s.kvDivider} /></>
            )}
            {request?.serviceLocationType && (
              <><View style={s.kvRow}><Text style={s.kvLabel}>{td.serviceLocation || "Service Location"}</Text><Text style={s.kvValue}>{getLocationLabel(request.serviceLocationType)}</Text></View><View style={s.kvDivider} /></>
            )}
            {request?.serviceScope && (
              <><View style={s.kvRow}><Text style={s.kvLabel}>{td.whatsIncluded || "What's Included"}</Text><Text style={s.kvValue}>{getScopeLabel(request.serviceScope)}</Text></View><View style={s.kvDivider} /></>
            )}
            {request?.urgency && (
              <><View style={s.kvRow}><Text style={s.kvLabel}>{(t.common as any)?.urgency || "Urgency"}</Text><Text style={[s.kvValue, { color: request.urgency === "urgent" ? "#ef4444" : request.urgency === "high" ? "#f59e0b" : "#374151", fontWeight: "600" }]}>{request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}</Text></View><View style={s.kvDivider} /></>
            )}
            <View style={s.kvRow}><Text style={s.kvLabel}>{td.submitted || "Submitted"}</Text><Text style={s.kvValue}>{request?.createdAt ? new Date(request.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}</Text></View>
          </View>
        </View>

        {/* â•â•â• YOUR VEHICLE â•â•â• */}
        {request?.vehicle && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIconWrap, { backgroundColor: "#f0fdf4" }]}><Ionicons name="car-sport" size={20} color="#059669" /></View>
              <Text style={s.cardTitle}>{td.yourVehicle || "Your Vehicle"}</Text>
            </View>
            <Text style={s.vehicleName}>{request.vehicle.year} {request.vehicle.make} {request.vehicle.model} {request.vehicle.trim || ""}</Text>
            <View style={s.vehicleBadges}>
              {request.vehicle.fuelType && (
                <View style={s.vehicleBadge}><Ionicons name="flash" size={12} color="#1976d2" /><Text style={s.vehicleBadgeText}>{request.vehicle.fuelType}</Text></View>
              )}
              {request.vehicle.vehicleType && (
                <View style={[s.vehicleBadge, { backgroundColor: "#f0fdf4" }]}><Ionicons name="car" size={12} color="#059669" /><Text style={[s.vehicleBadgeText, { color: "#059669" }]}>{request.vehicle.vehicleType}</Text></View>
              )}
              {request.vehicleCategory && (
                <View style={[s.vehicleBadge, { backgroundColor: "#faf5ff" }]}><Ionicons name="options" size={12} color="#7c3aed" /><Text style={[s.vehicleBadgeText, { color: "#7c3aed" }]}>{request.vehicleCategory.replace(/_/g, " ")}</Text></View>
              )}
            </View>
          </View>
        )}

        {/* â•â•â• PHOTOS & NOTES PROMPT â•â•â• */}
        {(!request?.photos || request.photos?.length === 0) && !request?.customerNotes && canEdit && (
          <TouchableOpacity style={s.addPhotosPrompt} onPress={handleEdit}>
            <Ionicons name="camera-outline" size={24} color="#1976d2" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.addPhotosTitle}>{td.addPhotos || "Add Photos & Notes"}</Text>
              <Text style={s.addPhotosDesc}>{td.addPhotosDesc || "Add photos to help providers give you a more accurate quote."}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}

        {/* â•â•â• QUOTES â•â•â• */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{(t.common as any)?.quotes || "Quotes"} ({quotes.length})</Text>
          {quotes.length > 0 && (
            <View style={s.quoteBadge}>
              <Text style={s.quoteBadgeText}>{quotes.length > 1 ? (td.compareNow || "Compare now!") : td.reviewQuote || "Review"}</Text>
            </View>
          )}
        </View>

        {quotes.length === 0 && (
          <View style={s.emptyQuotes}>
            <MaterialCommunityIcons name="file-search-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyQuotesTitle}>{td.noQuotesTitle || "No quotes yet"}</Text>
            <Text style={s.emptyQuotesDesc}>{td.noQuotesDesc || "Providers are reviewing your request. You'll be notified when quotes arrive."}</Text>
          </View>
        )}

        {quotes.map((quote, idx) => (
          <TouchableOpacity key={quote.id} style={[s.quoteCard, idx === bestValueIndex && s.quoteCardBest]} onPress={() => handleViewQuoteDetails(quote)}>
            {idx === bestValueIndex && (
              <View style={s.bestBadge}><Ionicons name="trophy" size={12} color="#047857" /><Text style={s.bestText}>{(t.common as any)?.bestValue || "Best Value"}</Text></View>
            )}
            <View style={s.providerRow}>
              <View style={s.avatar}><Ionicons name="business" size={20} color="#1976d2" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.providerName}>{quote.provider.businessName}</Text>
                <View style={s.ratingRow}>
                  <Ionicons name="star" size={14} color="#fbbf24" />
                  <Text style={s.ratingText}>{quote.provider.rating.toFixed(1)} ({quote.provider.totalReviews} {quote.provider.totalReviews === 1 ? td.review || "review" : td.reviews || "reviews"})</Text>
                </View>
              </View>
              <Text style={s.quoteTotal}>${quote.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</Text>
            </View>

            <View style={s.costBreakdown}>
              <View style={s.costItem}><Text style={s.costLabel}>{t.workOrder?.parts || "Parts"}</Text><Text style={s.costValue}>${quote.partsCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</Text></View>
              <View style={s.costDividerV} />
              <View style={s.costItem}><Text style={s.costLabel}>{t.workOrder?.labor || "Labor"}</Text><Text style={s.costValue}>${quote.laborCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</Text></View>
              {quote.estimatedTime ? <><View style={s.costDividerV} /><View style={s.costItem}><Text style={s.costLabel}>{t.workOrder?.estimatedTime || "Est. Time"}</Text><Text style={s.costValue}>{quote.estimatedTime}</Text></View></> : null}
            </View>

            <View style={s.quoteActions}>
              <TouchableOpacity style={s.chatBtn} onPress={(e) => { e.stopPropagation(); handleChat(quote); }}>
                <Ionicons name="chatbubble-outline" size={16} color="#1976d2" /><Text style={s.chatText}>{(t.common as any)?.chat || "Chat"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.acceptBtn} onPress={(e) => { e.stopPropagation(); handleAcceptQuote(quote); }}>
                <Ionicons name="checkmark" size={16} color="#fff" /><Text style={s.acceptText}>{(t.common as any)?.accept || "Accept"}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {/* Renew */}
        {(isCancelled || isStale) && (
          <TouchableOpacity style={s.renewBtn} onPress={() => {
            Alert.alert((t.common as any)?.renewRequest || "Renew Request", (t.common as any)?.renewRequestConfirm || "This will reopen your request to receive more quotes. Continue?", [
              { text: t.common?.cancel || "Cancel", style: "cancel" },
              { text: (t.common as any)?.renew || "Renew", onPress: async () => { try { await api.post(`/service-requests/${requestId}/renew`); Alert.alert(t.common?.success || "Success!", (t.common as any)?.renewSuccess || "Your request has been renewed."); loadDetails(); } catch (err: any) { Alert.alert(t.common?.error || "Error", err?.response?.data?.message || "Could not renew request"); } } },
            ]);
          }}>
            <Ionicons name="refresh" size={20} color="#1976d2" /><Text style={s.renewBtnText}>{(t.common as any)?.renewForMoreQuotes || "Renew Request for More Quotes"}</Text>
          </TouchableOpacity>
        )}

        {/* â•â•â• REFERENCE NUMBER (bottom) â•â•â• */}
        {request?.requestNumber && (
          <View style={s.refSection}>
            <Text style={s.refLabel}>{td.referenceNumber || "Reference Number"}</Text>
            <Text style={s.refValue}>#{request.requestNumber}</Text>
          </View>
        )}
      </ScrollView>

      {/* â•â•â• BOTTOM ACTIONS â•â•â• */}
      {(canEdit || canCancel) && (
        <View style={s.bottomActions}>
          {canEdit && (
            <TouchableOpacity style={s.actionBtnEdit} onPress={handleEdit}>
              <Ionicons name="create-outline" size={18} color="#1976d2" /><Text style={s.actionBtnEditText}>{td.editRequest || "Edit Request"}</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity style={s.actionBtnCancel} onPress={handleCancel}>
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" /><Text style={s.actionBtnCancelText}>{t.common?.cancel || "Cancel"}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  shareBtn: { padding: 8 },
  // Stepper
  stepperWrap: { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  stepperRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  stepItem: { alignItems: "center", flex: 1, position: "relative" },
  stepLine: { position: "absolute", top: 10, right: "50%", width: "100%", height: 2, zIndex: -1 },
  stepLineDone: { backgroundColor: "#10b981" },
  stepLineFuture: { backgroundColor: "#e5e7eb" },
  stepDot: { width: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  stepDotDone: { backgroundColor: "#10b981" },
  stepDotCurr: { backgroundColor: "#dbeafe", width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#3b82f6" },
  stepDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#3b82f6" },
  stepDotFuture: { backgroundColor: "#e5e7eb" },
  stepLabel: { fontSize: 9, color: "#10b981", textAlign: "center", fontWeight: "600", maxWidth: 52 },
  stepLabelCurr: { color: "#3b82f6", fontWeight: "700" },
  stepLabelFuture: { color: "#9ca3af", fontWeight: "400" },
  stepperInfo: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6", justifyContent: "center" },
  stepperInfoText: { fontSize: 13, color: "#6b7280" },
  // Cancelled
  cancelledBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: 16, padding: 14, backgroundColor: "#fef2f2", borderRadius: 12, borderWidth: 1, borderColor: "#fecaca" },
  cancelledText: { fontSize: 14, color: "#dc2626", fontWeight: "600" },
  // Progress msg
  progressMsg: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginHorizontal: 16, marginTop: 12, padding: 14, backgroundColor: "#eff6ff", borderRadius: 12 },
  progressMsgText: { fontSize: 13, color: "#374151", flex: 1, lineHeight: 20 },
  // Cards
  card: { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16, padding: 20, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  cardIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center", marginRight: 10 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#374151", flex: 1 },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  serviceTitle: { fontSize: 19, fontWeight: "700", color: "#111827", marginBottom: 4 },
  // KV
  kvSection: { marginTop: 14, backgroundColor: "#f8fafc", borderRadius: 12, padding: 14 },
  kvSectionTitle: { fontSize: 12, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  kvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 8 },
  kvLabel: { fontSize: 13, color: "#6b7280", flex: 1, marginRight: 12 },
  kvValue: { fontSize: 14, color: "#111827", fontWeight: "600", flex: 1.5, textAlign: "right" },
  kvDivider: { height: 1, backgroundColor: "#e5e7eb" },
  // Chips
  chipsSection: { marginTop: 14, backgroundColor: "#f8fafc", borderRadius: 12, padding: 14 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#dbeafe", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipText: { fontSize: 13, color: "#1976d2", fontWeight: "500" },
  // Vehicle
  vehicleName: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 10 },
  vehicleBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vehicleBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#eff6ff", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  vehicleBadgeText: { fontSize: 12, color: "#1976d2", fontWeight: "500" },
  // Photos
  addPhotosPrompt: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 16, padding: 16, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#dbeafe", borderStyle: "dashed" },
  addPhotosTitle: { fontSize: 14, fontWeight: "600", color: "#1976d2", marginBottom: 2 },
  addPhotosDesc: { fontSize: 12, color: "#6b7280", lineHeight: 18 },
  // Section
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  quoteBadge: { backgroundColor: "#dbeafe", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  quoteBadgeText: { fontSize: 12, fontWeight: "600", color: "#1976d2" },
  // Empty
  emptyQuotes: { alignItems: "center", padding: 32, marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 16 },
  emptyQuotesTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginTop: 12 },
  emptyQuotesDesc: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 6, lineHeight: 20, maxWidth: 280 },
  // Quote cards
  quoteCard: { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  quoteCardBest: { borderWidth: 1.5, borderColor: "#10b981" },
  bestBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: "#d1fae5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  bestText: { fontSize: 11, fontWeight: "700", color: "#047857" },
  providerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#dbeafe", justifyContent: "center", alignItems: "center", marginRight: 12 },
  providerName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  ratingText: { fontSize: 12, color: "#6b7280" },
  quoteTotal: { fontSize: 20, fontWeight: "800", color: "#1976d2" },
  costBreakdown: { flexDirection: "row", backgroundColor: "#f8fafc", borderRadius: 10, padding: 12, marginBottom: 12, alignItems: "center" },
  costItem: { flex: 1, alignItems: "center" },
  costLabel: { fontSize: 11, color: "#9ca3af", marginBottom: 2 },
  costValue: { fontSize: 13, fontWeight: "600", color: "#374151" },
  costDividerV: { width: 1, height: 28, backgroundColor: "#e5e7eb" },
  quoteActions: { flexDirection: "row", gap: 10 },
  chatBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#eff6ff", paddingVertical: 11, borderRadius: 10 },
  chatText: { fontSize: 13, fontWeight: "600", color: "#1976d2" },
  acceptBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#10b981", paddingVertical: 11, borderRadius: 10 },
  acceptText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  // Renew
  renewBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 16, paddingVertical: 14, backgroundColor: "#eff6ff", borderRadius: 12, borderWidth: 1, borderColor: "#bfdbfe" },
  renewBtnText: { fontSize: 15, fontWeight: "600", color: "#1976d2" },
  // Ref
  refSection: { alignItems: "center", marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb", marginHorizontal: 32 },
  refLabel: { fontSize: 11, color: "#9ca3af", marginBottom: 4 },
  refValue: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  // Bottom
  bottomActions: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  actionBtnEdit: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#eff6ff", paddingVertical: 14, borderRadius: 12 },
  actionBtnEditText: { fontSize: 14, fontWeight: "600", color: "#1976d2" },
  actionBtnCancel: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#fef2f2", paddingVertical: 14, borderRadius: 12 },
  actionBtnCancelText: { fontSize: 14, fontWeight: "600", color: "#ef4444" },
});
