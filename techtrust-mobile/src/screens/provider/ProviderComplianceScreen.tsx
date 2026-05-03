/**
 * ProviderComplianceScreen - Main compliance dashboard for provider
 * Dynamic multi-state compliance: shows requirements based on jurisdiction
 */

import React, { useState, useCallback, useMemo } from "react";
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
import { log } from "../../utils/logger";
import { useI18n, translate, type Language } from "../../i18n";
import { interpolate } from "../../i18n/interpolate";

function providerComplianceString(
  subKey: string,
  language: Language,
): string | undefined {
  const path = `providerCompliance.${subKey}`;
  let v = translate(path, language);
  if (v !== path) return v;
  v = translate(path, "en");
  if (v !== path) return v;
  return undefined;
}

export default function ProviderComplianceScreen({ navigation }: any) {
  const { t, language, formatDate } = useI18n();
  const tc = (t as any).providerCompliance || ({} as Record<string, string | undefined>);
  const tim = (t as any).insuranceManagement || {};
  const tm = (t as any).technicianManagement || {};
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
      log.error("Error fetching compliance:", error);
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

  const FLORIDA_REQUIREMENTS = useMemo(() => {
    const type = (businessType || "AUTO_REPAIR").toUpperCase();
    const btr = [
      {
        type: "LOCAL_BTR_COUNTY",
        name: tc.flBtrCounty || "Business Tax Receipt – County (BTR)",
        required: true,
        icon: "document-text",
      },
      {
        type: "LOCAL_BTR_CITY",
        name: tc.flBtrCity || "Business Tax Receipt – City (BTR)",
        required: true,
        icon: "document-text",
      },
    ];
    if (type === "DETAILING") {
      return [...btr];
    }
    if (type === "TOWING") {
      return [
        {
          type: "STATE_SHOP_REGISTRATION",
          name: tc.flWreckerPermit || "FL Wrecker / Towing Permit (FDACS)",
          required: true,
          icon: "shield",
        },
        ...btr,
      ];
    }
    const epa609Required = ["AUTO_REPAIR", "MULTI_SERVICE", "AUTO_ELECTRIC"].includes(type);
    return [
      {
        type: "FDACS_MOTOR_VEHICLE_REPAIR",
        name: tc.flFdacsRepair || "FDACS Motor Vehicle Repair License",
        required: true,
        icon: "shield",
      },
      ...btr,
      {
        type: "EPA_609_TECHNICIAN",
        name: tc.flEpa609 || "EPA Section 609 Certification (A/C work)",
        required: epa609Required,
        icon: "leaf",
      },
    ];
  }, [businessType, tc]);

  const isFloridaProvider = jurisdiction?.stateCode === 'FL' || jurisdiction?.stateName?.toLowerCase().includes('florida');

  // Auto-create any missing compliance items for this jurisdiction, then refresh
  const handleManageCompliance = async () => {
    try {
      setLoading(true);
      await autoCreateComplianceItems();
      await fetchData();
    } catch {
      await fetchData().catch(() => {});
      // Only alert if we still have nothing after attempting creation
      if (complianceItems.length === 0) {
        Alert.alert(
          tc.setupRequiredTitle || "Setup Required",
          tc.setupRequiredBody ||
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
      // API returns { success, data: { item: {...} } } — unwrap correctly
      const item = result?.data?.item || result?.data || result;
      setLoading(false);
      if (item?.id) {
        // Navigate immediately; useFocusEffect will refresh the list on return
        navigation.navigate("ComplianceItemDetail", { item });
      } else {
        // Item created but no id returned — just refresh
        await fetchData();
      }
    } catch {
      setLoading(false);
      Alert.alert(
        t.common?.error || "Error",
        t.provider?.createComplianceItemFailed ||
          "Could not create compliance item. Please try again.",
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const info = getComplianceStatusLabel(status);
    const labelMap: Record<string, string | undefined> = {
      VERIFIED: tc.itemStatusVerified,
      PROVIDED_UNVERIFIED: tc.itemStatusUnderReview,
      COMPLIANCE_PENDING: tc.itemStatusPending,
      NOT_APPLICABLE: tc.itemStatusNA,
      EXPIRED: tc.itemStatusExpired,
    };
    const label = labelMap[status] || info.label;
    return (
      <View style={[styles.badge, { backgroundColor: info.color + "20" }]}>
        <Text style={[styles.badgeText, { color: info.color }]}>
          {label}
        </Text>
      </View>
    );
  };

  const getInsuranceBadge = (status: string) => {
    const info = getInsuranceStatusLabel(status);
    const labelMap: Record<string, string | undefined> = {
      INS_VERIFIED: tc.insStatusVerified,
      INS_PROVIDED_UNVERIFIED: tc.insStatusUnderReview,
      INS_NOT_PROVIDED: tc.insStatusNotProvided,
      INS_EXPIRED: tc.insStatusExpired,
    };
    const label = labelMap[status] || info.label;
    return (
      <View style={[styles.badge, { backgroundColor: info.color + "20" }]}>
        <Text style={[styles.badgeText, { color: info.color }]}>
          {label}
        </Text>
      </View>
    );
  };

  const localizedComplianceTitle = (item: ComplianceItem) => {
    const raw = getComplianceDisplayName(item, requiredItems);
    const loc = (tc as any)[`complianceType_${item.type}`] as string | undefined;
    if (loc && raw === COMPLIANCE_TYPE_LABELS[item.type]) return loc;
    return loc || raw;
  };

  const businessTypeLabel =
    (businessType &&
      (((tc as any)[`biz_${businessType}`] as string | undefined) ||
        providerComplianceString(`biz_${businessType}`, language))) ||
    businessType ||
    undefined;

  const getOverallBadge = () => {
    const map: Record<string, { label: string; color: string; icon: string }> =
      {
        VERIFIED: {
          label: tc.overallVerified || "Verified",
          color: "#16a34a",
          icon: "shield-checkmark",
        },
        PENDING: {
          label: tc.overallPending || "Pending",
          color: "#d97706",
          icon: "time",
        },
        RESTRICTED: {
          label: tc.overallRestricted || "Restricted",
          color: "#dc2626",
          icon: "warning",
        },
        NOT_ELIGIBLE: {
          label: tc.overallNotEligible || "Not Eligible",
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
          <Text style={styles.headerTitle}>
            {tc.screenTitle || "Compliance & Licensing"}
          </Text>
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
        <Text style={styles.headerTitle}>
          {tc.screenTitle || "Compliance & Licensing"}
        </Text>
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
          <Text style={styles.sectionTitle}>
            {tc.overallStatusTitle || "Overall Status"}
          </Text>
          {getOverallBadge()}
          {jurisdiction && (
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'center' }}>
              {jurisdiction.stateName}{jurisdiction.countyName ? ` · ${jurisdiction.countyName}${tc.countySuffix || " County"}` : ''}
              {jurisdiction.isActiveState ? '' : (tc.stateNotActive || " (State not yet active)")}
            </Text>
          )}
          {businessType && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 6 }}>
              <Ionicons name="business-outline" size={14} color="#6b7280" />
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                {interpolate(
                  tc.businessHint || "{{type}} · Requirements shown below",
                  { type: businessTypeLabel || businessType || "" },
                )}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.taxNoticeCard}>
          <View style={styles.guideHeader}>
            <Ionicons name="receipt-outline" size={18} color="#1d4ed8" />
            <Text style={styles.taxNoticeTitle}>
              {tc.taxNoticeTitle || "Marketplace tax collection"}
            </Text>
          </View>
          <Text style={styles.taxNoticeText}>
            {tc.taxNoticeBody ||
              "TechTrust collects applicable Florida marketplace sales tax on taxable parts and supplies, stores the tax records, and prepares reporting through QuickBooks. Do not add sales tax on top of your quote price; enter parts, labor, fees, and supplies separately so tax is calculated at checkout."}
          </Text>
        </View>

        {/* Compliance Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {tc.sectionComplianceItems || "Compliance Items"}
            </Text>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={handleManageCompliance}
            >
              <Text style={styles.manageBtnText}>
                {complianceItems.length === 0
                  ? tc.setUp || "Set Up"
                  : tc.manage || "Manage"}
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
                    {tc.floridaRequirementsTitle || "Florida Requirements"}
                    {businessType
                      ? (tc.floridaRequirementsTitleSuffix || " · {{type}}").replace(
                          "{{type}}",
                          businessTypeLabel || businessType,
                        )
                      : ""}
                  </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                    {tc.floridaTapHint || "Tap each item to upload your documents."}
                    {!businessType
                      ? ` ${tc.floridaSetShopHint || "Set your shop type in Settings → Edit Profile for tailored requirements."}`
                      : ""}
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
                          <Text style={{ fontSize: 10, color: '#dc2626', fontWeight: '600' }}>
                            {tc.required || "Required"}
                          </Text>
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
                <Text style={styles.emptyText}>
                  {tc.emptyNoItems || "No compliance items yet"}
                </Text>
                <Text style={styles.emptySubtext}>
                  {isFloridaProvider
                    ? tc.emptySubFl ||
                      "Tap a requirement above to upload documents, or use Set Up to generate all items at once"
                    : tc.emptySubGeneral ||
                      "Tap Set Up to generate required items for your location"}
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
                    {localizedComplianceTitle(item)}
                  </Text>
                  {getStatusBadge(item.status)}
                </View>
                {(item.registrationNumber || item.licenseNumber) && (
                  <Text style={styles.cardDetail}>
                    {tc.regNumber || "Reg #:"}{" "}
                    {item.registrationNumber || item.licenseNumber}
                  </Text>
                )}
                {item.expirationDate && (
                  <Text style={styles.cardDetail}>
                    {tc.expires || "Expires:"}{" "}
                    {formatDate(item.expirationDate)}
                  </Text>
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardFooterText}>
                    {interpolate(
                      tc.documentsUploaded ||
                        "{{count}} document(s) uploaded",
                      { count: item.documentUploads?.length || 0 },
                    )}
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
            <Text style={styles.sectionTitle}>
              {tc.sectionInsurance || "Insurance Coverage"}
            </Text>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => navigation.navigate("InsuranceManagement")}
            >
              <Text style={styles.manageBtnText}>{tc.manage || "Manage"}</Text>
              <Ionicons name="chevron-forward" size={16} color="#2B5EA7" />
            </TouchableOpacity>
          </View>

          {insuranceRequirements.length > 0 && (
            <View style={styles.insuranceGuideCard}>
              <View style={styles.guideHeader}>
                <Ionicons name="shield-checkmark" size={18} color="#92400e" />
                <Text style={styles.guideTitle}>
                  {tc.guideRequiredServices || "Required for your services"}
                </Text>
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
                      {item.level === "REQUIRED"
                        ? tc.required || "Required"
                        : tim.recommended || "Recommended"}
                    </Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={styles.guideAction}
                onPress={() => navigation.navigate("InsuranceManagement")}
              >
                <Text style={styles.guideActionText}>
                  {tc.guideManageInsurance || "Manage insurance guide"}
                </Text>
                <Ionicons name="chevron-forward" size={15} color="#92400e" />
              </TouchableOpacity>
            </View>
          )}

          {insurancePolicies.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="shield-outline" size={32} color="#9ca3af" />
              <Text style={styles.emptyText}>
                {tc.noPoliciesDeclared || "No insurance policies declared"}
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate("InsuranceManagement")}
              >
                <Text style={styles.addButtonText}>
                  {tc.declareInsurance || "Declare Insurance"}
                </Text>
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
                    {(tim.typeLabels && tim.typeLabels[policy.type]) ||
                      INSURANCE_TYPE_LABELS[policy.type] ||
                      policy.type}
                  </Text>
                  {getInsuranceBadge(policy.status)}
                </View>
                {policy.hasCoverage && policy.carrierName && (
                  <Text style={styles.cardDetail}>
                    {tc.carrier || "Carrier:"} {policy.carrierName}
                  </Text>
                )}
                {!policy.hasCoverage && (
                  <Text style={[styles.cardDetail, { color: "#d97706" }]}>
                    {tc.noCoverageDeclared || "No coverage declared"}
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
                {interpolate(
                  tc.viewAllPolicies || "View all {{count}} policies",
                  { count: insurancePolicies.length },
                )}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Technicians */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {tc.sectionTechnicians || "Technicians"}
            </Text>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => navigation.navigate("TechnicianManagement")}
            >
              <Text style={styles.manageBtnText}>{tc.manage || "Manage"}</Text>
              <Ionicons name="chevron-forward" size={16} color="#2B5EA7" />
            </TouchableOpacity>
          </View>

          {technicians.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={32} color="#9ca3af" />
              <Text style={styles.emptyText}>
                {tc.noTechnicians || "No technicians registered"}
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate("TechnicianManagement")}
              >
                <Text style={styles.addButtonText}>
                  {tc.addTechnician || "Add Technician"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            technicians
              .filter((tech) => tech.isActive)
              .slice(0, 3)
              .map((tech) => (
                <View key={tech.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="person" size={20} color="#2B5EA7" />
                    <Text style={styles.cardTitle}>{tech.fullName}</Text>
                    {getStatusBadge(tech.epa609Status)}
                  </View>
                  <Text style={styles.cardDetail}>
                    {(
                      {
                        LEAD_TECHNICIAN: tm.roleLeadTechnician,
                        TECHNICIAN: tm.roleTechnician,
                        APPRENTICE: tm.roleApprentice,
                        HELPER: tm.roleHelper,
                        OTHER_ROLE: tm.roleOther,
                      } as Record<string, string | undefined>
                    )[tech.role] || tech.role.replace(/_/g, " ")}
                  </Text>
                  {tech.epa609CertNumber && (
                    <Text style={styles.cardDetail}>
                      {tc.epaPrefix || "EPA 609:"} {tech.epa609CertNumber}
                    </Text>
                  )}
                </View>
              ))
          )}
        </View>

        {/* Service Gating */}
        {Object.keys(serviceGating).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {tc.sectionServiceEligibility || "Service Eligibility"}
            </Text>
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
                    {(tc as any)[`service_${service}`] ||
                      providerComplianceString(`service_${service}`, language) ||
                      service.replace(/_/g, " ")}
                  </Text>
                  {!gate.allowed && gate.reason && (() => {
                    const GL_SOFT_CODES = new Set(['GENERAL_LIABILITY_NOT_PROVIDED', 'GENERAL_LIABILITY_EXPIRED']);
                    const hardReasons = gate.reason.split(', ').filter(c => !GL_SOFT_CODES.has(c));
                    return hardReasons.length > 0 ? (
                      <Text style={styles.gateReason}>
                        {hardReasons.map(c =>
                          (tc as any)[`reason_${c}`] ||
                          providerComplianceString(`reason_${c}`, language) ||
                          c.replace(/_/g, ' ').toLowerCase(),
                        ).join(' · ')}
                      </Text>
                    ) : null;
                  })()}
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
