/**
 * ProviderSOSRateCardScreen — Configure SOS service rates
 * Provider sets fixed prices per SOS type. If no price set for a type,
 * they'll be prompted to enter one at accept-time.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import api from "../../services/api";
import { log } from "../../utils/logger";
import { useI18n } from "../../i18n";

// ─── SOS service types ────────────────────────────────────────────────────────

const SOS_TYPES = [
  {
    key: "JUMP_START",
    icon: "battery-charging" as const,
    color: "#f59e0b",
    bg: "#fef3c7",
    pricingType: "flat" as const,
  },
  {
    key: "FLAT_TIRE",
    icon: "car-tire-alert" as const,
    color: "#3b82f6",
    bg: "#dbeafe",
    pricingType: "flat" as const,
  },
  {
    key: "FUEL_DELIVERY",
    icon: "gas-station" as const,
    color: "#10b981",
    bg: "#d1fae5",
    pricingType: "flat" as const,
  },
  {
    key: "LOCKOUT",
    icon: "key-variant" as const,
    color: "#8b5cf6",
    bg: "#ede9fe",
    pricingType: "flat" as const,
  },
  {
    key: "BATTERY_REPLACE",
    icon: "car-battery" as const,
    color: "#ec4899",
    bg: "#fce7f3",
    pricingType: "flat" as const,
  },
  {
    key: "TOWING",
    icon: "tow-truck" as const,
    color: "#dc2626",
    bg: "#fee2e2",
    pricingType: "towing" as const,
  },
] as const;

function getRateCardRowCopy(
  key: string,
  tr: Record<string, string | undefined>,
): { label: string; desc: string } {
  const map: Record<string, { l: string; d: string }> = {
    JUMP_START: { l: "rateJumpStartLabel", d: "rateJumpStartDesc" },
    FLAT_TIRE: { l: "rateFlatTireLabel", d: "rateFlatTireDesc" },
    FUEL_DELIVERY: { l: "rateFuelLabel", d: "rateFuelDesc" },
    LOCKOUT: { l: "rateLockoutLabel", d: "rateLockoutDesc" },
    BATTERY_REPLACE: { l: "rateBatteryLabel", d: "rateBatteryDesc" },
    TOWING: { l: "rateTowingLabel", d: "rateTowingDesc" },
  };
  const m = map[key];
  if (!m) return { label: key, desc: "" };
  return { label: tr[m.l] || key, desc: tr[m.d] || "" };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlatRate {
  price: string;
  active: boolean;
}

interface TowingRate {
  baseFee: string;
  perMileRate: string;
  active: boolean;
}

type RateCardState = Record<string, FlatRate | TowingRate>;

function initRateCard(): RateCardState {
  const card: RateCardState = {};
  for (const t of SOS_TYPES) {
    if (t.pricingType === "towing") {
      card[t.key] = { baseFee: "", perMileRate: "", active: false };
    } else {
      card[t.key] = { price: "", active: false };
    }
  }
  return card;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProviderSOSRateCardScreen({ navigation }: any) {
  const { t, formatCurrency } = useI18n();
  const tr = (t as any).providerSosRates || ({} as Record<string, string | undefined>);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rateCard, setRateCard] = useState<RateCardState>(initRateCard());
  const [availabilityStatus, setAvailabilityStatus] = useState<"ONLINE" | "OFFLINE" | "BUSY">("OFFLINE");
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  useEffect(() => {
    loadRateCard();
  }, []);

  const loadRateCard = async () => {
    setLoading(true);
    try {
      const res = await api.get("/sos/rate-card");
      const data = res.data?.data;
      if (data?.rateCard) {
        const merged = initRateCard();
        for (const [key, entry] of Object.entries(data.rateCard as Record<string, any>)) {
          if (!merged[key]) continue;
          if (key === "TOWING") {
            merged[key] = {
              baseFee: entry.baseFee != null ? String(entry.baseFee) : "",
              perMileRate: entry.perMileRate != null ? String(entry.perMileRate) : "",
              active: !!entry.active,
            };
          } else {
            merged[key] = {
              price: entry.price != null ? String(entry.price) : "",
              active: !!entry.active,
            };
          }
        }
        setRateCard(merged);
      }
      if (data?.availabilityStatus) setAvailabilityStatus(data.availabilityStatus);
    } catch (e) {
      log.error("Failed to load rate card", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate: active types must have a price
    for (const row of SOS_TYPES) {
      const entry = rateCard[row.key] as any;
      if (!entry.active) continue;
      const rowLabel = getRateCardRowCopy(row.key, tr).label;
      if (row.pricingType === "towing") {
        if (!entry.baseFee || Number(entry.baseFee) <= 0) {
          Alert.alert(
            tr.missingPriceTitle || t.providerSosRates?.missingPriceTitle || "Missing price",
            tr.missingPriceTowing ||
              t.providerSosRates?.missingPriceTowing ||
              "Set a base fee for Towing before activating it.",
          );
          return;
        }
      } else {
        if (!entry.price || Number(entry.price) <= 0) {
          const msg =
            (tr.missingPriceFor || t.providerSosRates?.missingPriceFor || "")
              .replace(/\{\{label\}\}/g, rowLabel)
              .replace(/\{\{\s*label\s*\}\}/g, rowLabel) ||
            `Set a price for ${rowLabel} before activating it.`;
          Alert.alert(tr.missingPriceTitle || t.providerSosRates?.missingPriceTitle || "Missing price", msg);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      for (const row of SOS_TYPES) {
        const entry = rateCard[row.key] as any;
        if (row.pricingType === "towing") {
          payload[row.key] = {
            baseFee: entry.baseFee ? Number(entry.baseFee) : null,
            perMileRate: entry.perMileRate ? Number(entry.perMileRate) : null,
            active: entry.active,
          };
        } else {
          payload[row.key] = {
            price: entry.price ? Number(entry.price) : null,
            active: entry.active,
          };
        }
      }
      await api.patch("/sos/rate-card", { rateCard: payload });
      Alert.alert(
        tr.savedTitle || t.providerSosRates?.savedTitle || "Saved",
        tr.savedBody || t.providerSosRates?.savedBody || "Your SOS rate card has been updated.",
      );
    } catch (e) {
      Alert.alert(
        t.common?.error || "Error",
        tr.saveFailed || t.providerSosRates?.saveFailed || "Could not save rate card. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async () => {
    if (togglingAvailability) return;
    setTogglingAvailability(true);
    const next = availabilityStatus === "ONLINE" ? "OFFLINE" : "ONLINE";
    try {
      await api.patch("/sos/availability", { status: next });
      setAvailabilityStatus(next);
    } catch {
      Alert.alert(
        t.common?.error || "Error",
        tr.availabilityFailed ||
          t.providerSosRates?.availabilityFailed ||
          "Could not update availability. Try again.",
      );
    } finally {
      setTogglingAvailability(false);
    }
  };

  const updateEntry = (key: string, field: string, value: string | boolean) => {
    setRateCard((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {tr.screenTitle || t.providerSosRates?.screenTitle || "SOS Rate Card"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2B5EA7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {tr.screenTitle || t.providerSosRates?.screenTitle || "SOS Rate Card"}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        >
          <Text style={styles.saveBtnText}>
            {saving
              ? tr.saving || t.providerSosRates?.saving || "Saving..."
              : tr.save || t.providerSosRates?.save || "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Availability banner */}
        <TouchableOpacity
          onPress={toggleAvailability}
          disabled={togglingAvailability}
          style={[
            styles.availabilityBanner,
            { backgroundColor: availabilityStatus === "ONLINE" ? "#22c55e" : "#6b7280" },
          ]}
        >
          <View style={styles.availabilityDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.availabilityTitle}>
              {availabilityStatus === "ONLINE"
                ? tr.availOnlineTitle || t.providerSosRates?.availOnlineTitle || "You are Online"
                : tr.availOfflineTitle || t.providerSosRates?.availOfflineTitle || "You are Offline"}
            </Text>
            <Text style={styles.availabilitySubtitle}>
              {availabilityStatus === "ONLINE"
                ? tr.availOnlineSub ||
                  t.providerSosRates?.availOnlineSub ||
                  "Customers can see you and SOS requests are broadcast to you."
                : tr.availOfflineSub ||
                  t.providerSosRates?.availOfflineSub ||
                  "Tap to go online and start receiving SOS requests."}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={availabilityStatus === "ONLINE" ? "toggle-switch" : "toggle-switch-off"}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Explanation */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={18} color="#2B5EA7" />
          <Text style={styles.infoText}>
            {tr.infoBody ||
              t.providerSosRates?.infoBody ||
              "Set fixed prices for each SOS service type. If you activate a type without a price, you'll be asked to enter one when accepting. Leave types off if you don't offer them."}
          </Text>
        </View>

        {/* Rate card entries */}
        <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 32 }}>
          {SOS_TYPES.map((row) => {
            const entry = rateCard[row.key] as any;
            const copy = getRateCardRowCopy(row.key, tr);
            return (
              <View key={row.key} style={[styles.card, entry.active && styles.cardActive]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrap, { backgroundColor: row.bg }]}>
                    <MaterialCommunityIcons name={row.icon} size={22} color={row.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{copy.label}</Text>
                    <Text style={styles.cardDesc}>{copy.desc}</Text>
                  </View>
                  <Switch
                    value={entry.active}
                    onValueChange={(v) => updateEntry(row.key, "active", v)}
                    trackColor={{ false: "#d1d5db", true: row.color + "88" }}
                    thumbColor={entry.active ? row.color : "#9ca3af"}
                  />
                </View>

                {entry.active && (
                  <View style={styles.priceFields}>
                    {row.pricingType === "towing" ? (
                      <>
                        <View style={styles.fieldRow}>
                          <Text style={styles.fieldLabel}>
                            {tr.fieldBaseFee || t.providerSosRates?.fieldBaseFee || "Base fee"}
                          </Text>
                          <TextInput
                            style={styles.priceInput}
                            value={entry.baseFee}
                            onChangeText={(v) => updateEntry(row.key, "baseFee", v)}
                            keyboardType="decimal-pad"
                            placeholder={tr.phBase || t.providerSosRates?.phBase || "e.g. 100"}
                            placeholderTextColor="#9ca3af"
                          />
                        </View>
                        <View style={styles.fieldRow}>
                          <Text style={styles.fieldLabel}>
                            {tr.fieldPerMile || t.providerSosRates?.fieldPerMile || "Per mile"}
                          </Text>
                          <TextInput
                            style={styles.priceInput}
                            value={entry.perMileRate}
                            onChangeText={(v) => updateEntry(row.key, "perMileRate", v)}
                            keyboardType="decimal-pad"
                            placeholder={tr.phPerMile || t.providerSosRates?.phPerMile || "e.g. 4.50"}
                            placeholderTextColor="#9ca3af"
                          />
                        </View>
                        {entry.baseFee && entry.perMileRate && (
                          <Text style={styles.exampleText}>
                            {(tr.exampleMiles || t.providerSosRates?.exampleMiles || "Example: {{miles}} mi = {{amount}}")
                              .replace("{{miles}}", "5")
                              .replace(
                                "{{amount}}",
                                formatCurrency(
                                  Number(entry.baseFee) +
                                    5 * Number(entry.perMileRate),
                                ),
                              )}
                          </Text>
                        )}
                      </>
                    ) : (
                      <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>
                          {tr.fieldFixedPrice || t.providerSosRates?.fieldFixedPrice || "Fixed price"}
                        </Text>
                        <TextInput
                          style={styles.priceInput}
                          value={entry.price}
                          onChangeText={(v) => updateEntry(row.key, "price", v)}
                          keyboardType="decimal-pad"
                          placeholder={tr.phFixed || t.providerSosRates?.phFixed || "e.g. 75"}
                          placeholderTextColor="#9ca3af"
                        />
                      </View>
                    )}
                  </View>
                )}

                {!entry.active && (
                  <Text style={styles.inactiveNote}>
                    {tr.inactiveNote ||
                      t.providerSosRates?.inactiveNote ||
                      "Toggle on to offer this service and set your price."}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  saveBtn: {
    backgroundColor: "#2B5EA7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  availabilityBanner: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  availabilityDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.7)",
  },
  availabilityTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  availabilitySubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  infoText: { flex: 1, fontSize: 13, color: "#1d4ed8", lineHeight: 18 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardActive: { borderColor: "#2B5EA7" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardDesc: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  priceFields: { marginTop: 14, gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  fieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fieldLabel: { fontSize: 14, color: "#374151", fontWeight: "500" },
  priceInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    width: 120,
    textAlign: "right",
  },
  exampleText: { fontSize: 12, color: "#6b7280", fontStyle: "italic", textAlign: "right" },
  inactiveNote: { fontSize: 12, color: "#9ca3af", marginTop: 8 },
});
