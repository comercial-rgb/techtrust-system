/**
 * CarWashMapScreen — Main discovery screen
 * Map with bottom sheet list of nearby car washes
 */

import React, { useState, useEffect, useCallback, useRef, Component, ErrorInfo } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, Image, TextInput,
  Dimensions, Platform, Linking, ActivityIndicator, StatusBar, ScrollView
} from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Camera } from 'react-native-maps';
import * as Location from 'expo-location';
import { useI18n } from '../i18n';
import carWashService from '../services/carWash.service';
import { CarWashListItem, CarWashSearchFilters } from '../types/carWash';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/theme';

// Error boundary to catch native MapView crashes
class MapErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MapView crash caught:', error, info);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.38;

const CAR_WASH_TYPE_LABELS: Record<string, string> = {
  AUTOMATIC_TUNNEL: 'Tunnel',
  EXPRESS_EXTERIOR: 'Express',
  SELF_SERVICE_BAY: 'Self-Service',
  FULL_SERVICE: 'Full Service',
  HAND_WASH: 'Hand Wash',
};

const CAR_WASH_TYPE_COLORS: Record<string, string> = {
  AUTOMATIC_TUNNEL: '#3b82f6',
  EXPRESS_EXTERIOR: '#10b981',
  SELF_SERVICE_BAY: '#f59e0b',
  FULL_SERVICE: '#8b5cf6',
  HAND_WASH: '#ec4899',
};

const RADIUS_OPTIONS = [5, 10, 15, 25];

