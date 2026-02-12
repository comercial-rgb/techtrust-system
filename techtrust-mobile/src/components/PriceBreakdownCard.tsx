/**
 * PriceBreakdownCard - Full transparent price breakdown
 * Shows all cost components: parts, labor, travel, tax, platform fee, processing fee, total
 * Used in CustomerQuoteDetailsScreen (before acceptance) and ServiceApprovalScreen (at approval)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Platform business rules (must match backend businessRules.ts) */
const PLATFORM_FEE_PERCENT = 10;
const STRIPE_FEE_PERCENT = 2.9;
const STRIPE_FEE_FIXED = 0.30;

export interface PriceLineItem {
  description: string;
  partCode?: string;
  quantity: number;
  unitPrice: number;
  type: 'PART' | 'LABOR';
  partCondition?: 'NEW' | 'USED' | 'REBUILT' | 'RECONDITIONED';
  isNoCharge?: boolean;
}

export interface PriceBreakdownData {
  items: PriceLineItem[];
  partsSubtotal: number;
  laborSubtotal: number;
  travelFee: number;
  discount: number;
  taxAmount: number;
  /** The provider's quote total (parts + labor + travel + tax - discount) */
  serviceTotal: number;
  /** Whether this is a mobile/on-site service */
  isMobileService?: boolean;
  /** Distance in km (for display) */
  distanceKm?: number;
}

interface PriceBreakdownCardProps {
  data: PriceBreakdownData;
  /** Show platform fee and processing fee (pre-acceptance view) */
  showPlatformFees?: boolean;
  /** Compact mode — hides line items, shows only summary */
  compact?: boolean;
  /** Title override */
  title?: string;
}

/**
 * Calculate platform fee (10% of service total)
 */
export function calculatePlatformFee(serviceTotal: number): number {
  return Math.round((serviceTotal * PLATFORM_FEE_PERCENT) / 100 * 100) / 100;
}

/**
 * Calculate Stripe processing fee (2.9% + $0.30 on total billed amount)
 */
export function calculateProcessingFee(chargeAmount: number): number {
  return Math.round(((chargeAmount * STRIPE_FEE_PERCENT) / 100 + STRIPE_FEE_FIXED) * 100) / 100;
}

/**
 * Calculate full customer total
 */
export function calculateCustomerTotal(serviceTotal: number): {
  platformFee: number;
  processingFee: number;
  customerTotal: number;
} {
  const platformFee = calculatePlatformFee(serviceTotal);
  const subtotalWithPlatform = serviceTotal + platformFee;
  const processingFee = calculateProcessingFee(subtotalWithPlatform);
  const customerTotal = Math.round((subtotalWithPlatform + processingFee) * 100) / 100;
  return { platformFee, processingFee, customerTotal };
}

