/**
 * Tela de Work Orders (Serviços em Andamento)
 * ✨ Atualizada com animações e UI melhorada
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Chip, useTheme, FAB } from 'react-native-paper';
import api from '../services/api';
import { useI18n } from '../i18n';

// ✨ Importando componentes de UI
import {
  FadeInView,
  ScalePress,
  WorkOrderSkeleton,
  EmptyState,
  Toast,
  useToast,
  AnimatedProgressBar,
} from '../components';

interface WorkOrder {
  id: string;
  orderNumber: string;
  status: string;
  originalAmount: number;
  finalAmount: number;
  createdAt: string;
  serviceRequest?: {
    title: string;
    vehicle?: {
      make: string;
      model: string;
      plateNumber: string;
    };
  };
  provider?: {
    fullName: string;
    phone: string;
  };
}

export default function WorkOrdersScreen({ navigation }: any) {
  const { t } = useI18n();
  const theme = useTheme();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✨ Toast hook
  const { toast, error, hideToast } = useToast();

  useEffect(() => {
    loadWorkOrders();
  }, []);

  async function loadWorkOrders() {
    if (!loading) setRefreshing(true);
    try {
      const response = await api.get('/work-orders');
      setWorkOrders(response.data.data?.orders || response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar work orders:', err);
      error(t.workOrder?.loadError || 'Erro ao carregar serviços');
      setWorkOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const getStatusColor = (status: string) => {
    const colors: any = {
      PENDING_START: '#2196f3',
      IN_PROGRESS: '#ff9800',
      AWAITING_APPROVAL: '#4caf50',
      COMPLETED: '#9e9e9e',
      DISPUTED: '#f44336',
    };
    return colors[status] || theme.colors.primary;
  };

  const getStatusText = (status: string) => {
    const texts: any = {
      PENDING_START: t.workOrder?.awaitingStart || 'Aguardando Início',
      IN_PROGRESS: t.workOrder?.inProgress || 'Em Andamento',
      AWAITING_APPROVAL: t.workOrder?.awaitingApproval || 'Aguardando Aprovação',
      COMPLETED: t.workOrder?.completed || 'Concluído',
      DISPUTED: t.workOrder?.disputed || 'Em Disputa',
    };
    return texts[status] || status;
  };

  const getStatusIcon = (status: string) => {
    const icons: any = {
      PENDING_START: '⏳',
      IN_PROGRESS: '🔧',
      AWAITING_APPROVAL: '✅',
      COMPLETED: '🎉',
      DISPUTED: '⚠️',
    };
    return icons[status] || '📋';
  };

  const getStatusProgress = (status: string) => {
    const progress: any = {
      PENDING_START: 0.2,
      IN_PROGRESS: 0.5,
      AWAITING_APPROVAL: 0.8,
      COMPLETED: 1,
      DISPUTED: 0.5,
    };
    return progress[status] || 0;
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
          {[1, 2, 3].map((i) => (
            <FadeInView key={i} delay={i * 100}>
              <View style={{ marginBottom: 16 }}>
                <WorkOrderSkeleton />
              </View>
            </FadeInView>
          ))}
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
            onRefresh={loadWorkOrders}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* ✨ Header animado */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>{t.workOrder?.myServices || 'Meus Serviços'}</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {workOrders.length} {t.workOrder?.servicesCount || 'serviço(s)'}
            </Text>
          </View>
        </FadeInView>

        {/* ✨ Status summary cards */}
        <FadeInView delay={100}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.statusScroll}
          >
            <View style={styles.statusCards}>
              <View style={[styles.miniStatusCard, { backgroundColor: '#e3f2fd' }]}>
                <Text style={styles.miniStatusEmoji}>⏳</Text>
                <Text style={styles.miniStatusCount}>
                  {workOrders.filter(o => o.status === 'PENDING_START').length}
                </Text>
                <Text style={styles.miniStatusLabel}>{t.workOrder?.awaiting || 'Aguardando'}</Text>
              </View>
              <View style={[styles.miniStatusCard, { backgroundColor: '#fff3e0' }]}>
                <Text style={styles.miniStatusEmoji}>🔧</Text>
                <Text style={styles.miniStatusCount}>
                  {workOrders.filter(o => o.status === 'IN_PROGRESS').length}
                </Text>
                <Text style={styles.miniStatusLabel}>{t.workOrder?.inProgressShort || 'Em andamento'}</Text>
              </View>
              <View style={[styles.miniStatusCard, { backgroundColor: '#e8f5e9' }]}>
                <Text style={styles.miniStatusEmoji}>✅</Text>
                <Text style={styles.miniStatusCount}>
                  {workOrders.filter(o => o.status === 'AWAITING_APPROVAL').length}
                </Text>
                <Text style={styles.miniStatusLabel}>{t.workOrder?.toApprove || 'Para aprovar'}</Text>
              </View>
              <View style={[styles.miniStatusCard, { backgroundColor: '#f5f5f5' }]}>
                <Text style={styles.miniStatusEmoji}>🎉</Text>
                <Text style={styles.miniStatusCount}>
                  {workOrders.filter(o => o.status === 'COMPLETED').length}
                </Text>
                <Text style={styles.miniStatusLabel}>{t.workOrder?.completedPlural || 'Concluídos'}</Text>
              </View>
            </View>
          </ScrollView>
        </FadeInView>

        {/* ✨ Empty State melhorado */}
        {workOrders.length === 0 && (
          <FadeInView delay={200}>
            <EmptyState
              icon="clipboard-text-outline"
              title="Nenhum serviço"
              description="Crie uma solicitação para começar!"
              actionLabel="Nova Solicitação"
              onAction={() => navigation.navigate('CreateRequest')}
            />
          </FadeInView>
        )}

        {/* ✨ Cards com animação escalonada */}
        {workOrders.map((order, index) => (
          <FadeInView key={order.id} delay={200 + index * 100}>
            <ScalePress
              onPress={() => navigation.navigate('WorkOrderDetails', { workOrderId: order.id })}
            >
              <Card style={styles.card}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.titleRow}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
                      <Text variant="titleMedium" style={styles.cardTitle}>
                        {order.serviceRequest?.title || 'Serviço'}
                      </Text>
                    </View>
                    <Chip
                      style={{ backgroundColor: getStatusColor(order.status) }}
                      textStyle={styles.statusText}
                    >
                      {getStatusIcon(order.status)} {getStatusText(order.status)}
                    </Chip>
                  </View>

                  {/* ✨ Progress bar animada */}
                  <View style={styles.progressContainer}>
                    <AnimatedProgressBar
                      progress={getStatusProgress(order.status)}
                      color={getStatusColor(order.status)}
                      height={4}
                    />
                  </View>

                  <Text variant="bodySmall" style={styles.orderNumber}>
                    #{order.orderNumber}
                  </Text>

                  {order.serviceRequest?.vehicle && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoIcon}>🚗</Text>
                      <Text variant="bodyMedium" style={styles.infoText}>
                        {order.serviceRequest.vehicle.make} {order.serviceRequest.vehicle.model} - {order.serviceRequest.vehicle.plateNumber}
                      </Text>
                    </View>
                  )}

                  {order.provider && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoIcon}>👨‍🔧</Text>
                      <Text variant="bodyMedium" style={styles.infoText}>
                        {order.provider.fullName}
                      </Text>
                    </View>
                  )}

                  <View style={styles.priceRow}>
                    <Text variant="bodyMedium" style={styles.priceLabel}>Valor:</Text>
                    <Text variant="titleMedium" style={[styles.priceValue, { color: theme.colors.primary }]}>
                      R$ {Number(order.finalAmount).toFixed(2)}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            </ScalePress>
          </FadeInView>
        ))}
      </ScrollView>

      {/* ✨ FAB */}
      <FAB
        icon="plus"
        label="Nova Solicitação"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('CreateRequest')}
      />

      {/* ✨ Toast */}
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
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 4,
  },
  // Skeleton styles
  skeletonTitle: {
    width: 140,
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    width: 100,
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
  },
  // ✨ Status summary
  statusScroll: {
    marginBottom: 20,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  statusCards: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 16,
  },
  miniStatusCard: {
    width: 90,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  miniStatusEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  miniStatusCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
  },
  miniStatusLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
    elevation: 3,
    backgroundColor: '#fff',
  },
  cardHeader: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  cardTitle: {
    fontWeight: '700',
    flex: 1,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 12,
  },
  orderNumber: {
    opacity: 0.5,
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  infoText: {
    opacity: 0.8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  priceLabel: {
    opacity: 0.6,
  },
  priceValue: {
    fontWeight: '800',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    borderRadius: 16,
  },
});
