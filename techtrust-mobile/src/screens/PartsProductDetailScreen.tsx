/**
 * PartsProductDetailScreen - View product details, store info, get directions
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../i18n";
import { useRoute } from "@react-navigation/native";

export default function PartsProductDetailScreen({ navigation }: any) {
  const { t } = useI18n();
  const ps = (t as any).partsStore || {};
  const route = useRoute<any>();
  const { productId } = route.params;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  async function loadProduct() {
    setLoading(true);
    try {
      const api = (await import("../services/api")).default;
      const res = await api.get(`/parts-store/products/${productId}`);
      setProduct(res.data?.data);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }

  function openDirections() {
    if (!product?.store?.latitude || !product?.store?.longitude) return;
    const lat = product.store.latitude;
    const lng = product.store.longitude;
    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
    });
    if (url) Linking.openURL(url);
  }

  function callStore() {
    if (product?.store?.phone) {
      Linking.openURL(`tel:${product.store.phone}`);
    }
  }

  async function reserveProduct() {
    try {
      const api = (await import("../services/api")).default;
      await api.post(`/parts-store/products/${productId}/reserve`, { quantity: 1 });
      Alert.alert(
        ps.reserved || "Reserved!",
        ps.reservedDesc || "This product has been reserved for 24 hours. Visit the store to pick it up.",
        [{ text: t.common?.ok || "OK" }],
      );
    } catch (err: any) {
      Alert.alert(
        t.common?.error || "Error",
        err?.response?.data?.message || ps.reserveError || "Could not reserve product.",
      );
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{ps.productDetail || "Product Detail"}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{ps.productDetail || "Product Detail"}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyTitle}>{ps.productNotFound || "Product not found"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const store = product.store;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Image Area */}
        <View style={styles.imageArea}>
          <Ionicons name="cube-outline" size={64} color="#d1d5db" />
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.brand && (
            <Text style={styles.productBrand}>{product.brand}</Text>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.price}>${product.salePrice || product.price}</Text>
            {product.salePrice && (
              <Text style={styles.originalPrice}>${product.price}</Text>
            )}
            {product.salePrice && (
              <View style={styles.saleBadge}>
                <Text style={styles.saleBadgeText}>
                  {Math.round((1 - product.salePrice / product.price) * 100)}% OFF
                </Text>
              </View>
            )}
          </View>

          {/* Stock Status */}
          <View style={[styles.stockBadge, { backgroundColor: product.inStock ? "#d1fae5" : "#fee2e2" }]}>
            <View style={[styles.stockDot, { backgroundColor: product.inStock ? "#10b981" : "#ef4444" }]} />
            <Text style={[styles.stockText, { color: product.inStock ? "#065f46" : "#991b1b" }]}>
              {product.inStock
                ? `${ps.inStock || "In Stock"} ${product.quantity > 0 ? `(${product.quantity})` : ""}`
                : ps.outOfStock || "Out of Stock"}
            </Text>
          </View>

          {/* Details */}
          {product.partNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{ps.partNumber || "Part #"}</Text>
              <Text style={styles.detailValue}>{product.partNumber}</Text>
            </View>
          )}
          {product.oemNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{ps.oemNumber || "OEM #"}</Text>
              <Text style={styles.detailValue}>{product.oemNumber}</Text>
            </View>
          )}
          {product.condition && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{ps.condition || "Condition"}</Text>
              <Text style={styles.detailValue}>
                {product.condition === "new" ? ps.conditionNew || "New"
                  : product.condition === "refurbished" ? ps.conditionRefurbished || "Refurbished"
                  : ps.conditionUsed || "Used"}
              </Text>
            </View>
          )}
          {product.warrantyInfo && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{ps.warranty || "Warranty"}</Text>
              <Text style={styles.detailValue}>{product.warrantyInfo}</Text>
            </View>
          )}

          {/* Description */}
          {product.description && (
            <View style={styles.descSection}>
              <Text style={styles.descTitle}>{ps.description || "Description"}</Text>
              <Text style={styles.descText}>{product.description}</Text>
            </View>
          )}
        </View>

        {/* Where to Buy */}
        {store && (
          <View style={styles.storeSection}>
            <Text style={styles.storeSectionTitle}>{ps.whereToBuy || "Where to Buy"}</Text>
            <TouchableOpacity
              style={styles.storeCard}
              onPress={() => navigation.navigate("PartsStoreProfile", { storeId: store.id })}
            >
              <View style={styles.storeIconContainer}>
                <Ionicons name="storefront" size={28} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{store.storeName}</Text>
                <Text style={styles.storeAddress}>
                  {[store.address, store.city, store.state, store.zipCode].filter(Boolean).join(", ")}
                </Text>
                {store.averageRating > 0 && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#fbbf24" />
                    <Text style={styles.ratingText}>{store.averageRating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              {store.latitude && store.longitude && (
                <TouchableOpacity style={styles.actionBtn} onPress={openDirections}>
                  <Ionicons name="navigate" size={20} color="#7c3aed" />
                  <Text style={styles.actionBtnText}>{ps.getDirections || "Get Directions"}</Text>
                </TouchableOpacity>
              )}
              {store.phone && (
                <TouchableOpacity style={styles.actionBtn} onPress={callStore}>
                  <Ionicons name="call" size={20} color="#10b981" />
                  <Text style={[styles.actionBtnText, { color: "#10b981" }]}>{ps.call || "Call"}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Reviews */}
        {product.reviews?.length > 0 && (
          <View style={styles.reviewsSection}>
            <Text style={styles.reviewsTitle}>
              {ps.reviews || "Reviews"} ({product._count?.reviews || 0})
            </Text>
            {product.reviews.map((review: any) => (
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
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Reserve Button */}
      {product.inStock && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.reserveBtn} onPress={reserveProduct}>
            <Ionicons name="bag-check" size={20} color="#fff" />
            <Text style={styles.reserveBtnText}>{ps.reserveForPickup || "Reserve for Pickup"}</Text>
          </TouchableOpacity>
        </View>
      )}
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
  imageArea: {
    height: 200,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
  },
  infoSection: { padding: 16, backgroundColor: "#fff" },
  productName: { fontSize: 20, fontWeight: "700", color: "#111827" },
  productBrand: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  price: { fontSize: 28, fontWeight: "800", color: "#7c3aed" },
  originalPrice: { fontSize: 16, color: "#9ca3af", textDecorationLine: "line-through" },
  saleBadge: { backgroundColor: "#fee2e2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  saleBadgeText: { fontSize: 12, fontWeight: "700", color: "#ef4444" },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
  stockText: { fontSize: 13, fontWeight: "600" },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    marginTop: 4,
  },
  detailLabel: { fontSize: 14, color: "#6b7280" },
  detailValue: { fontSize: 14, fontWeight: "600", color: "#111827" },
  descSection: { marginTop: 16 },
  descTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 },
  descText: { fontSize: 14, color: "#374151", lineHeight: 22 },
  // Store section
  storeSection: { marginTop: 12, padding: 16, backgroundColor: "#fff" },
  storeSectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  storeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  storeIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#f5f3ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  storeName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  storeAddress: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  ratingText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f5f3ff",
  },
  actionBtnText: { fontSize: 14, fontWeight: "600", color: "#7c3aed" },
  // Reviews
  reviewsSection: { marginTop: 12, padding: 16, backgroundColor: "#fff" },
  reviewsTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  reviewCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewerName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  starRow: { flexDirection: "row", gap: 2 },
  reviewComment: { fontSize: 14, color: "#374151", marginTop: 6, lineHeight: 20 },
  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  reserveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7c3aed",
    paddingVertical: 16,
    borderRadius: 12,
  },
  reserveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  // Empty
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#6b7280", marginTop: 12 },
});
