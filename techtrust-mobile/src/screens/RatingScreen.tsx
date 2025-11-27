/**
 * RatingScreen - Tela de Avaliação do Serviço
 * TechTrust Mobile
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const ratingLabels: Record<number, { text: string; emoji: string; color: string }> = {
  1: { text: 'Péssimo', emoji: '😞', color: '#ef4444' },
  2: { text: 'Ruim', emoji: '😕', color: '#f97316' },
  3: { text: 'Regular', emoji: '😐', color: '#eab308' },
  4: { text: 'Bom', emoji: '😊', color: '#22c55e' },
  5: { text: 'Excelente', emoji: '🤩', color: '#8b5cf6' },
};

const quickTags = {
  positive: [
    '👍 Pontual',
    '✨ Caprichoso',
    '💬 Boa comunicação',
    '💰 Preço justo',
    '🏆 Profissional',
    '😊 Simpático',
    '🔧 Competente',
    '⚡ Rápido',
  ],
  negative: [
    '⏰ Atrasou',
    '😤 Mal educado',
    '💸 Cobrou a mais',
    '🔧 Serviço incompleto',
    '📱 Difícil contato',
    '😞 Não recomendo',
  ],
};

interface ServiceData {
  provider: string;
  providerAvatar: string;
  service: string;
  date: string;
  duration: string;
  price: string;
}

type Step = 'rating' | 'submitting' | 'success';

interface RatingScreenProps {
  navigation: any;
  route?: {
    params?: {
      serviceData?: Partial<ServiceData>;
    };
  };
}

export default function RatingScreen({ navigation, route }: RatingScreenProps) {
  const [step, setStep] = useState<Step>('rating');
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  // Dados do serviço (mock ou passados via route)
  const serviceData: ServiceData = route?.params?.serviceData ? {
    provider: route.params.serviceData.provider || 'Maria Silva',
    providerAvatar: route.params.serviceData.providerAvatar || 'M',
    service: route.params.serviceData.service || 'Serviço Automotivo',
    date: route.params.serviceData.date || '27 Nov 2025',
    duration: route.params.serviceData.duration || '3 horas',
    price: route.params.serviceData.price || 'R$ 165,00',
  } : {
    provider: 'Maria Silva',
    providerAvatar: 'M',
    service: 'Serviço Automotivo',
    date: '27 Nov 2025',
    duration: '3 horas',
    price: 'R$ 165,00',
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) return;

    setStep('submitting');

    // Simula envio
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock do payload que seria enviado
    const reviewPayload = {
      providerId: 'provider_123',
      rating,
      tags: selectedTags,
      comment,
      wouldRecommend,
      serviceId: 'service_456',
      timestamp: new Date().toISOString(),
    };

    console.log('Review submitted:', reviewPayload);
    setStep('success');
  };

  const ratingInfo = ratingLabels[rating];
  const availableTags =
    rating >= 4
      ? quickTags.positive
      : rating >= 1
      ? [...quickTags.negative, ...quickTags.positive]
      : [];

  const renderRatingForm = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>✨</Text>
        <Text style={styles.headerTitle}>Como foi o serviço?</Text>
        <Text style={styles.headerSubtitle}>Sua avaliação ajuda outros usuários</Text>
      </View>

      {/* Provider Card */}
      <View style={styles.providerCard}>
        <View style={styles.providerAvatar}>
          <Text style={styles.providerAvatarText}>{serviceData.providerAvatar}</Text>
        </View>
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{serviceData.provider}</Text>
          <Text style={styles.providerService}>{serviceData.service}</Text>
          <Text style={styles.providerMeta}>
            📅 {serviceData.date} • ⏱️ {serviceData.duration}
          </Text>
        </View>
      </View>

      {/* Star Rating */}
      <View style={styles.starsSection}>
        <Text style={styles.starsLabel}>Toque para avaliar</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Text
                style={[
                  styles.star,
                  star <= rating ? styles.starFilled : styles.starEmpty,
                ]}
              >
                ⭐
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {ratingInfo && (
          <View style={styles.ratingLabel}>
            <Text style={styles.ratingEmoji}>{ratingInfo.emoji}</Text>
            <Text style={[styles.ratingText, { color: ratingInfo.color }]}>
              {ratingInfo.text}
            </Text>
          </View>
        )}
      </View>

      {/* Quick Tags */}
      {rating > 0 && (
        <View style={styles.tagsSection}>
          <Text style={styles.tagsLabel}>O que mais gostou? (opcional)</Text>
          <View style={styles.tagsContainer}>
            {availableTags.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tag,
                  selectedTags.includes(tag) && styles.tagSelected,
                ]}
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={[
                    styles.tagText,
                    selectedTags.includes(tag) && styles.tagTextSelected,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Comment */}
      {rating > 0 && (
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>
            Conte mais sobre sua experiência (opcional)
          </Text>
          <TextInput
            style={styles.commentInput}
            placeholder="O que você gostaria de destacar sobre o serviço?"
            placeholderTextColor="#9ca3af"
            value={comment}
            onChangeText={text => setComment(text.slice(0, 500))}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>
        </View>
      )}

      {/* Would Recommend */}
      {rating > 0 && (
        <View style={styles.recommendSection}>
          <Text style={styles.recommendLabel}>Recomendaria para um amigo?</Text>
          <View style={styles.recommendButtons}>
            <TouchableOpacity
              style={[
                styles.recommendBtn,
                wouldRecommend === true && styles.recommendBtnYes,
              ]}
              onPress={() => setWouldRecommend(true)}
            >
              <Text
                style={[
                  styles.recommendBtnText,
                  wouldRecommend === true && styles.recommendBtnTextSelected,
                ]}
              >
                👍 Sim!
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.recommendBtn,
                wouldRecommend === false && styles.recommendBtnNo,
              ]}
              onPress={() => setWouldRecommend(false)}
            >
              <Text
                style={[
                  styles.recommendBtnText,
                  wouldRecommend === false && styles.recommendBtnTextSelected,
                ]}
              >
                👎 Não
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={rating === 0}
      >
        <Text style={styles.submitBtnText}>
          {rating === 0 ? 'Selecione uma nota' : `Enviar Avaliação ⭐ ${rating}`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.skipBtnText}>Avaliar depois</Text>
      </TouchableOpacity>

      {/* Tip Box */}
      {rating >= 4 && (
        <View style={styles.tipBox}>
          <Text style={styles.tipEmoji}>💡</Text>
          <Text style={styles.tipText}>
            Avaliações positivas ajudam profissionais a conseguir mais trabalhos!
          </Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );

  const renderSubmitting = () => (
    <View style={styles.centerContainer}>
      <View style={styles.loadingStars}>
        {[1, 2, 3, 4, 5].map(i => (
          <Text key={i} style={styles.loadingStar}>
            ⭐
          </Text>
        ))}
      </View>
      <ActivityIndicator size="large" color="#8b5cf6" style={{ marginBottom: 16 }} />
      <Text style={styles.submittingText}>Enviando sua avaliação...</Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.successEmoji}>🎉</Text>
      <Text style={styles.successTitle}>Obrigado pela avaliação!</Text>
      <Text style={styles.successSubtitle}>
        Sua opinião ajuda {serviceData.provider} a crescer{'\n'}
        e outros usuários a fazer melhores escolhas.
      </Text>

      <View style={styles.successStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{rating}</Text>
          <Text style={styles.statLabel}>ESTRELAS</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{selectedTags.length}</Text>
          <Text style={styles.statLabel}>TAGS</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {wouldRecommend === true ? '👍' : wouldRecommend === false ? '👎' : '—'}
          </Text>
          <Text style={styles.statLabel}>RECOMENDA</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.doneBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.doneBtnText}>✨ Concluir</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {step === 'rating' && renderRatingForm()}
      {step === 'submitting' && renderSubmitting()}
      {step === 'success' && renderSuccess()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f3ff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  providerAvatar: {
    width: 56,
    height: 56,
    backgroundColor: '#8b5cf6',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  providerAvatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  providerService: {
    fontSize: 13,
    color: '#6b7280',
  },
  providerMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  starsSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  starsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 40,
  },
  starFilled: {
    opacity: 1,
  },
  starEmpty: {
    opacity: 0.3,
  },
  ratingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  ratingEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '700',
  },
  tagsSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tagsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  tagSelected: {
    backgroundColor: '#8b5cf6',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  tagTextSelected: {
    color: '#fff',
  },
  commentSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  commentInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: '#1f2937',
    minHeight: 100,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },
  recommendSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recommendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  recommendButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  recommendBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  recommendBtnYes: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  recommendBtnNo: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  recommendBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
  },
  recommendBtnTextSelected: {
    color: '#fff',
  },
  submitBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  skipBtnText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  tipEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingStars: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  loadingStar: {
    fontSize: 28,
    marginHorizontal: 4,
  },
  submittingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  successEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  successStats: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#8b5cf6',
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    letterSpacing: 1,
    marginTop: 4,
  },
  doneBtn: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
