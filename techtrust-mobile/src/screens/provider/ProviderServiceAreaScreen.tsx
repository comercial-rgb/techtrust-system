/**
 * ProviderServiceAreaScreen - Área de Cobertura
 * Connected to backend API
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MapView, { Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { useFocusEffect } from "@react-navigation/native";
import { useI18n } from "../../i18n";
import api from "../../services/api";

interface CoverageZone {
  id: string;
  name: string;
  region: string;
  active: boolean;
}

export default function ProviderServiceAreaScreen({ navigation }: any) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseAddress, setBaseAddress] = useState("");
  const [serviceRadius, setServiceRadius] = useState(25);
  const [mobileService, setMobileService] = useState(false);
  const [roadsideAssistance, setRoadsideAssistance] = useState(false);
  const [extraFeePerKm, setExtraFeePerKm] = useState("0.00");
  const [freeKm, setFreeKm] = useState("0");
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneRegion, setNewZoneRegion] = useState("");
  const [coverageZones, setCoverageZones] = useState<CoverageZone[]>([]);
  const [providerCoords, setProviderCoords] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  // Load provider profile from API
  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get("/providers/dashboard");
      const profile =
        response.data?.data?.profile || response.data?.data?.providerProfile || response.data?.data || {};
      const user = response.data?.data;

      // Build base address from profile
      const addr = [profile.address, profile.city, profile.state]
        .filter(Boolean)
        .join(", ");
      setBaseAddress(addr || user?.city || "");
      // Convert km to miles for display (1 mi = 1.609 km)
      const radiusKm = profile.serviceRadiusKm || 25;
      const radiusMi = Math.round(radiusKm / 1.609);
      // Snap to nearest available option
      const miOptions = [5, 10, 15, 20, 25, 35, 50];
      const snapped = miOptions.reduce((prev, curr) => Math.abs(curr - radiusMi) < Math.abs(prev - radiusMi) ? curr : prev);
      setServiceRadius(snapped);
      // Get coordinates for map
      if (profile.baseLatitude && profile.baseLongitude) {
        setProviderCoords({ lat: Number(profile.baseLatitude), lng: Number(profile.baseLongitude) });
      } else if (profile.gpsLatitude && profile.gpsLongitude) {
        setProviderCoords({ lat: Number(profile.gpsLatitude), lng: Number(profile.gpsLongitude) });
      } else if (profile.latitude && profile.longitude) {
        setProviderCoords({ lat: Number(profile.latitude), lng: Number(profile.longitude) });
      }
      setMobileService(profile.mobileService || false);
      setRoadsideAssistance(profile.roadsideAssistance || false);
      const freeKmVal = profile.freeKm || 0;
      setFreeKm(String(Math.round(freeKmVal / 1.609)));
      setExtraFeePerKm(String(Number(profile.extraFeePerKm || 0).toFixed(2)));

      // Load coverage zones if available
      if (profile.coverageZones && Array.isArray(profile.coverageZones)) {
        setCoverageZones(
          profile.coverageZones.map((z: any) => ({
            id: z.id,
            name: z.name,
            region: z.region || "",
            active: z.active !== false,
          })),
        );
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, []),
  );

  const toggleZone = (id: string) => {
    setCoverageZones((zones) =>
      zones.map((z) => (z.id === id ? { ...z, active: !z.active } : z)),
    );
  };

  const handleAddZone = () => {
    if (!newZoneName.trim()) {
      Alert.alert(
        t.common?.error || "Error",
        t.provider?.zoneNameRequired || "Zone name is required",
      );
      return;
    }

    const newZone: CoverageZone = {
      id: Date.now().toString(),
      name: newZoneName.trim(),
      region: newZoneRegion.trim() || "N/A",
      active: true,
    };

    setCoverageZones([...coverageZones, newZone]);
    setNewZoneName("");
    setNewZoneRegion("");
    setShowAddZoneModal(false);
    Alert.alert(
      t.common?.success || "Success",
      t.provider?.zoneAdded || "Coverage zone added successfully!",
    );
  };

  const handleDeleteZone = (id: string, name: string) => {
    Alert.alert(
      t.provider?.deleteZone || "Delete Zone",
      `${t.provider?.deleteZoneConfirm || "Are you sure you want to delete"} ${name}?`,
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t.common?.delete || "Delete",
          style: "destructive",
          onPress: () => {
            setCoverageZones((zones) => zones.filter((z) => z.id !== id));
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert miles back to km for storage
      await api.patch("/providers/profile", {
        serviceRadiusKm: Math.round(serviceRadius * 1.609),
        mobileService,
        roadsideAssistance,
        freeKm: Math.round((Number(freeKm) || 0) * 1.609),
        extraFeePerKm: Number(extraFeePerKm) || 0,
      });
      Alert.alert(
        t.common?.success || "Success",
        t.provider?.serviceAreaUpdated || "Service area updated!",
      );
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        t.common?.error || "Error",
        error?.response?.data?.message ||
          "Failed to save settings. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Display in miles for US market
  const radiusOptions = [5, 10, 15, 20, 25, 35, 50];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#111827"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t.provider?.serviceArea || "Service Area"}
          </Text>
          <View style={styles.infoBtn} />
        </View>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={{ marginTop: 12, color: "#6b7280" }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.provider?.serviceArea || "Service Area"}
        </Text>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              t.provider?.howItWorks || "How It Works",
              t.provider?.serviceAreaExplanation ||
                "Service Area calculates distance from your base address to the service location.\n\n" +
                  "• IN-SHOP: Customer comes to your location\n" +
                  "• ON-SITE (Mobile): You travel to customer home/business\n" +
                  "• ROADSIDE: Emergency assistance on highways\n\n" +
                  "Distance is calculated using GPS coordinates (straight line). " +
                  "Extra fees apply for mobile services beyond free mile range.",
              [{ text: t.common?.ok || "OK" }],
            );
          }}
          style={styles.infoBtn}
        >
          <MaterialCommunityIcons
            name="information"
            size={24}
            color="#1976d2"
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Map Preview */}
        <View style={styles.mapPreview}>
          {providerCoords ? (
            <MapView
              ref={mapRef}
              style={styles.mapFull}
              {...(Platform.OS === 'android' ? { provider: PROVIDER_GOOGLE } : {})}
              initialRegion={{
                latitude: providerCoords.lat,
                longitude: providerCoords.lng,
                latitudeDelta: serviceRadius * 0.03,
                longitudeDelta: serviceRadius * 0.03,
              }}
              showsUserLocation
              scrollEnabled={false}
              zoomEnabled={false}
              mapType="standard"
            >
              <Circle
                center={{ latitude: providerCoords.lat, longitude: providerCoords.lng }}
                radius={serviceRadius * 1609.34}
                strokeColor="#1976d2" 
                fillColor="rgba(25,118,210,0.1)"
                strokeWidth={2}
              />
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <MaterialCommunityIcons
                name="map-marker-radius"
                size={60}
                color="#1976d2"
              />
              <Text style={styles.mapText}>
                {t.provider?.serviceRadius || "Service Radius"}: {serviceRadius}{" "}
                mi
              </Text>
              <Text style={styles.mapSubtext}>
                {coverageZones.filter((z) => z.active).length}{" "}
                {t.provider?.activeZones || "active zones"}
              </Text>
            </View>
          )}
        </View>

        {/* Base Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t.provider?.baseAddress || "Base Address"}
          </Text>
          <View style={styles.card}>
            <View style={styles.addressRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={24}
                color="#1976d2"
              />
              <View style={styles.addressInfo}>
                <Text style={styles.addressText}>
                  {baseAddress || "No address set — update in Edit Profile"}
                </Text>
                <TouchableOpacity
                  style={styles.changeAddressBtn}
                  onPress={() => navigation.navigate("EditProfile")}
                >
                  <Text style={styles.changeAddressText}>
                    {t.provider?.changeAddress || "Change address"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Service Radius */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t.provider?.serviceRadius || "Service Radius"}
          </Text>
          <View style={styles.card}>
            <Text style={styles.radiusLabel}>
              {t.provider?.selectRadius || "Select the maximum travel radius"}:
            </Text>
            <View style={styles.radiusOptions}>
              {radiusOptions.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.radiusOption,
                    serviceRadius === r && styles.radiusOptionActive,
                  ]}
                  onPress={() => setServiceRadius(r)}
                >
                  <Text
                    style={[
                      styles.radiusOptionText,
                      serviceRadius === r && styles.radiusOptionTextActive,
                    ]}
                  >
                    {r} mi
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Mobile Service Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t.provider?.serviceTypes || "Service Types"}
          </Text>
          <View style={styles.card}>
            {/* On-Site Mobile Service */}
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <MaterialCommunityIcons
                  name="truck"
                  size={24}
                  color="#374151"
                />
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>
                    {t.provider?.onSiteService || "On-Site Service"}
                  </Text>
                  <Text style={styles.switchDescription}>
                    {t.provider?.onSiteServiceDesc ||
                      "I go to customer home/business"}
                  </Text>
                </View>
              </View>
              <Switch
                value={mobileService}
                onValueChange={setMobileService}
                trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                thumbColor={mobileService ? "#1976d2" : "#fff"}
              />
            </View>

            {/* Roadside Assistance */}
            <View
              style={[
                styles.switchRow,
                {
                  marginTop: 20,
                  paddingTop: 20,
                  borderTopWidth: 1,
                  borderTopColor: "#f3f4f6",
                },
              ]}
            >
              <View style={styles.switchInfo}>
                <MaterialCommunityIcons
                  name="car-emergency"
                  size={24}
                  color="#374151"
                />
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>
                    {t.provider?.roadsideAssistance || "Roadside Assistance"}
                  </Text>
                  <Text style={styles.switchDescription}>
                    {t.provider?.roadsideAssistanceDesc ||
                      "Emergency service on highways"}
                  </Text>
                </View>
              </View>
              <Switch
                value={roadsideAssistance}
                onValueChange={setRoadsideAssistance}
                trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                thumbColor={roadsideAssistance ? "#f59e0b" : "#fff"}
              />
            </View>

            {(mobileService || roadsideAssistance) && (
              <View style={styles.mobileFeeSettings}>
                <View style={styles.feeInputRow}>
                  <View style={styles.feeInputGroup}>
                    <Text style={styles.feeInputLabel}>
                      {t.provider?.freeKm || "Free Miles"}
                    </Text>
                    <View style={styles.inputWithUnit}>
                      <TextInput
                        style={styles.feeInput}
                        value={freeKm}
                        onChangeText={setFreeKm}
                        keyboardType="numeric"
                      />
                      <Text style={styles.inputUnit}>mi</Text>
                    </View>
                  </View>
                  <View style={styles.feeInputGroup}>
                    <Text style={styles.feeInputLabel}>
                      {t.provider?.extraKmFee || "Extra Mile Fee"}
                    </Text>
                    <View style={styles.inputWithUnit}>
                      <Text style={styles.inputPrefix}>$</Text>
                      <TextInput
                        style={styles.feeInput}
                        value={extraFeePerKm}
                        onChangeText={setExtraFeePerKm}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
                <Text style={styles.feeNote}>
                  {t.provider?.firstKmFree || "First"} {freeKm}{" "}
                  {t.provider?.kmFree || "mi free, after"} ${extraFeePerKm}/
                  {t.provider?.extraKm || "mi extra"}
                </Text>
                <View style={styles.distanceInfo}>
                  <MaterialCommunityIcons
                    name="map-marker-distance"
                    size={20}
                    color="#6b7280"
                  />
                  <Text style={styles.distanceInfoText}>
                    {t.provider?.distanceCalculation ||
                      "Distance is calculated from your base address to service location using GPS coordinates (straight-line distance)."}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Coverage Zones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t.provider?.coverageZones || "Coverage Zones"}
            </Text>
            <TouchableOpacity
              style={styles.addZoneBtn}
              onPress={() => setShowAddZoneModal(true)}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#1976d2" />
              <Text style={styles.addZoneText}>{t.common?.add || "Add"}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.zonesDescription}>
            {t.provider?.coverageZonesDesc ||
              "Define specific neighborhoods or regions where you offer services. This helps customers find you more easily."}
          </Text>
          <View style={styles.card}>
            {coverageZones.map((zone, index) => (
              <View
                key={zone.id}
                style={[
                  styles.zoneRow,
                  index < coverageZones.length - 1 && styles.zoneRowBorder,
                ]}
              >
                <View style={styles.zoneInfo}>
                  <MaterialCommunityIcons
                    name={zone.active ? "map-marker-check" : "map-marker-off"}
                    size={22}
                    color={zone.active ? "#10b981" : "#9ca3af"}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.zoneName,
                        !zone.active && styles.zoneNameInactive,
                      ]}
                    >
                      {zone.name}
                    </Text>
                    <Text style={styles.zoneRegion}>{zone.region}</Text>
                  </View>
                </View>
                <View style={styles.zoneActions}>
                  <Switch
                    value={zone.active}
                    onValueChange={() => toggleZone(zone.id)}
                    trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                    thumbColor={zone.active ? "#1976d2" : "#fff"}
                  />
                  <TouchableOpacity
                    onPress={() => handleDeleteZone(zone.id, zone.name)}
                    style={styles.deleteZoneBtn}
                  >
                    <MaterialCommunityIcons
                      name="delete-outline"
                      size={20}
                      color="#ef4444"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={24}
            color="#f59e0b"
          />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>{t.common?.tip || "Tip"}</Text>
            <Text style={styles.tipsText}>
              {t.provider?.serviceAreaTip ||
                "A larger service radius may increase your requests, but remember to consider travel time and costs."}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>
              {t.common?.saveChanges || "Save Changes"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Add Zone Modal */}
      <Modal
        visible={showAddZoneModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddZoneModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAddZoneModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t.provider?.addCoverageZone || "Add Coverage Zone"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddZoneModal(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>
                  {t.provider?.zoneName || "Zone Name"} *
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={
                    t.provider?.zoneNamePlaceholder ||
                    "e.g., Downtown, North Zone"
                  }
                  value={newZoneName}
                  onChangeText={setNewZoneName}
                  autoFocus
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>
                  {t.provider?.region || "Region"}
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={
                    t.provider?.regionPlaceholder || "e.g., São Paulo - SP"
                  }
                  value={newZoneRegion}
                  onChangeText={setNewZoneRegion}
                />
              </View>

              <View style={styles.modalInfo}>
                <MaterialCommunityIcons
                  name="information"
                  size={20}
                  color="#6b7280"
                />
                <Text style={styles.modalInfoText}>
                  {t.provider?.zoneInfoText ||
                    "Coverage zones help customers find you when searching for services in specific areas."}
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddZoneModal(false)}
              >
                <Text style={styles.modalCancelText}>
                  {t.common?.cancel || "Cancel"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalAddBtn}
                onPress={handleAddZone}
              >
                <Text style={styles.modalAddText}>
                  {t.common?.add || "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
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
  backBtn: {
    padding: 8,
  },
  infoBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  mapPreview: {
    backgroundColor: "#e5e7eb",
    height: 200,
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  mapFull: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#dbeafe",
  },
  mapText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1976d2",
    marginTop: 8,
  },
  mapSubtext: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  zonesDescription: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  addressInfo: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  changeAddressBtn: {
    marginTop: 8,
  },
  changeAddressText: {
    fontSize: 14,
    color: "#1976d2",
    fontWeight: "500",
  },
  radiusLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  radiusOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  radiusOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "#f3f4f6",
  },
  radiusOptionActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#1976d2",
  },
  radiusOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  radiusOptionTextActive: {
    color: "#1976d2",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  switchDescription: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  mobileFeeSettings: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  feeInputRow: {
    flexDirection: "row",
    gap: 16,
  },
  feeInputGroup: {
    flex: 1,
  },
  feeInputLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
  },
  inputWithUnit: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
  },
  inputPrefix: {
    fontSize: 14,
    color: "#6b7280",
  },
  inputUnit: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 4,
  },
  feeInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 10,
  },
  feeNote: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 12,
    fontStyle: "italic",
  },
  distanceInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#1976d2",
  },
  distanceInfoText: {
    flex: 1,
    fontSize: 12,
    color: "#1e40af",
    lineHeight: 18,
  },
  addZoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addZoneText: {
    fontSize: 14,
    color: "#1976d2",
    fontWeight: "500",
  },
  zoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  zoneRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  zoneInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  zoneActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deleteZoneBtn: {
    padding: 4,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  zoneNameInactive: {
    color: "#9ca3af",
  },
  zoneRegion: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  tipsCard: {
    flexDirection: "row",
    backgroundColor: "#fef3c7",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    color: "#92400e",
    lineHeight: 18,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  saveBtn: {
    backgroundColor: "#1976d2",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#111827",
  },
  modalInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
  },
  modalInfoText: {
    flex: 1,
    fontSize: 13,
    color: "#1e40af",
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6b7280",
  },
  modalAddBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#1976d2",
    alignItems: "center",
  },
  modalAddText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
