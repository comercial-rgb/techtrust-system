/**
 * Tela de Perfil do Usuário
 * ✨ Atualizada com animações e UI melhorada
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Card, Text, Button, Avatar, Divider, List, useTheme } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { useI18n } from '../i18n';

// ✨ Importando componentes de UI
import {
  FadeInView,
  ScalePress,
  ProfileSkeleton,
  Toast,
  useToast,
  LoadingOverlay,
} from '../components';

export default function ProfileScreen({ navigation }: any) {
  const theme = useTheme();
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // ✨ Toast hook
  const { toast, success, error, hideToast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    if (!loading) setRefreshing(true);
    try {
      const [profileResponse, vehiclesResponse] = await Promise.all([
        api.get('/users/me'),
        api.get('/vehicles'),
      ]);
      
      const userData = profileResponse.data.data || profileResponse.data;
      const vehiclesData = vehiclesResponse.data.data || vehiclesResponse.data || [];
      const vehicleCount = Array.isArray(vehiclesData) ? vehiclesData.length : 0;
      
      console.log('� DEBUG - Raw vehicles response:', JSON.stringify(vehiclesResponse.data, null, 2));
      console.log('📊 Profile loaded - vehicles:', vehicleCount);
      console.log('📊 Vehicles array:', JSON.stringify(vehiclesData, null, 2));
      
      const sub = userData.subscription;
      if (sub) {
        // Set the actual vehicle count
        sub.vehiclesRegistered = vehicleCount;
      }
      
      setSubscription(sub);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      error(t.common?.errorLoadingProfile || 'Error loading profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    Alert.alert(t.auth?.logout || 'Logout', t.auth?.logoutConfirm || 'Do you want to logout?', [
      { text: t.common?.cancel || 'Cancel', style: 'cancel' },
      {
        text: t.auth?.logout || 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
          } catch (err) {
            console.error('Erro ao fazer logout:', err);
            error(t.common?.errorLogout || 'Error logging out');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getPlanColor = (plan: string) => {
    const colors: any = {
      FREE: '#9e9e9e',
      BASIC: '#2196f3',
      PREMIUM: '#ff9800',
      ENTERPRISE: '#9c27b0',
    };
    return colors[plan] || '#9e9e9e';
  };

  const getPlanName = (plan: string) => {
    const names: any = {
      FREE: t.profile?.planFree || 'Free',
      BASIC: t.profile?.planBasic || 'Basic',
      PREMIUM: t.profile?.planPremium || 'Premium',
      ENTERPRISE: t.profile?.planEnterprise || 'Enterprise',
    };
    return names[plan] || plan;
  };

  const getPlanEmoji = (plan: string) => {
    const emojis: any = {
      FREE: '🆓',
      BASIC: '⭐',
      PREMIUM: '👑',
      ENTERPRISE: '🏢',
    };
    return emojis[plan] || '📋';
  };

  // ✨ Loading state com Skeleton
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.scrollContent}>
          <ProfileSkeleton />
        </View>
      </View>
    );
  }

  const menuItems = [
    {
      title: t.profile?.editProfile || 'Edit Profile',
      description: t.profile?.editProfileDesc || 'Change name, address, etc',
      icon: 'account-edit',
      onPress: () => Alert.alert(t.common?.comingSoon || 'Coming Soon', t.common?.featureInDevelopment || 'Feature in development'),
    },
    {
      title: t.profile?.changePassword || 'Change Password',
      description: t.profile?.changePasswordDesc || 'Change your access password',
      icon: 'lock',
      onPress: () => Alert.alert(t.common?.comingSoon || 'Coming Soon', t.common?.featureInDevelopment || 'Feature in development'),
    },
    {
      title: t.nav?.notifications || 'Notifications',
      description: t.profile?.notificationsDesc || 'Configure alerts',
      icon: 'bell',
      onPress: () => Alert.alert(t.common?.comingSoon || 'Coming Soon', t.common?.featureInDevelopment || 'Feature in development'),
    },
    {
      title: t.profile?.helpSupport || 'Help & Support',
      description: t.profile?.helpSupportDesc || 'Help center',
      icon: 'help-circle',
      onPress: () => Alert.alert(t.common?.comingSoon || 'Coming Soon', t.common?.featureInDevelopment || 'Feature in development'),
    },
  ];

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      data={[]}
      renderItem={() => null}
      keyExtractor={() => 'profile-content'}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={loadProfile}
          colors={[theme.colors.primary]}
        />
      }
      ListHeaderComponent={
        <View>
          {/* ✨ Header Card com animação */}
          <FadeInView delay={0}>
            <Card style={styles.headerCard}>
              <Card.Content style={styles.headerContent}>
                <View style={styles.avatarContainer}>
                  <Avatar.Text
                    size={90}
                    label={getInitials(user?.fullName || 'U')}
                    style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
                  />
                  <View style={styles.onlineBadge} />
                </View>
                <Text variant="headlineSmall" style={styles.userName}>
                  {user?.fullName}
                </Text>
                <Text variant="bodyMedium" style={styles.userEmail}>
                  ✉️ {user?.email}
                </Text>
                <Text variant="bodySmall" style={styles.userPhone}>
                  📱 {user?.phone}
                </Text>
              </Card.Content>
            </Card>
          </FadeInView>

          {/* ✨ Subscription Card com animação */}
          {subscription && (
            <FadeInView delay={100}>
              <Card style={styles.card}>
                <Card.Content>
                  <View style={styles.subscriptionHeader}>
                    <View style={styles.planInfo}>
                      <Text style={styles.planEmoji}>{getPlanEmoji(subscription.plan)}</Text>
                      <Text variant="titleMedium" style={styles.planTitle}>{t.profile?.subscription || 'Subscription'}</Text>
                    </View>
                    <View
                      style={[
                        styles.planBadge,
                        { backgroundColor: getPlanColor(subscription.plan) },
                      ]}
                    >
                      <Text style={styles.planBadgeText}>{getPlanName(subscription.plan)}</Text>
                    </View>
                  </View>

                  <Divider style={styles.divider} />

                  <View style={styles.subscriptionDetails}>
                    <ScalePress onPress={() => navigation.navigate('Vehicles')}>
                      <View style={styles.statBox}>
                        <Text style={styles.statEmoji}>🚗</Text>
                        <Text style={styles.statValue}>
                          {subscription.vehiclesRegistered}/{subscription.maxVehicles}
                        </Text>
                        <Text style={styles.statLabel}>{t.nav?.vehicles || 'Vehicles'}</Text>
                      </View>
                    </ScalePress>

                    {subscription.maxServiceRequestsPerMonth && (
                      <View style={styles.statBox}>
                        <Text style={styles.statEmoji}>📋</Text>
                        <Text style={styles.statValue}>
                          {subscription.serviceRequestsThisMonth}/{subscription.maxServiceRequestsPerMonth}
                        </Text>
                        <Text style={styles.statLabel}>{t.profile?.requestsPerMonth || 'Requests/month'}</Text>
                      </View>
                    )}
                  </View>
                </Card.Content>
              </Card>
            </FadeInView>
          )}

          {/* ✨ Menu Actions com animação escalonada */}
          <FadeInView delay={200}>
            <Card style={styles.card}>
              <List.Section>
                {menuItems.map((item, index) => (
                  <React.Fragment key={item.title}>
                    <ScalePress onPress={item.onPress}>
                      <List.Item
                        title={item.title}
                        description={item.description}
                        left={(props) => (
                          <View style={styles.menuIconContainer}>
                            <List.Icon {...props} icon={item.icon} color={theme.colors.primary} />
                          </View>
                        )}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        titleStyle={styles.menuTitle}
                        descriptionStyle={styles.menuDescription}
                      />
                    </ScalePress>
                    {index < menuItems.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List.Section>
            </Card>
          </FadeInView>

          {/* ✨ Logout Button */}
          <FadeInView delay={300}>
            <ScalePress onPress={handleLogout}>
              <View style={styles.logoutButton}>
                <Text style={styles.logoutIcon}>🚪</Text>
                <Text style={[styles.logoutText, { color: theme.colors.error }]}>
                  {t.auth?.logout || 'Logout'}
                </Text>
              </View>
            </ScalePress>
          </FadeInView>

          <FadeInView delay={400}>
            <Text variant="bodySmall" style={styles.version}>
              TechTrust v1.0.0
            </Text>
            <Text variant="bodySmall" style={styles.copyright}>
              Made with ❤️ in Brazil
            </Text>
          </FadeInView>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 24,
    elevation: 4,
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    elevation: 4,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4caf50',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    marginTop: 16,
    fontWeight: '700',
  },
  userEmail: {
    opacity: 0.7,
    marginTop: 6,
  },
  userPhone: {
    opacity: 0.5,
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
    elevation: 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  planTitle: {
    fontWeight: '600',
  },
  planBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  planBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  divider: {
    marginVertical: 16,
  },
  subscriptionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    padding: 12,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  menuIconContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginLeft: 8,
  },
  menuTitle: {
    fontWeight: '600',
  },
  menuDescription: {
    opacity: 0.6,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  logoutIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    opacity: 0.4,
    marginTop: 24,
  },
  copyright: {
    textAlign: 'center',
    opacity: 0.3,
    marginTop: 4,
  },
});
