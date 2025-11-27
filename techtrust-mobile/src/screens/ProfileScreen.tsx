/**
 * Tela de Perfil do Usuário
 * ✨ Atualizada com animações e UI melhorada
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Card, Text, Button, Avatar, Divider, List, useTheme } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

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
      
      const sub = profileResponse.data.data.subscription;
      const vehicleCount = vehiclesResponse.data.data?.length || 0;
      
      if (sub) {
        sub.vehiclesRegistered = vehicleCount;
      }
      
      setSubscription(sub);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
          } catch (err) {
            console.error('Erro ao fazer logout:', err);
            error('Erro ao sair da conta');
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
      FREE: 'Gratuito',
      BASIC: 'Básico',
      PREMIUM: 'Premium',
      ENTERPRISE: 'Empresarial',
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
      title: 'Editar Perfil',
      description: 'Alterar nome, endereço, etc',
      icon: 'account-edit',
      onPress: () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento'),
    },
    {
      title: 'Alterar Senha',
      description: 'Trocar sua senha de acesso',
      icon: 'lock',
      onPress: () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento'),
    },
    {
      title: 'Notificações',
      description: 'Configurar alertas',
      icon: 'bell',
      onPress: () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento'),
    },
    {
      title: 'Ajuda e Suporte',
      description: 'Central de ajuda',
      icon: 'help-circle',
      onPress: () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento'),
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
                      <Text variant="titleMedium" style={styles.planTitle}>Assinatura</Text>
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
                    <ScalePress onPress={() => navigation.navigate('VehiclesTab')}>
                      <View style={styles.statBox}>
                        <Text style={styles.statEmoji}>🚗</Text>
                        <Text style={styles.statValue}>
                          {subscription.vehiclesRegistered}/{subscription.maxVehicles}
                        </Text>
                        <Text style={styles.statLabel}>Veículos</Text>
                      </View>
                    </ScalePress>

                    {subscription.maxServiceRequestsPerMonth && (
                      <View style={styles.statBox}>
                        <Text style={styles.statEmoji}>📋</Text>
                        <Text style={styles.statValue}>
                          {subscription.serviceRequestsThisMonth}/{subscription.maxServiceRequestsPerMonth}
                        </Text>
                        <Text style={styles.statLabel}>Solicitações/mês</Text>
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
                  Sair da Conta
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
    color: '#1e293b',
  },
  userEmail: {
    color: '#475569',
    marginTop: 6,
    fontWeight: '500',
  },
  userPhone: {
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
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
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
  menuIconContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    marginLeft: 8,
    padding: 2,
  },
  menuTitle: {
    fontWeight: '700',
    color: '#1e293b',
  },
  menuDescription: {
    color: '#64748b',
    fontSize: 13,
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
