/**
 * ProviderComplianceScreen - Main compliance dashboard for provider
 * Shows FDACS, BTR, EPA compliance items, insurance overview, service gating
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getComplianceSummary,
  getComplianceStatusLabel,
  getInsuranceStatusLabel,
  COMPLIANCE_TYPE_LABELS,
  INSURANCE_TYPE_LABELS,
  autoCreateComplianceItems,
  ComplianceItem,
  InsurancePolicy,
  Technician,
} from '../../services/compliance.service';

export default function ProviderComplianceScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [serviceGating, setServiceGating] = useState<Record<string, { allowed: boolean; reason?: string }>>({});
  const [overallStatus, setOverallStatus] = useState('PENDING');

  const fetchData = useCallback(async () => {
    try {
      const res = await getComplianceSummary();
      if (res.success) {
        setComplianceItems(res.data.complianceItems || []);
        setInsurancePolicies(res.data.insurancePolicies || []);
        setTechnicians(res.data.technicians || []);
        setServiceGating(res.data.serviceGating || {});
        setOverallStatus(res.data.overallStatus || 'PENDING');
      }
    } catch (error: any) {
      console.error('Error fetching compliance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleAutoCreate = async () => {
    try {
      setLoading(true);
      await autoCreateComplianceItems();
      await fetchData();
      Alert.alert('Success', 'Required compliance items created.');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to create compliance items');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const info = getComplianceStatusLabel(status);
    return (
      <View style={[styles.badge, { backgroundColor: info.color + '20' }]}>
        <Text style={[styles.badgeText, { color: info.color }]}>{info.label}</Text>
      </View>
    );
  };

  const getInsuranceBadge = (status: string) => {
    const info = getInsuranceStatusLabel(status);
    return (
      <View style={[styles.badge, { backgroundColor: info.color + '20' }]}>
        <Text style={[styles.badgeText, { color: info.color }]}>{info.label}</Text>
      </View>
    );
  };

  const getOverallBadge = () => {
    const map: Record<string, { label: string; color: string; icon: string }> = {
      VERIFIED: { label: 'Verified', color: '#16a34a', icon: 'shield-checkmark' },
      PENDING: { label: 'Pending', color: '#d97706', icon: 'time' },
      RESTRICTED: { label: 'Restricted', color: '#dc2626', icon: 'warning' },
      NOT_ELIGIBLE: { label: 'Not Eligible', color: '#6b7280', icon: 'close-circle' },
    };
    const info = map[overallStatus] || map.PENDING;
    return (
      <View style={[styles.overallBadge, { backgroundColor: info.color + '15', borderColor: info.color }]}>
        <Ionicons name={info.icon as any} size={24} color={info.color} />
        <Text style={[styles.overallBadgeText, { color: info.color }]}>{info.label}</Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Compliance & Licensing</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compliance & Licensing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      >
        {/* Overall Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Status</Text>
          {getOverallBadge()}
        </View>

        {/* Compliance Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Compliance Items</Text>
            {complianceItems.length === 0 && (
              <TouchableOpacity style={styles.autoCreateBtn} onPress={handleAutoCreate}>
                <Ionicons name="add-circle" size={18} color="#1976d2" />
                <Text style={styles.autoCreateText}>Auto-Create</Text>
              </TouchableOpacity>
            )}
          </View>

          {complianceItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={32} color="#9ca3af" />
              <Text style={styles.emptyText}>No compliance items yet</Text>
              <Text style={styles.emptySubtext}>Tap Auto-Create to generate required items</Text>
            </View>
          ) : (
            complianceItems.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => navigation.navigate('ComplianceItemDetail', { item })}
              >
                <View style={styles.cardHeader}>
                  <Ionicons
                    name={item.type === 'FDACS_MOTOR_VEHICLE_REPAIR' ? 'shield' : 'document'}
                    size={20}
                    color="#1976d2"
                  />
                  <Text style={styles.cardTitle}>{COMPLIANCE_TYPE_LABELS[item.type] || item.type}</Text>
                  {getStatusBadge(item.status)}
                </View>
                {item.registrationNumber && (
                  <Text style={styles.cardDetail}>Reg #: {item.registrationNumber}</Text>
                )}
                {item.expirationDate && (
                  <Text style={styles.cardDetail}>
                    Expires: {new Date(item.expirationDate).toLocaleDateString()}
                  </Text>
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardFooterText}>
                    {item.documentUploads?.length || 0} document(s) uploaded
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Insurance Policies */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Insurance Coverage</Text>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => navigation.navigate('InsuranceManagement')}
            >
              <Text style={styles.manageBtnText}>Manage</Text>
              <Ionicons name="chevron-forward" size={16} color="#1976d2" />
            </TouchableOpacity>
          </View>

          {insurancePolicies.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="shield-outline" size={32} color="#9ca3af" />
              <Text style={styles.emptyText}>No insurance policies declared</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('InsuranceManagement')}
              >
                <Text style={styles.addButtonText}>Declare Insurance</Text>
              </TouchableOpacity>
            </View>
          ) : (
            insurancePolicies.slice(0, 3).map(policy => (
              <View key={policy.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="shield-checkmark" size={20} color={policy.hasCoverage ? '#16a34a' : '#9ca3af'} />
                  <Text style={styles.cardTitle}>{INSURANCE_TYPE_LABELS[policy.type] || policy.type}</Text>
                  {getInsuranceBadge(policy.status)}
                </View>
                {policy.hasCoverage && policy.carrierName && (
                  <Text style={styles.cardDetail}>Carrier: {policy.carrierName}</Text>
                )}
                {!policy.hasCoverage && (
                  <Text style={[styles.cardDetail, { color: '#d97706' }]}>No coverage declared</Text>
                )}
              </View>
            ))
          )}
          {insurancePolicies.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('InsuranceManagement')}
            >
              <Text style={styles.viewAllText}>View all {insurancePolicies.length} policies</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Technicians */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Technicians</Text>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => navigation.navigate('TechnicianManagement')}
            >
              <Text style={styles.manageBtnText}>Manage</Text>
              <Ionicons name="chevron-forward" size={16} color="#1976d2" />
            </TouchableOpacity>
          </View>

          {technicians.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={32} color="#9ca3af" />
              <Text style={styles.emptyText}>No technicians registered</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('TechnicianManagement')}
              >
                <Text style={styles.addButtonText}>Add Technician</Text>
              </TouchableOpacity>
            </View>
          ) : (
            technicians.filter(t => t.isActive).slice(0, 3).map(tech => (
              <View key={tech.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="person" size={20} color="#1976d2" />
                  <Text style={styles.cardTitle}>{tech.fullName}</Text>
                  {getStatusBadge(tech.epa609Status)}
                </View>
                <Text style={styles.cardDetail}>{tech.role}</Text>
                {tech.epa609CertNumber && (
                  <Text style={styles.cardDetail}>EPA 609: {tech.epa609CertNumber}</Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Service Gating */}
        {Object.keys(serviceGating).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Eligibility</Text>
            {Object.entries(serviceGating).map(([service, gate]) => (
              <View key={service} style={[styles.gateCard, { borderLeftColor: gate.allowed ? '#16a34a' : '#dc2626' }]}>
                <Ionicons
                  name={gate.allowed ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={gate.allowed ? '#16a34a' : '#dc2626'}
                />
                <View style={styles.gateInfo}>
                  <Text style={styles.gateService}>{service.replace(/_/g, ' ')}</Text>
                  {!gate.allowed && gate.reason && (
                    <Text style={styles.gateReason}>{gate.reason}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  content: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  overallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  overallBadgeText: { fontSize: 16, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1f2937' },
  cardDetail: { fontSize: 13, color: '#6b7280', marginLeft: 28, marginBottom: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  cardFooterText: { fontSize: 12, color: '#9ca3af' },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyText: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  emptySubtext: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  autoCreateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  autoCreateText: { fontSize: 13, color: '#1976d2', fontWeight: '600' },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  manageBtnText: { fontSize: 13, color: '#1976d2', fontWeight: '600' },
  addButton: {
    marginTop: 12,
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  viewAllBtn: { alignItems: 'center', paddingVertical: 8 },
  viewAllText: { color: '#1976d2', fontSize: 13, fontWeight: '600' },
  gateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    gap: 10,
  },
  gateInfo: { flex: 1 },
  gateService: { fontSize: 14, fontWeight: '600', color: '#1f2937', textTransform: 'capitalize' },
  gateReason: { fontSize: 12, color: '#dc2626', marginTop: 2 },
});
