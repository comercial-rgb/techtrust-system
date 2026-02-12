/**
 * ScheduleAppointmentScreen - Schedule a diagnostic/estimate visit
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../i18n";
import * as fdacsService from "../../services/fdacs.service";

let DateTimePicker: any = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch (e) {
  // Package not installed - fallback to text input
}

export default function ScheduleAppointmentScreen({ route, navigation }: any) {
  const { serviceRequestId, providerId, vehicleId } = route.params || {};
  const { t } = useI18n();

  const [date, setDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [diagnosticFee, setDiagnosticFee] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!serviceDescription.trim()) {
      Alert.alert(t.common.required, t.fdacs.pleaseDescribeService);
      return;
    }
    if (!location.trim()) {
      Alert.alert(t.common.required, t.fdacs.pleaseProvideLocation);
      return;
    }

    try {
      setSubmitting(true);
      await fdacsService.scheduleAppointment({
        serviceRequestId,
        providerId,
        vehicleId,
        scheduledDate: date.toISOString(),
        address: location.trim(),
        serviceDescription: serviceDescription.trim(),
        diagnosticFee: diagnosticFee ? parseFloat(diagnosticFee) : undefined,
        customerNotes: notes.trim() || undefined,
      });
      Alert.alert(t.common.success, t.fdacs.appointmentScheduled, [
        { text: t.common.ok, onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert(
        t.common.error,
        error?.response?.data?.message || t.fdacs.failedToSchedule,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const onDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      );
      setDate(newDate);
    }
  };

  const onTimeChange = (_: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      setDate(newDate);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>{t.fdacs.scheduleAppointment}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>{t.fdacs.serviceDescriptionRequired}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t.fdacs.serviceDescriptionPlaceholder}
            value={serviceDescription}
            onChangeText={setServiceDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Date & Time */}
        <View style={styles.field}>
          <Text style={styles.label}>{t.fdacs.dateTime}</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={[styles.dateBtn, { flex: 1 }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#1976d2" />
              <Text style={styles.dateBtnText}>
                {date.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateBtn, { flex: 1 }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={18} color="#1976d2" />
              <Text style={styles.dateBtnText}>
                {date.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {DateTimePicker && (showDatePicker || showTimePicker) && (
          <DateTimePicker
            value={date}
            mode={showDatePicker ? "date" : "time"}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={showDatePicker ? onDateChange : onTimeChange}
            minimumDate={new Date()}
          />
        )}

        {/* Location */}
        <View style={styles.field}>
          <Text style={styles.label}>{t.fdacs.locationRequired}</Text>
          <TextInput
            style={styles.input}
            placeholder={t.fdacs.locationPlaceholder}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* Diagnostic Fee */}
        <View style={styles.field}>
          <Text style={styles.label}>{t.fdacs.diagnosticFeeInput}</Text>
          <TextInput
            style={styles.input}
            placeholder={t.fdacs.diagnosticFeePlaceholder}
            value={diagnosticFee}
            onChangeText={setDiagnosticFee}
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>{t.fdacs.diagnosticFeeHint}</Text>
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>{t.fdacs.additionalNotes}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t.fdacs.additionalNotesPlaceholder}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* FDACS Info */}
        <View style={styles.fdacsInfo}>
          <Ionicons name="information-circle" size={20} color="#1976d2" />
          <Text style={styles.fdacsText}>{t.fdacs.fdacsScheduleInfo}</Text>
        </View>
      </ScrollView>

      {/* Submit */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="calendar-outline" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>
                {t.fdacs.scheduleAppointment}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  textArea: { minHeight: 80 },
  hint: { fontSize: 12, color: "#6b7280", marginTop: 6, fontStyle: "italic" },
  dateTimeRow: { flexDirection: "row", gap: 10 },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateBtnText: { fontSize: 15, color: "#111827" },
  fdacsInfo: {
    flexDirection: "row",
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  fdacsText: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 18 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1976d2",
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
