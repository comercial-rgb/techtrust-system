/**
 * ProviderServiceAreaScreen - Área de Cobertura
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';

interface CoverageZone {
  id: string;
  name: string;
  region: string;
  active: boolean;
}

export default function ProviderServiceAreaScreen({ navigation }: any) {
  const { t } = useI18n();
  const [baseAddress, setBaseAddress] = useState('Av. Paulista, 1000 - Bela Vista, São Paulo - SP');
  const [serviceRadius, setServiceRadius] = useState(15);
  const [mobileService, setMobileService] = useState(true);
  const [extraFeePerKm, setExtraFeePerKm] = useState('5.00');
  const [freeKm, setFreeKm] = useState('5');

  const [coverageZones, setCoverageZones] = useState<CoverageZone[]>([
    { id: '1', name: 'Centro', region: 'São Paulo - SP', active: true },
    { id: '2', name: 'Zona Sul', region: 'São Paulo - SP', active: true },
    { id: '3', name: 'Zona Oeste', region: 'São Paulo - SP', active: true },
    { id: '4', name: 'Zona Norte', region: 'São Paulo - SP', active: false },
    { id: '5', name: 'ABC Paulista', region: 'Grande São Paulo', active: false },
  ]);

  const toggleZone = (id: string) => {
    setCoverageZones(zones =>
      zones.map(z => z.id === id ? { ...z, active: !z.active } : z)
    );
  };

  const handleSave = () => {
    Alert.alert(t.common?.success || 'Success', t.provider?.serviceAreaUpdated || 'Service area updated!');
    navigation.goBack();
  };

  const radiusOptions = [5, 10, 15, 20, 30, 50];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.provider?.serviceArea || 'Service Area'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Map Preview Placeholder */}
        <View style={styles.mapPreview}>
          <View style={styles.mapPlaceholder}>
            <MaterialCommunityIcons name="map-marker-radius" size={60} color="#1976d2" />
            <Text style={styles.mapText}>{t.provider?.serviceRadius || 'Service Radius'}: {serviceRadius} km</Text>
            <Text style={styles.mapSubtext}>{coverageZones.filter(z => z.active).length} {t.provider?.activeZones || 'active zones'}</Text>
          </View>
        </View>

        {/* Base Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.provider?.baseAddress || 'Base Address'}</Text>
          <View style={styles.card}>
            <View style={styles.addressRow}>
              <MaterialCommunityIcons name="map-marker" size={24} color="#1976d2" />
              <View style={styles.addressInfo}>
                <Text style={styles.addressText}>{baseAddress}</Text>
                <TouchableOpacity style={styles.changeAddressBtn}>
                  <Text style={styles.changeAddressText}>{t.provider?.changeAddress || 'Change address'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Service Radius */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.provider?.serviceRadius || 'Service Radius'}</Text>
          <View style={styles.card}>
            <Text style={styles.radiusLabel}>{t.provider?.selectRadius || 'Select the maximum travel radius'}:</Text>
            <View style={styles.radiusOptions}>
              {radiusOptions.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.radiusOption,
                    serviceRadius === r && styles.radiusOptionActive,
                  ]}
                  onPress={() => setServiceRadius(r)}
                >
                  <Text style={[
                    styles.radiusOptionText,
                    serviceRadius === r && styles.radiusOptionTextActive,
                  ]}>
                    {r} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Mobile Service Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.provider?.mobileService || 'Mobile Service'}</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <MaterialCommunityIcons name="truck" size={24} color="#374151" />
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>{t.provider?.onSiteService || 'On-Site Service'}</Text>
                  <Text style={styles.switchDescription}>
                    {t.provider?.onSiteServiceDesc || 'I go to the customer to perform services'}
                  </Text>
                </View>
              </View>
              <Switch
                value={mobileService}
                onValueChange={setMobileService}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={mobileService ? '#1976d2' : '#fff'}
              />
            </View>

            {mobileService && (
              <View style={styles.mobileFeeSettings}>
                <View style={styles.feeInputRow}>
                  <View style={styles.feeInputGroup}>
                    <Text style={styles.feeInputLabel}>{t.provider?.freeKm || 'Free KM'}</Text>
                    <View style={styles.inputWithUnit}>
                      <TextInput
                        style={styles.feeInput}
                        value={freeKm}
                        onChangeText={setFreeKm}
                        keyboardType="numeric"
                      />
                      <Text style={styles.inputUnit}>km</Text>
                    </View>
                  </View>
                  <View style={styles.feeInputGroup}>
                    <Text style={styles.feeInputLabel}>{t.provider?.extraKmFee || 'Extra KM Fee'}</Text>
                    <View style={styles.inputWithUnit}>
                      <Text style={styles.inputPrefix}>R$</Text>
                      <TextInput
                        style={styles.feeInput}
                        value={extraFeePerKm}
                        onChangeText={setExtraFeePerKm}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
                <Text style={styles.feeNote}>
                  {t.provider?.firstKmFree || 'First'} {freeKm} {t.provider?.kmFree || 'km free, after'} R$ {extraFeePerKm}/{t.provider?.extraKm || 'km extra'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Coverage Zones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.provider?.coverageZones || 'Coverage Zones'}</Text>
            <TouchableOpacity style={styles.addZoneBtn}>
              <MaterialCommunityIcons name="plus" size={20} color="#1976d2" />
              <Text style={styles.addZoneText}>{t.common?.add || 'Add'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {coverageZones.map((zone, index) => (
              <View 
                key={zone.id} 
                style={[
                  styles.zoneRow,
                  index < coverageZones.length - 1 && styles.zoneRowBorder,
                ]}
              >
                <View style={styles.zoneInfo}>
                  <MaterialCommunityIcons 
                    name={zone.active ? "map-marker-check" : "map-marker-off"} 
                    size={22} 
                    color={zone.active ? '#10b981' : '#9ca3af'} 
                  />
                  <View>
                    <Text style={[
                      styles.zoneName,
                      !zone.active && styles.zoneNameInactive,
                    ]}>
                      {zone.name}
                    </Text>
                    <Text style={styles.zoneRegion}>{zone.region}</Text>
                  </View>
                </View>
                <Switch
                  value={zone.active}
                  onValueChange={() => toggleZone(zone.id)}
                  trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                  thumbColor={zone.active ? '#1976d2' : '#fff'}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <MaterialCommunityIcons name="lightbulb-outline" size={24} color="#f59e0b" />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>{t.common?.tip || 'Tip'}</Text>
            <Text style={styles.tipsText}>
              {t.provider?.serviceAreaTip || 'A larger service radius may increase your requests, but remember to consider travel time and costs.'}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{t.common?.saveChanges || 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>
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
  mapPreview: {
    backgroundColor: '#e5e7eb',
    height: 200,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
  },
  mapText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginTop: 8,
  },
  mapSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressInfo: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  changeAddressBtn: {
    marginTop: 8,
  },
  changeAddressText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  radiusLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  radiusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  radiusOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#f3f4f6',
  },
  radiusOptionActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#1976d2',
  },
  radiusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  radiusOptionTextActive: {
    color: '#1976d2',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  switchDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  mobileFeeSettings: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  feeInputRow: {
    flexDirection: 'row',
    gap: 16,
  },
  feeInputGroup: {
    flex: 1,
  },
  feeInputLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  inputPrefix: {
    fontSize: 14,
    color: '#6b7280',
  },
  inputUnit: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  feeInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 10,
  },
  feeNote: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 12,
    fontStyle: 'italic',
  },
  addZoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addZoneText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  zoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  zoneRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  zoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  zoneNameInactive: {
    color: '#9ca3af',
  },
  zoneRegion: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveBtn: {
    backgroundColor: '#1976d2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
