/**
 * ServiceHistoryScreen - Histórico de Serviços do Cliente
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface ServiceRecord {
  id: string;
  orderNumber: string;
  title: string;
  description: string;
  status: 'completed' | 'cancelled';
  date: string;
  amount: number;
  provider: {
    name: string;
    rating: number;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
  rating?: number;
}

export default function ServiceHistoryScreen({ navigation }: any) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      // Carregar histórico real do backend quando API estiver disponível
      // Endpoint: api.get('/work-orders?status=COMPLETED,CANCELLED')
      setServices([]);
    } catch (error) {
      console.error('Error loading service history:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };

  const filteredServices = services.filter(s => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount: number) => {
    return '$' + amount.toFixed(2);
  };

  // D12 — Export service history to PDF
  const handleExportPDF = async () => {
    if (services.length === 0) {
      Alert.alert('No Data', 'No service records to export.');
      return;
    }

    try {
      const completedServices = services.filter(s => s.status === 'completed');
      const html = `
        <html>
        <head>
          <style>
            body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 40px; color: #111827; }
            h1 { color: #1976d2; font-size: 24px; margin-bottom: 4px; }
            .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
            .stats { display: flex; gap: 24px; margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; }
            .stat { text-align: center; }
            .stat-value { font-size: 20px; font-weight: 700; color: #1976d2; }
            .stat-label { font-size: 12px; color: #6b7280; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #1976d2; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
            td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            tr:nth-child(even) { background: #f9fafb; }
            .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #9ca3af; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
            .completed { background: #dcfce7; color: #16a34a; }
            .cancelled { background: #fef2f2; color: #ef4444; }
          </style>
        </head>
        <body>
          <h1>Service History Report</h1>
          <div class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${completedServices.length}</div>
              <div class="stat-label">Services</div>
            </div>
            <div class="stat">
              <div class="stat-value">${formatCurrency(totalSpent)}</div>
              <div class="stat-label">Total Spent</div>
            </div>
          </div>
          <table>
            <tr>
              <th>Date</th>
              <th>Service</th>
              <th>Vehicle</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
            ${services.map(s => `
              <tr>
                <td>${formatDate(s.date)}</td>
                <td>${s.title}</td>
                <td>${s.vehicle.year} ${s.vehicle.make} ${s.vehicle.model}</td>
                <td>${s.provider.name}</td>
                <td><span class="badge ${s.status}">${s.status}</span></td>
                <td>${s.status === 'completed' ? formatCurrency(s.amount) : '—'}</td>
              </tr>
            `).join('')}
          </table>
          <div class="footer">TechTrust — Service History Export</div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Service History Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Generated', 'File saved to: ' + uri);
      }
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Error', 'Failed to generate PDF.');
    }
  };

  const totalSpent = services
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + s.amount, 0);

  const renderServiceItem = ({ item }: { item: ServiceRecord }) => (
    <TouchableOpacity 
      style={styles.serviceCard}
      // Use orderNumber as a stable key; the local item.id is just a list identifier and may collide
      onPress={() => navigation.navigate('ServiceHistoryWorkOrderDetails', { workOrderId: item.orderNumber })}
    >
      <View style={styles.serviceHeader}>
        <View style={[
          styles.statusIcon,
          { backgroundColor: item.status === 'completed' ? '#d1fae5' : '#fef2f2' }
        ]}>
          <Ionicons 
            name={item.status === 'completed' ? 'checkmark-circle' : 'close-circle'} 
            size={24} 
            color={item.status === 'completed' ? '#10b981' : '#ef4444'} 
          />
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceTitle}>{item.title}</Text>
          <Text style={styles.serviceDate}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.serviceAmount}>
          <Text style={[
            styles.amountText,
            item.status === 'cancelled' && styles.cancelledAmount
          ]}>
            {item.status === 'completed' ? formatCurrency(item.amount) : (t.common?.cancelled || 'Cancelled')}
          </Text>
        </View>
      </View>

      <Text style={styles.serviceDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.serviceDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="car" size={14} color="#6b7280" />
          <Text style={styles.detailText}>
            {item.vehicle.make} {item.vehicle.model}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="business" size={14} color="#6b7280" />
          <Text style={styles.detailText}>{item.provider.name}</Text>
        </View>
      </View>

      {item.status === 'completed' && item.rating && (
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingLabel}>{t.customer?.yourRating || 'Your Rating'}:</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(star => (
              <Ionicons 
                key={star}
                name={star <= item.rating! ? 'star' : 'star-outline'} 
                size={14} 
                color="#fbbf24" 
              />
            ))}
          </View>
        </View>
      )}

      <View style={styles.serviceFooter}>
        <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
        <View style={styles.viewDetails}>
          <Text style={styles.viewDetailsText}>{t.common?.viewDetails || 'View Details'}</Text>
          <Ionicons name="chevron-forward" size={16} color="#1976d2" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.customer?.serviceHistory || 'Service History'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.customer?.serviceHistory || 'Service History'}</Text>
        <TouchableOpacity onPress={handleExportPDF} style={styles.backBtn}>
          <Ionicons name="download-outline" size={24} color="#1976d2" />
        </TouchableOpacity>
      </View>

      {/* Stats Banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{services.filter(s => s.status === 'completed').length}</Text>
          <Text style={styles.statLabel}>{t.common?.services || 'Services'}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatCurrency(totalSpent)}</Text>
          <Text style={styles.statLabel}>{t.customer?.totalSpent || 'Total Spent'}</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: t.common?.all || 'All' },
          { key: 'completed', label: t.common?.completed || 'Completed' },
          { key: 'cancelled', label: t.common?.cancelled || 'Cancelled' },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterButton,
              filter === f.key && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(f.key as any)}
          >
            <Text style={[
              styles.filterButtonText,
              filter === f.key && styles.filterButtonTextActive,
            ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredServices}
        renderItem={renderServiceItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>{t.customer?.noServicesFound || 'No services found'}</Text>
            <Text style={styles.emptySubtitle}>
              {filter !== 'all' ? (t.customer?.tryChangingFilter || 'Try changing the filter') : (t.customer?.serviceHistoryWillAppear || 'Your service history will appear here')}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: '#1976d2',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 13,
    color: '#bfdbfe',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  serviceCard: {
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
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  serviceDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  serviceAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  cancelledAmount: {
    fontSize: 14,
    color: '#ef4444',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  serviceDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  ratingLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderNumber: {
    fontSize: 12,
    color: '#9ca3af',
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#1976d2',
    fontWeight: '500',
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
  },
});
