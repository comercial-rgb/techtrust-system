"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/services/api";
import {
  User,
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  DollarSign,
  Shield,
  Bell,
  Lock,
  Camera,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wrench,
  Car,
  Sparkles,
  Zap,
  ChevronRight,
  FileText,
  CreditCard,
  Info,
  Droplets,
  Wind,
  Thermometer,
  Disc,
  Navigation,
  Settings,
  RefreshCw,
  Battery,
  Search,
  Activity,
  Truck,
  LifeBuoy,
  ShoppingBag,
  Package,
} from "lucide-react";

interface WorkDay { open: string; close: string; closed: boolean }

interface ProviderProfile {
  businessName: string;
  businessType: string;
  providerPublicStatus: string;
  legalName: string;
  ein: string;
  sunbizDocumentNumber: string;
  fdacsRegistrationNumber: string;
  cityBusinessTaxReceiptNumber: string;
  countyBusinessTaxReceiptNumber: string;
  businessDescription: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  serviceRadius: number;
  averageRating: number;
  totalReviews: number;
  workingHours: {
    monday: WorkDay; tuesday: WorkDay; wednesday: WorkDay;
    thursday: WorkDay; friday: WorkDay; saturday: WorkDay; sunday: WorkDay;
  };
  servicesOffered: string[];
  vehicleTypesServed: string[];
  sellsParts: boolean;
  mobileService: boolean;
  freeKm: number;
  extraFeePerKm: number;
  payoutMethod: string;
  zelleEmail: string;
  zellePhone: string;
  bankTransferLabel: string;
  bankAccountType: string;
  bankAccountNumber: string;
  bankRoutingNumber: string;
  payoutInstructions: string;
  notifications: {
    newRequests: boolean; quoteAccepted: boolean;
    payments: boolean; reviews: boolean; marketing: boolean;
  };
}

const DEFAULT_DAY: WorkDay = { open: "08:00", close: "18:00", closed: false };

