/**
 * ProviderSecurityScreen - Segurança da Conta
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';

export default function ProviderSecurityScreen({ navigation }: any) {
  const { t } = useI18n();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loginNotifications, setLoginNotifications] = useState(true);
  
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const connectedDevices = [
    {
      id: '1',
      name: 'Current Device',
      location: '',
      lastActive: t.provider?.now || 'Now',
      isCurrent: true,
    },
  ];

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t.common?.error || 'Error', t.provider?.fillAllFields || 'Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t.common?.error || 'Error', t.provider?.passwordsMismatch || 'Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t.common?.error || 'Error', t.provider?.passwordMinLength || 'New password must be at least 8 characters');
      return;
    }

    Alert.alert(t.common?.success || 'Success', t.provider?.passwordChanged || 'Password changed successfully!');
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLogoutDevice = (deviceId: string) => {
    Alert.alert(
      t.provider?.endSession || 'End Session',
      t.provider?.endSessionConfirm || 'Do you want to end the session on this device?',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        { text: t.provider?.endSession || 'End', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const handleLogoutAll = () => {
    Alert.alert(
      t.provider?.endAllSessions || 'End All Sessions',
      t.provider?.endAllSessionsConfirm || 'You will be logged out of all devices, except this one.',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        { text: t.provider?.endAll || 'End All', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.provider?.security || 'Security'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Password Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.common?.password || 'Password'}</Text>
          <View style={styles.card}>
            {!showPasswordForm ? (
              <TouchableOpacity 
                style={styles.passwordRow}
                onPress={() => setShowPasswordForm(true)}
              >
                <View style={styles.passwordInfo}>
                  <MaterialCommunityIcons name="lock" size={24} color="#374151" />
                  <View>
                    <Text style={styles.passwordLabel}>{t.provider?.changePassword || 'Change Password'}</Text>
                    <Text style={styles.passwordHint}>{t.provider?.lastChanged || 'Last changed 3 months ago'}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
              </TouchableOpacity>
            ) : (
              <View style={styles.passwordForm}>
                <Text style={styles.formTitle}>{t.provider?.changePassword || 'Change Password'}</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t.provider?.currentPassword || 'Current Password'}</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry={!showCurrentPassword}
                      placeholder={t.provider?.enterCurrentPassword || 'Enter your current password'}
                    />
                    <TouchableOpacity 
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={styles.eyeBtn}
                    >
                      <MaterialCommunityIcons 
                        name={showCurrentPassword ? "eye-off" : "eye"} 
                        size={22} 
                        color="#6b7280" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t.provider?.newPassword || 'New Password'}</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      placeholder={t.provider?.enterNewPassword || 'Enter new password'}
                    />
                    <TouchableOpacity 
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.eyeBtn}
                    >
                      <MaterialCommunityIcons 
                        name={showNewPassword ? "eye-off" : "eye"} 
                        size={22} 
                        color="#6b7280" 
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.passwordRequirements}>
                    {t.provider?.passwordRequirements || 'Minimum 8 characters, including letter and number'}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t.provider?.confirmNewPassword || 'Confirm New Password'}</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder={t.provider?.confirmNewPasswordPlaceholder || 'Confirm new password'}
                  />
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity 
                    style={styles.cancelBtn}
                    onPress={() => setShowPasswordForm(false)}
                  >
                    <Text style={styles.cancelBtnText}>{t.common?.cancel || 'Cancel'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.confirmBtn}
                    onPress={handleChangePassword}
                  >
                    <Text style={styles.confirmBtnText}>{t.provider?.changePassword || 'Change Password'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Authentication Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.provider?.authentication || 'Authentication'}</Text>
          <View style={styles.card}>
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <View style={[styles.optionIcon, { backgroundColor: '#dbeafe' }]}>
                  <MaterialCommunityIcons name="shield-check" size={22} color="#1976d2" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>{t.provider?.twoFactorAuth || 'Two-Factor Authentication'}</Text>
                  <Text style={styles.optionDescription}>
                    {t.provider?.twoFactorDesc || 'Receive a code via SMS when logging in'}
                  </Text>
                </View>
              </View>
              <Switch
                value={twoFactorEnabled}
                onValueChange={setTwoFactorEnabled}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={twoFactorEnabled ? '#1976d2' : '#fff'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <View style={[styles.optionIcon, { backgroundColor: '#dcfce7' }]}>
                  <MaterialCommunityIcons name="fingerprint" size={22} color="#16a34a" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>{t.provider?.biometrics || 'Biometrics'}</Text>
                  <Text style={styles.optionDescription}>
                    {t.provider?.biometricsDesc || 'Use fingerprint or Face ID'}
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                trackColor={{ false: '#d1d5db', true: '#86efac' }}
                thumbColor={biometricEnabled ? '#16a34a' : '#fff'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <View style={[styles.optionIcon, { backgroundColor: '#fef3c7' }]}>
                  <MaterialCommunityIcons name="bell-ring" size={22} color="#d97706" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>{t.provider?.loginNotifications || 'Login Notifications'}</Text>
                  <Text style={styles.optionDescription}>
                    {t.provider?.loginNotificationsDesc || 'Be alerted about new logins'}
                  </Text>
                </View>
              </View>
              <Switch
                value={loginNotifications}
                onValueChange={setLoginNotifications}
                trackColor={{ false: '#d1d5db', true: '#fcd34d' }}
                thumbColor={loginNotifications ? '#d97706' : '#fff'}
              />
            </View>
          </View>
        </View>

        {/* Connected Devices */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.provider?.connectedDevices || 'Connected Devices'}</Text>
            <TouchableOpacity onPress={handleLogoutAll}>
              <Text style={styles.logoutAllText}>{t.provider?.endAll || 'End All'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {connectedDevices.map((device, index) => (
              <View key={device.id}>
                <View style={styles.deviceRow}>
                  <View style={styles.deviceInfo}>
                    <MaterialCommunityIcons 
                      name={device.name.includes('iPhone') ? 'cellphone' : 'laptop'} 
                      size={24} 
                      color="#374151" 
                    />
                    <View style={styles.deviceDetails}>
                      <View style={styles.deviceNameRow}>
                        <Text style={styles.deviceName}>{device.name}</Text>
                        {device.isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentText}>{t.provider?.thisDevice || 'This device'}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.deviceLocation}>
                        {device.location} • {device.lastActive}
                      </Text>
                    </View>
                  </View>
                  {!device.isCurrent && (
                    <TouchableOpacity 
                      style={styles.logoutBtn}
                      onPress={() => handleLogoutDevice(device.id)}
                    >
                      <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
                {index < connectedDevices.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Activity Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.provider?.recentActivity || 'Recent Activity'}</Text>
          <TouchableOpacity style={styles.activityCard}>
            <MaterialCommunityIcons name="history" size={24} color="#1976d2" />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{t.provider?.viewActivityHistory || 'View Activity History'}</Text>
              <Text style={styles.activitySubtitle}>
                {t.provider?.activityDescription || 'Logins, password changes, and more'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>{t.provider?.dangerZone || 'Danger Zone'}</Text>
          <View style={styles.dangerCard}>
            <TouchableOpacity style={styles.dangerOption}>
              <MaterialCommunityIcons name="account-off" size={24} color="#ef4444" />
              <View style={styles.dangerContent}>
                <Text style={styles.dangerTitle}>{t.provider?.deactivateAccount || 'Deactivate Account'}</Text>
                <Text style={styles.dangerSubtitle}>
                  {t.provider?.deactivateDescription || 'Your account will be temporarily unavailable'}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.dangerOption}>
              <MaterialCommunityIcons name="delete-forever" size={24} color="#ef4444" />
              <View style={styles.dangerContent}>
                <Text style={styles.dangerTitle}>{t.provider?.deleteAccount || 'Delete Account'}</Text>
                <Text style={styles.dangerSubtitle}>
                  {t.provider?.deleteDescription || 'This action is irreversible and all data will be lost'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
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
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passwordInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  passwordLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  passwordHint: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  passwordForm: {
    gap: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  eyeBtn: {
    padding: 10,
  },
  passwordRequirements: {
    fontSize: 12,
    color: '#9ca3af',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1976d2',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  optionDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
  },
  logoutAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  currentBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1976d2',
  },
  deviceLocation: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  logoutBtn: {
    padding: 8,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  activitySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  dangerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 16,
  },
  dangerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  dangerContent: {
    flex: 1,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ef4444',
  },
  dangerSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
});
