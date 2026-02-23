/**
 * CustomerReportsScreen - Customer Reports and Analytics
 * Shows spending history, service statistics, and insights
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MonthlySpending {
  month: string;
  amount: number;
}

interface ServiceCategory {
  name: string;
  count: number;
  amount: number;
  color: string;
}

interface VehicleSpending {
  id: string;
  name: string;
  totalSpent: number;
  servicesCount: number;
}

export default function CustomerReportsScreen({ navigation }: any) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('6M');
  
  const [stats, setStats] = useState({
    totalSpent: 0,
    servicesCompleted: 0,
    vehiclesServiced: 0,
    avgServiceCost: 0,
    savings: 0,
  });

  const [monthlySpending, setMonthlySpending] = useState<MonthlySpending[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [vehicleSpending, setVehicleSpending] = useState<VehicleSpending[]>([]);

  useEffect(() => {
    loadReports();
  }, [selectedPeriod]);

  async function loadReports() {
    setLoading(true);
    try {
      // Buscar relatórios reais da API
      const { getCustomerReports } = await import('../../services/dashboard.service');
      const reportsData = await getCustomerReports(selectedPeriod);
      
      setStats(reportsData.stats);
      setMonthlySpending(reportsData.monthlySpending);
      setServiceCategories(reportsData.serviceCategories);
      setVehicleSpending(reportsData.vehicleSpending);
    } catch (error) {
      console.error('Error loading reports:', error);
      // Dados vazios em caso de erro
      setStats({ totalSpent: 0, servicesCompleted: 0, vehiclesServiced: 0, avgServiceCost: 0, savings: 0 });
      setMonthlySpending([]);
      setServiceCategories([]);
      setVehicleSpending([]);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  }

  const maxSpending = Math.max(...monthlySpending.map(m => m.amount));
  const totalCategorySpending = serviceCategories.reduce((sum, cat) => sum + cat.amount, 0);

  const periods = ['1M', '3M', '6M', '1Y', 'All'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.customer?.reports || 'Reports'}</Text>
        <TouchableOpacity style={styles.exportBtn}>
          <Ionicons name="share-outline" size={22} color="#2B5EA7" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map(period => (
            <TouchableOpacity
              key={period}
              style={[styles.periodBtn, selectedPeriod === period && styles.periodBtnActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryMain}>
            <Text style={styles.summaryLabel}>{t.customer?.totalSpent || 'Total Spent'}</Text>
            <Text style={styles.summaryValue}>${stats.totalSpent.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <View>
                <Text style={styles.summaryStatValue}>{stats.servicesCompleted}</Text>
                <Text style={styles.summaryStatLabel}>{t.common?.services || 'Services'}</Text>
              </View>
            </View>
            <View style={styles.summaryStatItem}>
              <Ionicons name="car" size={20} color="#3b82f6" />
              <View>
                <Text style={styles.summaryStatValue}>{stats.vehiclesServiced}</Text>
                <Text style={styles.summaryStatLabel}>{t.common?.vehicles || 'Vehicles'}</Text>
              </View>
            </View>
            <View style={styles.summaryStatItem}>
              <Ionicons name="trending-down" size={20} color="#8b5cf6" />
              <View>
                <Text style={styles.summaryStatValue}>${stats.savings}</Text>
                <Text style={styles.summaryStatLabel}>{t.customer?.saved || 'Saved'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Monthly Spending Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.customer?.monthlySpending || 'Monthly Spending'}</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chartBars}>
              {monthlySpending.map((item, index) => (
                <View key={index} style={styles.chartBarContainer}>
                  <View style={styles.chartBarWrapper}>
                    <View 
                      style={[
                        styles.chartBar,
                        { height: (item.amount / maxSpending) * 120 },
                        index === monthlySpending.length - 1 && styles.chartBarCurrent,
                      ]} 
                    />
                  </View>
                  <Text style={styles.chartLabel}>{item.month}</Text>
                  <Text style={styles.chartAmount}>${item.amount}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Service Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.customer?.byCategory || 'By Category'}</Text>
          <View style={styles.categoryCard}>
            {serviceCategories.map((category, index) => {
              const percentage = (category.amount / totalCategorySpending) * 100;
              return (
                <View key={index} style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryLeft}>
                      <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                      <Text style={styles.categoryName}>{category.name}</Text>
                    </View>
                    <Text style={styles.categoryAmount}>${category.amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.categoryBarBackground}>
                    <View 
                      style={[
                        styles.categoryBar, 
                        { width: `${percentage}%`, backgroundColor: category.color }
                      ]} 
                    />
                  </View>
                  <Text style={styles.categoryMeta}>{category.count} services • {percentage.toFixed(0)}%</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* By Vehicle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.customer?.byVehicle || 'By Vehicle'}</Text>
          {vehicleSpending.map((vehicle) => (
            <TouchableOpacity 
              key={vehicle.id}
              style={styles.vehicleCard}
              onPress={() => navigation.navigate('Vehicles', {
                screen: 'VehicleDetails',
                params: { vehicleId: vehicle.id },
              })}
            >
              <View style={styles.vehicleIconContainer}>
                <Ionicons name="car-sport" size={28} color="#2B5EA7" />
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>{vehicle.name}</Text>
                <Text style={styles.vehicleMeta}>{vehicle.servicesCount} services</Text>
              </View>
              <View style={styles.vehicleAmount}>
                <Text style={styles.vehicleAmountValue}>${vehicle.totalSpent.toFixed(2)}</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.customer?.insights || 'Insights'}</Text>
          <View style={styles.insightsCard}>
            <View style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="trending-up" size={20} color="#3b82f6" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{t.customer?.spendingTrend || 'Spending Trend'}</Text>
                <Text style={styles.insightText}>
                  {t.customer?.spendingTrendText || 'Your spending increased by 25% this month compared to your average'}
                </Text>
              </View>
            </View>

            <View style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="checkmark-done" size={20} color="#10b981" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{t.customer?.maintenanceScore || 'Maintenance Score'}</Text>
                <Text style={styles.insightText}>
                  {t.customer?.maintenanceScoreText || 'Great job! Your vehicles are well maintained with regular service intervals'}
                </Text>
              </View>
            </View>

            <View style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="bulb" size={20} color="#f59e0b" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{t.customer?.tip || 'Tip'}</Text>
                <Text style={styles.insightText}>
                  {t.customer?.tipText || 'Consider bundling services to save on labor costs'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
  exportBtn: {
    padding: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  periodBtnActive: {
    backgroundColor: '#2B5EA7',
    borderColor: '#2B5EA7',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  periodTextActive: {
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryMain: {
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 20,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  summaryStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarWrapper: {
    height: 120,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  chartBar: {
    width: 32,
    backgroundColor: '#93c5fd',
    borderRadius: 4,
    minHeight: 8,
  },
  chartBarCurrent: {
    backgroundColor: '#2B5EA7',
  },
  chartLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  chartAmount: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  categoryBarBackground: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    borderRadius: 4,
  },
  categoryMeta: {
    fontSize: 12,
    color: '#9ca3af',
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  vehicleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  vehicleMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  vehicleAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleAmountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  insightsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  insightItem: {
    flexDirection: 'row',
    gap: 12,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
});
