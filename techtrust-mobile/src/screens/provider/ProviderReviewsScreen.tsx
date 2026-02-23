/**
 * ProviderReviewsScreen - Provider Reviews/Ratings
 * Display all reviews received by the provider
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useI18n } from "../../i18n";
import api from "../../services/api";

interface Review {
  id: string;
  customerName: string;
  customerInitials: string;
  rating: number;
  comment: string;
  serviceType: string;
  vehicle: string;
  date: string;
  reply?: string;
}

export default function ProviderReviewsScreen({ navigation }: any) {
  const { t, formatDate } = useI18n();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "5" | "4" | "3" | "2" | "1">(
    "all",
  );
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });

  // Reply modal state
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const response = await api.get("/reviews/provider/me");
      const data = response.data.data || response.data;
      const reviewsList = data.reviews || data || [];
      setReviews(
        Array.isArray(reviewsList)
          ? reviewsList.map((r: any) => ({
              id: r.id,
              customerName:
                r.customerName || r.customer?.fullName || "Customer",
              customerInitials: (r.customerName || r.customer?.fullName || "C")
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase(),
              rating: r.rating,
              comment: r.comment || "",
              serviceType: r.serviceType || r.workOrder?.serviceType || "",
              vehicle:
                r.vehicle || r.workOrder?.vehicle
                  ? `${r.workOrder?.vehicle?.make || ""} ${r.workOrder?.vehicle?.model || ""} ${r.workOrder?.vehicle?.year || ""}`.trim()
                  : "",
              date: r.createdAt || r.date,
              reply: r.reply || undefined,
            }))
          : [],
      );

      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      // Show empty state on error
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };

  const handleOpenReplyModal = (review: Review) => {
    setSelectedReview(review);
    setReplyText("");
    setShowReplyModal(true);
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      Alert.alert(
        t.common?.error || "Error",
        t.reviews?.enterReply || "Please enter a reply",
      );
      return;
    }

    setSubmittingReply(true);
    try {
      await api.post(`/reviews/${selectedReview?.id}/response`, {
        providerResponse: replyText,
      });

      // Update the review with the reply
      setReviews((prev) =>
        prev.map((r) =>
          r.id === selectedReview?.id ? { ...r, reply: replyText } : r,
        ),
      );

      setShowReplyModal(false);
      setSelectedReview(null);
      setReplyText("");

      Alert.alert(
        t.common?.success || "Success",
        t.reviews?.replySubmitted || "Your reply has been submitted",
      );
    } catch (error) {
      Alert.alert(
        t.common?.error || "Error",
        t.reviews?.replyError || "Could not submit reply",
      );
    } finally {
      setSubmittingReply(false);
    }
  };

  const filteredReviews =
    filter === "all"
      ? reviews
      : reviews.filter((r) => r.rating === parseInt(filter));

  const renderStars = (rating: number, size: number = 16) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons
          key={star}
          name={star <= rating ? "star" : "star-outline"}
          size={size}
          color="#fbbf24"
        />
      ))}
    </View>
  );

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.customerAvatar}>
          <Text style={styles.customerInitials}>{item.customerInitials}</Text>
        </View>
        <View style={styles.reviewInfo}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <View style={styles.reviewMeta}>
            {renderStars(item.rating, 14)}
            <Text style={styles.reviewDate}>{formatDate(item.date)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.serviceInfo}>
        <MaterialCommunityIcons name="car-wrench" size={14} color="#6b7280" />
        <Text style={styles.serviceText}>{item.serviceType}</Text>
        <Text style={styles.vehicleText}>• {item.vehicle}</Text>
      </View>

      <Text style={styles.reviewComment}>{item.comment}</Text>

      {item.reply && (
        <View style={styles.replyContainer}>
          <View style={styles.replyHeader}>
            <MaterialCommunityIcons name="reply" size={14} color="#2B5EA7" />
            <Text style={styles.replyLabel}>
              {t.reviews?.yourResponse || "Your Response"}
            </Text>
          </View>
          <Text style={styles.replyText}>{item.reply}</Text>
          <TouchableOpacity
            style={styles.editReplyButton}
            onPress={() => {
              setSelectedReview(item);
              setReplyText(item.reply || "");
              setShowReplyModal(true);
            }}
          >
            <MaterialCommunityIcons name="pencil" size={14} color="#6b7280" />
            <Text style={styles.editReplyText}>{t.common?.edit || "Edit"}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!item.reply && (
        <TouchableOpacity
          style={styles.replyButton}
          onPress={() => handleOpenReplyModal(item)}
        >
          <MaterialCommunityIcons name="reply" size={16} color="#2B5EA7" />
          <Text style={styles.replyButtonText}>
            {t.reviews?.reply || "Reply"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <>
      {/* Stats Overview */}
      <View style={styles.statsCard}>
        <View style={styles.statsMain}>
          <Text style={styles.statsAverage}>{stats.average.toFixed(1)}</Text>
          {renderStars(Math.round(stats.average), 24)}
          <Text style={styles.statsTotal}>{stats.total} reviews</Text>
        </View>
        <View style={styles.statsDistribution}>
          {[5, 4, 3, 2, 1].map((star) => (
            <View key={star} style={styles.distributionRow}>
              <Text style={styles.distributionStar}>{star}</Text>
              <MaterialCommunityIcons name="star" size={12} color="#fbbf24" />
              <View style={styles.distributionBarBg}>
                <View
                  style={[
                    styles.distributionBarFill,
                    {
                      width: `${(stats.distribution[star as keyof typeof stats.distribution] / stats.total) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.distributionCount}>
                {stats.distribution[star as keyof typeof stats.distribution]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "all" && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {[5, 4, 3, 2, 1].map((star) => (
          <TouchableOpacity
            key={star}
            style={[
              styles.filterTab,
              filter === String(star) && styles.filterTabActive,
            ]}
            onPress={() => setFilter(String(star) as any)}
          >
            <Text
              style={[
                styles.filterText,
                filter === String(star) && styles.filterTextActive,
              ]}
            >
              {star}★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews & Ratings</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={filteredReviews}
        renderItem={renderReview}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="star-outline"
              size={48}
              color="#d1d5db"
            />
            <Text style={styles.emptyText}>No reviews with this rating</Text>
          </View>
        }
      />

      {/* Reply Modal */}
      <Modal
        visible={showReplyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReplyModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowReplyModal(false)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#6b7280"
                />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectedReview?.reply
                  ? t.reviews?.editYourReply || "Edit Reply"
                  : t.reviews?.writeReply || "Write Reply"}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Review Info */}
            {selectedReview && (
              <View style={styles.reviewPreview}>
                <View style={styles.reviewPreviewHeader}>
                  <View style={styles.customerAvatarSmall}>
                    <Text style={styles.customerInitialsSmall}>
                      {selectedReview.customerInitials}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.reviewPreviewName}>
                      {selectedReview.customerName}
                    </Text>
                    {renderStars(selectedReview.rating, 12)}
                  </View>
                </View>
                <Text style={styles.reviewPreviewComment} numberOfLines={3}>
                  "{selectedReview.comment}"
                </Text>
              </View>
            )}

            {/* Reply Input */}
            <View style={styles.replyInputContainer}>
              <Text style={styles.replyInputLabel}>
                {t.reviews?.yourResponse || "Your Response"}
              </Text>
              <TextInput
                style={styles.replyInput}
                placeholder={
                  t.reviews?.replyPlaceholder || "Write your response..."
                }
                placeholderTextColor="#9ca3af"
                value={replyText}
                onChangeText={setReplyText}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowReplyModal(false)}
              >
                <Text style={styles.cancelButtonText}>
                  {t.common?.cancel || "Cancel"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  !replyText.trim() && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmitReply}
                disabled={submittingReply || !replyText.trim()}
              >
                {submittingReply ? (
                  <Text style={styles.submitButtonText}>
                    {t.common?.loading || "Sending..."}
                  </Text>
                ) : (
                  <Text style={styles.submitButtonText}>
                    {selectedReview?.reply
                      ? t.common?.save || "Save"
                      : t.common?.send || "Send"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
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
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  listContent: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsMain: {
    alignItems: "center",
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: "#f1f5f9",
  },
  statsAverage: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  statsTotal: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
  },
  statsDistribution: {
    flex: 1,
    paddingLeft: 20,
    justifyContent: "center",
  },
  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  distributionStar: {
    fontSize: 12,
    color: "#6b7280",
    width: 12,
  },
  distributionBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  distributionBarFill: {
    height: "100%",
    backgroundColor: "#fbbf24",
    borderRadius: 3,
  },
  distributionCount: {
    fontSize: 12,
    color: "#6b7280",
    width: 24,
    textAlign: "right",
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterTabActive: {
    backgroundColor: "#2B5EA7",
    borderColor: "#2B5EA7",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
  },
  filterTextActive: {
    color: "#fff",
  },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  customerInitials: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2B5EA7",
  },
  reviewInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  reviewMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: "#9ca3af",
  },
  serviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  serviceText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  vehicleText: {
    fontSize: 13,
    color: "#6b7280",
  },
  reviewComment: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  replyContainer: {
    marginTop: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#2B5EA7",
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2B5EA7",
  },
  replyText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  editReplyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  editReplyText: {
    fontSize: 12,
    color: "#6b7280",
  },
  replyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
  },
  replyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2B5EA7",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 12,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  reviewPreview: {
    margin: 16,
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
  },
  reviewPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  customerAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e0e7ff",
    justifyContent: "center",
    alignItems: "center",
  },
  customerInitialsSmall: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4f46e5",
  },
  reviewPreviewName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  reviewPreviewComment: {
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
    lineHeight: 18,
  },
  replyInputContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  replyInputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#111827",
    minHeight: 120,
    backgroundColor: "#f9fafb",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#2B5EA7",
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
