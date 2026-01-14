/**
 * AddVehicleScreen - Add or Edit Vehicle
 * With additional fields for US market
 * Supports editing existing vehicles
 * ✨ Now with photo upload functionality
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import { useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48 - 16) / 3; // 3 photos per row with padding

interface VehiclePhoto {
  uri: string;
  id: string;
}

export default function AddVehicleScreen({ navigation }: any) {
  const { t } = useI18n();
  const route = useRoute<any>();
  
  // Check if we're editing an existing vehicle
  const editVehicle = route.params?.vehicle || null;
  const isEditing = !!editVehicle;
  
  const [make, setMake] = useState(editVehicle?.make || '');
  const [model, setModel] = useState(editVehicle?.model || '');
  const [year, setYear] = useState(editVehicle?.year?.toString() || '');
  const [plateNumber, setPlateNumber] = useState(editVehicle?.plateNumber || '');
  const [color, setColor] = useState(editVehicle?.color || '');
  const [mileage, setMileage] = useState(editVehicle?.currentMileage?.toString() || '');
  const [vin, setVin] = useState(editVehicle?.vin || '');
  const [trim, setTrim] = useState(editVehicle?.trim || '');
  const [primaryDriver, setPrimaryDriver] = useState(editVehicle?.primaryDriver || '');
  const [fuelType, setFuelType] = useState(editVehicle?.fuelType || '');
  const [vehicleType, setVehicleType] = useState(editVehicle?.vehicleType || '');
  const [insuranceProvider, setInsuranceProvider] = useState(editVehicle?.insuranceProvider || '');
  const [insurancePolicy, setInsurancePolicy] = useState(editVehicle?.insurancePolicy || '');
  const [saving, setSaving] = useState(false);
  
  // 📸 Vehicle photos state - Converter fotos existentes para o formato VehiclePhoto
  const [photos, setPhotos] = useState<VehiclePhoto[]>(() => {
    if (editVehicle?.photos && Array.isArray(editVehicle.photos)) {
      return editVehicle.photos.map((uri: string, index: number) => ({
        uri,
        id: `existing-${index}`,
      }));
    }
    return [];
  });

  // Request camera/gallery permissions
  const requestPermissions = async () => {
    const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
    const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraResult.status !== 'granted' || mediaResult.status !== 'granted') {
      Alert.alert(
        t.common?.permissionRequired || 'Permission Required',
        t.vehicle?.cameraPermissionMessage || 'We need camera and gallery permissions to add vehicle photos.',
        [{ text: t.common?.ok || 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Take photo with camera
  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newPhoto: VehiclePhoto = {
        uri: result.assets[0].uri,
        id: Date.now().toString(),
      };
      setPhotos(prev => [...prev, newPhoto]);
    }
  };

  // Pick from gallery
  const pickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 6 - photos.length,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newPhotos: VehiclePhoto[] = result.assets.map((asset, index) => ({
        uri: asset.uri,
        id: `${Date.now()}-${index}`,
      }));
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 6)); // Max 6 photos
    }
  };

  // Remove photo
  const removePhoto = (photoId: string) => {
    Alert.alert(
      t.common?.confirmDelete || 'Remove Photo',
      t.vehicle?.removePhotoConfirmation || 'Are you sure you want to remove this photo?',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        { 
          text: t.common?.delete || 'Remove', 
          style: 'destructive',
          onPress: () => setPhotos(prev => prev.filter(p => p.id !== photoId))
        },
      ]
    );
  };

  // Show photo options
  const showPhotoOptions = () => {
    if (photos.length >= 6) {
      Alert.alert(
        t.vehicle?.maxPhotosReached || 'Maximum Photos',
        t.vehicle?.maxPhotosMessage || 'You can add up to 6 photos per vehicle.',
        [{ text: t.common?.ok || 'OK' }]
      );
      return;
    }

    Alert.alert(
      t.vehicle?.addPhoto || 'Add Photo',
      t.vehicle?.choosePhotoSource || 'Choose how to add a photo',
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        { text: t.vehicle?.takePhoto || 'Take Photo', onPress: takePhoto },
        { text: t.vehicle?.chooseFromGallery || 'Choose from Gallery', onPress: pickFromGallery },
      ]
    );
  };

  async function handleSave() {
    if (!make || !model || !year || !plateNumber) {
      Alert.alert(t.common?.error || 'Error', t.vehicle?.fillRequiredFields || 'Please fill in all required fields');
      return;
    }
    setSaving(true);
    
    // Preparar dados do veículo com fotos
    const vehicleData = {
      make,
      model,
      year: parseInt(year),
      plateNumber,
      color,
      currentMileage: mileage ? parseInt(mileage) : undefined,
      vin,
      trim,
      primaryDriver,
      fuelType,
      vehicleType,
      insuranceProvider,
      insurancePolicy,
      photos: photos.map(p => p.uri), // Converter para array de URIs
    };
    
    // TODO: Enviar para API quando backend estiver pronto
    // await api.post('/vehicles', vehicleData);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    
    if (isEditing) {
      // Se estiver editando, apenas voltar
      Alert.alert(t.common?.success || 'Success!', t.vehicle?.vehicleUpdatedSuccess || 'Vehicle updated successfully.', [
        { text: t.common?.ok || 'OK', onPress: () => navigation.goBack() }
      ]);
    } else {
      // Se for novo, passar dados de volta para VehiclesScreen
      navigation.navigate('Vehicles', { newVehicle: vehicleData });
    }
  }

  const popularMakes = ['Honda', 'Toyota', 'Ford', 'Chevrolet', 'BMW', 'Mercedes', 'Nissan', 'Hyundai'];
  const fuelTypes = ['Gasoline', 'Diesel', 'Hybrid', 'Electric'];
  const vehicleTypes = ['Car', 'SUV', 'Pickup', 'Van', 'Light Truck'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? (t.vehicle?.editVehicle || 'Edit Vehicle') : (t.vehicle?.addVehicle || 'Add Vehicle')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Vehicle Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.vehicleIcon}>
            <Ionicons name="car-sport" size={48} color="#1976d2" />
          </View>
        </View>

        {/* 📸 Vehicle Photos Section */}
        <Text style={styles.sectionTitle}>{t.vehicle?.vehiclePhotos || 'Vehicle Photos'}</Text>
        <Text style={styles.sectionDescription}>
          {t.vehicle?.vehiclePhotosDescription || 'Add photos of your vehicle (up to 6 photos)'}
        </Text>
        
        <View style={styles.photosContainer}>
          {/* Display existing photos */}
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoWrapper}>
              <Image source={{ uri: photo.uri }} style={styles.photoImage} />
              <TouchableOpacity 
                style={styles.removePhotoBtn} 
                onPress={() => removePhoto(photo.id)}
              >
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
          
          {/* Add photo button */}
          {photos.length < 6 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={showPhotoOptions}>
              <Ionicons name="camera-outline" size={32} color="#6b7280" />
              <Text style={styles.addPhotoText}>{t.vehicle?.addPhoto || 'Add Photo'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Photo tips */}
        <View style={styles.photoTipsContainer}>
          <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
          <Text style={styles.photoTipsText}>
            {t.vehicle?.photoTips || 'Tip: Add photos from different angles (front, back, sides, interior)'}
          </Text>
        </View>

        {/* Basic Information Section */}
        <Text style={styles.sectionTitle}>{t.vehicle?.basicInformation || 'Basic Information'}</Text>

        {/* Make */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.make || 'Make'} *</Text>
          <TextInput style={styles.input} placeholder="e.g., Honda, Toyota" value={make} onChangeText={setMake} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickOptions}>
            {popularMakes.map(m => (
              <TouchableOpacity key={m} style={[styles.quickOption, make === m && styles.quickOptionSelected]} onPress={() => setMake(m)}>
                <Text style={[styles.quickOptionText, make === m && styles.quickOptionTextSelected]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Model */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.model || 'Model'} *</Text>
          <TextInput style={styles.input} placeholder="e.g., Civic, Corolla" value={model} onChangeText={setModel} />
        </View>

        {/* Trim / Submodel */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.trim || 'Trim / Submodel'}</Text>
          <TextInput style={styles.input} placeholder="e.g., EX-L, Sport, Limited" value={trim} onChangeText={setTrim} />
        </View>

        {/* Year */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.year || 'Year'} *</Text>
          <TextInput style={styles.input} placeholder="e.g., 2020" value={year} onChangeText={setYear} keyboardType="numeric" maxLength={4} />
        </View>

        {/* VIN */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.vin || 'VIN (Vehicle Identification Number)'}</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g., 1HGBH41JXMN109186" 
            value={vin} 
            onChangeText={setVin} 
            autoCapitalize="characters" 
            maxLength={17} 
          />
          <Text style={styles.inputHint}>{t.vehicle?.vinHint || '17-character unique identifier'}</Text>
        </View>

        {/* License Plate */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.licensePlate || 'License Plate'} *</Text>
          <TextInput style={styles.input} placeholder="e.g., ABC-1234" value={plateNumber} onChangeText={setPlateNumber} autoCapitalize="characters" maxLength={10} />
        </View>

        {/* Color */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.color || 'Color'}</Text>
          <TextInput style={styles.input} placeholder="e.g., Silver, Black" value={color} onChangeText={setColor} />
        </View>

        {/* Vehicle Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.vehicleType || 'Vehicle Type'}</Text>
          <View style={styles.optionsRow}>
            {vehicleTypes.map(type => (
              <TouchableOpacity 
                key={type} 
                style={[styles.optionChip, vehicleType === type && styles.optionChipSelected]} 
                onPress={() => setVehicleType(type)}
              >
                <Text style={[styles.optionChipText, vehicleType === type && styles.optionChipTextSelected]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fuel Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.fuelType || 'Fuel Type'}</Text>
          <View style={styles.optionsRow}>
            {fuelTypes.map(fuel => (
              <TouchableOpacity 
                key={fuel} 
                style={[styles.optionChip, fuelType === fuel && styles.optionChipSelected]} 
                onPress={() => setFuelType(fuel)}
              >
                <Text style={[styles.optionChipText, fuelType === fuel && styles.optionChipTextSelected]}>{fuel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Mileage */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.currentMileage || 'Current Mileage'}</Text>
          <TextInput style={styles.input} placeholder="e.g., 28000" value={mileage} onChangeText={setMileage} keyboardType="numeric" />
        </View>

        {/* Driver & Insurance Section */}
        <Text style={styles.sectionTitle}>{t.vehicle?.driverInsurance || 'Driver & Insurance'}</Text>

        {/* Primary Driver */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.primaryDriver || 'Primary Driver'}</Text>
          <TextInput style={styles.input} placeholder="e.g., John Doe" value={primaryDriver} onChangeText={setPrimaryDriver} />
        </View>

        {/* Insurance Provider */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.insuranceProvider || 'Insurance Provider'}</Text>
          <TextInput style={styles.input} placeholder="e.g., State Farm, Geico" value={insuranceProvider} onChangeText={setInsuranceProvider} />
        </View>

        {/* Insurance Policy */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.insurancePolicyNumber || 'Insurance Policy Number'}</Text>
          <TextInput style={styles.input} placeholder="e.g., POL-12345678" value={insurancePolicy} onChangeText={setInsurancePolicy} />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? (
            <Text style={styles.saveText}>{t.common?.saving || 'Saving...'}</Text>
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveText}>
                {isEditing ? (t.vehicle?.saveChanges || 'Save Changes') : (t.vehicle?.addVehicle || 'Add Vehicle')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  content: { padding: 16 },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  vehicleIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8 },
  sectionDescription: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, fontSize: 16 },
  inputHint: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  quickOptions: { marginTop: 8 },
  quickOption: { backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  quickOptionSelected: { backgroundColor: '#1976d2' },
  quickOptionText: { fontSize: 14, color: '#374151' },
  quickOptionTextSelected: { color: '#fff', fontWeight: '500' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginBottom: 4 },
  optionChipSelected: { backgroundColor: '#1976d2' },
  optionChipText: { fontSize: 14, color: '#374151' },
  optionChipTextSelected: { color: '#fff', fontWeight: '500' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1976d2', paddingVertical: 16, borderRadius: 12 },
  saveBtnDisabled: { backgroundColor: '#9ca3af' },
  saveText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  // 📸 Photo styles
  photosContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8,
    marginBottom: 12,
  },
  photoWrapper: {
    position: 'relative',
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addPhotoBtn: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  photoTipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  photoTipsText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
});
