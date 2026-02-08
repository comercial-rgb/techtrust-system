/**
 * AddressesScreen - Gerenciamento de Endereços do Cliente
 */

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../i18n';

// Storage key for addresses
const ADDRESSES_KEY = '@TechTrust:addresses';

interface Address {
  id: string;
  label: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
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

  const [formData, setFormData] = useState({
    label: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      // Load saved addresses from AsyncStorage
      const savedAddresses = await AsyncStorage.getItem(ADDRESSES_KEY);
      if (savedAddresses) {
        setAddresses(JSON.parse(savedAddresses));
      } else {
        setAddresses([]);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        label: address.label,
        street: address.street,
        number: address.number,
        complement: address.complement || '',
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
      });
    } else {
      setEditingAddress(null);
      setFormData({
        label: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.street || !formData.number || !formData.city) {
      Alert.alert(t.common?.error || 'Error', t.common?.fillRequiredFields || 'Please fill in all required fields.');
      return;
    }

    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let updatedAddresses: Address[];
      
      if (editingAddress) {
        updatedAddresses = addresses.map(a => 
          a.id === editingAddress.id 
            ? { ...a, ...formData }
            : a
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
      await AsyncStorage.setItem(ADDRESSES_KEY, JSON.stringify(updatedAddresses));
      
      setShowModal(false);
      Alert.alert(t.common?.success || 'Success', t.customer?.addressSaved || 'Address saved successfully.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    const updatedAddresses = addresses.map(a => ({
      ...a,
      isDefault: a.id === addressId,
    }));
    setAddresses(updatedAddresses);
    await AsyncStorage.setItem(ADDRESSES_KEY, JSON.stringify(updatedAddresses));
  };

  const handleDelete = (addressId: string) => {
    Alert.alert(
      t.customer?.deleteAddress || 'Delete Address',
      t.customer?.deleteAddressConfirm || 'Are you sure you want to delete this address?',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.common?.delete || 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedAddresses = addresses.filter(a => a.id !== addressId);
            setAddresses(updatedAddresses);
            await AsyncStorage.setItem(ADDRESSES_KEY, JSON.stringify(updatedAddresses));
          },
        },
      ]
    );
  };

  const getAddressIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home': return 'home';
      case 'work': return 'briefcase';
      default: return 'location';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.customer?.myAddresses || 'My Addresses'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.customer?.myAddresses || 'My Addresses'}</Text>
        <TouchableOpacity onPress={() => handleOpenModal()} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#1976d2" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="location-outline" size={64} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>{t.customer?.noAddresses || 'No addresses yet'}</Text>
            <Text style={styles.emptySubtitle}>{t.customer?.addFirstAddress || 'Add your first address to get started'}</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => handleOpenModal()}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>{t.customer?.addAddress || 'Add Address'}</Text>
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
                      color="#1976d2" 
                    />
                  </View>
                  <View style={styles.addressLabelContainer}>
                    <Text style={styles.addressLabel}>{address.label}</Text>
                    {address.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>{t.common?.default || 'Default'}</Text>
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
                  {address.street}, {address.number}
                  {address.complement ? `, ${address.complement}` : ''}
                </Text>
                <Text style={styles.addressText}>
                  {address.neighborhood}
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
                      <Ionicons name="star-outline" size={16} color="#1976d2" />
                      <Text style={styles.actionButtonText}>{t.common?.setAsDefault || 'Set as Default'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteActionButton]}
                    onPress={() => handleDelete(address.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>{t.common?.delete || 'Delete'}</Text>
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
                {editingAddress ? (t.customer?.editAddress || 'Edit Address') : (t.customer?.addAddress || 'Add Address')}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Label *</Text>
              <View style={styles.labelOptions}>
                {['Home', 'Work', 'Other'].map((label) => (
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
                      color={formData.label === label ? '#1976d2' : '#6b7280'} 
                    />
                    <Text style={[
                      styles.labelOptionText,
                      formData.label === label && styles.labelOptionTextActive,
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Street *</Text>
              <TextInput
                style={styles.input}
                placeholder="Street name"
                value={formData.street}
                onChangeText={(text) => setFormData({ ...formData, street: text })}
              />

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    value={formData.number}
                    onChangeText={(text) => setFormData({ ...formData, number: text })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Complement</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Apt, Suite, etc."
                    value={formData.complement}
                    onChangeText={(text) => setFormData({ ...formData, complement: text })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Neighborhood</Text>
              <TextInput
                style={styles.input}
                placeholder="Neighborhood"
                value={formData.neighborhood}
                onChangeText={(text) => setFormData({ ...formData, neighborhood: text })}
              />

              <View style={styles.inputRow}>
                <View style={[styles.inputHalf, { flex: 2 }]}>
                  <Text style={styles.inputLabel}>City *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="City"
                    value={formData.city}
                    onChangeText={(text) => setFormData({ ...formData, city: text })}
                  />
                </View>
                <View style={[styles.inputHalf, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>State *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="FL"
                    value={formData.state}
                    onChangeText={(text) => setFormData({ ...formData, state: text })}
                    maxLength={2}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>ZIP Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="32801"
                value={formData.zipCode}
                onChangeText={(text) => setFormData({ ...formData, zipCode: text })}
                keyboardType="numeric"
                maxLength={10}
              />

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save Address'}
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addBtn: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addressList: {
    padding: 16,
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  defaultBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  menuButton: {
    padding: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  addressActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    color: '#1976d2',
    fontWeight: '500',
  },
  deleteActionButton: {
    marginLeft: 'auto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  inputLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  labelOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  labelOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  labelOptionActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#1976d2',
  },
  labelOptionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  labelOptionTextActive: {
    color: '#1976d2',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
