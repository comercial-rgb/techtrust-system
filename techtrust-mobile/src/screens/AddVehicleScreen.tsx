/**
 * AddVehicleScreen - Add Vehicle
 * With additional fields for US market
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';

export default function AddVehicleScreen({ navigation }: any) {
  const { t } = useI18n();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [color, setColor] = useState('');
  const [mileage, setMileage] = useState('');
  const [vin, setVin] = useState('');
  const [trim, setTrim] = useState('');
  const [primaryDriver, setPrimaryDriver] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicy, setInsurancePolicy] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!make || !model || !year || !plateNumber) {
      Alert.alert(t.common?.error || 'Error', t.vehicle?.fillRequiredFields || 'Please fill in all required fields');
      return;
    }
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSaving(false);
    Alert.alert(t.common?.success || 'Success!', t.vehicle?.vehicleAddedSuccess || 'Vehicle added successfully.', [
      { text: t.common?.ok || 'OK', onPress: () => navigation.goBack() }
    ]);
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
        <Text style={styles.headerTitle}>{t.vehicle?.addVehicle || 'Add Vehicle'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Vehicle Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.vehicleIcon}>
            <Ionicons name="car-sport" size={48} color="#1976d2" />
          </View>
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
            <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={styles.saveText}>{t.vehicle?.addVehicle || 'Add Vehicle'}</Text></>
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
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 16 },
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
});