export default function PriceBreakdownCard({
  data,
  showPlatformFees = true,
  compact = false,
  title,
}: PriceBreakdownCardProps) {
  const [expanded, setExpanded] = useState(!compact);

  const { platformFee, processingFee, customerTotal } = calculateCustomerTotal(data.serviceTotal);

  const partsItems = data.items.filter(i => i.type === 'PART');
  const laborItems = data.items.filter(i => i.type === 'LABOR');

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => compact && setExpanded(!expanded)}
        activeOpacity={compact ? 0.7 : 1}
        disabled={!compact}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="receipt-outline" size={20} color="#1976d2" />
          <Text style={styles.headerTitle}>{title || 'Price Breakdown'}</Text>
        </View>
        {compact && (
          <View style={styles.headerRight}>
            <Text style={styles.headerTotal}>
              ${showPlatformFees ? customerTotal.toFixed(2) : data.serviceTotal.toFixed(2)}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#6b7280"
            />
          </View>
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {/* Parts Section */}
          {partsItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cog-outline" size={16} color="#6b7280" />
                <Text style={styles.sectionLabel}>Parts</Text>
              </View>
              {partsItems.map((item, idx) => (
                <View key={idx} style={styles.lineItem}>
                  <View style={styles.lineItemLeft}>
                    <Text style={styles.lineItemName} numberOfLines={1}>{item.description}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {item.partCode && (
                        <Text style={styles.lineItemCode}>#{item.partCode}</Text>
                      )}
                      {item.partCondition && (
                        <Text style={[styles.lineItemCode, { color: '#1976d2' }]}>{item.partCondition}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.lineItemRight}>
                    {item.isNoCharge ? (
                      <Text style={[styles.lineItemAmount, { color: '#16a34a' }]}>NO CHARGE</Text>
                    ) : (
                      <>
                        <Text style={styles.lineItemQty}>
                          {item.quantity} × ${item.unitPrice.toFixed(2)}
                        </Text>
                        <Text style={styles.lineItemAmount}>
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              ))}
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Parts subtotal</Text>
                <Text style={styles.subtotalValue}>${data.partsSubtotal.toFixed(2)}</Text>
              </View>
            </View>
          )}

          {/* Labor Section */}
          {laborItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="construct-outline" size={16} color="#6b7280" />
                <Text style={styles.sectionLabel}>Labor</Text>
              </View>
              {laborItems.map((item, idx) => (
                <View key={idx} style={styles.lineItem}>
                  <View style={styles.lineItemLeft}>
                    <Text style={styles.lineItemName} numberOfLines={1}>{item.description}</Text>
                  </View>
                  <View style={styles.lineItemRight}>
                    <Text style={styles.lineItemQty}>
                      {item.quantity} × ${item.unitPrice.toFixed(2)}
                    </Text>
                    <Text style={styles.lineItemAmount}>
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Labor subtotal</Text>
                <Text style={styles.subtotalValue}>${data.laborSubtotal.toFixed(2)}</Text>
              </View>
            </View>
          )}

          {/* Fees & Totals */}
          <View style={styles.totalsSection}>
            {/* Discount */}
            {data.discount > 0 && (
              <View style={styles.totalRow}>
                <View style={styles.totalRowLeft}>
                  <Ionicons name="pricetag-outline" size={14} color="#10b981" />
                  <Text style={[styles.totalLabel, { color: '#10b981' }]}>Discount</Text>
                </View>
                <Text style={[styles.totalValue, { color: '#10b981' }]}>
                  -${data.discount.toFixed(2)}
                </Text>
              </View>
            )}

            {/* Travel / Displacement Fee */}
            {data.travelFee > 0 && (
              <View style={styles.totalRow}>
                <View style={styles.totalRowLeft}>
                  <Ionicons name="car-outline" size={14} color="#f59e0b" />
                  <Text style={styles.totalLabel}>
                    Travel fee{data.distanceKm ? ` (${data.distanceKm.toFixed(1)} km)` : ''}
                  </Text>
                </View>
                <Text style={styles.totalValue}>${data.travelFee.toFixed(2)}</Text>
              </View>
            )}
            {data.travelFee === 0 && data.isMobileService && (
              <View style={styles.totalRow}>
                <View style={styles.totalRowLeft}>
                  <Ionicons name="car-outline" size={14} color="#10b981" />
                  <Text style={[styles.totalLabel, { color: '#10b981' }]}>Travel fee</Text>
                </View>
                <Text style={[styles.totalValue, { color: '#10b981' }]}>FREE</Text>
              </View>
            )}

            {/* Tax */}
            <View style={styles.totalRow}>
              <View style={styles.totalRowLeft}>
                <Ionicons name="document-text-outline" size={14} color="#6b7280" />
                <Text style={styles.totalLabel}>Tax</Text>
              </View>
              <Text style={styles.totalValue}>${data.taxAmount.toFixed(2)}</Text>
            </View>

            {/* Service Subtotal line */}
            <View style={[styles.totalRow, styles.serviceSubtotalRow]}>
              <Text style={styles.serviceSubtotalLabel}>Service subtotal</Text>
              <Text style={styles.serviceSubtotalValue}>${data.serviceTotal.toFixed(2)}</Text>
            </View>

            {showPlatformFees && (
              <>
                {/* Platform fee */}
                <View style={styles.totalRow}>
                  <View style={styles.totalRowLeft}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#1976d2" />
                    <Text style={styles.totalLabel}>Platform fee ({PLATFORM_FEE_PERCENT}%)</Text>
                  </View>
                  <Text style={styles.totalValue}>${platformFee.toFixed(2)}</Text>
                </View>

                {/* Processing fee */}
                <View style={styles.totalRow}>
                  <View style={styles.totalRowLeft}>
                    <Ionicons name="card-outline" size={14} color="#6b7280" />
                    <Text style={styles.totalLabel}>Processing fee</Text>
                  </View>
                  <Text style={styles.totalValue}>${processingFee.toFixed(2)}</Text>
                </View>
              </>
            )}

            {/* Grand Total */}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>
                {showPlatformFees ? 'Total you pay' : 'Grand Total'}
              </Text>
              <Text style={styles.grandTotalValue}>
                ${showPlatformFees ? customerTotal.toFixed(2) : data.serviceTotal.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Info Note */}
          {showPlatformFees && (
            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={16} color="#1976d2" />
              <Text style={styles.infoNoteText}>
                A temporary hold will be placed on your card. You will only be charged after you review and approve the completed service.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976d2',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  lineItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  lineItemName: {
    fontSize: 14,
    color: '#374151',
  },
  lineItemCode: {
    fontSize: 11,
    color: '#1976d2',
    marginTop: 1,
  },
  lineItemRight: {
    alignItems: 'flex-end',
  },
  lineItemQty: {
    fontSize: 11,
    color: '#9ca3af',
  },
  lineItemAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  subtotalLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  subtotalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  totalsSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  totalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  serviceSubtotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 4,
    paddingTop: 8,
  },
  serviceSubtotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  serviceSubtotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#1976d2',
    marginTop: 10,
    paddingTop: 12,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1976d2',
  },
  infoNote: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },
});
