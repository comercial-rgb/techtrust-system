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
  vin: string;
}

export interface DecodeVINResponse {
  success: boolean;
  data?: VehicleData;
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
