/**
 * PaymentMethodsScreen - Gerenciamento de Formas de Pagamento
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';
import { useRoute, CommonActions } from '@react-navigation/native';

interface PaymentMethod {
  id: string;
  type: 'credit' | 'debit' | 'pix';
  brand?: string;
  lastFour?: string;
  holderName?: string;
  expiryDate?: string;
  pixKey?: string;
  isDefault: boolean;
}

interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
}

export default function PaymentMethodsScreen({ navigation }: any) {
  const { t } = useI18n();
  const route = useRoute<any>();
  const fromDashboard = route.params?.fromDashboard;
  const fromCreateRequest = route.params?.fromCreateRequest;
  const addCardMode = route.params?.addCardMode;
  
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
  const [addBalanceAmount, setAddBalanceAmount] = useState('');
  const [addBalanceMethod, setAddBalanceMethod] = useState<'card' | 'pix' | 'transfer'>('card');

  const handleBack = () => {
    // If we came from CreateRequest, navigate back to it
    if (fromCreateRequest) {
      // Get the parent tab navigator and navigate to Dashboard > CreateRequest
      const parent = navigation.getParent();
      if (parent) {
        // Navigate to Dashboard with CreateRequest screen
        parent.navigate('Dashboard', { screen: 'CreateRequest' });
        // Pop Profile stack to ProfileMain
        navigation.popToTop();
      } else {
        navigation.goBack();
      }
    } else if (fromDashboard) {
      const parent = navigation.getParent();
      if (parent) {
        parent.navigate('Dashboard', { screen: 'DashboardMain' });
        navigation.popToTop();
      } else {
        navigation.goBack();
      }
    } else {
      navigation.goBack();
    }
  };

  const [formData, setFormData] = useState({
    type: 'credit' as 'credit' | 'debit' | 'pix',
    cardNumber: '',
    holderName: '',
    expiryDate: '',
    cvv: '',
    pixKey: '',
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Load wallet balance
      setWalletBalance(125.50);
      
      // Load recent transactions
      setRecentTransactions([
        {
          id: '1',
          type: 'credit',
          amount: 100.00,
          description: t.customer?.balanceAddedViaCard || 'Balance added via card',
          date: '2024-11-28',
        },
        {
          id: '2',
          type: 'debit',
          amount: 45.00,
          description: t.customer?.paymentForService || 'Payment for service - Oil Change',
          date: '2024-11-27',
        },
        {
          id: '3',
          type: 'credit',
          amount: 70.50,
          description: t.customer?.balanceAddedViaPix || 'Balance added via PIX',
          date: '2024-11-25',
        },
      ]);
      
      setPaymentMethods([
        {
          id: '1',
          type: 'credit',
          brand: 'Visa',
          lastFour: '4242',
          holderName: 'JOHN DOE',
          expiryDate: '12/26',
          isDefault: true,
        },
        {
          id: '2',
          type: 'credit',
          brand: 'Mastercard',
          lastFour: '8888',
          holderName: 'JOHN DOE',
          expiryDate: '06/25',
          isDefault: false,
        },
        {
          id: '3',
          type: 'debit',
          brand: 'Visa',
          lastFour: '1234',
          holderName: 'JOHN DOE',
          expiryDate: '09/27',
          isDefault: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      type: 'credit',
      cardNumber: '',
      holderName: '',
      expiryDate: '',
      cvv: '',
      pixKey: '',
    });
    setShowModal(true);
  };

  const handleOpenAddBalanceModal = () => {
    setAddBalanceAmount('');
    setAddBalanceMethod('card');
    setShowAddBalanceModal(true);
  };

  const handleAddBalance = async () => {
    const amount = parseFloat(addBalanceAmount.replace(',', '.'));
    if (!amount || amount <= 0) {
      Alert.alert(t.common?.error || 'Error', t.customer?.enterValidAmount || 'Please enter a valid amount.');
      return;
    }
    if (amount < 10) {
      Alert.alert(t.common?.error || 'Error', t.customer?.minimumAmount || 'Minimum amount is $10.00.');
      return;
    }

    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Add to balance
      setWalletBalance(prev => prev + amount);
      
      // Add transaction record
      const methodName = addBalanceMethod === 'card' 
        ? (t.customer?.balanceAddedViaCard || 'Balance added via card')
        : addBalanceMethod === 'pix'
        ? (t.customer?.balanceAddedViaPix || 'Balance added via PIX')
        : (t.customer?.balanceAddedViaTransfer || 'Balance added via transfer');
      
      setRecentTransactions(prev => [{
        id: Date.now().toString(),
        type: 'credit',
        amount: amount,
        description: methodName,
        date: new Date().toISOString().split('T')[0],
      }, ...prev]);
      
      setShowAddBalanceModal(false);
      Alert.alert(
        t.common?.success || 'Success', 
        `${t.customer?.balanceAdded || 'Balance added'}: $${amount.toFixed(2)}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (formData.type !== 'pix') {
      if (!formData.cardNumber || !formData.holderName || !formData.expiryDate || !formData.cvv) {
        Alert.alert(t.common?.error || 'Error', t.common?.fillRequiredFields || 'Please fill in all required fields.');
        return;
      }
    } else {
      if (!formData.pixKey) {
        Alert.alert(t.common?.error || 'Error', t.customer?.enterPixKey || 'Please enter your PIX key.');
        return;
      }
    }

    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newMethod: PaymentMethod = formData.type === 'pix'
        ? {
            id: Date.now().toString(),
            type: 'pix',
            pixKey: formData.pixKey,
            isDefault: paymentMethods.length === 0,
          }
        : {
            id: Date.now().toString(),
            type: formData.type,
            brand: formData.cardNumber.startsWith('4') ? 'Visa' : 'Mastercard',
            lastFour: formData.cardNumber.slice(-4),
            holderName: formData.holderName.toUpperCase(),
            expiryDate: formData.expiryDate,
            isDefault: paymentMethods.length === 0,
          };

      setPaymentMethods(prev => [...prev, newMethod]);
      setShowModal(false);
      Alert.alert(t.common?.success || 'Success', t.customer?.paymentMethodAdded || 'Payment method added successfully.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = (methodId: string) => {
    setPaymentMethods(prev => prev.map(m => ({
      ...m,
      isDefault: m.id === methodId,
    })));
  };

  const handleDelete = (methodId: string) => {
    Alert.alert(
      t.customer?.removePaymentMethod || 'Remove Payment Method',
      t.customer?.removePaymentMethodConfirm || 'Are you sure you want to remove this payment method?',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.common?.remove || 'Remove',
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(prev => prev.filter(m => m.id !== methodId));
          },
        },
      ]
    );
  };

  const getCardIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa': return 'card';
      case 'mastercard': return 'card';
      default: return 'card-outline';
    }
  };

  const getCardColor = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa': return '#1a1f71';
      case 'mastercard': return '#eb001b';
      default: return '#6b7280';
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19);
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.customer?.paymentMethods || 'Payment Methods'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.customer?.paymentMethods || 'Payment Methods'}</Text>
        <TouchableOpacity onPress={handleOpenModal} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#1976d2" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark" size={20} color="#1976d2" />
          <Text style={styles.infoBannerText}>
            {t.customer?.paymentInfoSecure || 'Your payment information is encrypted and secure'}
          </Text>
        </View>

        {/* Wallet Section */}
        <View style={styles.walletSection}>
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <View style={styles.walletIconContainer}>
                <Ionicons name="wallet" size={28} color="#1976d2" />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletLabel}>{t.customer?.walletBalance || 'Wallet Balance'}</Text>
                <Text style={styles.walletBalance}>${walletBalance.toFixed(2)}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.addBalanceButton}
              onPress={handleOpenAddBalanceModal}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addBalanceButtonText}>{t.customer?.addBalance || 'Add Balance'}</Text>
            </TouchableOpacity>
          </View>
          
          {recentTransactions.length > 0 && (
            <View style={styles.transactionsContainer}>
              <Text style={styles.transactionsTitle}>{t.customer?.recentTransactions || 'Recent Transactions'}</Text>
              {recentTransactions.slice(0, 3).map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: transaction.type === 'credit' ? '#dcfce7' : '#fee2e2' }
                  ]}>
                    <Ionicons 
                      name={transaction.type === 'credit' ? 'arrow-down' : 'arrow-up'} 
                      size={16} 
                      color={transaction.type === 'credit' ? '#16a34a' : '#ef4444'} 
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <Text style={styles.transactionDate}>{transaction.date}</Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'credit' ? '#16a34a' : '#ef4444' }
                  ]}>
                    {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Payment Methods Title */}
        <Text style={styles.sectionTitle}>{t.customer?.savedPaymentMethods || 'Saved Payment Methods'}</Text>

        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="card-outline" size={64} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>{t.customer?.noPaymentMethods || 'No payment methods'}</Text>
            <Text style={styles.emptySubtitle}>{t.customer?.addCardEasier || 'Add a card to make payments easier'}</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleOpenModal}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>{t.customer?.addPaymentMethod || 'Add Payment Method'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.methodsList}>
            {paymentMethods.map((method) => (
              <View key={method.id} style={styles.methodCard}>
                {method.type === 'pix' ? (
                  <View style={styles.methodHeader}>
                    <View style={[styles.methodIcon, { backgroundColor: '#d1fae5' }]}>
                      <Text style={styles.pixIcon}>PIX</Text>
                    </View>
                    <View style={styles.methodInfo}>
                      <Text style={styles.methodTitle}>PIX</Text>
                      <Text style={styles.methodSubtitle}>{method.pixKey}</Text>
                    </View>
                    {method.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>{t.common?.default || 'Default'}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.methodHeader}>
                    <View style={[styles.methodIcon, { backgroundColor: '#dbeafe' }]}>
                      <Ionicons 
                        name={getCardIcon(method.brand) as any} 
                        size={24} 
                        color={getCardColor(method.brand)} 
                      />
                    </View>
                    <View style={styles.methodInfo}>
                      <View style={styles.methodTitleRow}>
                        <Text style={styles.methodTitle}>{method.brand}</Text>
                        <View style={[
                          styles.typeBadge,
                          { backgroundColor: method.type === 'credit' ? '#dbeafe' : '#fef3c7' }
                        ]}>
                          <Text style={[
                            styles.typeBadgeText,
                            { color: method.type === 'credit' ? '#1976d2' : '#92400e' }
                          ]}>
                            {method.type === 'credit' ? (t.customer?.credit || 'Credit') : (t.customer?.debit || 'Debit')}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.methodSubtitle}>
                        •••• •••• •••• {method.lastFour}
                      </Text>
                      <Text style={styles.methodExpiry}>{t.customer?.expires || 'Expires'} {method.expiryDate}</Text>
                    </View>
                    {method.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>{t.common?.default || 'Default'}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.methodActions}>
                  {!method.isDefault && (
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleSetDefault(method.id)}
                    >
                      <Ionicons name="star-outline" size={16} color="#1976d2" />
                      <Text style={styles.actionButtonText}>{t.common?.setAsDefault || 'Set as Default'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteActionButton]}
                    onPress={() => handleDelete(method.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>{t.common?.remove || 'Remove'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.customer?.addPaymentMethod || 'Add Payment Method'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type Selection */}
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeOptions}>
                {[
                  { type: 'credit' as const, label: 'Credit Card', icon: 'card' },
                  { type: 'debit' as const, label: 'Debit Card', icon: 'card-outline' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.typeOption,
                      formData.type === option.type && styles.typeOptionActive,
                    ]}
                    onPress={() => setFormData({ ...formData, type: option.type })}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={20} 
                      color={formData.type === option.type ? '#1976d2' : '#6b7280'} 
                    />
                    <Text style={[
                      styles.typeOptionText,
                      formData.type === option.type && styles.typeOptionTextActive,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {formData.type !== 'pix' ? (
                <>
                  <Text style={styles.inputLabel}>Card Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1234 5678 9012 3456"
                    value={formData.cardNumber}
                    onChangeText={(text) => setFormData({ ...formData, cardNumber: formatCardNumber(text) })}
                    keyboardType="numeric"
                    maxLength={19}
                  />

                  <Text style={styles.inputLabel}>Cardholder Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="JOHN DOE"
                    value={formData.holderName}
                    onChangeText={(text) => setFormData({ ...formData, holderName: text.toUpperCase() })}
                    autoCapitalize="characters"
                  />

                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <Text style={styles.inputLabel}>Expiry Date *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="MM/YY"
                        value={formData.expiryDate}
                        onChangeText={(text) => setFormData({ ...formData, expiryDate: formatExpiryDate(text) })}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                    <View style={styles.inputHalf}>
                      <Text style={styles.inputLabel}>CVV *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="123"
                        value={formData.cvv}
                        onChangeText={(text) => setFormData({ ...formData, cvv: text.replace(/\D/g, '') })}
                        keyboardType="numeric"
                        maxLength={4}
                        secureTextEntry
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>PIX Key *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Email, phone, CPF or random key"
                    value={formData.pixKey}
                    onChangeText={(text) => setFormData({ ...formData, pixKey: text })}
                  />
                </>
              )}

              <View style={styles.securityNote}>
                <Ionicons name="lock-closed" size={16} color="#6b7280" />
                <Text style={styles.securityNoteText}>
                  Your card information is encrypted using industry-standard security
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Adding...' : 'Add Payment Method'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Balance Modal */}
      <Modal
        visible={showAddBalanceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddBalanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.customer?.addBalance || 'Add Balance'}</Text>
              <TouchableOpacity onPress={() => setShowAddBalanceModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Amount Input */}
              <Text style={styles.inputLabel}>{t.customer?.amount || 'Amount'} *</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  value={addBalanceAmount}
                  onChangeText={setAddBalanceAmount}
                  keyboardType="decimal-pad"
                />
              </View>
              <Text style={styles.minimumAmountText}>{t.customer?.minimumAmountNote || 'Minimum: $10.00'}</Text>

              {/* Quick Amount Buttons */}
              <View style={styles.quickAmountContainer}>
                {[25, 50, 100, 200].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickAmountButton}
                    onPress={() => setAddBalanceAmount(amount.toString())}
                  >
                    <Text style={styles.quickAmountText}>${amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Payment Method Selection */}
              <Text style={styles.inputLabel}>{t.customer?.paymentMethod || 'Payment Method'}</Text>
              <View style={styles.balanceMethodOptions}>
                {[
                  { type: 'card' as const, label: t.customer?.creditDebitCard || 'Credit/Debit Card', icon: 'card' },
                  { type: 'pix' as const, label: 'PIX', icon: 'qr-code' },
                  { type: 'transfer' as const, label: t.customer?.bankTransfer || 'Bank Transfer', icon: 'swap-horizontal' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.balanceMethodOption,
                      addBalanceMethod === option.type && styles.balanceMethodOptionActive,
                    ]}
                    onPress={() => setAddBalanceMethod(option.type)}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={24} 
                      color={addBalanceMethod === option.type ? '#1976d2' : '#6b7280'} 
                    />
                    <Text style={[
                      styles.balanceMethodText,
                      addBalanceMethod === option.type && styles.balanceMethodTextActive,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {addBalanceMethod === 'pix' && (
                <View style={styles.pixInstructions}>
                  <View style={styles.pixQRPlaceholder}>
                    <Ionicons name="qr-code" size={80} color="#1976d2" />
                    <Text style={styles.pixQRText}>{t.customer?.scanQRCode || 'Scan QR Code'}</Text>
                  </View>
                  <Text style={styles.pixNote}>
                    {t.customer?.pixNote || 'Balance will be added automatically after payment confirmation.'}
                  </Text>
                </View>
              )}

              {addBalanceMethod === 'transfer' && (
                <View style={styles.transferInstructions}>
                  <Text style={styles.transferTitle}>{t.customer?.bankDetails || 'Bank Details'}</Text>
                  <View style={styles.transferDetail}>
                    <Text style={styles.transferLabel}>Bank:</Text>
                    <Text style={styles.transferValue}>TechTrust Bank</Text>
                  </View>
                  <View style={styles.transferDetail}>
                    <Text style={styles.transferLabel}>Account:</Text>
                    <Text style={styles.transferValue}>123456-7</Text>
                  </View>
                  <View style={styles.transferDetail}>
                    <Text style={styles.transferLabel}>Routing:</Text>
                    <Text style={styles.transferValue}>000-000-000</Text>
                  </View>
                  <Text style={styles.transferNote}>
                    {t.customer?.transferNote || 'Include your account email as reference. Balance typically credited within 1-2 business days.'}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleAddBalance}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving 
                    ? (t.common?.processing || 'Processing...') 
                    : (t.customer?.addBalance || 'Add Balance')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  addBtn: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  methodsList: {
    padding: 16,
  },
  methodCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pixIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
  methodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  methodSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  methodExpiry: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  methodActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    color: '#1976d2',
    fontWeight: '500',
  },
  deleteActionButton: {
    marginLeft: 'auto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  inputLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  typeOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeOptionActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#1976d2',
  },
  typeOptionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  typeOptionTextActive: {
    color: '#1976d2',
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Wallet Section Styles
  walletSection: {
    margin: 16,
  },
  walletCard: {
    backgroundColor: '#1976d2',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  walletIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  walletInfo: {
    flex: 1,
  },
  walletLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  walletBalance: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  addBalanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addBalanceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  transactionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  transactionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  // Add Balance Modal Styles
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 16,
  },
  minimumAmountText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 16,
  },
  quickAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAmountButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  balanceMethodOptions: {
    gap: 12,
    marginBottom: 20,
  },
  balanceMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  balanceMethodOptionActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#1976d2',
  },
  balanceMethodText: {
    fontSize: 15,
    color: '#374151',
  },
  balanceMethodTextActive: {
    color: '#1976d2',
    fontWeight: '600',
  },
  pixInstructions: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 20,
  },
  pixQRPlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  pixQRText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
    marginTop: 8,
  },
  pixNote: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  transferInstructions: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  transferTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  transferDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  transferLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  transferValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  transferNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 12,
    lineHeight: 18,
  },
});
