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

export default function ComplianceItemDetailScreen({ route, navigation }: any) {
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

  const statusInfo = getComplianceStatusLabel(item.status);

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
        Alert.alert("Success", "Document uploaded");
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to upload document");
      console.error("Upload error:", error);
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
      Alert.alert("Success", "Compliance item updated", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const removeDocument = (index: number) => {
    Alert.alert("Remove Document", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          setDocumentUploads((prev) => prev.filter((_, i) => i !== index)),
      },
    ]);
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
          {COMPLIANCE_TYPE_LABELS[item.type] || item.type}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current Status</Text>
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
              Last verified:{" "}
              {new Date(item.lastVerifiedAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Registration Number */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            {item.type === "FDACS_MOTOR_VEHICLE_REPAIR"
              ? "FDACS Registration Number"
              : "License/Registration Number"}
          </Text>
          <TextInput
            style={styles.input}
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
            placeholder="Enter registration number"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Expiration Date */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Expiration Date</Text>
          <TextInput
            style={styles.input}
            value={expirationDate}
            onChangeText={setExpirationDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.fieldHint}>
            Format: YYYY-MM-DD (e.g., 2026-12-31)
          </Text>
        </View>

        {/* Documents */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Supporting Documents</Text>
          <Text style={styles.fieldHint}>
            Upload license, registration, or certificate images/PDFs
          </Text>

          {documentUploads.map((url, index) => (
            <View key={index} style={styles.documentRow}>
              <Ionicons name="document-attach" size={18} color="#1976d2" />
              <Text style={styles.documentText} numberOfLines={1}>
                Document {index + 1}
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
              <ActivityIndicator size="small" color="#1976d2" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#1976d2" />
                <Text style={styles.uploadBtnText}>Upload Document</Text>
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
            <Text style={styles.saveBtnText}>Save Changes</Text>
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
  documentText: { flex: 1, fontSize: 13, color: "#1976d2" },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#1976d2",
    borderStyle: "dashed",
  },
  uploadBtnText: { fontSize: 14, fontWeight: "600", color: "#1976d2" },
  saveBtn: {
    backgroundColor: "#1976d2",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
