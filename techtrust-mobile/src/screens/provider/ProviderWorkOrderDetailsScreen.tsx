/**
 * ProviderWorkOrderDetailsScreen - Detalhes do Serviço + Ações
 * Iniciar, Concluir, Cancelar, Ligar para cliente, Timeline
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { CANCELLATION_RULES, PROVIDER_POINTS_SYSTEM } from '../../config/businessRules';

interface QuoteLineItem {
  id: string;
  type: 'part' | 'service';
  description: string;
  brand?: string;
  partCode?: string;
  quantity: number;
  unitPrice: number;
}

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
    lineItems: QuoteLineItem[];
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAdditionalPartsModal, setShowAdditionalPartsModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [finalAmount, setFinalAmount] = useState('');
  const [additionalPartsReason, setAdditionalPartsReason] = useState('');
  const [additionalItems, setAdditionalItems] = useState<{type: 'part' | 'service', description: string, quantity: string, unitPrice: string}[]>([
    { type: 'part', description: '', quantity: '1', unitPrice: '' }
  ]);

  // Reset state and reload when workOrderId changes or screen gains focus
  useFocusEffect(
    useCallback(() => {
      // Reset state when navigating to this screen
      setWorkOrder(null);
      setLoading(true);
      loadWorkOrder();
    }, [workOrderId])
  );

  const loadWorkOrder = async () => {
    setLoading(true);
    try {
      // Fetch work order details from API
      const { getWorkOrderDetails } = await import('../../services/dashboard.service');
      const data = await getWorkOrderDetails(workOrderId);
      
      if (data) {
        setWorkOrder(data);
        setFinalAmount(data.finalAmount?.toString() || '0');
      } else {
        setWorkOrder(null);
      }
    } catch (error) {
      console.error('Error loading work order:', error);
      setWorkOrder(null);
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
              // TODO: Call API to start service
              // await api.post(`/work-orders/${workOrderId}/start`);
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
      // TODO: Call API to complete service
      // await api.post(`/work-orders/${workOrderId}/complete`, { finalAmount: parseFloat(finalAmount), notes: completionNotes });
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

  // Check if provider can cancel the work order
  const canProviderCancel = useMemo(() => {
    if (!workOrder) return false;
    // Can cancel before start or while in progress (with penalty)
    return ['PENDING_START', 'IN_PROGRESS'].includes(workOrder.status);
  }, [workOrder]);

  // Handle provider cancellation
  const handleProviderCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert(
        t.common?.error || 'Error',
        t.businessRules?.cancellation?.enterReason || 'Please provide a reason for cancellation'
      );
      return;
    }

    setActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Provider gets penalty points for cancelling
      const penaltyPoints = PROVIDER_POINTS_SYSTEM.NEGATIVE_ACTIONS.CANCEL_AFTER_ACCEPT;
      
      setShowCancelModal(false);
      setCancelReason('');
      
      Alert.alert(
        t.common?.success || 'Success',
        t.businessRules?.cancellation?.providerCancelledSuccess?.replace('{points}', String(Math.abs(penaltyPoints))) || 
          `Work order cancelled. You received ${Math.abs(penaltyPoints)} penalty points.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(t.common?.error || 'Error', t.common?.tryAgain || 'Please try again');
    } finally {
      setActionLoading(false);
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

          {/* Request Additional Items (Parts/Services) - Only for IN_PROGRESS */}
          {workOrder.status === 'IN_PROGRESS' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.additionalPartsButton]}
              onPress={() => setShowAdditionalPartsModal(true)}
            >
              <MaterialCommunityIcons name="plus-circle-multiple-outline" size={22} color="#f59e0b" />
              <Text style={[styles.actionButtonText, styles.additionalPartsButtonText]}>
                {t.provider?.requestAdditionalItems || 'Request Additional Items'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Cancel Button - Available for PENDING_START and IN_PROGRESS */}
          {canProviderCancel && (
            <TouchableOpacity
              style={[styles.actionButton, styles.providerCancelButton]}
              onPress={() => setShowCancelModal(true)}
            >
              <MaterialCommunityIcons name="close-circle" size={22} color="#dc2626" />
              <Text style={[styles.actionButtonText, styles.providerCancelButtonText]}>
                {t.businessRules?.cancellation?.cancelWorkOrder || 'Cancel Work Order'}
              </Text>
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
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{workOrder.customer.location}</Text>
          </View>
          
          {/* Contact Actions */}
          <View style={styles.customerContactRow}>
            <TouchableOpacity style={styles.contactBtn} onPress={handleCallCustomer}>
              <MaterialCommunityIcons name="phone" size={18} color="#1976d2" />
              <Text style={styles.contactBtnText}>{t.workOrder?.call || 'Call'}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.contactBtn, styles.chatBtn]} 
              onPress={() => {
                const phoneNumber = workOrder.customer.phone.replace(/[^0-9]/g, '');
                const url = `whatsapp://send?phone=${phoneNumber}`;
                Linking.openURL(url).catch(() => {
                  Alert.alert(t.common?.error || 'Error', t.workOrder?.whatsappNotInstalled || 'WhatsApp not installed');
                });
              }}
            >
              <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
              <Text style={[styles.contactBtnText, { color: '#25D366' }]}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.contactBtn, styles.messageChatBtn]} 
              onPress={() => navigation.navigate('Chat', { 
                participantId: workOrder.customer.name,
                participantName: workOrder.customer.name 
              })}
            >
              <MaterialCommunityIcons name="chat" size={18} color="#1976d2" />
              <Text style={styles.contactBtnText}>{t.workOrder?.chat || 'Chat'}</Text>
            </TouchableOpacity>
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
          
          {/* Parts Section */}
          {workOrder.quote.lineItems.filter(item => item.type === 'part').length > 0 && (
            <View style={styles.lineItemsSection}>
              <View style={styles.lineItemsSectionHeader}>
                <MaterialCommunityIcons name="cog" size={16} color="#1976d2" />
                <Text style={styles.lineItemsSectionTitle}>{t.workOrder?.parts || 'Parts'}</Text>
              </View>
              {workOrder.quote.lineItems.filter(item => item.type === 'part').map((item) => (
                <View key={item.id} style={styles.lineItemCard}>
                  <View style={styles.lineItemHeader}>
                    <Text style={styles.lineItemDescription}>{item.description}</Text>
                    <Text style={styles.lineItemTotal}>
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.lineItemDetails}>
                    {item.brand && (
                      <Text style={styles.lineItemBrand}>{item.brand}</Text>
                    )}
                    {item.partCode && (
                      <Text style={styles.lineItemCode}>{item.partCode}</Text>
                    )}
                  </View>
                  <View style={styles.lineItemQtyPrice}>
                    <Text style={styles.lineItemQty}>
                      {t.common?.qty || 'Qty'}: {item.quantity}
                    </Text>
                    <Text style={styles.lineItemUnitPrice}>
                      @ ${item.unitPrice.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>{t.workOrder?.partsSubtotal || 'Parts Subtotal'}</Text>
                <Text style={styles.subtotalValue}>${workOrder.quote.partsCost.toFixed(2)}</Text>
              </View>
            </View>
          )}

          {/* Services/Labor Section */}
          {workOrder.quote.lineItems.filter(item => item.type === 'service').length > 0 && (
            <View style={styles.lineItemsSection}>
              <View style={styles.lineItemsSectionHeader}>
                <MaterialCommunityIcons name="wrench" size={16} color="#10b981" />
                <Text style={styles.lineItemsSectionTitle}>{t.workOrder?.labor || 'Labor'}</Text>
              </View>
              {workOrder.quote.lineItems.filter(item => item.type === 'service').map((item) => (
                <View key={item.id} style={styles.lineItemCard}>
                  <View style={styles.lineItemHeader}>
                    <Text style={styles.lineItemDescription}>{item.description}</Text>
                    <Text style={styles.lineItemTotal}>
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </Text>
                  </View>
                  {item.quantity > 1 && (
                    <View style={styles.lineItemQtyPrice}>
                      <Text style={styles.lineItemQty}>
                        {t.common?.qty || 'Qty'}: {item.quantity}
                      </Text>
                      <Text style={styles.lineItemUnitPrice}>
                        @ ${item.unitPrice.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>{t.workOrder?.laborSubtotal || 'Labor Subtotal'}</Text>
                <Text style={styles.subtotalValue}>${workOrder.quote.laborCost.toFixed(2)}</Text>
              </View>
            </View>
          )}

          <View style={styles.quoteDetails}>
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

      {/* Provider Cancel Modal */}
      <Modal
        visible={showCancelModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.businessRules?.cancellation?.cancelWorkOrder || 'Cancel Work Order'}</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <MaterialCommunityIcons name="alert" size={24} color="#f59e0b" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>{t.businessRules?.cancellation?.penaltyWarning || 'Penalty Warning'}</Text>
                <Text style={styles.warningText}>
                  {t.businessRules?.cancellation?.providerPenaltyMessage?.replace(
                    '{points}',
                    String(Math.abs(PROVIDER_POINTS_SYSTEM.NEGATIVE_ACTIONS.CANCEL_AFTER_ACCEPT))
                  ) || `Cancelling this work order will result in ${Math.abs(PROVIDER_POINTS_SYSTEM.NEGATIVE_ACTIONS.CANCEL_AFTER_ACCEPT)} penalty points.`}
                </Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>{t.businessRules?.cancellation?.reason || 'Reason for Cancellation'} *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder={t.businessRules?.cancellation?.reasonPlaceholder || 'Please explain why you need to cancel...'}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setShowCancelModal(false); setCancelReason(''); }}
              >
                <Text style={styles.cancelButtonText}>{t.common?.back || 'Back'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelConfirmButton, actionLoading && styles.confirmButtonDisabled]}
                onPress={handleProviderCancel}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>{t.businessRules?.cancellation?.confirmCancel || 'Confirm Cancel'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Additional Parts/Services Request Modal */}
      <Modal
        visible={showAdditionalPartsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAdditionalPartsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.provider?.requestAdditionalItems || 'Request Additional Items'}</Text>
              <TouchableOpacity onPress={() => setShowAdditionalPartsModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.infoBox}>
                <MaterialCommunityIcons name="information" size={18} color="#3b82f6" />
                <Text style={styles.infoBoxText}>
                  {t.provider?.additionalItemsInfo || 'Use this to request approval for additional parts or services discovered during work. The customer will be notified and must approve before proceeding.'}
                </Text>
              </View>

              <Text style={styles.inputLabel}>{t.provider?.reasonForItems || 'Reason for Additional Items'} *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={additionalPartsReason}
                onChangeText={setAdditionalPartsReason}
                placeholder={t.provider?.reasonPlaceholder || 'Explain why these items are needed...'}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>{t.provider?.itemsToAdd || 'Items to Add'}</Text>
              
              {additionalItems.map((item, index) => (
                <View key={index} style={styles.additionalItemContainer}>
                  {/* Type Selector */}
                  <View style={styles.typeSelector}>
                    <TouchableOpacity 
                      style={[styles.typeBtn, item.type === 'part' && styles.typeBtnActive]}
                      onPress={() => {
                        const newItems = [...additionalItems];
                        newItems[index].type = 'part';
                        setAdditionalItems(newItems);
                      }}
                    >
                      <MaterialCommunityIcons name="cog" size={16} color={item.type === 'part' ? '#fff' : '#6b7280'} />
                      <Text style={[styles.typeBtnText, item.type === 'part' && styles.typeBtnTextActive]}>
                        {t.provider?.part || 'Part'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.typeBtn, item.type === 'service' && styles.typeBtnActive]}
                      onPress={() => {
                        const newItems = [...additionalItems];
                        newItems[index].type = 'service';
                        setAdditionalItems(newItems);
                      }}
                    >
                      <MaterialCommunityIcons name="wrench" size={16} color={item.type === 'service' ? '#fff' : '#6b7280'} />
                      <Text style={[styles.typeBtnText, item.type === 'service' && styles.typeBtnTextActive]}>
                        {t.provider?.service || 'Service'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.partInputRow}>
                    <View style={styles.partInputCol}>
                      <TextInput
                        style={styles.partInput}
                        value={item.description}
                        onChangeText={(text) => {
                          const newItems = [...additionalItems];
                          newItems[index].description = text;
                          setAdditionalItems(newItems);
                        }}
                        placeholder={item.type === 'part' ? (t.provider?.partDescription || 'Part description') : (t.provider?.serviceDescription || 'Service description')}
                      />
                    </View>
                    <View style={styles.partInputSmall}>
                      <TextInput
                        style={styles.partInput}
                        value={item.quantity}
                        onChangeText={(text) => {
                          const newItems = [...additionalItems];
                          newItems[index].quantity = text;
                          setAdditionalItems(newItems);
                        }}
                        placeholder="Qty"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.partInputSmall}>
                      <TextInput
                        style={styles.partInput}
                        value={item.unitPrice}
                        onChangeText={(text) => {
                          const newItems = [...additionalItems];
                          newItems[index].unitPrice = text;
                          setAdditionalItems(newItems);
                        }}
                        placeholder="$"
                        keyboardType="decimal-pad"
                      />
                    </View>
                    {additionalItems.length > 1 && (
                      <TouchableOpacity 
                        style={styles.removePartBtn}
                        onPress={() => {
                          const newItems = additionalItems.filter((_, i) => i !== index);
                          setAdditionalItems(newItems);
                        }}
                      >
                        <MaterialCommunityIcons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              <TouchableOpacity 
                style={styles.addPartBtn}
                onPress={() => setAdditionalItems([...additionalItems, { type: 'part', description: '', quantity: '1', unitPrice: '' }])}
              >
                <MaterialCommunityIcons name="plus-circle" size={20} color="#1976d2" />
                <Text style={styles.addPartBtnText}>{t.provider?.addAnotherItem || 'Add Another Item'}</Text>
              </TouchableOpacity>

              {/* Total calculation */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t.provider?.additionalTotal || 'Additional Total'}:</Text>
                <Text style={styles.totalValue}>
                  ${additionalItems.reduce((sum, item) => {
                    const qty = parseFloat(item.quantity) || 0;
                    const price = parseFloat(item.unitPrice) || 0;
                    return sum + (qty * price);
                  }, 0).toFixed(2)}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAdditionalPartsModal(false);
                  setAdditionalPartsReason('');
                  setAdditionalItems([{ type: 'part', description: '', quantity: '1', unitPrice: '' }]);
                }}
              >
                <Text style={styles.cancelButtonText}>{t.common?.cancel || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.additionalPartsConfirmBtn, actionLoading && styles.confirmButtonDisabled]}
                onPress={async () => {
                  if (!additionalPartsReason.trim()) {
                    Alert.alert(t.common?.error || 'Error', t.provider?.enterReason || 'Please enter a reason for the additional items');
                    return;
                  }
                  const validItems = additionalItems.filter(p => p.description.trim() && parseFloat(p.unitPrice) > 0);
                  if (validItems.length === 0) {
                    Alert.alert(t.common?.error || 'Error', t.provider?.addAtLeastOneItem || 'Please add at least one item with description and price');
                    return;
                  }
                  setActionLoading(true);
                  try {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    setShowAdditionalPartsModal(false);
                    setAdditionalPartsReason('');
                    setAdditionalItems([{ type: 'part', description: '', quantity: '1', unitPrice: '' }]);
                    Alert.alert(
                      t.common?.success || 'Success',
                      t.provider?.additionalItemsRequested || 'Additional items request sent to customer for approval.'
                    );
                  } catch (error) {
                    Alert.alert(t.common?.error || 'Error', t.common?.tryAgain || 'Please try again');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>{t.provider?.sendRequest || 'Send Request'}</Text>
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
  additionalPartsButton: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  additionalPartsButtonText: {
    color: '#b45309',
  },
  providerCancelButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  providerCancelButtonText: {
    color: '#dc2626',
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
  lineItemsSection: {
    marginBottom: 16,
  },
  lineItemsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lineItemsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  lineItemCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  lineItemDescription: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginRight: 12,
  },
  lineItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },
  lineItemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  lineItemBrand: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lineItemCode: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  lineItemQtyPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  lineItemQty: {
    fontSize: 12,
    color: '#6b7280',
  },
  lineItemUnitPrice: {
    fontSize: 12,
    color: '#9ca3af',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  subtotalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  subtotalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
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
  cancelConfirmButton: {
    backgroundColor: '#dc2626',
  },
  additionalPartsConfirmBtn: {
    backgroundColor: '#f59e0b',
  },
  additionalItemContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeBtnActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  partInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partInputCol: {
    flex: 3,
  },
  partInputSmall: {
    flex: 1,
  },
  partInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  removePartBtn: {
    padding: 4,
  },
  addPartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  addPartBtnText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f59e0b',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#b45309',
    lineHeight: 18,
  },
  customerContactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 10,
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1976d2',
  },
  chatBtn: {
    backgroundColor: '#dcfce7',
  },
  messageChatBtn: {
    backgroundColor: '#eff6ff',
  },
});
