/**
 * CustomerDashboardScreen - Dashboard do Cliente
 * Design moderno seguindo padrões do fornecedor
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../contexts/AuthContext";
import { FadeInView, ScalePress } from "../components/Animated";
import { DashboardStatsSkeleton } from "../components/Skeleton";
import { logos } from "../constants/images";
import { useI18n } from "../i18n";
import { getHomeData, Banner, Article } from "../services/content.service";
import BannerCarousel from "../components/BannerCarousel";
import SpecialOffersSection, {
  SpecialOffer,
} from "../components/SpecialOffersSection";
import ArticlesSection from "../components/ArticlesSection";

// Storage key for wallet balance
const WALLET_BALANCE_KEY = "@TechTrust:walletBalance";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 16 padding on each side + 16 gap

// Estados e cidades para filtro - Multi-state support
import { US_STATES, CITIES_BY_STATE, STATE_CODES } from '../constants/us-states';
const STATES = STATE_CODES;
const CITIES: Record<string, string[]> = CITIES_BY_STATE;

// Provider type for search results - data from API only
interface ProviderResult {
  id: string;
  name: string;
  city: string;
  state: string;
  services: string[];
  rating: number;
  reviews: number;
  specialOffers: string[];
}

interface ServiceRequest {
  id: string;
  requestNumber: string;
  title: string;
  status: "SEARCHING" | "QUOTES_RECEIVED" | "IN_PROGRESS" | "COMPLETED";
  quotesCount: number;
  createdAt: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
  };
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
}

export default function CustomerDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [stats, setStats] = useState({
    activeServices: 0,
    pendingQuotes: 0,
    completedServices: 0,
    totalSpent: 0,
  });

  // Offer modal states
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<SpecialOffer | null>(null);
  const [showOfferProvidersModal, setShowOfferProvidersModal] = useState(false);
  const [offerProviderState, setOfferProviderState] = useState("");
  const [offerProviderCity, setOfferProviderCity] = useState("");
  const [showOfferStateDropdown, setShowOfferStateDropdown] = useState(false);
  const [showOfferCityDropdown, setShowOfferCityDropdown] = useState(false);
  const [offerProviders, setOfferProviders] = useState<ProviderResult[]>([]);
  const [hasSearchedOfferProviders, setHasSearchedOfferProviders] =
    useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle offer card click
  const handleOfferPress = (offer: SpecialOffer) => {
    setSelectedOffer(offer);
    setShowOfferModal(true);
  };

  // Find providers for offer
  const handleFindOfferProviders = () => {
    setShowOfferModal(false);
    setShowOfferProvidersModal(true);
  };

  // Search providers for offer - TODO: Integrate with real API when providers search endpoint is available
  const handleSearchOfferProviders = async () => {
    if (!selectedOffer) return;
    // For now, show empty results until providers API is integrated
    // In production, call: api.get('/providers/search', { params: { offerId: selectedOffer.id, state: offerProviderState, city: offerProviderCity } })
    setOfferProviders([]);
    setHasSearchedOfferProviders(true);
  };

  // Clear offer provider search
  const clearOfferProviderSearch = () => {
    setOfferProviderState("");
    setOfferProviderCity("");
    setOfferProviders([]);
    setHasSearchedOfferProviders(false);
  };

  // Request service from a provider
  const handleRequestService = (
    provider: ProviderResult,
    offer?: SpecialOffer | null,
  ) => {
    setShowOfferProvidersModal(false);
    navigation.navigate("CreateRequest", {
      preSelectedProvider: provider,
      specialOffer: offer || null,
    });
  };

  async function loadDashboardData() {
    try {
      // Load wallet balance from AsyncStorage
      const savedBalance = await AsyncStorage.getItem(WALLET_BALANCE_KEY);
      if (savedBalance) {
        setWalletBalance(parseFloat(savedBalance));
      } else {
        setWalletBalance(0);
      }

      // Unread notifications count: load from API when endpoint is available
      setHasUnreadNotifications(false);

      // Buscar conteúdo da API
      const homeData = await getHomeData();
      setBanners(homeData.banners || []);
      setOffers(homeData.offers || []);
      setArticles(homeData.articles || []);

      // Buscar dados reais da API
      const [statsData, vehiclesData, requestsData] = await Promise.all([
        import("../services/dashboard.service").then((m) =>
          m.getCustomerDashboardStats(),
        ),
        import("../services/dashboard.service").then((m) => m.getVehicles()),
        import("../services/dashboard.service").then((m) =>
          m.getServiceRequests(),
        ),
      ]);

      setStats(statsData);
      setVehicles(
        vehiclesData.map((v) => ({
          id: v.id,
          make: v.make,
          model: v.model,
          year: v.year,
          plateNumber: v.plateNumber,
        })),
      );
      setRequests(requestsData);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "SEARCHING":
        return {
          label: t.customerDashboard?.statusSearching || "Searching",
          color: "#3b82f6",
          bgColor: "#dbeafe",
          icon: "search",
        };
      case "QUOTES_RECEIVED":
        return {
          label: t.customerDashboard?.statusQuotes || "Quotes",
          color: "#f59e0b",
          bgColor: "#fef3c7",
          icon: "pricetag",
        };
      case "IN_PROGRESS":
        return {
          label: t.customerDashboard?.statusInProgress || "In Progress",
          color: "#8b5cf6",
          bgColor: "#ede9fe",
          icon: "construct",
        };
      case "COMPLETED":
        return {
          label: t.customerDashboard?.statusCompleted || "Completed",
          color: "#10b981",
          bgColor: "#d1fae5",
          icon: "checkmark-circle",
        };
      default:
        return {
          label: status,
          color: "#6b7280",
          bgColor: "#f3f4f6",
          icon: "ellipse",
        };
    }
  };

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) return t.customerDashboard?.justNow || "Just now";
    if (hours < 24)
      return `${hours}${t.customerDashboard?.hoursAgo || "h ago"}`;
    const days = Math.floor(hours / 24);
    return `${days}${t.customerDashboard?.daysAgo || "d ago"}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardStatsSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image source={logos.noText} style={styles.headerLogo} />
              <View style={styles.headerTextContainer}>
                <Text style={styles.greeting}>
                  {t.customerDashboard?.greeting || "Hi"},{" "}
                  {user?.fullName?.split(" ")[0]}! 👋
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {t.customerDashboard?.howCanWeHelp ||
                    "How can we help you today?"}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              {/* Balance Card */}
              <TouchableOpacity
                style={styles.balanceButton}
                onPress={() =>
                  navigation.navigate("Profile", { screen: "PaymentMethods" })
                }
              >
                <Ionicons name="wallet-outline" size={18} color="#10b981" />
                <Text style={styles.balanceText}>
                  ${walletBalance.toFixed(2)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => navigation.navigate("Notifications")}
              >
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color="#374151"
                />
                {hasUnreadNotifications && (
                  <View style={styles.notificationDot} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </FadeInView>

        {/* Banner Carousel */}
        {banners.length > 0 && (
          <FadeInView delay={100}>
            <BannerCarousel banners={banners} autoPlay={true} />
          </FadeInView>
        )}

        {/* Quick Action Banner */}
        <FadeInView delay={100}>
          <TouchableOpacity
            style={styles.actionBanner}
            onPress={() => navigation.navigate("CreateRequest")}
          >
            <View style={styles.bannerContent}>
              <View style={styles.bannerIcon}>
                <Ionicons name="add-circle" size={32} color="#fff" />
              </View>
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>
                  {t.customerDashboard?.needService || "Need a service?"}
                </Text>
                <Text style={styles.bannerSubtitle}>
                  {t.customerDashboard?.requestQuotes ||
                    "Request free quotes now"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </FadeInView>

        {/* Stats Cards */}
        <FadeInView delay={200}>
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={[styles.statCard, { borderLeftColor: "#3b82f6" }]}
              onPress={() => navigation.navigate("Services")}
              activeOpacity={0.7}
            >
              <Ionicons name="construct-outline" size={24} color="#3b82f6" />
              <Text style={styles.statValue}>{stats.activeServices}</Text>
              <Text style={styles.statLabel}>
                {t.customerDashboard?.activeServices || "Active Services"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { borderLeftColor: "#f59e0b" }]}
              onPress={() => navigation.navigate("Services")}
              activeOpacity={0.7}
            >
              <Ionicons name="pricetags-outline" size={24} color="#f59e0b" />
              <Text style={styles.statValue}>{stats.pendingQuotes}</Text>
              <Text style={styles.statLabel}>
                {t.customerDashboard?.pendingQuotes || "Pending Quotes"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { borderLeftColor: "#10b981" }]}
              onPress={() => navigation.navigate("Services")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={24}
                color="#10b981"
              />
              <Text style={styles.statValue}>{stats.completedServices}</Text>
              <Text style={styles.statLabel}>
                {t.customerDashboard?.completed || "Completed"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { borderLeftColor: "#8b5cf6" }]}
              onPress={() =>
                navigation.navigate("Profile", { screen: "ServiceHistory" })
              }
              activeOpacity={0.7}
            >
              <Ionicons name="wallet-outline" size={24} color="#8b5cf6" />
              <Text style={styles.statValue}>${stats.totalSpent}</Text>
              <Text style={styles.statLabel}>
                {t.customerDashboard?.totalSpent || "Total Spent"}
              </Text>
            </TouchableOpacity>
          </View>
        </FadeInView>

        {/* Quick Access */}
        <FadeInView delay={250}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t.customerDashboard?.quickAccess || "Quick Access"}
            </Text>
          </View>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => navigation.navigate("Services")}
            >
              <View
                style={[styles.quickAccessIcon, { backgroundColor: "#fef3c7" }]}
              >
                <Ionicons name="construct" size={22} color="#f59e0b" />
              </View>
              <Text style={styles.quickAccessLabel}>
                {t.customerDashboard?.myServices || "My Services"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() =>
                navigation.dispatch(
                  CommonActions.navigate({
                    name: "Profile",
                    params: {
                      screen: "PaymentMethods",
                      initial: false,
                    },
                  }),
                )
              }
            >
              <View
                style={[styles.quickAccessIcon, { backgroundColor: "#ede9fe" }]}
              >
                <Ionicons name="card" size={22} color="#8b5cf6" />
              </View>
              <Text style={styles.quickAccessLabel}>
                {t.customerDashboard?.payments || "Payments"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => navigation.navigate("Messages")}
            >
              <View
                style={[styles.quickAccessIcon, { backgroundColor: "#d1fae5" }]}
              >
                <Ionicons name="chatbubbles" size={22} color="#10b981" />
              </View>
              <Text style={styles.quickAccessLabel}>
                {t.customerDashboard?.chat || "Chat"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() =>
                navigation.dispatch(
                  CommonActions.navigate({
                    name: "Profile",
                    params: {
                      screen: "HelpCenter",
                      initial: false,
                    },
                  }),
                )
              }
            >
              <View
                style={[styles.quickAccessIcon, { backgroundColor: "#fee2e2" }]}
              >
                <Ionicons name="help-circle" size={22} color="#ef4444" />
              </View>
              <Text style={styles.quickAccessLabel}>
                {t.customerDashboard?.help || "Help"}
              </Text>
            </TouchableOpacity>
          </View>
        </FadeInView>

        {/* Special Offers */}
        {offers.length > 0 && (
          <FadeInView delay={280}>
            <SpecialOffersSection
              offers={offers}
              onOfferPress={handleOfferPress}
              showHeader={true}
            />
          </FadeInView>
        )}

        {/* Articles */}
        {articles.length > 0 && (
          <FadeInView delay={290}>
            <ArticlesSection
              articles={articles}
              onArticlePress={(article) =>
                navigation.navigate("ArticleDetail", { article })
              }
              showHeader={true}
            />
          </FadeInView>
        )}

        {/* My Vehicles */}
        <FadeInView delay={300}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t.customerDashboard?.myVehicles || "My Vehicles"}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Vehicles")}>
              <Text style={styles.seeAllText}>
                {t.customerDashboard?.seeAll || "See all"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vehiclesContainer}
          >
            {vehicles.map((vehicle, index) => (
              <ScalePress
                key={vehicle.id}
                onPress={() =>
                  navigation.navigate("Vehicles", {
                    screen: "VehicleDetails",
                    params: { vehicleId: vehicle.id },
                  })
                }
              >
                <View style={styles.vehicleCard}>
                  <View style={styles.vehicleIconContainer}>
                    <Ionicons name="car-sport" size={32} color="#1976d2" />
                  </View>
                  <Text style={styles.vehicleName}>
                    {vehicle.make} {vehicle.model}
                  </Text>
                  <Text style={styles.vehicleYear}>{vehicle.year}</Text>
                  <Text style={styles.vehiclePlate}>{vehicle.plateNumber}</Text>
                </View>
              </ScalePress>
            ))}

            <ScalePress
              onPress={() =>
                navigation.dispatch(
                  CommonActions.navigate({
                    name: "Vehicles",
                    params: {
                      screen: "AddVehicle",
                      initial: false,
                    },
                  }),
                )
              }
            >
              <View style={[styles.vehicleCard, styles.addVehicleCard]}>
                <View
                  style={[styles.vehicleIconContainer, styles.addVehicleIcon]}
                >
                  <Ionicons name="add" size={32} color="#6b7280" />
                </View>
                <Text style={styles.addVehicleText}>
                  {t.customerDashboard?.addVehicle || "Add"}
                </Text>
                <Text style={styles.addVehicleSubtext}>
                  {t.customerDashboard?.vehicle || "Vehicle"}
                </Text>
              </View>
            </ScalePress>
          </ScrollView>
        </FadeInView>

        {/* Recent Requests */}
        <FadeInView delay={400}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t.customerDashboard?.recentRequests || "Recent Requests"}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Services")}>
              <Text style={styles.seeAllText}>
                {t.customerDashboard?.seeAll || "See all"}
              </Text>
            </TouchableOpacity>
          </View>

          {requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color="#d1d5db"
              />
              <Text style={styles.emptyTitle}>
                {t.customerDashboard?.noRequests || "No requests yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t.customerDashboard?.createFirstRequest ||
                  "Create your first service request"}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate("CreateRequest")}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>
                  {t.customerDashboard?.newRequest || "New Request"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.requestsList}>
              {requests.map((request, index) => {
                const statusInfo = getStatusInfo(request.status);
                return (
                  <FadeInView key={request.id} delay={500 + index * 100}>
                    <ScalePress
                      onPress={() =>
                        navigation.navigate("RequestDetails", {
                          requestId: request.id,
                        })
                      }
                    >
                      <View style={styles.requestCard}>
                        <View style={styles.requestHeader}>
                          <View
                            style={[
                              styles.requestIcon,
                              { backgroundColor: statusInfo.bgColor },
                            ]}
                          >
                            <Ionicons
                              name={statusInfo.icon as any}
                              size={20}
                              color={statusInfo.color}
                            />
                          </View>
                          <View style={styles.requestInfo}>
                            <Text style={styles.requestTitle}>
                              {request.title}
                            </Text>
                            <Text style={styles.requestVehicle}>
                              {request.vehicle.make} {request.vehicle.model}{" "}
                              {request.vehicle.year}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: statusInfo.bgColor },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                { color: statusInfo.color },
                              ]}
                            >
                              {statusInfo.label}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.requestFooter}>
                          <Text style={styles.requestNumber}>
                            #{request.requestNumber}
                          </Text>
                          <Text style={styles.requestTime}>
                            {formatTimeAgo(request.createdAt)}
                          </Text>
                        </View>

                        {request.quotesCount > 0 &&
                          request.status === "QUOTES_RECEIVED" && (
                            <View style={styles.quotesAlert}>
                              <Ionicons
                                name="pricetag"
                                size={16}
                                color="#f59e0b"
                              />
                              <Text style={styles.quotesAlertText}>
                                {request.quotesCount}{" "}
                                {t.customerDashboard?.quotesAvailable ||
                                  "quote(s) available"}
                              </Text>
                              <Ionicons
                                name="chevron-forward"
                                size={16}
                                color="#f59e0b"
                              />
                            </View>
                          )}
                      </View>
                    </ScalePress>
                  </FadeInView>
                );
              })}
            </View>
          )}
        </FadeInView>

        {/* Quick Tips */}
        <FadeInView delay={600}>
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>
              💡 {t.customerDashboard?.tips || "Tips"}
            </Text>
            <View style={styles.tipCard}>
              <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
              <Text style={styles.tipText}>
                {t.customerDashboard?.tipCompareQuotes ||
                  "Compare at least 3 quotes before accepting to ensure the best price"}
              </Text>
            </View>
          </View>
        </FadeInView>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Offer Detail Modal */}
      <Modal visible={showOfferModal} transparent animationType="slide">
        <View style={styles.offerModalOverlay}>
          <View style={styles.offerModalContent}>
            {selectedOffer &&
              (() => {
                // Support both API fields and legacy fields
                const imgUrl =
                  selectedOffer.imageUrl || (selectedOffer as any).image;
                const imgSrc = imgUrl
                  ? String(imgUrl).startsWith("http")
                    ? String(imgUrl)
                    : `https://techtrust-api.onrender.com${imgUrl}`
                  : null;
                const discountDisp =
                  (selectedOffer as any).discountLabel ||
                  (selectedOffer.discount
                    ? `${selectedOffer.discount}% OFF`
                    : "PROMO");
                const fmtP = (v: any): string => {
                  if (!v) return "";
                  if (
                    typeof v === "string" &&
                    (v.startsWith("$") || v === "FREE")
                  )
                    return v;
                  const n = Number(v);
                  return isNaN(n)
                    ? String(v)
                    : n === 0
                      ? "FREE"
                      : `$${n.toFixed(2)}`;
                };
                const origPrice = fmtP((selectedOffer as any).originalPrice);
                const discPrice = fmtP((selectedOffer as any).discountedPrice);
                const promoCode =
                  (selectedOffer as any).promoCode || selectedOffer.code;
                let validUntilD = "";
                if ((selectedOffer as any).validUntil) {
                  const raw = String((selectedOffer as any).validUntil);
                  if (raw.includes("T")) {
                    const d = new Date(raw);
                    validUntilD = !isNaN(d.getTime())
                      ? d.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : raw;
                  } else validUntilD = raw;
                }
                return (
                  <>
                    <TouchableOpacity
                      style={styles.offerModalClose}
                      onPress={() => setShowOfferModal(false)}
                    >
                      <Ionicons name="close-circle" size={32} color="#6b7280" />
                    </TouchableOpacity>

                    {imgSrc ? (
                      <Image
                        source={{ uri: imgSrc }}
                        style={styles.offerModalImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.offerModalImage,
                          {
                            backgroundColor: "#fee2e2",
                            justifyContent: "center",
                            alignItems: "center",
                          },
                        ]}
                      >
                        <Ionicons name="pricetag" size={60} color="#ef4444" />
                      </View>
                    )}

                    <View
                      style={[
                        styles.offerModalBadge,
                        { backgroundColor: "#ef4444" },
                      ]}
                    >
                      <Text style={styles.offerModalBadgeText}>
                        {discountDisp}
                      </Text>
                    </View>

                    <View style={styles.offerModalBody}>
                      <Text style={styles.offerModalTitle}>
                        {selectedOffer.title}
                      </Text>
                      <Text style={styles.offerModalDescription}>
                        {selectedOffer.description || ""}
                      </Text>

                      {(origPrice || discPrice) && (
                        <View style={styles.offerModalPricing}>
                          <View>
                            <Text style={styles.offerModalPriceLabel}>
                              {t.customerDashboard?.regularPrice ||
                                "Regular Price"}
                            </Text>
                            {origPrice ? (
                              <Text
                                style={{
                                  textDecorationLine: "line-through",
                                  color: "#9ca3af",
                                }}
                              >
                                {origPrice}
                              </Text>
                            ) : null}
                          </View>
                          <Ionicons
                            name="arrow-forward"
                            size={24}
                            color="#10b981"
                          />
                          <View>
                            <Text style={styles.offerModalPriceLabel}>
                              {t.customerDashboard?.specialPrice ||
                                "Special Price"}
                            </Text>
                            <Text style={styles.offerModalDiscountedPrice}>
                              {discPrice || discountDisp}
                            </Text>
                          </View>
                        </View>
                      )}

                      {promoCode && (
                        <View style={styles.offerModalValidity}>
                          <Ionicons name="pricetag" size={18} color="#10b981" />
                          <Text style={styles.offerModalValidityText}>
                            {t.customerDashboard?.useCode || "Use code"}:{" "}
                            {promoCode}
                          </Text>
                        </View>
                      )}

                      {validUntilD ? (
                        <View
                          style={[styles.offerModalValidity, { marginTop: 4 }]}
                        >
                          <Ionicons name="time" size={18} color="#f59e0b" />
                          <Text style={styles.offerModalValidityText}>
                            Valid until {validUntilD}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.offerModalActions}>
                        <TouchableOpacity
                          style={styles.offerModalFindButton}
                          onPress={handleFindOfferProviders}
                        >
                          <Ionicons name="search" size={20} color="#fff" />
                          <Text style={styles.offerModalFindButtonText}>
                            {t.customerDashboard?.findProvider ||
                              "Find a Provider"}
                          </Text>
                        </TouchableOpacity>
                        <View style={styles.offerModalDisclaimer}>
                          <Ionicons
                            name="information-circle"
                            size={16}
                            color="#f59e0b"
                          />
                          <Text style={styles.offerModalDisclaimerText}>
                            {t.customerDashboard?.offerDisclaimer ||
                              "Special offers may not be available with all providers. Check participating providers below."}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </>
                );
              })()}
          </View>
        </View>
      </Modal>

      {/* Offer Providers Search Modal */}
      <Modal
        visible={showOfferProvidersModal}
        transparent
        animationType="slide"
      >
        <View style={styles.offerProvidersModalOverlay}>
          <View style={styles.offerProvidersModalContent}>
            <View style={styles.offerProvidersModalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowOfferProvidersModal(false);
                  clearOfferProviderSearch();
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.offerProvidersModalTitle}>
                {t.customerDashboard?.findParticipatingProviders ||
                  "Find Participating Providers"}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {selectedOffer && (
              <View style={styles.offerProvidersOfferBadge}>
                <Text style={styles.offerProvidersOfferTitle}>
                  {selectedOffer.title}
                </Text>
                <Text style={styles.offerProvidersOfferDiscount}>
                  {(selectedOffer as any).discountLabel ||
                    selectedOffer.discount}
                </Text>
              </View>
            )}

            <View style={styles.offerProvidersFilters}>
              {/* State Dropdown */}
              <TouchableOpacity
                style={styles.offerProvidersDropdown}
                onPress={() =>
                  setShowOfferStateDropdown(!showOfferStateDropdown)
                }
              >
                <Ionicons name="map" size={18} color="#6b7280" />
                <Text
                  style={[
                    styles.filterText,
                    !offerProviderState && styles.filterPlaceholder,
                  ]}
                >
                  {offerProviderState ||
                    t.customerDashboard?.selectState ||
                    "Select State"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6b7280" />
              </TouchableOpacity>

              {/* City Dropdown */}
              <TouchableOpacity
                style={[
                  styles.offerProvidersDropdown,
                  !offerProviderState && styles.filterDisabled,
                ]}
                onPress={() =>
                  offerProviderState &&
                  setShowOfferCityDropdown(!showOfferCityDropdown)
                }
              >
                <Ionicons name="business" size={18} color="#6b7280" />
                <Text
                  style={[
                    styles.filterText,
                    !offerProviderCity && styles.filterPlaceholder,
                  ]}
                >
                  {offerProviderCity ||
                    t.customerDashboard?.selectCity ||
                    "Select City"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6b7280" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.offerProvidersSearchButton}
                onPress={handleSearchOfferProviders}
              >
                <Ionicons name="search" size={20} color="#fff" />
                <Text style={styles.offerProvidersSearchButtonText}>
                  {t.common?.search || "Search"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.offerProvidersList}>
              {hasSearchedOfferProviders ? (
                offerProviders.length > 0 ? (
                  <>
                    <Text style={styles.offerProvidersResultsTitle}>
                      {offerProviders.length}{" "}
                      {t.customerDashboard?.participatingProviders ||
                        "Participating Provider(s)"}
                    </Text>
                    {offerProviders.map((provider) => (
                      <View key={provider.id} style={styles.providerCard}>
                        <View style={styles.providerIcon}>
                          <Ionicons
                            name="storefront"
                            size={28}
                            color="#1976d2"
                          />
                        </View>
                        <View style={styles.providerInfo}>
                          <Text style={styles.providerName}>
                            {provider.name}
                          </Text>
                          <View style={styles.providerLocation}>
                            <Ionicons
                              name="location"
                              size={14}
                              color="#6b7280"
                            />
                            <Text style={styles.providerLocationText}>
                              {provider.city}, {provider.state}
                            </Text>
                          </View>
                          <View style={styles.providerRating}>
                            <Ionicons name="star" size={14} color="#f59e0b" />
                            <Text style={styles.providerRatingText}>
                              {provider.rating} ({provider.reviews} reviews)
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.providerRequestButton}
                          onPress={() =>
                            handleRequestService(provider, selectedOffer)
                          }
                        >
                          <Text style={styles.providerRequestButtonText}>
                            {t.common?.request || "Request"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                ) : (
                  <View style={styles.offerProvidersNoResults}>
                    <Ionicons name="search-outline" size={48} color="#d1d5db" />
                    <Text style={styles.offerProvidersNoResultsText}>
                      {t.customerDashboard?.noProvidersFound ||
                        "No providers found"}
                    </Text>
                    <Text style={styles.offerProvidersNoResultsSubtext}>
                      {t.customerDashboard?.tryDifferentLocation ||
                        "Try selecting a different location"}
                    </Text>
                  </View>
                )
              ) : (
                <View style={styles.offerProvidersEmptyState}>
                  <Ionicons
                    name="storefront-outline"
                    size={64}
                    color="#d1d5db"
                  />
                  <Text style={styles.offerProvidersEmptyText}>
                    {t.customerDashboard?.selectLocation ||
                      "Select a location to find participating providers"}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Offer State Dropdown */}
      <Modal visible={showOfferStateDropdown} transparent animationType="fade">
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowOfferStateDropdown(false)}
        >
          <View
            style={styles.dropdownContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.dropdownTitle}>
              {t.customerDashboard?.selectState || "Select State"}
            </Text>
            <ScrollView
              style={styles.dropdownScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {STATES.map((state) => (
                <TouchableOpacity
                  key={state}
                  style={[
                    styles.dropdownItem,
                    offerProviderState === state && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setOfferProviderState(state);
                    setOfferProviderCity("");
                    setShowOfferStateDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      offerProviderState === state &&
                        styles.dropdownItemTextSelected,
                    ]}
                  >
                    {state}
                  </Text>
                  {offerProviderState === state && (
                    <Ionicons name="checkmark" size={20} color="#1976d2" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Offer City Dropdown */}
      <Modal visible={showOfferCityDropdown} transparent animationType="fade">
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowOfferCityDropdown(false)}
        >
          <View
            style={styles.dropdownContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.dropdownTitle}>
              {t.customerDashboard?.selectCity || "Select City"}
            </Text>
            <ScrollView
              style={styles.dropdownScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {(CITIES[offerProviderState] || []).map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.dropdownItem,
                    offerProviderCity === city && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setOfferProviderCity(city);
                    setShowOfferCityDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      offerProviderCity === city &&
                        styles.dropdownItemTextSelected,
                    ]}
                  >
                    {city}
                  </Text>
                  {offerProviderCity === city && (
                    <Ionicons name="checkmark" size={20} color="#1976d2" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateRequest")}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  balanceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  balanceText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#10b981",
  },
  notificationButton: {
    position: "relative",
    padding: 8,
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  actionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1976d2",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  bannerIcon: {
    marginRight: 12,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  bannerSubtitle: {
    fontSize: 13,
    color: "#bfdbfe",
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 110,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginTop: 12,
  },
  statLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 6,
    lineHeight: 18,
  },
  // Quick Access
  quickAccessGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  quickAccessCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickAccessIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickAccessLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
  },
  // Quick Actions
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  quickActionItem: {
    width: (SCREEN_WIDTH - 64) / 4,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  seeAllText: {
    fontSize: 14,
    color: "#1976d2",
    fontWeight: "600",
  },
  vehiclesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  vehicleCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: 140,
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  vehicleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
  vehicleYear: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  vehiclePlate: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  addVehicleCard: {
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "transparent",
  },
  addVehicleIcon: {
    backgroundColor: "#f3f4f6",
  },
  addVehicleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  addVehicleSubtext: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  requestsList: {
    paddingHorizontal: 20,
  },
  requestCard: {
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
  requestHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  requestIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  requestVehicle: {
    fontSize: 13,
    color: "#6b7280",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  requestFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  requestNumber: {
    fontSize: 12,
    color: "#9ca3af",
  },
  requestTime: {
    fontSize: 12,
    color: "#9ca3af",
  },
  quotesAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  quotesAlertText: {
    flex: 1,
    fontSize: 13,
    color: "#92400e",
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
    textAlign: "center",
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1976d2",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  tipsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fefce8",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#713f12",
    lineHeight: 18,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#1976d2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1976d2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Special Offers Section
  offersSection: {
    marginVertical: 8,
  },
  offersSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  offersSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  offersSectionSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  offersListContainer: {
    paddingHorizontal: 16,
  },
  offerCard: {
    width: 260,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginRight: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  offerImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  offerDiscountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offerDiscountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  offerContent: {
    padding: 12,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
    marginBottom: 8,
  },
  offerPricing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  offerOriginalPrice: {
    fontSize: 13,
    color: "#9ca3af",
    textDecorationLine: "line-through",
  },
  offerDiscountedPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  offerValidUntil: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
  },
  offerTapHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  offerTapHintText: {
    fontSize: 12,
    color: "#6b7280",
  },
  // Offer Modal
  offerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  offerModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  offerModalClose: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  offerModalImage: {
    width: "100%",
    height: 180,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  offerModalBadge: {
    position: "absolute",
    top: 140,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  offerModalBadgeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  offerModalBody: {
    padding: 20,
  },
  offerModalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  offerModalDescription: {
    fontSize: 15,
    color: "#6b7280",
    lineHeight: 22,
    marginBottom: 20,
  },
  offerModalPricing: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  offerModalPriceLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    textAlign: "center",
  },
  offerModalOriginalPrice: {
    fontSize: 18,
    color: "#9ca3af",
    textDecorationLine: "line-through",
    textAlign: "center",
  },
  offerModalDiscountedPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: "#10b981",
    textAlign: "center",
  },
  offerModalValidity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  offerModalValidityText: {
    fontSize: 14,
    color: "#f59e0b",
    fontWeight: "500",
  },
  offerModalActions: {
    gap: 12,
  },
  offerModalFindButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1976d2",
    paddingVertical: 16,
    borderRadius: 12,
  },
  offerModalFindButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  offerModalDisclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fffbeb",
    padding: 12,
    borderRadius: 8,
  },
  offerModalDisclaimerText: {
    flex: 1,
    fontSize: 12,
    color: "#92400e",
    lineHeight: 16,
  },
  // Offer Providers Modal
  offerProvidersModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  offerProvidersModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
  },
  offerProvidersModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  offerProvidersModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  offerProvidersOfferBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eff6ff",
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
  },
  offerProvidersOfferTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
  },
  offerProvidersOfferDiscount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10b981",
  },
  offerProvidersFilters: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  offerProvidersDropdown: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  filterText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },
  filterPlaceholder: {
    color: "#9ca3af",
  },
  filterDisabled: {
    opacity: 0.5,
  },
  offerProvidersSearchButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1976d2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  offerProvidersSearchButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  offerProvidersList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  offerProvidersResultsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
    marginTop: 8,
  },
  offerProvidersNoResults: {
    alignItems: "center",
    paddingVertical: 60,
  },
  offerProvidersNoResultsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
  },
  offerProvidersNoResultsSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },
  offerProvidersEmptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  offerProvidersEmptyText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 16,
    textAlign: "center",
  },
  // Provider Card
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  providerLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  providerLocationText: {
    fontSize: 13,
    color: "#6b7280",
  },
  providerRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  providerRatingText: {
    fontSize: 12,
    color: "#6b7280",
  },
  providerRequestButton: {
    backgroundColor: "#1976d2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  providerRequestButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  // Dropdown styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "80%",
    maxHeight: 300,
    padding: 16,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownItemSelected: {
    backgroundColor: "#eff6ff",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#374151",
  },
  dropdownItemTextSelected: {
    color: "#1976d2",
    fontWeight: "600",
  },
});
