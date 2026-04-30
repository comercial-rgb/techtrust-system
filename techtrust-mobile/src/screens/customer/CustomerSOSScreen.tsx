/**
 * CustomerSOSScreen — Real-time Roadside Assistance
 *
 * Steps:
 *  1. SELECT — Pick SOS service type
 *  2. LOCATION — Confirm GPS capture
 *  3. BROADCAST — Waiting for a provider to accept (polls every 3s)
 *  4. OFFER — Provider accepted, 30s countdown to confirm or decline
 *  5. CONFIRMED — Provider dispatched, show details
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import api from "../../services/api";

const { width } = Dimensions.get("window");

// ─── SOS Types ────────────────────────────────────────────────────────────────

const SOS_TYPES = [
  { key: "JUMP_START",      label: "Jump Start",         icon: "battery-charging" as const, color: "#f59e0b", bg: "#fef3c7", desc: "Battery won't start" },
  { key: "FLAT_TIRE",       label: "Flat Tire",          icon: "car-tire-alert" as const,   color: "#3b82f6", bg: "#dbeafe", desc: "Need spare mounted" },
  { key: "FUEL_DELIVERY",   label: "Fuel Delivery",      icon: "gas-station" as const,       color: "#10b981", bg: "#d1fae5", desc: "Ran out of gas" },
  { key: "LOCKOUT",         label: "Lockout",            icon: "key-variant" as const,       color: "#8b5cf6", bg: "#ede9fe", desc: "Keys locked inside" },
  { key: "BATTERY_REPLACE", label: "Battery Replace",    icon: "car-battery" as const,       color: "#ec4899", bg: "#fce7f3", desc: "Battery needs replacing" },
  { key: "TOWING",          label: "Towing",             icon: "tow-truck" as const,         color: "#dc2626", bg: "#fee2e2", desc: "Need vehicle towed" },
];

type Step = "SELECT" | "LOCATION" | "BROADCAST" | "OFFER" | "CONFIRMED" | "CANCELLED";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CustomerSOSScreen({ navigation, route }: any) {
  const [step, setStep] = useState<Step>("SELECT");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<{ min: number | null; max: number | null; count: number } | null>(null);
  const [sosStatus, setSosStatus] = useState<string | null>(null);
  const [offeredPrice, setOfferedPrice] = useState<number | null>(null);
  const [confirmDeadline, setConfirmDeadline] = useState<Date | null>(null);
  const [confirmedProvider, setConfirmedProvider] = useState<any>(null);
  const [countdown, setCountdown] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Get vehicle from route params or default
  const vehicleId = route?.params?.vehicleId;

  // Pulse animation for broadcast screen
  useEffect(() => {
    if (step === "BROADCAST") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [step]);

  // Poll for SOS status when BROADCAST or OFFER
  useEffect(() => {
    if ((step === "BROADCAST" || step === "OFFER") && requestId) {
      pollInterval.current = setInterval(pollStatus, 3000);
    }
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [step, requestId]);

  // Countdown timer when offer received
  useEffect(() => {
    if (step === "OFFER" && confirmDeadline) {
      countdownInterval.current = setInterval(() => {
        const remaining = Math.ceil((new Date(confirmDeadline).getTime() - Date.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(countdownInterval.current!);
          setCountdown(0);
          // Window expired — back to broadcast
          setSosStatus("BROADCAST");
          setStep("BROADCAST");
          setOfferedPrice(null);
          setConfirmDeadline(null);
        } else {
          setCountdown(remaining);
        }
      }, 500);
    }
    return () => {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [step, confirmDeadline]);

  const pollStatus = useCallback(async () => {
    if (!requestId) return;
    try {
      const res = await api.get(`/sos/request/${requestId}/status`);
      const data = res.data?.data;
      if (!data) return;

      setSosStatus(data.sosStatus);

      if (data.sosStatus === "PENDING_CONFIRM" && data.offeredPrice) {
        setOfferedPrice(data.offeredPrice);
        setConfirmDeadline(data.confirmDeadline ? new Date(data.confirmDeadline) : null);
        setCountdown(Math.ceil((new Date(data.confirmDeadline).getTime() - Date.now()) / 1000));
        setStep("OFFER");
        setConfirmedProvider(data.provider);
      } else if (data.sosStatus === "CONFIRMED") {
        setStep("CONFIRMED");
      } else if (data.sosStatus === "BROADCAST") {
        if (step === "OFFER") {
          // Provider window expired, back to searching
          setStep("BROADCAST");
          setOfferedPrice(null);
          setConfirmDeadline(null);
        }
      } else if (data.sosStatus === "CANCELLED") {
        setStep("CANCELLED");
      }
    } catch { /* ignore network errors */ }
  }, [requestId, step]);

  // ── Step 1: Capture GPS ───────────────────────────────────────────────────

  const captureLocation = async () => {
    setLocationLoading(true);
    try {
      const Location = await import("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location Required", "TechTrust needs your location to find nearby providers.");
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setStep("LOCATION");
    } catch {
      Alert.alert("Error", "Could not get your location. Make sure GPS is enabled.");
    } finally {
      setLocationLoading(false);
    }
  };

  // ── Step 2: Submit SOS ────────────────────────────────────────────────────

  const submitSOS = async () => {
    if (!location || !selectedType) return;
    if (!vehicleId) {
      Alert.alert("Vehicle Required", "Please select a vehicle first from your profile.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/sos/request", {
        sosType: selectedType,
        customerLat: location.lat,
        customerLng: location.lng,
        vehicleId,
      });
      const data = res.data?.data;
      setRequestId(data.requestId);
      setPriceRange(data.estimatedPriceRange);
      setStep("BROADCAST");
    } catch (e: any) {
      const msg = e.response?.data?.message || "Could not submit SOS. Try again.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Confirm Provider ──────────────────────────────────────────────────────

  const confirmProvider = async () => {
    if (!requestId) return;
    setConfirming(true);
    try {
      await api.post(`/sos/request/${requestId}/confirm`);
      setStep("CONFIRMED");
    } catch (e: any) {
      const msg = e.response?.data?.message || "Could not confirm. The offer may have expired.";
      Alert.alert("Error", msg);
    } finally {
      setConfirming(false);
    }
  };

  const declineProvider = async () => {
    if (!requestId) return;
    try {
      await api.post(`/sos/request/${requestId}/decline`);
      setStep("BROADCAST");
      setOfferedPrice(null);
      setConfirmDeadline(null);
    } catch { /* ignore */ }
  };

  const cancelSOS = () => {
    Alert.alert("Cancel SOS?", "Are you sure you want to stop looking for a provider?", [
      { text: "Keep Searching", style: "cancel" },
      {
        text: "Cancel",
        style: "destructive",
        onPress: async () => {
          if (requestId) {
            try { await api.delete(`/sos/request/${requestId}`); } catch {}
          }
          navigation.goBack();
        },
      },
    ]);
  };

  const selectedTypeInfo = SOS_TYPES.find((t) => t.key === selectedType);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER STEPS
  // ─────────────────────────────────────────────────────────────────────────

  // ── Step: SELECT ──────────────────────────────────────────────────────────
  if (step === "SELECT") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Roadside SOS</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <View style={styles.sosAlert}>
            <MaterialCommunityIcons name="alert-circle" size={24} color="#dc2626" />
            <Text style={styles.sosAlertText}>What do you need help with?</Text>
          </View>

          <View style={styles.typesGrid}>
            {SOS_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setSelectedType(t.key)}
                style={[
                  styles.typeCard,
                  selectedType === t.key && { borderColor: t.color, borderWidth: 2 },
                ]}
              >
                <View style={[styles.typeIcon, { backgroundColor: t.bg }]}>
                  <MaterialCommunityIcons name={t.icon} size={28} color={t.color} />
                </View>
                <Text style={styles.typeLabel}>{t.label}</Text>
                <Text style={styles.typeDesc}>{t.desc}</Text>
                {selectedType === t.key && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={18}
                    color={t.color}
                    style={{ position: "absolute", top: 8, right: 8 }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {selectedType && (
            <TouchableOpacity
              onPress={captureLocation}
              disabled={locationLoading}
              style={[styles.ctaBtn, { backgroundColor: selectedTypeInfo?.color || "#dc2626" }]}
            >
              {locationLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="map-marker-radius" size={20} color="#fff" />
                  <Text style={styles.ctaBtnText}>Confirm My Location</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step: LOCATION ────────────────────────────────────────────────────────
  if (step === "LOCATION") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep("SELECT")} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Location</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
          <View style={styles.locationCard}>
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <View style={[styles.typeIcon, { backgroundColor: selectedTypeInfo?.bg, width: 64, height: 64, borderRadius: 18 }]}>
                <MaterialCommunityIcons name={selectedTypeInfo?.icon || "ambulance"} size={34} color={selectedTypeInfo?.color} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827", marginTop: 12 }}>{selectedTypeInfo?.label}</Text>
            </View>

            <View style={styles.coordRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#dc2626" />
              <Text style={styles.coordText}>
                {location?.lat.toFixed(5)}, {location?.lng.toFixed(5)}
              </Text>
            </View>
            <Text style={styles.coordNote}>
              Your GPS location has been captured. Providers within 50 miles will be notified.
            </Text>

            {priceRange === null && (
              <View style={styles.estimateBox}>
                <Text style={styles.estimateTitle}>Looking for nearby providers...</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={submitSOS}
              disabled={submitting}
              style={[styles.ctaBtn, { backgroundColor: "#dc2626", marginTop: 24 }]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="broadcast" size={20} color="#fff" />
                  <Text style={styles.ctaBtnText}>Send SOS</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setStep("SELECT"); setLocation(null); }}
              style={{ marginTop: 12, alignItems: "center" }}
            >
              <Text style={{ color: "#6b7280", fontSize: 14 }}>Change service type</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step: BROADCAST ───────────────────────────────────────────────────────
  if (step === "BROADCAST") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#111827" }]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          {/* Pulsing rings */}
          <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 40 }}>
            {[80, 120, 160].map((size, i) => (
              <Animated.View
                key={i}
                style={{
                  position: "absolute",
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: `rgba(239, 68, 68, ${0.15 - i * 0.04})`,
                  transform: [{ scale: pulseAnim }],
                }}
              />
            ))}
            <View style={styles.sosCircle}>
              <MaterialCommunityIcons name="broadcast" size={36} color="#fff" />
            </View>
          </View>

          <Text style={styles.broadcastTitle}>Looking for help...</Text>
          <Text style={styles.broadcastSubtitle}>
            Notifying {selectedTypeInfo?.label} providers near your location.
            {"\n"}This usually takes less than 2 minutes.
          </Text>

          {priceRange && priceRange.count > 0 && priceRange.min !== null && (
            <View style={styles.priceRangeBadge}>
              <Text style={styles.priceRangeLabel}>Estimated cost</Text>
              <Text style={styles.priceRangeValue}>
                ${priceRange.min}–${priceRange.max}
              </Text>
              <Text style={styles.priceRangeNote}>based on {priceRange.count} nearby provider{priceRange.count > 1 ? "s" : ""}</Text>
            </View>
          )}

          <ActivityIndicator color="#ef4444" style={{ marginTop: 32 }} size="small" />

          <TouchableOpacity onPress={cancelSOS} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel SOS</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step: OFFER ───────────────────────────────────────────────────────────
  if (step === "OFFER") {
    const urgencyColor = countdown <= 10 ? "#ef4444" : countdown <= 20 ? "#f59e0b" : "#22c55e";
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#111827" }]}>
        <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
          <Text style={styles.broadcastTitle}>Provider Found!</Text>
          <Text style={[styles.broadcastSubtitle, { marginBottom: 24 }]}>
            A nearby provider has accepted your request.
          </Text>

          <View style={styles.offerCard}>
            {/* Provider info */}
            <View style={styles.providerRow}>
              <View style={styles.providerAvatar}>
                <MaterialCommunityIcons name="account-wrench" size={28} color="#2B5EA7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>
                  {confirmedProvider?.name || "Nearby Provider"}
                </Text>
                <Text style={styles.providerSub}>Roadside specialist</Text>
              </View>
            </View>

            {/* Price */}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Total for {selectedTypeInfo?.label}</Text>
              <Text style={styles.priceValue}>${offeredPrice?.toFixed(2)}</Text>
            </View>

            {/* Countdown */}
            <View style={[styles.countdownRow, { borderColor: urgencyColor }]}>
              <MaterialCommunityIcons name="clock-outline" size={18} color={urgencyColor} />
              <Text style={[styles.countdownText, { color: urgencyColor }]}>
                {countdown}s to decide
              </Text>
            </View>

            {/* Actions */}
            <TouchableOpacity
              onPress={confirmProvider}
              disabled={confirming}
              style={[styles.confirmBtn, confirming && { opacity: 0.7 }]}
            >
              {confirming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={22} color="#fff" />
                  <Text style={styles.confirmBtnText}>Accept — ${offeredPrice?.toFixed(2)}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={declineProvider} style={styles.declineBtn}>
              <Text style={styles.declineBtnText}>Decline — look for another provider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step: CONFIRMED ───────────────────────────────────────────────────────
  if (step === "CONFIRMED") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#111827" }]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={styles.confirmedIcon}>
            <MaterialCommunityIcons name="check-circle" size={56} color="#22c55e" />
          </View>
          <Text style={styles.confirmedTitle}>Help is on the way!</Text>
          <Text style={styles.broadcastSubtitle}>
            Your provider has been dispatched. Stay safe and remain with your vehicle.
          </Text>

          <View style={styles.confirmedCard}>
            <View style={styles.providerRow}>
              <View style={styles.providerAvatar}>
                <MaterialCommunityIcons name="account-wrench" size={28} color="#2B5EA7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{confirmedProvider?.name || "Provider"}</Text>
                <Text style={styles.providerSub}>En route to your location</Text>
              </View>
            </View>
            {offeredPrice && (
              <Text style={{ color: "#22c55e", fontWeight: "700", fontSize: 18, textAlign: "center", marginTop: 12 }}>
                Confirmed: ${offeredPrice.toFixed(2)}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.ctaBtn, { backgroundColor: "#22c55e", marginTop: 32 }]}
          >
            <Text style={styles.ctaBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  sosAlert: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fee2e2", borderRadius: 12, padding: 14, marginBottom: 20,
  },
  sosAlertText: { fontSize: 16, fontWeight: "600", color: "#dc2626", flex: 1 },
  typesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  typeCard: {
    width: (width - 44) / 2,
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    alignItems: "center", borderWidth: 2, borderColor: "#f3f4f6",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  typeIcon: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: "center", alignItems: "center", marginBottom: 10,
  },
  typeLabel: { fontSize: 14, fontWeight: "600", color: "#111827", textAlign: "center" },
  typeDesc: { fontSize: 12, color: "#6b7280", textAlign: "center", marginTop: 4 },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 16, paddingVertical: 16, marginTop: 24,
  },
  ctaBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  // Location step
  locationCard: {
    backgroundColor: "#fff", borderRadius: 24, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  coordRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  coordText: { fontSize: 13, color: "#374151", fontFamily: "monospace" },
  coordNote: { fontSize: 13, color: "#6b7280", lineHeight: 18 },
  estimateBox: {
    backgroundColor: "#f9fafb", borderRadius: 12, padding: 14, marginTop: 16,
    alignItems: "center",
  },
  estimateTitle: { fontSize: 14, fontWeight: "600", color: "#374151" },
  // Broadcast step
  sosCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#ef4444",
    justifyContent: "center", alignItems: "center",
  },
  broadcastTitle: { fontSize: 24, fontWeight: "700", color: "#fff", textAlign: "center", marginBottom: 12 },
  broadcastSubtitle: { fontSize: 15, color: "#9ca3af", textAlign: "center", lineHeight: 22 },
  priceRangeBadge: {
    marginTop: 24, backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16, padding: 16, alignItems: "center",
  },
  priceRangeLabel: { fontSize: 12, color: "#9ca3af", marginBottom: 4 },
  priceRangeValue: { fontSize: 28, fontWeight: "700", color: "#fff" },
  priceRangeNote: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  cancelBtn: { marginTop: 40, paddingVertical: 12, paddingHorizontal: 32 },
  cancelBtnText: { color: "#6b7280", fontSize: 15 },
  // Offer step
  offerCard: {
    backgroundColor: "#fff", borderRadius: 24, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  providerRow: {
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20,
  },
  providerAvatar: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "#dbeafe", justifyContent: "center", alignItems: "center",
  },
  providerName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  providerSub: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  priceRow: {
    backgroundColor: "#f9fafb", borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 14,
  },
  priceLabel: { fontSize: 14, color: "#374151" },
  priceValue: { fontSize: 24, fontWeight: "800", color: "#111827" },
  countdownRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    alignSelf: "center", marginBottom: 20,
  },
  countdownText: { fontSize: 14, fontWeight: "600" },
  confirmBtn: {
    backgroundColor: "#22c55e", borderRadius: 16, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12,
  },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  declineBtn: { alignItems: "center", paddingVertical: 12 },
  declineBtnText: { color: "#6b7280", fontSize: 14 },
  // Confirmed step
  confirmedIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "rgba(34,197,94,0.1)",
    justifyContent: "center", alignItems: "center", marginBottom: 20,
  },
  confirmedTitle: { fontSize: 26, fontWeight: "800", color: "#fff", textAlign: "center", marginBottom: 12 },
  confirmedCard: {
    backgroundColor: "#fff", borderRadius: 24, padding: 20,
    width: "100%", marginTop: 24,
  },
});
