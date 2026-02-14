/**
 * CreateRequestScreen - Create Service Request
 * With service location option and US-focused services
 * Supports pre-selected provider from Favorite Providers
 * Requires payment method before creating request
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../i18n";
import {
  useRoute,
  useFocusEffect,
  CommonActions,
} from "@react-navigation/native";

interface FavoriteProvider {
  id: string;
  businessName: string;
  rating: number;
  totalServices: number;
  specialty: string;
}

interface PreSelectedProvider {
  id: string;
  name: string;
  city: string;
  state: string;
  services: string[];
  rating?: number;
  reviews?: number;
  phone?: string;
  email?: string;
  address?: string;
  specialOffers?: string[];
}

interface SpecialOffer {
  id: string;
  title: string;
  discount: string;
  description: string;
  validUntil: string;
  originalPrice: string;
  discountedPrice: string;
  serviceType?: string;
  vehicleTypes?: string[];
  fuelTypes?: string[];
}

interface PaymentMethod {
  id: string;
  type: "credit" | "debit";
  brand: string;
  lastFour: string;
  isDefault: boolean;
}

export default function CreateRequestScreen({ navigation }: any) {
  const { t } = useI18n();
  const route = useRoute<any>();

  // Get pre-selected provider from navigation params (from Favorite Providers or Landing)
  const preSelectedProviderId = route.params?.providerId;
  const preSelectedProviderName = route.params?.providerName;
  const preSelectedProviderFromLanding: PreSelectedProvider | null =
    route.params?.preSelectedProvider || null;
  const specialOfferFromLanding: SpecialOffer | null =
    route.params?.specialOffer || null;

  const [selectedVehicle, setSelectedVehicle] = useState<string>("1");
  // Auto-select service type from special offer if present
  const [selectedService, setSelectedService] = useState<string>(
    specialOfferFromLanding?.serviceType || "",
  );
  const [title, setTitle] = useState(
    specialOfferFromLanding ? specialOfferFromLanding.title : "",
  );
  const [description, setDescription] = useState(
    specialOfferFromLanding
      ? `${specialOfferFromLanding.description} (${specialOfferFromLanding.discount})`
      : "",
  );
  const [urgency, setUrgency] = useState<string>("normal");
  const [serviceLocation, setServiceLocation] = useState<string>("shop");
  const [submitting, setSubmitting] = useState(false);
  const [shareLocation, setShareLocation] = useState(false);

  // Vehicle type classification
  const [vehicleType, setVehicleType] = useState<string>("");
  const [vehicleTypeLocked, setVehicleTypeLocked] = useState(false);
  // Service scope: service only, parts only, or both
  const [serviceScope, setServiceScope] = useState<string>("both");
  // Customer responsibility acknowledgment
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Address check for mobile/roadside services
  const [userAddresses, setUserAddresses] = useState<any[]>([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);

  // Payment Method Check
  const [checkingPayment, setCheckingPayment] = useState(true);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] =
    useState<PaymentMethod | null>(null);

  // Active Service Check - Block if user has ongoing service
  const [hasActiveService, setHasActiveService] = useState(false);
  const [activeServiceInfo, setActiveServiceInfo] = useState<{
    orderNumber: string;
    title: string;
    status: string;
  } | null>(null);

  // Favorite Provider Selection
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<FavoriteProvider | null>(
      preSelectedProviderFromLanding
        ? {
            id: preSelectedProviderFromLanding.id,
            businessName: preSelectedProviderFromLanding.name,
            rating: preSelectedProviderFromLanding.rating || 0,
            totalServices: 0,
            specialty: preSelectedProviderFromLanding.services.join(", "),
          }
        : preSelectedProviderId && preSelectedProviderName
          ? {
              id: preSelectedProviderId,
              businessName: preSelectedProviderName,
              rating: 0,
              totalServices: 0,
              specialty: "",
            }
          : null,
    );

  // Special Offer tracking
  const [appliedOffer, setAppliedOffer] = useState<SpecialOffer | null>(
    specialOfferFromLanding,
  );

  // Smart Sub-options for service types
  const [showSubOptionsModal, setShowSubOptionsModal] = useState(false);
  const [subOptionSelections, setSubOptionSelections] = useState<Record<string, string[]>>({});
  const [pendingServiceId, setPendingServiceId] = useState<string>("");

  // Sub-options configuration per service type
  const SERVICE_SUB_OPTIONS: Record<string, { title: string; sections: { id: string; label: string; type: "single" | "multi"; options: { id: string; label: string; icon?: string }[] }[] }> = {
    oil: {
      title: t.createRequest?.oilChangeOptions || "Oil Change Details",
      sections: [
        {
          id: "oilType",
          label: t.createRequest?.oilType || "Oil Type",
          type: "single",
          options: [
            { id: "motor", label: t.createRequest?.motorOil || "Motor Oil (Engine)", icon: "cog" },
            { id: "transmission", label: t.createRequest?.transmissionFluid || "Transmission Fluid", icon: "swap-horizontal" },
            { id: "both", label: t.createRequest?.bothOils || "Both (Motor + Transmission)", icon: "layers" },
          ],
        },
        {
          id: "filters",
          label: t.createRequest?.filtersToReplace || "Filters to Replace",
          type: "multi",
          options: [
            { id: "oil_filter", label: t.createRequest?.oilFilter || "Oil Filter", icon: "funnel" },
            { id: "air_filter", label: t.createRequest?.airFilter || "Air Filter", icon: "cloud" },
            { id: "cabin_filter", label: t.createRequest?.cabinFilter || "Cabin Air Filter", icon: "car" },
            { id: "fuel_filter", label: t.createRequest?.fuelFilter || "Fuel Filter", icon: "flame" },
          ],
        },
        {
          id: "oilGrade",
          label: t.createRequest?.oilGrade || "Oil Grade (if known)",
          type: "single",
          options: [
            { id: "conventional", label: t.createRequest?.conventional || "Conventional", icon: "water" },
            { id: "synthetic_blend", label: t.createRequest?.syntheticBlend || "Synthetic Blend", icon: "beaker" },
            { id: "full_synthetic", label: t.createRequest?.fullSynthetic || "Full Synthetic", icon: "diamond" },
            { id: "high_mileage", label: t.createRequest?.highMileage || "High Mileage", icon: "speedometer" },
            { id: "not_sure", label: t.createRequest?.notSure || "Not Sure / Let provider decide", icon: "help-circle" },
          ],
        },
      ],
    },
    brake: {
      title: t.createRequest?.brakeOptions || "Brake Service Details",
      sections: [
        {
          id: "brakeLocation",
          label: t.createRequest?.brakeLocation || "Which Brakes?",
          type: "single",
          options: [
            { id: "front", label: t.createRequest?.frontBrakes || "Front Brakes", icon: "arrow-up" },
            { id: "rear", label: t.createRequest?.rearBrakes || "Rear Brakes", icon: "arrow-down" },
            { id: "all", label: t.createRequest?.allBrakes || "All Brakes (Front + Rear)", icon: "swap-vertical" },
            { id: "not_sure", label: t.createRequest?.notSureBrakes || "Not Sure / Need Inspection", icon: "help-circle" },
          ],
        },
        {
          id: "brakeService",
          label: t.createRequest?.brakeServiceType || "Service Needed",
          type: "multi",
          options: [
            { id: "pads", label: t.createRequest?.brakePads || "Brake Pads", icon: "square" },
            { id: "rotors", label: t.createRequest?.brakeRotors || "Rotors / Discs", icon: "ellipse" },
            { id: "fluid", label: t.createRequest?.brakeFluid || "Brake Fluid Flush", icon: "water" },
            { id: "calipers", label: t.createRequest?.brakeCalipers || "Calipers", icon: "build" },
            { id: "lines", label: t.createRequest?.brakeLines || "Brake Lines / Hoses", icon: "git-branch" },
            { id: "abs", label: t.createRequest?.absSystem || "ABS System", icon: "warning" },
          ],
        },
        {
          id: "brakeSymptoms",
          label: t.createRequest?.brakeSymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            { id: "squeaking", label: t.createRequest?.squeaking || "Squeaking / Squealing", icon: "volume-high" },
            { id: "grinding", label: t.createRequest?.grinding || "Grinding Noise", icon: "alert-circle" },
            { id: "vibration", label: t.createRequest?.vibrationBrake || "Vibration When Braking", icon: "pulse" },
            { id: "pulling", label: t.createRequest?.pullingToSide || "Pulling to One Side", icon: "arrow-forward" },
            { id: "soft_pedal", label: t.createRequest?.softPedal || "Soft / Spongy Pedal", icon: "arrow-down-circle" },
          ],
        },
      ],
    },
    tire: {
      title: t.createRequest?.tireOptions || "Tire Service Details",
      sections: [
        {
          id: "tireService",
          label: t.createRequest?.tireServiceType || "Service Needed",
          type: "multi",
          options: [
            { id: "rotation", label: t.createRequest?.tireRotation || "Tire Rotation", icon: "refresh" },
            { id: "balance", label: t.createRequest?.tireBalance || "Balancing", icon: "git-compare" },
            { id: "alignment", label: t.createRequest?.tireAlignment || "Alignment", icon: "resize" },
            { id: "replacement", label: t.createRequest?.tireReplacement || "Tire Replacement", icon: "swap-horizontal" },
            { id: "repair", label: t.createRequest?.tireRepair || "Flat Tire / Puncture Repair", icon: "build" },
            { id: "tpms", label: t.createRequest?.tpms || "TPMS Sensor", icon: "speedometer" },
          ],
        },
        {
          id: "tireCount",
          label: t.createRequest?.howManyTires || "How Many Tires?",
          type: "single",
          options: [
            { id: "1", label: "1", icon: "ellipse" },
            { id: "2", label: "2", icon: "ellipse" },
            { id: "4", label: "4 (Full Set)", icon: "apps" },
            { id: "spare", label: t.createRequest?.spareTire || "Spare Tire", icon: "add-circle" },
          ],
        },
      ],
    },
    engine: {
      title: t.createRequest?.engineOptions || "Engine Service Details",
      sections: [
        {
          id: "engineService",
          label: t.createRequest?.engineServiceType || "Service Needed",
          type: "multi",
          options: [
            { id: "diagnostic", label: t.createRequest?.engineDiagnostic || "Engine Diagnostic / Check Engine Light", icon: "search" },
            { id: "tune_up", label: t.createRequest?.tuneUp || "Tune-Up", icon: "options" },
            { id: "timing_belt", label: t.createRequest?.timingBelt || "Timing Belt / Chain", icon: "time" },
            { id: "head_gasket", label: t.createRequest?.headGasket || "Head Gasket", icon: "layers" },
            { id: "spark_plugs", label: t.createRequest?.sparkPlugs || "Spark Plugs", icon: "flash" },
            { id: "valve_cover", label: t.createRequest?.valveCover || "Valve Cover Gasket", icon: "shield" },
            { id: "motor_mount", label: t.createRequest?.motorMount || "Motor Mounts", icon: "cube" },
            { id: "overheating", label: t.createRequest?.overheating || "Overheating Issue", icon: "thermometer" },
          ],
        },
        {
          id: "engineSymptoms",
          label: t.createRequest?.engineSymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            { id: "check_engine", label: t.createRequest?.checkEngineLight || "Check Engine Light On", icon: "warning" },
            { id: "rough_idle", label: t.createRequest?.roughIdle || "Rough Idle / Vibration", icon: "pulse" },
            { id: "loss_power", label: t.createRequest?.lossPower || "Loss of Power", icon: "trending-down" },
            { id: "stalling", label: t.createRequest?.stalling || "Stalling / Won't Start", icon: "close-circle" },
            { id: "smoke", label: t.createRequest?.smoke || "Smoke from Exhaust", icon: "cloud" },
            { id: "noise", label: t.createRequest?.engineNoise || "Unusual Noise (Knocking / Ticking)", icon: "volume-high" },
            { id: "oil_leak", label: t.createRequest?.oilLeak || "Oil Leak", icon: "water" },
          ],
        },
      ],
    },
    electric: {
      title: t.createRequest?.electricalOptions || "Electrical Service Details",
      sections: [
        {
          id: "electricalService",
          label: t.createRequest?.electricalServiceType || "Service Needed",
          type: "multi",
          options: [
            { id: "alternator", label: t.createRequest?.alternator || "Alternator", icon: "flash" },
            { id: "starter", label: t.createRequest?.starter || "Starter Motor", icon: "play" },
            { id: "wiring", label: t.createRequest?.wiring || "Wiring / Short Circuit", icon: "git-branch" },
            { id: "fuses", label: t.createRequest?.fuses || "Fuses / Relay", icon: "remove" },
            { id: "lights", label: t.createRequest?.lights || "Lights (Headlights / Tail / Interior)", icon: "bulb" },
            { id: "power_windows", label: t.createRequest?.powerWindows || "Power Windows / Locks", icon: "contract" },
            { id: "dashboard", label: t.createRequest?.dashboardElectrical || "Dashboard / Gauges", icon: "speedometer" },
            { id: "sensors", label: t.createRequest?.sensors || "Sensors (O2, MAF, MAP, etc.)", icon: "analytics" },
          ],
        },
        {
          id: "electricalSymptoms",
          label: t.createRequest?.electricalSymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            { id: "no_start", label: t.createRequest?.noStart || "Car Won't Start", icon: "close-circle" },
            { id: "dim_lights", label: t.createRequest?.dimLights || "Dim or Flickering Lights", icon: "bulb" },
            { id: "dead_battery", label: t.createRequest?.deadBattery || "Battery Keeps Dying", icon: "battery-dead" },
            { id: "burning_smell", label: t.createRequest?.burningSmell || "Burning Smell", icon: "flame" },
          ],
        },
      ],
    },
    ac: {
      title: t.createRequest?.acOptions || "A/C & Heating Details",
      sections: [
        {
          id: "acService",
          label: t.createRequest?.acServiceType || "Service Needed",
          type: "multi",
          options: [
            { id: "recharge", label: t.createRequest?.acRecharge || "A/C Recharge (Freon / R-134a)", icon: "snow" },
            { id: "diagnostic", label: t.createRequest?.acDiagnostic || "A/C Diagnostic", icon: "search" },
            { id: "compressor", label: t.createRequest?.acCompressor || "Compressor Repair / Replace", icon: "cog" },
            { id: "condenser", label: t.createRequest?.acCondenser || "Condenser", icon: "grid" },
            { id: "evaporator", label: t.createRequest?.acEvaporator || "Evaporator", icon: "swap-vertical" },
            { id: "cabin_filter", label: t.createRequest?.cabinFilter || "Cabin Air Filter", icon: "car" },
            { id: "heater_core", label: t.createRequest?.heaterCore || "Heater Core", icon: "flame" },
            { id: "blower_motor", label: t.createRequest?.blowerMotor || "Blower Motor", icon: "aperture" },
          ],
        },
        {
          id: "acSymptoms",
          label: t.createRequest?.acSymptoms || "What's happening?",
          type: "multi",
          options: [
            { id: "no_cold", label: t.createRequest?.noColdAir || "No Cold Air", icon: "thermometer" },
            { id: "no_heat", label: t.createRequest?.noHeat || "No Heat", icon: "snow" },
            { id: "weak_flow", label: t.createRequest?.weakAirflow || "Weak Airflow", icon: "trending-down" },
            { id: "bad_smell", label: t.createRequest?.badSmellAc || "Bad Smell from Vents", icon: "alert-circle" },
            { id: "noise_ac", label: t.createRequest?.noiseAc || "Noise When A/C is On", icon: "volume-high" },
          ],
        },
      ],
    },
    suspension: {
      title: t.createRequest?.suspensionOptions || "Suspension Service Details",
      sections: [
        {
          id: "suspensionService",
          label: t.createRequest?.suspensionServiceType || "Service Needed",
          type: "multi",
          options: [
            { id: "shocks", label: t.createRequest?.shocksStruts || "Shocks / Struts", icon: "resize" },
            { id: "springs", label: t.createRequest?.springs || "Springs (Coil / Leaf)", icon: "contract" },
            { id: "control_arms", label: t.createRequest?.controlArms || "Control Arms", icon: "git-branch" },
            { id: "ball_joints", label: t.createRequest?.ballJoints || "Ball Joints", icon: "ellipse" },
            { id: "tie_rods", label: t.createRequest?.tieRods || "Tie Rods (Inner / Outer)", icon: "remove" },
            { id: "sway_bar", label: t.createRequest?.swayBar || "Sway Bar / Links", icon: "swap-horizontal" },
            { id: "bushings", label: t.createRequest?.bushings || "Bushings", icon: "radio-button-on" },
            { id: "wheel_bearing", label: t.createRequest?.wheelBearing || "Wheel Bearings / Hub", icon: "sync" },
          ],
        },
        {
          id: "suspensionLocation",
          label: t.createRequest?.suspensionLocation || "Which Area?",
          type: "single",
          options: [
            { id: "front", label: t.createRequest?.frontSuspension || "Front", icon: "arrow-up" },
            { id: "rear", label: t.createRequest?.rearSuspension || "Rear", icon: "arrow-down" },
            { id: "both", label: t.createRequest?.bothSuspension || "Both (Front + Rear)", icon: "swap-vertical" },
            { id: "not_sure", label: t.createRequest?.notSure || "Not Sure", icon: "help-circle" },
          ],
        },
        {
          id: "suspensionSymptoms",
          label: t.createRequest?.suspensionSymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            { id: "bouncy", label: t.createRequest?.bouncyRide || "Bouncy / Rough Ride", icon: "pulse" },
            { id: "clunking", label: t.createRequest?.clunking || "Clunking over Bumps", icon: "volume-high" },
            { id: "pulling", label: t.createRequest?.pullingToSide || "Pulling to One Side", icon: "arrow-forward" },
            { id: "uneven_wear", label: t.createRequest?.unevenTireWear || "Uneven Tire Wear", icon: "analytics" },
            { id: "leaking", label: t.createRequest?.leakingShock || "Leaking Shock / Strut", icon: "water" },
          ],
        },
      ],
    },
    transmission: {
      title: t.createRequest?.transmissionOptions || "Transmission Service Details",
      sections: [
        {
          id: "transType",
          label: t.createRequest?.transmissionType || "Transmission Type",
          type: "single",
          options: [
            { id: "automatic", label: t.createRequest?.automatic || "Automatic", icon: "car" },
            { id: "manual", label: t.createRequest?.manual || "Manual / Stick Shift", icon: "hand-left" },
            { id: "cvt", label: t.createRequest?.cvt || "CVT (Continuously Variable)", icon: "sync" },
            { id: "not_sure", label: t.createRequest?.notSure || "Not Sure", icon: "help-circle" },
          ],
        },
        {
          id: "transService",
          label: t.createRequest?.transmissionServiceType || "Service Needed",
          type: "multi",
          options: [
            { id: "fluid_change", label: t.createRequest?.transFluidChange || "Transmission Fluid Change", icon: "water" },
            { id: "flush", label: t.createRequest?.transFlush || "Transmission Flush", icon: "refresh" },
            { id: "diagnostic", label: t.createRequest?.transDiagnostic || "Diagnostic / Inspection", icon: "search" },
            { id: "rebuild", label: t.createRequest?.transRebuild || "Rebuild / Overhaul", icon: "construct" },
            { id: "replace", label: t.createRequest?.transReplace || "Replacement", icon: "swap-horizontal" },
            { id: "clutch", label: t.createRequest?.clutch || "Clutch Repair / Replace (Manual)", icon: "disc" },
            { id: "torque_converter", label: t.createRequest?.torqueConverter || "Torque Converter", icon: "sync" },
            { id: "solenoid", label: t.createRequest?.solenoid || "Shift Solenoid", icon: "flash" },
          ],
        },
        {
          id: "transSymptoms",
          label: t.createRequest?.transSymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            { id: "slipping", label: t.createRequest?.slipping || "Slipping Gears", icon: "alert-circle" },
            { id: "hard_shift", label: t.createRequest?.hardShifting || "Hard / Delayed Shifting", icon: "chevron-forward" },
            { id: "grinding", label: t.createRequest?.grindingTrans || "Grinding Noise", icon: "volume-high" },
            { id: "leak", label: t.createRequest?.transLeak || "Fluid Leak (Red / Brown)", icon: "water" },
            { id: "no_move", label: t.createRequest?.wontMove || "Won't Move / Engage", icon: "close-circle" },
            { id: "check_light", label: t.createRequest?.transLight || "Transmission Warning Light", icon: "warning" },
          ],
        },
      ],
    },
    inspection: {
      title: t.createRequest?.inspectionOptions || "Diagnostic & Inspection Details",
      sections: [
        {
          id: "inspectionType",
          label: t.createRequest?.inspectionType || "What type of inspection do you need?",
          type: "single",
          options: [
            { id: "general_diagnostic", label: t.createRequest?.generalDiagnostic || "General Diagnostic (Warning Lights / Unknown Issue)", icon: "search" },
            { id: "pre_purchase", label: t.createRequest?.prePurchase || "Pre-Purchase Inspection (Buying a Used Car)", icon: "cart" },
            { id: "state_inspection", label: t.createRequest?.stateInspection || "State Safety Inspection", icon: "shield-checkmark" },
            { id: "emissions", label: t.createRequest?.emissions || "Emissions Test", icon: "cloud" },
            { id: "multi_point", label: t.createRequest?.multiPoint || "Multi-Point / Full Vehicle Inspection", icon: "clipboard" },
            { id: "seasonal", label: t.createRequest?.seasonal || "Seasonal Check-Up (Winter / Summer Prep)", icon: "sunny" },
            { id: "road_test", label: t.createRequest?.roadTest || "Road Test / Drive Evaluation", icon: "car" },
            { id: "second_opinion", label: t.createRequest?.secondOpinion || "Second Opinion on Previous Diagnosis", icon: "eye" },
          ],
        },
        {
          id: "diagnosticFocus",
          label: t.createRequest?.whatDiagnosed || "What needs to be diagnosed? (select all that apply)",
          type: "multi",
          options: [
            { id: "engine", label: t.createRequest?.diagEngine || "Engine / Check Engine Light", icon: "cog" },
            { id: "transmission", label: t.createRequest?.diagTransmission || "Transmission / Shifting Issues", icon: "sync" },
            { id: "brakes", label: t.createRequest?.diagBrakes || "Brakes / Noise / Vibration", icon: "disc" },
            { id: "suspension", label: t.createRequest?.diagSuspension || "Suspension / Steering / Alignment", icon: "resize" },
            { id: "electrical", label: t.createRequest?.diagElectrical || "Electrical System / Battery / Lights", icon: "flash" },
            { id: "ac_heating", label: t.createRequest?.diagAcHeating || "A/C or Heating Not Working", icon: "thermometer" },
            { id: "exhaust", label: t.createRequest?.diagExhaust || "Exhaust / Catalytic Converter / Emissions", icon: "cloud" },
            { id: "fluids_leaks", label: t.createRequest?.diagFluids || "Fluid Leaks (Oil, Coolant, Transmission)", icon: "water" },
            { id: "tires_wheels", label: t.createRequest?.diagTires || "Tires / Wheels / TPMS", icon: "ellipse" },
            { id: "noises", label: t.createRequest?.diagNoises || "Strange Noises (Identify Source)", icon: "volume-high" },
            { id: "performance", label: t.createRequest?.diagPerformance || "Performance Loss / Stalling / Rough Idle", icon: "trending-down" },
            { id: "body_interior", label: t.createRequest?.diagBodyInterior || "Body / Interior / Paint / Rust", icon: "car" },
            { id: "cooling_system", label: t.createRequest?.diagCooling || "Cooling System / Radiator / Hoses", icon: "snow" },
            { id: "fuel_system", label: t.createRequest?.diagFuelSystem || "Fuel System / Injectors / Fuel Pump", icon: "speedometer" },
            { id: "drivetrain", label: t.createRequest?.diagDrivetrain || "Drivetrain / 4WD / AWD / Differential", icon: "git-branch" },
            { id: "power_steering", label: t.createRequest?.diagPowerSteering || "Power Steering / Steering Rack", icon: "move" },
            { id: "starting_charging", label: t.createRequest?.diagStartingCharging || "Starting & Charging System (Alternator / Starter)", icon: "battery-charging" },
            { id: "abs_traction", label: t.createRequest?.diagAbsTraction || "ABS / Traction Control / Stability", icon: "shield" },
            { id: "infotainment", label: t.createRequest?.diagInfotainment || "Infotainment / Audio / Navigation / Cameras", icon: "tv" },
            { id: "windows_locks", label: t.createRequest?.diagWindowsLocks || "Power Windows / Doors / Locks / Mirrors", icon: "contract" },
            { id: "not_sure", label: t.createRequest?.diagNotSure || "Not Sure — Full Diagnostic Needed", icon: "help-circle" },
          ],
        },
        {
          id: "diagnosticSymptoms",
          label: t.createRequest?.diagnosticSymptoms || "Describe any symptoms (optional)",
          type: "multi",
          options: [
            { id: "warning_light", label: t.createRequest?.warningLight || "Dashboard Warning Light On", icon: "warning" },
            { id: "odd_smell", label: t.createRequest?.oddSmell || "Unusual Smell (Burning, Fuel, Sweet)", icon: "flame" },
            { id: "vibration", label: t.createRequest?.vibrationSymptom || "Vibration / Shaking", icon: "pulse" },
            { id: "starting_issue", label: t.createRequest?.startingIssue || "Difficulty Starting / Won't Start", icon: "close-circle" },
            { id: "overheating", label: t.createRequest?.overheatingSymptom || "Overheating", icon: "thermometer" },
            { id: "poor_fuel", label: t.createRequest?.poorFuel || "Poor Fuel Economy", icon: "speedometer" },
            { id: "pulling", label: t.createRequest?.pullingSide || "Pulling to One Side", icon: "arrow-forward" },
            { id: "battery_drain", label: t.createRequest?.batteryDrain || "Battery Keeps Dying / Parasitic Drain", icon: "battery-dead" },
            { id: "smoke_exhaust", label: t.createRequest?.smokeExhaust || "Smoke from Exhaust (White / Blue / Black)", icon: "cloud" },
            { id: "fluid_under_car", label: t.createRequest?.fluidUnderCar || "Fluid Puddle Under Vehicle", icon: "water" },
          ],
        },
      ],
    },
    battery: {
      title: t.createRequest?.batteryOptions || "Battery Service Details",
      sections: [
        {
          id: "batteryService",
          label: t.createRequest?.batteryServiceType || "Service Needed",
          type: "single",
          options: [
            { id: "test", label: t.createRequest?.batteryTest || "Battery Test / Diagnostic", icon: "speedometer" },
            { id: "replacement", label: t.createRequest?.batteryReplacement || "Battery Replacement", icon: "swap-horizontal" },
            { id: "jumpstart", label: t.createRequest?.jumpStart || "Jump Start", icon: "flash" },
            { id: "terminals", label: t.createRequest?.batteryTerminals || "Clean / Replace Terminals & Cables", icon: "git-branch" },
          ],
        },
        {
          id: "batterySymptoms",
          label: t.createRequest?.batterySymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            { id: "slow_crank", label: t.createRequest?.slowCrank || "Slow Crank / Hard to Start", icon: "time" },
            { id: "no_start", label: t.createRequest?.noStartBattery || "Won't Start at All", icon: "close-circle" },
            { id: "warning_light", label: t.createRequest?.batteryLight || "Battery Warning Light", icon: "warning" },
            { id: "corrosion", label: t.createRequest?.corrosion || "Corrosion on Terminals", icon: "alert-circle" },
            { id: "old_battery", label: t.createRequest?.oldBattery || "Battery is 3+ Years Old", icon: "calendar" },
          ],
        },
      ],
    },
    towing: {
      title: t.createRequest?.towingOptions || "Towing Details",
      sections: [
        {
          id: "towingReason",
          label: t.createRequest?.towingReason || "Reason for Towing",
          type: "single",
          options: [
            { id: "breakdown", label: t.createRequest?.breakdown || "Breakdown / Won't Start", icon: "close-circle" },
            { id: "accident", label: t.createRequest?.accident || "Accident / Collision", icon: "alert-circle" },
            { id: "flat_tire", label: t.createRequest?.flatTireTow || "Flat Tire (No Spare)", icon: "ellipse" },
            { id: "transport", label: t.createRequest?.vehicleTransport || "Vehicle Transport / Relocation", icon: "navigate" },
            { id: "impound", label: t.createRequest?.impound || "Pick Up from Impound", icon: "lock-closed" },
          ],
        },
        {
          id: "vehicleCondition",
          label: t.createRequest?.vehicleCondition || "Vehicle Condition",
          type: "single",
          options: [
            { id: "rolls", label: t.createRequest?.vehicleRolls || "Wheels Roll (Neutral OK)", icon: "checkmark-circle" },
            { id: "no_roll", label: t.createRequest?.vehicleNoRoll || "Wheels Locked / Won't Roll", icon: "close-circle" },
            { id: "not_sure", label: t.createRequest?.notSure || "Not Sure", icon: "help-circle" },
          ],
        },
      ],
    },
    roadside: {
      title: t.createRequest?.roadsideOptions || "Roadside Assistance Details",
      sections: [
        {
          id: "roadsideNeed",
          label: t.createRequest?.roadsideNeed || "What Do You Need?",
          type: "single",
          options: [
            { id: "jumpstart", label: t.createRequest?.jumpStart || "Jump Start", icon: "flash" },
            { id: "flat_tire", label: t.createRequest?.flatTireChange || "Flat Tire Change", icon: "ellipse" },
            { id: "fuel", label: t.createRequest?.fuelDelivery || "Fuel Delivery", icon: "flame" },
            { id: "lockout_road", label: t.createRequest?.lockedOut || "Locked Out", icon: "key" },
            { id: "winch", label: t.createRequest?.winchOut || "Winch Out (Stuck / Ditch)", icon: "link" },
            { id: "other_road", label: t.createRequest?.otherRoadside || "Other Roadside Help", icon: "help-circle" },
          ],
        },
      ],
    },
    lockout: {
      title: t.createRequest?.lockoutOptions || "Lockout Details",
      sections: [
        {
          id: "lockoutType",
          label: t.createRequest?.lockoutType || "Lockout Situation",
          type: "single",
          options: [
            { id: "keys_inside", label: t.createRequest?.keysInside || "Keys Locked Inside Car", icon: "key" },
            { id: "lost_keys", label: t.createRequest?.lostKeys || "Lost / Broken Keys", icon: "close-circle" },
            { id: "key_fob", label: t.createRequest?.keyFob || "Key Fob Not Working", icon: "radio" },
            { id: "trunk", label: t.createRequest?.trunkLockout || "Trunk Lockout", icon: "cube" },
            { id: "ignition", label: t.createRequest?.ignitionKey || "Key Stuck in Ignition", icon: "lock-closed" },
          ],
        },
      ],
    },
    other: {
      title: t.createRequest?.otherOptions || "Service Details",
      sections: [
        {
          id: "otherCategory",
          label: t.createRequest?.otherCategory || "Category",
          type: "single",
          options: [
            { id: "exhaust", label: t.createRequest?.exhaust || "Exhaust / Muffler", icon: "cloud" },
            { id: "cooling", label: t.createRequest?.coolingSystem || "Cooling System (Radiator / Hoses)", icon: "water" },
            { id: "steering", label: t.createRequest?.steering || "Power Steering", icon: "sync" },
            { id: "fuel_system", label: t.createRequest?.fuelSystem || "Fuel System (Pump / Injectors)", icon: "flame" },
            { id: "body_work", label: t.createRequest?.bodyWork || "Body Work / Dents / Paint", icon: "color-palette" },
            { id: "glass", label: t.createRequest?.glass || "Windshield / Glass", icon: "expand" },
            { id: "custom", label: t.createRequest?.customService || "Something Else", icon: "create" },
          ],
        },
      ],
    },
  };

  // Handle sub-option toggle
  const handleSubOptionToggle = (sectionId: string, optionId: string, type: "single" | "multi") => {
    setSubOptionSelections(prev => {
      const current = prev[sectionId] || [];
      if (type === "single") {
        return { ...prev, [sectionId]: [optionId] };
      }
      // multi toggle
      if (current.includes(optionId)) {
        return { ...prev, [sectionId]: current.filter(id => id !== optionId) };
      }
      return { ...prev, [sectionId]: [...current, optionId] };
    });
  };

  // Confirm sub-options and build description
  const confirmSubOptions = () => {
    const subOpts = SERVICE_SUB_OPTIONS[pendingServiceId];
    if (!subOpts) return;
    const details: string[] = [];
    let primarySelection = "";
    subOpts.sections.forEach(section => {
      const selected = subOptionSelections[section.id] || [];
      if (selected.length > 0) {
        const labels = selected.map(id => {
          const opt = section.options.find(o => o.id === id);
          return opt?.label || id;
        });
        details.push(`${section.label}: ${labels.join(", ")}`);
        // Use first single-select section's value for the title suffix
        if (!primarySelection && section.type === "single" && selected[0] !== "not_sure") {
          const opt = section.options.find(o => o.id === selected[0]);
          if (opt) primarySelection = opt.label;
        }
      }
    });
    if (details.length > 0) {
      const serviceLabel = serviceTypes.find(s => s.id === pendingServiceId)?.label || "";
      const detailText = details.join(" | ");
      setDescription(prev => prev ? `${prev}\n${detailText}` : detailText);
      setTitle(primarySelection ? `${serviceLabel} - ${primarySelection}` : serviceLabel);
    }
    setShowSubOptionsModal(false);
  };

  // Handle service type selection with sub-options
  const handleServiceSelect = (serviceId: string, serviceLabel: string) => {
    setSelectedService(serviceId);
    setTitle(serviceLabel);
    if (SERVICE_SUB_OPTIONS[serviceId]) {
      setPendingServiceId(serviceId);
      setSubOptionSelections({});
      setShowSubOptionsModal(true);
    }
  };

  // Favorite providers - fetched from API
  const [favoriteProviders, setFavoriteProviders] = useState<
    FavoriteProvider[]
  >([]);

  // Check for payment method and active services on focus
  useFocusEffect(
    useCallback(() => {
      checkRequirements();
      loadFavoriteProviders();
      loadUserAddresses();
    }, []),
  );

  // Load user addresses from API / AsyncStorage
  async function loadUserAddresses() {
    try {
      let addresses: any[] = [];
      try {
        const apiDefault = (await import("../services/api")).default;
        const response = await apiDefault.get("/users/me");
        const raw =
          response.data?.data?.addressesJson || response.data?.addressesJson;
        if (raw) {
          addresses = typeof raw === "string" ? JSON.parse(raw) : raw;
        }
      } catch {
        const AsyncStorage = (
          await import("@react-native-async-storage/async-storage")
        ).default;
        const saved = await AsyncStorage.getItem("@TechTrust:addresses");
        if (saved) addresses = JSON.parse(saved);
      }
      setUserAddresses(Array.isArray(addresses) ? addresses : []);
    } catch {
      setUserAddresses([]);
    } finally {
      setAddressesLoaded(true);
    }
  }

  async function loadFavoriteProviders() {
    try {
      // Fetch favorite providers from API: api.get('/users/favorite-providers')
      setFavoriteProviders([]); // Empty until API is integrated
    } catch (error) {
      console.error("Error loading favorite providers:", error);
    }
  }

  async function checkRequirements() {
    setCheckingPayment(true);
    try {
      // Check for active work orders from API
      try {
        const { getWorkOrders } = await import("../services/dashboard.service");
        const workOrders = await getWorkOrders();
        const activeOrders = workOrders.filter(
          (wo) =>
            wo.status === "IN_PROGRESS" ||
            wo.status === "SCHEDULED" ||
            wo.status === "AWAITING_PAYMENT",
        );

        if (activeOrders.length > 0) {
          setHasActiveService(true);
          setActiveServiceInfo(activeOrders[0]);
        } else {
          setHasActiveService(false);
          setActiveServiceInfo(null);
        }
      } catch (error) {
        console.error("Error checking active work orders:", error);
        setHasActiveService(false);
        setActiveServiceInfo(null);
      }

      // Check payment methods - try API first (cross-device), fallback to AsyncStorage
      try {
        let methods: any[] = [];

        // Try API first
        try {
          const apiDefault = (await import("../services/api")).default;
          const response = await apiDefault.get("/payment-methods");
          methods = response.data?.data || [];
        } catch (apiErr) {
          // Fallback to AsyncStorage
          const AsyncStorage = (
            await import("@react-native-async-storage/async-storage")
          ).default;
          const PAYMENT_METHODS_KEY = "@TechTrust:paymentMethods";
          const savedMethods = await AsyncStorage.getItem(PAYMENT_METHODS_KEY);
          if (savedMethods) {
            methods = JSON.parse(savedMethods);
          }
        }

        if (methods.length > 0) {
          setHasPaymentMethod(true);
          const defaultMethod =
            methods.find((p: any) => p.isDefault) || methods[0];
          setDefaultPaymentMethod({
            ...defaultMethod,
            brand: defaultMethod.cardBrand || defaultMethod.brand,
            lastFour: defaultMethod.cardLast4 || defaultMethod.lastFour,
          });
        } else {
          setHasPaymentMethod(false);
          setDefaultPaymentMethod(null);
        }
      } catch (error) {
        console.error("Error checking payment methods:", error);
        // If we can't check, allow creation but with warning
        setHasPaymentMethod(false);
        setDefaultPaymentMethod(null);
      }
    } finally {
      setCheckingPayment(false);
    }
  }

  // Vehicles - loaded from API
  const [vehicles, setVehicles] = useState<
    { id: string; name: string; plate: string; fuelType?: string; bodyType?: string }[]
  >([]);

  // Map NHTSA body class to vehicle type
  function mapBodyTypeToVehicleType(body?: string): string {
    if (!body) return '';
    const b = body.toLowerCase();
    if (b.includes('sedan') || b.includes('coupe') || b.includes('convertible') || b.includes('hatchback') || b.includes('wagon')) return 'car';
    if (b.includes('suv') || b.includes('sport utility') || b.includes('crossover')) return 'suv';
    if (b.includes('pickup')) return 'truck';
    if (b.includes('van') || b.includes('minivan') || b.includes('mpv') || b.includes('multi')) return 'van';
    if (b.includes('heavy') || b.includes('semi') || b.includes('medium') || b.includes('cab chassis') || b.includes('tractor')) return 'heavy_truck';
    if (b.includes('bus') || b.includes('rv') || b.includes('motorhome') || b.includes('coach') || b.includes('motor home')) return 'bus';
    if (b.includes('truck')) return 'truck';
    return '';
  }

  function handleVehicleSelect(vehicleId: string) {
    setSelectedVehicle(vehicleId);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle?.bodyType) {
      const mapped = mapBodyTypeToVehicleType(vehicle.bodyType);
      if (mapped) {
        setVehicleType(mapped);
        setVehicleTypeLocked(true);
      } else {
        setVehicleTypeLocked(false);
      }
    } else {
      setVehicleTypeLocked(false);
    }
  }

  // Load vehicles from API
  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    try {
      const { getVehicles } = await import("../services/dashboard.service");
      const vehicleData = await getVehicles();
      setVehicles(
        vehicleData.map((v) => ({
          id: v.id,
          name: [v.year, v.make, v.model, v.trim].filter(Boolean).join(' '),
          plate: v.plateNumber,
          fuelType: v.fuelType,
          bodyType: v.bodyType,
        })),
      );
      if (vehicleData.length > 0) {
        setSelectedVehicle(vehicleData[0].id);
        // Auto-select vehicle type based on bodyType
        const firstBody = vehicleData[0].bodyType;
        if (firstBody) {
          const mapped = mapBodyTypeToVehicleType(firstBody);
          if (mapped) {
            setVehicleType(mapped);
            setVehicleTypeLocked(true);
          }
        }
      }
    } catch (error) {
      console.error("Error loading vehicles:", error);
      setVehicles([]);
    }
  }

  // Service types - In production, these would be filtered based on available providers in the area
  // The 'hasProviders' field indicates if there are active providers offering this service
  const serviceTypes = [
    {
      id: "oil",
      label: t.createRequest?.serviceOilChange || "Oil Change",
      icon: "water",
      hasProviders: true,
    },
    {
      id: "brake",
      label: t.createRequest?.serviceBrakes || "Brakes",
      icon: "disc",
      hasProviders: true,
    },
    {
      id: "tire",
      label: t.createRequest?.serviceTires || "Tires",
      icon: "ellipse",
      hasProviders: true,
    },
    {
      id: "engine",
      label: t.createRequest?.serviceEngine || "Engine",
      icon: "cog",
      hasProviders: true,
    },
    {
      id: "electric",
      label: t.createRequest?.serviceElectrical || "Electrical",
      icon: "flash",
      hasProviders: true,
    },
    {
      id: "ac",
      label: t.createRequest?.serviceAC || "A/C",
      icon: "snow",
      hasProviders: true,
    },
    {
      id: "suspension",
      label: t.createRequest?.serviceSuspension || "Suspension",
      icon: "resize",
      hasProviders: true,
    },
    {
      id: "transmission",
      label: t.createRequest?.serviceTransmission || "Transmission",
      icon: "cog",
      hasProviders: false,
    }, // No providers currently
    {
      id: "inspection",
      label: t.createRequest?.serviceInspection || "Inspection",
      icon: "clipboard",
      hasProviders: true,
    },
    {
      id: "detailing",
      label: t.createRequest?.serviceDetailing || "Detailing",
      icon: "sparkles",
      hasProviders: false,
    }, // No providers currently
    {
      id: "towing",
      label: t.createRequest?.serviceTowing || "Towing",
      icon: "car",
      hasProviders: true,
    },
    {
      id: "roadside",
      label:
        t.serviceTypes?.roadsideAssistance ||
        t.createRequest?.serviceRoadside ||
        "Roadside Assist",
      icon: "warning",
      hasProviders: true,
    },
    {
      id: "battery",
      label: t.createRequest?.serviceBattery || "Battery",
      icon: "battery-charging",
      hasProviders: true,
    },
    {
      id: "lockout",
      label: t.createRequest?.serviceLockout || "Lockout",
      icon: "key",
      hasProviders: true,
    },
    {
      id: "other",
      label: t.createRequest?.serviceOther || "Other",
      icon: "ellipsis-horizontal",
      hasProviders: true,
    },
  ];

  // Filter only services that have active providers
  const availableServices = serviceTypes.filter((s) => s.hasProviders);

  const locationOptions = [
    {
      id: "shop",
      label: t.createRequest?.takeToShop || "At the Shop",
      icon: "business",
      description:
        t.createRequest?.iWillGo ||
        "I'll bring my vehicle to the service provider",
    },
    {
      id: "mobile",
      label: t.createRequest?.myLocation || "Mobile Service",
      icon: "home",
      description:
        t.createRequest?.currentLocation ||
        "Service provider comes to my location",
    },
    {
      id: "roadside",
      label:
        t.serviceTypes?.roadsideAssistance ||
        t.createRequest?.serviceRoadside ||
        "Roadside Assist",
      icon: "car",
      description:
        t.createRequest?.shareLocation || "Share your real-time location",
    },
  ];

  async function handleGetLocation() {
    Alert.alert(
      t.createRequest?.shareLocation || "Share Location",
      t.createRequest?.shareLocationMessage ||
        "Allow TechTrust to access your location to share with the service provider?",
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t.common?.allow || "Allow",
          onPress: async () => {
            try {
              const Location = await import("expo-location");
              const { status } =
                await Location.requestForegroundPermissionsAsync();
              if (status !== "granted") {
                Alert.alert(
                  t.common?.error || "Error",
                  t.createRequest?.locationPermissionDenied ||
                    "Location permission denied",
                );
                return;
              }
              const location = await Location.getCurrentPositionAsync({});
              setCurrentLocation({
                lat: location.coords.latitude,
                lng: location.coords.longitude,
              });
              setShareLocation(true);
              Alert.alert(
                t.common?.success || "Success",
                t.createRequest?.locationShared ||
                  "Your location will be shared with the provider",
              );
            } catch (err) {
              Alert.alert(
                t.common?.error || "Error",
                t.createRequest?.locationError || "Could not get location",
              );
            }
          },
        },
      ],
    );
  }

  function openInMaps() {
    if (currentLocation) {
      const url = Platform.select({
        ios: `maps://app?daddr=${currentLocation.lat},${currentLocation.lng}`,
        android: `google.navigation:q=${currentLocation.lat},${currentLocation.lng}`,
      });
      if (url) Linking.openURL(url);
    }
  }

  async function handleSubmit() {
    if (!selectedVehicle || !selectedService || !title || !vehicleType) {
      Alert.alert(
        t.common.error,
        t.createRequest?.fillRequired || "Please fill in all required fields (including vehicle type)",
      );
      return;
    }
    if (!responsibilityAccepted) {
      Alert.alert(
        t.createRequest?.disclaimerRequired || "Acknowledgment Required",
        t.createRequest?.pleaseAcceptDisclaimer || "Please read and accept the responsibility notice before submitting.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const apiDefault = (await import("../services/api")).default;

      // Build selected address for customerAddress field
      let customerAddress: string | undefined;
      if (serviceLocation !== "shop" && userAddresses.length > 0) {
        const defaultAddr =
          userAddresses.find((a: any) => a.isDefault) || userAddresses[0];
        if (defaultAddr) {
          customerAddress = [
            defaultAddr.street,
            defaultAddr.city,
            defaultAddr.state,
            defaultAddr.zipCode,
          ]
            .filter(Boolean)
            .join(", ");
        }
      }

      // Build enriched description with vehicle type, service scope, and sub-options
      const vehicleTypeLabels: Record<string, string> = {
        car: "Car / Sedan", suv: "SUV / Crossover", truck: "Pickup Truck",
        van: "Van / Minivan", heavy_truck: "Heavy Truck / Semi", bus: "Bus / RV",
      };
      const scopeLabels: Record<string, string> = {
        service: "Service / Labor Only", parts: "Parts Only", both: "Parts + Service",
      };
      const metaLines = [
        `Vehicle Type: ${vehicleTypeLabels[vehicleType] || vehicleType}`,
        `Scope: ${scopeLabels[serviceScope] || serviceScope}`,
      ];
      const enrichedDescription = description
        ? `${description}\n---\n${metaLines.join(" | ")}`
        : metaLines.join(" | ");

      await apiDefault.post("/service-requests", {
        vehicleId: selectedVehicle,
        serviceType: selectedService,
        title,
        description: enrichedDescription,
        serviceLocationType:
          serviceLocation === "mobile"
            ? "MOBILE"
            : serviceLocation === "roadside"
              ? "REMOTE"
              : "IN_SHOP",
        customerAddress: customerAddress || undefined,
        providerId: selectedProvider?.id || preSelectedProviderId || undefined,
        location:
          shareLocation && currentLocation ? currentLocation : undefined,
        urgency: urgency || undefined,
        vehicleCategory: vehicleType || undefined,
        serviceScope: serviceScope || undefined,
      });

      const providerName =
        selectedProvider?.businessName || preSelectedProviderName;
      const successMessage = providerName
        ? `${t.createRequest?.requestSentTo || "Request sent to"} ${providerName}. ${t.createRequest?.providerWillRespond || "They will respond shortly."}`
        : t.createRequest?.quotesWithin ||
          "You will receive quotes within 48 hours.";

      Alert.alert(
        t.createRequest?.submitted || "Request Submitted!",
        successMessage,
        [{ text: t.common.ok, onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      Alert.alert(
        t.common.error,
        err?.response?.data?.message ||
          t.common?.tryAgain ||
          "Could not submit request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Show loading while checking payment method
  if (checkingPayment) {
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
            {t.createRequest?.newRequest || "New Request"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>
            {t.common?.loading || "Loading..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show payment method required screen if no card registered
  if (!hasPaymentMethod) {
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
            {t.createRequest?.newRequest || "New Request"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.noPaymentContainer}>
          <View style={styles.noPaymentIcon}>
            <Ionicons name="card-outline" size={64} color="#d1d5db" />
          </View>
          <Text style={styles.noPaymentTitle}>
            {t.createRequest?.paymentRequired || "Payment Method Required"}
          </Text>
          <Text style={styles.noPaymentDescription}>
            {t.createRequest?.paymentRequiredDesc ||
              "To create a service request, you need to add a payment method first. This ensures secure payment processing when you accept a quote."}
          </Text>

          <View style={styles.noPaymentFeatures}>
            <View style={styles.featureRow}>
              <Ionicons name="shield-checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>
                {t.createRequest?.securePayment || "Secure payment processing"}
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="lock-closed" size={20} color="#10b981" />
              <Text style={styles.featureText}>
                {t.createRequest?.fundsHeld ||
                  "Funds held until service completion"}
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="refresh" size={20} color="#10b981" />
              <Text style={styles.featureText}>
                {t.createRequest?.easyRefund ||
                  "Easy refunds if service cancelled"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addPaymentBtn}
            onPress={() =>
              navigation.dispatch(
                CommonActions.navigate({
                  name: "Profile",
                  params: {
                    screen: "PaymentMethods",
                    initial: false,
                    params: { addCardMode: true, fromCreateRequest: true },
                  },
                }),
              )
            }
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addPaymentText}>
              {t.createRequest?.addPaymentMethod || "Add Payment Method"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.laterBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.laterText}>
              {t.createRequest?.doLater || "I'll do this later"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show active service blocking screen
  if (hasActiveService && activeServiceInfo) {
    const getStatusText = (status: string) => {
      const texts: Record<string, string> = {
        PENDING_START: t.workOrder?.pendingStart || "Pending Start",
        IN_PROGRESS: t.workOrder?.inProgress || "In Progress",
        AWAITING_PAYMENT: t.workOrder?.awaitingPayment || "Awaiting Payment",
      };
      return texts[status] || status;
    };

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
            {t.createRequest?.newRequest || "New Request"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.noPaymentContainer}>
          <View style={[styles.noPaymentIcon, { backgroundColor: "#fef3c7" }]}>
            <Ionicons name="time" size={64} color="#f59e0b" />
          </View>
          <Text style={styles.noPaymentTitle}>
            {t.createRequest?.activeServiceExists ||
              "Active Service in Progress"}
          </Text>
          <Text style={styles.noPaymentDescription}>
            {t.createRequest?.activeServiceDesc ||
              "You have an ongoing service that needs to be completed before creating a new request. Please complete or cancel your current service first."}
          </Text>

          <View style={styles.activeServiceCard}>
            <View style={styles.activeServiceHeader}>
              <View
                style={[
                  styles.activeServiceStatus,
                  { backgroundColor: "#fef3c7" },
                ]}
              >
                <Ionicons name="construct" size={16} color="#f59e0b" />
                <Text
                  style={[styles.activeServiceStatusText, { color: "#f59e0b" }]}
                >
                  {getStatusText(activeServiceInfo.status)}
                </Text>
              </View>
              <Text style={styles.activeServiceOrder}>
                #{activeServiceInfo.orderNumber}
              </Text>
            </View>
            <Text style={styles.activeServiceTitle}>
              {activeServiceInfo.title}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addPaymentBtn}
            onPress={() =>
              navigation.dispatch(
                CommonActions.navigate({
                  name: "Services",
                  params: {
                    screen: "WorkOrdersList",
                    initial: false,
                  },
                }),
              )
            }
          >
            <Ionicons name="eye" size={20} color="#fff" />
            <Text style={styles.addPaymentText}>
              {t.createRequest?.viewActiveService || "View Active Service"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.laterBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.laterText}>
              {t.common?.goBack || "Go Back"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          {t.createRequest?.newRequest || "New Request"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Payment Method Indicator */}
        <View style={styles.paymentMethodCard}>
          <View style={styles.paymentMethodInfo}>
            <Ionicons name="card" size={20} color="#1976d2" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.paymentMethodLabel}>
                {t.createRequest?.paymentMethod || "Payment Method"}
              </Text>
              <Text style={styles.paymentMethodValue}>
                {defaultPaymentMethod?.brand} ••••{" "}
                {defaultPaymentMethod?.lastFour}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                navigation.dispatch(
                  CommonActions.navigate({
                    name: "Profile",
                    params: {
                      screen: "PaymentMethods",
                      initial: false,
                      params: { fromCreateRequest: true },
                    },
                  }),
                )
              }
            >
              <Text style={styles.changePaymentText}>
                {t.common?.change || "Change"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.paymentMethodNote}>
            {t.createRequest?.paymentNote ||
              "Payment will be held when you accept a quote and charged upon service completion."}
          </Text>
        </View>

        {/* Selected Provider Banner */}
        {(selectedProvider || preSelectedProviderName) && (
          <View style={styles.selectedProviderBanner}>
            <Ionicons name="star" size={20} color="#1976d2" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.selectedProviderLabel}>
                {t.createRequest?.sendingTo || "Sending request to"}
              </Text>
              <Text style={styles.selectedProviderName}>
                {selectedProvider?.businessName || preSelectedProviderName}
              </Text>
            </View>
            <Ionicons name="heart" size={20} color="#ef4444" />
          </View>
        )}

        {/* Applied Special Offer Banner */}
        {appliedOffer && (
          <View style={styles.appliedOfferBanner}>
            <View style={styles.appliedOfferBadge}>
              <Text style={styles.appliedOfferBadgeText}>
                {appliedOffer.discount}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.appliedOfferLabel}>
                {t.createRequest?.specialOfferApplied ||
                  "Special Offer Applied"}
              </Text>
              <Text style={styles.appliedOfferTitle}>{appliedOffer.title}</Text>
              <Text style={styles.appliedOfferValidity}>
                {t.createRequest?.validUntil || "Valid until"}{" "}
                {appliedOffer.validUntil}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeOfferButton}
              onPress={() => setAppliedOffer(null)}
            >
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
        {/* Vehicle Selection */}
        <Text style={styles.sectionTitle}>
          {t.createRequest?.selectVehicle || "Select Vehicle"} *
        </Text>
        <View style={styles.vehiclesContainer}>
          {vehicles.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={[
                styles.vehicleCard,
                selectedVehicle === vehicle.id && styles.vehicleCardSelected,
              ]}
              onPress={() => handleVehicleSelect(vehicle.id)}
            >
              <Ionicons
                name="car"
                size={24}
                color={selectedVehicle === vehicle.id ? "#1976d2" : "#6b7280"}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={[
                    styles.vehicleName,
                    selectedVehicle === vehicle.id &&
                      styles.vehicleNameSelected,
                  ]}
                >
                  {vehicle.name}
                </Text>
                <Text style={styles.vehiclePlate}>
                  {[vehicle.plate, vehicle.fuelType].filter(Boolean).join(' • ')}
                </Text>
              </View>
              {selectedVehicle === vehicle.id && (
                <Ionicons name="checkmark-circle" size={24} color="#1976d2" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Service Type */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
            {t.createRequest?.serviceType || "Service Type"} *
          </Text>
          <TouchableOpacity
            style={{ marginLeft: 6, padding: 2 }}
            onPress={() => Alert.alert(
              t.createRequest?.serviceTypeInfoTitle || "About Service Type",
              t.createRequest?.serviceTypeInfoMessage || "Select the service that best matches your needs. If you need a full diagnostic or estimate, choose \"Inspection\" as the service type.\n\nOur verified providers will perform a professional diagnostic to confirm the actual issue before starting any work. You will receive a detailed estimate for approval before any service begins."
            )}
          >
            <Ionicons name="information-circle-outline" size={20} color="#1976d2" />
          </TouchableOpacity>
        </View>
        <View style={styles.servicesGrid}>
          {availableServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCard,
                selectedService === service.id && styles.serviceCardSelected,
              ]}
              onPress={() => handleServiceSelect(service.id, service.label)}
            >
              <Ionicons
                name={service.icon as any}
                size={24}
                color={selectedService === service.id ? "#1976d2" : "#6b7280"}
              />
              <Text
                style={[
                  styles.serviceLabel,
                  selectedService === service.id && styles.serviceLabelSelected,
                ]}
              >
                {service.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Vehicle Type */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
            {t.createRequest?.vehicleTypeLabel || "Vehicle Type"} *
          </Text>
          {vehicleTypeLocked && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
              <Ionicons name="lock-closed" size={12} color="#059669" />
              <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600', marginLeft: 4 }}>
                {t.createRequest?.autoSelected || "Auto"}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.servicesGrid}>
          {[
            { id: "car", label: t.createRequest?.vtCar || "Car / Sedan", mciIcon: "car-side" },
            { id: "suv", label: t.createRequest?.vtSuv || "SUV / Crossover", mciIcon: "car-estate" },
            { id: "truck", label: t.createRequest?.vtTruck || "Pickup Truck", mciIcon: "truck-outline" },
            { id: "van", label: t.createRequest?.vtVan || "Van / Minivan", mciIcon: "van-passenger" },
            { id: "heavy_truck", label: t.createRequest?.vtHeavyTruck || "Heavy Truck / Semi", mciIcon: "truck-trailer" },
            { id: "bus", label: t.createRequest?.vtBus || "Bus / RV", mciIcon: "rv-truck" },
          ].map((vt) => (
            <TouchableOpacity
              key={vt.id}
              style={[
                styles.serviceCard,
                vehicleType === vt.id && styles.serviceCardSelected,
                vehicleTypeLocked && vehicleType !== vt.id && { opacity: 0.4 },
              ]}
              onPress={() => {
                if (vehicleTypeLocked) {
                  Alert.alert(
                    t.createRequest?.vehicleTypeLocked || "Vehicle Type Locked",
                    t.createRequest?.vehicleTypeLockedMsg || "Vehicle type is automatically selected based on your vehicle. To change it, select a different vehicle."
                  );
                  return;
                }
                setVehicleType(vt.id);
              }}
            >
              <MaterialCommunityIcons
                name={vt.mciIcon as any}
                size={26}
                color={vehicleType === vt.id ? "#1976d2" : "#6b7280"}
              />
              <Text
                style={[
                  styles.serviceLabel,
                  vehicleType === vt.id && styles.serviceLabelSelected,
                ]}
              >
                {vt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Service Scope: Parts, Service, or Both */}
        <Text style={styles.sectionTitle}>
          {t.createRequest?.serviceScopeLabel || "What do you need?"} *
        </Text>
        <View style={styles.locationContainer}>
          {[
            { id: "service", label: t.createRequest?.serviceOnly || "Service / Labor Only", icon: "construct", desc: t.createRequest?.serviceOnlyDesc || "I already have the parts, just need installation" },
            { id: "parts", label: t.createRequest?.partsOnly || "Parts Only", icon: "cube", desc: t.createRequest?.partsOnlyDesc || "I need the provider to supply the parts" },
            { id: "both", label: t.createRequest?.partsAndService || "Parts + Service", icon: "layers", desc: t.createRequest?.partsAndServiceDesc || "Provider supplies parts and does the work" },
          ].map((scope) => (
            <TouchableOpacity
              key={scope.id}
              style={[
                styles.locationCard,
                serviceScope === scope.id && styles.locationCardSelected,
              ]}
              onPress={() => setServiceScope(scope.id)}
            >
              <View
                style={[
                  styles.locationIcon,
                  serviceScope === scope.id && styles.locationIconSelected,
                ]}
              >
                <Ionicons
                  name={scope.icon as any}
                  size={24}
                  color={serviceScope === scope.id ? "#1976d2" : "#6b7280"}
                />
              </View>
              <View style={styles.locationInfo}>
                <Text
                  style={[
                    styles.locationLabel,
                    serviceScope === scope.id && styles.locationLabelSelected,
                  ]}
                >
                  {scope.label}
                </Text>
                <Text style={styles.locationDescription}>
                  {scope.desc}
                </Text>
              </View>
              {serviceScope === scope.id && (
                <Ionicons name="checkmark-circle" size={24} color="#1976d2" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Service Location */}
        <Text style={styles.sectionTitle}>
          {t.createRequest?.serviceLocation || "Service Location"} *
        </Text>
        <View style={styles.locationContainer}>
          {locationOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.locationCard,
                serviceLocation === option.id && styles.locationCardSelected,
              ]}
              onPress={() => {
                // For mobile service, validate address
                if (
                  option.id === "mobile" &&
                  addressesLoaded &&
                  userAddresses.length === 0
                ) {
                  Alert.alert(
                    "Address Required",
                    "To request a mobile service, you need at least one registered address. Would you like to add one now?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Add Address",
                        onPress: () =>
                          navigation.navigate("Profile", {
                            screen: "Addresses",
                          }),
                      },
                    ],
                  );
                  return;
                }
                setServiceLocation(option.id);
                // For roadside, automatically request GPS location
                if (option.id === "roadside" && !shareLocation) {
                  handleGetLocation();
                }
              }}
            >
              <View
                style={[
                  styles.locationIcon,
                  serviceLocation === option.id && styles.locationIconSelected,
                ]}
              >
                <Ionicons
                  name={option.icon as any}
                  size={24}
                  color={serviceLocation === option.id ? "#1976d2" : "#6b7280"}
                />
              </View>
              <View style={styles.locationInfo}>
                <Text
                  style={[
                    styles.locationLabel,
                    serviceLocation === option.id &&
                      styles.locationLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={styles.locationDescription}>
                  {option.description}
                </Text>
              </View>
              {serviceLocation === option.id && (
                <Ionicons name="checkmark-circle" size={24} color="#1976d2" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Roadside Location Sharing */}
        {serviceLocation === "roadside" && (
          <View style={styles.roadsideContainer}>
            {!shareLocation ? (
              <TouchableOpacity
                style={styles.shareLocationBtn}
                onPress={handleGetLocation}
              >
                <Ionicons name="location" size={24} color="#fff" />
                <Text style={styles.shareLocationText}>
                  {t.createRequest?.shareMyLocation || "Share My Location"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.locationSharedCard}>
                <View style={styles.locationSharedHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  <Text style={styles.locationSharedTitle}>
                    {t.createRequest?.locationReady || "Location Ready"}
                  </Text>
                </View>
                <Text style={styles.locationSharedText}>
                  {t.createRequest?.locationWillBeShared ||
                    "Your real-time location will be shared with the provider"}
                </Text>
                <View style={styles.locationCoords}>
                  <Ionicons name="navigate" size={16} color="#6b7280" />
                  <Text style={styles.locationCoordsText}>
                    {currentLocation?.lat.toFixed(4)},{" "}
                    {currentLocation?.lng.toFixed(4)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.viewOnMapBtn}
                  onPress={openInMaps}
                >
                  <Ionicons name="map" size={18} color="#1976d2" />
                  <Text style={styles.viewOnMapText}>
                    {t.createRequest?.viewOnMap || "View on Map"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.roadsideInfo}>
              <Ionicons name="information-circle" size={18} color="#f59e0b" />
              <Text style={styles.roadsideInfoText}>
                {t.createRequest?.roadsideNote ||
                  "Provider will receive your live location via Google Maps"}
              </Text>
            </View>
          </View>
        )}

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t.createRequest?.requestTitle || "Request Title"} *
          </Text>
          <TextInput
            style={styles.input}
            placeholder={
              t.createRequest?.titlePlaceholder ||
              "e.g., Oil change and filters"
            }
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t.createRequest?.problemDescription || "Problem Description"}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={
              t.createRequest?.descriptionPlaceholder ||
              "Describe the problem or service needed..."
            }
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Customer Responsibility Disclaimer */}
        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerHeader}>
            <Ionicons name="information-circle" size={22} color="#f59e0b" />
            <Text style={styles.disclaimerTitle}>
              {t.createRequest?.importantNotice || "Important Notice"}
            </Text>
          </View>
          <Text style={styles.disclaimerText}>
            {t.createRequest?.responsibilityText || "The service type you select is your best assessment. Our verified providers will perform a professional inspection to confirm the actual issue before starting any work. For obvious services (oil change, tire replacement, etc.), work will proceed as requested."}
          </Text>
          <Text style={styles.disclaimerText2}>
            {t.createRequest?.estimateProtection || "You are protected by Florida's Written Estimate law — no work will exceed the approved estimate without your written consent."}
          </Text>
          <TouchableOpacity
            style={styles.disclaimerCheckbox}
            onPress={() => setResponsibilityAccepted(!responsibilityAccepted)}
          >
            <Ionicons
              name={responsibilityAccepted ? "checkbox" : "square-outline"}
              size={24}
              color={responsibilityAccepted ? "#1976d2" : "#9ca3af"}
            />
            <Text style={styles.disclaimerCheckboxText}>
              {t.createRequest?.iUnderstand || "I understand and agree to proceed"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Urgency */}
        <Text style={styles.sectionTitle}>
          {t.createRequest?.urgency || "Urgency"}
        </Text>
        <View style={styles.urgencyContainer}>
          {[
            {
              id: "low",
              label: t.createRequest?.low || "Low",
              color: "#10b981",
            },
            {
              id: "normal",
              label: t.createRequest?.normal || "Normal",
              color: "#3b82f6",
            },
            {
              id: "high",
              label: t.createRequest?.high || "High",
              color: "#f59e0b",
            },
            {
              id: "urgent",
              label: t.createRequest?.urgent || "Urgent",
              color: "#ef4444",
            },
          ].map((u) => (
            <TouchableOpacity
              key={u.id}
              style={[
                styles.urgencyBtn,
                urgency === u.id && { backgroundColor: u.color },
              ]}
              onPress={() => setUrgency(u.id)}
            >
              <Text
                style={[
                  styles.urgencyText,
                  urgency === u.id && styles.urgencyTextSelected,
                ]}
              >
                {u.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#1976d2" />
          <Text style={styles.infoText}>
            {t.createRequest?.infoText ||
              "You will receive quotes from verified service providers within 48 hours."}
          </Text>
        </View>

        {/* Favorite Provider Selection */}
        <Text style={styles.sectionTitle}>
          {t.createRequest?.sendToFavorite || "Send to Favorite Provider"}
        </Text>
        <TouchableOpacity
          style={styles.favoriteProviderSelector}
          onPress={() => setShowProviderModal(true)}
        >
          {selectedProvider ? (
            <View style={styles.selectedProviderRow}>
              <View style={styles.providerAvatarSmall}>
                <Ionicons name="business" size={20} color="#1976d2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedProviderNameText}>
                  {selectedProvider.businessName}
                </Text>
                {selectedProvider.rating > 0 && (
                  <View style={styles.ratingRowSmall}>
                    <Ionicons name="star" size={12} color="#fbbf24" />
                    <Text style={styles.ratingTextSmall}>
                      {selectedProvider.rating}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.clearProviderBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedProvider(null);
                }}
              >
                <Ionicons name="close-circle" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.selectProviderPlaceholder}>
              <Ionicons name="heart-outline" size={24} color="#9ca3af" />
              <Text style={styles.selectProviderText}>
                {t.createRequest?.selectFavoriteProvider ||
                  "Select a favorite provider (optional)"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.favoriteHint}>
          {t.createRequest?.favoriteHint ||
            "Request will be sent directly to this provider instead of all providers"}
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <Text style={styles.submitText}>
              {t.createRequest?.submitting || "Submitting..."}
            </Text>
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitText}>
                {t.createRequest?.requestQuotes || "Request Quotes"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Favorite Provider Modal */}
      <Modal
        visible={showProviderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProviderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t.createRequest?.selectFavoriteTitle ||
                  "Select Favorite Provider"}
              </Text>
              <TouchableOpacity onPress={() => setShowProviderModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {favoriteProviders.length === 0 ? (
              <View style={styles.emptyFavorites}>
                <Ionicons name="heart-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyFavoritesText}>
                  {t.createRequest?.noFavorites || "No favorite providers yet"}
                </Text>
                <Text style={styles.emptyFavoritesSubtext}>
                  {t.createRequest?.addFavoritesHint ||
                    "Add providers to your favorites from the Profile tab"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={favoriteProviders}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.providerListItem,
                      selectedProvider?.id === item.id &&
                        styles.providerListItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedProvider(item);
                      setShowProviderModal(false);
                    }}
                  >
                    <View style={styles.providerListAvatar}>
                      <Ionicons name="business" size={24} color="#1976d2" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.providerListName}>
                        {item.businessName}
                      </Text>
                      <View style={styles.providerListMeta}>
                        <Ionicons name="star" size={14} color="#fbbf24" />
                        <Text style={styles.providerListRating}>
                          {item.rating}
                        </Text>
                        <Text style={styles.providerListServices}>
                          • {item.totalServices}{" "}
                          {t.common?.services || "services"}
                        </Text>
                      </View>
                      <Text style={styles.providerListSpecialty}>
                        {item.specialty}
                      </Text>
                    </View>
                    {selectedProvider?.id === item.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#1976d2"
                      />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.providerList}
              />
            )}

            <TouchableOpacity
              style={styles.sendToAllBtn}
              onPress={() => {
                setSelectedProvider(null);
                setShowProviderModal(false);
              }}
            >
              <Ionicons name="globe-outline" size={20} color="#1976d2" />
              <Text style={styles.sendToAllText}>
                {t.createRequest?.sendToAll || "Send to all providers"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sub-Options Modal */}
      <Modal visible={showSubOptionsModal} transparent animationType="slide">
        <View style={styles.subOptionsOverlay}>
          <View style={styles.subOptionsContainer}>
            <View style={styles.subOptionsHeader}>
              <Text style={styles.subOptionsTitle}>
                {SERVICE_SUB_OPTIONS[pendingServiceId]?.title || "Service Details"}
              </Text>
              <TouchableOpacity onPress={() => setShowSubOptionsModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {SERVICE_SUB_OPTIONS[pendingServiceId]?.sections.map((section) => (
                <View key={section.id} style={styles.subOptionsSection}>
                  <Text style={styles.subOptionsSectionLabel}>
                    {section.label} {section.type === "single" ? "(select one)" : "(select all that apply)"}
                  </Text>
                  {section.options.map((option) => {
                    const isSelected = (subOptionSelections[section.id] || []).includes(option.id);
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[styles.subOptionItem, isSelected && styles.subOptionItemSelected]}
                        onPress={() => handleSubOptionToggle(section.id, option.id, section.type)}
                      >
                        <View style={[styles.subOptionIcon, isSelected && styles.subOptionIconSelected]}>
                          <Ionicons name={(option.icon || "ellipse") as any} size={20} color={isSelected ? "#fff" : "#6b7280"} />
                        </View>
                        <Text style={[styles.subOptionLabel, isSelected && styles.subOptionLabelSelected]}>
                          {option.label}
                        </Text>
                        <Ionicons
                          name={section.type === "single"
                            ? (isSelected ? "radio-button-on" : "radio-button-off")
                            : (isSelected ? "checkbox" : "square-outline")
                          }
                          size={22}
                          color={isSelected ? "#1976d2" : "#d1d5db"}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              <Text style={styles.subOptionsHint}>
                {t.createRequest?.subOptionsHint || "These details help providers give you a more accurate quote."}
              </Text>
            </ScrollView>

            <View style={styles.subOptionsFooter}>
              <TouchableOpacity
                style={styles.subOptionsSkipBtn}
                onPress={() => setShowSubOptionsModal(false)}
              >
                <Text style={styles.subOptionsSkipText}>
                  {t.createRequest?.skipDetails || "Skip"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.subOptionsConfirmBtn}
                onPress={confirmSubOptions}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.subOptionsConfirmText}>
                  {t.createRequest?.confirmDetails || "Confirm"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  content: { padding: 16 },
  // Selected Provider Banner
  selectedProviderBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1976d2",
  },
  selectedProviderLabel: { fontSize: 12, color: "#6b7280" },
  selectedProviderName: { fontSize: 16, fontWeight: "600", color: "#1976d2" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  vehiclesContainer: { marginBottom: 24 },
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  vehicleCardSelected: { borderColor: "#1976d2", backgroundColor: "#eff6ff" },
  vehicleName: { fontSize: 16, fontWeight: "500", color: "#374151" },
  vehicleNameSelected: { color: "#1976d2" },
  vehiclePlate: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  serviceCard: {
    width: "31%",
    aspectRatio: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  serviceCardSelected: { borderColor: "#1976d2", backgroundColor: "#eff6ff" },
  serviceLabel: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },
  serviceLabelSelected: { color: "#1976d2", fontWeight: "500" },
  locationContainer: { marginBottom: 16 },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  locationCardSelected: { borderColor: "#1976d2", backgroundColor: "#eff6ff" },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  locationIconSelected: { backgroundColor: "#dbeafe" },
  locationInfo: { flex: 1 },
  locationLabel: { fontSize: 16, fontWeight: "500", color: "#374151" },
  locationLabelSelected: { color: "#1976d2" },
  locationDescription: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  // Roadside Location Sharing
  roadsideContainer: { marginBottom: 24 },
  shareLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    borderRadius: 12,
  },
  shareLocationText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  locationSharedCard: {
    backgroundColor: "#d1fae5",
    padding: 16,
    borderRadius: 12,
  },
  locationSharedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  locationSharedTitle: { fontSize: 16, fontWeight: "600", color: "#10b981" },
  locationSharedText: { fontSize: 14, color: "#065f46", marginBottom: 8 },
  locationCoords: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  locationCoordsText: { fontSize: 13, color: "#6b7280" },
  viewOnMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewOnMapText: { fontSize: 14, fontWeight: "600", color: "#1976d2" },
  roadsideInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  roadsideInfoText: { flex: 1, fontSize: 13, color: "#92400e", lineHeight: 18 },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: { minHeight: 100 },
  urgencyContainer: { flexDirection: "row", gap: 8, marginBottom: 24 },
  urgencyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  urgencyText: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  urgencyTextSelected: { color: "#fff" },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 12,
  },
  infoText: { flex: 1, fontSize: 14, color: "#1976d2", lineHeight: 20 },
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
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1976d2",
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitBtnDisabled: { backgroundColor: "#9ca3af" },
  submitText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  // Favorite Provider Selector
  favoriteProviderSelector: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  },
  selectedProviderRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  providerAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  selectedProviderNameText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  ratingRowSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingTextSmall: { fontSize: 12, color: "#6b7280" },
  clearProviderBtn: { padding: 4 },
  selectProviderPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  selectProviderText: { flex: 1, fontSize: 14, color: "#9ca3af" },
  favoriteHint: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 24,
    fontStyle: "italic",
  },
  // Provider Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  providerList: { padding: 16 },
  providerListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  providerListItemSelected: {
    borderColor: "#1976d2",
    backgroundColor: "#eff6ff",
  },
  providerListAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  providerListName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  providerListMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  providerListRating: { fontSize: 13, color: "#6b7280" },
  providerListServices: { fontSize: 13, color: "#6b7280" },
  providerListSpecialty: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  emptyFavorites: { alignItems: "center", padding: 40 },
  emptyFavoritesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 12,
  },
  emptyFavoritesSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
  },
  sendToAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
  },
  sendToAllText: { fontSize: 15, fontWeight: "600", color: "#1976d2" },
  // Loading & No Payment Styles
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, color: "#6b7280", marginTop: 12 },
  noPaymentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  noPaymentIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  noPaymentTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  noPaymentDescription: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  noPaymentFeatures: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  featureText: { fontSize: 14, color: "#374151" },
  addPaymentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1976d2",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
  },
  addPaymentText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  laterBtn: { paddingVertical: 16 },
  laterText: { fontSize: 15, color: "#6b7280" },
  // Active Service Blocking Card
  activeServiceCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  activeServiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  activeServiceStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeServiceStatusText: { fontSize: 12, fontWeight: "600" },
  activeServiceOrder: { fontSize: 13, color: "#6b7280" },
  activeServiceTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  // Payment Method Card
  paymentMethodCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  paymentMethodInfo: { flexDirection: "row", alignItems: "center" },
  paymentMethodLabel: { fontSize: 12, color: "#6b7280" },
  paymentMethodValue: { fontSize: 14, fontWeight: "600", color: "#111827" },
  changePaymentText: { fontSize: 14, fontWeight: "600", color: "#1976d2" },
  paymentMethodNote: {
    fontSize: 12,
    color: "#166534",
    marginTop: 10,
    lineHeight: 18,
  },
  // Applied Offer Banner
  appliedOfferBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#fecaca",
  },
  appliedOfferBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  appliedOfferBadgeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  appliedOfferLabel: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "500",
  },
  appliedOfferTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 2,
  },
  appliedOfferValidity: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  removeOfferButton: {
    padding: 4,
  },
  // Sub-Options Modal
  subOptionsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  subOptionsContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  subOptionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  subOptionsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  subOptionsSection: {
    marginBottom: 16,
  },
  subOptionsSectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  subOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  subOptionItemSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#1976d2",
  },
  subOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  subOptionIconSelected: {
    backgroundColor: "#1976d2",
  },
  subOptionLabel: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
  },
  subOptionLabelSelected: {
    color: "#1976d2",
    fontWeight: "600",
  },
  subOptionsHint: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
    fontStyle: "italic",
  },
  subOptionsFooter: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  subOptionsSkipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  subOptionsSkipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  subOptionsConfirmBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#1976d2",
  },
  subOptionsConfirmText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  // Disclaimer / Responsibility Card
  disclaimerCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  disclaimerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400e",
  },
  disclaimerText: {
    fontSize: 13,
    color: "#78350f",
    lineHeight: 19,
    marginBottom: 6,
  },
  disclaimerText2: {
    fontSize: 13,
    color: "#059669",
    lineHeight: 19,
    marginBottom: 12,
    fontWeight: "500",
  },
  disclaimerCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#fde68a",
  },
  disclaimerCheckboxText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
});
