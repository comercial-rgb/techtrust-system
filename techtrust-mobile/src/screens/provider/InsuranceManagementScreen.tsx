/**
 * InsuranceManagementScreen - Declare & manage all 7 insurance types
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import {
  getInsurancePolicies,
  getInsuranceRequirements,
  upsertInsurancePolicy,
  getInsuranceStatusLabel,
  INSURANCE_TYPE_LABELS,
  InsurancePolicy,
  InsuranceRequirement,
} from "../../services/compliance.service";
import api from "../../services/api";
import { log } from "../../utils/logger";
import { useI18n } from "../../i18n";
import { interpolate } from "../../i18n/interpolate";

const ALL_INSURANCE_TYPES = [
  "GENERAL_LIABILITY",
  "GARAGE_LIABILITY",
  "GARAGE_KEEPERS",
  "COMMERCIAL_AUTO",
  "ON_HOOK",
  "WORKERS_COMP",
  "UMBRELLA_EXCESS",
];

export default function InsuranceManagementScreen({ navigation }: any) {
  const { t } = useI18n();
  const tim = (t as any).insuranceManagement || {};
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [requirements, setRequirements] = useState<InsuranceRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  // Per-type form state
  const [forms, setForms] = useState<
    Record<
      string,
      {
        hasCoverage: boolean;
        carrierName: string;
        policyNumber: string;
        expirationDate: string;
        coverageLimit: string;
        coiUploads: string[];
      }
    >
  >({});

  const fetchData = useCallback(async () => {
    try {
      const [policyRes, requirementRes] = await Promise.all([
        getInsurancePolicies(),
        getInsuranceRequirements().catch(() => null),
      ]);
      if (requirementRes?.success) {
        setRequirements(requirementRes.data?.requirements || []);
      }
      if (policyRes.success) {
        const fetched: InsurancePolicy[] = policyRes.data.policies || [];
        setPolicies(fetched);

        // Initialize form state from existing policies
        const formState: typeof forms = {};
        const visibleTypes = Array.from(
          new Set([
            ...(requirementRes?.data?.requirements || []).map((item: InsuranceRequirement) => item.type),
            ...ALL_INSURANCE_TYPES,
          ]),
        );
        visibleTypes.forEach((type) => {
          const existing = fetched.find((p) => p.type === type);
          formState[type] = {
            hasCoverage: existing?.hasCoverage || false,
            carrierName: existing?.carrierName || "",
            policyNumber: existing?.policyNumber || "",
            expirationDate: existing?.expirationDate
              ? new Date(existing.expirationDate).toISOString().split("T")[0]
              : "",
            coverageLimit: existing?.coverageLimit || "",
            coiUploads: existing?.coiUploads || [],
          };
        });
        setForms(formState);
      }
    } catch (error) {
      log.error("Error fetching insurance:", error);
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

  const updateForm = (type: string, field: string, value: any) => {
    setForms((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const typeLabel = (ty: string) =>
    (tim.typeLabels && tim.typeLabels[ty]) || INSURANCE_TYPE_LABELS[ty] || ty;

  const explainFor = (ty: string) =>
    tim.typeExplain?.[ty] as
      | { description?: string; threshold?: string; minLimit?: string; badge?: string }
      | undefined;

  const localizeInsStatus = (status: string) => {
    const base = getInsuranceStatusLabel(status);
    const m: Record<string, string | undefined> = {
      INS_VERIFIED: tim.insStatusVerified,
      INS_PROVIDED_UNVERIFIED: tim.insStatusUnderReview,
      INS_NOT_PROVIDED: tim.insStatusNotProvided,
      INS_EXPIRED: tim.insStatusExpired,
    };
    return { ...base, label: m[status] || base.label };
  };

  const handleUpload = async (type: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];

      setUploading(type);
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        type: file.mimeType || "application/octet-stream",
        name: file.name || "coi",
      } as any);

      const uploadRes = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (uploadRes.data?.url) {
        updateForm(type, "coiUploads", [
          ...(forms[type]?.coiUploads || []),
          uploadRes.data.url,
        ]);
      }
    } catch (error) {
      Alert.alert(
        t.common?.error || "Error",
        tim.uploadFailed || t.insuranceManagement?.uploadFailed || "Failed to upload",
      );
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async (type: string) => {
    const form = forms[type];
    if (!form) return;

    if (
      form.hasCoverage &&
      form.coiUploads.length === 0 &&
      (!form.carrierName || !form.policyNumber || !form.expirationDate)
    ) {
      Alert.alert(
        t.insuranceManagement?.missingInfoTitle || "Missing Info",
        t.insuranceManagement?.missingInfoBody ||
          "Add carrier, policy number, expiration date, or upload a COI.",
      );
      return;
    }

    try {
      setSaving(type);
      await upsertInsurancePolicy({
        type,
        hasCoverage: form.hasCoverage,
        carrierName: form.carrierName || undefined,
        policyNumber: form.policyNumber || undefined,
        expirationDate: form.expirationDate || undefined,
        coverageLimit: form.coverageLimit || undefined,
        coiUploads: form.coiUploads.length > 0 ? form.coiUploads : undefined,
      });
      await fetchData();
      const label = typeLabel(type);
      const successMsg = interpolate(
        tim.policyUpdated ||
          t.insuranceManagement?.policyUpdated ||
          "{{label}} updated",
        { label },
      );
      Alert.alert(t.common?.success || "Success", successMsg);
    } catch (error: any) {
      Alert.alert(
        t.common?.error || "Error",
        error?.response?.data?.message || t.insuranceManagement?.saveFailed || "Failed to save",
      );
    } finally {
      setSaving(null);
    }
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
            {tim.screenTitle || t.insuranceManagement?.screenTitle || "Insurance Coverage"}
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
          {tim.screenTitle || t.insuranceManagement?.screenTitle || "Insurance Coverage"}
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
        <Text style={styles.infoText}>
          {tim.introInfo ||
            t.insuranceManagement?.introInfo ||
            "Insurance requirements are tailored to your services. Required coverage becomes visible to customers when missing, provided, or verified."}
        </Text>

        {Array.from(new Set([...requirements.map((item) => item.type), ...ALL_INSURANCE_TYPES])).map((type) => {
          const existing = policies.find((p) => p.type === type);
          const requirement = requirements.find((item) => item.type === type);
          const form = forms[type];
          const isExpanded = expandedType === type;
          const statusInfo = existing
            ? localizeInsStatus(existing.status)
            : null;
          const expl = explainFor(type);

          return (
            <View key={type} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpandedType(isExpanded ? null : type)}
              >
                <Ionicons
                  name={
                    form?.hasCoverage ? "shield-checkmark" : "shield-outline"
                  }
                  size={22}
                  color={form?.hasCoverage ? "#16a34a" : "#9ca3af"}
                />
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.cardTitle}>
                    {typeLabel(type)}
                  </Text>
                  {requirement && (
                    <View
                      style={[
                        styles.requirementBadge,
                        requirement.level === "REQUIRED"
                          ? styles.requiredBadge
                          : styles.recommendedBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.requirementBadgeText,
                          requirement.level === "REQUIRED"
                            ? styles.requiredBadgeText
                            : styles.recommendedBadgeText,
                        ]}
                      >
                        {requirement.level === "REQUIRED"
                          ? tim.required || "Required"
                          : tim.recommended || "Recommended"}
                      </Text>
                    </View>
                  )}
                  {statusInfo && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: statusInfo.color + "20" },
                      ]}
                    >
                      <Text
                        style={[styles.badgeText, { color: statusInfo.color }]}
                      >
                        {statusInfo.label}
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>

              {isExpanded && form && (
                <View style={styles.cardBody}>
                  {/* Per-type explanation */}
                  {expl && (
                    <View style={styles.explanationCard}>
                      <Text style={styles.explanationText}>
                        {expl.description}
                      </Text>
                      {expl.threshold && (
                        <View style={styles.thresholdRow}>
                          <Ionicons name="information-circle" size={14} color="#92400e" />
                          <Text style={styles.thresholdText}>
                            {expl.threshold}
                          </Text>
                        </View>
                      )}
                      {expl.minLimit && (
                        <View style={styles.thresholdRow}>
                          <Ionicons name="shield-checkmark" size={14} color="#166534" />
                          <Text style={[styles.thresholdText, { color: '#166534' }]}>
                            {expl.minLimit}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {requirement && (
                    <View style={styles.requirementInfo}>
                      <Text style={styles.requirementReason}>
                        {requirement.reason}
                      </Text>
                      {!!requirement.customerVisibleBadge && (
                        <Text style={styles.customerBadgeText}>
                          {tim.customerBadgePrefix || "Customer badge:"}{" "}
                          {requirement.customerVisibleBadge}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Coverage Toggle */}
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>
                      {tim.iHaveCoverage || "I have this coverage"}
                    </Text>
                    <Switch
                      value={form.hasCoverage}
                      onValueChange={(v) => updateForm(type, "hasCoverage", v)}
                      trackColor={{ false: "#d1d5db", true: "#bbdefb" }}
                      thumbColor={form.hasCoverage ? "#2B5EA7" : "#f4f3f4"}
                    />
                  </View>

                  {form.hasCoverage && (
                    <>
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>
                          {tim.carrierLabel || "Carrier / Insurer Name *"}
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={form.carrierName}
                          onChangeText={(v) =>
                            updateForm(type, "carrierName", v)
                          }
                          placeholder={tim.carrierPlaceholder || "e.g., State Farm"}
                          placeholderTextColor="#9ca3af"
                        />
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>
                          {tim.policyNumberLabel || "Policy Number *"}
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={form.policyNumber}
                          onChangeText={(v) =>
                            updateForm(type, "policyNumber", v)
                          }
                          placeholder={tim.policyNumberPlaceholder || "e.g., POL-12345"}
                          placeholderTextColor="#9ca3af"
                        />
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>
                          {tim.expirationDateLabel || "Expiration Date"}
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={form.expirationDate}
                          onChangeText={(v) => {
                            const digits = v.replace(/\D/g, "").slice(0, 8);
                            let formatted = digits;
                            if (digits.length > 2)
                              formatted =
                                digits.slice(0, 2) + "/" + digits.slice(2);
                            if (digits.length > 4)
                              formatted =
                                digits.slice(0, 2) +
                                "/" +
                                digits.slice(2, 4) +
                                "/" +
                                digits.slice(4);
                            updateForm(type, "expirationDate", formatted);
                          }}
                          placeholder={tim.expirationPlaceholder || "MM/DD/YYYY"}
                          placeholderTextColor="#9ca3af"
                          keyboardType="numeric"
                          maxLength={10}
                        />
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>
                          {tim.coverageLimitLabel || "Coverage Limit"}
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={form.coverageLimit}
                          onChangeText={(v) =>
                            updateForm(type, "coverageLimit", v)
                          }
                          placeholder={tim.coverageLimitPlaceholder || "$1,000,000 / $2,000,000 agg"}
                          placeholderTextColor="#9ca3af"
                        />
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>
                          {tim.coiLabel || "Certificate of Insurance (COI)"}
                        </Text>
                        {form.coiUploads.map((url, i) => (
                          <View key={i} style={styles.docRow}>
                            <Ionicons
                              name="document-attach"
                              size={16}
                              color="#2B5EA7"
                            />
                            <Text style={styles.docText}>
                              {interpolate(
                                tim.coiDocument || "COI Document {{n}}",
                                { n: i + 1 },
                              )}
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                const newUploads = form.coiUploads.filter(
                                  (_, idx) => idx !== i,
                                );
                                updateForm(type, "coiUploads", newUploads);
                              }}
                            >
                              <Ionicons
                                name="close-circle"
                                size={18}
                                color="#ef4444"
                              />
                            </TouchableOpacity>
                          </View>
                        ))}
                        <TouchableOpacity
                          style={styles.uploadBtn}
                          onPress={() => handleUpload(type)}
                          disabled={uploading === type}
                        >
                          {uploading === type ? (
                            <ActivityIndicator size="small" color="#2B5EA7" />
                          ) : (
                            <>
                              <Ionicons
                                name="cloud-upload"
                                size={18}
                                color="#2B5EA7"
                              />
                              <Text style={styles.uploadText}>
                                {tim.uploadCoi || "Upload COI"}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={() => handleSave(type)}
                    disabled={saving === type}
                  >
                    {saving === type ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>
                        {tim.save || "Save"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* Insurance Partners Banner */}
        <View style={styles.adBanner}>
          <View style={styles.adBannerHeader}>
            <Ionicons name="shield-checkmark" size={18} color="#1d4ed8" />
            <Text style={styles.adBannerTitle}>
              {tim.adBannerTitle || "Need coverage? Get a quote."}
            </Text>
          </View>
          <Text style={styles.adBannerText}>
            {tim.adBannerBody ||
              "TechTrust partners with licensed Florida insurance agents who specialize in automotive business coverage. Get quotes for GL, Garage Keepers, Workers Comp, and commercial auto in minutes."}
          </Text>
          <View style={styles.adPartnerRow}>
            <View style={styles.adPartnerChip}>
              <Text style={styles.adPartnerName}>
                {tim.adPartner1 || "Progressive Commercial"}
              </Text>
            </View>
            <View style={styles.adPartnerChip}>
              <Text style={styles.adPartnerName}>
                {tim.adPartner2 || "Nationwide Business"}
              </Text>
            </View>
            <View style={styles.adPartnerChip}>
              <Text style={styles.adPartnerName}>
                {tim.adPartner3 || "State Farm Business"}
              </Text>
            </View>
          </View>
          <Text style={styles.adDisclaimer}>
            {tim.adDisclaimer ||
              "TechTrust is not an insurance agent or broker. Provider names shown are for reference only. Always verify coverage directly with your carrier."}
          </Text>
        </View>

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
  infoText: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 10,
  },
  cardTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  requirementBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  requiredBadge: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  recommendedBadge: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  requirementBadgeText: { fontSize: 9, fontWeight: "800" },
  requiredBadgeText: { color: "#dc2626" },
  recommendedBadgeText: { color: "#2563eb" },
  cardBody: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  requirementInfo: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  requirementReason: { fontSize: 12, color: "#92400e", lineHeight: 18 },
  customerBadgeText: { fontSize: 11, color: "#a16207", marginTop: 4 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  switchLabel: { fontSize: 14, color: "#1f2937", fontWeight: "500" },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f2937",
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0f7ff",
    padding: 10,
    borderRadius: 6,
    marginTop: 6,
  },
  docText: { flex: 1, fontSize: 12, color: "#2B5EA7" },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#2B5EA7",
    borderStyle: "dashed",
  },
  uploadText: { fontSize: 13, fontWeight: "600", color: "#2B5EA7" },
  saveBtn: {
    backgroundColor: "#2B5EA7",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  explanationCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  explanationText: { fontSize: 12, color: "#0c4a6e", lineHeight: 18, marginBottom: 6 },
  thresholdRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 4 },
  thresholdText: { flex: 1, fontSize: 11, color: "#92400e", lineHeight: 16 },
  adBanner: {
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  adBannerHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  adBannerTitle: { fontSize: 15, fontWeight: "700", color: "#1d4ed8" },
  adBannerText: { fontSize: 12, color: "#1e3a8a", lineHeight: 18, marginBottom: 12 },
  adPartnerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  adPartnerChip: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  adPartnerName: { fontSize: 12, color: "#1d4ed8", fontWeight: "600" },
  adDisclaimer: { fontSize: 10, color: "#6b7280", lineHeight: 14, fontStyle: "italic" },
});
