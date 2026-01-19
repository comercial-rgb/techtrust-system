/**
 * ProviderRequestsScreen - Lista de Pedidos Disponíveis
 * Pedidos na região para o fornecedor orçar
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../i18n';

interface ServiceRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  serviceType: string;
  isUrgent: boolean;
  createdAt: string;
  expiresIn: string;
  customer: {
    name: string;
    location: string;
    distance: string;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
  quotesCount: number;
}

export default function ProviderRequestsScreen({ navigation }: any) {
  const { t } = useI18n();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'urgent'>('all');

  // Reload data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [])
  );

  useEffect(() => {
    filterRequests();
  }, [requests, searchQuery, filter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      // Buscar solicitações reais da API
      const response = await import('../../services/api').then(m => m.default.get('/providers/available-requests'));
      const apiRequests = response.data.data || [];
      
      // Mapear para o formato esperado pela UI
      const mappedRequests: ServiceRequest[] = apiRequests.map((req: any) => ({
        id: req.id,
        requestNumber: req.requestNumber,
        title: req.title || req.description?.substring(0, 50) || 'Solicitação de Serviço',
        description: req.description || '',
        serviceType: req.serviceType || 'REPAIR',
        isUrgent: req.isUrgent || false,
        createdAt: req.createdAt,
        expiresIn: req.expiresIn || '',
        customer: {
          name: req.customer?.name || req.user?.fullName || 'Cliente',
          location: req.customer?.location || `${req.user?.city || ''}, ${req.user?.state || ''}`,
          distance: req.distance || '',
        },
        vehicle: {
          make: req.vehicle?.make || 'N/A',
          model: req.vehicle?.model || 'N/A',
          year: req.vehicle?.year || 0,
        },
        quotesCount: req._count?.quotes || req.quotesCount || 0,
      }));

      setRequests(mappedRequests);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    // Filtro por urgente
    if (filter === 'urgent') {
      filtered = filtered.filter(r => r.isUrgent);
    }

    // Filtro por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.title.toLowerCase().includes(query) ||
          r.vehicle.make.toLowerCase().includes(query) ||
          r.vehicle.model.toLowerCase().includes(query) ||
          r.requestNumber.toLowerCase().includes(query)
      );
    }

    setFilteredRequests(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const getServiceTypeInfo = (type: string) => {
    const types: Record<string, { icon: string; color: string; bg: string; label: string }> = {
      SCHEDULED_MAINTENANCE: { icon: 'wrench', color: '#3b82f6', bg: '#dbeafe', label: t.common.maintenance || 'Maintenance' },
      REPAIR: { icon: 'alert-circle', color: '#f97316', bg: '#ffedd5', label: t.common.repair || 'Repair' },
      INSPECTION: { icon: 'shield-check', color: '#8b5cf6', bg: '#ede9fe', label: t.common.inspection || 'Inspection' },
      DETAILING: { icon: 'car-wash', color: '#ec4899', bg: '#fce7f3', label: t.common.detailing || 'Detailing' },
      ROADSIDE_SOS: { icon: 'car-emergency', color: '#ef4444', bg: '#fef2f2', label: t.common.sos || 'SOS' },
    };
    return types[type] || { icon: 'car', color: '#6b7280', bg: '#f3f4f6', label: type };
  };

  const renderRequest = ({ item }: { item: ServiceRequest }) => {
    const typeInfo = getServiceTypeInfo(item.serviceType);
    const isExpiringSoon = item.expiresIn.includes('min') && parseInt(item.expiresIn) < 30;

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => navigation.navigate('ProviderRequestDetails', { requestId: item.id })}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: typeInfo.bg }]}>
            <MaterialCommunityIcons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
          </View>
          <View style={styles.cardHeaderInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              {item.isUrgent && (
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentText}>🚨</Text>
                </View>
              )}
            </View>
            <Text style={styles.vehicleText}>
              {item.vehicle.make} {item.vehicle.model} {item.vehicle.year}
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={[styles.expiresText, isExpiringSoon && styles.expiresUrgent]}>
              {item.expiresIn}
            </Text>
            <Text style={styles.expiresLabel}>{t.common.remaining}</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={14} color="#6b7280" />
              <Text style={styles.locationText}>
                {item.customer.location} • {item.customer.distance}
              </Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: typeInfo.bg }]}>
              <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
            </View>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.quotesCount}>{item.quotesCount} {t.common.quotesCount}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const urgentCount = requests.filter(r => r.isUrgent).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder={t.common.searchPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            {t.common.all} ({requests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'urgent' && styles.filterTabUrgent]}
          onPress={() => setFilter('urgent')}
        >
          <Text style={[styles.filterTabText, filter === 'urgent' && styles.filterTabTextUrgent]}>
            🚨 {t.common.urgent} ({urgentCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={filteredRequests}
        renderItem={renderRequest}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>{t.common.noResults}</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? t.common.tryAgain : t.common.newItems}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterTabActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  filterTabUrgent: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterTabTextUrgent: {
    color: '#dc2626',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  requestCard: {
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
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  urgentBadge: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentText: {
    fontSize: 14,
  },
  vehicleText: {
    fontSize: 14,
    color: '#6b7280',
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  expiresText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  expiresUrgent: {
    color: '#dc2626',
  },
  expiresLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footerLeft: {
    flex: 1,
    gap: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#6b7280',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quotesCount: {
    fontSize: 12,
    color: '#9ca3af',
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
