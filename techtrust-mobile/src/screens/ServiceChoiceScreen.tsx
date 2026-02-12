/**
 * ServiceChoiceScreen - Choose between Request Service or Diagnostic/Estimate
 * Presented when user taps "+ Add", FAB, or "Need a service?" card
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../i18n";

export default function ServiceChoiceScreen({ navigation }: any) {
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.serviceChoice?.title || "How can we help?"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        {t.serviceChoice?.subtitle ||
          "Choose the option that best fits your needs"}
      </Text>

      {/* Cards */}
      <View style={styles.cardsContainer}>
        {/* Request Service Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => {
            navigation.replace("CreateRequest");
          }}
        >
          <View style={[styles.iconCircle, { backgroundColor: "#e0f2fe" }]}>
            <Ionicons name="construct" size={32} color="#0284c7" />
          </View>
          <Text style={styles.cardTitle}>
            {t.serviceChoice?.requestService || "Request Service"}
          </Text>
          <Text style={styles.cardDescription}>
            {t.serviceChoice?.requestServiceDesc ||
              "Already know what you need? Request quotes from certified providers in your area. Compare prices and choose the best option."}
          </Text>
          <View style={[styles.cardButton, { backgroundColor: "#0284c7" }]}>
            <Text style={styles.cardButtonText}>
              {t.serviceChoice?.getQuotes || "Get Quotes"}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Diagnostic / Estimate Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => {
            navigation.replace("ScheduleAppointment");
          }}
        >
          <View style={[styles.iconCircle, { backgroundColor: "#f0fdf4" }]}>
            <Ionicons name="search" size={32} color="#16a34a" />
          </View>
          <Text style={styles.cardTitle}>
            {t.serviceChoice?.diagnostic || "Diagnostic & Estimate"}
          </Text>
          <Text style={styles.cardDescription}>
            {t.serviceChoice?.diagnosticDesc ||
              "Not sure what's wrong? Schedule a diagnostic visit. A certified technician will inspect your vehicle and provide a written estimate."}
          </Text>
          <View style={[styles.cardButton, { backgroundColor: "#16a34a" }]}>
            <Text style={styles.cardButtonText}>
              {t.serviceChoice?.scheduleDiagnostic || "Schedule Visit"}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 8,
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 20,
  },
  cardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  cardButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
