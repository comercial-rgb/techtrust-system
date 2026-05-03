/**
 * CreateRequestScreen - Create Service Request
 * With service location option and US-focused services
 * Supports pre-selected provider from Favorite Providers
 * Requires payment method before creating request
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { log } from "../utils/logger";
import { interpolate } from "../i18n/interpolate";

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
  const { t, language } = useI18n();
  const mileageNumberLocale = useMemo(
    () => (language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US"),
    [language],
  );
  const createRequestLabels = t.createRequest as Record<
    string,
    string | undefined
  >;
  const route = useRoute<any>();

  // Get pre-selected provider from navigation params (from Favorite Providers or Landing)
  const preSelectedProviderId = route.params?.providerId;
  const preSelectedProviderName = route.params?.providerName;
  const preSelectedProviderFromLanding: PreSelectedProvider | null =
    route.params?.preSelectedProvider || null;
  const specialOfferFromLanding: SpecialOffer | null =
    route.params?.specialOffer || null;

  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
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
  // Mileage / Odometer
  const [mileage, setMileage] = useState<string>("");
  // Preferred date and time
  const [preferredDate, setPreferredDate] = useState<string>("");
  const [preferredTime, setPreferredTime] = useState<string>("");
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Address check for mobile/roadside services
  const [userAddresses, setUserAddresses] = useState<any[]>([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  // Selected address index for mobile service (-1 = use GPS)
  const [selectedAddressIdx, setSelectedAddressIdx] = useState(0);
  // GPS-captured address for mobile service
  const [mobileGpsAddress, setMobileGpsAddress] = useState("");
  const [mobileGpsCoords, setMobileGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fetchingGpsAddress, setFetchingGpsAddress] = useState(false);

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

  // Wizard step management
  const [currentStep, setCurrentStep] = useState(1);
  const [asapDate, setAsapDate] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Smart Sub-options for service types
  const [showSubOptionsModal, setShowSubOptionsModal] = useState(false);
  const [subOptionSelections, setSubOptionSelections] = useState<
    Record<string, string[]>
  >({});
  const [pendingServiceId, setPendingServiceId] = useState<string>("");

  // Sub-options configuration per service type
  const SERVICE_SUB_OPTIONS: Record<
    string,
    {
      title: string;
      sections: {
        id: string;
        label: string;
        type: "single" | "multi";
        options: { id: string; label: string; icon?: string }[];
      }[];
    }
  > = {
    oil: {
      title: createRequestLabels?.oilChangeOptions || "Oil Change Details",
      sections: [
        {
          id: "oilType",
          label: createRequestLabels?.oilType || "Oil Type",
          type: "single",
          options: [
            {
              id: "motor",
              label: createRequestLabels?.motorOil || "Motor Oil (Engine)",
              icon: "cog",
            },
            {
              id: "transmission",
              label: createRequestLabels?.transmissionFluid || "Transmission Fluid",
              icon: "swap-horizontal",
            },
            {
              id: "both",
              label: createRequestLabels?.bothOils || "Both (Motor + Transmission)",
              icon: "layers",
            },
          ],
        },
        {
          id: "filters",
          label: createRequestLabels?.filtersToReplace || "Filters to Replace",
          type: "multi",
          options: [
            {
              id: "oil_filter",
              label: createRequestLabels?.oilFilter || "Oil Filter",
              icon: "funnel",
            },
            {
              id: "air_filter",
              label: createRequestLabels?.airFilter || "Air Filter",
              icon: "cloud",
            },
            {
              id: "cabin_filter",
              label: createRequestLabels?.cabinFilter || "Cabin Air Filter",
              icon: "car",
            },
            {
              id: "fuel_filter",
              label: createRequestLabels?.fuelFilter || "Fuel Filter",
              icon: "flame",
            },
          ],
        },
        {
          id: "oilGrade",
          label: createRequestLabels?.oilGrade || "Oil Grade (if known)",
          type: "single",
          options: [
            {
              id: "conventional",
              label: createRequestLabels?.conventional || "Conventional",
              icon: "water",
            },
            {
              id: "synthetic_blend",
              label: createRequestLabels?.syntheticBlend || "Synthetic Blend",
              icon: "beaker",
            },
            {
              id: "full_synthetic",
              label: createRequestLabels?.fullSynthetic || "Full Synthetic",
              icon: "diamond",
            },
            {
              id: "high_mileage",
              label: createRequestLabels?.highMileage || "High Mileage",
              icon: "speedometer",
            },
            {
              id: "not_sure",
              label:
                createRequestLabels?.notSure || "Not Sure / Let provider decide",
              icon: "help-circle",
            },
          ],
        },
      ],
    },
    brake: {
      title: createRequestLabels?.brakeOptions || "Brake Service Details",
      sections: [
        {
          id: "brakeLocation",
          label: createRequestLabels?.brakeLocation || "Which Brakes?",
          type: "single",
          options: [
            {
              id: "front",
              label: createRequestLabels?.frontBrakes || "Front Brakes",
              icon: "arrow-up",
            },
            {
              id: "rear",
              label: createRequestLabels?.rearBrakes || "Rear Brakes",
              icon: "arrow-down",
            },
            {
              id: "all",
              label: createRequestLabels?.allBrakes || "All Brakes (Front + Rear)",
              icon: "swap-vertical",
            },
            {
              id: "not_sure",
              label:
                createRequestLabels?.notSureBrakes || "Not Sure / Need Inspection",
              icon: "help-circle",
            },
          ],
        },
        {
          id: "brakeService",
          label: createRequestLabels?.brakeServiceType || "Service Needed",
          type: "multi",
          options: [
            {
              id: "pads",
              label: createRequestLabels?.brakePads || "Brake Pads",
              icon: "square",
            },
            {
              id: "rotors",
              label: createRequestLabels?.brakeRotors || "Rotors / Discs",
              icon: "ellipse",
            },
            {
              id: "fluid",
              label: createRequestLabels?.brakeFluid || "Brake Fluid Flush",
              icon: "water",
            },
            {
              id: "calipers",
              label: createRequestLabels?.brakeCalipers || "Calipers",
              icon: "build",
            },
            {
              id: "lines",
              label: createRequestLabels?.brakeLines || "Brake Lines / Hoses",
              icon: "git-branch",
            },
            {
              id: "abs",
              label: createRequestLabels?.absSystem || "ABS System",
              icon: "warning",
            },
          ],
        },
        {
          id: "brakeSymptoms",
          label: createRequestLabels?.brakeSymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            {
              id: "squeaking",
              label: createRequestLabels?.squeaking || "Squeaking / Squealing",
              icon: "volume-high",
            },
            {
              id: "grinding",
              label: createRequestLabels?.grinding || "Grinding Noise",
              icon: "alert-circle",
            },
            {
              id: "vibration",
              label:
                createRequestLabels?.vibrationBrake || "Vibration When Braking",
              icon: "pulse",
            },
            {
              id: "pulling",
              label: createRequestLabels?.pullingToSide || "Pulling to One Side",
              icon: "arrow-forward",
            },
            {
              id: "soft_pedal",
              label: createRequestLabels?.softPedal || "Soft / Spongy Pedal",
              icon: "arrow-down-circle",
            },
          ],
        },
      ],
    },
    tire: {
      title: createRequestLabels?.tireOptions || "Tire Service Details",
      sections: [
        {
          id: "tireService",
          label: createRequestLabels?.tireServiceType || "Service Needed",
          type: "multi",
          options: [
            {
              id: "rotation",
              label: createRequestLabels?.tireRotation || "Tire Rotation",
              icon: "refresh",
            },
            {
              id: "balance",
              label: createRequestLabels?.tireBalance || "Balancing",
              icon: "git-compare",
            },
            {
              id: "alignment",
              label: createRequestLabels?.tireAlignment || "Alignment",
              icon: "resize",
            },
            {
              id: "replacement",
              label: createRequestLabels?.tireReplacement || "Tire Replacement",
              icon: "swap-horizontal",
            },
            {
              id: "repair",
              label:
                createRequestLabels?.tireRepair || "Flat Tire / Puncture Repair",
              icon: "build",
            },
            {
              id: "tpms",
              label: createRequestLabels?.tpms || "TPMS Sensor",
              icon: "speedometer",
            },
          ],
        },
        {
          id: "tireCount",
          label: createRequestLabels?.howManyTires || "How Many Tires?",
          type: "single",
          options: [
            {
              id: "1",
              label: createRequestLabels?.tireCountOne || "1",
              icon: "ellipse",
            },
            {
              id: "2",
              label: createRequestLabels?.tireCountTwo || "2",
              icon: "ellipse",
            },
            {
              id: "4",
              label:
                createRequestLabels?.tireCountFourFullSet || "4 (Full Set)",
              icon: "apps",
            },
            {
              id: "spare",
              label: createRequestLabels?.spareTire || "Spare Tire",
              icon: "add-circle",
            },
          ],
        },
      ],
    },
    engine: {
      title: createRequestLabels?.engineOptions || "Engine Service Details",
      sections: [
        {
          id: "engineService",
          label: createRequestLabels?.engineServiceType || "Service Needed",
          type: "multi",
          options: [
            {
              id: "diagnostic",
              label:
                createRequestLabels?.engineDiagnostic ||
                "Engine Diagnostic / Check Engine Light",
              icon: "search",
            },
            {
              id: "tune_up",
              label: createRequestLabels?.tuneUp || "Tune-Up",
              icon: "options",
            },
            {
              id: "timing_belt",
              label: createRequestLabels?.timingBelt || "Timing Belt / Chain",
              icon: "time",
            },
            {
              id: "head_gasket",
              label: createRequestLabels?.headGasket || "Head Gasket",
              icon: "layers",
            },
            {
              id: "spark_plugs",
              label: createRequestLabels?.sparkPlugs || "Spark Plugs",
              icon: "flash",
            },
            {
              id: "valve_cover",
              label: createRequestLabels?.valveCover || "Valve Cover Gasket",
              icon: "shield",
            },
            {
              id: "motor_mount",
              label: createRequestLabels?.motorMount || "Motor Mounts",
              icon: "cube",
            },
            {
              id: "overheating",
              label: createRequestLabels?.overheating || "Overheating Issue",
              icon: "thermometer",
            },
          ],
        },
        {
          id: "engineSymptoms",
          label: createRequestLabels?.engineSymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            {
              id: "check_engine",
              label:
                createRequestLabels?.checkEngineLight || "Check Engine Light On",
              icon: "warning",
            },
            {
              id: "rough_idle",
              label: createRequestLabels?.roughIdle || "Rough Idle / Vibration",
              icon: "pulse",
            },
            {
              id: "loss_power",
              label: createRequestLabels?.lossPower || "Loss of Power",
              icon: "trending-down",
            },
            {
              id: "stalling",
              label: createRequestLabels?.stalling || "Stalling / Won't Start",
              icon: "close-circle",
            },
            {
              id: "smoke",
              label: createRequestLabels?.smoke || "Smoke from Exhaust",
              icon: "cloud",
            },
            {
              id: "noise",
              label:
                createRequestLabels?.engineNoise ||
                "Unusual Noise (Knocking / Ticking)",
              icon: "volume-high",
            },
            {
              id: "oil_leak",
              label: createRequestLabels?.oilLeak || "Oil Leak",
              icon: "water",
            },
          ],
        },
      ],
    },
    electric: {
      title: createRequestLabels?.electricalOptions || "Electrical Service Details",
      sections: [
        {
          id: "electricalService",
          label: createRequestLabels?.electricalServiceType || "Service Needed",
          type: "multi",
          options: [
            {
              id: "alternator",
              label: createRequestLabels?.alternator || "Alternator",
              icon: "flash",
            },
            {
              id: "starter",
              label: createRequestLabels?.starter || "Starter Motor",
              icon: "play",
            },
            {
              id: "wiring",
              label: createRequestLabels?.wiring || "Wiring / Short Circuit",
              icon: "git-branch",
            },
            {
              id: "fuses",
              label: createRequestLabels?.fuses || "Fuses / Relay",
              icon: "remove",
            },
            {
              id: "lights",
              label:
                createRequestLabels?.lights ||
                "Lights (Headlights / Tail / Interior)",
              icon: "bulb",
            },
            {
              id: "power_windows",
              label: createRequestLabels?.powerWindows || "Power Windows / Locks",
              icon: "contract",
            },
            {
              id: "dashboard",
              label:
                createRequestLabels?.dashboardElectrical || "Dashboard / Gauges",
              icon: "speedometer",
            },
            {
              id: "sensors",
              label: createRequestLabels?.sensors || "Sensors (O2, MAF, MAP, etc.)",
              icon: "analytics",
            },
          ],
        },
        {
          id: "electricalSymptoms",
          label: createRequestLabels?.electricalSymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            {
              id: "no_start",
              label: createRequestLabels?.noStart || "Car Won't Start",
              icon: "close-circle",
            },
            {
              id: "dim_lights",
              label: createRequestLabels?.dimLights || "Dim or Flickering Lights",
              icon: "bulb",
            },
            {
              id: "dead_battery",
              label: createRequestLabels?.deadBattery || "Battery Keeps Dying",
              icon: "battery-dead",
            },
            {
              id: "burning_smell",
              label: createRequestLabels?.burningSmell || "Burning Smell",
              icon: "flame",
            },
          ],
        },
      ],
    },
    ac: {
      title: createRequestLabels?.acOptions || "A/C & Heating Details",
      sections: [
        {
          id: "acService",
          label: createRequestLabels?.acServiceType || "Service Needed",
          type: "multi",
          options: [
            {
              id: "recharge",
              label:
                createRequestLabels?.acRecharge || "A/C Recharge (Freon / R-134a)",
              icon: "snow",
            },
            {
              id: "diagnostic",
              label: createRequestLabels?.acDiagnostic || "A/C Diagnostic",
              icon: "search",
            },
            {
              id: "compressor",
              label:
                createRequestLabels?.acCompressor || "Compressor Repair / Replace",
              icon: "cog",
            },
            {
              id: "condenser",
              label: createRequestLabels?.acCondenser || "Condenser",
              icon: "grid",
            },
            {
              id: "evaporator",
              label: createRequestLabels?.acEvaporator || "Evaporator",
              icon: "swap-vertical",
            },
            {
              id: "cabin_filter",
              label: createRequestLabels?.cabinFilter || "Cabin Air Filter",
              icon: "car",
            },
            {
              id: "heater_core",
              label: createRequestLabels?.heaterCore || "Heater Core",
              icon: "flame",
            },
            {
              id: "blower_motor",
              label: createRequestLabels?.blowerMotor || "Blower Motor",
              icon: "aperture",
            },
          ],
        },
        {
          id: "acSymptoms",
          label: createRequestLabels?.acSymptoms || "What's happening?",
          type: "multi",
          options: [
            {
              id: "no_cold",
              label: createRequestLabels?.noColdAir || "No Cold Air",
              icon: "thermometer",
            },
            {
              id: "no_heat",
              label: createRequestLabels?.noHeat || "No Heat",
              icon: "snow",
            },
            {
              id: "weak_flow",
              label: createRequestLabels?.weakAirflow || "Weak Airflow",
              icon: "trending-down",
            },
            {
              id: "bad_smell",
              label: createRequestLabels?.badSmellAc || "Bad Smell from Vents",
              icon: "alert-circle",
            },
            {
              id: "noise_ac",
              label: createRequestLabels?.noiseAc || "Noise When A/C is On",
              icon: "volume-high",
            },
          ],
        },
      ],
    },
    steering: {
      title: createRequestLabels?.suspensionOptions || "Steering & Suspension Service Details",
      sections: [
        {
          id: "suspensionService",
          label: createRequestLabels?.suspensionServiceType || "Service Needed",
          type: "multi",
          options: [
            {
              id: "shocks",
              label: createRequestLabels?.shocksStruts || "Shocks / Struts",
              icon: "resize",
            },
            {
              id: "springs",
              label: createRequestLabels?.springs || "Springs (Coil / Leaf)",
              icon: "contract",
            },
            {
              id: "control_arms",
              label: createRequestLabels?.controlArms || "Control Arms",
              icon: "git-branch",
            },
            {
              id: "ball_joints",
              label: createRequestLabels?.ballJoints || "Ball Joints",
              icon: "ellipse",
            },
            {
              id: "tie_rods",
              label: createRequestLabels?.tieRods || "Tie Rods (Inner / Outer)",
              icon: "remove",
            },
            {
              id: "sway_bar",
              label: createRequestLabels?.swayBar || "Sway Bar / Links",
              icon: "swap-horizontal",
            },
            {
              id: "bushings",
              label: createRequestLabels?.bushings || "Bushings",
              icon: "radio-button-on",
            },
            {
              id: "wheel_bearing",
              label: createRequestLabels?.wheelBearing || "Wheel Bearings / Hub",
              icon: "sync",
            },
          ],
        },
        {
          id: "suspensionLocation",
          label: createRequestLabels?.suspensionLocation || "Which Area?",
          type: "single",
          options: [
            {
              id: "front",
              label: createRequestLabels?.frontSuspension || "Front",
              icon: "arrow-up",
            },
            {
              id: "rear",
              label: createRequestLabels?.rearSuspension || "Rear",
              icon: "arrow-down",
            },
            {
              id: "both",
              label: createRequestLabels?.bothSuspension || "Both (Front + Rear)",
              icon: "swap-vertical",
            },
            {
              id: "not_sure",
              label:
                createRequestLabels?.notSureShort ||
                createRequestLabels?.notSure ||
                "Not Sure",
              icon: "help-circle",
            },
          ],
        },
        {
          id: "suspensionSymptoms",
          label: createRequestLabels?.suspensionSymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            {
              id: "bouncy",
              label: createRequestLabels?.bouncyRide || "Bouncy / Rough Ride",
              icon: "pulse",
            },
            {
              id: "clunking",
              label: createRequestLabels?.clunking || "Clunking over Bumps",
              icon: "volume-high",
            },
            {
              id: "pulling",
              label: createRequestLabels?.pullingToSide || "Pulling to One Side",
              icon: "arrow-forward",
            },
            {
              id: "uneven_wear",
              label: createRequestLabels?.unevenTireWear || "Uneven Tire Wear",
              icon: "analytics",
            },
            {
              id: "leaking",
              label: createRequestLabels?.leakingShock || "Leaking Shock / Strut",
              icon: "water",
            },
          ],
        },
      ],
    },
    transmission: {
      title:
        createRequestLabels?.transmissionOptions || "Transmission Service Details",
      sections: [
        {
          id: "transType",
          label: createRequestLabels?.transmissionType || "Transmission Type",
          type: "single",
          options: [
            {
              id: "automatic",
              label: createRequestLabels?.automatic || "Automatic",
              icon: "car",
            },
            {
              id: "manual",
              label: createRequestLabels?.manual || "Manual / Stick Shift",
              icon: "hand-left",
            },
            {
              id: "cvt",
              label: createRequestLabels?.cvt || "CVT (Continuously Variable)",
              icon: "sync",
            },
            {
              id: "not_sure",
              label:
                createRequestLabels?.notSureShort ||
                createRequestLabels?.notSure ||
                "Not Sure",
              icon: "help-circle",
            },
          ],
        },
        {
          id: "transService",
          label: createRequestLabels?.transmissionServiceType || "Service Needed",
          type: "multi",
          options: [
            {
              id: "fluid_change",
              label:
                createRequestLabels?.transFluidChange ||
                "Transmission Fluid Change",
              icon: "water",
            },
            {
              id: "flush",
              label: createRequestLabels?.transFlush || "Transmission Flush",
              icon: "refresh",
            },
            {
              id: "diagnostic",
              label:
                createRequestLabels?.transDiagnostic || "Diagnostic / Inspection",
              icon: "search",
            },
            {
              id: "rebuild",
              label: createRequestLabels?.transRebuild || "Rebuild / Overhaul",
              icon: "construct",
            },
            {
              id: "replace",
              label: createRequestLabels?.transReplace || "Replacement",
              icon: "swap-horizontal",
            },
            {
              id: "clutch",
              label:
                createRequestLabels?.clutch || "Clutch Repair / Replace (Manual)",
              icon: "disc",
            },
            {
              id: "torque_converter",
              label: createRequestLabels?.torqueConverter || "Torque Converter",
              icon: "sync",
            },
            {
              id: "solenoid",
              label: createRequestLabels?.solenoid || "Shift Solenoid",
              icon: "flash",
            },
          ],
        },
        {
          id: "transSymptoms",
          label: createRequestLabels?.transSymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            {
              id: "slipping",
              label: createRequestLabels?.slipping || "Slipping Gears",
              icon: "alert-circle",
            },
            {
              id: "hard_shift",
              label: createRequestLabels?.hardShifting || "Hard / Delayed Shifting",
              icon: "chevron-forward",
            },
            {
              id: "grinding",
              label: createRequestLabels?.grindingTrans || "Grinding Noise",
              icon: "volume-high",
            },
            {
              id: "leak",
              label: createRequestLabels?.transLeak || "Fluid Leak (Red / Brown)",
              icon: "water",
            },
            {
              id: "no_move",
              label: createRequestLabels?.wontMove || "Won't Move / Engage",
              icon: "close-circle",
            },
            {
              id: "check_light",
              label:
                createRequestLabels?.transLight || "Transmission Warning Light",
              icon: "warning",
            },
          ],
        },
      ],
    },
    inspection: {
      title:
        createRequestLabels?.inspectionOptions || "Diagnostic & Inspection Details",
      sections: [
        {
          id: "inspectionType",
          label:
            createRequestLabels?.inspectionType ||
            "What type of inspection do you need?",
          type: "single",
          options: [
            {
              id: "general_diagnostic",
              label:
                createRequestLabels?.generalDiagnostic ||
                "General Diagnostic (Warning Lights / Unknown Issue)",
              icon: "search",
            },
            {
              id: "pre_purchase",
              label:
                createRequestLabels?.prePurchase ||
                "Pre-Purchase Inspection (Buying a Used Car)",
              icon: "cart",
            },
            {
              id: "state_inspection",
              label:
                createRequestLabels?.stateInspection || "State Safety Inspection",
              icon: "shield-checkmark",
            },
            {
              id: "emissions",
              label: createRequestLabels?.emissions || "Emissions Test",
              icon: "cloud",
            },
            {
              id: "multi_point",
              label:
                createRequestLabels?.multiPoint ||
                "Multi-Point / Full Vehicle Inspection",
              icon: "clipboard",
            },
            {
              id: "seasonal",
              label:
                createRequestLabels?.seasonal ||
                "Seasonal Check-Up (Winter / Summer Prep)",
              icon: "sunny",
            },
            {
              id: "road_test",
              label:
                createRequestLabels?.roadTest || "Road Test / Drive Evaluation",
              icon: "car",
            },
            {
              id: "second_opinion",
              label:
                createRequestLabels?.secondOpinion ||
                "Second Opinion on Previous Diagnosis",
              icon: "eye",
            },
          ],
        },
        {
          id: "diagnosticFocus",
          label:
            createRequestLabels?.whatDiagnosed ||
            "What needs to be diagnosed? (select all that apply)",
          type: "multi",
          options: [
            // Engine & Drivetrain
            {
              id: "engine",
              label:
                createRequestLabels?.diagEngine || "Engine / Check Engine Light",
              icon: "cog",
            },
            {
              id: "transmission",
              label:
                createRequestLabels?.diagTransmission ||
                "Transmission / Shifting Issues",
              icon: "sync",
            },
            {
              id: "drivetrain",
              label:
                createRequestLabels?.diagDrivetrain ||
                "Drivetrain / 4WD / AWD / Differential",
              icon: "git-branch",
            },
            {
              id: "turbo_supercharger",
              label:
                createRequestLabels?.diagTurbo ||
                "Turbo / Supercharger / Boost Issues",
              icon: "rocket",
            },
            {
              id: "timing_belt_chain",
              label:
                createRequestLabels?.diagTiming ||
                "Timing Belt / Chain / Tensioner",
              icon: "time",
            },
            // Brakes & Suspension
            {
              id: "brakes",
              label:
                createRequestLabels?.diagBrakes ||
                "Brakes / Noise / Vibration / Pedal Feel",
              icon: "disc",
            },
            {
              id: "suspension",
              label:
                createRequestLabels?.diagSuspension ||
                "Suspension / Steering / Alignment",
              icon: "resize",
            },
            {
              id: "power_steering",
              label:
                createRequestLabels?.diagPowerSteering ||
                "Power Steering / Steering Rack",
              icon: "move",
            },
            {
              id: "wheel_bearing",
              label:
                createRequestLabels?.diagWheelBearing ||
                "Wheel Bearing / Hub Assembly",
              icon: "radio-button-on",
            },
            // Electrical & Electronics
            {
              id: "electrical",
              label:
                createRequestLabels?.diagElectrical ||
                "Electrical System / Battery / Lights",
              icon: "flash",
            },
            {
              id: "starting_charging",
              label:
                createRequestLabels?.diagStartingCharging ||
                "Starting & Charging (Alternator / Starter)",
              icon: "battery-charging",
            },
            {
              id: "abs_traction",
              label:
                createRequestLabels?.diagAbsTraction ||
                "ABS / Traction Control / Stability",
              icon: "shield",
            },
            {
              id: "sensors",
              label:
                createRequestLabels?.diagSensors ||
                "Sensors (O2, MAF, MAP, Knock, Camshaft)",
              icon: "analytics",
            },
            {
              id: "infotainment",
              label:
                createRequestLabels?.diagInfotainment ||
                "Infotainment / Audio / Navigation / Cameras",
              icon: "tv",
            },
            {
              id: "windows_locks",
              label:
                createRequestLabels?.diagWindowsLocks ||
                "Power Windows / Doors / Locks / Mirrors",
              icon: "contract",
            },
            {
              id: "wiring_harness",
              label:
                createRequestLabels?.diagWiring ||
                "Wiring Harness / Connectors / Fuses",
              icon: "git-network",
            },
            // Climate & Comfort
            {
              id: "ac_heating",
              label:
                createRequestLabels?.diagAcHeating || "A/C or Heating Not Working",
              icon: "thermometer",
            },
            {
              id: "blower_motor",
              label:
                createRequestLabels?.diagBlower || "Blower Motor / Climate Control",
              icon: "snow",
            },
            // Exhaust & Emissions
            {
              id: "exhaust",
              label:
                createRequestLabels?.diagExhaust ||
                "Exhaust / Catalytic Converter / Emissions",
              icon: "cloud",
            },
            {
              id: "egr_evap",
              label:
                createRequestLabels?.diagEgrEvap ||
                "EGR / EVAP System / Purge Valve",
              icon: "swap-vertical",
            },
            // Fluids & Cooling
            {
              id: "fluids_leaks",
              label:
                createRequestLabels?.diagFluids ||
                "Fluid Leaks (Oil, Coolant, Transmission)",
              icon: "water",
            },
            {
              id: "cooling_system",
              label:
                createRequestLabels?.diagCooling ||
                "Cooling System / Radiator / Hoses / Thermostat",
              icon: "snow",
            },
            {
              id: "fuel_system",
              label:
                createRequestLabels?.diagFuelSystem ||
                "Fuel System / Injectors / Fuel Pump / Filter",
              icon: "speedometer",
            },
            // Tires & Wheels
            {
              id: "tires_wheels",
              label: createRequestLabels?.diagTires || "Tires / Wheels / TPMS",
              icon: "ellipse",
            },
            // Noises & Performance
            {
              id: "noises",
              label:
                createRequestLabels?.diagNoises ||
                "Strange Noises (Identify Source)",
              icon: "volume-high",
            },
            {
              id: "performance",
              label:
                createRequestLabels?.diagPerformance ||
                "Performance Loss / Stalling / Rough Idle",
              icon: "trending-down",
            },
            {
              id: "vibration_diagnosis",
              label:
                createRequestLabels?.diagVibration ||
                "Vibration / Shaking at Speed",
              icon: "pulse",
            },
            // Body & Interior
            {
              id: "body_interior",
              label:
                createRequestLabels?.diagBodyInterior ||
                "Body / Interior / Paint / Rust",
              icon: "car",
            },
            {
              id: "suspension_noise",
              label:
                createRequestLabels?.diagSuspNoise || "Clunks / Rattles Over Bumps",
              icon: "volume-medium",
            },
            // Advanced / Computer
            {
              id: "computer_module",
              label:
                createRequestLabels?.diagComputer ||
                "ECU / PCM / BCM Module Diagnosis",
              icon: "hardware-chip",
            },
            {
              id: "hybrid_ev",
              label:
                createRequestLabels?.diagHybridEV ||
                "Hybrid / EV Battery & Drive System",
              icon: "battery-half",
            },
            // Other
            {
              id: "not_sure",
              label:
                createRequestLabels?.diagNotSure ||
                "Not Sure — Full Diagnostic Needed",
              icon: "help-circle",
            },
          ],
        },
        {
          id: "diagnosticSymptoms",
          label:
            createRequestLabels?.diagnosticSymptoms ||
            "Describe any symptoms (optional, select all that apply)",
          type: "multi",
          options: [
            {
              id: "warning_light",
              label:
                createRequestLabels?.warningLight || "Dashboard Warning Light On",
              icon: "warning",
            },
            {
              id: "check_engine",
              label:
                createRequestLabels?.checkEngine ||
                "Check Engine Light Specifically",
              icon: "alert-circle",
            },
            {
              id: "odd_smell",
              label:
                createRequestLabels?.oddSmell ||
                "Unusual Smell (Burning, Fuel, Sweet)",
              icon: "flame",
            },
            {
              id: "vibration",
              label: createRequestLabels?.vibrationSymptom || "Vibration / Shaking",
              icon: "pulse",
            },
            {
              id: "starting_issue",
              label:
                createRequestLabels?.startingIssue ||
                "Difficulty Starting / Won't Start",
              icon: "close-circle",
            },
            {
              id: "stalling",
              label:
                createRequestLabels?.stallingSymptom ||
                "Stalling / Engine Cuts Off",
              icon: "stop-circle",
            },
            {
              id: "overheating",
              label:
                createRequestLabels?.overheatingSymptom ||
                "Overheating / Temperature High",
              icon: "thermometer",
            },
            {
              id: "poor_fuel",
              label: createRequestLabels?.poorFuel || "Poor Fuel Economy",
              icon: "speedometer",
            },
            {
              id: "pulling",
              label: createRequestLabels?.pullingSide || "Pulling to One Side",
              icon: "arrow-forward",
            },
            {
              id: "battery_drain",
              label:
                createRequestLabels?.batteryDrain ||
                "Battery Keeps Dying / Parasitic Drain",
              icon: "battery-dead",
            },
            {
              id: "smoke_exhaust",
              label:
                createRequestLabels?.smokeExhaust ||
                "Smoke from Exhaust (White / Blue / Black)",
              icon: "cloud",
            },
            {
              id: "fluid_under_car",
              label:
                createRequestLabels?.fluidUnderCar || "Fluid Puddle Under Vehicle",
              icon: "water",
            },
            {
              id: "grinding_noise",
              label:
                createRequestLabels?.grindingNoise || "Grinding or Squealing Noise",
              icon: "volume-high",
            },
            {
              id: "clicking_noise",
              label:
                createRequestLabels?.clickingNoise || "Clicking / Ticking Noise",
              icon: "volume-medium",
            },
            {
              id: "rough_idle",
              label:
                createRequestLabels?.roughIdleMisfires ||
                "Rough Idle / Engine Misfires",
              icon: "pulse",
            },
            {
              id: "loss_of_power",
              label:
                createRequestLabels?.lossOfPower || "Loss of Power / Acceleration",
              icon: "trending-down",
            },
            {
              id: "transmission_slip",
              label:
                createRequestLabels?.transSlip ||
                "Transmission Slipping / Delayed Shift",
              icon: "swap-horizontal",
            },
            {
              id: "steering_difficulty",
              label:
                createRequestLabels?.steeringDifficulty ||
                "Steering Feels Stiff or Loose",
              icon: "move",
            },
            {
              id: "brake_issue",
              label:
                createRequestLabels?.brakeIssue ||
                "Brakes Soft / Spongy / Grinding",
              icon: "disc",
            },
            {
              id: "electrical_issue",
              label:
                createRequestLabels?.electricalIssue ||
                "Lights Flickering / Electrical Glitches",
              icon: "flash",
            },
          ],
        },
      ],
    },
    battery: {
      title: createRequestLabels?.batteryOptions || "Battery Service Details",
      sections: [
        {
          id: "batteryService",
          label: createRequestLabels?.batteryServiceType || "Service Needed",
          type: "single",
          options: [
            {
              id: "test",
              label:
                createRequestLabels?.batteryTest || "Battery Test / Diagnostic",
              icon: "speedometer",
            },
            {
              id: "replacement",
              label:
                createRequestLabels?.batteryReplacement || "Battery Replacement",
              icon: "swap-horizontal",
            },
            {
              id: "jumpstart",
              label: createRequestLabels?.jumpStart || "Jump Start",
              icon: "flash",
            },
            {
              id: "terminals",
              label:
                createRequestLabels?.batteryTerminals ||
                "Clean / Replace Terminals & Cables",
              icon: "git-branch",
            },
          ],
        },
        {
          id: "batterySymptoms",
          label: createRequestLabels?.batterySymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            {
              id: "slow_crank",
              label: createRequestLabels?.slowCrank || "Slow Crank / Hard to Start",
              icon: "time",
            },
            {
              id: "no_start",
              label: createRequestLabels?.noStartBattery || "Won't Start at All",
              icon: "close-circle",
            },
            {
              id: "warning_light",
              label: createRequestLabels?.batteryLight || "Battery Warning Light",
              icon: "warning",
            },
            {
              id: "corrosion",
              label: createRequestLabels?.corrosion || "Corrosion on Terminals",
              icon: "alert-circle",
            },
            {
              id: "old_battery",
              label: createRequestLabels?.oldBattery || "Battery is 3+ Years Old",
              icon: "calendar",
            },
          ],
        },
      ],
    },
    towing: {
      title: createRequestLabels?.towingOptions || "Towing Details",
      sections: [
        {
          id: "towingReason",
          label: createRequestLabels?.towingReason || "Reason for Towing",
          type: "single",
          options: [
            {
              id: "breakdown",
              label: createRequestLabels?.breakdown || "Breakdown / Won't Start",
              icon: "close-circle",
            },
            {
              id: "accident",
              label: createRequestLabels?.accident || "Accident / Collision",
              icon: "alert-circle",
            },
            {
              id: "flat_tire",
              label: createRequestLabels?.flatTireTow || "Flat Tire (No Spare)",
              icon: "ellipse",
            },
            {
              id: "transport",
              label:
                createRequestLabels?.vehicleTransport ||
                "Vehicle Transport / Relocation",
              icon: "navigate",
            },
            {
              id: "impound",
              label: createRequestLabels?.impound || "Pick Up from Impound",
              icon: "lock-closed",
            },
          ],
        },
        {
          id: "vehicleCondition",
          label: createRequestLabels?.vehicleCondition || "Vehicle Condition",
          type: "single",
          options: [
            {
              id: "rolls",
              label:
                createRequestLabels?.vehicleRolls || "Wheels Roll (Neutral OK)",
              icon: "checkmark-circle",
            },
            {
              id: "no_roll",
              label:
                createRequestLabels?.vehicleNoRoll || "Wheels Locked / Won't Roll",
              icon: "close-circle",
            },
            {
              id: "not_sure",
              label:
                createRequestLabels?.notSureShort ||
                createRequestLabels?.notSure ||
                "Not Sure",
              icon: "help-circle",
            },
          ],
        },
      ],
    },
    roadside: {
      title: createRequestLabels?.roadsideOptions || "Roadside Assistance Details",
      sections: [
        {
          id: "roadsideNeed",
          label: createRequestLabels?.roadsideNeed || "What Do You Need?",
          type: "single",
          options: [
            {
              id: "jumpstart",
              label: createRequestLabels?.jumpStart || "Jump Start",
              icon: "flash",
            },
            {
              id: "flat_tire",
              label: createRequestLabels?.flatTireChange || "Flat Tire Change",
              icon: "ellipse",
            },
            {
              id: "fuel",
              label: createRequestLabels?.fuelDelivery || "Fuel Delivery",
              icon: "flame",
            },
            {
              id: "lockout_road",
              label: createRequestLabels?.lockedOut || "Locked Out",
              icon: "key",
            },
            {
              id: "winch",
              label: createRequestLabels?.winchOut || "Winch Out (Stuck / Ditch)",
              icon: "link",
            },
            {
              id: "other_road",
              label: createRequestLabels?.otherRoadside || "Other Roadside Help",
              icon: "help-circle",
            },
          ],
        },
      ],
    },
    lockout: {
      title: createRequestLabels?.lockoutOptions || "Lockout Details",
      sections: [
        {
          id: "lockoutType",
          label: createRequestLabels?.lockoutType || "Lockout Situation",
          type: "single",
          options: [
            {
              id: "keys_inside",
              label: createRequestLabels?.keysInside || "Keys Locked Inside Car",
              icon: "key",
            },
            {
              id: "lost_keys",
              label: createRequestLabels?.lostKeys || "Lost / Broken Keys",
              icon: "close-circle",
            },
            {
              id: "key_fob",
              label: createRequestLabels?.keyFob || "Key Fob Not Working",
              icon: "radio",
            },
            {
              id: "trunk",
              label: createRequestLabels?.trunkLockout || "Trunk Lockout",
              icon: "cube",
            },
            {
              id: "ignition",
              label: createRequestLabels?.ignitionKey || "Key Stuck in Ignition",
              icon: "lock-closed",
            },
          ],
        },
      ],
    },
    other: {
      title: createRequestLabels?.otherOptions || "Service Details",
      sections: [
        {
          id: "otherCategory",
          label: createRequestLabels?.otherCategory || "Category",
          type: "single",
          options: [
            {
              id: "exhaust",
              label: createRequestLabels?.exhaust || "Exhaust / Muffler",
              icon: "cloud",
            },
            {
              id: "cooling",
              label:
                createRequestLabels?.coolingSystem ||
                "Cooling System (Radiator / Hoses)",
              icon: "water",
            },
            {
              id: "steering",
              label: createRequestLabels?.steering || "Power Steering",
              icon: "sync",
            },
            {
              id: "fuel_system",
              label:
                createRequestLabels?.fuelSystem || "Fuel System (Pump / Injectors)",
              icon: "flame",
            },
            {
              id: "body_work",
              label: createRequestLabels?.bodyWork || "Body Work / Dents / Paint",
              icon: "color-palette",
            },
            {
              id: "glass",
              label: createRequestLabels?.glass || "Windshield / Glass",
              icon: "expand",
            },
            {
              id: "custom",
              label: createRequestLabels?.customService || "Something Else",
              icon: "create",
            },
          ],
        },
      ],
    },
    // ─── Air Filter Service ───
    air_filter: {
      title:
        createRequestLabels?.airFilterServiceTitle ||
        "Air Filter Service Details",
      sections: [
        {
          id: "filterType",
          label:
            createRequestLabels?.airFilterFilterType || "Filter Type",
          type: "multi",
          options: [
            {
              id: "engine_air",
              label: createRequestLabels?.filterEngineAir || "Engine Air Filter",
              icon: "cloud",
            },
            {
              id: "cabin_air",
              label: createRequestLabels?.filterCabinAir || "Cabin Air Filter",
              icon: "car",
            },
            {
              id: "secondary_air",
              label:
                createRequestLabels?.filterSecondaryAir ||
                "Secondary (Safety) Air Filter",
              icon: "shield",
            },
          ],
        },
      ],
    },
    // ─── Fuel System ───
    fuel_system: {
      title:
        createRequestLabels?.fuelSystemServiceTitle ||
        "Fuel System Service Details",
      sections: [
        {
          id: "fuelService",
          label: createRequestLabels?.tireServiceType || "Service Needed",
          type: "multi",
          options: [
            {
              id: "fuel_filter",
              label:
                createRequestLabels?.fuelFilterReplace ||
                "Fuel Filter Replacement",
              icon: "funnel",
            },
            {
              id: "fuel_pump",
              label: createRequestLabels?.fuelPumpOption || "Fuel Pump",
              icon: "flash",
            },
            {
              id: "injector_cleaning",
              label:
                createRequestLabels?.fuelInjectorCleaning ||
                "Injector Cleaning / Flush",
              icon: "water",
            },
            {
              id: "injector_replace",
              label:
                createRequestLabels?.fuelInjectorReplace ||
                "Injector Replacement",
              icon: "swap-horizontal",
            },
            {
              id: "throttle_body",
              label:
                createRequestLabels?.fuelThrottleBodyCleaning ||
                "Throttle Body Cleaning",
              icon: "options",
            },
            {
              id: "water_separator",
              label:
                createRequestLabels?.fuelWaterSeparatorDiesel ||
                "Water Separator Drain (Diesel)",
              icon: "funnel",
            },
            {
              id: "fuel_line",
              label:
                createRequestLabels?.fuelLineRepair ||
                "Fuel Line Repair / Replace",
              icon: "git-branch",
            },
            {
              id: "fuel_pressure",
              label:
                createRequestLabels?.fuelPressureRegulator ||
                "Fuel Pressure Regulator",
              icon: "speedometer",
            },
          ],
        },
      ],
    },
    // ─── Cooling System ───
    cooling: {
      title:
        createRequestLabels?.coolingServiceTitle ||
        "Cooling System Service Details",
      sections: [
        {
          id: "coolingService",
          label: createRequestLabels?.tireServiceType || "Service Needed",
          type: "multi",
          options: [
            {
              id: "coolant_flush",
              label:
                createRequestLabels?.coolantFlushExchange ||
                "Coolant Flush / Exchange",
              icon: "water",
            },
            {
              id: "radiator",
              label:
                createRequestLabels?.radiatorRepairReplace ||
                "Radiator Repair / Replace",
              icon: "grid",
            },
            {
              id: "thermostat",
              label:
                createRequestLabels?.thermostatReplacement ||
                "Thermostat Replacement",
              icon: "thermometer",
            },
            {
              id: "water_pump",
              label: createRequestLabels?.waterPumpService || "Water Pump",
              icon: "refresh",
            },
            {
              id: "hoses",
              label:
                createRequestLabels?.radiatorHosesUpperLower ||
                "Radiator Hoses (Upper / Lower)",
              icon: "git-branch",
            },
            {
              id: "fan_clutch",
              label: createRequestLabels?.fanOrFanClutch || "Fan / Fan Clutch",
              icon: "aperture",
            },
            {
              id: "heater_core",
              label: createRequestLabels?.heaterCoreService || "Heater Core",
              icon: "flame",
            },
            {
              id: "coolant_leak",
              label:
                createRequestLabels?.coolantLeakDiagnosis ||
                "Coolant Leak Diagnosis",
              icon: "search",
            },
          ],
        },
        {
          id: "coolingSymptoms",
          label: createRequestLabels?.brakeSymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            {
              id: "overheating",
              label:
                createRequestLabels?.coolingSymptomEngineOverheat ||
                "Engine Overheating",
              icon: "thermometer",
            },
            {
              id: "low_coolant",
              label:
                createRequestLabels?.coolingSymptomLowCoolantWarn ||
                "Low Coolant Warning",
              icon: "warning",
            },
            {
              id: "leak_visible",
              label:
                createRequestLabels?.coolingSymptomVisibleLeak ||
                "Visible Coolant Leak",
              icon: "water",
            },
            {
              id: "no_heat_cabin",
              label:
                createRequestLabels?.coolingSymptomNoHeatCabin ||
                "No Heat in Cabin",
              icon: "snow",
            },
          ],
        },
      ],
    },
    // ─── Exhaust System ───
    exhaust: {
      title:
        createRequestLabels?.exhaustServiceTitle ||
        "Exhaust System Service Details",
      sections: [
        {
          id: "exhaustService",
          label: createRequestLabels?.tireServiceType || "Service Needed",
          type: "multi",
          options: [
            {
              id: "muffler",
              label:
                createRequestLabels?.mufflerRepairReplace ||
                "Muffler Repair / Replace",
              icon: "volume-medium",
            },
            {
              id: "catalytic_converter",
              label:
                createRequestLabels?.catalyticConverterService ||
                "Catalytic Converter",
              icon: "flash",
            },
            {
              id: "exhaust_pipe",
              label:
                createRequestLabels?.exhaustPipeSections ||
                "Exhaust Pipe / Sections",
              icon: "git-branch",
            },
            {
              id: "exhaust_manifold",
              label:
                createRequestLabels?.exhaustManifoldGasket ||
                "Exhaust Manifold / Gasket",
              icon: "layers",
            },
            {
              id: "resonator",
              label: createRequestLabels?.resonatorService || "Resonator",
              icon: "radio",
            },
            {
              id: "flex_pipe",
              label: createRequestLabels?.flexPipeService || "Flex Pipe",
              icon: "swap-horizontal",
            },
            {
              id: "oxygen_sensor",
              label:
                createRequestLabels?.o2SensorReplacement ||
                "O2 Sensor Replacement",
              icon: "analytics",
            },
            {
              id: "dpf",
              label: createRequestLabels?.dpfServiceDiesel || "DPF Service (Diesel)",
              icon: "funnel",
            },
            {
              id: "def_scr",
              label:
                createRequestLabels?.defScrServiceDiesel ||
                "DEF / SCR Service (Diesel)",
              icon: "beaker",
            },
            {
              id: "egr",
              label: createRequestLabels?.egrValveSystem || "EGR Valve / System",
              icon: "sync",
            },
          ],
        },
        {
          id: "exhaustSymptoms",
          label: createRequestLabels?.brakeSymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            {
              id: "loud_exhaust",
              label:
                createRequestLabels?.exhaustSymptomLoudNoise ||
                "Loud Exhaust Noise",
              icon: "volume-high",
            },
            {
              id: "exhaust_smell",
              label:
                createRequestLabels?.exhaustSmellInCabin ||
                "Exhaust Smell Inside Cabin",
              icon: "alert-circle",
            },
            {
              id: "rattling",
              label:
                createRequestLabels?.exhaustSymptomRattling ||
                "Rattling / Hanging Components",
              icon: "pulse",
            },
            {
              id: "check_engine",
              label:
                createRequestLabels?.checkEngineLightEmissions ||
                "Check Engine Light (Emissions)",
              icon: "warning",
            },
          ],
        },
      ],
    },
    // ─── Drivetrain ───
    drivetrain: {
      title:
        createRequestLabels?.drivetrainServiceTitle ||
        "Drivetrain Service Details",
      sections: [
        {
          id: "drivetrainService",
          label: createRequestLabels?.tireServiceType || "Service Needed",
          type: "multi",
          options: [
            {
              id: "differential_fluid",
              label:
                createRequestLabels?.differentialFluidChange ||
                "Differential Fluid Change",
              icon: "water",
            },
            {
              id: "differential_repair",
              label:
                createRequestLabels?.differentialRepair || "Differential Repair",
              icon: "construct",
            },
            {
              id: "transfer_case",
              label:
                createRequestLabels?.transferCaseFluidRepair4wd ||
                "Transfer Case Fluid / Repair (4WD/AWD)",
              icon: "swap-horizontal",
            },
            {
              id: "cv_axle",
              label: createRequestLabels?.cvAxleCvJoint || "CV Axle / CV Joint",
              icon: "git-branch",
            },
            {
              id: "u_joint",
              label:
                createRequestLabels?.uJointReplacement || "U-Joint Replacement",
              icon: "radio-button-on",
            },
            {
              id: "driveshaft",
              label:
                createRequestLabels?.driveshaftRepairBalance ||
                "Driveshaft Repair / Balance",
              icon: "resize",
            },
            {
              id: "hub_bearing",
              label:
                createRequestLabels?.hubWheelBearingDriveAxle ||
                "Hub / Wheel Bearing (Drive Axle)",
              icon: "sync",
            },
            {
              id: "pto",
              label:
                createRequestLabels?.ptoServiceWorkTrucks ||
                "PTO Service (Work Trucks)",
              icon: "cog",
            },
          ],
        },
        {
          id: "driveType",
          label: createRequestLabels?.driveTypeWhich || "Drive Type",
          type: "single",
          options: [
            {
              id: "fwd",
              label: createRequestLabels?.driveFwd || "Front-Wheel Drive (FWD)",
              icon: "arrow-up",
            },
            {
              id: "rwd",
              label: createRequestLabels?.driveRwd || "Rear-Wheel Drive (RWD)",
              icon: "arrow-down",
            },
            {
              id: "4wd",
              label: createRequestLabels?.drive4wd || "4WD / 4x4",
              icon: "apps",
            },
            {
              id: "awd",
              label: createRequestLabels?.driveAwd || "All-Wheel Drive (AWD)",
              icon: "grid",
            },
            {
              id: "not_sure",
              label:
                createRequestLabels?.notSureShort ||
                createRequestLabels?.notSure ||
                "Not Sure",
              icon: "help-circle",
            },
          ],
        },
      ],
    },
    // ─── Belts & Hoses ───
    belts_hoses: {
      title:
        createRequestLabels?.beltsHosesServiceTitle ||
        "Belts & Hoses Service Details",
      sections: [
        {
          id: "beltsService",
          label: createRequestLabels?.tireServiceType || "Service Needed",
          type: "multi",
          options: [
            {
              id: "serpentine",
              label:
                createRequestLabels?.serpentineBeltService || "Serpentine Belt",
              icon: "sync",
            },
            {
              id: "timing_belt",
              label:
                createRequestLabels?.timingBeltOrChain || "Timing Belt / Chain",
              icon: "time",
            },
            {
              id: "tensioner",
              label:
                createRequestLabels?.beltTensionerIdlerPulley ||
                "Belt Tensioner / Idler Pulley",
              icon: "cog",
            },
            {
              id: "radiator_hoses",
              label:
                createRequestLabels?.radiatorHosesBelts || "Radiator Hoses",
              icon: "git-branch",
            },
            {
              id: "heater_hoses",
              label:
                createRequestLabels?.heaterHosesService || "Heater Hoses",
              icon: "flame",
            },
            {
              id: "power_steering_hose",
              label:
                createRequestLabels?.powerSteeringHoseService ||
                "Power Steering Hose",
              icon: "swap-horizontal",
            },
            {
              id: "ac_hose",
              label: createRequestLabels?.acHoseOrLine || "A/C Hose / Line",
              icon: "snow",
            },
            {
              id: "vacuum_hoses",
              label:
                createRequestLabels?.vacuumHosesService || "Vacuum Hoses",
              icon: "funnel",
            },
          ],
        },
        {
          id: "beltsSymptoms",
          label: createRequestLabels?.brakeSymptoms || "Symptoms (optional)",
          type: "multi",
          options: [
            {
              id: "squealing",
              label:
                createRequestLabels?.beltSymptomSquealChirp ||
                "Squealing / Chirping Noise",
              icon: "volume-high",
            },
            {
              id: "cracking",
              label:
                createRequestLabels?.beltSymptomCracksWear ||
                "Visible Cracks / Wear",
              icon: "alert-circle",
            },
            {
              id: "leak_hose",
              label:
                createRequestLabels?.beltSymptomFluidLeakHose ||
                "Fluid Leak from Hose",
              icon: "water",
            },
          ],
        },
      ],
    },
    // ─── Fluid Services ───
    fluids: {
      title:
        createRequestLabels?.fluidsServiceTitle || "Fluid Services Details",
      sections: [
        {
          id: "fluidService",
          label: createRequestLabels?.whichFluids || "Which Fluids?",
          type: "multi",
          options: [
            {
              id: "engine_oil",
              label:
                createRequestLabels?.fluidEngineOilChange ||
                "Engine Oil Change",
              icon: "water",
            },
            {
              id: "transmission_fluid",
              label:
                createRequestLabels?.fluidTransmissionFluid ||
                "Transmission Fluid",
              icon: "swap-horizontal",
            },
            {
              id: "brake_fluid",
              label: createRequestLabels?.brakeFluid || "Brake Fluid Flush",
              icon: "disc",
            },
            {
              id: "coolant",
              label:
                createRequestLabels?.fluidCoolantAntifreezeFlush ||
                "Coolant / Antifreeze Flush",
              icon: "thermometer",
            },
            {
              id: "power_steering",
              label:
                createRequestLabels?.fluidPowerSteeringFluid ||
                "Power Steering Fluid",
              icon: "sync",
            },
            {
              id: "differential",
              label:
                createRequestLabels?.fluidDifferentialFluid ||
                "Differential Fluid",
              icon: "cog",
            },
            {
              id: "transfer_case_fluid",
              label:
                createRequestLabels?.fluidTransferCase4wd ||
                "Transfer Case Fluid (4WD/AWD)",
              icon: "swap-horizontal",
            },
            {
              id: "windshield_washer",
              label:
                createRequestLabels?.fluidWindshieldWasher ||
                "Windshield Washer Fluid",
              icon: "water",
            },
            {
              id: "def",
              label: createRequestLabels?.fluidDefDiesel || "DEF (Diesel Exhaust Fluid)",
              icon: "beaker",
            },
          ],
        },
      ],
    },
    // ─── Detailing ───
    detailing: {
      title:
        createRequestLabels?.detailingServiceTitle ||
        "Detailing Service Details",
      sections: [
        {
          id: "detailScope",
          label:
            createRequestLabels?.detailServiceScope || "Service Scope",
          type: "single",
          options: [
            {
              id: "exterior",
              label: createRequestLabels?.detailExteriorOnly || "Exterior Only",
              icon: "car",
            },
            {
              id: "interior",
              label: createRequestLabels?.detailInteriorOnly || "Interior Only",
              icon: "home",
            },
            {
              id: "full",
              label:
                createRequestLabels?.detailFullInteriorExterior ||
                "Full Detail (Interior + Exterior)",
              icon: "star",
            },
            {
              id: "express",
              label:
                createRequestLabels?.detailExpressWashVacuum ||
                "Express Wash & Vacuum",
              icon: "flash",
            },
          ],
        },
        {
          id: "detailServices",
          label:
            createRequestLabels?.detailServicesSelectAll ||
            "Services Needed (select all)",
          type: "multi",
          options: [
            {
              id: "hand_wash",
              label:
                createRequestLabels?.detailHandWashDry || "Hand Wash & Dry",
              icon: "water",
            },
            {
              id: "wax_polish",
              label: createRequestLabels?.detailWaxPolish || "Wax / Polish",
              icon: "sparkles",
            },
            {
              id: "clay_bar",
              label: createRequestLabels?.detailClayBar || "Clay Bar Treatment",
              icon: "ellipse",
            },
            {
              id: "paint_correction",
              label:
                createRequestLabels?.detailPaintCorrection ||
                "Paint Correction / Swirl Removal",
              icon: "color-palette",
            },
            {
              id: "ceramic_coating",
              label:
                createRequestLabels?.detailCeramicCoating || "Ceramic Coating",
              icon: "shield",
            },
            {
              id: "tire_shine",
              label:
                createRequestLabels?.detailTireShineWheels ||
                "Tire Shine & Wheel Cleaning",
              icon: "ellipse",
            },
            {
              id: "vacuum",
              label:
                createRequestLabels?.detailInteriorVacuum || "Interior Vacuum",
              icon: "funnel",
            },
            {
              id: "shampoo",
              label:
                createRequestLabels?.detailSeatCarpetShampoo ||
                "Seat / Carpet Shampoo",
              icon: "layers",
            },
            {
              id: "leather",
              label:
                createRequestLabels?.detailLeatherConditioning ||
                "Leather Conditioning",
              icon: "briefcase",
            },
            {
              id: "odor_removal",
              label:
                createRequestLabels?.detailOdorOzone ||
                "Odor Removal / Ozone Treatment",
              icon: "alert-circle",
            },
            {
              id: "windows_clean",
              label:
                createRequestLabels?.detailWindowsInOut ||
                "Window Cleaning (Inside + Out)",
              icon: "expand",
            },
            {
              id: "engine_clean",
              label:
                createRequestLabels?.detailEngineBayCleaning ||
                "Engine Bay Cleaning",
              icon: "cog",
            },
            {
              id: "headlight",
              label:
                createRequestLabels?.detailHeadlightRestoration ||
                "Headlight Restoration",
              icon: "bulb",
            },
          ],
        },
      ],
    },
    // ─── General Repair ───
    general_repair: {
      title: createRequestLabels?.generalRepairTitle || "General Repair Details",
      sections: [
        {
          id: "repairArea",
          label: createRequestLabels?.repairAreaOfVehicle || "Area of Vehicle",
          type: "multi",
          options: [
            {
              id: "engine",
              label:
                createRequestLabels?.repairAreaEngineDrivetrain ||
                "Engine / Drivetrain",
              icon: "cog",
            },
            {
              id: "brakes",
              label:
                createRequestLabels?.repairAreaBrakesWheels ||
                "Brakes / Wheels",
              icon: "disc",
            },
            {
              id: "suspension",
              label:
                createRequestLabels?.repairAreaSuspensionSteering ||
                "Suspension / Steering",
              icon: "navigate",
            },
            {
              id: "electrical",
              label:
                createRequestLabels?.repairAreaElectrical ||
                "Electrical / Electronics",
              icon: "flash",
            },
            {
              id: "ac_heat",
              label: createRequestLabels?.repairAreaAcHeating || "A/C / Heating",
              icon: "snow",
            },
            {
              id: "body",
              label:
                createRequestLabels?.repairAreaBodyFrameRust ||
                "Body / Frame / Rust",
              icon: "car",
            },
            {
              id: "interior",
              label:
                createRequestLabels?.repairAreaInteriorTrim ||
                "Interior / Trim",
              icon: "home",
            },
            {
              id: "exhaust",
              label:
                createRequestLabels?.repairAreaExhaustEmissions ||
                "Exhaust / Emissions",
              icon: "cloud",
            },
            {
              id: "fluid_leak",
              label:
                createRequestLabels?.repairAreaFluidLeak || "Fluid Leak",
              icon: "water",
            },
            {
              id: "other",
              label:
                createRequestLabels?.otherOrNotSure || "Other / Not Sure",
              icon: "help-circle",
            },
          ],
        },
        {
          id: "repairSymptoms",
          label:
            createRequestLabels?.repairMainSymptomsOptional ||
            "Main Symptoms (optional)",
          type: "multi",
          options: [
            {
              id: "warning_light",
              label:
                createRequestLabels?.repairSymptomWarningLight ||
                "Warning Light On",
              icon: "warning",
            },
            {
              id: "noise",
              label:
                createRequestLabels?.repairSymptomUnusualNoise ||
                "Unusual Noise",
              icon: "volume-high",
            },
            {
              id: "vibration",
              label:
                createRequestLabels?.repairSymptomVibration ||
                "Vibration / Shaking",
              icon: "pulse",
            },
            {
              id: "leak",
              label:
                createRequestLabels?.repairSymptomVisibleLeak || "Visible Leak",
              icon: "water",
            },
            {
              id: "no_start",
              label:
                createRequestLabels?.repairSymptomWontStart || "Won't Start",
              icon: "close-circle",
            },
            {
              id: "overheating",
              label:
                createRequestLabels?.repairSymptomOverheating || "Overheating",
              icon: "thermometer",
            },
            {
              id: "performance",
              label:
                createRequestLabels?.repairSymptomPoorPerformance ||
                "Poor Performance",
              icon: "trending-down",
            },
          ],
        },
      ],
    },
    // ─── Preventive Maintenance Packages ───
    packages: {
      title:
        createRequestLabels?.packagesPreventiveTitle ||
        "Preventive Maintenance Package",
      sections: [
        {
          id: "packageType",
          label: createRequestLabels?.packageSelectLabel || "Select Package",
          type: "single",
          options: [
            {
              id: "basic",
              label:
                createRequestLabels?.packageBasicOilFilter ||
                "Basic — Oil + Filter + Inspection",
              icon: "checkmark-circle",
            },
            {
              id: "standard",
              label:
                createRequestLabels?.packageStandardFull ||
                "Standard — Oil + Filters + Fluids Check + Brakes + Tires",
              icon: "shield-checkmark",
            },
            {
              id: "premium",
              label:
                createRequestLabels?.packagePremiumFull ||
                "Premium — Full Service + All Fluids + Belts + Hoses + Battery",
              icon: "diamond",
            },
            {
              id: "seasonal",
              label:
                createRequestLabels?.packageSeasonalPrep ||
                "Seasonal Prep (Winter / Summer)",
              icon: "sunny",
            },
            {
              id: "trip_prep",
              label:
                createRequestLabels?.packageTripPrepLong ||
                "Trip Prep / Long Distance Check",
              icon: "navigate",
            },
          ],
        },
        {
          id: "mileageInterval",
          label:
            createRequestLabels?.packageMileageIntervalOptional ||
            "Mileage Interval (optional)",
          type: "single",
          options: [
            {
              id: "5k",
              label: createRequestLabels?.packageMiles5k || "5,000 Miles",
              icon: "speedometer",
            },
            {
              id: "15k",
              label: createRequestLabels?.packageMiles15k || "15,000 Miles",
              icon: "speedometer",
            },
            {
              id: "30k",
              label: createRequestLabels?.packageMiles30k || "30,000 Miles",
              icon: "speedometer",
            },
            {
              id: "60k",
              label: createRequestLabels?.packageMiles60k || "60,000 Miles",
              icon: "speedometer",
            },
            {
              id: "100k",
              label: createRequestLabels?.packageMiles100k || "100,000 Miles",
              icon: "speedometer",
            },
            {
              id: "not_sure",
              label:
                createRequestLabels?.notSureShort ||
                createRequestLabels?.notSure ||
                "Not Sure",
              icon: "help-circle",
            },
          ],
        },
      ],
    },
  };

  // Handle sub-option toggle
  const handleSubOptionToggle = (
    sectionId: string,
    optionId: string,
    type: "single" | "multi",
  ) => {
    setSubOptionSelections((prev) => {
      const current = prev[sectionId] || [];
      if (type === "single") {
        return { ...prev, [sectionId]: [optionId] };
      }
      // multi toggle
      if (current.includes(optionId)) {
        return {
          ...prev,
          [sectionId]: current.filter((id) => id !== optionId),
        };
      }
      return { ...prev, [sectionId]: [...current, optionId] };
    });
  };

  // Confirm sub-options and build description
  const confirmSubOptions = () => {
    const subOpts = SERVICE_SUB_OPTIONS[pendingServiceId];
    if (!subOpts) return;
    const serviceLabel =
      serviceTypes.find((s) => s.id === pendingServiceId)?.label || "";

    // Collect all selected part labels grouped by section
    const partLines: string[] = [];
    subOpts.sections.forEach((section) => {
      const selected = subOptionSelections[section.id] || [];
      if (selected.length > 0) {
        const labels = selected.map((id) => {
          const opt = section.options.find((o) => o.id === id);
          return opt?.label || id;
        });
        partLines.push(...labels);
      }
    });

    // Title: just the service name (clean)
    setTitle(serviceLabel);

    // Description: list the parts
    if (partLines.length > 0) {
      setDescription((prev) =>
        prev ? `${prev}\n${partLines.join(", ")}` : partLines.join(", ")
      );
    }

    setShowSubOptionsModal(false);
  };

  // Handle service type selection with sub-options
  const handleServiceSelect = (serviceId: string, serviceLabel: string) => {
    // Clear old selections when changing service type
    setDescription("");
    setSubOptionSelections({});
    setSelectedService(serviceId);
    setTitle(serviceLabel);
    if (SERVICE_SUB_OPTIONS[serviceId]) {
      setPendingServiceId(serviceId);
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
      log.error("Error loading favorite providers:", error);
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
        log.error("Error checking active work orders:", error);
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
        log.error("Error checking payment methods:", error);
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
    {
      id: string;
      name: string;
      plate: string;
      fuelType?: string;
      bodyType?: string;
      currentMileage?: number;
    }[]
  >([]);

  // Map NHTSA body class to vehicle type
  function mapBodyTypeToVehicleType(body?: string): string {
    if (!body) return "";
    const b = body.toLowerCase();
    if (
      b.includes("sedan") ||
      b.includes("coupe") ||
      b.includes("convertible") ||
      b.includes("hatchback") ||
      b.includes("wagon")
    )
      return "car";
    if (
      b.includes("suv") ||
      b.includes("sport utility") ||
      b.includes("crossover")
    )
      return "suv";
    if (b.includes("pickup")) return "truck";
    if (
      b.includes("van") ||
      b.includes("minivan") ||
      b.includes("mpv") ||
      b.includes("multi")
    )
      return "van";
    if (
      b.includes("heavy") ||
      b.includes("semi") ||
      b.includes("medium") ||
      b.includes("cab chassis") ||
      b.includes("tractor")
    )
      return "heavy_truck";
    if (
      b.includes("bus") ||
      b.includes("rv") ||
      b.includes("motorhome") ||
      b.includes("coach") ||
      b.includes("motor home")
    )
      return "bus";
    if (b.includes("truck")) return "truck";
    return "";
  }

  function handleVehicleSelect(vehicleId: string) {
    setSelectedVehicle(vehicleId);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (vehicle?.currentMileage) {
      setMileage(String(vehicle.currentMileage));
    }
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
          name: [v.year, v.make, v.model, v.trim].filter(Boolean).join(" "),
          plate: v.plateNumber,
          fuelType: v.fuelType,
          bodyType: v.bodyType,
          currentMileage: (v as any).currentMileage,
        })),
      );
      if (vehicleData.length > 0) {
        setSelectedVehicle(vehicleData[0].id);
        if ((vehicleData[0] as any).currentMileage) {
          setMileage(String((vehicleData[0] as any).currentMileage));
        }
        // Auto-select vehicle type based on bodyType
        const firstBody = vehicleData[0].bodyType;
        if (firstBody) {
          const mapped = mapBodyTypeToVehicleType(firstBody);
          if (mapped) {
            setVehicleType(mapped);
            setVehicleTypeLocked(true);
          }
        }
      } else {
        setSelectedVehicle("");
        setVehicleType("");
        setVehicleTypeLocked(false);
      }
    } catch (error) {
      log.error("Error loading vehicles:", error);
      setVehicles([]);
      setSelectedVehicle("");
      setVehicleType("");
      setVehicleTypeLocked(false);
    }
  }

  // Service types — aligned with Mobile App Service & Diagnostic Tree (Feb 2026)
  // Icons use Ionicons library
  const serviceTypes: { id: string; label: string; icon: string; iconLib?: "mci"; hasProviders: boolean }[] = [
    // Maintenance
    {
      id: "oil",
      label: createRequestLabels?.serviceOilChange || "Oil Change",
      icon: "oil",             // MCi: oil drop
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "air_filter",
      label: createRequestLabels?.serviceAirFilter || "Air Filter Service",
      icon: "air-filter",      // MCi: air filter
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "fuel_system",
      label: createRequestLabels?.serviceFuelSystem || "Fuel System",
      icon: "gas-station",     // MCi: gas pump
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "brake",
      label: createRequestLabels?.serviceBrakes || "Brakes",
      icon: "car-brake-abs",   // MCi: ABS brake
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "cooling",
      label: createRequestLabels?.serviceCooling || "Cooling System",
      icon: "coolant-temperature", // MCi: coolant temp gauge
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "tire",
      label: createRequestLabels?.serviceTires || "Tires & Wheels",
      icon: "car-tire-alert",  // MCi: tire icon
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "belts_hoses",
      label: createRequestLabels?.serviceBeltsHoses || "Belts & Hoses",
      icon: "pipe-wrench",     // MCi: pipe/hose wrench
      iconLib: "mci",
      hasProviders: true,
    },
    // Repairs
    {
      id: "ac",
      label: createRequestLabels?.serviceAC || "A/C & Heating",
      icon: "snowflake",       // MCi: snowflake = A/C
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "steering",
      label: createRequestLabels?.serviceSteering || "Steering & Suspension",
      icon: "steering",        // MCi: steering wheel
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "electric",
      label: createRequestLabels?.serviceElectrical || "Electrical System",
      icon: "lightning-bolt",  // MCi: lightning bolt
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "exhaust",
      label: createRequestLabels?.serviceExhaust || "Exhaust System",
      icon: "pipe",            // MCi: pipe = exhaust pipe
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "drivetrain",
      label: createRequestLabels?.serviceDrivetrain || "Drivetrain",
      icon: "car-cog",         // MCi: car with cog = drivetrain
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "engine",
      label: createRequestLabels?.serviceEngine || "Engine",
      icon: "engine",          // MCi: engine block
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "transmission",
      label: createRequestLabels?.serviceTransmission || "Transmission",
      icon: "car-clutch",      // MCi: clutch/gearbox
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "battery",
      label: createRequestLabels?.serviceBattery || "Battery",
      icon: "car-battery",     // MCi: car battery
      iconLib: "mci",
      hasProviders: true,
    },
    // Fluid Services & Packages
    {
      id: "fluids",
      label: createRequestLabels?.serviceFluidServices || "Fluid Services",
      icon: "water-pump",      // MCi: water/fluid pump
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "packages",
      label: createRequestLabels?.servicePreventive || "Preventive Maintenance",
      icon: "car-wrench",      // MCi: car being serviced
      iconLib: "mci",
      hasProviders: true,
    },
    // Diagnostics
    {
      id: "diagnostic",
      label: t.serviceTypes?.diagnostics || "Diagnostics",
      icon: "car-info",        // MCi: car diagnostic info
      iconLib: "mci",
      hasProviders: true,
    },
    // Detailing
    {
      id: "detailing",
      label: createRequestLabels?.serviceDetailing || "Detailing",
      icon: "spray-bottle",    // MCi: spray bottle = detailing
      iconLib: "mci",
      hasProviders: true,
    },
    // SOS / Roadside
    {
      id: "towing",
      label: createRequestLabels?.serviceTowing || "Towing",
      icon: "tow-truck",       // MCi: tow truck
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "roadside",
      label:
        t.serviceTypes?.roadsideAssistance ||
        createRequestLabels?.serviceRoadside ||
        "Roadside Assist",
      icon: "hazard-lights",   // MCi: hazard lights = emergency
      iconLib: "mci",
      hasProviders: true,
    },
    {
      id: "lockout",
      label: createRequestLabels?.serviceLockout || "Lockout",
      icon: "car-key",         // MCi: car key = lockout
      iconLib: "mci",
      hasProviders: true,
    },
    // General
    {
      id: "general_repair",
      label: t.serviceTypes?.generalRepair || "General Repair",
      icon: "wrench",          // MCi: wrench = repair
      iconLib: "mci",
      hasProviders: true,
    },
  ];

  // Filter only services that have active providers
  const availableServices = serviceTypes.filter((s) => s.hasProviders);

  const locationOptions = [
    {
      id: "shop",
      label: createRequestLabels?.takeToShop || "At the Shop",
      icon: "business",
      description:
        createRequestLabels?.iWillGo ||
        "I'll bring my vehicle to the service provider",
    },
    {
      id: "mobile",
      label: createRequestLabels?.myLocation || "Mobile Service",
      icon: "home",
      description:
        createRequestLabels?.currentLocation ||
        "Service provider comes to my location",
    },
    {
      id: "roadside",
      label:
        t.serviceTypes?.roadsideAssistance ||
        createRequestLabels?.serviceRoadside ||
        "Roadside Assist",
      icon: "car",
      description:
        createRequestLabels?.shareLocation || "Share your real-time location",
    },
  ];

  async function handleGetLocation() {
    Alert.alert(
      createRequestLabels?.shareLocation || "Share Location",
      createRequestLabels?.shareLocationMessage ||
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
                  createRequestLabels?.locationPermissionDenied ||
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
                createRequestLabels?.locationShared ||
                  "Your location will be shared with the provider",
              );
            } catch (err) {
              Alert.alert(
                t.common?.error || "Error",
                createRequestLabels?.locationError || "Could not get location",
              );
            }
          },
        },
      ],
    );
  }

  async function handleGetMobileGpsAddress() {
    setFetchingGpsAddress(true);
    try {
      const Location = await import("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t.createRequest?.locationPermissionDeniedTitle || "Permission Denied",
          t.createRequest?.locationPermissionDeniedBody ||
            "Location permission is required to use GPS address.",
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [geo] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      const parts = [geo?.streetNumber, geo?.street, geo?.city, geo?.region, geo?.postalCode].filter(Boolean);
      const readable = parts.join(", ") || `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`;
      setMobileGpsAddress(readable);
      setMobileGpsCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setSelectedAddressIdx(-1);
    } catch {
      Alert.alert(
        t.common?.error || "Error",
        t.createRequest?.locationFetchErrorBody ||
          "Could not get your location. Please try again or select a saved address.",
      );
    } finally {
      setFetchingGpsAddress(false);
    }
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

  // Step validation for wizard
  function validateStep1(): boolean {
    if (!selectedVehicle) {
      Alert.alert(t.common.error, createRequestLabels?.selectVehicleRequired || "Please select a vehicle.");
      return false;
    }
    if (!selectedService) {
      Alert.alert(t.common.error, createRequestLabels?.selectServiceRequired || "Please select a service type.");
      return false;
    }
    // If the selected service has sub-options, ensure at least one section was filled
    if (SERVICE_SUB_OPTIONS[selectedService]) {
      const sections = SERVICE_SUB_OPTIONS[selectedService].sections;
      const hasAnySelection = sections.some((section) => {
        const selected = subOptionSelections[section.id] || [];
        return selected.length > 0;
      });
      if (!hasAnySelection) {
        Alert.alert(
          t.common.error,
          createRequestLabels?.selectServiceNeed || "Please select the service details by tapping the service type again.",
        );
        return false;
      }
    }
    if (!vehicleType) {
      Alert.alert(t.common.error, createRequestLabels?.selectVehicleType || "Please select a vehicle type.");
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    if (!title.trim()) {
      Alert.alert(t.common.error, createRequestLabels?.enterTitle || "Please enter a request title.");
      return false;
    }
    return true;
  }

  function handleNextStep() {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 3));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function handlePrevStep() {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  async function handleSubmit() {
    if (!selectedVehicle || !selectedService || !title || !vehicleType) {
      Alert.alert(
        t.common.error,
        createRequestLabels?.fillRequired ||
          "Please fill in all required fields (including vehicle type).",
      );
      return;
    }
    if (!responsibilityAccepted) {
      Alert.alert(
        createRequestLabels?.disclaimerRequired || "Acknowledgment Required",
        createRequestLabels?.pleaseAcceptDisclaimer ||
          "Please read and accept the responsibility notice before submitting.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const apiDefault = (await import("../services/api")).default;

      // Build selected address for customerAddress field
      let customerAddress: string | undefined;
      let addressLatitude: number | undefined;
      let addressLongitude: number | undefined;
      if (serviceLocation === "mobile") {
        if (selectedAddressIdx === -1 && mobileGpsAddress) {
          // GPS-captured address
          customerAddress = mobileGpsAddress;
          if (mobileGpsCoords) {
            addressLatitude = mobileGpsCoords.lat;
            addressLongitude = mobileGpsCoords.lng;
          }
        } else if (userAddresses.length > 0) {
          const addr = userAddresses[selectedAddressIdx] || userAddresses[0];
          if (addr) {
            customerAddress = [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(", ");
            if (addr.latitude && addr.longitude) {
              addressLatitude = addr.latitude;
              addressLongitude = addr.longitude;
            }
          }
        }
      } else if (serviceLocation !== "shop" && userAddresses.length > 0) {
        const defaultAddr = userAddresses.find((a: any) => a.isDefault) || userAddresses[0];
        if (defaultAddr) {
          customerAddress = [defaultAddr.street, defaultAddr.city, defaultAddr.state, defaultAddr.zipCode].filter(Boolean).join(", ");
          if (defaultAddr.latitude && defaultAddr.longitude) {
            addressLatitude = defaultAddr.latitude;
            addressLongitude = defaultAddr.longitude;
          }
        }
      }

      // Build enriched description with vehicle type, service scope, and sub-options
      const vehicleTypeDisplay: Record<string, string | undefined> = {
        car: createRequestLabels?.vtCar,
        suv: createRequestLabels?.vtSuv,
        truck: createRequestLabels?.vtTruck,
        van: createRequestLabels?.vtVan,
        heavy_truck: createRequestLabels?.vtHeavyTruck,
        bus: createRequestLabels?.vtBus,
      };
      const scopeDisplay: Record<string, string | undefined> = {
        service: createRequestLabels?.serviceOnly,
        parts: createRequestLabels?.partsOnlyScope,
        both: createRequestLabels?.partsAndService,
      };
      const vtLabel = vehicleTypeDisplay[vehicleType] || vehicleType;
      const scLabel = scopeDisplay[serviceScope] || serviceScope;
      const metaLines = [
        interpolate(
          createRequestLabels?.enrichedLineVehicleType ||
            "Vehicle Type: {{value}}",
          { value: vtLabel },
        ),
        interpolate(
          createRequestLabels?.enrichedLineScope || "Scope: {{value}}",
          { value: scLabel },
        ),
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
        serviceLatitude:
          !shareLocation && addressLatitude ? addressLatitude : undefined,
        serviceLongitude:
          !shareLocation && addressLongitude ? addressLongitude : undefined,
        urgency: urgency || undefined,
        vehicleCategory: vehicleType || undefined,
        serviceScope: serviceScope || undefined,
        mileage: mileage ? parseInt(mileage) : undefined,
        preferredDate: preferredDate || undefined,
        preferredTime: preferredTime || undefined,
      });

      const providerName =
        selectedProvider?.businessName || preSelectedProviderName;
      const successMessage = providerName
        ? `${createRequestLabels?.requestSentTo || "Request sent to"} ${providerName}. ${createRequestLabels?.providerWillRespond || "They will respond shortly."}`
        : createRequestLabels?.quotesWithin ||
          "You will receive quotes within 48 hours.";

      Alert.alert(
        createRequestLabels?.submitted || "Request Submitted!",
        successMessage,
        [{ text: t.common.ok, onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      Alert.alert(
        t.common.error,
        err?.response?.data?.message ||
          createRequestLabels?.submitRequestFailed ||
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
            {createRequestLabels?.newRequest || "New Request"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B5EA7" />
          <Text style={styles.loadingText}>
            {t.common?.loading || "Loading..."}
          </Text>
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
            {createRequestLabels?.newRequest || "New Request"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.noPaymentContainer}>
          <View style={[styles.noPaymentIcon, { backgroundColor: "#fef3c7" }]}>
            <Ionicons name="time" size={64} color="#f59e0b" />
          </View>
          <Text style={styles.noPaymentTitle}>
            {createRequestLabels?.activeServiceExists ||
              "Active Service in Progress"}
          </Text>
          <Text style={styles.noPaymentDescription}>
            {createRequestLabels?.activeServiceDesc ||
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
              {createRequestLabels?.viewActiveService || "View Active Service"}
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
          {createRequestLabels?.newRequest || "New Request"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicatorContainer}>
        {[
          { num: 1, label: createRequestLabels?.stepVehicle || "Vehicle & Service" },
          { num: 2, label: createRequestLabels?.stepDetails || "Details" },
          { num: 3, label: createRequestLabels?.stepPreferences || "Preferences" },
        ].map((step, index) => (
          <React.Fragment key={step.num}>
            {index > 0 && (
              <View style={[styles.stepLine, currentStep > index && styles.stepLineActive]} />
            )}
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  currentStep >= step.num && styles.stepCircleActive,
                  currentStep > step.num && styles.stepCircleCompleted,
                ]}
              >
                {currentStep > step.num ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      currentStep >= step.num && styles.stepNumberActive,
                    ]}
                  >
                    {step.num}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  currentStep >= step.num && styles.stepLabelActive,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ============ STEP 1: Vehicle & Service ============ */}
          {currentStep === 1 && (
          <>
          {/* Selected Provider Banner */}
          {(selectedProvider || preSelectedProviderName) && (
            <View style={styles.selectedProviderBanner}>
              <Ionicons name="star" size={20} color="#2B5EA7" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.selectedProviderLabel}>
                  {createRequestLabels?.sendingTo || "Sending request to"}
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
                  {createRequestLabels?.specialOfferApplied ||
                    "Special Offer Applied"}
                </Text>
                <Text style={styles.appliedOfferTitle}>
                  {appliedOffer.title}
                </Text>
                <Text style={styles.appliedOfferValidity}>
                  {createRequestLabels?.validUntil || "Valid until"}{" "}
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
            {createRequestLabels?.selectVehicle || "Select Vehicle"} *
          </Text>
          <View style={styles.vehiclesContainer}>
            {vehicles.length === 0 ? (
              <View style={styles.emptyVehicleCard}>
                <View style={styles.emptyVehicleIcon}>
                  <Ionicons name="car-outline" size={30} color="#2B5EA7" />
                </View>
                <Text style={styles.emptyVehicleTitle}>
                  No vehicle registered
                </Text>
                <Text style={styles.emptyVehicleText}>
                  Add your vehicle first so providers receive the correct VIN, make, model, and service details.
                </Text>
                <TouchableOpacity
                  style={styles.emptyVehicleButton}
                  onPress={() =>
                    navigation.dispatch(
                      CommonActions.navigate({
                        name: "Vehicles",
                        params: {
                          screen: "AddVehicle",
                          initial: false,
                        },
                      }),
                    )
                  }
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.emptyVehicleButtonText}>
                    {t.vehicle?.addVehicle || "Add Vehicle"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              vehicles.map((vehicle) => (
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
                  color={selectedVehicle === vehicle.id ? "#2B5EA7" : "#6b7280"}
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
                    {[vehicle.plate, vehicle.fuelType]
                      .filter(Boolean)
                      .join(" • ")}
                  </Text>
                </View>
                {selectedVehicle === vehicle.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#2B5EA7" />
                )}
              </TouchableOpacity>
              ))
            )}
          </View>

          {/* Mileage / Odometer */}
          <Text style={styles.sectionTitle}>
            {createRequestLabels?.mileage || "Current Mileage (miles)"}
          </Text>
          <TextInput
            style={styles.detailInput}
            keyboardType="number-pad"
            placeholder={createRequestLabels?.mileagePlaceholder || "e.g., 45,000"}
            value={mileage ? Number(mileage).toLocaleString(mileageNumberLocale) : ""}
            onChangeText={(text) => setMileage(text.replace(/[^0-9]/g, ''))}
          />

          {/* Service Type */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
              {createRequestLabels?.serviceType || "Service Type"} *
            </Text>
            <TouchableOpacity
              style={{ marginLeft: 6, padding: 2 }}
              onPress={() =>
                Alert.alert(
                  createRequestLabels?.serviceTypeInfoTitle || "About Service Type",
                  interpolate(
                    createRequestLabels?.serviceTypeInfoMessage ||
                      "Select the service that best describes your need. Each type opens a detail panel so you can specify exactly what's needed.\n\nFor a full vehicle diagnostic or estimate, use {{scheduleDiagnostic}} instead — a certified technician will inspect your vehicle and provide a written estimate.",
                    {
                      scheduleDiagnostic:
                        createRequestLabels?.scheduleDiagnosticAction ||
                        "Schedule Diagnostic",
                    },
                  ),
                )
              }
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#2B5EA7"
              />
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
                {service.iconLib === "mci" ? (
                  <MaterialCommunityIcons
                    name={service.icon as any}
                    size={26}
                    color={selectedService === service.id ? "#2B5EA7" : "#6b7280"}
                  />
                ) : (
                  <Ionicons
                    name={service.icon as any}
                    size={24}
                    color={selectedService === service.id ? "#2B5EA7" : "#6b7280"}
                  />
                )}
                <Text
                  style={[
                    styles.serviceLabel,
                    selectedService === service.id &&
                      styles.serviceLabelSelected,
                  ]}
                >
                  {service.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Vehicle Type */}
          {vehicleTypeLocked && vehicleType ? (
            /* Collapsed vehicle type when auto-detected */
            <View style={styles.vehicleTypeCollapsed}>
              <MaterialCommunityIcons
                name={
                  ({ car: "car-side", suv: "car-estate", truck: "car-pickup", van: "van-passenger", heavy_truck: "truck", bus: "rv-truck" } as Record<string, string>)[vehicleType] || "car"
                }
                size={22}
                color="#2B5EA7"
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                  {createRequestLabels?.vehicleTypeLabel || "Vehicle Type"}
                </Text>
                <Text style={{ fontSize: 13, color: "#2B5EA7" }}>
                  {({ car: createRequestLabels?.vtCar || "Car / Sedan", suv: createRequestLabels?.vtSuv || "SUV / Crossover", truck: createRequestLabels?.vtTruck || "Pickup Truck", van: createRequestLabels?.vtVan || "Van / Minivan", heavy_truck: createRequestLabels?.vtHeavyTruck || "Heavy Truck / Semi", bus: createRequestLabels?.vtBus || "Bus / RV" } as Record<string, string>)[vehicleType] || vehicleType}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#d1fae5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                <Ionicons name="lock-closed" size={12} color="#059669" />
                <Text style={{ fontSize: 11, color: "#059669", fontWeight: "600", marginLeft: 4 }}>
                  {createRequestLabels?.autoSelected || "Auto"}
                </Text>
              </View>
            </View>
          ) : (
          <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
              marginTop: -4,
            }}
          >
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
              {createRequestLabels?.vehicleTypeLabel || "Vehicle Type"} *
            </Text>
          </View>
          <View style={styles.servicesGrid}>
            {[
              {
                id: "car",
                label: createRequestLabels?.vtCar || "Car / Sedan",
                mciIcon: "car-side",
              },
              {
                id: "suv",
                label: createRequestLabels?.vtSuv || "SUV / Crossover",
                mciIcon: "car-estate",
              },
              {
                id: "truck",
                label: createRequestLabels?.vtTruck || "Pickup Truck",
                mciIcon: "car-pickup",
              },
              {
                id: "van",
                label: createRequestLabels?.vtVan || "Van / Minivan",
                mciIcon: "van-passenger",
              },
              {
                id: "heavy_truck",
                label: createRequestLabels?.vtHeavyTruck || "Heavy Truck / Semi",
                mciIcon: "truck",
              },
              {
                id: "bus",
                label: createRequestLabels?.vtBus || "Bus / RV",
                mciIcon: "rv-truck",
              },
            ].map((vt) => (
              <TouchableOpacity
                key={vt.id}
                style={[
                  styles.serviceCard,
                  vehicleType === vt.id && styles.serviceCardSelected,
                  vehicleTypeLocked &&
                    vehicleType !== vt.id && { opacity: 0.4 },
                ]}
                onPress={() => {
                  if (vehicleTypeLocked) {
                    Alert.alert(
                      createRequestLabels?.vehicleTypeLocked ||
                        "Vehicle Type Locked",
                      createRequestLabels?.vehicleTypeLockedMsg ||
                        "Vehicle type is automatically selected based on your vehicle. To change it, select a different vehicle.",
                    );
                    return;
                  }
                  setVehicleType(vt.id);
                }}
              >
                <MaterialCommunityIcons
                  name={vt.mciIcon as any}
                  size={26}
                  color={vehicleType === vt.id ? "#2B5EA7" : "#6b7280"}
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
          </>
          )}
          </>
          )}

          {/* ============ STEP 2: Service Details ============ */}
          {currentStep === 2 && (
          <>
          {/* ── Parts + Labor Summary Card ── */}
          {title ? (() => {
            const subOpts = SERVICE_SUB_OPTIONS[selectedService];
            const partsList: string[] = [];
            if (subOpts) {
              subOpts.sections.forEach((section: any) => {
                const selected = subOptionSelections[section.id] || [];
                selected.forEach((optId: string) => {
                  const opt = section.options.find((o: any) => o.id === optId);
                  if (opt) partsList.push(opt.label);
                });
              });
            }
            return (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fafafa' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{title}</Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                      {serviceScope === 'both'
                        ? createRequestLabels?.summaryPartsAndLabor || "Parts + Labor"
                        : createRequestLabels?.summaryLaborOnlyLine || "Labor Only (no parts needed)"}
                    </Text>
                  </View>
                </View>
                {/* Parts | Labor columns */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14 }}>
                  {/* Parts */}
                  <View style={{ flex: 1, paddingRight: 12, borderRightWidth: 1, borderRightColor: '#f1f5f9' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 8 }}>
                      {createRequestLabels?.columnPartsHeader || "PARTS"}
                    </Text>
                    {partsList.length > 0 ? partsList.map((p, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#3b82f6' }} />
                        <Text style={{ fontSize: 12, color: '#374151' }}>{p}</Text>
                      </View>
                    )) : (
                      <Text style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                        {createRequestLabels?.partsNoneSelected || "None selected"}
                      </Text>
                    )}
                  </View>
                  {/* Labor */}
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 8 }}>
                      {createRequestLabels?.columnLaborHeader || "LABOR"}
                    </Text>
                    {serviceScope === 'both' ? (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0fdf4', alignSelf: 'flex-start', marginBottom: 4 }}>
                          <Ionicons name="construct" size={11} color="#059669" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>
                            {createRequestLabels?.scopeBothIncluded || "Included"}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                          {createRequestLabels?.scopeBothHint || "Provider prices\nparts + labor"}
                        </Text>
                      </>
                    ) : (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fffbeb', alignSelf: 'flex-start', marginBottom: 4 }}>
                          <Ionicons name="construct" size={11} color="#d97706" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#d97706' }}>
                            {createRequestLabels?.scopeLaborOnlyBadge || "Labor Only"}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                          {createRequestLabels?.scopeLaborOnlyHint || "You provide parts —\nprice labor only"}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
            );
          })() : null}

          {/* Service Scope: What do you need? (Parts Only removed) */}
          <Text style={styles.sectionTitle}>
            {createRequestLabels?.serviceScopeLabel || "What do you need?"} *
          </Text>
          <View style={styles.locationContainer}>
            {[
              {
                id: "service",
                label: createRequestLabels?.serviceOnly || "Service / Labor Only",
                icon: "construct",
                desc:
                  createRequestLabels?.serviceOnlyDesc ||
                  "I already have the parts, just need installation",
              },
              {
                id: "both",
                label: createRequestLabels?.partsAndService || "Parts + Service",
                icon: "layers",
                desc:
                  createRequestLabels?.partsAndServiceDesc ||
                  "Provider supplies parts and does the work",
              },
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
                    color={serviceScope === scope.id ? "#2B5EA7" : "#6b7280"}
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
                  <Text style={styles.locationDescription}>{scope.desc}</Text>
                </View>
                {serviceScope === scope.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#2B5EA7" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Parts Store Cross-sell */}
          <TouchableOpacity
            style={styles.partsStoreCrossSell}
            onPress={() => navigation.navigate("PartsStore")}
          >
            <Ionicons name="storefront-outline" size={18} color="#7c3aed" />
            <Text style={styles.partsStoreCrossSellText}>
              {createRequestLabels?.browsePartsStore || "Need to buy parts? Browse our Parts Store"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#7c3aed" />
          </TouchableOpacity>

          {/* Service Location */}
          <Text style={styles.sectionTitle}>
            {createRequestLabels?.serviceLocation || "Service Location"} *
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
                      createRequestLabels?.mobileServiceNeedAddressTitle ||
                        "Address Required",
                      createRequestLabels?.mobileServiceNeedAddressMessage ||
                        "To request a mobile service, you need at least one registered address. Would you like to add one now?",
                      [
                        { text: t.common?.cancel || "Cancel", style: "cancel" },
                        {
                          text: t.customer?.addAddress || "Add Address",
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
                    serviceLocation === option.id &&
                      styles.locationIconSelected,
                  ]}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={24}
                    color={
                      serviceLocation === option.id ? "#2B5EA7" : "#6b7280"
                    }
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
                  <Ionicons name="checkmark-circle" size={24} color="#2B5EA7" />
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
                    {createRequestLabels?.shareMyLocation || "Share My Location"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.locationSharedCard}>
                  <View style={styles.locationSharedHeader}>
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#10b981"
                    />
                    <Text style={styles.locationSharedTitle}>
                      {createRequestLabels?.locationReady || "Location Ready"}
                    </Text>
                  </View>
                  <Text style={styles.locationSharedText}>
                    {createRequestLabels?.locationWillBeShared ||
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
                    <Ionicons name="map" size={18} color="#2B5EA7" />
                    <Text style={styles.viewOnMapText}>
                      {createRequestLabels?.viewOnMap || "View on Map"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.roadsideInfo}>
                <Ionicons name="information-circle" size={18} color="#f59e0b" />
                <Text style={styles.roadsideInfoText}>
                  {createRequestLabels?.roadsideNote ||
                    "Provider will receive your live location via Google Maps"}
                </Text>
              </View>
            </View>
          )}

          {/* Your Address — shown when mobile service is selected */}
          {serviceLocation === "mobile" && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>
                {createRequestLabels?.yourAddress || "Your Address"} *
              </Text>

              {/* GPS button */}
              <TouchableOpacity
                onPress={handleGetMobileGpsAddress}
                disabled={fetchingGpsAddress}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 10,
                  padding: 14, borderRadius: 14, marginBottom: 10,
                  backgroundColor: selectedAddressIdx === -1 && mobileGpsAddress ? "#eff6ff" : "#f8fafc",
                  borderWidth: 2,
                  borderColor: selectedAddressIdx === -1 && mobileGpsAddress ? "#2B5EA7" : "#e2e8f0",
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#dbeafe", justifyContent: "center", alignItems: "center" }}>
                  <Ionicons name={fetchingGpsAddress ? "refresh" : "navigate"} size={20} color="#2B5EA7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                    {fetchingGpsAddress
                      ? createRequestLabels?.gpsGettingLocation || "Getting location…"
                      : createRequestLabels?.gpsUseCurrentLocation || "Use Current Location (GPS)"}
                  </Text>
                  {mobileGpsAddress && selectedAddressIdx === -1 ? (
                    <Text style={{ fontSize: 12, color: "#2B5EA7", marginTop: 2 }} numberOfLines={2}>{mobileGpsAddress}</Text>
                  ) : (
                    <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {createRequestLabels?.tapDetectExactAddress || "Tap to detect your exact address"}
                    </Text>
                  )}
                </View>
                {selectedAddressIdx === -1 && mobileGpsAddress && (
                  <Ionicons name="checkmark-circle" size={22} color="#2B5EA7" />
                )}
              </TouchableOpacity>

              {/* Saved addresses */}
              {userAddresses.length > 0 && (
                <>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#9ca3af", marginBottom: 8, letterSpacing: 0.5 }}>
                    {createRequestLabels?.previouslyUsedAddresses || "PREVIOUSLY USED"}
                  </Text>
                  {userAddresses.map((addr: any, idx: number) => {
                    const line1 = addr.street || addr.address || "";
                    const line2 = [addr.city, addr.state, addr.zipCode].filter(Boolean).join(", ");
                    const isSelected = selectedAddressIdx === idx;
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setSelectedAddressIdx(idx)}
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 10,
                          padding: 14, borderRadius: 14, marginBottom: 8,
                          backgroundColor: isSelected ? "#eff6ff" : "#f8fafc",
                          borderWidth: 2, borderColor: isSelected ? "#2B5EA7" : "#e2e8f0",
                        }}
                      >
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isSelected ? "#dbeafe" : "#f1f5f9", justifyContent: "center", alignItems: "center" }}>
                          <Ionicons name={addr.isDefault ? "home" : "location"} size={20} color={isSelected ? "#2B5EA7" : "#6b7280"} />
                        </View>
                        <View style={{ flex: 1 }}>
                          {addr.label && <Text style={{ fontSize: 11, fontWeight: "700", color: isSelected ? "#2B5EA7" : "#9ca3af", marginBottom: 2 }}>{addr.label.toUpperCase()}</Text>}
                          <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }} numberOfLines={1}>{line1}</Text>
                          {line2 ? <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>{line2}</Text> : null}
                        </View>
                        {isSelected && <Ionicons name="checkmark-circle" size={22} color="#2B5EA7" />}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </View>
          )}

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {createRequestLabels?.requestTitle || "Request Title"} *
            </Text>
            <TextInput
              style={styles.input}
              placeholder={
                createRequestLabels?.titlePlaceholder ||
                "e.g., Oil change and filters"
              }
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {serviceScope === "service"
                ? createRequestLabels?.problemDescriptionLaborOnly ||
                  "Problem Description (Labor Only)"
                : createRequestLabels?.problemDescription || "Problem Description"}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={
                serviceScope === "service"
                  ? createRequestLabels?.descriptionPlaceholderLaborOnly ||
                    "Describe the service needed. Let the provider know you already have the parts and just need installation or labor."
                  : createRequestLabels?.descriptionPlaceholderProviderSupplies ||
                    "Describe the problem or service needed. The provider will source parts and complete the work."
              }
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          </>
          )}

          {/* ============ STEP 3: Preferences & Submit ============ */}
          {currentStep === 3 && (
          <>
          {/* Preferred Date & Time with ASAP option */}
          <Text style={styles.sectionTitle}>
            {createRequestLabels?.preferredDate || "Preferred Date & Time"}
          </Text>
          <TouchableOpacity
            style={[
              styles.asapToggle,
              asapDate && styles.asapToggleActive,
            ]}
            onPress={() => {
              setAsapDate(!asapDate);
              if (!asapDate) {
                setPreferredDate("ASAP");
                setPreferredTime("");
              } else {
                setPreferredDate("");
              }
            }}
          >
            <Ionicons
              name={asapDate ? "flash" : "flash-outline"}
              size={20}
              color={asapDate ? "#fff" : "#f59e0b"}
            />
            <Text style={[styles.asapToggleText, asapDate && styles.asapToggleTextActive]}>
              {createRequestLabels?.asapOption || "As Soon As Possible (ASAP)"}
            </Text>
            {asapDate && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
          </TouchableOpacity>
          {!asapDate && (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16, marginTop: 8 }}>
              <TextInput
                style={[styles.detailInput, { flex: 1, marginBottom: 0 }]}
                placeholder={
                  createRequestLabels?.preferredDatePlaceholder || "MM/DD/YYYY"
                }
                value={preferredDate}
                onChangeText={(text) => {
                  // Strip non-digits
                  const digits = text.replace(/\D/g, '');
                  // Auto-insert slashes: MM/DD/YYYY
                  let formatted = '';
                  for (let i = 0; i < digits.length && i < 8; i++) {
                    if (i === 2 || i === 4) formatted += '/';
                    formatted += digits[i];
                  }
                  setPreferredDate(formatted);
                }}
                keyboardType="number-pad"
                maxLength={10}
              />
              <TextInput
                style={[styles.detailInput, { width: 100, marginBottom: 0 }]}
                placeholder={
                  createRequestLabels?.preferredTimePlaceholder || "HH:MM"
                }
                value={preferredTime}
                onChangeText={(text) => {
                  // Strip non-digits
                  const digits = text.replace(/\D/g, '');
                  // Auto-insert colon: HH:MM
                  let formatted = '';
                  for (let i = 0; i < digits.length && i < 4; i++) {
                    if (i === 2) formatted += ':';
                    formatted += digits[i];
                  }
                  setPreferredTime(formatted);
                }}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
          )}

          {/* Customer Responsibility Disclaimer */}
          <View style={styles.disclaimerCard}>
            <View style={styles.disclaimerHeader}>
              <Ionicons name="information-circle" size={22} color="#f59e0b" />
              <Text style={styles.disclaimerTitle}>
                {createRequestLabels?.importantNotice || "Important Notice"}
              </Text>
            </View>
            <Text style={styles.disclaimerText}>
              {createRequestLabels?.responsibilityText ||
                "The service type you select is your best assessment. Our verified providers will perform a professional inspection to confirm the actual issue before starting any work. For obvious services (oil change, tire replacement, etc.), work will proceed as requested."}
            </Text>
            <Text style={styles.disclaimerText2}>
              {createRequestLabels?.estimateProtection ||
                "No work will exceed the approved written estimate without your consent."}
            </Text>
            <TouchableOpacity
              style={styles.disclaimerCheckbox}
              onPress={() => setResponsibilityAccepted(!responsibilityAccepted)}
            >
              <Ionicons
                name={responsibilityAccepted ? "checkbox" : "square-outline"}
                size={24}
                color={responsibilityAccepted ? "#2B5EA7" : "#9ca3af"}
              />
              <Text style={styles.disclaimerCheckboxText}>
                {createRequestLabels?.iUnderstand ||
                  "I understand and agree to proceed"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Urgency */}
          <Text style={styles.sectionTitle}>
            {createRequestLabels?.urgency || "Urgency"}
          </Text>
          <View style={styles.urgencyContainerVertical}>
            {[
              {
                id: "low",
                label: createRequestLabels?.low || "Low",
                desc: createRequestLabels?.lowDesc || "Within 1-2 weeks",
                color: "#10b981",
                icon: "time-outline" as const,
              },
              {
                id: "normal",
                label: createRequestLabels?.normal || "Normal",
                desc: createRequestLabels?.normalDesc || "Within 3-5 days",
                color: "#3b82f6",
                icon: "calendar-outline" as const,
              },
              {
                id: "high",
                label: createRequestLabels?.high || "High",
                desc: createRequestLabels?.highDesc || "Within 24-48 hours",
                color: "#f59e0b",
                icon: "alert-circle-outline" as const,
              },
              {
                id: "urgent",
                label: createRequestLabels?.urgent || "Urgent",
                desc: createRequestLabels?.urgentDesc || "Immediate / Emergency",
                color: "#ef4444",
                icon: "flash" as const,
              },
            ].map((u) => (
              <TouchableOpacity
                key={u.id}
                style={[
                  styles.urgencyCardBtn,
                  urgency === u.id && { borderColor: u.color, backgroundColor: `${u.color}10` },
                ]}
                onPress={() => setUrgency(u.id)}
              >
                <View style={[styles.urgencyIconCircle, { backgroundColor: urgency === u.id ? u.color : '#f3f4f6' }]}>
                  <Ionicons name={u.icon} size={18} color={urgency === u.id ? '#fff' : '#6b7280'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.urgencyCardLabel, urgency === u.id && { color: u.color }]}>{u.label}</Text>
                  <Text style={styles.urgencyCardDesc}>{u.desc}</Text>
                </View>
                {urgency === u.id && <Ionicons name="checkmark-circle" size={22} color={u.color} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#2B5EA7" />
            <Text style={styles.infoText}>
              {createRequestLabels?.infoText ||
                "You will receive quotes from verified service providers within 48 hours."}
            </Text>
          </View>

          {/* Favorite Provider Selection */}
          <Text style={styles.sectionTitle}>
            {createRequestLabels?.sendToFavorite || "Send to Favorite Provider"}
          </Text>
          <TouchableOpacity
            style={styles.favoriteProviderSelector}
            onPress={() => setShowProviderModal(true)}
          >
            {selectedProvider ? (
              <View style={styles.selectedProviderRow}>
                <View style={styles.providerAvatarSmall}>
                  <Ionicons name="business" size={20} color="#2B5EA7" />
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
                  {createRequestLabels?.selectFavoriteProvider ||
                    "Select a favorite provider (optional)"}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.favoriteHint}>
            {createRequestLabels?.favoriteHint ||
              "Request will be sent directly to this provider instead of all providers"}
          </Text>

          {/* Payment Method in Step 3 */}
          {hasPaymentMethod && defaultPaymentMethod && (
            <View style={[styles.paymentMethodCard, { marginTop: 8 }]}>
              <View style={styles.paymentMethodInfo}>
                <Ionicons name="card" size={20} color="#2B5EA7" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.paymentMethodLabel}>
                    {createRequestLabels?.paymentMethod || "Payment Method"}
                  </Text>
                  <Text style={styles.paymentMethodValue}>
                    {defaultPaymentMethod?.brand} •••• {defaultPaymentMethod?.lastFour}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    navigation.dispatch(
                      CommonActions.navigate({
                        name: "Profile",
                        params: { screen: "PaymentMethods", initial: false, params: { fromCreateRequest: true } },
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
                {createRequestLabels?.paymentNote || "Payment will be held when you accept a quote and charged upon service completion."}
              </Text>
            </View>
          )}
          {!hasPaymentMethod && (
            <TouchableOpacity
              style={styles.addPaymentInlineBtn}
              onPress={() =>
                navigation.dispatch(
                  CommonActions.navigate({
                    name: "Profile",
                    params: { screen: "PaymentMethods", initial: false, params: { fromCreateRequest: true } },
                  }),
                )
              }
            >
              <Ionicons name="card-outline" size={20} color="#f59e0b" />
              <Text style={styles.addPaymentInlineText}>
                {createRequestLabels?.addPaymentMethod || "Add a payment method (recommended)"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
            </TouchableOpacity>
          )}
          </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Wizard Navigation Footer */}
      <View style={styles.footer}>
        <View style={styles.wizardFooter}>
          {currentStep > 1 ? (
            <TouchableOpacity
              style={styles.wizardBackBtn}
              onPress={handlePrevStep}
            >
              <Ionicons name="arrow-back" size={20} color="#2B5EA7" />
              <Text style={styles.wizardBackText}>
                {t.common?.back || "Back"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {currentStep < 3 ? (
            <TouchableOpacity
              style={styles.wizardNextBtn}
              onPress={handleNextStep}
            >
              <Text style={styles.wizardNextText}>
                {t.common?.next || "Next"}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, { flex: 2 }, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.submitText}>
                    {createRequestLabels?.requestQuotes || "Request Quotes"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
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
                {createRequestLabels?.selectFavoriteTitle ||
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
                  {createRequestLabels?.noFavorites || "No favorite providers yet"}
                </Text>
                <Text style={styles.emptyFavoritesSubtext}>
                  {createRequestLabels?.addFavoritesHint ||
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
                      <Ionicons name="business" size={24} color="#2B5EA7" />
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
                        color="#2B5EA7"
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
              <Ionicons name="globe-outline" size={20} color="#2B5EA7" />
              <Text style={styles.sendToAllText}>
                {createRequestLabels?.sendToAll || "Send to all providers"}
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
                {SERVICE_SUB_OPTIONS[pendingServiceId]?.title ||
                  createRequestLabels?.otherOptions ||
                  "Service Details"}
              </Text>
              <TouchableOpacity onPress={() => setShowSubOptionsModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 400 }}
              showsVerticalScrollIndicator={false}
            >
              {SERVICE_SUB_OPTIONS[pendingServiceId]?.sections.map(
                (section) => (
                  <View key={section.id} style={styles.subOptionsSection}>
                    <Text style={styles.subOptionsSectionLabel}>
                      {section.label}{" "}
                      {section.type === "single"
                        ? createRequestLabels?.subOptionSelectOneSuffix ||
                          "(select one)"
                        : createRequestLabels?.subOptionSelectAllSuffix ||
                          "(select all that apply)"}
                    </Text>
                    {section.options.map((option) => {
                      const isSelected = (
                        subOptionSelections[section.id] || []
                      ).includes(option.id);
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.subOptionItem,
                            isSelected && styles.subOptionItemSelected,
                          ]}
                          onPress={() =>
                            handleSubOptionToggle(
                              section.id,
                              option.id,
                              section.type,
                            )
                          }
                        >
                          <View
                            style={[
                              styles.subOptionIcon,
                              isSelected && styles.subOptionIconSelected,
                            ]}
                          >
                            <Ionicons
                              name={(option.icon || "ellipse") as any}
                              size={20}
                              color={isSelected ? "#fff" : "#6b7280"}
                            />
                          </View>
                          <Text
                            style={[
                              styles.subOptionLabel,
                              isSelected && styles.subOptionLabelSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                          <Ionicons
                            name={
                              section.type === "single"
                                ? isSelected
                                  ? "radio-button-on"
                                  : "radio-button-off"
                                : isSelected
                                  ? "checkbox"
                                  : "square-outline"
                            }
                            size={22}
                            color={isSelected ? "#2B5EA7" : "#d1d5db"}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ),
              )}
              <Text style={styles.subOptionsHint}>
                {createRequestLabels?.subOptionsHint ||
                  "These details help providers give you a more accurate quote."}
              </Text>
            </ScrollView>

            <View style={styles.subOptionsFooter}>
              <TouchableOpacity
                style={styles.subOptionsSkipBtn}
                onPress={() => setShowSubOptionsModal(false)}
              >
                <Text style={styles.subOptionsSkipText}>
                  {createRequestLabels?.skipDetails || "Skip"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.subOptionsConfirmBtn}
                onPress={confirmSubOptions}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.subOptionsConfirmText}>
                  {createRequestLabels?.confirmDetails || "Confirm"}
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
  // Step Indicator
  stepIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  stepItem: { alignItems: "center", flex: 1 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  stepCircleActive: { backgroundColor: "#2B5EA7" },
  stepCircleCompleted: { backgroundColor: "#10b981" },
  stepNumber: { fontSize: 13, fontWeight: "700", color: "#9ca3af" },
  stepNumberActive: { color: "#fff" },
  stepLabel: { fontSize: 11, color: "#9ca3af", textAlign: "center" },
  stepLabelActive: { color: "#2B5EA7", fontWeight: "600" },
  stepLine: {
    height: 2,
    flex: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: -8,
    marginBottom: 18,
  },
  stepLineActive: { backgroundColor: "#10b981" },
  // Wizard footer
  wizardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wizardBackBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2B5EA7",
    backgroundColor: "#fff",
  },
  wizardBackText: { fontSize: 16, fontWeight: "600", color: "#2B5EA7" },
  wizardNextBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#2B5EA7",
  },
  wizardNextText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  // ASAP Toggle
  asapToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    marginBottom: 4,
  },
  asapToggleActive: {
    borderColor: "#f59e0b",
    backgroundColor: "#f59e0b",
  },
  asapToggleText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#92400e" },
  asapToggleTextActive: { color: "#fff" },
  // Urgency vertical cards
  urgencyContainerVertical: { marginBottom: 20, gap: 8 },
  urgencyCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  urgencyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  urgencyCardLabel: { fontSize: 15, fontWeight: "600", color: "#374151" },
  urgencyCardDesc: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  // Parts Store cross-sell
  partsStoreCrossSell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#f5f3ff",
    borderWidth: 1,
    borderColor: "#ddd6fe",
    marginBottom: 20,
  },
  partsStoreCrossSellText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#7c3aed" },
  // Add payment inline
  addPaymentInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    marginTop: 8,
  },
  addPaymentInlineText: { flex: 1, fontSize: 14, fontWeight: "500", color: "#92400e" },
  // Vehicle type collapsed
  vehicleTypeCollapsed: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  // Detail input for mileage etc.
  detailInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
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
    borderColor: "#2B5EA7",
  },
  selectedProviderLabel: { fontSize: 12, color: "#6b7280" },
  selectedProviderName: { fontSize: 16, fontWeight: "600", color: "#2B5EA7" },
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
  vehicleCardSelected: { borderColor: "#2B5EA7", backgroundColor: "#eff6ff" },
  vehicleName: { fontSize: 16, fontWeight: "500", color: "#374151" },
  vehicleNameSelected: { color: "#2B5EA7" },
  vehiclePlate: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  emptyVehicleCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 18,
  },
  emptyVehicleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  emptyVehicleTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyVehicleText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 14,
  },
  emptyVehicleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2B5EA7",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyVehicleButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 0,
  },
  serviceCard: {
    width: "31%",
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  serviceCardSelected: { borderColor: "#2B5EA7", backgroundColor: "#eff6ff" },
  serviceLabel: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },
  serviceLabelSelected: { color: "#2B5EA7", fontWeight: "500" },
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
  locationCardSelected: { borderColor: "#2B5EA7", backgroundColor: "#eff6ff" },
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
  locationLabelSelected: { color: "#2B5EA7" },
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
  viewOnMapText: { fontSize: 14, fontWeight: "600", color: "#2B5EA7" },
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
  infoText: { flex: 1, fontSize: 14, color: "#2B5EA7", lineHeight: 20 },
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
    backgroundColor: "#2B5EA7",
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
    borderColor: "#2B5EA7",
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
  sendToAllText: { fontSize: 15, fontWeight: "600", color: "#2B5EA7" },
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
    backgroundColor: "#2B5EA7",
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
  changePaymentText: { fontSize: 14, fontWeight: "600", color: "#2B5EA7" },
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
    borderColor: "#2B5EA7",
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
    backgroundColor: "#2B5EA7",
  },
  subOptionLabel: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
  },
  subOptionLabelSelected: {
    color: "#2B5EA7",
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
    backgroundColor: "#2B5EA7",
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
