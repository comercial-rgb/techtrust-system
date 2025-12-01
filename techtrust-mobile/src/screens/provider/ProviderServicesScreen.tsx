/**
 * ProviderServicesScreen - Serviços Oferecidos
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useI18n } from '../../i18n';

interface Service {
  id: string;
  name: string;
  icon: string;
  category: string;
  enabled: boolean;
  description?: string;
}

export default function ProviderServicesScreen({ navigation }: any) {
  const { t } = useI18n();
  const [services, setServices] = useState<Service[]>([
    { id: '1', name: 'Troca de Óleo', icon: 'oil', category: 'Manutenção', enabled: true },
    { id: '2', name: 'Alinhamento e Balanceamento', icon: 'tire', category: 'Manutenção', enabled: true },
    { id: '3', name: 'Freios', icon: 'car-brake-abs', category: 'Manutenção', enabled: true },
    { id: '4', name: 'Suspensão', icon: 'car-traction-control', category: 'Manutenção', enabled: true },
    { id: '5', name: 'Motor', icon: 'engine', category: 'Reparos', enabled: true },
    { id: '6', name: 'Transmissão', icon: 'car-shift-pattern', category: 'Reparos', enabled: false },
    { id: '7', name: 'Sistema Elétrico', icon: 'flash', category: 'Reparos', enabled: true },
    { id: '8', name: 'Ar Condicionado', icon: 'air-conditioner', category: 'Reparos', enabled: true },
    { id: '9', name: 'Diagnóstico', icon: 'stethoscope', category: 'Inspeção', enabled: true },
    { id: '10', name: 'Inspeção Veicular', icon: 'clipboard-check', category: 'Inspeção', enabled: false },
    { id: '11', name: 'Lavagem Completa', icon: 'car-wash', category: 'Estética', enabled: false },
    { id: '12', name: 'Polimento', icon: 'auto-fix', category: 'Estética', enabled: false },
    { id: '13', name: 'Assistência Rodoviária', icon: 'tow-truck', category: 'SOS', enabled: false, description: 'Socorro em estrada, reboque, pane seca, troca de pneu' },
    { id: '14', name: 'Pane Seca', icon: 'gas-station', category: 'SOS', enabled: false, description: 'Entrega de combustível de emergência' },
    { id: '15', name: 'Troca de Pneu', icon: 'tire', category: 'SOS', enabled: false, description: 'Troca de pneu furado na estrada' },
    { id: '16', name: 'Reboque', icon: 'tow-truck', category: 'SOS', enabled: false, description: 'Serviço de reboque e guincho' },
    { id: '17', name: 'Carga de Bateria', icon: 'car-battery', category: 'SOS', enabled: false, description: 'Recarga ou troca de bateria descarregada' },
    { id: '18', name: 'Chaveiro Automotivo', icon: 'key-variant', category: 'SOS', enabled: false, description: 'Abertura de veículos, cópia de chaves' },
  ]);

  const toggleService = (id: string) => {
    setServices(services.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const enabledCount = services.filter(s => s.enabled).length;

  const categories = [...new Set(services.map(s => s.category))];

  const handleSave = () => {
    Alert.alert(t.common.success, t.success?.updated || 'Services updated successfully!');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.provider?.servicesOffered || 'Services Offered'}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveBtn}>{t.common.save}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
        <Text style={styles.statsText}>
          {enabledCount} {t.common?.of || 'of'} {services.length} {t.provider?.activeServices || 'active services'}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {categories.map(category => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <View style={styles.servicesCard}>
              {services
                .filter(s => s.category === category)
                .map((service, index, arr) => (
                  <View 
                    key={service.id}
                    style={[
                      styles.serviceItem,
                      index < arr.length - 1 && styles.serviceItemBorder,
                    ]}
                  >
                    <View style={[
                      styles.serviceIcon,
                      { backgroundColor: service.enabled ? '#dbeafe' : '#f3f4f6' },
                    ]}>
                      <MaterialCommunityIcons 
                        name={service.icon as any} 
                        size={22} 
                        color={service.enabled ? '#1976d2' : '#9ca3af'} 
                      />
                    </View>
                    <View style={styles.serviceInfo}>
                      <Text style={[
                        styles.serviceName,
                        !service.enabled && styles.serviceNameDisabled,
                      ]}>
                        {service.name}
                      </Text>
                    </View>
                    <Switch
                      value={service.enabled}
                      onValueChange={() => toggleService(service.id)}
                      trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                      thumbColor={service.enabled ? '#1976d2' : '#9ca3af'}
                    />
                  </View>
                ))}
            </View>
          </View>
        ))}

        {/* Add Custom Service */}
        <TouchableOpacity style={styles.addServiceButton}>
          <MaterialCommunityIcons name="plus-circle" size={22} color="#1976d2" />
          <Text style={styles.addServiceText}>Adicionar Serviço Personalizado</Text>
        </TouchableOpacity>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Você só receberá pedidos para os serviços que estiverem ativos. 
            Desative temporariamente serviços que não puder atender.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    padding: 8,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 12,
    gap: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#065f46',
    fontWeight: '500',
  },
  categorySection: {
    padding: 16,
    paddingBottom: 0,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  servicesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  serviceItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  serviceNameDisabled: {
    color: '#9ca3af',
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1976d2',
    borderStyle: 'dashed',
    gap: 8,
  },
  addServiceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976d2',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#dbeafe',
    margin: 16,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});
