/**
 * RatingScreen - Rating Screen
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { logos } from '../constants/images';
import { useI18n } from '../i18n';
import api from '../services/api';

export default function RatingScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { serviceTitle, providerName, serviceDate, workOrderId, providerId } = route.params || {};

  const serviceData = {
    title: serviceTitle || t.rating?.serviceCompleted || 'Service Completed',
    provider: providerName || t.common?.provider || 'Provider',
    date: serviceDate || new Date().toLocaleDateString('en-US'),
  };

  const ratingLabels = ['', t.rating?.terrible || 'Terrible', t.rating?.poor || 'Poor', t.rating?.fair || 'Fair', t.rating?.good || 'Good', t.rating?.excellent || 'Excellent'];

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert(t.common?.error || 'Error', t.rating?.selectRating || 'Please select a rating');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        workOrderId,
        providerId,
        rating,
        comment: comment.trim() || undefined,
      });
      Alert.alert(t.rating?.thankYou || 'Thank you!', t.rating?.reviewSubmitted || 'Your review has been submitted successfully.', [
        { text: t.common?.ok || 'OK', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (err: any) {
      Alert.alert(t.common?.error || 'Error', err?.response?.data?.message || t.common?.tryAgain || 'Try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.rating?.rateService || 'Rate Service'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Brand Logo */}
        <View style={styles.brandContainer}>
          <Image source={logos.noText} style={styles.brandLogo} resizeMode="contain" />
        </View>

        {/* Service Info */}
        <View style={styles.serviceCard}>
          <View style={styles.checkIcon}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
          </View>
          <Text style={styles.serviceTitle}>{serviceData.title}</Text>
          <Text style={styles.serviceProvider}>{serviceData.provider}</Text>
          <Text style={styles.serviceDate}>{serviceData.date}</Text>
        </View>

        {/* Rating Stars */}
        <Text style={styles.ratingQuestion}>{t.rating?.howWasExperience || 'How was your experience?'}</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={48}
                color={star <= rating ? '#fbbf24' : '#d1d5db'}
              />
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && <Text style={styles.ratingLabel}>{ratingLabels[rating]}</Text>}

        {/* Comment */}
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>{t.rating?.leaveComment || 'Leave a comment (optional)'}</Text>
          <TextInput
            style={styles.commentInput}
            placeholder={t.rating?.commentPlaceholder || 'Tell us about the service, customer service, quality...'}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={comment}
            onChangeText={setComment}
          />
        </View>

        {/* Quick Tags */}
        <View style={styles.tagsSection}>
          <Text style={styles.tagsTitle}>{t.rating?.whatDidYouLike || 'What did you like most?'}</Text>
          <View style={styles.tagsContainer}>
            {[t.rating?.tagCustomerService || 'Customer Service', t.rating?.tagSpeed || 'Speed', t.rating?.tagFairPrice || 'Fair Price', t.rating?.tagQuality || 'Quality', t.rating?.tagCleanliness || 'Cleanliness', t.rating?.tagPunctuality || 'Punctuality'].map(tag => (
              <TouchableOpacity key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, (rating === 0 || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}
        >
          <Text style={styles.submitText}>{submitting ? (t.rating?.submitting || 'Submitting...') : (t.rating?.submitReview || 'Submit Review')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.skipText}>{t.common?.skip || 'Skip'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  content: { padding: 16 },
  brandContainer: { alignItems: 'center', marginBottom: 16 },
  brandLogo: { width: 80, height: 80 },
  serviceCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 24 },
  checkIcon: { marginBottom: 16 },
  serviceTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  serviceProvider: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  serviceDate: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
  ratingQuestion: { fontSize: 18, fontWeight: '600', color: '#111827', textAlign: 'center', marginBottom: 16 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  ratingLabel: { fontSize: 16, fontWeight: '500', color: '#f59e0b', textAlign: 'center', marginBottom: 24 },
  commentSection: { marginBottom: 24 },
  commentLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  commentInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, fontSize: 16, minHeight: 100 },
  tagsSection: { marginBottom: 24 },
  tagsTitle: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 12 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  tagText: { fontSize: 14, color: '#374151' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6', alignItems: 'center' },
  submitBtn: { backgroundColor: '#1976d2', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 12 },
  submitBtnDisabled: { backgroundColor: '#9ca3af' },
  submitText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  skipText: { fontSize: 14, color: '#6b7280' },
});
