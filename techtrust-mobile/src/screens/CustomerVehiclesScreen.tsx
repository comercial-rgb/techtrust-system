/**
 * CustomerVehiclesScreen - Customer Vehicle List
 * Modern design with visual cards
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { FadeInView, ScalePress } from '../components/Animated';
import { VehicleSkeleton } from '../components/Skeleton';
import { useI18n } from '../i18n';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  color?: string;
  currentMileage?: number;
  lastService?: string;
  nextServiceDue?: string;
  isDefault: boolean;
}

export default function CustomerVehiclesScreen({ navigation }: any) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Recarregar veículos sempre que a tela ganhar foco
  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [])
  );

  async function loadVehicles() {
    try {
      // Buscar veículos reais da API
      const { getVehicles } = await import('../services/dashboard.service');
      const vehiclesData = await getVehicles();
      
      setVehicles(vehiclesData.map(v => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        plateNumber: v.plateNumber,
        color: v.color,
        currentMileage: v.currentMileage,
        lastService: v.lastService,
        nextServiceDue: v.nextServiceDue,
        isDefault: v.isDefault,
      })));
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  }

  function handleSetDefault(vehicleId: string) {
    setVehicles(prev => prev.map(v => ({
      ...v,
      isDefault: v.id === vehicleId,
    })));
  }

  function handleDeleteVehicle(vehicleId: string) {
    Alert.alert(
      t.vehicles?.removeVehicle || 'Remove Vehicle',
      t.vehicles?.removeVehicleConfirm || 'Are you sure you want to remove this vehicle?',
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.remove,
          style: 'destructive',
          onPress: () => {
            setVehicles(prev => prev.filter(v => v.id !== vehicleId));
          },
        },
      ]
    );
  }

  function formatMileage(miles: number) {
    return miles.toLocaleString() + ' mi';
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function isServiceDue(date?: string) {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>{t.vehicles?.myVehicles || 'My Vehicles'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <VehicleSkeleton />
        <VehicleSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>{t.vehicles?.myVehicles || 'My Vehicles'}</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddVehicle')}
        >
          <Ionicons name="add" size={24} color="#1976d2" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats */}
        <FadeInView delay={0}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{vehicles.length}</Text>
              <Text style={styles.statLabel}>Vehicles</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {vehicles.reduce((acc, v) => acc + (v.currentMileage || 0), 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Miles</Text>
            </View>
          </View>
        </FadeInView>

        {/* Vehicle List */}
        {vehicles.length === 0 ? (
          <FadeInView delay={100}>
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="car-outline" size={64} color="#d1d5db" />
              </View>
              <Text style={styles.emptyTitle}>No vehicles registered</Text>
              <Text style={styles.emptySubtitle}>
                Add your first vehicle to request services
              </Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => navigation.navigate('AddVehicle')}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Add Vehicle</Text>
              </TouchableOpacity>
            </View>
          </FadeInView>
        ) : (
          vehicles.map((vehicle, index) => (
            <FadeInView key={vehicle.id} delay={100 + index * 100}>
              <TouchableOpacity 
                style={styles.vehicleCard}
                onPress={() => navigation.navigate('VehicleDetails', { vehicleId: vehicle.id })}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.vehicleIconContainer}>
                    <Ionicons name="car-sport" size={28} color="#1976d2" />
                  </View>
                  <View style={styles.vehicleInfo}>
                    <View style={styles.vehicleNameRow}>
                      <Text style={styles.vehicleName}>
                        {vehicle.make} {vehicle.model}
                      </Text>
                      {vehicle.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Ionicons name="star" size={10} color="#f59e0b" />
                          <Text style={styles.defaultText}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.vehicleYear}>{vehicle.year}</Text>
                  </View>
                  <TouchableOpacity style={styles.menuButton}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* Details */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Plate</Text>
                    <Text style={styles.detailValue}>{vehicle.plateNumber}</Text>
                  </View>
                  
                  {vehicle.color && (
                    <View style={styles.detailItem}>
                      <Ionicons name="color-palette-outline" size={16} color="#6b7280" />
                      <Text style={styles.detailLabel}>Color</Text>
                      <Text style={styles.detailValue}>{vehicle.color}</Text>
                    </View>
                  )}
                  
                  {vehicle.currentMileage && (
                    <View style={styles.detailItem}>
                      <Ionicons name="speedometer-outline" size={16} color="#6b7280" />
                      <Text style={styles.detailLabel}>Mileage</Text>
                      <Text style={styles.detailValue}>{formatMileage(vehicle.currentMileage)}</Text>
                    </View>
                  )}
                </View>

                {/* Service Info */}
                {vehicle.lastService && (
                  <View style={styles.serviceInfo}>
                    <View style={styles.serviceItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.serviceLabel}>Last service:</Text>
                      <Text style={styles.serviceValue}>{formatDate(vehicle.lastService)}</Text>
                    </View>
                    
                    {vehicle.nextServiceDue && (
                      <View style={styles.serviceItem}>
                        <Ionicons 
                          name={isServiceDue(vehicle.nextServiceDue) ? 'warning' : 'calendar'} 
                          size={16} 
                          color={isServiceDue(vehicle.nextServiceDue) ? '#ef4444' : '#6b7280'} 
                        />
                        <Text style={[
                          styles.serviceLabel,
                          isServiceDue(vehicle.nextServiceDue) && styles.serviceDue
                        ]}>
                          Next service:
                        </Text>
                        <Text style={[
                          styles.serviceValue,
                          isServiceDue(vehicle.nextServiceDue) && styles.serviceDue
                        ]}>
                          {formatDate(vehicle.nextServiceDue)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Actions */}
                <View style={styles.cardActions}>
                  <ScalePress 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('Home', { screen: 'CreateRequest', params: { vehicleId: vehicle.id } })}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#1976d2" />
                    <Text style={styles.actionButtonText}>{t.customer?.requestService || 'Request Service'}</Text>
                  </ScalePress>

                  <TouchableOpacity 
                    style={styles.actionButtonEdit}
                    onPress={() => navigation.navigate('AddVehicle', { vehicle })}
                  >
                    <Ionicons name="pencil-outline" size={18} color="#f59e0b" />
                    <Text style={[styles.actionButtonSecondaryText, { color: '#f59e0b' }]}>{t.common?.edit || 'Edit'}</Text>
                  </TouchableOpacity>

                  {!vehicle.isDefault && (
                    <TouchableOpacity 
                      style={styles.actionButtonSecondary}
                      onPress={() => handleSetDefault(vehicle.id)}
                    >
                      <Ionicons name="star-outline" size={18} color="#6b7280" />
                      <Text style={styles.actionButtonSecondaryText}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            </FadeInView>
          ))
        )}

        {/* Add Vehicle Card */}
        {vehicles.length > 0 && (
          <FadeInView delay={300}>
            <TouchableOpacity 
              style={styles.addVehicleCard}
              onPress={() => navigation.navigate('AddVehicle')}
            >
              <View style={styles.addVehicleIcon}>
                <Ionicons name="add" size={32} color="#6b7280" />
              </View>
              <Text style={styles.addVehicleText}>Add new vehicle</Text>
            </TouchableOpacity>
          </FadeInView>
        )}

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400e',
  },
  vehicleYear: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  serviceInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  serviceLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  serviceValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  serviceDue: {
    color: '#ef4444',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1976d2',
  },
  actionButtonEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  addVehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    gap: 12,
  },
  addVehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addVehicleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});
