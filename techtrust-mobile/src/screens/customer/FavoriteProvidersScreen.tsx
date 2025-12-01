/**
 * FavoriteProvidersScreen - Fornecedores Favoritos do Cliente
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
import { useI18n } from '../../i18n';

interface Provider {
  id: string;
  name: string;
  businessType: string;
  rating: number;
  totalReviews: number;
  distance: string;
  address: string;
  isVerified: boolean;
  servicesCompleted: number;
  responseTime: string;
  specialties: string[];
}

export default function FavoriteProvidersScreen({ navigation }: any) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setProviders([
        {
          id: '1',
          name: 'AutoCare Plus',
          businessType: 'Full Service Auto Repair',
          rating: 4.9,
          totalReviews: 156,
          distance: '2.3 mi',
          address: '456 Auto Lane, Orlando, FL',
          isVerified: true,
          servicesCompleted: 12,
          responseTime: '< 1 hour',
          specialties: ['Oil Change', 'Brakes', 'Engine'],
        },
        {
          id: '2',
          name: 'Quick Lube Express',
          businessType: 'Oil Change & Maintenance',
          rating: 4.7,
          totalReviews: 89,
          distance: '1.5 mi',
          address: '123 Quick St, Orlando, FL',
          isVerified: true,
          servicesCompleted: 8,
          responseTime: '< 30 min',
          specialties: ['Oil Change', 'Filters', 'Fluids'],
        },
        {
          id: '3',
          name: 'Discount Tire',
          businessType: 'Tire & Wheel Specialists',
          rating: 4.6,
          totalReviews: 234,
          distance: '3.8 mi',
          address: '789 Tire Blvd, Orlando, FL',
          isVerified: true,
          servicesCompleted: 5,
          responseTime: '< 2 hours',
          specialties: ['Tires', 'Alignment', 'Rotation'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProviders();
    setRefreshing(false);
  };

  const handleRemoveFavorite = (providerId: string, providerName: string) => {
    Alert.alert(
      t.customer?.removeFavorite || 'Remove Favorite',
      `${t.customer?.removeFavoriteConfirm || 'Are you sure you want to remove'} ${providerName} ${t.customer?.fromFavorites || 'from favorites'}?`,
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.common?.remove || 'Remove',
          style: 'destructive',
          onPress: () => {
            setProviders(prev => prev.filter(p => p.id !== providerId));
          },
        },
      ]
    );
  };

  const getBusinessTypeIcon = (type: string) => {
    if (type.toLowerCase().includes('tire')) return 'disc';
    if (type.toLowerCase().includes('oil')) return 'water';
    return 'construct';
  };

  const renderProviderItem = ({ item }: { item: Provider }) => (
    <TouchableOpacity 
      style={styles.providerCard}
      onPress={() => navigation.navigate('ProviderDetails', { providerId: item.id })}
    >
      <View style={styles.providerHeader}>
        <View style={styles.providerAvatar}>
          <Ionicons 
            name={getBusinessTypeIcon(item.businessType) as any} 
            size={28} 
            color="#1976d2" 
          />
        </View>
        <View style={styles.providerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.providerName}>{item.name}</Text>
            {item.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            )}
          </View>
          <Text style={styles.businessType}>{item.businessType}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#fbbf24" />
            <Text style={styles.ratingText}>
              {item.rating} ({item.totalReviews} reviews)
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={() => handleRemoveFavorite(item.id, item.name)}
        >
          <Ionicons name="heart" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBadge}>
          <Ionicons name="location" size={14} color="#6b7280" />
          <Text style={styles.statText}>{item.distance}</Text>
        </View>
        <View style={styles.statBadge}>
          <Ionicons name="time" size={14} color="#6b7280" />
          <Text style={styles.statText}>{item.responseTime}</Text>
        </View>
        <View style={styles.statBadge}>
          <Ionicons name="checkmark-done" size={14} color="#6b7280" />
          <Text style={styles.statText}>{item.servicesCompleted} services</Text>
        </View>
      </View>

      <View style={styles.specialtiesContainer}>
        {item.specialties.slice(0, 3).map((specialty, index) => (
          <View key={index} style={styles.specialtyTag}>
            <Text style={styles.specialtyText}>{specialty}</Text>
          </View>
        ))}
      </View>

      <View style={styles.providerFooter}>
        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={14} color="#9ca3af" />
          <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
        </View>
        <TouchableOpacity style={styles.requestButton}>
          <Text style={styles.requestButtonText}>{t.customer?.requestQuote || 'Request Quote'}</Text>
          <Ionicons name="chevron-forward" size={16} color="#1976d2" />
        </TouchableOpacity>
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
          <Text style={styles.headerTitle}>{t.customer?.favoriteProviders || 'Favorite Providers'}</Text>
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
        <Text style={styles.headerTitle}>{t.customer?.favoriteProviders || 'Favorite Providers'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={providers}
        renderItem={renderProviderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          providers.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>
                {providers.length} favorite provider{providers.length !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="heart-outline" size={64} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>{t.customer?.noFavorites || 'No favorites yet'}</Text>
            <Text style={styles.emptySubtitle}>
              {t.customer?.saveFavoriteProviders || 'Save your preferred service providers for quick access'}
            </Text>
            <TouchableOpacity style={styles.emptyButton}>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>{t.customer?.findProviders || 'Find Providers'}</Text>
            </TouchableOpacity>
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
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  listHeader: {
    marginBottom: 12,
  },
  listHeaderText: {
    fontSize: 14,
    color: '#6b7280',
  },
  providerCard: {
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
  providerHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  providerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  providerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  businessType: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  favoriteButton: {
    padding: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  specialtyTag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  specialtyText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  providerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  addressText: {
    fontSize: 13,
    color: '#9ca3af',
    flex: 1,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requestButtonText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
