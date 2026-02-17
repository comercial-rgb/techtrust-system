/**
 * Tela de Veículos
 * ✨ Atualizada com animações e UI melhorada
 * 📸 Agora exibe foto do veículo quando disponível
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import {
  Card,
  Text,
  FAB,
  IconButton,
  useTheme,
  Chip,
} from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import api from "../services/api";
import { Vehicle } from "../types";
import { useI18n } from "../i18n";

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
} from "../components";

export default function VehiclesScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const theme = useTheme();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // ✨ Toast hook
  const { toast, success, error, hideToast } = useToast();

  useEffect(() => {
    loadVehicles();
  }, []);

  // 📸 Detectar quando volta da tela AddVehicle com um novo veículo
  useFocusEffect(
    useCallback(() => {
      if (route.params?.newVehicle) {
        const newVehicle: Vehicle = {
          ...route.params.newVehicle,
          id: `local-${Date.now()}`,
          isPrimary: vehicles.length === 0,
          createdAt: new Date().toISOString(),
        };
        setVehicles((prev) => [newVehicle, ...prev]);
        success(
          t.vehicle?.vehicleAddedSuccess || "Vehicle added successfully!",
        );
        // Clear the parameter to avoid adding again
        navigation.setParams({ newVehicle: undefined });
      }
    }, [route.params?.newVehicle]),
  );

  const loadVehicles = useCallback(async () => {
    if (!loading) setRefreshing(true);
    try {
      const response = await api.get("/vehicles");
      setVehicles(response.data.data || []);
    } catch (err) {
      console.error("Error loading vehicles:", err);
      // 📱 Works offline - don't show error, just empty list
      // error(t.vehicle?.loadError || 'Could not load vehicles');
      setVehicles([]); // Empty list to work without backend
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleDelete = async (vehicleId: string, plateNumber: string) => {
    Alert.alert(
      t.common?.confirmDelete || "Confirm deletion",
      `${t.vehicle?.deleteConfirmation || "Do you really want to delete vehicle"} ${plateNumber}?`,
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        {
          text: t.common?.delete || "Delete",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.delete(`/vehicles/${vehicleId}`);
              setSuccessMessage(
                t.vehicle?.vehicleDeleted || "Vehicle deleted!",
              );
              setShowSuccess(true);
              loadVehicles();
            } catch (err: any) {
              error(
                err.response?.data?.message ||
                  t.vehicle?.deleteError ||
                  "Error deleting vehicle",
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleSetPrimary = async (vehicleId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/vehicles/${vehicleId}/set-primary`);
      success(t.vehicle?.primarySet || "Primary vehicle set!");
      loadVehicles();
    } catch (err: any) {
      error(
        err.response?.data?.message ||
          t.vehicle?.primaryError ||
          "Error setting primary vehicle",
      );
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
            <Text variant="titleLarge" style={styles.title}>
              {t.vehicle?.myVehicles || "My Vehicles"}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {vehicles.length}{" "}
              {t.vehicle?.vehiclesRegistered || "vehicle(s) registered"}
            </Text>
          </View>
        </FadeInView>

        {/* ✨ Empty State melhorado */}
        {vehicles.length === 0 && (
          <FadeInView delay={100}>
            <EmptyState
              icon="car-off"
              title={t.vehicle?.noVehicles || "No vehicles registered"}
              description={
                t.vehicle?.addFirstVehicle ||
                "Add your first vehicle to get started!"
              }
              actionLabel={t.vehicle?.addVehicle || "Add Vehicle"}
              onAction={() => navigation.navigate("AddVehicle")}
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
                      {/* 📸 Mostra foto do veículo ou ícone padrão */}
                      {vehicle.photos && vehicle.photos.length > 0 ? (
                        <Image
                          source={{ uri: vehicle.photos[0] }}
                          style={styles.vehiclePhoto}
                        />
                      ) : (
                        <View style={styles.vehicleIcon}>
                          <Text style={styles.vehicleEmoji}>🚗</Text>
                        </View>
                      )}
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
                          style={[
                            styles.primaryChip,
                            { backgroundColor: theme.colors.primary },
                          ]}
                          textStyle={styles.primaryChipText}
                        >
                          {t.vehicle?.primary || "Principal"}
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

                  {/* D33 — Maintenance Indicator Badges */}
                  <View style={styles.maintenanceBadges}>
                    {vehicle.currentMileage && vehicle.currentMileage > 5000 && (
                      <View style={[styles.maintenanceBadge, { backgroundColor: '#fef3c7' }]}>
                        <Text style={{ fontSize: 11 }}>🔧</Text>
                        <Text style={[styles.maintenanceBadgeText, { color: '#92400e' }]}>
                          Oil change {vehicle.currentMileage > 7500 ? 'overdue' : 'soon'}
                        </Text>
                      </View>
                    )}
                    {vehicle.year && vehicle.year < 2020 && (
                      <View style={[styles.maintenanceBadge, { backgroundColor: '#fee2e2' }]}>
                        <Text style={{ fontSize: 11 }}>⚠️</Text>
                        <Text style={[styles.maintenanceBadgeText, { color: '#991b1b' }]}>
                          1 recall
                        </Text>
                      </View>
                    )}
                    {vehicle.currentMileage && vehicle.currentMileage > 30000 && (
                      <View style={[styles.maintenanceBadge, { backgroundColor: '#dbeafe' }]}>
                        <Text style={{ fontSize: 11 }}>🔄</Text>
                        <Text style={[styles.maintenanceBadgeText, { color: '#1e40af' }]}>
                          Tire rotation
                        </Text>
                      </View>
                    )}
                    {(!vehicle.currentMileage || vehicle.currentMileage <= 5000) && vehicle.year && vehicle.year >= 2020 && (
                      <View style={[styles.maintenanceBadge, { backgroundColor: '#d1fae5' }]}>
                        <Text style={{ fontSize: 11 }}>✅</Text>
                        <Text style={[styles.maintenanceBadgeText, { color: '#065f46' }]}>
                          All up to date
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
                          <Text
                            style={[
                              styles.actionText,
                              { color: theme.colors.primary },
                            ]}
                          >
                            {t.vehicle?.setAsPrimary || "Definir principal"}
                          </Text>
                        </View>
                      </ScalePress>
                    )}
                    <ScalePress
                      onPress={() =>
                        navigation.navigate("AddVehicle", { vehicle })
                      }
                    >
                      <View style={styles.actionButton}>
                        <IconButton
                          icon="pencil-outline"
                          size={20}
                          iconColor="#f59e0b"
                        />
                        <Text style={[styles.actionText, { color: "#f59e0b" }]}>
                          {t.common?.edit || "Editar"}
                        </Text>
                      </View>
                    </ScalePress>
                    <ScalePress
                      onPress={() =>
                        handleDelete(vehicle.id, vehicle.plateNumber)
                      }
                    >
                      <View style={styles.actionButton}>
                        <IconButton
                          icon="delete-outline"
                          size={20}
                          iconColor={theme.colors.error}
                        />
                        <Text
                          style={[
                            styles.actionText,
                            { color: theme.colors.error },
                          ]}
                        >
                          {t.common?.delete || "Delete"}
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
        onPress={() => navigation.navigate("AddVehicle")}
        label={t.common?.add || "Add"}
      />

      {/* ✨ Loading Overlay */}
      <LoadingOverlay
        visible={actionLoading}
        message={t.common?.processing || "Processing..."}
      />

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
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontWeight: "700",
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 4,
  },
  // Skeleton styles
  skeletonTitle: {
    width: 150,
    height: 24,
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    width: 180,
    height: 16,
    backgroundColor: "#e0e0e0",
    borderRadius: 6,
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
    elevation: 3,
    backgroundColor: "#fff",
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#e3f2fd",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vehiclePhoto: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
  },
  vehicleEmoji: {
    fontSize: 24,
  },
  vehicleInfo: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: "700",
  },
  primaryChip: {
    height: 28,
  },
  primaryChipText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  plateNumber: {
    opacity: 0.6,
    marginTop: 2,
    fontWeight: "600",
    letterSpacing: 1,
  },
  vehicleDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  detailText: {
    opacity: 0.7,
  },
  // D33 — Maintenance badges
  maintenanceBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 10,
  },
  maintenanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  maintenanceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: -8,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    borderRadius: 16,
  },
});
