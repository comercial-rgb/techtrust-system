/**
 * ProviderWorkOrderDetailsScreen - Detalhes do Serviço + Ações
 * Iniciar, Concluir, Ligar para cliente, Timeline
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';

interface WorkOrder {
  id: string;
  orderNumber: string;
  status: 'PENDING_START' | 'IN_PROGRESS' | 'AWAITING_APPROVAL' | 'COMPLETED';
  finalAmount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    location: string;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
    plateNumber: string;
    color: string;
    mileage: number;
  };
  serviceRequest: {
    title: string;
    description: string;
  };
  quote: {
    partsCost: number;
    laborCost: number;
    laborDescription: string;
    estimatedDuration: string;
    notes?: string;
  };
  timeline: {
    status: string;
    timestamp: string;
    description: string;
  }[];
}

export default function ProviderWorkOrderDetailsScreen({ route, navigation }: any) {
  const { t } = useI18n();
  const { workOrderId } = route.params;
  const [loading, setLoading] = useState(true);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [finalAmount, setFinalAmount] = useState('');

  useEffect(() => {
    loadWorkOrder();
  }, [workOrderId]);

  const loadWorkOrder = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockWO: WorkOrder = {
        id: workOrderId,
        orderNumber: 'WO-2024-001',
        status: 'IN_PROGRESS',
        finalAmount: 450.0,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        customer: {
          name: 'Maria Santos',
          phone: '+1 (407) 555-5678',
          email: 'maria.santos@email.com',
          location: 'Kissimmee, FL',
        },
        vehicle: {
          make: 'Toyota',
          model: 'Corolla',
          year: 2019,
          plateNumber: 'XYZ5678',
          color: 'Prata',
          mileage: 58000,
        },
        serviceRequest: {
          title: 'Revisão completa',
          description:
            'Revisão dos 30.000 km com verificação completa de freios, suspensão, fluidos e filtros. Cliente solicitou atenção especial aos freios.',
        },
        quote: {
          partsCost: 200.0,
          laborCost: 250.0,
          laborDescription:
            'Revisão completa incluindo: troca de óleo e filtro, verificação de freios, suspensão, checagem de fluidos.',
          estimatedDuration: '3h',
          notes: 'Verificar ruído nos freios.',
        },
        timeline: [
          {
            status: 'CREATED',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            description: 'Orçamento aceito pelo cliente',
          },
          {
            status: 'IN_PROGRESS',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            description: 'Serviço iniciado',
          },
        ],
      };

      setWorkOrder(mockWO);
      setFinalAmount(mockWO.finalAmount.toString());
    } catch (error) {
      console.error('Erro ao carregar serviço:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartService = async () => {
    if (!workOrder) return;

    Alert.alert(
      t.workOrder?.startService || 'Start Service',
      t.workOrder?.confirmStartService || 'Confirm you want to start this service now?',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.workOrder?.start || 'Start',
          onPress: async () => {
            setActionLoading(true);
            try {
              await new Promise(resolve => setTimeout(resolve, 1000));
              setWorkOrder({
                ...workOrder,
                status: 'IN_PROGRESS',
                startedAt: new Date().toISOString(),
                timeline: [
                  ...workOrder.timeline,
                  {
                    status: 'IN_PROGRESS',
                    timestamp: new Date().toISOString(),
                    description: t.workOrder?.serviceStarted || 'Service started',
                  },
                ],
              });
              Alert.alert(t.common?.success || 'Success', t.workOrder?.serviceStartedSuccess || 'Service started successfully!');
            } catch (error) {
              Alert.alert(t.common?.error || 'Error', t.workOrder?.couldNotStart || 'Could not start the service.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCompleteService = async () => {
    if (!workOrder) return;

    setActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setWorkOrder({
        ...workOrder,
        status: 'AWAITING_APPROVAL',
        completedAt: new Date().toISOString(),
        finalAmount: parseFloat(finalAmount),
        timeline: [
          ...workOrder.timeline,
          {
            status: 'AWAITING_APPROVAL',
            timestamp: new Date().toISOString(),
            description: t.workOrder?.serviceCompletedAwaitingApproval || 'Service completed, awaiting approval',
          },
        ],
      });
      setShowCompleteModal(false);
      Alert.alert(t.common?.success || 'Success', t.workOrder?.markedAsCompleted || 'Service marked as completed! Awaiting customer approval.');
    } catch (error) {
      Alert.alert(t.common?.error || 'Error', t.workOrder?.couldNotComplete || 'Could not complete the service.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCallCustomer = () => {
    if (workOrder?.customer.phone) {
      Linking.openURL(`tel:${workOrder.customer.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (workOrder?.customer.phone) {
      const phone = workOrder.customer.phone.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { icon: string; color: string; bg: string; label: string }> = {
      PENDING_START: { icon: 'clock-outline', color: '#f59e0b', bg: '#fef3c7', label: t.workOrder?.statusPendingStart || 'Pending Start' },
      IN_PROGRESS: { icon: 'progress-wrench', color: '#3b82f6', bg: '#dbeafe', label: t.workOrder?.statusInProgress || 'In Progress' },
      AWAITING_APPROVAL: { icon: 'clock-check-outline', color: '#8b5cf6', bg: '#ede9fe', label: t.workOrder?.statusAwaitingApproval || 'Awaiting Approval' },
      COMPLETED: { icon: 'check-circle', color: '#10b981', bg: '#d1fae5', label: t.workOrder?.statusCompleted || 'Completed' },
    };
    return statuses[status] || { icon: 'help-circle', color: '#6b7280', bg: '#f3f4f6', label: status };
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  if (!workOrder) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#d1d5db" />
        <Text style={styles.errorTitle}>{t.workOrder?.notFound || 'Service not found'}</Text>
      </View>
    );
  }

  const statusInfo = getStatusInfo(workOrder.status);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <MaterialCommunityIcons name={statusInfo.icon as any} size={16} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
            <Text style={styles.orderNumber}>#{workOrder.orderNumber}</Text>
          </View>

          <Text style={styles.title}>{workOrder.serviceRequest.title}</Text>
          <Text style={styles.description}>{workOrder.serviceRequest.description}</Text>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>{t.workOrder?.totalAmount || 'Total Amount'}</Text>
            <Text style={styles.amountValue}>${workOrder.finalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {workOrder.status === 'PENDING_START' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={handleStartService}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="play-circle" size={22} color="#fff" />
                  <Text style={styles.actionButtonText}>{t.workOrder?.startService || 'Start Service'}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {workOrder.status === 'IN_PROGRESS' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => setShowCompleteModal(true)}
            >
              <MaterialCommunityIcons name="check-circle" size={22} color="#fff" />
              <Text style={styles.actionButtonText}>{t.workOrder?.completeService || 'Complete Service'}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactButton} onPress={handleCallCustomer}>
              <MaterialCommunityIcons name="phone" size={20} color="#1976d2" />
              <Text style={styles.contactButtonText}>{t.common?.call || 'Call'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={handleWhatsApp}>
              <MaterialCommunityIcons name="whatsapp" size={20} color="#25d366" />
              <Text style={[styles.contactButtonText, { color: '#25d366' }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Customer Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 {t.workOrder?.customer || 'Customer'}</Text>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{workOrder.customer.name}</Text>
          </View>
          <TouchableOpacity style={styles.infoRow} onPress={handleCallCustomer}>
            <MaterialCommunityIcons name="phone" size={18} color="#1976d2" />
            <Text style={[styles.infoText, { color: '#1976d2' }]}>{workOrder.customer.phone}</Text>
          </TouchableOpacity>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{workOrder.customer.location}</Text>
          </View>
        </View>

        {/* Vehicle Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚗 {t.workOrder?.vehicle || 'Vehicle'}</Text>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="car" size={18} color="#6b7280" />
            <Text style={styles.infoText}>
              {workOrder.vehicle.make} {workOrder.vehicle.model} {workOrder.vehicle.year}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="card-text" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{t.workOrder?.plate || 'Plate'}: {workOrder.vehicle.plateNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="palette" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{t.workOrder?.color || 'Color'}: {workOrder.vehicle.color}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="speedometer" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{t.workOrder?.mileage || 'Mileage'}: {workOrder.vehicle.mileage.toLocaleString()}</Text>
          </View>
        </View>

        {/* Quote Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 {t.workOrder?.quoteDetails || 'Quote Details'}</Text>
          <View style={styles.quoteDetails}>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>{t.workOrder?.parts || 'Parts'}</Text>
              <Text style={styles.quoteValue}>${workOrder.quote.partsCost.toFixed(2)}</Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>{t.workOrder?.labor || 'Labor'}</Text>
              <Text style={styles.quoteValue}>${workOrder.quote.laborCost.toFixed(2)}</Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>{t.workOrder?.estimatedTime || 'Estimated Time'}</Text>
              <Text style={styles.quoteValue}>{workOrder.quote.estimatedDuration}</Text>
            </View>
            <View style={[styles.quoteRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>{t.common?.total || 'Total'}</Text>
              <Text style={styles.totalValue}>${workOrder.finalAmount.toFixed(2)}</Text>
            </View>
          </View>
          {workOrder.quote.notes && (
            <View style={styles.notesBox}>
              <MaterialCommunityIcons name="information" size={16} color="#f59e0b" />
              <Text style={styles.notesText}>{workOrder.quote.notes}</Text>
            </View>
          )}
        </View>

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 {t.workOrder?.timeline || 'Timeline'}</Text>
          {workOrder.timeline.map((event, index) => {
            const isLast = index === workOrder.timeline.length - 1;
            const eventStatus = getStatusInfo(event.status);

            return (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineLine}>
                  <View style={[styles.timelineDot, { backgroundColor: isLast ? '#1976d2' : '#d1d5db' }]} />
                  {!isLast && <View style={styles.timelineConnector} />}
                </View>
                <View style={styles.timelineContent}>
                  <View style={[styles.timelineBadge, { backgroundColor: eventStatus.bg }]}>
                    <Text style={[styles.timelineBadgeText, { color: eventStatus.color }]}>
                      {eventStatus.label}
                    </Text>
                  </View>
                  <Text style={styles.timelineDescription}>{event.description}</Text>
                  <Text style={styles.timelineDate}>{formatDateTime(event.timestamp)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Complete Modal */}
      <Modal
        visible={showCompleteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.workOrder?.completeService || 'Complete Service'}</Text>
              <TouchableOpacity onPress={() => setShowCompleteModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t.workOrder?.finalAmount || 'Final Amount'} ($)</Text>
            <TextInput
              style={styles.input}
              value={finalAmount}
              onChangeText={setFinalAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            <Text style={styles.inputHint}>{t.workOrder?.changeIfDifferent || 'Change if the final amount differs from the quoted'}</Text>

            <Text style={styles.inputLabel}>{t.workOrder?.completionNotes || 'Completion Notes'} ({t.common?.optional || 'optional'})</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={completionNotes}
              onChangeText={setCompletionNotes}
              placeholder={t.workOrder?.describeWork || 'Describe what was done, parts replaced...'}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information" size={18} color="#3b82f6" />
              <Text style={styles.infoBoxText}>
                {t.workOrder?.afterComplete || 'After completing, the customer will be notified to approve the service and make the payment.'}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t.common?.cancel || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, actionLoading && styles.confirmButtonDisabled]}
                onPress={handleCompleteService}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>{t.common?.confirm || 'Confirm'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  headerCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  orderNumber: {
    fontSize: 13,
    color: '#9ca3af',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  amountLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: '#3b82f6',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    color: '#4b5563',
  },
  quoteDetails: {
    gap: 8,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quoteLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  quoteValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  totalRow: {
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLine: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8,
  },
  timelineBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  timelineBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timelineDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
