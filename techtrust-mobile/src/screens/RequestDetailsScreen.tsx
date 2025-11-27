/**
 * Tela de Detalhes da Solicitação
 * ✨ Atualizada com animações e UI melhorada
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card, Text, Chip, Divider, useTheme } from 'react-native-paper';
import api from '../services/api';
import { ServiceRequest, Quote } from '../types';

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
  PulseView,
} from '../components';

export default function RequestDetailsScreen({ route, navigation }: any) {
  const theme = useTheme();
  const { requestId } = route.params;

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // ✨ Toast hook
  const { toast, success, error, hideToast } = useToast();

  useEffect(() => {
    loadRequestDetails();
  }, []);

  async function loadRequestDetails() {
    if (!loading) setRefreshing(true);
    try {
      const response = await api.get(`/service-requests/${requestId}`);
      setRequest(response.data.data);
      setQuotes(response.data.data.quotes || []);
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err);
      error('Não foi possível carregar os detalhes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleAcceptQuote(quoteId: string) {
    Alert.alert(
      'Aceitar Orçamento',
      'Deseja realmente aceitar este orçamento? Uma ordem de serviço será criada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceitar',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.post(`/quotes/${quoteId}/accept`);
              setShowSuccess(true);
              loadRequestDetails();
            } catch (err: any) {
              error(err.response?.data?.message || 'Erro ao aceitar orçamento');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleCancelRequest() {
    Alert.alert('Cancelar Solicitação', 'Deseja realmente cancelar esta solicitação?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim, Cancelar',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.post(`/service-requests/${requestId}/cancel`);
            success('Solicitação cancelada');
            setTimeout(() => navigation.goBack(), 1500);
          } catch (err: any) {
            error(err.response?.data?.message || 'Erro ao cancelar');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  const getStatusColor = (status: string) => {
    const colors: any = {
      SEARCHING_PROVIDERS: theme.colors.primary,
      QUOTES_RECEIVED: '#4caf50',
      QUOTE_ACCEPTED: '#ff9800',
      IN_PROGRESS: '#ff9800',
      COMPLETED: '#9e9e9e',
      CANCELLED: '#f44336',
    };
    return colors[status] || theme.colors.primary;
  };

  const getStatusText = (status: string) => {
    const texts: any = {
      SEARCHING_PROVIDERS: 'Buscando Fornecedores',
      QUOTES_RECEIVED: 'Orçamentos Recebidos',
      QUOTE_ACCEPTED: 'Orçamento Aceito',
      IN_PROGRESS: 'Em Andamento',
      COMPLETED: 'Concluído',
      CANCELLED: 'Cancelado',
    };
    return texts[status] || status;
  };

  const getServiceTypeText = (type: string) => {
    const types: any = {
      SCHEDULED_MAINTENANCE: '🔧 Manutenção',
      REPAIR: '🛠️ Reparo',
      ROADSIDE_SOS: '🆘 Socorro',
      INSPECTION: '🔍 Inspeção',
      DETAILING: '✨ Estética',
    };
    return types[type] || type;
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

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorText}>Solicitação não encontrada</Text>
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
            onRefresh={loadRequestDetails}
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
                  {request.title}
                </Text>
                <Chip
                  icon="information"
                  style={{ backgroundColor: getStatusColor(request.status) }}
                  textStyle={styles.statusText}
                >
                  {getStatusText(request.status)}
                </Chip>
              </View>

              <Text variant="bodySmall" style={styles.requestNumber}>
                #{request.requestNumber}
              </Text>

              <Divider style={styles.divider} />

              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <View style={styles.detailIconBox}>
                    <Text style={styles.detailIcon}>🚗</Text>
                  </View>
                  <View style={styles.detailTextBox}>
                    <Text style={styles.detailLabel}>Veículo</Text>
                    <Text style={styles.detailValue}>
                      {request.vehicle?.make} {request.vehicle?.model}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailIconBox}>
                    <Text style={styles.detailIcon}>🔧</Text>
                  </View>
                  <View style={styles.detailTextBox}>
                    <Text style={styles.detailLabel}>Tipo</Text>
                    <Text style={styles.detailValue}>
                      {getServiceTypeText(request.serviceType)}
                    </Text>
                  </View>
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.descriptionBox}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  📝 Descrição
                </Text>
                <Text variant="bodyMedium" style={styles.description}>
                  {request.description}
                </Text>
              </View>
            </Card.Content>
          </Card>
        </FadeInView>

        {/* ✨ Orçamentos Recebidos */}
        {quotes.length > 0 && (
          <FadeInView delay={100}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="titleLarge" style={styles.sectionHeaderTitle}>
                  📋 Orçamentos
                </Text>
                <View style={styles.quotesCount}>
                  <Text style={styles.quotesCountText}>{quotes.length}</Text>
                </View>
              </View>

              {quotes.map((quote, index) => (
                <SlideInView key={quote.id} direction="left" delay={150 + index * 100}>
                  <Card style={styles.quoteCard}>
                    <Card.Content>
                      <View style={styles.quoteHeader}>
                        <View style={styles.providerInfo}>
                          <View style={styles.providerAvatar}>
                            <Text style={styles.providerInitial}>
                              {(quote.provider?.fullName || 'F').charAt(0)}
                            </Text>
                          </View>
                          <View>
                            <Text variant="titleMedium" style={styles.providerName}>
                              {quote.provider?.providerProfile?.businessName ||
                                quote.provider?.fullName ||
                                'Fornecedor'}
                            </Text>
                            {quote.provider?.providerProfile && (
                              <Text style={styles.providerRating}>
                                ⭐ {Number(quote.provider.providerProfile.averageRating).toFixed(1)} •{' '}
                                {quote.provider.providerProfile.totalReviews} avaliações
                              </Text>
                            )}
                          </View>
                        </View>
                        <Text variant="headlineSmall" style={[styles.quotePrice, { color: theme.colors.primary }]}>
                          R$ {Number(quote.totalAmount).toFixed(2)}
                        </Text>
                      </View>

                      <Divider style={styles.divider} />

                      <View style={styles.priceBreakdown}>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>🔩 Peças:</Text>
                          <Text style={styles.priceValue}>R$ {Number(quote.partsCost).toFixed(2)}</Text>
                        </View>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>👨‍🔧 Mão de obra:</Text>
                          <Text style={styles.priceValue}>R$ {Number(quote.laborCost).toFixed(2)}</Text>
                        </View>
                        {Number(quote.additionalFees) > 0 && (
                          <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>📋 Taxas:</Text>
                            <Text style={styles.priceValue}>R$ {Number(quote.additionalFees).toFixed(2)}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.laborDescriptionBox}>
                        <Text style={styles.laborDescription}>
                          📝 {quote.laborDescription}
                        </Text>
                      </View>

                      {quote.status === 'PENDING' && request.status === 'QUOTES_RECEIVED' && (
                        <EnhancedButton
                          title="Aceitar Orçamento"
                          onPress={() => handleAcceptQuote(quote.id)}
                          variant="primary"
                          size="medium"
                          icon="check"
                          fullWidth
                          style={{ marginTop: 12 }}
                        />
                      )}

                      {quote.status === 'ACCEPTED' && (
                        <View style={styles.acceptedBadge}>
                          <Text style={styles.acceptedText}>✓ Orçamento Aceito</Text>
                        </View>
                      )}
                    </Card.Content>
                  </Card>
                </SlideInView>
              ))}
            </View>
          </FadeInView>
        )}

        {/* ✨ Aguardando Orçamentos */}
        {quotes.length === 0 && request.status === 'SEARCHING_PROVIDERS' && (
          <FadeInView delay={100}>
            <Card style={styles.waitingCard}>
              <Card.Content style={styles.waitingContent}>
                <PulseView>
                  <Text style={styles.waitingEmoji}>⏳</Text>
                </PulseView>
                <Text variant="titleMedium" style={styles.waitingTitle}>
                  Aguardando Orçamentos
                </Text>
                <Text style={styles.waitingText}>
                  Fornecedores têm até 2 horas para enviar orçamentos.{'\n'}
                  Você receberá uma notificação quando recebermos o primeiro!
                </Text>
              </Card.Content>
            </Card>
          </FadeInView>
        )}

        {/* ✨ Botão Cancelar */}
        {(request.status === 'SEARCHING_PROVIDERS' || request.status === 'QUOTES_RECEIVED') && (
          <FadeInView delay={200}>
            <EnhancedButton
              title="Cancelar Solicitação"
              onPress={handleCancelRequest}
              variant="outline"
              size="medium"
              icon="close"
              fullWidth
              style={{ marginTop: 16 }}
            />
          </FadeInView>
        )}
      </ScrollView>

      {/* ✨ Loading Overlay */}
      <LoadingOverlay visible={actionLoading} message="Processando..." />

      {/* ✨ Success Animation */}
      <SuccessAnimation
        visible={showSuccess}
        message="Orçamento aceito!"
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
    marginBottom: 12,
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
  requestNumber: {
    opacity: 0.5,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  divider: {
    marginVertical: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  detailIcon: {
    fontSize: 20,
  },
  detailTextBox: {
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
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 2,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 8,
    color: '#374151',
  },
  descriptionBox: {
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  description: {
    color: '#166534',
    lineHeight: 22,
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontWeight: '700',
    flex: 1,
  },
  quotesCount: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quotesCountText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  quoteCard: {
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976d2',
  },
  providerName: {
    fontWeight: '600',
  },
  providerRating: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  quotePrice: {
    fontWeight: '800',
  },
  priceBreakdown: {
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  laborDescriptionBox: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 10,
  },
  laborDescription: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
  },
  acceptedBadge: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  acceptedText: {
    color: '#4caf50',
    fontWeight: '700',
  },
  waitingCard: {
    borderRadius: 20,
    elevation: 2,
  },
  waitingContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  waitingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  waitingTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  waitingText: {
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 22,
  },
});
