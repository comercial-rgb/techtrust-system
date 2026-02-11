/**
 * WorkOrderDetailsScreen - Work Order Details
 * Fetches data from API
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../i18n';
import { CANCELLATION_RULES, DISPUTE_RULES } from '../config/businessRules';
import * as serviceFlowService from '../services/service-flow.service';

export default function WorkOrderDetailsScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const { workOrderId } = route.params || { workOrderId: '1' };
  const [loading, setLoading] = useState(true);
  const [workOrder, setWorkOrder] = useState<any>(null);
  
  // Cancel/Dispute state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Reload details when screen gains focus or workOrderId changes
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadDetails();
    }, [workOrderId])
  );

  async function loadDetails() {
    try {
      // Fetch work order details from API
      const { getWorkOrderDetails } = await import('../services/dashboard.service');
      const data = await getWorkOrderDetails(workOrderId);
      
      if (data) {
        setWorkOrder(data);
      } else {
        // Work order not found
        setWorkOrder(null);
      }
    } catch (error) {
      console.error('Error loading work order details:', error);
      setWorkOrder(null);
    } finally {
      setLoading(false);
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING_START': return { label: t.workOrder?.awaitingStart || 'Awaiting Start', color: '#f59e0b', bgColor: '#fef3c7' };
      case 'PAYMENT_HOLD': return { label: t.workOrder?.paymentHold || 'Payment Hold', color: '#8b5cf6', bgColor: '#ede9fe' };
      case 'IN_PROGRESS': return { label: t.workOrder?.inProgress || 'In Progress', color: '#3b82f6', bgColor: '#dbeafe' };
      case 'AWAITING_APPROVAL': return { label: t.workOrder?.awaitingApproval || 'Awaiting Approval', color: '#8b5cf6', bgColor: '#ede9fe' };
      case 'AWAITING_PAYMENT': return { label: t.workOrder?.awaitingPayment || 'Awaiting Payment', color: '#8b5cf6', bgColor: '#ede9fe' };
      case 'COMPLETED': return { label: t.workOrder?.completed || 'Completed', color: '#10b981', bgColor: '#d1fae5' };
      case 'CANCELLED': return { label: t.workOrder?.cancelled || 'Cancelled', color: '#ef4444', bgColor: '#fee2e2' };
      case 'DISPUTED': return { label: t.workOrder?.disputed || 'Disputed', color: '#f97316', bgColor: '#fed7aa' };
      default: return { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
    }
  };

  // Check if cancellation is allowed
  const canCancel = useMemo(() => {
    if (!workOrder) return false;
    // Can't cancel if already completed, awaiting payment, cancelled or disputed
    if (['COMPLETED', 'AWAITING_PAYMENT', 'CANCELLED', 'DISPUTED'].includes(workOrder.status)) return false;
    // Can't cancel if service already started (business rule)
    if (workOrder.status === 'IN_PROGRESS' && !CANCELLATION_RULES.ALLOW_CANCEL_AFTER_START) return false;
    return true;
  }, [workOrder]);

  // Calculate cancellation fee based on time until scheduled date
  const cancellationInfo = useMemo(() => {
    if (!workOrder) return { feePercent: 0, feeAmount: 0, reason: '' };
    
    const now = new Date();
    const scheduledDate = new Date(workOrder.scheduledDate);
    const hoursUntilScheduled = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    let feePercent = 0;
    let reason = '';
    
    if (hoursUntilScheduled > CANCELLATION_RULES.REDUCED_FEE_HOURS_THRESHOLD) {
      feePercent = CANCELLATION_RULES.AFTER_ACCEPT_24H_PLUS_FEE_PERCENT;
      reason = t.businessRules?.cancellation?.moreThan24h || `Mais de ${CANCELLATION_RULES.REDUCED_FEE_HOURS_THRESHOLD}h antes do agendamento`;
    } else {
      feePercent = CANCELLATION_RULES.LESS_THAN_24H_FEE_PERCENT;
      reason = t.businessRules?.cancellation?.lessThan24h || `Menos de ${CANCELLATION_RULES.REDUCED_FEE_HOURS_THRESHOLD}h antes do agendamento`;
    }
    
    const feeAmount = (workOrder.finalAmount * feePercent) / 100;
    
    return { feePercent, feeAmount, reason };
  }, [workOrder, t]);

  // Check if dispute is allowed (within 48h of completion)
  const canDispute = useMemo(() => {
    if (!workOrder) return false;
    if (workOrder.status !== 'COMPLETED') return false;
    if (!workOrder.completedAt) return false;
    
    const now = new Date();
    const completedAt = new Date(workOrder.completedAt);
    const hoursSinceCompletion = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceCompletion <= DISPUTE_RULES.DISPUTE_WINDOW_HOURS;
  }, [workOrder]);

  // Time remaining for dispute
  const disputeTimeRemaining = useMemo(() => {
    if (!workOrder?.completedAt) return null;
    
    const now = new Date();
    const completedAt = new Date(workOrder.completedAt);
    const hoursRemaining = DISPUTE_RULES.DISPUTE_WINDOW_HOURS - ((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60));
    
    if (hoursRemaining <= 0) return null;
    return Math.ceil(hoursRemaining);
  }, [workOrder]);

  // Handle cancellation
  const handleCancel = async () => {
    setProcessingAction(true);
    try {
      await serviceFlowService.requestCancellation(workOrderId, 'Customer requested cancellation');
      
      setShowCancelModal(false);
      Alert.alert(
        t.common?.success || 'Success',
        t.businessRules?.cancellation?.cancelledSuccessfully || 'Service cancelled successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      const msg = error.response?.data?.message || t.common?.tryAgain || 'Try again';
      Alert.alert(t.common?.error || 'Error', msg);
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle dispute submission
  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      Alert.alert(t.common?.error || 'Error', t.businessRules?.dispute?.enterReason || 'Please describe the reason for the dispute');
      return;
    }
    
    setProcessingAction(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setShowDisputeModal(false);
      setDisputeReason('');
      Alert.alert(
        t.common?.success || 'Success',
        t.businessRules?.dispute?.submittedSuccessfully || 'Dispute submitted. Please wait for our analysis.',
        [{ text: 'OK', onPress: () => loadDetails() }]
      );
    } catch (error) {
      Alert.alert(t.common?.error || 'Error', t.common?.tryAgain || 'Try again');
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><View style={styles.loading}><Text>{t.common?.loading || 'Loading...'}</Text></View></SafeAreaView>;
  }

  const statusInfo = getStatusInfo(workOrder?.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.workOrder?.serviceDetails || 'Service Details'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Ionicons name="construct" size={20} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
          <Text style={styles.orderNumber}>#{workOrder?.orderNumber}</Text>
        </View>

        {/* Pending Additional Parts Alert */}
        {workOrder?.pendingAdditionalParts && workOrder.pendingAdditionalParts.status === 'pending' && (
          <View style={styles.additionalPartsAlert}>
            <View style={styles.alertHeader}>
              <View style={styles.alertIconContainer}>
                <Ionicons name="alert-circle" size={24} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{t.workOrder?.additionalPartsRequested || 'Additional Parts Requested'}</Text>
                <Text style={styles.alertSubtitle}>{t.workOrder?.providerNeedsApproval || 'The provider needs your approval for additional parts'}</Text>
              </View>
            </View>
            
            <View style={styles.alertReasonBox}>
              <Text style={styles.alertReasonLabel}>{t.workOrder?.reasonForRequest || 'Reason:'}</Text>
              <Text style={styles.alertReasonText}>{workOrder.pendingAdditionalParts.reason}</Text>
            </View>
            
            <View style={styles.alertPartsList}>
              {workOrder.pendingAdditionalParts.parts.map((part: any, index: number) => (
                <View key={index} style={styles.alertPartRow}>
                  <Text style={styles.alertPartName}>{part.description}</Text>
                  <Text style={styles.alertPartQty}>x{part.quantity}</Text>
                  <Text style={styles.alertPartPrice}>${(part.quantity * part.unitPrice).toFixed(2)}</Text>
                </View>
              ))}
              <View style={styles.alertTotalRow}>
                <Text style={styles.alertTotalLabel}>{t.common?.total || 'Total'}:</Text>
                <Text style={styles.alertTotalValue}>${workOrder.pendingAdditionalParts.totalAmount.toFixed(2)}</Text>
              </View>
            </View>
            
            <View style={styles.alertActions}>
              <TouchableOpacity 
                style={styles.alertDeclineBtn}
                onPress={() => Alert.alert(
                  t.workOrder?.declinePartsTitle || 'Decline Parts',
                  t.workOrder?.declinePartsMessage || 'Are you sure you want to decline these additional parts?',
                  [
                    { text: t.common?.cancel || 'Cancel', style: 'cancel' },
                    { text: t.common?.confirm || 'Confirm', style: 'destructive', onPress: () => {
                      setWorkOrder((prev: any) => ({ ...prev, pendingAdditionalParts: null }));
                      Alert.alert(t.common?.success || 'Success', t.workOrder?.partsDeclined || 'Additional parts declined');
                    }}
                  ]
                )}
              >
                <Ionicons name="close" size={18} color="#ef4444" />
                <Text style={styles.alertDeclineText}>{t.common?.decline || 'Decline'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.alertApproveBtn}
                onPress={() => Alert.alert(
                  t.workOrder?.approvePartsTitle || 'Approve Parts',
                  t.workOrder?.approvePartsMessage || `Approve additional parts for $${workOrder.pendingAdditionalParts.totalAmount.toFixed(2)}?`,
                  [
                    { text: t.common?.cancel || 'Cancel', style: 'cancel' },
                    { text: t.common?.approve || 'Approve', onPress: () => {
                      setWorkOrder((prev: any) => ({ 
                        ...prev, 
                        pendingAdditionalParts: null,
                        finalAmount: prev.finalAmount + workOrder.pendingAdditionalParts.totalAmount
                      }));
                      Alert.alert(t.common?.success || 'Success', t.workOrder?.partsApproved || 'Additional parts approved! The total has been updated.');
                    }}
                  ]
                )}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.alertApproveText}>{t.common?.approve || 'Approve'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Service Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.workOrder?.service || 'Service'}</Text>
          <Text style={styles.serviceTitle}>{workOrder?.title}</Text>
          <Text style={styles.serviceDescription}>{workOrder?.description}</Text>
        </View>

        {/* Provider Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.workOrder?.provider || 'Fornecedor'}</Text>
          <View style={styles.providerRow}>
            <View style={styles.providerAvatar}><Ionicons name="business" size={24} color="#1976d2" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.providerName}>{workOrder?.provider.businessName}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#fbbf24" />
                <Text style={styles.ratingText}>{workOrder?.provider.rating}</Text>
              </View>
            </View>
          </View>
          <View style={styles.providerDetails}>
            <View style={styles.providerDetailRow}>
              <Ionicons name="call" size={16} color="#6b7280" />
              <Text style={styles.providerDetailText}>{workOrder?.provider.phone}</Text>
            </View>
            <View style={styles.providerDetailRow}>
              <Ionicons name="location" size={16} color="#6b7280" />
              <Text style={styles.providerDetailText}>{workOrder?.provider.address}</Text>
            </View>
          </View>
          <View style={styles.providerActions}>
            <TouchableOpacity style={styles.callBtn}><Ionicons name="call" size={18} color="#1976d2" /><Text style={styles.callText}>{t.common?.call || 'Call'}</Text></TouchableOpacity>
            <TouchableOpacity 
              style={styles.internalChatBtn}
              onPress={() => navigation.navigate('Messages', { 
                screen: 'Chat', 
                params: { 
                  recipientId: workOrder?.provider?.id || 'provider-1',
                  recipientName: workOrder?.provider?.businessName,
                  recipientType: 'provider',
                  workOrderId: workOrder?.id
                }
              })}
            >
              <Ionicons name="chatbubbles" size={18} color="#1976d2" />
              <Text style={styles.internalChatText}>{t.nav?.chat || 'Chat'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chatBtn}><Ionicons name="logo-whatsapp" size={18} color="#25D366" /><Text style={styles.chatText}>WhatsApp</Text></TouchableOpacity>
          </View>
        </View>

        {/* Vehicle Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.workOrder?.vehicle || 'Vehicle'}</Text>
          <View style={styles.vehicleRow}>
            <Ionicons name="car" size={20} color="#6b7280" />
            <Text style={styles.vehicleText}>{workOrder?.vehicle.make} {workOrder?.vehicle.model} {workOrder?.vehicle.year}</Text>
          </View>
          <Text style={styles.plateText}>{t.vehicle?.plate || 'Placa'}: {workOrder?.vehicle.plateNumber}</Text>
        </View>

        {/* Price Info - Detailed Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.workOrder?.quoteDetails || 'Quote Details'}</Text>
          
          {/* Parts Section */}
          <Text style={styles.sectionSubtitle}>{t.workOrder?.parts || 'Parts'}</Text>
          {workOrder?.lineItems?.filter((item: any) => item.type === 'part').map((item: any) => (
            <View key={item.id} style={styles.lineItemRow}>
              <View style={styles.lineItemInfo}>
                <Text style={styles.lineItemDesc}>{item.description}</Text>
                <Text style={styles.lineItemQty}>{t.common?.qty || 'Qtd'}: {item.quantity}</Text>
              </View>
              <Text style={styles.lineItemPrice}>${(item.quantity * item.unitPrice).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>{t.workOrder?.partsSubtotal || 'Parts Subtotal'}</Text>
            <Text style={styles.subtotalValue}>${workOrder?.partsCost}</Text>
          </View>

          {/* Labor Section */}
          <Text style={styles.sectionSubtitle}>{t.workOrder?.labor || 'Labor'}</Text>
          {workOrder?.lineItems?.filter((item: any) => item.type === 'labor').map((item: any) => (
            <View key={item.id} style={styles.lineItemRow}>
              <View style={styles.lineItemInfo}>
                <Text style={styles.lineItemDesc}>{item.description}</Text>
                <Text style={styles.lineItemQty}>{t.common?.qty || 'Qty'}: {item.quantity}</Text>
              </View>
              <Text style={styles.lineItemPrice}>${(item.quantity * item.unitPrice).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>{t.workOrder?.laborSubtotal || 'Labor Subtotal'}</Text>
            <Text style={styles.subtotalValue}>${workOrder?.laborCost}</Text>
          </View>

          {/* Estimated Time */}
          <View style={styles.estimatedTimeRow}>
            <Ionicons name="time-outline" size={16} color="#6b7280" />
            <Text style={styles.estimatedTimeText}>{t.workOrder?.estimatedTime || 'Estimated time'}: {workOrder?.estimatedTime}</Text>
          </View>

          {/* Total */}
          <View style={[styles.priceRow, styles.totalRow]}><Text style={styles.totalLabel}>{t.common?.total || 'Total'}</Text><Text style={styles.totalValue}>${workOrder?.finalAmount}</Text></View>
        </View>

        {/* Warranty Info */}
        {workOrder?.warranty && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.workOrder?.warranty || 'Warranty'}</Text>
            <View style={styles.warrantyContainer}>
              <View style={styles.warrantyItem}>
                <Ionicons name="cube-outline" size={20} color="#f59e0b" />
                <Text style={styles.warrantyLabel}>{t.workOrder?.parts || 'Parts'}</Text>
                <Text style={styles.warrantyValue}>{workOrder.warranty.partsWarrantyMonths} {t.common?.months || 'months'}</Text>
              </View>
              <View style={styles.warrantyItem}>
                <Ionicons name="construct-outline" size={20} color="#f59e0b" />
                <Text style={styles.warrantyLabel}>{t.workOrder?.service || 'Service'}</Text>
                <Text style={styles.warrantyValue}>{workOrder.warranty.serviceWarrantyDays} {t.common?.days || 'days'}</Text>
              </View>
            </View>
            {workOrder.warranty.terms && (
              <Text style={styles.warrantyTerms}>{workOrder.warranty.terms}</Text>
            )}
          </View>
        )}

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.workOrder?.history || 'History'}</Text>
          {workOrder?.timeline.map((item: any, idx: number) => (
            <View key={idx} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>{item.label}</Text>
                <Text style={styles.timelineDate}>{new Date(item.date).toLocaleDateString('en-US')}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Button - Navigate to Service Approval */}
        {(workOrder?.status === 'AWAITING_APPROVAL' || workOrder?.status === 'AWAITING_PAYMENT') && (
          <View style={styles.confirmServiceContainer}>
            <View style={styles.paymentHeldInfo}>
              <Ionicons name="shield-checkmark" size={24} color="#10b981" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.paymentHeldTitle}>{t.workOrder?.paymentHeld || 'Payment Held'}</Text>
                <Text style={styles.paymentHeldAmount}>${workOrder?.finalAmount?.toFixed(2)}</Text>
                <Text style={styles.paymentHeldNote}>
                  {t.workOrder?.serviceCompletedByProvider || 'The provider has completed the service. Please review and approve.'}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.confirmServiceBtn} 
              onPress={() => {
                navigation.navigate('ServiceApproval', { workOrderId: workOrder.id });
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.confirmServiceText}>{t.workOrder?.reviewAndApprove || 'Review & Approve Service'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.reportIssueBtn} 
              onPress={() => setShowDisputeModal(true)}
            >
              <Ionicons name="warning" size={18} color="#f59e0b" />
              <Text style={styles.reportIssueText}>{t.workOrder?.reportIssue || 'Report an Issue'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cancel Button */}
        {canCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCancelModal(true)}>
            <Ionicons name="close-circle" size={20} color="#dc2626" />
            <Text style={styles.cancelBtnText}>{t.businessRules?.cancellation?.cancelService || 'Cancel Service'}</Text>
          </TouchableOpacity>
        )}

        {/* Dispute Button */}
        {canDispute && (
          <View style={styles.disputeContainer}>
            <TouchableOpacity style={styles.disputeBtn} onPress={() => setShowDisputeModal(true)}>
              <Ionicons name="alert-circle" size={20} color="#ea580c" />
              <Text style={styles.disputeBtnText}>{t.businessRules?.dispute?.openDispute || 'Open Dispute'}</Text>
            </TouchableOpacity>
            {disputeTimeRemaining && (
              <Text style={styles.disputeTimeText}>
                {t.businessRules?.dispute?.timeRemaining?.replace('{hours}', String(disputeTimeRemaining)) || `${disputeTimeRemaining}h remaining`}
              </Text>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={40} color="#f59e0b" />
              <Text style={styles.modalTitle}>{t.businessRules?.cancellation?.confirmTitle || 'Confirm Cancellation'}</Text>
            </View>
            
            <Text style={styles.modalDescription}>
              {t.businessRules?.cancellation?.confirmMessage || 'Are you sure you want to cancel this service?'}
            </Text>
            
            <View style={styles.feeInfo}>
              <Text style={styles.feeLabel}>{t.businessRules?.cancellation?.cancellationFee || 'Cancellation fee'}:</Text>
              <Text style={styles.feeReason}>{cancellationInfo.reason}</Text>
              <View style={styles.feeRow}>
                <Text style={styles.feePercent}>{cancellationInfo.feePercent}%</Text>
                <Text style={styles.feeAmount}>${cancellationInfo.feeAmount.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setShowCancelModal(false)}
                disabled={processingAction}
              >
                <Text style={styles.modalCancelText}>{t.common?.back || 'Back'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalConfirmBtn, processingAction && styles.btnDisabled]} 
                onPress={handleCancel}
                disabled={processingAction}
              >
                {processingAction ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>{t.common?.confirm || 'Confirm'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dispute Modal */}
      <Modal visible={showDisputeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="document-text" size={40} color="#f97316" />
              <Text style={styles.modalTitle}>{t.businessRules?.dispute?.title || 'Open Dispute'}</Text>
            </View>
            
            <Text style={styles.modalDescription}>
              {t.businessRules?.dispute?.description || 'Describe the problem with the service provided. Our team will analyze and respond within 5 business days.'}
            </Text>
            
            <TextInput
              style={styles.disputeInput}
              placeholder={t.businessRules?.dispute?.reasonPlaceholder || 'Describe the reason for the dispute...'}
              value={disputeReason}
              onChangeText={setDisputeReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.disputeInfo}>
              <Ionicons name="information-circle" size={16} color="#6b7280" />
              <Text style={styles.disputeInfoText}>
                {t.businessRules?.dispute?.providerResponseInfo?.replace('{hours}', String(DISPUTE_RULES.PROVIDER_RESPONSE_HOURS)) || 
                  `The provider will have ${DISPUTE_RULES.PROVIDER_RESPONSE_HOURS}h to respond`}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => { setShowDisputeModal(false); setDisputeReason(''); }}
                disabled={processingAction}
              >
                <Text style={styles.modalCancelText}>{t.common?.cancel || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalConfirmBtn, styles.disputeConfirmBtn, processingAction && styles.btnDisabled]} 
                onPress={handleDispute}
                disabled={processingAction}
              >
                {processingAction ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>{t.businessRules?.dispute?.submit || 'Submit Dispute'}</Text>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  statusCard: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 16, alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  statusText: { fontSize: 14, fontWeight: '600' },
  orderNumber: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 16 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 12, textTransform: 'uppercase' },
  serviceTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  serviceDescription: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  providerAvatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  providerName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 13, color: '#6b7280' },
  providerDetails: { marginBottom: 12 },
  providerDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  providerDetailText: { fontSize: 14, color: '#374151' },
  providerActions: { flexDirection: 'row', gap: 8 },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#dbeafe', paddingVertical: 10, borderRadius: 10 },
  callText: { fontSize: 13, fontWeight: '600', color: '#1976d2' },
  internalChatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#e0e7ff', paddingVertical: 10, borderRadius: 10 },
  internalChatText: { fontSize: 13, fontWeight: '600', color: '#4f46e5' },
  chatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#dcfce7', paddingVertical: 10, borderRadius: 10 },
  chatText: { fontSize: 13, fontWeight: '600', color: '#16a34a' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  vehicleText: { fontSize: 16, fontWeight: '500', color: '#111827' },
  plateText: { fontSize: 14, color: '#6b7280' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: '#6b7280' },
  priceValue: { fontSize: 14, color: '#374151', fontWeight: '500' },
  totalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', marginBottom: 0 },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#1976d2' },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1976d2', marginRight: 12, marginTop: 4 },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: 14, fontWeight: '500', color: '#111827' },
  timelineDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#8b5cf6', marginHorizontal: 16, paddingVertical: 16, borderRadius: 12 },
  payText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  
  // Confirm Service Completion
  confirmServiceContainer: { marginHorizontal: 16, marginBottom: 16 },
  paymentHeldInfo: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  paymentHeldTitle: { fontSize: 14, fontWeight: '600', color: '#166534' },
  paymentHeldAmount: { fontSize: 24, fontWeight: '700', color: '#15803d', marginVertical: 4 },
  paymentHeldNote: { fontSize: 12, color: '#166534', lineHeight: 18 },
  confirmServiceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12, marginBottom: 8 },
  confirmServiceText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  reportIssueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  reportIssueText: { fontSize: 14, fontWeight: '500', color: '#f59e0b' },
  
  // Cancel Button
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fef2f2', marginHorizontal: 16, marginTop: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#dc2626' },
  
  // Dispute Button
  disputeContainer: { marginHorizontal: 16, marginTop: 12 },
  disputeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff7ed', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#fed7aa' },
  disputeBtnText: { fontSize: 15, fontWeight: '600', color: '#ea580c' },
  disputeTimeText: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 6 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 },
  modalHeader: { alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 12, textAlign: 'center' },
  modalDescription: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  
  // Fee Info
  feeInfo: { backgroundColor: '#fef3c7', borderRadius: 12, padding: 16, marginBottom: 20 },
  feeLabel: { fontSize: 13, fontWeight: '600', color: '#92400e', marginBottom: 4 },
  feeReason: { fontSize: 12, color: '#b45309', marginBottom: 8 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feePercent: { fontSize: 24, fontWeight: '700', color: '#b45309' },
  feeAmount: { fontSize: 20, fontWeight: '600', color: '#92400e' },
  
  // Modal Actions
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, backgroundColor: '#f3f4f6', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  modalConfirmBtn: { flex: 1, backgroundColor: '#dc2626', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalConfirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  disputeConfirmBtn: { backgroundColor: '#f97316' },
  btnDisabled: { opacity: 0.6 },
  
  // Dispute Input
  disputeInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 14, color: '#111827', minHeight: 100, marginBottom: 12 },
  disputeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3f4f6', padding: 10, borderRadius: 8, marginBottom: 20 },
  disputeInfoText: { fontSize: 12, color: '#6b7280', flex: 1 },
  
  // Detailed Quote Styles
  sectionSubtitle: { fontSize: 13, fontWeight: '600', color: '#1976d2', marginTop: 12, marginBottom: 8, textTransform: 'uppercase' },
  lineItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  lineItemInfo: { flex: 1, marginRight: 12 },
  lineItemDesc: { fontSize: 14, color: '#374151', marginBottom: 2 },
  lineItemQty: { fontSize: 12, color: '#9ca3af' },
  lineItemPrice: { fontSize: 14, fontWeight: '600', color: '#374151' },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, backgroundColor: '#f8fafc', marginTop: 8, paddingHorizontal: 8, borderRadius: 8 },
  subtotalLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  subtotalValue: { fontSize: 14, fontWeight: '700', color: '#374151' },
  estimatedTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  estimatedTimeText: { fontSize: 14, color: '#6b7280' },
  
  // Warranty Styles  
  warrantyContainer: { flexDirection: 'row', gap: 16 },
  warrantyItem: { flex: 1, alignItems: 'center', backgroundColor: '#fef3c7', padding: 12, borderRadius: 12 },
  warrantyLabel: { fontSize: 12, color: '#92400e', marginTop: 6 },
  warrantyValue: { fontSize: 16, fontWeight: '700', color: '#92400e', marginTop: 2 },
  warrantyTerms: { fontSize: 12, color: '#6b7280', marginTop: 12, fontStyle: 'italic' },
  
  // Additional Parts Alert Styles
  additionalPartsAlert: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#fbbf24' },
  alertHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  alertIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  alertTitle: { fontSize: 16, fontWeight: '700', color: '#92400e' },
  alertSubtitle: { fontSize: 13, color: '#b45309', marginTop: 2 },
  alertReasonBox: { backgroundColor: '#fefce8', padding: 12, borderRadius: 10, marginBottom: 12 },
  alertReasonLabel: { fontSize: 12, fontWeight: '600', color: '#854d0e', marginBottom: 4 },
  alertReasonText: { fontSize: 14, color: '#713f12', lineHeight: 20 },
  alertPartsList: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12 },
  alertPartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  alertPartName: { flex: 1, fontSize: 14, color: '#374151' },
  alertPartQty: { fontSize: 13, color: '#6b7280', marginRight: 12 },
  alertPartPrice: { fontSize: 14, fontWeight: '600', color: '#374151', minWidth: 60, textAlign: 'right' },
  alertTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 6 },
  alertTotalLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  alertTotalValue: { fontSize: 18, fontWeight: '700', color: '#f59e0b' },
  alertActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  alertDeclineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fef2f2', paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca' },
  alertDeclineText: { fontSize: 15, fontWeight: '600', color: '#dc2626' },
  alertApproveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 10 },
  alertApproveText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
