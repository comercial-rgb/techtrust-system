/**
 * CustomerQuoteDetailsScreen - Quote Details for Customer
 * View quote with new format including part codes, warranty, and share functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useI18n } from '../../i18n';

interface QuoteLineItem {
  id: string;
  type: 'PART' | 'LABOR';
  description: string;
  partCode?: string;
  quantity: number;
  unitPrice: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  provider: {
    name: string;
    phone: string;
    email: string;
    address: string;
    rating: number;
  };
  request: {
    title: string;
    description: string;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
    plate: string;
  };
  items: QuoteLineItem[];
  partsTotal: number;
  laborTotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  warranty: {
    partsMonths: number;
    serviceDays: number;
    terms: string;
  };
  estimatedDays: number;
  validUntil: string;
  notes: string;
  createdAt: string;
}

export default function CustomerQuoteDetailsScreen({ navigation, route }: any) {
  const { t, formatCurrency, formatDate } = useI18n();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuoteDetails();
  }, []);

  const loadQuoteDetails = async () => {
    try {
      const quoteId = route.params?.quoteId;
      if (!quoteId) {
        setQuote(null);
        setLoading(false);
        return;
      }
      
      // Carregar detalhes do orçamento do backend
      const { getQuoteDetails } = await import('../../services/dashboard.service');
      const quoteData = await getQuoteDetails(quoteId);
      
      if (quoteData) {
        setQuote({
          id: quoteData.id,
          quoteNumber: quoteData.quoteNumber || `QT-${quoteData.id.substring(0, 4)}`,
          status: quoteData.status,
          provider: quoteData.provider || { name: 'Provider', phone: '', email: '', address: '', rating: 0 },
          request: quoteData.serviceRequest || { title: 'Service', description: '' },
          vehicle: quoteData.vehicle || { make: 'N/A', model: 'N/A', year: 0, plate: '' },
          items: quoteData.items || [],
          partsTotal: quoteData.partsTotal || 0,
          laborTotal: quoteData.laborTotal || 0,
          discount: quoteData.discount || 0,
          tax: quoteData.tax || 0,
          grandTotal: quoteData.grandTotal || quoteData.totalAmount || 0,
          warranty: quoteData.warranty || { partsMonths: 0, serviceDays: 0, terms: '' },
          estimatedDays: quoteData.estimatedDays || 1,
          validUntil: quoteData.validUntil || new Date().toISOString(),
          notes: quoteData.notes || '',
          createdAt: quoteData.createdAt,
        });
      } else {
        setQuote(null);
      }
    } catch (error) {
      console.error('Error loading quote details:', error);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: 'Pending', color: '#f59e0b', bgColor: '#fef3c7', icon: 'time' };
      case 'ACCEPTED':
        return { label: 'Accepted', color: '#10b981', bgColor: '#d1fae5', icon: 'checkmark-circle' };
      case 'REJECTED':
        return { label: 'Rejected', color: '#ef4444', bgColor: '#fee2e2', icon: 'close-circle' };
      case 'EXPIRED':
        return { label: 'Expired', color: '#6b7280', bgColor: '#f3f4f6', icon: 'alert-circle' };
      default:
        return { label: status, color: '#6b7280', bgColor: '#f3f4f6', icon: 'ellipse' };
    }
  };

  const handleAcceptQuote = () => {
    if (!quote) return;
    
    Alert.alert(
      t.quote?.acceptQuote || 'Accept Quote',
      `${t.quote?.acceptQuoteConfirm || 'By accepting this quote, a payment hold of'} $${quote.grandTotal.toFixed(2)} ${t.quote?.willBePlaced || 'will be placed on your card. The charge will only be completed after you confirm service completion.'}`,
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        { 
          text: t.quote?.acceptAndHold || 'Accept & Hold Payment', 
          onPress: async () => {
            // Simulate payment hold
            Alert.alert(
              t.common?.processing || 'Processing...',
              t.quote?.holdingPayment || 'Placing payment hold...',
            );
            
            // In production: call API to create payment hold
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            Alert.alert(
              t.common?.success || 'Success!',
              `${t.quote?.quoteAcceptedPaymentHeld || 'Quote accepted! A payment hold of'} $${quote.grandTotal.toFixed(2)} ${t.quote?.hasBeenPlaced || 'has been placed. You will only be charged when you confirm service completion.'}`,
              [
                { 
                  text: t.common?.ok || 'OK', 
                  onPress: () => navigation.goBack()
                }
              ]
            );
          }
        },
      ]
    );
  };

  const handleRejectQuote = () => {
    Alert.alert(
      'Reject Quote',
      'Are you sure you want to reject this quote?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Quote Rejected', 'You can still view other quotes for this request.');
            navigation.goBack();
          }
        },
      ]
    );
  };

  const generatePdfHtml = () => {
    if (!quote) return '';

    const itemsHtml = quote.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 500;">${item.description}</div>
          ${item.partCode ? `<div style="font-size: 12px; color: #6b7280;">Code: ${item.partCode}</div>` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.type === 'PART' ? 'Part' : 'Labor'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Quote ${quote.quoteNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1f2937; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #1976d2; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #1976d2; }
          .quote-info { text-align: right; }
          .quote-number { font-size: 18px; font-weight: bold; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 14px; font-weight: bold; color: #6b7280; margin-bottom: 10px; text-transform: uppercase; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; }
          .info-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
          .info-value { font-size: 14px; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; }
          .totals { margin-top: 20px; text-align: right; }
          .totals-row { display: flex; justify-content: flex-end; margin-bottom: 8px; }
          .totals-label { width: 150px; text-align: right; padding-right: 20px; color: #6b7280; }
          .totals-value { width: 100px; text-align: right; font-weight: 500; }
          .grand-total { font-size: 18px; color: #1976d2; border-top: 2px solid #1976d2; padding-top: 10px; margin-top: 10px; }
          .warranty-box { background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #1976d2; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">TechTrust</div>
            <div style="color: #6b7280; font-size: 12px;">Trusted Automotive Services</div>
          </div>
          <div class="quote-info">
            <div class="quote-number">${quote.quoteNumber}</div>
            <div style="color: #6b7280; font-size: 12px;">Date: ${formatDate(quote.createdAt)}</div>
            <div style="color: #6b7280; font-size: 12px;">Valid Until: ${formatDate(quote.validUntil)}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <div class="section-title">Provider</div>
            <div class="info-value">${quote.provider.name}</div>
            <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">${quote.provider.address}</div>
            <div style="font-size: 13px; color: #6b7280;">${quote.provider.phone}</div>
          </div>
          <div class="info-box">
            <div class="section-title">Vehicle</div>
            <div class="info-value">${quote.vehicle.year} ${quote.vehicle.make} ${quote.vehicle.model}</div>
            <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">Plate: ${quote.vehicle.plate}</div>
          </div>
        </div>

        <div class="section" style="margin-top: 25px;">
          <div class="section-title">Service Requested</div>
          <div style="font-weight: 500;">${quote.request.title}</div>
          <div style="font-size: 13px; color: #6b7280;">${quote.request.description}</div>
        </div>

        <div class="section">
          <div class="section-title">Quote Items</div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center;">Type</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div class="totals-row">
            <span class="totals-label">Parts Subtotal:</span>
            <span class="totals-value">$${quote.partsTotal.toFixed(2)}</span>
          </div>
          <div class="totals-row">
            <span class="totals-label">Labor Subtotal:</span>
            <span class="totals-value">$${quote.laborTotal.toFixed(2)}</span>
          </div>
          ${quote.discount > 0 ? `
          <div class="totals-row">
            <span class="totals-label">Discount:</span>
            <span class="totals-value" style="color: #10b981;">-$${quote.discount.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="totals-row">
            <span class="totals-label">Tax:</span>
            <span class="totals-value">$${quote.tax.toFixed(2)}</span>
          </div>
          <div class="totals-row grand-total">
            <span class="totals-label" style="font-weight: bold; color: #1f2937;">Grand Total:</span>
            <span class="totals-value" style="font-size: 20px;">$${quote.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div class="section" style="margin-top: 25px;">
          <div class="warranty-box">
            <div class="section-title" style="margin-bottom: 8px;">Warranty Information</div>
            <div style="font-size: 13px;">
              <strong>Parts:</strong> ${quote.warranty.partsMonths} months • 
              <strong>Service:</strong> ${quote.warranty.serviceDays} days
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 6px;">${quote.warranty.terms}</div>
          </div>
        </div>

        ${quote.notes ? `
        <div class="section">
          <div class="section-title">Notes</div>
          <div style="font-size: 13px; color: #374151;">${quote.notes}</div>
        </div>
        ` : ''}

        <div class="footer">
          <div>Thank you for choosing TechTrust!</div>
          <div style="margin-top: 4px;">Questions? Contact us at support@techtrust.com</div>
        </div>
      </body>
      </html>
    `;
  };

  const handleSharePdf = async () => {
    if (!quote) return;

    try {
      const html = generatePdfHtml();
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Quote ${quote.quoteNumber}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Could not generate PDF. Please try again.');
    }
  };

  const handleShareText = async () => {
    if (!quote) return;

    const text = `
Quote: ${quote.quoteNumber}
Provider: ${quote.provider.name}
Service: ${quote.request.title}
Vehicle: ${quote.vehicle.year} ${quote.vehicle.make} ${quote.vehicle.model}

Parts: $${quote.partsTotal.toFixed(2)}
Labor: $${quote.laborTotal.toFixed(2)}
Total: $${quote.grandTotal.toFixed(2)}

Valid until: ${formatDate(quote.validUntil)}
    `.trim();

    try {
      await Share.share({
        message: text,
        title: `Quote ${quote.quoteNumber}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading || !quote) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusInfo(quote.status);
  const partsItems = quote.items.filter(i => i.type === 'PART');
  const laborItems = quote.items.filter(i => i.type === 'LABOR');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{quote.quoteNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Ionicons name={statusInfo.icon as any} size={12} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleSharePdf}>
          <Ionicons name="share-outline" size={24} color="#1976d2" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Provider Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Provider</Text>
          <View style={styles.providerCard}>
            <View style={styles.providerAvatar}>
              <Ionicons name="business" size={24} color="#1976d2" />
            </View>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{quote.provider.name}</Text>
              <View style={styles.providerRating}>
                <Ionicons name="star" size={14} color="#fbbf24" />
                <Text style={styles.ratingText}>{quote.provider.rating}</Text>
              </View>
              <Text style={styles.providerAddress}>{quote.provider.address}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Ionicons name="call" size={18} color="#1976d2" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Vehicle & Service */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <View style={[styles.infoCard, { flex: 1, marginRight: 8 }]}>
              <Ionicons name="car" size={20} color="#f59e0b" />
              <Text style={styles.infoLabel}>Vehicle</Text>
              <Text style={styles.infoValue}>{quote.vehicle.year} {quote.vehicle.make}</Text>
              <Text style={styles.infoSubvalue}>{quote.vehicle.model}</Text>
            </View>
            <View style={[styles.infoCard, { flex: 1, marginLeft: 8 }]}>
              <Ionicons name="calendar" size={20} color="#10b981" />
              <Text style={styles.infoLabel}>Est. Time</Text>
              <Text style={styles.infoValue}>{quote.estimatedDays} day(s)</Text>
              <Text style={styles.infoSubvalue}>Valid until {formatDate(quote.validUntil)}</Text>
            </View>
          </View>
        </View>

        {/* Quote Items - Parts */}
        {partsItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parts</Text>
            {partsItems.map((item) => (
              <View key={item.id} style={styles.lineItem}>
                <View style={styles.lineItemIcon}>
                  <Ionicons name="cog" size={16} color="#6b7280" />
                </View>
                <View style={styles.lineItemInfo}>
                  <Text style={styles.lineItemName}>{item.description}</Text>
                  {item.partCode && (
                    <Text style={styles.lineItemCode}>Code: {item.partCode}</Text>
                  )}
                  <Text style={styles.lineItemQty}>{item.quantity} x ${item.unitPrice.toFixed(2)}</Text>
                </View>
                <Text style={styles.lineItemTotal}>${(item.quantity * item.unitPrice).toFixed(2)}</Text>
              </View>
            ))}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Parts Subtotal</Text>
              <Text style={styles.subtotalValue}>${quote.partsTotal.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Quote Items - Labor */}
        {laborItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Labor</Text>
            {laborItems.map((item) => (
              <View key={item.id} style={styles.lineItem}>
                <View style={styles.lineItemIcon}>
                  <Ionicons name="construct" size={16} color="#6b7280" />
                </View>
                <View style={styles.lineItemInfo}>
                  <Text style={styles.lineItemName}>{item.description}</Text>
                  <Text style={styles.lineItemQty}>{item.quantity} x ${item.unitPrice.toFixed(2)}</Text>
                </View>
                <Text style={styles.lineItemTotal}>${(item.quantity * item.unitPrice).toFixed(2)}</Text>
              </View>
            ))}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Labor Subtotal</Text>
              <Text style={styles.subtotalValue}>${quote.laborTotal.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Total Section */}
        <View style={styles.totalSection}>
          {quote.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={[styles.totalValue, { color: '#10b981' }]}>-${quote.discount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>${quote.tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>${quote.grandTotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* Warranty */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Warranty</Text>
          <View style={styles.warrantyCard}>
            <View style={styles.warrantyRow}>
              <View style={styles.warrantyItem}>
                <Ionicons name="shield-checkmark" size={20} color="#1976d2" />
                <Text style={styles.warrantyLabel}>Parts</Text>
                <Text style={styles.warrantyValue}>{quote.warranty.partsMonths} months</Text>
              </View>
              <View style={styles.warrantyDivider} />
              <View style={styles.warrantyItem}>
                <Ionicons name="construct" size={20} color="#1976d2" />
                <Text style={styles.warrantyLabel}>Service</Text>
                <Text style={styles.warrantyValue}>{quote.warranty.serviceDays} days</Text>
              </View>
            </View>
            <Text style={styles.warrantyTerms}>{quote.warranty.terms}</Text>
          </View>
        </View>

        {/* Notes */}
        {quote.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{quote.notes}</Text>
            </View>
          </View>
        )}

        {/* Share Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share Quote</Text>
          <View style={styles.shareOptions}>
            <TouchableOpacity style={styles.shareOption} onPress={handleSharePdf}>
              <Ionicons name="document" size={24} color="#ef4444" />
              <Text style={styles.shareOptionText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareOption} onPress={handleShareText}>
              <Ionicons name="chatbubble" size={24} color="#10b981" />
              <Text style={styles.shareOptionText}>Text</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Buttons */}
      {quote.status === 'PENDING' && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.rejectBtn} onPress={handleRejectQuote}>
            <Ionicons name="close" size={20} color="#ef4444" />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptQuote}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.acceptBtnText}>Accept Quote</Text>
          </TouchableOpacity>
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  shareBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  providerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  providerAddress: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
  },
  infoSubvalue: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  lineItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lineItemInfo: {
    flex: 1,
  },
  lineItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  lineItemCode: {
    fontSize: 11,
    color: '#1976d2',
    marginTop: 2,
  },
  lineItemQty: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  lineItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 4,
  },
  subtotalLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  subtotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  totalSection: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  warrantyCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  warrantyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warrantyItem: {
    flex: 1,
    alignItems: 'center',
  },
  warrantyDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#bfdbfe',
  },
  warrantyLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  warrantyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginTop: 2,
  },
  warrantyTerms: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 12,
    lineHeight: 18,
  },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  shareOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  shareOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shareOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
  },
  rejectBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1976d2',
  },
  acceptBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
