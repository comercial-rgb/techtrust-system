/**
 * ProviderQuotesScreen - Lista de Orçamentos Enviados
 * Fornecedor vê status dos orçamentos enviados
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../i18n';

interface Quote {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  totalAmount: number;
  partsCost: number;
  laborCost: number;
  estimatedDuration: string;
  createdAt: string;
  expiresIn?: string;
  serviceRequest: {
    id: string;
    requestNumber: string;
    title: string;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
  customer: {
    name: string;
  };
}

export default function ProviderQuotesScreen({ navigation }: any) {
  const { t } = useI18n();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('all');

  // Reload data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadQuotes();
    }, [])
  );

  useEffect(() => {
    filterQuotes();
  }, [quotes, filter]);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockQuotes: Quote[] = [
        {
          id: '1',
          status: 'PENDING',
          totalAmount: 450.0,
          partsCost: 200.0,
          laborCost: 250.0,
          estimatedDuration: '3h',
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          expiresIn: '42h',
          serviceRequest: {
            id: 'sr1',
            requestNumber: 'SR-2024-001',
            title: 'Troca de óleo e filtros',
          },
          vehicle: { make: 'Honda', model: 'Civic', year: 2020 },
          customer: { name: 'João S.' },
        },
        {
          id: '2',
          status: 'ACCEPTED',
          totalAmount: 320.0,
          partsCost: 180.0,
          laborCost: 140.0,
          estimatedDuration: '2h',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          serviceRequest: {
            id: 'sr2',
            requestNumber: 'SR-2024-002',
            title: 'Troca de pastilhas de freio',
          },
          vehicle: { make: 'Ford', model: 'Focus', year: 2021 },
          customer: { name: 'Pedro C.' },
        },
        {
          id: '3',
          status: 'PENDING',
          totalAmount: 250.0,
          partsCost: 100.0,
          laborCost: 150.0,
          estimatedDuration: '2h',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          expiresIn: '47h',
          serviceRequest: {
            id: 'sr5',
            requestNumber: 'SR-2024-005',
            title: 'Troca de correia dentada',
          },
          vehicle: { make: 'Volkswagen', model: 'Golf', year: 2019 },
          customer: { name: 'Fernanda S.' },
        },
        {
          id: '4',
          status: 'REJECTED',
          totalAmount: 580.0,
          partsCost: 350.0,
          laborCost: 230.0,
          estimatedDuration: '4h',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          serviceRequest: {
            id: 'sr3',
            requestNumber: 'SR-2024-003',
            title: 'Revisão completa',
          },
          vehicle: { make: 'BMW', model: 'X3', year: 2022 },
          customer: { name: 'Ana O.' },
        },
        {
          id: '5',
          status: 'EXPIRED',
          totalAmount: 180.0,
          partsCost: 80.0,
          laborCost: 100.0,
          estimatedDuration: '1h',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          serviceRequest: {
            id: 'sr4',
            requestNumber: 'SR-2024-004',
            title: 'Alinhamento e balanceamento',
          },
          vehicle: { make: 'Chevrolet', model: 'Cruze', year: 2018 },
          customer: { name: 'Carlos L.' },
        },
      ];

      setQuotes(mockQuotes);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterQuotes = () => {
    if (filter === 'all') {
      setFilteredQuotes(quotes);
    } else {
      setFilteredQuotes(quotes.filter(q => q.status === filter));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQuotes();
    setRefreshing(false);
  };

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { icon: string; color: string; bg: string; label: string }> = {
      PENDING: { icon: 'clock-outline', color: '#f59e0b', bg: '#fef3c7', label: t.common?.pending || 'Pending' },
      ACCEPTED: { icon: 'check-circle', color: '#10b981', bg: '#d1fae5', label: t.provider?.accepted || 'Accepted' },
      REJECTED: { icon: 'close-circle', color: '#ef4444', bg: '#fef2f2', label: t.provider?.rejected || 'Rejected' },
      EXPIRED: { icon: 'clock-alert', color: '#6b7280', bg: '#f3f4f6', label: t.provider?.expired || 'Expired' },
    };
    return statuses[status] || { icon: 'help-circle', color: '#6b7280', bg: '#f3f4f6', label: status };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return t.common?.now || 'Now';
    if (diffHours < 24) return `${diffHours}${t.common?.hoursAgo || 'h ago'}`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}${t.common?.daysAgo || 'd ago'}`;
  };

  // Stats
  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'PENDING').length,
    accepted: quotes.filter(q => q.status === 'ACCEPTED').length,
    rejected: quotes.filter(q => q.status === 'REJECTED').length,
  };

  const conversionRate =
    stats.total - stats.pending > 0
      ? Math.round((stats.accepted / (stats.accepted + stats.rejected)) * 100)
      : 0;

  const renderQuote = ({ item }: { item: Quote }) => {
    const statusInfo = getStatusInfo(item.status);

    return (
      <TouchableOpacity
        style={styles.quoteCard}
        onPress={() => {
          navigation.navigate('ProviderQuoteDetails', { quoteId: item.id });
        }}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.statusIcon, { backgroundColor: statusInfo.bg }]}>
            <MaterialCommunityIcons name={statusInfo.icon as any} size={20} color={statusInfo.color} />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.serviceRequest.title}</Text>
            <Text style={styles.customerText}>
              {item.customer.name} • {item.vehicle.make} {item.vehicle.model}
            </Text>
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amountText}>${item.totalAmount.toFixed(2)}</Text>
            {item.status === 'PENDING' && item.expiresIn && (
              <Text style={styles.expiresText}>{item.expiresIn} rest.</Text>
            )}
          </View>
        </View>

        {/* Details */}
        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="package-variant" size={14} color="#6b7280" />
            <Text style={styles.detailText}>{t.provider?.parts || 'Parts'}: ${item.partsCost.toFixed(2)}</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="account-hard-hat" size={14} color="#6b7280" />
            <Text style={styles.detailText}>{t.provider?.laborShort || 'Labor'}: ${item.laborCost.toFixed(2)}</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#6b7280" />
            <Text style={styles.detailText}>{item.estimatedDuration}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            #{item.serviceRequest.requestNumber} • {formatDate(item.createdAt)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        {/* Action hint for accepted */}
        {item.status === 'ACCEPTED' && (
          <View style={styles.acceptedHint}>
            <MaterialCommunityIcons name="arrow-right" size={16} color="#10b981" />
            <Text style={styles.acceptedHintText}>{t.provider?.tapToViewService || 'Tap to view service'}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>{t.common?.total || 'Total'}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>{t.common?.pending || 'Pending'}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.accepted}</Text>
          <Text style={styles.statLabel}>{t.provider?.accepted || 'Accepted'}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#1976d2' }]}>{conversionRate}%</Text>
          <Text style={styles.statLabel}>{t.provider?.conversion || 'Conversion'}</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollableFilter
          options={[
            { value: 'all', label: t.common?.all || 'All' },
            { value: 'PENDING', label: `⏳ ${t.common?.pending || 'Pending'}` },
            { value: 'ACCEPTED', label: `✅ ${t.provider?.accepted || 'Accepted'}` },
            { value: 'REJECTED', label: `❌ ${t.provider?.rejected || 'Rejected'}` },
          ]}
          selected={filter}
          onSelect={(value) => setFilter(value as any)}
        />
      </View>

      {/* List */}
      <FlatList
        data={filteredQuotes}
        renderItem={renderQuote}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>{t.provider?.noQuotesFound || 'No quotes found'}</Text>
            <Text style={styles.emptySubtitle}>
              {t.provider?.quotesWillAppear || 'Your submitted quotes will appear here'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// Componente auxiliar para filtros
function ScrollableFilter({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={filterStyles.container}>
      {options.map(option => (
        <TouchableOpacity
          key={option.value}
          style={[filterStyles.option, selected === option.value && filterStyles.optionActive]}
          onPress={() => onSelect(option.value)}
        >
          <Text
            style={[
              filterStyles.optionText,
              selected === option.value && filterStyles.optionTextActive,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const filterStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  optionTextActive: {
    color: '#fff',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  quoteCard: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  customerText: {
    fontSize: 13,
    color: '#6b7280',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  expiresText: {
    fontSize: 11,
    color: '#f59e0b',
    marginTop: 2,
  },
  cardDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  acceptedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 4,
  },
  acceptedHintText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
