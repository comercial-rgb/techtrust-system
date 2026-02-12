/**
 * AppointmentsScreen - List customer/provider appointments
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import * as fdacsService from '../../services/fdacs.service';

export default function AppointmentsScreen({ navigation }: any) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<fdacsService.Appointment[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [])
  );

  async function loadAppointments() {
    try {
      setLoading(true);
      const res = await fdacsService.getMyAppointments();
      setAppointments(res.data?.appointments || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'REQUESTED': return { label: t.fdacs.statusRequested, color: '#f59e0b', bgColor: '#fef3c7', icon: 'time-outline' as const };
      case 'CONFIRMED': return { label: t.fdacs.statusConfirmed, color: '#3b82f6', bgColor: '#dbeafe', icon: 'checkmark-circle-outline' as const };
      case 'PROVIDER_EN_ROUTE': return { label: t.fdacs.statusEnRoute, color: '#8b5cf6', bgColor: '#ede9fe', icon: 'car-outline' as const };
      case 'IN_PROGRESS': return { label: t.fdacs.statusInProgress, color: '#3b82f6', bgColor: '#dbeafe', icon: 'construct-outline' as const };
      case 'COMPLETED': return { label: t.fdacs.statusCompleted, color: '#10b981', bgColor: '#d1fae5', icon: 'checkmark-done-outline' as const };
      case 'CANCELLED': return { label: t.fdacs.statusCancelled, color: '#ef4444', bgColor: '#fee2e2', icon: 'close-circle-outline' as const };
      case 'NO_SHOW': return { label: t.fdacs.statusNoShow, color: '#6b7280', bgColor: '#f3f4f6', icon: 'alert-circle-outline' as const };
      default: return { label: status, color: '#6b7280', bgColor: '#f3f4f6', icon: 'help-circle-outline' as const };
    }
  };

  const renderAppointment = ({ item }: { item: fdacsService.Appointment }) => {
    const statusInfo = getStatusInfo(item.status);
    const date = new Date(item.scheduledDate);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.appointmentNumber}>{item.appointmentNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        <Text style={styles.serviceDesc} numberOfLines={2}>{item.serviceDescription}</Text>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={styles.infoText}>
            {date.toLocaleDateString()}{item.scheduledTime ? ` at ${item.scheduledTime}` : ''}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#6b7280" />
          <Text style={styles.infoText}>
            {item.locationType === 'ON_SITE' ? t.fdacs.onSiteVisit : t.fdacs.atProviderShop}
          </Text>
        </View>

        {item.vehicle && (
          <View style={styles.infoRow}>
            <Ionicons name="car-outline" size={16} color="#6b7280" />
            <Text style={styles.infoText}>
              {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
            </Text>
          </View>
        )}

        {Number(item.diagnosticFee) > 0 && (
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>{t.fdacs.diagnosticFeeLabel}</Text>
            <Text style={styles.feeValue}>
              ${Number(item.diagnosticFee).toFixed(2)}
              {item.feeWaivedOnService && (
                <Text style={styles.waived}> {t.fdacs.waivedIfCompleted}</Text>
              )}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1976d2" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>{t.fdacs.appointments}</Text>
        <View style={{ width: 24 }} />
      </View>

      {appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>{t.fdacs.noAppointments}</Text>
          <Text style={styles.emptyText}>{t.fdacs.schedulePrompt}</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  appointmentNumber: { fontSize: 14, fontWeight: '600', color: '#1976d2' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  serviceDesc: { fontSize: 15, fontWeight: '500', color: '#111827', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoText: { fontSize: 13, color: '#6b7280' },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  feeLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  feeValue: { fontSize: 13, color: '#111827', fontWeight: '600' },
  waived: { fontSize: 11, color: '#10b981', fontWeight: '400' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 },
});
