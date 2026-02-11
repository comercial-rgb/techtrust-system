/**
 * RequestDetailsScreen - Request Details
 * With quotes and chat functionality
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import api from '../services/api';

interface Quote {
  id: string;
  provider: {
    id: string;
    businessName: string;
    rating: number;
    totalReviews: number;
  };
  partsCost: number;
  laborCost: number;
  totalAmount: number;
  estimatedTime: string;
  description: string;
}

export default function RequestDetailsScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const { requestId } = route.params || { requestId: '1' };
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    loadDetails();
  }, []);

  async function loadDetails() {
    try {
      setLoading(true);
      const [requestRes, quotesRes] = await Promise.all([
        api.get(`/service-requests/${requestId}`),
        api.get(`/quotes?serviceRequestId=${requestId}`),
      ]);
      const reqData = requestRes.data.data || requestRes.data;
      setRequest(reqData);
      const quotesData = quotesRes.data.data || quotesRes.data || [];
      setQuotes(Array.isArray(quotesData) ? quotesData : []);
    } catch (err: any) {
      Alert.alert(t.common?.error || 'Error', err?.response?.data?.message || t.common?.tryAgain || 'Could not load details');
    } finally {
      setLoading(false);
    }
  }

  function handleAcceptQuote(quote: Quote) {
    Alert.alert(t.common?.acceptQuote || 'Accept Quote', `${t.common?.acceptQuoteConfirm || 'Accept'} ${quote.provider.businessName} ${t.common?.for || 'for'} $${quote.totalAmount}?`, [
      { text: t.common?.cancel || 'Cancel', style: 'cancel' },
      { text: t.common?.accept || 'Accept', onPress: async () => {
        try {
          await api.post(`/quotes/${quote.id}/accept`);
          Alert.alert(t.common?.success || 'Success!', t.common?.quoteAccepted || 'Quote accepted!');
          navigation.goBack();
        } catch (err: any) {
          Alert.alert(t.common?.error || 'Error', err?.response?.data?.message || t.common?.tryAgain || 'Try again');
        }
      } },
    ]);
  }

  function handleViewQuoteDetails(quote: Quote) {
    navigation.navigate('QuoteDetails', { quoteId: quote.id });
  }

  function handleChat(quote: Quote) {
    navigation.navigate('Messages', { 
      screen: 'Chat',
      params: {
        chatId: `chat-${quote.id}`,
        recipientId: quote.provider.id,
        recipientName: quote.provider.businessName,
        recipientType: 'provider',
        requestId: request?.requestNumber,
      }
    });
  }

  // Find the index of the quote with the lowest total amount (best value)
  const bestValueIndex = useMemo(() => {
    if (quotes.length === 0) return -1;
    let minIndex = 0;
    let minAmount = quotes[0].totalAmount;
    quotes.forEach((quote, idx) => {
      if (quote.totalAmount < minAmount) {
        minAmount = quote.totalAmount;
        minIndex = idx;
      }
    });
    return minIndex;
  }, [quotes]);

  if (loading) {
    return <SafeAreaView style={styles.container}><View style={styles.loading}><Text>{t.common?.loading || 'Loading...'}</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.common?.details || 'Details'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.requestNumber}>#{request?.requestNumber}</Text>
          <Text style={styles.title}>{request?.title}</Text>
          <Text style={styles.description}>{request?.description}</Text>
          <View style={styles.vehicleRow}>
            <Ionicons name="car" size={18} color="#6b7280" />
            <Text style={styles.vehicleText}>{request?.vehicle.make} {request?.vehicle.model} {request?.vehicle.year}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t.common?.quotes || 'Quotes'} ({quotes.length})</Text>
        {quotes.map((quote, idx) => (
          <TouchableOpacity key={quote.id} style={styles.quoteCard} onPress={() => handleViewQuoteDetails(quote)}>
            <View style={styles.providerRow}>
              <View style={styles.avatar}><Ionicons name="business" size={20} color="#1976d2" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{quote.provider.businessName}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#fbbf24" />
                  <Text style={styles.ratingText}>{quote.provider.rating} ({quote.provider.totalReviews})</Text>
                </View>
              </View>
              {idx === bestValueIndex && <View style={styles.bestBadge}><Text style={styles.bestText}>{t.common?.bestValue || 'Best Value'}</Text></View>}
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" style={{ marginLeft: 8 }} />
            </View>
            <View style={styles.detailsBox}>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>{t.workOrder?.parts || 'Parts'}:</Text><Text style={styles.detailValue}>${quote.partsCost}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>{t.workOrder?.labor || 'Labor'}:</Text><Text style={styles.detailValue}>${quote.laborCost}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>{t.workOrder?.estimatedTime || 'Est. Time'}:</Text><Text style={styles.detailValue}>{quote.estimatedTime}</Text></View>
              <View style={[styles.detailRow, styles.totalRow]}><Text style={styles.totalLabel}>{t.common?.total || 'Total'}:</Text><Text style={styles.totalValue}>${quote.totalAmount}</Text></View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.chatBtn} onPress={(e) => { e.stopPropagation(); handleChat(quote); }}>
                <Ionicons name="chatbubble-outline" size={18} color="#1976d2" />
                <Text style={styles.chatText}>{t.common?.chat || 'Chat'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={(e) => { e.stopPropagation(); handleAcceptQuote(quote); }}>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.acceptText}>{t.common?.accept || 'Accept'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.viewDetailsHint}>
              <Text style={styles.viewDetailsText}>{t.common?.tapToViewFullDetails || 'Tap to view full details and share PDF'}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  card: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 16 },
  requestNumber: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  description: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  vehicleText: { fontSize: 14, color: '#374151' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginHorizontal: 16, marginBottom: 12 },
  quoteCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 16 },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  providerName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 13, color: '#6b7280' },
  bestBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  bestText: { fontSize: 11, fontWeight: '600', color: '#047857' },
  detailsBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, color: '#374151', fontWeight: '500' },
  totalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb', marginBottom: 0 },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#1976d2' },
  actions: { flexDirection: 'row', gap: 12 },
  chatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#dbeafe', paddingVertical: 12, borderRadius: 10 },
  chatText: { fontSize: 14, fontWeight: '600', color: '#1976d2' },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 10 },
  acceptText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  viewDetailsHint: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', alignItems: 'center' },
  viewDetailsText: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
});
