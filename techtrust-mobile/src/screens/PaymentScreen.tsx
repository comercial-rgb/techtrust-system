/**
 * PaymentScreen - Tela de Pagamento com Stripe Mock
 * TechTrust Mobile
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// Mock Stripe Payment Processing
const mockStripePayment = async (cardData: CardData, amount: number): Promise<Transaction> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (cardData.number.replace(/\s/g, '').length !== 16) {
    throw new Error('Número do cartão inválido');
  }
  
  if (Math.random() > 0.1) {
    return {
      success: true,
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: amount,
      last4: cardData.number.slice(-4),
      brand: detectCardBrand(cardData.number),
    };
  } else {
    throw new Error('Pagamento recusado. Tente novamente.');
  }
};

const detectCardBrand = (number: string): string => {
  const firstDigit = number.charAt(0);
  if (firstDigit === '4') return 'Visa';
  if (firstDigit === '5') return 'Mastercard';
  if (firstDigit === '3') return 'Amex';
  return 'Card';
};

const formatCardNumber = (value: string): string => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || '';
  const parts = [];
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  return parts.length ? parts.join(' ') : v;
};

const formatExpiry = (value: string): string => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  if (v.length >= 2) {
    return v.substring(0, 2) + '/' + v.substring(2, 4);
  }
  return v;
};

interface CardData {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
}

interface Transaction {
  success: boolean;
  transactionId: string;
  amount: number;
  last4: string;
  brand: string;
}

interface ServiceData {
  provider: string;
  service: string;
  date: string;
  time: string;
  duration: string;
  basePrice: number;
  serviceFee: number;
  total: number;
}

type Step = 'form' | 'processing' | 'success' | 'error';

interface PaymentScreenProps {
  navigation: any;
  route?: {
    params?: {
      serviceData?: Partial<ServiceData>;
    };
  };
}

export default function PaymentScreen({ navigation, route }: PaymentScreenProps) {
  const [step, setStep] = useState<Step>('form');
  const [cardData, setCardData] = useState<CardData>({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });
  const [error, setError] = useState('');
  const [transaction, setTransaction] = useState<Transaction | null>(null);

  // Dados do serviço (mock ou passados via route)
  const serviceData: ServiceData = route?.params?.serviceData ? {
    provider: route.params.serviceData.provider || 'Maria Silva',
    service: route.params.serviceData.service || 'Serviço Automotivo',
    date: route.params.serviceData.date || '27 Nov 2025',
    time: route.params.serviceData.time || '14:00 - 17:00',
    duration: route.params.serviceData.duration || '3 horas',
    basePrice: route.params.serviceData.basePrice || 150.0,
    serviceFee: route.params.serviceData.serviceFee || 15.0,
    total: route.params.serviceData.total || 165.0,
  } : {
    provider: 'Maria Silva',
    service: 'Serviço Automotivo',
    date: '27 Nov 2025',
    time: '14:00 - 17:00',
    duration: '3 horas',
    basePrice: 150.0,
    serviceFee: 15.0,
    total: 165.0,
  };

  const handleInputChange = (field: keyof CardData, value: string) => {
    let formattedValue = value;

    if (field === 'number') {
      formattedValue = formatCardNumber(value);
      if (formattedValue.replace(/\s/g, '').length > 16) return;
    }
    if (field === 'expiry') {
      formattedValue = formatExpiry(value.replace('/', ''));
      if (formattedValue.replace('/', '').length > 4) return;
    }
    if (field === 'cvv') {
      formattedValue = value.replace(/[^0-9]/g, '').slice(0, 4);
    }

    setCardData(prev => ({ ...prev, [field]: formattedValue }));
    setError('');
  };

  const handleSubmit = async () => {
    if (!cardData.number || !cardData.name || !cardData.expiry || !cardData.cvv) {
      setError('Preencha todos os campos');
      return;
    }

    if (cardData.number.replace(/\s/g, '').length < 16) {
      setError('Número do cartão incompleto');
      return;
    }

    setStep('processing');

    try {
      const result = await mockStripePayment(cardData, serviceData.total);
      setTransaction(result);
      setStep('success');
    } catch (err: any) {
      setError(err.message);
      setStep('error');
    }
  };

  const cardBrand = detectCardBrand(cardData.number);

  const renderForm = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Card Preview */}
      <View style={styles.cardPreview}>
        <Text style={styles.cardBrand}>{cardBrand}</Text>
        <View style={styles.cardChip} />
        <Text style={styles.cardNumber}>
          {cardData.number || '•••• •••• •••• ••••'}
        </Text>
        <View style={styles.cardDetails}>
          <View>
            <Text style={styles.cardLabel}>TITULAR</Text>
            <Text style={styles.cardName}>{cardData.name || 'SEU NOME'}</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>VALIDADE</Text>
            <Text style={styles.cardExpiry}>{cardData.expiry || 'MM/AA'}</Text>
          </View>
        </View>
      </View>

      {/* Service Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RESUMO DO SERVIÇO</Text>

        <View style={styles.providerInfo}>
          <View style={styles.providerAvatar}>
            <Text style={styles.providerAvatarText}>
              {serviceData.provider.charAt(0)}
            </Text>
          </View>
          <View style={styles.providerDetails}>
            <Text style={styles.providerName}>{serviceData.provider}</Text>
            <Text style={styles.providerService}>{serviceData.service}</Text>
          </View>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>📅 Data</Text>
          <Text style={styles.summaryValue}>{serviceData.date}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>⏰ Horário</Text>
          <Text style={styles.summaryValue}>{serviceData.time}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>💰 Serviço ({serviceData.duration})</Text>
          <Text style={styles.summaryValue}>R$ {serviceData.basePrice.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>📱 Taxa da plataforma</Text>
          <Text style={styles.summaryValue}>R$ {serviceData.serviceFee.toFixed(2)}</Text>
        </View>

        <View style={styles.summaryTotal}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>R$ {serviceData.total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Payment Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DADOS DO CARTÃO</Text>

        {error ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Número do Cartão</Text>
          <TextInput
            style={styles.input}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor="#9ca3af"
            value={cardData.number}
            onChangeText={(v) => handleInputChange('number', v)}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nome no Cartão</Text>
          <TextInput
            style={styles.input}
            placeholder="Como está no cartão"
            placeholderTextColor="#9ca3af"
            value={cardData.name}
            onChangeText={(v) => handleInputChange('name', v.toUpperCase())}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Validade</Text>
            <TextInput
              style={styles.input}
              placeholder="MM/AA"
              placeholderTextColor="#9ca3af"
              value={cardData.expiry}
              onChangeText={(v) => handleInputChange('expiry', v)}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>CVV</Text>
            <TextInput
              style={styles.input}
              placeholder="123"
              placeholderTextColor="#9ca3af"
              value={cardData.cvv}
              onChangeText={(v) => handleInputChange('cvv', v)}
              keyboardType="numeric"
              secureTextEntry
            />
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.payButton} onPress={handleSubmit}>
        <MaterialCommunityIcons name="credit-card" size={20} color="#fff" />
        <Text style={styles.payButtonText}>
          Pagar R$ {serviceData.total.toFixed(2)}
        </Text>
      </TouchableOpacity>

      <View style={styles.secureNote}>
        <MaterialCommunityIcons name="lock" size={16} color="#9ca3af" />
        <Text style={styles.secureNoteText}>
          Pagamento seguro processado por Stripe
        </Text>
      </View>
    </ScrollView>
  );

  const renderProcessing = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#1976d2" />
      <Text style={styles.processingText}>Processando pagamento...</Text>
      <Text style={styles.processingSubtext}>Não feche esta tela</Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.centerContainer}>
      <View style={styles.successIcon}>
        <MaterialCommunityIcons name="check" size={48} color="#fff" />
      </View>
      <Text style={styles.successTitle}>Pagamento Confirmado! 🎉</Text>
      <Text style={styles.successSubtitle}>Seu serviço está agendado</Text>

      {transaction && (
        <View style={styles.transactionCard}>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Transação</Text>
            <Text style={styles.transactionValue}>
              {transaction.transactionId.slice(0, 18)}...
            </Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Cartão</Text>
            <Text style={styles.transactionValue}>
              {transaction.brand} •••• {transaction.last4}
            </Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Valor</Text>
            <Text style={styles.transactionValue}>
              R$ {transaction.amount.toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.payButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.payButtonText}>✨ Voltar ao Início</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View style={styles.centerContainer}>
      <View style={[styles.successIcon, { backgroundColor: '#ef4444' }]}>
        <MaterialCommunityIcons name="close" size={48} color="#fff" />
      </View>
      <Text style={styles.successTitle}>Pagamento Falhou</Text>
      <Text style={styles.successSubtitle}>{error}</Text>

      <TouchableOpacity
        style={styles.payButton}
        onPress={() => setStep('form')}
      >
        <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
        <Text style={styles.payButtonText}>Tentar Novamente</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {step === 'form' && renderForm()}
      {step === 'processing' && renderProcessing()}
      {step === 'success' && renderSuccess()}
      {step === 'error' && renderError()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  cardPreview: {
    backgroundColor: '#1976d2',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardBrand: {
    position: 'absolute',
    top: 20,
    right: 20,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    opacity: 0.9,
  },
  cardChip: {
    width: 45,
    height: 35,
    backgroundColor: '#ffd700',
    borderRadius: 6,
    marginBottom: 20,
  },
  cardNumber: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'monospace',
    letterSpacing: 3,
    marginBottom: 20,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginBottom: 4,
  },
  cardName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardExpiry: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 1,
    marginBottom: 16,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  providerAvatar: {
    width: 48,
    height: 48,
    backgroundColor: '#1976d2',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  providerService: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1976d2',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  inputRow: {
    flexDirection: 'row',
  },
  payButton: {
    backgroundColor: '#1976d2',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  secureNoteText: {
    color: '#9ca3af',
    fontSize: 12,
    marginLeft: 6,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 24,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  successIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#22c55e',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 32,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  transactionLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  transactionValue: {
    fontSize: 13,
    color: '#1f2937',
    fontFamily: 'monospace',
  },
});
