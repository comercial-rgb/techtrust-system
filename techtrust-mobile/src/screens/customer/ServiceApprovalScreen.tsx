/**
 * ============================================
 * SERVICE APPROVAL SCREEN
 * ============================================
 * Tela onde o cliente:
 * 1. Visualiza detalhes do serviço concluído e fotos
 * 2. Aceita os Termos de Serviço
 * 3. Aceita o Fraud Disclaimer (não ligar para banco alegando fraude)
 * 4. Assina digitalmente (nome completo)
 * 5. Aprova → captura pagamento → gera recibo
 *
 * Também mostra:
 * - Comparação de processadores (Stripe vs Chase)
 * - Breakdown de valores e suplementos
 * - Fotos before/during/after
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  Switch,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';
import serviceFlowService, {
  ApprovedQuoteDetails,
  ProcessorComparison,
  ReceiptData,
} from '../../services/service-flow.service';

interface ServiceApprovalScreenProps {
  navigation: any;
  route: {
    params: {
      workOrderId: string;
    };
  };
}

function ServiceApprovalScreen({ navigation, route }: ServiceApprovalScreenProps) {
  const { workOrderId } = route.params;
  const { t, language, formatDate, formatTime, formatCurrency } = useI18n();
  const localeLong = useMemo(
    () => (language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US'),
    [language],
  );

  const sa = t.serviceApproval;

  const workOrderStatusLabel = (status: string) => {
    const key = status.toUpperCase();
    const labels: Record<string, string | undefined> = {
      COMPLETED: sa?.woStatusCompleted,
      AWAITING_APPROVAL: sa?.woStatusAwaitingApproval,
      CANCELLED: sa?.woStatusCancelled,
      IN_PROGRESS: sa?.woStatusInProgress,
      SCHEDULED: sa?.woStatusScheduled,
      AWAITING_PAYMENT: sa?.woStatusAwaitingPayment,
      PENDING_PAYMENT: sa?.woStatusAwaitingPayment,
      PENDING: sa?.woStatusPending,
    };
    return labels[key] ?? status.replace(/_/g, ' ');
  };

  const supplementStatusLabel = (status: string) => {
    const u = status.toUpperCase();
    if (u === 'HOLD_PLACED') return sa?.suppStatusHoldPlaced ?? status.replace(/_/g, ' ');
    if (u === 'REJECTED') return sa?.suppStatusRejected ?? status.replace(/_/g, ' ');
    return sa?.suppStatusPending ?? status.replace(/_/g, ' ');
  };

  const photoPhaseWord = (type: string) => {
    switch (type.toLowerCase()) {
      case 'before':
        return sa?.photoPhaseBefore ?? 'Before';
      case 'during':
        return sa?.photoPhaseDuring ?? 'During';
      case 'after':
        return sa?.photoPhaseAfter ?? 'After';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const modalPhotosHeading = (phaseKey: string) =>
    (sa?.modalPhotosTitle ?? '{{phase}} photos').replace(
      /\{\{\s*phase\s*\}\}/gi,
      photoPhaseWord(phaseKey),
    );

  const formatProcessingTimeLabel = (time?: string | null) => {
    if (time == null || String(time).trim() === '') return sa?.processingInstant ?? 'Instant';
    const s = String(time).trim().toLowerCase();
    if (s === 'instant') return sa?.processingInstant ?? 'Instant';
    if (s.includes('1-2') || s.includes('1–2')) return sa?.processingOneTwoDays ?? '1–2 days';
    return String(time);
  };

  // States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [details, setDetails] = useState<ApprovedQuoteDetails | null>(null);
  const [processorComparison, setProcessorComparison] = useState<any>(null);

  // Terms acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fraudDisclaimerAccepted, setFraudDisclaimerAccepted] = useState(false);
  const [signatureName, setSignatureName] = useState('');

  // Photo viewer
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);
  const [selectedPhotoType, setSelectedPhotoType] = useState('');

  // Receipt
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // ============================================
  // LOAD DATA
  // ============================================

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      const result = await serviceFlowService.getApprovedQuoteDetails(workOrderId);
      setDetails(result.data);

      // Comparar processadores
      if (result.data.financials.originalAmount > 0) {
        try {
          const comparison = await serviceFlowService.compareProcessors({
            amount: result.data.financials.finalAmount,
            cardType: 'credit',
          });
          setProcessorComparison(comparison.data);
        } catch (err) {
          // Non-critical, ignore
        }
      }
    } catch (error: any) {
      Alert.alert(
        t.common?.error || 'Error',
        error.response?.data?.message || t.serviceApproval?.loadFailed || 'Failed to load service details',
      );
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleApproveService = async () => {
    if (!termsAccepted) {
      Alert.alert(
        t.serviceApproval?.termsRequiredTitle || 'Terms Required',
        t.serviceApproval?.termsRequiredBody || 'You must accept the Terms of Service to proceed.',
      );
      return;
    }
    if (!fraudDisclaimerAccepted) {
      Alert.alert(
        t.serviceApproval?.fraudAckTitle || 'Acknowledgment Required',
        t.serviceApproval?.fraudAckBody || 'You must acknowledge the fraud disclaimer to proceed.',
      );
      return;
    }
    if (!signatureName.trim()) {
      Alert.alert(
        t.serviceApproval?.signatureRequiredTitle || 'Signature Required',
        t.serviceApproval?.signatureRequiredBody || 'Please enter your full name as a digital signature.',
      );
      return;
    }

    const amountStr = formatCurrency(details?.financials.totalAuthorized ?? 0);
    const confirmBody = (t.serviceApproval?.confirmPaymentBody || '')
      .replace(/\{\{\s*amount\s*\}\}/g, amountStr);

    Alert.alert(
      t.serviceApproval?.confirmPaymentTitle || 'Confirm Payment',
      confirmBody ||
        (sa?.confirmPaymentBodyDefault || '')
          .replace(/\{\{\s*amount\s*\}\}/g, amountStr),
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.serviceApproval?.confirmPay || 'Confirm & Pay',
          style: 'default',
          onPress: async () => {
            try {
              setSubmitting(true);
              const result = await serviceFlowService.approveServiceAndPay({
                workOrderId,
                termsAccepted: true,
                fraudDisclaimerAccepted: true,
                signatureName: signatureName.trim(),
              });

              if (result.success) {
                // Carregar recibo
                if (result.data.receipt) {
                  try {
                    const receiptResult = await serviceFlowService.getReceipt(
                      details?.payments[0]?.id || ''
                    );
                    setReceipt(receiptResult.data);
                  } catch (err) {
                    // Continue without receipt
                  }
                }

                const totalStr = formatCurrency(result.data.totalCharged);
                const receiptStr =
                  result.data.receipt?.receiptNumber ||
                  t.serviceApproval?.receiptGenerating ||
                  'Generating...';
                const successBody = (t.serviceApproval?.paymentSuccessBody || '')
                  .replace(/\{\{\s*total\s*\}\}/g, totalStr)
                  .replace(/\{\{\s*receipt\s*\}\}/g, receiptStr);

                Alert.alert(
                  t.serviceApproval?.paymentSuccessTitle || 'Payment Successful! ✓',
                  successBody ||
                    (sa?.paymentSuccessBodyDefault || '')
                      .replace(/\{\{\s*total\s*\}\}/g, totalStr)
                      .replace(/\{\{\s*receipt\s*\}\}/g, receiptStr),
                  [
                    {
                      text: t.serviceApproval?.viewReceipt || 'View Receipt',
                      onPress: () => setShowReceipt(true),
                    },
                    {
                      text: t.common?.done || 'Done',
                      onPress: () => navigation.goBack(),
                    },
                  ]
                );

                // Reload to show updated status
                loadDetails();
              }
            } catch (error: any) {
              Alert.alert(
                t.serviceApproval?.paymentErrorTitle || 'Payment Error',
                error.response?.data?.message ||
                  t.serviceApproval?.paymentErrorDefault ||
                  'Failed to process payment',
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const openPhotoViewer = (photos: any[], type: string) => {
    setSelectedPhotos(photos);
    setSelectedPhotoType(type);
    setPhotoModalVisible(true);
  };

  // ============================================
  // RENDERS
  // ============================================

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!details) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{sa?.unableToLoadDetails || sa?.loadFailed || 'Unable to load service details'}</Text>
      </SafeAreaView>
    );
  }

  const isCompleted = details.workOrder.status === 'COMPLETED';
  const isAwaitingApproval = details.workOrder.status === 'AWAITING_APPROVAL';
  const canApprove = isAwaitingApproval && !isCompleted;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{sa?.screenTitle || 'Service Approval'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ============================================ */}
        {/* IMPORTANT NOTICE - FRAUD DISCLAIMER */}
        {/* ============================================ */}
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={24} color="#DC2626" />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>{sa?.warningTitle || 'Important Notice'}</Text>
            <Text style={styles.warningText}>
              {sa?.warningBody ||
                'By approving this service and authorizing payment, you acknowledge that this is a legitimate transaction. Filing a false fraud claim with your bank or credit card company regarding this charge is a violation of federal law and may result in civil and criminal penalties, including fines and prosecution.'}
            </Text>
          </View>
        </View>

        {/* ============================================ */}
        {/* ORDER STATUS */}
        {/* ============================================ */}
        <View style={styles.section}>
          <View style={styles.statusBadge}>
            <Ionicons
              name={isCompleted ? 'checkmark-circle' : 'time'}
              size={20}
              color={isCompleted ? '#16A34A' : '#F59E0B'}
            />
            <Text style={[styles.statusText, { color: isCompleted ? '#16A34A' : '#F59E0B' }]}>
              {workOrderStatusLabel(details.workOrder.status)}
            </Text>
          </View>
          <Text style={styles.orderNumber}>
            {(sa?.orderNumber || 'Order #{{number}}').replace(
              /\{\{\s*number\s*\}\}/g,
              String(details.workOrder.orderNumber),
            )}
          </Text>
        </View>

        {/* ============================================ */}
        {/* SERVICE DETAILS */}
        {/* ============================================ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sa?.sectionServiceDetails || 'Service Details'}</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{sa?.labelService || 'Service'}</Text>
              <Text style={styles.detailValue}>{details.service.title}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{sa?.labelVehicle || 'Vehicle'}</Text>
              <Text style={styles.detailValue}>
                {details.vehicle.year} {details.vehicle.make} {details.vehicle.model}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{sa?.labelProvider || 'Provider'}</Text>
              <Text style={styles.detailValue}>
                {details.quote.provider?.providerProfile?.businessName || details.quote.provider?.fullName}
              </Text>
            </View>
            {details.quote.warranty.months && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{sa?.labelWarranty || 'Warranty'}</Text>
                <Text style={styles.detailValue}>
                  {(sa?.warrantyMonthsMiles || '{{months}} months / {{mileage}} miles')
                    .replace(/\{\{\s*months\s*\}\}/g, String(details.quote.warranty.months))
                    .replace(
                      /\{\{\s*mileage\s*\}\}/g,
                      details.quote.warranty.mileage != null
                        ? String(details.quote.warranty.mileage)
                        : (sa?.warrantyMilesNA ?? 'N/A'),
                    )}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ============================================ */}
        {/* SERVICE PHOTOS */}
        {/* ============================================ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sa?.sectionPhotos || 'Service Photos'}</Text>
          <View style={styles.photosRow}>
            {(['before', 'during', 'after'] as const).map((type) => {
              const photos = details.workOrder.photos[type] || [];
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.photoCategory, photos.length > 0 && styles.photoCategoryActive]}
                  onPress={() => photos.length > 0 && openPhotoViewer(photos, type)}
                  disabled={photos.length === 0}
                >
                  <Ionicons
                    name={type === 'before' ? 'camera' : type === 'during' ? 'construct' : 'checkmark-done'}
                    size={24}
                    color={photos.length > 0 ? '#2563eb' : '#9CA3AF'}
                  />
                  <Text style={[styles.photoCategoryLabel, photos.length > 0 && { color: '#2563eb' }]}>
                    {photoPhaseWord(type)}
                  </Text>
                  <Text style={styles.photoCount}>
                    {(sa?.photoCount || '{{count}} photos').replace(/\{\{\s*count\s*\}\}/g, String(photos.length))}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ============================================ */}
        {/* PAYMENT BREAKDOWN */}
        {/* ============================================ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sa?.sectionPaymentBreakdown || 'Payment Breakdown'}</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{sa?.labelServiceAmount || 'Service Amount'}</Text>
              <Text style={styles.detailValue}>{formatCurrency(details.financials.originalAmount)}</Text>
            </View>
            {details.financials.additionalAmount > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{sa?.labelAdditionalServices || 'Additional Services'}</Text>
                <Text style={styles.detailValue}>{formatCurrency(details.financials.additionalAmount)}</Text>
              </View>
            )}
            {details.quote.travelFee && Number(details.quote.travelFee) > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{sa?.labelTravelFee || 'Travel / Displacement Fee'}</Text>
                <Text style={styles.detailValue}>{formatCurrency(Number(details.quote.travelFee))}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{sa?.labelPlatformFee10 || 'Platform Fee (10%)'}</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(details.financials.finalAmount * 0.1)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{sa?.labelProcessingFee || 'Processing Fee'}</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(details.financials.finalAmount * 1.1 * 0.029 + 0.3)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, styles.totalLabel]}>{sa?.labelTotalOnHold || 'Total on Hold'}</Text>
              <Text style={[styles.detailValue, styles.totalValue]}>
                {formatCurrency(details.financials.totalAuthorized)}
              </Text>
            </View>

            {details.financials.holdActive && (
              <View style={styles.holdBadge}>
                <Ionicons name="lock-closed" size={14} color="#F59E0B" />
                <Text style={styles.holdText}>
                  {sa?.holdFundsMessage || 'Funds are on hold — will be charged upon approval'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ============================================ */}
        {/* SUPPLEMENTS */}
        {/* ============================================ */}
        {details.supplements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{sa?.sectionAdditionalWork || 'Additional Work'}</Text>
            {details.supplements.map((s: any) => (
              <View key={s.id} style={styles.supplementCard}>
                <View style={styles.supplementHeader}>
                  <Text style={styles.supplementDesc}>{s.description}</Text>
                  <Text style={styles.supplementAmount}>+{formatCurrency(s.additionalAmount)}</Text>
                </View>
                <View style={[styles.supplementBadge, { backgroundColor: s.status === 'HOLD_PLACED' ? '#DEF7EC' : s.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7' }]}>
                  <Text style={styles.supplementStatus}>{supplementStatusLabel(s.status)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ============================================ */}
        {/* PROCESSOR COMPARISON (Stripe vs Chase) */}
        {/* ============================================ */}
        {processorComparison && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{sa?.sectionProcessorComparison || 'Processing Fee Comparison'}</Text>
            <View style={styles.comparisonContainer}>
              {/* Stripe */}
              <View style={[styles.processorCard, processorComparison.recommendation.processor === 'STRIPE' && styles.processorRecommended]}>
                {processorComparison.recommendation.processor === 'STRIPE' && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>{sa?.recommended || 'Recommended'}</Text>
                  </View>
                )}
                <Text style={styles.processorName}>Stripe</Text>
                <Text style={styles.processorFee}>
                  {sa?.labelFee || 'Fee'}: {formatCurrency(Number(processorComparison.processors?.stripe?.processingFee) || 0)}
                </Text>
                <Text style={styles.processorTotal}>
                  {sa?.labelTotal || 'Total'}: {formatCurrency(Number(processorComparison.processors?.stripe?.totalAmount) || 0)}
                </Text>
                <Text style={styles.processorTime}>
                  {formatProcessingTimeLabel(processorComparison.processors?.stripe?.processingTime)}
                </Text>
              </View>

              {/* Chase */}
              <View style={[styles.processorCard, processorComparison.recommendation.processor === 'CHASE' && styles.processorRecommended]}>
                {processorComparison.recommendation.processor === 'CHASE' && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>{sa?.recommended || 'Recommended'}</Text>
                  </View>
                )}
                <Text style={styles.processorName}>Chase</Text>
                <Text style={styles.processorFee}>
                  {sa?.labelFee || 'Fee'}: {formatCurrency(Number(processorComparison.processors?.chase?.processingFee) || 0)}
                </Text>
                <Text style={styles.processorTotal}>
                  {sa?.labelTotal || 'Total'}: {formatCurrency(Number(processorComparison.processors?.chase?.totalAmount) || 0)}
                </Text>
                <Text style={styles.processorTime}>
                  {formatProcessingTimeLabel(processorComparison.processors?.chase?.processingTime)}
                </Text>
                {processorComparison.processors?.chase?.note && (
                  <Text style={styles.processorNote}>{processorComparison.processors.chase.note}</Text>
                )}
                {!processorComparison.processors?.chase?.available && (
                  <Text style={styles.processorUnavailable}>{sa?.comingSoon || 'Coming Soon'}</Text>
                )}
              </View>
            </View>
            {processorComparison.recommendation.savings > 0 && (
              <Text style={styles.savingsText}>
                💰 {processorComparison.recommendation.description}
              </Text>
            )}
          </View>
        )}

        {/* ============================================ */}
        {/* TERMS & CONDITIONS */}
        {/* ============================================ */}
        {canApprove && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{sa?.sectionTermsAgreements || 'Terms & Agreements'}</Text>

              {/* Terms of Service */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setTermsAccepted(!termsAccepted)}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <View style={styles.checkboxTextContainer}>
                  <Text style={styles.checkboxLabel}>{sa?.termsCheckboxLabel || 'I accept the Terms of Service'}</Text>
                  <Text style={styles.checkboxDescription}>
                    {sa?.termsCheckboxDescription ||
                      'I confirm that the service has been completed to my satisfaction and I authorize the payment as shown above.'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Fraud Disclaimer */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFraudDisclaimerAccepted(!fraudDisclaimerAccepted)}
              >
                <View style={[styles.checkbox, fraudDisclaimerAccepted && styles.checkboxChecked]}>
                  {fraudDisclaimerAccepted && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <View style={styles.checkboxTextContainer}>
                  <Text style={styles.checkboxLabel}>{sa?.fraudCheckboxLabel || 'Fraud Disclaimer Acknowledgment'}</Text>
                  <Text style={styles.checkboxDescription}>
                    {sa?.fraudCheckboxDescription ||
                      'I acknowledge that this is a legitimate transaction for automotive services I have received. I understand that filing a false fraud claim, chargeback, or dispute with my bank or credit card company regarding this charge constitutes fraud and may result in:'}
                  </Text>
                  <View style={styles.bulletList}>
                    <Text style={styles.bulletItem}>• {sa?.fraudBullet1 || 'Civil liability for damages and legal fees'}</Text>
                    <Text style={styles.bulletItem}>• {sa?.fraudBullet2 || 'Criminal prosecution under applicable federal and state laws'}</Text>
                    <Text style={styles.bulletItem}>• {sa?.fraudBullet3 || 'Permanent suspension from the TechTrust platform'}</Text>
                    <Text style={styles.bulletItem}>• {sa?.fraudBullet4 || 'Reporting to consumer fraud databases'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Digital Signature */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{sa?.sectionDigitalSignature || 'Digital Signature'}</Text>
              <Text style={styles.signatureInstructions}>
                {sa?.signatureInstructions ||
                  'Type your full legal name below as your digital signature to authorize this payment.'}
              </Text>
              <TextInput
                style={styles.signatureInput}
                placeholder={sa?.signaturePlaceholder || 'Full legal name'}
                value={signatureName}
                onChangeText={setSignatureName}
                autoCapitalize="words"
              />
              {signatureName.trim().length > 0 && (
                <Text style={styles.signaturePreview}>
                  {sa?.signatureSignedAsLabel || 'Signed as:'}{' '}
                  <Text style={styles.signatureBold}>{signatureName}</Text>{' '}
                  {sa?.signatureSignedOnLabel || 'on'}{' '}
                  {new Date().toLocaleDateString(localeLong, { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              )}
            </View>

            {/* Approve Button */}
            <TouchableOpacity
              style={[
                styles.approveButton,
                (!termsAccepted || !fraudDisclaimerAccepted || !signatureName.trim()) && styles.approveButtonDisabled,
              ]}
              onPress={handleApproveService}
              disabled={!termsAccepted || !fraudDisclaimerAccepted || !signatureName.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={22} color="#fff" />
                  <Text style={styles.approveButtonText}>
                    {(sa?.approvePayButton || 'Approve & Pay {{amount}}').replace(
                      /\{\{\s*amount\s*\}\}/g,
                      formatCurrency(details.financials.totalAuthorized),
                    )}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Completed State */}
        {isCompleted && (
          <View style={styles.completedSection}>
            <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
            <Text style={styles.completedTitle}>{sa?.completedTitle || 'Service Completed & Paid'}</Text>
            <Text style={styles.completedText}>
              {sa?.completedTotalCharged || 'Total charged:'}{' '}
              {formatCurrency(details.financials.totalCaptured)}
            </Text>
            {details.payments.find((p: any) => p.status === 'CAPTURED') && (
              <TouchableOpacity
                style={styles.receiptButton}
                onPress={async () => {
                  const capturedPayment = details.payments.find((p: any) => p.status === 'CAPTURED');
                  if (capturedPayment) {
                    try {
                      const result = await serviceFlowService.getReceipt(capturedPayment.id);
                      setReceipt(result.data);
                      setShowReceipt(true);
                    } catch (err) {
                      Alert.alert(
                        t.common?.error || 'Error',
                        t.serviceApproval?.receiptNotReady || 'Receipt not yet available',
                      );
                    }
                  }
                }}
              >
                <Ionicons name="receipt" size={18} color="#2563eb" />
                <Text style={styles.receiptButtonText}>{sa?.viewReceipt || 'View Receipt'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ============================================ */}
      {/* PHOTO VIEWER MODAL */}
      {/* ============================================ */}
      <Modal visible={photoModalVisible} animationType="slide" onRequestClose={() => setPhotoModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalPhotosHeading(selectedPhotoType)}</Text>
            <TouchableOpacity onPress={() => setPhotoModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={selectedPhotos}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.photoItem}>
                <Image source={{ uri: item.url || item }} style={styles.photoImage} resizeMode="contain" />
                {item.uploadedAt && (
                  <Text style={styles.photoTimestamp}>
                    {`${formatDate(item.uploadedAt)} ${formatTime(item.uploadedAt)}`}
                  </Text>
                )}
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* ============================================ */}
      {/* RECEIPT MODAL */}
      {/* ============================================ */}
      <Modal visible={showReceipt} animationType="slide" onRequestClose={() => setShowReceipt(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{sa?.receiptModalTitle || 'Payment Receipt'}</Text>
            <TouchableOpacity onPress={() => setShowReceipt(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {receipt ? (
            <ScrollView style={styles.receiptContent}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptLogo}>{sa?.receiptBrand || 'TechTrust AutoSolutions'}</Text>
                <Text style={styles.receiptNumber}>
                  {(sa?.receiptNumber || 'Receipt #{{number}}').replace(
                    /\{\{\s*number\s*\}\}/g,
                    String(receipt.receipt.receiptNumber),
                  )}
                </Text>
                <Text style={styles.receiptDate}>
                  {new Date(receipt.receipt.createdAt).toLocaleDateString(localeLong, {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>{sa?.receiptSectionCustomer || 'Customer'}</Text>
                <Text style={styles.receiptDetail}>{receipt.receipt.customerName}</Text>
              </View>

              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>{sa?.receiptSectionProvider || 'Provider'}</Text>
                <Text style={styles.receiptDetail}>{receipt.receipt.providerName}</Text>
              </View>

              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>{sa?.receiptSectionPaymentDetails || 'Payment Details'}</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{sa?.receiptLabelServiceLine || 'Service'}</Text>
                  <Text style={styles.detailValue}>{formatCurrency(Number(receipt.receipt.subtotal))}</Text>
                </View>
                {Number(receipt.receipt.supplementsTotal) > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{sa?.receiptLabelSupplements || 'Supplements'}</Text>
                    <Text style={styles.detailValue}>{formatCurrency(Number(receipt.receipt.supplementsTotal))}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{sa?.receiptLabelPlatformFee || 'Platform Fee'}</Text>
                  <Text style={styles.detailValue}>{formatCurrency(Number(receipt.receipt.platformFee))}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {(sa?.receiptLabelProcessing || 'Processing ({{processor}})').replace(
                      /\{\{\s*processor\s*\}\}/g,
                      String(receipt.receipt.paymentProcessor),
                    )}
                  </Text>
                  <Text style={styles.detailValue}>{formatCurrency(Number(receipt.receipt.processingFee))}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, styles.totalLabel]}>{sa?.receiptLabelTotal || 'Total'}</Text>
                  <Text style={[styles.detailValue, styles.totalValue]}>{formatCurrency(Number(receipt.receipt.totalAmount))}</Text>
                </View>
              </View>

              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>{sa?.receiptSectionPaymentMethod || 'Payment Method'}</Text>
                <Text style={styles.receiptDetail}>{receipt.receipt.paymentMethodInfo}</Text>
              </View>

              <View style={styles.receiptFooter}>
                <Text style={styles.receiptFooterText}>
                  {sa?.receiptFooter ||
                    'This receipt confirms that payment has been processed successfully. Keep this for your records.'}
                </Text>
              </View>
            </ScrollView>
          ) : (
            <ActivityIndicator size="large" color="#2563eb" style={{ flex: 1 }} />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#EF4444',
    fontSize: 16,
  },

  // Warning Banner
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 18,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },

  // Status
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderNumber: {
    fontSize: 13,
    color: '#6B7280',
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },

  // Hold Badge
  holdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  holdText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },

  // Photos
  photosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoCategory: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  photoCategoryActive: {
    borderColor: '#2563eb',
    backgroundColor: '#EFF6FF',
  },
  photoCategoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 6,
  },
  photoCount: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Supplement
  supplementCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  supplementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplementDesc: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  supplementAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  supplementBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  supplementStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },

  // Processor Comparison
  comparisonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  processorCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  processorRecommended: {
    borderColor: '#2563eb',
    borderWidth: 2,
    backgroundColor: '#EFF6FF',
  },
  recommendedBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  processorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  processorFee: {
    fontSize: 13,
    color: '#6B7280',
  },
  processorTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  processorTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  processorNote: {
    fontSize: 11,
    color: '#2563eb',
    marginTop: 4,
    textAlign: 'center',
  },
  processorUnavailable: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 4,
  },
  savingsText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 10,
  },

  // Checkboxes
  checkboxRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  checkboxDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  bulletList: {
    marginTop: 6,
    gap: 2,
  },
  bulletItem: {
    fontSize: 12,
    color: '#DC2626',
    lineHeight: 18,
  },

  // Signature
  signatureInstructions: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
  },
  signatureInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  signaturePreview: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  signatureBold: {
    fontWeight: '700',
    color: '#111827',
    fontStyle: 'italic',
  },

  // Approve Button
  approveButton: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  approveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  approveButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },

  // Completed
  completedSection: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16A34A',
  },
  completedText: {
    fontSize: 16,
    color: '#374151',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  receiptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'capitalize',
  },
  photoItem: {
    marginBottom: 16,
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
  },
  photoTimestamp: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },

  // Receipt Modal
  receiptContent: {
    padding: 20,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  receiptLogo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2563eb',
  },
  receiptNumber: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  receiptDate: {
    fontSize: 14,
    color: '#374151',
    marginTop: 2,
  },
  receiptSection: {
    marginBottom: 20,
  },
  receiptSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  receiptDetail: {
    fontSize: 15,
    color: '#111827',
  },
  receiptFooter: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    alignItems: 'center',
  },
  receiptFooterText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ServiceApprovalScreen;
