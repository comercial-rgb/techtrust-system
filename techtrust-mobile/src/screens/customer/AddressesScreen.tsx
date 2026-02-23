/**
 * AddressesScreen - Gerenciamento de Endereços do Cliente
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import api from "../../services/api";
import { useI18n } from "../../i18n";

// Google Places API key (optional - falls back to Nominatim/OSM)
const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY || "";

// D31 — US States dropdown list
const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

interface PlaceSuggestion {
  id: string;
  displayName: string;
  number: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

// Local fallback key (will migrate to API)
const ADDRESSES_KEY = "@TechTrust:addresses";

interface Address {
  id: string;
  label: string;
  number: string;
  street: string;
  complement?: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export default function AddressesScreen({ navigation }: any) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);

  // D4: Address search/autocomplete state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // D31 — State dropdown
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  // D32 — GPS loading
  const [gettingLocation, setGettingLocation] = useState(false);

  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      if (GOOGLE_PLACES_KEY) {
        // Use Google Places Autocomplete
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&components=country:us&key=${GOOGLE_PLACES_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.predictions) {
          const details = await Promise.all(
            data.predictions.slice(0, 5).map(async (p: any) => {
              try {
                const dResp = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=address_components&key=${GOOGLE_PLACES_KEY}`);
                const dData = await dResp.json();
                const comps = dData.result?.address_components || [];
                const get = (type: string) => comps.find((c: any) => c.types.includes(type))?.short_name || "";
                return {
                  id: p.place_id,
                  displayName: p.description,
                  number: get("street_number"),
                  street: get("route"),
                  city: get("locality") || get("sublocality"),
                  state: get("administrative_area_level_1"),
                  zipCode: get("postal_code"),
                };
              } catch { return null; }
            })
          );
          setSearchResults(details.filter(Boolean) as PlaceSuggestion[]);
        }
      } else {
        // Free fallback: Nominatim (OpenStreetMap) geocoding
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=us`;
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'TechTrust-Mobile/1.0' },
        });
        const data = await resp.json();
        const results: PlaceSuggestion[] = data.map((item: any) => {
          const addr = item.address || {};
          return {
            id: item.place_id?.toString() || Math.random().toString(),
            displayName: item.display_name || "",
            number: addr.house_number || "",
            street: addr.road || "",
            city: addr.city || addr.town || addr.village || addr.hamlet || "",
            state: addr.state ? getStateAbbr(addr.state) : "",
            zipCode: addr.postcode || "",
          };
        });
        setSearchResults(results);
      }
    } catch (err) {
      console.log("Address search error:", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchInput = (text: string) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchAddresses(text), 400);
  };

  const selectSuggestion = (suggestion: PlaceSuggestion) => {
    setFormData({
      ...formData,
      number: suggestion.number,
      street: suggestion.street,
      city: suggestion.city,
      state: suggestion.state,
      zipCode: suggestion.zipCode,
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  // D32 — Use Current Location with reverse geocoding
  const handleUseCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location access is needed to auto-fill your address.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (geocode) {
        const stateCode = geocode.region ? getStateAbbr(geocode.region) : '';
        setFormData(prev => ({
          ...prev,
          number: geocode.streetNumber || prev.number,
          street: geocode.street || prev.street,
          city: geocode.city || geocode.subregion || prev.city,
          state: stateCode || prev.state,
          zipCode: geocode.postalCode || prev.zipCode,
        }));
        Alert.alert('Location Found', 'Address fields have been auto-filled. Please verify and adjust if needed.');
      }
    } catch (err) {
      Alert.alert('Location Error', 'Could not determine your location. Please enter the address manually.');
    } finally {
      setGettingLocation(false);
    }
  };

  // Convert full state name to 2-letter abbreviation
  const getStateAbbr = (stateName: string): string => {
    const states: Record<string, string> = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
      'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
      'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
      'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
      'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
      'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
      'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
      'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
      'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
      'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
      'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
    };
    return states[stateName] || stateName.substring(0, 2).toUpperCase();
  };

  const [formData, setFormData] = useState({
    label: "",
    number: "",
    street: "",
    complement: "",
    city: "",
    state: "",
    zipCode: "",
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      // Try to load from API (cross-device sync)
      const response = await api.get("/users/me");
      const responseData = response.data?.data || response.data;
      const userData = responseData?.user || responseData;

      if (
        userData?.addressesJson &&
        Array.isArray(userData.addressesJson) &&
        userData.addressesJson.length > 0
      ) {
        setAddresses(userData.addressesJson);
        // Also save locally as cache
        await AsyncStorage.setItem(
          ADDRESSES_KEY,
          JSON.stringify(userData.addressesJson),
        );
      } else {
        // Check if there's local data to migrate to API
        const savedAddresses = await AsyncStorage.getItem(ADDRESSES_KEY);
        if (savedAddresses) {
          const parsed = JSON.parse(savedAddresses);
          setAddresses(parsed);
          // Migrate local data to API
          try {
            await api.patch("/users/me", { addressesJson: parsed });
          } catch (e) {
            console.log("Could not sync local addresses to API");
          }
        } else {
          setAddresses([]);
        }
      }
    } catch (error) {
      console.error("Error loading addresses from API:", error);
      // Fallback to local storage
      try {
        const savedAddresses = await AsyncStorage.getItem(ADDRESSES_KEY);
        if (savedAddresses) {
          setAddresses(JSON.parse(savedAddresses));
        } else {
          setAddresses([]);
        }
      } catch (e) {
        setAddresses([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        label: address.label,
        number: address.number,
        street: address.street,
        complement: address.complement || "",
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
      });
    } else {
      setEditingAddress(null);
      setFormData({
        label: "",
        number: "",
        street: "",
        complement: "",
        city: "",
        state: "",
        zipCode: "",
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.street || !formData.number || !formData.city) {
      Alert.alert(
        t.common?.error || "Error",
        t.common?.fillRequiredFields || "Please fill in all required fields.",
      );
      return;
    }

    setSaving(true);
    try {
      let updatedAddresses: Address[];

      if (editingAddress) {
        updatedAddresses = addresses.map((a) =>
          a.id === editingAddress.id ? { ...a, ...formData } : a,
        );
      } else {
        const newAddress: Address = {
          id: Date.now().toString(),
          ...formData,
          isDefault: addresses.length === 0,
        };
        updatedAddresses = [...addresses, newAddress];
      }

      setAddresses(updatedAddresses);

      // Save to API for cross-device sync
      try {
        await api.patch("/users/me", { addressesJson: updatedAddresses });
      } catch (e) {
        console.log("Could not sync addresses to API, saving locally");
      }
      // Also save locally as cache
      await AsyncStorage.setItem(
        ADDRESSES_KEY,
        JSON.stringify(updatedAddresses),
      );

      setShowModal(false);
      Alert.alert(
        t.common?.success || "Success",
        t.customer?.addressSaved || "Address saved successfully.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    const updatedAddresses = addresses.map((a) => ({
      ...a,
      isDefault: a.id === addressId,
    }));
    setAddresses(updatedAddresses);
    await AsyncStorage.setItem(ADDRESSES_KEY, JSON.stringify(updatedAddresses));
    try {
      await api.patch("/users/me", { addressesJson: updatedAddresses });
    } catch (e) {
      /* silent */
    }
  };

  const handleDelete = (addressId: string) => {
    Alert.alert(
      t.customer?.deleteAddress || "Delete Address",
      t.customer?.deleteAddressConfirm ||
        "Are you sure you want to delete this address?",
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t.common?.delete || "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedAddresses = addresses.filter(
              (a) => a.id !== addressId,
            );
            setAddresses(updatedAddresses);
            await AsyncStorage.setItem(
              ADDRESSES_KEY,
              JSON.stringify(updatedAddresses),
            );
            try {
              await api.patch("/users/me", { addressesJson: updatedAddresses });
            } catch (e) {
              /* silent */
            }
          },
        },
      ],
    );
  };

  const getAddressIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case "home":
        return "home";
      case "work":
        return "briefcase";
      default:
        return "location";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t.customer?.myAddresses || "My Addresses"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B5EA7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.customer?.myAddresses || "My Addresses"}
        </Text>
        <TouchableOpacity
          onPress={() => handleOpenModal()}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={24} color="#2B5EA7" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="location-outline" size={64} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>
              {t.customer?.noAddresses || "No addresses yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t.customer?.addFirstAddress ||
                "Add your first address to get started"}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => handleOpenModal()}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>
                {t.customer?.addAddress || "Add Address"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.addressList}>
            {addresses.map((address) => (
              <View key={address.id} style={styles.addressCard}>
                <View style={styles.addressHeader}>
                  <View style={styles.addressIcon}>
                    <Ionicons
                      name={getAddressIcon(address.label) as any}
                      size={20}
                      color="#2B5EA7"
                    />
                  </View>
                  <View style={styles.addressLabelContainer}>
                    <Text style={styles.addressLabel}>{address.label}</Text>
                    {address.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>
                          {t.common?.default || "Default"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => handleOpenModal(address)}
                  >
                    <Ionicons name="create-outline" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.addressText}>
                  {address.number} {address.street}
                  {address.complement ? `, ${address.complement}` : ""}
                </Text>
                <Text style={styles.addressText}>
                  {address.city}, {address.state} {address.zipCode}
                </Text>

                <View style={styles.addressActions}>
                  {!address.isDefault && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetDefault(address.id)}
                    >
                      <Ionicons name="star-outline" size={16} color="#2B5EA7" />
                      <Text style={styles.actionButtonText}>
                        {t.common?.setAsDefault || "Set as Default"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteActionButton]}
                    onPress={() => handleDelete(address.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    <Text
                      style={[styles.actionButtonText, { color: "#ef4444" }]}
                    >
                      {t.common?.delete || "Delete"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddress
                  ? t.customer?.editAddress || "Edit Address"
                  : t.customer?.addAddress || "Add Address"}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* D32 — Use Current Location Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#eff6ff',
                  borderWidth: 1,
                  borderColor: '#bfdbfe',
                  borderStyle: 'dashed',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 16,
                  gap: 10,
                }}
                onPress={handleUseCurrentLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <ActivityIndicator size="small" color="#2B5EA7" />
                ) : (
                  <Ionicons name="navigate" size={20} color="#2B5EA7" />
                )}
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#2B5EA7', flex: 1 }}>
                  {gettingLocation ? 'Getting location...' : 'Use Current Location'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#93c5fd" />
              </TouchableOpacity>

              {/* D4: Address Search Autocomplete */}
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="search" size={13} color="#6b7280" /> Search Address
                </Text>
                <TextInput
                  style={[styles.input, { marginBottom: searchResults.length > 0 ? 0 : 16 }]}
                  placeholder="Start typing an address..."
                  value={searchQuery}
                  onChangeText={handleSearchInput}
                  autoCorrect={false}
                />
                {searching && (
                  <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#2B5EA7" />
                  </View>
                )}
                {searchResults.length > 0 && (
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, marginBottom: 16, maxHeight: 200 }}>
                    {searchResults.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 10 }}
                        onPress={() => selectSuggestion(item)}
                      >
                        <Ionicons name="location" size={18} color="#2B5EA7" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, color: '#1f2937' }} numberOfLines={1}>
                            {item.number ? `${item.number} ${item.street}` : item.street || item.displayName}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#9ca3af' }} numberOfLines={1}>
                            {item.city}{item.state ? `, ${item.state}` : ''}{item.zipCode ? ` ${item.zipCode}` : ''}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <Text style={styles.inputLabel}>Label *</Text>
              <View style={styles.labelOptions}>
                {["Home", "Work", "Other"].map((label) => (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.labelOption,
                      formData.label === label && styles.labelOptionActive,
                    ]}
                    onPress={() => setFormData({ ...formData, label })}
                  >
                    <Ionicons
                      name={getAddressIcon(label) as any}
                      size={18}
                      color={formData.label === label ? "#2B5EA7" : "#6b7280"}
                    />
                    <Text
                      style={[
                        styles.labelOptionText,
                        formData.label === label &&
                          styles.labelOptionTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputHalf, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    value={formData.number}
                    onChangeText={(text) =>
                      setFormData({ ...formData, number: text })
                    }
                  />
                </View>
                <View style={[styles.inputHalf, { flex: 2 }]}>
                  <Text style={styles.inputLabel}>Street *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Main St"
                    value={formData.street}
                    onChangeText={(text) =>
                      setFormData({ ...formData, street: text })
                    }
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Complement</Text>
              <TextInput
                style={styles.input}
                placeholder="Apt, Suite, Unit, etc."
                value={formData.complement}
                onChangeText={(text) =>
                  setFormData({ ...formData, complement: text })
                }
              />

              <View style={styles.inputRow}>
                <View style={[styles.inputHalf, { flex: 2 }]}>
                  <Text style={styles.inputLabel}>City *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="City"
                    value={formData.city}
                    onChangeText={(text) =>
                      setFormData({ ...formData, city: text })
                    }
                  />
                </View>
                <View style={[styles.inputHalf, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>State *</Text>
                  {/* D31 — State Dropdown */}
                  <TouchableOpacity
                    style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                    onPress={() => setShowStateDropdown(!showStateDropdown)}
                  >
                    <Text style={{ fontSize: 16, color: formData.state ? '#111827' : '#9ca3af' }}>
                      {formData.state || 'State'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                  {showStateDropdown && (
                    <View style={{
                      position: 'absolute',
                      top: 72,
                      left: 0,
                      right: 0,
                      backgroundColor: '#fff',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                      maxHeight: 200,
                      zIndex: 100,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 10,
                    }}>
                      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {US_STATES.map((st) => (
                          <TouchableOpacity
                            key={st.code}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 14,
                              paddingVertical: 11,
                              borderBottomWidth: 1,
                              borderBottomColor: '#f3f4f6',
                              backgroundColor: formData.state === st.code ? '#eff6ff' : '#fff',
                            }}
                            onPress={() => {
                              setFormData({ ...formData, state: st.code });
                              setShowStateDropdown(false);
                            }}
                          >
                            <Text style={{ fontSize: 14, fontWeight: formData.state === st.code ? '600' : '400', color: formData.state === st.code ? '#2B5EA7' : '#374151' }}>
                              {st.code} — {st.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.inputLabel}>ZIP Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="32801"
                value={formData.zipCode}
                onChangeText={(text) =>
                  setFormData({ ...formData, zipCode: text })
                }
                keyboardType="numeric"
                maxLength={10}
              />

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? "Saving..." : "Save Address"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
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
    borderBottomColor: "#f3f4f6",
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  addBtn: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2B5EA7",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  addressList: {
    padding: 16,
  },
  addressCard: {
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
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
  addressLabelContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    gap: 8,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  defaultBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    color: "#10b981",
    fontWeight: "600",
  },
  menuButton: {
    padding: 8,
  },
  addressText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  addressActions: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    color: "#2B5EA7",
    fontWeight: "500",
  },
  deleteActionButton: {
    marginLeft: "auto",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  inputLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  labelOptions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  labelOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  labelOptionActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#2B5EA7",
  },
  labelOptionText: {
    fontSize: 14,
    color: "#6b7280",
  },
  labelOptionTextActive: {
    color: "#2B5EA7",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#2B5EA7",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
