/**
 * MarketplaceOnboardingScreen — Interactive post-registration onboarding for Car Wash / Auto Parts businesses
 * Steps: Welcome → Business Hours → Business Bio → Done
 * Does NOT repeat data from signup (business name, type, state, city, plan, address).
 * Each step saves immediately and tracks completion in AsyncStorage.
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../i18n";
import api from "../../services/api";

// ─── Step IDs ─────────────────────────────────────────────────────────────────
const STEP_IDS = ["welcome", "hours", "description", "done"] as const;
type StepId = (typeof STEP_IDS)[number];

const STEP_COLORS: Record<StepId, string> = {
  welcome:     "#0891b2",
  hours:       "#d97706",
  description: "#7c3aed",
  done:        "#10b981",
};

const STEP_BG: Record<StepId, string> = {
  welcome:     "#cffafe",
  hours:       "#fef3c7",
  description: "#ede9fe",
  done:        "#d1fae5",
};

const STEPS_KEY_PREFIX = "@TechTrust:onboarding:steps:";

async function markStepDone(userId: string, stepId: StepId) {
  const key = STEPS_KEY_PREFIX + userId;
  const raw = await AsyncStorage.getItem(key);
  const done: string[] = raw ? JSON.parse(raw) : [];
  if (!done.includes(stepId)) {
    await AsyncStorage.setItem(key, JSON.stringify([...done, stepId]));
  }
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
interface DaySchedule {
  day: string;
  dayShort: string;
  enabled: boolean;
  openTime: string;
  closeTime: string;
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: "Monday",    dayShort: "Mon", enabled: true,  openTime: "08:00", closeTime: "18:00" },
  { day: "Tuesday",   dayShort: "Tue", enabled: true,  openTime: "08:00", closeTime: "18:00" },
  { day: "Wednesday", dayShort: "Wed", enabled: true,  openTime: "08:00", closeTime: "18:00" },
  { day: "Thursday",  dayShort: "Thu", enabled: true,  openTime: "08:00", closeTime: "18:00" },
  { day: "Friday",    dayShort: "Fri", enabled: true,  openTime: "08:00", closeTime: "18:00" },
  { day: "Saturday",  dayShort: "Sat", enabled: true,  openTime: "08:00", closeTime: "16:00" },
  { day: "Sunday",    dayShort: "Sun", enabled: false, openTime: "10:00", closeTime: "14:00" },
];

const TIME_OPTIONS = [
  "06:00","07:00","08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00",
];

export default function MarketplaceOnboardingScreen({ navigation }: any) {
  const { user, completeOnboarding } = useAuth();
  const { t } = useI18n();
  const mo = t.marketplaceOnboarding;
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Hours state ──
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<"openTime" | "closeTime">("openTime");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hoursSaving, setHoursSaving] = useState(false);

  // ── Description state ──
  const [description, setDescription] = useState("");
  const [descSaving, setDescSaving] = useState(false);

  const stepId = STEP_IDS[currentStep];
  const color = STEP_COLORS[stepId];
  const bgColor = STEP_BG[stepId];
  const totalSteps = STEP_IDS.length;
  const progress = (currentStep + 1) / totalSteps;

  // ── Transition ────────────────────────────────────────────────────────────
  const animateTransition = (next: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setCurrentStep(next);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => { if (currentStep < totalSteps - 1) animateTransition(currentStep + 1); };
  const goBack = () => { if (currentStep > 0) animateTransition(currentStep - 1); };

  const handleSkip = () => {
    Alert.alert(
      t.provider?.skipSetupTitle || "Skip Setup?",
      t.marketplaceOnboarding?.skipSetupBody ||
        "You can complete these settings later from your Profile.",
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t.provider?.skipAnywayOnboarding || "Skip Anyway",
          style: "destructive",
          onPress: () => completeOnboarding(),
        },
      ],
    );
  };

  // ── Save hours ─────────────────────────────────────────────────────────────
  const saveHours = async () => {
    try {
      setHoursSaving(true);
      const businessHours = schedule.reduce((acc, d) => {
        acc[d.day] = { enabled: d.enabled, openTime: d.openTime, closeTime: d.closeTime };
        return acc;
      }, {} as Record<string, any>);
      await api.patch("/providers/profile", { businessHours });
      if (user) await markStepDone(user.id, "hours");
      goNext();
    } catch {
      Alert.alert(
        t.common?.error || "Error",
        t.provider?.saveBusinessHoursFailed ||
          "Could not save business hours. Please try again.",
      );
    } finally {
      setHoursSaving(false);
    }
  };

  // ── Save description ───────────────────────────────────────────────────────
  const saveDescription = async () => {
    if (!description.trim()) { goNext(); return; }
    try {
      setDescSaving(true);
      await api.patch("/providers/profile", { businessDescription: description.trim() });
      if (user) await markStepDone(user.id, "description");
      goNext();
    } catch {
      Alert.alert(
        t.common?.error || "Error",
        t.provider?.saveBusinessDescriptionFailed ||
          "Could not save description. Please try again.",
      );
    } finally {
      setDescSaving(false);
    }
  };

  const finishOnboarding = async () => {
    await completeOnboarding();
  };

  // ─── Step Renderers ────────────────────────────────────────────────────────

  const renderWelcome = () => (
    <View style={styles.stepBody}>
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name="store-check" size={60} color={color} />
      </View>
      <Text style={styles.title}>
        {t.onboarding?.welcomeTitle || "Welcome to TechTrust!"}
      </Text>
      <Text style={styles.subtitle}>
        {mo?.welcomeSubtitle ||
          "Your marketplace listing is under review. Let's take 2 minutes to set up your profile so customers can find you and know when to visit."}
      </Text>

      <View style={styles.reviewBanner}>
        <MaterialCommunityIcons name="clock-alert" size={20} color="#1d4ed8" />
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewBannerTitle}>
            {mo?.listingUnderReviewTitle || "Listing Under Review"}
          </Text>
          <Text style={styles.reviewBannerText}>
            {mo?.listingUnderReviewBody ||
              "Our team verifies all marketplace listings before they go live. You'll receive a notification once your listing is approved (typically 1–2 business days)."}
          </Text>
        </View>
      </View>

      <View style={styles.benefitList}>
        {[
          {
            icon: "clock-time-four",
            text: mo?.benefitHours || "Set your opening hours so customers know when you're open",
          },
          {
            icon: "text-box-edit",
            text: mo?.benefitBio || "Write a bio to stand out from other listings",
          },
          {
            icon: "star",
            text: mo?.benefitVerified || "Verified listings appear higher in search results",
          },
          {
            icon: "bell",
            text: mo?.benefitNotifications || "Receive booking and review notifications in real time",
          },
        ].map((b, i) => (
          <View key={i} style={styles.benefitRow}>
            <View style={[styles.benefitIcon, { backgroundColor: bgColor }]}>
              <MaterialCommunityIcons name={b.icon as any} size={16} color={color} />
            </View>
            <Text style={styles.benefitText}>{b.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderHours = () => (
    <View style={styles.stepBody}>
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name="clock-time-four" size={60} color={color} />
      </View>
      <Text style={styles.title}>
        {mo?.openingHoursTitle || "Opening Hours"}
      </Text>
      <Text style={styles.subtitle}>
        {mo?.openingHoursSubtitle ||
          "Show customers when they can visit. Businesses with visible hours get significantly more walk-ins and bookings."}
      </Text>

      <View style={styles.impactBox}>
        <MaterialCommunityIcons name="lightbulb-outline" size={16} color={color} />
        <Text style={styles.impactText}>
          {mo?.hoursImpactText ||
            'If you skip this: Your listing shows "Hours not set" — customers may choose a competitor with visible hours.'}
        </Text>
      </View>

      <View style={styles.scheduleList}>
        {schedule.map((day, index) => (
          <View key={day.day} style={styles.scheduleRow}>
            <TouchableOpacity
              style={styles.dayToggle}
              onPress={() => {
                const s = [...schedule];
                s[index] = { ...s[index], enabled: !s[index].enabled };
                setSchedule(s);
              }}
            >
              <View style={[styles.dayCheck, day.enabled && { backgroundColor: color }]}>
                {day.enabled && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={[styles.dayName, !day.enabled && { color: "#9ca3af" }]}>{day.dayShort}</Text>
            </TouchableOpacity>

            {day.enabled ? (
              <View style={styles.timeRow}>
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => { setEditingDay(index); setEditingField("openTime"); setShowTimePicker(true); }}
                >
                  <Text style={styles.timeBtnText}>{day.openTime}</Text>
                </TouchableOpacity>
                <Text style={styles.timeSep}>–</Text>
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => { setEditingDay(index); setEditingField("closeTime"); setShowTimePicker(true); }}
                >
                  <Text style={styles.timeBtnText}>{day.closeTime}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.closedText}>
                {mo?.closed || "Closed"}
              </Text>
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: color }]} onPress={saveHours} disabled={hoursSaving}>
        {hoursSaving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>
              {mo?.saveOpeningHours || "Save Opening Hours"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Time Picker Modal */}
      <Modal visible={showTimePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingField === "openTime"
                  ? mo?.openingTime || "Opening Time"
                  : mo?.closingTime || "Closing Time"}
              </Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {TIME_OPTIONS.map((timeOpt) => {
                const isSelected = editingDay !== null && schedule[editingDay][editingField] === timeOpt;
                return (
                  <TouchableOpacity
                    key={timeOpt}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => {
                      if (editingDay === null) return;
                      const s = [...schedule];
                      s[editingDay] = { ...s[editingDay], [editingField]: timeOpt };
                      setSchedule(s);
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, isSelected && { color, fontWeight: "700" }]}>{timeOpt}</Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color={color} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderDescription = () => (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
      <View style={styles.stepBody}>
        <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
          <MaterialCommunityIcons name="text-box-edit" size={60} color={color} />
        </View>
        <Text style={styles.title}>
          {mo?.tellYourStoryTitle || "Tell Your Story"}
        </Text>
        <Text style={styles.subtitle}>
          {mo?.tellYourStorySubtitle ||
            "A compelling description helps customers choose you over competitors. Share what makes your business special."}
        </Text>

        <View style={styles.impactBox}>
          <MaterialCommunityIcons name="lightbulb-outline" size={16} color={color} />
          <Text style={styles.impactText}>
            {mo?.descriptionImpactText ||
              "Listings with a description receive 3× more views and 2× more bookings. Customers want to know what to expect."}
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            {mo?.businessDescriptionOptional || "Business Description (optional)"}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={
              mo?.descriptionPlaceholder ||
              'e.g. "Family-owned car wash in Miami since 2010. We offer express washes, full detailing, and monthly unlimited wash memberships. Eco-friendly soaps and fast service — in and out in 15 minutes!"'
            }
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        <View style={styles.bioTips}>
          <Text style={styles.bioTipsTitle}>
            {mo?.descriptionTipsTitle || "What customers want to know:"}
          </Text>
          {[
            mo?.descriptionTip1 || "How long you've been in business",
            mo?.descriptionTip2 || "What services or packages you offer",
            mo?.descriptionTip3 || "What makes you different (speed, eco-friendly, price, etc.)",
            mo?.descriptionTip4 || "Any loyalty programs, memberships, or special deals",
          ].map((tip, i) => (
            <View key={i} style={styles.bioTipRow}>
              <View style={[styles.bioTipDot, { backgroundColor: color }]} />
              <Text style={styles.bioTipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: color }]}
          onPress={saveDescription}
          disabled={descSaving}
        >
          {descSaving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>
                {description.trim()
                  ? mo?.saveDescription || "Save Description"
                  : mo?.skipForNow || "Skip for Now"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderDone = () => (
    <View style={styles.stepBody}>
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name="check-circle" size={60} color={color} />
      </View>
      <Text style={styles.title}>
        {mo?.youreReadyTitle || "You're Ready!"}
      </Text>
      <Text style={styles.subtitle}>
        {mo?.youreReadySubtitle ||
          "Your listing is set up. Once approved by our team, customers will find you on the TechTrust marketplace map."}
      </Text>

      <View style={styles.reviewBanner}>
        <MaterialCommunityIcons name="clock-alert-outline" size={20} color="#1d4ed8" />
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewBannerTitle}>
            {mo?.whatHappensNextTitle || "What Happens Next"}
          </Text>
          <Text style={styles.reviewBannerText}>
            {mo?.whatHappensNextBody ||
              "1. Our team reviews your listing (1–2 business days)\n2. You'll get a push notification when approved\n3. Customers can find and visit your business on the map\n4. You can manage services, pricing, and reviews from your dashboard"}
          </Text>
        </View>
      </View>

      <View style={styles.doneCard}>
        <Text style={styles.doneCardTitle}>
          {mo?.whileYouWaitTitle || "While you wait, you can:"}
        </Text>
        {[
          {
            icon: "image-multiple",
            text: mo?.whileWaitPhoto || "Add photos of your business and services",
          },
          {
            icon: "cash-multiple",
            text: mo?.whileWaitPayout || "Set up your payout method in Profile → Payouts",
          },
          {
            icon: "tag",
            text: mo?.whileWaitPricing || "Configure your services and pricing",
          },
          {
            icon: "star-circle",
            text: mo?.whileWaitReview || "Ask your first customers to leave a review",
          },
        ].map((item, i) => (
          <View key={i} style={styles.doneRow}>
            <View style={[styles.doneIcon, { backgroundColor: STEP_BG.done }]}>
              <MaterialCommunityIcons name={item.icon as any} size={16} color={STEP_COLORS.done} />
            </View>
            <Text style={styles.doneRowText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderStep = () => {
    switch (stepId) {
      case "welcome":     return renderWelcome();
      case "hours":       return renderHours();
      case "description": return renderDescription();
      case "done":        return renderDone();
    }
  };

  const isFirst = currentStep === 0;
  const isLast = currentStep === STEP_IDS.length - 1;
  const hasSaveBtn = stepId === "hours" || stepId === "description";

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {!isFirst ? (
            <TouchableOpacity onPress={goBack} style={styles.backBtnHeader}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
            </TouchableOpacity>
          ) : <View style={styles.backBtnHeader} />}
        </View>
        <Text style={styles.headerCounter}>{currentStep + 1} / {totalSteps}</Text>
        <TouchableOpacity style={styles.skipHeaderBtn} onPress={handleSkip}>
          <Text style={styles.skipHeaderText}>
            {mo?.skipAll || "Skip all"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
          {renderStep()}
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {!isFirst && (
          <TouchableOpacity style={styles.footerBackBtn} onPress={goBack}>
            <Ionicons name="arrow-back" size={18} color="#6b7280" />
            <Text style={styles.footerBackText}>
              {mo?.back || "Back"}
            </Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />

        {isLast ? (
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: color }]} onPress={finishOnboarding}>
            <Text style={styles.nextBtnText}>
              {mo?.goToDashboard || "Go to Dashboard"}
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        ) : hasSaveBtn ? (
          <TouchableOpacity style={styles.skipStepBtn} onPress={goNext}>
            <Text style={styles.skipStepText}>
              {mo?.skipThisStep || "Skip this step"}
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: color }]} onPress={goNext}>
            <Text style={styles.nextBtnText}>
              {isFirst ? mo?.letsStart || "Let's Start" : mo?.next || "Next"}
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeft: { width: 60 },
  backBtnHeader: { padding: 8, width: 40 },
  headerCounter: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  skipHeaderBtn: { width: 60, alignItems: "flex-end", padding: 8 },
  skipHeaderText: { fontSize: 13, color: "#9ca3af", fontWeight: "500" },
  progressBarBg: { height: 4, backgroundColor: "#e5e7eb", marginHorizontal: 16, borderRadius: 2 },
  progressBarFill: { height: 4, borderRadius: 2 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  stepBody: { alignItems: "center", width: "100%" },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", textAlign: "center", marginBottom: 10 },
  subtitle: { fontSize: 15, lineHeight: 22, color: "#6b7280", textAlign: "center", marginBottom: 18, paddingHorizontal: 4 },
  reviewBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 14,
    width: "100%",
    marginBottom: 20,
  },
  reviewBannerTitle: { fontSize: 14, fontWeight: "700", color: "#1d4ed8", marginBottom: 4 },
  reviewBannerText: { fontSize: 13, color: "#1e40af", lineHeight: 18 },
  benefitList: { width: "100%", gap: 10, marginBottom: 8 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  benefitIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  benefitText: { flex: 1, fontSize: 14, color: "#374151", fontWeight: "500" },
  impactBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    width: "100%",
    marginBottom: 16,
  },
  impactText: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 18 },
  // Schedule
  scheduleList: { width: "100%", gap: 6, marginBottom: 20 },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dayToggle: { flexDirection: "row", alignItems: "center", gap: 10, width: 70 },
  dayCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
  },
  dayName: { fontSize: 14, fontWeight: "600", color: "#374151" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeBtn: { backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  timeBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  timeSep: { fontSize: 14, color: "#9ca3af" },
  closedText: { fontSize: 13, color: "#9ca3af", fontStyle: "italic" },
  // Description
  fieldGroup: { width: "100%", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#fafafa",
  },
  textArea: { minHeight: 110, paddingTop: 12 },
  charCount: { fontSize: 12, color: "#9ca3af", textAlign: "right", marginTop: 4 },
  bioTips: {
    backgroundColor: "#faf5ff",
    borderRadius: 12,
    padding: 14,
    width: "100%",
    gap: 8,
    marginBottom: 16,
  },
  bioTipsTitle: { fontSize: 13, fontWeight: "700", color: "#7c3aed", marginBottom: 4 },
  bioTipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bioTipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  bioTipText: { flex: 1, fontSize: 13, color: "#374151" },
  // Done card
  doneCard: { backgroundColor: "#f0fdf4", borderRadius: 16, padding: 20, width: "100%", gap: 12 },
  doneCardTitle: { fontSize: 15, fontWeight: "700", color: "#065f46", marginBottom: 4 },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  doneIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  doneRowText: { flex: 1, fontSize: 14, color: "#047857", fontWeight: "500" },
  // Save button
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: "100%",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  footerBackBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 10, paddingHorizontal: 6 },
  footerBackText: { fontSize: 15, color: "#6b7280", fontWeight: "500" },
  skipStepBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 10, paddingHorizontal: 6 },
  skipStepText: { fontSize: 15, color: "#9ca3af", fontWeight: "500" },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  modalItemSelected: { backgroundColor: "#f5f3ff" },
  modalItemText: { fontSize: 15, color: "#374151" },
});
