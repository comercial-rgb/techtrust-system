/**
 * RatingScreen - Rating Screen with Optional Tip
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
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { logos } from "../constants/images";
import { useI18n } from "../i18n";
import api from "../services/api";

const TIP_PRESETS = [5, 10, 15, 20];

export default function RatingScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Tip state
  const [tipAmount, setTipAmount] = useState<number | null>(null);
  const [customTipAmount, setCustomTipAmount] = useState("");
  const [tipMessage, setTipMessage] = useState("");
  const [sendingTip, setSendingTip] = useState(false);

  const { serviceTitle, providerName, serviceDate, workOrderId, providerId } =
    route.params || {};

  const serviceData = {
    title: serviceTitle || t.rating?.serviceCompleted || "Service Completed",
    provider: providerName || t.common?.provider || "Provider",
    date: serviceDate || new Date().toLocaleDateString("en-US"),
  };

  const ratingLabels = [
    "",
    t.rating?.terrible || "Terrible",
    t.rating?.poor || "Poor",
    t.rating?.fair || "Fair",
    t.rating?.good || "Good",
    t.rating?.excellent || "Excellent",
  ];

  const handleSelectTipPreset = (amount: number) => {
    if (tipAmount === amount) {
      setTipAmount(null); // Deselect
    } else {
      setTipAmount(amount);
      setCustomTipAmount("");
    }
  };

  const handleCustomTipChange = (text: string) => {
    setCustomTipAmount(text);
    const parsed = parseFloat(text.replace(",", "."));
    if (!isNaN(parsed) && parsed > 0) {
      setTipAmount(parsed);
    } else if (text === "") {
      setTipAmount(null);
    }
  };

  const sendTip = async () => {
    if (!tipAmount || tipAmount <= 0 || !workOrderId) return;

    setSendingTip(true);
    try {
      await api.post("/tips", {
        workOrderId,
        amount: tipAmount,
        message: tipMessage.trim() || undefined,
        paymentMethod: "wallet",
      });
      return true;
    } catch (err: any) {
      console.log("Tip error:", err?.response?.data?.message);
      // Don't block the review if tip fails
      if (err?.response?.data?.code === "INSUFFICIENT_BALANCE") {
        Alert.alert(
          t.common?.error || "Error",
          t.rating?.insufficientBalance ||
            "Insufficient wallet balance for tip. Review will still be submitted.",
        );
      }
      return false;
    } finally {
      setSendingTip(false);
    }
  };

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert(
        t.common?.error || "Error",
        t.rating?.selectRating || "Please select a rating",
      );
      return;
    }
    setSubmitting(true);
    try {
      // Submit review
      await api.post("/reviews", {
        workOrderId,
        providerId,
        rating,
        comment: comment.trim() || undefined,
      });

      // Send tip if selected (optional, don't block on failure)
      let tipSent = false;
      if (tipAmount && tipAmount > 0) {
        tipSent = (await sendTip()) || false;
      }

      const tipMsg = tipSent
        ? `\n${t.rating?.tipSent || "Tip of"} $${tipAmount?.toFixed(2)} ${t.rating?.tipSentSuccess || "sent successfully!"}`
        : "";

      Alert.alert(
        t.rating?.thankYou || "Thank you!",
        (t.rating?.reviewSubmitted ||
          "Your review has been submitted successfully.") + tipMsg,
        [
          {
            text: t.common?.ok || "OK",
            onPress: () => navigation.navigate("Home"),
          },
        ],
      );
    } catch (err: any) {
      Alert.alert(
        t.common?.error || "Error",
        err?.response?.data?.message || t.common?.tryAgain || "Try again",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.rating?.rateService || "Rate Service"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Brand Logo */}
        <View style={styles.brandContainer}>
          <Image
            source={logos.noText}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        {/* Service Info */}
        <View style={styles.serviceCard}>
          <View style={styles.checkIcon}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
          </View>
          <Text style={styles.serviceTitle}>{serviceData.title}</Text>
          <Text style={styles.serviceProvider}>{serviceData.provider}</Text>
          <Text style={styles.serviceDate}>{serviceData.date}</Text>
        </View>

        {/* Rating Stars */}
        <Text style={styles.ratingQuestion}>
          {t.rating?.howWasExperience || "How was your experience?"}
        </Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={48}
                color={star <= rating ? "#fbbf24" : "#d1d5db"}
              />
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && (
          <Text style={styles.ratingLabel}>{ratingLabels[rating]}</Text>
        )}

        {/* Comment */}
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>
            {t.rating?.leaveComment || "Leave a comment (optional)"}
          </Text>
          <TextInput
            style={styles.commentInput}
            placeholder={
              t.rating?.commentPlaceholder ||
              "Tell us about the service, customer service, quality..."
            }
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={comment}
            onChangeText={setComment}
          />
        </View>

        {/* Quick Tags */}
        <View style={styles.tagsSection}>
          <Text style={styles.tagsTitle}>
            {t.rating?.whatDidYouLike || "What did you like most?"}
          </Text>
          <View style={styles.tagsContainer}>
            {[
              t.rating?.tagCustomerService || "Customer Service",
              t.rating?.tagSpeed || "Speed",
              t.rating?.tagFairPrice || "Fair Price",
              t.rating?.tagQuality || "Quality",
              t.rating?.tagCleanliness || "Cleanliness",
              t.rating?.tagPunctuality || "Punctuality",
            ].map((tag) => (
              <TouchableOpacity key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Optional Tip Section */}
        <View style={styles.tipSection}>
          <View style={styles.tipHeader}>
            <Ionicons name="heart-outline" size={22} color="#10b981" />
            <Text style={styles.tipTitle}>
              {t.rating?.addTip || "Add a Tip"}
            </Text>
            <Text style={styles.tipOptional}>
              ({t.common?.optional || "Optional"})
            </Text>
          </View>
          <Text style={styles.tipDescription}>
            {t.rating?.tipDescription ||
              "Show your appreciation with a tip. 100% goes to the provider."}
          </Text>

          {/* Preset Amounts */}
          <View style={styles.tipPresetsContainer}>
            {TIP_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.tipPresetBtn,
                  tipAmount === preset &&
                    !customTipAmount &&
                    styles.tipPresetBtnSelected,
                ]}
                onPress={() => handleSelectTipPreset(preset)}
              >
                <Text
                  style={[
                    styles.tipPresetText,
                    tipAmount === preset &&
                      !customTipAmount &&
                      styles.tipPresetTextSelected,
                  ]}
                >
                  ${preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount */}
          <View style={styles.tipCustomRow}>
            <Text style={styles.tipCustomLabel}>
              {t.rating?.customAmount || "Custom"}: $
            </Text>
            <TextInput
              style={styles.tipCustomInput}
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={customTipAmount}
              onChangeText={handleCustomTipChange}
              maxLength={6}
            />
          </View>

          {/* Tip Message */}
          {tipAmount && tipAmount > 0 ? (
            <TextInput
              style={styles.tipMessageInput}
              placeholder={
                t.rating?.tipMessagePlaceholder || "Add a message (optional)"
              }
              placeholderTextColor="#9ca3af"
              value={tipMessage}
              onChangeText={setTipMessage}
              maxLength={200}
            />
          ) : null}

          {/* No tip note */}
          {!tipAmount && (
            <Text style={styles.tipNoTipNote}>
              {t.rating?.noTipNote ||
                "No worries! Tipping is completely optional."}
            </Text>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        {tipAmount && tipAmount > 0 ? (
          <Text style={styles.tipSummary}>
            {t.rating?.includingTip || "Including tip"}: ${tipAmount.toFixed(2)}
          </Text>
        ) : null}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (rating === 0 || submitting || sendingTip) &&
              styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting || sendingTip}
        >
          {submitting || sendingTip ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitText}>
              {tipAmount && tipAmount > 0
                ? `${t.rating?.submitWithTip || "Submit Review & Tip"}`
                : t.rating?.submitReview || "Submit Review"}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Text style={styles.skipText}>{t.common?.skip || "Skip"}</Text>
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
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  content: { padding: 16 },
  brandContainer: { alignItems: "center", marginBottom: 16 },
  brandLogo: { width: 80, height: 80 },
  serviceCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  checkIcon: { marginBottom: 16 },
  serviceTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  serviceProvider: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  serviceDate: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
  ratingQuestion: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#f59e0b",
    textAlign: "center",
    marginBottom: 24,
  },
  commentSection: { marginBottom: 24 },
  commentLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
  },
  tagsSection: { marginBottom: 24 },
  tagsTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 12,
  },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: { fontSize: 14, color: "#374151" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    alignItems: "center",
  },
  submitBtn: {
    backgroundColor: "#2B5EA7",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  submitBtnDisabled: { backgroundColor: "#9ca3af" },
  submitText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  skipText: { fontSize: 14, color: "#6b7280" },

  // Tip styles
  tipSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tipTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  tipOptional: { fontSize: 13, color: "#9ca3af", fontWeight: "400" },
  tipDescription: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 18,
  },
  tipPresetsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  tipPresetBtn: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  tipPresetBtnSelected: { backgroundColor: "#dcfce7", borderColor: "#10b981" },
  tipPresetText: { fontSize: 16, fontWeight: "600", color: "#374151" },
  tipPresetTextSelected: { color: "#059669" },
  tipCustomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tipCustomLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
    marginRight: 4,
  },
  tipCustomInput: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  tipMessageInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    marginBottom: 4,
  },
  tipNoTipNote: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 4,
  },
  tipSummary: {
    fontSize: 13,
    fontWeight: "500",
    color: "#10b981",
    marginBottom: 8,
  },
});
