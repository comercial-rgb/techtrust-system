/**
 * FavoriteProvidersScreen - Fornecedores Favoritos do Cliente
 * D22: Expanded favorites with sub-tabs for Repair, Car Wash, Parts Store
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';

type FavoriteCategory = 'all' | 'repair' | 'carwash' | 'parts';

interface Provider {
  id: string;
  name: string;
  businessType: string;
  category: FavoriteCategory;
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
  const [activeCategory, setActiveCategory] = useState<FavoriteCategory>('all');

  const categoryTabs: { key: FavoriteCategory; label: string; icon: string; color: string }[] = [
    { key: 'all', label: 'All', icon: 'grid', color: '#2B5EA7' },
    { key: 'repair', label: 'Repair', icon: 'construct', color: '#f59e0b' },
    { key: 'carwash', label: 'Car Wash', icon: 'car-wash', color: '#3b82f6' },
    { key: 'parts', label: 'Parts Store', icon: 'storefront', color: '#10b981' },
  ];

  const filteredProviders = activeCategory === 'all'
    ? providers
    : providers.filter(p => p.category === activeCategory);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      // Carregar favoritos reais do backend quando API estiver disponível
      // Endpoint: api.get('/users/favorite-providers')
      setProviders([]);
    } catch (error) {
      console.error('Error loading favorite providers:', error);
      setProviders([]);
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
    if (type.toLowerCase().includes('wash')) return 'water-outline';
    if (type.toLowerCase().includes('part')) return 'storefront-outline';
    return 'construct';
  };

  const getCategoryCount = (cat: FavoriteCategory) => {
    if (cat === 'all') return providers.length;
    return providers.filter(p => p.category === cat).length;
  };

  const renderProviderItem = ({ item }: { item: Provider }) => (
    <TouchableOpacity 
      style={styles.providerCard}
      onPress={() => navigation.navigate('Home', { screen: 'CreateRequest', params: { providerId: item.id, providerName: item.name } })}
    >
      <View style={styles.providerHeader}>
        <View style={styles.providerAvatar}>
          <Ionicons 
            name={getBusinessTypeIcon(item.businessType) as any} 
            size={28} 
            color="#2B5EA7" 
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
        <TouchableOpacity 
          style={styles.requestButton}
          onPress={() => navigation.navigate('Home', { screen: 'CreateRequest', params: { providerId: item.id } })}
        >
          <Text style={styles.requestButtonText}>{t.customer?.requestQuote || 'Request Quote'}</Text>
          <Ionicons name="chevron-forward" size={16} color="#2B5EA7" />
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
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.customer?.favoriteProviders || 'Favorite Providers'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Category Tabs */}
      <View style={styles.categoryTabsContainer}>
        {categoryTabs.map((tab) => {
          const isActive = activeCategory === tab.key;
          const count = getCategoryCount(tab.key);
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.categoryTab, isActive && { backgroundColor: tab.color + '15', borderColor: tab.color }]}
              onPress={() => setActiveCategory(tab.key)}
            >
              {tab.key === 'carwash' ? (
                <MaterialCommunityIcons name="car-wash" size={18} color={isActive ? tab.color : '#9ca3af'} />
              ) : (
                <Ionicons name={tab.icon as any} size={18} color={isActive ? tab.color : '#9ca3af'} />
              )}
              <Text style={[styles.categoryTabText, isActive && { color: tab.color, fontWeight: '600' }]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.categoryBadge, isActive && { backgroundColor: tab.color }]}>
                  <Text style={styles.categoryBadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredProviders}
        renderItem={renderProviderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          filteredProviders.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>
                {filteredProviders.length} favorite{filteredProviders.length !== 1 ? 's' : ''}
                {activeCategory !== 'all' ? ` in ${categoryTabs.find(c => c.key === activeCategory)?.label}` : ''}
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
  categoryTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 6,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 4,
  },
  categoryTabText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  categoryBadge: {
    backgroundColor: '#d1d5db',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
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
    color: '#2B5EA7',
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
    color: '#2B5EA7',
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
    backgroundColor: '#2B5EA7',
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
