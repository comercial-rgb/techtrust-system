import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../services/api';
import {
  Car, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Check, X,
  Droplets, Settings, Zap, Snowflake, ArrowUpDown, GitBranch, Wind, Thermometer,
  Gauge, Navigation, Cog, Wrench, ClipboardList, CalendarCheck, Sparkles,
  Battery, Truck, Disc, RotateCcw, MapPin, Filter, Layers, HelpCircle,
  Search, AlertTriangle, Volume2, RefreshCw, Flame, Building, Home,
  Link2, Bell, Square, Circle, ArrowUp, ArrowDown, Lightbulb, ChevronDown,
} from 'lucide-react';

import { logApiError } from "../../utils/logger";
type IconType = React.FC<{ className?: string }>;

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
}

interface SubOption {
  id: string;
  label: string;
  Icon: IconType;
}

interface SubSection {
  id: string;
  label: string;
  type: 'single' | 'multi';
  options: SubOption[];
}

interface ServiceSubConfig {
  title: string;
  sections: SubSection[];
}

export default function NovaSolicitacaoPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { translate: t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState('');

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'>('MEDIUM');
  const [preferredDate, setPreferredDate] = useState('');
  const [serviceLocationType, setServiceLocationType] = useState<'IN_SHOP' | 'MOBILE'>('IN_SHOP');
  const [customerAddress, setCustomerAddress] = useState('');
  const [serviceLatitude, setServiceLatitude] = useState<number | undefined>();
  const [serviceLongitude, setServiceLongitude] = useState<number | undefined>();
  const [gettingLocation, setGettingLocation] = useState(false);

  const [showSubOptionsModal, setShowSubOptionsModal] = useState(false);
  const [pendingServiceId, setPendingServiceId] = useState('');
  const [subOptionSelections, setSubOptionSelections] = useState<Record<string, string[]>>({});
  const [serviceScope, setServiceScope] = useState<'service' | 'both'>('both');

  const SERVICE_TYPES = [
    { value: 'oil',           Icon: Droplets,     bg: 'bg-amber-100',   color: 'text-amber-600' },
    { value: 'brake',         Icon: Disc,          bg: 'bg-red-100',     color: 'text-red-600' },
    { value: 'tire',          Icon: RotateCcw,     bg: 'bg-blue-100',    color: 'text-blue-600' },
    { value: 'engine',        Icon: Cog,           bg: 'bg-orange-100',  color: 'text-orange-600' },
    { value: 'electric',      Icon: Zap,           bg: 'bg-yellow-100',  color: 'text-yellow-600' },
    { value: 'ac',            Icon: Snowflake,     bg: 'bg-cyan-100',    color: 'text-cyan-600' },
    { value: 'suspension',    Icon: ArrowUpDown,   bg: 'bg-indigo-100',  color: 'text-indigo-600' },
    { value: 'transmission',  Icon: GitBranch,     bg: 'bg-purple-100',  color: 'text-purple-600' },
    { value: 'air_filter',    Icon: Wind,          bg: 'bg-sky-100',     color: 'text-sky-500' },
    { value: 'belts_hoses',   Icon: Link2,         bg: 'bg-slate-100',   color: 'text-slate-600' },
    { value: 'cooling',       Icon: Thermometer,   bg: 'bg-teal-100',    color: 'text-teal-600' },
    { value: 'fuel_system',   Icon: Gauge,         bg: 'bg-green-100',   color: 'text-green-600' },
    { value: 'steering',      Icon: Navigation,    bg: 'bg-violet-100',  color: 'text-violet-600' },
    { value: 'exhaust',       Icon: Wind,          bg: 'bg-gray-100',    color: 'text-gray-500' },
    { value: 'drivetrain',    Icon: Settings,      bg: 'bg-zinc-100',    color: 'text-zinc-600' },
    { value: 'fluids',        Icon: Droplets,      bg: 'bg-blue-50',     color: 'text-blue-500' },
    { value: 'general_repair',Icon: Wrench,        bg: 'bg-gray-100',    color: 'text-gray-600' },
    { value: 'inspection',    Icon: ClipboardList, bg: 'bg-emerald-100', color: 'text-emerald-600' },
    { value: 'maintenance',   Icon: CalendarCheck, bg: 'bg-green-100',   color: 'text-green-700' },
    { value: 'detailing',     Icon: Sparkles,      bg: 'bg-pink-100',    color: 'text-pink-600' },
    { value: 'battery',       Icon: Battery,       bg: 'bg-yellow-100',  color: 'text-yellow-700' },
    { value: 'towing',        Icon: Truck,         bg: 'bg-red-100',     color: 'text-red-700' },
  ].map((s) => ({ ...s, label: t(`client.requests.serviceTypes.${s.value}`) || s.value }));

  const SERVICE_SUB_OPTIONS: Record<string, ServiceSubConfig> = {
    oil: {
      title: 'Oil Change Details',
      sections: [
        {
          id: 'oilType', label: 'Oil Type', type: 'single',
          options: [
            { id: 'motor',        label: 'Motor Oil (Engine)',              Icon: Settings },
            { id: 'transmission', label: 'Transmission Fluid',              Icon: GitBranch },
            { id: 'both',         label: 'Both (Motor + Transmission)',      Icon: Layers },
          ],
        },
        {
          id: 'filters', label: 'Filters to Replace', type: 'multi',
          options: [
            { id: 'oil_filter',   label: 'Oil Filter',        Icon: Filter },
            { id: 'air_filter',   label: 'Air Filter',         Icon: Wind },
            { id: 'cabin_filter', label: 'Cabin Air Filter',   Icon: Car },
            { id: 'fuel_filter',  label: 'Fuel Filter',        Icon: Droplets },
          ],
        },
        {
          id: 'oilGrade', label: 'Oil Grade (if known)', type: 'single',
          options: [
            { id: 'conventional',    label: 'Conventional',                    Icon: Droplets },
            { id: 'synthetic_blend', label: 'Synthetic Blend',                 Icon: Layers },
            { id: 'full_synthetic',  label: 'Full Synthetic',                  Icon: Sparkles },
            { id: 'high_mileage',    label: 'High Mileage',                    Icon: Gauge },
            { id: 'not_sure',        label: 'Not Sure / Let provider decide',  Icon: HelpCircle },
          ],
        },
      ],
    },
    brake: {
      title: 'Brake Service Details',
      sections: [
        {
          id: 'brakeLocation', label: 'Which Brakes?', type: 'single',
          options: [
            { id: 'front',    label: 'Front Brakes',                 Icon: ArrowUp },
            { id: 'rear',     label: 'Rear Brakes',                  Icon: ArrowDown },
            { id: 'all',      label: 'All Brakes (Front + Rear)',     Icon: ArrowUpDown },
            { id: 'not_sure', label: 'Not Sure / Need Inspection',   Icon: HelpCircle },
          ],
        },
        {
          id: 'brakeService', label: 'Service Needed', type: 'multi',
          options: [
            { id: 'pads',    label: 'Brake Pads',          Icon: Square },
            { id: 'rotors',  label: 'Rotors / Discs',      Icon: Circle },
            { id: 'fluid',   label: 'Brake Fluid Flush',   Icon: Droplets },
            { id: 'calipers',label: 'Calipers',            Icon: Wrench },
            { id: 'lines',   label: 'Brake Lines / Hoses', Icon: Link2 },
            { id: 'abs',     label: 'ABS System',          Icon: AlertTriangle },
          ],
        },
        {
          id: 'brakeSymptoms', label: 'Symptoms (optional)', type: 'multi',
          options: [
            { id: 'squeaking', label: 'Squeaking / Squealing',      Icon: Volume2 },
            { id: 'grinding',  label: 'Grinding Noise',             Icon: AlertCircle },
            { id: 'vibration', label: 'Vibration When Braking',     Icon: Zap },
            { id: 'pulling',   label: 'Pulling to One Side',        Icon: ChevronRight },
            { id: 'soft_pedal',label: 'Soft / Spongy Pedal',       Icon: ArrowDown },
          ],
        },
      ],
    },
    tire: {
      title: 'Tire Service Details',
      sections: [
        {
          id: 'tireService', label: 'Service Needed', type: 'multi',
          options: [
            { id: 'rotation',    label: 'Tire Rotation',              Icon: RefreshCw },
            { id: 'balance',     label: 'Balancing',                  Icon: Layers },
            { id: 'alignment',   label: 'Alignment',                  Icon: Navigation },
            { id: 'replacement', label: 'Tire Replacement',           Icon: RotateCcw },
            { id: 'repair',      label: 'Flat Tire / Puncture Repair',Icon: Wrench },
            { id: 'tpms',        label: 'TPMS Sensor',               Icon: Gauge },
          ],
        },
        {
          id: 'tireCount', label: 'How Many Tires?', type: 'single',
          options: [
            { id: '1',     label: '1 Tire',       Icon: Circle },
            { id: '2',     label: '2 Tires',      Icon: Layers },
            { id: '4',     label: '4 (Full Set)', Icon: RefreshCw },
            { id: 'spare', label: 'Spare Tire',   Icon: HelpCircle },
          ],
        },
      ],
    },
    engine: {
      title: 'Engine Service Details',
      sections: [
        {
          id: 'engineService', label: 'Service Needed', type: 'multi',
          options: [
            { id: 'diagnostic',  label: 'Engine Diagnostic / Check Engine Light', Icon: Search },
            { id: 'tune_up',     label: 'Tune-Up',                               Icon: Settings },
            { id: 'timing_belt', label: 'Timing Belt / Chain',                   Icon: RefreshCw },
            { id: 'head_gasket', label: 'Head Gasket',                           Icon: Layers },
            { id: 'spark_plugs', label: 'Spark Plugs',                           Icon: Zap },
            { id: 'overheating', label: 'Overheating Issue',                     Icon: Thermometer },
            { id: 'motor_mount', label: 'Motor Mounts',                          Icon: Wrench },
          ],
        },
        {
          id: 'engineSymptoms', label: 'Symptoms (optional)', type: 'multi',
          options: [
            { id: 'check_engine', label: 'Check Engine Light On',         Icon: AlertTriangle },
            { id: 'rough_idle',   label: 'Rough Idle / Vibration',        Icon: Zap },
            { id: 'loss_power',   label: 'Loss of Power',                 Icon: ArrowDown },
            { id: 'stalling',     label: "Stalling / Won't Start",        Icon: AlertCircle },
            { id: 'smoke',        label: 'Smoke from Exhaust',            Icon: Wind },
            { id: 'oil_leak',     label: 'Oil Leak',                      Icon: Droplets },
          ],
        },
      ],
    },
    electric: {
      title: 'Electrical Service Details',
      sections: [
        {
          id: 'electricalService', label: 'Service Needed', type: 'multi',
          options: [
            { id: 'alternator',     label: 'Alternator',                      Icon: Zap },
            { id: 'starter',        label: 'Starter Motor',                   Icon: Settings },
            { id: 'wiring',         label: 'Wiring / Short Circuit',          Icon: Link2 },
            { id: 'fuses',          label: 'Fuses / Relay',                   Icon: Square },
            { id: 'lights',         label: 'Lights (Headlights / Tail / Interior)', Icon: Lightbulb },
            { id: 'power_windows',  label: 'Power Windows / Locks',           Icon: Layers },
            { id: 'sensors',        label: 'Sensors (O2, MAF, MAP, etc.)',    Icon: Search },
          ],
        },
        {
          id: 'electricalSymptoms', label: 'Symptoms (optional)', type: 'multi',
          options: [
            { id: 'no_start',      label: "Car Won't Start",              Icon: AlertCircle },
            { id: 'dim_lights',    label: 'Dim or Flickering Lights',     Icon: Lightbulb },
            { id: 'dead_battery',  label: 'Battery Keeps Dying',          Icon: Battery },
            { id: 'burning_smell', label: 'Burning Smell',                Icon: Flame },
          ],
        },
      ],
    },
    ac: {
      title: 'A/C & Heating Details',
      sections: [
        {
          id: 'acService', label: 'Service Needed', type: 'multi',
          options: [
            { id: 'recharge',     label: 'A/C Recharge (Freon / R-134a)',   Icon: Snowflake },
            { id: 'diagnostic',   label: 'A/C Diagnostic',                   Icon: Search },
            { id: 'compressor',   label: 'Compressor Repair / Replace',      Icon: Settings },
            { id: 'cabin_filter', label: 'Cabin Air Filter',                 Icon: Wind },
            { id: 'heater_core',  label: 'Heater Core',                      Icon: Flame },
            { id: 'blower_motor', label: 'Blower Motor',                     Icon: RefreshCw },
          ],
        },
        {
          id: 'acSymptoms', label: "What's happening?", type: 'multi',
          options: [
            { id: 'no_cold',   label: 'No Cold Air',           Icon: Thermometer },
            { id: 'no_heat',   label: 'No Heat',               Icon: Snowflake },
            { id: 'weak_flow', label: 'Weak Airflow',          Icon: Wind },
            { id: 'bad_smell', label: 'Bad Smell from Vents',  Icon: AlertCircle },
            { id: 'noise_ac',  label: "Noise When A/C is On", Icon: Volume2 },
          ],
        },
      ],
    },
    transmission: {
      title: 'Transmission Service Details',
      sections: [
        {
          id: 'transType', label: 'Transmission Type', type: 'single',
          options: [
            { id: 'automatic', label: 'Automatic',                   Icon: Settings },
            { id: 'manual',    label: 'Manual / Stick Shift',        Icon: Wrench },
            { id: 'cvt',       label: 'CVT (Continuously Variable)', Icon: RefreshCw },
            { id: 'not_sure',  label: 'Not Sure',                    Icon: HelpCircle },
          ],
        },
        {
          id: 'transService', label: 'Service Needed', type: 'multi',
          options: [
            { id: 'fluid_change', label: 'Transmission Fluid Change',      Icon: Droplets },
            { id: 'flush',        label: 'Transmission Flush',              Icon: RefreshCw },
            { id: 'diagnostic',   label: 'Diagnostic / Inspection',         Icon: Search },
            { id: 'rebuild',      label: 'Rebuild / Overhaul',              Icon: Wrench },
            { id: 'replace',      label: 'Replacement',                     Icon: GitBranch },
            { id: 'clutch',       label: 'Clutch Repair / Replace (Manual)',Icon: Settings },
          ],
        },
        {
          id: 'transSymptoms', label: 'Symptoms (optional)', type: 'multi',
          options: [
            { id: 'slipping',   label: 'Slipping Gears',              Icon: AlertCircle },
            { id: 'hard_shift', label: 'Hard / Delayed Shifting',     Icon: ChevronRight },
            { id: 'grinding',   label: 'Grinding Noise',              Icon: Volume2 },
            { id: 'leak',       label: 'Fluid Leak (Red / Brown)',    Icon: Droplets },
            { id: 'no_move',    label: "Won't Move / Engage",         Icon: AlertTriangle },
          ],
        },
      ],
    },
    inspection: {
      title: 'Inspection & Diagnostic Details',
      sections: [
        {
          id: 'inspectionType', label: 'Type of Inspection', type: 'single',
          options: [
            { id: 'general_diagnostic', label: 'General Diagnostic (Warning Lights)',     Icon: Search },
            { id: 'pre_purchase',       label: 'Pre-Purchase Inspection (Used Car)',       Icon: Car },
            { id: 'state_inspection',   label: 'State Safety Inspection',                  Icon: ClipboardList },
            { id: 'emissions',          label: 'Emissions Test',                            Icon: Wind },
            { id: 'multi_point',        label: 'Multi-Point / Full Vehicle Inspection',    Icon: CheckCircle },
            { id: 'seasonal',           label: 'Seasonal Check-Up (Winter / Summer Prep)', Icon: CalendarCheck },
          ],
        },
        {
          id: 'diagnosticFocus', label: 'What needs attention? (select all)', type: 'multi',
          options: [
            { id: 'engine',      label: 'Engine / Check Engine Light',  Icon: Cog },
            { id: 'brakes',      label: 'Brakes / Noise / Vibration',   Icon: Disc },
            { id: 'suspension',  label: 'Suspension / Steering',         Icon: ArrowUpDown },
            { id: 'electrical',  label: 'Electrical / Battery',          Icon: Zap },
            { id: 'transmission',label: 'Transmission / Shifting',       Icon: GitBranch },
            { id: 'tires',       label: 'Tires / Alignment',             Icon: RotateCcw },
            { id: 'ac',          label: 'A/C / Heating',                 Icon: Snowflake },
            { id: 'leaks',       label: 'Fluid Leaks',                   Icon: Droplets },
          ],
        },
      ],
    },
  };

  const URGENCY_OPTIONS = [
    { value: 'LOW',       labelKey: 'client.requests.urgencyLow',       descKey: 'client.requests.urgencyLowDesc',       dot: 'bg-green-400',  ring: 'ring-green-200',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300' },
    { value: 'MEDIUM',    labelKey: 'client.requests.urgencyMedium',    descKey: 'client.requests.urgencyMediumDesc',    dot: 'bg-yellow-400', ring: 'ring-yellow-200', text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-300' },
    { value: 'HIGH',      labelKey: 'client.requests.urgencyHigh',      descKey: 'client.requests.urgencyHighDesc',      dot: 'bg-orange-400', ring: 'ring-orange-200', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
    { value: 'EMERGENCY', labelKey: 'client.requests.urgencyEmergency', descKey: 'client.requests.urgencyEmergencyDesc', dot: 'bg-red-500',    ring: 'ring-red-200',    text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300' },
  ];

  const STEPS = [
    { num: 1, label: t('client.requests.stepVehicle') || 'Vehicle',  Icon: Car },
    { num: 2, label: t('client.requests.stepService') || 'Service',  Icon: Wrench },
    { num: 3, label: t('client.requests.stepDetails') || 'Details',  Icon: ClipboardList },
    { num: 4, label: t('client.requests.stepConfirm') || 'Confirm',  Icon: CheckCircle },
  ];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) loadVehicles();
  }, [isAuthenticated]);

  async function loadVehicles() {
    try {
      const vehicleIdFromQuery = router.query.vehicleId as string | undefined;
      const [vehicleRes, profileRes] = await Promise.all([
        api.getVehicles(),
        api.getProfile().catch(() => null),
      ]);
      if (vehicleRes.data) {
        setVehicles(vehicleRes.data);
        if (vehicleIdFromQuery) {
          setSelectedVehicle(vehicleIdFromQuery);
        } else if (vehicleRes.data.length === 1) {
          setSelectedVehicle(vehicleRes.data[0].id);
        }
      }
      if (profileRes?.data) {
        const profile = (profileRes.data as any)?.user || profileRes.data;
        const addresses = profile?.addressesJson;
        const defaultAddr = Array.isArray(addresses)
          ? (addresses.find((a: any) => a.isDefault) || addresses[0])
          : null;
        if (defaultAddr) {
          const addrStr = [defaultAddr.street, defaultAddr.city, defaultAddr.state, defaultAddr.zipCode]
            .filter(Boolean).join(', ');
          setCustomerAddress(addrStr);
          if (defaultAddr.latitude && defaultAddr.longitude) {
            setServiceLatitude(defaultAddr.latitude);
            setServiceLongitude(defaultAddr.longitude);
          }
        }
      }
    } catch (err) {
      logApiError('Error loading vehicles:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleServiceSelect(value: string) {
    const sub = SERVICE_SUB_OPTIONS[value];
    if (sub) {
      setPendingServiceId(value);
      setSubOptionSelections({});
      setShowSubOptionsModal(true);
    } else {
      setServiceType(value);
      const label = SERVICE_TYPES.find(s => s.value === value)?.label || value;
      if (!title) setTitle(label);
    }
  }

  function toggleSubOption(sectionId: string, optionId: string, type: 'single' | 'multi') {
    setSubOptionSelections(prev => {
      const current = prev[sectionId] || [];
      if (type === 'single') {
        return { ...prev, [sectionId]: current.includes(optionId) ? [] : [optionId] };
      }
      return {
        ...prev,
        [sectionId]: current.includes(optionId)
          ? current.filter(id => id !== optionId)
          : [...current, optionId],
      };
    });
  }

  function confirmSubOptions() {
    const serviceLabel = SERVICE_TYPES.find(s => s.value === pendingServiceId)?.label || pendingServiceId;
    setServiceType(pendingServiceId);
    setTitle(serviceLabel);
    setShowSubOptionsModal(false);
    setPendingServiceId('');
  }

  function skipSubOptions() {
    const label = SERVICE_TYPES.find(s => s.value === pendingServiceId)?.label || pendingServiceId;
    setServiceType(pendingServiceId);
    if (!title) setTitle(label);
    setShowSubOptionsModal(false);
    setPendingServiceId('');
  }

  function getSubOptionsBySections() {
    const sub = SERVICE_SUB_OPTIONS[serviceType];
    if (!sub) return [];
    return sub.sections
      .map(section => ({
        label: section.label,
        items: (subOptionSelections[section.id] || [])
          .map(selId => section.options.find(o => o.id === selId)?.label)
          .filter(Boolean) as string[],
      }))
      .filter(s => s.items.length > 0);
  }

  function nextStep() {
    if (step === 1 && !selectedVehicle) { setError(t('client.requests.errorVehicle')); return; }
    if (step === 2 && !serviceType) { setError(t('client.requests.errorService')); return; }
    if (step === 3 && !title) { setError(t('client.requests.errorTitle')); return; }
    setError('');
    setStep(s => s + 1);
  }

  function prevStep() { setError(''); setStep(s => s - 1); }

  async function handleSubmit() {
    if (!selectedVehicle || !title || !serviceType) {
      setError(t('client.requests.errorRequired'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const partsList = getSubOptionsSummary();
      const scopeLabel = serviceScope === 'service' ? 'Labor Only' : 'Parts + Service';
      const meta = [
        `Scope: ${scopeLabel}`,
        partsList?.length ? `Parts: ${partsList.join(', ')}` : null,
      ].filter(Boolean).join(' | ');
      const enrichedDescription = description.trim()
        ? `${description.trim()}\n---\n${meta}`
        : meta;

      const response = await api.createServiceRequest({
        vehicleId: selectedVehicle,
        title,
        description: enrichedDescription,
        serviceType,
        urgency,
        preferredDate: preferredDate || undefined,
        serviceLocationType,
        customerAddress: serviceLocationType === 'MOBILE' && customerAddress ? customerAddress : undefined,
        serviceLatitude: serviceLocationType === 'MOBILE' && serviceLatitude ? serviceLatitude : undefined,
        serviceLongitude: serviceLocationType === 'MOBILE' && serviceLongitude ? serviceLongitude : undefined,
      });
      if (response.error) { setError(response.error); return; }
      router.push('/solicitacoes');
    } catch (err: any) {
      setError(err.message || t('client.requests.errorRequired'));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);
  const selectedServiceData = SERVICE_TYPES.find(s => s.value === serviceType);
  const selectedUrgency = URGENCY_OPTIONS.find(u => u.value === urgency);

  const getSubOptionsSummary = () => {
    const sub = SERVICE_SUB_OPTIONS[serviceType];
    if (!sub) return null;
    const labels: string[] = [];
    sub.sections.forEach(section => {
      (subOptionSelections[section.id] || []).forEach(selId => {
        const opt = section.options.find(o => o.id === selId);
        if (opt) labels.push(opt.label);
      });
    });
    return labels.length > 0 ? labels : null;
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout title={t('client.requests.title') || 'New Request'}>
        <div className="max-w-3xl mx-auto">
          <div className="h-16 skeleton rounded-xl mb-8"></div>
          <div className="h-80 skeleton rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('client.requests.title') || 'New Request'}>
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">{t('client.requests.back')}</span>
        </button>

        {/* Step progress */}
        <div className="bg-white rounded-2xl px-6 py-5 mb-6 shadow-soft">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    step > s.num
                      ? 'bg-primary-600 text-white'
                      : step === s.num
                        ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-sm font-semibold hidden sm:block transition-colors ${
                    step >= s.num ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 rounded-full transition-colors duration-300 ${
                    step > s.num ? 'bg-primary-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Vehicle */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t('client.requests.selectVehicle')}</h2>
              <p className="text-sm text-gray-500 mt-1">Select the vehicle that needs service</p>
            </div>
            {vehicles.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Car className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-gray-500 mb-6">{t('client.requests.noVehicles')}</p>
                <button onClick={() => router.push('/veiculos/novo')} className="btn btn-primary">
                  {t('client.requests.addVehicle')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    onClick={() => setSelectedVehicle(vehicle.id)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:shadow-sm ${
                      selectedVehicle === vehicle.id
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-gray-100 hover:border-primary-200 bg-gray-50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        selectedVehicle === vehicle.id ? 'bg-primary-100' : 'bg-white border border-gray-200'
                      }`}>
                        <Car className={`w-7 h-7 ${selectedVehicle === vehicle.id ? 'text-primary-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-lg">{vehicle.make} {vehicle.model}</p>
                        <p className="text-sm text-gray-500">{vehicle.year} &bull; {vehicle.plateNumber}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        selectedVehicle === vehicle.id
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedVehicle === vehicle.id && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Service Type */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t('client.requests.serviceType')}</h2>
              <p className="text-sm text-gray-500 mt-1">What service does your vehicle need?</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {SERVICE_TYPES.map((type) => {
                const TypeIcon = type.Icon;
                const isSelected = serviceType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => handleServiceSelect(type.value)}
                    className={`group relative p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-gray-100 bg-white hover:border-primary-200 hover:bg-primary-50/30'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${type.bg}`}>
                      <TypeIcon className={`w-5 h-5 ${type.color}`} />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{type.label}</p>
                    {SERVICE_SUB_OPTIONS[type.value] && (
                      <ChevronDown className="w-3 h-3 text-gray-400 mt-1" />
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected service summary */}
            {serviceType && selectedServiceData && (
              <div className="mt-5 p-4 bg-primary-50 rounded-xl border border-primary-200 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedServiceData.bg}`}>
                  <selectedServiceData.Icon className={`w-5 h-5 ${selectedServiceData.color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-primary-900">{selectedServiceData.label}</p>
                  {getSubOptionsSummary() && (
                    <p className="text-xs text-primary-600 mt-0.5">{getSubOptionsSummary()!.slice(0, 3).join(' · ')}</p>
                  )}
                </div>
                <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-4">

            {/* ── Service Summary Card: Title + Parts + Labor ── */}
            {selectedServiceData && (() => {
              const allParts = getSubOptionsSummary() || [];
              return (
                <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                    <div className={`w-11 h-11 ${selectedServiceData.bg} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <selectedServiceData.Icon className={`w-6 h-6 ${selectedServiceData.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-base">{selectedServiceData.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {serviceScope === 'both' ? 'Parts + Labor' : 'Labor Only (no parts needed)'}
                      </p>
                    </div>
                  </div>

                  {/* Parts & Labor columns */}
                  <div className="grid grid-cols-2 divide-x divide-gray-100 px-5 py-4">
                    {/* Parts */}
                    <div className="pr-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Parts</p>
                      {allParts.length > 0 ? (
                        <ul className="space-y-1.5">
                          {allParts.map((p, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-400 italic">None selected</p>
                      )}
                    </div>

                    {/* Labor */}
                    <div className="pl-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Labor</p>
                      {serviceScope === 'both' ? (
                        <>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 mb-1.5">
                            <Wrench className="w-3 h-3" />
                            Included
                          </div>
                          <p className="text-[10px] text-gray-400 leading-tight">Provider prices parts + labor together</p>
                        </>
                      ) : (
                        <>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 mb-1.5">
                            <Wrench className="w-3 h-3" />
                            Labor Only
                          </div>
                          <p className="text-[10px] text-gray-400 leading-tight">You provide parts — provider prices labor only</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="bg-white rounded-2xl p-6 shadow-soft">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">{t('client.requests.serviceDetails')}</h2>
                <p className="text-sm text-gray-500 mt-1">Describe your request so providers can give accurate quotes</p>
              </div>

              <div className="space-y-5">

                {/* ── Service Scope: What do you need? ── */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    What do you need? *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        id: 'service' as const,
                        label: 'Labor Only',
                        desc: 'I have the parts, just need installation',
                        Icon: Wrench,
                      },
                      {
                        id: 'both' as const,
                        label: 'Parts + Service',
                        desc: 'Provider supplies parts and does the work',
                        Icon: Layers,
                      },
                    ].map((scope) => (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => setServiceScope(scope.id)}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                          serviceScope === scope.id
                            ? 'border-primary-500 bg-primary-50 shadow-sm'
                            : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          serviceScope === scope.id ? 'bg-primary-100' : 'bg-gray-200'
                        }`}>
                          <scope.Icon className={`w-4.5 h-4.5 ${serviceScope === scope.id ? 'text-primary-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${serviceScope === scope.id ? 'text-primary-700' : 'text-gray-700'}`}>
                            {scope.label}
                          </p>
                          <p className={`text-xs mt-0.5 leading-relaxed ${serviceScope === scope.id ? 'text-primary-500' : 'text-gray-400'}`}>
                            {scope.desc}
                          </p>
                        </div>
                        {serviceScope === scope.id && (
                          <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('client.requests.titleLabel')}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('client.requests.titlePlaceholder')}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Additional notes <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Any additional details, symptoms, or instructions for the provider..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    {t('client.requests.urgencyLabel')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {URGENCY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setUrgency(opt.value as any)}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                          urgency === opt.value
                            ? `${opt.border} ${opt.bg} shadow-sm`
                            : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                          <p className={`font-semibold text-sm ${urgency === opt.value ? opt.text : 'text-gray-700'}`}>
                            {t(opt.labelKey)}
                          </p>
                        </div>
                        <p className={`text-xs ${urgency === opt.value ? opt.text : 'text-gray-400'} opacity-90`}>
                          {t(opt.descKey)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('client.requests.dateLabel')}
                  </label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Service Location
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'IN_SHOP', label: 'At the shop', desc: 'Drive to provider', Icon: Building },
                      { value: 'MOBILE',  label: 'My location', desc: 'Provider comes to you', Icon: Home },
                    ].map((opt) => {
                      const OptIcon = opt.Icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setServiceLocationType(opt.value as 'IN_SHOP' | 'MOBILE')}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            serviceLocationType === opt.value
                              ? 'border-primary-500 bg-primary-50 shadow-sm'
                              : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                          }`}
                        >
                          <OptIcon className={`w-6 h-6 mb-2 ${serviceLocationType === opt.value ? 'text-primary-600' : 'text-gray-400'}`} />
                          <p className={`font-semibold text-sm ${serviceLocationType === opt.value ? 'text-primary-700' : 'text-gray-700'}`}>{opt.label}</p>
                          <p className={`text-xs mt-0.5 ${serviceLocationType === opt.value ? 'text-primary-500' : 'text-gray-400'}`}>{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {serviceLocationType === 'MOBILE' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Your address
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customerAddress}
                        onChange={(e) => {
                          setCustomerAddress(e.target.value);
                          setServiceLatitude(undefined);
                          setServiceLongitude(undefined);
                        }}
                        placeholder="e.g. 123 Main St, Miami, FL 33101"
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        disabled={gettingLocation}
                        onClick={() => {
                          if (!navigator.geolocation) return;
                          setGettingLocation(true);
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              setServiceLatitude(pos.coords.latitude);
                              setServiceLongitude(pos.coords.longitude);
                              setGettingLocation(false);
                            },
                            () => setGettingLocation(false),
                          );
                        }}
                        className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        title="Use GPS location"
                      >
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">{gettingLocation ? '...' : 'GPS'}</span>
                      </button>
                    </div>
                    {serviceLatitude && (
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> GPS location captured
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t('client.requests.confirmTitle')}</h2>
              <p className="text-sm text-gray-500 mt-1">Review your request before submitting</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Car className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{t('client.requests.vehicleLabel')}</p>
                  <p className="font-semibold text-gray-900">
                    {selectedVehicleData?.make} {selectedVehicleData?.model} {selectedVehicleData?.year}
                  </p>
                  <p className="text-sm text-gray-500">{selectedVehicleData?.plateNumber}</p>
                </div>
              </div>

              {selectedServiceData && (() => {
                const confirmParts = getSubOptionsSummary() || [];
                return (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start gap-4 mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selectedServiceData.bg}`}>
                        <selectedServiceData.Icon className={`w-5 h-5 ${selectedServiceData.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{t('client.requests.serviceLabel')}</p>
                        <p className="font-bold text-gray-900">{title}</p>
                        <span className={`inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          serviceScope === 'both' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          <Wrench className="w-3 h-3" />
                          {serviceScope === 'both' ? 'Parts + Service' : 'Labor Only'}
                        </span>
                      </div>
                    </div>
                    {confirmParts.length > 0 && (
                      <div className="pl-14">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Parts</p>
                        <div className="flex flex-wrap gap-1.5">
                          {confirmParts.map((p, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 bg-white rounded-full border border-gray-200 text-gray-700 font-medium">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {description && (
                      <p className="text-sm text-gray-500 mt-2 pl-14">{description}</p>
                    )}
                  </div>
                );
              })()}

              {selectedUrgency && (
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selectedUrgency.bg}`}>
                    <div className={`w-3 h-3 rounded-full ${selectedUrgency.dot}`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{t('client.requests.urgencyConfirmLabel')}</p>
                    <p className={`font-semibold ${selectedUrgency.text}`}>{t(selectedUrgency.labelKey)}</p>
                    <p className="text-sm text-gray-500">{t(selectedUrgency.descKey)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                  {serviceLocationType === 'IN_SHOP' ? (
                    <Building className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Home className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Location</p>
                  <p className="font-semibold text-gray-900">{serviceLocationType === 'IN_SHOP' ? 'At the shop' : 'Mobile service at my location'}</p>
                  {serviceLocationType === 'MOBILE' && customerAddress && (
                    <p className="text-sm text-gray-500">{customerAddress}</p>
                  )}
                </div>
              </div>

              {preferredDate && (
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CalendarCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{t('client.requests.dateConfirmLabel')}</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(preferredDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-primary-50 rounded-xl border border-primary-100">
                <Bell className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-primary-700">{t('client.requests.notification')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 gap-4">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
              {t('client.requests.back')}
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-200 transition-all"
            >
              {t('client.requests.continue')}
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('client.requests.sending')}
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  {t('client.requests.send')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Sub-options Modal */}
      {showSubOptionsModal && pendingServiceId && SERVICE_SUB_OPTIONS[pendingServiceId] && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              {(() => {
                const svc = SERVICE_TYPES.find(s => s.value === pendingServiceId);
                if (!svc) return null;
                const SvcIcon = svc.Icon;
                return (
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${svc.bg}`}>
                      <SvcIcon className={`w-5 h-5 ${svc.color}`} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{SERVICE_SUB_OPTIONS[pendingServiceId].title}</p>
                      <p className="text-xs text-gray-500">Customize your request (optional)</p>
                    </div>
                  </div>
                );
              })()}
              <button
                onClick={skipSubOptions}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-6">
              {SERVICE_SUB_OPTIONS[pendingServiceId].sections.map(section => (
                <div key={section.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="font-semibold text-gray-800 text-sm">{section.label}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {section.type === 'single' ? 'Choose one' : 'Select all that apply'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {section.options.map(option => {
                      const OptionIcon = option.Icon;
                      const selected = (subOptionSelections[section.id] || []).includes(option.id);
                      return (
                        <button
                          key={option.id}
                          onClick={() => toggleSubOption(section.id, option.id, section.type)}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                            selected
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            selected ? 'bg-primary-100' : 'bg-white border border-gray-200'
                          }`}>
                            <OptionIcon className={`w-4 h-4 ${selected ? 'text-primary-600' : 'text-gray-400'}`} />
                          </div>
                          <span className={`text-sm font-medium flex-1 ${selected ? 'text-primary-800' : 'text-gray-700'}`}>
                            {option.label}
                          </span>
                          {section.type === 'single' ? (
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                              selected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                            }`}>
                              {selected && <div className="w-full h-full rounded-full bg-white scale-50" />}
                            </div>
                          ) : (
                            <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                              selected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                            }`}>
                              {selected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={skipSubOptions}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                Skip
              </button>
              <button
                onClick={confirmSubOptions}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 shadow-md shadow-primary-200 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
