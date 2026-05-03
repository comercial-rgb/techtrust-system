/**
 * TechnicianManagementScreen - Manage technicians & EPA 609 certs
 */

import React, { useState, useCallback, useMemo } from "react";
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
import { log } from "../../utils/logger";
import { useI18n } from "../../i18n";
import { interpolate } from "../../i18n/interpolate";

export default function TechnicianManagementScreen({ navigation }: any) {
  const { t, formatDate } = useI18n();
  const tc = (t as any).providerCompliance || {};
  const tm = (t as any).technicianManagement || {};

  const roleOptions = useMemo(
    () => [
      {
        value: "LEAD_TECHNICIAN",
        label: tm.roleLeadTechnician || "Lead Technician",
      },
      { value: "TECHNICIAN", label: tm.roleTechnician || "Technician" },
      { value: "APPRENTICE", label: tm.roleApprentice || "Apprentice" },
      { value: "HELPER", label: tm.roleHelper || "Helper" },
      { value: "OTHER_ROLE", label: tm.roleOther || "Other" },
    ],
    [tm],
  );

  const epaCertTypes = useMemo(
    () => [
      { value: "TYPE_I", label: tm.epaTypeI || "Type I - Small Appliances" },
      { value: "TYPE_II", label: tm.epaTypeII || "Type II - High-Pressure" },
      { value: "TYPE_III", label: tm.epaTypeIII || "Type III - Low-Pressure" },
      { value: "UNIVERSAL", label: tm.epaUniversal || "Universal" },
    ],
    [tm],
  );
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("TECHNICIAN");
  const [dateOfHire, setDateOfHire] = useState("");
  const [driversLicenseNumber, setDriversLicenseNumber] = useState("");
  const [driversLicenseState, setDriversLicenseState] = useState("FL");
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
      log.error("Error fetching technicians:", error);
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
    setDateOfHire("");
    setDriversLicenseNumber("");
    setDriversLicenseState("FL");
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
    setDateOfHire((tech as any).dateOfHire ? new Date((tech as any).dateOfHire).toISOString().split("T")[0] : "");
    setDriversLicenseNumber((tech as any).driversLicenseNumber || "");
    setDriversLicenseState((tech as any).driversLicenseState || "FL");
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
      Alert.alert(
        t.common?.error || "Error",
        t.provider?.technicianPhotoUploadFailed || "Failed to upload",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert(
        t.common?.error || "Error",
        t.provider?.technicianNameRequired || "Technician name is required",
      );
      return;
    }

    try {
      setSaving(true);
      const data = {
        fullName: fullName.trim(),
        role,
        dateOfHire: dateOfHire || undefined,
        driversLicenseNumber: driversLicenseNumber || undefined,
        driversLicenseState: driversLicenseState || undefined,
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
        t.common?.success || "Success",
        editingTech
          ? t.provider?.technicianUpdated || "Technician updated"
          : t.provider?.technicianAdded || "Technician added",
      );
    } catch (error: any) {
      Alert.alert(
        t.common?.error || "Error",
        error?.response?.data?.message || t.provider?.technicianSaveFailed || "Failed to save",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (tech: Technician) => {
    Alert.alert(
      t.provider?.technicianDeactivateTitle || "Deactivate Technician",
      (t.provider?.technicianDeactivateMessage || "Remove {{name}}?").replace(
        /\{\{\s*name\s*\}\}/g,
        tech.fullName,
      ),
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t.provider?.technicianDeactivateButton || "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              await deactivateTechnician(tech.id);
              await fetchData();
            } catch (error) {
              Alert.alert(
                t.common?.error || "Error",
                t.provider?.technicianDeactivateFailed || "Failed to deactivate",
              );
            }
          },
        },
      ],
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
            {tm.title || "Technicians"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2B5EA7" />
        </View>
      </SafeAreaView>
    );
  }

  const activeTechs = technicians.filter((tech) => tech.isActive);
  const inactiveTechs = technicians.filter((tech) => !tech.isActive);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tm.title || "Technicians"}</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#2B5EA7" />
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
        {/* Why technicians matter — Florida compliance context */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={18} color="#1d4ed8" />
            <Text style={styles.infoTitle}>
              {tm.infoWhyTitle || "Why register technicians?"}
            </Text>
          </View>
          <Text style={styles.infoText}>
            {tm.infoWhyBody1 ||
              "Florida law requires each technician who handles regulated refrigerants (A/C service) to hold an active EPA 609 certificate — and your shop must be able to produce it on inspection. Operating without a certified tech can result in FDACS fines and service restrictions."}
          </Text>
          <Text style={[styles.infoText, { marginTop: 6 }]}>
            {tm.infoWhyBody2 ||
              "Workers' compensation becomes mandatory once you employ 4 or more people (including part-time). Registering technicians here lets TechTrust track your team size, trigger the right compliance requirements, and display trust badges to customers."}
          </Text>
        </View>

        {activeTechs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={40} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {tm.emptyText || "No technicians added yet"}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={openAddModal}>
              <Text style={styles.primaryBtnText}>
                {tm.addTechnician || "Add Technician"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          activeTechs.map((tech) => {
            const statusBase = getComplianceStatusLabel(tech.epa609Status);
            const statusLabelMap: Record<string, string | undefined> = {
              VERIFIED: tc.itemStatusVerified,
              PROVIDED_UNVERIFIED: tc.itemStatusUnderReview,
              COMPLIANCE_PENDING: tc.itemStatusPending,
              NOT_APPLICABLE: tc.itemStatusNA,
              EXPIRED: tc.itemStatusExpired,
            };
            const statusInfo = {
              ...statusBase,
              label: statusLabelMap[tech.epa609Status] || statusBase.label,
            };
            return (
              <TouchableOpacity
                key={tech.id}
                style={styles.card}
                onPress={() => openEditModal(tech)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={24} color="#2B5EA7" />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{tech.fullName}</Text>
                    <Text style={styles.cardRole}>
                      {roleOptions.find((r) => r.value === tech.role)?.label ||
                        tech.role}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeactivate(tech)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                {/* EPA 609 Info */}
                <View style={styles.certSection}>
                  <Text style={styles.certLabel}>
                    {tm.labelEpa609Status || "EPA 609 Status"}
                  </Text>
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
                    {interpolate(tm.certNumberLine || "Cert #: {{number}}", {
                      number: tech.epa609CertNumber,
                    })}
                  </Text>
                )}
                {tech.epa609CertType && (
                  <Text style={styles.certDetail}>
                    {interpolate(tm.typeLine || "Type: {{type}}", {
                      type:
                        epaCertTypes.find((ct) => ct.value === tech.epa609CertType)
                          ?.label || tech.epa609CertType,
                    })}
                  </Text>
                )}
                {tech.epa609CertExpiry && (
                  <Text style={styles.certDetail}>
                    {interpolate(tm.expiresLine || "Expires: {{date}}", {
                      date: formatDate(tech.epa609CertExpiry),
                    })}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })
        )}

        {inactiveTechs.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionLabel}>
              {interpolate(
                tm.sectionInactiveCount || "Inactive ({{count}})",
                { count: inactiveTechs.length },
              )}
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
                    <Text style={styles.cardRole}>
                      {tm.inactive || "Inactive"}
                    </Text>
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
              <Text style={styles.cancelBtn}>
                {tm.cancel || "Cancel"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingTech
                ? tm.modalEditTitle || "Edit Technician"
                : tm.modalAddTitle || "Add Technician"}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#2B5EA7" />
              ) : (
                <Text style={styles.saveBtn}>{tm.save || "Save"}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {tm.fieldFullName || "Full Name *"}
              </Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder={tm.placeholderFullName || "John Doe"}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {tm.fieldRole || "Role"}
              </Text>
              <View style={styles.roleGrid}>
                {roleOptions.map((r) => (
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

            <Text style={styles.sectionLabel}>
              {tm.sectionEmployment || "Employment Information (Florida)"}
            </Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {tm.fieldDateOfHire || "Date of Hire"}
              </Text>
              <TextInput
                style={styles.input}
                value={dateOfHire}
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
                  setDateOfHire(formatted);
                }}
                placeholder={tm.datePlaceholder || "MM/DD/YYYY"}
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {tm.fieldDriversLicense || "Driver's License Number"}
              </Text>
              <TextInput
                style={styles.input}
                value={driversLicenseNumber}
                onChangeText={setDriversLicenseNumber}
                placeholder={tm.placeholderDl || "e.g., A123-456-78-900"}
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {tm.fieldLicenseState || "License Issuing State"}
              </Text>
              <TextInput
                style={styles.input}
                value={driversLicenseState}
                onChangeText={(v) => setDriversLicenseState(v.toUpperCase().slice(0, 2))}
                placeholder={tm.placeholderState || "FL"}
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>

            <Text style={styles.sectionLabel}>
              {tm.sectionEpa609 || "EPA 609 Certification"}
            </Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {tm.fieldCertNumber || "Certificate Number"}
              </Text>
              <TextInput
                style={styles.input}
                value={epa609CertNumber}
                onChangeText={setEpa609CertNumber}
                placeholder={tm.placeholderEpa || "e.g., EPA-609-12345"}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {tm.fieldCertType || "Certification Type"}
              </Text>
              <View style={styles.roleGrid}>
                {epaCertTypes.map((ct) => (
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
              <Text style={styles.fieldLabel}>
                {tm.fieldCertExpiry || "Expiration Date"}
              </Text>
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
                placeholder={tm.datePlaceholder || "MM/DD/YYYY"}
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {tm.fieldCertUpload || "Certificate Upload"}
              </Text>
              {epa609CertUploads.map((url, i) => (
                <View key={i} style={styles.docRow}>
                  <Ionicons name="document-attach" size={18} color="#2B5EA7" />
                  <Text style={styles.docText}>
                    {interpolate(tm.certFileLabel || "Certificate {{index}}", {
                      index: i + 1,
                    })}
                  </Text>
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
                  <ActivityIndicator size="small" color="#2B5EA7" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color="#2B5EA7" />
                    <Text style={styles.uploadText}>
                      {tm.uploadCertificate || "Upload Certificate"}
                    </Text>
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
    backgroundColor: "#2B5EA7",
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
  saveBtn: { fontSize: 15, color: "#2B5EA7", fontWeight: "700" },
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
  roleChipActive: { borderColor: "#2B5EA7", backgroundColor: "#e8f0fe" },
  roleChipText: { fontSize: 13, color: "#6b7280" },
  roleChipTextActive: { color: "#2B5EA7", fontWeight: "600" },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0f7ff",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  docText: { flex: 1, fontSize: 13, color: "#2B5EA7" },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#2B5EA7",
    borderStyle: "dashed",
  },
  uploadText: { fontSize: 13, fontWeight: "600", color: "#2B5EA7" },
  infoCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  infoHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  infoTitle: { fontSize: 14, fontWeight: "700", color: "#1d4ed8" },
  infoText: { fontSize: 12, color: "#1e3a8a", lineHeight: 18 },
});
