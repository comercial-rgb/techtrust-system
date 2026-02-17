/**
 * VehicleTransferScreen - Transfer Vehicle to New Owner
 * Allows transfer of vehicle with maintenance history
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import * as LocalAuthentication from 'expo-local-authentication';

interface MaintenanceRecord {
  id: string;
  type: string;
  description: string;
  date: string;
  mileage: number;
  cost: number;
  provider: string;
  status: 'completed' | 'in-progress' | 'scheduled';
}

interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  vin: string;
  plateNumber: string;
}

export default function VehicleTransferScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const { vehicleId, vehicleInfo, maintenanceHistory, totalSpent } = route.params || {};
  
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [includeHistory, setIncludeHistory] = useState(true);
  const [transferNotes, setTransferNotes] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const completedRecords = (maintenanceHistory || []).filter(
    (r: MaintenanceRecord) => r.status === 'completed'
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleTransfer = async () => {
    if (!newOwnerEmail.trim()) {
      Alert.alert(t.common?.requiredField || 'Required Field', t.vehicle?.enterNewOwnerEmail || "Please enter the new owner's email address.");
      return;
    }

    if (!newOwnerName.trim()) {
      Alert.alert(t.common?.requiredField || 'Required Field', t.vehicle?.enterNewOwnerName || "Please enter the new owner's name.");
      return;
    }

    // D25 — Biometric confirmation before transfer
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (hasHardware && isEnrolled) {
      const biometricType = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const biometricLabel = biometricType.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
        ? (Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition')
        : (Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint');
      
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: `Confirm vehicle transfer with ${biometricLabel}`,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });

      if (!authResult.success) {
        if (authResult.error !== 'user_cancel') {
          Alert.alert('Authentication Required', `${biometricLabel} authentication is required to transfer a vehicle.`);
        }
        return;
      }
    }

    Alert.alert(
      t.vehicle?.confirmTransfer || 'Confirm Transfer',
      `${t.vehicle?.transferConfirmMessage || 'Are you sure you want to transfer this vehicle to'} ${newOwnerName}?\n\n${includeHistory ? `${t.vehicle?.willIncludeRecords || 'This will include'} ${completedRecords.length} ${t.vehicle?.maintenanceRecords || 'maintenance records'}.` : t.vehicle?.historyNotTransferred || 'Maintenance history will NOT be transferred.'}\n\n${t.vehicle?.actionCannotBeUndone || 'This action cannot be undone.'}`,
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.vehicle?.transfer || 'Transfer',
          style: 'destructive',
          onPress: async () => {
            setIsTransferring(true);
            try {
              const apiDefault = (await import('../services/api')).default;
              await apiDefault.post(`/vehicles/${vehicleId}/transfer`, {
                newOwnerName,
                newOwnerEmail,
                includeHistory,
              });
              
              Alert.alert(
                t.vehicle?.transferInitiated || 'Transfer Initiated',
                `${t.vehicle?.transferRequestSent || 'A transfer request has been sent to'} ${newOwnerEmail}. ${t.vehicle?.newOwnerMustAccept || 'The new owner will need to accept the transfer to complete the process.'}`,
                [
                  {
                    text: t.common?.ok || 'OK',
                    onPress: () => navigation.navigate('VehiclesList'),
                  },
                ]
              );
            } catch (error) {
              Alert.alert(t.common?.error || 'Error', t.vehicle?.transferFailed || 'Failed to initiate transfer. Please try again.');
            } finally {
              setIsTransferring(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.vehicle?.transferVehicle || 'Transfer Vehicle'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Vehicle Info Card */}
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleIconContainer}>
            <Ionicons name="car-sport" size={40} color="#1976d2" />
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>
              {vehicleInfo?.year} {vehicleInfo?.make} {vehicleInfo?.model}
            </Text>
            <Text style={styles.vehicleVin}>VIN: {vehicleInfo?.vin}</Text>
          </View>
        </View>

        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Ionicons name="warning-outline" size={24} color="#d97706" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>{t.vehicle?.importantInformation || 'Important Information'}</Text>
            <Text style={styles.warningText}>
              {t.vehicle?.transferWarning || 'Transferring this vehicle will remove it from your account. The new owner will receive an invitation to accept the transfer.\n\nNote: Your license plate will not be transferred — in the U.S., plates belong to the owner, not the vehicle. Remember to remove your plate before delivering the vehicle.'}
            </Text>
          </View>
        </View>

        {/* New Owner Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.vehicle?.newOwnerInformation || 'New Owner Information'}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t.vehicle?.fullName || 'Full Name'} *</Text>
            <TextInput
              style={styles.input}
              value={newOwnerName}
              onChangeText={setNewOwnerName}
              placeholder={t.vehicle?.enterNewOwnerFullName || "Enter new owner's full name"}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t.vehicle?.emailAddress || 'Email Address'} *</Text>
            <TextInput
              style={styles.input}
              value={newOwnerEmail}
              onChangeText={setNewOwnerEmail}
              placeholder={t.vehicle?.enterNewOwnerEmailPlaceholder || "Enter new owner's email"}
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t.vehicle?.phoneNumber || 'Phone Number'} ({t.common?.optional || 'Optional'})</Text>
            <TextInput
              style={styles.input}
              value={newOwnerPhone}
              onChangeText={setNewOwnerPhone}
              placeholder={t.vehicle?.enterPhoneNumber || 'Enter phone number'}
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Maintenance History Transfer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.vehicle?.maintenanceHistory || 'Maintenance History'}</Text>
          
          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => setIncludeHistory(!includeHistory)}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.checkbox, includeHistory && styles.checkboxChecked]}>
                {includeHistory && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>{t.vehicle?.includeMaintenanceHistory || 'Include Maintenance History'}</Text>
                <Text style={styles.optionDescription}>
                  {t.vehicle?.transferRecordsWithVehicle || 'Transfer'} {completedRecords.length} {t.vehicle?.serviceRecords || 'service records with this vehicle'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {includeHistory && (
            <View style={styles.historyPreview}>
              <View style={styles.historyStats}>
                <View style={styles.historyStatItem}>
                  <Text style={styles.historyStatValue}>{completedRecords.length}</Text>
                  <Text style={styles.historyStatLabel}>{t.vehicle?.records || 'Records'}</Text>
                </View>
                <View style={styles.historyStatItem}>
                  <Text style={styles.historyStatValue}>${totalSpent?.toFixed(2) || '0.00'}</Text>
                  <Text style={styles.historyStatLabel}>{t.vehicle?.totalSpent || 'Total Spent'}</Text>
                </View>
              </View>

              <Text style={styles.historyListTitle}>{t.vehicle?.recentServices || 'Recent Services'}:</Text>
              {completedRecords.slice(0, 3).map((record: MaintenanceRecord) => (
                <View key={record.id} style={styles.historyItem}>
                  <View style={styles.historyItemDot} />
                  <View style={styles.historyItemContent}>
                    <Text style={styles.historyItemType}>{record.type}</Text>
                    <Text style={styles.historyItemDate}>{formatDate(record.date)}</Text>
                  </View>
                  <Text style={styles.historyItemCost}>${record.cost.toFixed(2)}</Text>
                </View>
              ))}
              {completedRecords.length > 3 && (
                <Text style={styles.moreRecords}>
                  +{completedRecords.length - 3} {t.vehicle?.moreRecords || 'more records'}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Transfer Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.vehicle?.notes || 'Notes'} ({t.common?.optional || 'Optional'})</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={transferNotes}
            onChangeText={setTransferNotes}
            placeholder={t.vehicle?.notesPlaceholder || 'Add any notes for the new owner (known issues, recommendations, etc.)'}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Transfer Button */}
        <View style={styles.bottomSection}>
          <TouchableOpacity 
            style={[styles.transferButton, isTransferring && styles.transferButtonDisabled]}
            onPress={handleTransfer}
            disabled={isTransferring}
          >
            {isTransferring ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="swap-horizontal" size={20} color="#fff" />
                <Text style={styles.transferButtonText}>{t.vehicle?.initiateTransfer || 'Initiate Transfer'}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>{t.common?.cancel || 'Cancel'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
    padding: 16,
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
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  vehicleIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  vehicleVin: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  vehiclePlate: {
    fontSize: 13,
    color: '#6b7280',
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  optionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  historyPreview: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  historyStats: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 24,
  },
  historyStatItem: {
    alignItems: 'center',
  },
  historyStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#166534',
  },
  historyStatLabel: {
    fontSize: 12,
    color: '#15803d',
    marginTop: 2,
  },
  historyListTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 12,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#166534',
  },
  historyItemDate: {
    fontSize: 12,
    color: '#15803d',
  },
  historyItemCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  moreRecords: {
    fontSize: 13,
    color: '#15803d',
    fontStyle: 'italic',
    marginTop: 4,
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  transferButtonDisabled: {
    opacity: 0.7,
  },
  transferButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
});
