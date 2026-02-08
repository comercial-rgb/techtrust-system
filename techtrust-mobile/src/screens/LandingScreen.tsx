/**
 * LandingScreen - Tela Inicial do App (Antes do Login)
 * Visível para usuários não autenticados e clientes autenticados
 * Contém: Anúncios, Busca de Fornecedores, Ofertas, Benefícios, Artigos, Avisos
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  FlatList,
  Modal,
  Animated,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useI18n, languages, Language } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { logos } from '../constants/images';
import { CommonActions } from '@react-navigation/native';
import { getHomeData, Banner, SpecialOffer } from '../services/content.service';

const { width } = Dimensions.get('window');

// Mock data para anúncios/banners
const BANNERS = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800',
    title: 'TechTrust AutoSolutions',
    subtitle: 'Your Trusted Auto Service Partner',
  },
  {
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800',
    title: 'Quality Service Guaranteed',
    subtitle: 'Certified Mechanics Near You',
  },
  {
    id: '3',
    imageUrl: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800',
    title: 'Fast & Reliable',
    subtitle: '24/7 Roadside Assistance',
  },
];

// Mock data para ofertas especiais
const SPECIAL_OFFERS = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    title: 'Oil Change Special',
    discount: '15% OFF',
    description: 'Full synthetic oil change with filter',
    validUntil: 'Dec 31, 2025',
    originalPrice: '$89.99',
    discountedPrice: '$76.49',
    serviceType: 'oil',
    vehicleTypes: ['Car', 'SUV', 'Pickup', 'Van'], // All except Light Truck
    fuelTypes: ['Gasoline', 'Diesel', 'Hybrid'], // Not Electric
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
    title: 'Brake Service',
    discount: '20% OFF',
    description: 'Front or rear brake pad replacement',
    validUntil: 'Dec 25, 2025',
    originalPrice: '$199.99',
    discountedPrice: '$159.99',
    serviceType: 'brake',
    vehicleTypes: ['Car', 'SUV', 'Pickup', 'Van', 'Light Truck'], // All types
    fuelTypes: ['Gasoline', 'Diesel', 'Hybrid', 'Electric'], // All fuels
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400',
    title: 'A/C Check',
    discount: 'FREE',
    description: 'Complete A/C system inspection',
    validUntil: 'Dec 20, 2025',
    originalPrice: '$49.99',
    discountedPrice: 'FREE',
    serviceType: 'ac',
    vehicleTypes: ['Car', 'SUV', 'Van'], // Not Pickup or Light Truck
    fuelTypes: ['Gasoline', 'Diesel', 'Hybrid', 'Electric'], // All fuels
  },
];

// Service types used in Home search/provider cards
const SERVICE_TYPE_IDS = [
  'oilChange',
  'brakes',
  'tires',
  'engine',
  'transmission',
  'ac',
  'electrical',
  'suspension',
  'diagnostics',
  'inspection',
] as const;

// Provider type for search results - data from API only
interface ProviderResult {
  id: string;
  name: string;
  city: string;
  state: string;
  services: string[];
  rating: number;
  reviews: number;
  phone?: string;
  email?: string;
  address?: string;
  specialOffers: string[];
  languages?: string[];
}

// Limpar dados mockados - Articles will be loaded from API
const ARTICLES: any[] = [];

// Mock data para benefícios
const BENEFITS = [
  { id: '1', icon: 'shield-checkmark', title: 'Verified Providers', description: 'All mechanics are background-checked and certified' },
  { id: '2', icon: 'cash', title: 'Transparent Pricing', description: 'Compare quotes and pay only for what you need' },
  { id: '3', icon: 'time', title: 'Save Time', description: 'Book appointments and track service in real-time' },
  { id: '4', icon: 'star', title: 'Quality Guaranteed', description: 'Rated services with warranty protection' },
];

// Estados e cidades para filtro - Apenas Florida por enquanto
const STATES = ['FL'];
const CITIES: Record<string, string[]> = {
  'FL': [
    'Alachua', 'Altamonte Springs', 'Apopka', 'Aventura', 'Bartow', 'Belle Glade',
    'Belleview', 'Boca Raton', 'Bonita Springs', 'Boynton Beach', 'Bradenton', 'Brandon',
    'Cape Coral', 'Casselberry', 'Clearwater', 'Clermont', 'Cocoa', 'Cocoa Beach',
    'Coconut Creek', 'Cooper City', 'Coral Gables', 'Coral Springs', 'Cutler Bay',
    'Dania Beach', 'Davie', 'Daytona Beach', 'Deerfield Beach', 'DeLand', 'Delray Beach',
    'Deltona', 'Doral', 'Dunedin', 'Edgewater', 'Eustis', 'Fort Lauderdale', 'Fort Myers',
    'Fort Pierce', 'Fort Walton Beach', 'Gainesville', 'Greenacres', 'Haines City',
    'Hallandale Beach', 'Hialeah', 'Hollywood', 'Homestead', 'Jacksonville', 'Jacksonville Beach',
    'Jupiter', 'Key West', 'Kissimmee', 'Lady Lake', 'Lake City', 'Lake Mary', 'Lake Wales',
    'Lake Worth', 'Lakeland', 'Largo', 'Lauderdale Lakes', 'Lauderhill', 'Leesburg',
    'Lehigh Acres', 'Margate', 'Melbourne', 'Miami', 'Miami Beach', 'Miami Gardens',
    'Miramar', 'Mount Dora', 'Naples', 'New Port Richey', 'New Smyrna Beach', 'North Fort Myers',
    'North Lauderdale', 'North Miami', 'North Miami Beach', 'North Port', 'Oakland Park',
    'Ocala', 'Ocoee', 'Orlando', 'Ormond Beach', 'Oviedo', 'Palatka', 'Palm Bay',
    'Palm Beach Gardens', 'Palm City', 'Palm Coast', 'Palm Harbor', 'Palm Springs',
    'Palmetto Bay', 'Panama City', 'Pembroke Pines', 'Pensacola', 'Pinellas Park',
    'Plant City', 'Plantation', 'Pompano Beach', 'Port Charlotte', 'Port Orange',
    'Port St. Lucie', 'Riviera Beach', 'Rockledge', 'Royal Palm Beach', 'Sanford',
    'Sarasota', 'Sebastian', 'South Daytona', 'Spring Hill', 'St. Augustine', 'St. Cloud',
    'St. Petersburg', 'Stuart', 'Sunny Isles Beach', 'Sunrise', 'Tallahassee', 'Tamarac',
    'Tampa', 'Tarpon Springs', 'The Villages', 'Titusville', 'Venice', 'Vero Beach',
    'Wellington', 'West Palm Beach', 'Weston', 'Winter Garden', 'Winter Haven',
    'Winter Park', 'Winter Springs'
  ].sort(),
};


interface LandingScreenProps {
  navigation: any;
}

export default function LandingScreen({ navigation }: LandingScreenProps) {
  const { t, language, setLanguage } = useI18n();
  const { isAuthenticated, user, logout } = useAuth();
  const scrollX = useRef(new Animated.Value(0)).current;
  const bannerRef = useRef<FlatList>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  
  // Menu state
  const [showMenu, setShowMenu] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  
  // Content loading state
  const [banners, setBanners] = useState<Banner[]>([]);
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search/Filter state
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<ProviderResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showAllResultsModal, setShowAllResultsModal] = useState(false);
  
  // Offer Detail Modal state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<SpecialOffer | null>(null);
  const [showOfferProvidersModal, setShowOfferProvidersModal] = useState(false);
  const [offerProviderState, setOfferProviderState] = useState('');
  const [offerProviderCity, setOfferProviderCity] = useState('');
  const [showOfferStateDropdown, setShowOfferStateDropdown] = useState(false);
  const [showOfferCityDropdown, setShowOfferCityDropdown] = useState(false);
  const [offerProviders, setOfferProviders] = useState<ProviderResult[]>([]);
  const [hasSearchedOfferProviders, setHasSearchedOfferProviders] = useState(false);

  const getServiceLabel = (serviceIdOrName: string): string => {
    const normalized = (serviceIdOrName || '').trim();

    const mapById: Record<string, string> = {
      oilChange: t.createRequest?.serviceOilChange || t.serviceTypes?.oilChange || 'Oil Change',
      brakes: t.createRequest?.serviceBrakes || t.serviceTypes?.brakes || 'Brakes',
      tires: t.createRequest?.serviceTires || 'Tires',
      engine: t.createRequest?.serviceEngine || t.serviceTypes?.engine || 'Engine',
      transmission: t.createRequest?.serviceTransmission || t.serviceTypes?.transmission || 'Transmission',
      ac: t.createRequest?.serviceAC || 'A/C',
      electrical: t.createRequest?.serviceElectrical || 'Electrical',
      suspension: t.createRequest?.serviceSuspension || t.serviceTypes?.suspension || 'Suspension',
      diagnostics: t.serviceTypes?.diagnostics || 'Diagnostics',
      inspection: t.createRequest?.serviceInspection || t.serviceTypes?.vehicleInspection || 'Inspection',
    };

    if (normalized in mapById) return mapById[normalized];

    // Back-compat for older mock values
    const mapByLegacyName: Record<string, string> = {
      'Oil Change': mapById.oilChange,
      Brakes: mapById.brakes,
      Tires: mapById.tires,
      Engine: mapById.engine,
      Transmission: mapById.transmission,
      'A/C': mapById.ac,
      Electrical: mapById.electrical,
      Suspension: mapById.suspension,
      Diagnostics: mapById.diagnostics,
      Inspection: mapById.inspection,
    };

    return mapByLegacyName[normalized] || normalized;
  };

  const serviceOptions = SERVICE_TYPE_IDS.map((id) => ({ id, label: getServiceLabel(id) }));

  // Carrega dados da home (banners, ofertas, etc)
  const loadHomeData = async () => {
    try {
      const data = await getHomeData();
      setBanners(data.banners || BANNERS);
      setOffers(data.offers || SPECIAL_OFFERS);
    } catch (error) {
      console.error('Erro ao carregar dados da home:', error);
      // Usar dados mock como fallback
      setBanners(BANNERS);
      setOffers(SPECIAL_OFFERS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Carrega dados ao montar o componente
  useEffect(() => {
    loadHomeData();
  }, []);

  // Auto-scroll banners
  useEffect(() => {
    if (banners.length === 0) return;
    
    const interval = setInterval(() => {
      const nextIndex = (currentBannerIndex + 1) % banners.length;
      bannerRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentBannerIndex(nextIndex);
    }, 4000);
    return () => clearInterval(interval);
  }, [currentBannerIndex, banners.length]);

  // Função para atualizar dados
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
  };

  const handleSearch = async () => {
    // TODO: Integrate with real providers search API
    // In production, call: api.get('/providers/search', { params: { state: selectedState, city: selectedCity, service: selectedService } })
    // For now, show empty results until providers search endpoint is available
    setSearchResults([]);
    setHasSearched(true);
  };

  const clearFilters = () => {
    setSelectedState('');
    setSelectedCity('');
    setSelectedService('');
    setSearchResults([]);
    setHasSearched(false);
  };

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
    setOfferProviderState('');
    setOfferProviderCity('');
    setOfferProviders([]);
    setHasSearchedOfferProviders(false);
  };

  // Request service from a provider
  const handleRequestService = (provider: ProviderResult, offer?: SpecialOffer | null) => {
    // Check if user is authenticated before navigating
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      navigation.navigate('Login');
      return;
    }
    
    // Navigate to create request with provider pre-selected
    // First go to Dashboard tab, then push CreateRequest
    navigation.navigate('Dashboard', { 
      screen: 'CreateRequest',
      params: { 
        preSelectedProvider: provider,
        specialOffer: offer || null
      },
      initial: false, // This ensures it's pushed on top of existing stack
    });
  };

  const handleLogout = async () => {
    setShowMenu(false);
    await logout();
  };

  const menuItems = isAuthenticated ? [
    { icon: 'home', label: t.nav?.home || 'Dashboard', action: () => navigation.navigate('Dashboard') },
    { icon: 'car', label: t.nav?.vehicles || 'My Vehicles', action: () => navigation.navigate('Vehicles') },
    { icon: 'person', label: t.nav?.profile || 'Profile', action: () => navigation.navigate('Profile') },
    { icon: 'log-out', label: t.auth?.logout || 'Log Out', action: handleLogout, isLogout: true },
  ] : [
    { icon: 'log-in', label: t.auth?.login || 'Login', action: () => navigation.navigate('Login') },
    { icon: 'person-add', label: t.auth?.signup || 'Sign Up', action: () => navigation.navigate('Signup') },
    { icon: 'information-circle', label: t.common?.info || 'About Us', action: () => {} },
  ];

  const providersToShow = isAuthenticated ? searchResults.slice(0, 10) : searchResults;
  const filterSummary = [
    selectedService && `${t.common?.serviceType || 'Service Type'}: ${getServiceLabel(selectedService)}`,
    selectedCity && `${t.common?.city || 'City'}: ${selectedCity}`,
    selectedState && `${t.common?.state || 'State'}: ${selectedState}`,
  ].filter(Boolean).join(' • ') || 'All providers';

  // Handle navigation for various buttons
  const handleLogin = () => navigation.navigate('Login');
  const handleSignup = () => navigation.navigate('Signup');
  const handleGoToDashboard = () => navigation.navigate('Dashboard');
  const handleCreateRequest = () => navigation.navigate('Dashboard', { screen: 'CreateRequest' });

  const renderBanner = ({ item }: { item: Banner }) => {
    // Support both 'imageUrl' (API/interface) and 'image' (legacy mock) fields
    const bannerUrl = item.imageUrl || (item as any).image || '';
    const fullUrl = bannerUrl.startsWith('http') 
      ? bannerUrl 
      : bannerUrl 
        ? `${process.env.EXPO_PUBLIC_API_URL || 'https://techtrust-api.onrender.com'}${bannerUrl.startsWith('/') ? bannerUrl : '/' + bannerUrl}`
        : '';
    return (
      <View style={styles.bannerSlide}>
        {fullUrl ? (
          <Image source={{ uri: fullUrl }} style={styles.bannerImage} resizeMode="cover" />
        ) : (
          <View style={[styles.bannerImage, { backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center' }]} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.bannerGradient}
        >
          <Text style={styles.bannerTitle}>{item.title}</Text>
          <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
        </LinearGradient>
      </View>
    );
  };

  const renderOffer = ({ item }: { item: SpecialOffer }) => {
    // Support both image and imageUrl fields (mock vs API)
    const rawImageUrl = item.imageUrl || item.image;
    let imageUrl: string | null = null;
    if (rawImageUrl) {
      const urlStr = String(rawImageUrl).trim();
      imageUrl = urlStr.startsWith('http') 
        ? urlStr 
        : `${process.env.EXPO_PUBLIC_API_URL || 'https://techtrust-api.onrender.com'}${urlStr.startsWith('/') ? urlStr : '/' + urlStr}`;
    }

    // Support both API field (discountLabel) and mock field (discount)
    const discountDisplay = (item as any).discountLabel || item.discount || '';

    // Format prices - API returns Decimal (number), mock returns string like "$89.99"
    const formatPrice = (val: any): string => {
      if (!val) return '';
      if (typeof val === 'string' && (val.startsWith('$') || val === 'FREE')) return val;
      const num = Number(val);
      if (isNaN(num)) return String(val);
      return num === 0 ? 'FREE' : `$${num.toFixed(2)}`;
    };
    const originalPrice = formatPrice(item.originalPrice);
    const discountedPrice = formatPrice(item.discountedPrice);

    // Format validUntil - API returns ISO DateTime, mock returns formatted string
    let validUntilStr = '';
    if (item.validUntil) {
      const raw = String(item.validUntil);
      if (raw.includes('T') || (raw.includes('-') && raw.length > 10)) {
        const d = new Date(raw);
        validUntilStr = !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : raw;
      } else {
        validUntilStr = raw;
      }
    }
    
    return (
      <TouchableOpacity style={styles.offerCard} activeOpacity={0.9} onPress={() => handleOfferPress(item)}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.offerImage} />
        ) : (
          <View style={[styles.offerImage, { backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' }]}>
            <MaterialCommunityIcons name="tag-outline" size={40} color="#ef4444" />
          </View>
        )}
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{discountDisplay}</Text>
        </View>
        <View style={styles.offerContent}>
          <Text style={styles.offerTitle}>{item.title}</Text>
          <Text style={styles.offerDescription}>{item.description}</Text>
          <View style={styles.offerPricing}>
            <Text style={styles.originalPrice}>{originalPrice}</Text>
            <Text style={styles.discountedPrice}>{discountedPrice}</Text>
          </View>
          <Text style={styles.validUntil}>{t.landing?.offers?.validUntil || 'Valid until'} {validUntilStr}</Text>
        </View>
        <View style={styles.offerTapHint}>
          <Ionicons name="finger-print" size={16} color="#6b7280" />
          <Text style={styles.offerTapHintText}>{t.landing?.offers?.tapForDetails || 'Tap for details'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProvider = ({ item, offer, variant = 'default' }: { item: ProviderResult, offer?: SpecialOffer | null, variant?: 'default' | 'horizontal' }) => (
    <View style={[styles.providerCard, variant === 'horizontal' && styles.providerCardHorizontal]}>
      <View style={styles.providerHeader}>
        <View style={styles.providerIcon}>
          <MaterialCommunityIcons name="store" size={24} color="#1976d2" />
        </View>
        <View style={styles.providerMainInfo}>
          <View style={styles.providerNameRow}>
            <Text style={styles.providerName} numberOfLines={1}>{item.name}</Text>
            {item.languages && item.languages.length > 0 && (
              <View style={styles.languageFlags}>
                {item.languages.map((lang: string) => (
                  <Text key={lang} style={styles.languageFlagSmall}>
                    {lang === 'en' ? '🇺🇸' : lang === 'pt' ? '🇧🇷' : lang === 'es' ? '🇪🇸' : ''}
                  </Text>
                ))}
              </View>
            )}
          </View>
          <View style={styles.providerMeta}>
            <View style={styles.providerLocation}>
              <Ionicons name="location" size={12} color="#6b7280" />
              <Text style={styles.providerLocationText}>{item.city}, {item.state}</Text>
            </View>
            {isAuthenticated && item.rating > 0 && (
              <View style={styles.providerRating}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={styles.providerRatingText}>{item.rating}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.providerServices}>
        {item.services.slice(0, 3).map((service, idx) => (
          <View key={idx} style={styles.serviceTag}>
            <Text style={styles.serviceTagText}>{getServiceLabel(service)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.providerFooter}>
        <View style={styles.safeTransactionTip}>
          <Ionicons name="shield-checkmark" size={12} color="#10b981" />
          <Text style={styles.safeTransactionText}>{t.common?.safeTransactionTip || 'Always use the platform for secure transactions'}</Text>
        </View>
        {isAuthenticated ? (
          <TouchableOpacity 
            style={styles.requestServiceButton}
            onPress={() => handleRequestService(item, offer)}
          >
            <Text style={styles.requestServiceButtonText}>Request</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.providerLocked}>
            <Ionicons name="lock-closed" size={16} color="#9ca3af" />
            <Text style={styles.lockedText}>Register</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderArticle = ({ item }: { item: typeof ARTICLES[0] }) => (
    <TouchableOpacity style={styles.articleCard} activeOpacity={0.9}>
      <Image source={{ uri: item.image }} style={styles.articleImage} />
      <View style={styles.articleContent}>
        <View style={styles.articleMeta}>
          <Text style={styles.articleCategory}>{item.category}</Text>
          <Text style={styles.articleReadTime}>{item.readTime}</Text>
        </View>
        <Text style={styles.articleTitle}>{item.title}</Text>
        <Text style={styles.articleExcerpt} numberOfLines={2}>{item.excerpt}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{t.common?.loading || 'Loading...'}</Text>
        </View>
      )}

      {!loading && (
      <>
      {/* Logged In Banner */}
      {isAuthenticated && user && (
        <View style={styles.loggedInBanner}>
          <View style={styles.onlineIndicator} />
          <Text style={styles.loggedInText}>Online</Text>
        </View>
      )}
      
      {/* Header with Menu */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={logos.noText} style={styles.headerLogo} resizeMode="contain" />
          <View style={styles.logoTextContainer}>
            <Text style={styles.logoText}>TechTrust</Text>
            <Text style={styles.logoTagline}>Your trusted auto care partner</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {/* Language Selector */}
          <TouchableOpacity 
            style={styles.languageButton}
            onPress={() => setShowLanguageModal(true)}
          >
            <Text style={styles.languageFlag}>{languages.find(l => l.code === language)?.flag || '🇺🇸'}</Text>
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
          </TouchableOpacity>
          {/* Menu Button */}
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => setShowMenu(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={28} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              // Clear search results
              setSearchResults([]);
              setHasSearched(false);
              setSelectedState('');
              setSelectedCity('');
              setSelectedService('');
              // Simulate refresh delay
              await new Promise(resolve => setTimeout(resolve, 1000));
              setRefreshing(false);
            }}
            colors={['#1976d2']}
            tintColor="#1976d2"
          />
        }
      >
        {/* Banner/Ads Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="advertisements" size={20} color="#f59e0b" />
            <Text style={styles.sectionLabel}>Ads & Promotions</Text>
          </View>
          <FlatList
            ref={bannerRef}
            data={banners}
            renderItem={renderBanner}
            keyExtractor={item => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentBannerIndex(index);
            }}
          />
          {/* Pagination dots */}
          <View style={styles.pagination}>
            {BANNERS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  currentBannerIndex === index && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
        </View>

        {/* Search Providers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderLarge}>
            <Ionicons name="search" size={24} color="#1976d2" />
            <View>
              <Text style={styles.sectionTitle}>{t.landing?.search?.title || 'Find Service Providers'}</Text>
              <Text style={styles.sectionSubtitle}>{t.landing?.search?.subtitle || 'Search our certified network'}</Text>
            </View>
          </View>

          <View style={styles.searchFilters}>
            {/* State Dropdown */}
            <TouchableOpacity 
              style={styles.filterDropdown}
              onPress={() => setShowStateDropdown(!showStateDropdown)}
            >
              <Ionicons name="map" size={18} color="#6b7280" />
              <Text style={[styles.filterText, !selectedState && styles.filterPlaceholder]}>
                {selectedState || t.common?.state || 'State'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6b7280" />
            </TouchableOpacity>

            {/* City Dropdown */}
            <TouchableOpacity 
              style={[styles.filterDropdown, !selectedState && styles.filterDisabled]}
              onPress={() => selectedState && setShowCityDropdown(!showCityDropdown)}
            >
              <Ionicons name="business" size={18} color="#6b7280" />
              <Text style={[styles.filterText, !selectedCity && styles.filterPlaceholder]}>
                {selectedCity || t.common?.city || 'City'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6b7280" />
            </TouchableOpacity>

            {/* Service Type Dropdown */}
            <TouchableOpacity 
              style={styles.filterDropdown}
              onPress={() => setShowServiceDropdown(!showServiceDropdown)}
            >
              <Ionicons name="construct" size={18} color="#6b7280" />
              <Text style={[styles.filterText, !selectedService && styles.filterPlaceholder]}>
                {selectedService ? getServiceLabel(selectedService) : (t.common?.serviceType || 'Service Type')}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchActions}>
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.searchButtonText}>{t.common?.search || 'Search'}</Text>
            </TouchableOpacity>
            {(selectedState || selectedCity || selectedService) && (
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>{t.common?.clear || 'Clear'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results */}
          {hasSearched && (
            <View style={styles.searchResults}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>
                  {searchResults.length} {searchResults.length !== 1 ? (t.common?.providersFound || 'Providers Found') : (t.common?.providerFound || 'Provider Found')}
                </Text>
                {isAuthenticated && searchResults.length > 1 && (
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={() => setShowAllResultsModal(true)}
                  >
                    <Text style={styles.viewAllButtonText}>{t.common?.viewAll || 'View all'}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#1976d2" />
                  </TouchableOpacity>
                )}
              </View>

              {searchResults.length > 0 ? (
                isAuthenticated ? (
                  <FlatList
                    data={providersToShow}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalResults}
                    renderItem={({ item }) => (
                      <View style={{ marginRight: 12 }}>
                        {renderProvider({ item, offer: null, variant: 'horizontal' })}
                      </View>
                    )}
                  />
                ) : (
                  searchResults.map(provider => (
                    <View key={provider.id}>
                      {renderProvider({ item: provider, offer: null })}
                    </View>
                  ))
                )
              ) : (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={48} color="#d1d5db" />
                  <Text style={styles.noResultsText}>{t.common?.noResults || 'No results found'}</Text>
                  <Text style={styles.noResultsSubtext}>{t.common?.tryAgain || 'Try adjusting your filters'}</Text>
                </View>
              )}
              
              {/* CTA to Register */}
              {!isAuthenticated && (
                <View style={styles.registerCTA}>
                  <Text style={styles.registerCTATitle}>{t.landing?.cta?.wantFullAccess || 'Want full access?'}</Text>
                  <Text style={styles.registerCTAText}>
                    {t.landing?.cta?.registerDesc || 'Register now to see complete provider details, contact information, and book services directly!'}
                  </Text>
                  <View style={{ gap: 10 }}>
                    <TouchableOpacity 
                      style={styles.registerCTAButton}
                      onPress={handleSignup}
                    >
                      <Text style={styles.registerCTAButtonText}>{t.landing?.cta?.createFreeAccount || 'Create Free Account'}</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.registerCTAButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#1976d2' }]}
                      onPress={() => navigation.navigate('Login')}
                    >
                      <Text style={[styles.registerCTAButtonText, { color: '#1976d2' }]}>
                        {t.auth?.login || 'Login'}
                      </Text>
                      <Ionicons name="log-in-outline" size={18} color="#1976d2" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Special Offers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderLarge}>
            <MaterialCommunityIcons name="tag-multiple" size={24} color="#ef4444" />
            <View>
              <Text style={styles.sectionTitle}>{t.landing?.offers?.title || 'Special Offers'}</Text>
              <Text style={styles.sectionSubtitle}>{t.landing?.offers?.subtitle || 'Limited time deals'}</Text>
            </View>
          </View>
          <FlatList
            data={offers}
            renderItem={renderOffer}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.offersContainer}
          />
        </View>

        {/* Benefits Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderLarge}>
            <Ionicons name="ribbon" size={24} color="#10b981" />
            <View>
              <Text style={styles.sectionTitle}>{t.landing?.benefits?.title || 'Why TechTrust?'}</Text>
              <Text style={styles.sectionSubtitle}>{t.landing?.benefits?.subtitle || 'Benefits of using our platform'}</Text>
            </View>
          </View>
          <View style={styles.benefitsGrid}>
            {[
              { id: '1', icon: 'shield-checkmark', titleKey: 'verified' as const, descKey: 'verifiedDesc' as const },
              { id: '2', icon: 'cash', titleKey: 'pricing' as const, descKey: 'pricingDesc' as const },
              { id: '3', icon: 'time', titleKey: 'time' as const, descKey: 'timeDesc' as const },
              { id: '4', icon: 'star', titleKey: 'quality' as const, descKey: 'qualityDesc' as const },
            ].map(benefit => (
              <View key={benefit.id} style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <Ionicons name={benefit.icon as any} size={28} color="#1976d2" />
                </View>
                <Text style={styles.benefitTitle}>{(t.landing?.benefits as any)?.[benefit.titleKey] || BENEFITS.find(b => b.id === benefit.id)?.title}</Text>
                <Text style={styles.benefitDescription}>{(t.landing?.benefits as any)?.[benefit.descKey] || BENEFITS.find(b => b.id === benefit.id)?.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Articles Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderLarge}>
            <Ionicons name="newspaper" size={24} color="#8b5cf6" />
            <View>
              <Text style={styles.sectionTitle}>{t.landing?.articles?.title || 'Tips & Articles'}</Text>
              <Text style={styles.sectionSubtitle}>{t.landing?.articles?.subtitle || 'Vehicle care guides'}</Text>
            </View>
          </View>
          <FlatList
            data={ARTICLES}
            renderItem={renderArticle}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.articlesContainer}
          />
        </View>

        {/* Important Notices Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderLarge}>
            <Ionicons name="megaphone" size={24} color="#f59e0b" />
            <View>
              <Text style={styles.sectionTitle}>{t.landing?.notices?.title || 'Important Notices'}</Text>
              <Text style={styles.sectionSubtitle}>{t.landing?.notices?.subtitle || 'Stay informed'}</Text>
            </View>
          </View>
          <View style={styles.noticeCard}>
            <View style={styles.noticeIcon}>
              <Ionicons name="information-circle" size={24} color="#1976d2" />
            </View>
            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>{t.landing?.notices?.holidayTitle || 'Holiday Hours'}</Text>
              <Text style={styles.noticeText}>
                {t.landing?.notices?.holidayDesc || 'Some service providers may have modified hours during the holiday season. Please confirm availability when booking.'}
              </Text>
            </View>
          </View>
          <View style={[styles.noticeCard, styles.noticeWarning]}>
            <View style={[styles.noticeIcon, styles.noticeIconWarning]}>
              <Ionicons name="warning" size={24} color="#f59e0b" />
            </View>
            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>{t.landing?.notices?.weatherTitle || 'Weather Advisory'}</Text>
              <Text style={styles.noticeText}>
                {t.landing?.notices?.weatherDesc || 'Heavy rain expected this week. Consider scheduling preventive maintenance and tire checks.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer CTA */}
        {!isAuthenticated && (
          <View style={styles.footerCTA}>
            <Text style={styles.footerCTATitle}>{t.landing?.cta?.title || 'Ready to Get Started?'}</Text>
            <Text style={styles.footerCTAText}>
              {t.landing?.cta?.desc || 'Join thousands of satisfied customers who trust TechTrust for their auto service needs.'}
            </Text>
            <View style={styles.footerCTAButtons}>
              <TouchableOpacity 
                style={styles.footerCTAButtonPrimary}
                onPress={handleSignup}
              >
                <Text style={styles.footerCTAButtonPrimaryText}>{t.auth?.signup || 'Sign Up Free'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.footerCTAButtonSecondary}
                onPress={handleLogin}
              >
                <Text style={styles.footerCTAButtonSecondaryText}>{t.auth?.login || 'Login'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      </>
      )}

      {/* All Providers Modal */}
      <Modal visible={showAllResultsModal} animationType="slide">
        <SafeAreaView style={styles.fullResultsContainer}>
          <View style={styles.fullResultsHeader}>
            <TouchableOpacity onPress={() => setShowAllResultsModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.fullResultsTitle}>{t.landing?.search?.results || 'Providers found'}</Text>
            <View style={{ width: 24 }} />
          </View>
          <Text style={styles.fullResultsSubtitle}>{filterSummary}</Text>
          <ScrollView contentContainerStyle={styles.fullResultsList}>
            {searchResults.length > 0 ? (
              searchResults.map(provider => (
                <View key={provider.id} style={styles.fullResultCardWrapper}>
                  {renderProvider({ item: provider, offer: null })}
                </View>
              ))
            ) : (
              <View style={styles.noResultsFullModal}>
                <Ionicons name="search-outline" size={48} color="#d1d5db" />
                <Text style={styles.noResultsText}>{t.common?.noResults || 'No results found'}</Text>
                <Text style={styles.noResultsSubtext}>{t.common?.tryAgain || 'Try adjusting your filters'}</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Dropdown Modals */}
      {/* State Dropdown */}
      <Modal visible={showStateDropdown} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.dropdownOverlay} 
          onPress={() => setShowStateDropdown(false)}
        >
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownTitle}>{t.landing?.search?.selectState || 'Select State'}</Text>
            <ScrollView style={styles.dropdownScroll}>
              {STATES.map(state => (
                <TouchableOpacity
                  key={state}
                  style={[styles.dropdownItem, selectedState === state && styles.dropdownItemSelected]}
                  onPress={() => {
                    setSelectedState(state);
                    setSelectedCity('');
                    setShowStateDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, selectedState === state && styles.dropdownItemTextSelected]}>
                    {state}
                  </Text>
                  {selectedState === state && <Ionicons name="checkmark" size={20} color="#1976d2" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* City Dropdown */}
      <Modal visible={showCityDropdown} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.dropdownOverlay} 
          onPress={() => setShowCityDropdown(false)}
        >
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownTitle}>{t.landing?.search?.selectCity || 'Select City'}</Text>
            <ScrollView style={styles.dropdownScroll}>
              {(CITIES[selectedState] || []).map(city => (
                <TouchableOpacity
                  key={city}
                  style={[styles.dropdownItem, selectedCity === city && styles.dropdownItemSelected]}
                  onPress={() => {
                    setSelectedCity(city);
                    setShowCityDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, selectedCity === city && styles.dropdownItemTextSelected]}>
                    {city}
                  </Text>
                  {selectedCity === city && <Ionicons name="checkmark" size={20} color="#1976d2" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Service Type Dropdown */}
      <Modal visible={showServiceDropdown} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.dropdownOverlay} 
          onPress={() => setShowServiceDropdown(false)}
        >
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownTitle}>{t.landing?.search?.selectService || 'Select Service Type'}</Text>
            <ScrollView style={styles.dropdownScroll}>
              {serviceOptions.map(({ id, label }) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.dropdownItem, selectedService === id && styles.dropdownItemSelected]}
                  onPress={() => {
                    setSelectedService(id);
                    setShowServiceDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, selectedService === id && styles.dropdownItemTextSelected]}>
                    {label}
                  </Text>
                  {selectedService === id && <Ionicons name="checkmark" size={20} color="#1976d2" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.menuOverlay} 
          onPress={() => setShowMenu(false)}
          activeOpacity={1}
        >
          <View style={styles.menuContent}>
            <View style={styles.menuHeader}>
              <Image source={logos.noText} style={styles.menuLogo} resizeMode="contain" />
              <Text style={styles.menuTitle}>TechTrust</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            {/* Language Selector in Menu */}
            <TouchableOpacity
              style={styles.menuLanguageSelector}
              onPress={() => {
                setShowMenu(false);
                setShowLanguageModal(true);
              }}
            >
              <Ionicons name="globe-outline" size={22} color="#374151" />
              <Text style={styles.menuItemText}>{t.settings?.language || 'Language'}</Text>
              <View style={styles.languageBadge}>
                <Text style={styles.languageBadgeText}>{languages.find(l => l.code === language)?.flag} {languages.find(l => l.code === language)?.nativeName}</Text>
              </View>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <View style={styles.menuItems}>
              {menuItems.map((item: any, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.menuItem, item.isLogout && styles.menuItemLogout]}
                  onPress={() => {
                    setShowMenu(false);
                    item.action();
                  }}
                >
                  <Ionicons name={item.icon as any} size={22} color={item.isLogout ? '#ef4444' : '#374151'} />
                  <Text style={[styles.menuItemText, item.isLogout && styles.menuItemTextLogout]}>{item.label}</Text>
                  {!item.isLogout && <Ionicons name="chevron-forward" size={18} color="#d1d5db" />}
                </TouchableOpacity>
              ))}
            </View>
            {!isAuthenticated && (
              <View style={styles.menuFooter}>
                <TouchableOpacity 
                  style={styles.menuLoginButton}
                  onPress={() => {
                    setShowMenu(false);
                    handleLogin();
                  }}
                >
                  <Text style={styles.menuLoginButtonText}>{t.auth?.login || 'Login'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.menuSignupButton}
                  onPress={() => {
                    setShowMenu(false);
                    handleSignup();
                  }}
                >
                  <Text style={styles.menuSignupButtonText}>{t.auth?.signup || 'Sign Up'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Language Selection Modal */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.dropdownOverlay} 
          onPress={() => setShowLanguageModal(false)}
          activeOpacity={1}
        >
          <View style={styles.languageModalContent}>
            <View style={styles.languageModalHeader}>
              <Ionicons name="globe" size={24} color="#1976d2" />
              <Text style={styles.languageModalTitle}>{t.settings?.selectLanguage || 'Select Language'}</Text>
            </View>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  language === lang.code && styles.languageOptionSelected
                ]}
                onPress={() => {
                  setLanguage(lang.code as Language);
                  setShowLanguageModal(false);
                }}
              >
                <Text style={styles.languageOptionFlag}>{lang.flag}</Text>
                <View style={styles.languageOptionText}>
                  <Text style={styles.languageOptionName}>{lang.nativeName}</Text>
                  <Text style={styles.languageOptionNameEn}>{lang.name}</Text>
                </View>
                {language === lang.code && (
                  <Ionicons name="checkmark-circle" size={24} color="#1976d2" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Offer Detail Modal */}
      <Modal visible={showOfferModal} transparent animationType="slide">
        <View style={styles.offerModalOverlay}>
          <View style={styles.offerModalContent}>
            {selectedOffer && (() => {
                // Compute formatted values for modal
                const rawImgUrl = selectedOffer.imageUrl || selectedOffer.image;
                const imgStr = rawImgUrl ? String(rawImgUrl).trim() : null;
                const modalImgUrl = imgStr
                  ? (imgStr.startsWith('http') ? imgStr : `${process.env.EXPO_PUBLIC_API_URL || 'https://techtrust-api.onrender.com'}${imgStr.startsWith('/') ? imgStr : '/' + imgStr}`)
                  : null;
                const modalDiscount = (selectedOffer as any).discountLabel || selectedOffer.discount || '';
                const fmtPr = (val: any): string => {
                  if (!val) return '';
                  if (typeof val === 'string' && (val.startsWith('$') || val === 'FREE')) return val;
                  const n = Number(val);
                  if (isNaN(n)) return String(val);
                  return n === 0 ? 'FREE' : `$${n.toFixed(2)}`;
                };
                const mOriginal = fmtPr(selectedOffer.originalPrice);
                const mDiscounted = fmtPr(selectedOffer.discountedPrice);
                let mValidUntil = '';
                if (selectedOffer.validUntil) {
                  const raw = String(selectedOffer.validUntil);
                  if (raw.includes('T') || (raw.includes('-') && raw.length > 10)) {
                    const d = new Date(raw);
                    mValidUntil = !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : raw;
                  } else { mValidUntil = raw; }
                }
                return (
              <>
                <TouchableOpacity 
                  style={styles.offerModalClose}
                  onPress={() => setShowOfferModal(false)}
                >
                  <Ionicons name="close-circle" size={32} color="#6b7280" />
                </TouchableOpacity>
                
                {modalImgUrl ? (
                  <Image source={{ uri: modalImgUrl }} style={styles.offerModalImage} />
                ) : (
                  <View style={[styles.offerModalImage, { backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' }]}>
                    <MaterialCommunityIcons name="tag-outline" size={60} color="#ef4444" />
                  </View>
                )}
                
                <View style={styles.offerModalBadge}>
                  <Text style={styles.offerModalBadgeText}>{modalDiscount}</Text>
                </View>
                
                <View style={styles.offerModalBody}>
                  <Text style={styles.offerModalTitle}>{selectedOffer.title}</Text>
                  <Text style={styles.offerModalDescription}>{selectedOffer.description}</Text>
                  
                  <View style={styles.offerModalPricing}>
                    <View>
                      <Text style={styles.offerModalPriceLabel}>Regular Price</Text>
                      <Text style={styles.offerModalOriginalPrice}>{mOriginal}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={24} color="#10b981" />
                    <View>
                      <Text style={styles.offerModalPriceLabel}>Special Price</Text>
                      <Text style={styles.offerModalDiscountedPrice}>{mDiscounted}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.offerModalValidity}>
                    <Ionicons name="time" size={18} color="#f59e0b" />
                    <Text style={styles.offerModalValidityText}>Valid until {mValidUntil}</Text>
                  </View>
                  
                  {!isAuthenticated ? (
                    <View style={styles.offerModalAuth}>
                      <Text style={styles.offerModalAuthText}>
                        Login or sign up to take advantage of this offer!
                      </Text>
                      <View style={styles.offerModalAuthButtons}>
                        <TouchableOpacity 
                          style={styles.offerModalLoginButton}
                          onPress={() => {
                            setShowOfferModal(false);
                            handleLogin();
                          }}
                        >
                          <Text style={styles.offerModalLoginButtonText}>Login</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.offerModalSignupButton}
                          onPress={() => {
                            setShowOfferModal(false);
                            handleSignup();
                          }}
                        >
                          <Text style={styles.offerModalSignupButtonText}>Sign Up</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.offerModalActions}>
                      <TouchableOpacity 
                        style={styles.offerModalFindButton}
                        onPress={handleFindOfferProviders}
                      >
                        <Ionicons name="search" size={20} color="#fff" />
                        <Text style={styles.offerModalFindButtonText}>{t.landing?.offers?.findProvider || 'Find a Provider'}</Text>
                      </TouchableOpacity>
                      <View style={styles.offerModalDisclaimer}>
                        <Ionicons name="information-circle" size={16} color="#f59e0b" />
                        <Text style={styles.offerModalDisclaimerText}>
                          {t.landing?.offers?.disclaimer || 'Special offers may not be available with all providers. Check participating providers below.'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </>
                );
              })()}
          </View>
        </View>
      </Modal>

      {/* Offer Providers Search Modal */}
      <Modal visible={showOfferProvidersModal} transparent animationType="slide">
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
              <Text style={styles.offerProvidersModalTitle}>{t.landing?.findParticipatingProviders || 'Find Participating Providers'}</Text>
              <View style={{ width: 24 }} />
            </View>
            
            {selectedOffer && (
              <View style={styles.offerProvidersOfferBadge}>
                <Text style={styles.offerProvidersOfferTitle}>{selectedOffer.title}</Text>
                <Text style={styles.offerProvidersOfferDiscount}>{(selectedOffer as any).discountLabel || selectedOffer.discount}</Text>
              </View>
            )}
            
            <View style={styles.offerProvidersFilters}>
              {/* State Dropdown */}
              <TouchableOpacity 
                style={styles.offerProvidersDropdown}
                onPress={() => setShowOfferStateDropdown(!showOfferStateDropdown)}
              >
                <Ionicons name="map" size={18} color="#6b7280" />
                <Text style={[styles.filterText, !offerProviderState && styles.filterPlaceholder]}>
                  {offerProviderState || t.landing?.search?.selectState || 'Select State'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6b7280" />
              </TouchableOpacity>
              
              {/* City Dropdown */}
              <TouchableOpacity 
                style={[styles.offerProvidersDropdown, !offerProviderState && styles.filterDisabled]}
                onPress={() => offerProviderState && setShowOfferCityDropdown(!showOfferCityDropdown)}
              >
                <Ionicons name="business" size={18} color="#6b7280" />
                <Text style={[styles.filterText, !offerProviderCity && styles.filterPlaceholder]}>
                  {offerProviderCity || t.landing?.search?.selectCity || 'Select City'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6b7280" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.offerProvidersSearchButton}
                onPress={handleSearchOfferProviders}
              >
                <Ionicons name="search" size={20} color="#fff" />
                <Text style={styles.offerProvidersSearchButtonText}>{t.common?.search || 'Search'}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.offerProvidersDisclaimer}>
              <Ionicons name="alert-circle" size={18} color="#f59e0b" />
              <Text style={styles.offerProvidersDisclaimerText}>
                {t.landing?.offers?.disclaimer || 'Special offers may not be available with all providers. Only participating providers are shown.'}
              </Text>
            </View>
            
            <ScrollView style={styles.offerProvidersList}>
              {hasSearchedOfferProviders ? (
                offerProviders.length > 0 ? (
                  <>
                    <Text style={styles.offerProvidersResultsTitle}>
                      {(t.landing?.participatingProviders || '{count} Participating Provider(s)').replace('{count}', offerProviders.length.toString())}
                    </Text>
                    {offerProviders.map(provider => (
                      <View key={provider.id}>
                        {renderProvider({ item: provider, offer: selectedOffer })}
                      </View>
                    ))}
                  </>
                ) : (
                  <View style={styles.offerProvidersNoResults}>
                    <Ionicons name="search-outline" size={48} color="#d1d5db" />
                    <Text style={styles.offerProvidersNoResultsText}>{t.common?.noResults || 'No providers found'}</Text>
                    <Text style={styles.offerProvidersNoResultsSubtext}>{t.landing?.tryDifferentLocation || 'Try selecting a different location'}</Text>
                  </View>
                )
              ) : (
                <View style={styles.offerProvidersEmptyState}>
                  <Ionicons name="storefront-outline" size={64} color="#d1d5db" />
                  <Text style={styles.offerProvidersEmptyText}>{t.landing?.selectLocationPrompt || 'Select a location to find participating providers'}</Text>
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
          onPress={() => setShowOfferStateDropdown(false)}
        >
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownTitle}>{t.landing?.search?.selectState || 'Select State'}</Text>
            <ScrollView style={styles.dropdownScroll}>
              {STATES.map(state => (
                <TouchableOpacity
                  key={state}
                  style={[styles.dropdownItem, offerProviderState === state && styles.dropdownItemSelected]}
                  onPress={() => {
                    setOfferProviderState(state);
                    setOfferProviderCity('');
                    setShowOfferStateDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, offerProviderState === state && styles.dropdownItemTextSelected]}>
                    {state}
                  </Text>
                  {offerProviderState === state && <Ionicons name="checkmark" size={20} color="#1976d2" />}
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
          onPress={() => setShowOfferCityDropdown(false)}
        >
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownTitle}>{t.landing?.search?.selectCity || 'Select City'}</Text>
            <ScrollView style={styles.dropdownScroll}>
              {(CITIES[offerProviderState] || []).map(city => (
                <TouchableOpacity
                  key={city}
                  style={[styles.dropdownItem, offerProviderCity === city && styles.dropdownItemSelected]}
                  onPress={() => {
                    setOfferProviderCity(city);
                    setShowOfferCityDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, offerProviderCity === city && styles.dropdownItemTextSelected]}>
                    {city}
                  </Text>
                  {offerProviderCity === city && <Ionicons name="checkmark" size={20} color="#1976d2" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  // Logged In Banner
  loggedInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
    gap: 8,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  loggedInText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  loggedInName: {
    fontWeight: '600',
    color: '#1976d2',
  },
  goToDashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  goToDashboardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  logoTextContainer: {
    flexDirection: 'column',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1976d2',
    lineHeight: 22,
  },
  logoTagline: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  languageFlag: {
    fontSize: 18,
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  // Banner styles
  bannerSlide: {
    width: width,
    height: 200,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#e5e7eb',
    marginTop: 4,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  paginationDotActive: {
    backgroundColor: '#1976d2',
    width: 24,
  },
  // Search/Filter styles
  searchFilters: {
    paddingHorizontal: 16,
    gap: 10,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterDisabled: {
    opacity: 0.5,
  },
  filterText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  filterPlaceholder: {
    color: '#9ca3af',
  },
  searchActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1976d2',
    borderRadius: 12,
    paddingVertical: 14,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  clearButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  searchResults: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewAllButtonText: {
    color: '#1976d2',
    fontWeight: '600',
    fontSize: 13,
  },
  horizontalResults: {
    paddingVertical: 6,
    paddingRight: 6,
  },
  noResults: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  // Provider card styles
  providerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  providerCardHorizontal: {
    width: width - 32,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  providerMainInfo: {
    flex: 1,
  },
  providerInfo: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  languageFlags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 8,
  },
  languageFlagSmall: {
    fontSize: 12,
  },
  providerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 3,
  },
  providerLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  providerLocationText: {
    fontSize: 12,
    color: '#6b7280',
  },
  providerServices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  serviceTag: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  serviceTagText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  providerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  safeTransactionTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  safeTransactionText: {
    fontSize: 10,
    color: '#10b981',
    flex: 1,
  },
  providerLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockedText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  registerCTA: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  registerCTATitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976d2',
    marginBottom: 8,
  },
  registerCTAText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  registerCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1976d2',
    borderRadius: 12,
    paddingVertical: 14,
  },
  registerCTAButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  fullResultsContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  fullResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  fullResultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  fullResultsSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  fullResultsList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  fullResultCardWrapper: {
    marginBottom: 12,
  },
  noResultsFullModal: {
    alignItems: 'center',
    padding: 40,
  },
  // Offer card styles
  offersContainer: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  offerCard: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  offerImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  offerContent: {
    padding: 14,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  offerDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  offerPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  originalPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  validUntil: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 8,
  },
  // Benefits styles
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  benefitCard: {
    width: (width - 40) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  benefitDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  // Article styles
  articlesContainer: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  articleCard: {
    width: 260,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  articleImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  articleContent: {
    padding: 14,
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  articleCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8b5cf6',
    textTransform: 'uppercase',
  },
  articleReadTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  articleExcerpt: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  // Notice styles
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  noticeWarning: {
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
  },
  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  noticeIconWarning: {
    backgroundColor: '#fde68a',
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  // Footer CTA styles
  footerCTA: {
    backgroundColor: '#1976d2',
    margin: 16,
    borderRadius: 20,
    padding: 24,
  },
  footerCTATitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  footerCTAText: {
    fontSize: 14,
    color: '#bfdbfe',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  footerCTAButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  footerCTAButtonPrimary: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerCTAButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976d2',
  },
  footerCTAButtonSecondary: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerCTAButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Dropdown styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContent: {
    width: width - 48,
    maxHeight: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownScroll: {
    maxHeight: 320,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemSelected: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#374151',
  },
  dropdownItemTextSelected: {
    color: '#1976d2',
    fontWeight: '600',
  },
  // Menu styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContent: {
    width: width * 0.75,
    maxWidth: 300,
    backgroundColor: '#fff',
    marginTop: 60,
    marginRight: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  menuTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1976d2',
    marginLeft: 10,
  },
  menuLanguageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  languageBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  languageBadgeText: {
    fontSize: 13,
    color: '#4f46e5',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  menuItems: {
    padding: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  menuItemLogout: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
  },
  menuItemTextLogout: {
    color: '#ef4444',
  },
  menuFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  menuLoginButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  menuLoginButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  menuSignupButton: {
    flex: 1,
    backgroundColor: '#1976d2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  menuSignupButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Language Modal styles
  languageModalContent: {
    width: width * 0.85,
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    padding: 8,
  },
  languageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  languageModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 14,
  },
  languageOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  languageOptionFlag: {
    fontSize: 28,
  },
  languageOptionText: {
    flex: 1,
  },
  languageOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  languageOptionNameEn: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  // Provider Rating and Address styles
  providerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  providerRatingText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
  },
  providerAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 10,
  },
  providerAddressText: {
    fontSize: 11,
    color: '#6b7280',
    flex: 1,
  },
  requestServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  requestServiceButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Offer Tap Hint
  offerTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 8,
  },
  offerTapHintText: {
    fontSize: 12,
    color: '#6b7280',
  },
  // Offer Modal styles
  offerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerModalContent: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  offerModalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  offerModalImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  offerModalBadge: {
    position: 'absolute',
    top: 150,
    left: 20,
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  offerModalBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  offerModalBody: {
    padding: 20,
    paddingTop: 30,
  },
  offerModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  offerModalDescription: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 20,
  },
  offerModalPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  offerModalPriceLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  offerModalOriginalPrice: {
    fontSize: 18,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    textAlign: 'center',
  },
  offerModalDiscountedPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10b981',
    textAlign: 'center',
  },
  offerModalValidity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  offerModalValidityText: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '500',
  },
  offerModalAuth: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
  },
  offerModalAuthText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
    marginBottom: 16,
  },
  offerModalAuthButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  offerModalLoginButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1976d2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  offerModalLoginButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976d2',
  },
  offerModalSignupButton: {
    flex: 1,
    backgroundColor: '#1976d2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  offerModalSignupButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  offerModalActions: {
    marginTop: 8,
  },
  offerModalFindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976d2',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  offerModalFindButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  offerModalDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
  },
  offerModalDisclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  // Offer Providers Modal styles
  offerProvidersModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  offerProvidersModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    paddingBottom: 20,
  },
  offerProvidersModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  offerProvidersModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  offerProvidersOfferBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
  },
  offerProvidersOfferTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  offerProvidersOfferDiscount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ef4444',
  },
  offerProvidersFilters: {
    padding: 20,
    gap: 12,
  },
  offerProvidersDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  offerProvidersSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976d2',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  offerProvidersSearchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  offerProvidersDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 20,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
  },
  offerProvidersDisclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  offerProvidersList: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  offerProvidersResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  offerProvidersNoResults: {
    alignItems: 'center',
    padding: 40,
  },
  offerProvidersNoResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  offerProvidersNoResultsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  offerProvidersEmptyState: {
    alignItems: 'center',
    padding: 40,
  },
  offerProvidersEmptyText: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 16,
  },
});
