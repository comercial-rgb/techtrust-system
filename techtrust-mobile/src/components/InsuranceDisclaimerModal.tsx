/**
 * InsuranceDisclaimerModal - Customer must accept before proceeding with uninsured provider
 * Records acceptance in UserRiskAcceptanceLog for audit trail
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { acceptRiskDisclaimer } from "../../services/compliance.service";
import { Platform } from "react-native";

interface Props {
  visible: boolean;
  providerId: string;
  providerName: string;
  serviceType: string;
  disclaimerText?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function InsuranceDisclaimerModal({
  visible,
  providerId,
  providerName,
  serviceType,
  disclaimerText,
  onAccept,
  onDecline,
}: Props) {
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const defaultDisclaimer = `This provider (${providerName}) does not have verified insurance coverage on file for this service. By proceeding, you acknowledge and agree that:

1. The TechTrust platform does not provide insurance and is not responsible for any damages, loss, or liability arising from services performed by this provider.

2. You are proceeding at your own risk and understand that the provider may not carry adequate insurance to cover potential damages to your vehicle or property.

3. TechTrust recommends only using providers with verified insurance coverage for your protection.

4. This acceptance will be recorded for audit and compliance purposes.`;

  const handleAccept = async () => {
    if (!accepted) {
      Alert.alert(
        "Required",
        "You must check the acknowledgment box to proceed.",
      );
      return;
    }

    try {
      setSubmitting(true);
      await acceptRiskDisclaimer({
        providerId,
        serviceType,
        deviceInfo: `${Platform.OS} ${Platform.Version}`,
      });
      onAccept();
    } catch (error: any) {
      Alert.alert(
        "Error",
        "Failed to record your acknowledgment. Please try again.",
      );
      console.error("Risk acceptance error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.warningIcon}>
              <Ionicons name="warning" size={28} color="#d97706" />
            </View>
            <Text style={styles.title}>Insurance Notice</Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.disclaimerText}>
              {disclaimerText || defaultDisclaimer}
            </Text>
          </ScrollView>

          {/* Checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAccepted(!accepted)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>
              I understand and accept the risks of proceeding without verified
              insurance coverage
            </Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
              <Text style={styles.declineBtnText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, !accepted && styles.acceptBtnDisabled]}
              onPress={handleAccept}
              disabled={!accepted || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.acceptBtnText}>Proceed</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 34,
  },
  header: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 12,
    paddingHorizontal: 24,
  },
  warningIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fffbeb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  content: {
    paddingHorizontal: 24,
    maxHeight: 280,
  },
  disclaimerText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#2B5EA7",
    borderColor: "#2B5EA7",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  declineBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#d97706",
    alignItems: "center",
  },
  acceptBtnDisabled: {
    opacity: 0.5,
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
