/**
 * PersonalInfoScreen - Dados Pessoais do Cliente
 * Edição de informações pessoais
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActionSheetIOS,
  Modal,
  FlatList,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../i18n";
import {
  getBiometricInfo,
  isBiometricLoginEnabled,
  setBiometricLoginEnabled,
  authenticateWithBiometric,
  storeCredentials,
  disableBiometricLogin,
  BiometricInfo,
} from "../../services/authService";
import * as ImagePicker from "expo-image-picker";

// Generate arrays for date picker
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const YEARS = Array.from({ length: 100 }, (_, i) =>
  (new Date().getFullYear() - i).toString(),
);
const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

export default function PersonalInfoScreen({ navigation }: any) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState("1990");
  const [selectedMonth, setSelectedMonth] = useState("0");
  const [selectedDay, setSelectedDay] = useState("1");

  // Biometric states
  const [biometricInfo, setBiometricInfoState] = useState<BiometricInfo | null>(
    null,
  );
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // D30 — Active Sessions state
  interface SessionData {
    id: string;
    deviceName: string;
    deviceType: string;
    ipAddress?: string;
    location?: string;
    lastActiveAt: string;
    isCurrentSession: boolean;
  }
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    cpf: "",
    birthDate: "",
    gender: "",
    address: "",
    dateOfBirth: "",
  });

  useEffect(() => {
    checkBiometricStatus();
    loadUserProfile();
    loadSessions();
  }, []);

  // D30 — Load active sessions from backend
  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const api = (await import('../../services/api')).default;
      const res = await api.get('/users/me/sessions');
      setSessions(res.data?.data || []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const revokeSession = async (sessionId?: string) => {
    try {
      const api = (await import('../../services/api')).default;
      if (sessionId) {
        await api.post('/users/me/sessions/revoke', { sessionId });
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        Alert.alert('Session Ended', 'The session has been logged out.');
      } else {
        await api.post('/users/me/sessions/revoke', { revokeAll: true });
        setSessions(prev => prev.filter(s => s.isCurrentSession));
        Alert.alert('Done', 'All other sessions have been logged out.');
      }
    } catch {
      Alert.alert('Error', 'Could not revoke session. Please try again.');
    }
  };

  const loadUserProfile = async () => {
    try {
      const api = (await import("../../services/api")).default;
      const response = await api.get("/users/me");
      // API returns { success: true, data: { user: {...}, subscription: {...} } }
      const responseData = response.data?.data || response.data;
      // user data may be nested under 'user' key or directly on responseData
      const userData = responseData?.user || responseData;

      if (userData) {
        setFormData((prev) => ({
          ...prev,
          fullName: userData.fullName || prev.fullName,
          email: userData.email || prev.email,
          phone: userData.phone || prev.phone,
          address: userData.address || "",
          dateOfBirth: userData.dateOfBirth || "",
          cpf: userData.cpf || "",
          birthDate: userData.dateOfBirth || userData.birthDate || "",
          gender: userData.gender || "",
        }));
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      // Fallback to user context data
      if (user) {
        setFormData((prev) => ({
          ...prev,
          fullName: user.fullName || prev.fullName,
          email: user.email || prev.email,
          phone: (user as any).phone || prev.phone,
        }));
      }
    }
  };

  const checkBiometricStatus = async () => {
    const info = await getBiometricInfo();
    setBiometricInfoState(info);

    const enabled = await isBiometricLoginEnabled();
    setBiometricEnabled(enabled);
  };

  const handleBiometricToggle = async (value: boolean) => {
    setBiometricLoading(true);

    try {
      if (value) {
        // Enable biometric - need to authenticate first
        if (!biometricInfo?.isAvailable || !biometricInfo?.isEnrolled) {
          Alert.alert(
            t.common?.error || "Error",
            t.biometric?.notEnrolled ||
              "No biometric data enrolled. Please set up Face ID or Fingerprint in your device settings.",
          );
          setBiometricLoading(false);
          return;
        }

        const authenticated = await authenticateWithBiometric(
          t.biometric?.confirmToEnable ||
            "Confirm your identity to enable biometric login",
        );

        if (authenticated) {
          // We need to ask for password to store credentials
          Alert.prompt(
            t.biometric?.enableTitle || "Enable Biometric Login",
            t.auth?.enterPassword ||
              "Enter your password to enable biometric login",
            [
              { text: t.common?.cancel || "Cancel", style: "cancel" },
              {
                text: t.common?.confirm || "Confirm",
                onPress: async (password?: string) => {
                  if (password && user?.email) {
                    await storeCredentials(user.email, password);
                    await setBiometricLoginEnabled(true);
                    setBiometricEnabled(true);
                    Alert.alert(
                      t.common?.success || "Success",
                      t.biometric?.enabled || "Biometric login enabled",
                    );
                  }
                  setBiometricLoading(false);
                },
              },
            ],
            "secure-text",
          );
          return;
        } else {
          setBiometricLoading(false);
        }
      } else {
        // Disable biometric
        await disableBiometricLogin();
        setBiometricEnabled(false);
        Alert.alert(
          t.common?.success || "Success",
          t.biometric?.disabled || "Biometric login disabled",
        );
      }
    } catch (error) {
      console.error("Error toggling biometric:", error);
      Alert.alert(
        t.common?.error || "Error",
        t.common?.tryAgain || "Please try again",
      );
    } finally {
      setBiometricLoading(false);
    }
  };

  const getBiometricLabel = () => {
    if (!biometricInfo) return "Biometrics";
    switch (biometricInfo.biometricType) {
      case "facial":
        return Platform.OS === "ios"
          ? "Face ID"
          : t.biometric?.faceRecognition || "Face Recognition";
      case "fingerprint":
        return Platform.OS === "ios"
          ? "Touch ID"
          : t.biometric?.fingerprint || "Fingerprint";
      default:
        return t.biometric?.biometrics || "Biometrics";
    }
  };

  const handleChangePhoto = () => {
    const options = [
      t.profile?.takePhoto || "Take Photo",
      t.profile?.chooseFromLibrary || "Choose from Library",
      t.profile?.removePhoto || "Remove Photo",
      t.common?.cancel || "Cancel",
    ];
    const cancelButtonIndex = 3;
    const destructiveButtonIndex = 2;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
        },
        (buttonIndex) => {
          handlePhotoAction(buttonIndex);
        },
      );
    } else {
      // Android fallback
      Alert.alert(
        t.profile?.changeProfilePhoto || "Change Profile Photo",
        t.profile?.chooseOption || "Choose an option",
        [
          {
            text: t.profile?.takePhoto || "Take Photo",
            onPress: () => handlePhotoAction(0),
          },
          {
            text: t.profile?.chooseFromLibrary || "Choose from Library",
            onPress: () => handlePhotoAction(1),
          },
          {
            text: t.profile?.removePhoto || "Remove Photo",
            onPress: () => handlePhotoAction(2),
            style: "destructive",
          },
          { text: t.common?.cancel || "Cancel", style: "cancel" },
        ],
      );
    }
  };

  const handlePhotoAction = async (index: number) => {
    switch (index) {
      case 0: {
        // D10 — Take Photo with camera
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
          const uri = result.assets[0].uri;
          setProfileImage(uri);
          uploadProfilePhoto(uri);
        }
        break;
      }
      case 1: {
        // D10 — Choose from Library
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery access is required.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
          const uri = result.assets[0].uri;
          setProfileImage(uri);
          uploadProfilePhoto(uri);
        }
        break;
      }
      case 2:
        // Remove Photo
        setProfileImage(null);
        break;
    }
  };

  // D10 — Upload profile photo to server
  const uploadProfilePhoto = async (uri: string) => {
    try {
      const api = (await import("../../services/api")).default;
      const formDataUpload = new FormData();
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formDataUpload.append('photo', { uri, name: filename, type } as any);
      
      await api.post('/users/profile-photo', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error) {
      console.log('Photo upload pending — will sync when API endpoint is ready');
    }
  };

  const handleOpenDatePicker = () => {
    // Parse existing date if available
    if (formData.birthDate) {
      const date = new Date(formData.birthDate);
      if (!isNaN(date.getTime())) {
        setSelectedYear(date.getFullYear().toString());
        setSelectedMonth(date.getMonth().toString());
        setSelectedDay(date.getDate().toString());
      }
    }
    setShowDatePicker(true);
  };

  const handleConfirmDate = () => {
    const date = new Date(
      parseInt(selectedYear),
      parseInt(selectedMonth),
      parseInt(selectedDay),
    );
    setFormData({ ...formData, birthDate: date.toISOString() });
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Import API
      const api = (await import("../../services/api")).default;

      // Prepare update data - including new fields
      const updateData: any = {
        fullName: formData.fullName.trim(),
      };

      // Only include optional fields if they have values
      if (formData.address?.trim()) {
        updateData.address = formData.address.trim();
      }

      if (formData.cpf?.trim()) {
        updateData.cpf = formData.cpf.trim();
      }

      if (formData.birthDate) {
        updateData.dateOfBirth = formData.birthDate;
      }

      if (formData.gender) {
        updateData.gender = formData.gender;
      }

      // Update user profile via API - PATCH /users/me
      await api.patch("/users/me", updateData);

      Alert.alert(
        t.common?.success || "Success",
        t.profile?.infoUpdated || "Your information has been updated.",
      );

      setIsEditing(false);

      // Reload data to confirm it was saved
      await loadUserProfile();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to update information";
      Alert.alert(
        t.common?.error || "Error",
        t.profile?.updateFailed || errorMsg,
      );
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.profile?.personalInfo || "Personal Information"}
        </Text>
        <TouchableOpacity
          onPress={() => setIsEditing(!isEditing)}
          style={styles.editBtn}
        >
          <Ionicons
            name={isEditing ? "close" : "create-outline"}
            size={24}
            color="#2B5EA7"
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={isEditing ? handleChangePhoto : undefined}
              activeOpacity={isEditing ? 0.7 : 1}
            >
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {formData.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {isEditing && (
                <View style={styles.avatarEditOverlay}>
                  <Ionicons name="camera" size={24} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            {isEditing && (
              <TouchableOpacity
                style={styles.changePhotoBtn}
                onPress={handleChangePhoto}
              >
                <Ionicons name="camera" size={16} color="#2B5EA7" />
                <Text style={styles.changePhotoText}>
                  {t.profile?.changePhoto || "Change Photo"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t.profile?.fullName || "Full Name"}
              </Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.fullName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, fullName: text })
                  }
                  placeholder={
                    t.profile?.enterFullName || "Enter your full name"
                  }
                />
              ) : (
                <Text style={styles.inputValue}>{formData.fullName}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t.profile?.email || "Email"}
              </Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) =>
                    setFormData({ ...formData, email: text })
                  }
                  placeholder={t.profile?.enterEmail || "Enter your email"}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <View style={styles.valueWithIcon}>
                  <Text style={styles.inputValue}>{formData.email}</Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#10b981"
                    />
                    <Text style={styles.verifiedText}>
                      {t.common?.verified || "Verified"}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t.profile?.phoneNumber || "Phone Number"}
              </Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phone: text })
                  }
                  placeholder={
                    t.profile?.enterPhoneNumber || "Enter your phone number"
                  }
                  keyboardType="phone-pad"
                />
              ) : (
                <View style={styles.valueWithIcon}>
                  <Text style={styles.inputValue}>{formData.phone}</Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#10b981"
                    />
                    <Text style={styles.verifiedText}>
                      {t.common?.verified || "Verified"}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {language === "pt"
                  ? "CPF"
                  : language === "es"
                    ? "Tax ID"
                    : "SSN"}
              </Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={formData.cpf}
                  onChangeText={(text) => {
                    if (language === "pt") {
                      // CPF: 000.000.000-00
                      const digits = text.replace(/\D/g, "").slice(0, 11);
                      let formatted = digits;
                      if (digits.length > 3)
                        formatted = digits.slice(0, 3) + "." + digits.slice(3);
                      if (digits.length > 6)
                        formatted =
                          digits.slice(0, 3) +
                          "." +
                          digits.slice(3, 6) +
                          "." +
                          digits.slice(6);
                      if (digits.length > 9)
                        formatted =
                          digits.slice(0, 3) +
                          "." +
                          digits.slice(3, 6) +
                          "." +
                          digits.slice(6, 9) +
                          "-" +
                          digits.slice(9);
                      setFormData({ ...formData, cpf: formatted });
                    } else {
                      // SSN: 000-00-0000
                      const digits = text.replace(/\D/g, "").slice(0, 9);
                      let formatted = digits;
                      if (digits.length > 3)
                        formatted = digits.slice(0, 3) + "-" + digits.slice(3);
                      if (digits.length > 5)
                        formatted =
                          digits.slice(0, 3) +
                          "-" +
                          digits.slice(3, 5) +
                          "-" +
                          digits.slice(5);
                      setFormData({ ...formData, cpf: formatted });
                    }
                  }}
                  placeholder={
                    language === "pt"
                      ? "000.000.000-00"
                      : language === "es"
                        ? "Enter your Tax ID"
                        : "000-00-0000"
                  }
                  keyboardType="numeric"
                  maxLength={language === "pt" ? 14 : 11}
                />
              ) : (
                <>
                  <Text style={styles.inputValue}>
                    {formData.cpf
                      ? language === "pt"
                        ? `***.***.*${formData.cpf.replace(/\D/g, "").slice(-3, -2)}${formData.cpf.replace(/\D/g, "").slice(-2, -1)}-${formData.cpf.replace(/\D/g, "").slice(-2)}`
                        : `***-**-${formData.cpf.replace(/\D/g, "").slice(-4)}`
                      : t.profile?.notProvided || "Not provided"}
                  </Text>
                  <Text style={styles.inputHint}>
                    {language === "pt"
                      ? "Por segurança, apenas os últimos 2 dígitos são mostrados"
                      : "For security, only the last 4 digits are shown"}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t.profile?.birthDate || "Birth Date"}
              </Text>
              {isEditing ? (
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={handleOpenDatePicker}
                >
                  <Text style={styles.dateInputText}>
                    {formData.birthDate
                      ? formatDate(formData.birthDate)
                      : t.profile?.selectBirthDate || "Select birth date"}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                </TouchableOpacity>
              ) : (
                <Text style={styles.inputValue}>
                  {formData.birthDate
                    ? formatDate(formData.birthDate)
                    : t.profile?.notProvided || "Not provided"}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t.profile?.gender || "Gender"}
              </Text>
              {isEditing ? (
                <View style={styles.genderOptions}>
                  {["Male", "Female", "Other", "Prefer not to say"].map(
                    (option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.genderOption,
                          formData.gender === option &&
                            styles.genderOptionActive,
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, gender: option })
                        }
                      >
                        <Text
                          style={[
                            styles.genderOptionText,
                            formData.gender === option &&
                              styles.genderOptionTextActive,
                          ]}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              ) : (
                <Text style={styles.inputValue}>{formData.gender}</Text>
              )}
            </View>
          </View>

          {/* Security Section */}
          <View style={styles.securitySection}>
            <Text style={styles.sectionTitle}>
              {t.profile?.security || "Security"}
            </Text>

            <TouchableOpacity style={styles.securityItem}>
              <View style={styles.securityItemLeft}>
                <View
                  style={[styles.securityIcon, { backgroundColor: "#dbeafe" }]}
                >
                  <Ionicons name="lock-closed" size={20} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.securityItemTitle}>
                    {t.profile?.changePassword || "Change Password"}
                  </Text>
                  <Text style={styles.securityItemSubtitle}>
                    {t.profile?.lastChanged || "Last changed 3 months ago"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.securityItem}
              onPress={() => {
                if (biometricInfo?.isAvailable && biometricInfo?.isEnrolled) {
                  handleBiometricToggle(!biometricEnabled);
                } else {
                  Alert.alert(
                    t.common?.error || "Error",
                    t.biometric?.notAvailable ||
                      "Biometric authentication not available on this device",
                  );
                }
              }}
              disabled={biometricLoading}
            >
              <View style={styles.securityItemLeft}>
                <View
                  style={[styles.securityIcon, { backgroundColor: "#d1fae5" }]}
                >
                  <Ionicons name="finger-print" size={20} color="#10b981" />
                </View>
                <View>
                  <Text style={styles.securityItemTitle}>
                    {getBiometricLabel()}
                  </Text>
                  <Text style={styles.securityItemSubtitle}>
                    {biometricEnabled
                      ? t.common?.enabled || "Enabled"
                      : t.common?.disabled || "Disabled"}
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: "#e5e7eb", true: "#86efac" }}
                thumbColor={biometricEnabled ? "#10b981" : "#f4f4f5"}
                disabled={biometricLoading || !biometricInfo?.isAvailable}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.securityItem}>
              <View style={styles.securityItemLeft}>
                <View
                  style={[styles.securityIcon, { backgroundColor: "#fef3c7" }]}
                >
                  <Ionicons name="shield-checkmark" size={20} color="#f59e0b" />
                </View>
                <View>
                  <Text style={styles.securityItemTitle}>
                    {t.profile?.twoFactorAuth || "Two-Factor Authentication"}
                  </Text>
                  <Text style={styles.securityItemSubtitle}>
                    {t.common?.enabled || "Enabled"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* D30 — Login Activity / Active Sessions */}
          <View style={styles.securitySection}>
            <Text style={styles.sectionTitle}>
              {"Active Sessions"}
            </Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, marginTop: -8 }}>
              Devices currently signed in to your account
            </Text>

            {sessionsLoading ? (
              <ActivityIndicator size="small" color="#2B5EA7" style={{ padding: 20 }} />
            ) : sessions.length === 0 ? (
              <Text style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 20 }}>
                No active sessions found
              </Text>
            ) : (
              sessions.map((session) => {
                const getIcon = (type: string) => {
                  if (type === 'mobile') return 'phone-portrait';
                  if (type === 'tablet') return 'tablet-portrait';
                  return 'laptop';
                };
                const getIconColor = (isCurrent: boolean) => isCurrent ? '#10b981' : '#3b82f6';
                const getIconBg = (isCurrent: boolean) => isCurrent ? '#d1fae5' : '#dbeafe';
                const timeAgo = (dateStr: string) => {
                  const diff = Date.now() - new Date(dateStr).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 1) return 'Active now';
                  if (mins < 60) return `${mins} min ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
                  const days = Math.floor(hrs / 24);
                  return `${days} day${days > 1 ? 's' : ''} ago`;
                };

                return (
                  <View
                    key={session.id}
                    style={[
                      styles.securityItem,
                      { borderRadius: 12 },
                      session.isCurrentSession && { borderLeftWidth: 3, borderLeftColor: '#10b981', backgroundColor: '#f0fdf4' },
                    ]}
                  >
                    <View style={styles.securityItemLeft}>
                      <View style={[styles.securityIcon, { backgroundColor: getIconBg(session.isCurrentSession) }]}>
                        <Ionicons name={getIcon(session.deviceType) as any} size={20} color={getIconColor(session.isCurrentSession)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.securityItemTitle}>{session.isCurrentSession ? 'This Device' : session.deviceName}</Text>
                          {session.isCurrentSession && (
                            <View style={{ backgroundColor: '#d1fae5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, color: '#059669', fontWeight: '700' }}>CURRENT</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.securityItemSubtitle}>
                          {session.deviceName}{session.ipAddress ? ` · IP ${session.ipAddress.replace(/\d+$/, 'xx')}` : ''}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                          {session.isCurrentSession ? 'Active now' : `Last active ${timeAgo(session.lastActiveAt)}`}
                        </Text>
                      </View>
                    </View>
                    {!session.isCurrentSession && (
                      <TouchableOpacity
                        style={{ backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                        onPress={() => revokeSession(session.id)}
                      >
                        <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600' }}>Log out</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}

            {sessions.filter(s => !s.isCurrentSession).length > 0 && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6, backgroundColor: '#fef2f2', borderRadius: 12, marginTop: 4 }}
                onPress={() => Alert.alert(
                  'Log Out All Devices',
                  'This will end all sessions except your current device. You will need to log in again on other devices.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Log Out All', style: 'destructive', onPress: () => revokeSession() },
                  ]
                )}
              >
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#ef4444' }}>Log Out All Other Devices</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Delete Account */}
          <TouchableOpacity style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={styles.deleteButtonText}>
              {t.profile?.deleteAccount || "Delete Account"}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Save Button */}
        {isEditing && (
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving
                  ? t.common?.saving || "Saving..."
                  : t.common?.saveChanges || "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerCancel}>
                  {t.common?.cancel || "Cancel"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>
                {t.profile?.selectBirthDate || "Select Birth Date"}
              </Text>
              <TouchableOpacity onPress={handleConfirmDate}>
                <Text style={styles.datePickerDone}>
                  {t.common?.done || "Done"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContent}>
              {/* Month */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>
                  {t.profile?.month || "Month"}
                </Text>
                <ScrollView
                  style={styles.datePickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {MONTHS.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.datePickerItem,
                        selectedMonth === index.toString() &&
                          styles.datePickerItemActive,
                      ]}
                      onPress={() => setSelectedMonth(index.toString())}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          selectedMonth === index.toString() &&
                            styles.datePickerItemTextActive,
                        ]}
                      >
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Day */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>
                  {t.profile?.day || "Day"}
                </Text>
                <ScrollView
                  style={styles.datePickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {DAYS.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.datePickerItem,
                        selectedDay === day && styles.datePickerItemActive,
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          selectedDay === day &&
                            styles.datePickerItemTextActive,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>
                  {t.profile?.year || "Year"}
                </Text>
                <ScrollView
                  style={styles.datePickerScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {YEARS.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.datePickerItem,
                        selectedYear === year && styles.datePickerItemActive,
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          selectedYear === year &&
                            styles.datePickerItemTextActive,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  editBtn: {
    padding: 8,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#fff",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#2B5EA7",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarEditOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "700",
    color: "#fff",
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  changePhotoText: {
    fontSize: 14,
    color: "#2B5EA7",
    fontWeight: "600",
  },
  formContainer: {
    backgroundColor: "#fff",
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  inputValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  inputHint: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  valueWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "500",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  dateInputText: {
    fontSize: 16,
    color: "#111827",
  },
  genderOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genderOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  genderOptionActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#2B5EA7",
  },
  genderOptionText: {
    fontSize: 14,
    color: "#6b7280",
  },
  genderOptionTextActive: {
    color: "#2B5EA7",
    fontWeight: "600",
  },
  securitySection: {
    backgroundColor: "#fff",
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  securityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  securityItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  securityItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  securityItemSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    color: "#ef4444",
    fontWeight: "600",
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  saveButton: {
    backgroundColor: "#2B5EA7",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Date Picker Modal Styles
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  datePickerCancel: {
    fontSize: 16,
    color: "#6b7280",
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2B5EA7",
  },
  datePickerContent: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  datePickerColumn: {
    flex: 1,
    alignItems: "center",
  },
  datePickerLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  datePickerScroll: {
    maxHeight: 200,
  },
  datePickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
  },
  datePickerItemActive: {
    backgroundColor: "#e0f2fe",
  },
  datePickerItemText: {
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
  },
  datePickerItemTextActive: {
    color: "#2B5EA7",
    fontWeight: "600",
  },
});
