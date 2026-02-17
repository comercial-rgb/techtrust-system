/**
 * ProviderServicesScreen - Manage Services, Vehicle Types & Parts
 * Persists to backend via PATCH /providers/profile
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';
import api from '../../services/api';

// ─── Service definitions aligned with ServiceOffered enum ───
// Updated per Mobile App Service & Diagnostic Tree — Feb 2026
interface ServiceDef {
  key: string;       // matches ServiceOffered enum value
  nameKey: string;
  icon: string;
  category: 'maintenance' | 'repairs' | 'fluids' | 'packages' | 'inspection' | 'detailing' | 'sos';
  descriptionKey?: string;
}

const SERVICE_DEFINITIONS: ServiceDef[] = [
  // Maintenance
  { key: 'OIL_CHANGE', nameKey: 'oilChange', icon: 'oil', category: 'maintenance' },
  { key: 'AIR_FILTER', nameKey: 'airFilter', icon: 'air-filter', category: 'maintenance' },
  { key: 'FUEL_SYSTEM', nameKey: 'fuelSystem', icon: 'gas-station', category: 'maintenance' },
  { key: 'BRAKES', nameKey: 'brakes', icon: 'car-brake-alert', category: 'maintenance' },
  { key: 'COOLING_SYSTEM', nameKey: 'coolingSystem', icon: 'coolant-temperature', category: 'maintenance' },
  { key: 'TIRES', nameKey: 'tires', icon: 'tire', category: 'maintenance' },
  { key: 'BELTS_HOSES', nameKey: 'beltsHoses', icon: 'connection', category: 'maintenance' },
  // Repairs
  { key: 'AC_SERVICE', nameKey: 'airConditioning', icon: 'air-conditioner', category: 'repairs' },
  { key: 'STEERING', nameKey: 'steeringSuspension', icon: 'steering', category: 'repairs' },
  { key: 'ELECTRICAL_BASIC', nameKey: 'electricalSystem', icon: 'flash', category: 'repairs' },
  { key: 'EXHAUST', nameKey: 'exhaust', icon: 'pipe-leak', category: 'repairs' },
  { key: 'DRIVETRAIN', nameKey: 'drivetrain', icon: 'cog-transfer', category: 'repairs' },
  { key: 'ENGINE', nameKey: 'engine', icon: 'engine', category: 'repairs' },
  { key: 'TRANSMISSION', nameKey: 'transmission', icon: 'car-shift-pattern', category: 'repairs' },
  { key: 'BATTERY', nameKey: 'battery', icon: 'car-battery', category: 'repairs' },
  { key: 'GENERAL_REPAIR', nameKey: 'generalRepair', icon: 'wrench', category: 'repairs' },
  // Fluid Services
  { key: 'FLUID_SERVICES', nameKey: 'fluidServices', icon: 'water', category: 'fluids' },
  // Preventive Packages
  { key: 'PREVENTIVE_PACKAGES', nameKey: 'preventiveMaintenance', icon: 'package-variant-closed-check', category: 'packages' },
  // Inspection & Diagnostics
  { key: 'INSPECTION', nameKey: 'vehicleInspection', icon: 'clipboard-check', category: 'inspection' },
  { key: 'DIAGNOSTICS', nameKey: 'diagnostics', icon: 'stethoscope', category: 'inspection' },
  // Detailing
  { key: 'DETAILING', nameKey: 'detailing', icon: 'car-wash', category: 'detailing' },
  // SOS / Roadside
  { key: 'ROADSIDE_ASSIST', nameKey: 'roadsideAssistance', icon: 'tow-truck', category: 'sos', descriptionKey: 'roadsideAssistance' },
  { key: 'TOWING', nameKey: 'towing', icon: 'tow-truck', category: 'sos', descriptionKey: 'towing' },
  { key: 'LOCKOUT', nameKey: 'autoLocksmith', icon: 'key-variant', category: 'sos', descriptionKey: 'autoLocksmith' },
];

// ─── Vehicle type definitions aligned with VehicleTypeServed enum ───
interface VehicleTypeDef {
  key: string;
  label: string;
  icon: string;
}

const VEHICLE_TYPES: VehicleTypeDef[] = [
  { key: 'CAR', label: 'Car / Sedan', icon: 'car-side' },
  { key: 'SUV', label: 'SUV / Crossover', icon: 'car-estate' },
  { key: 'TRUCK', label: 'Pickup Truck', icon: 'truck' },
  { key: 'VAN', label: 'Van / Minivan', icon: 'van-utility' },
  { key: 'HEAVY_TRUCK', label: 'Heavy Truck / Semi', icon: 'truck-trailer' },
  { key: 'BUS', label: 'Bus / RV', icon: 'bus' },
];

const CATEGORIES = [
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'repairs', label: 'Repairs' },
  { key: 'fluids', label: 'Fluid Services' },
  { key: 'packages', label: 'Preventive Packages' },
  { key: 'inspection', label: 'Inspection & Diagnostics' },
  { key: 'detailing', label: 'Detailing' },
  { key: 'sos', label: 'Roadside / SOS' },
] as const;

export default function ProviderServicesScreen({ navigation }: any) {
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabledServices, setEnabledServices] = useState<Set<string>>(new Set());
  const [enabledVehicleTypes, setEnabledVehicleTypes] = useState<Set<string>>(new Set());
  const [sellsParts, setSellsParts] = useState(false);

  // ─── Load current profile on focus ───
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/providers/dashboard');
      const profile = response.data?.data?.profile;
      if (profile) {
        // Services
        const services = Array.isArray(profile.servicesOffered) ? profile.servicesOffered : [];
        setEnabledServices(new Set(services.map((s: string) => s.toUpperCase())));
        // Vehicle types
        const vehicles = Array.isArray(profile.vehicleTypesServed) ? profile.vehicleTypesServed : [];
        setEnabledVehicleTypes(new Set(vehicles.map((v: string) => v.toUpperCase())));
        // Parts
        setSellsParts(profile.sellsParts || false);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Toggle handlers ───
  const toggleService = useCallback((key: string) => {
    setEnabledServices(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleVehicleType = useCallback((key: string) => {
    setEnabledVehicleTypes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleSelectAllServices = useCallback(() => {
    setEnabledServices(prev => {
      if (prev.size === SERVICE_DEFINITIONS.length) return new Set();
      return new Set(SERVICE_DEFINITIONS.map(s => s.key));
    });
  }, []);

  const toggleSelectAllVehicles = useCallback(() => {
    setEnabledVehicleTypes(prev => {
      if (prev.size === VEHICLE_TYPES.length) return new Set();
      return new Set(VEHICLE_TYPES.map(v => v.key));
    });
  }, []);

  // ─── Save to API ───
  const handleSave = async () => {
    if (enabledServices.size === 0) {
      Alert.alert(
        t.common?.attention || 'Attention',
        t.provider?.selectAtLeastOneService || 'Please select at least one service.',
      );
      return;
    }
    if (enabledVehicleTypes.size === 0) {
      Alert.alert(
        t.common?.attention || 'Attention',
        t.provider?.selectAtLeastOneVehicle || 'Please select at least one vehicle type.',
      );
      return;
    }

    try {
      setSaving(true);
      await api.patch('/providers/profile', {
        servicesOffered: Array.from(enabledServices),
        vehicleTypesServed: Array.from(enabledVehicleTypes),
        sellsParts,
      });
      Alert.alert(
        t.common?.success || 'Success',
        t.provider?.servicesUpdated || 'Your services and capabilities have been updated!',
      );
      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert(
        t.common?.error || 'Error',
        error?.response?.data?.message || 'Failed to save. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── i18n helpers ───
  const getServiceName = (nameKey: string) => {
    const names: Record<string, string> = {
      oilChange: t.serviceTypes?.oilChange || 'Oil Change',
      brakes: t.serviceTypes?.brakes || 'Brakes',
      tires: t.serviceTypes?.tires || 'Tires',
      suspension: t.serviceTypes?.suspension || 'Suspension',
      maintenanceLight: t.serviceTypes?.maintenanceLight || 'Maintenance / Warning Light',
      engine: t.serviceTypes?.engine || 'Engine',
      transmission: t.serviceTypes?.transmission || 'Transmission',
      electricalSystem: t.serviceTypes?.electricalSystem || 'Electrical System',
      airConditioning: t.serviceTypes?.airConditioning || 'Air Conditioning',
      generalRepair: t.serviceTypes?.generalRepair || 'General Repair',
      battery: t.serviceTypes?.battery || 'Battery',
      vehicleInspection: t.serviceTypes?.vehicleInspection || 'Vehicle Inspection',
      diagnostics: t.serviceTypes?.diagnostics || 'Diagnostics',
      detailing: t.serviceTypes?.detailing || 'Detailing / Car Wash',
      roadsideAssistance: t.serviceTypes?.roadsideAssistance || 'Roadside Assistance',
      towing: t.serviceTypes?.towing || 'Towing',
      autoLocksmith: t.serviceTypes?.autoLocksmith || 'Auto Locksmith / Lockout',
    };
    return names[nameKey] || nameKey;
  };

  const getCategoryLabel = (key: string) => {
    const labels: Record<string, string> = {
      maintenance: t.serviceTypes?.categoryMaintenance || 'Maintenance',
      repairs: t.serviceTypes?.categoryRepairs || 'Repairs',
      inspection: t.serviceTypes?.categoryInspection || 'Inspection & Diagnostics',
      detailing: t.serviceTypes?.categoryDetailing || 'Detailing',
      sos: t.serviceTypes?.categorySOS || 'Roadside / SOS',
    };
    return labels[key] || key;
  };

  const getDescription = (key: string) => {
    const descriptions: Record<string, string> = {
      roadsideAssistance: t.serviceTypes?.roadsideAssistanceDesc || 'Emergency roadside help',
      towing: t.serviceTypes?.towingDesc || 'Vehicle towing & wrecker service',
      autoLocksmith: t.serviceTypes?.autoLocksmithDesc || 'Vehicle lockout & key service',
    };
    return descriptions[key];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>{t.common?.loading || 'Loading...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.provider?.servicesOffered || 'My Capabilities'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#1976d2" />
          ) : (
            <Text style={styles.saveBtn}>{t.common?.save || 'Save'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
        <Text style={styles.statsText}>
          {enabledServices.size} {t.common?.services || 'services'} · {enabledVehicleTypes.size} {t.common?.vehicleTypes || 'vehicle types'} · {sellsParts ? (t.common?.sellsParts || 'sells parts') : (t.common?.noPartsOnly || 'no parts sales')}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ━━━━━━━ SECTION 1: Services Offered ━━━━━━━ */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <MaterialCommunityIcons name="wrench" size={20} color="#1976d2" />
            <Text style={styles.sectionTitle}>{t.provider?.servicesYouOffer || 'Services You Offer'}</Text>
          </View>
          <TouchableOpacity onPress={toggleSelectAllServices}>
            <Text style={styles.selectAllText}>
              {enabledServices.size === SERVICE_DEFINITIONS.length
                ? (t.common?.deselectAll || 'Deselect All')
                : (t.common?.selectAll || 'Select All')}
            </Text>
          </TouchableOpacity>
        </View>

        {CATEGORIES.map(cat => {
          const catServices = SERVICE_DEFINITIONS.filter(s => s.category === cat.key);
          if (catServices.length === 0) return null;
          return (
            <View key={cat.key} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{getCategoryLabel(cat.key)}</Text>
              <View style={styles.card}>
                {catServices.map((service, index) => (
                  <View
                    key={service.key}
                    style={[
                      styles.serviceItem,
                      index < catServices.length - 1 && styles.itemBorder,
                    ]}
                  >
                    <View style={[
                      styles.iconBox,
                      { backgroundColor: enabledServices.has(service.key) ? '#dbeafe' : '#f3f4f6' },
                    ]}>
                      <MaterialCommunityIcons
                        name={service.icon as any}
                        size={22}
                        color={enabledServices.has(service.key) ? '#1976d2' : '#9ca3af'}
                      />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={[
                        styles.itemName,
                        !enabledServices.has(service.key) && styles.itemNameDisabled,
                      ]}>
                        {getServiceName(service.nameKey)}
                      </Text>
                      {service.descriptionKey && (
                        <Text style={styles.itemDescription}>
                          {getDescription(service.descriptionKey)}
                        </Text>
                      )}
                    </View>
                    <Switch
                      value={enabledServices.has(service.key)}
                      onValueChange={() => toggleService(service.key)}
                      trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                      thumbColor={enabledServices.has(service.key) ? '#1976d2' : '#9ca3af'}
                    />
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* ━━━━━━━ SECTION 2: Vehicle Types ━━━━━━━ */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <View style={styles.sectionHeaderLeft}>
            <MaterialCommunityIcons name="car-multiple" size={20} color="#1976d2" />
            <Text style={styles.sectionTitle}>{t.provider?.vehicleTypesServed || 'Vehicle Types You Serve'}</Text>
          </View>
          <TouchableOpacity onPress={toggleSelectAllVehicles}>
            <Text style={styles.selectAllText}>
              {enabledVehicleTypes.size === VEHICLE_TYPES.length
                ? (t.common?.deselectAll || 'Deselect All')
                : (t.common?.selectAll || 'Select All')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.vehicleGrid}>
          {VEHICLE_TYPES.map(vt => {
            const isActive = enabledVehicleTypes.has(vt.key);
            return (
              <TouchableOpacity
                key={vt.key}
                style={[styles.vehicleCard, isActive && styles.vehicleCardActive]}
                onPress={() => toggleVehicleType(vt.key)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={vt.icon as any}
                  size={28}
                  color={isActive ? '#1976d2' : '#9ca3af'}
                />
                <Text style={[styles.vehicleLabel, isActive && styles.vehicleLabelActive]}>
                  {vt.label}
                </Text>
                {isActive && (
                  <View style={styles.vehicleCheck}>
                    <MaterialCommunityIcons name="check-circle" size={18} color="#1976d2" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ━━━━━━━ SECTION 3: Parts Sales ━━━━━━━ */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <View style={styles.sectionHeaderLeft}>
            <MaterialCommunityIcons name="package-variant" size={20} color="#1976d2" />
            <Text style={styles.sectionTitle}>{t.provider?.partsSales || 'Parts Sales'}</Text>
          </View>
        </View>

        <View style={styles.partsCard}>
          <View style={styles.partsContent}>
            <View style={[styles.iconBox, { backgroundColor: sellsParts ? '#dbeafe' : '#f3f4f6' }]}>
              <MaterialCommunityIcons
                name="package-variant-closed"
                size={24}
                color={sellsParts ? '#1976d2' : '#9ca3af'}
              />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>
                {t.provider?.iSellParts || 'I sell auto parts'}
              </Text>
              <Text style={styles.itemDescription}>
                {t.provider?.partsDescription || 'Enable to receive "Parts Only" requests from customers looking to buy parts without labor service.'}
              </Text>
            </View>
            <Switch
              value={sellsParts}
              onValueChange={setSellsParts}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
              thumbColor={sellsParts ? '#1976d2' : '#9ca3af'}
            />
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            {t.provider?.capabilitiesBannerInfo || 'You will only receive service requests that match your selected services, vehicle types, and parts capabilities. Keep your selections up to date to receive relevant requests.'}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    padding: 8,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 12,
    gap: 8,
  },
  statsText: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '500',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1976d2',
  },
  categorySection: {
    padding: 16,
    paddingBottom: 0,
    paddingTop: 8,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  itemNameDisabled: {
    color: '#9ca3af',
  },
  itemDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    lineHeight: 16,
  },
  // Vehicle Types
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  vehicleCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    gap: 6,
    position: 'relative',
  },
  vehicleCardActive: {
    borderColor: '#1976d2',
    backgroundColor: '#eff6ff',
  },
  vehicleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  vehicleLabelActive: {
    color: '#1976d2',
  },
  vehicleCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  // Parts
  partsCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  partsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#dbeafe',
    margin: 16,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});
