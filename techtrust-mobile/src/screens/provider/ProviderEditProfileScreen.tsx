/**
 * ProviderEditProfileScreen - Editar Perfil do Fornecedor
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useI18n } from "../../i18n";
import { useAuth } from "../../contexts/AuthContext";

export default function ProviderEditProfileScreen({ navigation }: any) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState(
    user?.providerProfile?.businessName || "",
  );
  const [description, setDescription] = useState(
    user?.providerProfile?.description || "",
  );
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [website, setWebsite] = useState(user?.providerProfile?.website || "");
  const [address, setAddress] = useState(user?.providerProfile?.address || "");
  const [cnpj, setCnpj] = useState(user?.providerProfile?.cpfCnpj || "");
  const [fdacsNumber, setFdacsNumber] = useState(
    user?.providerProfile?.fdacsRegistrationNumber || "",
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!businessName.trim() || !phone.trim() || !email.trim()) {
      Alert.alert(
        t.common?.error || "Error",
        t.common?.fillRequiredFields || "Please fill in all required fields",
      );
      return;
    }

    setSaving(true);
    try {
      const api = (await import("../../services/api")).default;
      await api.patch("/providers/profile", {
        businessName: businessName.trim(),
        description: description.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        address: address.trim(),
        fdacsRegistrationNumber: fdacsNumber.trim() || undefined,
      });
      Alert.alert(
        t.common?.success || "Success",
        t.provider?.profileUpdated || "Profile updated successfully!",
      );
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        t.common?.error || "Error",
        t.common?.saveFailed || "Could not save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.provider?.editProfile || "Edit Profile"}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveBtn, saving && styles.saveBtnDisabled]}>
            {saving
              ? t.common?.saving || "Saving..."
              : t.common?.save || "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="store" size={48} color="#1976d2" />
          </View>
          <TouchableOpacity style={styles.changeLogoBtn}>
            <MaterialCommunityIcons name="camera" size={16} color="#1976d2" />
            <Text style={styles.changeLogoText}>
              {t.provider?.changeLogo || "Change Logo"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>
            {t.provider?.businessInfo || "Business Information"}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t.provider?.businessName || "Business Name"} *
            </Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder={
                t.provider?.businessNamePlaceholder || "Your business name"
              }
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t.common?.description || "Description"}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={
                t.provider?.descriptionPlaceholder ||
                "Describe your business..."
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.provider?.taxId || "Tax ID"}</Text>
            <TextInput
              style={styles.input}
              value={cnpj}
              onChangeText={setCnpj}
              placeholder="00.000.000/0000-00"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{"FDACS Registration #"}</Text>
            <TextInput
              style={styles.input}
              value={fdacsNumber}
              onChangeText={setFdacsNumber}
              placeholder="MV-00000"
              autoCapitalize="characters"
            />
            <Text style={styles.helperText}>
              {"Required for FL motor vehicle repair shops"}
            </Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>
            {t.common?.contact || "Contact"}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.common?.phone || "Phone"} *</Text>
            <View style={styles.inputWithIcon}>
              <MaterialCommunityIcons name="phone" size={20} color="#6b7280" />
              <TextInput
                style={styles.inputIcon}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 (000) 000-0000"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.common?.email || "Email"} *</Text>
            <View style={styles.inputWithIcon}>
              <MaterialCommunityIcons name="email" size={20} color="#6b7280" />
              <TextInput
                style={styles.inputIcon}
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.common?.website || "Website"}</Text>
            <View style={styles.inputWithIcon}>
              <MaterialCommunityIcons name="web" size={20} color="#6b7280" />
              <TextInput
                style={styles.inputIcon}
                value={website}
                onChangeText={setWebsite}
                placeholder="www.seusite.com"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>
            {t.common?.address || "Address"}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t.provider?.fullAddress || "Full Address"}
            </Text>
            <View style={styles.inputWithIcon}>
              <MaterialCommunityIcons
                name="map-marker"
                size={20}
                color="#6b7280"
              />
              <TextInput
                style={styles.inputIcon}
                value={address}
                onChangeText={setAddress}
                placeholder={
                  t.provider?.addressPlaceholder ||
                  "Street, number, city, state"
                }
              />
            </View>
          </View>

          <TouchableOpacity style={styles.mapButton}>
            <MaterialCommunityIcons name="map" size={20} color="#1976d2" />
            <Text style={styles.mapButtonText}>
              {t.provider?.adjustOnMap || "Adjust on Map"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Verification Status */}
        <View style={styles.verificationCard}>
          <View style={styles.verificationIcon}>
            <MaterialCommunityIcons
              name="check-decagram"
              size={24}
              color="#10b981"
            />
          </View>
          <View style={styles.verificationInfo}>
            <Text style={styles.verificationTitle}>
              {t.provider?.verifiedAccount || "Verified Account"}
            </Text>
            <Text style={styles.verificationSubtitle}>
              {t.provider?.verifiedDescription ||
                "Your business has been verified and is ready to receive orders"}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1976d2",
    padding: 8,
  },
  saveBtnDisabled: {
    color: "#9ca3af",
  },
  logoSection: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#fff",
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  changeLogoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  changeLogoText: {
    fontSize: 14,
    color: "#1976d2",
    fontWeight: "500",
  },
  formSection: {
    backgroundColor: "#fff",
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
  },
  textArea: {
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "right",
    marginTop: 4,
  },
  helperText: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputIcon: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1976d2",
    borderStyle: "dashed",
    gap: 8,
  },
  mapButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1976d2",
  },
  verificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  verificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  verificationInfo: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#065f46",
  },
  verificationSubtitle: {
    fontSize: 13,
    color: "#047857",
    marginTop: 2,
  },
});
