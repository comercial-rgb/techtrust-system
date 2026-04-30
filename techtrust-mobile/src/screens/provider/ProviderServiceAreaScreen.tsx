/**
 * ProviderServiceAreaScreen — Service Area & County Coverage
 * Florida market: counties are the standard unit for service area declaration.
 * Service radius handles proximity matching; county selection handles explicit
 * extended coverage (e.g., "I serve Broward even if outside my radius").
 */

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
  SectionList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MapView, { Circle, PROVIDER_GOOGLE } from "react-native-maps";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../services/api";

// ─── Florida counties grouped by metro region ─────────────────────────────────
const FL_COUNTY_REGIONS = [
  {
    title: "South Florida",
    data: ["Miami-Dade", "Broward", "Palm Beach", "Monroe"],
  },
  {
    title: "Treasure Coast",
    data: ["Martin", "St. Lucie", "Indian River", "Okeechobee", "Glades"],
  },
  {
    title: "Southwest Florida",
    data: ["Collier", "Lee", "Charlotte", "Sarasota", "DeSoto", "Hendry", "Hardee"],
  },
  {
    title: "Tampa Bay",
    data: ["Hillsborough", "Pinellas", "Pasco", "Hernando", "Manatee", "Polk", "Highlands", "Citrus", "Sumter"],
  },
  {
    title: "Central Florida",
    data: ["Orange", "Osceola", "Seminole", "Lake", "Brevard", "Volusia", "Flagler"],
  },
  {
    title: "Northeast Florida",
    data: ["Duval", "St. Johns", "Clay", "Nassau", "Baker", "Putnam"],
  },
  {
    title: "North Central Florida",
    data: ["Alachua", "Marion", "Levy", "Gilchrist", "Columbia", "Union", "Bradford", "Suwannee", "Lafayette", "Dixie"],
  },
  {
    title: "North Florida",
    data: ["Leon", "Gadsden", "Jefferson", "Madison", "Taylor", "Hamilton", "Wakulla", "Liberty", "Franklin", "Gulf"],
  },
  {
    title: "Panhandle",
    data: ["Escambia", "Santa Rosa", "Okaloosa", "Walton", "Bay", "Washington", "Holmes", "Jackson", "Calhoun"],
  },
];

const ALL_COUNTIES = FL_COUNTY_REGIONS.flatMap(r => r.data);

