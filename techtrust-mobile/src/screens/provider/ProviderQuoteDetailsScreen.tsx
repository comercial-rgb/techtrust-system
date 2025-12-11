/**
 * ProviderQuoteDetailsScreen - Quote Details View
 * Shows full details of a submitted quote
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';

interface QuoteLineItem {
  id: string;
  type: 'part' | 'labor';
  description: string;
  quantity: number;
  unitPrice: number;
}

interface QuoteDetails {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  workOrderId?: string; // Added for accepted quotes
  totalAmount: number;
  partsCost: number;
  laborCost: number;
  lineItems: QuoteLineItem[];
  estimatedDuration: string;
  notes: string;
  warranty: {
    partsWarrantyMonths: number;
    serviceWarrantyDays: number;
    terms: string;
  };
  scheduledDate?: string;
  scheduledTime?: string;
  createdAt: string;
  expiresAt?: string;
  serviceRequest: {
    id: string;
    requestNumber: string;
    title: string;
    description: string;
    urgency: string;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
  };
  customer: {
    name: string;
    phone?: string;
  };
  rejectionReason?: string;
}

export default function ProviderQuoteDetailsScreen({ route, navigation }: any) {
  const { quoteId } = route.params;
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteDetails | null>(null);

  useEffect(() => {
    loadQuoteDetails();
  }, [quoteId]);

  const loadQuoteDetails = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));

      // Mock data based on quoteId to show different quotes
      const mockQuotes: Record<string, QuoteDetails> = {
        '1': {
          id: '1',
          status: 'PENDING',
          totalAmount: 450.0,
          partsCost: 200.0,
          laborCost: 250.0,
          lineItems: [
            { id: '1', type: 'part', description: 'Oil Filter - Mann W719/45', quantity: 1, unitPrice: 35.0 },
            { id: '2', type: 'part', description: 'Air Filter - K&N 33-2393', quantity: 1, unitPrice: 65.0 },
            { id: '3', type: 'part', description: 'Motor Oil 5W-30 Synthetic', quantity: 5, unitPrice: 20.0 },
            { id: '4', type: 'labor', description: 'Labor - Complete Oil Change', quantity: 1, unitPrice: 150.0 },
            { id: '5', type: 'labor', description: 'Multi-point Inspection', quantity: 1, unitPrice: 100.0 },
          ],
          estimatedDuration: '3h',
          notes: 'We also recommend checking the brake fluid on the next visit.',
          warranty: {
            partsWarrantyMonths: 6,
            serviceWarrantyDays: 90,
            terms: 'Warranty valid upon presentation of service receipt.',
          },
          scheduledDate: '2024-12-20',
          scheduledTime: '09:00',
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 42 * 60 * 60 * 1000).toISOString(),
          serviceRequest: {
            id: 'sr1',
            requestNumber: 'SR-2024-001',
            title: 'Oil and filter change',
            description: 'Motor oil and filter change (air and oil). Vehicle at 45,000 miles.',
            urgency: 'normal',
          },
          vehicle: { make: 'Honda', model: 'Civic', year: 2020, licensePlate: 'ABC-1234' },
          customer: { name: 'John S.', phone: '+1 (555) 123-4567' },
        },
        '2': {
          id: '2',
          status: 'ACCEPTED',
          workOrderId: 'wo-2', // Work order created when quote was accepted
          totalAmount: 320.0,
          partsCost: 180.0,
          laborCost: 140.0,
          lineItems: [
            { id: '1', type: 'part', description: 'Front Brake Pads - Brembo', quantity: 1, unitPrice: 89.0 },
            { id: '2', type: 'part', description: 'Rear Brake Pads - Brembo', quantity: 1, unitPrice: 91.0 },
            { id: '3', type: 'labor', description: 'Brake Pad Replacement (Front & Rear)', quantity: 1, unitPrice: 140.0 },
          ],
          estimatedDuration: '2h',
          notes: 'Brake rotors are in good condition, no replacement needed.',
          warranty: {
            partsWarrantyMonths: 12,
            serviceWarrantyDays: 90,
            terms: 'Warranty valid upon presentation of service receipt.',
          },
          scheduledDate: '2024-12-15',
          scheduledTime: '14:00',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          serviceRequest: {
            id: 'sr2',
            requestNumber: 'SR-2024-002',
            title: 'Brake pad replacement',
            description: 'Replace front and rear brake pads. Squeaking noise when braking.',
            urgency: 'normal',
          },
          vehicle: { make: 'Ford', model: 'Focus', year: 2021, licensePlate: 'XYZ-5678' },
          customer: { name: 'Peter C.', phone: '+1 (555) 987-6543' },
        },
        '3': {
          id: '3',
          status: 'PENDING',
          totalAmount: 250.0,
          partsCost: 100.0,
          laborCost: 150.0,
          lineItems: [
            { id: '1', type: 'part', description: 'Timing Belt Kit', quantity: 1, unitPrice: 100.0 },
            { id: '2', type: 'labor', description: 'Timing Belt Replacement', quantity: 1, unitPrice: 150.0 },
          ],
          estimatedDuration: '2h',
          notes: 'Recommended to replace water pump at the same time for best value.',
          warranty: {
            partsWarrantyMonths: 12,
            serviceWarrantyDays: 90,
            terms: 'Warranty valid upon presentation of service receipt.',
          },
          scheduledDate: '2024-12-22',
          scheduledTime: '10:00',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString(),
          serviceRequest: {
            id: 'sr5',
            requestNumber: 'SR-2024-005',
            title: 'Timing belt replacement',
            description: 'Replace timing belt. Vehicle at 90,000 miles.',
            urgency: 'high',
          },
          vehicle: { make: 'Volkswagen', model: 'Golf', year: 2019, licensePlate: 'DEF-9012' },
          customer: { name: 'Fernanda S.', phone: '+1 (555) 456-7890' },
        },
        '4': {
          id: '4',
          status: 'REJECTED',
          totalAmount: 580.0,
          partsCost: 350.0,
          laborCost: 230.0,
          lineItems: [
            { id: '1', type: 'part', description: 'Full Synthetic Oil 5W-40', quantity: 8, unitPrice: 15.0 },
            { id: '2', type: 'part', description: 'Oil Filter - OEM', quantity: 1, unitPrice: 45.0 },
            { id: '3', type: 'part', description: 'Air Filter - OEM', quantity: 1, unitPrice: 65.0 },
            { id: '4', type: 'part', description: 'Cabin Air Filter', quantity: 1, unitPrice: 40.0 },
            { id: '5', type: 'part', description: 'Spark Plugs (6)', quantity: 1, unitPrice: 80.0 },
            { id: '6', type: 'labor', description: 'Complete Service - 60k miles', quantity: 1, unitPrice: 230.0 },
          ],
          estimatedDuration: '4h',
          notes: 'Full inspection included.',
          warranty: {
            partsWarrantyMonths: 6,
            serviceWarrantyDays: 90,
            terms: 'Warranty valid upon presentation of service receipt.',
          },
          scheduledDate: '2024-12-18',
          scheduledTime: '08:00',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          serviceRequest: {
            id: 'sr3',
            requestNumber: 'SR-2024-003',
            title: 'Complete revision',
            description: '60,000 mile full service. Include all fluids check.',
            urgency: 'normal',
          },
          vehicle: { make: 'BMW', model: 'X3', year: 2022, licensePlate: 'GHI-3456' },
          customer: { name: 'Ana O.', phone: '+1 (555) 321-0987' },
          rejectionReason: 'Found a better price elsewhere.',
        },
        '5': {
          id: '5',
          status: 'EXPIRED',
          totalAmount: 180.0,
          partsCost: 80.0,
          laborCost: 100.0,
          lineItems: [
            { id: '1', type: 'part', description: 'Wheel Weights', quantity: 1, unitPrice: 30.0 },
            { id: '2', type: 'part', description: 'Valve Stems', quantity: 4, unitPrice: 12.5 },
            { id: '3', type: 'labor', description: 'Alignment & Balancing Service', quantity: 1, unitPrice: 100.0 },
          ],
          estimatedDuration: '1h',
          notes: 'Tires are in good condition.',
          warranty: {
            partsWarrantyMonths: 3,
            serviceWarrantyDays: 30,
            terms: 'Warranty valid upon presentation of service receipt.',
          },
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          serviceRequest: {
            id: 'sr4',
            requestNumber: 'SR-2024-004',
            title: 'Alignment and balancing',
            description: 'Wheel alignment and balancing. Steering pulling to the right.',
            urgency: 'low',
          },
          vehicle: { make: 'Chevrolet', model: 'Cruze', year: 2018, licensePlate: 'JKL-7890' },
          customer: { name: 'Carlos L.', phone: '+1 (555) 654-3210' },
        },
      };

      // Get quote data based on ID, fallback to first one
      const quoteData = mockQuotes[quoteId] || mockQuotes['1'];
      setQuote(quoteData);
    } catch (error) {
      console.error('Error loading quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { icon: string; color: string; bg: string; label: string }> = {
      PENDING: { icon: 'clock-outline', color: '#f59e0b', bg: '#fef3c7', label: t.provider?.awaitingResponse || 'Awaiting Response' },
      ACCEPTED: { icon: 'check-circle', color: '#10b981', bg: '#d1fae5', label: t.provider?.accepted || 'Accepted' },
      REJECTED: { icon: 'close-circle', color: '#ef4444', bg: '#fef2f2', label: t.provider?.rejected || 'Rejected' },
      EXPIRED: { icon: 'clock-alert', color: '#6b7280', bg: '#f3f4f6', label: t.provider?.expired || 'Expired' },
    };
    return statuses[status] || { icon: 'help-circle', color: '#6b7280', bg: '#f3f4f6', label: status };
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) return t.provider?.expired || 'Expired';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 24) return `${hours}${t.common?.hoursRemaining || 'h remaining'}`;
    const days = Math.floor(hours / 24);
    return `${days}${t.common?.daysRemaining || 'd'} ${hours % 24}${t.common?.hoursShort || 'h'} ${t.common?.remaining || 'remaining'}`;
  };

  const handleCancelQuote = () => {
    Alert.alert(
      t.provider?.cancelQuote || 'Cancel Quote',
      t.provider?.cancelQuoteConfirm || 'Are you sure you want to cancel this quote? This action cannot be undone.',
      [
        { text: t.common?.no || 'No', style: 'cancel' },
        {
          text: t.common?.yesCancel || 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            // API call to cancel
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleViewWorkOrder = () => {
    if (quote?.workOrderId) {
      navigation.navigate('QuoteWorkOrderDetails', { workOrderId: quote.workOrderId });
    } else {
      // Fallback: use quote id if workOrderId not available
      navigation.navigate('QuoteWorkOrderDetails', { workOrderId: quote?.id });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      </SafeAreaView>
    );
  }

  if (!quote) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{t.provider?.quoteNotFound || 'Quote not found'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>{t.common?.goBack || 'Go Back'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusInfo(quote.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t.provider?.quoteDetails || 'Quote Details'}</Text>
          <Text style={styles.headerSubtitle}>#{quote.serviceRequest.requestNumber}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.statusCard, { borderColor: statusInfo.color }]}>
          <View style={[styles.statusIconContainer, { backgroundColor: statusInfo.bg }]}>
            <MaterialCommunityIcons name={statusInfo.icon as any} size={28} color={statusInfo.color} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            {quote.status === 'PENDING' && quote.expiresAt && (
              <Text style={styles.expiresText}>{getTimeRemaining(quote.expiresAt)}</Text>
            )}
            {quote.status === 'REJECTED' && quote.rejectionReason && (
              <Text style={styles.rejectionText}>{quote.rejectionReason}</Text>
            )}
          </View>
          <Text style={styles.totalAmount}>${quote.totalAmount.toFixed(2)}</Text>
        </View>

        {/* Service Request Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.provider?.serviceRequest || 'Service Request'}</Text>
          <View style={styles.infoCard}>
            <Text style={styles.requestTitle}>{quote.serviceRequest.title}</Text>
            <Text style={styles.requestDescription}>{quote.serviceRequest.description}</Text>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="car" size={16} color="#6b7280" />
                <Text style={styles.infoText}>
                  {quote.vehicle.year} {quote.vehicle.make} {quote.vehicle.model}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="card-text" size={16} color="#6b7280" />
                <Text style={styles.infoText}>{quote.vehicle.licensePlate}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="account" size={16} color="#6b7280" />
                <Text style={styles.infoText}>{quote.customer.name}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.provider?.quoteBreakdown || 'Quote Breakdown'}</Text>
          
          {/* Parts */}
          <Text style={styles.subSectionTitle}>{t.provider?.parts || 'Parts'}</Text>
          {quote.lineItems.filter(item => item.type === 'part').map(item => (
            <View key={item.id} style={styles.lineItem}>
              <View style={styles.lineItemInfo}>
                <Text style={styles.lineItemDescription}>{item.description}</Text>
                <Text style={styles.lineItemQty}>{t.common?.qty || 'Qty'}: {item.quantity}</Text>
              </View>
              <Text style={styles.lineItemPrice}>${(item.quantity * item.unitPrice).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>{t.provider?.partsSubtotal || 'Parts Subtotal'}</Text>
            <Text style={styles.subtotalValue}>${quote.partsCost.toFixed(2)}</Text>
          </View>

          {/* Labor */}
          <Text style={styles.subSectionTitle}>{t.provider?.labor || 'Labor'}</Text>
          {quote.lineItems.filter(item => item.type === 'labor').map(item => (
            <View key={item.id} style={styles.lineItem}>
              <View style={styles.lineItemInfo}>
                <Text style={styles.lineItemDescription}>{item.description}</Text>
                <Text style={styles.lineItemQty}>{t.common?.qty || 'Qty'}: {item.quantity}</Text>
              </View>
              <Text style={styles.lineItemPrice}>${(item.quantity * item.unitPrice).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>{t.provider?.laborSubtotal || 'Labor Subtotal'}</Text>
            <Text style={styles.subtotalValue}>${quote.laborCost.toFixed(2)}</Text>
          </View>

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t.provider?.totalQuote || 'Total Quote'}</Text>
            <Text style={styles.totalValue}>${quote.totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Warranty */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.provider?.warranty || 'Warranty'}</Text>
          <View style={styles.warrantyCard}>
            <View style={styles.warrantyRow}>
              <View style={styles.warrantyItem}>
                <MaterialCommunityIcons name="package-variant" size={20} color="#f59e0b" />
                <Text style={styles.warrantyLabel}>{t.provider?.parts || 'Parts'}</Text>
                <Text style={styles.warrantyValue}>{quote.warranty.partsWarrantyMonths} {t.common?.months || 'months'}</Text>
              </View>
              <View style={styles.warrantyItem}>
                <MaterialCommunityIcons name="account-hard-hat" size={20} color="#f59e0b" />
                <Text style={styles.warrantyLabel}>{t.provider?.service || 'Service'}</Text>
                <Text style={styles.warrantyValue}>{quote.warranty.serviceWarrantyDays} {t.common?.days || 'days'}</Text>
              </View>
            </View>
            {quote.warranty.terms && (
              <View style={styles.warrantyTerms}>
                <Text style={styles.warrantyTermsLabel}>{t.common?.terms || 'Terms'}:</Text>
                <Text style={styles.warrantyTermsText}>{quote.warranty.terms}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Scheduling */}
        {quote.scheduledDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.provider?.proposedSchedule || 'Proposed Schedule'}</Text>
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleItem}>
                <MaterialCommunityIcons name="calendar" size={20} color="#1976d2" />
                <Text style={styles.scheduleText}>{quote.scheduledDate}</Text>
              </View>
              <View style={styles.scheduleItem}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#1976d2" />
                <Text style={styles.scheduleText}>{quote.scheduledTime}</Text>
              </View>
              <View style={styles.scheduleItem}>
                <MaterialCommunityIcons name="timer-outline" size={20} color="#1976d2" />
                <Text style={styles.scheduleText}>{quote.estimatedDuration} {t.common?.estimated || 'estimated'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Notes */}
        {quote.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.common?.notes || 'Notes'}</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{quote.notes}</Text>
            </View>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.metaText}>{t.common?.submitted || 'Submitted'}: {formatDateTime(quote.createdAt)}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {quote.status === 'PENDING' && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelQuote}>
              <MaterialCommunityIcons name="close" size={20} color="#ef4444" />
              <Text style={styles.cancelButtonText}>{t.provider?.cancelQuote || 'Cancel Quote'}</Text>
            </TouchableOpacity>
          )}
          {quote.status === 'ACCEPTED' && (
            <TouchableOpacity style={styles.viewWorkOrderButton} onPress={handleViewWorkOrder}>
              <MaterialCommunityIcons name="clipboard-check" size={20} color="#fff" />
              <Text style={styles.viewWorkOrderButtonText}>{t.workOrder?.viewWorkOrder || 'View Work Order'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1976d2',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
  },
  statusIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
    marginLeft: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  expiresText: {
    fontSize: 13,
    color: '#f59e0b',
    marginTop: 2,
  },
  rejectionText: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  requestDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
  },
  lineItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lineItemInfo: {
    flex: 1,
  },
  lineItemDescription: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  lineItemQty: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  lineItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 6,
  },
  subtotalLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  subtotalValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 15,
    color: '#1e40af',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    color: '#1e40af',
    fontWeight: 'bold',
  },
  warrantyCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  warrantyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  warrantyItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  warrantyLabel: {
    fontSize: 12,
    color: '#92400e',
    marginTop: 6,
  },
  warrantyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78350f',
    marginTop: 2,
  },
  warrantyTerms: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#fde047',
  },
  warrantyTermsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  warrantyTermsText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scheduleItem: {
    alignItems: 'center',
    gap: 4,
  },
  scheduleText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  notesText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  metaText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    gap: 8,
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  viewWorkOrderButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  viewWorkOrderButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
