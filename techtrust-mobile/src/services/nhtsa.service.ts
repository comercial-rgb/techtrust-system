/**
 * NHTSA VIN Decode Service
 * Serviço para decodificar VIN via backend
 */

import api from "./api";

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

/**
 * Decodifica VIN através do backend
 */
export async function decodeVIN(vin: string): Promise<DecodeVINResponse> {
  try {
    const response = await api.post("/vehicles/decode-vin", { vin });

    if (response.data.success && response.data.data) {
      return {
        success: true,
        data: response.data.data,
      };
    }

    return {
      success: false,
      error: "Erro ao decodificar VIN",
    };
  } catch (error: any) {
    console.error("Erro ao decodificar VIN:", error);

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
    console.error("Error fetching recalls:", error);
    return {
      success: false,
      error: error.response?.data?.message || "Failed to fetch recalls",
    };
  }
}
