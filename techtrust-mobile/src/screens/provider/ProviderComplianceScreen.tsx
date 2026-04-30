/**
 * ProviderComplianceScreen - Main compliance dashboard for provider
 * Dynamic multi-state compliance: shows requirements based on jurisdiction
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  getComplianceSummary,
  getComplianceStatusLabel,
  getInsuranceStatusLabel,
  getComplianceDisplayName,
  COMPLIANCE_TYPE_LABELS,
  INSURANCE_TYPE_LABELS,
  autoCreateComplianceItems,
  upsertComplianceItem,
  ComplianceItem,
  InsurancePolicy,
  InsuranceRequirement,
  Technician,
} from "../../services/compliance.service";

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  AUTO_REPAIR:    'Auto Repair Shop',
  BODY_SHOP:      'Body Shop',
  MOBILE_MECHANIC:'Mobile Mechanic',
  TOWING:         'Towing Company',
  DETAILING:      'Auto Detailing',
  TIRE_SHOP:      'Tire Shop',
  OIL_CHANGE:     'Quick Lube / Oil Change',
  AUTO_ELECTRIC:  'Auto Electric',
  MULTI_SERVICE:  'Multi-Service Shop',
};

export default function ProviderComplianceScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>(
    [],
  );
  const [insuranceRequirements, setInsuranceRequirements] = useState<InsuranceRequirement[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [serviceGating, setServiceGating] = useState<
    Record<string, { allowed: boolean; reason?: string }>
  >({});
  const [overallStatus, setOverallStatus] = useState("PENDING");
  const [jurisdiction, setJurisdiction] = useState<any>(null);
  const [requiredItems, setRequiredItems] = useState<any[]>([]);
  const [businessType, setBusinessType] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await getComplianceSummary();
      if (res.success) {
        setComplianceItems(res.data.complianceItems || []);
        setInsurancePolicies(res.data.insurancePolicies || []);
        setInsuranceRequirements(res.data.insuranceRequirements || []);
        setTechnicians(res.data.technicians || []);
        setServiceGating(res.data.serviceGating || {});
        setOverallStatus(res.data.overallStatus || res.data.providerPublicStatus || "PENDING");
        setJurisdiction(res.data.jurisdiction || null);
        setRequiredItems(res.data.requiredItems || []);
        setBusinessType(res.data.businessType || null);
      }
    } catch (error: any) {
      console.error("Error fetching compliance:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  // FL requirements vary by business type. Only ComplianceType enum values:
  // FDACS_MOTOR_VEHICLE_REPAIR | LOCAL_BTR_CITY | LOCAL_BTR_COUNTY | EPA_609_TECHNICIAN | STATE_SHOP_REGISTRATION
  const getFloridaRequirements = (bType: string | null) => {
    const type = (bType || 'AUTO_REPAIR').toUpperCase();
    const btr = [
      { type: 'LOCAL_BTR_COUNTY', name: 'Business Tax Receipt – County (BTR)', required: true,  icon: 'document-text' },
      { type: 'LOCAL_BTR_CITY',   name: 'Business Tax Receipt – City (BTR)',   required: true,  icon: 'document-text' },
    ];
    if (type === 'DETAILING') {
      // Auto detailing is NOT covered by FL Motor Vehicle Repair Act — only BTR needed
      return [...btr];
    }
    if (type === 'TOWING') {
      // Towing in FL is regulated by FDACS under Wrecker Operations (F.S. 323), not the MV Repair Act
      return [
        { type: 'STATE_SHOP_REGISTRATION', name: 'FL Wrecker / Towing Permit (FDACS)', required: true, icon: 'shield' },
        ...btr,
      ];
    }
    // AUTO_REPAIR, BODY_SHOP, TIRE_SHOP, OIL_CHANGE, MOBILE_MECHANIC, AUTO_ELECTRIC, MULTI_SERVICE
    const epa609Required = ['AUTO_REPAIR', 'MULTI_SERVICE', 'AUTO_ELECTRIC'].includes(type);
    return [
      { type: 'FDACS_MOTOR_VEHICLE_REPAIR', name: 'FDACS Motor Vehicle Repair License', required: true,  icon: 'shield' },
      ...btr,
      { type: 'EPA_609_TECHNICIAN', name: 'EPA Section 609 Certification (A/C work)', required: epa609Required, icon: 'leaf' },
    ];
  };

  const FLORIDA_REQUIREMENTS = getFloridaRequirements(businessType);

  const isFloridaProvider = jurisdiction?.stateCode === 'FL' || jurisdiction?.stateName?.toLowerCase().includes('florida');

  // Attempt auto-create then refresh; if it fails still refresh in case something was partially created
  const handleManageCompliance = async () => {
    if (complianceItems.length > 0) return; // items already exist, nothing to auto-create
    try {
      setLoading(true);
      await autoCreateComplianceItems();
      await fetchData();
    } catch {
      await fetchData().catch(() => {});
      if (complianceItems.length === 0) {
        Alert.alert(
          "Setup Required",
          "Could not auto-generate items. Make sure your address is saved in Edit Profile, then try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Create a single FL requirement item and navigate to upload screen
  const handleAddFlItem = async (type: string) => {
    try {
      setLoading(true);
      const result = await upsertComplianceItem({ type });
      const item = result?.data || result;
      await fetchData();
      if (item?.id) {
        navigation.navigate("ComplianceItemDetail", { item });
      }
    } catch {
      Alert.alert("Error", "Could not create compliance item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const info = getComplianceStatusLabel(status);
    return (
      <View style={[styles.badge, { backgroundColor: info.color + "20" }]}>
        <Text style={[styles.badgeText, { color: info.color }]}>
          {info.label}
        </Text>
      </View>
    );
  };

  const getInsuranceBadge = (status: string) => {
    const info = getInsuranceStatusLabel(status);
    return (
      <View style={[styles.badge, { backgroundColor: info.color + "20" }]}>
        <Text style={[styles.badgeText, { color: info.color }]}>
          {info.label}
        </Text>
      </View>
    );
  };

  const getOverallBadge = () => {
    const map: Record<string, { label: string; color: string; icon: string }> =
      {
        VERIFIED: {
          label: "Verified",
          color: "#16a34a",
          icon: "shield-checkmark",
        },
        PENDING: { label: "Pending", color: "#d97706", icon: "time" },
        RESTRICTED: { label: "Restricted", color: "#dc2626", icon: "warning" },
        NOT_ELIGIBLE: {
          label: "Not Eligible",
          color: "#6b7280",
          icon: "close-circle",
        },
      };
    const info = map[overallStatus] || map.PENDING;
    return (
      <View
        style={[
          styles.overallBadge,
          { backgroundColor: info.color + "15", borderColor: info.color },
        ]}
      >
        <Ionicons name={info.icon as any} size={24} color={info.color} />
        <Text style={[styles.overallBadgeText, { color: info.color }]}>
          {info.label}
        </Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Compliance & Licensing</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2B5EA7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compliance & Licensing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
          />
        }
      >
        {/* Overall Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Status</Text>
          {getOverallBadge()}
          {jurisdiction && (
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'center' }}>
              {jurisdiction.stateName}{jurisdiction.countyName ? ` · ${jurisdiction.countyName} County` : ''}
              {jurisdiction.isActiveState ? '' : ' (State not yet active)'}
            </Text>
          )}
          {businessType && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 6 }}>
              <Ionicons name="business-outline" size={14} color="#6b7280" />
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                {BUSINESS_TYPE_LABELS[businessType] || businessType} · Requirements shown below
              </Text>
            </View>
          )}
        </View>

        <View style={styles.taxNoticeCard}>
          <View style={styles.guideHeader}>
            <Ionicons name="receipt-outline" size={18} color="#1d4ed8" />
            <Text style={styles.taxNoticeTitle}>Marketplace tax collection</Text>
          </View>
          <Text style={styles.taxNoticeText}>
            TechTrust collects applicable Florida marketplace sales tax on taxable parts and supplies,
            stores the tax records, and prepares reporting through QuickBooks. Do not add sales tax on
            top of your quote price; enter parts, labor, fees, and supplies separately so tax is calculated
            at checkout.
          </Text>
        </View>

        {/* Compliance Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Compliance Items</Text>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={handleManageCompliance}
            >
              <Text style={styles.manageBtnText}>
                {complianceItems.length === 0 ? "Set Up" : "Manage"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#2B5EA7" />
            </TouchableOpacity>
          </View>

          {complianceItems.length === 0 ? (
            <View>
              {isFloridaProvider && (
                <View style={styles.flRequirementsCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                    <Ionicons name="flag" size={18} color="#2B5EA7" />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#2B5EA7' }}>
                    Florida Requirements{businessType ? ` · ${BUSINESS_TYPE_LABELS[businessType] || businessType}` : ''}
                  </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                    Tap each item to upload your documents. {!businessType && 'Set your shop type in Settings → Edit Profile for tailored requirements.'}
                  </Text>
                  {FLORIDA_REQUIREMENTS.map((req) => (
                    <TouchableOpacity
                      key={req.type}
                      style={styles.flReqItem}
                      onPress={() => handleAddFlItem(req.type)}
                    >
                      <Ionicons name={req.icon as any} size={16} color={req.required ? '#dc2626' : '#6b7280'} />
                      <Text style={[styles.flReqText, !req.required && { color: '#9ca3af' }]}>
                        {req.name}
                      </Text>
                      {req.required ? (
                        <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, color: '#dc2626', fontWeight: '600' }}>Required</Text>
                        </View>
                      ) : (
                        <Ionicons name="add-circle-outline" size={16} color="#9ca3af" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={32} color="#9ca3af" />
                <Text style={styles.emptyText}>No compliance items yet</Text>
                <Text style={styles.emptySubtext}>
                  {isFloridaProvider
                    ? "Tap a requirement above to upload documents, or use Set Up to generate all items at once"
                    : "Tap Set Up to generate required items for your location"}
                </Text>
              </View>
            </View>
          ) : (
            complianceItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate("ComplianceItemDetail", { item })
                }
              >
                <View style={styles.cardHeader}>
                  <Ionicons
                    name={
                      item.type === "FDACS_MOTOR_VEHICLE_REPAIR" || item.type === "STATE_SHOP_REGISTRATION"
                        ? "shield"
                        : "document"
                    }
                    size={20}
                    color="#2B5EA7"
                  />
                  <Text style={styles.cardTitle}>
                    {getComplianceDisplayName(item, requiredItems)}
                  </Text>
                  {getStatusBadge(item.status)}
                </View>
                {(item.registrationNumber || item.licenseNumber) && (
                  <Text style={styles.cardDetail}>
                    Reg #: {item.registrationNumber || item.licenseNumber}
                  </Text>
                )}
                {item.expirationDate && (
                  <Text style={styles.cardDetail}>
                    Expires:{" "}
                    {new Date(item.expirationDate).toLocaleDateString()}
                  </Text>
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardFooterText}>
                    {item.documentUploads?.length || 0} document(s) uploaded
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Insurance Policies */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Insurance Coverage</Text>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => navigation.navigate("InsuranceManagement")}
            >
              <Text style={styles.manageBtnText}>Manage</Text>
              <Ionicons name="chevron-forward" size={16} color="#2B5EA7" />
            </TouchableOpacity>
          </View>

          {insuranceRequirements.length > 0 && (
            <View style={styles.insuranceGuideCard}>
              <View style={styles.guideHeader}>
                <Ionicons name="shield-checkmark" size={18} color="#92400e" />
                <Text style={styles.guideTitle}>Required for your services</Text>
              </View>
              {insuranceRequirements.slice(0, 4).map((item) => (
                <View key={item.type} style={styles.guideRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guideItemTitle}>{item.label}</Text>
                    <Text style={styles.guideItemReason}>{item.customerVisibleBadge}</Text>
                  </View>
                  <View
                    style={[
                      styles.guidePill,
                      item.level === "REQUIRED" ? styles.guidePillRequired : styles.guidePillRecommended,
                    ]}
                  >
                    <Text
                      style={[
                        styles.guidePillText,
                        item.level === "REQUIRED" ? styles.guidePillTextRequired : styles.guidePillTextRecommended,
                      ]}
                    >
                      {item.level === "REQUIRED" ? "Required" : "Recommended"}
                    </Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={styles.guideAction}
                onPress={() => navigation.navigate("InsuranceManagement")}
              >
                <Text style={styles.guideActionText}>Manage insurance guide</Text>
                <Ionicons name="chevron-forward" size={15} color="#92400e" />
              </TouchableOpacity>
            </View>
          )}

          {insurancePolicies.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="shield-outline" size={32} color="#9ca3af" />
              <Text style={styles.emptyText}>
                No insurance policies declared
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate("InsuranceManagement")}
              >
                <Text style={styles.addButtonText}>Declare Insurance</Text>
              </TouchableOpacity>
            </View>
          ) : (
            insurancePolicies.slice(0, 3).map((policy) => (
              <View key={policy.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons
                    name="shield-checkmark"
                    size={20}
                    color={policy.hasCoverage ? "#16a34a" : "#9ca3af"}
                  />
                  <Text style={styles.cardTitle}>
                    {INSURANCE_TYPE_LABELS[policy.type] || policy.type}
                  </Text>
                  {getInsuranceBadge(policy.status)}
                </View>
                {policy.hasCoverage && policy.carrierName && (
                  <Text style={styles.cardDetail}>
                    Carrier: {policy.carrierName}
                  </Text>
                )}
                {!policy.hasCoverage && (
                  <Text style={[styles.cardDetail, { color: "#d97706" }]}>
                    No coverage declared
                  </Text>
                )}
              </View>
            ))
          )}
          {insurancePolicies.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate("InsuranceManagement")}
            >
              <Text style={styles.viewAllText}>
                View all {insurancePolicies.length} policies
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Technicians */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Technicians</Text>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => navigation.navigate("TechnicianManagement")}
            >
              <Text style={styles.manageBtnText}>Manage</Text>
              <Ionicons name="chevron-forward" size={16} color="#2B5EA7" />
            </TouchableOpacity>
          </View>

          {technicians.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={32} color="#9ca3af" />
              <Text style={styles.emptyText}>No technicians registered</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate("TechnicianManagement")}
              >
                <Text style={styles.addButtonText}>Add Technician</Text>
              </TouchableOpacity>
            </View>
          ) : (
            technicians
              .filter((t) => t.isActive)
              .slice(0, 3)
              .map((tech) => (
                <View key={tech.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="person" size={20} color="#2B5EA7" />
                    <Text style={styles.cardTitle}>{tech.fullName}</Text>
                    {getStatusBadge(tech.epa609Status)}
                  </View>
                  <Text style={styles.cardDetail}>{tech.role}</Text>
                  {tech.epa609CertNumber && (
                    <Text style={styles.cardDetail}>
                      EPA 609: {tech.epa609CertNumber}
                    </Text>
                  )}
                </View>
              ))
          )}
        </View>

        {/* Service Gating */}
        {Object.keys(serviceGating).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Eligibility</Text>
            {Object.entries(serviceGating).map(([service, gate]) => (
              <View
                key={service}
                style={[
                  styles.gateCard,
                  { borderLeftColor: gate.allowed ? "#16a34a" : "#dc2626" },
                ]}
              >
                <Ionicons
                  name={gate.allowed ? "checkmark-circle" : "close-circle"}
                  size={20}
                  color={gate.allowed ? "#16a34a" : "#dc2626"}
                />
                <View style={styles.gateInfo}>
                  <Text style={styles.gateService}>
                    {service.replace(/_/g, " ")}
                  </Text>
                  {!gate.allowed && gate.reason && (
                    <Text style={styles.gateReason}>{gate.reason}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937" },
  content: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  overallBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  overallBadgeText: { fontSize: 16, fontWeight: "700" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1f2937" },
  cardDetail: {
    fontSize: 13,
    color: "#6b7280",
    marginLeft: 28,
    marginBottom: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  cardFooterText: { fontSize: 12, color: "#9ca3af" },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  emptyText: { fontSize: 14, color: "#6b7280", marginTop: 8 },
  emptySubtext: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  autoCreateBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  autoCreateText: { fontSize: 13, color: "#2B5EA7", fontWeight: "600" },
  manageBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  manageBtnText: { fontSize: 13, color: "#2B5EA7", fontWeight: "600" },
  insuranceGuideCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  guideHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  guideTitle: { fontSize: 14, fontWeight: "700", color: "#92400e" },
  guideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: "#fde68a",
  },
  guideItemTitle: { fontSize: 13, color: "#1f2937", fontWeight: "600" },
  guideItemReason: { fontSize: 11, color: "#92400e", marginTop: 2 },
  guidePill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  guidePillRequired: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  guidePillRecommended: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  guidePillText: { fontSize: 9, fontWeight: "800" },
  guidePillTextRequired: { color: "#dc2626" },
  guidePillTextRecommended: { color: "#2563eb" },
  guideAction: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
    marginTop: 8,
  },
  guideActionText: { fontSize: 12, color: "#92400e", fontWeight: "700" },
  taxNoticeCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  taxNoticeTitle: { fontSize: 14, fontWeight: "700", color: "#1d4ed8" },
  taxNoticeText: { fontSize: 12, color: "#1e3a8a", lineHeight: 18 },
  addButton: {
    marginTop: 12,
    backgroundColor: "#2B5EA7",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  viewAllBtn: { alignItems: "center", paddingVertical: 8 },
  viewAllText: { color: "#2B5EA7", fontSize: 13, fontWeight: "600" },
  gateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    gap: 10,
  },
  gateInfo: { flex: 1 },
  gateService: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    textTransform: "capitalize",
  },
  gateReason: { fontSize: 12, color: "#dc2626", marginTop: 2 },
  // D17 — FL Requirements styles
  flRequirementsCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  flReqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  flReqText: {
    flex: 1,
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '500',
  },
});
