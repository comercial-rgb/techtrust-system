/**
 * NHTSA VIN Decode Service
 * Serviço para decodificar VIN via backend
 */

import api from "./api";
import { log } from "../utils/logger";

export interface VehicleData {
  make: string;
  model: string;
  year: number;
  engineType?: string;
  fuelType?: string;
  bodyType?: string;
  trim?: string;
  driveType?: string;
  numberOfRows?: number;
  seatingCapacity?: number;
  countryOfManufacturer?: string;
  category?: string;
  transmission?: string;
  vin: string;
}

export interface DecodeVINResponse {
  success: boolean;
  data?: VehicleData;
  error?: string;
}

export interface RecallItem {
  nhtsaCampaignNumber: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  manufacturer: string;
  reportReceivedDate: string;
}

export interface RecallsResponse {
  success: boolean;
  data?: RecallItem[];
  count?: number;
  error?: string;
}

function firstValue(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function normalizeVehicleData(payload: any, vin: string): VehicleData | null {
  const vehicle = payload?.vehicle || payload;
  if (!vehicle) return null;

  const normalized: VehicleData = {
    vin: firstValue(vehicle.vin, vin)?.toUpperCase() || vin.toUpperCase(),
    make: firstValue(vehicle.make, vehicle.manufacturer?.make) || "",
    model: firstValue(vehicle.model) || "",
    year: firstNumber(vehicle.year, vehicle.modelYear) || 0,
    trim: firstValue(vehicle.trim),
    engineType: firstValue(
      vehicle.engineType,
      vehicle.engineDescription,
      vehicle.engine?.configuration,
      vehicle.engine?.model,
    ),
    fuelType: firstValue(
      vehicle.fuelType,
      vehicle.engine?.fuelTypePrimary,
      vehicle.engine?.fuelTypeSecondary,
    ),
    bodyType: firstValue(vehicle.bodyType, vehicle.body?.bodyClass),
    driveType: firstValue(vehicle.driveType, vehicle.drivetrain?.driveType),
    numberOfRows: firstNumber(vehicle.numberOfRows, vehicle.body?.numberOfRows),
    seatingCapacity: firstNumber(
      vehicle.seatingCapacity,
      vehicle.body?.seatingCapacity,
    ),
    countryOfManufacturer: firstValue(
      vehicle.countryOfManufacturer,
      vehicle.manufacturer?.country,
    ),
    category: firstValue(vehicle.category, vehicle.vehicleType),
    transmission: firstValue(
      vehicle.transmission,
      vehicle.drivetrain?.transmissionStyle,
    ),
  };

  if (!normalized.make || !normalized.model || !normalized.year) return null;
  return normalized;
}

/**
 * Decodifica VIN através do backend
 */
export async function decodeVIN(vin: string): Promise<DecodeVINResponse> {
  try {
    const response = await api.post("/vehicles/decode-vin", { vin });

    if (response.data.success && response.data.data) {
      const normalized = normalizeVehicleData(response.data.data, vin);
      if (!normalized) {
        return {
          success: false,
          error:
            "VIN decoded, but vehicle make/model/year were not returned. Please enter details manually.",
        };
      }

      return {
        success: true,
        data: normalized,
      };
    }

    return {
      success: false,
      error: "Erro ao decodificar VIN",
    };
  } catch (error: any) {
    log.error("Erro ao decodificar VIN:", error);

    const errorMessage =
      error.response?.data?.message || "Erro ao decodificar VIN";

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Valida formato de VIN
 * VIN deve ter 17 caracteres alfanuméricos (sem I, O, Q)
 */
export function isValidVINFormat(vin: string): boolean {
  const cleanVIN = vin.trim().toUpperCase();
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(cleanVIN);
}

/**
 * Fetch NHTSA safety recalls for a vehicle
 */
export async function getVehicleRecalls(vehicleId: string): Promise<RecallsResponse> {
  try {
    const response = await api.get(`/vehicles/${vehicleId}/recalls`);
    return {
      success: true,
      data: response.data.data || [],
      count: response.data.count || 0,
    };
  } catch (error: any) {
    log.error("Error fetching recalls:", error);
    return {
      success: false,
      error: error.response?.data?.message || "Failed to fetch recalls",
    };
  }
}
