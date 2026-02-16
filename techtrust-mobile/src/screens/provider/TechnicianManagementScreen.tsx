/**
 * TechnicianManagementScreen - Manage technicians & EPA 609 certs
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
  Modal,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import {
  getTechnicians,
  addTechnician,
  updateTechnician,
  deactivateTechnician,
  getComplianceStatusLabel,
  Technician,
} from "../../services/compliance.service";
import api from "../../services/api";

const ROLES = [
  { value: "LEAD_TECHNICIAN", label: "Lead Technician" },
  { value: "TECHNICIAN", label: "Technician" },
  { value: "APPRENTICE", label: "Apprentice" },
  { value: "HELPER", label: "Helper" },
  { value: "OTHER_ROLE", label: "Other" },
];

const EPA_CERT_TYPES = [
  { value: "TYPE_I", label: "Type I - Small Appliances" },
  { value: "TYPE_II", label: "Type II - High-Pressure" },
  { value: "TYPE_III", label: "Type III - Low-Pressure" },
  { value: "UNIVERSAL", label: "Universal" },
];

export default function TechnicianManagementScreen({ navigation }: any) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("TECHNICIAN");
  const [epa609CertNumber, setEpa609CertNumber] = useState("");
  const [epa609CertType, setEpa609CertType] = useState("");
  const [epa609CertExpiry, setEpa609CertExpiry] = useState("");
  const [epa609CertUploads, setEpa609CertUploads] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getTechnicians();
      if (res.success) {
        setTechnicians(res.data.technicians || []);
      }
    } catch (error) {
      console.error("Error fetching technicians:", error);
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

  const resetForm = () => {
    setFullName("");
    setRole("TECHNICIAN");
    setEpa609CertNumber("");
    setEpa609CertType("");
    setEpa609CertExpiry("");
    setEpa609CertUploads([]);
    setEditingTech(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (tech: Technician) => {
    setEditingTech(tech);
    setFullName(tech.fullName);
    setRole(tech.role);
    setEpa609CertNumber(tech.epa609CertNumber || "");
    setEpa609CertType(tech.epa609CertType || "");
    setEpa609CertExpiry(
      tech.epa609CertExpiry
        ? new Date(tech.epa609CertExpiry).toISOString().split("T")[0]
        : "",
    );
    setEpa609CertUploads(tech.epa609CertUploads || []);
    setModalVisible(true);
  };

  const handleUpload = async () => {
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
        name: file.name || "cert",
      } as any);

      const uploadRes = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (uploadRes.data?.url) {
        setEpa609CertUploads((prev) => [...prev, uploadRes.data.url]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Technician name is required");
      return;
    }

    try {
      setSaving(true);
      const data = {
        fullName: fullName.trim(),
        role,
        epa609CertNumber: epa609CertNumber || undefined,
        epa609CertType: epa609CertType || undefined,
        epa609CertExpiry: epa609CertExpiry || undefined,
        epa609CertUploads:
          epa609CertUploads.length > 0 ? epa609CertUploads : undefined,
      };

      if (editingTech) {
        await updateTechnician(editingTech.id, data);
      } else {
        await addTechnician(data);
      }

      setModalVisible(false);
      resetForm();
      await fetchData();
      Alert.alert(
        "Success",
        editingTech ? "Technician updated" : "Technician added",
      );
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (tech: Technician) => {
    Alert.alert("Deactivate Technician", `Remove ${tech.fullName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Deactivate",
        style: "destructive",
        onPress: async () => {
          try {
            await deactivateTechnician(tech.id);
            await fetchData();
          } catch (error) {
            Alert.alert("Error", "Failed to deactivate");
          }
        },
      },
    ]);
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
          <Text style={styles.headerTitle}>Technicians</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      </SafeAreaView>
    );
  }

  const activeTechs = technicians.filter((t) => t.isActive);
  const inactiveTechs = technicians.filter((t) => !t.isActive);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Technicians</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#1976d2" />
        </TouchableOpacity>
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
        {activeTechs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={40} color="#9ca3af" />
            <Text style={styles.emptyText}>No technicians added yet</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={openAddModal}>
              <Text style={styles.primaryBtnText}>Add Technician</Text>
            </TouchableOpacity>
          </View>
        ) : (
          activeTechs.map((tech) => {
            const statusInfo = getComplianceStatusLabel(tech.epa609Status);
            return (
              <TouchableOpacity
                key={tech.id}
                style={styles.card}
                onPress={() => openEditModal(tech)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={24} color="#1976d2" />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{tech.fullName}</Text>
                    <Text style={styles.cardRole}>
                      {ROLES.find((r) => r.value === tech.role)?.label ||
                        tech.role}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeactivate(tech)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                {/* EPA 609 Info */}
                <View style={styles.certSection}>
                  <Text style={styles.certLabel}>EPA 609 Status</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusInfo.color + "20" },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: statusInfo.color }]}
                    >
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                {tech.epa609CertNumber && (
                  <Text style={styles.certDetail}>
                    Cert #: {tech.epa609CertNumber}
                  </Text>
                )}
                {tech.epa609CertType && (
                  <Text style={styles.certDetail}>
                    Type:{" "}
                    {EPA_CERT_TYPES.find((t) => t.value === tech.epa609CertType)
                      ?.label || tech.epa609CertType}
                  </Text>
                )}
                {tech.epa609CertExpiry && (
                  <Text style={styles.certDetail}>
                    Expires:{" "}
                    {new Date(tech.epa609CertExpiry).toLocaleDateString()}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })
        )}

        {inactiveTechs.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionLabel}>
              Inactive ({inactiveTechs.length})
            </Text>
            {inactiveTechs.map((tech) => (
              <View key={tech.id} style={[styles.card, { opacity: 0.5 }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: "#f3f4f6" }]}>
                    <Ionicons name="person" size={24} color="#9ca3af" />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: "#9ca3af" }]}>
                      {tech.fullName}
                    </Text>
                    <Text style={styles.cardRole}>Inactive</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
            >
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingTech ? "Edit Technician" : "Add Technician"}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#1976d2" />
              ) : (
                <Text style={styles.saveBtn}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="John Doe"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Role</Text>
              <View style={styles.roleGrid}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[
                      styles.roleChip,
                      role === r.value && styles.roleChipActive,
                    ]}
                    onPress={() => setRole(r.value)}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        role === r.value && styles.roleChipTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.sectionLabel}>EPA 609 Certification</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Certificate Number</Text>
              <TextInput
                style={styles.input}
                value={epa609CertNumber}
                onChangeText={setEpa609CertNumber}
                placeholder="e.g., EPA-609-12345"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Certification Type</Text>
              <View style={styles.roleGrid}>
                {EPA_CERT_TYPES.map((ct) => (
                  <TouchableOpacity
                    key={ct.value}
                    style={[
                      styles.roleChip,
                      epa609CertType === ct.value && styles.roleChipActive,
                    ]}
                    onPress={() => setEpa609CertType(ct.value)}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        epa609CertType === ct.value &&
                          styles.roleChipTextActive,
                      ]}
                    >
                      {ct.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Expiration Date</Text>
              <TextInput
                style={styles.input}
                value={epa609CertExpiry}
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
                  setEpa609CertExpiry(formatted);
                }}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Certificate Upload</Text>
              {epa609CertUploads.map((url, i) => (
                <View key={i} style={styles.docRow}>
                  <Ionicons name="document-attach" size={18} color="#1976d2" />
                  <Text style={styles.docText}>Certificate {i + 1}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      setEpa609CertUploads((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                  >
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#1976d2" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color="#1976d2" />
                    <Text style={styles.uploadText}>Upload Certificate</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  addBtn: { padding: 8 },
  content: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e8f0fe",
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "600", color: "#1f2937" },
  cardRole: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  certSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  certLabel: { fontSize: 13, color: "#6b7280" },
  certDetail: { fontSize: 12, color: "#6b7280", marginTop: 4, marginLeft: 56 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: "700" },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6b7280",
    marginBottom: 8,
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 12,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: "#1976d2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: "#f9fafb" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  cancelBtn: { fontSize: 15, color: "#6b7280" },
  saveBtn: { fontSize: 15, color: "#1976d2", fontWeight: "700" },
  modalContent: { flex: 1, padding: 16 },
  field: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 6,
  },
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
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  roleChipActive: { borderColor: "#1976d2", backgroundColor: "#e8f0fe" },
  roleChipText: { fontSize: 13, color: "#6b7280" },
  roleChipTextActive: { color: "#1976d2", fontWeight: "600" },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0f7ff",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  docText: { flex: 1, fontSize: 13, color: "#1976d2" },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#1976d2",
    borderStyle: "dashed",
  },
  uploadText: { fontSize: 13, fontWeight: "600", color: "#1976d2" },
});
