/**
 * Tela de Veículos
 * ✨ Atualizada com animações e UI melhorada
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card, Text, FAB, IconButton, useTheme, Chip } from 'react-native-paper';
import api from '../services/api';
import { Vehicle } from '../types';
import { useI18n } from '../i18n';

// ✨ Importando componentes de UI
import {
  FadeInView,
  ScalePress,
  VehicleCardSkeleton,
  EmptyState,
  Toast,
  useToast,
  LoadingOverlay,
  SuccessAnimation,
} from '../components';

export default function VehiclesScreen({ navigation }: any) {
  const { t } = useI18n();
  const theme = useTheme();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // ✨ Toast hook
  const { toast, success, error, hideToast } = useToast();

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = useCallback(async () => {
    if (!loading) setRefreshing(true);
    try {
      const response = await api.get('/vehicles');
      setVehicles(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar veículos:', err);
      error(t.vehicle?.loadError || 'Não foi possível carregar os veículos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleDelete = async (vehicleId: string, plateNumber: string) => {
    Alert.alert(
      t.common?.confirmDelete || 'Confirmar exclusão',
      `${t.vehicle?.deleteConfirmation || 'Deseja realmente excluir o veículo'} ${plateNumber}?`,
      [
        { text: t.common?.cancel || 'Cancelar', style: 'cancel' },
        {
          text: t.common?.delete || 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.delete(`/vehicles/${vehicleId}`);
              setSuccessMessage(t.vehicle?.vehicleDeleted || 'Veículo excluído!');
              setShowSuccess(true);
              loadVehicles();
            } catch (err: any) {
              error(err.response?.data?.message || t.vehicle?.deleteError || 'Erro ao excluir veículo');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (vehicleId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/vehicles/${vehicleId}/set-primary`);
      success(t.vehicle?.primarySet || 'Veículo principal definido!');
      loadVehicles();
    } catch (err: any) {
      error(err.response?.data?.message || t.vehicle?.primaryError || 'Erro ao definir veículo principal');
    } finally {
      setActionLoading(false);
    }
  };

  // ✨ Loading state com Skeletons
  if (loading) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSubtitle} />
          </View>
          {[1, 2, 3].map((i) => (
            <FadeInView key={i} delay={i * 100}>
              <View style={{ marginBottom: 12 }}>
                <VehicleCardSkeleton />
              </View>
            </FadeInView>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={loadVehicles}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* ✨ Header animado */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>{t.vehicle?.myVehicles || 'Meus Veículos'}</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {vehicles.length} {t.vehicle?.vehiclesRegistered || 'veículo(s) cadastrado(s)'}
            </Text>
          </View>
        </FadeInView>

        {/* ✨ Empty State melhorado */}
        {vehicles.length === 0 && (
          <FadeInView delay={100}>
            <EmptyState
              icon="car-off"
              title={t.vehicle?.noVehicles || 'Nenhum veículo cadastrado'}
              description={t.vehicle?.addFirstVehicle || 'Adicione seu primeiro veículo para começar!'}
              actionLabel={t.vehicle?.addVehicle || 'Adicionar Veículo'}
              onAction={() => navigation.navigate('AddVehicle')}
            />
          </FadeInView>
        )}

        {/* ✨ Cards com animação escalonada */}
        {vehicles.map((vehicle, index) => (
          <FadeInView key={vehicle.id} delay={100 + index * 100}>
            <ScalePress onPress={() => {}}>
              <Card style={styles.card}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                      <View style={styles.vehicleIcon}>
                        <Text style={styles.vehicleEmoji}>🚗</Text>
                      </View>
                      <View style={styles.vehicleInfo}>
                        <Text variant="titleMedium" style={styles.cardTitle}>
                          {vehicle.make} {vehicle.model}
                        </Text>
                        <Text variant="bodySmall" style={styles.plateNumber}>
                          {vehicle.plateNumber}
                        </Text>
                      </View>
                      {vehicle.isPrimary && (
                        <Chip
                          icon="star"
                          style={[styles.primaryChip, { backgroundColor: theme.colors.primary }]}
                          textStyle={styles.primaryChipText}
                        >
                          {t.vehicle?.primary || 'Principal'}
                        </Chip>
                      )}
                    </View>
                  </View>

                  <View style={styles.vehicleDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailIcon}>📅</Text>
                      <Text variant="bodySmall" style={styles.detailText}>
                        Ano: {vehicle.year}
                      </Text>
                    </View>
                    {vehicle.color && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailIcon}>🎨</Text>
                        <Text variant="bodySmall" style={styles.detailText}>
                          Cor: {vehicle.color}
                        </Text>
                      </View>
                    )}
                    {vehicle.currentMileage && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailIcon}>📍</Text>
                        <Text variant="bodySmall" style={styles.detailText}>
                          KM: {vehicle.currentMileage.toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardActions}>
                    {!vehicle.isPrimary && (
                      <ScalePress onPress={() => handleSetPrimary(vehicle.id)}>
                        <View style={styles.actionButton}>
                          <IconButton
                            icon="star-outline"
                            size={20}
                            iconColor={theme.colors.primary}
                          />
                          <Text style={[styles.actionText, { color: theme.colors.primary }]}>
                            {t.vehicle?.setAsPrimary || 'Definir principal'}
                          </Text>
                        </View>
                      </ScalePress>
                    )}
                    <ScalePress onPress={() => navigation.navigate('AddVehicle', { vehicle })}>
                      <View style={styles.actionButton}>
                        <IconButton
                          icon="pencil-outline"
                          size={20}
                          iconColor="#f59e0b"
                        />
                        <Text style={[styles.actionText, { color: '#f59e0b' }]}>
                          {t.common?.edit || 'Editar'}
                        </Text>
                      </View>
                    </ScalePress>
                    <ScalePress onPress={() => handleDelete(vehicle.id, vehicle.plateNumber)}>
                      <View style={styles.actionButton}>
                        <IconButton
                          icon="delete-outline"
                          size={20}
                          iconColor={theme.colors.error}
                        />
                        <Text style={[styles.actionText, { color: theme.colors.error }]}>
                          {t.common?.delete || 'Excluir'}
                        </Text>
                      </View>
                    </ScalePress>
                  </View>
                </Card.Content>
              </Card>
            </ScalePress>
          </FadeInView>
        ))}
      </ScrollView>

      {/* ✨ FAB melhorado */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('AddVehicle')}
        label={t.common?.add || 'Adicionar'}
      />

      {/* ✨ Loading Overlay */}
      <LoadingOverlay visible={actionLoading} message={t.common?.processing || 'Processando...'} />

      {/* ✨ Success Animation */}
      <SuccessAnimation
        visible={showSuccess}
        message={successMessage}
        onComplete={() => setShowSuccess(false)}
      />

      {/* ✨ Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 4,
  },
  // Skeleton styles
  skeletonTitle: {
    width: 150,
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    width: 180,
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
    elevation: 3,
    backgroundColor: '#fff',
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vehicleEmoji: {
    fontSize: 24,
  },
  vehicleInfo: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '700',
  },
  primaryChip: {
    height: 28,
  },
  primaryChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  plateNumber: {
    opacity: 0.6,
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: 1,
  },
  vehicleDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  detailText: {
    opacity: 0.7,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: -8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    borderRadius: 16,
  },
});