export default function ProviderServiceAreaScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Base location
  const [baseAddress, setBaseAddress] = useState("");
  const [providerCoords, setProviderCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Radius
  const [serviceRadius, setServiceRadius] = useState(25);

  // Mobile / roadside
  const [mobileService, setMobileService] = useState(false);
  const [roadsideAssistance, setRoadsideAssistance] = useState(false);
  const [freeKm, setFreeKm] = useState("0");
  const [extraFeePerKm, setExtraFeePerKm] = useState("0.00");
  const [travelChargeType, setTravelChargeType] = useState<"ONE_WAY" | "ROUND_TRIP">("ONE_WAY");

  // County coverage
  const [serviceCounties, setServiceCounties] = useState<string[]>([]);
  const [showCountyPicker, setShowCountyPicker] = useState(false);
  const [countySearch, setCountySearch] = useState("");

  const mapRef = useRef<MapView>(null);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get("/providers/profile");
      const p = res.data?.data || {};

      const addr = [p.address, p.city, p.state].filter(Boolean).join(", ");
      setBaseAddress(addr);

      if (p.baseLatitude && p.baseLongitude) {
        setProviderCoords({ lat: Number(p.baseLatitude), lng: Number(p.baseLongitude) });
      }

      const radiusKm = p.serviceRadiusKm || 40;
      const radiusMi = Math.round(radiusKm / 1.60934);
      const miOptions = [5, 10, 15, 20, 25, 35, 50, 75, 100];
      const snapped = miOptions.reduce((prev, curr) =>
        Math.abs(curr - radiusMi) < Math.abs(prev - radiusMi) ? curr : prev
      );
      setServiceRadius(snapped);

      setMobileService(!!p.mobileService);
      setRoadsideAssistance(!!p.roadsideAssistance);
      setFreeKm(String(Math.round((Number(p.freeKm) || 0) / 1.60934)));
      setExtraFeePerKm(Number(p.extraFeePerKm || 0).toFixed(2));
      setTravelChargeType(p.travelChargeType === "ROUND_TRIP" ? "ROUND_TRIP" : "ONE_WAY");

      const counties = Array.isArray(p.serviceCounties) ? p.serviceCounties : [];
      setServiceCounties(counties.filter((c: any) => ALL_COUNTIES.includes(c)));
    } catch (err) {
      console.error("Error loading service area:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch("/providers/profile", {
        serviceRadiusKm: Math.round(serviceRadius * 1.60934),
        mobileService,
        roadsideAssistance,
        freeKm: Math.round((Number(freeKm) || 0) * 1.60934),
        extraFeePerKm: Number(extraFeePerKm) || 0,
        travelChargeType,
        serviceCounties,
      });
      Alert.alert("Saved", "Service area updated successfully.");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCounty = (county: string) => {
    setServiceCounties(prev =>
      prev.includes(county) ? prev.filter(c => c !== county) : [...prev, county]
    );
  };

  const selectAllInRegion = (region: typeof FL_COUNTY_REGIONS[0]) => {
    const all = region.data;
    const alreadyAll = all.every(c => serviceCounties.includes(c));
    if (alreadyAll) {
      setServiceCounties(prev => prev.filter(c => !all.includes(c)));
    } else {
      setServiceCounties(prev => [...new Set([...prev, ...all])]);
    }
  };

  const filteredRegions = countySearch.trim()
    ? FL_COUNTY_REGIONS.map(r => ({
        ...r,
        data: r.data.filter(c => c.toLowerCase().includes(countySearch.toLowerCase())),
      })).filter(r => r.data.length > 0)
    : FL_COUNTY_REGIONS;

  const radiusOptions = [5, 10, 15, 20, 25, 35, 50, 75, 100];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service Area</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2B5EA7" />
          <Text style={{ marginTop: 12, color: "#6b7280" }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Area</Text>
        <TouchableOpacity
          onPress={() => Alert.alert(
            "How Service Area Works",
            "• Service Radius: customers within this distance from your base address can find you.\n\n" +
            "• County Coverage: explicitly declare which FL counties you serve — useful when you're willing to travel beyond your radius to a particular area.\n\n" +
            "Both radius and county are used to match you with incoming service requests.",
            [{ text: "OK" }]
          )}
          style={styles.headerBtn}
        >
          <MaterialCommunityIcons name="information" size={24} color="#2B5EA7" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Map */}
        <View style={styles.mapContainer}>
          {providerCoords ? (
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFillObject}
              {...(Platform.OS === "android" ? { provider: PROVIDER_GOOGLE } : {})}
              initialRegion={{
                latitude: providerCoords.lat,
                longitude: providerCoords.lng,
                latitudeDelta: serviceRadius * 0.028,
                longitudeDelta: serviceRadius * 0.028,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Circle
                center={{ latitude: providerCoords.lat, longitude: providerCoords.lng }}
                radius={serviceRadius * 1609.34}
                strokeColor="#2B5EA7"
                fillColor="rgba(43,94,167,0.12)"
                strokeWidth={2}
              />
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <MaterialCommunityIcons name="map-marker-radius" size={52} color="#2B5EA7" />
              <Text style={styles.mapPlaceholderText}>{serviceRadius} mi radius</Text>
              <Text style={styles.mapPlaceholderSub}>
                {serviceCounties.length > 0
                  ? `${serviceCounties.length} county${serviceCounties.length > 1 ? "ies" : ""} selected`
                  : "No counties selected yet"}
              </Text>
            </View>
          )}
        </View>

        {/* Base Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Base Address</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <MaterialCommunityIcons name="map-marker" size={22} color="#2B5EA7" />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressText}>
                  {baseAddress || "No address set — update in Settings → Profile"}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Configuracoes")}>
                  <Text style={styles.linkText}>Change in Profile Settings →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Service Radius */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Radius</Text>
          <Text style={styles.sectionDesc}>
            Customers within this distance from your base address will see you in search results.
          </Text>
          <View style={styles.card}>
            <View style={styles.radiusDisplay}>
              <Text style={styles.radiusNumber}>{serviceRadius}</Text>
              <Text style={styles.radiusUnit}>miles</Text>
            </View>
            <View style={styles.chips}>
              {radiusOptions.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, serviceRadius === r && styles.chipActive]}
                  onPress={() => setServiceRadius(r)}
                >
                  <Text style={[styles.chipText, serviceRadius === r && styles.chipTextActive]}>
                    {r} mi
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* County Coverage */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>County Coverage</Text>
              <Text style={styles.sectionDesc}>
                Select the Florida counties you're willing to serve. This lets customers in those counties find you even if they're outside your radius.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.countyPickerBtn} onPress={() => setShowCountyPicker(true)}>
            <MaterialCommunityIcons name="map-search" size={22} color="#2B5EA7" />
            <View style={{ flex: 1 }}>
              <Text style={styles.countyPickerLabel}>
                {serviceCounties.length === 0
                  ? "Select counties"
                  : `${serviceCounties.length} of 67 counties selected`}
              </Text>
              {serviceCounties.length > 0 && (
                <Text style={styles.countyPickerSub} numberOfLines={2}>
                  {serviceCounties.slice(0, 5).join(", ")}{serviceCounties.length > 5 ? ` +${serviceCounties.length - 5} more` : ""}
                </Text>
              )}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#9ca3af" />
          </TouchableOpacity>

          {serviceCounties.length > 0 && (
            <View style={styles.countyTagsContainer}>
              {serviceCounties.map(c => (
                <TouchableOpacity
                  key={c}
                  style={styles.countyTag}
                  onPress={() => toggleCounty(c)}
                >
                  <Text style={styles.countyTagText}>{c}</Text>
                  <MaterialCommunityIcons name="close" size={12} color="#2B5EA7" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Mobile / On-Site Service */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Types</Text>
          <View style={styles.card}>
            {/* On-Site */}
            <View style={styles.switchRow}>
              <MaterialCommunityIcons name="truck" size={22} color="#374151" />
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>On-Site Service</Text>
                <Text style={styles.switchDesc}>I travel to the customer's location</Text>
              </View>
              <Switch
                value={mobileService}
                onValueChange={setMobileService}
                trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                thumbColor={mobileService ? "#2B5EA7" : "#fff"}
              />
            </View>

            {/* Roadside */}
            <View style={[styles.switchRow, styles.switchRowBorder]}>
              <MaterialCommunityIcons name="car-emergency" size={22} color="#374151" />
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Roadside Assistance</Text>
                <Text style={styles.switchDesc}>Emergency service on highways</Text>
              </View>
              <Switch
                value={roadsideAssistance}
                onValueChange={setRoadsideAssistance}
                trackColor={{ false: "#d1d5db", true: "#fcd34d" }}
                thumbColor={roadsideAssistance ? "#f59e0b" : "#fff"}
              />
            </View>

            {/* Travel fees (visible when mobile or roadside enabled) */}
            {(mobileService || roadsideAssistance) && (
              <View style={styles.travelFeeBox}>
                <Text style={styles.travelFeeTitle}>Travel Fees</Text>
                <View style={styles.feeRow}>
                  <View style={styles.feeGroup}>
                    <Text style={styles.feeLabel}>Free Miles</Text>
                    <View style={styles.feeInput}>
                      <TextInput
                        style={styles.feeInputText}
                        value={freeKm}
                        onChangeText={setFreeKm}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                      />
                      <Text style={styles.feeUnit}>mi</Text>
                    </View>
                  </View>
                  <View style={styles.feeGroup}>
                    <Text style={styles.feeLabel}>Fee per Extra Mile</Text>
                    <View style={styles.feeInput}>
                      <Text style={styles.feePrefix}>$</Text>
                      <TextInput
                        style={styles.feeInputText}
                        value={extraFeePerKm}
                        onChangeText={(v) => {
                          const clean = v.replace(/[^0-9.]/g, "");
                          setExtraFeePerKm(clean.replace(/(\..*)\./g, "$1"));
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#9ca3af"
                      />
                      <Text style={styles.feeUnit}>/mi</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.feeLabel}>Distance Charged</Text>
                <View style={styles.chargeTypeRow}>
                  {(["ONE_WAY", "ROUND_TRIP"] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.chargeTypeBtn, travelChargeType === type && styles.chargeTypeBtnActive]}
                      onPress={() => setTravelChargeType(type)}
                    >
                      <MaterialCommunityIcons
                        name={type === "ONE_WAY" ? "arrow-right" : "swap-horizontal"}
                        size={16}
                        color={travelChargeType === type ? "#2B5EA7" : "#9ca3af"}
                      />
                      <Text style={[styles.chargeTypeBtnText, travelChargeType === type && styles.chargeTypeBtnTextActive]}>
                        {type === "ONE_WAY" ? "One Way" : "Round Trip"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.feeNote}>
                  {travelChargeType === "ROUND_TRIP"
                    ? `First ${freeKm} mi free (each way) · $${extraFeePerKm}/mi extra · distance × 2`
                    : `First ${freeKm} mi free · $${extraFeePerKm}/mi after that`}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* County Picker Modal */}
      <Modal visible={showCountyPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => { setCountySearch(""); setShowCountyPicker(false); }} style={styles.pickerClose}>
              <Text style={styles.pickerCloseText}>Done</Text>
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>Florida Counties</Text>
            <TouchableOpacity onPress={() => setServiceCounties([])} style={styles.pickerClose}>
              <Text style={{ fontSize: 14, color: "#ef4444", fontWeight: "500" }}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Selected count */}
          <View style={styles.pickerCountBar}>
            <MaterialCommunityIcons name="map-marker-check" size={16} color="#2B5EA7" />
            <Text style={styles.pickerCountText}>
              {serviceCounties.length === 0
                ? "No counties selected"
                : `${serviceCounties.length} county${serviceCounties.length > 1 ? "ies" : ""} selected`}
            </Text>
            {serviceCounties.length < ALL_COUNTIES.length && (
              <TouchableOpacity onPress={() => setServiceCounties([...ALL_COUNTIES])}>
                <Text style={styles.selectAllText}>Select all 67</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search county..."
              placeholderTextColor="#9ca3af"
              value={countySearch}
              onChangeText={setCountySearch}
              autoCorrect={false}
            />
            {countySearch.length > 0 && (
              <TouchableOpacity onPress={() => setCountySearch("")}>
                <MaterialCommunityIcons name="close-circle" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* County list */}
          <SectionList
            sections={filteredRegions}
            keyExtractor={(item) => item}
            stickySectionHeadersEnabled
            renderSectionHeader={({ section }) => (
              <TouchableOpacity
                style={styles.regionHeader}
                onPress={() => selectAllInRegion(section as typeof FL_COUNTY_REGIONS[0])}
              >
                <Text style={styles.regionTitle}>{section.title}</Text>
                <Text style={styles.regionSelectAll}>
                  {(section as typeof FL_COUNTY_REGIONS[0]).data.every(c => serviceCounties.includes(c))
                    ? "Deselect all"
                    : `Select all ${(section as typeof FL_COUNTY_REGIONS[0]).data.length}`}
                </Text>
              </TouchableOpacity>
            )}
            renderItem={({ item: county }) => {
              const selected = serviceCounties.includes(county);
              return (
                <TouchableOpacity
                  style={[styles.countyRow, selected && styles.countyRowSelected]}
                  onPress={() => toggleCounty(county)}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                  </View>
                  <Text style={[styles.countyRowText, selected && styles.countyRowTextSelected]}>
                    {county} County
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  headerBtn: { padding: 8, width: 40 },
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#111827" },
  mapContainer: { height: 190, margin: 16, borderRadius: 16, overflow: "hidden", backgroundColor: "#dbeafe" },
  mapPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", gap: 6 },
  mapPlaceholderText: { fontSize: 16, fontWeight: "700", color: "#2B5EA7" },
  mapPlaceholderSub: { fontSize: 13, color: "#6b7280" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: "#6b7280", lineHeight: 18, marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  addressText: { fontSize: 14, color: "#374151", lineHeight: 20 },
  linkText: { fontSize: 13, color: "#2B5EA7", fontWeight: "500", marginTop: 6 },
  // Radius
  radiusDisplay: { alignItems: "center", marginBottom: 16 },
  radiusNumber: { fontSize: 52, fontWeight: "900", color: "#2B5EA7" },
  radiusUnit: { fontSize: 15, color: "#6b7280", fontWeight: "600", marginTop: -6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
  },
  chipActive: { borderColor: "#2B5EA7", backgroundColor: "#dbeafe" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  chipTextActive: { color: "#2B5EA7" },
  // County picker trigger
  countyPickerBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: "#dbeafe",
  },
  countyPickerLabel: { fontSize: 15, fontWeight: "600", color: "#111827" },
  countyPickerSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  countyTagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  countyTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#eff6ff", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "#bfdbfe",
  },
  countyTagText: { fontSize: 12, fontWeight: "600", color: "#2B5EA7" },
  // Service types
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchRowBorder: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  switchLabel: { fontSize: 15, fontWeight: "600", color: "#111827" },
  switchDesc: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  // Travel fees
  travelFeeBox: {
    marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#f3f4f6", gap: 12,
  },
  travelFeeTitle: { fontSize: 13, fontWeight: "700", color: "#374151" },
  feeRow: { flexDirection: "row", gap: 12 },
  feeGroup: { flex: 1, gap: 6 },
  feeLabel: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  feeInput: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f9fafb", borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb",
    paddingHorizontal: 10,
  },
  feeInputText: { flex: 1, fontSize: 15, color: "#111827", paddingVertical: 10 },
  feePrefix: { fontSize: 14, color: "#6b7280" },
  feeUnit: { fontSize: 12, color: "#9ca3af" },
  chargeTypeRow: { flexDirection: "row", gap: 8 },
  chargeTypeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 9, borderRadius: 8, backgroundColor: "#f3f4f6",
    borderWidth: 1.5, borderColor: "#e5e7eb",
  },
  chargeTypeBtnActive: { backgroundColor: "#eff6ff", borderColor: "#2B5EA7" },
  chargeTypeBtnText: { fontSize: 13, fontWeight: "500", color: "#9ca3af" },
  chargeTypeBtnTextActive: { color: "#2B5EA7" },
  feeNote: { fontSize: 11, color: "#9ca3af", fontStyle: "italic" },
  // Footer
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: "#e5e7eb",
  },
  saveBtn: { backgroundColor: "#2B5EA7", paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  // County picker modal
  pickerContainer: { flex: 1, backgroundColor: "#fff" },
  pickerHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  pickerClose: { padding: 4 },
  pickerCloseText: { fontSize: 15, color: "#2B5EA7", fontWeight: "700" },
  pickerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  pickerCountBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#eff6ff", borderBottomWidth: 1, borderBottomColor: "#dbeafe",
  },
  pickerCountText: { flex: 1, fontSize: 13, color: "#1d4ed8", fontWeight: "500" },
  selectAllText: { fontSize: 13, color: "#2B5EA7", fontWeight: "600" },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    margin: 12, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "#f3f4f6", borderRadius: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#111827" },
  regionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#f9fafb", borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  regionTitle: { fontSize: 13, fontWeight: "700", color: "#374151" },
  regionSelectAll: { fontSize: 12, color: "#2B5EA7", fontWeight: "500" },
  countyRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "#f9fafb",
  },
  countyRowSelected: { backgroundColor: "#f0f9ff" },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: "#d1d5db",
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxSelected: { backgroundColor: "#2B5EA7", borderColor: "#2B5EA7" },
  countyRowText: { fontSize: 15, color: "#374151" },
  countyRowTextSelected: { color: "#1d4ed8", fontWeight: "600" },
});
