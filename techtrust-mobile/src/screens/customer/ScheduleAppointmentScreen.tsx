/**
 * ScheduleAppointmentScreen - Schedule a diagnostic/estimate visit
 * Redesigned: vehicle picker, service type, provider search by radius, $50 fixed fee
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  FlatList,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n";
import api from "../../services/api";
import * as fdacsService from "../../services/fdacs.service";
import { getMySubscription, type SubscriptionInfo } from "../../services/payment.service";

let DateTimePicker: any = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch (e) {}

const APP_FEE_FREE = 5.00;
const APP_FEE_SUBSCRIBER = 0;
const MAX_PROVIDER_DIAGNOSTIC_FEE = 50;
const DEFAULT_RADIUS_MILES = 25;

interface VehicleItem {
  id: string;
  name: string;
  plate?: string;
}

interface ProviderResult {
  id: string;
  userId: string;
  businessName: string;
  city?: string;
  state?: string;
  averageRating: number;
  totalReviews: number;
  servicesOffered?: string[];
  distance?: {
    distanceMiles: number;
    estimatedTimeMinutes: number;
  };
  travelFee?: number;
}

export default function ScheduleAppointmentScreen({ route, navigation }: any) {
  const { serviceRequestId, providerId, vehicleId } = route.params || {};
  const { t } = useI18n();
  const sa: any = t.scheduleAppointment || {};

  // Step tracker: 1 = vehicle, 2 = service type, 3 = provider, 4 = date/time, 5 = confirm
  const [step, setStep] = useState(1);

  // Vehicle
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>(
    vehicleId || "",
  );
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // Service type
  const diagnosticServiceTypes = [
    {
      id: "engine",
      label: t.createRequest?.serviceEngine || "Engine",
      icon: "cog" as const,
    },
    {
      id: "brake",
      label: t.createRequest?.serviceBrakes || "Brakes",
      icon: "disc" as const,
    },
    {
      id: "electric",
      label: t.createRequest?.serviceElectrical || "Electrical",
      icon: "flash" as const,
    },
    {
      id: "ac",
      label: t.createRequest?.serviceAC || "A/C",
      icon: "snow" as const,
    },
    {
      id: "suspension",
      label: t.createRequest?.serviceSuspension || "Suspension",
      icon: "resize" as const,
    },
    {
      id: "transmission",
      label: t.createRequest?.serviceTransmission || "Transmission",
      icon: "cog" as const,
    },
    {
      id: "oil",
      label: t.createRequest?.serviceOilChange || "Oil Change",
      icon: "water" as const,
    },
    {
      id: "tire",
      label: t.createRequest?.serviceTires || "Tires",
      icon: "ellipse" as const,
    },
    {
      id: "inspection",
      label: t.createRequest?.serviceInspection || "Full Inspection",
      icon: "clipboard" as const,
    },
    {
      id: "battery",
      label: t.createRequest?.serviceBattery || "Battery",
      icon: "battery-charging" as const,
    },
    {
      id: "other",
      label: t.createRequest?.serviceOther || "Other",
      icon: "ellipsis-horizontal" as const,
    },
  ];
  const [selectedServiceType, setSelectedServiceType] = useState("");

  // Provider search
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_RADIUS_MILES);
  const [providers, setProviders] = useState<ProviderResult[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>(
    providerId || "",
  );
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [searchedProviders, setSearchedProviders] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Date/Time
  const [date, setDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);

  // Subscription / Plan
  const [userPlan, setUserPlan] = useState<SubscriptionInfo | null>(null);
  const isSubscriber = userPlan && userPlan.plan !== "FREE" && userPlan.status === "ACTIVE";
  const appFee = isSubscriber ? APP_FEE_SUBSCRIBER : APP_FEE_FREE;

  // Load vehicles + subscription on mount
  useEffect(() => {
    loadVehicles();
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      const sub = await getMySubscription();
      setUserPlan(sub);
    } catch {
      // Defaults to free plan if can't load
    }
  }

  async function loadVehicles() {
    try {
      const { getVehicles } = await import(
        "../../services/dashboard.service"
      );
      const vehicleData = await getVehicles();
      const mapped = vehicleData.map((v: any) => ({
        id: v.id,
        name: `${v.make} ${v.model} ${v.year}`,
        plate: v.plateNumber,
      }));
      setVehicles(mapped);
      if (vehicleId) {
        setSelectedVehicle(vehicleId);
      } else if (mapped.length === 1) {
        setSelectedVehicle(mapped[0].id);
      }
    } catch {
      Alert.alert(
        t.common?.error || "Error",
        sa.failedLoadVehicles ||
          "Failed to load vehicles",
      );
    } finally {
      setLoadingVehicles(false);
    }
  }

  // Get user location and search providers
  const searchProviders = useCallback(async () => {
    setLoadingProviders(true);
    setSearchedProviders(false);
    try {
      let loc = userLocation;
      if (!loc) {
        const Location = await import("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            t.common?.error || "Error",
            sa.locationRequired ||
              "Location permission is required to find nearby providers",
          );
          setLoadingProviders(false);
          return;
        }
        const position = await Location.getCurrentPositionAsync({});
        loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(loc);
      }

      const radiusKm = radiusMiles * 1.60934;
      const response = await api.get("/providers/search", {
        params: {
          lat: loc.lat,
          lng: loc.lng,
          radius: radiusKm,
          serviceType: selectedServiceType.toUpperCase(),
        },
      });

      const found = response.data?.data?.providers || [];
      setProviders(found);
      setSearchedProviders(true);
    } catch {
      Alert.alert(
        t.common?.error || "Error",
        sa.searchFailed ||
          "Failed to search providers. Please try again.",
      );
    } finally {
      setLoadingProviders(false);
    }
  }, [userLocation, radiusMiles, selectedServiceType, t]);

  const onDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      );
      setDate(newDate);
    }
  };

  const onTimeChange = (_: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      setDate(newDate);
    }
  };

  async function handleSubmit() {
    if (!selectedVehicle || !selectedProvider || !selectedServiceType) {
      Alert.alert(
        t.common?.required || "Required",
        sa.fillAllFields ||
          "Please complete all required fields",
      );
      return;
    }

    try {
      setSubmitting(true);
      await fdacsService.scheduleAppointment({
        serviceRequestId,
        providerId: selectedProvider,
        vehicleId: selectedVehicle,
        scheduledDate: date.toISOString(),
        serviceDescription: `Diagnostic: ${diagnosticServiceTypes.find((s) => s.id === selectedServiceType)?.label || selectedServiceType}`,
        serviceType: selectedServiceType.toUpperCase(),
        diagnosticFee: 0, // Provider sets fee when accepting
        feeWaivedOnService: true,
        latitude: userLocation?.lat,
        longitude: userLocation?.lng,
      });
      Alert.alert(
        t.common?.success || "Success",
        sa.scheduled ||
          "Your diagnostic appointment has been scheduled! The provider will confirm shortly.",
        [{ text: t.common?.ok || "OK", onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert(
        t.common?.error || "Error",
        error?.response?.data?.message ||
          sa.scheduleFailed ||
          "Failed to schedule appointment. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Step labels
  const stepLabels = [
    sa.stepVehicle || "Vehicle",
    sa.stepService || "Service",
    sa.stepProvider || "Provider",
    sa.stepDateTime || "Date & Time",
    sa.stepConfirm || "Confirm",
  ];

  const canGoNext = () => {
    switch (step) {
      case 1:
        return !!selectedVehicle;
      case 2:
        return !!selectedServiceType;
      case 3:
        return !!selectedProvider;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const selectedVehicleObj = vehicles.find((v) => v.id === selectedVehicle);
  const selectedServiceObj = diagnosticServiceTypes.find(
    (s) => s.id === selectedServiceType,
  );
  const selectedProviderObj = providers.find(
    (p) => p.id === selectedProvider || p.userId === selectedProvider,
  );

  // ─── RENDER ───
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {sa.title || "Schedule Diagnostic"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepRow}>
        {stepLabels.map((label, i) => (
          <View key={i} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                i + 1 <= step && styles.stepCircleActive,
                i + 1 < step && styles.stepCircleDone,
              ]}
            >
              {i + 1 < step ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    i + 1 <= step && styles.stepNumberActive,
                  ]}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                i + 1 === step && styles.stepLabelActive,
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── STEP 1: Vehicle ─── */}
        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>
              {sa.selectVehicle ||
                "Select your vehicle"}
            </Text>
            {loadingVehicles ? (
              <ActivityIndicator
                size="large"
                color="#1976d2"
                style={{ marginTop: 40 }}
              />
            ) : vehicles.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="car-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>
                  {sa.noVehicles ||
                    "No vehicles found. Please add a vehicle first."}
                </Text>
              </View>
            ) : (
              vehicles.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    styles.selectionCard,
                    selectedVehicle === v.id && styles.selectionCardActive,
                  ]}
                  onPress={() => setSelectedVehicle(v.id)}
                >
                  <View style={styles.selectionIcon}>
                    <Ionicons
                      name="car"
                      size={24}
                      color={
                        selectedVehicle === v.id ? "#1976d2" : "#6b7280"
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectionTitle}>{v.name}</Text>
                    {v.plate && (
                      <Text style={styles.selectionSub}>{v.plate}</Text>
                    )}
                  </View>
                  {selectedVehicle === v.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#1976d2"
                    />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ─── STEP 2: Service Type ─── */}
        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>
              {sa.selectServiceType ||
                "What needs to be diagnosed?"}
            </Text>
            <View style={styles.serviceGrid}>
              {diagnosticServiceTypes.map((svc) => (
                <TouchableOpacity
                  key={svc.id}
                  style={[
                    styles.serviceChip,
                    selectedServiceType === svc.id &&
                      styles.serviceChipActive,
                  ]}
                  onPress={() => setSelectedServiceType(svc.id)}
                >
                  <Ionicons
                    name={svc.icon as any}
                    size={22}
                    color={
                      selectedServiceType === svc.id
                        ? "#1976d2"
                        : "#6b7280"
                    }
                  />
                  <Text
                    style={[
                      styles.serviceChipText,
                      selectedServiceType === svc.id &&
                        styles.serviceChipTextActive,
                    ]}
                  >
                    {svc.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ─── STEP 3: Provider Search ─── */}
        {step === 3 && (
          <View>
            <Text style={styles.sectionTitle}>
              {sa.findProvider ||
                "Find a nearby provider"}
            </Text>

            {/* Radius selector */}
            <View style={styles.radiusRow}>
              <Text style={styles.radiusLabel}>
                {sa.searchRadius || "Search Radius:"}
              </Text>
              <View style={styles.radiusBtns}>
                {[10, 25, 50, 100].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.radiusBtn,
                      radiusMiles === r && styles.radiusBtnActive,
                    ]}
                    onPress={() => {
                      setRadiusMiles(r);
                      setSearchedProviders(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.radiusBtnText,
                        radiusMiles === r && styles.radiusBtnTextActive,
                      ]}
                    >
                      {r} mi
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Search button */}
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={searchProviders}
              disabled={loadingProviders}
            >
              {loadingProviders ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="search" size={18} color="#fff" />
                  <Text style={styles.searchBtnText}>
                    {sa.searchProviders ||
                      "Search Providers"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Results */}
            {searchedProviders && providers.length === 0 && (
              <View style={styles.emptyBox}>
                <Ionicons
                  name="location-outline"
                  size={48}
                  color="#9ca3af"
                />
                <Text style={styles.emptyText}>
                  {sa.noProvidersFound ||
                    "No providers found in this area. Try a larger radius."}
                </Text>
              </View>
            )}

            {providers.map((prov) => (
              <TouchableOpacity
                key={prov.id}
                style={[
                  styles.selectionCard,
                  (selectedProvider === prov.id ||
                    selectedProvider === prov.userId) &&
                    styles.selectionCardActive,
                ]}
                onPress={() => setSelectedProvider(prov.userId || prov.id)}
              >
                <View style={styles.selectionIcon}>
                  <Ionicons
                    name="business"
                    size={24}
                    color={
                      selectedProvider === prov.id ||
                      selectedProvider === prov.userId
                        ? "#1976d2"
                        : "#6b7280"
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectionTitle}>
                    {prov.businessName}
                  </Text>
                  <View style={styles.providerMeta}>
                    {prov.averageRating > 0 && (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Text style={styles.ratingText}>
                          {Number(prov.averageRating).toFixed(1)} (
                          {prov.totalReviews})
                        </Text>
                      </View>
                    )}
                    {prov.distance && (
                      <Text style={styles.distanceText}>
                        {Number(prov.distance.distanceMiles).toFixed(1)} mi
                        {prov.distance.estimatedTimeMinutes
                          ? ` · ~${Math.round(prov.distance.estimatedTimeMinutes)} min`
                          : ""}
                      </Text>
                    )}
                  </View>
                  {prov.city && prov.state && (
                    <Text style={styles.selectionSub}>
                      {prov.city}, {prov.state}
                    </Text>
                  )}
                </View>
                {(selectedProvider === prov.id ||
                  selectedProvider === prov.userId) && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color="#1976d2"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ─── STEP 4: Date & Time ─── */}
        {step === 4 && (
          <View>
            <Text style={styles.sectionTitle}>
              {sa.selectDateTime ||
                "Choose date and time"}
            </Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateBtn, { flex: 1 }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color="#1976d2"
                />
                <Text style={styles.dateBtnText}>
                  {date.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateBtn, { flex: 1 }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color="#1976d2" />
                <Text style={styles.dateBtnText}>
                  {date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {DateTimePicker && (showDatePicker || showTimePicker) && (
              <DateTimePicker
                value={date}
                mode={showDatePicker ? "date" : "time"}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={showDatePicker ? onDateChange : onTimeChange}
                minimumDate={new Date()}
              />
            )}

            {/* App Service Fee Card */}
            <View style={styles.feeCard}>
              <View style={styles.feeHeader}>
                <Ionicons
                  name="cash-outline"
                  size={22}
                  color="#1976d2"
                />
                <Text style={styles.feeTitle}>
                  {sa.appServiceFee ||
                    "App Service Fee"}
                </Text>
                {isSubscriber && (
                  <View style={styles.subscriberBadge}>
                    <Ionicons name="star" size={12} color="#fff" />
                    <Text style={styles.subscriberBadgeText}>
                      {userPlan?.plan || "PRO"}
                    </Text>
                  </View>
                )}
              </View>
              {isSubscriber ? (
                <>
                  <Text style={[styles.feeAmount, { color: "#059669" }]}>
                    {sa.free || "FREE"}
                  </Text>
                  <View style={styles.feeDisclaimer}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#059669"
                    />
                    <Text style={styles.feeDisclaimerText}>
                      {sa.subscriberNoFee ||
                        "As a subscriber, you pay no app service fee on estimates!"}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.feeAmount}>
                    ${appFee.toFixed(2)}
                  </Text>
                  <View style={styles.feeDisclaimer}>
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color="#059669"
                    />
                    <Text style={styles.feeDisclaimerText}>
                      {sa.appFeeMessage ||
                        "This is the TechTrust service fee for connecting you with verified providers. Subscribe monthly to eliminate this fee!"}
                    </Text>
                  </View>
                </>
              )}
              <View style={[styles.feeDisclaimer, { marginTop: 8, backgroundColor: "#fefce8", borderColor: "#fde68a" }]}>
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color="#b45309"
                />
                <Text style={[styles.feeDisclaimerText, { color: "#92400e" }]}>
                  {sa.providerFeeNote ||
                    "The provider may optionally charge a diagnostic fee (up to $50) when accepting your appointment. You will be notified before any charge."}
                </Text>
              </View>
            </View>

            {/* FDACS Info */}
            <View style={styles.fdacsInfo}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color="#1976d2"
              />
              <Text style={styles.fdacsText}>
                {sa.fdacsProtection ||
                  "Your diagnostic visit is protected under Florida FDACS regulations. You will receive a Written Estimate valid for 15 days before any work begins."}
              </Text>
            </View>
          </View>
        )}

        {/* ─── STEP 5: Confirmation ─── */}
        {step === 5 && (
          <View>
            <Text style={styles.sectionTitle}>
              {sa.reviewConfirm ||
                "Review & Confirm"}
            </Text>

            {/* Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Ionicons name="car" size={20} color="#6b7280" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>
                    {sa.stepVehicle || "Vehicle"}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {selectedVehicleObj?.name || "-"}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Ionicons
                  name={(selectedServiceObj?.icon as any) || "build"}
                  size={20}
                  color="#6b7280"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>
                    {sa.stepService || "Service"}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {selectedServiceObj?.label || "-"}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Ionicons name="business" size={20} color="#6b7280" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>
                    {sa.stepProvider || "Provider"}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {selectedProviderObj?.businessName || "-"}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Ionicons name="calendar" size={20} color="#6b7280" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>
                    {sa.stepDateTime || "Date & Time"}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {date.toLocaleDateString()} ·{" "}
                    {date.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Ionicons name="cash" size={20} color="#6b7280" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>
                    {sa.appServiceFee ||
                      "App Service Fee"}
                  </Text>
                  <Text style={[styles.summaryValue, isSubscriber && { color: "#059669" }]}>
                    {isSubscriber
                      ? (sa.free || "FREE")
                      : `$${appFee.toFixed(2)}`
                    }
                  </Text>
                  {isSubscriber && (
                    <Text style={{ fontSize: 11, color: "#059669", fontWeight: "500" }}>
                      {userPlan?.plan} {sa.planBenefit || "plan benefit"}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Provider fee info */}
            <View style={[styles.feeDisclaimer, { backgroundColor: "#fefce8", borderColor: "#fde68a" }]}>
              <Ionicons
                name="alert-circle"
                size={16}
                color="#b45309"
              />
              <Text style={[styles.feeDisclaimerText, { color: "#92400e" }]}>
                {sa.providerFeeNote ||
                  "The provider may optionally charge a diagnostic fee (up to $50) when accepting your appointment. You will be notified before any charge."}
              </Text>
            </View>

            {/* Security badge */}
            <View style={styles.securityBadge}>
              <Ionicons
                name="lock-closed"
                size={18}
                color="#1976d2"
              />
              <Text style={styles.securityText}>
                {sa.securityNote ||
                  "Your payment is secured. Provider details shared only after confirmation. All transactions are FDACS compliant."}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer with navigation buttons */}
      <View style={styles.footer}>
        {step < 5 ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canGoNext() && styles.btnDisabled]}
            onPress={() => {
              if (step === 3 && !searchedProviders) {
                searchProviders();
                return;
              }
              setStep(step + 1);
            }}
            disabled={!canGoNext()}
          >
            <Text style={styles.nextBtnText}>
              {step === 3 && !searchedProviders
                ? sa.searchProviders ||
                  "Search Providers"
                : t.common?.next || "Next"}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="calendar-outline" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>
                  {sa.confirmSchedule ||
                    "Confirm & Schedule"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
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

  // Step indicator
  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  stepItem: { alignItems: "center", flex: 1 },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: { backgroundColor: "#1976d2" },
  stepCircleDone: { backgroundColor: "#059669" },
  stepNumber: { fontSize: 12, fontWeight: "700", color: "#9ca3af" },
  stepNumberActive: { color: "#fff" },
  stepLabel: { fontSize: 10, color: "#9ca3af", marginTop: 4 },
  stepLabelActive: { color: "#1976d2", fontWeight: "600" },

  // Section title
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },

  // Selection cards (vehicle, provider)
  selectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  selectionCardActive: {
    borderColor: "#1976d2",
    backgroundColor: "#f0f7ff",
  },
  selectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  selectionSub: { fontSize: 13, color: "#6b7280", marginTop: 2 },

  // Service type grid
  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  serviceChip: {
    width: "30%",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  serviceChipActive: {
    borderColor: "#1976d2",
    backgroundColor: "#f0f7ff",
  },
  serviceChipText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 6,
    textAlign: "center",
    fontWeight: "500",
  },
  serviceChipTextActive: { color: "#1976d2", fontWeight: "700" },

  // Radius
  radiusRow: { marginBottom: 16 },
  radiusLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  radiusBtns: { flexDirection: "row", gap: 8 },
  radiusBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  radiusBtnActive: { borderColor: "#1976d2", backgroundColor: "#f0f7ff" },
  radiusBtnText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  radiusBtnTextActive: { color: "#1976d2" },

  // Search button
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1976d2",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  // Provider meta
  providerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  distanceText: { fontSize: 13, color: "#6b7280" },

  // Empty state
  emptyBox: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },

  // Date/Time
  dateTimeRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateBtnText: { fontSize: 15, color: "#111827" },

  // Fee card
  feeCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  feeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  feeTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  subscriberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: "auto",
  },
  subscriberBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },
  feeAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1976d2",
    marginBottom: 12,
  },
  feeDisclaimer: {
    flexDirection: "row",
    backgroundColor: "#ecfdf5",
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    marginBottom: 12,
  },
  feeDisclaimerText: {
    flex: 1,
    fontSize: 12,
    color: "#065f46",
    lineHeight: 18,
  },

  // FDACS info
  fdacsInfo: {
    flexDirection: "row",
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  fdacsText: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 18 },

  // Summary
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  summaryLabel: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  summaryValue: { fontSize: 15, fontWeight: "600", color: "#111827" },
  summaryDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
  },

  // Security badge
  securityBadge: {
    flexDirection: "row",
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  securityText: { flex: 1, fontSize: 12, color: "#374151", lineHeight: 18 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1976d2",
    borderRadius: 12,
    paddingVertical: 14,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
