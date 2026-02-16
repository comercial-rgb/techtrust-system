/**
 * CustomerOnboardingScreen - First-time customer welcome flow
 * Multi-step guided onboarding: Welcome → Add Vehicle → First Request → Done
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../../i18n";
import { useAuth } from "../../contexts/AuthContext";
import { colors, spacing, borderRadius, fontSize, fontWeight } from "../../constants/theme";

const { width, height } = Dimensions.get("window");

interface OnboardingStep {
  id: string;
  icon: string;
  iconFamily: "ionicons" | "material";
  color: string;
  bgColor: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    icon: "hand-right",
    iconFamily: "ionicons",
    color: "#3b82f6",
    bgColor: "#dbeafe",
  },
  {
    id: "vehicle",
    icon: "car-sport",
    iconFamily: "ionicons",
    color: "#8b5cf6",
    bgColor: "#ede9fe",
  },
  {
    id: "service",
    icon: "construct",
    iconFamily: "ionicons",
    color: "#f59e0b",
    bgColor: "#fef3c7",
  },
  {
    id: "carwash",
    icon: "car-wash",
    iconFamily: "material",
    color: "#06b6d4",
    bgColor: "#cffafe",
  },
  {
    id: "done",
    icon: "checkmark-circle",
    iconFamily: "ionicons",
    color: "#10b981",
    bgColor: "#d1fae5",
  },
];

export default function CustomerOnboardingScreen({ navigation }: any) {
  const { t } = useI18n();
  const { completeOnboarding } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Animate icon on mount/step change
  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  const animateTransition = (next: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(next);
      slideAnim.setValue(30);
      scaleAnim.setValue(0.8);
    });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      animateTransition(currentStep + 1);
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
    navigation.replace("CustomerMain");
  };

  const handleFinish = async () => {
    await completeOnboarding();
    navigation.replace("CustomerMain");
  };

  const handleAddVehicle = async () => {
    // Navigate to add vehicle flow then come back
    await completeOnboarding();
    navigation.replace("CustomerMain", {
      screen: "Vehicles",
      params: { screen: "AddVehicle" },
    });
  };

  const handleNewRequest = async () => {
    await completeOnboarding();
    navigation.replace("CustomerMain", {
      screen: "Home",
      params: { screen: "ServiceChoice" },
    });
  };

  const handleFindCarWash = async () => {
    await completeOnboarding();
    navigation.replace("CustomerMain", {
      screen: "CarWash",
    });
  };

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  // Content for each step
  const getStepContent = () => {
    const ob = (t as any).onboarding || {};
    switch (step.id) {
      case "welcome":
        return {
          title: ob.welcomeTitle || "Welcome to TechTrust!",
          subtitle:
            ob.welcomeSubtitle ||
            "Your trusted partner for auto services. Get quotes from verified shops, track repairs, and keep your vehicle in top shape.",
          features: [
            {
              icon: "shield-checkmark",
              text: ob.featureVerified || "Verified & licensed shops",
            },
            {
              icon: "pricetag",
              text: ob.featureQuotes || "Compare multiple quotes",
            },
            {
              icon: "location",
              text: ob.featureLocal || "Local shops near you",
            },
          ],
        };
      case "vehicle":
        return {
          title: ob.vehicleTitle || "Add Your Vehicle",
          subtitle:
            ob.vehicleSubtitle ||
            "Add your vehicle to get accurate quotes and track maintenance history. You can scan your VIN or enter details manually.",
          features: [
            {
              icon: "scan",
              text: ob.featureVin || "Scan VIN for auto-fill",
            },
            {
              icon: "car",
              text: ob.featureMultiple || "Add multiple vehicles",
            },
            {
              icon: "time",
              text: ob.featureHistory || "Track service history",
            },
          ],
          action: {
            label: ob.addVehicleNow || "Add Vehicle Now",
            onPress: handleAddVehicle,
          },
        };
      case "service":
        return {
          title: ob.serviceTitle || "Request a Service",
          subtitle:
            ob.serviceSubtitle ||
            "Describe what you need, and we'll send your request to qualified shops nearby. Compare quotes and choose the best deal.",
          features: [
            {
              icon: "flash",
              text: ob.featureFast || "Quick quote requests",
            },
            {
              icon: "star",
              text: ob.featureRatings || "Shop ratings & reviews",
            },
            {
              icon: "chatbubble",
              text: ob.featureChat || "Chat directly with shops",
            },
          ],
          action: {
            label: ob.requestServiceNow || "Request Service Now",
            onPress: handleNewRequest,
          },
        };
      case "carwash":
        return {
          title: ob.carwashTitle || "Find a Car Wash",
          subtitle:
            ob.carwashSubtitle ||
            "Discover car washes near you with real-time pricing, membership plans, and customer reviews.",
          features: [
            {
              icon: "map",
              text: ob.featureMap || "Interactive map view",
            },
            {
              icon: "card",
              text: ob.featureMembership || "Unlimited wash memberships",
            },
            {
              icon: "star",
              text: ob.featureReviews || "Ratings & photos",
            },
          ],
          action: {
            label: ob.findCarWashNow || "Find a Car Wash",
            onPress: handleFindCarWash,
          },
        };
      case "done":
        return {
          title: ob.doneTitle || "You're All Set!",
          subtitle:
            ob.doneSubtitle ||
            "You're ready to go. Add your vehicle, request services, find car washes, and keep your car in perfect shape.",
          features: [
            {
              icon: "notifications",
              text: ob.featureNotifications || "Get notified on new quotes",
            },
            {
              icon: "wallet",
              text: ob.featurePayments || "Secure in-app payments",
            },
            {
              icon: "heart",
              text: ob.featureFavorites || "Save favorite shops",
            },
          ],
        };
      default:
        return { title: "", subtitle: "", features: [] };
    }
  };

  const content = getStepContent();

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>
            {(t as any).onboarding?.skip || "Skip"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Progress dots */}
      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View
            key={s.id}
            style={[
              styles.progressDot,
              i === currentStep && [
                styles.progressDotActive,
                { backgroundColor: step.color },
              ],
              i < currentStep && styles.progressDotDone,
            ]}
          />
        ))}
      </View>

      {/* Animated Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >
          <View
            style={[styles.iconCircle, { backgroundColor: step.bgColor }]}
          >
            <View
              style={[styles.iconInner, { backgroundColor: step.bgColor }]}
            >
              {step.iconFamily === "material" ? (
                <MaterialCommunityIcons
                  name={step.icon as any}
                  size={64}
                  color={step.color}
                />
              ) : (
                <Ionicons
                  name={step.icon as any}
                  size={64}
                  color={step.color}
                />
              )}
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.subtitle}>{content.subtitle}</Text>

          {/* Feature list */}
          <View style={styles.featureList}>
            {content.features?.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View
                  style={[
                    styles.featureIcon,
                    { backgroundColor: step.bgColor },
                  ]}
                >
                  <Ionicons
                    name={feature.icon as any}
                    size={20}
                    color={step.color}
                  />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA Action button (for vehicle/service/carwash steps) */}
          {(content as any).action && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: step.color }]}
              onPress={(content as any).action.onPress}
            >
              <Text style={styles.actionButtonText}>
                {(content as any).action.label}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom navigation */}
      <View style={styles.bottomRow}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => animateTransition(currentStep - 1)}
          >
            <Ionicons name="arrow-back" size={20} color="#6b7280" />
            <Text style={styles.backText}>
              {(t as any).common?.back || "Back"}
            </Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {isLast ? (
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: step.color }]}
            onPress={handleFinish}
          >
            <Text style={styles.nextButtonText}>
              {(t as any).onboarding?.getStarted || "Get Started"}
            </Text>
            <Ionicons name="rocket" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: step.color }]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {(t as any).common?.next || "Next"}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  skipButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    color: "#9ca3af",
    fontWeight: "500",
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 16,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
  progressDotActive: {
    width: 28,
    borderRadius: 4,
  },
  progressDotDone: {
    backgroundColor: "#10b981",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  iconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 32,
  },
  featureList: {
    width: "100%",
    gap: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
    width: "100%",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  backText: {
    fontSize: 15,
    color: "#6b7280",
    fontWeight: "500",
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    gap: 8,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
