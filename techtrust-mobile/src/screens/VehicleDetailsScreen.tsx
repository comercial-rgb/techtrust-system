/**
 * VehicleDetailsScreen - Vehicle Details with Maintenance History
 * Modern design with maintenance history and total spent
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  Image,
  Modal,
  TextInput,
  Platform,
  ActionSheetIOS,
  Dimensions,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FadeInView, ScalePress } from "../components/Animated";
import { useI18n } from "../i18n";
import { getVehicleRecalls, RecallItem } from "../services/nhtsa.service";
import { log } from "../utils/logger";

interface MaintenanceRecord {
  id: string;
  workOrderId?: string;
  type: string;
  description: string;
  date: string;
  mileage: number;
  cost: number;
  provider: string;
  status: "completed" | "in-progress" | "scheduled";
}

interface VehicleDetails {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  plateNumber: string;
  plateState: string;
  trim: string;
  color: string;
  currentMileage: number;
  fuelType: string;
  vehicleType: string;
  primaryDriver: string;
  insuranceProvider: string;
  insurancePolicy: string;
  insuranceExpiry: string;
  lastService: string;
  nextServiceDue: string;
  isDefault: boolean;
  maintenanceHistory: MaintenanceRecord[];
  totalMaintenanceSpent: number;
  // VIN-decoded fields
  engineType?: string;
  driveType?: string;
  bodyType?: string;
  category?: string;
  seatingCapacity?: number;
  numberOfRows?: number;
  countryOfManufacturer?: string;
  transmission?: string;
}

const PAST_SERVICE_TYPE_IDS = [
  "Oil Change",
  "Brake Service",
  "Tire Rotation",
  "Battery",
  "AC Repair",
  "Transmission",
  "Engine",
  "Body Work",
  "Other",
] as const;

function pastServiceTypeDisplayLabel(
  typeId: string,
  tr: Record<string, string | undefined> | undefined,
): string {
  if (!tr) return typeId;
  const keyById: Record<string, string> = {
    "Oil Change": "pastServiceTypeOilChange",
    "Brake Service": "pastServiceTypeBrakeService",
    "Tire Rotation": "pastServiceTypeTireRotation",
    Battery: "pastServiceTypeBattery",
    "AC Repair": "pastServiceTypeAcRepair",
    Transmission: "pastServiceTypeTransmission",
    Engine: "pastServiceTypeEngine",
    "Body Work": "pastServiceTypeBodyWork",
    Other: "pastServiceTypeOther",
  };
  const k = keyById[typeId];
  const label = k ? tr[k] : undefined;
  return label || typeId;
}

export default function VehicleDetailsScreen({ navigation, route }: any) {
  const { t, language, formatCurrency } = useI18n();
  const fiatSymbol = ((t as any).formats?.currencySymbol as string | undefined) || "$";
  const vehicleLocale = useMemo(
    () => (language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US"),
    [language],
  );
  const { vehicleId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [recalls, setRecalls] = useState<RecallItem[]>([]);
  const [recallsLoading, setRecallsLoading] = useState(false);
  const [expandedRecall, setExpandedRecall] = useState<string | null>(null);
  const [recallBannerDismissed, setRecallBannerDismissed] = useState(false);

  // D11 — Vehicle photo
  const [vehiclePhoto, setVehiclePhoto] = useState<string | null>(null);

  // Onboarding modal after first vehicle add
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // D13 — Add Past Service modal
  const [showPastServiceModal, setShowPastServiceModal] = useState(false);
  const [pastServiceData, setPastServiceData] = useState({
    type: '',
    description: '',
    date: '',
    mileage: '',
    cost: '',
    provider: '',
  });

  // D11 — Handle vehicle photo change
  const handleVehiclePhoto = () => {
    const options = [
      t.profile?.takePhoto || 'Take Photo',
      t.profile?.chooseFromLibrary || 'Choose from Gallery',
      t.common?.cancel || 'Cancel',
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 2 },
        (index) => {
          if (index === 0 || index === 1) {
            // In production: use expo-image-picker 
            const photoType = index === 0 ? 'camera' : 'gallery';
            setVehiclePhoto(
              `https://ui-avatars.com/api/?name=${encodeURIComponent((vehicle?.make || '') + '+' + (vehicle?.model || ''))}&background=1976d2&color=fff&size=400&format=png`
            );
          }
        }
      );
    } else {
      Alert.alert(
        t.profile?.changeProfilePhoto || 'Vehicle Photo',
        '',
        [
          {
            text: t.profile?.takePhoto || "Take Photo",
            onPress: () =>
              setVehiclePhoto(
                `https://ui-avatars.com/api/?name=${encodeURIComponent((vehicle?.make || "") + "+" + (vehicle?.model || ""))}&background=1976d2&color=fff&size=400`,
              ),
          },
          {
            text: t.profile?.chooseFromLibrary || "Choose from Gallery",
            onPress: () =>
              setVehiclePhoto(
                `https://ui-avatars.com/api/?name=${encodeURIComponent((vehicle?.make || "") + "+" + (vehicle?.model || ""))}&background=059669&color=fff&size=400`,
              ),
          },
          { text: t.common?.cancel || "Cancel", style: "cancel" },
        ],
      );
    }
  };

  // D13 — Save past service record
  const handleSavePastService = () => {
    if (!pastServiceData.type || !pastServiceData.date || !pastServiceData.cost) {
      Alert.alert(
        t.common?.error || 'Error',
        t.vehicle?.pastServiceFillRequired || 'Please fill in service type, date, and cost.',
      );
      return;
    }

    if (vehicle) {
      const newRecord: MaintenanceRecord = {
        id: `manual-${Date.now()}`,
        type: pastServiceData.type,
        description: pastServiceData.description || pastServiceData.type,
        date: pastServiceData.date,
        mileage: parseInt(pastServiceData.mileage) || 0,
        cost: parseFloat(pastServiceData.cost) || 0,
        provider:
          pastServiceData.provider ||
          t.vehicle?.pastServiceProviderDefault ||
          "Self / other",
        status: 'completed',
      };

      setVehicle({
        ...vehicle,
        maintenanceHistory: [newRecord, ...vehicle.maintenanceHistory],
        totalMaintenanceSpent: vehicle.totalMaintenanceSpent + newRecord.cost,
      });
    }

    setShowPastServiceModal(false);
    setPastServiceData({ type: '', description: '', date: '', mileage: '', cost: '', provider: '' });
    Alert.alert(
      t.common?.success || 'Success',
      t.vehicle?.pastServiceRecordAdded || 'Past service record added.',
    );
  };

  useEffect(() => {
    loadVehicleDetails();
  }, []);

  useEffect(() => {
    if (vehicleId) {
      loadRecalls();
    }
  }, [vehicleId]);

  useEffect(() => {
    if (!loading && vehicle && route.params?.showOnboarding) {
      setShowOnboarding(true);
    }
  }, [loading, vehicle]);

  async function loadVehicleDetails() {
    try {
      // Buscar detalhes do veículo da API
      const api = (await import("../services/api")).default;
      const response = await api.get(`/vehicles/${vehicleId}`);
      const vehicleData = response.data.data;

      if (vehicleData) {
        setVehicle({
          id: vehicleData.id,
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          vin: vehicleData.vin || "",
          plateNumber: vehicleData.plateNumber || "",
          plateState: vehicleData.plateState || "",
          trim: vehicleData.trim || "",
          color: vehicleData.color || "",
          currentMileage: vehicleData.currentMileage || 0,
          fuelType: vehicleData.fuelType || "",
          vehicleType: vehicleData.vehicleType || vehicleData.bodyType || vehicleData.category || "",
          primaryDriver: vehicleData.primaryDriver || "",
          insuranceProvider: vehicleData.insuranceProvider || "",
          insurancePolicy: vehicleData.insurancePolicy || "",
          insuranceExpiry: vehicleData.insuranceExpiry || "",
          lastService: vehicleData.lastService || "",
          nextServiceDue: vehicleData.nextServiceDue || "",
          isDefault: vehicleData.isDefault || vehicleData.isPrimary || false,
          totalMaintenanceSpent: vehicleData.totalMaintenanceSpent || 0,
          maintenanceHistory: vehicleData.maintenanceHistory || [],
          // VIN-decoded fields
          ...(vehicleData.engineType && { engineType: vehicleData.engineType }),
          ...(vehicleData.driveType && { driveType: vehicleData.driveType }),
          ...(vehicleData.bodyType && { bodyType: vehicleData.bodyType }),
          ...(vehicleData.category && { category: vehicleData.category }),
          ...(vehicleData.seatingCapacity && { seatingCapacity: vehicleData.seatingCapacity }),
          ...(vehicleData.numberOfRows && { numberOfRows: vehicleData.numberOfRows }),
          ...(vehicleData.countryOfManufacturer && { countryOfManufacturer: vehicleData.countryOfManufacturer }),
          ...(vehicleData.transmission && { transmission: vehicleData.transmission }),
        });
      }
    } catch (error) {
      log.error("Error loading vehicle:", error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadVehicleDetails(), loadRecalls()]);
    setRefreshing(false);
  }

  async function loadRecalls() {
    setRecallsLoading(true);
    try {
      // D5: Check cache — auto-refresh weekly
      const cacheKey = `@TechTrust:recalls_${vehicleId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      let shouldFetch = true;

      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp < weekMs) {
          // Cache is fresh (< 7 days)
          setRecalls(data);
          shouldFetch = false;
        }
      }

      if (shouldFetch) {
        const result = await getVehicleRecalls(vehicleId);
        if (result.success && result.data) {
          setRecalls(result.data);
          // Cache with timestamp
          await AsyncStorage.setItem(cacheKey, JSON.stringify({
            data: result.data,
            timestamp: Date.now(),
          }));
        }
      }
    } catch (error) {
      log.error("Error loading recalls:", error);
    } finally {
      setRecallsLoading(false);
    }
  }

  function formatDate(date: string) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(vehicleLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatMileage(miles: number) {
    const mileAbbr = ((t as any).carWash?.mile as string | undefined) || "mi";
    return `${miles.toLocaleString(vehicleLocale)} ${mileAbbr}`;
  }

  function isExpiringSoon(date: string) {
    if (!date) return false;
    const expiry = new Date(date);
    if (isNaN(expiry.getTime())) return false;
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }

  function isExpired(date: string) {
    if (!date) return false;
    const d = new Date(date);
    if (isNaN(d.getTime())) return false;
    return d < new Date();
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "completed":
        return { bg: "#d1fae5", text: "#10b981" };
      case "in-progress":
        return { bg: "#dbeafe", text: "#3b82f6" };
      case "scheduled":
        return { bg: "#fef3c7", text: "#f59e0b" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280" };
    }
  }

  if (loading || !vehicle) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t.vehicle?.vehicleDetails || "Vehicle Details"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text>{t.common?.loading || "Loading..."}</Text>
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
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.vehicle?.vehicleDetails || "Vehicle Details"}
        </Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate("AddVehicle", { vehicle })}
        >
          <Ionicons name="create-outline" size={24} color="#2B5EA7" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Vehicle Hero */}
        <FadeInView delay={0}>
          <View style={styles.heroSection}>
            {/* D11 — Vehicle Photo or Icon */}
            <TouchableOpacity onPress={handleVehiclePhoto} activeOpacity={0.8}>
              {vehiclePhoto ? (
                <View style={styles.vehiclePhotoContainer}>
                  <Image source={{ uri: vehiclePhoto }} style={styles.vehiclePhotoImage} />
                  <View style={styles.vehiclePhotoOverlay}>
                    <Ionicons name="camera" size={20} color="#fff" />
                  </View>
                </View>
              ) : (
                <View style={styles.vehicleIconLarge}>
                  <Ionicons
                    name={vehicle.vehicleType?.toLowerCase().includes('truck') || vehicle.vehicleType?.toLowerCase().includes('pickup')
                      ? 'car-sport'
                      : vehicle.vehicleType?.toLowerCase().includes('suv')
                        ? 'car'
                        : vehicle.vehicleType?.toLowerCase().includes('van')
                          ? 'bus'
                          : 'car-sport'}
                    size={64}
                    color="#2B5EA7"
                  />
                  <View style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: '#2B5EA7', borderRadius: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' }}>
                    <Ionicons name="camera" size={14} color="#fff" />
                  </View>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.vehicleTitle}>
              {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim || ""}
            </Text>
            {(vehicle.fuelType || vehicle.vehicleType) ? (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 8,
                  gap: 6,
                  paddingHorizontal: 16,
                }}
              >
                {vehicle.fuelType ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#eff6ff",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      maxWidth: SCREEN_WIDTH - 48,
                    }}
                  >
                    <Ionicons name="flash" size={12} color="#2B5EA7" />
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12,
                        color: "#2B5EA7",
                        fontWeight: "600",
                        marginLeft: 4,
                        flexShrink: 1,
                      }}
                    >
                      {vehicle.fuelType}
                    </Text>
                  </View>
                ) : null}
                {vehicle.vehicleType ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#f0fdf4",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      maxWidth: SCREEN_WIDTH - 48,
                    }}
                  >
                    <Ionicons name="car" size={12} color="#059669" />
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12,
                        color: "#059669",
                        fontWeight: "600",
                        marginLeft: 4,
                        flexShrink: 1,
                      }}
                    >
                      {vehicle.vehicleType}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {vehicle.isDefault && (
              <View style={styles.defaultBadge}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={styles.defaultText}>
                  {t.vehicle?.defaultVehicle || "Default Vehicle"}
                </Text>
              </View>
            )}
          </View>
        </FadeInView>

        {/* D5: Safety Recall Alert Banner */}
        {recalls.length > 0 && !recallBannerDismissed && (
          <FadeInView delay={50}>
            <View style={{
              backgroundColor: '#fef2f2',
              marginHorizontal: 16,
              marginBottom: 12,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: '#fecaca',
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
            }}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="warning" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#991b1b' }}>
                  {t.vehicle?.recallsBannerTitle || "Safety recall alert"}
                </Text>
                <Text style={{ fontSize: 13, color: '#7f1d1d', marginTop: 4, lineHeight: 18 }}>
                  {recalls.length === 1
                    ? `${recalls[0].component}: ${recalls[0].summary?.substring(0, 100)}...`
                    : (t.vehicle?.recallsBannerMultiple ||
                        "{{count}} active safety recalls found for this vehicle."
                      ).replace("{{count}}", String(recalls.length))}
                </Text>
                <Text style={{ fontSize: 12, color: '#b91c1c', marginTop: 6, fontWeight: '600' }}>
                  {t.vehicle?.recallsBannerDealerNote ||
                    "Contact nearest dealer for free repair."}
                </Text>
              </View>
              <TouchableOpacity
                style={{ padding: 4 }}
                onPress={() => setRecallBannerDismissed(true)}
              >
                <Ionicons name="close" size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </FadeInView>
        )}

        {/* Quick Stats */}
        <FadeInView delay={100}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="speedometer-outline" size={24} color="#2B5EA7" />
              <Text style={styles.statValue}>
                {formatMileage(vehicle.currentMileage)}
              </Text>
              <Text style={styles.statLabel}>
                {t.vehicle?.currentMileage || "Current Mileage"}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="wallet-outline" size={24} color="#10b981" />
              <Text style={styles.statValue}>
                {formatCurrency(vehicle.totalMaintenanceSpent)}
              </Text>
              <Text style={styles.statLabel}>
                {t.vehicle?.totalSpent || "Total Spent"}
              </Text>
            </View>
          </View>
        </FadeInView>

        {/* Vehicle Information */}
        <FadeInView delay={200}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t.vehicle?.vehicleInformation || "Vehicle Information"}
            </Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRowColumn}>
                <Text style={styles.infoLabel} numberOfLines={2}>
                  {t.vehicle?.vin || "VIN (Vehicle Identification Number)"}
                </Text>
                <Text style={styles.infoValueFullVIN} selectable>
                  {vehicle.vin || "-"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.licensePlate || "License Plate"}
                </Text>
                <Text style={styles.infoValue}>{vehicle.plateNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.color || "Color"}
                </Text>
                <Text style={styles.infoValue}>{vehicle.color}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.fuelType || "Fuel Type"}
                </Text>
                <Text style={styles.infoValue}>{vehicle.fuelType}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.vehicleType || "Vehicle Type"}
                </Text>
                <Text style={styles.infoValue}>{vehicle.vehicleType}</Text>
              </View>
              {vehicle.driveType && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.driveType || "Drive Type"}
                  </Text>
                  <Text style={styles.infoValue}>{vehicle.driveType}</Text>
                </View>
              )}
              {vehicle.bodyType && vehicle.bodyType !== vehicle.vehicleType && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.bodyType || "Body Style"}
                  </Text>
                  <Text style={styles.infoValue}>{vehicle.bodyType.charAt(0).toUpperCase() + vehicle.bodyType.slice(1)}</Text>
                </View>
              )}
              {vehicle.category && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.category || "Category"}
                  </Text>
                  <Text style={styles.infoValue}>{vehicle.category}</Text>
                </View>
              )}
              {vehicle.seatingCapacity && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.seatingCapacity || "Seating Capacity"}
                  </Text>
                  <Text style={styles.infoValue}>
                    {vehicle.seatingCapacity}
                  </Text>
                </View>
              )}
              {vehicle.numberOfRows && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.numberOfRows || "Seat Rows"}
                  </Text>
                  <Text style={styles.infoValue}>{vehicle.numberOfRows}</Text>
                </View>
              )}
              {vehicle.countryOfManufacturer && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.countryOfManufacturer ||
                      "Country of Manufacture"}
                  </Text>
                  <Text style={styles.infoValue}>
                    {vehicle.countryOfManufacturer}
                  </Text>
                </View>
              )}
              {vehicle.engineType && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.engine || "Engine"}
                  </Text>
                  <Text style={styles.infoValue}>{vehicle.engineType}</Text>
                </View>
              )}
              {vehicle.transmission && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.transmission || "Transmission"}
                  </Text>
                  <Text style={styles.infoValue}>{vehicle.transmission}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.primaryDriver || "Primary Driver"}
                </Text>
                <Text style={styles.infoValue}>{vehicle.primaryDriver}</Text>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* Insurance Information */}
        <FadeInView delay={300}>
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {t.vehicle?.insurance || "Insurance"}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("Insurance", { vehicleId: vehicle.id })
                }
              >
                <Text style={styles.seeAllText}>
                  {t.common?.manage || "Manage"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.provider || "Provider"}
                </Text>
                <Text style={styles.infoValue}>
                  {vehicle.insuranceProvider}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.policyNumber || "Policy Number"}
                </Text>
                <Text style={styles.infoValue}>{vehicle.insurancePolicy}</Text>
              </View>
              <View style={styles.infoRowColumn}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.expiration || "Expiration"}
                </Text>
                <View style={styles.expiryContainerColumn}>
                  <Text
                    style={[
                      styles.infoValueFull,
                      isExpired(vehicle.insuranceExpiry) && styles.expiredText,
                      isExpiringSoon(vehicle.insuranceExpiry) &&
                        styles.expiringSoonText,
                    ]}
                  >
                    {vehicle.insuranceExpiry && formatDate(vehicle.insuranceExpiry)
                      ? formatDate(vehicle.insuranceExpiry)
                      : (t.common?.notProvided || "Not provided")}
                  </Text>
                  {isExpired(vehicle.insuranceExpiry) && (
                    <View style={styles.expiredBadge}>
                      <Ionicons name="warning" size={12} color="#ef4444" />
                      <Text style={styles.expiredBadgeText}>
                        {t.vehicle?.expired || "Expired"}
                      </Text>
                    </View>
                  )}
                  {isExpiringSoon(vehicle.insuranceExpiry) &&
                    !isExpired(vehicle.insuranceExpiry) && (
                      <View style={styles.expiringSoonBadge}>
                        <Ionicons
                          name="alert-circle"
                          size={12}
                          color="#f59e0b"
                        />
                        <Text style={styles.expiringSoonBadgeText}>
                          {t.vehicle?.expiringSoon || "Expiring Soon"}
                        </Text>
                      </View>
                    )}
                </View>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* Safety Recalls */}
        <FadeInView delay={320}>
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {t.vehicle?.safetyRecalls || "Safety recalls"}
              </Text>
              {recalls.length > 0 && (
                <View style={{ backgroundColor: "#fef2f2", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#ef4444" }}>{recalls.length}</Text>
                </View>
              )}
            </View>
            {recallsLoading ? (
              <View style={[styles.infoCard, { alignItems: "center", paddingVertical: 20 }]}>
                <Text style={{ color: "#9ca3af" }}>
                  {t.vehicle?.recallsLoading || "Loading recalls..."}
                </Text>
              </View>
            ) : recalls.length === 0 ? (
              <View style={[styles.infoCard, { alignItems: "center", paddingVertical: 20 }]}>
                <Ionicons name="shield-checkmark" size={32} color="#10b981" />
                <Text style={{ marginTop: 8, fontSize: 14, fontWeight: "600", color: "#10b981" }}>
                  {t.vehicle?.recallsNoneActive || "No active recalls"}
                </Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
                  {t.vehicle?.recallsNoneDetail ||
                    "This vehicle has no open safety recalls from NHTSA."}
                </Text>
              </View>
            ) : (
              <View>
                {recalls.map((recall, index) => {
                  const isExpanded = expandedRecall === recall.nhtsaCampaignNumber;
                  return (
                    <TouchableOpacity
                      key={recall.nhtsaCampaignNumber || index}
                      style={[styles.infoCard, { marginBottom: 8 }]}
                      onPress={() => setExpandedRecall(isExpanded ? null : recall.nhtsaCampaignNumber)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="warning" size={16} color="#ef4444" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }} numberOfLines={isExpanded ? undefined : 1}>
                            {recall.component}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                            {(t.vehicle?.recallsCampaignLine || "Campaign #{{id}}").replace(
                              "{{id}}",
                              String(recall.nhtsaCampaignNumber ?? ""),
                            )}
                            {recall.reportReceivedDate && formatDate(recall.reportReceivedDate)
                              ? ` • ${formatDate(recall.reportReceivedDate)}`
                              : ""}
                          </Text>
                        </View>
                        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" />
                      </View>
                      {isExpanded && (
                        <View style={{ marginTop: 12, gap: 10 }}>
                          {recall.summary ? (
                            <View>
                              <Text style={{ fontSize: 11, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                {t.vehicle?.recallsSummaryLabel || "Summary"}
                              </Text>
                              <Text style={{ fontSize: 13, color: "#374151", marginTop: 4, lineHeight: 18 }}>{recall.summary}</Text>
                            </View>
                          ) : null}
                          {recall.consequence ? (
                            <View>
                              <Text style={{ fontSize: 11, fontWeight: "700", color: "#ef4444", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                {t.vehicle?.recallsRiskLabel || "Risk"}
                              </Text>
                              <Text style={{ fontSize: 13, color: "#374151", marginTop: 4, lineHeight: 18 }}>{recall.consequence}</Text>
                            </View>
                          ) : null}
                          {recall.remedy ? (
                            <View>
                              <Text style={{ fontSize: 11, fontWeight: "700", color: "#10b981", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                {t.vehicle?.recallsRemedyLabel || "Remedy"}
                              </Text>
                              <Text style={{ fontSize: 13, color: "#374151", marginTop: 4, lineHeight: 18 }}>{recall.remedy}</Text>
                            </View>
                          ) : null}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </FadeInView>

        {/* Service Status */}
        <FadeInView delay={350}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t.vehicle?.serviceStatus || "Service Status"}
            </Text>
            <View style={styles.serviceStatusCard}>
              <View style={styles.serviceStatusItem}>
                <Ionicons name="checkmark-circle" size={20} color={vehicle.lastService && formatDate(vehicle.lastService) ? "#10b981" : "#d1d5db"} />
                <View style={styles.serviceStatusInfo}>
                  <Text style={styles.serviceStatusLabel}>
                    {t.vehicle?.lastService || "Last Service"}
                  </Text>
                  <Text style={[styles.serviceStatusValue, !(vehicle.lastService && formatDate(vehicle.lastService)) && { color: '#9ca3af', fontStyle: 'italic' }]}>
                    {vehicle.lastService && formatDate(vehicle.lastService)
                      ? formatDate(vehicle.lastService)
                      : (t.vehicle?.noServiceRecorded || "No service recorded")}
                  </Text>
                </View>
              </View>
              <View style={styles.serviceStatusItem}>
                <Ionicons name="calendar" size={20} color={vehicle.nextServiceDue && formatDate(vehicle.nextServiceDue) ? "#3b82f6" : "#d1d5db"} />
                <View style={styles.serviceStatusInfo}>
                  <Text style={styles.serviceStatusLabel}>
                    {t.vehicle?.nextServiceDue || "Next Service Due"}
                  </Text>
                  <Text style={[styles.serviceStatusValue, !(vehicle.nextServiceDue && formatDate(vehicle.nextServiceDue)) && { color: '#9ca3af', fontStyle: 'italic' }]}>
                    {vehicle.nextServiceDue && formatDate(vehicle.nextServiceDue)
                      ? formatDate(vehicle.nextServiceDue)
                      : (t.vehicle?.notSet || "Not set")}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* Maintenance History */}
        <FadeInView delay={400}>
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {t.vehicle?.maintenanceHistory || "Maintenance History"}
              </Text>
              <Text style={styles.historyCount}>
                {vehicle.maintenanceHistory.length}{" "}
                {t.vehicle?.records || "records"}
              </Text>
            </View>

            {vehicle.maintenanceHistory.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Ionicons name="time-outline" size={40} color="#d1d5db" />
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#6b7280', marginTop: 12 }}>
                  {t.vehicle?.noHistory || "No maintenance history yet"}
                </Text>
                <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 4, paddingHorizontal: 16 }}>
                  {t.vehicle?.historyWillAppear || "Your maintenance timeline will appear here after completing services through TechTrust."}
                </Text>
              </View>
            ) : (
            vehicle.maintenanceHistory.map((record, index) => {
              const statusColor = getStatusColor(record.status);
              return (
                <TouchableOpacity
                  key={record.id}
                  style={styles.historyCard}
                  onPress={() => {
                    if (record.status === "completed") {
                      navigation.navigate("Services", {
                        screen: "WorkOrderDetails",
                        params: {
                          workOrderId: record.workOrderId || record.id,
                          fromVehicleDetails: true,
                        },
                      });
                    } else if (record.status === "scheduled") {
                      const dateStr = formatDate(record.date) || "";
                      const schedBody = (t.vehicle?.scheduledServiceDetailBody || "")
                        .replace(/\{\{\s*type\s*\}\}/g, record.type)
                        .replace(/\{\{\s*description\s*\}\}/g, record.description)
                        .replace(/\{\{\s*date\s*\}\}/g, dateStr);
                      Alert.alert(
                        t.vehicle?.scheduledService || "Scheduled Service",
                        schedBody ||
                          `${record.type}\n\n${record.description}\n\nScheduled for: ${dateStr || record.date}`,
                        [{ text: t.common?.ok || "OK" }],
                      );
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.historyHeader}>
                    <View style={styles.historyIconContainer}>
                      <Ionicons
                        name={
                          record.status === "scheduled"
                            ? "calendar-outline"
                            : "construct-outline"
                        }
                        size={20}
                        color={statusColor.text}
                      />
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyType}>{record.type}</Text>
                      <Text style={styles.historyDescription} numberOfLines={2}>
                        {record.description}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColor.bg },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: statusColor.text }]}
                      >
                        {record.status.charAt(0).toUpperCase() +
                          record.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.historyDetails}>
                    <View style={styles.historyDetailItem}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color="#6b7280"
                      />
                      <Text style={styles.historyDetailText}>
                        {formatDate(record.date)}
                      </Text>
                    </View>
                    {record.mileage > 0 && (
                      <View style={styles.historyDetailItem}>
                        <Ionicons
                          name="speedometer-outline"
                          size={14}
                          color="#6b7280"
                        />
                        <Text style={styles.historyDetailText}>
                          {formatMileage(record.mileage)}
                        </Text>
                      </View>
                    )}
                    {record.cost > 0 && (
                      <View style={styles.historyDetailItem}>
                        <Ionicons
                          name="wallet-outline"
                          size={14}
                          color="#10b981"
                        />
                        <Text
                          style={[
                            styles.historyDetailText,
                            { color: "#10b981", fontWeight: "600" },
                          ]}
                        >
                          {formatCurrency(record.cost)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {record.provider !== "TBD" && (
                    <View style={styles.historyProvider}>
                      <Ionicons
                        name="business-outline"
                        size={14}
                        color="#6b7280"
                      />
                      <Text style={styles.providerText}>{record.provider}</Text>
                    </View>
                  )}

                  {/* Tap indicator for completed services */}
                  {record.status === "completed" && (
                    <View style={styles.tapIndicator}>
                      <Text style={styles.tapIndicatorText}>
                        {t.common?.tapToViewDetails || "Tap to view details"}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="#9ca3af"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
            )}
          </View>
        </FadeInView>

        {/* Actions */}
        <FadeInView delay={500}>
          <View style={styles.actionsSection}>
            <ScalePress
              onPress={() =>
                navigation.navigate("Home", {
                  screen: "Dashboard",
                  params: {
                    screen: "CreateRequest",
                    params: { vehicleId: vehicle.id },
                  },
                })
              }
              style={styles.primaryButton}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {t.vehicle?.requestService || "Request Service"}
              </Text>
            </ScalePress>

            <ScalePress
              onPress={() =>
                navigation.navigate("Insurance", { vehicleId: vehicle.id })
              }
              style={styles.secondaryButton}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#2B5EA7"
              />
              <Text style={styles.secondaryButtonText}>
                {t.vehicle?.manageInsurance || "Manage Insurance"}
              </Text>
            </ScalePress>

            <ScalePress
              onPress={() =>
                navigation.navigate("VehicleTransfer", {
                  vehicleId: vehicle.id,
                  vehicleInfo: {
                    make: vehicle.make,
                    model: vehicle.model,
                    year: vehicle.year,
                    vin: vehicle.vin,
                    plateNumber: vehicle.plateNumber,
                  },
                  maintenanceHistory: vehicle.maintenanceHistory,
                  totalSpent: vehicle.totalMaintenanceSpent,
                })
              }
              style={styles.transferButton}
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={20}
                color="#8b5cf6"
              />
              <Text style={styles.transferButtonText}>
                {t.vehicle?.transferVehicle || "Transfer Vehicle"}
              </Text>
            </ScalePress>

            {/* D14 — Find Parts for This Vehicle */}
            <ScalePress
              onPress={() =>
                navigation.navigate("PartsStore", {
                  vehicleId: vehicle.id,
                  vehicleMake: vehicle.make,
                  vehicleModel: vehicle.model,
                  vehicleYear: vehicle.year,
                })
              }
              style={styles.partsButton}
            >
              <Ionicons name="construct-outline" size={20} color="#ea580c" />
              <Text style={styles.partsButtonText}>
                {t.vehicle?.findParts || "Find Parts for This Vehicle"}
              </Text>
            </ScalePress>

            {/* D13 — Add Past Service */}
            <ScalePress
              onPress={() => setShowPastServiceModal(true)}
              style={styles.pastServiceButton}
            >
              <Ionicons name="time-outline" size={20} color="#6b7280" />
              <Text style={styles.pastServiceButtonText}>
                {t.vehicle?.addPastService || "Add Past Service"}
              </Text>
            </ScalePress>
          </View>
        </FadeInView>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Vehicle Onboarding Modal */}
      <Modal
        visible={showOnboarding}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOnboarding(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Progress dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 16 }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={{
                width: i === onboardingStep ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === onboardingStep ? '#2B5EA7' : '#e5e7eb',
              }} />
            ))}
          </View>

          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
            {/* Step 0 — Welcome */}
            {onboardingStep === 0 && (
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: 8 }}>
                  <Ionicons name="checkmark-circle" size={52} color="#2B5EA7" />
                </View>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 10 }}>
                  {t.vehicle?.onboardingWelcomeTitle || "Your vehicle is ready!"}
                </Text>
                <Text style={{ fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                  {(t.vehicle?.onboardingWelcomeSubtitle ||
                    "{{year}} {{make}} {{model}} has been added to your garage.")
                    .replace("{{year}}", String(vehicle?.year ?? ""))
                    .replace("{{make}}", vehicle?.make ?? "")
                    .replace("{{model}}", vehicle?.model ?? "")}
                </Text>

                <View style={{ width: '100%', gap: 12 }}>
                  {[
                    { icon: 'shield-checkmark-outline', color: '#10b981', bg: '#d1fae5', title: t.vehicle?.onboardingBulletAccurateQuotesTitle, desc: t.vehicle?.onboardingBulletAccurateQuotesDesc },
                    { icon: 'time-outline', color: '#2B5EA7', bg: '#dbeafe', title: t.vehicle?.onboardingBulletServiceHistoryTitle, desc: t.vehicle?.onboardingBulletServiceHistoryDesc },
                    { icon: 'notifications-outline', color: '#f59e0b', bg: '#fef3c7', title: t.vehicle?.onboardingBulletRecallAlertsTitle, desc: t.vehicle?.onboardingBulletRecallAlertsDesc },
                  ].map(item => (
                    <View key={item.title} style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.bg, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name={item.icon as any} size={20} color={item.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 }}>{item.title}</Text>
                        <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 18 }}>{item.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Step 1 — Complete your profile */}
            {onboardingStep === 1 && (
              <View>
                <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                    <Ionicons name="document-text-outline" size={36} color="#f59e0b" />
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
                    {t.vehicle?.onboardingCompleteProfileTitle || "Complete your profile"}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 }}>
                    {t.vehicle?.onboardingCompleteProfileSubtitle ||
                      "The more you fill in, the better your experience"}
                  </Text>
                </View>

                {[
                  {
                    icon: 'car-outline',
                    color: '#2B5EA7',
                    bg: '#dbeafe',
                    title: t.vehicle?.vehicleInformation || "Vehicle information",
                    desc: t.vehicle?.onboardingVehicleCardDesc,
                    action: t.vehicle?.editVehicle || "Edit Vehicle",
                    onAction: () => { setShowOnboarding(false); navigation.navigate('AddVehicle', { vehicle }); },
                  },
                  {
                    icon: 'shield-outline',
                    color: '#059669',
                    bg: '#d1fae5',
                    title: t.vehicle?.onboardingInsuranceCardTitle || "Insurance details",
                    desc: t.vehicle?.onboardingInsuranceCardDesc,
                    action: t.vehicle?.manageInsurance || "Manage Insurance",
                    onAction: () => { setShowOnboarding(false); navigation.navigate('Insurance', { vehicleId: vehicle?.id }); },
                  },
                ].map(item => (
                  <View key={item.title} style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: item.bg, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name={item.icon as any} size={22} color={item.color} />
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 }}>{item.title}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 19, marginBottom: 12 }}>{item.desc}</Text>
                    <TouchableOpacity
                      style={{ alignSelf: 'flex-start', backgroundColor: item.bg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}
                      onPress={item.onAction}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: item.color }}>
                        {item.action} →
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Step 2 — What you can do */}
            {onboardingStep === 2 && (
              <View>
                <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                    <Ionicons name="grid-outline" size={36} color="#7c3aed" />
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
                    {t.vehicle?.onboardingStep2Title || "Here's what you can do"}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 }}>
                    {t.vehicle?.onboardingStep2Subtitle ||
                      "Every button in Vehicle Details explained"}
                  </Text>
                </View>

                {[
                  {
                    icon: 'add-circle-outline',
                    color: '#fff',
                    bg: '#2B5EA7',
                    title: t.vehicle?.requestService || "Request Service",
                    desc: t.vehicle?.onboardingDescRequestService,
                  },
                  {
                    icon: 'shield-checkmark-outline',
                    color: '#2B5EA7',
                    bg: '#dbeafe',
                    title: t.vehicle?.manageInsurance || "Manage Insurance",
                    desc: t.vehicle?.onboardingDescManageInsurance,
                  },
                  {
                    icon: 'swap-horizontal-outline',
                    color: '#7c3aed',
                    bg: '#ede9fe',
                    title: t.vehicle?.transferVehicle || "Transfer Vehicle",
                    desc: t.vehicle?.onboardingDescTransferVehicle,
                  },
                  {
                    icon: 'construct-outline',
                    color: '#ea580c',
                    bg: '#fff7ed',
                    title: t.vehicle?.findParts || "Find Parts",
                    desc: t.vehicle?.onboardingDescFindParts,
                  },
                  {
                    icon: 'time-outline',
                    color: '#6b7280',
                    bg: '#f3f4f6',
                    title: t.vehicle?.addPastService || "Add Past Service",
                    desc: t.vehicle?.onboardingDescAddPastService,
                  },
                ].map(item => (
                  <View key={item.title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.bg, justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                      <Ionicons name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 }}>{item.title}</Text>
                      <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 18 }}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Bottom nav */}
          <View style={{ padding: 20, paddingBottom: 8, gap: 10 }}>
            <TouchableOpacity
              style={{ backgroundColor: '#2B5EA7', paddingVertical: 16, borderRadius: 14, alignItems: 'center' }}
              onPress={() => {
                if (onboardingStep < 2) {
                  setOnboardingStep(s => s + 1);
                } else {
                  setShowOnboarding(false);
                }
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                {onboardingStep < 2
                  ? (t.vehicle?.onboardingNext || "Next →")
                  : (t.vehicle?.onboardingGetStarted || "Get started")}
              </Text>
            </TouchableOpacity>
            {onboardingStep < 2 && (
              <TouchableOpacity
                style={{ paddingVertical: 12, alignItems: 'center' }}
                onPress={() => setShowOnboarding(false)}
              >
                <Text style={{ fontSize: 14, color: '#9ca3af' }}>
                  {t.vehicle?.onboardingSkipForNow || "Skip for now"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* D13 — Add Past Service Modal */}
      <Modal
        visible={showPastServiceModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPastServiceModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowPastServiceModal(false)} style={styles.backBtn}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {t.vehicle?.pastServiceModalTitle || t.vehicle?.addPastService}
            </Text>
            <TouchableOpacity onPress={handleSavePastService}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#2B5EA7' }}>
                {t.common?.save || "Save"}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.pastServiceLabel}>
              {t.vehicle?.pastServiceTypeLabel || "Service type *"}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {PAST_SERVICE_TYPE_IDS.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.pastServiceChip, pastServiceData.type === type && styles.pastServiceChipActive]}
                  onPress={() => setPastServiceData(prev => ({ ...prev, type }))}
                >
                  <Text style={[styles.pastServiceChipText, pastServiceData.type === type && { color: '#fff' }]}>
                    {pastServiceTypeDisplayLabel(type, t.vehicle as Record<string, string | undefined>)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.pastServiceLabel}>
              {t.vehicle?.pastServiceDescriptionLabel || "Description"}
            </Text>
            <TextInput
              style={styles.pastServiceInput}
              placeholder={t.vehicle?.pastServiceDescriptionPlaceholder || "Describe the service performed..."}
              value={pastServiceData.description}
              onChangeText={text => setPastServiceData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.pastServiceLabel}>
              {t.vehicle?.pastServiceDateLabel || "Date * (MM/DD/YYYY)"}
            </Text>
            <TextInput
              style={styles.pastServiceInput}
              placeholder={t.vehicle?.pastServiceDatePlaceholder || "01/15/2024"}
              value={pastServiceData.date}
              onChangeText={text => setPastServiceData(prev => ({ ...prev, date: text }))}
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pastServiceLabel}>
                  {t.vehicle?.pastServiceMileageLabel || "Mileage"}
                </Text>
                <TextInput
                  style={styles.pastServiceInput}
                  placeholder={t.vehicle?.pastServiceMileagePlaceholder || "45,000"}
                  value={pastServiceData.mileage}
                  onChangeText={text => setPastServiceData(prev => ({ ...prev, mileage: text }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pastServiceLabel}>
                  {(t.vehicle?.pastServiceCostWithSymbol || "Cost * ({{symbol}})").replace(
                    "{{symbol}}",
                    fiatSymbol,
                  )}
                </Text>
                <TextInput
                  style={styles.pastServiceInput}
                  placeholder={t.vehicle?.pastServiceCostPlaceholder || "150.00"}
                  value={pastServiceData.cost}
                  onChangeText={text => setPastServiceData(prev => ({ ...prev, cost: text }))}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={styles.pastServiceLabel}>
              {t.vehicle?.pastServiceProviderLabel || "Service provider"}
            </Text>
            <TextInput
              style={styles.pastServiceInput}
              placeholder={t.vehicle?.pastServiceProviderPlaceholder || "e.g., Jiffy Lube, local mechanic"}
              value={pastServiceData.provider}
              onChangeText={text => setPastServiceData(prev => ({ ...prev, provider: text }))}
            />

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
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
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  editBtn: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  vehicleIconLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  vehicleTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  vehicleTrim: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 12,
  },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: "#2B5EA7",
    fontWeight: "600",
  },
  historyCount: {
    fontSize: 14,
    color: "#6b7280",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoRowColumn: {
    flexDirection: "column",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    flexShrink: 0,
    marginRight: 12,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    textAlign: "right",
  },
  infoValueFull: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginTop: 6,
  },
  infoValueFullVIN: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginTop: 8,
    letterSpacing: 0.5,
  },
  expiryContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expiryContainerWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 8,
  },
  expiryContainerColumn: {
    flexDirection: "column",
    marginTop: 6,
    gap: 8,
  },
  expiredText: {
    color: "#ef4444",
  },
  expiringSoonText: {
    color: "#f59e0b",
  },
  expiredBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  expiredBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ef4444",
  },
  expiringSoonBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  expiringSoonBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#f59e0b",
  },
  serviceStatusCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceStatusItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  serviceStatusInfo: {
    flex: 1,
  },
  serviceStatusLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  serviceStatusValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginTop: 2,
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  historyDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  historyDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  historyDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyDetailText: {
    fontSize: 13,
    color: "#6b7280",
  },
  historyProvider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 6,
  },
  providerText: {
    fontSize: 13,
    color: "#6b7280",
  },
  tapIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 4,
  },
  tapIndicatorText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  actionsSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2B5EA7",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2B5EA7",
  },
  transferButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ede9fe",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  transferButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  // D14 — Find Parts button
  partsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff7ed",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  partsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ea580c",
  },
  // D13 — Add Past Service button
  pastServiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  pastServiceButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  // D11 — Vehicle photo styles
  vehiclePhotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  vehiclePhotoImage: {
    width: 120,
    height: 120,
    borderRadius: 20,
  },
  vehiclePhotoOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderTopLeftRadius: 12,
    padding: 6,
  },
  // D13 — Past Service modal styles
  pastServiceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  pastServiceInput: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    marginBottom: 4,
  },
  pastServiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  pastServiceChipActive: {
    backgroundColor: "#2B5EA7",
    borderColor: "#2B5EA7",
  },
  pastServiceChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
});
