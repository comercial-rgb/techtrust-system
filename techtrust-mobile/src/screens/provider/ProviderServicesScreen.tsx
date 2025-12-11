/**
 * ProviderServicesScreen - Serviços Oferecidos
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';

interface Service {
  id: string;
  name: string;
  icon: string;
  category: string;
  enabled: boolean;
  description?: string;
  nameKey: string;
  categoryKey: string;
  descriptionKey?: string;
}

export default function ProviderServicesScreen({ navigation }: any) {
  const { t } = useI18n();
  
  const getServiceName = (key: string) => {
    const names: Record<string, string> = {
      oilChange: t.serviceTypes?.oilChange || 'Oil Change',
      alignmentBalancing: t.serviceTypes?.alignmentBalancing || 'Alignment & Balancing',
      brakes: t.serviceTypes?.brakes || 'Brakes',
      suspension: t.serviceTypes?.suspension || 'Suspension',
      engine: t.serviceTypes?.engine || 'Engine',
      transmission: t.serviceTypes?.transmission || 'Transmission',
      electricalSystem: t.serviceTypes?.electricalSystem || 'Electrical System',
      airConditioning: t.serviceTypes?.airConditioning || 'Air Conditioning',
      diagnostics: t.serviceTypes?.diagnostics || 'Diagnostics',
      vehicleInspection: t.serviceTypes?.vehicleInspection || 'Vehicle Inspection',
      fullWash: t.serviceTypes?.fullWash || 'Full Wash',
      polishing: t.serviceTypes?.polishing || 'Polishing',
      roadsideAssistance: t.serviceTypes?.roadsideAssistance || 'Roadside Assistance',
      outOfGas: t.serviceTypes?.outOfGas || 'Out of Gas',
      tireChange: t.serviceTypes?.tireChange || 'Tire Change',
      towing: t.serviceTypes?.towing || 'Towing',
      batteryCharge: t.serviceTypes?.batteryCharge || 'Battery Charge',
      autoLocksmith: t.serviceTypes?.autoLocksmith || 'Auto Locksmith',
    };
    return names[key] || key;
  };

  const getCategoryName = (key: string) => {
    const categories: Record<string, string> = {
      maintenance: t.serviceTypes?.categoryMaintenance || 'Maintenance',
      repairs: t.serviceTypes?.categoryRepairs || 'Repairs',
      inspection: t.serviceTypes?.categoryInspection || 'Inspection',
      detailing: t.serviceTypes?.categoryDetailing || 'Detailing',
      sos: t.serviceTypes?.categorySOS || 'SOS',
    };
    return categories[key] || key;
  };

  const getDescription = (key: string) => {
    const descriptions: Record<string, string> = {
      roadsideAssistance: t.serviceTypes?.roadsideAssistanceDesc || 'Roadside assistance, towing, out of gas, tire change',
      outOfGas: t.serviceTypes?.outOfGasDesc || 'Emergency fuel delivery',
      tireChange: t.serviceTypes?.tireChangeDesc || 'Flat tire change on the road',
      towing: t.serviceTypes?.towingDesc || 'Towing and wrecker service',
      batteryCharge: t.serviceTypes?.batteryChargeDesc || 'Recharge or replace dead battery',
      autoLocksmith: t.serviceTypes?.autoLocksmithDesc || 'Vehicle opening, key copy',
    };
    return descriptions[key];
  };

  const [services, setServices] = useState<Service[]>([
    { id: '1', nameKey: 'oilChange', name: '', icon: 'oil', category: '', categoryKey: 'maintenance', enabled: true },
    { id: '2', nameKey: 'alignmentBalancing', name: '', icon: 'tire', category: '', categoryKey: 'maintenance', enabled: true },
    { id: '3', nameKey: 'brakes', name: '', icon: 'car-brake-abs', category: '', categoryKey: 'maintenance', enabled: true },
    { id: '4', nameKey: 'suspension', name: '', icon: 'car-traction-control', category: '', categoryKey: 'maintenance', enabled: true },
    { id: '5', nameKey: 'engine', name: '', icon: 'engine', category: '', categoryKey: 'repairs', enabled: true },
    { id: '6', nameKey: 'transmission', name: '', icon: 'car-shift-pattern', category: '', categoryKey: 'repairs', enabled: false },
    { id: '7', nameKey: 'electricalSystem', name: '', icon: 'flash', category: '', categoryKey: 'repairs', enabled: true },
    { id: '8', nameKey: 'airConditioning', name: '', icon: 'air-conditioner', category: '', categoryKey: 'repairs', enabled: true },
    { id: '9', nameKey: 'diagnostics', name: '', icon: 'stethoscope', category: '', categoryKey: 'inspection', enabled: true },
    { id: '10', nameKey: 'vehicleInspection', name: '', icon: 'clipboard-check', category: '', categoryKey: 'inspection', enabled: false },
    { id: '11', nameKey: 'fullWash', name: '', icon: 'car-wash', category: '', categoryKey: 'detailing', enabled: false },
    { id: '12', nameKey: 'polishing', name: '', icon: 'auto-fix', category: '', categoryKey: 'detailing', enabled: false },
    { id: '13', nameKey: 'roadsideAssistance', name: '', icon: 'tow-truck', category: '', categoryKey: 'sos', enabled: false, descriptionKey: 'roadsideAssistance' },
    { id: '14', nameKey: 'outOfGas', name: '', icon: 'gas-station', category: '', categoryKey: 'sos', enabled: false, descriptionKey: 'outOfGas' },
    { id: '15', nameKey: 'tireChange', name: '', icon: 'tire', category: '', categoryKey: 'sos', enabled: false, descriptionKey: 'tireChange' },
    { id: '16', nameKey: 'towing', name: '', icon: 'tow-truck', category: '', categoryKey: 'sos', enabled: false, descriptionKey: 'towing' },
    { id: '17', nameKey: 'batteryCharge', name: '', icon: 'car-battery', category: '', categoryKey: 'sos', enabled: false, descriptionKey: 'batteryCharge' },
    { id: '18', nameKey: 'autoLocksmith', name: '', icon: 'key-variant', category: '', categoryKey: 'sos', enabled: false, descriptionKey: 'autoLocksmith' },
  ]);

  const toggleService = (id: string) => {
    setServices(services.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const enabledCount = services.filter(s => s.enabled).length;

  const categoryKeys = [...new Set(services.map(s => s.categoryKey))];

  const handleSave = () => {
    Alert.alert(t.common.success, t.success?.updated || 'Services updated successfully!');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.provider?.servicesOffered || 'Services Offered'}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveBtn}>{t.common.save}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
        <Text style={styles.statsText}>
          {enabledCount} {t.common?.of || 'of'} {services.length} {t.provider?.activeServices || 'active services'}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {categoryKeys.map(categoryKey => (
          <View key={categoryKey} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{getCategoryName(categoryKey)}</Text>
            <View style={styles.servicesCard}>
              {services
                .filter(s => s.categoryKey === categoryKey)
                .map((service, index, arr) => (
                  <View 
                    key={service.id}
                    style={[
                      styles.serviceItem,
                      index < arr.length - 1 && styles.serviceItemBorder,
                    ]}
                  >
                    <View style={[
                      styles.serviceIcon,
                      { backgroundColor: service.enabled ? '#dbeafe' : '#f3f4f6' },
                    ]}>
                      <MaterialCommunityIcons 
                        name={service.icon as any} 
                        size={22} 
                        color={service.enabled ? '#1976d2' : '#9ca3af'} 
                      />
                    </View>
                    <View style={styles.serviceInfo}>
                      <Text style={[
                        styles.serviceName,
                        !service.enabled && styles.serviceNameDisabled,
                      ]}>
                        {getServiceName(service.nameKey)}
                      </Text>
                      {service.descriptionKey && (
                        <Text style={styles.serviceDescription}>
                          {getDescription(service.descriptionKey)}
                        </Text>
                      )}
                    </View>
                    <Switch
                      value={service.enabled}
                      onValueChange={() => toggleService(service.id)}
                      trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                      thumbColor={service.enabled ? '#1976d2' : '#9ca3af'}
                    />
                  </View>
                ))}
            </View>
          </View>
        ))}

        {/* Add Custom Service */}
        <TouchableOpacity style={styles.addServiceButton}>
          <MaterialCommunityIcons name="plus-circle" size={22} color="#1976d2" />
          <Text style={styles.addServiceText}>{t.provider?.addCustomService || 'Add Custom Service'}</Text>
        </TouchableOpacity>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            {t.provider?.servicesBannerInfo || 'You will only receive requests for active services. Temporarily disable services you cannot provide.'}
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
    fontSize: 14,
    color: '#065f46',
    fontWeight: '500',
  },
  categorySection: {
    padding: 16,
    paddingBottom: 0,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  servicesCard: {
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
  serviceItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  serviceNameDisabled: {
    color: '#9ca3af',
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1976d2',
    borderStyle: 'dashed',
    gap: 8,
  },
  addServiceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976d2',
  },
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
