/**
 * ProviderOnboardingScreen - Post-registration guided onboarding
 * Walks new providers through required document uploads step-by-step
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useI18n } from '../../i18n';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const { width } = Dimensions.get('window');

// ─── Onboarding Steps ───
interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  required: boolean;
  type: 'upload' | 'info' | 'action';
  uploadCategory?: string;   // compliance type key
  actionRoute?: string;       // navigation route for action type
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to TechTrust!',
    subtitle: 'Let\'s get your business set up. We\'ll guide you through the required documents to start receiving service requests.',
    icon: 'hand-wave',
    required: false,
    type: 'info',
  },
  {
    id: 'business_license',
    title: 'Business License',
    subtitle: 'Upload your state business license or registration certificate. This is required to operate as a service provider.',
    icon: 'certificate',
    required: true,
    type: 'upload',
    uploadCategory: 'STATE_SHOP_REGISTRATION',
  },
  {
    id: 'insurance',
    title: 'Insurance Certificate',
    subtitle: 'Upload your Certificate of Insurance (COI) showing at minimum General Liability coverage.',
    icon: 'shield-check',
    required: true,
    type: 'upload',
    uploadCategory: 'GENERAL_LIABILITY',
  },
  {
    id: 'services',
    title: 'Your Services & Capabilities',
    subtitle: 'Review and adjust the services you offer, vehicle types you serve, and whether you sell parts. You can change these anytime.',
    icon: 'wrench',
    required: false,
    type: 'action',
    actionRoute: 'Services',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    subtitle: 'Your documents are being reviewed. You\'ll start receiving matching service requests once approved. You can manage all documents from Profile → Compliance.',
    icon: 'check-circle',
    required: false,
    type: 'info',
  },
];

export default function ProviderOnboardingScreen({ navigation }: any) {
  const { t } = useI18n();
  const { completeOnboarding } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string[]>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set(['welcome']));
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string>('image/jpeg');
  const [previewName, setPreviewName] = useState<string>('photo.jpg');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const step = ONBOARDING_STEPS[currentStep];
  const totalSteps = ONBOARDING_STEPS.length;
  const progress = (currentStep + 1) / totalSteps;

  // ─── Animate step transitions ───
  const animateTransition = (direction: 'next' | 'prev', callback: () => void) => {
    const toValue = direction === 'next' ? -width : width;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      callback();
      slideAnim.setValue(direction === 'next' ? width / 3 : -width / 3);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      animateTransition('next', () => setCurrentStep(currentStep + 1));
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      animateTransition('prev', () => setCurrentStep(currentStep - 1));
    }
  };

  // ─── Upload document ───
  const handleUpload = () => {
    Alert.alert(
      t.provider?.uploadDocument || 'Upload Document',
      t.provider?.chooseSource || 'How would you like to add your document?',
      [
        {
          text: t.provider?.takePhoto || 'Take Photo',
          onPress: handleCameraCapture,
        },
        {
          text: t.provider?.chooseFile || 'Choose File',
          onPress: handleFilePicker,
        },
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
      ],
    );
  };

  // ─── Camera capture ───
  const handleCameraCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t.common?.error || 'Error',
          t.provider?.cameraPermissionRequired || 'Camera permission is required to take photos.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const photo = result.assets[0];
      // Show photo review before uploading
      setPreviewUri(photo.uri);
      setPreviewMime(photo.mimeType || 'image/jpeg');
      setPreviewName(photo.fileName || `photo_${Date.now()}.jpg`);
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(t.common?.error || 'Error', t.provider?.cameraFailed || 'Could not open camera. Please try again.');
    }
  };

  // ─── File picker ───
  const handleFilePicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      const isPDF = file.mimeType === 'application/pdf';
      
      if (isPDF) {
        // PDFs go straight to upload (can't preview)
        await uploadFile(file.uri, file.mimeType || 'application/pdf', file.name || 'document.pdf');
      } else {
        // Images get a preview
        setPreviewUri(file.uri);
        setPreviewMime(file.mimeType || 'image/jpeg');
        setPreviewName(file.name || 'document.jpg');
      }
    } catch (error) {
      console.error('File picker error:', error);
      Alert.alert(t.common?.error || 'Error', t.provider?.uploadFailed || 'Failed to upload document. Please try again.');
    }
  };

  // ─── Confirm photo from preview ───
  const handleConfirmPhoto = async () => {
    if (previewUri) {
      await uploadFile(previewUri, previewMime, previewName);
      setPreviewUri(null);
    }
  };

  // ─── Retake photo ───
  const handleRetakePhoto = () => {
    setPreviewUri(null);
    handleCameraCapture();
  };

  // ─── Upload file to server ───
  const uploadFile = async (uri: string, mimeType: string, fileName: string) => {
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('image', {
        uri: uri,
        type: mimeType || 'image/jpeg',
        name: fileName || 'document.jpg',
      } as any);

      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = uploadRes.data?.imageUrl || uploadRes.data?.url;
      if (url) {
        const category = step.uploadCategory || step.id;
        setUploadedDocs(prev => ({
          ...prev,
          [category]: [...(prev[category] || []), url],
        }));
        setCompletedSteps(prev => new Set([...prev, step.id]));

        // Save to compliance API
        if (step.uploadCategory) {
          try {
            await api.post('/compliance', {
              type: step.uploadCategory,
              documentUploads: [...(uploadedDocs[category] || []), url],
            });
          } catch (e) {
            console.log('Compliance upsert deferred:', e);
          }
        }

        // Save to insurance API if it's insurance type
        if (step.id === 'insurance') {
          try {
            await api.post('/insurance', {
              type: 'GENERAL_LIABILITY',
              hasCoverage: true,
              coiUploads: [...(uploadedDocs[category] || []), url],
            });
          } catch (e) {
            console.log('Insurance upsert deferred:', e);
          }
        }

        Alert.alert(
          t.common?.success || 'Success',
          t.provider?.documentUploaded || 'Document uploaded successfully!',
        );
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert(
        t.common?.error || 'Error',
        t.provider?.uploadFailed || 'Failed to upload document. Please try again.',
      );
    } finally {
      setUploading(false);
    }
  };

  // ─── Handle action step (navigate to services screen) ───
  const handleAction = () => {
    if (step.actionRoute) {
      setCompletedSteps(prev => new Set([...prev, step.id]));
      // Navigate to standalone services screen within the onboarding stack
      navigation.navigate('OnboardingServices');
    }
  };

  // ─── Finish onboarding ───
  const finishOnboarding = async () => {
    try {
      // Auto-create compliance items for provider's state
      try {
        await api.post('/compliance/auto-create');
      } catch (e) {
        console.log('Auto-create compliance deferred:', e);
      }
      // Mark onboarding as done — RootNavigator will automatically
      // switch from ProviderWithOnboarding to ProviderNavigator
      await completeOnboarding();
    } catch (error) {
      await completeOnboarding();
    }
  };

  // ─── Skip onboarding ───
  const skipOnboarding = () => {
    Alert.alert(
      t.provider?.skipOnboarding || 'Skip Setup?',
      t.provider?.skipOnboardingMessage || 'You can complete document uploads later from Profile → Compliance. Your account may have limited functionality until documents are verified.',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.provider?.skipAnyway || 'Skip',
          style: 'destructive',
          onPress: async () => {
            await completeOnboarding();
          },
        },
      ],
    );
  };

  const canProceed = () => {
    if (!step.required) return true;
    return completedSteps.has(step.id);
  };

  const docsForCurrentStep = uploadedDocs[step.uploadCategory || step.id] || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with progress */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {currentStep > 0 ? (
            <TouchableOpacity onPress={goPrev} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.stepCounter}>
            {currentStep + 1} / {totalSteps}
          </Text>
        </View>
        <TouchableOpacity onPress={skipOnboarding} style={styles.skipBtn}>
          <Text style={styles.skipText}>{t.common?.skip || 'Skip'}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Step Content */}
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Step Icon */}
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name={step.icon as any}
              size={48}
              color="#1976d2"
            />
          </View>

          {/* Step Title */}
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepSubtitle}>{step.subtitle}</Text>

          {/* Upload Area (for upload-type steps) */}
          {step.type === 'upload' && (
            <View style={styles.uploadSection}>
              {/* Uploaded documents */}
              {docsForCurrentStep.length > 0 && (
                <View style={styles.uploadedList}>
                  {docsForCurrentStep.map((url, idx) => (
                    <View key={idx} style={styles.uploadedItem}>
                      <MaterialCommunityIcons name="file-check" size={20} color="#10b981" />
                      <Text style={styles.uploadedText} numberOfLines={1}>
                        Document {idx + 1} uploaded
                      </Text>
                      <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />
                    </View>
                  ))}
                </View>
              )}

              {/* Upload button */}
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={handleUpload}
                disabled={uploading}
                activeOpacity={0.7}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#1976d2" />
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                      <MaterialCommunityIcons name="camera" size={28} color="#1976d2" />
                      <MaterialCommunityIcons name="folder-open" size={28} color="#1976d2" />
                    </View>
                    <Text style={styles.uploadBtnTitle}>
                      {docsForCurrentStep.length > 0
                        ? (t.provider?.uploadAnother || 'Upload Another Document')
                        : (t.provider?.tapToUpload || 'Tap to Upload Document')}
                    </Text>
                    <Text style={styles.uploadBtnHint}>
                      {t.provider?.cameraOrFile || 'Take a photo or choose from files (JPG, PNG, PDF)'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {step.required && docsForCurrentStep.length === 0 && (
                <View style={styles.requiredBadge}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color="#f59e0b" />
                  <Text style={styles.requiredText}>
                    {t.provider?.requiredDocument || 'This document is required'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action button (for action-type steps like Services) */}
          {step.type === 'action' && (
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleAction}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name={step.icon as any} size={24} color="#fff" />
                <Text style={styles.actionBtnText}>
                  {t.provider?.reviewServices || 'Review My Services'}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#fff" />
              </TouchableOpacity>

              {completedSteps.has(step.id) && (
                <View style={styles.completedBadge}>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />
                  <Text style={styles.completedText}>
                    {t.provider?.reviewed || 'Reviewed'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Completion celebration (last step) */}
          {step.id === 'complete' && (
            <View style={styles.completionSection}>
              <View style={styles.completionStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {Object.values(uploadedDocs).flat().length}
                  </Text>
                  <Text style={styles.statLabel}>Documents Uploaded</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{completedSteps.size}</Text>
                  <Text style={styles.statLabel}>Steps Completed</Text>
                </View>
              </View>

              <View style={styles.nextStepsCard}>
                <Text style={styles.nextStepsTitle}>
                  {t.provider?.whatHappensNext || 'What Happens Next?'}
                </Text>
                <View style={styles.nextStepItem}>
                  <MaterialCommunityIcons name="magnify-scan" size={20} color="#1976d2" />
                  <Text style={styles.nextStepText}>
                    Our team reviews your documents (typically 1-2 business days)
                  </Text>
                </View>
                <View style={styles.nextStepItem}>
                  <MaterialCommunityIcons name="bell-ring" size={20} color="#1976d2" />
                  <Text style={styles.nextStepText}>
                    You'll receive a notification once approved
                  </Text>
                </View>
                <View style={styles.nextStepItem}>
                  <MaterialCommunityIcons name="clipboard-text" size={20} color="#1976d2" />
                  <Text style={styles.nextStepText}>
                    Service requests matching your capabilities will appear automatically
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Bottom buttons */}
      <View style={styles.footer}>
        {step.id === 'complete' ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={finishOnboarding}>
            <Text style={styles.primaryBtnText}>
              {t.provider?.goToDashboard || 'Go to Dashboard'}
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, !canProceed() && styles.primaryBtnDisabled]}
            onPress={goNext}
            disabled={!canProceed()}
          >
            <Text style={styles.primaryBtnText}>
              {step.required && !completedSteps.has(step.id)
                ? (t.provider?.uploadToContinue || 'Upload to Continue')
                : (t.common?.next || 'Next')}
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Photo Review Modal */}
      <Modal
        visible={!!previewUri}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPreviewUri(null)}
      >
        <SafeAreaView style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setPreviewUri(null)} style={styles.previewCloseBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>
              {t.provider?.reviewPhoto || 'Review Photo'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.previewImageContainer}>
            {previewUri && (
              <Image
                source={{ uri: previewUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
          </View>

          <Text style={styles.previewHint}>
            {t.provider?.photoReviewHint || 'Make sure the document is clear and all text is readable.'}
          </Text>

          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.previewRetakeBtn}
              onPress={handleRetakePhoto}
            >
              <MaterialCommunityIcons name="camera-retake" size={20} color="#1976d2" />
              <Text style={styles.previewRetakeText}>
                {t.provider?.retake || 'Retake'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.previewConfirmBtn}
              onPress={handleConfirmPhoto}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  <Text style={styles.previewConfirmText}>
                    {t.provider?.usePhoto || 'Use Photo'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    width: 60,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  backBtn: {
    padding: 8,
    width: 40,
  },
  stepCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  skipBtn: {
    width: 60,
    alignItems: 'flex-end',
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
    borderRadius: 2,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#1976d2',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  // Upload
  uploadSection: {
    width: '100%',
    gap: 16,
  },
  uploadedList: {
    gap: 8,
  },
  uploadedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  uploadedText: {
    flex: 1,
    fontSize: 14,
    color: '#065f46',
    fontWeight: '500',
  },
  uploadBtn: {
    borderWidth: 2,
    borderColor: '#1976d2',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fafbff',
  },
  uploadBtnTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
  },
  uploadBtnHint: {
    fontSize: 12,
    color: '#9ca3af',
  },
  requiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    padding: 10,
    borderRadius: 8,
  },
  requiredText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },
  // Action
  actionSection: {
    width: '100%',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976d2',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 10,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  completedText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  // Completion
  completionSection: {
    width: '100%',
    gap: 20,
  },
  completionStats: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1976d2',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#d1d5db',
    marginHorizontal: 16,
  },
  nextStepsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  nextStepText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976d2',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: '#93c5fd',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Photo Review Modal
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
  },
  previewCloseBtn: {
    padding: 8,
    backgroundColor: '#374151',
    borderRadius: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  previewImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  previewHint: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 13,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: '#111',
  },
  previewRetakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1976d2',
    backgroundColor: 'transparent',
  },
  previewRetakeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976d2',
  },
  previewConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10b981',
  },
  previewConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
