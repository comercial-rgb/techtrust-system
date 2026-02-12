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
  upsertInsurancePolicy,
  getInsuranceStatusLabel,
  INSURANCE_TYPE_LABELS,
  InsurancePolicy,
} from "../../services/compliance.service";
import api from "../../services/api";

const ALL_INSURANCE_TYPES = [
  "GENERAL_LIABILITY",
  "GARAGE_LIABILITY",
  "GARAGE_KEEPERS",
  "COMMERCIAL_AUTO",
  "ON_HOOK",
  "WORKERS_COMP",
  "PROFESSIONAL_LIABILITY",
];

export default function InsuranceManagementScreen({ navigation }: any) {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
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
        coverageAmount: string;
        coiUploads: string[];
      }
    >
  >({});

  const fetchData = useCallback(async () => {
    try {
      const res = await getInsurancePolicies();
      if (res.success) {
        const fetched: InsurancePolicy[] = res.data.policies || [];
        setPolicies(fetched);

        // Initialize form state from existing policies
        const formState: typeof forms = {};
        ALL_INSURANCE_TYPES.forEach((type) => {
          const existing = fetched.find((p) => p.type === type);
          formState[type] = {
            hasCoverage: existing?.hasCoverage || false,
            carrierName: existing?.carrierName || "",
            policyNumber: existing?.policyNumber || "",
            expirationDate: existing?.expirationDate
              ? new Date(existing.expirationDate).toISOString().split("T")[0]
              : "",
            coverageAmount: existing?.coverageAmount
              ? String(existing.coverageAmount)
              : "",
            coiUploads: existing?.coiUploads || [],
          };
        });
        setForms(formState);
      }
    } catch (error) {
      console.error("Error fetching insurance:", error);
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
      Alert.alert("Error", "Failed to upload");
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async (type: string) => {
    const form = forms[type];
    if (!form) return;

    if (form.hasCoverage && (!form.carrierName || !form.policyNumber)) {
      Alert.alert(
        "Missing Info",
        "Carrier name and policy number are required when coverage is declared.",
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
        coverageAmount: form.coverageAmount
          ? parseFloat(form.coverageAmount)
          : undefined,
        coiUploads: form.coiUploads.length > 0 ? form.coiUploads : undefined,
      });
      await fetchData();
      Alert.alert("Success", `${INSURANCE_TYPE_LABELS[type]} updated`);
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.message || "Failed to save");
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
          <Text style={styles.headerTitle}>Insurance Coverage</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1976d2" />
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
        <Text style={styles.headerTitle}>Insurance Coverage</Text>
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
          Declare your insurance coverage for each type. Upload a Certificate of
          Insurance (COI) for verification.
        </Text>

        {ALL_INSURANCE_TYPES.map((type) => {
          const existing = policies.find((p) => p.type === type);
          const form = forms[type];
          const isExpanded = expandedType === type;
          const statusInfo = existing
            ? getInsuranceStatusLabel(existing.status)
            : null;

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
                    {INSURANCE_TYPE_LABELS[type]}
                  </Text>
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
                  {/* Coverage Toggle */}
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>I have this coverage</Text>
                    <Switch
                      value={form.hasCoverage}
                      onValueChange={(v) => updateForm(type, "hasCoverage", v)}
                      trackColor={{ false: "#d1d5db", true: "#bbdefb" }}
                      thumbColor={form.hasCoverage ? "#1976d2" : "#f4f3f4"}
                    />
                  </View>

                  {form.hasCoverage && (
                    <>
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>
                          Carrier / Insurer Name *
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={form.carrierName}
                          onChangeText={(v) =>
                            updateForm(type, "carrierName", v)
                          }
                          placeholder="e.g., State Farm"
                          placeholderTextColor="#9ca3af"
                        />
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Policy Number *</Text>
                        <TextInput
                          style={styles.input}
                          value={form.policyNumber}
                          onChangeText={(v) =>
                            updateForm(type, "policyNumber", v)
                          }
                          placeholder="e.g., POL-12345"
                          placeholderTextColor="#9ca3af"
                        />
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Expiration Date</Text>
                        <TextInput
                          style={styles.input}
                          value={form.expirationDate}
                          onChangeText={(v) =>
                            updateForm(type, "expirationDate", v)
                          }
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="#9ca3af"
                        />
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>
                          Coverage Amount ($)
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={form.coverageAmount}
                          onChangeText={(v) =>
                            updateForm(type, "coverageAmount", v)
                          }
                          placeholder="e.g., 1000000"
                          placeholderTextColor="#9ca3af"
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>
                          Certificate of Insurance (COI)
                        </Text>
                        {form.coiUploads.map((url, i) => (
                          <View key={i} style={styles.docRow}>
                            <Ionicons
                              name="document-attach"
                              size={16}
                              color="#1976d2"
                            />
                            <Text style={styles.docText}>
                              COI Document {i + 1}
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
                            <ActivityIndicator size="small" color="#1976d2" />
                          ) : (
                            <>
                              <Ionicons
                                name="cloud-upload"
                                size={18}
                                color="#1976d2"
                              />
                              <Text style={styles.uploadText}>Upload COI</Text>
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
                      <Text style={styles.saveBtnText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

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
  cardBody: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
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
  docText: { flex: 1, fontSize: 12, color: "#1976d2" },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#1976d2",
    borderStyle: "dashed",
  },
  uploadText: { fontSize: 13, fontWeight: "600", color: "#1976d2" },
  saveBtn: {
    backgroundColor: "#1976d2",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
