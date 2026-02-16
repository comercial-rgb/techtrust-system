/**
 * CarWashFavoritesScreen — List of favorited car washes
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Image, ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../i18n';
import carWashService from '../services/carWash.service';
import { CarWashListItem } from '../types/carWash';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../constants/theme';

export default function CarWashFavoritesScreen({ navigation }: any) {
  const { t } = useI18n();
  const [favorites, setFavorites] = useState<CarWashListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, []),
  );

  const loadFavorites = async () => {
    try {
      const data = await carWashService.getFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRemoveFavorite = async (carWashId: string) => {
    try {
      await carWashService.toggleFavorite(carWashId);
      setFavorites((prev) => prev.filter((f) => f.id !== carWashId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const renderItem = ({ item }: { item: CarWashListItem }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('CarWashProfile', { carWashId: item.id })}
    >
      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        {item.logoUrl ? (
          <Image source={{ uri: item.logoUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <MaterialCommunityIcons name="car-wash" size={24} color={colors.primary} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.businessName}</Text>
        <Text style={styles.address} numberOfLines={1}>
          {item.address}, {item.city}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="star" size={12} color="#f59e0b" />
          <Text style={styles.metaText}>
            {Number(item.averageRating).toFixed(1)} ({item.totalReviews})
          </Text>
          {item.distanceMiles !== undefined && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.metaText}>{item.distanceMiles.toFixed(1)} mi</Text>
            </>
          )}
        </View>

        <View style={styles.tagsRow}>
          {(item.carWashTypes as string[]).slice(0, 2).map((type, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{type.replace(/_/g, ' ')}</Text>
            </View>
          ))}
          {item.hasMembershipPlans && (
            <View style={[styles.tag, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }]}>
              <Text style={[styles.tagText, { color: '#7c3aed' }]}>Membership</Text>
            </View>
          )}
        </View>
      </View>

      {/* Remove btn */}
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => handleRemoveFavorite(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="heart" size={20} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Car Washes</Text>
        <View style={{ width: 22 }} />
      </View>

      {favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="heart-off-outline" size={64} color={colors.gray300} />
          <Text style={styles.emptyTitle}>No Saved Car Washes</Text>
          <Text style={styles.emptyDesc}>
            Tap the heart icon on any car wash to save it here for quick access.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => navigation.navigate('CarWashMap')}
          >
            <Text style={styles.exploreBtnText}>Find Car Washes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadFavorites(); }}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  card: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.sm, ...shadows.sm,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  thumbWrap: { marginRight: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: borderRadius.md },
  thumbPlaceholder: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  address: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: fontSize.xs, color: colors.textSecondary },
  metaDot: { color: colors.textSecondary, fontSize: fontSize.xs },
  tagsRow: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary + '30' },
  tagText: { fontSize: 9, fontWeight: fontWeight.semibold, color: colors.primary, textTransform: 'capitalize' },
  removeBtn: { justifyContent: 'center', paddingLeft: spacing.sm },
  // Empty
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md },
  emptyDesc: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  exploreBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, marginTop: spacing.lg },
  exploreBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.white },
});
