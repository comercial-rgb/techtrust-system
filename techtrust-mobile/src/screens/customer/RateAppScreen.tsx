/**
 * RateAppScreen - Avaliar o Aplicativo
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useI18n } from '../../i18n';
import type { RateAppNavigation } from '../../navigation/types';

type StoreExtra = {
  storeIosItmsUrl?: string;
  storeIosWebUrl?: string;
  storeAndroidUrl?: string;
};

function readStoreExtra(): StoreExtra {
  const raw = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  if (!raw) return {};
  return {
    storeIosItmsUrl:
      typeof raw.storeIosItmsUrl === 'string' ? raw.storeIosItmsUrl : undefined,
    storeIosWebUrl:
      typeof raw.storeIosWebUrl === 'string' ? raw.storeIosWebUrl : undefined,
    storeAndroidUrl:
      typeof raw.storeAndroidUrl === 'string' ? raw.storeAndroidUrl : undefined,
  };
}

/** Precedence: EXPO_PUBLIC_* → app.json `expo.extra` → placeholders (replace App Store id for production). */
function resolveIosItmsUrl(): string {
  const extra = readStoreExtra();
  return (
    process.env.EXPO_PUBLIC_IOS_APP_STORE_URL ||
    extra.storeIosItmsUrl ||
    'itms-apps://itunes.apple.com/app/id0000000000'
  );
}

function resolveIosWebUrl(): string {
  const extra = readStoreExtra();
  return (
    process.env.EXPO_PUBLIC_IOS_APP_STORE_WEB_URL ||
    extra.storeIosWebUrl ||
    'https://apps.apple.com/app/id0000000000'
  );
}

function resolveAndroidPlayUrl(): string {
  const extra = readStoreExtra();
  return (
    process.env.EXPO_PUBLIC_ANDROID_PLAY_STORE_URL ||
    extra.storeAndroidUrl ||
    'https://play.google.com/store/apps/details?id=com.techtrustauto.mobile'
  );
}

export default function RateAppScreen({
  navigation,
}: {
  navigation: RateAppNavigation;
}) {
  const { t, language } = useI18n();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const c = t.customer as Record<string, string | undefined> | undefined;

  const feedbackTags = useMemo(() => {
    return [
      c?.rateAppTagEasyToUse || 'Easy to use',
      c?.rateAppTagFastQuotes || 'Fast quotes',
      c?.rateAppTagGreatProviders || 'Great providers',
      c?.rateAppTagGoodPrices || 'Good prices',
      c?.rateAppTagReliable || 'Reliable',
      c?.rateAppTagHelpfulSupport || 'Helpful support',
      c?.rateAppTagNeedsImprovement || 'Needs improvement',
      c?.rateAppTagHadIssues || 'Had issues',
    ];
  }, [language, t.customer]);

  const ratingLabels = useMemo(
    () =>
      [
        '',
        c?.rateAppRatingPoor || '😞 Poor',
        c?.rateAppRatingFair || '😐 Fair',
        c?.rateAppRatingGood || '🙂 Good',
        c?.rateAppRatingGreat || '😊 Great',
        c?.rateAppRatingAmazing || '🤩 Amazing!',
      ] as const,
    [language, t.customer],
  );

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

  const handleOpenStore = async () => {
    if (Platform.OS === 'android') {
      await Linking.openURL(resolveAndroidPlayUrl());
      return;
    }
    const itms = resolveIosItmsUrl();
    const supported = await Linking.canOpenURL(itms);
    if (supported) {
      await Linking.openURL(itms);
    } else {
      await Linking.openURL(resolveIosWebUrl());
    }
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
                {Platform.OS === 'android'
                  ? t.customer?.leavePlayStoreReview ||
                    'Would you like to leave a review on the Google Play Store?'
                  : t.customer?.leaveAppStoreReview ||
                    'Would you like to leave a review on the App Store?'}
              </Text>
              <TouchableOpacity style={styles.storeButton} onPress={handleOpenStore}>
                <Ionicons
                  name={Platform.OS === 'android' ? 'logo-google-playstore' : 'logo-apple'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.storeButtonText}>
                  {Platform.OS === 'android'
                    ? t.customer?.rateOnPlayStore || 'Rate on Google Play'
                    : t.customer?.rateOnAppStore || 'Rate on App Store'}
                </Text>
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
              {ratingLabels[rating as 1 | 2 | 3 | 4 | 5]}
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
    backgroundColor: '#2B5EA7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2B5EA7',
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
    borderColor: '#2B5EA7',
  },
  tagText: {
    fontSize: 14,
    color: '#6b7280',
  },
  tagTextSelected: {
    color: '#2B5EA7',
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
    backgroundColor: '#2B5EA7',
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
    backgroundColor: '#2B5EA7',
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
