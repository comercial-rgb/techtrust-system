/**
 * CarWashAllReviewsScreen — View all reviews for a car wash with pagination & sort
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Text, ActivityIndicator, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import carWashService from '../services/carWash.service';
import { CarWashReview } from '../types/carWash';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';

type SortOption = 'recent' | 'highest' | 'lowest';

export default function CarWashAllReviewsScreen({ route, navigation }: any) {
  const { t } = useI18n();
  const { carWashId } = route.params;

  const [reviews, setReviews] = useState<CarWashReview[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const fetchReviews = useCallback(async (pageNum: number, reset: boolean = false) => {
    try {
      const data = await carWashService.getReviews(carWashId, pageNum, sortBy);
      if (reset) {
        setReviews(data.reviews);
      } else {
        setReviews((prev) => [...prev, ...data.reviews]);
      }
      setHasMore(data.reviews.length >= 20);
      setPage(pageNum);
    } catch {
      // silent
    }
  }, [carWashId, sortBy]);

  useEffect(() => {
    setLoading(true);
    fetchReviews(1, true).finally(() => setLoading(false));
  }, [fetchReviews]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReviews(1, true);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchReviews(page + 1);
    setLoadingMore(false);
  };

  const handleSortChange = (option: SortOption) => {
    if (option === sortBy) return;
    setSortBy(option);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Ionicons
            key={i}
            name={i <= rating ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-outline'}
            size={16}
            color="#f59e0b"
          />
        ))}
      </View>
    );
  };

  const renderReview = ({ item }: { item: CarWashReview }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {item.user.avatarUrl ? (
          <Avatar.Image size={40} source={{ uri: item.user.avatarUrl }} />
        ) : (
          <Avatar.Text size={40} label={item.user.fullName.charAt(0)} />
        )}
        <View style={styles.reviewHeaderText}>
          <Text style={styles.reviewerName}>{item.user.fullName}</Text>
          <View style={styles.ratingDateRow}>
            {renderStars(item.rating)}
            <Text style={styles.reviewDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </View>

      {item.comment ? (
        <Text style={styles.reviewComment}>{item.comment}</Text>
      ) : null}

      {item.response ? (
        <View style={styles.responseBox}>
          <Text style={styles.responseLabel}>{t.carWash?.ownerResponse || 'Owner Response'}</Text>
          <Text style={styles.responseText}>{item.response}</Text>
          {item.responseAt ? (
            <Text style={styles.responseDate}>{formatDate(item.responseAt)}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'recent', label: t.carWash?.sortRecent || 'Most Recent' },
    { key: 'highest', label: t.carWash?.sortHighest || 'Highest Rated' },
    { key: 'lowest', label: t.carWash?.sortLowest || 'Lowest Rated' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.carWash?.allReviews || 'All Reviews'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Sort Chips */}
      <View style={styles.sortRow}>
        {sortOptions.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
            onPress={() => handleSortChange(opt.key)}
          >
            <Text style={[styles.sortChipText, sortBy === opt.key && styles.sortChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reviews List */}
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={renderReview}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>{t.carWash?.noReviewsYet || 'No reviews yet'}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold as any, color: colors.text },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: { fontSize: fontSize.sm, color: colors.textSecondary },
  sortChipTextActive: { color: '#fff', fontWeight: fontWeight.semibold as any },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  reviewCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  reviewHeaderText: { marginLeft: spacing.sm, flex: 1 },
  reviewerName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold as any, color: colors.text },
  ratingDateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  starsRow: { flexDirection: 'row', marginRight: spacing.sm },
  reviewDate: { fontSize: fontSize.xs, color: colors.textSecondary },
  reviewComment: { fontSize: fontSize.md, color: colors.text, lineHeight: 22, marginTop: spacing.xs },
  responseBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#f0fdf4',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  responseLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold as any, color: '#15803d', marginBottom: 4 },
  responseText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  responseDate: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm },
});
