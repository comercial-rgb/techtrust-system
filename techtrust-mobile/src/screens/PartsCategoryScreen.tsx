/**
 * PartsCategoryScreen - Products list filtered by category/search
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../i18n";
import { useRoute } from "@react-navigation/native";

export default function PartsCategoryScreen({ navigation }: any) {
  const { t } = useI18n();
  const ps = (t as any).partsStore || {};
  const route = useRoute<any>();
  const categoryId = route.params?.categoryId;
  const initialSearch = route.params?.search || "";
  const screenTitle = route.params?.title || ps.products || "Products";
  const showStores = route.params?.showStores || false;

  const [searchText, setSearchText] = useState(initialSearch);
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    loadData();
  }, [sortBy]);

  async function loadData() {
    setLoading(true);
    try {
      const api = (await import("../services/api")).default;
      if (showStores) {
        const res = await api.get(`/parts-store/search?limit=50`);
        setStores(res.data?.data || []);
      } else {
        const params = new URLSearchParams();
        if (categoryId) params.append("category", categoryId);
        if (searchText.trim()) params.append("search", searchText.trim());
        params.append("sortBy", sortBy);
        params.append("limit", "50");
        const res = await api.get(`/parts-store/products/search?${params.toString()}`);
        setProducts(res.data?.data || []);
      }
    } catch {
      setProducts([]);
      setStores([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    loadData();
  }

  const renderProduct = ({ item }: any) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate("PartsProductDetail", { productId: item.id })}
    >
      <View style={styles.productImage}>
        <Ionicons name="cube-outline" size={28} color="#d1d5db" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        {item.brand && <Text style={styles.productBrand}>{item.brand}</Text>}
        {item.partNumber && <Text style={styles.productPart}>#{item.partNumber}</Text>}
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>${item.salePrice || item.price}</Text>
          {item.salePrice && (
            <Text style={styles.originalPrice}>${item.price}</Text>
          )}
        </View>
        {item.store && (
          <View style={styles.storeRow}>
            <Ionicons name="storefront-outline" size={12} color="#6b7280" />
            <Text style={styles.storeText}>{item.store.storeName}</Text>
          </View>
        )}
      </View>
      <View style={styles.stockBadge}>
        <View style={[styles.stockDot, { backgroundColor: item.inStock ? "#10b981" : "#ef4444" }]} />
        <Text style={[styles.stockText, { color: item.inStock ? "#10b981" : "#ef4444" }]}>
          {item.inStock ? (ps.inStock || "In Stock") : (ps.outOfStock || "Out of Stock")}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderStore = ({ item }: any) => (
    <TouchableOpacity
      style={styles.storeCard}
      onPress={() => navigation.navigate("PartsStoreProfile", { storeId: item.id })}
    >
      <View style={styles.storeIcon}>
        <Ionicons name="storefront" size={28} color="#7c3aed" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.storeName}>{item.storeName}</Text>
        <Text style={styles.storeAddress}>{[item.address, item.city, item.state].filter(Boolean).join(", ")}</Text>
        <View style={styles.storeMetaRow}>
          {item.averageRating > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#fbbf24" />
              <Text style={styles.ratingText}>{item.averageRating.toFixed(1)}</Text>
            </View>
          )}
          {item._count?.products > 0 && (
            <Text style={styles.productCount}>{item._count.products} {ps.products || "products"}</Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{screenTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search + Sort */}
      <View style={styles.filtersRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder={ps.searchProducts || "Search..."}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        {!showStores && (
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => {
              const options = ["newest", "price_low", "price_high", "name"];
              const idx = options.indexOf(sortBy);
              setSortBy(options[(idx + 1) % options.length]);
            }}
          >
            <Ionicons name="swap-vertical" size={20} color="#7c3aed" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={showStores ? stores : products}
          keyExtractor={(item) => item.id}
          renderItem={showStores ? renderStore : renderProduct}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>{ps.noProducts || "No products found"}</Text>
              <Text style={styles.emptySubtitle}>{ps.tryDifferentSearch || "Try a different search or category."}</Text>
            </View>
          }
        />
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
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },
  sortBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f5f3ff",
    justifyContent: "center",
    alignItems: "center",
  },
  // Product
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    alignItems: "center",
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  productBrand: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  productPart: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  productPrice: { fontSize: 16, fontWeight: "700", color: "#7c3aed" },
  originalPrice: { fontSize: 12, color: "#9ca3af", textDecorationLine: "line-through" },
  storeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  storeText: { fontSize: 11, color: "#6b7280" },
  stockBadge: { alignItems: "center", marginLeft: 8 },
  stockDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 3 },
  stockText: { fontSize: 10, fontWeight: "600" },
  // Store
  storeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  storeIcon: {
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
  storeMetaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  productCount: { fontSize: 12, color: "#6b7280" },
  // Empty
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#6b7280", marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: "#9ca3af", textAlign: "center", marginTop: 6 },
});
