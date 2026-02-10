/**
 * CustomerProfileScreen - Customer Profile
 * Modern design with cards and statistics
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { FadeInView, ScalePress } from '../components/Animated';
import { useI18n, languages, Language } from '../i18n';
import api from '../services/api';
import { getVehicles } from '../services/dashboard.service';

const SPOKEN_LANGUAGES_KEY = '@techtrust_spoken_languages';

export default function CustomerProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSpokenLanguagesModal, setShowSpokenLanguagesModal] = useState(false);
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>(['en']); // Languages the customer speaks
  const [stats, setStats] = useState<{
    totalServices: number;
    totalSpent: number;
    vehiclesCount: number;
    memberSince: string;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  const loadSpokenLanguages = async () => {
    try {
      const saved = await AsyncStorage.getItem(SPOKEN_LANGUAGES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSpokenLanguages(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading spoken languages:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      setLoadingStats(true);
      
      // Load vehicles using the proven dashboard service
      let vehiclesCount = 0;
      try {
        const vehiclesList = await getVehicles();
        vehiclesCount = vehiclesList.length;
      } catch (e) {
        console.error('Error loading vehicles:', e);
      }

      // Load services
      let totalServices = 0;
      let totalSpent = 0;
      try {
        const servicesResponse = await api.get('/service-requests');
        const sData = servicesResponse?.data;
        const services = sData?.requests || sData?.data || (Array.isArray(sData) ? sData : []);
        const completed = services.filter((s: any) => {
          const st = s?.status;
          return st && typeof st === 'string' && (st.toLowerCase() === 'completed');
        });
        totalServices = completed.length;
        totalSpent = completed.reduce((sum: number, s: any) => sum + (Number(s.totalPrice) || 0), 0);
      } catch (e) {
        console.error('Error loading services:', e);
      }

      // Load subscription
      try {
        const meResponse = await api.get('/users/me');
        const meData = meResponse?.data?.data || meResponse?.data;
        if (meData?.subscription) {
          setSubscription(meData.subscription);
        }
      } catch (e) {
        console.error('Error loading user data:', e);
      }

      setStats({
        totalServices,
        totalSpent,
        vehiclesCount,
        memberSince: user?.createdAt ? new Date(user.createdAt).getFullYear().toString() : new Date().getFullYear().toString(),
      });
    } catch (error) {
      console.error('ERROR in loadUserStats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load spoken languages from AsyncStorage on mount
  useFocusEffect(
    useCallback(() => {
      loadUserStats();
      loadSpokenLanguages();
    }, [])
  );

  const currentLanguage = languages.find(l => l.code === language) || languages[0];

  const handleLanguageSelect = async (langCode: Language) => {
    await setLanguage(langCode);
    setShowLanguageModal(false);
  };

  const toggleSpokenLanguage = (langCode: string) => {
    setSpokenLanguages(prev => {
      let newLangs: string[];
      if (prev.includes(langCode)) {
        // Don't allow removing all languages
        if (prev.length === 1) return prev;
        newLangs = prev.filter(l => l !== langCode);
      } else {
        newLangs = [...prev, langCode];
      }
      // Persist to AsyncStorage
      AsyncStorage.setItem(SPOKEN_LANGUAGES_KEY, JSON.stringify(newLangs)).catch(err => 
        console.error('Error saving spoken languages:', err)
      );
      return newLangs;
    });
  };

  const getSpokenLanguagesText = () => {
    if (spokenLanguages.length === 0) return t.profile?.noLanguagesSelected || 'Select languages';
    const selectedLangs = languages.filter(l => spokenLanguages.includes(l.code));
    return selectedLangs.map(l => l.flag).join(' ');
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const menuItems = [
    {
      id: 'personal',
      title: t.profile?.personalInfo || 'Personal Information',
      subtitle: t.profile?.personalInfoSubtitle || 'Name, email, phone',
      icon: 'person-circle',
      color: '#3b82f6',
      onPress: () => navigation.navigate('PersonalInfo'),
    },
    {
      id: 'vehicles',
      title: t.profile?.myVehicles || 'My Vehicles',
      subtitle: (stats?.vehiclesCount || 0) > 0 ? `${stats.vehiclesCount} ${stats.vehiclesCount === 1 ? (t.profile?.vehicleRegistered || 'vehicle registered') : (t.profile?.vehiclesRegistered || 'vehicles registered')}` : (t.profile?.noVehicles || 'No vehicles registered'),
      icon: 'car',
      color: '#f59e0b',
      onPress: () => navigation.navigate('MyVehicles'),
    },
    {
      id: 'addresses',
      title: t.profile?.addresses || 'Addresses',
      subtitle: t.profile?.savedAddresses || 'Saved addresses',
      icon: 'location',
      color: '#10b981',
      onPress: () => navigation.navigate('Addresses'),
    },
    {
      id: 'payment',
      title: t.profile?.paymentMethods || 'Payment Methods',
      subtitle: t.profile?.cardsAndMethods || 'Cards and methods',
      icon: 'card',
      color: '#8b5cf6',
      onPress: () => navigation.navigate('PaymentMethods'),
    },
    {
      id: 'history',
      title: t.profile?.serviceHistory || 'Service History',
      subtitle: `${stats?.totalServices || 0} ${t.profile?.servicesCompleted || 'services completed'}`,
      icon: 'time',
      color: '#ec4899',
      onPress: () => navigation.navigate('ServiceHistory'),
    },
    {
      id: 'favorites',
      title: t.profile?.favoriteProviders || 'Favorite Providers',
      subtitle: t.profile?.preferredShops || 'Your preferred shops',
      icon: 'heart',
      color: '#ef4444',
      onPress: () => navigation.navigate('FavoriteProviders'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              <TouchableOpacity style={styles.editAvatarButton}>
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            
            <View style={styles.memberBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#1976d2" />
              <Text style={styles.memberBadgeText}>Member since {stats?.memberSince || new Date().getFullYear()}</Text>
            </View>
          </View>
        </FadeInView>

        {/* Stats */}
        <FadeInView delay={100}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.totalServices || 0}</Text>
              <Text style={styles.statLabel}>Services</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>${stats?.totalSpent || 0}</Text>
              <Text style={styles.statLabel}>Spent</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.vehiclesCount || 0}</Text>
              <Text style={styles.statLabel}>Vehicles</Text>
            </View>
          </View>
        </FadeInView>

        {/* Quick Toggles */}
        <FadeInView delay={200}>
          <View style={styles.togglesContainer}>
            <View style={styles.toggleItem}>
              <View style={styles.toggleInfo}>
                <View style={[styles.toggleIcon, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="notifications" size={20} color="#3b82f6" />
                </View>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleTitle}>Push Notifications</Text>
                  <Text style={styles.toggleSubtitle}>Quote and service alerts</Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                thumbColor={notificationsEnabled ? '#3b82f6' : '#f4f3f4'}
              />
            </View>

            <View style={styles.toggleItem}>
              <View style={styles.toggleInfo}>
                <View style={[styles.toggleIcon, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="mail" size={20} color="#f59e0b" />
                </View>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleTitle}>Email Notifications</Text>
                  <Text style={styles.toggleSubtitle}>Summaries and offers</Text>
                </View>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                trackColor={{ false: '#e5e7eb', true: '#fcd34d' }}
                thumbColor={emailNotifications ? '#f59e0b' : '#f4f3f4'}
              />
            </View>
          </View>
        </FadeInView>

        {/* Menu Items */}
        <FadeInView delay={300}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>{t.profile?.myAccount || 'My Account'}</Text>
            {menuItems.map((item) => (
              <ScalePress key={item.id} onPress={item.onPress}>
                <View style={styles.menuItem}>
                  <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
              </ScalePress>
            ))}
          </View>
        </FadeInView>

        {/* Languages I Speak Section */}
        <FadeInView delay={320}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>{t.profile?.languagesISpeak || 'Languages I Speak'}</Text>
            <ScalePress onPress={() => setShowSpokenLanguagesModal(true)}>
              <View style={styles.menuItem}>
                <View style={[styles.menuIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="chatbubbles" size={22} color="#22c55e" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuItemTitle}>{t.profile?.selectLanguages || 'My Languages'}</Text>
                  <Text style={styles.menuItemSubtitle}>
                    {getSpokenLanguagesText()} • {spokenLanguages.length} {t.profile?.selected || 'selected'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </ScalePress>
          </View>
        </FadeInView>

        {/* Subscription Plan Section */}
        <FadeInView delay={350}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>{t.profile?.myPlan || 'My Plan'}</Text>
            <ScalePress onPress={() => navigation.navigate('SubscriptionPlan')}>
              <View style={styles.subscriptionCard}>
                <View style={styles.subscriptionHeader}>
                  <View style={styles.subscriptionIcon}>
                    <Ionicons name="diamond" size={24} color="#fff" />
                  </View>
                  <View style={styles.subscriptionInfo}>
                    <Text style={styles.subscriptionName}>
                      {subscription ? `${subscription.plan?.charAt(0)}${subscription.plan?.slice(1).toLowerCase()} Plan` : (t.profile?.freePlan || 'Free Plan')}
                    </Text>
                    <Text style={styles.subscriptionPrice}>
                      {subscription && Number(subscription.price) > 0 
                        ? `$${Number(subscription.price).toFixed(2)}/month` 
                        : '$0.00/month'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#93c5fd" />
                </View>
                <View style={styles.subscriptionFeatures}>
                  {subscription?.plan === 'PREMIUM' || subscription?.plan === 'ENTERPRISE' ? (
                    <>
                      <View style={styles.subscriptionFeature}>
                        <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                        <Text style={styles.subscriptionFeatureText}>{t.profile?.prioritySupport || 'Priority Support'}</Text>
                      </View>
                      <View style={styles.subscriptionFeature}>
                        <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                        <Text style={styles.subscriptionFeatureText}>
                          {subscription.maxVehicles ? `${subscription.maxVehicles} ${t.profile?.vehiclesAllowed || 'vehicles'}` : (t.profile?.unlimitedVehicles || 'Unlimited vehicles')}
                        </Text>
                      </View>
                      <View style={styles.subscriptionFeature}>
                        <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                        <Text style={styles.subscriptionFeatureText}>{t.profile?.exclusiveDiscounts || 'Exclusive Discounts'}</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.subscriptionFeature}>
                        <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                        <Text style={styles.subscriptionFeatureText}>
                          {subscription?.maxVehicles ? `${subscription.maxVehicles} ${subscription.maxVehicles === 1 ? 'vehicle' : 'vehicles'}` : (t.profile?.basicFeatures || 'Basic features')}
                        </Text>
                      </View>
                      <View style={styles.subscriptionFeature}>
                        <Ionicons name="information-circle" size={14} color="#f59e0b" />
                        <Text style={styles.subscriptionFeatureText}>{t.profile?.upgradForMore || 'Upgrade for more features'}</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </ScalePress>
          </View>
        </FadeInView>

        {/* Support Section */}
        <FadeInView delay={400}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>{t.profile?.helpAndSupport || 'Help & Support'}</Text>
            
            <ScalePress onPress={() => navigation.navigate('HelpCenter')}>
              <View style={styles.menuItem}>
                <View style={[styles.menuIcon, { backgroundColor: '#f3f4f6' }]}>
                  <Ionicons name="help-circle" size={22} color="#6b7280" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuItemTitle}>{t.profile?.helpCenter || 'Help Center'}</Text>
                  <Text style={styles.menuItemSubtitle}>{t.profile?.faqs || 'FAQs'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </ScalePress>

            <ScalePress onPress={() => navigation.navigate('ContactUs')}>
              <View style={styles.menuItem}>
                <View style={[styles.menuIcon, { backgroundColor: '#f3f4f6' }]}>
                  <Ionicons name="chatbubble-ellipses" size={22} color="#6b7280" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuItemTitle}>{t.profile?.contactUs || 'Contact Us'}</Text>
                  <Text style={styles.menuItemSubtitle}>{t.profile?.chatSupport || 'Chat support'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </ScalePress>

            <ScalePress onPress={() => navigation.navigate('RateApp')}>
              <View style={styles.menuItem}>
                <View style={[styles.menuIcon, { backgroundColor: '#f3f4f6' }]}>
                  <Ionicons name="star" size={22} color="#6b7280" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuItemTitle}>{t.profile?.rateApp || 'Rate the App'}</Text>
                  <Text style={styles.menuItemSubtitle}>{t.profile?.leaveFeedback || 'Leave your feedback'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </ScalePress>

            <ScalePress onPress={() => navigation.navigate('TermsAndPolicies')}>
              <View style={styles.menuItem}>
                <View style={[styles.menuIcon, { backgroundColor: '#f3f4f6' }]}>
                  <Ionicons name="document-text" size={22} color="#6b7280" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuItemTitle}>{t.profile?.termsAndPolicies || 'Terms & Policies'}</Text>
                  <Text style={styles.menuItemSubtitle}>{t.profile?.termsSubtitle || 'Terms of use and privacy'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </ScalePress>

            <ScalePress onPress={() => setShowLanguageModal(true)}>
              <View style={styles.menuItem}>
                <View style={[styles.menuIcon, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="globe" size={22} color="#3b82f6" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuItemTitle}>{t.settings?.language || 'Language'}</Text>
                  <Text style={styles.menuItemSubtitle}>{currentLanguage.flag} {currentLanguage.nativeName}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </ScalePress>
          </View>
        </FadeInView>

        {/* Logout Button */}
        <FadeInView delay={500}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>{t.auth?.logout || 'Log Out'}</Text>
          </TouchableOpacity>
        </FadeInView>

        {/* Version */}
        <Text style={styles.version}>TechTrust v1.0.0</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.languageModalContent}>
            <Text style={styles.languageModalTitle}>{t.settings.selectLanguage}</Text>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  language === lang.code && styles.languageOptionSelected
                ]}
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <Text style={styles.languageOptionFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.languageOptionText,
                  language === lang.code && styles.languageOptionTextSelected
                ]}>
                  {lang.nativeName}
                </Text>
                {language === lang.code && (
                  <Ionicons name="checkmark" size={20} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Spoken Languages Modal */}
      <Modal
        visible={showSpokenLanguagesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpokenLanguagesModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSpokenLanguagesModal(false)}
        >
          <View style={styles.languageModalContent}>
            <Text style={styles.languageModalTitle}>{t.profile?.languagesISpeak || 'Languages I Speak'}</Text>
            <Text style={styles.languageModalSubtitle}>
              {t.profile?.selectLanguagesHelp || 'Select all languages you can communicate in'}
            </Text>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  spokenLanguages.includes(lang.code) && styles.languageOptionSelected
                ]}
                onPress={() => toggleSpokenLanguage(lang.code)}
              >
                <Text style={styles.languageOptionFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.languageOptionText,
                  spokenLanguages.includes(lang.code) && styles.languageOptionTextSelected
                ]}>
                  {lang.nativeName}
                </Text>
                {spokenLanguages.includes(lang.code) && (
                  <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.modalDoneButton}
              onPress={() => setShowSpokenLanguagesModal(false)}
            >
              <Text style={styles.modalDoneButtonText}>{t.common.done}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  memberBadgeText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  togglesContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  toggleSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  menuContainer: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  subscriptionCard: {
    backgroundColor: '#1976d2',
    borderRadius: 16,
    padding: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscriptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  subscriptionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  subscriptionPrice: {
    fontSize: 14,
    color: '#93c5fd',
    marginTop: 2,
  },
  subscriptionFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    gap: 12,
  },
  subscriptionFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subscriptionFeatureText: {
    fontSize: 12,
    color: '#bfdbfe',
    fontWeight: '500',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 24,
  },
  // Language Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 320,
  },
  languageModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  languageOptionSelected: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  languageOptionFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  languageOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  languageModalSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: -8,
  },
  modalDoneButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  modalDoneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
