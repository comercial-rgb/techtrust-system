/**
 * ============================================
 * OE PARTS SERVICE (17vin API)
 * ============================================
 * Busca de peças OE (Original Equipment) via VIN
 * Endpoints: /api/v1/oe-parts/*
 */

import api from "./api";

// ============================================
// INTERFACES
// ============================================

export interface OeVehicleData {
  vin: string;
  epc: string;
  brand: string;
  model?: string;
  year?: string;
  engine?: string;
  transmission?: string;
  market?: string;
  body?: string;
}

export interface OePartsResult {
  vehicle: OeVehicleData;
  parts: {
    partNumbers: string[];
    totalParts: number;
  };
}

export interface OePartsResponse {
  success: boolean;
  data: OePartsResult;
}

export interface OeDecodeResponse {
  success: boolean;
  data: OeVehicleData;
}

export interface OePartsDirectResponse {
  success: boolean;
  data: {
    vin: string;
    epc: string;
    partNumbers: string[];
    totalParts: number;
  };
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Fluxo completo: decodifica VIN + busca todas as peças OE
 * GET /api/v1/oe-parts/by-vin/:vin
 */
export async function getOePartsByVin(
  vin: string,
  isVinFilterOpen: string = "1"
): Promise<OePartsResult> {
  const response = await api.get<OePartsResponse>(
    `/oe-parts/by-vin/${vin.toUpperCase()}`,
    { params: { isVinFilterOpen } }
  );
  return response.data.data;
}

/**
 * Apenas decodifica o VIN via 17vin (retorna epc/brand)
 * GET /api/v1/oe-parts/decode/:vin
 */
export async function decodeVin17(vin: string): Promise<OeVehicleData> {
  const response = await api.get<OeDecodeResponse>(
    `/oe-parts/decode/${vin.toUpperCase()}`
  );
  return response.data.data;
}

/**
 * Busca direta de peças OE quando já tem o epc
 * GET /api/v1/oe-parts/parts/:epc/:vin
 */
export async function getOePartsDirect(
  epc: string,
  vin: string,
  isVinFilterOpen: string = "1"
): Promise<{ partNumbers: string[]; totalParts: number }> {
  const response = await api.get<OePartsDirectResponse>(
    `/oe-parts/parts/${epc}/${vin.toUpperCase()}`,
    { params: { isVinFilterOpen } }
  );
  return response.data.data;
}
