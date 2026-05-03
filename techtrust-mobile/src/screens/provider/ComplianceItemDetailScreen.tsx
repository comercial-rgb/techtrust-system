/**
 * ComplianceItemDetailScreen - View/edit a single compliance item
 * Upload documents, set registration number, expiration date
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import {
  upsertComplianceItem,
  getComplianceStatusLabel,
  COMPLIANCE_TYPE_LABELS,
} from "../../services/compliance.service";
import api from "../../services/api";
import { log } from "../../utils/logger";
import { useI18n } from "../../i18n";
import { interpolate } from "../../i18n/interpolate";

export default function ComplianceItemDetailScreen({ route, navigation }: any) {
  const { t, formatDate } = useI18n();
  const tc = (t as any).providerCompliance || {};
  const ci = t.complianceItem || ({} as NonNullable<typeof t.complianceItem>);
  const { item } = route.params;
  const [registrationNumber, setRegistrationNumber] = useState(
    item.registrationNumber || "",
  );
  const [expirationDate, setExpirationDate] = useState(
    item.expirationDate
      ? new Date(item.expirationDate).toISOString().split("T")[0]
      : "",
  );
  const [documentUploads, setDocumentUploads] = useState<string[]>(
    item.documentUploads || [],
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const statusBase = getComplianceStatusLabel(item.status);
  const statusLabelMap: Record<string, string | undefined> = {
    VERIFIED: tc.itemStatusVerified,
    PROVIDED_UNVERIFIED: tc.itemStatusUnderReview,
    COMPLIANCE_PENDING: tc.itemStatusPending,
    NOT_APPLICABLE: tc.itemStatusNA,
    EXPIRED: tc.itemStatusExpired,
  };
  const statusInfo = {
    ...statusBase,
    label: statusLabelMap[item.status] || statusBase.label,
  };

  const handleUploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets[0];

      setUploading(true);
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        type: file.mimeType || "application/octet-stream",
        name: file.name || "document",
      } as any);

      const uploadRes = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (uploadRes.data?.url) {
        setDocumentUploads((prev) => [...prev, uploadRes.data.url]);
        Alert.alert(
          t.complianceItem?.documentUploadedTitle || "Success",
          t.complianceItem?.documentUploadedBody || "Document uploaded",
        );
      }
    } catch (error: any) {
      Alert.alert(
        t.common?.error || "Error",
        t.complianceItem?.uploadDocumentFailed || "Failed to upload document",
      );
      log.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await upsertComplianceItem({
        type: item.type,
        registrationNumber: registrationNumber || undefined,
        expirationDate: expirationDate || undefined,
        documentUploads,
        technicianId: item.technicianId || undefined,
      });
      Alert.alert(
        t.complianceItem?.itemUpdatedTitle || "Success",
        t.complianceItem?.itemUpdatedBody || "Compliance item updated",
        [{ text: t.common?.ok || "OK", onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert(
        t.common?.error || "Error",
        error?.response?.data?.message || t.complianceItem?.saveFailed || "Failed to save",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeDocument = (index: number) => {
    Alert.alert(
      t.complianceItem?.removeDocumentTitle || "Remove Document",
      t.complianceItem?.removeDocumentMessage || "Are you sure?",
      [
      { text: t.common?.cancel || "Cancel", style: "cancel" },
      {
        text: t.common?.remove || "Remove",
        style: "destructive",
        onPress: () =>
          setDocumentUploads((prev) => prev.filter((_, i) => i !== index)),
      },
    ],
    );
  };

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
          {(tc as any)[`complianceType_${item.type}`] ||
            COMPLIANCE_TYPE_LABELS[item.type] ||
            item.type}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>
            {ci.currentStatus || "Current Status"}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusInfo.color + "20" },
            ]}
          >
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
          {item.lastVerifiedAt && (
            <Text style={styles.verifiedDate}>
              {interpolate(
                ci.lastVerifiedLine || "Last verified: {{date}}",
                { date: formatDate(item.lastVerifiedAt) },
              )}
            </Text>
          )}
        </View>

        {/* Registration Number */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            {item.type === "FDACS_MOTOR_VEHICLE_REPAIR"
              ? ci.labelFdacsRegNumber || "FDACS Registration Number"
              : ci.labelLicenseRegNumber || "License/Registration Number"}
          </Text>
          <TextInput
            style={styles.input}
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
            placeholder={ci.regPlaceholder || "Enter registration number"}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Expiration Date */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            {ci.expirationLabel || "Expiration Date"}
          </Text>
          <TextInput
            style={styles.input}
            value={expirationDate}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, "").slice(0, 8);
              let formatted = digits;
              if (digits.length > 2)
                formatted = digits.slice(0, 2) + "/" + digits.slice(2);
              if (digits.length > 4)
                formatted =
                  digits.slice(0, 2) +
                  "/" +
                  digits.slice(2, 4) +
                  "/" +
                  digits.slice(4);
              setExpirationDate(formatted);
            }}
            placeholder={ci.datePlaceholder || "MM/DD/YYYY"}
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            maxLength={10}
          />
          <Text style={styles.fieldHint}>
            {ci.expirationHint ||
              "Format: MM/DD/YYYY (e.g., 12/31/2026)"}
          </Text>
        </View>

        {/* Documents */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            {ci.supportingDocsTitle || "Supporting Documents"}
          </Text>
          <Text style={styles.fieldHint}>
            {ci.supportingDocsHint ||
              "Upload license, registration, or certificate images/PDFs"}
          </Text>

          {documentUploads.map((url, index) => (
            <View key={index} style={styles.documentRow}>
              <Ionicons name="document-attach" size={18} color="#2B5EA7" />
              <Text style={styles.documentText} numberOfLines={1}>
                {interpolate(ci.documentNumber || "Document {{index}}", {
                  index: index + 1,
                })}
              </Text>
              <TouchableOpacity onPress={() => removeDocument(index)}>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={handleUploadDocument}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#2B5EA7" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#2B5EA7" />
                <Text style={styles.uploadBtnText}>
                  {ci.uploadDocument || "Upload Document"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {ci.saveChanges || "Save Changes"}
            </Text>
          )}
        </TouchableOpacity>

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
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    flex: 1,
    textAlign: "center",
  },
  content: { flex: 1, padding: 16 },
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  statusLabel: { fontSize: 13, color: "#6b7280", marginBottom: 8 },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 15, fontWeight: "700" },
  verifiedDate: { fontSize: 12, color: "#9ca3af", marginTop: 8 },
  field: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 6,
  },
  fieldHint: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1f2937",
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f7ff",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  documentText: { flex: 1, fontSize: 13, color: "#2B5EA7" },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#2B5EA7",
    borderStyle: "dashed",
  },
  uploadBtnText: { fontSize: 14, fontWeight: "600", color: "#2B5EA7" },
  saveBtn: {
    backgroundColor: "#2B5EA7",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
