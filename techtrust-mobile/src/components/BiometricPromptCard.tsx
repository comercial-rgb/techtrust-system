/**
 * BiometricPromptCard - Card para ativar login biométrico
 * Aparece após o primeiro login bem-sucedido
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getBiometricInfo,
  authenticateWithBiometric,
  storeCredentials,
  setBiometricLoginEnabled,
  setBiometricPromptShown,
  BiometricInfo,
} from '../services/authService';
import { useI18n } from '../i18n';

interface BiometricPromptCardProps {
  visible: boolean;
  email: string;
  password: string;
  onComplete: (enabled: boolean) => void;
  onDismiss: () => void;
}

export default function BiometricPromptCard({
  visible,
  email,
  password,
  onComplete,
  onDismiss,
}: BiometricPromptCardProps) {
  const { t } = useI18n();
  const [biometricInfo, setBiometricInfoState] = useState<BiometricInfo | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [opacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      checkBiometric();
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const checkBiometric = async () => {
    const info = await getBiometricInfo();
    setBiometricInfoState(info);
  };

  const getBiometricIcon = () => {
    if (!biometricInfo) return 'fingerprint';
    switch (biometricInfo.biometricType) {
      case 'facial':
        return Platform.OS === 'ios' ? 'face-recognition' : 'face-recognition';
      case 'fingerprint':
        return 'fingerprint';
      case 'iris':
        return 'eye-outline';
      default:
        return 'fingerprint';
    }
  };

  const getBiometricName = () => {
    if (!biometricInfo) return 'Biometrics';
    switch (biometricInfo.biometricType) {
      case 'facial':
        return Platform.OS === 'ios' ? 'Face ID' : t.biometric?.faceRecognition || 'Face Recognition';
      case 'fingerprint':
        return Platform.OS === 'ios' ? 'Touch ID' : t.biometric?.fingerprint || 'Fingerprint';
      case 'iris':
        return t.biometric?.iris || 'Iris';
      default:
        return t.biometric?.biometrics || 'Biometrics';
    }
  };

  const handleEnable = async () => {
    setIsAuthenticating(true);
    try {
      // First authenticate to confirm
      const authenticated = await authenticateWithBiometric(
        t.biometric?.confirmToEnable || 'Confirm your identity to enable biometric login'
      );

      if (authenticated) {
        // Store credentials securely
        await storeCredentials(email, password);
        // Enable biometric login
        await setBiometricLoginEnabled(true);
        // Mark prompt as shown
        await setBiometricPromptShown();
        
        onComplete(true);
      } else {
        setIsAuthenticating(false);
      }
    } catch (error) {
      console.error('Error enabling biometric:', error);
      setIsAuthenticating(false);
    }
  };

  const handleSkip = async () => {
    await setBiometricPromptShown();
    onDismiss();
    onComplete(false);
  };

  if (!visible || !biometricInfo?.isAvailable || !biometricInfo?.isEnrolled) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.cardContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <LinearGradient
            colors={['#ffffff', '#f8fafc']}
            style={styles.card}
          >
            {/* Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.iconGradient}
              >
                <MaterialCommunityIcons
                  name={getBiometricIcon() as any}
                  size={48}
                  color="#fff"
                />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {t.biometric?.enableTitle || 'Enable Quick Login'}
            </Text>

            {/* Description */}
            <Text style={styles.description}>
              {t.biometric?.enableDescription || `Use ${getBiometricName()} to log in faster and more securely next time.`}
            </Text>

            {/* Biometric Type Badge */}
            <View style={styles.badge}>
              <MaterialCommunityIcons
                name={getBiometricIcon() as any}
                size={16}
                color="#3b82f6"
              />
              <Text style={styles.badgeText}>{getBiometricName()}</Text>
            </View>

            {/* Benefits */}
            <View style={styles.benefits}>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="lightning-bolt" size={20} color="#22c55e" />
                <Text style={styles.benefitText}>
                  {t.biometric?.benefitFast || 'Faster login'}
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="shield-check" size={20} color="#22c55e" />
                <Text style={styles.benefitText}>
                  {t.biometric?.benefitSecure || 'More secure'}
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="hand-okay" size={20} color="#22c55e" />
                <Text style={styles.benefitText}>
                  {t.biometric?.benefitConvenient || 'No typing needed'}
                </Text>
              </View>
            </View>

            {/* Buttons */}
            <TouchableOpacity
              style={styles.enableButton}
              onPress={handleEnable}
              disabled={isAuthenticating}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.enableButtonGradient}
              >
                <MaterialCommunityIcons
                  name={getBiometricIcon() as any}
                  size={24}
                  color="#fff"
                />
                <Text style={styles.enableButtonText}>
                  {isAuthenticating
                    ? (t.biometric?.authenticating || 'Authenticating...')
                    : (t.biometric?.enableButton || `Enable ${getBiometricName()}`)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>
                {t.biometric?.skipForNow || 'Skip for now'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  benefits: {
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#374151',
  },
  enableButton: {
    width: '100%',
    marginBottom: 12,
  },
  enableButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
});
