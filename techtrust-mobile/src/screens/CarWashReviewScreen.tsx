/**
 * CarWashReviewScreen — Write a review for a car wash
 */

import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import carWashService from '../services/carWash.service';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';

const STAR_SIZE = 40;

export default function CarWashReviewScreen({ route, navigation }: any) {
  const { t } = useI18n();
  const { carWashId, businessName } = route.params;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    setLoading(true);
    try {
      await carWashService.createReview(carWashId, rating, comment.trim() || undefined);

      Alert.alert(
        'Review Submitted',
        'Thank you for your review!',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Failed to submit review. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Write a Review</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Business name */}
          <Text style={styles.businessName}>{businessName}</Text>

          {/* Star Rating */}
          <Text style={styles.label}>How was your experience?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={STAR_SIZE}
                  color={star <= rating ? '#f59e0b' : colors.gray300}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingLabel}>
            {rating === 0 && 'Tap a star to rate'}
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </Text>

          {/* Comment */}
          <Text style={styles.label}>Share your experience (optional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="What did you like or dislike? How was the wash quality, speed, and customer service?"
            placeholderTextColor={colors.textLight}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.charCount}>{comment.length}/1000</Text>
        </ScrollView>

        {/* Submit button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading || rating === 0}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>Submit Review</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  content: { padding: spacing.lg },
  businessName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center', marginBottom: spacing.xl },
  label: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.lg },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  ratingLabel: { textAlign: 'center', fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  commentInput: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.md,
    color: colors.text, minHeight: 120,
  },
  charCount: { fontSize: fontSize.xs, color: colors.textLight, textAlign: 'right', marginTop: 4 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.white },
});
