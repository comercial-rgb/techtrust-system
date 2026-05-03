/**
 * SubscriptionPlanScreen - Meu Plano / Assinatura
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
import { useI18n } from "../../i18n";
import { interpolate } from "../../i18n/interpolate";
import { useRoute } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import * as paymentService from "../../services/payment.service";
import { log } from "../../utils/logger";

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  popular?: boolean;
}

export default function SubscriptionPlanScreen({ navigation }: any) {
  const { t, formatDate, formatCurrency } = useI18n();
  const route = useRoute<any>();
  const fromDashboard = route.params?.fromDashboard;
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    "month",
  );
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [backendPlansData, setBackendPlansData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [endingTrial, setEndingTrial] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      log.debug("Loading subscription plans from API");
      // Load subscription and plans in parallel
      const [subscriptionData, plansResponse] = await Promise.all([
        paymentService.getMySubscription(),
        paymentService.getSubscriptionPlans(),
      ]);

      if (subscriptionData) {
        setCurrentSubscription(subscriptionData);
        setCurrentPlan(subscriptionData.plan?.toLowerCase() || "free");
      }

      // Process plans from backend
      const backendPlans = plansResponse || [];
      log.debug("Backend plans count:", backendPlans.length);
      if (backendPlans.length > 0) {
        // Store backend data for interval switching
        setBackendPlansData(backendPlans);

        const formattedPlans: Plan[] = backendPlans.map((p: any) => ({
          id: p.planKey || p.id,
          name: p.name,
          price:
            billingInterval === "month"
              ? Number(p.monthlyPrice)
              : Number(p.yearlyPrice),
          interval: billingInterval,
          features: Array.isArray(p.features) ? p.features : [],
          popular: p.isFeatured,
        }));
        setPlans(formattedPlans);
      } else {
        // Fallback to default plans
        setBackendPlansData([]);
        setPlans(getDefaultPlans());
      }
    } catch (error) {
      log.error("Error loading subscription plans", error);
      setBackendPlansData([]);
      setPlans(getDefaultPlans());
    } finally {
      setLoading(false);
    }
  };

  // Update prices when billing interval changes
  useEffect(() => {
    if (backendPlansData.length > 0) {
      // Update from backend data
      const formattedPlans: Plan[] = backendPlansData.map((p: any) => ({
        id: p.planKey || p.id,
        name: p.name,
        price:
          billingInterval === "month"
            ? Number(p.monthlyPrice)
            : Number(p.yearlyPrice),
        interval: billingInterval,
        features: Array.isArray(p.features) ? p.features : [],
        popular: p.isFeatured,
      }));
      setPlans(formattedPlans);
    } else if (plans.length > 0) {
      // Update from default plans
      setPlans(getDefaultPlans());
    }
  }, [billingInterval]);

  const getDefaultPlans = (): Plan[] => {
    const c = (t.customer || {}) as Record<string, string | undefined>;
    const m = (key: string, fallback: string) => c[key] || fallback;
    const vx = (n: string, amount: number) =>
      interpolate(
        m("subDefVehiclesExtra", "{{n}} vehicles (+{{extra}}/extra)"),
        { n, extra: formatCurrency(amount) },
      );
    return [
      {
        id: "free",
        name: m("subDefPlanFree", "Free"),
        price: 0,
        interval: billingInterval,
        features: [
          vx("2", 6.99),
          m("subDefFourRequestsMonth", "4 service requests/month"),
          m("subDefVinRecalls", "VIN decode & NHTSA recalls"),
          m("subDefFdacs", "FDACS compliance"),
          m("subDefPdfReceipts", "PDF receipts"),
        ],
      },
      {
        id: "starter",
        name: m("subDefPlanStarter", "Starter"),
        price: billingInterval === "month" ? 9.99 : 99.99,
        interval: billingInterval,
        features: [
          vx("3", 5.99),
          m("subDefTenRequestsMonth", "10 service requests/month"),
          m("subDefMultiLanguage", "Multi-language support"),
          m("subDefMileageTracker", "Mileage tracker"),
          m("subDefScheduledMaint", "Scheduled maintenance"),
          m("subDefQuoteSharing", "Quote sharing"),
          m("subDefOilYearIncluded", "1 oil change/year included"),
          m("subDefSosTenPct", "10% SOS savings"),
        ],
      },
      {
        id: "pro",
        name: m("subDefPlanPro", "Pro"),
        price: billingInterval === "month" ? 19.99 : 199.99,
        interval: billingInterval,
        popular: true,
        features: [
          vx("5", 3.99),
          m("subDefUnlimitedRequests", "Unlimited service requests"),
          m("subDefOemPartsLookup", "OEM parts lookup"),
          m("subDefDigitalWallet", "Digital wallet"),
          m("subDefExpenseReports", "Expense reports"),
          m("subDefObd2Basic", "OBD2 basic diagnostics"),
          m("subDefOilBrakeYear", "2 oil changes + 1 brake inspection/year"),
          m("subDefSosTwentyPriority", "20% SOS savings + priority"),
          m("subDefPriority247", "Priority support 24/7"),
        ],
      },
      {
        id: "enterprise",
        name: m("subDefPlanEnterprise", "Enterprise"),
        price: billingInterval === "month" ? 49.99 : 499.99,
        interval: billingInterval,
        features: [
          m("subDefFourteenVehiclesCustom", "14 vehicles (custom pricing)"),
          m("subDefUnlimitedRequests", "Unlimited service requests"),
          m("subDefVehicleDashboard", "Vehicle dashboard & analytics"),
          m("subDefObd2Advanced", "Advanced OBD2 diagnostics"),
          m("subDefOilInspectionsYear", "4 oil changes + unlimited inspections/year"),
          m("subDefSosTwoMonth", "2 SOS/month included + 30% savings"),
          m("subDefAllProIncluded", "All Pro features included"),
          m("subDefDedicatedManager", "Dedicated account manager"),
        ],
      },
    ];
  };

  const handleBack = () => {
    if (fromDashboard) {
      navigation.navigate("Home", { screen: "DashboardMain" });
    } else {
      navigation.goBack();
    }
  };

  const handleChangePlan = (plan: Plan) => {
    if (plan.id === currentPlan) return;

    Alert.alert(
      plan.price === 0
        ? t.customer?.downgradePlan || "Downgrade Plan"
        : t.customer?.upgradePlan || "Upgrade Plan",
      `${t.customer?.switchPlanConfirm || "Are you sure you want to switch to the"} ${plan.name} ${t.customer?.plan || "plan"}?`,
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t.common?.confirm || "Confirm",
          onPress: () => changePlan(plan),
        },
      ],
    );
  };

  const changePlan = async (plan: Plan) => {
    setChangingPlan(plan.id);
    try {
      const billingPeriod = billingInterval === "year" ? "yearly" : "monthly";

      if (plan.price === 0) {
        await paymentService.subscribe(plan.id, billingPeriod);
        await loadData();
        Alert.alert(
          t.common?.success || "Success",
          `${t.customer?.switchedToPlan || "You've switched to the"} ${plan.name} ${t.customer?.plan || "plan"}!`,
        );
        return;
      }

      if (currentPlan !== "free") {
        await paymentService.subscribe(plan.id, billingPeriod);
        await loadData();
        Alert.alert(
          t.common?.success || "Success",
          `${t.customer?.switchedToPlan || "You've switched to the"} ${plan.name} ${t.customer?.plan || "plan"}!`,
        );
        return;
      }

      const checkout = await paymentService.createSubscriptionCheckoutSession(
        plan.id,
        billingPeriod,
      );
      if (!checkout.checkoutUrl) {
        throw new Error("Checkout URL was not returned.");
      }

      await WebBrowser.openBrowserAsync(checkout.checkoutUrl);
      await loadData();
    } catch (error: any) {
      Alert.alert(
        t.common?.error || "Error",
        error.response?.data?.message ||
          error.message ||
          t.customer?.couldNotUpdateSubscription ||
          "Could not update subscription.",
      );
    } finally {
      setChangingPlan(null);
    }
  };

  const handleEndTrial = () => {
    Alert.alert(
      t.customer?.activatePlanTitle || "Activate Plan",
      t.customer?.activatePlanMessage || "End your trial and activate paid billing now?",
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t.common?.confirm || "Confirm",
          onPress: async () => {
            setEndingTrial(true);
            try {
              await paymentService.endSubscriptionTrial();
              await loadData();
              Alert.alert(
                t.common?.success || "Success",
                t.customer?.paidPlanActivated || "Paid plan activated.",
              );
            } catch (error: any) {
              Alert.alert(
                t.common?.error || "Error",
                error.response?.data?.message ||
                  error.message ||
                  t.customer?.couldNotActivatePlan ||
                  "Could not activate plan.",
              );
            } finally {
              setEndingTrial(false);
            }
          },
        },
      ],
    );
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      t.customer?.cancelSubscription || "Cancel Subscription",
      t.customer?.cancelSubscriptionConfirm ||
        "Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing cycle.",
      [
        {
          text: t.customer?.keepSubscription || "Keep Subscription",
          style: "cancel",
        },
        {
          text: t.customer?.cancelSubscription || "Cancel Subscription",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              t.customer?.subscriptionCancelled || "Subscription Cancelled",
              t.customer?.subscriptionEndDate ||
                "Your subscription will end on Feb 15, 2024.",
            ),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.customer?.subscriptionPlan || "Subscription Plan"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Current Plan Banner */}
        {loading ? (
          <View
            style={[
              styles.currentPlanBanner,
              {
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 30,
              },
            ]}
          >
            <ActivityIndicator size="small" color="#93c5fd" />
          </View>
        ) : (
          <View style={styles.currentPlanBanner}>
            <View style={styles.currentPlanInfo}>
              <View style={styles.currentPlanBadge}>
                <Ionicons name="diamond" size={16} color="#fff" />
                <Text style={styles.currentPlanBadgeText}>
                  {t.customer?.currentPlan || "Current Plan"}
                </Text>
              </View>
              <Text style={styles.currentPlanName}>
                {currentSubscription
                  ? `${currentSubscription.plan?.charAt(0)}${currentSubscription.plan?.slice(1).toLowerCase()}`
                  : "Free"}
              </Text>
              <Text style={styles.currentPlanPrice}>
                {currentSubscription && Number(currentSubscription.price) > 0
                  ? formatCurrency(Number(currentSubscription.price))
                  : formatCurrency(0)}
                <Text style={styles.currentPlanInterval}>/month</Text>
              </Text>
            </View>
            <View style={styles.currentPlanDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar" size={16} color="#93c5fd" />
                <Text style={styles.detailText}>
                  {currentSubscription?.currentPeriodEnd
                    ? `${t.customer?.renews || "Renews"}: ${formatDate(currentSubscription.currentPeriodEnd)}`
                    : (t.customer as any)?.noActiveSubscription ||
                      "No active subscription"}
                </Text>
              </View>
              {currentSubscription?.maxVehicles && (
                <View style={styles.detailRow}>
                  <Ionicons name="car" size={16} color="#93c5fd" />
                  <Text style={styles.detailText}>
                    {currentSubscription.maxVehicles}{" "}
                    {(t.customer as any)?.vehiclesAllowed || "vehicles allowed"}
                  </Text>
                </View>
              )}
              {currentSubscription?.isTrialActive && (
                <View style={styles.trialBox}>
                  <Text style={styles.trialText}>
                    Trial limits are active
                    {currentSubscription.trialEndsAt
                      ? ` ${t.customer?.trialUntil || "until"} ${formatDate(currentSubscription.trialEndsAt)}`
                      : ""}
                    . Activate now to unlock the full plan.
                  </Text>
                  <TouchableOpacity
                    style={styles.activateButton}
                    onPress={handleEndTrial}
                    disabled={endingTrial}
                  >
                    {endingTrial ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.activateButtonText}>Activate Now</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Billing Toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              billingInterval === "month" && styles.toggleOptionActive,
            ]}
            onPress={() => setBillingInterval("month")}
          >
            <Text
              style={[
                styles.toggleText,
                billingInterval === "month" && styles.toggleTextActive,
              ]}
            >
              {t.customer?.monthly || "Monthly"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              billingInterval === "year" && styles.toggleOptionActive,
            ]}
            onPress={() => setBillingInterval("year")}
          >
            <Text
              style={[
                styles.toggleText,
                billingInterval === "year" && styles.toggleTextActive,
              ]}
            >
              {t.customer?.yearly || "Yearly"}
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>
                {t.customer?.save17 || "Save 17%"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                plan.popular && styles.planCardPopular,
                plan.id === currentPlan && styles.planCardCurrent,
              ]}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text style={styles.popularBadgeText}>
                    {t.customer?.mostPopular || "Most Popular"}
                  </Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text
                  style={[
                    styles.planName,
                    plan.popular && styles.planNamePopular,
                  ]}
                >
                  {plan.name}
                </Text>
                <View style={styles.priceContainer}>
                  <Text
                    style={[
                      styles.planPrice,
                      plan.popular && styles.planPricePopular,
                    ]}
                  >
                    {plan.price === 0
                      ? t.common?.free || "Free"
                      : formatCurrency(plan.price)}
                  </Text>
                  {plan.price > 0 && (
                    <Text
                      style={[
                        styles.planInterval,
                        plan.popular && styles.planIntervalPopular,
                      ]}
                    >
                      /{billingInterval}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={plan.popular ? "#2B5EA7" : "#10b981"}
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.planButton,
                  plan.id === currentPlan && styles.planButtonCurrent,
                  plan.popular &&
                    plan.id !== currentPlan &&
                    styles.planButtonPopular,
                ]}
                onPress={() => handleChangePlan(plan)}
                disabled={plan.id === currentPlan || changingPlan !== null}
              >
                <Text
                  style={[
                    styles.planButtonText,
                    plan.id === currentPlan && styles.planButtonTextCurrent,
                    plan.popular &&
                      plan.id !== currentPlan &&
                      styles.planButtonTextPopular,
                  ]}
                >
                  {plan.id === currentPlan
                    ? t.customer?.currentPlan || "Current Plan"
                    : changingPlan === plan.id
                      ? t.common?.loading || "Loading..."
                    : plan.price === 0
                      ? t.customer?.downgrade || "Downgrade"
                      : t.customer?.upgrade || "Upgrade"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>
            {t.customer?.premiumBenefits || "Premium Benefits"}
          </Text>
          <View style={styles.benefitsGrid}>
            <View style={styles.benefitCard}>
              <View
                style={[styles.benefitIcon, { backgroundColor: "#dbeafe" }]}
              >
                <Ionicons name="flash" size={24} color="#2B5EA7" />
              </View>
              <Text style={styles.benefitLabel}>
                {t.customer?.priorityService || "Priority Service"}
              </Text>
            </View>
            <View style={styles.benefitCard}>
              <View
                style={[styles.benefitIcon, { backgroundColor: "#dcfce7" }]}
              >
                <Ionicons name="pricetag" size={24} color="#16a34a" />
              </View>
              <Text style={styles.benefitLabel}>
                {t.customer?.exclusiveDiscounts || "Exclusive Discounts"}
              </Text>
            </View>
            <View style={styles.benefitCard}>
              <View
                style={[styles.benefitIcon, { backgroundColor: "#fef3c7" }]}
              >
                <Ionicons name="car" size={24} color="#d97706" />
              </View>
              <Text style={styles.benefitLabel}>
                {t.customer?.roadsideAssist || "Roadside Assist"}
              </Text>
            </View>
            <View style={styles.benefitCard}>
              <View
                style={[styles.benefitIcon, { backgroundColor: "#fce7f3" }]}
              >
                <Ionicons name="headset" size={24} color="#db2777" />
              </View>
              <Text style={styles.benefitLabel}>
                {t.customer?.support247 || "24/7 Support"}
              </Text>
            </View>
          </View>
        </View>

        {/* Cancel Subscription */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelSubscription}
        >
          <Text style={styles.cancelButtonText}>
            {t.customer?.cancelSubscription || "Cancel Subscription"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  currentPlanBanner: {
    backgroundColor: "#2B5EA7",
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  currentPlanInfo: {
    marginBottom: 16,
  },
  currentPlanBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 4,
    marginBottom: 12,
  },
  currentPlanBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  currentPlanName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  currentPlanPrice: {
    fontSize: 24,
    fontWeight: "600",
    color: "#fff",
  },
  currentPlanInterval: {
    fontSize: 16,
    fontWeight: "400",
    color: "#93c5fd",
  },
  currentPlanDetails: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#bfdbfe",
  },
  trialBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    gap: 10,
  },
  trialText: {
    color: "#eff6ff",
    fontSize: 13,
    lineHeight: 18,
  },
  activateButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  activateButtonText: {
    color: "#2B5EA7",
    fontSize: 13,
    fontWeight: "700",
  },
  billingToggle: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
  },
  toggleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  toggleOptionActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6b7280",
  },
  toggleTextActive: {
    color: "#111827",
  },
  saveBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16a34a",
  },
  plansContainer: {
    padding: 16,
    gap: 16,
  },
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  planCardPopular: {
    borderColor: "#2B5EA7",
  },
  planCardCurrent: {
    borderColor: "#10b981",
  },
  popularBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2B5EA7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 4,
    marginBottom: 12,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  planNamePopular: {
    color: "#2B5EA7",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  planPrice: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
  },
  planPricePopular: {
    color: "#2B5EA7",
  },
  planInterval: {
    fontSize: 16,
    color: "#6b7280",
  },
  planIntervalPopular: {
    color: "#3b82f6",
  },
  featuresContainer: {
    gap: 10,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  planButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  planButtonCurrent: {
    backgroundColor: "#dcfce7",
  },
  planButtonPopular: {
    backgroundColor: "#2B5EA7",
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  planButtonTextCurrent: {
    color: "#16a34a",
  },
  planButtonTextPopular: {
    color: "#fff",
  },
  benefitsSection: {
    padding: 16,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  benefitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  benefitCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  benefitLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
  cancelButton: {
    marginHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#ef4444",
  },
});
