/**
 * CreateRequestScreen - Create Service Request
 * With service location option and US-focused services
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';

export default function CreateRequestScreen({ navigation }: any) {
  const { t } = useI18n();
  const [selectedVehicle, setSelectedVehicle] = useState<string>('1');
  const [selectedService, setSelectedService] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<string>('normal');
  const [serviceLocation, setServiceLocation] = useState<string>('shop');
  const [submitting, setSubmitting] = useState(false);

  const vehicles = [
    { id: '1', name: 'Honda Civic 2020', plate: 'ABC-1234' },
    { id: '2', name: 'Toyota Corolla 2019', plate: 'XYZ-5678' },
  ];

  // Service types - In production, these would be filtered based on available providers in the area
  // The 'hasProviders' field indicates if there are active providers offering this service
  const serviceTypes = [
    { id: 'oil', label: 'Oil Change', icon: 'water', hasProviders: true },
    { id: 'brake', label: 'Brakes', icon: 'disc', hasProviders: true },
    { id: 'tire', label: 'Tires', icon: 'ellipse', hasProviders: true },
    { id: 'engine', label: 'Engine', icon: 'cog', hasProviders: true },
    { id: 'electric', label: 'Electrical', icon: 'flash', hasProviders: true },
    { id: 'ac', label: 'A/C', icon: 'snow', hasProviders: true },
    { id: 'suspension', label: 'Suspension', icon: 'resize', hasProviders: true },
    { id: 'transmission', label: 'Transmission', icon: 'cog', hasProviders: false }, // No providers currently
    { id: 'inspection', label: 'Inspection', icon: 'clipboard', hasProviders: true },
    { id: 'detailing', label: 'Detailing', icon: 'sparkles', hasProviders: false }, // No providers currently
    { id: 'towing', label: 'Towing', icon: 'car', hasProviders: true },
    { id: 'roadside', label: 'Roadside Assist', icon: 'warning', hasProviders: true },
    { id: 'battery', label: 'Battery', icon: 'battery-charging', hasProviders: true },
    { id: 'lockout', label: 'Lockout', icon: 'key', hasProviders: true },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal', hasProviders: true },
  ];

  // Filter only services that have active providers
  const availableServices = serviceTypes.filter(s => s.hasProviders);

  const locationOptions = [
    { id: 'shop', label: t.createRequest?.takeToShop || 'At the Shop', icon: 'business', description: t.createRequest?.iWillGo || 'I\'ll bring my vehicle to the service provider' },
    { id: 'mobile', label: t.createRequest?.myLocation || 'Mobile Service', icon: 'home', description: t.createRequest?.currentLocation || 'Service provider comes to my location' },
  ];

  async function handleSubmit() {
    if (!selectedVehicle || !selectedService || !title) {
      Alert.alert(t.common.error, t.createRequest?.fillRequired || 'Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSubmitting(false);
    Alert.alert(t.createRequest?.submitted || 'Request Submitted!', t.createRequest?.quotesWithin || 'You will receive quotes within 48 hours.', [
      { text: t.common.ok, onPress: () => navigation.goBack() }
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.createRequest?.newRequest || 'New Request'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Vehicle Selection */}
        <Text style={styles.sectionTitle}>{t.createRequest?.selectVehicle || 'Select Vehicle'} *</Text>
        <View style={styles.vehiclesContainer}>
          {vehicles.map(vehicle => (
            <TouchableOpacity
              key={vehicle.id}
              style={[styles.vehicleCard, selectedVehicle === vehicle.id && styles.vehicleCardSelected]}
              onPress={() => setSelectedVehicle(vehicle.id)}
            >
              <Ionicons name="car" size={24} color={selectedVehicle === vehicle.id ? '#1976d2' : '#6b7280'} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.vehicleName, selectedVehicle === vehicle.id && styles.vehicleNameSelected]}>{vehicle.name}</Text>
                <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
              </View>
              {selectedVehicle === vehicle.id && <Ionicons name="checkmark-circle" size={24} color="#1976d2" />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Service Type */}
        <Text style={styles.sectionTitle}>{t.createRequest?.serviceType || 'Service Type'} *</Text>
        <View style={styles.servicesGrid}>
          {availableServices.map(service => (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCard, selectedService === service.id && styles.serviceCardSelected]}
              onPress={() => setSelectedService(service.id)}
            >
              <Ionicons name={service.icon as any} size={24} color={selectedService === service.id ? '#1976d2' : '#6b7280'} />
              <Text style={[styles.serviceLabel, selectedService === service.id && styles.serviceLabelSelected]}>{service.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Service Location */}
        <Text style={styles.sectionTitle}>{t.createRequest?.serviceLocation || 'Service Location'} *</Text>
        <View style={styles.locationContainer}>
          {locationOptions.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[styles.locationCard, serviceLocation === option.id && styles.locationCardSelected]}
              onPress={() => setServiceLocation(option.id)}
            >
              <View style={[styles.locationIcon, serviceLocation === option.id && styles.locationIconSelected]}>
                <Ionicons name={option.icon as any} size={24} color={serviceLocation === option.id ? '#1976d2' : '#6b7280'} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={[styles.locationLabel, serviceLocation === option.id && styles.locationLabelSelected]}>{option.label}</Text>
                <Text style={styles.locationDescription}>{option.description}</Text>
              </View>
              {serviceLocation === option.id && <Ionicons name="checkmark-circle" size={24} color="#1976d2" />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.createRequest?.requestTitle || 'Request Title'} *</Text>
          <TextInput style={styles.input} placeholder={t.createRequest?.titlePlaceholder || 'e.g., Oil change and filters'} value={title} onChangeText={setTitle} />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.createRequest?.problemDescription || 'Problem Description'}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t.createRequest?.descriptionPlaceholder || 'Describe the problem or service needed...'}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Urgency */}
        <Text style={styles.sectionTitle}>{t.createRequest?.urgency || 'Urgency'}</Text>
        <View style={styles.urgencyContainer}>
          {[
            { id: 'low', label: t.createRequest?.low || 'Low', color: '#10b981' },
            { id: 'normal', label: t.createRequest?.normal || 'Normal', color: '#3b82f6' },
            { id: 'high', label: t.createRequest?.high || 'High', color: '#f59e0b' },
            { id: 'urgent', label: t.createRequest?.urgent || 'Urgent', color: '#ef4444' },
          ].map(u => (
            <TouchableOpacity
              key={u.id}
              style={[styles.urgencyBtn, urgency === u.id && { backgroundColor: u.color }]}
              onPress={() => setUrgency(u.id)}
            >
              <Text style={[styles.urgencyText, urgency === u.id && styles.urgencyTextSelected]}>{u.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#1976d2" />
          <Text style={styles.infoText}>{t.createRequest?.infoText || 'You will receive quotes from verified service providers within 48 hours.'}</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <Text style={styles.submitText}>{t.createRequest?.submitting || 'Submitting...'}</Text>
          ) : (
            <><Ionicons name="send" size={20} color="#fff" /><Text style={styles.submitText}>{t.createRequest?.requestQuotes || 'Request Quotes'}</Text></>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  vehiclesContainer: { marginBottom: 24 },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 2, borderColor: '#e5e7eb' },
  vehicleCardSelected: { borderColor: '#1976d2', backgroundColor: '#eff6ff' },
  vehicleName: { fontSize: 16, fontWeight: '500', color: '#374151' },
  vehicleNameSelected: { color: '#1976d2' },
  vehiclePlate: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  serviceCard: { width: '31%', aspectRatio: 1, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#e5e7eb' },
  serviceCardSelected: { borderColor: '#1976d2', backgroundColor: '#eff6ff' },
  serviceLabel: { fontSize: 10, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  serviceLabelSelected: { color: '#1976d2', fontWeight: '500' },
  locationContainer: { marginBottom: 24 },
  locationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 2, borderColor: '#e5e7eb' },
  locationCardSelected: { borderColor: '#1976d2', backgroundColor: '#eff6ff' },
  locationIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  locationIconSelected: { backgroundColor: '#dbeafe' },
  locationInfo: { flex: 1 },
  locationLabel: { fontSize: 16, fontWeight: '500', color: '#374151' },
  locationLabelSelected: { color: '#1976d2' },
  locationDescription: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, fontSize: 16 },
  textArea: { minHeight: 100 },
  urgencyContainer: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  urgencyBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  urgencyText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  urgencyTextSelected: { color: '#fff' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#eff6ff', padding: 16, borderRadius: 12 },
  infoText: { flex: 1, fontSize: 14, color: '#1976d2', lineHeight: 20 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1976d2', paddingVertical: 16, borderRadius: 12 },
  submitBtnDisabled: { backgroundColor: '#9ca3af' },
  submitText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
