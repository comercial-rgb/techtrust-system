/**
 * ProviderRequestDetailsScreen - Detalhes do Pedido + Criar Orçamento
 * Fornecedor vê detalhes e envia orçamento
 * ATUALIZADO: Telefone oculto até aceite, mais info do veículo, campos individuais, agendamento
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useI18n } from "../../i18n";
import { useNotifications } from "../../contexts/NotificationsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api";
import { getServiceTypeInfo as getServiceTypeInfoFromTree } from "../../constants/serviceTree";

const QUOTE_TEMPLATES_KEY = "@TechTrust:quoteTemplates";

interface QuoteTemplate {
  id: string;
  name: string;
  lineItems: QuoteLineItem[];
  laborDescription: string;
  estimatedDuration: string;
  partsWarrantyMonths: string;
  serviceWarrantyDays: string;
  warrantyMileage: string;
  warrantyTerms: string;
  notes: string;
}

interface QuoteLineItem {
  id: string;
  type: "part" | "service";
  description: string;
  brand?: string;
  quantity: number;
  unitPrice: number;
  unitPriceText?: string; // Raw text for decimal input
}

interface ServiceRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  serviceType: string;
  isUrgent: boolean;
  expiresIn: string;
  status: "pending" | "quoted" | "accepted" | "rejected";
  serviceLocation: {
    type: "shop" | "mobile" | "roadside";
    address?: string;
    coordinates?: { lat: number; lng: number };
  };
  customer: {
    name: string;
    phone: string;
    location: string;
    distance: string;
    rating: number;
    totalRequests: number;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
    plateNumber: string;
    color: string;
    mileage: number;
    vin: string;
    fuelType: string;
    transmission: string;
    engine: string;
    lastServiceDate?: string;
    lastServiceMileage?: number;
  };
  quotesCount: number;
  preferredDate?: string;
  preferredTime?: string;
}

export default function ProviderRequestDetailsScreen({
  route,
  navigation,
}: any) {
  const { requestId } = route.params;
  const { t } = useI18n();
  const { markRequestAsViewed } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);

  // D7: Decline with reasons
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineOtherText, setDeclineOtherText] = useState("");
  const [declining, setDeclining] = useState(false);

  // D8: Quote review before submit
  const [showReviewModal, setShowReviewModal] = useState(false);

  // D6: Quick Quote Templates
  const [quoteTemplates, setQuoteTemplates] = useState<QuoteTemplate[]>([]);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [showSaveTemplateInput, setShowSaveTemplateInput] = useState(false);

  // Mark request as viewed when screen opens
  useEffect(() => {
    if (requestId) {
      markRequestAsViewed(requestId);
    }
  }, [requestId, markRequestAsViewed]);

  // Quote form state
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([
    { id: "1", type: "part", description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [laborDescription, setLaborDescription] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [notes, setNotes] = useState("");

  // Warranty state
  const [partsWarrantyMonths, setPartsWarrantyMonths] = useState("3");
  const [serviceWarrantyDays, setServiceWarrantyDays] = useState("90");
  const [warrantyMileage, setWarrantyMileage] = useState("");
  const [warrantyTerms, setWarrantyTerms] = useState("");

  // Scheduling state
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Mobile Service / Displacement cost state
  const [isMobileService, setIsMobileService] = useState(false);
  const [providerServiceRadius, setProviderServiceRadius] = useState(10); // miles - from provider settings
  const [providerFreeMiles, setProviderFreeMiles] = useState(3); // Free miles - from provider settings
  const [providerCostPerMile, setProviderCostPerMile] = useState(3.0); // $ per extra mile - from provider settings

  // Calculate displacement cost based on customer distance (miles)
  const calculateDisplacementCost = () => {
    if (!isMobileService || !request) return 0;

    // Parse customer distance (e.g., "3.2 mi" -> 3.2)
    const distanceStr = request.customer.distance.replace(/[^\d.]/g, "");
    const customerDistanceKm = parseFloat(distanceStr) || 0;
    // Convert km from backend to miles
    const customerDistanceMiles = customerDistanceKm * 0.621371;

    // If within free miles range, no charge
    if (customerDistanceMiles <= providerFreeMiles) return 0;

    // Calculate extra miles and cost
    const extraMiles = customerDistanceMiles - providerFreeMiles;
    return extraMiles * providerCostPerMile;
  };

  // Get customer distance in miles
  const getCustomerDistanceMiles = () => {
    if (!request) return 0;
    const distanceStr = request.customer.distance.replace(/[^\d.]/g, "");
    const km = parseFloat(distanceStr) || 0;
    return km * 0.621371;
  };

  // Load saved quote templates
  useEffect(() => {
    loadQuoteTemplates();
  }, []);

  const loadQuoteTemplates = async () => {
    try {
      const saved = await AsyncStorage.getItem(QUOTE_TEMPLATES_KEY);
      if (saved) setQuoteTemplates(JSON.parse(saved));
    } catch { /* silent */ }
  };

  const saveQuoteTemplate = async (name: string) => {
    const template: QuoteTemplate = {
      id: Date.now().toString(),
      name,
      lineItems: lineItems.filter(i => i.description),
      laborDescription,
      estimatedDuration,
      partsWarrantyMonths,
      serviceWarrantyDays,
      warrantyMileage,
      warrantyTerms,
      notes,
    };
    const updated = [...quoteTemplates, template];
    setQuoteTemplates(updated);
    await AsyncStorage.setItem(QUOTE_TEMPLATES_KEY, JSON.stringify(updated));
    Alert.alert("Template Saved", `"${name}" saved for future quotes.`);
    setShowSaveTemplateInput(false);
    setSaveTemplateName("");
  };

  const applyTemplate = (template: QuoteTemplate) => {
    setLineItems(template.lineItems.length > 0 ? template.lineItems.map((item, i) => ({ ...item, id: (i + 1).toString() })) : [{ id: "1", type: "part", description: "", quantity: 1, unitPrice: 0 }]);
    setLaborDescription(template.laborDescription);
    setEstimatedDuration(template.estimatedDuration);
    setPartsWarrantyMonths(template.partsWarrantyMonths);
    setServiceWarrantyDays(template.serviceWarrantyDays);
    setWarrantyMileage(template.warrantyMileage);
    setWarrantyTerms(template.warrantyTerms);
    setNotes(template.notes);
    setShowTemplatesModal(false);
  };

  const deleteQuoteTemplate = async (templateId: string) => {
    const updated = quoteTemplates.filter(t => t.id !== templateId);
    setQuoteTemplates(updated);
    await AsyncStorage.setItem(QUOTE_TEMPLATES_KEY, JSON.stringify(updated));
  };

  // D7: Handle decline with reason
  const handleDeclineWithReason = async () => {
    if (!declineReason) {
      Alert.alert("Select a Reason", "Please select a reason for declining.");
      return;
    }
    setDeclining(true);
    try {
      const reason = declineReason === "other" ? declineOtherText || "Other" : declineReason;
      await api.post(`/service-requests/${requestId}/decline`, { reason });
      setShowDeclineModal(false);
      navigation.goBack();
    } catch {
      setShowDeclineModal(false);
      navigation.goBack();
    } finally {
      setDeclining(false);
    }
  };

  // Reset state and reload when requestId changes or screen gains focus
  useFocusEffect(
    useCallback(() => {
      // Reset state when navigating to this screen
      setRequest(null);
      setLoading(true);
      setQuoteSubmitted(false);
      loadRequest();
    }, [requestId]),
  );

  const loadRequest = async () => {
    setLoading(true);
    try {
      // Load request and provider profile in parallel
      const [requestResponse, profileResponse] = await Promise.all([
        api.get(`/service-requests/${requestId}`),
        api.get("/providers/profile").catch(() => null),
      ]);

      const sr = requestResponse.data?.data;

      if (!sr) {
        throw new Error("Request not found");
      }

      // Load provider's service area settings
      if (profileResponse?.data?.data) {
        const pp =
          profileResponse.data.data.providerProfile ||
          profileResponse.data.data;
        // Convert km values from backend to miles
        const radiusKm = pp.serviceRadiusKm || 25;
        setProviderServiceRadius(Math.round(radiusKm * 0.621371));
        const freeKm = pp.freeKm ? Number(pp.freeKm) : 0;
        setProviderFreeMiles(Math.round(freeKm * 0.621371 * 10) / 10);
        setProviderCostPerMile(pp.extraFeePerKm ? Number(pp.extraFeePerKm) / 0.621371 : 0);
      }

      // Calculate time remaining until quoteDeadline
      let expiresIn = "";
      if (sr.quoteDeadline) {
        const diff = new Date(sr.quoteDeadline).getTime() - Date.now();
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          expiresIn = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
        } else {
          expiresIn = "Expired";
        }
      }

      const vehicle = sr.vehicle || {};
      const user = sr.user || {};

      setRequest({
        id: sr.id,
        requestNumber: sr.requestNumber || `SR-${sr.id.substring(0, 6)}`,
        title: sr.title || sr.serviceType || "Service Request",
        description: sr.description || "",
        serviceType: sr.serviceType || "REPAIR",
        isUrgent: sr.urgencyLevel === "URGENT" || sr.isUrgent || false,
        expiresIn,
        status: sr.status === "QUOTES_RECEIVED" ? "quoted" : "pending",
        serviceLocation: {
          type:
            sr.serviceLocationType === "MOBILE"
              ? "mobile"
              : sr.serviceLocationType === "REMOTE"
                ? "roadside"
                : "shop",
          address: sr.serviceAddress || "",
          coordinates:
            sr.serviceLatitude && sr.serviceLongitude
              ? {
                  lat: Number(sr.serviceLatitude),
                  lng: Number(sr.serviceLongitude),
                }
              : undefined,
        },
        customer: {
          name: user.fullName || "Customer",
          phone: user.phone || "",
          location: sr.serviceAddress || user.city || "",
          distance: sr.distanceKm
            ? `${Number(sr.distanceKm).toFixed(1)} km`
            : "",
          rating: user.averageRating ? Number(user.averageRating) : 0,
          totalRequests: user._count?.serviceRequests || 0,
        },
        vehicle: {
          make: vehicle.make || "",
          model: vehicle.model || "",
          year: vehicle.year || 0,
          plateNumber: vehicle.plateNumber || vehicle.licensePlate || "",
          color: vehicle.color || "",
          mileage: vehicle.mileage || vehicle.currentMileage || 0,
          vin: vehicle.vin || "",
          fuelType: vehicle.fuelType || "",
          transmission: vehicle.transmission || vehicle.driveType || "",
          engine: vehicle.engine || vehicle.engineType || "",
          lastServiceDate: vehicle.lastServiceDate || undefined,
          lastServiceMileage: vehicle.lastServiceMileage || undefined,
        },
        quotesCount: sr.quotesCount || sr._count?.quotes || 0,
        preferredDate: sr.preferredDate || undefined,
        preferredTime: sr.preferredTime || undefined,
      });

      // Auto-enable mobile service if request is for mobile/roadside
      const locType = sr.serviceLocationType;
      if (locType === "MOBILE" || locType === "REMOTE") {
        setIsMobileService(true);
      }
    } catch (error) {
      console.error("Error loading request:", error);
    } finally {
      setLoading(false);
    }
  };

  // Line items management
  const addLineItem = (type: "part" | "service") => {
    const newId = (lineItems.length + 1).toString();
    setLineItems([
      ...lineItems,
      { id: newId, type, description: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const updateLineItem = (
    id: string,
    field: keyof QuoteLineItem,
    value: any,
  ) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const handleSubmitQuote = async () => {
    // Validação
    const validItems = lineItems.filter(
      (item) => item.description && item.unitPrice > 0,
    );
    if (validItems.length === 0) {
      Alert.alert(
        t.common?.error || "Error",
        t.common?.addItemError || "Add at least one item to the quote",
      );
      return;
    }

    if (!estimatedDuration) {
      Alert.alert(
        t.common?.error || "Error",
        t.common?.selectDurationError ||
          "Select the estimated time for the service",
      );
      return;
    }

    if (!selectedDate || !selectedTime) {
      Alert.alert(
        t.common?.error || "Error",
        t.common?.selectDateTimeError ||
          "Select the available date and time for the service",
      );
      return;
    }

    setSubmitting(true);
    try {
      // Separate parts and labor
      const partItems = validItems.filter((i) => i.type === "part");
      const laborItemsList = validItems.filter((i) => i.type === "service");

      const partsCost = partItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );
      const laborCost = laborItemsList.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );

      // Build partsList for backend (FDACS compliant)
      const partsList = validItems.map((item) => ({
        type: item.type === "part" ? "PART" : "LABOR",
        description: item.description,
        brand: item.brand || undefined,
        partCode: item.partCode || undefined,
        partCondition:
          item.type === "part" ? item.partCondition || "NEW" : undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        isNoCharge: item.isNoCharge || false,
      }));

      // Get vehicle odometer from request data
      const odometerReading = request?.vehicle?.mileage || undefined;

      await api.post("/quotes", {
        serviceRequestId: requestId,
        partsCost,
        laborCost,
        additionalFees: 0,
        taxAmount: 0, // Tax calculated by jurisdiction - can be set later
        partsList,
        laborDescription: laborDescription || undefined,
        estimatedHours: estimatedDuration
          ? parseFloat(estimatedDuration.replace(/[^\d.]/g, "")) || undefined
          : undefined,
        estimatedCompletionTime: estimatedDuration,
        availableDate: selectedDate || undefined,
        availableTime: selectedTime
          ? `${selectedDate}T${selectedTime}:00`
          : undefined,
        warrantyMonths: partsWarrantyMonths
          ? parseInt(partsWarrantyMonths)
          : undefined,
        warrantyMileage: warrantyMileage
          ? parseInt(warrantyMileage)
          : undefined,
        warrantyDescription: warrantyTerms || undefined,
        odometerReading: odometerReading || undefined,
        notes: notes || undefined,
      });

      setQuoteSubmitted(true);
      setShowQuoteModal(false);
      Alert.alert(
        `${t.common?.success || "Success"}! ✅`,
        t.common?.quoteSentSuccess ||
          "Your quote was sent. The customer will be notified.",
        [{ text: t.common?.ok || "OK", onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        t.common?.quoteSentError ||
        "Could not send the quote. Please try again.";
      Alert.alert(t.common?.error || "Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateSubtotal = () => {
    return lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateDisplacementCost() + calculateSalesTax();
  };

  // D15 — Auto Sales Tax calculation (FL 7% on parts, configurable by state)
  const SALES_TAX_RATES: Record<string, { rate: number; label: string; partsOnly: boolean }> = {
    FL: { rate: 0.07, label: 'FL Sales Tax (7%)', partsOnly: true },
    CA: { rate: 0.0725, label: 'CA Sales Tax (7.25%)', partsOnly: true },
    TX: { rate: 0.0625, label: 'TX Sales Tax (6.25%)', partsOnly: true },
    NY: { rate: 0.08, label: 'NY Sales Tax (8%)', partsOnly: true },
  };

  const providerState = 'FL'; // Would come from provider profile in production
  const calculateSalesTax = () => {
    const taxConfig = SALES_TAX_RATES[providerState];
    if (!taxConfig) return 0;
    if (taxConfig.partsOnly) {
      // Tax only on parts, not labor
      const partsTotal = lineItems
        .filter(item => item.description?.toLowerCase().includes('part') || item.description?.toLowerCase().includes('filter') || item.description?.toLowerCase().includes('oil') || !item.description?.toLowerCase().includes('labor'))
        .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      return partsTotal * taxConfig.rate;
    }
    return calculateSubtotal() * taxConfig.rate;
  };

  // Uses centralized service type info from serviceTree.ts
  const getServiceTypeInfo = (type: string) => getServiceTypeInfoFromTree(type);

  const durationOptions = [
    { value: "30min", label: "30 min" },
    { value: "45min", label: "45 min" },
    { value: "1h", label: `1 ${t.common?.hour || "hour"}` },
    { value: "1.5h", label: `1.5 ${t.common?.hours || "hours"}` },
    { value: "2h", label: `2 ${t.common?.hours || "hours"}` },
    { value: "3h", label: `3 ${t.common?.hours || "hours"}` },
    { value: "4h", label: `4 ${t.common?.hours || "hours"}` },
    { value: "1d", label: `1 ${t.common?.day || "day"}` },
    { value: "2d", label: `2 ${t.common?.days || "days"}` },
    { value: "3d", label: `3+ ${t.common?.days || "days"}` },
  ];

  // Generate next 7 available dates dynamically
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dates.push({
        value: date.toISOString().split('T')[0],
        label: `${dayName}, ${monthDay}`,
      });
    }
    return dates;
  };
  const availableDates = generateAvailableDates();

  // D16 — Dynamic time slots based on working hours
  const generateTimeSlots = (startHour = 8, endHour = 17, intervalMinutes = 60) => {
    const slots = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let min = 0; min < 60; min += intervalMinutes) {
        if (hour === endHour && min > 0) break;
        const h24 = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayMin = min > 0 ? `:${String(min).padStart(2, '0')}` : ':00';
        slots.push({
          value: h24,
          label: `${displayHour}${displayMin} ${period}`,
        });
      }
    }
    return slots;
  };
  
  // Working hours could come from provider settings; default 8 AM - 5 PM, 1hr intervals
  const availableTimes = generateTimeSlots(8, 17, 60);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#d1d5db" />
        <Text style={styles.errorTitle}>
          {t.common?.requestNotFound || "Request not found"}
        </Text>
      </View>
    );
  }

  const typeInfo = getServiceTypeInfo(request.serviceType);
  const isQuoteAccepted = request.status === "accepted";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header with Back Button */}
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle} numberOfLines={1}>
          {request.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Success Banner */}
        {quoteSubmitted && (
          <View style={styles.successBanner}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color="#10b981"
            />
            <Text style={styles.successText}>
              {t.quote?.sentSuccessfully || "Quote sent successfully!"}
            </Text>
          </View>
        )}

        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={[styles.typeIcon, { backgroundColor: typeInfo.bg }]}>
              <MaterialCommunityIcons
                name={typeInfo.icon as any}
                size={24}
                color={typeInfo.color}
              />
            </View>
            <View style={styles.headerInfo}>
              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: typeInfo.bg }]}>
                  <Text style={[styles.badgeText, { color: typeInfo.color }]}>
                    {typeInfo.label}
                  </Text>
                </View>
                {request.isUrgent && (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentBadgeText}>🚨 {t.common?.urgent || "Urgent"}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.requestNumber}>#{request.requestNumber}</Text>
            </View>
            <View style={[styles.timeBox, request.expiresIn === "Expired" && { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
              <Text style={[styles.timeValue, request.expiresIn === "Expired" && { color: '#ef4444' }]}>{request.expiresIn}</Text>
              <Text style={styles.timeLabel}>
                {request.expiresIn === "Expired"
                  ? (t.common?.closed || "Closed")
                  : (t.common?.remaining || "remaining")}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{request.title}</Text>

          {/* Structured key-value service details */}
          {(() => {
            const rawDesc = request.description || "";
            const parts = rawDesc.split('\n---\n');
            const detailsPart = parts[0] || "";
            const metaPart = parts[1] || "";
            // Parse key-value pairs from pipe-separated format
            const detailItems = detailsPart.split(' | ').filter((s: string) => s.trim());
            // Deduplicate items with same key
            const seen = new Set<string>();
            const uniqueItems = detailItems.filter((item: string) => {
              const key = item.split(':')[0]?.trim();
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            const metaItems = metaPart.split(' | ').filter((s: string) => s.trim());
            if (uniqueItems.length === 0 && metaItems.length === 0) return null;
            return (
              <View style={{ marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Service Details
                </Text>
                {uniqueItems.map((item: string, i: number) => {
                  const colonIdx = item.indexOf(':');
                  if (colonIdx === -1) return <Text key={i} style={styles.description}>{item}</Text>;
                  const key = item.substring(0, colonIdx).trim();
                  const val = item.substring(colonIdx + 1).trim();
                  // Render filters as chips
                  const isFilter = /filter/i.test(key);
                  return (
                    <View key={i}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8 }}>
                        <Text style={{ fontSize: 13, color: '#6b7280', flex: 1, marginRight: 12 }}>{key}</Text>
                        {isFilter ? (
                          <View style={{ flex: 1.5, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 }}>
                            {val.split(',').map((f: string, fi: number) => (
                              <View key={fi} style={{ backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 }}>
                                <Text style={{ fontSize: 12, color: '#1976d2', fontWeight: '500' }}>{f.trim()}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={{ fontSize: 14, color: '#111827', fontWeight: '600', flex: 1.5, textAlign: 'right' }}>{val}</Text>
                        )}
                      </View>
                      {i < uniqueItems.length - 1 && <View style={{ height: 1, backgroundColor: '#e5e7eb' }} />}
                    </View>
                  );
                })}
                {metaItems.length > 0 && (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 6, paddingTop: 6 }}>
                    {metaItems.map((item: string, i: number) => {
                      const colonIdx = item.indexOf(':');
                      if (colonIdx === -1) return null;
                      const key = item.substring(0, colonIdx).trim();
                      const val = item.substring(colonIdx + 1).trim();
                      return (
                        <View key={`m-${i}`}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8 }}>
                            <Text style={{ fontSize: 13, color: '#6b7280', flex: 1, marginRight: 12 }}>{key}</Text>
                            <Text style={{ fontSize: 14, color: '#111827', fontWeight: '600', flex: 1.5, textAlign: 'right' }}>{val}</Text>
                          </View>
                          {i < metaItems.length - 1 && <View style={{ height: 1, backgroundColor: '#e5e7eb' }} />}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })()}

          {/* Preferred Schedule */}
          {(request.preferredDate || request.preferredTime) && (
            <View style={styles.preferredSchedule}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={18}
                color="#1976d2"
              />
              <Text style={styles.preferredScheduleText}>
                {t.provider?.preference || "Preferred"}:{" "}
                {request.preferredDate && formatDate(request.preferredDate)}
                {request.preferredTime && ` ${t.common?.at || "at"} ${request.preferredTime}`}
              </Text>
            </View>
          )}
        </View>

        {/* Service Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              📍 {t.provider?.serviceLocation || "Service Location"}
            </Text>
            <View
              style={[
                styles.locationTypeBadge,
                request.serviceLocation.type === "shop"
                  ? styles.locationShop
                  : request.serviceLocation.type === "mobile"
                    ? styles.locationMobile
                    : styles.locationRoadside,
              ]}
            >
              <MaterialCommunityIcons
                name={
                  request.serviceLocation.type === "shop"
                    ? "store"
                    : request.serviceLocation.type === "mobile"
                      ? "home-map-marker"
                      : "car-emergency"
                }
                size={14}
                color={
                  request.serviceLocation.type === "shop"
                    ? "#1976d2"
                    : request.serviceLocation.type === "mobile"
                      ? "#10b981"
                      : "#f59e0b"
                }
              />
              <Text
                style={[
                  styles.locationTypeText,
                  request.serviceLocation.type === "shop"
                    ? { color: "#1976d2" }
                    : request.serviceLocation.type === "mobile"
                      ? { color: "#10b981" }
                      : { color: "#f59e0b" },
                ]}
              >
                {request.serviceLocation.type === "shop"
                  ? t.provider?.atShop || "At Shop"
                  : request.serviceLocation.type === "mobile"
                    ? t.provider?.mobileService || "Mobile Service"
                    : t.provider?.roadsideAssist || "Roadside Assist"}
              </Text>
            </View>
          </View>

          {request.serviceLocation.type !== "shop" &&
            request.serviceLocation.address && (
              <View style={styles.locationAddressRow}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={18}
                  color="#6b7280"
                />
                <Text style={styles.locationAddress}>
                  {request.serviceLocation.address}
                </Text>
              </View>
            )}

          {request.serviceLocation.type === "shop" && (
            <Text style={styles.locationNote}>
              {t.provider?.customerWillCome ||
                "Customer will bring the vehicle to your shop"}
            </Text>
          )}

          {request.serviceLocation.type === "roadside" && (
            <View style={styles.roadsideWarning}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={16}
                color="#f59e0b"
              />
              <Text style={styles.roadsideWarningText}>
                {t.provider?.roadsideUrgent ||
                  "Urgent roadside assistance - Customer is waiting"}
              </Text>
            </View>
          )}

          {request.serviceLocation.coordinates &&
            request.serviceLocation.type !== "shop" && (
              <View style={styles.navigationButtons}>
                <TouchableOpacity
                  style={[
                    styles.openMapsBtn,
                    { flex: 1, backgroundColor: "#4285F4" },
                  ]}
                  onPress={() => {
                    const lat = request.serviceLocation.coordinates?.lat;
                    const lng = request.serviceLocation.coordinates?.lng;
                    const url =
                      Platform.OS === "ios"
                        ? `maps://app?daddr=${lat},${lng}`
                        : `google.navigation:q=${lat},${lng}`;
                    Linking.openURL(url).catch(() => {
                      // Fallback to web Google Maps
                      Linking.openURL(
                        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                      );
                    });
                  }}
                >
                  <MaterialCommunityIcons
                    name="google-maps"
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.openMapsText}>
                    {Platform.OS === "ios" ? "Apple Maps" : "Google Maps"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.openMapsBtn,
                    { flex: 1, backgroundColor: "#33CCFF" },
                  ]}
                  onPress={() => {
                    const lat = request.serviceLocation.coordinates?.lat;
                    const lng = request.serviceLocation.coordinates?.lng;
                    const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
                    Linking.openURL(url).catch(() => {
                      Alert.alert(
                        "Waze",
                        "Waze is not installed. Please install it from the App Store.",
                      );
                    });
                  }}
                >
                  <MaterialCommunityIcons name="waze" size={18} color="#fff" />
                  <Text style={styles.openMapsText}>Waze</Text>
                </TouchableOpacity>
              </View>
            )}
        </View>

        {/* Customer Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              👤 {t.common?.customer || "Customer"}
            </Text>
            {request.customer.rating > 0 ? (
              <View style={styles.ratingBadge}>
                <MaterialCommunityIcons name="star" size={14} color="#f59e0b" />
                <Text style={styles.ratingText}>{request.customer.rating.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>
                  ({request.customer.totalRequests} {t.common?.requests || "requests"})
                </Text>
              </View>
            ) : (
              <View style={[styles.ratingBadge, { backgroundColor: '#eff6ff' }]}>
                <MaterialCommunityIcons name="account-star" size={14} color="#3b82f6" />
                <Text style={[styles.ratingText, { color: '#3b82f6' }]}>
                  {request.customer.totalRequests <= 1
                    ? (t.provider?.newCustomer || "New Customer")
                    : `${request.customer.totalRequests} ${t.common?.requests || "requests"}`}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{request.customer.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="map-marker"
              size={18}
              color="#6b7280"
            />
            <Text style={styles.infoText}>
              {request.customer.location && request.customer.location !== '.'
                ? `${request.customer.location}${request.customer.distance ? ` • ${request.customer.distance}` : ''}`
                : (t.provider?.locationNotProvided || "Location not provided")}
            </Text>
          </View>

          {/* Phone - Hidden until quote accepted */}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="phone" size={18} color="#6b7280" />
            {isQuoteAccepted ? (
              <Text style={styles.infoText}>{request.customer.phone}</Text>
            ) : (
              <View style={styles.hiddenPhone}>
                <Text style={styles.hiddenPhoneText}>••••••••••••</Text>
                <View style={styles.hiddenPhoneBadge}>
                  <MaterialCommunityIcons
                    name="lock"
                    size={12}
                    color="#f59e0b"
                  />
                  <Text style={styles.hiddenPhoneLabel}>
                    {t.provider?.availableAfterAccept ||
                      "Available after acceptance"}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Chat with Customer Button */}
          <TouchableOpacity
            style={styles.chatWithCustomerBtn}
            onPress={() =>
              navigation.navigate("Chat", {
                participant: {
                  id: request.customer.name.replace(/\s+/g, "-").toLowerCase(),
                  name: request.customer.name,
                },
                requestId: request.id,
              })
            }
          >
            <MaterialCommunityIcons
              name="chat-outline"
              size={18}
              color="#1976d2"
            />
            <Text style={styles.chatWithCustomerText}>
              {t.provider?.chatWithCustomer || "Chat with Customer"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Card - Enhanced */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            🚗 {t.common?.vehicle || "Vehicle"}
          </Text>

          {/* Main Vehicle Info */}
          <View style={styles.vehicleMain}>
            <View style={styles.vehicleIconContainer}>
              <MaterialCommunityIcons
                name="car-side"
                size={40}
                color="#1976d2"
              />
            </View>
            <View style={styles.vehicleMainInfo}>
              <Text style={styles.vehicleName}>
                {request.vehicle.make} {request.vehicle.model}
              </Text>
              <Text style={styles.vehicleYear}>
                {request.vehicle.year} • {request.vehicle.color}
              </Text>
            </View>
          </View>

          {/* Vehicle Details Grid */}
          <View style={styles.vehicleGrid}>
            <View style={styles.vehicleGridItem}>
              <MaterialCommunityIcons
                name="card-text"
                size={16}
                color="#6b7280"
              />
              <Text style={styles.vehicleGridLabel}>
                {t.vehicle?.plate || "Plate"}
              </Text>
              <Text style={styles.vehicleGridValue}>
                {request.vehicle.plateNumber}
              </Text>
            </View>
            <View style={styles.vehicleGridItem}>
              <MaterialCommunityIcons
                name="speedometer"
                size={16}
                color="#6b7280"
              />
              <Text style={styles.vehicleGridLabel}>
                {t.vehicle?.mileage || "Mileage"}
              </Text>
              <Text style={[styles.vehicleGridValue, !(request.vehicle.mileage > 0) && { color: '#9ca3af', fontStyle: 'italic' }]}>
                {request.vehicle.mileage > 0 ? `${request.vehicle.mileage.toLocaleString('en-US')} mi` : (t.common?.notProvided || "Not provided")}
              </Text>
            </View>
            <View style={styles.vehicleGridItem}>
              <MaterialCommunityIcons
                name="gas-station"
                size={16}
                color="#6b7280"
              />
              <Text style={styles.vehicleGridLabel}>
                {t.vehicle?.fuelType || "Fuel"}
              </Text>
              <Text style={styles.vehicleGridValue}>
                {request.vehicle.fuelType}
              </Text>
            </View>
            <View style={styles.vehicleGridItem}>
              <MaterialCommunityIcons
                name="car-shift-pattern"
                size={16}
                color="#6b7280"
              />
              <Text style={styles.vehicleGridLabel}>
                {t.vehicle?.transmission || "Transmission"}
              </Text>
              <Text style={[styles.vehicleGridValue, !request.vehicle.transmission && { color: '#9ca3af', fontStyle: 'italic' }]}>
                {request.vehicle.transmission || (t.common?.notProvided || "Not provided")}
              </Text>
            </View>
            <View style={styles.vehicleGridItem}>
              <MaterialCommunityIcons name="engine" size={16} color="#6b7280" />
              <Text style={styles.vehicleGridLabel}>
                {t.vehicle?.engine || "Engine"}
              </Text>
              <Text style={[styles.vehicleGridValue, !request.vehicle.engine && { color: '#9ca3af', fontStyle: 'italic' }]}>
                {request.vehicle.engine || (t.common?.notProvided || "Not provided")}
              </Text>
            </View>
            <View style={styles.vehicleGridItem}>
              <MaterialCommunityIcons
                name="barcode"
                size={16}
                color="#6b7280"
              />
              <Text style={styles.vehicleGridLabel}>VIN</Text>
              <Text
                style={[styles.vehicleGridValue, { fontSize: 11 }]}
                numberOfLines={1}
              >
                {request.vehicle.vin}
              </Text>
            </View>
          </View>

          {/* Last Service Info */}
          {request.vehicle.lastServiceDate && (
            <View style={styles.lastServiceBanner}>
              <MaterialCommunityIcons
                name="history"
                size={18}
                color="#1976d2"
              />
              <View style={styles.lastServiceInfo}>
                <Text style={styles.lastServiceTitle}>
                  {t.vehicle?.lastService || "Last Service"}
                </Text>
                <Text style={styles.lastServiceText}>
                  {formatDate(request.vehicle.lastServiceDate)} •{" "}
                  {request.vehicle.lastServiceMileage?.toLocaleString()} mi
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Competition Info */}
        <View style={styles.competitionCard}>
          <MaterialCommunityIcons
            name="account-group"
            size={24}
            color={request.quotesCount === 0 ? "#10b981" : "#f59e0b"}
          />
          <View style={styles.competitionInfo}>
            <Text style={styles.competitionTitle}>
              {request.quotesCount === 0
                ? (t.provider?.noQuotesYet || "No providers have submitted quotes yet")
                : request.quotesCount === 1
                  ? (t.provider?.oneProviderQuoted || "1 provider has submitted a quote")
                  : `${request.quotesCount} ${t.provider?.providersQuoted || "providers have already submitted quotes"}`}
            </Text>
            <Text style={styles.competitionSubtitle}>
              {request.quotesCount === 0
                ? (t.provider?.beFirst || "Be the first to quote!")
                : (t.provider?.beCompetitive || "Be competitive to increase your chances!")}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Buttons */}
      {!quoteSubmitted && (
        <View style={styles.bottomContainer}>
          {request.expiresIn === "Expired" ? (
            <View style={[styles.quoteButton, { backgroundColor: '#9ca3af' }]}>
              <MaterialCommunityIcons name="clock-alert" size={22} color="#fff" />
              <Text style={styles.quoteButtonText}>
                {t.quote?.requestExpired || "Request Expired"}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.quoteButton}
              onPress={() => setShowQuoteModal(true)}
            >
              <MaterialCommunityIcons
                name="file-document-edit"
                size={22}
                color="#fff"
              />
              <Text style={styles.quoteButtonText}>
                {t.quote?.createQuote || "Create Quote"}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.declineLink}
            onPress={() => {
              setDeclineReason("");
              setDeclineOtherText("");
              setShowDeclineModal(true);
            }}
          >
            <Text style={styles.declineLinkText}>
              {t.provider?.cantHandle || "Can't handle this request? Decline"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quote Modal */}
      <Modal
        visible={showQuoteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuoteModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t.quote?.createQuote || "Create Quote"}
              </Text>
              <TouchableOpacity onPress={() => setShowQuoteModal(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Customer's Request Summary - Service Type Header */}
              {request && (
                <View style={styles.customerRequestSummary}>
                  <View style={styles.customerRequestHeader}>
                    <View style={[styles.serviceTypeIconBox, { backgroundColor: getServiceTypeInfo(request.serviceType).bg }]}>
                      <MaterialCommunityIcons 
                        name={getServiceTypeInfo(request.serviceType).icon as any} 
                        size={22} 
                        color={getServiceTypeInfo(request.serviceType).color} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerRequestServiceTitle}>
                        {request.title}
                      </Text>
                      {request.vehicle && (
                        <Text style={styles.customerRequestVehicleText}>
                          {request.vehicle.year} {request.vehicle.make} {request.vehicle.model}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Service scope and location row */}
                  <View style={styles.customerRequestMeta}>
                    {request.serviceLocation && (
                      <View style={styles.customerRequestMetaItem}>
                        <MaterialCommunityIcons name="map-marker" size={14} color="#6b7280" />
                        <Text style={styles.customerRequestMetaText}>
                          {request.serviceLocation.type === "shop"
                            ? t.provider?.atShop || "At Shop"
                            : request.serviceLocation.type === "mobile"
                              ? t.provider?.mobileService || "Mobile Service"
                              : t.provider?.roadsideAssist || "Roadside Assist"}
                        </Text>
                      </View>
                    )}
                    {request.preferredDate && (
                      <View style={styles.customerRequestMetaItem}>
                        <MaterialCommunityIcons name="calendar" size={14} color="#6b7280" />
                        <Text style={styles.customerRequestMetaText}>
                          {formatDate(request.preferredDate)}
                          {request.preferredTime ? ` ${request.preferredTime}` : ""}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Line Items Section */}
              <Text style={styles.sectionTitle}>
                {t.quote?.quoteItems || "Quote Items"}
              </Text>

              {lineItems.map((item, index) => (
                <View key={item.id} style={styles.lineItemCard}>
                  <View style={styles.lineItemHeader}>
                    <View
                      style={[
                        styles.lineItemTypeBadge,
                        {
                          backgroundColor:
                            item.type === "part" ? "#dbeafe" : "#dcfce7",
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={item.type === "part" ? "cog" : "account-wrench"}
                        size={14}
                        color={item.type === "part" ? "#1976d2" : "#16a34a"}
                      />
                      <Text
                        style={[
                          styles.lineItemTypeText,
                          {
                            color: item.type === "part" ? "#1976d2" : "#16a34a",
                          },
                        ]}
                      >
                        {item.type === "part"
                          ? t.quote?.parts || "Part"
                          : t.quote?.services || "Service"}
                      </Text>
                    </View>
                    {lineItems.length > 1 && (
                      <TouchableOpacity onPress={() => removeLineItem(item.id)}>
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={20}
                          color="#ef4444"
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TextInput
                    style={styles.lineItemInput}
                    placeholder={
                      item.type === "part"
                        ? t.common?.partExample ||
                          "Ex: Motor Oil 5W30 Synthetic"
                        : t.common?.serviceExample || "Ex: Oil change labor"
                    }
                    value={item.description}
                    onChangeText={(text) =>
                      updateLineItem(item.id, "description", text)
                    }
                  />

                  {/* Brand field - only for parts */}
                  {item.type === "part" && (
                    <TextInput
                      style={[styles.lineItemInput, styles.brandInput]}
                      placeholder={
                        t.quote?.brandPlaceholder ||
                        "Brand (e.g., Mobil, Castrol, ACDelco)"
                      }
                      value={item.brand || ""}
                      onChangeText={(text) =>
                        updateLineItem(item.id, "brand", text)
                      }
                    />
                  )}

                  <View style={styles.lineItemRow}>
                    <View style={styles.lineItemQuantity}>
                      <Text style={styles.lineItemLabel}>
                        {t.quote?.quantity || "Qty"}
                      </Text>
                      <TextInput
                        style={styles.lineItemSmallInput}
                        keyboardType="number-pad"
                        value={item.quantity.toString()}
                        onChangeText={(text) =>
                          updateLineItem(
                            item.id,
                            "quantity",
                            parseInt(text) || 1,
                          )
                        }
                      />
                    </View>
                    <View style={styles.lineItemPrice}>
                      <Text style={styles.lineItemLabel}>
                        {t.quote?.unitPrice || "Unit Price"} ($)
                      </Text>
                      <TextInput
                        style={styles.lineItemSmallInput}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        value={item.unitPriceText !== undefined ? item.unitPriceText : (item.unitPrice > 0 ? item.unitPrice.toString() : "")}
                        onChangeText={(text) => {
                          // Allow valid decimal input including trailing dots and zeros
                          const cleaned = text.replace(/[^0-9.]/g, '');
                          // Prevent multiple decimal points
                          const parts = cleaned.split('.');
                          const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
                          setLineItems(lineItems.map(li =>
                            li.id === item.id
                              ? { ...li, unitPriceText: sanitized, unitPrice: parseFloat(sanitized) || 0 }
                              : li
                          ));
                        }}
                      />
                    </View>
                    <View style={styles.lineItemSubtotal}>
                      <Text style={styles.lineItemLabel}>Subtotal</Text>
                      <Text style={styles.lineItemSubtotalValue}>
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Add Item Buttons */}
              <View style={styles.addItemButtons}>
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={() => addLineItem("part")}
                >
                  <MaterialCommunityIcons
                    name="plus-circle"
                    size={18}
                    color="#1976d2"
                  />
                  <Text style={styles.addItemButtonText}>
                    {t.quote?.addPart || "Add Part"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={() => addLineItem("service")}
                >
                  <MaterialCommunityIcons
                    name="plus-circle"
                    size={18}
                    color="#16a34a"
                  />
                  <Text
                    style={[styles.addItemButtonText, { color: "#16a34a" }]}
                  >
                    {t.quote?.addService || "Add Service"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Duration */}
              <Text style={styles.sectionTitle}>
                {t.quote?.estimatedDuration || "Estimated Duration"} *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.durationScroll}
              >
                {durationOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.durationOption,
                      estimatedDuration === option.value &&
                        styles.durationOptionActive,
                    ]}
                    onPress={() => setEstimatedDuration(option.value)}
                  >
                    <Text
                      style={[
                        styles.durationOptionText,
                        estimatedDuration === option.value &&
                          styles.durationOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Date & Time Scheduling */}
              <Text style={styles.sectionTitle}>
                {t.quote?.scheduling || "Scheduling"} *
              </Text>

              <Text style={styles.subSectionTitle}>
                {t.quote?.date || "Date"}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.dateScroll}
              >
                {availableDates.map((date) => (
                  <TouchableOpacity
                    key={date.value}
                    style={[
                      styles.dateOption,
                      selectedDate === date.value && styles.dateOptionActive,
                    ]}
                    onPress={() => setSelectedDate(date.value)}
                  >
                    <Text
                      style={[
                        styles.dateOptionText,
                        selectedDate === date.value &&
                          styles.dateOptionTextActive,
                      ]}
                    >
                      {date.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.subSectionTitle}>
                {t.quote?.time || "Time"}
              </Text>
              <View style={styles.timeGrid}>
                {availableTimes.map((time) => (
                  <TouchableOpacity
                    key={time.value}
                    style={[
                      styles.timeOption,
                      selectedTime === time.value && styles.timeOptionActive,
                    ]}
                    onPress={() => setSelectedTime(time.value)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        selectedTime === time.value &&
                          styles.timeOptionTextActive,
                      ]}
                    >
                      {time.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes */}
              <Text style={styles.sectionTitle}>
                {t.quote?.notes || "Notes"} ({t.common?.optional || "optional"})
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={
                  t.quote?.notesPlaceholder ||
                  "Additional information, special conditions..."
                }
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={notes}
                onChangeText={setNotes}
              />

              {/* Mobile Service / Displacement Section */}
              <Text style={styles.sectionTitle}>
                {t.quote?.mobileService || "Mobile Service"}
              </Text>
              <View style={styles.mobileServiceContainer}>
                <View style={styles.mobileServiceToggle}>
                  <View style={styles.mobileServiceInfo}>
                    <MaterialCommunityIcons
                      name="truck"
                      size={24}
                      color="#374151"
                    />
                    <View style={styles.mobileServiceTextContainer}>
                      <Text style={styles.mobileServiceLabel}>
                        {t.quote?.serviceAtLocation || "Service at Location"}
                      </Text>
                      <Text style={styles.mobileServiceDescription}>
                        {t.quote?.serviceAtLocationDesc ||
                          "I will go to the customer to perform the service"}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isMobileService}
                    onValueChange={setIsMobileService}
                    trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                    thumbColor={isMobileService ? "#1976d2" : "#fff"}
                  />
                </View>

                {isMobileService && request && (
                  <View style={styles.displacementDetails}>
                    {/* Distance and radius info */}
                    <View style={styles.displacementRow}>
                      <View style={styles.displacementItem}>
                        <MaterialCommunityIcons
                          name="map-marker-distance"
                          size={20}
                          color="#6b7280"
                        />
                        <View>
                          <Text style={styles.displacementLabel}>
                            {t.quote?.customerDistance || "Customer Distance"}
                          </Text>
                          <Text style={styles.displacementValue}>
                            {getCustomerDistanceMiles().toFixed(1)} mi
                          </Text>
                        </View>
                      </View>
                      <View style={styles.displacementItem}>
                        <MaterialCommunityIcons
                          name="map-marker-radius"
                          size={20}
                          color="#6b7280"
                        />
                        <View>
                          <Text style={styles.displacementLabel}>
                            {t.quote?.freeRadius || "Free Radius"}
                          </Text>
                          <Text style={styles.displacementValue}>
                            {providerFreeMiles} mi
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Cost calculation */}
                    <View style={styles.displacementCostCard}>
                      {calculateDisplacementCost() > 0 ? (
                        <>
                          <View style={styles.displacementCostRow}>
                            <Text style={styles.displacementCostLabel}>
                              {t.quote?.costPerMile || "Cost per extra mile"}
                            </Text>
                            <Text style={styles.displacementCostValue}>
                              ${providerCostPerMile.toFixed(2)}/mi
                            </Text>
                          </View>
                          <View style={styles.displacementCostRow}>
                            <Text style={styles.displacementCostLabel}>
                              {t.quote?.additionalDistance ||
                                "Additional distance"}
                            </Text>
                            <Text style={styles.displacementCostValue}>
                              {(
                                getCustomerDistanceMiles() - providerFreeMiles
                              ).toFixed(1)}{" "}
                              mi
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.displacementCostRow,
                              styles.displacementTotalRow,
                            ]}
                          >
                            <Text style={styles.displacementTotalLabel}>
                              {t.quote?.displacementCost || "Displacement Cost"}
                            </Text>
                            <Text style={styles.displacementTotalValue}>
                              ${calculateDisplacementCost().toFixed(2)}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.noDisplacementCharge}>
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={20}
                            color="#10b981"
                          />
                          <Text style={styles.noDisplacementText}>
                            {t.quote?.includedInRadius ||
                              "Within free radius - No displacement charge"}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* Warranty Section */}
              <Text style={styles.sectionTitle}>
                {t.quote?.warranty || "Warranty / Guarantee"}
              </Text>
              <View style={styles.warrantyContainer}>
                <View style={styles.warrantyRow}>
                  <View style={styles.warrantyField}>
                    <Text style={styles.warrantyLabel}>
                      {t.quote?.partsWarranty || "Parts Warranty"}
                    </Text>
                    <View style={styles.warrantyInputRow}>
                      <TextInput
                        style={styles.warrantyInput}
                        value={partsWarrantyMonths}
                        onChangeText={setPartsWarrantyMonths}
                        keyboardType="numeric"
                        placeholder="3"
                      />
                      <Text style={styles.warrantyUnit}>
                        {t.quote?.months || "months"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.warrantyField}>
                    <Text style={styles.warrantyLabel}>
                      {t.quote?.serviceWarranty || "Service Warranty"}
                    </Text>
                    <View style={styles.warrantyInputRow}>
                      <TextInput
                        style={styles.warrantyInput}
                        value={serviceWarrantyDays}
                        onChangeText={setServiceWarrantyDays}
                        keyboardType="numeric"
                        placeholder="90"
                      />
                      <Text style={styles.warrantyUnit}>
                        {t.quote?.days || "days"}
                      </Text>
                    </View>
                  </View>
                </View>
                {/* FDACS Req #6: Warranty Mileage */}
                <Text style={styles.warrantySubLabel}>
                  {t.quote?.warrantyMileage || "Warranty Mileage"}
                </Text>
                <View style={styles.warrantyInputRow}>
                  <TextInput
                    style={[styles.warrantyInput, { flex: 1 }]}
                    value={warrantyMileage}
                    onChangeText={setWarrantyMileage}
                    keyboardType="numeric"
                    placeholder="12000"
                  />
                  <Text style={styles.warrantyUnit}>
                    {t.quote?.miles || "miles"}
                  </Text>
                </View>
                <Text style={styles.warrantySubLabel}>
                  {t.quote?.warrantyTerms || "Warranty Terms"} (
                  {t.common?.optional || "optional"})
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={
                    t.quote?.warrantyTermsPlaceholder ||
                    "Specific warranty conditions, exclusions, etc..."
                  }
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  value={warrantyTerms}
                  onChangeText={setWarrantyTerms}
                />
              </View>

              {/* Total Breakdown */}
              {(() => {
                const partItems = lineItems.filter((i) => i.type === 'part' && i.description && i.unitPrice > 0);
                const serviceItems = lineItems.filter((i) => i.type === 'service' && i.description && i.unitPrice > 0);
                const partsTotal = partItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                const laborTotal = serviceItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                return (
                  <View style={styles.totalContainer}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, color: '#6b7280' }}>{t.quote?.parts || "Parts"}</Text>
                        <Text style={{ fontSize: 13, color: '#374151' }}>${partsTotal.toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, color: '#6b7280' }}>{t.quote?.labor || "Labor"}</Text>
                        <Text style={{ fontSize: 13, color: '#374151' }}>${laborTotal.toFixed(2)}</Text>
                      </View>
                      <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.totalLabel}>{t.quote?.subtotal || "Subtotal"}</Text>
                        <Text style={styles.totalValue}>${calculateSubtotal().toFixed(2)}</Text>
                      </View>
                      <Text style={styles.totalItems}>
                        {lineItems.filter((i) => i.description && i.unitPrice > 0).length} item(s)
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Show displacement cost if mobile service is enabled */}
              {isMobileService && calculateDisplacementCost() > 0 && (
                <View style={styles.displacementTotalContainer}>
                  <View>
                    <Text style={styles.displacementTotalLabelSmall}>
                      {t.quote?.displacementCost || "Displacement Cost"}
                    </Text>
                  </View>
                  <Text style={styles.displacementTotalValueSmall}>
                    + ${calculateDisplacementCost().toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Sales Tax (auto-calculated for applicable states) */}
              {calculateSalesTax() > 0 && (() => {
                const providerState = request?.provider?.state || request?.provider?.address?.state || 'FL';
                const taxRate = SALES_TAX_RATES[providerState as keyof typeof SALES_TAX_RATES];
                return (
                  <View style={styles.displacementTotalContainer}>
                    <View>
                      <Text style={styles.displacementTotalLabelSmall}>
                        {`Sales Tax (${providerState} ${(taxRate * 100).toFixed(0)}% on parts)`}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        Auto-calculated • Parts only
                      </Text>
                    </View>
                    <Text style={styles.displacementTotalValueSmall}>
                      + ${calculateSalesTax().toFixed(2)}
                    </Text>
                  </View>
                );
              })()}

              {/* Grand Total */}
              <View style={styles.grandTotalContainer}>
                <View>
                  <Text style={styles.grandTotalLabel}>
                    {t.quote?.grandTotal || "Grand Total"}
                  </Text>
                  {(isMobileService && calculateDisplacementCost() > 0) || calculateSalesTax() > 0 ? (
                    <Text style={styles.grandTotalNote}>
                      {[
                        isMobileService && calculateDisplacementCost() > 0 ? (t.quote?.totalWithDisplacement || "Incl. Displacement") : null,
                        calculateSalesTax() > 0 ? "Incl. Tax" : null,
                      ].filter(Boolean).join(' + ')}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.grandTotalValue}>
                  ${calculateTotal().toFixed(2)}
                </Text>
              </View>

              {/* D2: Fee Breakdown */}
              {(() => {
                const grandTotal = calculateTotal();
                const platformFee = grandTotal * 0.10;
                const youReceive = grandTotal - platformFee;
                return (
                  <View style={styles.feeBreakdownContainer}>
                    <View style={styles.feeBreakdownHeader}>
                      <MaterialCommunityIcons name="cash-check" size={18} color="#1e40af" />
                      <Text style={styles.feeBreakdownTitle}>Fee Breakdown</Text>
                    </View>
                    <View style={styles.feeBreakdownRow}>
                      <Text style={styles.feeBreakdownLabel}>Your quote</Text>
                      <Text style={styles.feeBreakdownValue}>${grandTotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.feeBreakdownRow}>
                      <Text style={[styles.feeBreakdownLabel, { color: '#ef4444' }]}>Platform fee (10%)</Text>
                      <Text style={[styles.feeBreakdownValue, { color: '#ef4444' }]}>-${platformFee.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.feeBreakdownRow, styles.feeBreakdownTotal]}>
                      <Text style={styles.feeBreakdownReceiveLabel}>You receive</Text>
                      <Text style={styles.feeBreakdownReceiveValue}>${youReceive.toFixed(2)}</Text>
                    </View>
                  </View>
                );
              })()}

              {/* D6: Save as Template / Use Template buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                {quoteTemplates.length > 0 && (
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#dbeafe', backgroundColor: '#eff6ff', gap: 6 }}
                    onPress={() => setShowTemplatesModal(true)}
                  >
                    <MaterialCommunityIcons name="lightning-bolt" size={16} color="#1976d2" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1976d2' }}>Use Template</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', gap: 6 }}
                  onPress={() => {
                    if (showSaveTemplateInput) {
                      if (saveTemplateName.trim()) {
                        saveQuoteTemplate(saveTemplateName.trim());
                      } else {
                        Alert.alert("Name Required", "Enter a name for the template.");
                      }
                    } else {
                      setShowSaveTemplateInput(true);
                    }
                  }}
                >
                  <MaterialCommunityIcons name="content-save" size={16} color="#6b7280" />
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#6b7280' }}>Save Template</Text>
                </TouchableOpacity>
              </View>
              {showSaveTemplateInput && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TextInput
                    style={{ flex: 1, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 }}
                    placeholder="Template name, e.g. Standard Oil Change"
                    value={saveTemplateName}
                    onChangeText={setSaveTemplateName}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={{ backgroundColor: '#1976d2', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' }}
                    onPress={() => {
                      if (saveTemplateName.trim()) saveQuoteTemplate(saveTemplateName.trim());
                      else Alert.alert("Name Required", "Enter a name for the template.");
                    }}
                  >
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ justifyContent: 'center', paddingHorizontal: 8 }}
                    onPress={() => { setShowSaveTemplateInput(false); setSaveTemplateName(""); }}
                  >
                    <MaterialCommunityIcons name="close" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              )}

              {/* D8: Review & Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ]}
                onPress={() => {
                  // Validate before opening review
                  const validItems = lineItems.filter(i => i.description && i.unitPrice > 0);
                  if (validItems.length === 0) {
                    Alert.alert(t.common?.error || "Error", t.common?.addItemError || "Add at least one item to the quote");
                    return;
                  }
                  if (!estimatedDuration) {
                    Alert.alert(t.common?.error || "Error", t.common?.selectDurationError || "Select the estimated time for the service");
                    return;
                  }
                  if (!selectedDate || !selectedTime) {
                    Alert.alert(t.common?.error || "Error", t.common?.selectDateTimeError || "Select the available date and time for the service");
                    return;
                  }
                  setShowReviewModal(true);
                }}
                disabled={submitting}
              >
                <MaterialCommunityIcons name="clipboard-check" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>
                  Review & Submit
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* D8: Quote Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '95%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Quote</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Vehicle & Service */}
              {request && (
                <View style={styles.customerRequestSummary}>
                  <View style={styles.customerRequestHeader}>
                    <View style={[styles.serviceTypeIconBox, { backgroundColor: getServiceTypeInfo(request.serviceType).bg }]}>
                      <MaterialCommunityIcons name={getServiceTypeInfo(request.serviceType).icon as any} size={22} color={getServiceTypeInfo(request.serviceType).color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerRequestServiceTitle}>{request.title}</Text>
                      {request.vehicle && (
                        <Text style={styles.customerRequestVehicleText}>
                          {request.vehicle.year} {request.vehicle.make} {request.vehicle.model}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Items Summary */}
              <Text style={styles.sectionTitle}>Items</Text>
              {lineItems.filter(i => i.description && i.unitPrice > 0).map((item) => (
                <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#1f2937' }}>{item.description}</Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                      {item.type === 'part' ? 'Part' : 'Service'}{item.brand ? ` • ${item.brand}` : ''} • Qty: {item.quantity}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#10b981' }}>${(item.quantity * item.unitPrice).toFixed(2)}</Text>
                </View>
              ))}

              {/* Schedule */}
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Schedule & Duration</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
                <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 10 }}>
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>Date</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{selectedDate ? availableDates.find(d => d.value === selectedDate)?.label || selectedDate : '—'}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 10 }}>
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>Time</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{selectedTime ? availableTimes.find(t => t.value === selectedTime)?.label || selectedTime : '—'}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 8 }}>
                <Text style={{ fontSize: 11, color: '#6b7280' }}>Estimated Duration</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{estimatedDuration || '—'}</Text>
              </View>

              {/* Warranty */}
              {(partsWarrantyMonths || serviceWarrantyDays || warrantyMileage) && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Warranty</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {partsWarrantyMonths && (
                      <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                        <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '500' }}>Parts: {partsWarrantyMonths} mo</Text>
                      </View>
                    )}
                    {serviceWarrantyDays && (
                      <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                        <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '500' }}>Service: {serviceWarrantyDays} days</Text>
                      </View>
                    )}
                    {warrantyMileage && (
                      <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                        <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '500' }}>{warrantyMileage} miles</Text>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* Notes */}
              {notes ? (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Notes</Text>
                  <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 18 }}>{notes}</Text>
                </>
              ) : null}

              {/* Fee Breakdown in Review */}
              {(() => {
                const validItems = lineItems.filter(i => i.description && i.unitPrice > 0);
                const partItems = validItems.filter(i => i.type === 'part');
                const serviceItems = validItems.filter(i => i.type === 'service');
                const partsTotal = partItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                const laborTotal = serviceItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                const displacement = calculateDisplacementCost();
                const grandTotal = calculateTotal();
                const platformFee = grandTotal * 0.10;
                const youReceive = grandTotal - platformFee;
                return (
                  <View style={{ marginTop: 16 }}>
                    <View style={styles.grandTotalContainer}>
                      <View>
                        <Text style={styles.grandTotalLabel}>Customer Pays</Text>
                      </View>
                      <Text style={styles.grandTotalValue}>${grandTotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.feeBreakdownContainer}>
                      <View style={styles.feeBreakdownRow}>
                        <Text style={styles.feeBreakdownLabel}>Parts</Text>
                        <Text style={styles.feeBreakdownValue}>${partsTotal.toFixed(2)}</Text>
                      </View>
                      <View style={styles.feeBreakdownRow}>
                        <Text style={styles.feeBreakdownLabel}>Labor</Text>
                        <Text style={styles.feeBreakdownValue}>${laborTotal.toFixed(2)}</Text>
                      </View>
                      {displacement > 0 && (
                        <View style={styles.feeBreakdownRow}>
                          <Text style={styles.feeBreakdownLabel}>Displacement</Text>
                          <Text style={styles.feeBreakdownValue}>${displacement.toFixed(2)}</Text>
                        </View>
                      )}
                      <View style={[styles.feeBreakdownRow, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, marginTop: 4 }]}>
                        <Text style={[styles.feeBreakdownLabel, { color: '#ef4444' }]}>Platform fee (10%)</Text>
                        <Text style={[styles.feeBreakdownValue, { color: '#ef4444' }]}>-${platformFee.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.feeBreakdownRow, styles.feeBreakdownTotal]}>
                        <Text style={styles.feeBreakdownReceiveLabel}>You receive</Text>
                        <Text style={styles.feeBreakdownReceiveValue}>${youReceive.toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })()}

              {/* Submit from Review */}
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={() => {
                  setShowReviewModal(false);
                  handleSubmitQuote();
                }}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Confirm & Send Quote</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{ alignItems: 'center', paddingVertical: 12 }}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={{ fontSize: 14, color: '#6b7280' }}>Go Back and Edit</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* D7: Decline with Reasons Modal */}
      <Modal
        visible={showDeclineModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDeclineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Decline Request</Text>
              <TouchableOpacity onPress={() => setShowDeclineModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
              Please select a reason for declining. This helps us route the request to another provider faster.
            </Text>
            {[
              { id: "not_specialty", label: "Not my specialty", icon: "wrench-off" as const },
              { id: "too_busy", label: "Too busy right now", icon: "clock-fast" as const },
              { id: "too_far", label: "Customer too far", icon: "map-marker-distance" as const },
              { id: "parts_unavailable", label: "Parts unavailable", icon: "package-variant-remove" as const },
              { id: "other", label: "Other reason", icon: "dots-horizontal" as const },
            ].map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
                  declineReason === reason.id
                    ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' }
                    : { borderColor: '#e5e7eb', backgroundColor: '#fff' },
                ]}
                onPress={() => setDeclineReason(reason.id)}
              >
                <MaterialCommunityIcons
                  name={reason.icon}
                  size={20}
                  color={declineReason === reason.id ? '#ef4444' : '#6b7280'}
                />
                <Text style={{ fontSize: 15, color: declineReason === reason.id ? '#ef4444' : '#374151', fontWeight: declineReason === reason.id ? '600' : '400', flex: 1 }}>
                  {reason.label}
                </Text>
                {declineReason === reason.id && (
                  <MaterialCommunityIcons name="check-circle" size={20} color="#ef4444" />
                )}
              </TouchableOpacity>
            ))}
            {declineReason === "other" && (
              <TextInput
                style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 8 }}
                placeholder="Please specify..."
                value={declineOtherText}
                onChangeText={setDeclineOtherText}
                multiline
              />
            )}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#ef4444', marginTop: 8 }, declining && { opacity: 0.7 }]}
              onPress={handleDeclineWithReason}
              disabled={declining}
            >
              {declining ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Decline Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* D6: Templates Modal */}
      <Modal
        visible={showTemplatesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTemplatesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quote Templates</Text>
              <TouchableOpacity onPress={() => setShowTemplatesModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              Select a template to pre-fill your quote. You can adjust values after applying.
            </Text>
            {quoteTemplates.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <MaterialCommunityIcons name="file-document-outline" size={40} color="#d1d5db" />
                <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 8 }}>No saved templates yet</Text>
                <Text style={{ fontSize: 12, color: '#d1d5db', marginTop: 4, textAlign: 'center' }}>
                  Fill out a quote and tap "Save Template" to create one
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {quoteTemplates.map((template) => {
                  const total = template.lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                  return (
                    <View key={template.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' }}>
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => applyTemplate(template)}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#1f2937' }}>{template.name}</Text>
                        <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                          {template.lineItems.length} item(s) • ${total.toFixed(2)} • {template.estimatedDuration || '—'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ padding: 8 }}
                        onPress={() => {
                          Alert.alert("Delete Template", `Delete "${template.name}"?`, [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => deleteQuoteTemplate(template.id) },
                          ]);
                        }}
                      >
                        <MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  detailHeader: {
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
  detailHeaderTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d1fae5",
    padding: 12,
    gap: 8,
  },
  successText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#065f46",
  },
  headerCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  urgentBadge: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgentBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#dc2626",
  },
  requestNumber: {
    fontSize: 13,
    color: "#9ca3af",
  },
  timeBox: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  timeValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#92400e",
  },
  timeLabel: {
    fontSize: 10,
    color: "#92400e",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#6b7280",
    lineHeight: 22,
  },
  preferredSchedule: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  preferredScheduleText: {
    fontSize: 13,
    color: "#1976d2",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f59e0b",
  },
  ratingCount: {
    fontSize: 12,
    color: "#9ca3af",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    color: "#4b5563",
    flex: 1,
  },
  hiddenPhone: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hiddenPhoneText: {
    fontSize: 15,
    color: "#9ca3af",
    letterSpacing: 2,
  },
  hiddenPhoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  hiddenPhoneLabel: {
    fontSize: 11,
    color: "#92400e",
    fontWeight: "500",
  },
  chatWithCustomerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  chatWithCustomerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1976d2",
  },
  vehicleMain: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  vehicleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  vehicleMainInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  vehicleYear: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  vehicleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  vehicleGridItem: {
    width: "48%",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  vehicleGridLabel: {
    fontSize: 11,
    color: "#6b7280",
  },
  vehicleGridValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  lastServiceBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 10,
  },
  lastServiceInfo: {
    flex: 1,
  },
  lastServiceTitle: {
    fontSize: 12,
    color: "#1976d2",
    fontWeight: "600",
  },
  lastServiceText: {
    fontSize: 13,
    color: "#3b82f6",
  },
  competitionCard: {
    backgroundColor: "#f3f4f6",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  competitionInfo: {
    flex: 1,
  },
  competitionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  competitionSubtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  quoteButton: {
    backgroundColor: "#1976d2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  quoteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  declineLink: {
    paddingVertical: 10,
    alignItems: "center",
  },
  declineLinkText: {
    fontSize: 13,
    color: "#6b7280",
    textDecorationLine: "underline",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
    marginTop: 16,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
    marginBottom: 8,
    marginTop: 12,
  },
  lineItemCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  lineItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  lineItemTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  lineItemTypeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  lineItemInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f2937",
    marginBottom: 10,
  },
  brandInput: {
    borderColor: "#dbeafe",
    backgroundColor: "#f8fafc",
  },
  lineItemRow: {
    flexDirection: "row",
    gap: 10,
  },
  lineItemQuantity: {
    width: 60,
  },
  lineItemPrice: {
    flex: 1,
  },
  lineItemSubtotal: {
    width: 80,
    alignItems: "flex-end",
  },
  lineItemLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
  },
  lineItemSmallInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1f2937",
    textAlign: "center",
  },
  lineItemSubtotalValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#10b981",
    marginTop: 8,
  },
  addItemButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  addItemButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    gap: 6,
  },
  addItemButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1976d2",
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1f2937",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  durationScroll: {
    marginBottom: 8,
  },
  durationOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    marginRight: 10,
  },
  durationOptionActive: {
    backgroundColor: "#1976d2",
  },
  durationOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  durationOptionTextActive: {
    color: "#fff",
  },
  dateScroll: {
    marginBottom: 8,
  },
  dateOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    marginRight: 10,
  },
  dateOptionActive: {
    backgroundColor: "#1976d2",
  },
  dateOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  dateOptionTextActive: {
    color: "#fff",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    minWidth: 70,
    alignItems: "center",
  },
  timeOptionActive: {
    backgroundColor: "#1976d2",
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  timeOptionTextActive: {
    color: "#fff",
  },
  totalContainer: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  totalLabel: {
    fontSize: 15,
    color: "#1e40af",
    fontWeight: "600",
  },
  totalItems: {
    fontSize: 12,
    color: "#3b82f6",
    marginTop: 2,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e40af",
  },
  commissionNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  commissionText: {
    fontSize: 12,
    color: "#6b7280",
    flex: 1,
  },
  // D2: Fee Breakdown styles
  feeBreakdownContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  feeBreakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  feeBreakdownTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e40af",
  },
  feeBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  feeBreakdownLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  feeBreakdownValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  feeBreakdownTotal: {
    borderTopWidth: 2,
    borderTopColor: "#10b981",
    paddingTop: 10,
    marginTop: 8,
  },
  feeBreakdownReceiveLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10b981",
  },
  feeBreakdownReceiveValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#10b981",
  },
  displacementTotalContainer: {
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  displacementTotalLabelSmall: {
    fontSize: 13,
    color: "#0369a1",
    fontWeight: "500",
  },
  displacementTotalValueSmall: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0369a1",
  },
  grandTotalContainer: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  grandTotalLabel: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  grandTotalNote: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  grandTotalValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#10b981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Warranty styles
  warrantySection: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  warrantyContainer: {
    backgroundColor: "#fefce8",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fde047",
  },
  warrantyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  warrantyRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  warrantyColumn: {
    flex: 1,
  },
  warrantyField: {
    flex: 1,
  },
  warrantyLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#854d0e",
    marginBottom: 6,
  },
  warrantySubLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#a16207",
    marginBottom: 6,
    marginTop: 4,
  },
  warrantyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warrantyInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fde047",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#713f12",
    width: 60,
    textAlign: "center",
  },
  warrantyUnit: {
    fontSize: 13,
    color: "#a16207",
    fontWeight: "500",
  },
  warrantySelect: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#78350f",
  },
  warrantyOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#fffbeb",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  warrantyOptionActive: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  warrantyOptionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#92400e",
  },
  warrantyOptionTextActive: {
    color: "#fff",
  },
  warrantyTermsInput: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#78350f",
    height: 70,
    textAlignVertical: "top",
  },
  // Mobile Service / Displacement styles
  mobileServiceContainer: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  mobileServiceToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mobileServiceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  mobileServiceTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  mobileServiceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0c4a6e",
  },
  mobileServiceDescription: {
    fontSize: 12,
    color: "#0369a1",
    marginTop: 2,
  },
  displacementDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#bae6fd",
  },
  displacementRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  displacementItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  displacementLabel: {
    fontSize: 11,
    color: "#6b7280",
  },
  displacementValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0c4a6e",
  },
  displacementCostCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
  },
  displacementCostRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  displacementCostLabel: {
    fontSize: 13,
    color: "#6b7280",
  },
  displacementCostValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  displacementTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 8,
    paddingTop: 12,
  },
  displacementTotalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0369a1",
  },
  displacementTotalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0369a1",
  },
  noDisplacementCharge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noDisplacementText: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "500",
  },
  // Service Location Card styles
  locationTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationShop: {
    backgroundColor: "#eff6ff",
  },
  locationMobile: {
    backgroundColor: "#ecfdf5",
  },
  locationRoadside: {
    backgroundColor: "#fffbeb",
  },
  locationTypeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  locationAddressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  locationAddress: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  locationNote: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 8,
  },
  roadsideWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fffbeb",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  roadsideWarningText: {
    flex: 1,
    fontSize: 13,
    color: "#92400e",
    fontWeight: "500",
  },
  navigationButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  openMapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1976d2",
    paddingVertical: 12,
    borderRadius: 10,
  },
  openMapsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  // Customer Request Summary in Quote Modal
  customerRequestSummary: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  customerRequestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  serviceTypeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  customerRequestServiceTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#1f2937",
  },
  customerRequestVehicleText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  partsLaborContainer: {
    flexDirection: "row" as const,
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  partsLaborColumn: {
    flex: 1,
  },
  partsLaborDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 8,
  },
  partsLaborHeader: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#374151",
    marginBottom: 6,
    textAlign: "center" as const,
  },
  partsLaborItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 2,
  },
  partsLaborItemText: {
    fontSize: 12,
    color: "#4b5563",
    flex: 1,
  },
  partsLaborEmpty: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center" as const,
  },
  customerRequestMeta: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
    marginTop: 10,
  },
  customerRequestMetaItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  customerRequestMetaText: {
    fontSize: 12,
    color: "#6b7280",
  },
});