export default function CarWashMapScreen({ navigation }: any) {
  const { t } = useI18n();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [carWashes, setCarWashes] = useState<CarWashListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CarWashSearchFilters>({
    radiusMiles: 10,
    sortBy: 'distance',
  });
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [membershipFilter, setMembershipFilter] = useState(false);
  const [freeVacuumFilter, setFreeVacuumFilter] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<MapView>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>(Platform.OS === 'ios' ? 'list' : 'map');
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    getLocationAndSearch();
  }, []);

  const getLocationAndSearch = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Default to a central US location if permission denied
        setLocation({ lat: 39.8283, lng: -98.5795 });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setLocation(coords);
      await searchCarWashes(coords);
    } catch (error) {
      console.error('Location error:', error);
      setLocation({ lat: 39.8283, lng: -98.5795 });
    } finally {
      setLoading(false);
    }
  };

  const searchCarWashes = async (coords?: { lat: number; lng: number }, overrideFilters?: CarWashSearchFilters) => {
    const loc = coords || location;
    if (!loc) return;

    setLoading(true);
    try {
      const currentFilters = overrideFilters || {
        ...filters,
        type: selectedTypes.length > 0 ? selectedTypes.join(',') : undefined,
        openNow: openNowFilter || undefined,
        hasMembership: membershipFilter || undefined,
        hasFreeVacuum: freeVacuumFilter || undefined,
        search: searchText || undefined,
      };

      const result = await carWashService.searchNearby(loc.lat, loc.lng, currentFilters);
      setCarWashes(result.carWashes);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchCarWashes(undefined, {
        ...filters,
        search: text || undefined,
        type: selectedTypes.length > 0 ? selectedTypes.join(',') : undefined,
        openNow: openNowFilter || undefined,
        hasMembership: membershipFilter || undefined,
        hasFreeVacuum: freeVacuumFilter || undefined,
      });
    }, 500);
  }, [filters, selectedTypes, openNowFilter, membershipFilter, freeVacuumFilter, location]);

  const applyFilters = () => {
    setShowFilters(false);
    searchCarWashes();
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const getTypeLabel = (types: string[]) => {
    if (types.length === 0) return '';
    return types.map(t => CAR_WASH_TYPE_LABELS[t] || t).join(' · ');
  };

  const renderCarWashCard = ({ item }: { item: CarWashListItem }) => (
    <TouchableOpacity
      style={[
        styles.card,
        item.isPromoted && styles.promotedCard,
        item.isFeatured && styles.featuredCard,
      ]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('CarWashProfile', { carWashId: item.id })}
    >
      {/* Promoted/Featured badges */}
      {item.isPromoted && (
        <View style={styles.sponsoredBadge}>
          <Text style={styles.sponsoredText}>Sponsored</Text>
        </View>
      )}

      <View style={styles.cardContent}>
        {/* Logo/Photo */}
        <View style={styles.cardImageContainer}>
          {item.primaryPhoto || item.logoUrl ? (
            <Image
              source={{ uri: item.primaryPhoto || item.logoUrl! }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <MaterialCommunityIcons name="car-wash" size={28} color={colors.primary} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          {/* Name + Type */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.businessName}
            </Text>
            {item.isFeatured && (
              <MaterialCommunityIcons name="star-circle" size={16} color="#f59e0b" />
            )}
          </View>

          {/* Type tags */}
          <View style={styles.typeTags}>
            {(item.carWashTypes as string[]).slice(0, 2).map((type, i) => (
              <View
                key={i}
                style={[styles.typeTag, { backgroundColor: (CAR_WASH_TYPE_COLORS[type] || '#6b7280') + '20' }]}
              >
                <Text style={[styles.typeTagText, { color: CAR_WASH_TYPE_COLORS[type] || '#6b7280' }]}>
                  {CAR_WASH_TYPE_LABELS[type] || type}
                </Text>
              </View>
            ))}
          </View>

          {/* Distance + Drive time */}
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.cardSubtext}>
              {item.distanceMiles} mi away · {item.estimatedDriveMinutes} min drive
            </Text>
          </View>

          {/* Rating */}
          <View style={styles.cardRow}>
            <Ionicons name="star" size={13} color="#f59e0b" />
            <Text style={styles.cardRating}>
              {(item.averageRating || 0).toFixed(1)}
            </Text>
            <Text style={styles.cardSubtext}>
              ({item.totalReviews} {item.totalReviews === 1 ? 'review' : 'reviews'})
            </Text>
          </View>

          {/* Price */}
          {item.priceFrom !== null && (
            <Text style={styles.cardPrice}>
              From ${item.priceFrom.toFixed(0)}
            </Text>
          )}

          {/* Status */}
          <View style={styles.cardStatusRow}>
            <View style={[styles.statusDot, { backgroundColor: item.isOpenNow ? colors.success : colors.error }]} />
            <Text style={[styles.cardStatus, { color: item.isOpenNow ? colors.success : colors.error }]}>
              {item.isOpenNow
                ? `Open Now${item.closesAt ? ` · Closes at ${formatTime(item.closesAt)}` : ''}`
                : `Closed${item.opensAt ? ` · Opens at ${formatTime(item.opensAt)}` : ''}`
              }
            </Text>
          </View>

          {/* Badges */}
          <View style={styles.badgesRow}>
            {item.hasMembershipPlans && (
              <View style={styles.membershipBadge}>
                <Ionicons name="infinite" size={10} color="#8b5cf6" />
                <Text style={styles.membershipBadgeText}>Unlimited Plans</Text>
              </View>
            )}
            {item.hasFreeVacuum && (
              <View style={styles.vacuumBadge}>
                <MaterialCommunityIcons name="vacuum" size={10} color="#10b981" />
                <Text style={styles.vacuumBadgeText}>Free Vacuum</Text>
              </View>
            )}
            {item.isEcoFriendly && (
              <View style={styles.ecoBadge}>
                <Ionicons name="leaf" size={10} color="#16a34a" />
                <Text style={styles.ecoBadgeText}>Eco</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {(t as any).carWash?.findCarWash || 'Find Car Wash'}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CarWashFavorites')}
          style={styles.favBtn}
        >
          <Ionicons name="heart-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={(t as any).carWash?.searchPlaceholder || 'Address, ZIP code, or name...'}
            placeholderTextColor={colors.textLight}
            value={searchText}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options" size={20} color={showFilters ? colors.white : colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          {/* Wash Type */}
          <Text style={styles.filterLabel}>
            {(t as any).carWash?.washType || 'Wash Type'}
          </Text>
          <View style={styles.chipRow}>
            {Object.entries(CAR_WASH_TYPE_LABELS).map(([key, label]) => (
              <Chip
                key={key}
                selected={selectedTypes.includes(key)}
                onPress={() => toggleType(key)}
                style={[styles.chip, selectedTypes.includes(key) && styles.chipSelected]}
                textStyle={[styles.chipText, selectedTypes.includes(key) && styles.chipTextSelected]}
                compact
              >
                {label}
              </Chip>
            ))}
          </View>

          {/* Radius */}
          <Text style={styles.filterLabel}>
            {(t as any).carWash?.searchRadius || 'Search Radius'}
          </Text>
          <View style={styles.chipRow}>
            {RADIUS_OPTIONS.map(r => (
              <Chip
                key={r}
                selected={filters.radiusMiles === r}
                onPress={() => setFilters(f => ({ ...f, radiusMiles: r }))}
                style={[styles.chip, filters.radiusMiles === r && styles.chipSelected]}
                textStyle={[styles.chipText, filters.radiusMiles === r && styles.chipTextSelected]}
                compact
              >
                {r} mi
              </Chip>
            ))}
          </View>

          {/* Toggle Filters */}
          <View style={styles.toggleFilters}>
            <TouchableOpacity
              style={[styles.toggleFilter, openNowFilter && styles.toggleFilterActive]}
              onPress={() => setOpenNowFilter(!openNowFilter)}
            >
              <Ionicons name="time" size={14} color={openNowFilter ? colors.white : colors.primary} />
              <Text style={[styles.toggleFilterText, openNowFilter && styles.toggleFilterTextActive]}>
                Open Now
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleFilter, membershipFilter && styles.toggleFilterActive]}
              onPress={() => setMembershipFilter(!membershipFilter)}
            >
              <Ionicons name="infinite" size={14} color={membershipFilter ? colors.white : '#8b5cf6'} />
              <Text style={[styles.toggleFilterText, membershipFilter && styles.toggleFilterTextActive]}>
                Membership
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleFilter, freeVacuumFilter && styles.toggleFilterActive]}
              onPress={() => setFreeVacuumFilter(!freeVacuumFilter)}
            >
              <MaterialCommunityIcons name="vacuum" size={14} color={freeVacuumFilter ? colors.white : '#10b981'} />
              <Text style={[styles.toggleFilterText, freeVacuumFilter && styles.toggleFilterTextActive]}>
                Free Vacuum
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sort By */}
          <Text style={styles.filterLabel}>Sort By</Text>
          <View style={styles.chipRow}>
            {(['distance', 'rating', 'price'] as const).map(s => (
              <Chip
                key={s}
                selected={filters.sortBy === s}
                onPress={() => setFilters(f => ({ ...f, sortBy: s }))}
                style={[styles.chip, filters.sortBy === s && styles.chipSelected]}
                textStyle={[styles.chipText, filters.sortBy === s && styles.chipTextSelected]}
                compact
              >
                {s === 'distance' ? 'Nearest' : s === 'rating' ? 'Top Rated' : 'Lowest Price'}
              </Chip>
            ))}
          </View>

          {/* Apply Button */}
          <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
            <Text style={styles.applyBtnText}>
              {(t as any).carWash?.applyFilters || 'Apply Filters'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Map/List Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'map' && styles.viewToggleBtnActive]}
          onPress={() => setViewMode('map')}
        >
          <Ionicons name="map" size={16} color={viewMode === 'map' ? '#fff' : colors.primary} />
          <Text style={[styles.viewToggleText, viewMode === 'map' && styles.viewToggleTextActive]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons name="list" size={16} color={viewMode === 'list' ? '#fff' : colors.primary} />
          <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>List</Text>
        </TouchableOpacity>
      </View>

      {/* Interactive Map View */}
      {viewMode === 'map' && (
        <View style={styles.mapContainer}>
          {/* Map */}
          <View style={styles.mapWrapper}>
            {location && !mapError ? (
              <MapErrorBoundary
                fallback={
                  <View style={[styles.mapLoading, { justifyContent: 'center', alignItems: 'center' }]}>
                    <MaterialCommunityIcons name="map-marker-off" size={40} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>Map unavailable</Text>
                    <TouchableOpacity
                      onPress={() => setViewMode('list')}
                      style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, marginTop: 8 }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Switch to List View</Text>
                    </TouchableOpacity>
                  </View>
                }
              >
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  {...(Platform.OS === 'android' ? { provider: PROVIDER_GOOGLE } : {})}
                  initialRegion={{
                    latitude: location.lat,
                    longitude: location.lng,
                    latitudeDelta: (filters.radiusMiles || 10) * 0.03,
                    longitudeDelta: (filters.radiusMiles || 10) * 0.03,
                  }}
                  showsUserLocation
                  showsMyLocationButton={Platform.OS === 'android'}
                  showsCompass
                  mapType="standard"
                  onPress={() => setSelectedPin(null)}
                  onMapReady={() => {
                    setMapError(false);
                    setMapReady(true);
                  }}
                >
                  {/* Radius circle overlay */}
                  <Circle
                    center={{ latitude: location.lat, longitude: location.lng }}
                    radius={(filters.radiusMiles || 10) * 1609.34}
                    strokeColor={colors.primary + '40'}
                    fillColor={colors.primary + '10'}
                    strokeWidth={2}
                  />

                  {/* Car wash markers */}
                  {carWashes.filter(cw => cw.latitude && cw.longitude).map((cw) => {
                    const types = Array.isArray(cw.carWashTypes) ? cw.carWashTypes as string[] : [];
                    const typeColor = types[0]
                      ? CAR_WASH_TYPE_COLORS[types[0]] || colors.primary
                      : colors.primary;

                    return (
                      <Marker
                        key={cw.id}
                        coordinate={{ latitude: Number(cw.latitude), longitude: Number(cw.longitude) }}
                        title={cw.businessName || 'Car Wash'}
                        description={`${(cw.averageRating || 0).toFixed(1)}★ · ${cw.distanceMiles || '?'} mi${cw.isOpenNow ? ' · Open' : ''}`}
                        pinColor={typeColor}
                        onPress={() => setSelectedPin(cw.id)}
                      />
                    );
                  })}
                </MapView>
              </MapErrorBoundary>
            ) : (
              <View style={styles.mapLoading}>
                {mapError ? (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name="map-marker-off" size={40} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Map unavailable</Text>
                    <TouchableOpacity
                      onPress={() => setViewMode('list')}
                      style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, marginTop: 4 }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Switch to List View</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ActivityIndicator size="large" color={colors.primary} />
                )}
              </View>
            )}
          </View>

          {/* Stats bar */}
          <View style={styles.mapStats}>
            <View style={styles.mapStatItem}>
              <MaterialCommunityIcons name="car-wash" size={14} color={colors.primary} />
              <Text style={styles.mapStatText}>{carWashes.length} found</Text>
            </View>
            <View style={styles.mapStatItem}>
              <Ionicons name="time" size={14} color="#10b981" />
              <Text style={styles.mapStatText}>{carWashes.filter(c => c.isOpenNow).length} open</Text>
            </View>
            <View style={styles.mapStatItem}>
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={styles.mapStatText}>
                {carWashes.length > 0
                  ? (carWashes.reduce((s, c) => s + (c.averageRating || 0), 0) / carWashes.length).toFixed(1)
                  : '--'} avg
              </Text>
            </View>
          </View>

          {/* Selected pin preview */}
          {selectedPin && (() => {
            const cw = carWashes.find(c => c.id === selectedPin);
            if (!cw) return null;
            return (
              <TouchableOpacity
                style={styles.pinPreview}
                onPress={() => navigation.navigate('CarWashProfile', { carWashId: cw.id })}
                activeOpacity={0.9}
              >
                <View style={styles.pinPreviewContent}>
                  {cw.primaryPhoto || cw.logoUrl ? (
                    <Image source={{ uri: cw.primaryPhoto || cw.logoUrl! }} style={styles.pinPreviewImg} />
                  ) : (
                    <View style={[styles.pinPreviewImg, { backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' }]}>
                      <MaterialCommunityIcons name="car-wash" size={20} color={colors.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pinPreviewName} numberOfLines={1}>{cw.businessName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="star" size={12} color="#f59e0b" />
                      <Text style={{ fontSize: 12, color: '#374151' }}>{(cw.averageRating || 0).toFixed(1)}</Text>
                      <Text style={{ fontSize: 12, color: '#9ca3af' }}>· {cw.distanceMiles} mi</Text>
                      <View style={[styles.statusDot, { backgroundColor: cw.isOpenNow ? '#10b981' : '#ef4444', marginLeft: 4 }]} />
                      <Text style={{ fontSize: 11, color: cw.isOpenNow ? '#10b981' : '#ef4444' }}>
                        {cw.isOpenNow ? 'Open' : 'Closed'}
                      </Text>
                    </View>
                    {cw.priceFrom !== null && (
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 2 }}>
                        From ${cw.priceFrom.toFixed(0)}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            );
          })()}
        </View>
      )}

      {/* Results List */}
      {viewMode === 'list' && (loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {(t as any).carWash?.searching || 'Searching nearby...'}
          </Text>
        </View>
      ) : carWashes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="car-wash" size={64} color={colors.gray300} />
          <Text style={styles.emptyTitle}>
            {(t as any).carWash?.noResults || 'No car washes found'}
          </Text>
          <Text style={styles.emptySubtext}>
            {(t as any).carWash?.tryExpandRadius || 'Try expanding your search radius or adjusting filters'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={carWashes}
          keyExtractor={item => item.id}
          renderItem={renderCarWashCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      ))}
    </SafeAreaView>
  );
}

function formatTime(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  favBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
  },
  filterPanel: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.md,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray200,
    marginBottom: 4,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.white,
  },
  toggleFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  toggleFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    gap: 4,
  },
  toggleFilterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleFilterText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  toggleFilterTextActive: {
    color: colors.white,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  applyBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  mapPlaceholder: {
    height: 120,
    backgroundColor: '#e0ecff',
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  mapText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },
  mapSubtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.lg,
    padding: 3,
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  viewToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  viewToggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  viewToggleTextActive: {
    color: colors.white,
  },
  mapContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  mapWrapper: {
    height: MAP_HEIGHT,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoading: {
    height: MAP_HEIGHT,
    backgroundColor: '#e8f0fe',
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    paddingVertical: 8,
    ...shadows.sm,
  },
  mapStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapStatText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  pinPreview: {
    marginTop: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  pinPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pinPreviewImg: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  promotedCard: {
    borderWidth: 1,
    borderColor: '#d4a400',
  },
  featuredCard: {
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  sponsoredBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    borderBottomRightRadius: borderRadius.sm,
  },
  sponsoredText: {
    fontSize: 9,
    fontWeight: fontWeight.semibold,
    color: '#92400e',
    textTransform: 'uppercase',
  },
  cardContent: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  cardImageContainer: {
    marginRight: spacing.md,
  },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
  },
  cardImagePlaceholder: {
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  typeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  typeTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cardSubtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  cardRating: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  cardPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginTop: 2,
  },
  cardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardStatus: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  membershipBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.medium,
    color: '#8b5cf6',
  },
  vacuumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  vacuumBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.medium,
    color: '#10b981',
  },
  ecoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ecoBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.medium,
    color: '#16a34a',
  },
});
