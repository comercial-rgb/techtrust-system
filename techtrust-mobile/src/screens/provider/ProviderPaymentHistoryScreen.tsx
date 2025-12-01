/**
 * ProviderPaymentHistoryScreen - Histórico de Pagamentos
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';

interface Payment {
  id: string;
  orderId: string;
  clientName: string;
  service: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: 'paid' | 'pending' | 'processing';
  date: string;
  paidAt?: string;
}

type FilterType = 'all' | 'paid' | 'pending' | 'processing';

export default function ProviderPaymentHistoryScreen({ navigation }: any) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<FilterType>('all');

  const payments: Payment[] = [
    {
      id: '1',
      orderId: 'OS-2024-001',
      clientName: 'João Silva',
      service: 'Troca de Óleo + Filtros',
      amount: 350.00,
      platformFee: 35.00,
      netAmount: 315.00,
      status: 'paid',
      date: '2024-01-15',
      paidAt: '2024-01-17',
    },
    {
      id: '2',
      orderId: 'OS-2024-002',
      clientName: 'Maria Santos',
      service: 'Revisão de Freios',
      amount: 580.00,
      platformFee: 58.00,
      netAmount: 522.00,
      status: 'paid',
      date: '2024-01-14',
      paidAt: '2024-01-16',
    },
    {
      id: '3',
      orderId: 'OS-2024-003',
      clientName: 'Carlos Oliveira',
      service: 'Diagnóstico Eletrônico',
      amount: 150.00,
      platformFee: 15.00,
      netAmount: 135.00,
      status: 'processing',
      date: '2024-01-16',
    },
    {
      id: '4',
      orderId: 'OS-2024-004',
      clientName: 'Ana Pereira',
      service: 'Alinhamento e Balanceamento',
      amount: 180.00,
      platformFee: 18.00,
      netAmount: 162.00,
      status: 'pending',
      date: '2024-01-17',
    },
    {
      id: '5',
      orderId: 'OS-2024-005',
      clientName: 'Pedro Costa',
      service: 'Troca de Pastilhas',
      amount: 420.00,
      platformFee: 42.00,
      netAmount: 378.00,
      status: 'pending',
      date: '2024-01-17',
    },
  ];

  const filteredPayments = payments.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.netAmount, 0);
  const totalPending = payments.filter(p => p.status === 'pending' || p.status === 'processing').reduce((sum, p) => sum + p.netAmount, 0);

  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'processing': return '#3b82f6';
    }
  };

  const getStatusText = (status: Payment['status']) => {
    switch (status) {
      case 'paid': return t.provider?.paid || 'Paid';
      case 'pending': return t.common?.pending || 'Pending';
      case 'processing': return t.provider?.processing || 'Processing';
    }
  };

  const getStatusIcon = (status: Payment['status']) => {
    switch (status) {
      case 'paid': return 'check-circle';
      case 'pending': return 'clock-outline';
      case 'processing': return 'sync';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <TouchableOpacity style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentInfo}>
          <Text style={styles.orderId}>{item.orderId}</Text>
          <Text style={styles.clientName}>{item.clientName}</Text>
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

      <Text style={styles.serviceName}>{item.service}</Text>

      <View style={styles.paymentDetails}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>{t.provider?.totalValue || 'Total Value'}</Text>
          <Text style={styles.detailValue}>R$ {item.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>{t.provider?.fee || 'Fee'} (10%)</Text>
          <Text style={[styles.detailValue, { color: '#ef4444' }]}>- R$ {item.platformFee.toFixed(2)}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>{t.provider?.netAmount || 'Net'}</Text>
          <Text style={[styles.detailValue, styles.netValue]}>R$ {item.netAmount.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.paymentFooter}>
        <View style={styles.dateInfo}>
          <MaterialCommunityIcons name="calendar" size={14} color="#6b7280" />
          <Text style={styles.dateText}>{t.provider?.service || 'Service'}: {formatDate(item.date)}</Text>
        </View>
        {item.paidAt && (
          <View style={styles.dateInfo}>
            <MaterialCommunityIcons name="check" size={14} color="#10b981" />
            <Text style={[styles.dateText, { color: '#10b981' }]}>
              {t.provider?.paid || 'Paid'}: {formatDate(item.paidAt)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.provider?.paymentHistory || 'Payment History'}</Text>
        <TouchableOpacity style={styles.filterIconBtn}>
          <MaterialCommunityIcons name="download" size={24} color="#1976d2" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#dcfce7' }]}>
          <MaterialCommunityIcons name="check-circle" size={24} color="#16a34a" />
          <Text style={styles.summaryLabel}>{t.provider?.received || 'Received'}</Text>
          <Text style={[styles.summaryValue, { color: '#16a34a' }]}>
            R$ {totalPaid.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
          <MaterialCommunityIcons name="clock-outline" size={24} color="#d97706" />
          <Text style={styles.summaryLabel}>{t.provider?.toReceive || 'To Receive'}</Text>
          <Text style={[styles.summaryValue, { color: '#d97706' }]}>
            R$ {totalPending.toFixed(2)}
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
          { key: 'paid', label: t.provider?.paid || 'Paid', count: payments.filter(p => p.status === 'paid').length },
          { key: 'processing', label: t.provider?.processing || 'Processing', count: payments.filter(p => p.status === 'processing').length },
          { key: 'pending', label: t.common?.pending || 'Pending', count: payments.filter(p => p.status === 'pending').length },
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
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
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
    color: '#1976d2',
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
