/**
 * VehicleDetailsScreen - Vehicle Details with Maintenance History
 * Modern design with maintenance history and total spent
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FadeInView, ScalePress } from "../components/Animated";
import { useI18n } from "../i18n";

interface MaintenanceRecord {
  id: string;
  workOrderId?: string;
  type: string;
  description: string;
  date: string;
  mileage: number;
  cost: number;
  provider: string;
  status: "completed" | "in-progress" | "scheduled";
}

interface VehicleDetails {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  plateNumber: string;
  trim: string;
  color: string;
  currentMileage: number;
  fuelType: string;
  vehicleType: string;
  primaryDriver: string;
  insuranceProvider: string;
  insurancePolicy: string;
  insuranceExpiry: string;
  lastService: string;
  nextServiceDue: string;
  isDefault: boolean;
  maintenanceHistory: MaintenanceRecord[];
  totalMaintenanceSpent: number;
}

export default function VehicleDetailsScreen({ navigation, route }: any) {
  const { t } = useI18n();
  const { vehicleId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);

  useEffect(() => {
    loadVehicleDetails();
  }, []);

  async function loadVehicleDetails() {
    try {
      // Buscar detalhes do veículo da API
      const api = (await import("../services/api")).default;
      const response = await api.get(`/vehicles/${vehicleId}`);
      const vehicleData = response.data.data;

      if (vehicleData) {
        setVehicle({
          id: vehicleData.id,
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          vin: vehicleData.vin || "",
          plateNumber: vehicleData.plateNumber || "",
          trim: vehicleData.trim || "",
          color: vehicleData.color || "",
          currentMileage: vehicleData.currentMileage || 0,
          fuelType: vehicleData.fuelType || "",
          vehicleType: vehicleData.vehicleType || "Car",
          primaryDriver: vehicleData.primaryDriver || "",
          insuranceProvider: vehicleData.insuranceProvider || "",
          insurancePolicy: vehicleData.insurancePolicy || "",
          insuranceExpiry: vehicleData.insuranceExpiry || "",
          lastService: vehicleData.lastService || "",
          nextServiceDue: vehicleData.nextServiceDue || "",
          isDefault: vehicleData.isDefault || false,
          totalMaintenanceSpent: vehicleData.totalMaintenanceSpent || 0,
          maintenanceHistory: vehicleData.maintenanceHistory || [],
        });
      }
    } catch (error) {
      console.error("Error loading vehicle:", error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadVehicleDetails();
    setRefreshing(false);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatMileage(miles: number) {
    return miles.toLocaleString() + " mi";
  }

  function formatCurrency(amount: number) {
    return "$" + amount.toFixed(2);
  }

  function isExpiringSoon(date: string) {
    const expiry = new Date(date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }

  function isExpired(date: string) {
    return new Date(date) < new Date();
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "completed":
        return { bg: "#d1fae5", text: "#10b981" };
      case "in-progress":
        return { bg: "#dbeafe", text: "#3b82f6" };
      case "scheduled":
        return { bg: "#fef3c7", text: "#f59e0b" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280" };
    }
  }

  if (loading || !vehicle) {
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
            {t.vehicle?.vehicleDetails || "Vehicle Details"}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text>{t.common?.loading || "Loading..."}</Text>
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
          {t.vehicle?.vehicleDetails || "Vehicle Details"}
        </Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate("AddVehicle", { vehicle })}
        >
          <Ionicons name="create-outline" size={24} color="#1976d2" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Vehicle Hero */}
        <FadeInView delay={0}>
          <View style={styles.heroSection}>
            <View style={styles.vehicleIconLarge}>
              <Ionicons name="car-sport" size={64} color="#1976d2" />
            </View>
            <Text style={styles.vehicleTitle}>
              {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim || ""}
            </Text>
            {vehicle.fuelType ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 6,
                  gap: 8,
                }}
              >
                {vehicle.fuelType && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#eff6ff",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}
                  >
                    <Ionicons name="flash" size={12} color="#1976d2" />
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#1976d2",
                        fontWeight: "600",
                        marginLeft: 4,
                      }}
                    >
                      {vehicle.fuelType}
                    </Text>
                  </View>
                )}
                {vehicle.vehicleType ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#f0fdf4",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}
                  >
                    <Ionicons name="car" size={12} color="#059669" />
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#059669",
                        fontWeight: "600",
                        marginLeft: 4,
                      }}
                    >
                      {vehicle.vehicleType}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {vehicle.isDefault && (
              <View style={styles.defaultBadge}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={styles.defaultText}>
                  {t.vehicle?.defaultVehicle || "Default Vehicle"}
                </Text>
              </View>
            )}
          </View>
        </FadeInView>

        {/* Quick Stats */}
        <FadeInView delay={100}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="speedometer-outline" size={24} color="#1976d2" />
              <Text style={styles.statValue}>
                {formatMileage(vehicle.currentMileage)}
              </Text>
              <Text style={styles.statLabel}>
                {t.vehicle?.currentMileage || "Current Mileage"}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="wallet-outline" size={24} color="#10b981" />
              <Text style={styles.statValue}>
                {formatCurrency(vehicle.totalMaintenanceSpent)}
              </Text>
              <Text style={styles.statLabel}>
                {t.vehicle?.totalSpent || "Total Spent"}
              </Text>
            </View>
          </View>
        </FadeInView>

        {/* Vehicle Information */}
        <FadeInView delay={200}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t.vehicle?.vehicleInformation || "Vehicle Information"}
            </Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRowColumn}>
                <Text style={styles.infoLabel} numberOfLines={2}>
                  {t.vehicle?.vin || "VIN (Vehicle Identification Number)"}
                </Text>
                <Text style={styles.infoValueFullVIN} selectable>
                  {vehicle.vin || "-"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.licensePlate || "License Plate"}
                </Text>
                <Text style={styles.infoValue}>{vehicle.plateNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.color || "Color"}
                </Text>
                <Text style={styles.infoValue}>{vehicle.color}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.fuelType || "Fuel Type"}
                </Text>
                <Text style={styles.infoValue}>{vehicle.fuelType}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.vehicleType || "Vehicle Type"}
                </Text>
                <Text style={styles.infoValue}>{vehicle.vehicleType}</Text>
              </View>
              {vehicle.driveType && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.driveType || "Drive Type"}
                  </Text>
                  <Text style={styles.infoValue}>{vehicle.driveType}</Text>
                </View>
              )}
              {vehicle.bodyType && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.bodyType || "Body Style"}
                  </Text>
                  <Text style={styles.infoValue}>{vehicle.bodyType}</Text>
                </View>
              )}
              {vehicle.category && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.category || "Category"}
                  </Text>
                  <Text style={styles.infoValue}>{vehicle.category}</Text>
                </View>
              )}
              {vehicle.seatingCapacity && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.seatingCapacity || "Seating Capacity"}
                  </Text>
                  <Text style={styles.infoValue}>
                    {vehicle.seatingCapacity}
                  </Text>
                </View>
              )}
              {vehicle.numberOfRows && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.numberOfRows || "Seat Rows"}
                  </Text>
                  <Text style={styles.infoValue}>{vehicle.numberOfRows}</Text>
                </View>
              )}
              {vehicle.countryOfManufacturer && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.countryOfManufacturer ||
                      "Country of Manufacture"}
                  </Text>
                  <Text style={styles.infoValue}>
                    {vehicle.countryOfManufacturer}
                  </Text>
                </View>
              )}
              {vehicle.engineType && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {t.vehicle?.engine || "Engine"}
                  </Text>
                  <Text style={styles.infoValue}>{vehicle.engineType}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.primaryDriver || "Primary Driver"}
                </Text>
                <Text style={styles.infoValue}>{vehicle.primaryDriver}</Text>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* Insurance Information */}
        <FadeInView delay={300}>
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {t.vehicle?.insurance || "Insurance"}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("Insurance", { vehicleId: vehicle.id })
                }
              >
                <Text style={styles.seeAllText}>
                  {t.common?.manage || "Manage"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.provider || "Provider"}
                </Text>
                <Text style={styles.infoValue}>
                  {vehicle.insuranceProvider}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.policyNumber || "Policy Number"}
                </Text>
                <Text style={styles.infoValue}>{vehicle.insurancePolicy}</Text>
              </View>
              <View style={styles.infoRowColumn}>
                <Text style={styles.infoLabel}>
                  {t.vehicle?.expiration || "Expiration"}
                </Text>
                <View style={styles.expiryContainerColumn}>
                  <Text
                    style={[
                      styles.infoValueFull,
                      isExpired(vehicle.insuranceExpiry) && styles.expiredText,
                      isExpiringSoon(vehicle.insuranceExpiry) &&
                        styles.expiringSoonText,
                    ]}
                  >
                    {formatDate(vehicle.insuranceExpiry)}
                  </Text>
                  {isExpired(vehicle.insuranceExpiry) && (
                    <View style={styles.expiredBadge}>
                      <Ionicons name="warning" size={12} color="#ef4444" />
                      <Text style={styles.expiredBadgeText}>
                        {t.vehicle?.expired || "Expired"}
                      </Text>
                    </View>
                  )}
                  {isExpiringSoon(vehicle.insuranceExpiry) &&
                    !isExpired(vehicle.insuranceExpiry) && (
                      <View style={styles.expiringSoonBadge}>
                        <Ionicons
                          name="alert-circle"
                          size={12}
                          color="#f59e0b"
                        />
                        <Text style={styles.expiringSoonBadgeText}>
                          {t.vehicle?.expiringSoon || "Expiring Soon"}
                        </Text>
                      </View>
                    )}
                </View>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* Service Status */}
        <FadeInView delay={350}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t.vehicle?.serviceStatus || "Service Status"}
            </Text>
            <View style={styles.serviceStatusCard}>
              <View style={styles.serviceStatusItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <View style={styles.serviceStatusInfo}>
                  <Text style={styles.serviceStatusLabel}>
                    {t.vehicle?.lastService || "Last Service"}
                  </Text>
                  <Text style={styles.serviceStatusValue}>
                    {formatDate(vehicle.lastService)}
                  </Text>
                </View>
              </View>
              <View style={styles.serviceStatusItem}>
                <Ionicons name="calendar" size={20} color="#3b82f6" />
                <View style={styles.serviceStatusInfo}>
                  <Text style={styles.serviceStatusLabel}>
                    {t.vehicle?.nextServiceDue || "Next Service Due"}
                  </Text>
                  <Text style={styles.serviceStatusValue}>
                    {formatDate(vehicle.nextServiceDue)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* Maintenance History */}
        <FadeInView delay={400}>
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {t.vehicle?.maintenanceHistory || "Maintenance History"}
              </Text>
              <Text style={styles.historyCount}>
                {vehicle.maintenanceHistory.length}{" "}
                {t.vehicle?.records || "records"}
              </Text>
            </View>

            {vehicle.maintenanceHistory.map((record, index) => {
              const statusColor = getStatusColor(record.status);
              return (
                <TouchableOpacity
                  key={record.id}
                  style={styles.historyCard}
                  onPress={() => {
                    if (record.status === "completed") {
                      navigation.navigate("Services", {
                        screen: "WorkOrderDetails",
                        params: {
                          workOrderId: record.workOrderId || record.id,
                          fromVehicleDetails: true,
                        },
                      });
                    } else if (record.status === "scheduled") {
                      Alert.alert(
                        t.vehicle?.scheduledService || "Scheduled Service",
                        `${record.type}\n\n${record.description}\n\nScheduled for: ${formatDate(record.date)}`,
                        [{ text: "OK" }],
                      );
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.historyHeader}>
                    <View style={styles.historyIconContainer}>
                      <Ionicons
                        name={
                          record.status === "scheduled"
                            ? "calendar-outline"
                            : "construct-outline"
                        }
                        size={20}
                        color={statusColor.text}
                      />
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyType}>{record.type}</Text>
                      <Text style={styles.historyDescription} numberOfLines={2}>
                        {record.description}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColor.bg },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: statusColor.text }]}
                      >
                        {record.status.charAt(0).toUpperCase() +
                          record.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.historyDetails}>
                    <View style={styles.historyDetailItem}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color="#6b7280"
                      />
                      <Text style={styles.historyDetailText}>
                        {formatDate(record.date)}
                      </Text>
                    </View>
                    {record.mileage > 0 && (
                      <View style={styles.historyDetailItem}>
                        <Ionicons
                          name="speedometer-outline"
                          size={14}
                          color="#6b7280"
                        />
                        <Text style={styles.historyDetailText}>
                          {formatMileage(record.mileage)}
                        </Text>
                      </View>
                    )}
                    {record.cost > 0 && (
                      <View style={styles.historyDetailItem}>
                        <Ionicons
                          name="wallet-outline"
                          size={14}
                          color="#10b981"
                        />
                        <Text
                          style={[
                            styles.historyDetailText,
                            { color: "#10b981", fontWeight: "600" },
                          ]}
                        >
                          {formatCurrency(record.cost)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {record.provider !== "TBD" && (
                    <View style={styles.historyProvider}>
                      <Ionicons
                        name="business-outline"
                        size={14}
                        color="#6b7280"
                      />
                      <Text style={styles.providerText}>{record.provider}</Text>
                    </View>
                  )}

                  {/* Tap indicator for completed services */}
                  {record.status === "completed" && (
                    <View style={styles.tapIndicator}>
                      <Text style={styles.tapIndicatorText}>
                        {t.common?.tapToViewDetails || "Tap to view details"}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="#9ca3af"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </FadeInView>

        {/* Actions */}
        <FadeInView delay={500}>
          <View style={styles.actionsSection}>
            <ScalePress
              onPress={() =>
                navigation.navigate("Home", {
                  screen: "Dashboard",
                  params: {
                    screen: "CreateRequest",
                    params: { vehicleId: vehicle.id },
                  },
                })
              }
              style={styles.primaryButton}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {t.vehicle?.requestService || "Request Service"}
              </Text>
            </ScalePress>

            <ScalePress
              onPress={() =>
                navigation.navigate("Insurance", { vehicleId: vehicle.id })
              }
              style={styles.secondaryButton}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#1976d2"
              />
              <Text style={styles.secondaryButtonText}>
                {t.vehicle?.manageInsurance || "Manage Insurance"}
              </Text>
            </ScalePress>

            <ScalePress
              onPress={() =>
                navigation.navigate("VehicleTransfer", {
                  vehicleId: vehicle.id,
                  vehicleInfo: {
                    make: vehicle.make,
                    model: vehicle.model,
                    year: vehicle.year,
                    vin: vehicle.vin,
                    plateNumber: vehicle.plateNumber,
                  },
                  maintenanceHistory: vehicle.maintenanceHistory,
                  totalSpent: vehicle.totalMaintenanceSpent,
                })
              }
              style={styles.transferButton}
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={20}
                color="#8b5cf6"
              />
              <Text style={styles.transferButtonText}>
                {t.vehicle?.transferVehicle || "Transfer Vehicle"}
              </Text>
            </ScalePress>
          </View>
        </FadeInView>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    padding: 16,
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
  editBtn: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  vehicleIconLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  vehicleTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  vehicleTrim: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 12,
  },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: "#1976d2",
    fontWeight: "600",
  },
  historyCount: {
    fontSize: 14,
    color: "#6b7280",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoRowColumn: {
    flexDirection: "column",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    flexShrink: 0,
    marginRight: 12,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    textAlign: "right",
  },
  infoValueFull: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginTop: 6,
  },
  infoValueFullVIN: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginTop: 8,
    letterSpacing: 0.5,
  },
  expiryContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expiryContainerWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 8,
  },
  expiryContainerColumn: {
    flexDirection: "column",
    marginTop: 6,
    gap: 8,
  },
  expiredText: {
    color: "#ef4444",
  },
  expiringSoonText: {
    color: "#f59e0b",
  },
  expiredBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  expiredBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ef4444",
  },
  expiringSoonBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  expiringSoonBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#f59e0b",
  },
  serviceStatusCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceStatusItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  serviceStatusInfo: {
    flex: 1,
  },
  serviceStatusLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  serviceStatusValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginTop: 2,
  },
  historyCard: {
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
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  historyDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  historyDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  historyDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyDetailText: {
    fontSize: 13,
    color: "#6b7280",
  },
  historyProvider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 6,
  },
  providerText: {
    fontSize: 13,
    color: "#6b7280",
  },
  tapIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 4,
  },
  tapIndicatorText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  actionsSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1976d2",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1976d2",
  },
  transferButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ede9fe",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  transferButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8b5cf6",
  },
});
