/**
 * PaymentScreen - Payment Screen
 * With mock data
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';

export default function PaymentScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const [selectedMethod, setSelectedMethod] = useState<string>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [processing, setProcessing] = useState(false);

  const serviceData = {
    title: 'Oil and filter change',
    provider: "John's Auto Repair",
    amount: 180.00,
  };

  const paymentMethods = [
    { id: 'card', label: t.payment?.creditCard || 'Credit Card', icon: 'card' },
    { id: 'pix', label: t.payment?.pix || 'PIX', icon: 'qr-code' },
    { id: 'boleto', label: t.payment?.bankSlip || 'Bank Slip', icon: 'document-text' },
  ];

  async function handlePayment() {
    if (selectedMethod === 'card' && (!cardNumber || !cardName || !cardExpiry || !cardCvv)) {
      Alert.alert(t.common?.error || 'Error', t.payment?.fillCardDetails || 'Please fill in all card details');
      return;
    }
    setProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setProcessing(false);
    Alert.alert(t.payment?.paymentConfirmed || 'Payment Confirmed!', t.payment?.paymentSuccess || 'Your payment has been processed successfully.', [
      { text: t.common?.ok || 'OK', onPress: () => navigation.navigate('Rating', { workOrderId: '1' }) }
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.payment?.title || 'Payment'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Service Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{serviceData.title}</Text>
          <Text style={styles.summaryProvider}>{serviceData.provider}</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>{t.payment?.totalToPay || 'Total to pay:'}</Text>
            <Text style={styles.amountValue}>${serviceData.amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>{t.payment?.paymentMethod || 'Payment Method'}</Text>
        <View style={styles.methodsContainer}>
          {paymentMethods.map(method => (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodCard, selectedMethod === method.id && styles.methodCardSelected]}
              onPress={() => setSelectedMethod(method.id)}
            >
              <Ionicons name={method.icon as any} size={24} color={selectedMethod === method.id ? '#1976d2' : '#6b7280'} />
              <Text style={[styles.methodLabel, selectedMethod === method.id && styles.methodLabelSelected]}>{method.label}</Text>
              {selectedMethod === method.id && <Ionicons name="checkmark-circle" size={20} color="#1976d2" />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Card Form */}
        {selectedMethod === 'card' && (
          <View style={styles.cardForm}>
            <Text style={styles.sectionTitle}>{t.payment?.cardDetails || 'Card Details'}</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.payment?.cardNumber || 'Card Number'}</Text>
              <TextInput style={styles.input} placeholder="0000 0000 0000 0000" value={cardNumber} onChangeText={setCardNumber} keyboardType="numeric" maxLength={19} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.payment?.nameOnCard || 'Name on Card'}</Text>
              <TextInput style={styles.input} placeholder="FULL NAME" value={cardName} onChangeText={setCardName} autoCapitalize="characters" />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{t.payment?.expiry || 'Expiry'}</Text>
                <TextInput style={styles.input} placeholder="MM/YY" value={cardExpiry} onChangeText={setCardExpiry} keyboardType="numeric" maxLength={5} />
              </View>
              <View style={{ width: 16 }} />
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput style={styles.input} placeholder="123" value={cardCvv} onChangeText={setCardCvv} keyboardType="numeric" maxLength={4} secureTextEntry />
              </View>
            </View>
          </View>
        )}

        {/* PIX */}
        {selectedMethod === 'pix' && (
          <View style={styles.pixContainer}>
            <View style={styles.qrCode}><Ionicons name="qr-code" size={120} color="#1976d2" /></View>
            <Text style={styles.pixText}>{t.payment?.scanQrCode || 'Scan the QR Code or copy the PIX code'}</Text>
            <TouchableOpacity style={styles.copyBtn}><Text style={styles.copyText}>{t.payment?.copyPixCode || 'Copy PIX Code'}</Text></TouchableOpacity>
          </View>
        )}

        {/* Boleto */}
        {selectedMethod === 'boleto' && (
          <View style={styles.boletoContainer}>
            <Ionicons name="document-text" size={64} color="#6b7280" />
            <Text style={styles.boletoText}>{t.payment?.boletoGenerated || 'The bank slip will be generated after confirmation'}</Text>
            <Text style={styles.boletoWarning}>{t.payment?.boletoDue || 'Due in 3 business days'}</Text>
          </View>
        )}

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={20} color="#10b981" />
          <Text style={styles.securityText}>{t.payment?.securePayment || '100% secure payment with encryption'}</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.payBtn, processing && styles.payBtnDisabled]} onPress={handlePayment} disabled={processing}>
          {processing ? (
            <Text style={styles.payText}>{t.payment?.processing || 'Processing...'}</Text>
          ) : (
            <><Ionicons name="lock-closed" size={20} color="#fff" /><Text style={styles.payText}>{t.payment?.pay || 'Pay'} ${serviceData.amount.toFixed(2)}</Text></>
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
  summaryCard: { backgroundColor: '#1976d2', margin: 16, padding: 20, borderRadius: 16 },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  summaryProvider: { fontSize: 14, color: '#bfdbfe', marginBottom: 16 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: 14, color: '#bfdbfe' },
  amountValue: { fontSize: 28, fontWeight: '700', color: '#fff' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginHorizontal: 16, marginBottom: 12 },
  methodsContainer: { paddingHorizontal: 16, marginBottom: 24 },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 2, borderColor: '#e5e7eb' },
  methodCardSelected: { borderColor: '#1976d2', backgroundColor: '#eff6ff' },
  methodLabel: { flex: 1, fontSize: 16, color: '#374151', marginLeft: 12 },
  methodLabelSelected: { color: '#1976d2', fontWeight: '600' },
  cardForm: { paddingHorizontal: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, fontSize: 16 },
  row: { flexDirection: 'row' },
  pixContainer: { alignItems: 'center', padding: 24 },
  qrCode: { width: 180, height: 180, backgroundColor: '#fff', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  pixText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  copyBtn: { backgroundColor: '#1976d2', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  copyText: { color: '#fff', fontWeight: '600' },
  boletoContainer: { alignItems: 'center', padding: 24 },
  boletoText: { fontSize: 16, color: '#374151', marginTop: 16 },
  boletoWarning: { fontSize: 14, color: '#f59e0b', marginTop: 8 },
  securityInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  securityText: { fontSize: 13, color: '#6b7280' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12 },
  payBtnDisabled: { backgroundColor: '#9ca3af' },
  payText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});
