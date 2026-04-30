/**
 * ProviderOnboardingScreen — Interactive post-registration onboarding
 * Steps: Welcome → Upload License → Upload Insurance → Service Radius → Business Hours → Description → Mobile Service → Done
 * Does NOT repeat data from signup (business name, address, services, insurance toggle, payout).
 * Each step saves data immediately and tracks completion in AsyncStorage.
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
  Switch,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";

// ─── Step IDs ─────────────────────────────────────────────────────────────────
const STEP_IDS = [
  "welcome",
  "license",
  "insurance",
  "radius",
  "hours",
  "description",
  "mobile",
  "done",
] as const;
type StepId = (typeof STEP_IDS)[number];

const STEP_COLORS: Record<StepId, string> = {
  welcome: "#2B5EA7",
  license: "#7c3aed",
  insurance: "#0f766e",
  radius: "#0891b2",
  hours: "#d97706",
  description: "#be185d",
  mobile: "#16a34a",
  done: "#10b981",
};

const STEP_BG: Record<StepId, string> = {
  welcome: "#dbeafe",
  license: "#ede9fe",
  insurance: "#ccfbf1",
  radius: "#cffafe",
  hours: "#fef3c7",
  description: "#fce7f3",
  mobile: "#dcfce7",
  done: "#d1fae5",
};

const STEP_ICONS: Record<StepId, string> = {
  welcome: "hand-wave",
  license: "certificate",
  insurance: "shield-check",
  radius: "map-marker-radius",
  hours: "clock-time-four",
  description: "text-box-edit",
  mobile: "car-wrench",
  done: "check-circle",
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

// ─── Day schedule type ─────────────────────────────────────────────────────────
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
  { day: "Saturday",  dayShort: "Sat", enabled: true,  openTime: "08:00", closeTime: "12:00" },
  { day: "Sunday",    dayShort: "Sun", enabled: false, openTime: "09:00", closeTime: "13:00" },
];

const TIME_OPTIONS = [
  "06:00","07:00","08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00",
];

const to12h = (time: string): string => {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${mStr} ${ampm}`;
};

export default function ProviderOnboardingScreen({ navigation }: any) {
  const { user, completeOnboarding } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Upload state ──
  const [uploading, setUploading] = useState(false);
  const [licenseUploads, setLicenseUploads] = useState<string[]>([]);
  const [insuranceUploads, setInsuranceUploads] = useState<string[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState("image/jpeg");
  const [previewName, setPreviewName] = useState("photo.jpg");
  const [previewTarget, setPreviewTarget] = useState<"license" | "insurance">("license");

  // ── Radius state (miles) ──
  const [serviceRadius, setServiceRadius] = useState(30);
  const [radiusSaving, setRadiusSaving] = useState(false);
  const [radiusDone, setRadiusDone] = useState(false);

  // ── Hours state ──
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<"openTime" | "closeTime">("openTime");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursDone, setHoursDone] = useState(false);

  // ── Description state ──
  const [description, setDescription] = useState("");
  const [descSaving, setDescSaving] = useState(false);
  const [descDone, setDescDone] = useState(false);

  // ── Mobile service state ──
  const [mobileService, setMobileService] = useState(false);
  const [freeMiles, setFreeMiles] = useState(0);
  const [feePerMile, setFeePerMile] = useState("");
  const [mobileSaving, setMobileSaving] = useState(false);
  const [mobileDone, setMobileDone] = useState(false);

  const stepId = STEP_IDS[currentStep];
  const color = STEP_COLORS[stepId];
  const bgColor = STEP_BG[stepId];
  const totalSteps = STEP_IDS.length;

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

  const goNext = () => {
    if (currentStep < totalSteps - 1) animateTransition(currentStep + 1);
  };
  const goBack = () => {
    if (currentStep > 0) animateTransition(currentStep - 1);
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip Setup?",
      "You can complete these steps later from your Profile. Your account may have limited visibility until documents are verified.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Skip Anyway", style: "destructive", onPress: () => completeOnboarding() },
      ]
    );
  };

  // ── Upload helpers ─────────────────────────────────────────────────────────
  const handleUploadTap = (target: "license" | "insurance") => {
    setPreviewTarget(target);
    Alert.alert("Upload Document", "How would you like to add your document?", [
      { text: "Take Photo", onPress: () => handleCamera(target) },
      { text: "Choose File", onPress: () => handleFilePicker(target) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleCamera = async (target: "license" | "insurance") => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera access is required to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setPreviewUri(asset.uri);
      setPreviewMime(asset.mimeType || "image/jpeg");
      setPreviewName(asset.fileName || `photo_${Date.now()}.jpg`);
      setPreviewTarget(target);
    }
  };

  const handleFilePicker = async (target: "license" | "insurance") => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const file = result.assets[0];
      if (file.mimeType === "application/pdf") {
        await uploadFile(file.uri, file.mimeType, file.name || "document.pdf", target);
      } else {
        setPreviewUri(file.uri);
        setPreviewMime(file.mimeType || "image/jpeg");
        setPreviewName(file.name || "document.jpg");
        setPreviewTarget(target);
      }
    }
  };

  const uploadFile = async (uri: string, mimeType: string, fileName: string, target: "license" | "insurance") => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("image", { uri, type: mimeType || "image/jpeg", name: fileName } as any);
      const res = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const url = res.data?.imageUrl || res.data?.url;
      if (!url) throw new Error("No URL returned");

      if (target === "license") {
        const newUploads = [...licenseUploads, url];
        setLicenseUploads(newUploads);
        await api.post("/compliance", { type: "STATE_SHOP_REGISTRATION", documentUploads: newUploads }).catch(() => {});
        if (user) await markStepDone(user.id, "license");
      } else {
        const newUploads = [...insuranceUploads, url];
        setInsuranceUploads(newUploads);
        await api.post("/compliance", { type: "GENERAL_LIABILITY", documentUploads: newUploads }).catch(() => {});
        await api.post("/insurance", { type: "GENERAL_LIABILITY", hasCoverage: true, coiUploads: newUploads }).catch(() => {});
        if (user) await markStepDone(user.id, "insurance");
      }
      Alert.alert("Uploaded!", "Document saved successfully.");
    } catch {
      Alert.alert("Upload Failed", "Could not upload document. Please try again.");
    } finally {
      setUploading(false);
      setPreviewUri(null);
    }
  };

  // ── Save radius ────────────────────────────────────────────────────────────
  const saveRadius = async () => {
    try {
      setRadiusSaving(true);
      // Convert miles → km for backend storage
      await api.patch("/providers/profile", { serviceRadiusKm: Math.round(serviceRadius * 1.60934) });
      if (user) await markStepDone(user.id, "radius");
      setRadiusDone(true);
      goNext();
    } catch {
      Alert.alert("Error", "Could not save service radius. Please try again.");
    } finally {
      setRadiusSaving(false);
    }
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
      setHoursDone(true);
      goNext();
    } catch {
      Alert.alert("Error", "Could not save business hours. Please try again.");
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
      setDescDone(true);
      goNext();
    } catch {
      Alert.alert("Error", "Could not save description. Please try again.");
    } finally {
      setDescSaving(false);
    }
  };

  // ── Save mobile service ────────────────────────────────────────────────────
  const saveMobile = async () => {
    try {
      setMobileSaving(true);
      await api.patch("/providers/profile", {
        mobileService,
        ...(mobileService && {
          freeKm: Math.round(freeMiles * 1.60934),
          extraFeePerKm: parseFloat(feePerMile) || 0,
        }),
      });
      if (user) await markStepDone(user.id, "mobile");
      setMobileDone(true);
      goNext();
    } catch {
      Alert.alert("Error", "Could not save mobile service setting.");
    } finally {
      setMobileSaving(false);
    }
  };

  const finishOnboarding = async () => {
    await api.post("/compliance/auto-create").catch(() => {});
    await completeOnboarding();
  };

  // ─── Step Renderers ────────────────────────────────────────────────────────

  const renderWelcome = () => (
    <View style={styles.stepBody}>
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name="hand-wave" size={60} color={color} />
      </View>
      <Text style={styles.title}>Welcome to TechTrust!</Text>
      <Text style={styles.subtitle}>
        Let's get your business ready to receive service requests. This takes
        about 5 minutes and you'll only need to do it once.
      </Text>

      <View style={styles.reviewBanner}>
        <MaterialCommunityIcons name="clock-alert" size={20} color="#1d4ed8" />
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewBannerTitle}>Account Under Review</Text>
          <Text style={styles.reviewBannerText}>
            Our team will verify your documents within 1–2 business days. You'll
            receive a notification once approved and can start receiving requests.
          </Text>
        </View>
      </View>

      <View style={styles.benefitList}>
        {[
          { icon: "certificate",      text: "Upload your business license for verification" },
          { icon: "shield-check",     text: "Confirm your insurance coverage" },
          { icon: "map-marker-radius",text: "Set your service area radius" },
          { icon: "clock-time-four",  text: "Configure your business hours" },
          { icon: "text-box-edit",    text: "Write a bio that wins more customers" },
          { icon: "car-wrench",       text: "Enable mobile / on-site service" },
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

  const renderUpload = (target: "license" | "insurance") => {
    const uploads = target === "license" ? licenseUploads : insuranceUploads;
    const titleMap = {
      license: "Business License",
      insurance: "Insurance Certificate",
    };
    const subtitleMap = {
      license: "Upload your state business license or registration certificate. Required to appear in search results and receive requests.",
      insurance: "Upload your Certificate of Insurance (COI) showing General Liability coverage. Customers can see if you are insured.",
    };
    const impactMap = {
      license: "Without a verified business license, your profile will show an 'Unverified' badge and customers may skip you.",
      insurance: "Providers with verified insurance get a trust badge and appear higher in search results.",
    };

    return (
      <View style={styles.stepBody}>
        <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
          <MaterialCommunityIcons name={STEP_ICONS[target] as any} size={60} color={color} />
        </View>
        <Text style={styles.title}>{titleMap[target]}</Text>
        <Text style={styles.subtitle}>{subtitleMap[target]}</Text>

        <View style={styles.impactBox}>
          <MaterialCommunityIcons name="lightbulb-outline" size={16} color={color} />
          <Text style={styles.impactText}>
            <Text style={{ fontWeight: "700" }}>Impact:</Text> {impactMap[target]}
          </Text>
        </View>

        {target === "license" && (
          <View style={styles.resourceBox}>
            <Text style={styles.resourceTitle}>Where to get your Business License (Florida)</Text>
            {[
              { label: "Division of Corporations (Sunbiz)", url: "https://sunbiz.org" },
              { label: "State Licensing Board (DBPR)", url: "https://myfloridalicense.com" },
              { label: "Motor Vehicle Repair (FDACS)", url: "https://www.fdacs.gov/Consumer-Resources/Motor-Vehicle-Repair" },
            ].map((r) => (
              <TouchableOpacity key={r.url} style={styles.resourceRow} onPress={() => Linking.openURL(r.url)}>
                <MaterialCommunityIcons name="open-in-new" size={14} color={color} />
                <Text style={[styles.resourceLink, { color }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {target === "insurance" && (
          <View style={styles.resourceBox}>
            <Text style={styles.resourceTitle}>Where to get your Certificate of Insurance (COI)</Text>
            <Text style={styles.resourceItem}>
              Contact your insurance carrier or agent and request an ACORD 25 form showing General Liability coverage.
            </Text>
            {[
              { label: "The Hartford (small business)", url: "https://www.thehartford.com" },
              { label: "Next Insurance (fast online)", url: "https://www.nextinsurance.com" },
              { label: "Hiscox Business Insurance", url: "https://www.hiscox.com" },
            ].map((r) => (
              <TouchableOpacity key={r.url} style={styles.resourceRow} onPress={() => Linking.openURL(r.url)}>
                <MaterialCommunityIcons name="open-in-new" size={14} color={color} />
                <Text style={[styles.resourceLink, { color }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {uploads.length > 0 && (
          <View style={styles.uploadedList}>
            {uploads.map((_, i) => (
              <View key={i} style={styles.uploadedItem}>
                <MaterialCommunityIcons name="file-check" size={20} color="#10b981" />
                <Text style={styles.uploadedText}>Document {i + 1} uploaded</Text>
                <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.uploadBtn, { borderColor: color }]}
          onPress={() => handleUploadTap(target)}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={color} />
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <MaterialCommunityIcons name="camera" size={28} color={color} />
                <MaterialCommunityIcons name="folder-open" size={28} color={color} />
              </View>
              <Text style={[styles.uploadBtnLabel, { color }]}>
                {uploads.length > 0 ? "Upload Another Document" : "Tap to Upload Document"}
              </Text>
              <Text style={styles.uploadBtnHint}>Take a photo or choose a file (JPG, PNG, PDF)</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={[styles.requiredBadge, { backgroundColor: "#fffbeb" }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#d97706" />
          <Text style={styles.requiredText}>
            Required · You can also upload later from Profile → Compliance
          </Text>
        </View>
      </View>
    );
  };

  const renderRadius = () => {
    const radiusSteps = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100];

    return (
      <View style={styles.stepBody}>
        <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
          <MaterialCommunityIcons name="map-marker-radius" size={60} color={color} />
        </View>
        <Text style={styles.title}>Service Radius</Text>
        <Text style={styles.subtitle}>
          How far are you willing to travel for service requests (or how far
          should customers be able to find you)?
        </Text>

        <View style={styles.impactBox}>
          <MaterialCommunityIcons name="lightbulb-outline" size={16} color={color} />
          <Text style={styles.impactText}>
            <Text style={{ fontWeight: "700" }}>Larger radius = more requests</Text>, but also
            longer drives. Start with 30 miles and adjust later in Profile → Service Area.
          </Text>
        </View>

        <View style={styles.radiusDisplay}>
          <Text style={[styles.radiusNumber, { color }]}>{serviceRadius}</Text>
          <Text style={styles.radiusUnit}>mi radius</Text>
        </View>

        <View style={styles.radiusChips}>
          {radiusSteps.map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.radiusChip, serviceRadius === v && [styles.radiusChipActive, { backgroundColor: color, borderColor: color }]]}
              onPress={() => setServiceRadius(v)}
            >
              <Text style={[styles.radiusChipText, serviceRadius === v && { color: "#fff" }]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.radiusHint}>
          {serviceRadius <= 15 ? "Small area — perfect for high-demand urban zones." :
           serviceRadius <= 30 ? "Standard coverage — good balance of volume and distance." :
           serviceRadius <= 60 ? "Wide coverage — more requests, longer distances." :
           "Regional coverage — great for specialised services."}
        </Text>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: color }]} onPress={saveRadius} disabled={radiusSaving}>
          {radiusSaving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Service Radius</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderHours = () => (
    <View style={styles.stepBody}>
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name="clock-time-four" size={60} color={color} />
      </View>
      <Text style={styles.title}>Business Hours</Text>
      <Text style={styles.subtitle}>
        Set when you're open. Customers see your hours on your profile and
        we only send you requests during working hours.
      </Text>

      <View style={styles.impactBox}>
        <MaterialCommunityIcons name="lightbulb-outline" size={16} color={color} />
        <Text style={styles.impactText}>
          <Text style={{ fontWeight: "700" }}>If you skip this:</Text> Your schedule
          shows as "hours not set" — customers may contact a competitor instead.
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
                  <Text style={styles.timeBtnText}>{to12h(day.openTime)}</Text>
                </TouchableOpacity>
                <Text style={styles.timeSep}>–</Text>
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => { setEditingDay(index); setEditingField("closeTime"); setShowTimePicker(true); }}
                >
                  <Text style={styles.timeBtnText}>{to12h(day.closeTime)}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.closedText}>Closed</Text>
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: color }]} onPress={saveHours} disabled={hoursSaving}>
        {hoursSaving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>Save Business Hours</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Time Picker Modal */}
      <Modal visible={showTimePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingField === "openTime" ? "Opening Time" : "Closing Time"}
              </Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {TIME_OPTIONS.map((t) => {
                const isSelected = editingDay !== null &&
                  schedule[editingDay][editingField] === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => {
                      if (editingDay === null) return;
                      const s = [...schedule];
                      s[editingDay] = { ...s[editingDay], [editingField]: t };
                      setSchedule(s);
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, isSelected && { color, fontWeight: "700" }]}>{to12h(t)}</Text>
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
        <Text style={styles.title}>Business Bio</Text>
        <Text style={styles.subtitle}>
          Write a short description about your shop — your experience, specialties,
          and what makes you stand out.
        </Text>

        <View style={styles.impactBox}>
          <MaterialCommunityIcons name="lightbulb-outline" size={16} color={color} />
          <Text style={styles.impactText}>
            <Text style={{ fontWeight: "700" }}>Profiles with a bio</Text> get up to
            3× more quote requests. Customers want to know who they're trusting with
            their car.
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Your Story (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={'e.g. "Family-owned shop with 15 years experience in South Florida. We specialise in Japanese imports and offer free diagnostics with every visit."'}
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
          <Text style={styles.bioTipsTitle}>Tips for a great bio:</Text>
          {[
            "Years in business and family/professional background",
            "Vehicle types or brands you specialise in",
            "Any certifications or unique services you offer",
            "What customers love most about your shop",
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
                {description.trim() ? "Save Bio" : "Skip for Now"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderMobile = () => (
    <View style={styles.stepBody}>
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name="car-wrench" size={60} color={color} />
      </View>
      <Text style={styles.title}>Mobile Service</Text>
      <Text style={styles.subtitle}>
        Can you travel to the customer's location to perform services?
        Mobile providers get significantly more requests.
      </Text>

      <View style={styles.impactBox}>
        <MaterialCommunityIcons name="lightbulb-outline" size={16} color={color} />
        <Text style={styles.impactText}>
          <Text style={{ fontWeight: "700" }}>Mobile providers get ~40% more requests</Text> because
          many customers prefer on-site service for routine maintenance and roadside issues.
        </Text>
      </View>

      <View style={styles.mobileToggleCard}>
        <View style={styles.mobileToggleInfo}>
          <MaterialCommunityIcons name="car-wrench" size={28} color={mobileService ? color : "#9ca3af"} />
          <View style={{ flex: 1 }}>
            <Text style={styles.mobileToggleTitle}>
              {mobileService ? "Mobile Service Enabled" : "Mobile Service Disabled"}
            </Text>
            <Text style={styles.mobileToggleSubtitle}>
              {mobileService
                ? "You'll appear in mobile service searches and on-site request matching."
                : "You only appear in requests where customers come to your location."}
            </Text>
          </View>
          <Switch
            value={mobileService}
            onValueChange={setMobileService}
            trackColor={{ false: "#e5e7eb", true: color + "80" }}
            thumbColor={mobileService ? color : "#d1d5db"}
          />
        </View>
      </View>

      {mobileService && (
        <View style={styles.mobileFieldsCard}>
          <Text style={styles.mobileFieldsTitle}>Travel Settings</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Free Travel Distance (miles)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10"
              placeholderTextColor="#9ca3af"
              value={freeMiles > 0 ? String(freeMiles) : ""}
              onChangeText={(v) => setFreeMiles(Number(v.replace(/[^0-9]/g, "")) || 0)}
              keyboardType="number-pad"
            />
            <Text style={styles.charCount}>Miles you'll travel at no extra charge</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Fee per Mile Beyond Free Distance ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1.50"
              placeholderTextColor="#9ca3af"
              value={feePerMile}
              onChangeText={(v) => {
                const clean = v.replace(/[^0-9.]/g, "");
                setFeePerMile(clean.replace(/(\..*)\./g, "$1"));
              }}
              keyboardType="decimal-pad"
            />
            <Text style={styles.charCount}>Charge per mile after the free distance (0 = no extra fee)</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: color }]}
        onPress={saveMobile}
        disabled={mobileSaving}
      >
        {mobileSaving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>Save & Continue</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderDone = () => (
    <View style={styles.stepBody}>
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name="check-circle" size={60} color={color} />
      </View>
      <Text style={styles.title}>Setup Complete!</Text>
      <Text style={styles.subtitle}>
        Your profile is set up. Once our team verifies your documents, you'll
        automatically start receiving matching service requests.
      </Text>

      <View style={styles.reviewBanner}>
        <MaterialCommunityIcons name="clock-alert-outline" size={20} color="#1d4ed8" />
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewBannerTitle}>What Happens Next</Text>
          <Text style={styles.reviewBannerText}>
            1. Our team reviews your documents (1–2 business days){"\n"}
            2. You receive a notification once approved{"\n"}
            3. Service requests matching your area and capabilities start appearing
          </Text>
        </View>
      </View>

      <View style={styles.doneCard}>
        <Text style={styles.doneCardTitle}>Setup Summary</Text>
        {[
          { icon: "certificate",       label: "Business License",      done: licenseUploads.length > 0 },
          { icon: "shield-check",      label: "Insurance Certificate", done: insuranceUploads.length > 0 },
          { icon: "map-marker-radius", label: "Service Radius",        done: radiusDone },
          { icon: "clock-time-four",   label: "Business Hours",        done: hoursDone },
          { icon: "text-box-edit",     label: "Business Bio",          done: descDone },
          { icon: "car-wrench",        label: "Mobile Service",        done: mobileDone },
        ].map((item, i) => (
          <View key={i} style={styles.doneRow}>
            <View style={[styles.doneIcon, { backgroundColor: item.done ? STEP_BG.done : "#fef2f2" }]}>
              <MaterialCommunityIcons name={item.icon as any} size={16} color={item.done ? STEP_COLORS.done : "#ef4444"} />
            </View>
            <Text style={[styles.doneRowText, !item.done && { color: "#b91c1c" }]}>{item.label}</Text>
            <MaterialCommunityIcons
              name={item.done ? "check-circle" : "alert-circle-outline"}
              size={18}
              color={item.done ? "#10b981" : "#ef4444"}
            />
          </View>
        ))}
        {[licenseUploads.length === 0, insuranceUploads.length === 0, !radiusDone, !hoursDone].some(Boolean) && (
          <View style={styles.pendingNotice}>
            <MaterialCommunityIcons name="information-outline" size={14} color="#92400e" />
            <Text style={styles.pendingNoticeText}>
              Pending items can be completed later in Profile. Documents must be verified before you can receive requests.
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderStep = () => {
    switch (stepId) {
      case "welcome":     return renderWelcome();
      case "license":     return renderUpload("license");
      case "insurance":   return renderUpload("insurance");
      case "radius":      return renderRadius();
      case "hours":       return renderHours();
      case "description": return renderDescription();
      case "mobile":      return renderMobile();
      case "done":        return renderDone();
    }
  };

  const isFirst = currentStep === 0;
  const isLast = currentStep === STEP_IDS.length - 1;
  const progress = (currentStep + 1) / totalSteps;

  // Steps that have their own save button — footer shows "Skip this step"
  const hasSaveBtn = ["radius", "hours", "description", "mobile"].includes(stepId);
  const isUploadStep = stepId === "license" || stepId === "insurance";

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
          <Text style={styles.skipHeaderText}>Skip all</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <Animated.View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
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
        {isLast ? (
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: color }]} onPress={finishOnboarding}>
            <Text style={styles.nextBtnText}>Go to Dashboard</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        ) : hasSaveBtn ? (
          <TouchableOpacity style={styles.skipStepBtn} onPress={goNext}>
            <Text style={styles.skipStepText}>Skip this step</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ) : isUploadStep ? (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: color }]}
            onPress={goNext}
          >
            <Text style={styles.nextBtnText}>
              {(stepId === "license" && licenseUploads.length > 0) ||
               (stepId === "insurance" && insuranceUploads.length > 0)
                ? "Next"
                : "Skip for Now"}
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: color }]} onPress={goNext}>
            <Text style={styles.nextBtnText}>
              {isFirst ? "Let's Start" : "Next"}
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Photo Preview Modal */}
      <Modal visible={!!previewUri} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setPreviewUri(null)} style={styles.previewCloseBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Review Document</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.previewImgContainer}>
            {previewUri && (
              <Image source={{ uri: previewUri }} style={styles.previewImg} resizeMode="contain" />
            )}
          </View>
          <Text style={styles.previewHint}>Make sure the document is clear and all text is readable.</Text>
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.previewRetakeBtn}
              onPress={() => { setPreviewUri(null); handleCamera(previewTarget); }}
            >
              <MaterialCommunityIcons name="camera-retake" size={20} color="#2B5EA7" />
              <Text style={styles.previewRetakeText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.previewConfirmBtn}
              onPress={() => previewUri && uploadFile(previewUri, previewMime, previewName, previewTarget)}
              disabled={uploading}
            >
              {uploading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  <Text style={styles.previewConfirmText}>Use This Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  stepBody: { alignItems: "center", width: "100%" },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 18,
    paddingHorizontal: 4,
  },
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
  // Upload
  uploadedList: { width: "100%", gap: 8, marginBottom: 12 },
  uploadedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  uploadedText: { flex: 1, fontSize: 14, color: "#065f46", fontWeight: "500" },
  uploadBtn: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fafbff",
    width: "100%",
    marginBottom: 12,
  },
  uploadBtnLabel: { fontSize: 16, fontWeight: "600" },
  uploadBtnHint: { fontSize: 12, color: "#9ca3af" },
  requiredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    width: "100%",
  },
  requiredText: { flex: 1, fontSize: 12, color: "#92400e" },
  // Radius
  radiusDisplay: { alignItems: "center", marginBottom: 16 },
  radiusNumber: { fontSize: 56, fontWeight: "900" },
  radiusUnit: { fontSize: 16, color: "#6b7280", fontWeight: "600", marginTop: -8 },
  radiusChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: 14,
    width: "100%",
  },
  radiusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  radiusChipActive: { borderWidth: 1.5 },
  radiusChipText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  radiusHint: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
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
  timeBtn: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
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
    backgroundColor: "#fdf4ff",
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
  // Resources
  resourceBox: {
    backgroundColor: "#f8faff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 12,
    padding: 14,
    width: "100%",
    marginBottom: 14,
    gap: 8,
  },
  resourceTitle: { fontSize: 13, fontWeight: "700", color: "#1e40af", marginBottom: 4 },
  resourceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  resourceLink: { fontSize: 13, fontWeight: "500", textDecorationLine: "underline" },
  resourceItem: { fontSize: 13, color: "#374151", lineHeight: 18 },
  // Mobile fields
  mobileFieldsCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 16,
    width: "100%",
    marginBottom: 12,
    gap: 4,
  },
  mobileFieldsTitle: { fontSize: 14, fontWeight: "700", color: "#065f46", marginBottom: 8 },
  // Done pending notice
  pendingNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  pendingNoticeText: { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 16 },
  // Mobile
  mobileToggleCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  mobileToggleInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  mobileToggleTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  mobileToggleSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 2, lineHeight: 17 },
  mobileTipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 12,
    width: "100%",
    marginBottom: 16,
  },
  mobileTipText: { flex: 1, fontSize: 13, color: "#047857" },
  // Done
  doneCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    gap: 12,
  },
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
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  skipStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  skipStepText: { fontSize: 15, color: "#9ca3af", fontWeight: "500" },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
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
  // Preview modal
  previewContainer: { flex: 1, backgroundColor: "#000" },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#111",
  },
  previewCloseBtn: { padding: 8, backgroundColor: "#374151", borderRadius: 20 },
  previewTitle: { fontSize: 16, fontWeight: "600", color: "#fff" },
  previewImgContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  previewImg: { width: "100%", height: "100%", borderRadius: 8 },
  previewHint: { textAlign: "center", color: "#9ca3af", fontSize: 13, paddingHorizontal: 24, paddingVertical: 12 },
  previewActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: "#111",
  },
  previewRetakeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2B5EA7",
  },
  previewRetakeText: { fontSize: 15, fontWeight: "600", color: "#2B5EA7" },
  previewConfirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#10b981",
  },
  previewConfirmText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
