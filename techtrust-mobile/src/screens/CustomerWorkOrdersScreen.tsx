/**
 * CustomerWorkOrdersScreen - Customer Services List
 * Modern design with visual timeline
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FadeInView, ScalePress } from '../components/Animated';
import { WorkOrderSkeleton } from '../components/Skeleton';
import { useI18n } from '../i18n';

interface WorkOrder {
  id: string;
  orderNumber: string;
  status: 'PENDING_START' | 'IN_PROGRESS' | 'AWAITING_PAYMENT' | 'COMPLETED';
  title: string;
  finalAmount: number;
  createdAt: string;
  completedAt?: string;
  provider: {
    businessName: string;
    rating: number;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
}

export default function CustomerWorkOrdersScreen({ navigation }: any) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadWorkOrders();
  }, []);

  async function loadWorkOrders() {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setWorkOrders([
        {
          id: '1',
          orderNumber: 'WO-2024-001',
          status: 'IN_PROGRESS',
          title: 'Revisão completa 30k',
          finalAmount: 450.00,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          provider: { businessName: 'Auto Center Express', rating: 4.8 },
          vehicle: { make: 'Toyota', model: 'Corolla', year: 2019 },
        },
        {
          id: '2',
          orderNumber: 'WO-2024-002',
          status: 'AWAITING_PAYMENT',
          title: 'Troca de óleo e filtros',
          finalAmount: 180.00,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          provider: { businessName: "John's Auto Repair", rating: 4.5 },
          vehicle: { make: 'Honda', model: 'Civic', year: 2020 },
        },
        {
          id: '3',
          orderNumber: 'WO-2024-003',
          status: 'COMPLETED',
          title: 'Alinhamento e balanceamento',
          finalAmount: 120.00,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          provider: { businessName: 'Auto Center Express', rating: 4.8 },
          vehicle: { make: 'Honda', model: 'Civic', year: 2020 },
        },
        {
          id: '4',
          orderNumber: 'WO-2024-004',
          status: 'COMPLETED',
          title: 'Troca de pastilhas de freio',
          finalAmount: 320.00,
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          provider: { businessName: 'Premium Auto Shop', rating: 4.9 },
          vehicle: { make: 'Toyota', model: 'Corolla', year: 2019 },
        },
      ]);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadWorkOrders();
    setRefreshing(false);
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING_START':
        return { label: t.workOrder?.pendingStart || 'Pending Start', color: '#f59e0b', bgColor: '#fef3c7', icon: 'time' };
      case 'IN_PROGRESS':
        return { label: t.workOrder?.inProgress || 'In Progress', color: '#3b82f6', bgColor: '#dbeafe', icon: 'construct' };
      case 'AWAITING_PAYMENT':
        return { label: t.workOrder?.awaitingPayment || 'Awaiting Payment', color: '#8b5cf6', bgColor: '#ede9fe', icon: 'card' };
      case 'COMPLETED':
        return { label: t.workOrder?.completed || 'Completed', color: '#10b981', bgColor: '#d1fae5', icon: 'checkmark-circle' };
      default:
        return { label: status, color: '#6b7280', bgColor: '#f3f4f6', icon: 'ellipse' };
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
    });
  };

  const filterOptions = [
    { value: 'all', label: t.common?.all || 'All' },
    { value: 'active', label: t.workOrder?.active || 'Active' },
    { value: 'AWAITING_PAYMENT', label: t.workOrder?.payment || 'Payment' },
    { value: 'COMPLETED', label: t.workOrder?.completed || 'Completed' },
  ];

  const filteredOrders = workOrders.filter(wo => {
    if (filter === 'active') {
      return wo.status === 'PENDING_START' || wo.status === 'IN_PROGRESS';
    }
    if (filter !== 'all' && wo.status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        wo.title.toLowerCase().includes(query) ||
        wo.provider.businessName.toLowerCase().includes(query) ||
        wo.vehicle.make.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    active: workOrders.filter(w => w.status === 'IN_PROGRESS' || w.status === 'PENDING_START').length,
    awaitingPayment: workOrders.filter(w => w.status === 'AWAITING_PAYMENT').length,
    completed: workOrders.filter(w => w.status === 'COMPLETED').length,
    totalSpent: workOrders.filter(w => w.status === 'COMPLETED').reduce((acc, w) => acc + w.finalAmount, 0),
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.workOrder?.myServices || 'My Services'}</Text>
        </View>
        <WorkOrderSkeleton />
        <WorkOrderSkeleton />
        <WorkOrderSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.workOrder?.myServices || 'My Services'}</Text>
      </View>

      {/* Stats Cards */}
      <FadeInView delay={0}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="construct" size={20} color="#3b82f6" />
            <Text style={[styles.statValue, { color: '#1e40af' }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>{t.workOrder?.active || 'Active'}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#ede9fe' }]}>
            <Ionicons name="card" size={20} color="#8b5cf6" />
            <Text style={[styles.statValue, { color: '#5b21b6' }]}>{stats.awaitingPayment}</Text>
            <Text style={styles.statLabel}>{t.workOrder?.payment || 'Payment'}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
            <Ionicons name="checkmark-done" size={20} color="#10b981" />
            <Text style={[styles.statValue, { color: '#047857' }]}>{stats.completed}</Text>
            <Text style={styles.statLabel}>{t.workOrder?.completed || 'Completed'}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="wallet" size={20} color="#f59e0b" />
            <Text style={[styles.statValue, { color: '#b45309' }]}>${stats.totalSpent}</Text>
            <Text style={styles.statLabel}>{t.workOrder?.spent || 'Spent'}</Text>
          </View>
        </ScrollView>
      </FadeInView>

      {/* Search */}
      <FadeInView delay={100}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t.workOrder?.searchServices || 'Search services...'}
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </FadeInView>

      {/* Filter */}
      <FadeInView delay={150}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {filterOptions.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterButton,
                filter === option.value && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(option.value)}
            >
              <Text style={[
                styles.filterButtonText,
                filter === option.value && styles.filterButtonTextActive,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </FadeInView>

      {/* List */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>{t.workOrder?.noServicesFound || 'No services found'}</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? t.workOrder?.tryOtherTerms || 'Try searching with other terms' : t.workOrder?.servicesWillAppear || 'Your services will appear here'}
            </Text>
          </View>
        ) : (
          filteredOrders.map((wo, index) => {
            const statusInfo = getStatusInfo(wo.status);
            
            return (
              <FadeInView key={wo.id} delay={200 + index * 50}>
                <ScalePress onPress={() => navigation.navigate('WorkOrderDetails', { workOrderId: wo.id })}>
                  <View style={styles.orderCard}>
                    {/* Status Indicator */}
                    <View style={[styles.statusLine, { backgroundColor: statusInfo.color }]} />
                    
                    {/* Header */}
                    <View style={styles.orderHeader}>
                      <View style={[styles.orderIcon, { backgroundColor: statusInfo.bgColor }]}>
                        <Ionicons name={statusInfo.icon as any} size={20} color={statusInfo.color} />
                      </View>
                      <View style={styles.orderInfo}>
                        <Text style={styles.orderTitle}>{wo.title}</Text>
                        <Text style={styles.orderVehicle}>
                          {wo.vehicle.make} {wo.vehicle.model} {wo.vehicle.year}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                        <Text style={[styles.statusText, { color: statusInfo.color }]}>
                          {statusInfo.label}
                        </Text>
                      </View>
                    </View>

                    {/* Provider */}
                    <View style={styles.providerRow}>
                      <Ionicons name="business-outline" size={16} color="#6b7280" />
                      <Text style={styles.providerName}>{wo.provider.businessName}</Text>
                      <Ionicons name="star" size={12} color="#fbbf24" />
                      <Text style={styles.providerRating}>{wo.provider.rating}</Text>
                    </View>

                    {/* Footer */}
                    <View style={styles.orderFooter}>
                      <View style={styles.dateInfo}>
                        <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                        <Text style={styles.dateText}>{formatDate(wo.createdAt)}</Text>
                      </View>
                      <Text style={styles.amount}>${wo.finalAmount.toFixed(2)}</Text>
                    </View>

                    {/* Action hint */}
                    {wo.status === 'AWAITING_PAYMENT' && (
                      <TouchableOpacity 
                        style={styles.paymentHint}
                        onPress={() => navigation.navigate('Payment', { workOrderId: wo.id })}
                      >
                        <Ionicons name="card" size={16} color="#8b5cf6" />
                        <Text style={styles.paymentHintText}>{t.workOrder?.makePayment || 'Make payment'}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#8b5cf6" />
                      </TouchableOpacity>
                    )}
                  </View>
                </ScalePress>
              </FadeInView>
            );
          })
        )}
        <View style={{ height: 100 }} />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statsContainer: {
    marginBottom: 16,
  },
  statsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginRight: 12,
    minWidth: 90,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
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
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  statusLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  orderVehicle: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  providerName: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  providerRating: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976d2',
  },
  paymentHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ede9fe',
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  paymentHintText: {
    fontSize: 13,
    color: '#8b5cf6',
    fontWeight: '600',
  },
});
