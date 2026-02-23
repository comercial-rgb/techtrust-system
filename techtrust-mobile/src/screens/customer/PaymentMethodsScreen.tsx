/**
 * PaymentMethodsScreen - Gerenciamento de Formas de Pagamento
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CardField,
  useConfirmSetupIntent,
  CardFieldInput,
} from "@stripe/stripe-react-native";
import { useI18n } from "../../i18n";
import { useRoute, CommonActions } from "@react-navigation/native";
import api from "../../services/api";

// Storage keys
const PAYMENT_METHODS_KEY = "@TechTrust:paymentMethods";
const WALLET_BALANCE_KEY = "@TechTrust:walletBalance";
const TRANSACTIONS_KEY = "@TechTrust:walletTransactions";

interface PaymentMethod {
  id: string;
  type: "credit" | "debit" | "pix";
  brand?: string;
  cardBrand?: string;
  lastFour?: string;
  cardLast4?: string;
  holderName?: string;
  expiryDate?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  pixKey?: string;
  isDefault: boolean;
}

interface WalletTransaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  date: string;
}

export default function PaymentMethodsScreen({ navigation }: any) {
  const { t, language } = useI18n();
  const route = useRoute<any>();
  const fromDashboard = route.params?.fromDashboard;
  const fromCreateRequest = route.params?.fromCreateRequest;
  const addCardMode = route.params?.addCardMode;
  const { confirmSetupIntent } = useConfirmSetupIntent();

  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<
    WalletTransaction[]
  >([]);
  const [addBalanceAmount, setAddBalanceAmount] = useState("");
  const [addBalanceMethod, setAddBalanceMethod] = useState<
    "card" | "pix" | "transfer"
  >("card");

  // Stripe CardField state
  const [cardComplete, setCardComplete] = useState(false);

  // Card validation using Luhn algorithm
  const validateCardNumber = (cardNumber: string): boolean => {
    const cleaned = cardNumber.replace(/\D/g, "");
    if (cleaned.length < 13 || cleaned.length > 19) return false;

    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i));

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  };

  const validateExpiryDate = (expiryDate: string): boolean => {
    if (!expiryDate || expiryDate.length !== 5) return false;

    const [month, year] = expiryDate.split("/");
    const monthNum = parseInt(month);
    const yearNum = parseInt("20" + year);

    if (monthNum < 1 || monthNum > 12) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (yearNum < currentYear) return false;
    if (yearNum === currentYear && monthNum < currentMonth) return false;

    return true;
  };

  const validateCVV = (cvv: string): boolean => {
    return /^\d{3,4}$/.test(cvv);
  };

  const handleBack = () => {
    // If we came from CreateRequest, navigate back to it
    if (fromCreateRequest) {
      // Get the parent tab navigator and navigate to Home > CreateRequest
      const parent = navigation.getParent();
      if (parent) {
        // Navigate to Home with CreateRequest screen
        parent.navigate("Home", { screen: "CreateRequest" });
        // Pop Profile stack to ProfileMain
        navigation.popToTop();
      } else {
        navigation.goBack();
      }
    } else if (fromDashboard) {
      const parent = navigation.getParent();
      if (parent) {
        parent.navigate("Home", { screen: "DashboardMain" });
        navigation.popToTop();
      } else {
        navigation.goBack();
      }
    } else {
      navigation.goBack();
    }
  };

  const [formData, setFormData] = useState({
    type: "credit" as "credit" | "debit" | "pix",
    cardNumber: "",
    holderName: "",
    expiryDate: "",
    cvv: "",
    pixKey: "",
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);

      // Try loading from API first (cross-device sync)
      try {
        const response = await api.get("/payment-methods");
        const apiMethods = response.data?.data || [];
        // Map API fields to component fields
        const methods: PaymentMethod[] = apiMethods.map((m: any) => ({
          id: m.id,
          type: m.type || "credit",
          brand: m.cardBrand || m.brand,
          cardBrand: m.cardBrand,
          lastFour: m.cardLast4 || m.lastFour,
          cardLast4: m.cardLast4,
          holderName: m.holderName,
          expiryDate:
            m.cardExpMonth && m.cardExpYear
              ? `${String(m.cardExpMonth).padStart(2, "0")}/${String(m.cardExpYear).slice(-2)}`
              : m.expiryDate,
          cardExpMonth: m.cardExpMonth,
          cardExpYear: m.cardExpYear,
          pixKey: m.pixKey,
          isDefault: m.isDefault,
        }));
        setPaymentMethods(methods);
        // Cache to AsyncStorage for offline use
        await AsyncStorage.setItem(
          PAYMENT_METHODS_KEY,
          JSON.stringify(methods),
        );
      } catch (apiError) {
        console.log("API unavailable, loading from cache:", apiError);
        // Fallback to AsyncStorage
        const savedMethods = await AsyncStorage.getItem(PAYMENT_METHODS_KEY);
        if (savedMethods) {
          setPaymentMethods(JSON.parse(savedMethods));
        } else {
          setPaymentMethods([]);
        }
      }

      // Load wallet data from backend (cross-device sync)
      try {
        const walletResponse = await api.get("/wallet");
        const walletData = walletResponse.data?.data;
        if (walletData) {
          setWalletBalance(walletData.balance || 0);
          setRecentTransactions(walletData.transactions || []);
          // Cache locally for offline
          await AsyncStorage.setItem(
            WALLET_BALANCE_KEY,
            String(walletData.balance || 0),
          );
          await AsyncStorage.setItem(
            TRANSACTIONS_KEY,
            JSON.stringify(walletData.transactions || []),
          );
        }
      } catch (walletApiError) {
        console.log("Wallet API unavailable, loading from cache");
        // Fallback to local cache
        const [savedBalance, savedTransactions] = await Promise.all([
          AsyncStorage.getItem(WALLET_BALANCE_KEY),
          AsyncStorage.getItem(TRANSACTIONS_KEY),
        ]);
        if (savedBalance) setWalletBalance(parseFloat(savedBalance));
        else setWalletBalance(0);
        if (savedTransactions)
          setRecentTransactions(JSON.parse(savedTransactions));
        else setRecentTransactions([]);
      }
    } catch (error) {
      console.error("Error loading payment methods:", error);
      setPaymentMethods([]);
      setWalletBalance(0);
      setRecentTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      type: "credit",
      cardNumber: "",
      holderName: "",
      expiryDate: "",
      cvv: "",
      pixKey: "",
    });
    setShowModal(true);
  };

  const handleOpenAddBalanceModal = () => {
    setAddBalanceAmount("");
    setAddBalanceMethod("card");
    setShowAddBalanceModal(true);
  };

  const handleAddBalance = async () => {
    const amount = parseFloat(addBalanceAmount.replace(",", "."));
    if (!amount || amount <= 0) {
      Alert.alert(
        t.common?.error || "Error",
        t.customer?.enterValidAmount || "Please enter a valid amount.",
      );
      return;
    }
    if (amount < 10) {
      Alert.alert(
        t.common?.error || "Error",
        t.customer?.minimumAmount || "Minimum amount is $10.00.",
      );
      return;
    }
    if (amount > 1000) {
      Alert.alert(
        t.common?.error || "Error",
        "Maximum amount is $1,000.00 per transaction.",
      );
      return;
    }

    // For card payments, validate a card exists
    if (addBalanceMethod === "card") {
      const cardMethods = paymentMethods.filter(
        (pm) => pm.type === "credit" || pm.type === "debit",
      );
      if (cardMethods.length === 0) {
        Alert.alert(
          t.common?.error || "Error",
          "Please add a credit or debit card first.",
        );
        return;
      }
    }

    // Find card info for the confirmation dialog
    const defaultCard = paymentMethods.find((pm) => pm.isDefault && (pm.type === "credit" || pm.type === "debit"))
      || paymentMethods.find((pm) => pm.type === "credit" || pm.type === "debit");
    const cardLabel = defaultCard
      ? `${defaultCard.brand || defaultCard.type} ****${defaultCard.lastFour || "****"}`
      : "card";

    // Confirmation dialog
    Alert.alert(
      "Confirm Payment",
      `You're adding $${amount.toFixed(2)} using ${addBalanceMethod === "card" ? cardLabel : addBalanceMethod.toUpperCase()}. Confirm?`,
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t.common?.confirm || "Confirm",
          onPress: async () => {
            setSaving(true);
            try {
              const response = await api.post("/wallet/add-funds", {
                amount,
                method: addBalanceMethod,
                paymentMethodId: defaultCard?.id || undefined,
              });
              const data = response.data?.data;

              if (data) {
                setWalletBalance(data.balance);
                if (data.transaction) {
                  setRecentTransactions((prev) => [data.transaction, ...prev]);
                }
                await AsyncStorage.setItem(WALLET_BALANCE_KEY, String(data.balance));
              }

              setShowAddBalanceModal(false);
              setAddBalanceAmount("");
              Alert.alert(
                t.common?.success || "Success",
                `$${amount.toFixed(2)} added. New balance: $${(data?.balance || walletBalance + amount).toFixed(2)}`,
              );
            } catch (err: any) {
              const message = err?.response?.data?.message
                || t.common?.tryAgain
                || "Payment failed. Please try again.";
              Alert.alert(t.common?.error || "Error", message);
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (formData.type === "pix") {
      // PIX flow remains the same (no Stripe needed)
      if (!formData.pixKey) {
        Alert.alert(
          t.common?.error || "Error",
          t.customer?.enterPixKey || "Please enter your PIX key.",
        );
        return;
      }
      setSaving(true);
      try {
        const response = await api.post("/payment-methods", {
          type: "pix",
          pixKey: formData.pixKey,
        });
        const savedMethod = response.data?.data;
        if (savedMethod) {
          const newMethod: PaymentMethod = {
            id: savedMethod.id,
            type: "pix",
            pixKey: savedMethod.pixKey,
            isDefault: savedMethod.isDefault,
          };
          const updatedMethods = [...paymentMethods, newMethod];
          setPaymentMethods(updatedMethods);
          await AsyncStorage.setItem(
            PAYMENT_METHODS_KEY,
            JSON.stringify(updatedMethods),
          );
        }
        setShowModal(false);
        Alert.alert(
          t.common?.success || "Success",
          "PIX key added successfully.",
        );
      } catch (err: any) {
        Alert.alert(
          t.common?.error || "Error",
          err.response?.data?.message || "Failed to add PIX key.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    // ============================================
    // STRIPE CARD FLOW (PCI Compliant)
    // ============================================
    if (!cardComplete) {
      Alert.alert(
        t.common?.error || "Error",
        "Please fill in all card details.",
      );
      return;
    }

    setSaving(true);
    try {
      // Step 1: Get SetupIntent from backend
      const setupResponse = await api.post("/payments/setup-intent");
      const { clientSecret } = setupResponse.data?.data;

      if (!clientSecret) {
        throw new Error("Failed to create SetupIntent");
      }

      // Step 2: Confirm SetupIntent with Stripe SDK (handles 3D Secure, etc.)
      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        throw new Error(error.message || "Card verification failed");
      }

      if (!setupIntent?.paymentMethodId) {
        throw new Error("No payment method returned from Stripe");
      }

      // Step 3: Save to our backend (linked to Stripe paymentMethodId)
      const saveResponse = await api.post("/payment-methods/stripe", {
        stripePaymentMethodId: setupIntent.paymentMethodId,
      });

      const savedMethod = saveResponse.data?.data;
      if (savedMethod) {
        const newMethod: PaymentMethod = {
          id: savedMethod.id,
          type: savedMethod.type || "credit",
          brand: savedMethod.cardBrand,
          cardBrand: savedMethod.cardBrand,
          lastFour: savedMethod.cardLast4,
          cardLast4: savedMethod.cardLast4,
          holderName: savedMethod.holderName,
          expiryDate:
            savedMethod.cardExpMonth && savedMethod.cardExpYear
              ? `${String(savedMethod.cardExpMonth).padStart(2, "0")}/${String(savedMethod.cardExpYear).slice(-2)}`
              : undefined,
          cardExpMonth: savedMethod.cardExpMonth,
          cardExpYear: savedMethod.cardExpYear,
          isDefault: savedMethod.isDefault,
        };

        const updatedMethods = [...paymentMethods, newMethod];
        setPaymentMethods(updatedMethods);
        await AsyncStorage.setItem(
          PAYMENT_METHODS_KEY,
          JSON.stringify(updatedMethods),
        );
      }

      setShowModal(false);
      Alert.alert(
        t.common?.success || "Success",
        t.customer?.paymentMethodAdded || "Card added successfully!",
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Failed to add card";
      Alert.alert(t.common?.error || "Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    const updatedMethods = paymentMethods.map((m) => ({
      ...m,
      isDefault: m.id === methodId,
    }));
    setPaymentMethods(updatedMethods);
    await AsyncStorage.setItem(
      PAYMENT_METHODS_KEY,
      JSON.stringify(updatedMethods),
    );
    // Sync to API
    try {
      await api.patch(`/payment-methods/${methodId}/default`);
    } catch (error) {
      console.log("API set-default failed (local change kept):", error);
    }
  };

  const handleDelete = (methodId: string) => {
    Alert.alert(
      t.customer?.removePaymentMethod || "Remove Payment Method",
      t.customer?.removePaymentMethodConfirm ||
        "Are you sure you want to remove this payment method?",
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t.common?.remove || "Remove",
          style: "destructive",
          onPress: async () => {
            const updatedMethods = paymentMethods.filter(
              (m) => m.id !== methodId,
            );
            setPaymentMethods(updatedMethods);
            await AsyncStorage.setItem(
              PAYMENT_METHODS_KEY,
              JSON.stringify(updatedMethods),
            );
            // Sync to API
            try {
              await api.delete(`/payment-methods/${methodId}`);
            } catch (error) {
              console.log("API delete failed (local change kept):", error);
            }
          },
        },
      ],
    );
  };

  const getCardIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case "visa":
        return "card";
      case "mastercard":
        return "card";
      default:
        return "card-outline";
    }
  };

  const getCardColor = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case "visa":
        return "#1a1f71";
      case "mastercard":
        return "#eb001b";
      default:
        return "#6b7280";
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    return formatted.substring(0, 19);
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t.customer?.paymentMethods || "Payment Methods"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B5EA7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.customer?.paymentMethods || "Payment Methods"}
        </Text>
        <TouchableOpacity onPress={handleOpenModal} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#2B5EA7" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark" size={20} color="#2B5EA7" />
          <Text style={styles.infoBannerText}>
            {t.customer?.paymentInfoSecure ||
              "Your payment information is encrypted and secure"}
          </Text>
        </View>

        {/* Wallet Section */}
        <View style={styles.walletSection}>
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <View style={styles.walletIconContainer}>
                <Ionicons name="wallet" size={28} color="#2B5EA7" />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletLabel}>
                  {t.customer?.walletBalance || "Wallet Balance"}
                </Text>
                <Text style={styles.walletBalance}>
                  ${walletBalance.toFixed(2)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.addBalanceButton}
              onPress={handleOpenAddBalanceModal}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addBalanceButtonText}>
                {t.customer?.addBalance || "Add Balance"}
              </Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 && (
            <View style={styles.transactionsContainer}>
              <Text style={styles.transactionsTitle}>
                {t.customer?.recentTransactions || "Recent Transactions"}
              </Text>
              {recentTransactions.slice(0, 3).map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View
                    style={[
                      styles.transactionIcon,
                      {
                        backgroundColor:
                          transaction.type === "credit" ? "#dcfce7" : "#fee2e2",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        transaction.type === "credit"
                          ? "arrow-down"
                          : "arrow-up"
                      }
                      size={16}
                      color={
                        transaction.type === "credit" ? "#16a34a" : "#ef4444"
                      }
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {(() => {
                        try {
                          return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(transaction.date));
                        } catch {
                          return transaction.date;
                        }
                      })()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color:
                          transaction.type === "credit" ? "#16a34a" : "#ef4444",
                      },
                    ]}
                  >
                    {transaction.type === "credit" ? "+" : "-"}$
                    {transaction.amount.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Payment Methods Title */}
        <Text style={styles.sectionTitle}>
          {t.customer?.savedPaymentMethods || "Saved Payment Methods"}
        </Text>

        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="card-outline" size={64} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>
              {t.customer?.noPaymentMethods || "No payment methods"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t.customer?.addCardEasier ||
                "Add a card to make payments easier"}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleOpenModal}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>
                {t.customer?.addPaymentMethod || "Add Payment Method"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.methodsList}>
            {paymentMethods.map((method) => (
              <View key={method.id} style={styles.methodCard}>
                {method.type === "pix" ? (
                  <View style={styles.methodHeader}>
                    <View
                      style={[
                        styles.methodIcon,
                        { backgroundColor: "#d1fae5" },
                      ]}
                    >
                      <Text style={styles.pixIcon}>PIX</Text>
                    </View>
                    <View style={styles.methodInfo}>
                      <Text style={styles.methodTitle}>PIX</Text>
                      <Text style={styles.methodSubtitle}>{method.pixKey}</Text>
                    </View>
                    {method.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>
                          {t.common?.default || "Default"}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.methodHeader}>
                    <View
                      style={[
                        styles.methodIcon,
                        { backgroundColor: "#dbeafe" },
                      ]}
                    >
                      <Ionicons
                        name={
                          getCardIcon(method.brand || method.cardBrand) as any
                        }
                        size={24}
                        color={getCardColor(method.brand || method.cardBrand)}
                      />
                    </View>
                    <View style={styles.methodInfo}>
                      <View style={styles.methodTitleRow}>
                        <Text style={styles.methodTitle}>
                          {((method.brand || method.cardBrand) || '').replace(/^\w/, (c: string) => c.toUpperCase())}
                        </Text>
                        <View
                          style={[
                            styles.typeBadge,
                            {
                              backgroundColor:
                                method.type === "credit"
                                  ? "#dbeafe"
                                  : "#fef3c7",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.typeBadgeText,
                              {
                                color:
                                  method.type === "credit"
                                    ? "#2B5EA7"
                                    : "#92400e",
                              },
                            ]}
                          >
                            {method.type === "credit"
                              ? t.customer?.credit || "Credit"
                              : t.customer?.debit || "Debit"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.methodSubtitle}>
                        •••• •••• •••• {method.lastFour || method.cardLast4}
                      </Text>
                      <Text style={styles.methodExpiry}>
                        {t.customer?.expires || "Expires"}{" "}
                        {method.expiryDate ||
                          (method.cardExpMonth && method.cardExpYear
                            ? `${String(method.cardExpMonth).padStart(2, "0")}/${String(method.cardExpYear).slice(-2)}`
                            : "")}
                      </Text>
                    </View>
                    {method.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>
                          {t.common?.default || "Default"}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.methodActions}>
                  {!method.isDefault && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetDefault(method.id)}
                    >
                      <Ionicons name="star-outline" size={16} color="#2B5EA7" />
                      <Text style={styles.actionButtonText}>
                        {t.common?.setAsDefault || "Set as Default"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteActionButton]}
                    onPress={() => handleDelete(method.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    <Text
                      style={[styles.actionButtonText, { color: "#ef4444" }]}
                    >
                      {t.common?.remove || "Remove"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t.customer?.addPaymentMethod || "Add Payment Method"}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 50 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* D9 — Apple Pay / Google Pay Quick Add */}
              <View style={styles.digitalWalletSection}>
                <Text style={styles.digitalWalletTitle}>
                  {Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'}
                </Text>
                <Text style={styles.digitalWalletSubtitle}>
                  Pay faster with {Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.digitalWalletBtn,
                    { backgroundColor: Platform.OS === 'ios' ? '#000' : '#fff' }
                  ]}
                  onPress={() => {
                    Alert.alert(
                      Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay',
                      `${Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'} is available for payments. When checking out, select "Pay with ${Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'}" for a quick, secure transaction.`,
                      [{ text: 'Got It' }]
                    );
                  }}
                >
                  <Ionicons
                    name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google'}
                    size={20}
                    color={Platform.OS === 'ios' ? '#fff' : '#111827'}
                  />
                  <Text style={[
                    styles.digitalWalletBtnText,
                    { color: Platform.OS === 'ios' ? '#fff' : '#111827' }
                  ]}>
                    {Platform.OS === 'ios' ? ' Pay' : ' Pay'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.digitalWalletBadges}>
                  <View style={styles.securityBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#10b981" />
                    <Text style={styles.securityBadgeText}>Tokenized</Text>
                  </View>
                  <View style={styles.securityBadge}>
                    <Ionicons name="finger-print" size={12} color="#10b981" />
                    <Text style={styles.securityBadgeText}>Biometric</Text>
                  </View>
                  <View style={styles.securityBadge}>
                    <Ionicons name="lock-closed" size={12} color="#10b981" />
                    <Text style={styles.securityBadgeText}>Encrypted</Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
                <Text style={{ fontSize: 13, color: '#9ca3af' }}>or add manually</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
              </View>

              {/* Type Selection */}
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeOptions}>
                {[
                  {
                    type: "credit" as const,
                    label: "Credit Card",
                    icon: "card",
                  },
                  {
                    type: "debit" as const,
                    label: "Debit Card",
                    icon: "card-outline",
                  },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.typeOption,
                      formData.type === option.type && styles.typeOptionActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, type: option.type })
                    }
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={
                        formData.type === option.type ? "#2B5EA7" : "#6b7280"
                      }
                    />
                    <Text
                      style={[
                        styles.typeOptionText,
                        formData.type === option.type &&
                          styles.typeOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {formData.type !== "pix" ? (
                <>
                  <Text style={styles.inputLabel}>Card Details *</Text>
                  <CardField
                    postalCodeEnabled={false}
                    placeholders={{
                      number: "4242 4242 4242 4242",
                    }}
                    cardStyle={{
                      backgroundColor: "#f9fafb",
                      textColor: "#111827",
                      borderWidth: 1,
                      borderColor: "#d1d5db",
                      borderRadius: 8,
                      fontSize: 16,
                      placeholderColor: "#9ca3af",
                    }}
                    style={{
                      width: "100%",
                      height: 50,
                      marginBottom: 16,
                    }}
                    onCardChange={(cardDetails: CardFieldInput.Details) => {
                      setCardComplete(cardDetails.complete);
                    }}
                  />
                  <View style={styles.securityNote}>
                    <Ionicons
                      name="shield-checkmark"
                      size={16}
                      color="#22c55e"
                    />
                    <Text style={styles.securityNoteText}>
                      Card data goes directly to Stripe. We never see or store
                      your full card number.
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>PIX Key *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Email, phone, CPF or random key"
                    value={formData.pixKey}
                    onChangeText={(text) =>
                      setFormData({ ...formData, pixKey: text })
                    }
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? "Adding..." : "Add Payment Method"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Balance Modal */}
      <Modal
        visible={showAddBalanceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddBalanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t.customer?.addBalance || "Add Balance"}
              </Text>
              <TouchableOpacity onPress={() => setShowAddBalanceModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Amount Input */}
              <Text style={styles.inputLabel}>
                {t.customer?.amount || "Amount"} *
              </Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  value={addBalanceAmount}
                  onChangeText={setAddBalanceAmount}
                  keyboardType="decimal-pad"
                />
              </View>
              <Text style={styles.minimumAmountText}>
                {t.customer?.minimumAmountNote || "Minimum: $10.00"}
              </Text>

              {/* Quick Amount Buttons */}
              <View style={styles.quickAmountContainer}>
                {[25, 50, 100, 200].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickAmountButton}
                    onPress={() => setAddBalanceAmount(amount.toString())}
                  >
                    <Text style={styles.quickAmountText}>${amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Payment Method Selection */}
              <Text style={styles.inputLabel}>
                {t.customer?.paymentMethod || "Payment Method"}
              </Text>

              {/* Show saved card info when card is selected */}
              {addBalanceMethod === "card" && (() => {
                const defaultCard = paymentMethods.find((pm) => pm.isDefault && (pm.type === "credit" || pm.type === "debit"))
                  || paymentMethods.find((pm) => pm.type === "credit" || pm.type === "debit");
                return defaultCard ? (
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f0f9ff", padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: "#bfdbfe" }}>
                    <Ionicons name="card" size={20} color="#2B5EA7" />
                    <Text style={{ flex: 1, marginLeft: 10, fontSize: 14, color: "#1e3a5f", fontWeight: "500" }}>
                      {defaultCard.brand || "Card"} •••• {defaultCard.lastFour || "****"}
                    </Text>
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fef3c7", padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: "#fcd34d" }}>
                    <Ionicons name="warning" size={18} color="#d97706" />
                    <Text style={{ flex: 1, marginLeft: 10, fontSize: 13, color: "#92400e" }}>
                      No card on file. Please add a card first.
                    </Text>
                  </View>
                );
              })()}

              <View style={styles.balanceMethodOptions}>
                {[
                  {
                    type: "card" as const,
                    label: t.customer?.creditDebitCard || "Credit/Debit Card",
                    icon: "card",
                    available: true,
                  },
                  {
                    type: "transfer" as const,
                    label: t.customer?.bankTransfer || "Bank Transfer (ACH)",
                    icon: "swap-horizontal",
                    available: false,
                  },
                  ...(language === "pt" ? [{ type: "pix" as const, label: "PIX", icon: "qr-code" as const, available: false }] : []),
                ].map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.balanceMethodOption,
                      addBalanceMethod === option.type &&
                        styles.balanceMethodOptionActive,
                      !option.available && { opacity: 0.5 },
                    ]}
                    onPress={() => {
                      if (!option.available) {
                        Alert.alert(
                          "Coming Soon",
                          option.type === "pix"
                            ? "PIX payments are coming soon. Please use a credit or debit card."
                            : "Bank transfers take 1-3 business days that aren't instant. Please use a credit or debit card for instant top-ups.",
                        );
                        return;
                      }
                      setAddBalanceMethod(option.type);
                    }}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={24}
                      color={
                        addBalanceMethod === option.type ? "#2B5EA7" : "#6b7280"
                      }
                    />
                    <Text
                      style={[
                        styles.balanceMethodText,
                        addBalanceMethod === option.type &&
                          styles.balanceMethodTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {!option.available && (
                      <Text style={{ fontSize: 10, color: "#9ca3af", fontWeight: "600" }}>SOON</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleAddBalance}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving
                    ? t.common?.processing || "Processing..."
                    : t.customer?.addBalance || "Add Balance"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  addBtn: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#1e40af",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2B5EA7",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  methodsList: {
    padding: 16,
  },
  methodCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  methodHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  pixIcon: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10b981",
  },
  methodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  methodTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  methodSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
    fontFamily: "monospace",
  },
  methodExpiry: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    color: "#10b981",
    fontWeight: "600",
  },
  methodActions: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    color: "#2B5EA7",
    fontWeight: "500",
  },
  deleteActionButton: {
    marginLeft: "auto",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  inputLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  typeOptions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  typeOptionActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#2B5EA7",
  },
  typeOptionText: {
    fontSize: 14,
    color: "#6b7280",
  },
  typeOptionTextActive: {
    color: "#2B5EA7",
    fontWeight: "600",
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: "#2B5EA7",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Wallet Section Styles
  walletSection: {
    margin: 16,
  },
  walletCard: {
    backgroundColor: "#2B5EA7",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  walletHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  walletIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  walletInfo: {
    flex: 1,
  },
  walletLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  walletBalance: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
  },
  addBalanceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addBalanceButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  transactionsContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  transactionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: "#9ca3af",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  // Add Balance Modal Styles
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "600",
    color: "#374151",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: "#111827",
    paddingVertical: 16,
  },
  minimumAmountText: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 16,
  },
  quickAmountContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  quickAmountButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    alignItems: "center",
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  balanceMethodOptions: {
    gap: 12,
    marginBottom: 20,
  },
  balanceMethodOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    gap: 12,
  },
  balanceMethodOptionActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#2B5EA7",
  },
  balanceMethodText: {
    fontSize: 15,
    color: "#374151",
  },
  balanceMethodTextActive: {
    color: "#2B5EA7",
    fontWeight: "600",
  },
  pixInstructions: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginBottom: 20,
  },
  pixQRPlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: "#fff",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  pixQRText: {
    fontSize: 14,
    color: "#2B5EA7",
    fontWeight: "500",
    marginTop: 8,
  },
  pixNote: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  transferInstructions: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  transferTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  transferDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  transferLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  transferValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  transferNote: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 12,
    lineHeight: 18,
  },
  // D9 — Digital Wallet (Apple Pay / Google Pay)
  digitalWalletSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 4,
  },
  digitalWalletTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  digitalWalletSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  digitalWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    gap: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 200,
    marginBottom: 16,
  },
  digitalWalletBtnText: {
    fontSize: 18,
    fontWeight: '600',
  },
  digitalWalletBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  securityBadgeText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '500',
  },
});
