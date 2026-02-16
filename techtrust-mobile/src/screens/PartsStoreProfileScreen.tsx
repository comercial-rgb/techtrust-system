/**
 * PartsStoreProfileScreen - Individual store profile with products, reviews, contact info
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../i18n";
import { useRoute } from "@react-navigation/native";

export default function PartsStoreProfileScreen({ navigation }: any) {
  const { t } = useI18n();
  const ps = (t as any).partsStore || {};
  const route = useRoute<any>();
  const { storeId } = route.params;

  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [tab, setTab] = useState<"products" | "reviews">("products");

  useEffect(() => {
    loadStore();
  }, [storeId]);

  async function loadStore() {
    setLoading(true);
    try {
      const api = (await import("../services/api")).default;
      const [storeRes, productsRes, reviewsRes] = await Promise.all([
        api.get(`/parts-store/stores/${storeId}`),
        api.get(`/parts-store/stores/${storeId}/products?limit=50`),
        api.get(`/parts-store/stores/${storeId}/reviews?limit=20`),
      ]);
      setStore(storeRes.data?.data);
      setProducts(productsRes.data?.data || []);
      setReviews(reviewsRes.data?.data || []);
    } catch {
      setStore(null);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStore();
    setRefreshing(false);
  }, [storeId]);

  async function toggleFavorite() {
    try {
      const api = (await import("../services/api")).default;
      await api.post(`/parts-store/stores/${storeId}/favorite`);
      setIsFavorite(!isFavorite);
    } catch {}
  }

  function openDirections() {
    if (!store?.latitude || !store?.longitude) return;
    const url = Platform.select({
      ios: `maps://app?daddr=${store.latitude},${store.longitude}`,
      android: `google.navigation:q=${store.latitude},${store.longitude}`,
    });
    if (url) Linking.openURL(url);
  }

  function callStore() {
    if (store?.phone) Linking.openURL(`tel:${store.phone}`);
  }

  function openWebsite() {
    if (store?.website) Linking.openURL(store.website);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{ps.storeProfile || "Store Profile"}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!store) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{ps.storeProfile || "Store Profile"}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyTitle}>{ps.storeNotFound || "Store not found"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const DAY_NAMES: Record<string, string> = {
    monday: ps.monday || "Monday",
    tuesday: ps.tuesday || "Tuesday",
    wednesday: ps.wednesday || "Wednesday",
    thursday: ps.thursday || "Thursday",
    friday: ps.friday || "Friday",
    saturday: ps.saturday || "Saturday",
    sunday: ps.sunday || "Sunday",
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{store.storeName}</Text>
        <TouchableOpacity onPress={toggleFavorite} style={styles.backBtn}>
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={isFavorite ? "#ef4444" : "#6b7280"} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
      >
        {/* Store Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="storefront" size={44} color="#7c3aed" />
          </View>
          <Text style={styles.storeName}>{store.storeName}</Text>
          {store.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#059669" />
              <Text style={styles.verifiedText}>{ps.verified || "Verified"}</Text>
            </View>
          )}
          {store.averageRating > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#fbbf24" />
              <Text style={styles.ratingText}>{store.averageRating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({store._count?.reviews || 0} {ps.reviews || "reviews"})</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {store.latitude && store.longitude && (
            <TouchableOpacity style={styles.quickActionBtn} onPress={openDirections}>
              <View style={[styles.quickActionIcon, { backgroundColor: "#ede9fe" }]}>
                <Ionicons name="navigate" size={22} color="#7c3aed" />
              </View>
              <Text style={styles.quickActionLabel}>{ps.directions || "Directions"}</Text>
            </TouchableOpacity>
          )}
          {store.phone && (
            <TouchableOpacity style={styles.quickActionBtn} onPress={callStore}>
              <View style={[styles.quickActionIcon, { backgroundColor: "#d1fae5" }]}>
                <Ionicons name="call" size={22} color="#10b981" />
              </View>
              <Text style={styles.quickActionLabel}>{ps.call || "Call"}</Text>
            </TouchableOpacity>
          )}
          {store.website && (
            <TouchableOpacity style={styles.quickActionBtn} onPress={openWebsite}>
              <View style={[styles.quickActionIcon, { backgroundColor: "#dbeafe" }]}>
                <Ionicons name="globe" size={22} color="#3b82f6" />
              </View>
              <Text style={styles.quickActionLabel}>{ps.website || "Website"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Store Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>{ps.storeInfo || "Store Info"}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={18} color="#6b7280" />
            <Text style={styles.infoText}>
              {[store.address, store.city, store.state, store.zipCode].filter(Boolean).join(", ")}
            </Text>
          </View>
          {store.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#6b7280" />
              <Text style={styles.infoText}>{store.phone}</Text>
            </View>
          )}
          {store.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color="#6b7280" />
              <Text style={styles.infoText}>{store.email}</Text>
            </View>
          )}
        </View>

        {/* Hours */}
        {store.operatingHours && (
          <View style={styles.hoursSection}>
            <Text style={styles.sectionTitle}>{ps.operatingHours || "Operating Hours"}</Text>
            {Object.entries(store.operatingHours).map(([day, hours]: [string, any]) => (
              <View key={day} style={styles.hoursRow}>
                <Text style={styles.dayName}>{DAY_NAMES[day] || day}</Text>
                <Text style={styles.hourText}>
                  {hours?.closed ? (ps.closed || "Closed") : `${hours?.open || "?"} - ${hours?.close || "?"}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "products" && styles.tabBtnActive]}
            onPress={() => setTab("products")}
          >
            <Text style={[styles.tabBtnText, tab === "products" && styles.tabBtnTextActive]}>
              {ps.products || "Products"} ({products.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "reviews" && styles.tabBtnActive]}
            onPress={() => setTab("reviews")}
          >
            <Text style={[styles.tabBtnText, tab === "reviews" && styles.tabBtnTextActive]}>
              {ps.reviews || "Reviews"} ({reviews.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Products */}
        {tab === "products" && (
          <View style={styles.listSection}>
            {products.length === 0 ? (
              <View style={styles.emptyList}>
                <Text style={styles.emptyListText}>{ps.noProducts || "No products yet"}</Text>
              </View>
            ) : (
              products.map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.productCard}
                  onPress={() => navigation.navigate("PartsProductDetail", { productId: item.id })}
                >
                  <View style={styles.productImagePlaceholder}>
                    <Ionicons name="cube-outline" size={28} color="#d1d5db" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                    {item.brand && <Text style={styles.productBrand}>{item.brand}</Text>}
                    <View style={styles.productPriceRow}>
                      <Text style={styles.productPrice}>${item.salePrice || item.price}</Text>
                      {item.salePrice && (
                        <Text style={styles.productOldPrice}>${item.price}</Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.stockDot, { backgroundColor: item.inStock ? "#10b981" : "#ef4444" }]} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Reviews */}
        {tab === "reviews" && (
          <View style={styles.listSection}>
            {reviews.length === 0 ? (
              <View style={styles.emptyList}>
                <Text style={styles.emptyListText}>{ps.noReviews || "No reviews yet"}</Text>
              </View>
            ) : (
              reviews.map((review: any) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{review.user?.name || "Anonymous"}</Text>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons
                          key={i}
                          name={i <= review.rating ? "star" : "star-outline"}
                          size={14}
                          color="#fbbf24"
                        />
                      ))}
                    </View>
                  </View>
                  {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                  {review.response && (
                    <View style={styles.responseBox}>
                      <Text style={styles.responseLabel}>{ps.storeResponse || "Store Response"}</Text>
                      <Text style={styles.responseText}>{review.response}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827", flex: 1, textAlign: "center" },
  // Hero
  heroSection: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#f5f3ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  storeName: { fontSize: 22, fontWeight: "700", color: "#111827" },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#d1fae5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  verifiedText: { fontSize: 12, fontWeight: "600", color: "#059669" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  ratingText: { fontSize: 16, fontWeight: "700", color: "#111827" },
  reviewCount: { fontSize: 14, color: "#6b7280" },
  // Quick Actions
  quickActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  quickActionBtn: { alignItems: "center", gap: 6 },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: { fontSize: 12, fontWeight: "600", color: "#374151" },
  // Info
  infoSection: { padding: 16, backgroundColor: "#fff", marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  infoText: { fontSize: 14, color: "#374151", flex: 1 },
  // Hours
  hoursSection: { padding: 16, backgroundColor: "#fff", marginTop: 8 },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  dayName: { fontSize: 14, color: "#374151" },
  hourText: { fontSize: 14, fontWeight: "600", color: "#111827" },
  // Tabs
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: { borderBottomColor: "#7c3aed" },
  tabBtnText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  tabBtnTextActive: { color: "#7c3aed" },
  // Lists
  listSection: { padding: 16 },
  emptyList: { padding: 40, alignItems: "center" },
  emptyListText: { fontSize: 14, color: "#9ca3af" },
  // Product Card
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  productImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  productBrand: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  productPriceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  productPrice: { fontSize: 16, fontWeight: "700", color: "#7c3aed" },
  productOldPrice: { fontSize: 13, color: "#9ca3af", textDecorationLine: "line-through" },
  stockDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  // Reviews
  reviewCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewerName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  starRow: { flexDirection: "row", gap: 2 },
  reviewComment: { fontSize: 14, color: "#374151", marginTop: 8, lineHeight: 20 },
  responseBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f5f3ff",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#7c3aed",
  },
  responseLabel: { fontSize: 12, fontWeight: "700", color: "#7c3aed", marginBottom: 4 },
  responseText: { fontSize: 13, color: "#374151", lineHeight: 18 },
  // Empty
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#6b7280", marginTop: 12 },
});
