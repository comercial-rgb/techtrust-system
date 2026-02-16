/**
 * PartsStoreScreen - Auto Parts Store Catalog
 * Browse stores, search products, view categories
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../i18n";

const CATEGORIES = [
  { id: "engine", icon: "cog", color: "#ef4444" },
  { id: "brakes", icon: "disc", color: "#f59e0b" },
  { id: "filters", icon: "funnel", color: "#10b981" },
  { id: "oil_fluids", icon: "water", color: "#3b82f6" },
  { id: "electrical", icon: "flash", color: "#8b5cf6" },
  { id: "suspension", icon: "navigate", color: "#ec4899" },
  { id: "exhaust", icon: "cloud", color: "#6b7280" },
  { id: "transmission", icon: "settings", color: "#0ea5e9" },
  { id: "cooling", icon: "thermometer", color: "#14b8a6" },
  { id: "body_exterior", icon: "car", color: "#f97316" },
  { id: "tires_wheels", icon: "ellipse", color: "#374151" },
  { id: "battery", icon: "battery-charging", color: "#eab308" },
  { id: "belts_hoses", icon: "link", color: "#a855f7" },
  { id: "lighting", icon: "bulb", color: "#fbbf24" },
  { id: "accessories", icon: "sparkles", color: "#06b6d4" },
];

const CATEGORY_NAMES: Record<string, Record<string, string>> = {
  engine: { en: "Engine Parts", pt: "Motor", es: "Motor" },
  brakes: { en: "Brakes & Rotors", pt: "Freios", es: "Frenos" },
  filters: { en: "Filters", pt: "Filtros", es: "Filtros" },
  oil_fluids: { en: "Oil & Fluids", pt: "Óleo e Fluidos", es: "Aceite" },
  electrical: { en: "Electrical", pt: "Elétrica", es: "Eléctrico" },
  suspension: { en: "Suspension", pt: "Suspensão", es: "Suspensión" },
  exhaust: { en: "Exhaust", pt: "Escapamento", es: "Escape" },
  transmission: { en: "Transmission", pt: "Câmbio", es: "Transmisión" },
  cooling: { en: "Cooling", pt: "Arrefecimento", es: "Refrigeración" },
  body_exterior: { en: "Body & Exterior", pt: "Carroceria", es: "Carrocería" },
  tires_wheels: { en: "Tires & Wheels", pt: "Pneus e Rodas", es: "Neumáticos" },
  battery: { en: "Battery", pt: "Bateria", es: "Batería" },
  belts_hoses: { en: "Belts & Hoses", pt: "Correias", es: "Correas" },
  lighting: { en: "Lighting", pt: "Iluminação", es: "Iluminación" },
  accessories: { en: "Accessories", pt: "Acessórios", es: "Accesorios" },
};

export default function PartsStoreScreen({ navigation }: any) {
  const { t, language } = useI18n();
  const ps = (t as any).partsStore || {};

  const [searchText, setSearchText] = useState("");
  const [stores, setStores] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const api = (await import("../services/api")).default;
      const [storesRes, productsRes] = await Promise.all([
        api.get("/parts-store/search?limit=10").catch(() => ({ data: { data: [] } })),
        api.get("/parts-store/products/search?limit=6&sortBy=newest").catch(() => ({ data: { data: [] } })),
      ]);
      setStores(storesRes.data?.data || []);
      setFeaturedProducts(productsRes.data?.data || []);
    } catch {
      setStores([]);
      setFeaturedProducts([]);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function handleSearch() {
    if (searchText.trim()) {
      navigation.navigate("PartsCategory", {
        search: searchText.trim(),
        title: `"${searchText.trim()}"`,
      });
    }
  }

  const lang = language || "en";

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{ps.title || "Parts Store"}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("PartsStoreFavorites")}>
          <Ionicons name="heart-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder={ps.searchPlaceholder || "Search parts, brands, part numbers..."}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{ps.categories || "Categories"}</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() =>
                  navigation.navigate("PartsCategory", {
                    categoryId: cat.id,
                    title: CATEGORY_NAMES[cat.id]?.[lang] || cat.id,
                  })
                }
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}15` }]}>
                  <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                </View>
                <Text style={styles.categoryLabel} numberOfLines={2}>
                  {CATEGORY_NAMES[cat.id]?.[lang] || cat.id}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{ps.featured || "New Arrivals"}</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={featuredProducts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productCard}
                  onPress={() => navigation.navigate("PartsProductDetail", { productId: item.id })}
                >
                  <View style={styles.productImagePlaceholder}>
                    <Ionicons name="cube-outline" size={32} color="#d1d5db" />
                  </View>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.productBrand}>{item.brand || ""}</Text>
                  <View style={styles.productPriceRow}>
                    <Text style={styles.productPrice}>
                      ${item.salePrice || item.price}
                    </Text>
                    {item.salePrice && (
                      <Text style={styles.productOriginalPrice}>${item.price}</Text>
                    )}
                  </View>
                  {item.store && (
                    <Text style={styles.productStore} numberOfLines={1}>
                      {item.store.storeName}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Nearby Stores */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{ps.nearbyStores || "Parts Stores"}</Text>
            <TouchableOpacity onPress={() => navigation.navigate("PartsCategory", { title: ps.allStores || "All Stores", showStores: true })}>
              <Text style={styles.seeAll}>{ps.seeAll || "See All"}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#7c3aed" style={{ marginVertical: 40 }} />
          ) : stores.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>{ps.noStores || "No stores found"}</Text>
              <Text style={styles.emptySubtitle}>{ps.noStoresDesc || "Parts stores will appear here once available in your area."}</Text>
            </View>
          ) : (
            stores.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={styles.storeCard}
                onPress={() => navigation.navigate("PartsStoreProfile", { storeId: store.id })}
              >
                <View style={styles.storeIconContainer}>
                  <Ionicons name="storefront" size={28} color="#7c3aed" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.storeName}>{store.storeName}</Text>
                  <Text style={styles.storeAddress} numberOfLines={1}>
                    {[store.city, store.state].filter(Boolean).join(", ")}
                  </Text>
                  <View style={styles.storeMetaRow}>
                    {store.averageRating > 0 && (
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color="#fbbf24" />
                        <Text style={styles.ratingText}>{store.averageRating.toFixed(1)}</Text>
                      </View>
                    )}
                    {store._count?.products > 0 && (
                      <Text style={styles.storeProducts}>
                        {store._count.products} {ps.products || "products"}
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  // Search
  searchContainer: { padding: 16, backgroundColor: "#fff" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#111827" },
  // Section
  section: { marginTop: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", paddingHorizontal: 16, marginBottom: 12 },
  seeAll: { fontSize: 14, fontWeight: "600", color: "#7c3aed" },
  // Categories
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryCard: {
    width: "22%",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryLabel: { fontSize: 11, color: "#374151", textAlign: "center", lineHeight: 14 },
  // Product cards
  productCard: {
    width: 150,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  productImagePlaceholder: {
    height: 100,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  productName: { fontSize: 13, fontWeight: "600", color: "#111827", marginBottom: 2 },
  productBrand: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
  productPriceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  productPrice: { fontSize: 16, fontWeight: "700", color: "#7c3aed" },
  productOriginalPrice: { fontSize: 12, color: "#9ca3af", textDecorationLine: "line-through" },
  productStore: { fontSize: 11, color: "#6b7280", marginTop: 4 },
  // Store cards
  storeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
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
  storeMetaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  storeProducts: { fontSize: 12, color: "#6b7280" },
  // Empty
  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#6b7280", marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: "#9ca3af", textAlign: "center", marginTop: 6 },
});
