/**
 * ProviderBankDetailsScreen - Bank Details (US Model)
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';

interface BankAccount {
  id: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  holderName: string;
  taxId: string;
  isPrimary: boolean;
}

export default function ProviderBankDetailsScreen({ navigation }: any) {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  const [isAdding, setIsAdding] = useState(false);
  const [newAccount, setNewAccount] = useState({
    bankName: '',
    routingNumber: '',
    accountNumber: '',
    accountType: 'checking' as 'checking' | 'savings',
    holderName: '',
    taxId: '',
  });

  const handleSetPrimary = (id: string) => {
    setAccounts(accs => 
      accs.map(a => ({ ...a, isPrimary: a.id === id }))
    );
  };

  const handleDeleteAccount = (id: string) => {
    Alert.alert(
      t.provider?.removeAccount || 'Remove Account',
      t.provider?.removeAccountConfirm || 'Are you sure you want to remove this bank account?',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        { 
          text: t.common?.remove || 'Remove', 
          style: 'destructive',
          onPress: () => setAccounts(accs => accs.filter(a => a.id !== id)),
        },
      ]
    );
  };

  const handleAddAccount = () => {
    if (!newAccount.bankName || !newAccount.routingNumber || !newAccount.accountNumber) {
      Alert.alert(t.common?.error || 'Error', t.common?.fillRequiredFields || 'Please fill in all required fields');
      return;
    }

    if (newAccount.routingNumber.length !== 9) {
      Alert.alert(t.common?.error || 'Error', 'Routing number must be 9 digits');
      return;
    }

    const account: BankAccount = {
      ...newAccount,
      id: Date.now().toString(),
      isPrimary: accounts.length === 0,
    };

    setAccounts([...accounts, account]);
    setNewAccount({
      bankName: '',
      routingNumber: '',
      accountNumber: '',
      accountType: 'checking',
      holderName: '',
      taxId: '',
    });
    setIsAdding(false);
  };

  const popularBanks = [
    { name: 'Chase', routingNumber: '021000021' },
    { name: 'Bank of America', routingNumber: '026009593' },
    { name: 'Wells Fargo', routingNumber: '121000248' },
    { name: 'Citibank', routingNumber: '021000089' },
    { name: 'Capital One', routingNumber: '051405515' },
    { name: 'PNC Bank', routingNumber: '043000096' },
    { name: 'US Bank', routingNumber: '122105155' },
    { name: 'TD Bank', routingNumber: '031101266' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.provider?.bankDetails || 'Bank Details'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information" size={20} color="#1976d2" />
          <Text style={styles.infoText}>
            {t.provider?.paymentInfo || 'Payments are automatically transferred to the primary account within 2 business days after service completion.'}
          </Text>
        </View>

        {/* Existing Accounts */}
        {accounts.map(account => (
          <View key={account.id} style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <View style={styles.bankInfo}>
                <View style={styles.bankIcon}>
                  <MaterialCommunityIcons name="bank" size={24} color="#1976d2" />
                </View>
                <View>
                  <Text style={styles.bankName}>{account.bankName}</Text>
                  <Text style={styles.bankCode}>Routing: ****{account.routingNumber.slice(-4)}</Text>
                </View>
              </View>
              {account.isPrimary && (
                <View style={styles.primaryBadge}>
                  <MaterialCommunityIcons name="star" size={14} color="#f59e0b" />
                  <Text style={styles.primaryText}>{t.common?.primary || 'Primary'}</Text>
                </View>
              )}
            </View>

            <View style={styles.accountDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{'Routing Number'}</Text>
                <Text style={styles.detailValue}>{account.routingNumber}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{'Account Number'}</Text>
                <Text style={styles.detailValue}>
                  ****{account.accountNumber.slice(-4)} ({account.accountType === 'checking' ? (t.provider?.checking || 'Checking') : (t.provider?.savings || 'Savings')})
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t.provider?.accountHolder || 'Account Holder'}</Text>
                <Text style={styles.detailValue}>{account.holderName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{'Tax ID (EIN/SSN)'}</Text>
                <Text style={styles.detailValue}>***-**-{account.taxId.slice(-4)}</Text>
              </View>
            </View>

            <View style={styles.accountActions}>
              {!account.isPrimary && (
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={() => handleSetPrimary(account.id)}
                >
                  <MaterialCommunityIcons name="star-outline" size={18} color="#1976d2" />
                  <Text style={styles.actionBtnText}>{t.provider?.setAsPrimary || 'Set as Primary'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDeleteAccount(account.id)}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>{t.common?.remove || 'Remove'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add New Account Form */}
        {isAdding ? (
          <View style={styles.addForm}>
            <Text style={styles.formTitle}>{t.provider?.newBankAccount || 'New Bank Account'}</Text>

            {/* Bank Selection */}
            <Text style={styles.inputLabel}>{t.provider?.bank || 'Bank'} *</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.bankList}
            >
              {popularBanks.map(bank => (
                <TouchableOpacity
                  key={bank.routingNumber}
                  style={[
                    styles.bankChip,
                    newAccount.bankName === bank.name && styles.bankChipActive,
                  ]}
                  onPress={() => setNewAccount({
                    ...newAccount,
                    bankName: bank.name,
                    routingNumber: bank.routingNumber,
                  })}
                >
                  <Text style={[
                    styles.bankChipText,
                    newAccount.bankName === bank.name && styles.bankChipTextActive,
                  ]}>
                    {bank.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Routing & Account Number */}
            <Text style={styles.inputLabel}>{'Routing Number'} *</Text>
            <TextInput
              style={styles.input}
              value={newAccount.routingNumber}
              onChangeText={val => setNewAccount({ ...newAccount, routingNumber: val })}
              placeholder="9-digit routing number"
              keyboardType="numeric"
              maxLength={9}
            />

            <Text style={styles.inputLabel}>{'Account Number'} *</Text>
            <TextInput
              style={styles.input}
              value={newAccount.accountNumber}
              onChangeText={val => setNewAccount({ ...newAccount, accountNumber: val })}
              placeholder="Account number"
              keyboardType="numeric"
            />

            {/* Account Type */}
            <Text style={styles.inputLabel}>{t.provider?.accountType || 'Account Type'} *</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  newAccount.accountType === 'checking' && styles.typeOptionActive,
                ]}
                onPress={() => setNewAccount({ ...newAccount, accountType: 'checking' })}
              >
                <Text style={[
                  styles.typeOptionText,
                  newAccount.accountType === 'checking' && styles.typeOptionTextActive,
                ]}>
                  {t.provider?.checking || 'Checking'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  newAccount.accountType === 'savings' && styles.typeOptionActive,
                ]}
                onPress={() => setNewAccount({ ...newAccount, accountType: 'savings' })}
              >
                <Text style={[
                  styles.typeOptionText,
                  newAccount.accountType === 'savings' && styles.typeOptionTextActive,
                ]}>
                  {t.provider?.savings || 'Savings'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Holder Info */}
            <Text style={styles.inputLabel}>{t.provider?.accountHolderName || 'Account Holder Name'} *</Text>
            <TextInput
              style={styles.input}
              value={newAccount.holderName}
              onChangeText={text => setNewAccount({ ...newAccount, holderName: text })}
              placeholder={t.provider?.accountHolderPlaceholder || 'Full name or business name'}
            />

            <Text style={styles.inputLabel}>{'Tax ID (EIN or SSN)'} *</Text>
            <TextInput
              style={styles.input}
              value={newAccount.taxId}
              onChangeText={val => setNewAccount({ ...newAccount, taxId: val })}
              placeholder="XX-XXXXXXX or XXX-XX-XXXX"
              keyboardType="numeric"
            />

            {/* Form Actions */}
            <View style={styles.formActions}>
              <TouchableOpacity 
                style={styles.cancelBtn}
                onPress={() => setIsAdding(false)}
              >
                <Text style={styles.cancelBtnText}>{t.common?.cancel || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmBtn}
                onPress={handleAddAccount}
              >
                <Text style={styles.confirmBtnText}>{t.provider?.addAccount || 'Add Account'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.addAccountBtn}
            onPress={() => setIsAdding(true)}
          >
            <MaterialCommunityIcons name="plus-circle" size={24} color="#1976d2" />
            <Text style={styles.addAccountText}>{t.provider?.addNewAccount || 'Add New Account'}</Text>
          </TouchableOpacity>
        )}

        {/* Security Note */}
        <View style={styles.securityNote}>
          <MaterialCommunityIcons name="shield-check" size={24} color="#10b981" />
          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>{t.provider?.dataSecure || 'Your data is secure'}</Text>
            <Text style={styles.securityText}>
              {t.provider?.encryptionInfo || 'We use end-to-end encryption to protect your banking information.'}
            </Text>
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
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  accountCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  bankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  bankCode: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  primaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400e',
  },
  accountDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  accountActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1976d2',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#1976d2',
  },
  addAccountText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1976d2',
  },
  addForm: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
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
  bankList: {
    marginTop: 8,
    marginBottom: 8,
  },
  bankChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bankChipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#1976d2',
  },
  bankChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  bankChipTextActive: {
    color: '#1976d2',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroupHalf: {
    flex: 1,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f3f4f6',
  },
  typeOptionActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#1976d2',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  typeOptionTextActive: {
    color: '#1976d2',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1976d2',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  securityNote: {
    flexDirection: 'row',
    backgroundColor: '#dcfce7',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
});
