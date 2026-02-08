/**
 * Auth Service - Social Login & Biometric Authentication
 * TechTrust Mobile
 */

import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// Secure Store Keys
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const STORED_EMAIL_KEY = 'stored_email';
const STORED_PASSWORD_KEY = 'stored_password';
const BIOMETRIC_PROMPT_SHOWN_KEY = 'biometric_prompt_shown';

// Google OAuth Configuration
// Client IDs from Google Cloud Console - Project: AppTechTrust
const GOOGLE_CLIENT_ID_WEB = '26543985887-850q6ofe2akjrsjfrm76ln7dng48peaa.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_IOS = '26543985887-3jtoj1tdsah1lvl2n4vq58osrbtoi9fb.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_ANDROID = '26543985887-ni5m1hcelbsa775csrmrhplmvrad1s06.apps.googleusercontent.com';

// Discovery document for Google OAuth
const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// ============================================
// GOOGLE SIGN-IN
// ============================================

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export async function signInWithGoogle(): Promise<GoogleUser | null> {
  try {
    // Create redirect URI
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'com.techtrustautosolutions.mobile',
      path: 'auth/google',
    });

    // Get the appropriate client ID
    const clientId = Platform.select({
      ios: GOOGLE_CLIENT_ID_IOS,
      android: GOOGLE_CLIENT_ID_ANDROID,
      default: GOOGLE_CLIENT_ID_WEB,
    });

    if (!clientId) {
      console.log('Google Client ID not configured');
      throw new Error('Google Sign-In not configured');
    }

    // Create auth request
    const request = new AuthSession.AuthRequest({
      clientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Token,
    });

    // Prompt user
    const result = await request.promptAsync(googleDiscovery);

    if (result.type === 'success' && result.authentication?.accessToken) {
      // Fetch user info
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        {
          headers: { Authorization: `Bearer ${result.authentication.accessToken}` },
        }
      );

      const userInfo = await userInfoResponse.json();

      return {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      };
    }

    return null;
  } catch (error) {
    console.error('Google Sign-In error:', error);
    throw error;
  }
}

// ============================================
// APPLE SIGN-IN
// ============================================

export interface AppleUser {
  id: string;
  email: string | null;
  fullName: string | null;
  identityToken: string;
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return await AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<AppleUser | null> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Build full name from components
    let fullName: string | null = null;
    if (credential.fullName) {
      const nameParts = [
        credential.fullName.givenName,
        credential.fullName.familyName,
      ].filter(Boolean);
      fullName = nameParts.length > 0 ? nameParts.join(' ') : null;
    }

    return {
      id: credential.user,
      email: credential.email,
      fullName,
      identityToken: credential.identityToken || '',
    };
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      // User canceled the sign-in
      return null;
    }
    console.error('Apple Sign-In error:', error);
    throw error;
  }
}

// ============================================
// BIOMETRIC AUTHENTICATION
// ============================================

export interface BiometricInfo {
  isAvailable: boolean;
  biometricType: 'fingerprint' | 'facial' | 'iris' | 'none';
  isEnrolled: boolean;
}

export async function getBiometricInfo(): Promise<BiometricInfo> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricType: BiometricInfo['biometricType'] = 'none';
    
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'facial';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'fingerprint';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'iris';
    }

    return {
      isAvailable: hasHardware,
      biometricType,
      isEnrolled,
    };
  } catch (error) {
    console.error('Error getting biometric info:', error);
    return {
      isAvailable: false,
      biometricType: 'none',
      isEnrolled: false,
    };
  }
}

export async function authenticateWithBiometric(
  promptMessage: string = 'Authenticate to continue'
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
}

// ============================================
// SECURE CREDENTIAL STORAGE
// ============================================

export async function storeCredentials(email: string, password: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORED_EMAIL_KEY, email);
    await SecureStore.setItemAsync(STORED_PASSWORD_KEY, password);
  } catch (error) {
    console.error('Error storing credentials:', error);
    throw error;
  }
}

export async function getStoredCredentials(): Promise<{ email: string; password: string } | null> {
  try {
    const email = await SecureStore.getItemAsync(STORED_EMAIL_KEY);
    const password = await SecureStore.getItemAsync(STORED_PASSWORD_KEY);

    if (email && password) {
      return { email, password };
    }
    return null;
  } catch (error) {
    console.error('Error getting stored credentials:', error);
    return null;
  }
}

export async function clearStoredCredentials(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORED_EMAIL_KEY);
    await SecureStore.deleteItemAsync(STORED_PASSWORD_KEY);
  } catch (error) {
    console.error('Error clearing credentials:', error);
  }
}

// ============================================
// BIOMETRIC LOGIN PREFERENCE
// ============================================

export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking biometric enabled:', error);
    return false;
  }
}

export async function setBiometricLoginEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    console.error('Error setting biometric enabled:', error);
    throw error;
  }
}

export async function hasBiometricPromptBeenShown(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_PROMPT_SHOWN_KEY);
    return value === 'true';
  } catch (error) {
    return false;
  }
}

export async function setBiometricPromptShown(): Promise<void> {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_PROMPT_SHOWN_KEY, 'true');
  } catch (error) {
    console.error('Error setting biometric prompt shown:', error);
  }
}

export async function resetBiometricPromptShown(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_PROMPT_SHOWN_KEY);
  } catch (error) {
    console.error('Error resetting biometric prompt shown:', error);
  }
}

// ============================================
// FULL BIOMETRIC LOGIN FLOW
// ============================================

export async function attemptBiometricLogin(
  promptMessage: string = 'Log in with biometrics'
): Promise<{ email: string; password: string } | null> {
  try {
    // Check if biometric login is enabled
    const isEnabled = await isBiometricLoginEnabled();
    if (!isEnabled) {
      return null;
    }

    // Verify biometrics
    const authenticated = await authenticateWithBiometric(promptMessage);
    if (!authenticated) {
      return null;
    }

    // Get stored credentials
    const credentials = await getStoredCredentials();
    return credentials;
  } catch (error) {
    console.error('Biometric login error:', error);
    return null;
  }
}

// ============================================
// DISABLE BIOMETRIC AND CLEAR DATA
// ============================================

export async function disableBiometricLogin(): Promise<void> {
  try {
    await setBiometricLoginEnabled(false);
    await clearStoredCredentials();
    await resetBiometricPromptShown();
  } catch (error) {
    console.error('Error disabling biometric login:', error);
    throw error;
  }
}
