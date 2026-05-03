/**
 * PriceBreakdownCard - Full transparent price breakdown
 * Shows all cost components: parts, labor, travel, tax, app service fee, processing fee, total
 * Used in CustomerQuoteDetailsScreen (before acceptance) and ServiceApprovalScreen (at approval)
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../i18n";

/** Platform business rules (must match backend businessRules.ts) */
const STRIPE_FEE_PERCENT = 2.9;
const STRIPE_FEE_FIXED = 0.3;

// App service fee by plan (must match backend)
const APP_SERVICE_FEE: Record<string, number> = {
  FREE: 5.89,
  STARTER: 2.99,
  PRO: 0.00,
  ENTERPRISE: 0.00,
};

export interface PriceLineItem {
  description: string;
  partCode?: string;
  quantity: number;
  unitPrice: number;
  type: "PART" | "LABOR";
  partCondition?: "NEW" | "USED" | "REBUILT" | "RECONDITIONED";
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
  /** Client subscription plan (FREE, STARTER, PRO, ENTERPRISE) */
  clientPlan?: string;
  /** Sales tax calculated by TechTrust as Marketplace Facilitator */
  salesTaxAmount?: number;
  /** Combined sales tax rate (state + county surtax) */
  salesTaxRate?: number;
  /** County name for surtax display */
  salesTaxCounty?: string;
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
 * Get the app service fee based on the client plan
 */
export function getAppServiceFee(plan: string): number {
  return APP_SERVICE_FEE[plan] ?? APP_SERVICE_FEE.FREE;
}

/**
 * Calculate Stripe processing fee (2.9% + $0.30 on total billed amount)
 */
export function calculateProcessingFee(chargeAmount: number): number {
  return (
    Math.round(
      ((chargeAmount * STRIPE_FEE_PERCENT) / 100 + STRIPE_FEE_FIXED) * 100,
    ) / 100
  );
}

/**
 * Calculate full customer total with the new fee structure:
 * Client pays: quoteTotal + salesTax + appServiceFee + processorFee
 * (Commission is deducted from provider, not added to client)
 */
export function calculateCustomerTotal(
  serviceTotal: number,
  clientPlan: string = "FREE",
  salesTaxAmount: number = 0,
): {
  appServiceFee: number;
  processingFee: number;
  salesTaxAmount: number;
  customerTotal: number;
} {
  const appServiceFee = getAppServiceFee(clientPlan);
  const subtotalWithFee = serviceTotal + salesTaxAmount + appServiceFee;
  const processingFee = calculateProcessingFee(subtotalWithFee);
  const customerTotal =
    Math.round((subtotalWithFee + processingFee) * 100) / 100;
  return { appServiceFee, processingFee, salesTaxAmount, customerTotal };
}

/** @deprecated Use calculateCustomerTotal with clientPlan instead */
export function calculatePlatformFee(serviceTotal: number): number {
  return 0; // Platform fee is no longer added to client — it's deducted from provider
}

function partConditionLabel(
  cond: string,
  tq: Record<string, string | undefined>,
): string {
  switch (cond) {
    case "NEW":
      return tq.condNew || cond;
    case "USED":
      return tq.condUsed || cond;
    case "REBUILT":
      return tq.condRebuilt || cond;
    case "RECONDITIONED":
      return tq.condRecond || cond;
    default:
      return cond;
  }
}

export default function PriceBreakdownCard({
  data,
  showPlatformFees = true,
  compact = false,
  title,
}: PriceBreakdownCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const { t, formatCurrency } = useI18n();
  const tp = t.payment;
  const tq = t.quote;
  const tpb = (tp as { priceBreakdown?: Record<string, string> }).priceBreakdown;
  const pb = (key: string, fallback: string) => tpb?.[key] ?? fallback;

  const clientPlan = data.clientPlan || "FREE";
  const { appServiceFee, processingFee, customerTotal } = calculateCustomerTotal(
    data.serviceTotal,
    clientPlan,
    data.salesTaxAmount || 0,
  );

  const partsItems = data.items.filter((i) => i.type === "PART");
  const laborItems = data.items.filter((i) => i.type === "LABOR");

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
          <Ionicons name="receipt-outline" size={20} color="#2B5EA7" />
          <Text style={styles.headerTitle}>
            {title || pb("title", "Price Breakdown")}
          </Text>
        </View>
        {compact && (
          <View style={styles.headerRight}>
            <Text style={styles.headerTotal}>
              {formatCurrency(
                showPlatformFees ? customerTotal : data.serviceTotal,
              )}
            </Text>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
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
                <Text style={styles.sectionLabel}>
                  {tq?.parts || "Parts"}
                </Text>
              </View>
              {partsItems.map((item, idx) => (
                <View key={idx} style={styles.lineItem}>
                  <View style={styles.lineItemLeft}>
                    <Text style={styles.lineItemName} numberOfLines={1}>
                      {item.description}
                    </Text>
                    <View
                      style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}
                    >
                      {item.partCode && (
                        <Text style={styles.lineItemCode}>
                          #{item.partCode}
                        </Text>
                      )}
                      {item.partCondition && (
                        <Text
                          style={[styles.lineItemCode, { color: "#2B5EA7" }]}
                        >
                          {partConditionLabel(
                            item.partCondition,
                            (tq || {}) as Record<string, string | undefined>,
                          )}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.lineItemRight}>
                    {item.isNoCharge ? (
                      <Text
                        style={[styles.lineItemAmount, { color: "#16a34a" }]}
                      >
                        {t.quote?.noCharge || "No charge"}
                      </Text>
                    ) : (
                      <>
                        <Text style={styles.lineItemQty}>
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </Text>
                        <Text style={styles.lineItemAmount}>
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              ))}
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>
                  {pb("partsSubtotal", "Parts subtotal")}
                </Text>
                <Text style={styles.subtotalValue}>
                  {formatCurrency(data.partsSubtotal)}
                </Text>
              </View>
            </View>
          )}

          {/* Labor Section */}
          {laborItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="construct-outline" size={16} color="#6b7280" />
                <Text style={styles.sectionLabel}>
                  {tq?.labor || "Labor"}
                </Text>
              </View>
              {laborItems.map((item, idx) => (
                <View key={idx} style={styles.lineItem}>
                  <View style={styles.lineItemLeft}>
                    <Text style={styles.lineItemName} numberOfLines={1}>
                      {item.description}
                    </Text>
                  </View>
                  <View style={styles.lineItemRight}>
                    <Text style={styles.lineItemQty}>
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </Text>
                    <Text style={styles.lineItemAmount}>
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </Text>
                  </View>
                </View>
              ))}
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>
                  {pb("laborSubtotal", "Labor subtotal")}
                </Text>
                <Text style={styles.subtotalValue}>
                  {formatCurrency(data.laborSubtotal)}
                </Text>
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
                  <Text style={[styles.totalLabel, { color: "#10b981" }]}>
                    {tq?.discount || "Discount"}
                  </Text>
                </View>
                <Text style={[styles.totalValue, { color: "#10b981" }]}>
                  -{formatCurrency(data.discount)}
                </Text>
              </View>
            )}

            {/* Travel / Displacement Fee */}
            {data.travelFee > 0 && (
              <View style={styles.totalRow}>
                <View style={styles.totalRowLeft}>
                  <Ionicons name="car-outline" size={14} color="#f59e0b" />
                  <Text style={styles.totalLabel}>
                    {data.distanceKm
                      ? pb("travelFeeWithKm", "Travel fee ({{km}} km)").replace(
                          "{{km}}",
                          data.distanceKm.toFixed(1),
                        )
                      : pb("travelFee", "Travel fee")}
                  </Text>
                </View>
                <Text style={styles.totalValue}>
                  {formatCurrency(data.travelFee)}
                </Text>
              </View>
            )}
            {data.travelFee === 0 && data.isMobileService && (
              <View style={styles.totalRow}>
                <View style={styles.totalRowLeft}>
                  <Ionicons name="car-outline" size={14} color="#10b981" />
                  <Text style={[styles.totalLabel, { color: "#10b981" }]}>
                    {pb("travelFee", "Travel fee")}
                  </Text>
                </View>
                <Text style={[styles.totalValue, { color: "#10b981" }]}>
                  {t.common?.free || "Free"}
                </Text>
              </View>
            )}

            {/* Tax (legacy provider-set, if any) */}
            {data.taxAmount > 0 && (
            <View style={styles.totalRow}>
              <View style={styles.totalRowLeft}>
                <Ionicons
                  name="document-text-outline"
                  size={14}
                  color="#6b7280"
                />
                <Text style={styles.totalLabel}>
                  {pb("taxEstimate", "Tax (estimate)")}
                </Text>
              </View>
              <Text style={styles.totalValue}>
                {formatCurrency(data.taxAmount)}
              </Text>
            </View>
            )}

            {/* Sales Tax (Marketplace Facilitator — FL) */}
            {(data.salesTaxAmount ?? 0) > 0 && (
              <View style={styles.totalRow}>
                <View style={styles.totalRowLeft}>
                  <Ionicons
                    name="receipt-outline"
                    size={14}
                    color="#dc2626"
                  />
                  <Text style={styles.totalLabel}>
                    {(tp?.salesTaxWithCounty || "Sales Tax ({{rate}}%{{county}})")
                      .replace(
                        "{{rate}}",
                        ((data.salesTaxRate || 0) * 100).toFixed(1),
                      )
                      .replace(
                        "{{county}}",
                        data.salesTaxCounty
                          ? `${tp?.salesTaxCountySeparator || " — "}${data.salesTaxCounty}`
                          : "",
                      )}
                  </Text>
                </View>
                <Text style={[styles.totalValue, { color: "#dc2626" }]}>
                  {formatCurrency(data.salesTaxAmount || 0)}
                </Text>
              </View>
            )}

            {/* Service Subtotal line */}
            <View style={[styles.totalRow, styles.serviceSubtotalRow]}>
              <Text style={styles.serviceSubtotalLabel}>
                {pb("serviceSubtotal", "Service subtotal")}
              </Text>
              <Text style={styles.serviceSubtotalValue}>
                {formatCurrency(data.serviceTotal)}
              </Text>
            </View>

            {showPlatformFees && (
              <>
                {/* App Service Fee */}
                {appServiceFee > 0 && (
                  <View style={styles.totalRow}>
                    <View style={styles.totalRowLeft}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={14}
                        color="#2B5EA7"
                      />
                      <Text style={styles.totalLabel}>
                        {pb("appServiceFee", "App service fee")}
                      </Text>
                    </View>
                    <Text style={styles.totalValue}>
                      {formatCurrency(appServiceFee)}
                    </Text>
                  </View>
                )}
                {appServiceFee === 0 && (
                  <View style={styles.totalRow}>
                    <View style={styles.totalRowLeft}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={14}
                        color="#10b981"
                      />
                      <Text style={[styles.totalLabel, { color: "#10b981" }]}>
                        {pb("appServiceFee", "App service fee")}
                      </Text>
                    </View>
                    <Text style={[styles.totalValue, { color: "#10b981" }]}>
                      {(t as any).customer?.scopeBothIncluded || "Included"}
                    </Text>
                  </View>
                )}

                {/* Processing fee */}
                <View style={styles.totalRow}>
                  <View style={styles.totalRowLeft}>
                    <Ionicons name="card-outline" size={14} color="#6b7280" />
                    <Text style={styles.totalLabel}>
                      {tp?.processingFee || "Processing fee"}
                    </Text>
                  </View>
                  <Text style={styles.totalValue}>
                    {formatCurrency(processingFee)}
                  </Text>
                </View>
              </>
            )}

            {/* Grand Total */}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>
                {showPlatformFees
                  ? pb("totalYouPay", "Total you pay")
                  : tq?.grandTotal || pb("grandTotalService", "Grand Total")}
              </Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(
                  showPlatformFees ? customerTotal : data.serviceTotal,
                )}
              </Text>
            </View>
          </View>

          {/* Info Note */}
          {showPlatformFees && (
            <View style={styles.infoNote}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#2B5EA7"
              />
              <Text style={styles.infoNoteText}>
                {pb(
                  "cardHoldNote",
                  "A temporary hold will be placed on your card. You will only be charged after you review and approve the completed service.",
                )}
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
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2B5EA7",
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  lineItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  lineItemName: {
    fontSize: 14,
    color: "#374151",
  },
  lineItemCode: {
    fontSize: 11,
    color: "#2B5EA7",
    marginTop: 1,
  },
  lineItemRight: {
    alignItems: "flex-end",
  },
  lineItemQty: {
    fontSize: 11,
    color: "#9ca3af",
  },
  lineItemAmount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  subtotalLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  subtotalValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  totalsSection: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  totalRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  totalLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  serviceSubtotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    marginTop: 4,
    paddingTop: 8,
  },
  serviceSubtotalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  serviceSubtotalValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 2,
    borderTopColor: "#2B5EA7",
    marginTop: 10,
    paddingTop: 12,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2B5EA7",
  },
  infoNote: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 8,
    alignItems: "flex-start",
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    color: "#1e40af",
    lineHeight: 18,
  },
});
