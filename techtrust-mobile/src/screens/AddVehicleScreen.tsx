/**
 * AddVehicleScreen - Add or Edit Vehicle
 * ✨ Integração com NHTSA vPIC API para auto-preenchimento via VIN
 * Com suporte para entrada manual quando VIN não for fornecido
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import { useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { decodeVIN, isValidVINFormat } from '../services/nhtsa.service';
import api from '../services/api';

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
  
  // Estados básicos
  const [vin, setVin] = useState(editVehicle?.vin || '');
  const [plateNumber, setPlateNumber] = useState(editVehicle?.plateNumber || '');
  const [plateState, setPlateState] = useState(editVehicle?.plateState || '');
  const [color, setColor] = useState(editVehicle?.color || '');
  
  // Estados auto-preenchidos via VIN ou manuais
  const [make, setMake] = useState(editVehicle?.make || '');
  const [model, setModel] = useState(editVehicle?.model || '');
  const [year, setYear] = useState(editVehicle?.year?.toString() || '');
  const [engineType, setEngineType] = useState(editVehicle?.engineType || '');
  const [fuelType, setFuelType] = useState(editVehicle?.fuelType || '');
  const [bodyType, setBodyType] = useState(editVehicle?.bodyType || '');
  const [trim, setTrim] = useState(editVehicle?.trim || '');
  
  const [mileage, setMileage] = useState(editVehicle?.currentMileage?.toString() || '');
  const [vehicleType, setVehicleType] = useState(editVehicle?.vehicleType || '');
  const [primaryDriver, setPrimaryDriver] = useState(editVehicle?.primaryDriver || '');
  const [insuranceProvider, setInsuranceProvider] = useState(editVehicle?.insuranceProvider || '');
  const [insurancePolicy, setInsurancePolicy] = useState(editVehicle?.insurancePolicy || '');
  const [saving, setSaving] = useState(false);
  const [decodingVIN, setDecodingVIN] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);
  const [manualEntry, setManualEntry] = useState(!editVehicle?.vin); // Se não tem VIN, é entrada manual
  
  // 📸 Vehicle photos state
  const [photos, setPhotos] = useState<VehiclePhoto[]>(() => {
    if (editVehicle?.photos && Array.isArray(editVehicle.photos)) {
      return editVehicle.photos.map((uri: string, index: number) => ({
        uri,
        id: `existing-${index}`,
      }));
    }
    return [];
  });
  
  // Vehicle limit check for freemium plans
  const [vehicleCount, setVehicleCount] = useState(0);
  const [vehicleLimit, setVehicleLimit] = useState(1); // Default freemium: 1 vehicle
  
  useEffect(() => {
    if (!isEditing) {
      checkVehicleLimit();
    }
  }, [isEditing]);
  
  const checkVehicleLimit = async () => {
    try {
      const response = await api.get('/vehicles');
      const vehicles = response.data?.vehicles || response.data?.data || [];
      setVehicleCount(vehicles.length);
      
      // TODO: Get vehicle limit from user's subscription plan
      // For now, using default limits:
      // Freemium: 1 vehicle, Basic: 5 vehicles, Premium: 10 vehicles
      // This should come from the user's subscription data
    } catch (error) {
      console.error('Error checking vehicle limit:', error);
    }
  };

  // Função para decodificar VIN
  const handleDecodeVIN = async () => {
    if (!vin || vin.trim().length !== 17) {
      Alert.alert(
        t.vehicle?.invalidVIN || 'VIN Inválido',
        t.vehicle?.vinMustBe17 || 'VIN deve ter exatamente 17 caracteres'
      );
      return;
    }

    if (!isValidVINFormat(vin)) {
      Alert.alert(
        t.vehicle?.invalidVIN || 'VIN Inválido',
        t.vehicle?.vinInvalidFormat || 'VIN contém caracteres inválidos (não use I, O, Q)'
      );
      return;
    }

    setDecodingVIN(true);
    
    try {
      const result = await decodeVIN(vin);
      
      if (result.success && result.data) {
        // Auto-preencher campos
        setMake(result.data.make);
        setModel(result.data.model);
        setYear(result.data.year.toString());
        setEngineType(result.data.engineType || '');
        setFuelType(result.data.fuelType || '');
        setBodyType(result.data.bodyType || '');
        setTrim(result.data.trim || '');
        setVinDecoded(true);
        setManualEntry(false);
        
        Alert.alert(
          t.vehicle?.success || 'Sucesso!',
          t.vehicle?.vinDecoded || 'Dados do veículo preenchidos automaticamente'
        );
      } else {
        Alert.alert(
          t.vehicle?.vinNotFound || 'VIN Não Encontrado',
          result.error || t.vehicle?.couldNotDecodeVIN || 'Não foi possível decodificar este VIN. Você pode preencher manualmente.',
          [
            {
              text: t.vehicle?.manualEntry || 'Preencher Manualmente',
              onPress: () => {
                setManualEntry(true);
                setVinDecoded(false);
              }
            },
            { text: t.common?.cancel || 'Cancelar', style: 'cancel' }
          ]
        );
      }
    } catch (error: any) {
      console.error('Error decoding VIN:', error);
      Alert.alert(
        t.common?.error || 'Erro',
        error?.message || t.vehicle?.vinDecodeError || 'Erro ao decodificar VIN. Verifique sua conexão e tente novamente.',
        [
          {
            text: t.vehicle?.manualEntry || 'Preencher Manualmente',
            onPress: () => {
              setManualEntry(true);
              setVinDecoded(false);
            }
          },
          { text: t.common?.cancel || 'Cancelar', style: 'cancel' }
        ]
      );
    } finally {
      setDecodingVIN(false);
    }
  };

  // Habilitar entrada manual
  const enableManualEntry = () => {
    setManualEntry(true);
    Alert.alert(
      t.vehicle?.manualEntryEnabled || 'Entrada Manual Ativada',
      t.vehicle?.manualEntryMessage || 'Você pode agora preencher todos os campos manualmente'
    );
  };

  // Request camera/gallery permissions
  const requestPermissions = async () => {
    try {
      const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraResult.status !== 'granted') {
        Alert.alert(
          t.common?.permissionRequired || 'Permissão Necessária',
          t.vehicle?.cameraPermissionMessage || 'Precisamos de permissão para câmera e galeria para adicionar fotos do veículo.',
          [{ text: t.common?.ok || 'OK' }]
        );
        return false;
      }
      
      const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaResult.status !== 'granted') {
        Alert.alert(
          t.common?.permissionRequired || 'Permissão Necessária',
          t.vehicle?.cameraPermissionMessage || 'Precisamos de permissão para câmera e galeria para adicionar fotos do veículo.',
          [{ text: t.common?.ok || 'OK' }]
        );
        return false;
      }
      
      return true;
    } catch (error: any) {
      console.error('Error requesting permissions:', error);
      Alert.alert(
        t.common?.error || 'Erro',
        error?.message || 'Não foi possível solicitar permissões. Tente novamente.',
        [{ text: t.common?.ok || 'OK' }]
      );
      return false;
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newPhoto: VehiclePhoto = {
          uri: result.assets[0].uri,
          id: Date.now().toString(),
        };
        setPhotos(prev => [...prev, newPhoto]);
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert(
        t.common?.error || 'Erro',
        error?.message || t.vehicle?.photoError || 'Falha ao tirar foto. Por favor, tente novamente.',
        [{ text: t.common?.ok || 'OK' }]
      );
    }
  };

  // Pick from gallery
  const pickFromGallery = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 6 - photos.length,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhotos: VehiclePhoto[] = result.assets.map((asset, index) => ({
          uri: asset.uri,
          id: `${Date.now()}-${index}`,
        }));
        setPhotos(prev => [...prev, ...newPhotos].slice(0, 6)); // Max 6 photos
      }
    } catch (error: any) {
      console.error('Error picking from gallery:', error);
      Alert.alert(
        t.common?.error || 'Erro',
        error?.message || t.vehicle?.photoError || 'Falha ao selecionar fotos. Por favor, tente novamente.',
        [{ text: t.common?.ok || 'OK' }]
      );
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
    // Check vehicle limit for new vehicles (not when editing)
    if (!isEditing && vehicleCount >= vehicleLimit) {
      Alert.alert(
        t.vehicle?.vehicleLimitReached || 'Vehicle Limit Reached',
        t.vehicle?.upgradePlanForMoreVehicles || `You have reached your limit of ${vehicleLimit} vehicle(s). Upgrade your plan to add more vehicles.`,
        [
          { text: t.common?.cancel || 'Cancel', style: 'cancel' },
          { 
            text: t.vehicle?.upgradePlan || 'Upgrade Plan', 
            onPress: () => {
              navigation.goBack();
              navigation.navigate('Profile', { screen: 'SubscriptionPlan' });
            }
          },
        ]
      );
      return;
    }
    
    // Validar campos obrigatórios
    if (!make || !model || !year) {
      Alert.alert(
        t.common?.error || 'Error', 
        t.vehicle?.fillRequiredFields || 'Por favor, preencha Marca, Modelo e Ano'
      );
      return;
    }
    
    setSaving(true);
    
    try {
      // Preparar dados do veículo
      const vehicleData = {
        make,
        model,
        year: parseInt(year),
        plateNumber: plateNumber || undefined,
        plateState: plateState || undefined,
        vin: vin || undefined,
        color,
        currentMileage: mileage ? parseInt(mileage) : undefined,
        engineType,
        fuelType,
        bodyType,
        trim,
        vinDecoded,
        photos: photos.map(p => p.uri),
      };
      
      if (isEditing) {
        // Atualizar veículo existente
        await api.patch(`/vehicles/${editVehicle.id}`, vehicleData);
        Alert.alert(
          t.common?.success || 'Success!', 
          t.vehicle?.vehicleUpdatedSuccess || 'Veículo atualizado com sucesso',
          [{ text: t.common?.ok || 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // Criar novo veículo
        await api.post('/vehicles', vehicleData);
        Alert.alert(
          t.common?.success || 'Success!', 
          t.vehicle?.vehicleAddedSuccess || 'Veículo adicionado com sucesso',
          [{ text: t.common?.ok || 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      console.error('Erro ao salvar veículo:', error);
      Alert.alert(
        t.common?.error || 'Error', 
        error.response?.data?.message || t.vehicle?.errorSaving || 'Erro ao salvar veículo'
      );
    } finally {
      setSaving(false);
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

        {/* VIN Section with Decoder */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.vin || 'VIN (Vehicle Identification Number)'}</Text>
          <View style={styles.vinInputContainer}>
            <TextInput 
              style={[styles.input, styles.vinInput]} 
              placeholder="e.g., 1HGBH41JXMN109186" 
              value={vin} 
              onChangeText={setVin} 
              autoCapitalize="characters" 
              maxLength={17}
              editable={!decodingVIN && !vinDecoded}
            />
            {!vinDecoded && (
              <TouchableOpacity 
                style={[styles.decodeBtn, decodingVIN && styles.decodeBtnDisabled]} 
                onPress={handleDecodeVIN}
                disabled={decodingVIN || vin.length < 17}
              >
                {decodingVIN ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="search" size={16} color="#fff" />
                    <Text style={styles.decodeBtnText}>{t.vehicle?.decode || 'Decode'}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          {vinDecoded && (
            <View style={styles.vinDecodedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.vinDecodedText}>{t.vehicle?.vinDecoded || 'VIN decoded - fields auto-filled'}</Text>
            </View>
          )}
          <Text style={styles.inputHint}>
            {t.vehicle?.vinHint || 'Optional - Enter VIN to auto-fill vehicle details'}
          </Text>
        </View>

        {/* Manual Entry Toggle */}
        {!vinDecoded && !manualEntry && (
          <TouchableOpacity style={styles.manualEntryBtn} onPress={enableManualEntry}>
            <Ionicons name="create-outline" size={20} color="#1976d2" />
            <Text style={styles.manualEntryText}>
              {t.vehicle?.manualEntry || 'Enter details manually (without VIN)'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Show fields only if VIN decoded or manual entry enabled */}
        {(vinDecoded || manualEntry) && (
          <>
            {/* Make */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.vehicle?.make || 'Make'} *</Text>
              <TextInput 
                style={[styles.input, vinDecoded && styles.inputReadOnly]} 
                placeholder="e.g., Honda, Toyota" 
                value={make} 
                onChangeText={setMake}
                editable={!vinDecoded}
              />
              {!vinDecoded && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickOptions}>
                  {popularMakes.map(m => (
                    <TouchableOpacity key={m} style={[styles.quickOption, make === m && styles.quickOptionSelected]} onPress={() => setMake(m)}>
                      <Text style={[styles.quickOptionText, make === m && styles.quickOptionTextSelected]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Model */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.vehicle?.model || 'Model'} *</Text>
              <TextInput 
                style={[styles.input, vinDecoded && styles.inputReadOnly]} 
                placeholder="e.g., Civic, Corolla" 
                value={model} 
                onChangeText={setModel}
                editable={!vinDecoded}
              />
            </View>

            {/* Year */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.vehicle?.year || 'Year'} *</Text>
              <TextInput 
                style={[styles.input, vinDecoded && styles.inputReadOnly]} 
                placeholder="e.g., 2020" 
                value={year} 
                onChangeText={setYear} 
                keyboardType="numeric" 
                maxLength={4}
                editable={!vinDecoded}
              />
            </View>

            {/* Trim / Submodel */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.vehicle?.trim || 'Trim / Submodel'}</Text>
              <TextInput 
                style={[styles.input, vinDecoded && styles.inputReadOnly]} 
                placeholder="e.g., EX-L, Sport, Limited" 
                value={trim} 
                onChangeText={setTrim}
                editable={!vinDecoded}
              />
            </View>

            {/* Engine Type */}
            {engineType && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.vehicle?.engine || 'Engine'}</Text>
                <TextInput 
                  style={[styles.input, styles.inputReadOnly]} 
                  value={engineType}
                  editable={false}
                />
              </View>
            )}

            {/* Body Type */}
            {bodyType && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.vehicle?.bodyType || 'Body Type'}</Text>
                <TextInput 
                  style={[styles.input, styles.inputReadOnly]} 
                  value={bodyType}
                  editable={false}
                />
              </View>
            )}
          </>
        )}

        {/* License Plate - Always visible */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.licensePlate || 'License Plate'}</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g., ABC-1234" 
            value={plateNumber} 
            onChangeText={setPlateNumber} 
            autoCapitalize="characters" 
            maxLength={10} 
          />
          <Text style={styles.inputHint}>{t.vehicle?.plateHint || 'Optional'}</Text>
        </View>

        {/* Plate State (for US plates) */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t.vehicle?.plateState || 'Plate State (for US)'}</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g., CA, NY, TX" 
            value={plateState} 
            onChangeText={setPlateState} 
            autoCapitalize="characters" 
            maxLength={2} 
          />
          <Text style={styles.inputHint}>{t.vehicle?.plateStateHint || 'Optional - 2 letter state code'}</Text>
        </View>

        {/* Color - Always manual */}
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
  vinInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vinInput: {
    flex: 1,
    marginBottom: 0,
  },
  decodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  decodeBtnDisabled: {
    backgroundColor: '#9ca3af',
  },
  decodeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  vinDecodedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  vinDecodedText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '500',
  },
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  manualEntryText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  inputReadOnly: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
});
