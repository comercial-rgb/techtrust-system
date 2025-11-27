/**
 * Tela de Dashboard do Cliente
 * ✨ Atualizada com animações e UI melhorada
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, FAB, useTheme } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { ServiceRequest } from '../types';

// ✨ Importando componentes de UI
import {
  FadeInView,
  ScalePress,
  CardSkeleton,
  EmptyState,
  Toast,
  useToast,
} from '../components';

export default function DashboardScreen({ navigation }: any) {
  const theme = useTheme();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [workOrdersCount, setWorkOrdersCount] = useState(0);
  const [quotesCount, setQuotesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // ✨ Toast hook
  const { toast, error, hideToast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    if (!loading) setRefreshing(true);
    try {
      // Carregar todos os dados em paralelo
      const [requestsRes, vehiclesRes, workOrdersRes] = await Promise.all([
        api.get('/service-requests', { params: { limit: 5 } }),
        api.get('/vehicles'),
        api.get('/work-orders', { params: { limit: 100 } }),
      ]);

      const requestsList = requestsRes.data.data.requests || [];
      const vehiclesList = vehiclesRes.data.data || [];
      const workOrdersList = workOrdersRes.data.data?.orders || workOrdersRes.data.data || [];

      setRequests(requestsList);
      setVehicleCount(vehiclesList.length);
      
      // Contar work orders em andamento
      const inProgressOrders = workOrdersList.filter(
        (wo: any) => wo.status === 'IN_PROGRESS' || wo.status === 'PENDING_START'
      );
      setWorkOrdersCount(inProgressOrders.length);

      // Contar solicitações com orçamentos
      const withQuotes = requestsList.filter(
        (r: ServiceRequest) => r.status === 'QUOTES_RECEIVED'
      );
      setQuotesCount(withQuotes.length);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      error('Erro ao carregar dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const getStatusColor = (status: string) => {
    const colors: any = {
      SEARCHING_PROVIDERS: theme.colors.primary,
      QUOTES_RECEIVED: '#4caf50',
      IN_PROGRESS: '#ff9800',
      COMPLETED: '#9e9e9e',
    };
    return colors[status] || theme.colors.primary;
  };

  const getStatusText = (status: string) => {
    const texts: any = {
      SEARCHING_PROVIDERS: 'Buscando fornecedores',
      QUOTES_RECEIVED: 'Orçamentos recebidos',
      QUOTE_ACCEPTED: 'Orçamento aceito',
      IN_PROGRESS: 'Em andamento',
      COMPLETED: 'Concluído',
    };
    return texts[status] || status;
  };

  // ✨ Loading state com Skeletons
  if (loading) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSubtitle} />
          </View>
          <View style={styles.section}>
            <View style={styles.skeletonSectionTitle} />
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <CardSkeleton />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={loadDashboardData}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* ✨ Header com animação */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.greeting}>
              Olá, {user?.fullName?.split(' ')[0]}! 👋
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Bem-vindo ao TechTrust
            </Text>
          </View>
        </FadeInView>

        {/* ✨ Quick Stats */}
        <FadeInView delay={100}>
          <View style={styles.statsContainer}>
            <ScalePress onPress={() => navigation.navigate('WorkOrdersTab')} style={styles.statCard}>
              <View style={[styles.statCardInner, { backgroundColor: '#e3f2fd' }]}>
                <Text style={styles.statEmoji}>🔧</Text>
                <Text style={styles.statNumber}>{workOrdersCount}</Text>
                <Text style={styles.statLabel}>Em andamento</Text>
              </View>
            </ScalePress>
            
            <ScalePress onPress={() => {}} style={styles.statCard}>
              <View style={[styles.statCardInner, { backgroundColor: '#e8f5e9' }]}>
                <Text style={styles.statEmoji}>📋</Text>
                <Text style={styles.statNumber}>{quotesCount}</Text>
                <Text style={styles.statLabel}>Orçamentos</Text>
              </View>
            </ScalePress>
            
            <ScalePress onPress={() => navigation.navigate('VehiclesTab')} style={styles.statCard}>
              <View style={[styles.statCardInner, { backgroundColor: '#fff3e0' }]}>
                <Text style={styles.statEmoji}>🚗</Text>
                <Text style={styles.statNumber}>{vehicleCount}</Text>
                <Text style={styles.statLabel}>Veículos</Text>
              </View>
            </ScalePress>
          </View>
        </FadeInView>

        {/* Solicitações recentes */}
        <FadeInView delay={200}>
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Solicitações Recentes
            </Text>

            {/* ✨ Empty State melhorado */}
            {requests.length === 0 && (
              <EmptyState
                icon="clipboard-text-outline"
                title="Nenhuma solicitação"
                description="Crie sua primeira solicitação de serviço!"
                actionLabel="Nova Solicitação"
                onAction={() => navigation.navigate('CreateRequest')}
              />
            )}

            {/* ✨ Cards com animação escalonada */}
            {requests.map((request, index) => (
              <FadeInView key={request.id} delay={300 + index * 100}>
                <ScalePress
                  onPress={() => navigation.navigate('RequestDetails', { requestId: request.id })}
                >
                  <Card style={styles.card}>
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <Text variant="titleMedium" style={styles.cardTitle}>
                          {request.title}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(request.status) },
                          ]}
                        >
                          <Text style={styles.statusText}>{getStatusText(request.status)}</Text>
                        </View>
                      </View>

                      <Text variant="bodySmall" style={styles.requestNumber}>
                        #{request.requestNumber}
                      </Text>

                      {request.quotesCount > 0 && (
                        <View style={styles.quotesContainer}>
                          <Text variant="bodyMedium" style={styles.quotesCount}>
                            📋 {request.quotesCount} orçamento(s) recebido(s)
                          </Text>
                        </View>
                      )}
                    </Card.Content>
                  </Card>
                </ScalePress>
              </FadeInView>
            ))}
          </View>
        </FadeInView>
      </ScrollView>

      {/* ✨ FAB com sombra melhorada */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('CreateRequest')}
        label="Nova Solicitação"
      />

      {/* ✨ Toast para notificações */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontWeight: '700',
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 4,
  },
  // ✨ Skeleton styles
  skeletonTitle: {
    width: 200,
    height: 28,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    width: 150,
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
  },
  skeletonSectionTitle: {
    width: 180,
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    marginBottom: 16,
  },
  // ✨ Stats cards
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
  },
  statCardInner: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '700',
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    marginRight: 8,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  requestNumber: {
    opacity: 0.6,
    marginBottom: 8,
  },
  quotesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  quotesCount: {
    color: '#4caf50',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    borderRadius: 16,
  },
});
