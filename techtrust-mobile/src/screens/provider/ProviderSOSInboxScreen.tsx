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
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as Location from "expo-location";
import api from "../../services/api";

// ─── SOS type display map ─────────────────────────────────────────────────────

const SOS_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  JUMP_START:      { label: "Jump Start",          icon: "battery-charging", color: "#f59e0b", bg: "#fef3c7" },
  FLAT_TIRE:       { label: "Flat Tire",            icon: "car-tire-alert",   color: "#3b82f6", bg: "#dbeafe" },
  FUEL_DELIVERY:   { label: "Fuel Delivery",        icon: "gas-station",      color: "#10b981", bg: "#d1fae5" },
  LOCKOUT:         { label: "Vehicle Lockout",      icon: "key-variant",      color: "#8b5cf6", bg: "#ede9fe" },
  TOWING:          { label: "Towing",               icon: "tow-truck",        color: "#dc2626", bg: "#fee2e2" },
  BATTERY_REPLACE: { label: "Battery Replacement",  icon: "car-battery",      color: "#ec4899", bg: "#fce7f3" },
};

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
      console.error("SOS inbox init error", e);
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
      Alert.alert("Error", "Could not go online. Try again.");
    }
  };

  const goOffline = async () => {
    try {
      await api.patch("/sos/availability", { status: "OFFLINE" });
      setIsOnline(false);
      setRequests([]);
      stopPolling();
    } catch {
      Alert.alert("Error", "Could not update availability.");
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
      Alert.alert("Price required", "Enter a valid price before accepting.");
      return;
    }
    setAccepting(true);
    try {
      await api.post(`/sos/${acceptModal.id}/accept`, { offeredPrice: price });
      setAcceptModal(null);
      setOfferedPrice("");
      Alert.alert(
        "Request Accepted!",
        "The customer has 30 seconds to confirm. You'll be notified if they accept.",
        [{ text: "OK", onPress: () => fetchRequests() }]
      );
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Could not accept request. It may have been taken.";
      Alert.alert("Accept Failed", msg);
      setAcceptModal(null);
      fetchRequests();
    } finally {
      setAccepting(false);
    }
  };

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  const formatAge = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins === 1) return "1 min ago";
    return `${mins} min ago`;
  };

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header navigation={navigation} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2B5EA7" />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <Header navigation={navigation} />

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
                {isOnline ? "You are Online" : "You are Offline"}
              </Text>
              <Text style={styles.statusSub}>
                {isOnline
                  ? "Showing nearby SOS requests. Tap to go offline."
                  : "Tap to go online and receive SOS requests."}
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
          <Text style={styles.rateCardLinkText}>Configure your SOS prices</Text>
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
                  {requests.length} nearby request{requests.length !== 1 ? "s" : ""}
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
                <Text style={styles.modalTitle}>Accept SOS Request</Text>

                {/* Summary */}
                <View style={styles.modalSummary}>
                  <View style={[styles.modalTypeIcon, { backgroundColor: SOS_META[acceptModal.sosType]?.bg }]}>
                    <MaterialCommunityIcons
                      name={SOS_META[acceptModal.sosType]?.icon ?? "alert"}
                      size={24}
                      color={SOS_META[acceptModal.sosType]?.color ?? "#374151"}
                    />
                  </View>
                  <View>
                    <Text style={styles.modalTypeName}>
                      {SOS_META[acceptModal.sosType]?.label ?? acceptModal.sosType}
                    </Text>
                    <Text style={styles.modalVehicle}>{acceptModal.vehicleDescription}</Text>
                    <Text style={styles.modalDistance}>
                      {formatDistance(acceptModal.distanceKm)} away · ~{acceptModal.estimatedEtaMinutes} min ETA
                    </Text>
                  </View>
                </View>

                {/* Towing note */}
                {acceptModal.pricingType === "towing" && acceptModal.suggestedPerMileRate != null && (
                  <View style={styles.towingNote}>
                    <MaterialCommunityIcons name="information-outline" size={14} color="#6b7280" />
                    <Text style={styles.towingNoteText}>
                      Your per-mile rate of ${acceptModal.suggestedPerMileRate}/mi will be added to this base fee at completion.
                    </Text>
                  </View>
                )}

                {/* Price input */}
                <Text style={styles.priceLabel}>
                  {acceptModal.pricingType === "towing" ? "Base Fee ($)" : "Your Price ($)"}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceCurrency}>$</Text>
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
                    No rate configured for this type — enter your price to continue.
                  </Text>
                )}

                {/* 30s warning */}
                <View style={styles.timerNote}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#f59e0b" />
                  <Text style={styles.timerNoteText}>
                    Customer has 30 seconds to confirm after you accept.
                  </Text>
                </View>

                {/* Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelModalBtn}
                    onPress={() => { setAcceptModal(null); setOfferedPrice(""); }}
                    disabled={accepting}
                  >
                    <Text style={styles.cancelModalText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptBtn, accepting && { opacity: 0.6 }]}
                    onPress={handleAccept}
                    disabled={accepting}
                  >
                    {accepting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.acceptBtnText}>Accept for ${Number(offeredPrice || 0).toFixed(2)}</Text>
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

function Header({ navigation }: { navigation: any }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>SOS Inbox</Text>
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
  const meta = SOS_META[req.sosType] ?? { label: req.sosType, icon: "alert", color: "#374151", bg: "#f3f4f6" };

  return (
    <View style={styles.card}>
      {/* Type + badge */}
      <View style={styles.cardTop}>
        <View style={[styles.typeIcon, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTypeName}>{meta.label}</Text>
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
          <Text style={styles.metricValue}>~{req.estimatedEtaMinutes} min ETA</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <MaterialCommunityIcons name="currency-usd" size={15} color="#6b7280" />
          <Text style={styles.metricValue}>
            {req.pricingType === "flat" && req.suggestedPrice != null
              ? `$${req.suggestedPrice.toFixed(2)}`
              : req.pricingType === "towing" && req.suggestedBaseFee != null
              ? `$${req.suggestedBaseFee} + /mi`
              : "Set price"}
          </Text>
        </View>
      </View>

      {/* Accept button */}
      <TouchableOpacity style={[styles.acceptCardBtn, { borderColor: meta.color }]} onPress={onAccept}>
        <MaterialCommunityIcons name="check-circle" size={18} color={meta.color} />
        <Text style={[styles.acceptCardBtnText, { color: meta.color }]}>
          {req.suggestedPrice != null || req.suggestedBaseFee != null
            ? `Accept at $${(req.suggestedPrice ?? req.suggestedBaseFee ?? 0).toFixed(2)}`
            : "Accept & Set Price"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="radar" size={56} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No nearby SOS requests</Text>
      <Text style={styles.emptySubtitle}>
        Pull down to refresh, or wait — new requests appear automatically every 8 seconds.
      </Text>
    </View>
  );
}

function OfflineState({ onGoOnline }: { onGoOnline: () => void }) {
  return (
    <View style={styles.offlineState}>
      <MaterialCommunityIcons name="wifi-off" size={56} color="#d1d5db" />
      <Text style={styles.emptyTitle}>You are offline</Text>
      <Text style={styles.emptySubtitle}>
        Go online to see and accept nearby SOS requests from customers.
      </Text>
      <TouchableOpacity style={styles.goOnlineBtn} onPress={onGoOnline}>
        <Text style={styles.goOnlineBtnText}>Go Online Now</Text>
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
