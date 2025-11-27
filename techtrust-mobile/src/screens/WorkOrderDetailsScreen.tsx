/**
 * Tela de Detalhes do Work Order
 * ✨ Atualizada com animações e UI melhorada
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Linking } from 'react-native';
import { Card, Text, Chip, Divider, useTheme } from 'react-native-paper';
import api from '../services/api';

// ✨ Importando componentes de UI
import {
  FadeInView,
  SlideInView,
  ScalePress,
  CardSkeleton,
  Toast,
  useToast,
  LoadingOverlay,
  SuccessAnimation,
  EnhancedButton,
  AnimatedProgressBar,
} from '../components';

export default function WorkOrderDetailsScreen({ route, navigation }: any) {
  const theme = useTheme();
  const { workOrderId } = route.params;

  const [workOrder, setWorkOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // ✨ Toast hook
  const { toast, success, error, hideToast } = useToast();

  useEffect(() => {
    loadWorkOrderDetails();
  }, []);

  async function loadWorkOrderDetails() {
    if (!loading) setRefreshing(true);
    try {
      const response = await api.get(`/work-orders/${workOrderId}`);
      setWorkOrder(response.data.data);
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err);
      error('Não foi possível carregar os detalhes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleApproveCompletion() {
    Alert.alert(
      'Aprovar Conclusão',
      'Confirma que o serviço foi concluído satisfatoriamente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprovar',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.post(`/work-orders/${workOrderId}/approve`);
              setSuccessMessage('Serviço aprovado!');
              setShowSuccess(true);
              loadWorkOrderDetails();
            } catch (err: any) {
              error(err.response?.data?.message || 'Erro ao aprovar');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleReportIssue() {
    Alert.prompt(
      'Reportar Problema',
      'Descreva o problema encontrado:',
      async (issueDescription) => {
        if (!issueDescription || issueDescription.trim().length < 10) {
          error('Descreva o problema com pelo menos 10 caracteres');
          return;
        }

        setActionLoading(true);
        try {
          await api.post(`/work-orders/${workOrderId}/report-issue`, {
            issueDescription: issueDescription.trim(),
          });
          success('Problema reportado com sucesso');
          loadWorkOrderDetails();
        } catch (err: any) {
          error(err.response?.data?.message || 'Erro ao reportar problema');
        } finally {
          setActionLoading(false);
        }
      }
    );
  }

  const handleCallProvider = () => {
    if (workOrder?.provider?.phone) {
      Linking.openURL(`tel:${workOrder.provider.phone}`);
    }
  };

  const handleGoToPayment = () => {
    navigation.navigate('Payment', {
      serviceData: {
        provider: workOrder.provider?.fullName,
        service: workOrder.serviceRequest?.title,
        total: Number(workOrder.finalAmount),
      },
    });
  };

  const handleGoToRating = () => {
    navigation.navigate('Rating', {
      serviceData: {
        provider: workOrder.provider?.fullName,
        providerAvatar: workOrder.provider?.fullName?.charAt(0) || 'P',
        service: workOrder.serviceRequest?.title,
      },
    });
  };

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
      PENDING_START: 'Aguardando Início',
      IN_PROGRESS: 'Em Andamento',
      AWAITING_APPROVAL: 'Aguardando Aprovação',
      COMPLETED: 'Concluído',
      DISPUTED: 'Em Disputa',
    };
    return texts[status] || status;
  };

  const getStatusProgress = (status: string) => {
    const progress: any = {
      PENDING_START: 0.25,
      IN_PROGRESS: 0.5,
      AWAITING_APPROVAL: 0.75,
      COMPLETED: 1,
      DISPUTED: 0.5,
    };
    return progress[status] || 0;
  };

  const getStatusEmoji = (status: string) => {
    const emojis: any = {
      PENDING_START: '⏳',
      IN_PROGRESS: '🔧',
      AWAITING_APPROVAL: '✅',
      COMPLETED: '🎉',
      DISPUTED: '⚠️',
    };
    return emojis[status] || '📋';
  };

  // ✨ Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <CardSkeleton />
          <View style={{ height: 16 }} />
          <CardSkeleton />
          <View style={{ height: 16 }} />
          <CardSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (!workOrder) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorText}>Serviço não encontrado</Text>
        <EnhancedButton
          title="Voltar"
          onPress={() => navigation.goBack()}
          variant="primary"
        />
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
            onRefresh={loadWorkOrderDetails}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* ✨ Header Card */}
        <FadeInView delay={0}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.header}>
                <Text variant="headlineSmall" style={styles.title}>
                  {workOrder.serviceRequest?.title || 'Serviço'}
                </Text>
                <Chip
                  style={{ backgroundColor: getStatusColor(workOrder.status) }}
                  textStyle={styles.statusText}
                >
                  {getStatusEmoji(workOrder.status)} {getStatusText(workOrder.status)}
                </Chip>
              </View>

              {/* ✨ Progress bar */}
              <View style={styles.progressContainer}>
                <AnimatedProgressBar
                  progress={getStatusProgress(workOrder.status)}
                  color={getStatusColor(workOrder.status)}
                  height={6}
                />
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>Início</Text>
                  <Text style={styles.progressLabel}>Em andamento</Text>
                  <Text style={styles.progressLabel}>Aprovação</Text>
                  <Text style={styles.progressLabel}>Concluído</Text>
                </View>
              </View>

              <Text variant="bodySmall" style={styles.orderNumber}>
                #{workOrder.orderNumber}
              </Text>

              <Divider style={styles.divider} />

              {workOrder.serviceRequest?.vehicle && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIconBox}>
                    <Text style={styles.detailIcon}>🚗</Text>
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Veículo</Text>
                    <Text style={styles.detailValue}>
                      {workOrder.serviceRequest.vehicle.make} {workOrder.serviceRequest.vehicle.model}
                    </Text>
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        </FadeInView>

        {/* ✨ Provider Card */}
        {workOrder.provider && (
          <SlideInView direction="left" delay={100}>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  👨‍🔧 Fornecedor
                </Text>

                <View style={styles.providerInfo}>
                  <View style={styles.providerAvatar}>
                    <Text style={styles.providerInitial}>
                      {workOrder.provider.fullName?.charAt(0) || 'P'}
                    </Text>
                  </View>
                  <View style={styles.providerDetails}>
                    <Text style={styles.providerName}>{workOrder.provider.fullName}</Text>
                    <Text style={styles.providerPhone}>📱 {workOrder.provider.phone}</Text>
                  </View>
                </View>

                <ScalePress onPress={handleCallProvider}>
                  <View style={styles.callButton}>
                    <Text style={styles.callButtonIcon}>📞</Text>
                    <Text style={styles.callButtonText}>Ligar para fornecedor</Text>
                  </View>
                </ScalePress>
              </Card.Content>
            </Card>
          </SlideInView>
        )}

        {/* ✨ Valores */}
        <SlideInView direction="right" delay={150}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                💰 Valores
              </Text>

              <View style={styles.priceBox}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Valor Original:</Text>
                  <Text style={styles.priceValue}>R$ {Number(workOrder.originalAmount).toFixed(2)}</Text>
                </View>

                <Divider style={styles.priceDivider} />

                <View style={styles.priceRow}>
                  <Text style={styles.totalLabel}>Valor Final:</Text>
                  <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
                    R$ {Number(workOrder.finalAmount).toFixed(2)}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </SlideInView>

        {/* ✨ Timeline */}
        <SlideInView direction="left" delay={200}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                📅 Timeline
              </Text>

              <View style={styles.timeline}>
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#4caf50' }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Criado em</Text>
                    <Text style={styles.timelineValue}>
                      {new Date(workOrder.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>

                {workOrder.startedAt && (
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: '#ff9800' }]} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>Iniciado em</Text>
                      <Text style={styles.timelineValue}>
                        {new Date(workOrder.startedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                )}

                {workOrder.completedAt && (
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: '#9e9e9e' }]} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>Concluído em</Text>
                      <Text style={styles.timelineValue}>
                        {new Date(workOrder.completedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
        </SlideInView>

        {/* ✨ Ações */}
        <FadeInView delay={250}>
          <View style={styles.actionsContainer}>
            {workOrder.status === 'AWAITING_APPROVAL' && (
              <>
                <EnhancedButton
                  title="Aprovar Conclusão"
                  onPress={handleApproveCompletion}
                  variant="primary"
                  size="large"
                  icon="check"
                  fullWidth
                />

                <EnhancedButton
                  title="Reportar Problema"
                  onPress={handleReportIssue}
                  variant="danger"
                  size="medium"
                  icon="alert"
                  fullWidth
                  style={{ marginTop: 12 }}
                />
              </>
            )}

            {workOrder.status === 'COMPLETED' && (
              <>
                <EnhancedButton
                  title="Efetuar Pagamento"
                  onPress={handleGoToPayment}
                  variant="primary"
                  size="large"
                  icon="credit-card"
                  fullWidth
                />

                <EnhancedButton
                  title="Avaliar Serviço"
                  onPress={handleGoToRating}
                  variant="outline"
                  size="medium"
                  icon="star"
                  fullWidth
                  style={{ marginTop: 12 }}
                />
              </>
            )}
          </View>
        </FadeInView>
      </ScrollView>

      {/* ✨ Loading Overlay */}
      <LoadingOverlay visible={actionLoading} message="Processando..." />

      {/* ✨ Success Animation */}
      <SuccessAnimation
        visible={showSuccess}
        message={successMessage}
        onComplete={() => setShowSuccess(false)}
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
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    marginBottom: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressLabel: {
    fontSize: 9,
    color: '#9ca3af',
  },
  orderNumber: {
    opacity: 0.5,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  divider: {
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailIcon: {
    fontSize: 22,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 2,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 16,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  providerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  providerInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1976d2',
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  providerPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e9',
    padding: 14,
    borderRadius: 12,
  },
  callButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  callButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4caf50',
  },
  priceBox: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceDivider: {
    marginVertical: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  timeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#e5e7eb',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
    marginTop: 2,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 2,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  actionsContainer: {
    marginTop: 8,
  },
});