export default function ConfiguracoesPage() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const { translate: t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const US_STATES = [
    { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
    { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
    { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
    { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
    { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
    { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
    { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
    { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
    { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
    { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
    { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
    { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
    { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
    { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
    { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
    { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
    { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }, { code: "DC", name: "District of Columbia" },
  ];

  const [profile, setProfile] = useState<ProviderProfile>({
    businessName: "", businessType: "AUTO_REPAIR", providerPublicStatus: "PENDING",
    legalName: "", ein: "", sunbizDocumentNumber: "", fdacsRegistrationNumber: "",
    cityBusinessTaxReceiptNumber: "", countyBusinessTaxReceiptNumber: "", businessDescription: "",
    phone: "", email: "", address: "", city: "", state: "", zipCode: "",
    serviceRadius: 15, averageRating: 0, totalReviews: 0,
    workingHours: {
      monday: DEFAULT_DAY, tuesday: DEFAULT_DAY, wednesday: DEFAULT_DAY,
      thursday: DEFAULT_DAY, friday: DEFAULT_DAY,
      saturday: { open: "08:00", close: "14:00", closed: false },
      sunday: { open: "08:00", close: "14:00", closed: true },
    },
    servicesOffered: [], vehicleTypesServed: [],
    sellsParts: false,
    mobileService: false, freeKm: 0, extraFeePerKm: 0,
    payoutMethod: "MANUAL", zelleEmail: "", zellePhone: "", bankTransferLabel: "",
    bankAccountType: "", bankAccountNumber: "", bankRoutingNumber: "", payoutInstructions: "",
    notifications: { newRequests: true, quoteAccepted: true, payments: true, reviews: true, marketing: false },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) loadProfile();
  }, [isAuthenticated]);

  async function loadProfile() {
    setLoading(true);
    try {
      const response = await api.get("/providers/profile");
      const p = response.data.data || {};
      const hours = p.businessHours || {};

      const parseDay = (day: any): WorkDay =>
        day ? { open: day.open || day.openTime || "08:00", close: day.close || day.closeTime || "18:00", closed: day.closed !== undefined ? !!day.closed : !day.enabled } : DEFAULT_DAY;

      const u = user as any;

      setProfile({
        businessName: p.businessName || u?.fullName || "",
        businessType: p.businessTypeCat || p.businessType || "AUTO_REPAIR",
        providerPublicStatus: p.providerPublicStatus || "PENDING",
        legalName: p.legalName || "",
        ein: p.ein || "",
        sunbizDocumentNumber: p.sunbizDocumentNumber || "",
        fdacsRegistrationNumber: p.fdacsRegistrationNumber || "",
        cityBusinessTaxReceiptNumber: p.cityBusinessTaxReceiptNumber || "",
        countyBusinessTaxReceiptNumber: p.countyBusinessTaxReceiptNumber || "",
        businessDescription: p.businessDescription || "",
        phone: p.businessPhone || u?.phone || "",
        email: p.businessEmail || u?.email || "",
        address: p.address || u?.address || "",
        city: p.city || u?.city || "",
        state: p.state || u?.state || "",
        zipCode: p.zipCode || u?.zipCode || "",
        serviceRadius: p.serviceRadiusKm ? Math.round(p.serviceRadiusKm / 1.60934) : 15,
        averageRating: Number(p.averageRating) || 0,
        totalReviews: p.totalReviews || 0,
        workingHours: {
          monday: parseDay(hours.monday || hours.Monday),
          tuesday: parseDay(hours.tuesday || hours.Tuesday),
          wednesday: parseDay(hours.wednesday || hours.Wednesday),
          thursday: parseDay(hours.thursday || hours.Thursday),
          friday: parseDay(hours.friday || hours.Friday),
          saturday: parseDay(hours.saturday || hours.Saturday || { open: "08:00", close: "14:00", closed: false }),
          sunday: parseDay(hours.sunday || hours.Sunday || { open: "08:00", close: "14:00", closed: true }),
        },
        servicesOffered: Array.isArray(p.servicesOffered) ? p.servicesOffered : [],
        vehicleTypesServed: Array.isArray(p.vehicleTypesServed) ? p.vehicleTypesServed : [],
        sellsParts: !!p.sellsParts,
        mobileService: !!p.mobileService,
        freeKm: Number(p.freeKm) || 0,
        extraFeePerKm: Number(p.extraFeePerKm) || 0,
        payoutMethod: p.payoutMethod || "MANUAL",
        zelleEmail: p.zelleEmail || "",
        zellePhone: p.zellePhone || "",
        bankTransferLabel: p.bankTransferLabel || "",
        bankAccountType: p.bankAccountType || "",
        bankAccountNumber: p.bankAccountNumber || "",
        bankRoutingNumber: p.bankRoutingNumber || "",
        payoutInstructions: p.payoutInstructions || "",
        notifications: { newRequests: true, quoteAccepted: true, payments: true, reviews: true, marketing: false },
      });
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setErrorMessage("");
    try {
      await api.patch("/providers/profile", {
        businessName: profile.businessName || undefined,
        businessPhone: profile.phone || undefined,
        businessEmail: profile.email || undefined,
        address: profile.address || undefined,
        city: profile.city || undefined,
        state: profile.state || undefined,
        zipCode: profile.zipCode || undefined,
        serviceRadiusKm: Math.round(profile.serviceRadius * 1.60934),
        businessDescription: profile.businessDescription || undefined,
        businessHours: profile.workingHours,
        servicesOffered: profile.servicesOffered,
        vehicleTypesServed: profile.vehicleTypesServed,
        sellsParts: profile.sellsParts,
        mobileService: profile.mobileService,
        freeKm: profile.freeKm,
        extraFeePerKm: profile.extraFeePerKm,
        legalName: profile.legalName || undefined,
        ein: profile.ein || undefined,
        sunbizDocumentNumber: profile.sunbizDocumentNumber || undefined,
        fdacsRegistrationNumber: profile.fdacsRegistrationNumber || undefined,
        cityBusinessTaxReceiptNumber: profile.cityBusinessTaxReceiptNumber || undefined,
        countyBusinessTaxReceiptNumber: profile.countyBusinessTaxReceiptNumber || undefined,
        payoutMethod: profile.payoutMethod || undefined,
        zelleEmail: profile.zelleEmail || undefined,
        zellePhone: profile.zellePhone || undefined,
        bankTransferLabel: profile.bankTransferLabel || undefined,
        bankAccountType: profile.bankAccountType || undefined,
        bankAccountNumber: profile.bankAccountNumber || undefined,
        bankRoutingNumber: profile.bankRoutingNumber || undefined,
        payoutInstructions: profile.payoutInstructions || undefined,
      });
      setSuccessMessage("Profile saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Save error:", error);
      setErrorMessage("Could not save. Please try again.");
      setTimeout(() => setErrorMessage(""), 4000);
    } finally {
      setSaving(false);
    }
  }

  const serviceTypes = [
    // Maintenance
    { id: "OIL_CHANGE", label: "Oil Change", icon: Droplets },
    { id: "AIR_FILTER", label: "Air Filter Service", icon: Wind },
    { id: "FUEL_SYSTEM", label: "Fuel System", icon: Zap },
    { id: "BRAKES", label: "Brakes", icon: Disc },
    { id: "COOLING_SYSTEM", label: "Cooling System", icon: Thermometer },
    { id: "TIRES", label: "Tires & Wheels", icon: Car },
    { id: "BELTS_HOSES", label: "Belts & Hoses", icon: Wrench },
    // Repairs
    { id: "AC_SERVICE", label: "A/C & Heating", icon: Thermometer },
    { id: "STEERING", label: "Steering & Suspension", icon: Navigation },
    { id: "ELECTRICAL_BASIC", label: "Electrical System", icon: Zap },
    { id: "EXHAUST", label: "Exhaust System", icon: Wind },
    { id: "DRIVETRAIN", label: "Drivetrain", icon: Settings },
    { id: "ENGINE", label: "Engine", icon: Settings },
    { id: "TRANSMISSION", label: "Transmission", icon: RefreshCw },
    { id: "BATTERY", label: "Battery", icon: Battery },
    { id: "GENERAL_REPAIR", label: "General Repair", icon: Wrench },
    // Packages & Fluids
    { id: "FLUID_SERVICES", label: "Fluid Services", icon: Droplets },
    { id: "PREVENTIVE_PACKAGES", label: "Preventive Maintenance", icon: Shield },
    // Inspection & Diagnostics
    { id: "INSPECTION", label: "Inspection", icon: Search },
    { id: "DIAGNOSTICS", label: "Diagnostics", icon: Activity },
    // Detailing & Roadside
    { id: "DETAILING", label: "Detailing", icon: Sparkles },
    { id: "TOWING", label: "Towing", icon: Truck },
    { id: "ROADSIDE_ASSIST", label: "Roadside Assist", icon: LifeBuoy },
    { id: "LOCKOUT", label: "Lockout", icon: Lock },
  ];

  const vehicleTypes = [
    { id: "CAR", label: "Car / Sedan" },
    { id: "SUV", label: "SUV" },
    { id: "TRUCK", label: "Pickup Truck" },
    { id: "VAN", label: "Van / Minivan" },
    { id: "HEAVY_TRUCK", label: "Heavy Truck" },
    { id: "BUS", label: "Bus / RV" },
  ];

  const businessTypes = [
    { id: "AUTO_REPAIR", label: "Auto Repair Shop" },
    { id: "TIRE_SHOP", label: "Tire Shop" },
    { id: "AUTO_ELECTRIC", label: "Auto Electric" },
    { id: "BODY_SHOP", label: "Body Shop" },
    { id: "DETAILING", label: "Auto Detailing" },
    { id: "TOWING", label: "Towing" },
    { id: "MULTI_SERVICE", label: "Multi-Service" },
  ];

  const weekDays = [
    { key: "monday", label: "Monday" }, { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" }, { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" }, { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];

  const tabs = [
    { id: "profile", label: "Profile", icon: Building2 },
    { id: "services", label: "Services", icon: Wrench },
    { id: "hours", label: "Hours", icon: Clock },
    { id: "identity", label: "Identity & Tax", icon: FileText },
    { id: "payout", label: "Payout", icon: CreditCard },
    { id: "security", label: "Security", icon: Lock },
  ];

  const toggleService = (id: string) => {
    setProfile(prev => ({
      ...prev,
      servicesOffered: prev.servicesOffered.includes(id)
        ? prev.servicesOffered.filter(s => s !== id)
        : [...prev.servicesOffered, id],
    }));
  };

  const toggleVehicle = (id: string) => {
    setProfile(prev => ({
      ...prev,
      vehicleTypesServed: prev.vehicleTypesServed.includes(id)
        ? prev.vehicleTypesServed.filter(v => v !== id)
        : [...prev.vehicleTypesServed, id],
    }));
  };

  const freeMiles = profile.freeKm > 0 ? Math.round(profile.freeKm / 1.60934) : 0;
  const feePerMile = Number(profile.extraFeePerKm) || 0;

  if (authLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  if (loading) {
    return (
      <DashboardLayout title="Settings">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <div className="skeleton h-8 w-48 mb-6 rounded" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-12 w-full rounded" />)}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-4xl mx-auto animate-fade-in">
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-slide-up">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <p className="font-medium text-green-800">{successMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <p className="font-medium text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Profile header */}
        <div className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-primary-100 flex items-center justify-center">
                <Building2 className="w-12 h-12 text-primary-600" />
              </div>
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">{profile.businessName || "My Business"}</h2>
                {profile.providerPublicStatus === "VERIFIED" && (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    <Shield className="w-3 h-3" />
                    Verified Business
                  </span>
                )}
                {profile.providerPublicStatus === "PENDING" && (
                  <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" />
                    Under Review
                  </span>
                )}
              </div>
              <p className="text-gray-500 mb-2">{businessTypes.find(bt => bt.id === profile.businessType)?.label}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-yellow-600">⭐ {profile.averageRating.toFixed(1)}</span>
                <span className="text-gray-500">{profile.totalReviews} reviews</span>
                {profile.address && <span className="text-gray-500">📍 {profile.city}, {profile.state}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id ? "bg-primary-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">

          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                  <input type="text" value={profile.businessName} onChange={e => setProfile({...profile, businessName: e.target.value})} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                  <select value={profile.businessType} onChange={e => setProfile({...profile, businessType: e.target.value})} className="input">
                    {businessTypes.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
                  <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="input" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
                  <textarea value={profile.businessDescription} onChange={e => setProfile({...profile, businessDescription: e.target.value})}
                    rows={3} className="input resize-none" placeholder="Describe your business, specialties, and what sets you apart..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                  <input type="text" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} className="input" placeholder="123 Main St" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input type="text" value={profile.city} onChange={e => setProfile({...profile, city: e.target.value})} className="input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <select value={profile.state} onChange={e => setProfile({...profile, state: e.target.value, city: ""})} className="input">
                      <option value="">State</option>
                      {US_STATES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                    <input type="text" value={profile.zipCode} onChange={e => setProfile({...profile, zipCode: e.target.value})} className="input" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Radius (miles)</label>
                  <input type="number" value={profile.serviceRadius}
                    onChange={e => setProfile({...profile, serviceRadius: parseInt(e.target.value) || 0})}
                    className="input" min="1" max="150" />
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-medium text-gray-700">Mobile / On-Site Service</p>
                    <p className="text-sm text-gray-500">Travel to customer location</p>
                    {profile.mobileService && (
                      <p className="text-xs text-gray-400 mt-1">Free: {freeMiles} mi · ${feePerMile.toFixed(2)}/mi after</p>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={profile.mobileService} onChange={e => setProfile({...profile, mobileService: e.target.checked})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ── SERVICES TAB ── */}
          {activeTab === "services" && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Services Offered</h3>
                <p className="text-sm text-gray-500 mb-4">Select all service types your business performs</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {serviceTypes.map(service => {
                    const Icon = service.icon;
                    const sel = profile.servicesOffered.includes(service.id);
                    return (
                      <button key={service.id} onClick={() => toggleService(service.id)}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${sel ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sel ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`font-medium ${sel ? "text-primary-700" : "text-gray-700"}`}>{service.label}</span>
                        {sel && <CheckCircle className="w-5 h-5 text-primary-500 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Vehicle Types Served</h3>
                <p className="text-sm text-gray-500 mb-4">Which types of vehicles do you work on?</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {vehicleTypes.map(vt => {
                    const sel = profile.vehicleTypesServed.includes(vt.id);
                    return (
                      <button key={vt.id} onClick={() => toggleVehicle(vt.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${sel ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sel ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                          <Car className="w-4 h-4" />
                        </div>
                        <span className={`text-sm font-medium ${sel ? "text-primary-700" : "text-gray-700"}`}>{vt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto Parts Sales */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Auto Parts Sales</h3>
                <p className="text-sm text-gray-500 mb-4">Do you sell auto parts to customers?</p>

                <div className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${profile.sellsParts ? "border-primary-500 bg-primary-50" : "border-gray-200"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${profile.sellsParts ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">I sell auto parts</p>
                    <p className="text-sm text-gray-500">Enable to appear in parts search results</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={profile.sellsParts}
                      onChange={e => setProfile({ ...profile, sellsParts: e.target.checked })}
                      className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>

                {profile.sellsParts && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-blue-800 mb-1">Sales Tax — TechTrust Handles It</p>
                        <p className="text-sm text-blue-700">
                          Auto parts sold through TechTrust are subject to Florida sales tax under{" "}
                          <strong>Florida Statute s. 212.0515, F.S.</strong> (retail sale of tangible personal property).
                          TechTrust acts as the <strong>Marketplace Facilitator</strong> and collects, remits, and files
                          all applicable state and local sales tax on your behalf.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Package className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-blue-800 mb-1">Dealer License</p>
                        <p className="text-sm text-blue-700">
                          Parts sold through TechTrust are listed under TechTrust AutoSolutions LLC&apos;s
                          Florida retail dealer license number{" "}
                          <strong>FL-DLR-2024-087543</strong> (fictitious — to be replaced with official number upon issuance).
                          You do <strong>not</strong> need a separate dealer license to sell parts through this platform.
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-500 border-t border-blue-200 pt-3">
                      Do not add sales tax on top of your part prices. Enter your cost + markup;
                      TechTrust adds the correct tax rate at checkout based on the customer&apos;s location.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── HOURS TAB ── */}
          {activeTab === "hours" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Business Hours</h3>
              <div className="space-y-3">
                {weekDays.map(day => {
                  const dk = day.key as keyof typeof profile.workingHours;
                  const h = profile.workingHours[dk];
                  return (
                    <div key={day.key} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-28"><span className="font-medium text-gray-700">{day.label}</span></div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!h.closed}
                          onChange={e => setProfile({...profile, workingHours: {...profile.workingHours, [dk]: {...h, closed: !e.target.checked}}})}
                          className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                        <span className="text-sm text-gray-600">Open</span>
                      </label>
                      {!h.closed ? (
                        <>
                          <input type="time" value={h.open}
                            onChange={e => setProfile({...profile, workingHours: {...profile.workingHours, [dk]: {...h, open: e.target.value}}})}
                            className="input w-32" />
                          <span className="text-gray-400">to</span>
                          <input type="time" value={h.close}
                            onChange={e => setProfile({...profile, workingHours: {...profile.workingHours, [dk]: {...h, close: e.target.value}}})}
                            className="input w-32" />
                        </>
                      ) : <span className="text-gray-400 italic">Closed</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── IDENTITY & TAX TAB ── */}
          {activeTab === "identity" && (
            <div className="space-y-8">
              {/* Tax notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-blue-800 mb-1">Marketplace Facilitator Tax — No Action Required</p>
                  <p className="text-sm text-blue-700">
                    TechTrust acts as a <strong>Marketplace Facilitator</strong> under Florida law (s. 212.05965, F.S.). TechTrust is responsible for collecting and remitting applicable sales tax on all transactions processed through the platform. <strong>You do not need to collect or remit sales tax</strong> on behalf of TechTrust. Keep this for your records if asked by a tax authority.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Legal Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Legal Business Name</label>
                    <input type="text" value={profile.legalName} onChange={e => setProfile({...profile, legalName: e.target.value})}
                      className="input" placeholder="As registered with the state" />
                    <p className="text-xs text-gray-400 mt-1">Leave blank if same as business name</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">EIN (Federal Tax ID)</label>
                    <input type="text" value={profile.ein} onChange={e => setProfile({...profile, ein: e.target.value})}
                      className="input" placeholder="XX-XXXXXXX" />
                    <p className="text-xs text-gray-400 mt-1">Optional — speeds up identity verification</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sunbiz Document Number</label>
                    <input type="text" value={profile.sunbizDocumentNumber} onChange={e => setProfile({...profile, sunbizDocumentNumber: e.target.value})}
                      className="input" placeholder="Florida Division of Corporations" />
                    <p className="text-xs text-gray-400 mt-1">
                      Find yours at <a href="https://sunbiz.org" target="_blank" rel="noreferrer" className="text-blue-600 underline">sunbiz.org</a>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">FDACS Registration # (MV-XXXXX)</label>
                    <input type="text" value={profile.fdacsRegistrationNumber} onChange={e => setProfile({...profile, fdacsRegistrationNumber: e.target.value})}
                      className="input" placeholder="MV-00000" />
                    <p className="text-xs text-gray-400 mt-1">Required for FL motor vehicle repair shops</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Local Business Tax Receipt</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City BTR Number</label>
                    <input type="text" value={profile.cityBusinessTaxReceiptNumber} onChange={e => setProfile({...profile, cityBusinessTaxReceiptNumber: e.target.value})}
                      className="input" placeholder="City-issued receipt number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">County BTR Number</label>
                    <input type="text" value={profile.countyBusinessTaxReceiptNumber} onChange={e => setProfile({...profile, countyBusinessTaxReceiptNumber: e.target.value})}
                      className="input" placeholder="County-issued receipt number" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Business Tax Receipts are required by most Florida cities and counties. Check with your local government or visit{" "}
                  <a href="https://myfloridalicense.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">myfloridalicense.com</a>.
                </p>
              </div>
            </div>
          )}

          {/* ── PAYOUT TAB ── */}
          {activeTab === "payout" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Payout Method</h3>
              <p className="text-sm text-gray-500">Choose how you receive payments from completed services.</p>

              <div className="space-y-3">
                {[
                  { id: "MANUAL", label: "Manual / Contact Me", description: "TechTrust will contact you to arrange payment" },
                  { id: "ZELLE", label: "Zelle", description: "Receive payments via Zelle — fast and free" },
                  { id: "BANK_TRANSFER", label: "Bank Transfer (ACH)", description: "Direct deposit to your bank account" },
                ].map(method => (
                  <button key={method.id} onClick={() => setProfile({...profile, payoutMethod: method.id})}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      profile.payoutMethod === method.id ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      profile.payoutMethod === method.id ? "border-primary-500 bg-primary-500" : "border-gray-300"
                    }`}>
                      {profile.payoutMethod === method.id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className={`font-medium ${profile.payoutMethod === method.id ? "text-primary-700" : "text-gray-700"}`}>{method.label}</p>
                      <p className="text-sm text-gray-500">{method.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {profile.payoutMethod === "ZELLE" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zelle Email</label>
                    <input type="email" value={profile.zelleEmail} onChange={e => setProfile({...profile, zelleEmail: e.target.value})}
                      className="input" placeholder="email@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zelle Phone</label>
                    <input type="tel" value={profile.zellePhone} onChange={e => setProfile({...profile, zellePhone: e.target.value})}
                      className="input" placeholder="+1 (555) 000-0000" />
                    <p className="text-xs text-gray-400 mt-1">Registered phone number or email on your Zelle account</p>
                  </div>
                </div>
              )}

              {profile.payoutMethod === "BANK_TRANSFER" && (
                <div className="grid grid-cols-1 gap-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name / Account Label</label>
                    <input type="text" value={profile.bankTransferLabel} onChange={e => setProfile({...profile, bankTransferLabel: e.target.value})}
                      className="input" placeholder="e.g. Chase Business Checking" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                      <select value={profile.bankAccountType} onChange={e => setProfile({...profile, bankAccountType: e.target.value})} className="input">
                        <option value="">Select type</option>
                        <option value="CHECKING">Checking</option>
                        <option value="SAVINGS">Savings</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Routing Number (ABA)</label>
                      <input type="text" value={profile.bankRoutingNumber} onChange={e => setProfile({...profile, bankRoutingNumber: e.target.value})}
                        className="input" placeholder="9-digit routing number" maxLength={9} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                    <input type="text" value={profile.bankAccountNumber} onChange={e => setProfile({...profile, bankAccountNumber: e.target.value})}
                      className="input" placeholder="Bank account number" />
                    <p className="text-xs text-gray-400 mt-1">Your information is stored securely and only used to process payouts.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes (optional)</label>
                    <textarea value={profile.payoutInstructions} onChange={e => setProfile({...profile, payoutInstructions: e.target.value})}
                      rows={2} className="input resize-none" placeholder="Any special instructions for the finance team..." />
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Stripe direct deposit (instant payout) is coming soon. Until then, payouts are processed manually within 3–5 business days after each completed service.
                </p>
              </div>
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Security</h3>
              <div className="space-y-4">
                <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-400" />
                    <div className="text-left">
                      <p className="font-medium text-gray-700">Change Password</p>
                      <p className="text-sm text-gray-500">Update your access password</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <div className="text-left">
                      <p className="font-medium text-gray-700">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Add an extra layer of security</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div className="text-left">
                      <p className="font-medium text-gray-700">Recovery Email</p>
                      <p className="text-sm text-gray-500">{profile.email}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                <div className="pt-6 border-t border-gray-200">
                  <button onClick={logout} className="btn btn-danger w-full">Sign Out</button>
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          {activeTab !== "security" && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button onClick={handleSave} disabled={saving} className="btn btn-primary px-8 py-3 flex items-center gap-2">
                {saving ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Saving...</>
                ) : (
                  <><Save className="w-5 h-5" />Save Changes</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
