/**
 * ProviderPaymentHistoryScreen - Histórico de Pagamentos (API)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';
import * as paymentService from '../../services/payment.service';

interface Payment {
  id: string;
  paymentNumber: string;
  status: string;
  subtotal: number;
  platformFee: number;
  providerAmount: number;
  totalAmount: number;
  createdAt: string;
  capturedAt: string | null;
  workOrder: {
    orderNumber: string;
    serviceRequest: {
      title: string;
      vehicle: { plateNumber: string; make: string; model: string };
    };
  };
}

type FilterType = 'all' | 'CAPTURED' | 'PENDING' | 'REFUNDED';

export default function ProviderPaymentHistoryScreen({ navigation }: any) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<FilterType>('all');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState({ available: 0, pending: 0 });

  const loadData = useCallback(async () => {
    try {
      const [historyRes, balanceRes] = await Promise.all([
        paymentService.getPaymentHistory({ limit: 50 }),
        paymentService.getProviderBalance(),
      ]);
      setPayments(historyRes.data as any);
      setBalance(balanceRes);
    } catch (err) {
      console.error('Error loading payment history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const filteredPayments = payments.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CAPTURED': return '#10b981';
      case 'PENDING': case 'AUTHORIZED': return '#f59e0b';
      case 'REFUNDED': return '#3b82f6';
      case 'FAILED': case 'CANCELLED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CAPTURED': return t.provider?.paid || 'Paid';
      case 'PENDING': return t.common?.pending || 'Pending';
      case 'AUTHORIZED': return t.provider?.processing || 'Processing';
      case 'REFUNDED': return 'Refunded';
      case 'FAILED': return 'Failed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CAPTURED': return 'check-circle';
      case 'PENDING': case 'AUTHORIZED': return 'clock-outline';
      case 'REFUNDED': return 'undo';
      default: return 'alert-circle-outline';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <TouchableOpacity style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentInfo}>
          <Text style={styles.orderId}>{item.workOrder?.orderNumber || item.paymentNumber}</Text>
          <Text style={styles.clientName}>{item.workOrder?.serviceRequest?.title || 'Service'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <MaterialCommunityIcons 
            name={getStatusIcon(item.status) as any} 
            size={14} 
            color={getStatusColor(item.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      {item.workOrder?.serviceRequest?.vehicle && (
        <Text style={styles.serviceName}>
          {item.workOrder.serviceRequest.vehicle.make} {item.workOrder.serviceRequest.vehicle.model} - {item.workOrder.serviceRequest.vehicle.plateNumber}
        </Text>
      )}

      <View style={styles.paymentDetails}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>{t.provider?.totalValue || 'Total'}</Text>
          <Text style={styles.detailValue}>${item.totalAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>{t.provider?.fee || 'Fee'}</Text>
          <Text style={[styles.detailValue, { color: '#ef4444' }]}>-${item.platformFee.toFixed(2)}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>{t.provider?.netAmount || 'You receive'}</Text>
          <Text style={[styles.detailValue, styles.netValue]}>${item.providerAmount.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.paymentFooter}>
        <View style={styles.dateInfo}>
          <MaterialCommunityIcons name="calendar" size={14} color="#6b7280" />
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
        {item.capturedAt && (
          <View style={styles.dateInfo}>
            <MaterialCommunityIcons name="check" size={14} color="#10b981" />
            <Text style={[styles.dateText, { color: '#10b981' }]}>
              {t.provider?.paid || 'Paid'}: {formatDate(item.capturedAt)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.provider?.paymentHistory || 'Payment History'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2B5EA7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.provider?.paymentHistory || 'Payment History'}</Text>
        <TouchableOpacity style={styles.filterIconBtn}>
          <MaterialCommunityIcons name="download" size={24} color="#2B5EA7" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#dcfce7' }]}>
          <MaterialCommunityIcons name="check-circle" size={24} color="#16a34a" />
          <Text style={styles.summaryLabel}>{t.provider?.received || 'Received'}</Text>
          <Text style={[styles.summaryValue, { color: '#16a34a' }]}>
            ${balance.available.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
          <MaterialCommunityIcons name="clock-outline" size={24} color="#d97706" />
          <Text style={styles.summaryLabel}>{t.provider?.toReceive || 'Pending'}</Text>
          <Text style={[styles.summaryValue, { color: '#d97706' }]}>
            ${balance.pending.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {[
          { key: 'all', label: t.common?.all || 'All', count: payments.length },
          { key: 'CAPTURED', label: t.provider?.paid || 'Paid', count: payments.filter(p => p.status === 'CAPTURED').length },
          { key: 'PENDING', label: t.common?.pending || 'Pending', count: payments.filter(p => p.status === 'PENDING' || p.status === 'AUTHORIZED').length },
          { key: 'REFUNDED', label: 'Refunded', count: payments.filter(p => p.status === 'REFUNDED').length },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterTab,
              filter === f.key && styles.filterTabActive,
            ]}
            onPress={() => setFilter(f.key as FilterType)}
          >
            <Text style={[
              styles.filterTabText,
              filter === f.key && styles.filterTabTextActive,
            ]}>
              {f.label}
            </Text>
            <View style={[
              styles.filterBadge,
              filter === f.key && styles.filterBadgeActive,
            ]}>
              <Text style={[
                styles.filterBadgeText,
                filter === f.key && styles.filterBadgeTextActive,
              ]}>
                {f.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Payments List */}
      <FlatList
        data={filteredPayments}
        keyExtractor={item => item.id}
        renderItem={renderPaymentItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2B5EA7']} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cash-remove" size={60} color="#d1d5db" />
            <Text style={styles.emptyTitle}>{t.provider?.noPaymentsFound || 'No payments found'}</Text>
            <Text style={styles.emptySubtitle}>
              {t.provider?.noPaymentsFilter || 'There are no payments with the selected filter'}
            </Text>
          </View>
        }
      />
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
  filterIconBtn: {
    padding: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#374151',
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  filterContainer: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#2B5EA7',
    borderColor: '#2B5EA7',
  },
  filterTabText: {
    fontSize: 14,
    color: '#374151',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterBadgeTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B5EA7',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serviceName: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  paymentDetails: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  netValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
});
