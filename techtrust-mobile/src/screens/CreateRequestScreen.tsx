/**
 * CreateRequestScreen - Create Service Request
 * With service location option and US-focused services
 * Supports pre-selected provider from Favorite Providers
 * Requires payment method before creating request
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../i18n";
import {
  useRoute,
  useFocusEffect,
  CommonActions,
} from "@react-navigation/native";

interface FavoriteProvider {
  id: string;
  businessName: string;
  rating: number;
  totalServices: number;
  specialty: string;
}

interface PreSelectedProvider {
  id: string;
  name: string;
  city: string;
  state: string;
  services: string[];
  rating?: number;
  reviews?: number;
  phone?: string;
  email?: string;
  address?: string;
  specialOffers?: string[];
}

interface SpecialOffer {
  id: string;
  title: string;
  discount: string;
  description: string;
  validUntil: string;
  originalPrice: string;
  discountedPrice: string;
  serviceType?: string;
  vehicleTypes?: string[];
  fuelTypes?: string[];
}

interface PaymentMethod {
  id: string;
  type: "credit" | "debit";
  brand: string;
  lastFour: string;
  isDefault: boolean;
}

export default function CreateRequestScreen({ navigation }: any) {
  const { t } = useI18n();
  const route = useRoute<any>();

  // Get pre-selected provider from navigation params (from Favorite Providers or Landing)
  const preSelectedProviderId = route.params?.providerId;
  const preSelectedProviderName = route.params?.providerName;
  const preSelectedProviderFromLanding: PreSelectedProvider | null =
    route.params?.preSelectedProvider || null;
  const specialOfferFromLanding: SpecialOffer | null =
    route.params?.specialOffer || null;

  const [selectedVehicle, setSelectedVehicle] = useState<string>("1");
  // Auto-select service type from special offer if present
  const [selectedService, setSelectedService] = useState<string>(
    specialOfferFromLanding?.serviceType || "",
  );
  const [title, setTitle] = useState(
    specialOfferFromLanding ? specialOfferFromLanding.title : "",
  );
  const [description, setDescription] = useState(
    specialOfferFromLanding
      ? `${specialOfferFromLanding.description} (${specialOfferFromLanding.discount})`
      : "",
  );
  const [urgency, setUrgency] = useState<string>("normal");
  const [serviceLocation, setServiceLocation] = useState<string>("shop");
  const [submitting, setSubmitting] = useState(false);
  const [shareLocation, setShareLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Address check for mobile/roadside services
  const [userAddresses, setUserAddresses] = useState<any[]>([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);

  // Payment Method Check
  const [checkingPayment, setCheckingPayment] = useState(true);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] =
    useState<PaymentMethod | null>(null);

  // Active Service Check - Block if user has ongoing service
  const [hasActiveService, setHasActiveService] = useState(false);
  const [activeServiceInfo, setActiveServiceInfo] = useState<{
    orderNumber: string;
    title: string;
    status: string;
  } | null>(null);

  // Favorite Provider Selection
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<FavoriteProvider | null>(
      preSelectedProviderFromLanding
        ? {
            id: preSelectedProviderFromLanding.id,
            businessName: preSelectedProviderFromLanding.name,
            rating: preSelectedProviderFromLanding.rating || 0,
            totalServices: 0,
            specialty: preSelectedProviderFromLanding.services.join(", "),
          }
        : preSelectedProviderId && preSelectedProviderName
          ? {
              id: preSelectedProviderId,
              businessName: preSelectedProviderName,
              rating: 0,
              totalServices: 0,
              specialty: "",
            }
          : null,
    );

  // Special Offer tracking
  const [appliedOffer, setAppliedOffer] = useState<SpecialOffer | null>(
    specialOfferFromLanding,
  );

  // Favorite providers - fetched from API
  const [favoriteProviders, setFavoriteProviders] = useState<
    FavoriteProvider[]
  >([]);

  // Check for payment method and active services on focus
  useFocusEffect(
    useCallback(() => {
      checkRequirements();
      loadFavoriteProviders();
      loadUserAddresses();
    }, []),
  );

  // Load user addresses from API / AsyncStorage
  async function loadUserAddresses() {
    try {
      let addresses: any[] = [];
      try {
        const apiDefault = (await import("../services/api")).default;
        const response = await apiDefault.get("/users/me");
        const raw = response.data?.data?.addressesJson || response.data?.addressesJson;
        if (raw) {
          addresses = typeof raw === 'string' ? JSON.parse(raw) : raw;
        }
      } catch {
        const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
        const saved = await AsyncStorage.getItem("@TechTrust:addresses");
        if (saved) addresses = JSON.parse(saved);
      }
      setUserAddresses(Array.isArray(addresses) ? addresses : []);
    } catch {
      setUserAddresses([]);
    } finally {
      setAddressesLoaded(true);
    }
  }

  async function loadFavoriteProviders() {
    try {
      // TODO: Implement API call to fetch favorite providers
      // const response = await api.get('/users/favorite-providers');
      // setFavoriteProviders(response.data);
      setFavoriteProviders([]); // Empty until API is integrated
    } catch (error) {
      console.error("Error loading favorite providers:", error);
    }
  }

  async function checkRequirements() {
    setCheckingPayment(true);
    try {
      // Check for active work orders from API
      try {
        const { getWorkOrders } = await import("../services/dashboard.service");
        const workOrders = await getWorkOrders();
        const activeOrders = workOrders.filter(
          (wo) =>
            wo.status === "IN_PROGRESS" ||
            wo.status === "SCHEDULED" ||
            wo.status === "AWAITING_PAYMENT",
        );

        if (activeOrders.length > 0) {
          setHasActiveService(true);
          setActiveServiceInfo(activeOrders[0]);
        } else {
          setHasActiveService(false);
          setActiveServiceInfo(null);
        }
      } catch (error) {
        console.error("Error checking active work orders:", error);
        setHasActiveService(false);
        setActiveServiceInfo(null);
      }

      // Check payment methods - try API first (cross-device), fallback to AsyncStorage
      try {
        let methods: any[] = [];

        // Try API first
        try {
          const apiDefault = (await import("../services/api")).default;
          const response = await apiDefault.get("/payment-methods");
          methods = response.data?.data || [];
        } catch (apiErr) {
          // Fallback to AsyncStorage
          const AsyncStorage = (
            await import("@react-native-async-storage/async-storage")
          ).default;
          const PAYMENT_METHODS_KEY = "@TechTrust:paymentMethods";
          const savedMethods = await AsyncStorage.getItem(PAYMENT_METHODS_KEY);
          if (savedMethods) {
            methods = JSON.parse(savedMethods);
          }
        }

        if (methods.length > 0) {
          setHasPaymentMethod(true);
          const defaultMethod =
            methods.find((p: any) => p.isDefault) || methods[0];
          setDefaultPaymentMethod({
            ...defaultMethod,
            brand: defaultMethod.cardBrand || defaultMethod.brand,
            lastFour: defaultMethod.cardLast4 || defaultMethod.lastFour,
          });
        } else {
          setHasPaymentMethod(false);
          setDefaultPaymentMethod(null);
        }
      } catch (error) {
        console.error("Error checking payment methods:", error);
        // If we can't check, allow creation but with warning
        setHasPaymentMethod(false);
        setDefaultPaymentMethod(null);
      }
    } finally {
      setCheckingPayment(false);
    }
  }

  // Vehicles - loaded from API
  const [vehicles, setVehicles] = useState<
    { id: string; name: string; plate: string }[]
  >([]);

  // Load vehicles from API
  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    try {
      const { getVehicles } = await import("../services/dashboard.service");
      const vehicleData = await getVehicles();
      setVehicles(
        vehicleData.map((v) => ({
          id: v.id,
          name: `${v.make} ${v.model} ${v.year}`,
          plate: v.plateNumber,
        })),
      );
      if (vehicleData.length > 0) {
        setSelectedVehicle(vehicleData[0].id);
      }
    } catch (error) {
      console.error("Error loading vehicles:", error);
      setVehicles([]);
    }
  }

  // Service types - In production, these would be filtered based on available providers in the area
  // The 'hasProviders' field indicates if there are active providers offering this service
  const serviceTypes = [
    {
      id: "oil",
      label: t.createRequest?.serviceOilChange || "Oil Change",
      icon: "water",
      hasProviders: true,
    },
    {
      id: "brake",
      label: t.createRequest?.serviceBrakes || "Brakes",
      icon: "disc",
      hasProviders: true,
    },
    {
      id: "tire",
      label: t.createRequest?.serviceTires || "Tires",
      icon: "ellipse",
      hasProviders: true,
    },
    {
      id: "engine",
      label: t.createRequest?.serviceEngine || "Engine",
      icon: "cog",
      hasProviders: true,
    },
    {
      id: "electric",
      label: t.createRequest?.serviceElectrical || "Electrical",
      icon: "flash",
      hasProviders: true,
    },
    {
      id: "ac",
      label: t.createRequest?.serviceAC || "A/C",
      icon: "snow",
      hasProviders: true,
    },
    {
      id: "suspension",
      label: t.createRequest?.serviceSuspension || "Suspension",
      icon: "resize",
      hasProviders: true,
    },
    {
      id: "transmission",
      label: t.createRequest?.serviceTransmission || "Transmission",
      icon: "cog",
      hasProviders: false,
    }, // No providers currently
    {
      id: "inspection",
      label: t.createRequest?.serviceInspection || "Inspection",
      icon: "clipboard",
      hasProviders: true,
    },
    {
      id: "detailing",
      label: t.createRequest?.serviceDetailing || "Detailing",
      icon: "sparkles",
      hasProviders: false,
    }, // No providers currently
    {
      id: "towing",
      label: t.createRequest?.serviceTowing || "Towing",
      icon: "car",
      hasProviders: true,
    },
    {
      id: "roadside",
      label:
        t.serviceTypes?.roadsideAssistance ||
        t.createRequest?.serviceRoadside ||
        "Roadside Assist",
      icon: "warning",
      hasProviders: true,
    },
    {
      id: "battery",
      label: t.createRequest?.serviceBattery || "Battery",
      icon: "battery-charging",
      hasProviders: true,
    },
    {
      id: "lockout",
      label: t.createRequest?.serviceLockout || "Lockout",
      icon: "key",
      hasProviders: true,
    },
    {
      id: "other",
      label: t.createRequest?.serviceOther || "Other",
      icon: "ellipsis-horizontal",
      hasProviders: true,
    },
  ];

  // Filter only services that have active providers
  const availableServices = serviceTypes.filter((s) => s.hasProviders);

  const locationOptions = [
    {
      id: "shop",
      label: t.createRequest?.takeToShop || "At the Shop",
      icon: "business",
      description:
        t.createRequest?.iWillGo ||
        "I'll bring my vehicle to the service provider",
    },
    {
      id: "mobile",
      label: t.createRequest?.myLocation || "Mobile Service",
      icon: "home",
      description:
        t.createRequest?.currentLocation ||
        "Service provider comes to my location",
    },
    {
      id: "roadside",
      label:
        t.serviceTypes?.roadsideAssistance ||
        t.createRequest?.serviceRoadside ||
        "Roadside Assist",
      icon: "car",
      description:
        t.createRequest?.shareLocation || "Share your real-time location",
    },
  ];

  async function handleGetLocation() {
    // In production, use expo-location or react-native-geolocation
    // For mock, simulate getting location
    Alert.alert(
      t.createRequest?.shareLocation || "Share Location",
      t.createRequest?.shareLocationMessage ||
        "Allow TechTrust to access your location to share with the service provider?",
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t.common?.allow || "Allow",
          onPress: () => {
            // Mock location - Orlando, FL
            setCurrentLocation({ lat: 28.5383, lng: -81.3792 });
            setShareLocation(true);
            Alert.alert(
              t.common?.success || "Success",
              t.createRequest?.locationShared ||
                "Your location will be shared with the provider",
            );
          },
        },
      ],
    );
  }

  function openInMaps() {
    if (currentLocation) {
      const url = Platform.select({
        ios: `maps://app?daddr=${currentLocation.lat},${currentLocation.lng}`,
        android: `google.navigation:q=${currentLocation.lat},${currentLocation.lng}`,
      });
      if (url) Linking.openURL(url);
    }
  }

  async function handleSubmit() {
    if (!selectedVehicle || !selectedService || !title) {
      Alert.alert(
        t.common.error,
        t.createRequest?.fillRequired || "Please fill in all required fields",
      );
      return;
    }
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setSubmitting(false);

    // Different message if sending to specific provider
    const providerName =
      selectedProvider?.businessName || preSelectedProviderName;
    const successMessage = providerName
      ? `${t.createRequest?.requestSentTo || "Request sent to"} ${providerName}. ${t.createRequest?.providerWillRespond || "They will respond shortly."}`
      : t.createRequest?.quotesWithin ||
        "You will receive quotes within 48 hours.";

    Alert.alert(
      t.createRequest?.submitted || "Request Submitted!",
      successMessage,
      [{ text: t.common.ok, onPress: () => navigation.goBack() }],
    );
  }

  // Show loading while checking payment method
  if (checkingPayment) {
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
            {t.createRequest?.newRequest || "New Request"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>
            {t.common?.loading || "Loading..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show payment method required screen if no card registered
  if (!hasPaymentMethod) {
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
            {t.createRequest?.newRequest || "New Request"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.noPaymentContainer}>
          <View style={styles.noPaymentIcon}>
            <Ionicons name="card-outline" size={64} color="#d1d5db" />
          </View>
          <Text style={styles.noPaymentTitle}>
            {t.createRequest?.paymentRequired || "Payment Method Required"}
          </Text>
          <Text style={styles.noPaymentDescription}>
            {t.createRequest?.paymentRequiredDesc ||
              "To create a service request, you need to add a payment method first. This ensures secure payment processing when you accept a quote."}
          </Text>

          <View style={styles.noPaymentFeatures}>
            <View style={styles.featureRow}>
              <Ionicons name="shield-checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>
                {t.createRequest?.securePayment || "Secure payment processing"}
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="lock-closed" size={20} color="#10b981" />
              <Text style={styles.featureText}>
                {t.createRequest?.fundsHeld ||
                  "Funds held until service completion"}
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="refresh" size={20} color="#10b981" />
              <Text style={styles.featureText}>
                {t.createRequest?.easyRefund ||
                  "Easy refunds if service cancelled"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addPaymentBtn}
            onPress={() =>
              navigation.dispatch(
                CommonActions.navigate({
                  name: "Profile",
                  params: {
                    screen: "PaymentMethods",
                    initial: false,
                    params: { addCardMode: true, fromCreateRequest: true },
                  },
                }),
              )
            }
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addPaymentText}>
              {t.createRequest?.addPaymentMethod || "Add Payment Method"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.laterBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.laterText}>
              {t.createRequest?.doLater || "I'll do this later"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show active service blocking screen
  if (hasActiveService && activeServiceInfo) {
    const getStatusText = (status: string) => {
      const texts: Record<string, string> = {
        PENDING_START: t.workOrder?.pendingStart || "Pending Start",
        IN_PROGRESS: t.workOrder?.inProgress || "In Progress",
        AWAITING_PAYMENT: t.workOrder?.awaitingPayment || "Awaiting Payment",
      };
      return texts[status] || status;
    };

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
            {t.createRequest?.newRequest || "New Request"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.noPaymentContainer}>
          <View style={[styles.noPaymentIcon, { backgroundColor: "#fef3c7" }]}>
            <Ionicons name="time" size={64} color="#f59e0b" />
          </View>
          <Text style={styles.noPaymentTitle}>
            {t.createRequest?.activeServiceExists ||
              "Active Service in Progress"}
          </Text>
          <Text style={styles.noPaymentDescription}>
            {t.createRequest?.activeServiceDesc ||
              "You have an ongoing service that needs to be completed before creating a new request. Please complete or cancel your current service first."}
          </Text>

          <View style={styles.activeServiceCard}>
            <View style={styles.activeServiceHeader}>
              <View
                style={[
                  styles.activeServiceStatus,
                  { backgroundColor: "#fef3c7" },
                ]}
              >
                <Ionicons name="construct" size={16} color="#f59e0b" />
                <Text
                  style={[styles.activeServiceStatusText, { color: "#f59e0b" }]}
                >
                  {getStatusText(activeServiceInfo.status)}
                </Text>
              </View>
              <Text style={styles.activeServiceOrder}>
                #{activeServiceInfo.orderNumber}
              </Text>
            </View>
            <Text style={styles.activeServiceTitle}>
              {activeServiceInfo.title}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addPaymentBtn}
            onPress={() =>
              navigation.dispatch(
                CommonActions.navigate({
                  name: "Services",
                  params: {
                    screen: "WorkOrdersList",
                    initial: false,
                  },
                }),
              )
            }
          >
            <Ionicons name="eye" size={20} color="#fff" />
            <Text style={styles.addPaymentText}>
              {t.createRequest?.viewActiveService || "View Active Service"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.laterBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.laterText}>
              {t.common?.goBack || "Go Back"}
            </Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>
          {t.createRequest?.newRequest || "New Request"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Payment Method Indicator */}
        <View style={styles.paymentMethodCard}>
          <View style={styles.paymentMethodInfo}>
            <Ionicons name="card" size={20} color="#1976d2" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.paymentMethodLabel}>
                {t.createRequest?.paymentMethod || "Payment Method"}
              </Text>
              <Text style={styles.paymentMethodValue}>
                {defaultPaymentMethod?.brand} ••••{" "}
                {defaultPaymentMethod?.lastFour}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                navigation.dispatch(
                  CommonActions.navigate({
                    name: "Profile",
                    params: {
                      screen: "PaymentMethods",
                      initial: false,
                      params: { fromCreateRequest: true },
                    },
                  }),
                )
              }
            >
              <Text style={styles.changePaymentText}>
                {t.common?.change || "Change"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.paymentMethodNote}>
            {t.createRequest?.paymentNote ||
              "Payment will be held when you accept a quote and charged upon service completion."}
          </Text>
        </View>

        {/* Selected Provider Banner */}
        {(selectedProvider || preSelectedProviderName) && (
          <View style={styles.selectedProviderBanner}>
            <Ionicons name="star" size={20} color="#1976d2" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.selectedProviderLabel}>
                {t.createRequest?.sendingTo || "Sending request to"}
              </Text>
              <Text style={styles.selectedProviderName}>
                {selectedProvider?.businessName || preSelectedProviderName}
              </Text>
            </View>
            <Ionicons name="heart" size={20} color="#ef4444" />
          </View>
        )}

        {/* Applied Special Offer Banner */}
        {appliedOffer && (
          <View style={styles.appliedOfferBanner}>
            <View style={styles.appliedOfferBadge}>
              <Text style={styles.appliedOfferBadgeText}>
                {appliedOffer.discount}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.appliedOfferLabel}>
                {t.createRequest?.specialOfferApplied ||
                  "Special Offer Applied"}
              </Text>
              <Text style={styles.appliedOfferTitle}>{appliedOffer.title}</Text>
              <Text style={styles.appliedOfferValidity}>
                {t.createRequest?.validUntil || "Valid until"}{" "}
                {appliedOffer.validUntil}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeOfferButton}
              onPress={() => setAppliedOffer(null)}
            >
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
        {/* Vehicle Selection */}
        <Text style={styles.sectionTitle}>
          {t.createRequest?.selectVehicle || "Select Vehicle"} *
        </Text>
        <View style={styles.vehiclesContainer}>
          {vehicles.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={[
                styles.vehicleCard,
                selectedVehicle === vehicle.id && styles.vehicleCardSelected,
              ]}
              onPress={() => setSelectedVehicle(vehicle.id)}
            >
              <Ionicons
                name="car"
                size={24}
                color={selectedVehicle === vehicle.id ? "#1976d2" : "#6b7280"}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={[
                    styles.vehicleName,
                    selectedVehicle === vehicle.id &&
                      styles.vehicleNameSelected,
                  ]}
                >
                  {vehicle.name}
                </Text>
                <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
              </View>
              {selectedVehicle === vehicle.id && (
                <Ionicons name="checkmark-circle" size={24} color="#1976d2" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Service Type */}
        <Text style={styles.sectionTitle}>
          {t.createRequest?.serviceType || "Service Type"} *
        </Text>
        <View style={styles.servicesGrid}>
          {availableServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCard,
                selectedService === service.id && styles.serviceCardSelected,
              ]}
              onPress={() => setSelectedService(service.id)}
            >
              <Ionicons
                name={service.icon as any}
                size={24}
                color={selectedService === service.id ? "#1976d2" : "#6b7280"}
              />
              <Text
                style={[
                  styles.serviceLabel,
                  selectedService === service.id && styles.serviceLabelSelected,
                ]}
              >
                {service.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Service Location */}
        <Text style={styles.sectionTitle}>
          {t.createRequest?.serviceLocation || "Service Location"} *
        </Text>
        <View style={styles.locationContainer}>
          {locationOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.locationCard,
                serviceLocation === option.id && styles.locationCardSelected,
              ]}
              onPress={() => {
                // Validate addresses for mobile/roadside
                if ((option.id === 'mobile' || option.id === 'roadside') && addressesLoaded && userAddresses.length === 0) {
                  Alert.alert(
                    'Address Required',
                    'To request a mobile or roadside service, you need at least one registered address. Would you like to add one now?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Add Address',
                        onPress: () => navigation.navigate('Profile', { screen: 'Addresses' }),
                      },
                    ],
                  );
                  return;
                }
                setServiceLocation(option.id);
              }}
            >
              <View
                style={[
                  styles.locationIcon,
                  serviceLocation === option.id && styles.locationIconSelected,
                ]}
              >
                <Ionicons
                  name={option.icon as any}
                  size={24}
                  color={serviceLocation === option.id ? "#1976d2" : "#6b7280"}
                />
              </View>
              <View style={styles.locationInfo}>
                <Text
                  style={[
                    styles.locationLabel,
                    serviceLocation === option.id &&
                      styles.locationLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={styles.locationDescription}>
                  {option.description}
                </Text>
              </View>
              {serviceLocation === option.id && (
                <Ionicons name="checkmark-circle" size={24} color="#1976d2" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Roadside Location Sharing */}
        {serviceLocation === "roadside" && (
          <View style={styles.roadsideContainer}>
            {!shareLocation ? (
              <TouchableOpacity
                style={styles.shareLocationBtn}
                onPress={handleGetLocation}
              >
                <Ionicons name="location" size={24} color="#fff" />
                <Text style={styles.shareLocationText}>
                  {t.createRequest?.shareMyLocation || "Share My Location"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.locationSharedCard}>
                <View style={styles.locationSharedHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  <Text style={styles.locationSharedTitle}>
                    {t.createRequest?.locationReady || "Location Ready"}
                  </Text>
                </View>
                <Text style={styles.locationSharedText}>
                  {t.createRequest?.locationWillBeShared ||
                    "Your real-time location will be shared with the provider"}
                </Text>
                <View style={styles.locationCoords}>
                  <Ionicons name="navigate" size={16} color="#6b7280" />
                  <Text style={styles.locationCoordsText}>
                    {currentLocation?.lat.toFixed(4)},{" "}
                    {currentLocation?.lng.toFixed(4)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.viewOnMapBtn}
                  onPress={openInMaps}
                >
                  <Ionicons name="map" size={18} color="#1976d2" />
                  <Text style={styles.viewOnMapText}>
                    {t.createRequest?.viewOnMap || "View on Map"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.roadsideInfo}>
              <Ionicons name="information-circle" size={18} color="#f59e0b" />
              <Text style={styles.roadsideInfoText}>
                {t.createRequest?.roadsideNote ||
                  "Provider will receive your live location via Google Maps"}
              </Text>
            </View>
          </View>
        )}

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t.createRequest?.requestTitle || "Request Title"} *
          </Text>
          <TextInput
            style={styles.input}
            placeholder={
              t.createRequest?.titlePlaceholder ||
              "e.g., Oil change and filters"
            }
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t.createRequest?.problemDescription || "Problem Description"}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={
              t.createRequest?.descriptionPlaceholder ||
              "Describe the problem or service needed..."
            }
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Urgency */}
        <Text style={styles.sectionTitle}>
          {t.createRequest?.urgency || "Urgency"}
        </Text>
        <View style={styles.urgencyContainer}>
          {[
            {
              id: "low",
              label: t.createRequest?.low || "Low",
              color: "#10b981",
            },
            {
              id: "normal",
              label: t.createRequest?.normal || "Normal",
              color: "#3b82f6",
            },
            {
              id: "high",
              label: t.createRequest?.high || "High",
              color: "#f59e0b",
            },
            {
              id: "urgent",
              label: t.createRequest?.urgent || "Urgent",
              color: "#ef4444",
            },
          ].map((u) => (
            <TouchableOpacity
              key={u.id}
              style={[
                styles.urgencyBtn,
                urgency === u.id && { backgroundColor: u.color },
              ]}
              onPress={() => setUrgency(u.id)}
            >
              <Text
                style={[
                  styles.urgencyText,
                  urgency === u.id && styles.urgencyTextSelected,
                ]}
              >
                {u.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#1976d2" />
          <Text style={styles.infoText}>
            {t.createRequest?.infoText ||
              "You will receive quotes from verified service providers within 48 hours."}
          </Text>
        </View>

        {/* Favorite Provider Selection */}
        <Text style={styles.sectionTitle}>
          {t.createRequest?.sendToFavorite || "Send to Favorite Provider"}
        </Text>
        <TouchableOpacity
          style={styles.favoriteProviderSelector}
          onPress={() => setShowProviderModal(true)}
        >
          {selectedProvider ? (
            <View style={styles.selectedProviderRow}>
              <View style={styles.providerAvatarSmall}>
                <Ionicons name="business" size={20} color="#1976d2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedProviderNameText}>
                  {selectedProvider.businessName}
                </Text>
                {selectedProvider.rating > 0 && (
                  <View style={styles.ratingRowSmall}>
                    <Ionicons name="star" size={12} color="#fbbf24" />
                    <Text style={styles.ratingTextSmall}>
                      {selectedProvider.rating}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.clearProviderBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedProvider(null);
                }}
              >
                <Ionicons name="close-circle" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.selectProviderPlaceholder}>
              <Ionicons name="heart-outline" size={24} color="#9ca3af" />
              <Text style={styles.selectProviderText}>
                {t.createRequest?.selectFavoriteProvider ||
                  "Select a favorite provider (optional)"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.favoriteHint}>
          {t.createRequest?.favoriteHint ||
            "Request will be sent directly to this provider instead of all providers"}
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <Text style={styles.submitText}>
              {t.createRequest?.submitting || "Submitting..."}
            </Text>
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitText}>
                {t.createRequest?.requestQuotes || "Request Quotes"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Favorite Provider Modal */}
      <Modal
        visible={showProviderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProviderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t.createRequest?.selectFavoriteTitle ||
                  "Select Favorite Provider"}
              </Text>
              <TouchableOpacity onPress={() => setShowProviderModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {favoriteProviders.length === 0 ? (
              <View style={styles.emptyFavorites}>
                <Ionicons name="heart-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyFavoritesText}>
                  {t.createRequest?.noFavorites || "No favorite providers yet"}
                </Text>
                <Text style={styles.emptyFavoritesSubtext}>
                  {t.createRequest?.addFavoritesHint ||
                    "Add providers to your favorites from the Profile tab"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={favoriteProviders}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.providerListItem,
                      selectedProvider?.id === item.id &&
                        styles.providerListItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedProvider(item);
                      setShowProviderModal(false);
                    }}
                  >
                    <View style={styles.providerListAvatar}>
                      <Ionicons name="business" size={24} color="#1976d2" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.providerListName}>
                        {item.businessName}
                      </Text>
                      <View style={styles.providerListMeta}>
                        <Ionicons name="star" size={14} color="#fbbf24" />
                        <Text style={styles.providerListRating}>
                          {item.rating}
                        </Text>
                        <Text style={styles.providerListServices}>
                          • {item.totalServices}{" "}
                          {t.common?.services || "services"}
                        </Text>
                      </View>
                      <Text style={styles.providerListSpecialty}>
                        {item.specialty}
                      </Text>
                    </View>
                    {selectedProvider?.id === item.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#1976d2"
                      />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.providerList}
              />
            )}

            <TouchableOpacity
              style={styles.sendToAllBtn}
              onPress={() => {
                setSelectedProvider(null);
                setShowProviderModal(false);
              }}
            >
              <Ionicons name="globe-outline" size={20} color="#1976d2" />
              <Text style={styles.sendToAllText}>
                {t.createRequest?.sendToAll || "Send to all providers"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
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
  content: { padding: 16 },
  // Selected Provider Banner
  selectedProviderBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1976d2",
  },
  selectedProviderLabel: { fontSize: 12, color: "#6b7280" },
  selectedProviderName: { fontSize: 16, fontWeight: "600", color: "#1976d2" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  vehiclesContainer: { marginBottom: 24 },
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  vehicleCardSelected: { borderColor: "#1976d2", backgroundColor: "#eff6ff" },
  vehicleName: { fontSize: 16, fontWeight: "500", color: "#374151" },
  vehicleNameSelected: { color: "#1976d2" },
  vehiclePlate: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  serviceCard: {
    width: "31%",
    aspectRatio: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  serviceCardSelected: { borderColor: "#1976d2", backgroundColor: "#eff6ff" },
  serviceLabel: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },
  serviceLabelSelected: { color: "#1976d2", fontWeight: "500" },
  locationContainer: { marginBottom: 16 },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  locationCardSelected: { borderColor: "#1976d2", backgroundColor: "#eff6ff" },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  locationIconSelected: { backgroundColor: "#dbeafe" },
  locationInfo: { flex: 1 },
  locationLabel: { fontSize: 16, fontWeight: "500", color: "#374151" },
  locationLabelSelected: { color: "#1976d2" },
  locationDescription: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  // Roadside Location Sharing
  roadsideContainer: { marginBottom: 24 },
  shareLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    borderRadius: 12,
  },
  shareLocationText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  locationSharedCard: {
    backgroundColor: "#d1fae5",
    padding: 16,
    borderRadius: 12,
  },
  locationSharedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  locationSharedTitle: { fontSize: 16, fontWeight: "600", color: "#10b981" },
  locationSharedText: { fontSize: 14, color: "#065f46", marginBottom: 8 },
  locationCoords: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  locationCoordsText: { fontSize: 13, color: "#6b7280" },
  viewOnMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewOnMapText: { fontSize: 14, fontWeight: "600", color: "#1976d2" },
  roadsideInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  roadsideInfoText: { flex: 1, fontSize: 13, color: "#92400e", lineHeight: 18 },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: { minHeight: 100 },
  urgencyContainer: { flexDirection: "row", gap: 8, marginBottom: 24 },
  urgencyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  urgencyText: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  urgencyTextSelected: { color: "#fff" },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 12,
  },
  infoText: { flex: 1, fontSize: 14, color: "#1976d2", lineHeight: 20 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1976d2",
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitBtnDisabled: { backgroundColor: "#9ca3af" },
  submitText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  // Favorite Provider Selector
  favoriteProviderSelector: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  },
  selectedProviderRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  providerAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  selectedProviderNameText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  ratingRowSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingTextSmall: { fontSize: 12, color: "#6b7280" },
  clearProviderBtn: { padding: 4 },
  selectProviderPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  selectProviderText: { flex: 1, fontSize: 14, color: "#9ca3af" },
  favoriteHint: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 24,
    fontStyle: "italic",
  },
  // Provider Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  providerList: { padding: 16 },
  providerListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  providerListItemSelected: {
    borderColor: "#1976d2",
    backgroundColor: "#eff6ff",
  },
  providerListAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  providerListName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  providerListMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  providerListRating: { fontSize: 13, color: "#6b7280" },
  providerListServices: { fontSize: 13, color: "#6b7280" },
  providerListSpecialty: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  emptyFavorites: { alignItems: "center", padding: 40 },
  emptyFavoritesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 12,
  },
  emptyFavoritesSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
  },
  sendToAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
  },
  sendToAllText: { fontSize: 15, fontWeight: "600", color: "#1976d2" },
  // Loading & No Payment Styles
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, color: "#6b7280", marginTop: 12 },
  noPaymentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  noPaymentIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  noPaymentTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  noPaymentDescription: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  noPaymentFeatures: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  featureText: { fontSize: 14, color: "#374151" },
  addPaymentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1976d2",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
  },
  addPaymentText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  laterBtn: { paddingVertical: 16 },
  laterText: { fontSize: 15, color: "#6b7280" },
  // Active Service Blocking Card
  activeServiceCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  activeServiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  activeServiceStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeServiceStatusText: { fontSize: 12, fontWeight: "600" },
  activeServiceOrder: { fontSize: 13, color: "#6b7280" },
  activeServiceTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  // Payment Method Card
  paymentMethodCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  paymentMethodInfo: { flexDirection: "row", alignItems: "center" },
  paymentMethodLabel: { fontSize: 12, color: "#6b7280" },
  paymentMethodValue: { fontSize: 14, fontWeight: "600", color: "#111827" },
  changePaymentText: { fontSize: 14, fontWeight: "600", color: "#1976d2" },
  paymentMethodNote: {
    fontSize: 12,
    color: "#166534",
    marginTop: 10,
    lineHeight: 18,
  },
  // Applied Offer Banner
  appliedOfferBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#fecaca",
  },
  appliedOfferBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  appliedOfferBadgeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  appliedOfferLabel: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "500",
  },
  appliedOfferTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 2,
  },
  appliedOfferValidity: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  removeOfferButton: {
    padding: 4,
  },
});
