/**
 * AppointmentDetailsScreen - Appointment detail view
 * Shows appointment info, status actions, and resulting estimates
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { useAuth } from '../../contexts/AuthContext';
import * as fdacsService from '../../services/fdacs.service';

export default function AppointmentDetailsScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { appointmentId } = route.params;
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const isProvider = user?.role === 'PROVIDER';

  useFocusEffect(
    useCallback(() => {
      loadDetails();
    }, [appointmentId])
  );

  async function loadDetails() {
    try {
      setLoading(true);
      const res = await fdacsService.getAppointment(appointmentId);
      setAppointment(res.data?.appointment);
    } catch (error) {
      console.error('Error loading appointment:', error);
      Alert.alert(t.common.error, t.fdacs.couldNotLoad);
    } finally {
      setLoading(false);
    }
  }

  const handleConfirm = async () => {
    try {
      setProcessing(true);
      await fdacsService.confirmAppointment(appointmentId);
      Alert.alert(t.common.success, t.fdacs.appointmentConfirmed);
      loadDetails();
    } catch (error: any) {
      Alert.alert(t.common.error, error.response?.data?.message || t.fdacs.couldNotConfirm);
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setProcessing(true);
      await fdacsService.checkInAppointment(appointmentId);
      Alert.alert(t.common.success, t.fdacs.checkedIn);
      loadDetails();
    } catch (error: any) {
      Alert.alert(t.common.error, error.response?.data?.message || t.fdacs.couldNotCheckIn);
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async () => {
    Alert.alert(
      t.fdacs.confirmTitle,
      t.fdacs.confirmMessage,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.fdacs.statusCompleted,
          onPress: async () => {
            try {
              setProcessing(true);
              await fdacsService.completeAppointment(appointmentId);
              Alert.alert(t.common.success, t.fdacs.appointmentCompleted);
              loadDetails();
            } catch (error: any) {
              Alert.alert(t.common.error, error.response?.data?.message || t.fdacs.couldNotComplete);
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = async () => {
    Alert.alert(
      t.fdacs.cancelTitle,
      t.fdacs.cancelMessage,
      [
        { text: t.common.no, style: 'cancel' },
        {
          text: t.fdacs.yesCancel,
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              await fdacsService.cancelAppointment(appointmentId, t.fdacs.cancelledByUser);
              Alert.alert(t.fdacs.statusCancelled, t.fdacs.appointmentCancelled);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert(t.common.error, error.response?.data?.message || t.fdacs.couldNotCancel);
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'REQUESTED': return { label: t.fdacs.statusRequested, color: '#f59e0b', bgColor: '#fef3c7' };
      case 'CONFIRMED': return { label: t.fdacs.statusConfirmed, color: '#3b82f6', bgColor: '#dbeafe' };
      case 'PROVIDER_EN_ROUTE': return { label: t.fdacs.statusProviderEnRoute, color: '#8b5cf6', bgColor: '#ede9fe' };
      case 'IN_PROGRESS': return { label: t.fdacs.statusInProgress, color: '#3b82f6', bgColor: '#dbeafe' };
      case 'COMPLETED': return { label: t.fdacs.statusCompleted, color: '#10b981', bgColor: '#d1fae5' };
      case 'CANCELLED': return { label: t.fdacs.statusCancelled, color: '#ef4444', bgColor: '#fee2e2' };
      case 'NO_SHOW': return { label: t.fdacs.statusNoShow, color: '#6b7280', bgColor: '#f3f4f6' };
      default: return { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1976d2" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointment</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={{ textAlign: 'center', marginTop: 40, color: '#6b7280' }}>
          Appointment not found.
        </Text>
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusInfo(appointment.status);
  const date = new Date(appointment.scheduledDate);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{appointment.appointmentNumber}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Status */}
        <View style={[styles.statusBar, { backgroundColor: statusInfo.bgColor }]}>
          <Text style={[styles.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>

        {/* Schedule Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.fdacs.schedule}</Text>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={18} color="#6b7280" />
            <Text style={styles.rowText}>
              {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
          {appointment.scheduledTime && (
            <View style={styles.row}>
              <Ionicons name="time-outline" size={18} color="#6b7280" />
              <Text style={styles.rowText}>{appointment.scheduledTime}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Ionicons name="location-outline" size={18} color="#6b7280" />
            <Text style={styles.rowText}>
              {appointment.locationType === 'ON_SITE' ? t.fdacs.onSiteCustomer : t.fdacs.atProviderShop}
            </Text>
          </View>
          {appointment.address && (
            <Text style={styles.addressText}>{appointment.address}</Text>
          )}
        </View>

        {/* Service Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.fdacs.serviceDescription}</Text>
          <Text style={styles.descText}>{appointment.serviceDescription}</Text>
        </View>

        {/* Vehicle */}
        {appointment.vehicle && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.fdacs.vehicle}</Text>
            <Text style={styles.rowText}>
              {appointment.vehicle.year} {appointment.vehicle.make} {appointment.vehicle.model}
              {appointment.vehicle.plateNumber ? ` (${appointment.vehicle.plateNumber})` : ''}
            </Text>
          </View>
        )}

        {/* Provider/Customer info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isProvider ? t.fdacs.customer : t.fdacs.provider}</Text>
          {isProvider ? (
            <Text style={styles.rowText}>{appointment.customer?.fullName || t.fdacs.na}</Text>
          ) : (
            <>
              <Text style={styles.rowText}>{appointment.provider?.fullName || t.fdacs.na}</Text>
              {appointment.provider?.providerProfile?.businessName && (
                <Text style={styles.subText}>{appointment.provider.providerProfile.businessName}</Text>
              )}
            </>
          )}
        </View>

        {/* Fees */}
        {(Number(appointment.diagnosticFee) > 0 || Number(appointment.travelFee) > 0) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.fdacs.fees}</Text>
            {Number(appointment.diagnosticFee) > 0 && (
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>{t.fdacs.diagnosticFee}</Text>
                <Text style={styles.feeValue}>${Number(appointment.diagnosticFee).toFixed(2)}</Text>
              </View>
            )}
            {Number(appointment.travelFee) > 0 && (
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>{t.fdacs.travelFee}</Text>
                <Text style={styles.feeValue}>${Number(appointment.travelFee).toFixed(2)}</Text>
              </View>
            )}
            {appointment.feeWaivedOnService && (
              <Text style={styles.waivedNote}>
                {t.fdacs.feeWaivedNote}
              </Text>
            )}
          </View>
        )}

        {/* Notes */}
        {(appointment.customerNotes || appointment.providerNotes) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.fdacs.notes}</Text>
            {appointment.customerNotes && (
              <>
                <Text style={styles.noteLabel}>{t.fdacs.customer}:</Text>
                <Text style={styles.noteText}>{appointment.customerNotes}</Text>
              </>
            )}
            {appointment.providerNotes && (
              <>
                <Text style={styles.noteLabel}>{t.fdacs.provider}:</Text>
                <Text style={styles.noteText}>{appointment.providerNotes}</Text>
              </>
            )}
          </View>
        )}

        {/* Resulting Estimates */}
        {appointment.quotes && appointment.quotes.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.fdacs.writtenEstimates}</Text>
            {appointment.quotes.map((q: any) => (
              <TouchableOpacity
                key={q.id}
                style={styles.estimateItem}
                onPress={() => navigation.navigate('QuoteDetails', { quoteId: q.id })}
              >
                <View>
                  <Text style={styles.estimateNumber}>{q.estimateNumber || q.quoteNumber}</Text>
                  <Text style={styles.estimateAmount}>${Number(q.totalAmount).toFixed(2)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {/* Provider actions */}
          {isProvider && appointment.status === 'REQUESTED' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#1976d2' }]}
              onPress={handleConfirm}
              disabled={processing}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>{t.fdacs.confirmAppointment}</Text>
            </TouchableOpacity>
          )}

          {isProvider && appointment.status === 'CONFIRMED' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#8b5cf6' }]}
              onPress={handleCheckIn}
              disabled={processing}
            >
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>{t.fdacs.checkIn}</Text>
            </TouchableOpacity>
          )}

          {isProvider && appointment.status === 'IN_PROGRESS' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
              onPress={handleComplete}
              disabled={processing}
            >
              <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>{t.fdacs.completeDiagnostic}</Text>
            </TouchableOpacity>
          )}

          {/* Cancel (both roles) */}
          {['REQUESTED', 'CONFIRMED'].includes(appointment.status) && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
              onPress={handleCancel}
              disabled={processing}
            >
              <Ionicons name="close-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>{t.fdacs.cancelAppointment}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusBar: {
    padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 16,
  },
  statusLabel: { fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  rowText: { fontSize: 15, color: '#111827' },
  subText: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  addressText: { fontSize: 13, color: '#6b7280', marginLeft: 26, marginTop: 2 },
  descText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  feeLabel: { fontSize: 14, color: '#374151' },
  feeValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  waivedNote: { fontSize: 12, color: '#10b981', fontStyle: 'italic', marginTop: 8 },
  noteLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginTop: 4 },
  noteText: { fontSize: 14, color: '#374151', marginBottom: 4 },
  estimateItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  estimateNumber: { fontSize: 14, fontWeight: '600', color: '#1976d2' },
  estimateAmount: { fontSize: 13, color: '#111827', marginTop: 2 },
  actions: { marginTop: 8, gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12,
  },
  actionBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
