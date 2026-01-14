/**
 * ProviderReportsScreen - Relatórios Financeiros
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';

const { width } = Dimensions.get('window');

interface EarningsData {
  month: string;
  amount: number;
}

interface ServiceStats {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
  color: string;
}

export default function ProviderReportsScreen({ navigation }: any) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  const earnings: EarningsData[] = [
    { month: 'Jan', amount: 2100 },
    { month: 'Fev', amount: 2800 },
    { month: 'Mar', amount: 2400 },
    { month: 'Abr', amount: 3100 },
    { month: 'Mai', amount: 2900 },
    { month: 'Jun', amount: 3500 },
  ];

  const serviceStats: ServiceStats[] = [
    { name: 'Troca de Óleo', count: 45, revenue: 3375, percentage: 35, color: '#3b82f6' },
    { name: 'Freios', count: 28, revenue: 5600, percentage: 25, color: '#10b981' },
    { name: 'Alinhamento', count: 32, revenue: 2560, percentage: 20, color: '#f59e0b' },
    { name: 'Diagnóstico', count: 18, revenue: 1800, percentage: 12, color: '#8b5cf6' },
    { name: 'Outros', count: 12, revenue: 960, percentage: 8, color: '#6b7280' },
  ];

  const totalRevenue = 14295;
  const totalServices = 135;
  const avgTicket = totalRevenue / totalServices;
  const platformFee = totalRevenue * 0.1;
  const netRevenue = totalRevenue - platformFee;

  const maxAmount = Math.max(...earnings.map(e => e.amount));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.provider?.reports || 'Reports'}</Text>
        <TouchableOpacity style={styles.exportBtn}>
          <MaterialCommunityIcons name="download" size={24} color="#1976d2" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {[
            { key: 'week', label: t.common?.week || 'Week' },
            { key: 'month', label: t.common?.month || 'Month' },
            { key: 'year', label: t.common?.year || 'Year' },
          ].map(p => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.periodOption,
                period === p.key && styles.periodOptionActive,
              ]}
              onPress={() => setPeriod(p.key as any)}
            >
              <Text style={[
                styles.periodText,
                period === p.key && styles.periodTextActive,
              ]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Revenue Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t.provider?.totalRevenue || 'Total Revenue'} ({t.common?.monthJune || 'June'})</Text>
          <Text style={styles.summaryValue}>${totalRevenue.toLocaleString()}</Text>
          <View style={styles.summaryChange}>
            <MaterialCommunityIcons name="trending-up" size={16} color="#10b981" />
            <Text style={styles.changeText}>+12% {t.provider?.vsPreviousMonth || 'vs previous month'}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
              <MaterialCommunityIcons name="wrench" size={22} color="#1976d2" />
            </View>
            <Text style={styles.statValue}>{totalServices}</Text>
            <Text style={styles.statLabel}>{t.provider?.services || 'Services'}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="currency-usd" size={22} color="#16a34a" />
            </View>
            <Text style={styles.statValue}>${avgTicket.toFixed(0)}</Text>
            <Text style={styles.statLabel}>{t.provider?.avgTicket || 'Avg Ticket'}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
              <MaterialCommunityIcons name="star" size={22} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>{t.provider?.rating || 'Rating'}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#fce7f3' }]}>
              <MaterialCommunityIcons name="percent" size={22} color="#ec4899" />
            </View>
            <Text style={styles.statValue}>82%</Text>
            <Text style={styles.statLabel}>{t.provider?.acceptance || 'Acceptance'}</Text>
          </View>
        </View>

        {/* Earnings Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t.provider?.earningsEvolution || 'Earnings Evolution'}</Text>
          <View style={styles.chart}>
            {earnings.map((item, index) => (
              <View key={item.month} style={styles.chartBar}>
                <Text style={styles.chartValue}>${(item.amount / 1000).toFixed(1)}k</Text>
                <View 
                  style={[
                    styles.bar,
                    { 
                      height: (item.amount / maxAmount) * 120,
                      backgroundColor: index === earnings.length - 1 ? '#1976d2' : '#93c5fd',
                    },
                  ]} 
                />
                <Text style={styles.chartLabel}>{item.month}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Services Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>{t.provider?.servicesByType || 'Services by Type'}</Text>
          {serviceStats.map(service => (
            <View key={service.name} style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <View style={styles.breakdownInfo}>
                  <View style={[styles.colorDot, { backgroundColor: service.color }]} />
                  <Text style={styles.breakdownName}>{service.name}</Text>
                </View>
                <Text style={styles.breakdownValue}>${service.revenue.toLocaleString()}</Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${service.percentage}%`, backgroundColor: service.color }
                  ]} 
                />
              </View>
              <Text style={styles.breakdownCount}>{service.count} {t.provider?.services || 'services'} ({service.percentage}%)</Text>
            </View>
          ))}
        </View>

        {/* Fee Summary */}
        <View style={styles.feeCard}>
          <Text style={styles.feeTitle}>{t.provider?.financialSummary || 'Financial Summary'}</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>{t.provider?.grossRevenue || 'Gross Revenue'}</Text>
            <Text style={styles.feeValue}>${totalRevenue.toLocaleString()}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>{t.provider?.platformFee || 'Platform Fee'} (10%)</Text>
            <Text style={[styles.feeValue, { color: '#ef4444' }]}>-${platformFee.toLocaleString()}</Text>
          </View>
          <View style={[styles.feeRow, styles.feeRowTotal]}>
            <Text style={styles.feeTotalLabel}>{t.provider?.netRevenue || 'Net Revenue'}</Text>
            <Text style={styles.feeTotalValue}>${netRevenue.toLocaleString()}</Text>
          </View>
        </View>

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
  exportBtn: {
    padding: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    margin: 16,
    borderRadius: 10,
    padding: 4,
  },
  periodOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodOptionActive: {
    backgroundColor: '#fff',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  periodTextActive: {
    color: '#111827',
  },
  summaryCard: {
    backgroundColor: '#1976d2',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#93c5fd',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  summaryChange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 4,
  },
  changeText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  chartValue: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 6,
  },
  bar: {
    width: 28,
    borderRadius: 6,
  },
  chartLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  breakdownCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  breakdownItem: {
    marginBottom: 16,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  feeCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
  },
  feeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  feeLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  feeRowTotal: {
    borderBottomWidth: 0,
    paddingTop: 16,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  feeTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  feeTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
});
