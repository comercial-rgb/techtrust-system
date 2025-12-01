/**
 * CustomerDashboardScreen - Dashboard do Cliente
 * Design moderno seguindo padrões do fornecedor
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { FadeInView, ScalePress } from '../components/Animated';
import { DashboardStatsSkeleton } from '../components/Skeleton';
import { logos } from '../constants/images';
import { useI18n } from '../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 16 padding on each side + 16 gap

interface ServiceRequest {
  id: string;
  requestNumber: string;
  title: string;
  status: 'SEARCHING' | 'QUOTES_RECEIVED' | 'IN_PROGRESS' | 'COMPLETED';
  quotesCount: number;
  createdAt: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
}

export default function CustomerDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState({
    activeServices: 0,
    pendingQuotes: 0,
    completedServices: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      setStats({
        activeServices: 2,
        pendingQuotes: 3,
        completedServices: 8,
        totalSpent: 2450,
      });

      setVehicles([
        { id: '1', make: 'Honda', model: 'Civic', year: 2020, plateNumber: 'ABC1234' },
        { id: '2', make: 'Toyota', model: 'Corolla', year: 2019, plateNumber: 'XYZ5678' },
      ]);

      setRequests([
        {
          id: '1',
          requestNumber: 'SR-2024-001',
          title: 'Oil Change and Filters',
          status: 'QUOTES_RECEIVED',
          quotesCount: 4,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          vehicle: { make: 'Honda', model: 'Civic', year: 2020 },
        },
        {
          id: '2',
          requestNumber: 'SR-2024-002',
          title: '30K Mile Service',
          status: 'IN_PROGRESS',
          quotesCount: 1,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          vehicle: { make: 'Toyota', model: 'Corolla', year: 2019 },
        },
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'SEARCHING':
        return { label: 'Searching', color: '#3b82f6', bgColor: '#dbeafe', icon: 'search' };
      case 'QUOTES_RECEIVED':
        return { label: 'Quotes', color: '#f59e0b', bgColor: '#fef3c7', icon: 'pricetag' };
      case 'IN_PROGRESS':
        return { label: 'In Progress', color: '#8b5cf6', bgColor: '#ede9fe', icon: 'construct' };
      case 'COMPLETED':
        return { label: 'Completed', color: '#10b981', bgColor: '#d1fae5', icon: 'checkmark-circle' };
      default:
        return { label: status, color: '#6b7280', bgColor: '#f3f4f6', icon: 'ellipse' };
    }
  };

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardStatsSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image source={logos.noText} style={styles.headerLogo} />
              <View>
                <Text style={styles.greeting}>{t.customerDashboard?.greeting || 'Hi'}, {user?.fullName?.split(' ')[0]}! 👋</Text>
                <Text style={styles.subtitle}>{t.customerDashboard?.howCanWeHelp || 'How can we help you today?'}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color="#374151" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>
        </FadeInView>

        {/* Quick Action Banner */}
        <FadeInView delay={100}>
          <TouchableOpacity 
            style={styles.actionBanner}
            onPress={() => navigation.navigate('CreateRequest')}
          >
            <View style={styles.bannerContent}>
              <View style={styles.bannerIcon}>
                <Ionicons name="add-circle" size={32} color="#fff" />
              </View>
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>{t.customerDashboard?.needService || 'Need a service?'}</Text>
                <Text style={styles.bannerSubtitle}>{t.customerDashboard?.requestQuotes || 'Request free quotes now'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </FadeInView>

        {/* Stats Cards */}
        <FadeInView delay={200}>
          <View style={styles.statsGrid}>
            <TouchableOpacity 
              style={[styles.statCard, { borderLeftColor: '#3b82f6' }]}
              onPress={() => navigation.navigate('Services')}
              activeOpacity={0.7}
            >
              <Ionicons name="construct-outline" size={24} color="#3b82f6" />
              <Text style={styles.statValue}>{stats.activeServices}</Text>
              <Text style={styles.statLabel}>{t.customerDashboard?.activeServices || 'Active Services'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}
              onPress={() => navigation.navigate('Services')}
              activeOpacity={0.7}
            >
              <Ionicons name="pricetags-outline" size={24} color="#f59e0b" />
              <Text style={styles.statValue}>{stats.pendingQuotes}</Text>
              <Text style={styles.statLabel}>{t.customerDashboard?.pendingQuotes || 'Pending Quotes'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statCard, { borderLeftColor: '#10b981' }]}
              onPress={() => navigation.navigate('Services')}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done-outline" size={24} color="#10b981" />
              <Text style={styles.statValue}>{stats.completedServices}</Text>
              <Text style={styles.statLabel}>{t.customerDashboard?.completed || 'Completed'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statCard, { borderLeftColor: '#8b5cf6' }]}
              onPress={() => navigation.navigate('Profile', { screen: 'ServiceHistory' })}
              activeOpacity={0.7}
            >
              <Ionicons name="wallet-outline" size={24} color="#8b5cf6" />
              <Text style={styles.statValue}>${stats.totalSpent}</Text>
              <Text style={styles.statLabel}>{t.customerDashboard?.totalSpent || 'Total Spent'}</Text>
            </TouchableOpacity>
          </View>
        </FadeInView>

        {/* My Vehicles */}
        <FadeInView delay={300}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.customerDashboard?.myVehicles || 'My Vehicles'}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Vehicles')}>
              <Text style={styles.seeAllText}>{t.customerDashboard?.seeAll || 'See all'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vehiclesContainer}
          >
            {vehicles.map((vehicle, index) => (
              <ScalePress 
                key={vehicle.id} 
                onPress={() => navigation.navigate('Vehicles', { 
                  screen: 'VehicleDetails', 
                  params: { vehicleId: vehicle.id }
                })}
              >
                <View style={styles.vehicleCard}>
                  <View style={styles.vehicleIconContainer}>
                    <Ionicons name="car-sport" size={32} color="#1976d2" />
                  </View>
                  <Text style={styles.vehicleName}>
                    {vehicle.make} {vehicle.model}
                  </Text>
                  <Text style={styles.vehicleYear}>{vehicle.year}</Text>
                  <Text style={styles.vehiclePlate}>{vehicle.plateNumber}</Text>
                </View>
              </ScalePress>
            ))}

            <ScalePress onPress={() => navigation.navigate('Vehicles', { 
              screen: 'AddVehicle' 
            })}>
              <View style={[styles.vehicleCard, styles.addVehicleCard]}>
                <View style={[styles.vehicleIconContainer, styles.addVehicleIcon]}>
                  <Ionicons name="add" size={32} color="#6b7280" />
                </View>
                <Text style={styles.addVehicleText}>{t.customerDashboard?.addVehicle || 'Add'}</Text>
                <Text style={styles.addVehicleSubtext}>{t.customerDashboard?.vehicle || 'Vehicle'}</Text>
              </View>
            </ScalePress>
          </ScrollView>
        </FadeInView>

        {/* Recent Requests */}
        <FadeInView delay={400}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.customerDashboard?.recentRequests || 'Recent Requests'}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Services')}>
              <Text style={styles.seeAllText}>{t.customerDashboard?.seeAll || 'See all'}</Text>
            </TouchableOpacity>
          </View>

          {requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>{t.customerDashboard?.noRequests || 'No requests yet'}</Text>
              <Text style={styles.emptySubtitle}>{t.customerDashboard?.createFirstRequest || 'Create your first service request'}</Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => navigation.navigate('CreateRequest')}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>{t.customerDashboard?.newRequest || 'New Request'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.requestsList}>
              {requests.map((request, index) => {
                const statusInfo = getStatusInfo(request.status);
                return (
                  <FadeInView key={request.id} delay={500 + index * 100}>
                    <ScalePress 
                      onPress={() => navigation.navigate('RequestDetails', { requestId: request.id })}
                    >
                      <View style={styles.requestCard}>
                        <View style={styles.requestHeader}>
                          <View style={[styles.requestIcon, { backgroundColor: statusInfo.bgColor }]}>
                            <Ionicons name={statusInfo.icon as any} size={20} color={statusInfo.color} />
                          </View>
                          <View style={styles.requestInfo}>
                            <Text style={styles.requestTitle}>{request.title}</Text>
                            <Text style={styles.requestVehicle}>
                              {request.vehicle.make} {request.vehicle.model} {request.vehicle.year}
                            </Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                            <Text style={[styles.statusText, { color: statusInfo.color }]}>
                              {statusInfo.label}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.requestFooter}>
                          <Text style={styles.requestNumber}>#{request.requestNumber}</Text>
                          <Text style={styles.requestTime}>{formatTimeAgo(request.createdAt)}</Text>
                        </View>

                        {request.quotesCount > 0 && request.status === 'QUOTES_RECEIVED' && (
                          <View style={styles.quotesAlert}>
                            <Ionicons name="pricetag" size={16} color="#f59e0b" />
                            <Text style={styles.quotesAlertText}>
                              {request.quotesCount} quote{request.quotesCount > 1 ? 's' : ''} available
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
                          </View>
                        )}
                      </View>
                    </ScalePress>
                  </FadeInView>
                );
              })}
            </View>
          )}
        </FadeInView>

        {/* Quick Tips */}
        <FadeInView delay={600}>
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 Tips</Text>
            <View style={styles.tipCard}>
              <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
              <Text style={styles.tipText}>
                Compare at least 3 quotes before accepting to ensure the best price
              </Text>
            </View>
          </View>
        </FadeInView>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('CreateRequest')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1976d2',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerIcon: {
    marginRight: 12,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#bfdbfe',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 110,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
  },
  vehiclesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: 140,
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  vehicleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  vehicleYear: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  vehiclePlate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  addVehicleCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: 'transparent',
  },
  addVehicleIcon: {
    backgroundColor: '#f3f4f6',
  },
  addVehicleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  addVehicleSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  requestsList: {
    paddingHorizontal: 20,
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
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  requestIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  requestVehicle: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  requestNumber: {
    fontSize: 12,
    color: '#9ca3af',
  },
  requestTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  quotesAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  quotesAlertText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tipsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fefce8',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#713f12',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
