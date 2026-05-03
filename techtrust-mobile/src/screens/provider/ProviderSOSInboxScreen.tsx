/**
 * ProviderSOSInboxScreen — Real-time SOS request inbox for online providers
 * Shows nearby active SOS requests; provider can accept with their rate-card price
 * or enter a custom price for unconfigured service types.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import api from "../../services/api";
import { log } from "../../utils/logger";
import { useI18n } from "../../i18n";
import { interpolate } from "../../i18n/interpolate";

// ─── SOS type visuals (labels from t.sos / i18n) ─────────────────────────────

const SOS_STYLES: Record<string, { icon: any; color: string; bg: string }> = {
  JUMP_START: { icon: "battery-charging", color: "#f59e0b", bg: "#fef3c7" },
  FLAT_TIRE: { icon: "car-tire-alert", color: "#3b82f6", bg: "#dbeafe" },
  FUEL_DELIVERY: { icon: "gas-station", color: "#10b981", bg: "#d1fae5" },
  LOCKOUT: { icon: "key-variant", color: "#8b5cf6", bg: "#ede9fe" },
  TOWING: { icon: "tow-truck", color: "#dc2626", bg: "#fee2e2" },
  BATTERY_REPLACE: { icon: "car-battery", color: "#ec4899", bg: "#fce7f3" },
};

function getSosTypeLabel(key: string, ts: Record<string, string | undefined>) {
  const map: Record<string, string | undefined> = {
    JUMP_START: ts.typeJumpStart,
    FLAT_TIRE: ts.typeFlatTire,
    FUEL_DELIVERY: ts.typeFuelDelivery,
    LOCKOUT: ts.typeLockout,
    BATTERY_REPLACE: ts.typeBatteryReplace,
    TOWING: ts.typeTowing,
  };
  return map[key] || key;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SOSRequest {
  id: string;
  sosType: string;
  customerName: string;
  vehicleDescription: string;
  distanceKm: number;
  estimatedEtaMinutes: number;
  suggestedPrice: number | null;
  suggestedBaseFee: number | null;
  suggestedPerMileRate: number | null;
  pricingType: "flat" | "towing";
  createdAt: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProviderSOSInboxScreen({ navigation }: any) {
  const { t, formatCurrency } = useI18n();
  const fiatSymbol = (t as any).formats?.currencySymbol ?? "$";
  const ti = (t as any).providerSosInbox || {};
  const ts = (t.sos || {}) as Record<string, string | undefined>;
  const [requests, setRequests] = useState<SOSRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Accept modal state
  const [acceptModal, setAcceptModal] = useState<SOSRequest | null>(null);
  const [offeredPrice, setOfferedPrice] = useState("");
  const [accepting, setAccepting] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for online dot
  useEffect(() => {
    if (!isOnline) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isOnline]);

  useEffect(() => {
    initialize();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const initialize = async () => {
    setLoading(true);
    try {
      // Get location
      const { status } = await Location.requestForegroundPermissionsAsync();
      let newLoc: { lat: number; lng: number } | null = null;
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(newLoc);
      }
      // Load availability + requests
      const res = await api.get("/sos/rate-card");
      const data = res.data?.data;
      if (data?.availabilityStatus === "ONLINE") {
        setIsOnline(true);
        await fetchRequests(newLoc);
        startPolling();
      } else {
        setIsOnline(false);
      }
    } catch (e) {
      log.error("SOS inbox init error", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async (loc?: { lat: number; lng: number } | null) => {
    try {
      const params: Record<string, string> = {};
      const currentLoc = loc ?? location;
      if (currentLoc) {
        params.lat = String(currentLoc.lat);
        params.lng = String(currentLoc.lng);
      }
      const res = await api.get("/sos/nearby", { params });
      setRequests(res.data?.data?.requests ?? []);
    } catch (e: any) {
      // If 403 (offline), clear list
      if (e?.response?.status === 403) setRequests([]);
    }
  };

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchRequests(), 8000);
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const goOnline = async () => {
    try {
      await api.patch("/sos/availability", { status: "ONLINE" });
      setIsOnline(true);
      await fetchRequests();
      startPolling();
    } catch {
      Alert.alert(
        t.common?.error || "Error",
        t.provider?.sosGoOnlineFailed || "Could not go online. Try again.",
      );
    }
  };

  const goOffline = async () => {
    try {
      await api.patch("/sos/availability", { status: "OFFLINE" });
      setIsOnline(false);
      setRequests([]);
      stopPolling();
    } catch {
      Alert.alert(
        t.common?.error || "Error",
        t.provider?.sosAvailabilityUpdateFailed || "Could not update availability.",
      );
    }
  };

  const openAcceptModal = (req: SOSRequest) => {
    setAcceptModal(req);
    // Pre-fill price from suggested rate card price
    if (req.pricingType === "flat" && req.suggestedPrice != null) {
      setOfferedPrice(String(req.suggestedPrice));
    } else if (req.pricingType === "towing" && req.suggestedBaseFee != null) {
      // For towing show base fee — per mile is communicated separately
      setOfferedPrice(String(req.suggestedBaseFee));
    } else {
      setOfferedPrice("");
    }
  };

  const handleAccept = async () => {
    if (!acceptModal) return;
    const price = Number(offeredPrice);
    if (!price || price <= 0) {
      Alert.alert(
        t.provider?.sosPriceRequiredTitle || "Price required",
        t.provider?.sosPriceRequiredBody || "Enter a valid price before accepting.",
      );
      return;
    }
    setAccepting(true);
    try {
      await api.post(`/sos/${acceptModal.id}/accept`, { offeredPrice: price });
      setAcceptModal(null);
      setOfferedPrice("");
      Alert.alert(
        t.provider?.sosRequestAcceptedTitle || "Request Accepted!",
        t.provider?.sosRequestAcceptedBody ||
          "The customer has 30 seconds to confirm. You'll be notified if they accept.",
        [{ text: t.common?.ok || "OK", onPress: () => fetchRequests() }],
      );
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        t.provider?.sosAcceptDefaultError ||
        "Could not accept request. It may have been taken.";
      Alert.alert(t.provider?.sosAcceptFailedTitle || "Accept Failed", msg);
      setAcceptModal(null);
      fetchRequests();
    } finally {
      setAccepting(false);
    }
  };

  const formatDistance = (km: number) => {
    if (km < 1) {
      return (ti.distanceMeters || "{{m}} m").replace(
        "{{m}}",
        String(Math.round(km * 1000)),
      );
    }
    return (ti.distanceKm || "{{km}} km").replace("{{km}}", km.toFixed(1));
  };

  const formatAge = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return ti.ageJustNow || "Just now";
    if (mins === 1) return ti.ageOneMin || "1 min ago";
    return (ti.ageMinsAgo || "{{count}} min ago").replace(
      "{{count}}",
      String(mins),
    );
  };

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header navigation={navigation} title={ti.screenTitle || "SOS Inbox"} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2B5EA7" />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <Header navigation={navigation} title={ti.screenTitle || "SOS Inbox"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Online / Offline toggle banner */}
        <TouchableOpacity
          onPress={isOnline ? goOffline : goOnline}
          style={[styles.statusBanner, { backgroundColor: isOnline ? "#22c55e" : "#6b7280" }]}
          activeOpacity={0.85}
        >
          <View style={styles.statusLeft}>
            <Animated.View style={[styles.statusDot, isOnline && { transform: [{ scale: pulseAnim }] }]} />
            <View>
              <Text style={styles.statusTitle}>
                {isOnline
                  ? ti.youAreOnline || "You are Online"
                  : ti.youAreOffline || "You are Offline"}
              </Text>
              <Text style={styles.statusSub}>
                {isOnline
                  ? ti.statusSubOnline ||
                    "Showing nearby SOS requests. Tap to go offline."
                  : ti.statusSubOffline ||
                    "Tap to go online and receive SOS requests."}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name={isOnline ? "toggle-switch" : "toggle-switch-off"}
            size={34}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Rate card shortcut */}
        <TouchableOpacity
          style={styles.rateCardLink}
          onPress={() => navigation.navigate("SOSRateCard")}
        >
          <MaterialCommunityIcons name="tag-multiple" size={16} color="#2B5EA7" />
          <Text style={styles.rateCardLinkText}>
            {ti.configurePricesLink || "Configure your SOS prices"}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color="#2B5EA7" />
        </TouchableOpacity>

        {/* Request list */}
        {isOnline ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
            {requests.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <Text style={styles.sectionLabel}>
                  {requests.length === 1
                    ? ti.nearbyRequestsOne || "1 nearby request"
                    : (ti.nearbyRequestsMany || "{{count}} nearby requests").replace(
                        "{{count}}",
                        String(requests.length),
                      )}
                </Text>
                {requests.map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    onAccept={() => openAcceptModal(req)}
                    formatDistance={formatDistance}
                    formatAge={formatAge}
                  />
                ))}
              </>
            )}
          </View>
        ) : (
          <OfflineState onGoOnline={goOnline} />
        )}
      </ScrollView>

      {/* Accept modal */}
      <Modal visible={!!acceptModal} transparent animationType="slide" onRequestClose={() => setAcceptModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {acceptModal && (
              <>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>
                  {ti.modalTitle || "Accept SOS Request"}
                </Text>

                {/* Summary */}
                <View style={styles.modalSummary}>
                  <View style={[styles.modalTypeIcon, { backgroundColor: SOS_STYLES[acceptModal.sosType]?.bg }]}>
                    <MaterialCommunityIcons
                      name={SOS_STYLES[acceptModal.sosType]?.icon ?? "alert"}
                      size={24}
                      color={SOS_STYLES[acceptModal.sosType]?.color ?? "#374151"}
                    />
                  </View>
                  <View>
                    <Text style={styles.modalTypeName}>
                      {getSosTypeLabel(acceptModal.sosType, ts)}
                    </Text>
                    <Text style={styles.modalVehicle}>{acceptModal.vehicleDescription}</Text>
                    <Text style={styles.modalDistance}>
                      {(ti.modalAwayEta || "{{distance}} away · ~{{minutes}} min ETA")
                        .replace("{{distance}}", formatDistance(acceptModal.distanceKm))
                        .replace("{{minutes}}", String(acceptModal.estimatedEtaMinutes))}
                    </Text>
                  </View>
                </View>

                {/* Towing note */}
                {acceptModal.pricingType === "towing" && acceptModal.suggestedPerMileRate != null && (
                  <View style={styles.towingNote}>
                    <MaterialCommunityIcons name="information-outline" size={14} color="#6b7280" />
                    <Text style={styles.towingNoteText}>
                      {(ti.towingPerMileNote ||
                        "Your per-mile rate of {{rate}}/mi will be added to this base fee at completion.").replace(
                        "{{rate}}",
                        acceptModal.suggestedPerMileRate != null
                          ? formatCurrency(acceptModal.suggestedPerMileRate)
                          : "",
                      )}
                    </Text>
                  </View>
                )}

                {/* Price input */}
                <Text style={styles.priceLabel}>
                  {acceptModal.pricingType === "towing"
                    ? ti.priceLabelTowing || "Base Fee ($)"
                    : ti.priceLabelFlat || "Your Price ($)"}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceCurrency}>{fiatSymbol}</Text>
                  <TextInput
                    style={styles.priceInputLarge}
                    value={offeredPrice}
                    onChangeText={setOfferedPrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                    autoFocus
                  />
                </View>

                {acceptModal.suggestedPrice == null && acceptModal.suggestedBaseFee == null && (
                  <Text style={styles.noPriceNote}>
                    {ti.noRateConfiguredNote ||
                      "No rate configured for this type — enter your price to continue."}
                  </Text>
                )}

                {/* 30s warning */}
                <View style={styles.timerNote}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#f59e0b" />
                  <Text style={styles.timerNoteText}>
                    {ti.timerNoteCustomer ||
                      "Customer has 30 seconds to confirm after you accept."}
                  </Text>
                </View>

                {/* Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelModalBtn}
                    onPress={() => { setAcceptModal(null); setOfferedPrice(""); }}
                    disabled={accepting}
                  >
                    <Text style={styles.cancelModalText}>
                      {ti.cancel || t.common?.cancel || "Cancel"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptBtn, accepting && { opacity: 0.6 }]}
                    onPress={handleAccept}
                    disabled={accepting}
                  >
                    {accepting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.acceptBtnText}>
                        {(ti.acceptForAmount || "Accept for {{amount}}").replace(
                          "{{amount}}",
                          formatCurrency(Number(offeredPrice || 0)),
                        )}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Header({
  navigation,
  title,
}: {
  navigation: any;
  title: string;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function RequestCard({
  req,
  onAccept,
  formatDistance,
  formatAge,
}: {
  req: SOSRequest;
  onAccept: () => void;
  formatDistance: (km: number) => string;
  formatAge: (at: string) => string;
}) {
  const { t, formatCurrency } = useI18n();
  const ti = (t as any).providerSosInbox || {};
  const ts = (t.sos || {}) as Record<string, string | undefined>;
  const style = SOS_STYLES[req.sosType] ?? {
    icon: "alert",
    color: "#374151",
    bg: "#f3f4f6",
  };
  const typeLabel = getSosTypeLabel(req.sosType, ts);

  return (
    <View style={styles.card}>
      {/* Type + badge */}
      <View style={styles.cardTop}>
        <View style={[styles.typeIcon, { backgroundColor: style.bg }]}>
          <MaterialCommunityIcons name={style.icon} size={22} color={style.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTypeName}>{typeLabel}</Text>
          <Text style={styles.cardVehicle} numberOfLines={1}>{req.vehicleDescription}</Text>
        </View>
        <View style={styles.ageBadge}>
          <Text style={styles.ageBadgeText}>{formatAge(req.createdAt)}</Text>
        </View>
      </View>

      {/* Metrics row */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <MaterialCommunityIcons name="map-marker-distance" size={15} color="#6b7280" />
          <Text style={styles.metricValue}>{formatDistance(req.distanceKm)}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <MaterialCommunityIcons name="clock-outline" size={15} color="#6b7280" />
          <Text style={styles.metricValue}>
            {(ti.metricEta || "~{{minutes}} min ETA").replace(
              "{{minutes}}",
              String(req.estimatedEtaMinutes),
            )}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <MaterialCommunityIcons name="currency-usd" size={15} color="#6b7280" />
          <Text style={styles.metricValue}>
            {req.pricingType === "flat" && req.suggestedPrice != null
              ? formatCurrency(req.suggestedPrice)
              : req.pricingType === "towing" && req.suggestedBaseFee != null
              ? interpolate(
                  ti.towingBasePlusPerUnit || "{{amount}} + /{{unit}}",
                  {
                    amount: formatCurrency(Number(req.suggestedBaseFee)),
                    unit:
                      ((t as { carWash?: { mile?: string } }).carWash?.mile as
                        | string
                        | undefined) || "mi",
                  },
                )
              : ti.priceSetPrice || "Set price"}
          </Text>
        </View>
      </View>

      {/* Accept button */}
      <TouchableOpacity style={[styles.acceptCardBtn, { borderColor: style.color }]} onPress={onAccept}>
        <MaterialCommunityIcons name="check-circle" size={18} color={style.color} />
        <Text style={[styles.acceptCardBtnText, { color: style.color }]}>
          {req.suggestedPrice != null || req.suggestedBaseFee != null
            ? (ti.acceptAt || "Accept at {{amount}}").replace(
                "{{amount}}",
                formatCurrency(
                  Number(req.suggestedPrice ?? req.suggestedBaseFee ?? 0),
                ),
              )
            : ti.acceptAndSetPrice || "Accept & Set Price"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState() {
  const { t } = useI18n();
  const ti = (t as any).providerSosInbox || {};
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="radar" size={56} color="#d1d5db" />
      <Text style={styles.emptyTitle}>
        {ti.emptyTitle || "No nearby SOS requests"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {ti.emptySubtitle ||
          "Pull down to refresh, or wait — new requests appear automatically every 8 seconds."}
      </Text>
    </View>
  );
}

function OfflineState({ onGoOnline }: { onGoOnline: () => void }) {
  const { t } = useI18n();
  const ti = (t as any).providerSosInbox || {};
  return (
    <View style={styles.offlineState}>
      <MaterialCommunityIcons name="wifi-off" size={56} color="#d1d5db" />
      <Text style={styles.emptyTitle}>
        {ti.offlineTitle || "You are offline"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {ti.offlineSubtitle ||
          "Go online to see and accept nearby SOS requests from customers."}
      </Text>
      <TouchableOpacity style={styles.goOnlineBtn} onPress={onGoOnline}>
        <Text style={styles.goOnlineBtnText}>
          {ti.goOnlineNow || "Go Online Now"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },

  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.85)" },
  statusTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  statusSub:   { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },

  rateCardLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
  },
  rateCardLinkText: { flex: 1, color: "#2B5EA7", fontSize: 13, fontWeight: "500" },

  sectionLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  typeIcon: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  cardTypeName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardVehicle: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  ageBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8,
  },
  ageBadgeText: { fontSize: 11, color: "#6b7280", fontWeight: "500" },

  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  metric: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "center" },
  metricValue: { fontSize: 13, color: "#374151", fontWeight: "500" },
  metricDivider: { width: 1, height: 16, backgroundColor: "#e5e7eb" },

  acceptCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 10,
  },
  acceptCardBtnText: { fontSize: 14, fontWeight: "700" },

  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  offlineState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: "#374151" },
  emptySubtitle: { fontSize: 14, color: "#9ca3af", textAlign: "center", lineHeight: 20 },
  goOnlineBtn: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  goOnlineBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: "#e5e7eb",
    borderRadius: 2, alignSelf: "center", marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16 },
  modalSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  modalTypeIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  modalTypeName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  modalVehicle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  modalDistance: { fontSize: 12, color: "#9ca3af", marginTop: 2 },

  towingNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: "#f3f4f6", borderRadius: 8, padding: 10, marginBottom: 14,
  },
  towingNoteText: { flex: 1, fontSize: 12, color: "#6b7280", lineHeight: 16 },

  priceLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2B5EA7",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  priceCurrency: { fontSize: 22, fontWeight: "700", color: "#2B5EA7", marginRight: 4 },
  priceInputLarge: {
    flex: 1,
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    paddingVertical: 14,
  },
  noPriceNote: { fontSize: 13, color: "#f59e0b", marginBottom: 12 },

  timerNote: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fffbeb", borderRadius: 8, padding: 10, marginBottom: 20,
  },
  timerNoteText: { fontSize: 12, color: "#92400e", lineHeight: 16 },

  modalActions: { flexDirection: "row", gap: 12 },
  cancelModalBtn: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingVertical: 14, borderRadius: 12,
    alignItems: "center",
  },
  cancelModalText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  acceptBtn: {
    flex: 2,
    backgroundColor: "#22c55e",
    paddingVertical: 14, borderRadius: 12,
    alignItems: "center",
  },
  acceptBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
