/**
 * ProviderRequestDetailsScreen - Detalhes do Pedido + Criar Orçamento
 * Fornecedor vê detalhes e envia orçamento
 * ATUALIZADO: Telefone oculto até aceite, mais info do veículo, campos individuais, agendamento
 */

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { useNotifications } from '../../contexts/NotificationsContext';
import api from '../../services/api';

interface QuoteLineItem {
  id: string;
  type: 'part' | 'service';
  description: string;
  brand?: string;
  quantity: number;
  unitPrice: number;
}

interface ServiceRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  serviceType: string;
  isUrgent: boolean;
  expiresIn: string;
  status: 'pending' | 'quoted' | 'accepted' | 'rejected';
  serviceLocation: {
    type: 'shop' | 'mobile' | 'roadside';
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

export default function ProviderRequestDetailsScreen({ route, navigation }: any) {
  const { requestId } = route.params;
  const { t } = useI18n();
  const { markRequestAsViewed } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);

  // Mark request as viewed when screen opens
  useEffect(() => {
    if (requestId) {
      markRequestAsViewed(requestId);
    }
  }, [requestId, markRequestAsViewed]);

  // Quote form state
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([
    { id: '1', type: 'part', description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [laborDescription, setLaborDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [notes, setNotes] = useState('');
  
  // Warranty state
  const [partsWarrantyMonths, setPartsWarrantyMonths] = useState('3');
  const [serviceWarrantyDays, setServiceWarrantyDays] = useState('90');
  const [warrantyMileage, setWarrantyMileage] = useState('');
  const [warrantyTerms, setWarrantyTerms] = useState('');
  
  // Scheduling state
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Mobile Service / Displacement cost state
  const [isMobileService, setIsMobileService] = useState(false);
  const [providerServiceRadius, setProviderServiceRadius] = useState(15); // km - from provider settings
  const [providerFreeKm, setProviderFreeKm] = useState(5); // Free km - from provider settings
  const [providerCostPerKm, setProviderCostPerKm] = useState(5.00); // $ per extra km - from provider settings

  // Calculate displacement cost based on customer distance
  const calculateDisplacementCost = () => {
    if (!isMobileService || !request) return 0;
    
    // Parse customer distance (e.g., "3.2 km" -> 3.2)
    const distanceStr = request.customer.distance.replace(/[^\d.]/g, '');
    const customerDistance = parseFloat(distanceStr) || 0;
    
    // If within free km range, no charge
    if (customerDistance <= providerFreeKm) return 0;
    
    // Calculate extra km and cost
    const extraKm = customerDistance - providerFreeKm;
    return extraKm * providerCostPerKm;
  };

  // Reset state and reload when requestId changes or screen gains focus
  useFocusEffect(
    useCallback(() => {
      // Reset state when navigating to this screen
      setRequest(null);
      setLoading(true);
      setQuoteSubmitted(false);
      loadRequest();
    }, [requestId])
  );

  const loadRequest = async () => {
    setLoading(true);
    try {
      // Load request and provider profile in parallel
      const [requestResponse, profileResponse] = await Promise.all([
        api.get(`/service-requests/${requestId}`),
        api.get('/providers/profile').catch(() => null),
      ]);
      
      const sr = requestResponse.data?.data;

      if (!sr) {
        throw new Error('Request not found');
      }

      // Load provider's service area settings
      if (profileResponse?.data?.data) {
        const pp = profileResponse.data.data.providerProfile || profileResponse.data.data;
        setProviderServiceRadius(pp.serviceRadiusKm || 25);
        setProviderFreeKm(pp.freeKm ? Number(pp.freeKm) : 0);
        setProviderCostPerKm(pp.extraFeePerKm ? Number(pp.extraFeePerKm) : 0);
      }

      // Calculate time remaining until quoteDeadline
      let expiresIn = '';
      if (sr.quoteDeadline) {
        const diff = new Date(sr.quoteDeadline).getTime() - Date.now();
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          expiresIn = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
        } else {
          expiresIn = 'Expired';
        }
      }

      const vehicle = sr.vehicle || {};
      const user = sr.user || {};

      setRequest({
        id: sr.id,
        requestNumber: sr.requestNumber || `SR-${sr.id.substring(0, 6)}`,
        title: sr.title || sr.serviceType || 'Service Request',
        description: sr.description || '',
        serviceType: sr.serviceType || 'REPAIR',
        isUrgent: sr.urgencyLevel === 'URGENT' || sr.isUrgent || false,
        expiresIn,
        status: sr.status === 'QUOTES_RECEIVED' ? 'quoted' : 'pending',
        serviceLocation: {
          type: sr.serviceLocationType === 'MOBILE' ? 'mobile' : sr.serviceLocationType === 'REMOTE' ? 'roadside' : 'shop',
          address: sr.serviceAddress || '',
          coordinates: sr.serviceLatitude && sr.serviceLongitude
            ? { lat: Number(sr.serviceLatitude), lng: Number(sr.serviceLongitude) }
            : undefined,
        },
        customer: {
          name: user.fullName || 'Customer',
          phone: user.phone || '',
          location: sr.serviceAddress || user.city || '',
          distance: sr.distanceKm ? `${Number(sr.distanceKm).toFixed(1)} km` : '',
          rating: user.averageRating ? Number(user.averageRating) : 0,
          totalRequests: user._count?.serviceRequests || 0,
        },
        vehicle: {
          make: vehicle.make || '',
          model: vehicle.model || '',
          year: vehicle.year || 0,
          plateNumber: vehicle.plateNumber || vehicle.licensePlate || '',
          color: vehicle.color || '',
          mileage: vehicle.mileage || 0,
          vin: vehicle.vin || '',
          fuelType: vehicle.fuelType || '',
          transmission: vehicle.transmission || '',
          engine: vehicle.engine || '',
          lastServiceDate: vehicle.lastServiceDate || undefined,
          lastServiceMileage: vehicle.lastServiceMileage || undefined,
        },
        quotesCount: sr.quotesCount || sr._count?.quotes || 0,
        preferredDate: sr.preferredDate || undefined,
        preferredTime: sr.preferredTime || undefined,
      });
    } catch (error) {
      console.error('Error loading request:', error);
    } finally {
      setLoading(false);
    }
  };

  // Line items management
  const addLineItem = (type: 'part' | 'service') => {
    const newId = (lineItems.length + 1).toString();
    setLineItems([...lineItems, { id: newId, type, description: '', quantity: 1, unitPrice: 0 }]);
  };

  const updateLineItem = (id: string, field: keyof QuoteLineItem, value: any) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const handleSubmitQuote = async () => {
    // Validação
    const validItems = lineItems.filter(item => item.description && item.unitPrice > 0);
    if (validItems.length === 0) {
      Alert.alert(t.common?.error || 'Error', t.common?.addItemError || 'Add at least one item to the quote');
      return;
    }

    if (!estimatedDuration) {
      Alert.alert(t.common?.error || 'Error', t.common?.selectDurationError || 'Select the estimated time for the service');
      return;
    }

    if (!selectedDate || !selectedTime) {
      Alert.alert(t.common?.error || 'Error', t.common?.selectDateTimeError || 'Select the available date and time for the service');
      return;
    }

    setSubmitting(true);
    try {
      // Separate parts and labor
      const partItems = validItems.filter(i => i.type === 'part');
      const laborItemsList = validItems.filter(i => i.type === 'service');

      const partsCost = partItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const laborCost = laborItemsList.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

      // Build partsList for backend (FDACS compliant)
      const partsList = validItems.map(item => ({
        type: item.type === 'part' ? 'PART' : 'LABOR',
        description: item.description,
        brand: item.brand || undefined,
        partCode: item.partCode || undefined,
        partCondition: item.type === 'part' ? (item.partCondition || 'NEW') : undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        isNoCharge: item.isNoCharge || false,
      }));

      // Get vehicle odometer from request data
      const odometerReading = request?.vehicle?.mileage || undefined;

      await api.post('/quotes', {
        serviceRequestId: requestId,
        partsCost,
        laborCost,
        additionalFees: 0,
        taxAmount: 0, // Tax calculated by jurisdiction - can be set later
        partsList,
        laborDescription: laborDescription || undefined,
        estimatedHours: estimatedDuration ? parseFloat(estimatedDuration.replace(/[^\d.]/g, '')) || undefined : undefined,
        estimatedCompletionTime: estimatedDuration,
        availableDate: selectedDate || undefined,
        availableTime: selectedTime ? `${selectedDate}T${selectedTime}:00` : undefined,
        warrantyMonths: partsWarrantyMonths ? parseInt(partsWarrantyMonths) : undefined,
        warrantyMileage: warrantyMileage ? parseInt(warrantyMileage) : undefined,
        warrantyDescription: warrantyTerms || undefined,
        odometerReading: odometerReading || undefined,
        notes: notes || undefined,
      });

      setQuoteSubmitted(true);
      setShowQuoteModal(false);
      Alert.alert(
        `${t.common?.success || 'Success'}! ✅`,
        t.common?.quoteSentSuccess || 'Your quote was sent. The customer will be notified.',
        [{ text: t.common?.ok || 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      const msg = error.response?.data?.message || t.common?.quoteSentError || 'Could not send the quote. Please try again.';
      Alert.alert(t.common?.error || 'Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateDisplacementCost();
  };

  const getServiceTypeInfo = (type: string) => {
    const types: Record<string, { icon: string; color: string; bg: string; label: string }> = {
      SCHEDULED_MAINTENANCE: { icon: 'wrench', color: '#3b82f6', bg: '#dbeafe', label: t.common?.maintenance || 'Maintenance' },
      REPAIR: { icon: 'alert-circle', color: '#f97316', bg: '#ffedd5', label: t.common?.repair || 'Repair' },
      INSPECTION: { icon: 'shield-check', color: '#8b5cf6', bg: '#ede9fe', label: t.common?.inspection || 'Inspection' },
      DETAILING: { icon: 'car-wash', color: '#ec4899', bg: '#fce7f3', label: t.common?.detailing || 'Detailing' },
      ROADSIDE_SOS: { icon: 'car-emergency', color: '#ef4444', bg: '#fef2f2', label: t.common?.sos || 'SOS' },
    };
    return types[type] || { icon: 'car', color: '#6b7280', bg: '#f3f4f6', label: type };
  };

  const durationOptions = [
    { value: '30min', label: '30 min' },
    { value: '1h', label: '1 hora' },
    { value: '2h', label: '2 horas' },
    { value: '3h', label: '3 horas' },
    { value: '4h', label: '4 horas' },
    { value: '1d', label: '1 dia' },
    { value: '2d', label: '2 dias' },
    { value: '3d', label: '3+ dias' },
  ];

  const availableDates = [
    { value: '2024-02-15', label: 'Qui, 15 Fev' },
    { value: '2024-02-16', label: 'Sex, 16 Fev' },
    { value: '2024-02-17', label: 'Sáb, 17 Fev' },
    { value: '2024-02-19', label: 'Seg, 19 Fev' },
    { value: '2024-02-20', label: 'Ter, 20 Fev' },
  ];

  const availableTimes = [
    { value: '08:00', label: '08:00' },
    { value: '09:00', label: '09:00' },
    { value: '10:00', label: '10:00' },
    { value: '11:00', label: '11:00' },
    { value: '13:00', label: '13:00' },
    { value: '14:00', label: '14:00' },
    { value: '15:00', label: '15:00' },
    { value: '16:00', label: '16:00' },
  ];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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
        <Text style={styles.errorTitle}>{t.common?.requestNotFound || 'Request not found'}</Text>
      </View>
    );
  }

  const typeInfo = getServiceTypeInfo(request.serviceType);
  const isQuoteAccepted = request.status === 'accepted';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Success Banner */}
        {quoteSubmitted && (
          <View style={styles.successBanner}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
            <Text style={styles.successText}>{t.quote?.sentSuccessfully || 'Quote sent successfully!'}</Text>
          </View>
        )}

        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={[styles.typeIcon, { backgroundColor: typeInfo.bg }]}>
              <MaterialCommunityIcons name={typeInfo.icon as any} size={24} color={typeInfo.color} />
            </View>
            <View style={styles.headerInfo}>
              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: typeInfo.bg }]}>
                  <Text style={[styles.badgeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
                </View>
                {request.isUrgent && (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentBadgeText}>🚨 Urgente</Text>
                  </View>
                )}
              </View>
              <Text style={styles.requestNumber}>#{request.requestNumber}</Text>
            </View>
            <View style={styles.timeBox}>
              <Text style={styles.timeValue}>{request.expiresIn}</Text>
              <Text style={styles.timeLabel}>restantes</Text>
            </View>
          </View>

          <Text style={styles.title}>{request.title}</Text>
          <Text style={styles.description}>{request.description}</Text>

          {/* Preferred Schedule */}
          {(request.preferredDate || request.preferredTime) && (
            <View style={styles.preferredSchedule}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color="#1976d2" />
              <Text style={styles.preferredScheduleText}>
                Preferência: {request.preferredDate && formatDate(request.preferredDate)}
                {request.preferredTime && ` às ${request.preferredTime}`}
              </Text>
            </View>
          )}
        </View>

        {/* Service Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📍 {t.provider?.serviceLocation || 'Service Location'}</Text>
            <View style={[styles.locationTypeBadge, 
              request.serviceLocation.type === 'shop' ? styles.locationShop :
              request.serviceLocation.type === 'mobile' ? styles.locationMobile :
              styles.locationRoadside
            ]}>
              <MaterialCommunityIcons 
                name={request.serviceLocation.type === 'shop' ? 'store' : 
                      request.serviceLocation.type === 'mobile' ? 'home-map-marker' : 'car-emergency'} 
                size={14} 
                color={request.serviceLocation.type === 'shop' ? '#1976d2' : 
                       request.serviceLocation.type === 'mobile' ? '#10b981' : '#f59e0b'} 
              />
              <Text style={[styles.locationTypeText,
                request.serviceLocation.type === 'shop' ? { color: '#1976d2' } :
                request.serviceLocation.type === 'mobile' ? { color: '#10b981' } :
                { color: '#f59e0b' }
              ]}>
                {request.serviceLocation.type === 'shop' ? (t.provider?.atShop || 'At Shop') :
                 request.serviceLocation.type === 'mobile' ? (t.provider?.mobileService || 'Mobile Service') :
                 (t.provider?.roadsideAssist || 'Roadside Assist')}
              </Text>
            </View>
          </View>
          
          {request.serviceLocation.type !== 'shop' && request.serviceLocation.address && (
            <View style={styles.locationAddressRow}>
              <MaterialCommunityIcons name="map-marker" size={18} color="#6b7280" />
              <Text style={styles.locationAddress}>{request.serviceLocation.address}</Text>
            </View>
          )}
          
          {request.serviceLocation.type === 'shop' && (
            <Text style={styles.locationNote}>
              {t.provider?.customerWillCome || 'Customer will bring the vehicle to your shop'}
            </Text>
          )}
          
          {request.serviceLocation.type === 'roadside' && (
            <View style={styles.roadsideWarning}>
              <MaterialCommunityIcons name="alert-circle" size={16} color="#f59e0b" />
              <Text style={styles.roadsideWarningText}>
                {t.provider?.roadsideUrgent || 'Urgent roadside assistance - Customer is waiting'}
              </Text>
            </View>
          )}
          
          {request.serviceLocation.coordinates && request.serviceLocation.type !== 'shop' && (
            <View style={styles.navigationButtons}>
              <TouchableOpacity 
                style={[styles.openMapsBtn, { flex: 1, backgroundColor: '#4285F4' }]}
                onPress={() => {
                  const lat = request.serviceLocation.coordinates?.lat;
                  const lng = request.serviceLocation.coordinates?.lng;
                  const url = Platform.OS === 'ios' 
                    ? `maps://app?daddr=${lat},${lng}`
                    : `google.navigation:q=${lat},${lng}`;
                  Linking.openURL(url).catch(() => {
                    // Fallback to web Google Maps
                    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
                  });
                }}
              >
                <MaterialCommunityIcons name="google-maps" size={18} color="#fff" />
                <Text style={styles.openMapsText}>{Platform.OS === 'ios' ? 'Apple Maps' : 'Google Maps'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.openMapsBtn, { flex: 1, backgroundColor: '#33CCFF' }]}
                onPress={() => {
                  const lat = request.serviceLocation.coordinates?.lat;
                  const lng = request.serviceLocation.coordinates?.lng;
                  const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
                  Linking.openURL(url).catch(() => {
                    Alert.alert('Waze', 'Waze is not installed. Please install it from the App Store.');
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
            <Text style={styles.cardTitle}>👤 {t.common?.customer || 'Customer'}</Text>
            <View style={styles.ratingBadge}>
              <MaterialCommunityIcons name="star" size={14} color="#f59e0b" />
              <Text style={styles.ratingText}>{request.customer.rating}</Text>
              <Text style={styles.ratingCount}>({request.customer.totalRequests} {t.common?.requests || 'requests'})</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{request.customer.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={18} color="#6b7280" />
            <Text style={styles.infoText}>
              {request.customer.location} • {request.customer.distance}
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
                  <MaterialCommunityIcons name="lock" size={12} color="#f59e0b" />
                  <Text style={styles.hiddenPhoneLabel}>{t.provider?.availableAfterAccept || 'Available after acceptance'}</Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Chat with Customer Button */}
          <TouchableOpacity 
            style={styles.chatWithCustomerBtn}
            onPress={() => navigation.navigate('Chat', { 
              participant: { 
                id: request.customer.name.replace(/\s+/g, '-').toLowerCase(),
                name: request.customer.name,
              },
              requestId: request.id 
            })}
          >
            <MaterialCommunityIcons name="chat-outline" size={18} color="#1976d2" />
            <Text style={styles.chatWithCustomerText}>{t.provider?.chatWithCustomer || 'Chat with Customer'}</Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Card - Enhanced */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚗 {t.common?.vehicle || 'Vehicle'}</Text>
          
          {/* Main Vehicle Info */}
          <View style={styles.vehicleMain}>
            <View style={styles.vehicleIconContainer}>
              <MaterialCommunityIcons name="car-side" size={40} color="#1976d2" />
            </View>
            <View style={styles.vehicleMainInfo}>
              <Text style={styles.vehicleName}>
                {request.vehicle.make} {request.vehicle.model}
              </Text>
              <Text style={styles.vehicleYear}>{request.vehicle.year} • {request.vehicle.color}</Text>
            </View>
          </View>

          {/* Vehicle Details Grid */}
          <View style={styles.vehicleGrid}>
            <View style={styles.vehicleGridItem}>
              <MaterialCommunityIcons name="card-text" size={16} color="#6b7280" />
              <Text style={styles.vehicleGridLabel}>{t.vehicle?.plate || 'Plate'}</Text>
              <Text style={styles.vehicleGridValue}>{request.vehicle.plateNumber}</Text>
            </View>
            <View style={styles.vehicleGridItem}>
              <MaterialCommunityIcons name="speedometer" size={16} color="#6b7280" />
              <Text style={styles.vehicleGridLabel}>{t.vehicle?.mileage || 'Mileage'}</Text>
              <Text style={styles.vehicleGridValue}>{request.vehicle.mileage.toLocaleString()} km</Text>
            </View>
            <View style={styles.vehicleGridItem}>
              <MaterialCommunityIcons name="gas-station" size={16} color="#6b7280" />
              <Text style={styles.vehicleGridLabel}>{t.vehicle?.fuelType || 'Fuel'}</Text>
              <Text style={styles.vehicleGridValue}>{request.vehicle.fuelType}</Text>
            </View>
            <View style={styles.vehicleGridItem}>
              <MaterialCommunityIcons name="car-shift-pattern" size={16} color="#6b7280" />
              <Text style={styles.vehicleGridLabel}>{t.vehicle?.transmission || 'Transmission'}</Text>
              <Text style={styles.vehicleGridValue}>{request.vehicle.transmission}</Text>
            </View>
            <View style={styles.vehicleGridItem}>
              <MaterialCommunityIcons name="engine" size={16} color="#6b7280" />
              <Text style={styles.vehicleGridLabel}>{t.vehicle?.engine || 'Engine'}</Text>
              <Text style={styles.vehicleGridValue}>{request.vehicle.engine}</Text>
            </View>
            <View style={styles.vehicleGridItem}>
              <MaterialCommunityIcons name="barcode" size={16} color="#6b7280" />
              <Text style={styles.vehicleGridLabel}>VIN</Text>
              <Text style={[styles.vehicleGridValue, { fontSize: 11 }]} numberOfLines={1}>
                {request.vehicle.vin}
              </Text>
            </View>
          </View>

          {/* Last Service Info */}
          {request.vehicle.lastServiceDate && (
            <View style={styles.lastServiceBanner}>
              <MaterialCommunityIcons name="history" size={18} color="#1976d2" />
              <View style={styles.lastServiceInfo}>
                <Text style={styles.lastServiceTitle}>{t.vehicle?.lastService || 'Last Service'}</Text>
                <Text style={styles.lastServiceText}>
                  {formatDate(request.vehicle.lastServiceDate)} • {request.vehicle.lastServiceMileage?.toLocaleString()} km
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Competition Info */}
        <View style={styles.competitionCard}>
          <MaterialCommunityIcons name="account-group" size={24} color="#6b7280" />
          <View style={styles.competitionInfo}>
            <Text style={styles.competitionTitle}>
              {request.quotesCount} {t.provider?.providersSubmittedQuotes || 'provider(s) have already submitted quotes'}
            </Text>
            <Text style={styles.competitionSubtitle}>{t.provider?.beCompetitive || 'Be competitive to increase your chances!'}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Button */}
      {!quoteSubmitted && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.quoteButton}
            onPress={() => setShowQuoteModal(true)}
          >
            <MaterialCommunityIcons name="file-document-edit" size={22} color="#fff" />
            <Text style={styles.quoteButtonText}>{t.quote?.createQuote || 'Create Quote'}</Text>
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.quote?.createQuote || 'Create Quote'}</Text>
              <TouchableOpacity onPress={() => setShowQuoteModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Line Items Section */}
              <Text style={styles.sectionTitle}>{t.quote?.quoteItems || 'Quote Items'}</Text>
              
              {lineItems.map((item, index) => (
                <View key={item.id} style={styles.lineItemCard}>
                  <View style={styles.lineItemHeader}>
                    <View style={[
                      styles.lineItemTypeBadge,
                      { backgroundColor: item.type === 'part' ? '#dbeafe' : '#dcfce7' }
                    ]}>
                      <MaterialCommunityIcons 
                        name={item.type === 'part' ? 'cog' : 'account-wrench'} 
                        size={14} 
                        color={item.type === 'part' ? '#1976d2' : '#16a34a'} 
                      />
                      <Text style={[
                        styles.lineItemTypeText,
                        { color: item.type === 'part' ? '#1976d2' : '#16a34a' }
                      ]}>
                        {item.type === 'part' ? (t.quote?.parts || 'Part') : (t.quote?.services || 'Service')}
                      </Text>
                    </View>
                    {lineItems.length > 1 && (
                      <TouchableOpacity onPress={() => removeLineItem(item.id)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TextInput
                    style={styles.lineItemInput}
                    placeholder={item.type === 'part' ? (t.common?.partExample || 'Ex: Motor Oil 5W30 Synthetic') : (t.common?.serviceExample || 'Ex: Oil change labor')}
                    value={item.description}
                    onChangeText={(text) => updateLineItem(item.id, 'description', text)}
                  />

                  {/* Brand field - only for parts */}
                  {item.type === 'part' && (
                    <TextInput
                      style={[styles.lineItemInput, styles.brandInput]}
                      placeholder={t.quote?.brandPlaceholder || 'Brand (e.g., Mobil, Castrol, ACDelco)'}
                      value={item.brand || ''}
                      onChangeText={(text) => updateLineItem(item.id, 'brand', text)}
                    />
                  )}

                  <View style={styles.lineItemRow}>
                    <View style={styles.lineItemQuantity}>
                      <Text style={styles.lineItemLabel}>{t.quote?.quantity || 'Qty'}</Text>
                      <TextInput
                        style={styles.lineItemSmallInput}
                        keyboardType="number-pad"
                        value={item.quantity.toString()}
                        onChangeText={(text) => updateLineItem(item.id, 'quantity', parseInt(text) || 1)}
                      />
                    </View>
                    <View style={styles.lineItemPrice}>
                      <Text style={styles.lineItemLabel}>{t.quote?.unitPrice || 'Unit Price'} ($)</Text>
                      <TextInput
                        style={styles.lineItemSmallInput}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        value={item.unitPrice > 0 ? item.unitPrice.toString() : ''}
                        onChangeText={(text) => updateLineItem(item.id, 'unitPrice', parseFloat(text) || 0)}
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
                  onPress={() => addLineItem('part')}
                >
                  <MaterialCommunityIcons name="plus-circle" size={18} color="#1976d2" />
                  <Text style={styles.addItemButtonText}>{t.quote?.addPart || 'Add Part'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.addItemButton}
                  onPress={() => addLineItem('service')}
                >
                  <MaterialCommunityIcons name="plus-circle" size={18} color="#16a34a" />
                  <Text style={[styles.addItemButtonText, { color: '#16a34a' }]}>{t.quote?.addService || 'Add Service'}</Text>
                </TouchableOpacity>
              </View>

              {/* Duration */}
              <Text style={styles.sectionTitle}>{t.quote?.estimatedDuration || 'Estimated Duration'} *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.durationScroll}
              >
                {durationOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.durationOption,
                      estimatedDuration === option.value && styles.durationOptionActive,
                    ]}
                    onPress={() => setEstimatedDuration(option.value)}
                  >
                    <Text
                      style={[
                        styles.durationOptionText,
                        estimatedDuration === option.value && styles.durationOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Date & Time Scheduling */}
              <Text style={styles.sectionTitle}>{t.quote?.scheduling || 'Scheduling'} *</Text>
              
              <Text style={styles.subSectionTitle}>{t.quote?.date || 'Date'}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.dateScroll}
              >
                {availableDates.map(date => (
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
                        selectedDate === date.value && styles.dateOptionTextActive,
                      ]}
                    >
                      {date.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.subSectionTitle}>{t.quote?.time || 'Time'}</Text>
              <View style={styles.timeGrid}>
                {availableTimes.map(time => (
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
                        selectedTime === time.value && styles.timeOptionTextActive,
                      ]}
                    >
                      {time.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes */}
              <Text style={styles.sectionTitle}>{t.quote?.notes || 'Notes'} ({t.common?.optional || 'optional'})</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t.quote?.notesPlaceholder || "Additional information, special conditions..."}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={notes}
                onChangeText={setNotes}
              />

              {/* Mobile Service / Displacement Section */}
              <Text style={styles.sectionTitle}>{t.quote?.mobileService || 'Mobile Service'}</Text>
              <View style={styles.mobileServiceContainer}>
                <View style={styles.mobileServiceToggle}>
                  <View style={styles.mobileServiceInfo}>
                    <MaterialCommunityIcons name="truck" size={24} color="#374151" />
                    <View style={styles.mobileServiceTextContainer}>
                      <Text style={styles.mobileServiceLabel}>{t.quote?.serviceAtLocation || 'Service at Location'}</Text>
                      <Text style={styles.mobileServiceDescription}>
                        {t.quote?.serviceAtLocationDesc || 'I will go to the customer to perform the service'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isMobileService}
                    onValueChange={setIsMobileService}
                    trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                    thumbColor={isMobileService ? '#1976d2' : '#fff'}
                  />
                </View>

                {isMobileService && request && (
                  <View style={styles.displacementDetails}>
                    {/* Distance and radius info */}
                    <View style={styles.displacementRow}>
                      <View style={styles.displacementItem}>
                        <MaterialCommunityIcons name="map-marker-distance" size={20} color="#6b7280" />
                        <View>
                          <Text style={styles.displacementLabel}>{t.quote?.customerDistance || 'Customer Distance'}</Text>
                          <Text style={styles.displacementValue}>{request.customer.distance}</Text>
                        </View>
                      </View>
                      <View style={styles.displacementItem}>
                        <MaterialCommunityIcons name="map-marker-radius" size={20} color="#6b7280" />
                        <View>
                          <Text style={styles.displacementLabel}>{t.quote?.freeRadius || 'Free Radius'}</Text>
                          <Text style={styles.displacementValue}>{providerFreeKm} km</Text>
                        </View>
                      </View>
                    </View>

                    {/* Cost calculation */}
                    <View style={styles.displacementCostCard}>
                      {calculateDisplacementCost() > 0 ? (
                        <>
                          <View style={styles.displacementCostRow}>
                            <Text style={styles.displacementCostLabel}>{t.quote?.costPerKm || 'Cost per extra km'}</Text>
                            <Text style={styles.displacementCostValue}>${providerCostPerKm.toFixed(2)}/km</Text>
                          </View>
                          <View style={styles.displacementCostRow}>
                            <Text style={styles.displacementCostLabel}>{t.quote?.additionalDistance || 'Additional distance'}</Text>
                            <Text style={styles.displacementCostValue}>
                              {(parseFloat(request.customer.distance.replace(/[^\d.]/g, '')) - providerFreeKm).toFixed(1)} km
                            </Text>
                          </View>
                          <View style={[styles.displacementCostRow, styles.displacementTotalRow]}>
                            <Text style={styles.displacementTotalLabel}>{t.quote?.displacementCost || 'Displacement Cost'}</Text>
                            <Text style={styles.displacementTotalValue}>${calculateDisplacementCost().toFixed(2)}</Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.noDisplacementCharge}>
                          <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
                          <Text style={styles.noDisplacementText}>
                            {t.quote?.includedInRadius || 'Within free radius - No displacement charge'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* Warranty Section */}
              <Text style={styles.sectionTitle}>{t.quote?.warranty || 'Warranty / Guarantee'}</Text>
              <View style={styles.warrantyContainer}>
                <View style={styles.warrantyRow}>
                  <View style={styles.warrantyField}>
                    <Text style={styles.warrantyLabel}>{t.quote?.partsWarranty || 'Parts Warranty'}</Text>
                    <View style={styles.warrantyInputRow}>
                      <TextInput
                        style={styles.warrantyInput}
                        value={partsWarrantyMonths}
                        onChangeText={setPartsWarrantyMonths}
                        keyboardType="numeric"
                        placeholder="3"
                      />
                      <Text style={styles.warrantyUnit}>{t.quote?.months || 'months'}</Text>
                    </View>
                  </View>
                  <View style={styles.warrantyField}>
                    <Text style={styles.warrantyLabel}>{t.quote?.serviceWarranty || 'Service Warranty'}</Text>
                    <View style={styles.warrantyInputRow}>
                      <TextInput
                        style={styles.warrantyInput}
                        value={serviceWarrantyDays}
                        onChangeText={setServiceWarrantyDays}
                        keyboardType="numeric"
                        placeholder="90"
                      />
                      <Text style={styles.warrantyUnit}>{t.quote?.days || 'days'}</Text>
                    </View>
                  </View>
                </View>
                {/* FDACS Req #6: Warranty Mileage */}
                <Text style={styles.warrantySubLabel}>{t.quote?.warrantyMileage || 'Warranty Mileage'}</Text>
                <View style={styles.warrantyInputRow}>
                  <TextInput
                    style={[styles.warrantyInput, { flex: 1 }]}
                    value={warrantyMileage}
                    onChangeText={setWarrantyMileage}
                    keyboardType="numeric"
                    placeholder="12000"
                  />
                  <Text style={styles.warrantyUnit}>{t.quote?.miles || 'miles'}</Text>
                </View>
                <Text style={styles.warrantySubLabel}>{t.quote?.warrantyTerms || 'Warranty Terms'} ({t.common?.optional || 'optional'})</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t.quote?.warrantyTermsPlaceholder || "Specific warranty conditions, exclusions, etc..."}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  value={warrantyTerms}
                  onChangeText={setWarrantyTerms}
                />
              </View>

              {/* Total */}
              <View style={styles.totalContainer}>
                <View>
                  <Text style={styles.totalLabel}>{t.quote?.subtotal || 'Subtotal'}</Text>
                  <Text style={styles.totalItems}>
                    {lineItems.filter(i => i.description && i.unitPrice > 0).length} item(s)
                  </Text>
                </View>
                <Text style={styles.totalValue}>${calculateSubtotal().toFixed(2)}</Text>
              </View>

              {/* Show displacement cost if mobile service is enabled */}
              {isMobileService && calculateDisplacementCost() > 0 && (
                <View style={styles.displacementTotalContainer}>
                  <View>
                    <Text style={styles.displacementTotalLabelSmall}>{t.quote?.displacementCost || 'Displacement Cost'}</Text>
                  </View>
                  <Text style={styles.displacementTotalValueSmall}>+ ${calculateDisplacementCost().toFixed(2)}</Text>
                </View>
              )}

              {/* Grand Total */}
              <View style={styles.grandTotalContainer}>
                <View>
                  <Text style={styles.grandTotalLabel}>{t.quote?.grandTotal || 'Grand Total'}</Text>
                  {isMobileService && calculateDisplacementCost() > 0 && (
                    <Text style={styles.grandTotalNote}>({t.quote?.totalWithDisplacement || 'Total with Displacement'})</Text>
                  )}
                </View>
                <Text style={styles.grandTotalValue}>${calculateTotal().toFixed(2)}</Text>
              </View>

              <View style={styles.commissionNote}>
                <MaterialCommunityIcons name="information" size={16} color="#6b7280" />
                <Text style={styles.commissionText}>
                  {t.quote?.commissionNote || 'Platform commission (10%) will be deducted from final amount'}
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitQuote}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>{t.quote?.sendQuote || 'Send Quote'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
    padding: 12,
    gap: 8,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
  },
  headerCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
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
    fontWeight: '600',
  },
  urgentBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  requestNumber: {
    fontSize: 13,
    color: '#9ca3af',
  },
  timeBox: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
  },
  timeLabel: {
    fontSize: 10,
    color: '#92400e',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
  },
  preferredSchedule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  preferredScheduleText: {
    fontSize: 13,
    color: '#1976d2',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  ratingCount: {
    fontSize: 12,
    color: '#9ca3af',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    color: '#4b5563',
    flex: 1,
  },
  hiddenPhone: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hiddenPhoneText: {
    fontSize: 15,
    color: '#9ca3af',
    letterSpacing: 2,
  },
  hiddenPhoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  hiddenPhoneLabel: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '500',
  },
  chatWithCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  chatWithCustomerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },
  vehicleMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleMainInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  vehicleYear: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleGridItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  vehicleGridLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  vehicleGridValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  lastServiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
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
    color: '#1976d2',
    fontWeight: '600',
  },
  lastServiceText: {
    fontSize: 13,
    color: '#3b82f6',
  },
  competitionCard: {
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  competitionInfo: {
    flex: 1,
  },
  competitionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  competitionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quoteButton: {
    backgroundColor: '#1976d2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  quoteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 16,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
    marginTop: 12,
  },
  lineItemCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lineItemTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  lineItemTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lineItemInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 10,
  },
  brandInput: {
    borderColor: '#dbeafe',
    backgroundColor: '#f8fafc',
  },
  lineItemRow: {
    flexDirection: 'row',
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
    alignItems: 'flex-end',
  },
  lineItemLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  lineItemSmallInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1f2937',
    textAlign: 'center',
  },
  lineItemSubtotalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 8,
  },
  addItemButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  addItemButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    gap: 6,
  },
  addItemButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1976d2',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  durationScroll: {
    marginBottom: 8,
  },
  durationOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 10,
  },
  durationOptionActive: {
    backgroundColor: '#1976d2',
  },
  durationOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  durationOptionTextActive: {
    color: '#fff',
  },
  dateScroll: {
    marginBottom: 8,
  },
  dateOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    marginRight: 10,
  },
  dateOptionActive: {
    backgroundColor: '#1976d2',
  },
  dateOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  dateOptionTextActive: {
    color: '#fff',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    minWidth: 70,
    alignItems: 'center',
  },
  timeOptionActive: {
    backgroundColor: '#1976d2',
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  timeOptionTextActive: {
    color: '#fff',
  },
  totalContainer: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  totalLabel: {
    fontSize: 15,
    color: '#1e40af',
    fontWeight: '600',
  },
  totalItems: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 2,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  commissionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  commissionText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  displacementTotalContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  displacementTotalLabelSmall: {
    fontSize: 13,
    color: '#0369a1',
    fontWeight: '500',
  },
  displacementTotalValueSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
  },
  grandTotalContainer: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  grandTotalLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  grandTotalNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  grandTotalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Warranty styles
  warrantySection: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  warrantyContainer: {
    backgroundColor: '#fefce8',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  warrantyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warrantyRow: {
    flexDirection: 'row',
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
    fontWeight: '600',
    color: '#854d0e',
    marginBottom: 6,
  },
  warrantySubLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#a16207',
    marginBottom: 6,
    marginTop: 4,
  },
  warrantyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warrantyInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#713f12',
    width: 60,
    textAlign: 'center',
  },
  warrantyUnit: {
    fontSize: 13,
    color: '#a16207',
    fontWeight: '500',
  },
  warrantySelect: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#78350f',
  },
  warrantyOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#fffbeb',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  warrantyOptionActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  warrantyOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400e',
  },
  warrantyOptionTextActive: {
    color: '#fff',
  },
  warrantyTermsInput: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#78350f',
    height: 70,
    textAlignVertical: 'top',
  },
  // Mobile Service / Displacement styles
  mobileServiceContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  mobileServiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileServiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mobileServiceTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  mobileServiceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0c4a6e',
  },
  mobileServiceDescription: {
    fontSize: 12,
    color: '#0369a1',
    marginTop: 2,
  },
  displacementDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#bae6fd',
  },
  displacementRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  displacementItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  displacementLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  displacementValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0c4a6e',
  },
  displacementCostCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  displacementCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  displacementCostLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  displacementCostValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  displacementTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
    paddingTop: 12,
  },
  displacementTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
  },
  displacementTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369a1',
  },
  noDisplacementCharge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noDisplacementText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  // Service Location Card styles
  locationTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationShop: {
    backgroundColor: '#eff6ff',
  },
  locationMobile: {
    backgroundColor: '#ecfdf5',
  },
  locationRoadside: {
    backgroundColor: '#fffbeb',
  },
  locationTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  locationAddress: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  locationNote: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  roadsideWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  roadsideWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    borderRadius: 10,
  },
  openMapsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
