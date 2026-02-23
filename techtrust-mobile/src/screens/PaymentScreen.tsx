/**
 * PaymentScreen - Tela de Pagamento
 * Integrada com Stripe SDK para cobranças REAIS
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useConfirmPayment } from "@stripe/stripe-react-native";
import { useI18n } from "../i18n";
import * as paymentService from "../services/payment.service";

export default function PaymentScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const { confirmPayment: stripeConfirmPayment } = useConfirmPayment();
  const workOrderId = route.params?.workOrderId;
  const orderNumber = route.params?.orderNumber;
  const serviceTitle = route.params?.serviceTitle || "Service";
  const providerName = route.params?.providerName || "Provider";
  const amount = route.params?.amount || 0;

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [savedMethods, setSavedMethods] = useState<
    paymentService.PaymentMethod[]
  >([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] =
    useState<paymentService.CreatePaymentIntentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentData();
  }, []);

  async function loadPaymentData() {
    setLoading(true);
    setError(null);
    try {
      // Load saved payment methods
      const methods = await paymentService.getPaymentMethods();
      setSavedMethods(methods);

      // Select the default
      const defaultMethod = methods.find((m) => m.isDefault);
      if (defaultMethod) {
        setSelectedMethodId(defaultMethod.id);
      } else if (methods.length > 0) {
        setSelectedMethodId(methods[0].id);
      }

      // Create PaymentIntent
      if (workOrderId) {
        const intent = await paymentService.createPaymentIntent(
          workOrderId,
          defaultMethod?.id,
        );
        setPaymentIntent(intent);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to load payment data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayment() {
    if (!paymentIntent) {
      Alert.alert(
        t.common?.error || "Error",
        "No payment intent created. Please try again.",
      );
      return;
    }

    if (!selectedMethodId && savedMethods.length > 0) {
      Alert.alert(
        t.common?.error || "Error",
        t.payment?.selectMethod || "Please select a payment method",
      );
      return;
    }

    if (savedMethods.length === 0) {
      Alert.alert(
        t.payment?.noPaymentMethod || "No Payment Method",
        t.payment?.addPaymentMethodFirst ||
          "Please add a payment method first.",
        [
          { text: t.common?.cancel || "Cancel" },
          {
            text: t.payment?.addCard || "Add Card",
            onPress: () =>
              navigation.navigate("PaymentMethods", { addCardMode: true }),
          },
        ],
      );
      return;
    }

    setProcessing(true);
    try {
      // Find the selected payment method's Stripe ID
      const selectedMethod = savedMethods.find(
        (m) => m.id === selectedMethodId,
      );
      const stripePaymentMethodId = selectedMethod?.stripePaymentMethodId;

      if (!stripePaymentMethodId) {
        // This card was saved before Stripe integration — prompt user to re-add
        Alert.alert(
          "Card Update Required",
          "This card needs to be re-added for secure payments. Please add a new card.",
          [
            { text: t.common?.cancel || "Cancel" },
            {
              text: "Add Card",
              onPress: () =>
                navigation.navigate("PaymentMethods", { addCardMode: true }),
            },
          ],
        );
        return;
      }

      // ============================================
      // STRIPE CLIENT-SIDE CONFIRMATION (Real Payment)
      // ============================================
      // This places a HOLD on the customer's card via capture_method: 'manual'
      // The actual charge happens when provider calls "capture" after service
      const { paymentIntent: confirmedIntent, error: stripeError } =
        await stripeConfirmPayment(paymentIntent.clientSecret, {
          paymentMethodType: "Card",
          paymentMethodData: {
            paymentMethodId: stripePaymentMethodId,
          },
        });

      if (stripeError) {
        throw new Error(stripeError.message || "Payment authorization failed");
      }

      // Notify backend of successful pre-authorization
      const result = await paymentService.confirmPayment(
        paymentIntent.paymentId,
      );

      if (result.success) {
        Alert.alert(
          t.payment?.paymentConfirmed || "Payment Authorized!",
          "A hold has been placed on your card. You will only be charged after the service is completed.",
          [
            {
              text: t.common?.ok || "OK",
              onPress: () => navigation.navigate("Rating", { workOrderId }),
            },
          ],
        );
      } else {
        Alert.alert(
          t.payment?.paymentPending || "Payment Pending",
          result.message || "Payment is still being processed. Please wait.",
          [{ text: t.common?.ok || "OK" }],
        );
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Payment failed";
      Alert.alert(t.common?.error || "Error", msg);
    } finally {
      setProcessing(false);
    }
  }

  function getCardIcon(brand?: string | null): string {
    switch (brand?.toLowerCase()) {
      case "visa":
        return "card";
      case "mastercard":
        return "card";
      case "amex":
        return "card";
      default:
        return "card-outline";
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t.payment?.title || "Payment"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B5EA7" />
          <Text style={styles.loadingText}>
            {t.payment?.loadingPayment || "Preparing payment..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t.payment?.title || "Payment"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>{t.common?.error || "Error"}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadPaymentData}>
            <Text style={styles.retryText}>
              {t.common?.retry || "Try Again"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayAmount = paymentIntent?.totalAmount || amount;
  const breakdown = paymentIntent?.breakdown;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.payment?.title || "Payment"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Service Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{serviceTitle}</Text>
          <Text style={styles.summaryProvider}>{providerName}</Text>
          {orderNumber && (
            <Text style={styles.summaryOrder}>#{orderNumber}</Text>
          )}
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>
              {t.payment?.totalToPay || "Total to pay:"}
            </Text>
            <Text style={styles.amountValue}>${displayAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Breakdown */}
        {breakdown && (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>
              {t.payment?.breakdown || "Payment Breakdown"}
            </Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {t.payment?.serviceAmount || "Service"}
              </Text>
              <Text style={styles.breakdownValue}>
                ${breakdown.serviceAmount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {t.payment?.platformFee || "Platform fee"}
              </Text>
              <Text style={styles.breakdownValue}>
                ${breakdown.platformFee.toFixed(2)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {t.payment?.processingFee || "Processing fee"}
              </Text>
              <Text style={styles.breakdownValue}>
                ${breakdown.stripeFee.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownTotal]}>
              <Text style={styles.breakdownTotalLabel}>
                {t.payment?.total || "Total"}
              </Text>
              <Text style={styles.breakdownTotalValue}>
                ${breakdown.totalAmount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.providerReceives}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color="#6b7280"
              />
              <Text style={styles.providerReceivesText}>
                {t.payment?.providerReceives || "Provider receives"}: $
                {breakdown.providerWillReceive.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Saved Payment Methods */}
        <Text style={styles.sectionTitle}>
          {t.payment?.paymentMethod || "Payment Method"}
        </Text>

        {savedMethods.length === 0 ? (
          <View style={styles.noMethodsContainer}>
            <Ionicons name="card-outline" size={48} color="#9ca3af" />
            <Text style={styles.noMethodsText}>
              {t.payment?.noSavedMethods || "No saved payment methods"}
            </Text>
            <TouchableOpacity
              style={styles.addMethodBtn}
              onPress={() =>
                navigation.navigate("PaymentMethods", { addCardMode: true })
              }
            >
              <Ionicons name="add-circle" size={20} color="#2B5EA7" />
              <Text style={styles.addMethodBtnText}>
                {t.payment?.addPaymentMethod || "Add Payment Method"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.methodsContainer}>
            {savedMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodCard,
                  selectedMethodId === method.id && styles.methodCardSelected,
                ]}
                onPress={() => setSelectedMethodId(method.id)}
              >
                <Ionicons
                  name={
                    method.type === "pix"
                      ? "qr-code"
                      : (getCardIcon(method.cardBrand) as any)
                  }
                  size={24}
                  color={selectedMethodId === method.id ? "#2B5EA7" : "#6b7280"}
                />
                <View style={styles.methodInfo}>
                  {method.type === "pix" ? (
                    <Text
                      style={[
                        styles.methodLabel,
                        selectedMethodId === method.id &&
                          styles.methodLabelSelected,
                      ]}
                    >
                      PIX - {method.pixKey}
                    </Text>
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.methodLabel,
                          selectedMethodId === method.id &&
                            styles.methodLabelSelected,
                        ]}
                      >
                        {(method.cardBrand || method.type).toUpperCase()} ••••{" "}
                        {method.cardLast4}
                      </Text>
                      {method.cardExpMonth && method.cardExpYear && (
                        <Text style={styles.methodExpiry}>
                          Exp: {String(method.cardExpMonth).padStart(2, "0")}/
                          {String(method.cardExpYear).slice(-2)}
                        </Text>
                      )}
                    </>
                  )}
                  {method.isDefault && (
                    <Text style={styles.defaultBadge}>
                      {t.payment?.defaultMethod || "Default"}
                    </Text>
                  )}
                </View>
                {selectedMethodId === method.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#2B5EA7" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.addAnotherMethod}
              onPress={() =>
                navigation.navigate("PaymentMethods", { addCardMode: true })
              }
            >
              <Ionicons name="add" size={20} color="#2B5EA7" />
              <Text style={styles.addAnotherText}>
                {t.payment?.addAnother || "Add another method"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={20} color="#10b981" />
          <Text style={styles.securityText}>
            {t.payment?.securePayment ||
              "100% secure payment powered by Stripe"}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payBtn,
            (processing || savedMethods.length === 0) && styles.payBtnDisabled,
          ]}
          onPress={handlePayment}
          disabled={processing || savedMethods.length === 0}
        >
          {processing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.payText}>
                {t.payment?.processing || "Processing..."}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#fff" />
              <Text style={styles.payText}>
                {t.payment?.pay || "Pay"} ${displayAmount.toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: { fontSize: 16, color: "#6b7280" },
  // Error
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  errorTitle: { fontSize: 20, fontWeight: "700", color: "#ef4444" },
  errorText: { fontSize: 14, color: "#6b7280", textAlign: "center" },
  retryBtn: {
    backgroundColor: "#2B5EA7",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  // Summary
  summaryCard: {
    backgroundColor: "#2B5EA7",
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  summaryProvider: { fontSize: 14, color: "#bfdbfe", marginBottom: 4 },
  summaryOrder: { fontSize: 12, color: "#93c5fd", marginBottom: 12 },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: { fontSize: 14, color: "#bfdbfe" },
  amountValue: { fontSize: 28, fontWeight: "700", color: "#fff" },
  // Breakdown
  breakdownCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  breakdownLabel: { fontSize: 14, color: "#6b7280" },
  breakdownValue: { fontSize: 14, color: "#374151" },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 8,
    paddingTop: 12,
  },
  breakdownTotalLabel: { fontSize: 16, fontWeight: "700", color: "#111827" },
  breakdownTotalValue: { fontSize: 16, fontWeight: "700", color: "#111827" },
  providerReceives: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  providerReceivesText: { fontSize: 12, color: "#6b7280" },
  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  // No methods
  noMethodsContainer: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  noMethodsText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
    marginBottom: 16,
  },
  addMethodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addMethodBtnText: { color: "#2B5EA7", fontWeight: "600" },
  // Methods
  methodsContainer: { paddingHorizontal: 16, marginBottom: 16 },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  methodCardSelected: { borderColor: "#2B5EA7", backgroundColor: "#eff6ff" },
  methodInfo: { flex: 1, marginLeft: 12 },
  methodLabel: { fontSize: 16, color: "#374151" },
  methodLabelSelected: { color: "#2B5EA7", fontWeight: "600" },
  methodExpiry: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  defaultBadge: {
    fontSize: 11,
    color: "#10b981",
    fontWeight: "600",
    marginTop: 2,
  },
  addAnotherMethod: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  addAnotherText: { color: "#2B5EA7", fontWeight: "500" },
  // Security
  securityInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
  securityText: { fontSize: 13, color: "#6b7280" },
  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10b981",
    paddingVertical: 16,
    borderRadius: 12,
  },
  payBtnDisabled: { backgroundColor: "#9ca3af" },
  payText: { fontSize: 18, fontWeight: "700", color: "#fff" },
});
