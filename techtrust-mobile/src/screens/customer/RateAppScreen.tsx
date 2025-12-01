/**
 * RateAppScreen - Avaliar o Aplicativo
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';

export default function RateAppScreen({ navigation }: any) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const feedbackTags = [
    'Easy to use',
    'Fast quotes',
    'Great providers',
    'Good prices',
    'Reliable',
    'Helpful support',
    'Needs improvement',
    'Had issues',
  ];

  const handleTagPress = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert(t.customer?.ratingRequired || 'Rating Required', t.customer?.selectStarRating || 'Please select a star rating before submitting.');
      return;
    }

    // Simulate submission
    setSubmitted(true);
  };

  const handleOpenStore = () => {
    Alert.alert(
      t.customer?.openAppStore || 'Open App Store',
      t.customer?.openAppStoreDesc || 'This would open the app store for you to leave a public review.',
      [{ text: t.common?.ok || 'OK' }]
    );
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.customer?.rateTechTrust || 'Rate TechTrust'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="heart" size={64} color="#ec4899" />
          </View>
          <Text style={styles.successTitle}>{t.customer?.thankYou || 'Thank You!'} 💜</Text>
          <Text style={styles.successSubtitle}>
            {t.customer?.feedbackHelps || 'Your feedback helps us improve TechTrust for everyone'}
          </Text>

          {rating >= 4 && (
            <View style={styles.storePrompt}>
              <Text style={styles.storePromptText}>
                {t.customer?.leaveAppStoreReview || 'Would you like to leave a review on the App Store?'}
              </Text>
              <TouchableOpacity style={styles.storeButton} onPress={handleOpenStore}>
                <Ionicons name="logo-apple" size={20} color="#fff" />
                <Text style={styles.storeButtonText}>{t.customer?.rateOnAppStore || 'Rate on App Store'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity 
            style={styles.doneButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.doneButtonText}>{t.common?.done || 'Done'}</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>{t.customer?.rateTechTrust || 'Rate TechTrust'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <View style={styles.appIconContainer}>
            <View style={styles.appIcon}>
              <Ionicons name="car-sport" size={48} color="#fff" />
            </View>
          </View>
          <Text style={styles.ratingTitle}>{t.customer?.howsYourExperience || "How's your experience?"}</Text>
          <Text style={styles.ratingSubtitle}>
            {t.customer?.feedbackHelpsImprove || 'Your feedback helps us make TechTrust better'}
          </Text>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={44}
                  color={star <= rating ? '#fbbf24' : '#d1d5db'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Text style={styles.ratingLabel}>
              {rating === 1 && '😞 Poor'}
              {rating === 2 && '😐 Fair'}
              {rating === 3 && '🙂 Good'}
              {rating === 4 && '😊 Great'}
              {rating === 5 && '🤩 Amazing!'}
            </Text>
          )}
        </View>

        {/* Tags Section */}
        {rating > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.sectionTitle}>{t.customer?.whatDoYouLike || 'What do you like? (Optional)'}</Text>
            <View style={styles.tagsContainer}>
              {feedbackTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tag,
                    selectedTags.includes(tag) && styles.tagSelected,
                  ]}
                  onPress={() => handleTagPress(tag)}
                >
                  <Text style={[
                    styles.tagText,
                    selectedTags.includes(tag) && styles.tagTextSelected,
                  ]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Feedback Section */}
        {rating > 0 && (
          <View style={styles.feedbackSection}>
            <Text style={styles.sectionTitle}>{t.customer?.tellUsMore || 'Tell us more (Optional)'}</Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder={t.customer?.shareFeedback || 'Share your experience, suggestions, or issues...'}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.characterCount}>{feedback.length}/500</Text>
          </View>
        )}

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              rating === 0 && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={rating === 0}
          >
            <Text style={styles.submitButtonText}>{t.customer?.submitFeedback || 'Submit Feedback'}</Text>
          </TouchableOpacity>
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
  ratingSection: {
    backgroundColor: '#fff',
    paddingVertical: 32,
    alignItems: 'center',
  },
  appIconContainer: {
    marginBottom: 20,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ratingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  ratingSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  tagsSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tagSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#1976d2',
  },
  tagText: {
    fontSize: 14,
    color: '#6b7280',
  },
  tagTextSelected: {
    color: '#1976d2',
    fontWeight: '500',
  },
  feedbackSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 20,
  },
  feedbackInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#111827',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  characterCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 8,
  },
  submitContainer: {
    padding: 20,
  },
  submitButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fce7f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  storePrompt: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  storePromptText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  storeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  doneButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
