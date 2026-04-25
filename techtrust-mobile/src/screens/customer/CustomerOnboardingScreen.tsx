/**
 * CustomerOnboardingScreen — Interactive post-login setup
 * Steps: Welcome → Your Location → Home Address → Add Vehicle → Done
 * Does NOT re-collect data from signup (name, email, phone, password).
 * Each data step saves immediately and is marked complete in AsyncStorage.
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
  FlatList,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import { US_STATES, CITIES_BY_STATE } from "../../constants/us-states";

// ─── Step IDs ───────────────────────────────────────────────────────────────
const STEP_IDS = ["welcome", "location", "address", "vehicle", "done"] as const;
type StepId = (typeof STEP_IDS)[number];

const STEP_COLORS: Record<StepId, string> = {
  welcome: "#3b82f6",
  location: "#8b5cf6",
  address: "#f59e0b",
  vehicle: "#0891b2",
  done: "#10b981",
};

const STEP_BG: Record<StepId, string> = {
  welcome: "#dbeafe",
  location: "#ede9fe",
  address: "#fef3c7",
  vehicle: "#cffafe",
  done: "#d1fae5",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STEPS_KEY_PREFIX = "@TechTrust:onboarding:steps:";

async function markStepDone(userId: string, stepId: StepId) {
  const key = STEPS_KEY_PREFIX + userId;
  const raw = await AsyncStorage.getItem(key);
  const done: string[] = raw ? JSON.parse(raw) : [];
  if (!done.includes(stepId)) {
    await AsyncStorage.setItem(key, JSON.stringify([...done, stepId]));
  }
}

// ─── Time options ─────────────────────────────────────────────────────────────
const TIME_OPTIONS = [
  "06:00","07:00","08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00",
];

export default function CustomerOnboardingScreen({ navigation }: any) {
  const { user, completeOnboarding } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Step: location ──
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationDone, setLocationDone] = useState(false);

  // ── Step: address ──
  const [street, setStreet] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrZip, setAddrZip] = useState("");
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressDone, setAddressDone] = useState(false);
  const [showAddrStatePicker, setShowAddrStatePicker] = useState(false);
  const [showAddrCityPicker, setShowAddrCityPicker] = useState(false);

  const stepId = STEP_IDS[currentStep];
  const color = STEP_COLORS[stepId];
  const bgColor = STEP_BG[stepId];

  // ── Transition animation ──────────────────────────────────────────────────
  const animateTransition = (next: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -24, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setCurrentStep(next);
      slideAnim.setValue(24);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => {
    if (currentStep < STEP_IDS.length - 1) animateTransition(currentStep + 1);
  };

  const goBack = () => {
    if (currentStep > 0) animateTransition(currentStep - 1);
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const handleFinish = async () => {
    await completeOnboarding();
  };

  // ── Save location ──────────────────────────────────────────────────────────
  const saveLocation = async () => {
    if (!selectedState || !selectedCity) {
      Alert.alert("Missing Info", "Please select your state and city.");
      return;
    }
    try {
      setLocationSaving(true);
      await api.patch("/users/me", { state: selectedState, city: selectedCity });
      if (user) await markStepDone(user.id, "location");
      setLocationDone(true);
      goNext();
    } catch {
      Alert.alert("Error", "Could not save your location. Please try again.");
    } finally {
      setLocationSaving(false);
    }
  };

  // ── Save address ───────────────────────────────────────────────────────────
  const saveAddress = async () => {
    if (!street.trim()) {
      Alert.alert("Missing Info", "Please enter your street address.");
      return;
    }
    const addressesJson = [
      {
        label: "Home",
        address: street.trim(),
        city: addrCity || selectedCity,
        state: addrState || selectedState,
        zipCode: addrZip,
        isDefault: true,
      },
    ];
    try {
      setAddressSaving(true);
      await api.patch("/users/me", {
        address: street.trim(),
        city: addrCity || selectedCity,
        state: addrState || selectedState,
        zipCode: addrZip,
        addressesJson,
      });
      if (user) await markStepDone(user.id, "address");
      setAddressDone(true);
      goNext();
    } catch {
      Alert.alert("Error", "Could not save your address. Please try again.");
    } finally {
      setAddressSaving(false);
    }
  };

  // ── Navigate to AddVehicle and come back ───────────────────────────────────
  const handleAddVehicle = async () => {
    if (user) await markStepDone(user.id, "vehicle");
    await completeOnboarding();
    navigation.replace("CustomerMain", {
      screen: "Vehicles",
      params: {
        screen: "AddVehicle",
        params: { fromOnboarding: true },
      },
    });
  };

  const citiesForState = (state: string): string[] =>
    (CITIES_BY_STATE as any)[state] || [];

  // ─── Step Renderers ────────────────────────────────────────────────────────

  const renderWelcome = () => (
    <View style={styles.stepBody}>
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <Ionicons name="hand-right" size={60} color={color} />
      </View>
      <Text style={styles.title}>Welcome to TechTrust!</Text>
      <Text style={styles.subtitle}>
        Let's take 2 minutes to personalise your experience so we can show you the
        right shops, car washes, and auto parts near your home.
      </Text>

      <View style={styles.benefitList}>
        {[
          { icon: "location", text: "See shops & car washes near YOU" },
          { icon: "car", text: "Track service history for your vehicles" },
          { icon: "flash", text: "Get instant quotes from verified shops" },
          { icon: "shield-checkmark", text: "Secure payments — money released only on approval" },
        ].map((b, i) => (
          <View key={i} style={styles.benefitRow}>
            <View style={[styles.benefitIcon, { backgroundColor: bgColor }]}>
              <Ionicons name={b.icon as any} size={18} color={color} />
            </View>
            <Text style={styles.benefitText}>{b.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={18} color="#3b82f6" />
        <Text style={styles.infoText}>
          You can skip any step and complete it later from your Profile settings.
        </Text>
      </View>
    </View>
  );

  const renderLocation = () => {
    const cities = citiesForState(selectedState);
    const hasCities = cities.length > 0;
    return (
      <View style={styles.stepBody}>
        <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
          <Ionicons name="map" size={60} color={color} />
        </View>
        <Text style={styles.title}>Your Location</Text>
        <Text style={styles.subtitle}>
          We use your city and state to show you nearby shops, car washes, and
          auto parts stores. Without this, results will be generic and far away.
        </Text>

        <View style={styles.impactBox}>
          <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#8b5cf6" />
          <Text style={styles.impactText}>
            <Text style={{ fontWeight: "700" }}>If you skip this:</Text> You'll see
            a generic list of providers and won't be matched with local shops.
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>State</Text>
          <TouchableOpacity
            style={[styles.pickerBtn, !selectedState && styles.pickerBtnEmpty]}
            onPress={() => setShowStatePicker(true)}
          >
            <Text style={selectedState ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
              {selectedState
                ? US_STATES.find((s) => s.code === selectedState)?.name || selectedState
                : "Select your state"}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#9ca3af" />
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: 14 }]}>City</Text>
          {hasCities ? (
            <TouchableOpacity
              style={[styles.pickerBtn, !selectedCity && styles.pickerBtnEmpty]}
              onPress={() => selectedState && setShowCityPicker(true)}
              disabled={!selectedState}
            >
              <Text style={selectedCity ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                {selectedCity || "Select your city"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Enter your city"
              placeholderTextColor="#9ca3af"
              value={selectedCity}
              onChangeText={setSelectedCity}
              editable={!!selectedState}
            />
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, (!selectedState || !selectedCity) && styles.saveBtnDisabled]}
          onPress={saveLocation}
          disabled={locationSaving || !selectedState || !selectedCity}
        >
          {locationSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save My Location</Text>
            </>
          )}
        </TouchableOpacity>

        {/* State Picker Modal */}
        <Modal visible={showStatePicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select State</Text>
                <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={US_STATES}
                keyExtractor={(s) => s.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, selectedState === item.code && styles.modalItemSelected]}
                    onPress={() => {
                      setSelectedState(item.code);
                      setSelectedCity("");
                      setShowStatePicker(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, selectedState === item.code && { color: "#8b5cf6", fontWeight: "700" }]}>
                      {item.name}
                    </Text>
                    {selectedState === item.code && <Ionicons name="checkmark" size={18} color="#8b5cf6" />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* City Picker Modal */}
        <Modal visible={showCityPicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select City</Text>
                <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={cities}
                keyExtractor={(c) => c}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, selectedCity === item && styles.modalItemSelected]}
                    onPress={() => {
                      setSelectedCity(item);
                      setShowCityPicker(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, selectedCity === item && { color: "#8b5cf6", fontWeight: "700" }]}>
                      {item}
                    </Text>
                    {selectedCity === item && <Ionicons name="checkmark" size={18} color="#8b5cf6" />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderAddress = () => {
    const addrCities = citiesForState(addrState || selectedState);
    const hasAddrCities = addrCities.length > 0;
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
        <View style={styles.stepBody}>
          <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
            <Ionicons name="home" size={60} color={color} />
          </View>
          <Text style={styles.title}>Home Address</Text>
          <Text style={styles.subtitle}>
            Your home address helps us send technicians to your door and match you
            with shops that cover your neighbourhood.
          </Text>

          <View style={styles.impactBox}>
            <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#f59e0b" />
            <Text style={styles.impactText}>
              <Text style={{ fontWeight: "700" }}>If you skip this:</Text> You'll need to enter
              your address every time you create a service request at home.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Street Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 123 Oak Street, Apt 4B"
              placeholderTextColor="#9ca3af"
              value={street}
              onChangeText={setStreet}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>State</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, !(addrState || selectedState) && styles.pickerBtnEmpty]}
              onPress={() => setShowAddrStatePicker(true)}
            >
              <Text style={(addrState || selectedState) ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                {(addrState || selectedState)
                  ? US_STATES.find((s) => s.code === (addrState || selectedState))?.name || (addrState || selectedState)
                  : "Select state"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#9ca3af" />
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 14 }]}>City</Text>
            {hasAddrCities ? (
              <TouchableOpacity
                style={[styles.pickerBtn, !addrCity && styles.pickerBtnEmpty]}
                onPress={() => setShowAddrCityPicker(true)}
              >
                <Text style={addrCity ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                  {addrCity || "Select city"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#9ca3af" />
              </TouchableOpacity>
            ) : (
              <TextInput
                style={styles.input}
                placeholder="Enter your city"
                placeholderTextColor="#9ca3af"
                value={addrCity}
                onChangeText={setAddrCity}
              />
            )}

            <Text style={[styles.label, { marginTop: 14 }]}>ZIP Code (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 33101"
              placeholderTextColor="#9ca3af"
              value={addrZip}
              onChangeText={setAddrZip}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, !street.trim() && styles.saveBtnDisabled]}
            onPress={saveAddress}
            disabled={addressSaving || !street.trim()}
          >
            {addressSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Home Address</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Address State Picker */}
          <Modal visible={showAddrStatePicker} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select State</Text>
                  <TouchableOpacity onPress={() => setShowAddrStatePicker(false)}>
                    <Ionicons name="close" size={24} color="#374151" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={US_STATES}
                  keyExtractor={(s) => s.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalItem, addrState === item.code && styles.modalItemSelected]}
                      onPress={() => {
                        setAddrState(item.code);
                        setAddrCity("");
                        setShowAddrStatePicker(false);
                      }}
                    >
                      <Text style={[styles.modalItemText, addrState === item.code && { color: "#f59e0b", fontWeight: "700" }]}>
                        {item.name}
                      </Text>
                      {addrState === item.code && <Ionicons name="checkmark" size={18} color="#f59e0b" />}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>

          {/* Address City Picker */}
          <Modal visible={showAddrCityPicker} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select City</Text>
                  <TouchableOpacity onPress={() => setShowAddrCityPicker(false)}>
                    <Ionicons name="close" size={24} color="#374151" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={addrCities}
                  keyExtractor={(c) => c}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalItem, addrCity === item && styles.modalItemSelected]}
                      onPress={() => {
                        setAddrCity(item);
                        setShowAddrCityPicker(false);
                      }}
                    >
                      <Text style={[styles.modalItemText, addrCity === item && { color: "#f59e0b", fontWeight: "700" }]}>
                        {item}
                      </Text>
                      {addrCity === item && <Ionicons name="checkmark" size={18} color="#f59e0b" />}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    );
  };

  const renderVehicle = () => (
    <View style={styles.stepBody}>
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <Ionicons name="car-sport" size={60} color={color} />
      </View>
      <Text style={styles.title}>Add Your Vehicle</Text>
      <Text style={styles.subtitle}>
        Adding your vehicle lets shops send you accurate quotes for the right
        parts and labour. You can also track your complete service history.
      </Text>

      <View style={styles.impactBox}>
        <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#0891b2" />
        <Text style={styles.impactText}>
          <Text style={{ fontWeight: "700" }}>If you skip this:</Text> You'll need to
          describe your car manually every time you request a service, and quotes
          may be less accurate.
        </Text>
      </View>

      <View style={styles.benefitList}>
        {[
          { icon: "scan", text: "Scan VIN barcode for automatic fill" },
          { icon: "time", text: "Full service history per vehicle" },
          { icon: "people", text: "Add multiple vehicles (family & fleet)" },
          { icon: "notifications", text: "Maintenance reminders by mileage" },
        ].map((b, i) => (
          <View key={i} style={styles.benefitRow}>
            <View style={[styles.benefitIcon, { backgroundColor: STEP_BG.vehicle }]}>
              <Ionicons name={b.icon as any} size={16} color={STEP_COLORS.vehicle} />
            </View>
            <Text style={styles.benefitText}>{b.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: color }]}
        onPress={handleAddVehicle}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.saveBtnText}>Add My Vehicle Now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDone = () => (
    <View style={styles.stepBody}>
      <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
        <Ionicons name="checkmark-circle" size={60} color={color} />
      </View>
      <Text style={styles.title}>You're All Set!</Text>
      <Text style={styles.subtitle}>
        TechTrust is personalised for you. You can always update your info
        from Profile → Settings.
      </Text>

      <View style={styles.doneCard}>
        <Text style={styles.doneCardTitle}>What you can do now:</Text>
        {[
          { icon: "construct", text: "Request a service from verified shops near you" },
          { icon: "car-wash", text: "Find car washes and book memberships", family: "material" },
          { icon: "storefront", text: "Browse auto parts stores" },
          { icon: "star", text: "Leave reviews and save favourite shops" },
        ].map((item, i) => (
          <View key={i} style={styles.doneRow}>
            <View style={[styles.doneIcon, { backgroundColor: STEP_BG.done }]}>
              {item.family === "material" ? (
                <MaterialCommunityIcons name={item.icon as any} size={16} color={STEP_COLORS.done} />
              ) : (
                <Ionicons name={item.icon as any} size={16} color={STEP_COLORS.done} />
              )}
            </View>
            <Text style={styles.doneRowText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderStep = () => {
    switch (stepId) {
      case "welcome": return renderWelcome();
      case "location": return renderLocation();
      case "address": return renderAddress();
      case "vehicle": return renderVehicle();
      case "done": return renderDone();
    }
  };

  const isFirst = currentStep === 0;
  const isLast = currentStep === STEP_IDS.length - 1;

  // On data steps that have their own save button, the footer Next is "Skip this step"
  const isDataStep = stepId === "location" || stepId === "address";

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipTopBtn} onPress={handleSkip}>
          <Text style={styles.skipTopText}>Skip all</Text>
        </TouchableOpacity>
      )}

      {/* Progress dots */}
      <View style={styles.progressRow}>
        {STEP_IDS.map((id, i) => (
          <View
            key={id}
            style={[
              styles.dot,
              i === currentStep && [styles.dotActive, { backgroundColor: color }],
              i < currentStep && styles.dotDone,
            ]}
          />
        ))}
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {renderStep()}
        </Animated.View>
      </ScrollView>

      {/* Footer navigation */}
      <View style={styles.footer}>
        {!isFirst && (
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Ionicons name="arrow-back" size={18} color="#6b7280" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />

        {isLast ? (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: color }]}
            onPress={handleFinish}
          >
            <Text style={styles.nextBtnText}>Go to Dashboard</Text>
            <Ionicons name="rocket" size={18} color="#fff" />
          </TouchableOpacity>
        ) : isDataStep ? (
          <TouchableOpacity style={styles.skipStepBtn} onPress={goNext}>
            <Text style={styles.skipStepText}>Skip this step</Text>
            <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ) : stepId === "vehicle" ? (
          <TouchableOpacity style={styles.skipStepBtn} onPress={goNext}>
            <Text style={styles.skipStepText}>Skip for now</Text>
            <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: color }]}
            onPress={goNext}
          >
            <Text style={styles.nextBtnText}>Let's go</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  skipTopBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  skipTopText: { fontSize: 14, color: "#9ca3af", fontWeight: "500" },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
  dotActive: { width: 24, borderRadius: 4 },
  dotDone: { backgroundColor: "#10b981" },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  stepBody: { alignItems: "center", width: "100%" },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
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
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  benefitList: { width: "100%", gap: 12, marginBottom: 20 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
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
    marginBottom: 20,
  },
  impactText: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 18 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 12,
    width: "100%",
    marginBottom: 8,
  },
  infoText: { flex: 1, fontSize: 13, color: "#1d4ed8", lineHeight: 18 },
  fieldGroup: { width: "100%", marginBottom: 20 },
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
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fafafa",
  },
  pickerBtnEmpty: { borderColor: "#e5e7eb" },
  pickerBtnText: { fontSize: 15, color: "#111827" },
  pickerBtnPlaceholder: { fontSize: 15, color: "#9ca3af" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: "100%",
  },
  saveBtnDisabled: { backgroundColor: "#93c5fd" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  doneCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    gap: 12,
  },
  doneCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#065f46",
    marginBottom: 4,
  },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  doneIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  doneRowText: { flex: 1, fontSize: 14, color: "#047857", fontWeight: "500" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  backBtnText: { fontSize: 15, color: "#6b7280", fontWeight: "500" },
  skipStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
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
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
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
