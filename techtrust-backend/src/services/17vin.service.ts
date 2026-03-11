/**
 * ============================================
 * 17VIN API SERVICE
 * ============================================
 * Integração com a API 17vin.com para:
 *   - API 3001: VIN Decoding (retorna epc/brand)
 *   - API 5109: Get All OE Part Numbers via VIN
 *
 * Documentação: https://en.17vin.com
 * Token: MD5(MD5(username) + MD5(password) + url_parameters)
 */

import crypto from "crypto";
import axios from "axios";
import { logger } from "../config/logger";

// ============================================
// CONFIGURAÇÃO
// ============================================
const API_BASE = "http://api.17vin.com:8080";
const API_USERNAME = process.env.VIN17_API_USERNAME || "";
const API_PASSWORD = process.env.VIN17_API_PASSWORD || "";

// ============================================
// INTERFACES
// ============================================

/** Resposta genérica da API 17vin */
interface Vin17ApiResponse<T = any> {
  code: number; // 1 = sucesso, 0 = falha
  msg: string;
  data: T;
}

/** Dados decodificados do VIN (API 3001) */
export interface Vin17DecodedData {
  vin: string;
  epc: string; // Ex: "toyota", "bmw", "volkswagen"
  brand: string;
  model?: string;
  year?: string;
  engine?: string;
  transmission?: string;
  market?: string;
  body?: string;
  [key: string]: any; // Campos adicionais retornados pela API
}

/** Resultado da decodificação do VIN */
export interface Vin17DecodeResult {
  success: boolean;
  data?: Vin17DecodedData;
  error?: string;
}

/** Resultado da busca de peças OE */
export interface Vin17OePartsResult {
  success: boolean;
  data?: {
    vin: string;
    epc: string;
    partNumbers: string[];
    totalParts: number;
  };
  error?: string;
}

// ============================================
// ERROR MESSAGE TRANSLATION
// ============================================

/**
 * Translate known Chinese error messages from 17vin API to English
 */
function translateApiError(msg: string): string {
  if (!msg) return "Unknown error from OE parts service.";
  if (msg.includes("账号已过期") || msg.includes("过期")) {
    return "OE parts service subscription has expired. Please contact TechTrust support.";
  }
  if (msg.includes("token") && (msg.includes("错误") || msg.includes("生成"))) {
    return "OE parts service authentication failed. Please contact TechTrust support.";
  }
  if (msg.includes("没有找到") || msg.includes("not found")) {
    return "No data found for this VIN. The vehicle may not be supported.";
  }
  if (msg.includes("频率") || msg.includes("限制")) {
    return "Too many requests. Please wait a moment and try again.";
  }
  // If message contains Chinese characters, return a generic user-friendly message
  if (/[\u4e00-\u9fff]/.test(msg)) {
    logger.warn(`Untranslated 17vin API message: ${msg}`);
    return "OE parts lookup failed. Please try again or contact support.";
  }
  return msg;
}

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Gera MD5 hash de uma string
 */
function md5(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex");
}

/**
 * Gera o token de autenticação para a API 17vin
 * Algoritmo: MD5(MD5(username) + MD5(password) + url_parameters)
 *
 * @param urlParameters - Parâmetros da URL (ex: "/?vin=LFMGJE720DS070251")
 * @returns Token MD5
 */
function generateToken(urlParameters: string): string {
  if (!API_USERNAME || !API_PASSWORD) {
    throw new Error("17vin API credentials not configured (VIN17_API_USERNAME / VIN17_API_PASSWORD)");
  }

  const userMd5 = md5(API_USERNAME);
  const passMd5 = md5(API_PASSWORD);
  const token = md5(userMd5 + passMd5 + urlParameters);

  logger.debug(`🔑 17vin token generated for params: ${urlParameters}`);
  return token;
}

// ============================================
// API 3001 - VIN DECODING
// ============================================

/**
 * Decodifica um VIN usando a API 3001
 * Retorna informações do veículo incluindo o código EPC (marca) necessário para API 5109
 *
 * URL: http://api.17vin.com:8080/?vin={vin}&user={username}&token={token}
 */
export async function decodeVin17(vin: string): Promise<Vin17DecodeResult> {
  try {
    if (!isVin17Configured()) {
      return { success: false, error: "OE parts service is not configured. Please contact support." };
    }

    const vinUpper = vin.toUpperCase().trim();
    const urlParameters = `/?vin=${vinUpper}`;
    const token = generateToken(urlParameters);

    const url = `${API_BASE}/?vin=${vinUpper}&user=${API_USERNAME}&token=${token}`;

    logger.info(`🔍 17vin API 3001 - Decoding VIN: ${vinUpper}`);

    const response = await axios.get<Vin17ApiResponse>(url, {
      timeout: 20000,
      headers: { Accept: "application/json" },
    });

    const result = response.data;

    if (result.code !== 1) {
      logger.warn(`⚠️ 17vin API 3001 failed: ${result.msg}`);
      return {
        success: false,
        error: translateApiError(result.msg),
      };
    }

    const data = result.data;

    // O campo epc é essencial para a API 5109
    const epc = data?.epc || data?.brand_code || "";

    if (!epc) {
      logger.warn(`⚠️ 17vin API 3001 - No EPC found for VIN: ${vinUpper}`);
      return {
        success: false,
        error: "EPC (brand code) not found for this VIN. Vehicle may not be supported.",
      };
    }

    logger.info(`✅ 17vin API 3001 - VIN decoded: ${vinUpper} → epc=${epc}`);

    return {
      success: true,
      data: {
        vin: vinUpper,
        epc: epc.toLowerCase(),
        brand: data?.brand || data?.make || epc,
        model: data?.model || data?.series,
        year: data?.year || data?.model_year,
        engine: data?.engine,
        transmission: data?.transmission,
        market: data?.market,
        body: data?.body,
        ...data,
      },
    };
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      logger.error(`❌ 17vin API 3001 connection error: ${error.code}`);
      return {
        success: false,
        error: "OE parts service is temporarily unavailable. Please try again later.",
      };
    }
    const message = error.response?.data?.msg || error.message;
    logger.error(`❌ 17vin API 3001 error: ${message}`);
    return {
      success: false,
      error: `VIN decode failed: ${message}`,
    };
  }
}

// ============================================
// API 5109 - GET ALL OE PART NUMBERS VIA VIN
// ============================================

/**
 * Busca todos os números de peças OE (Original Equipment) via VIN
 *
 * Requer o epc (código da marca) obtido pela API 3001
 * URL: http://api.17vin.com:8080/{epc}?action=all_part_number&vin={vin}&user={username}&token={token}
 *
 * @param vin - VIN do veículo
 * @param epc - Código EPC/marca (ex: "toyota") obtido da API 3001
 * @param isVinFilterOpen - Ativar filtro por VIN (1=ativado, 0=desativado, default: 1)
 */
export async function getAllOePartNumbers(
  vin: string,
  epc: string,
  isVinFilterOpen: string = "1"
): Promise<Vin17OePartsResult> {
  try {
    if (!isVin17Configured()) {
      return { success: false, error: "OE parts service is not configured. Please contact support." };
    }

    const vinUpper = vin.toUpperCase().trim();
    const epcLower = epc.toLowerCase().trim();

    // url_parameters para geração do token (inclui o path /{epc})
    const urlParameters = `/${epcLower}?action=all_part_number&vin=${vinUpper}`;
    const token = generateToken(urlParameters);

    let url = `${API_BASE}/${epcLower}?action=all_part_number&vin=${vinUpper}&user=${API_USERNAME}&token=${token}`;

    // Parâmetro opcional de filtro por VIN
    if (isVinFilterOpen !== "1") {
      url += `&is_vin_filter_open=${isVinFilterOpen}`;
    }

    logger.info(`🔧 17vin API 5109 - Getting OE parts for VIN: ${vinUpper} (epc: ${epcLower})`);

    const response = await axios.get<Vin17ApiResponse<string>>(url, {
      timeout: 30000, // Timeout maior porque pode retornar muitas peças
      headers: { Accept: "application/json" },
    });

    const result = response.data;

    if (result.code !== 1) {
      logger.warn(`⚠️ 17vin API 5109 failed: ${result.msg}`);
      return {
        success: false,
        error: translateApiError(result.msg),
      };
    }

    // Dados retornam como string separada por @
    const rawData = result.data || "";
    const partNumbers = rawData
      .split("@")
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);

    logger.info(`✅ 17vin API 5109 - Found ${partNumbers.length} OE parts for VIN: ${vinUpper}`);

    return {
      success: true,
      data: {
        vin: vinUpper,
        epc: epcLower,
        partNumbers,
        totalParts: partNumbers.length,
      },
    };
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      logger.error(`❌ 17vin API 5109 connection error: ${error.code}`);
      return {
        success: false,
        error: "OE parts service is temporarily unavailable. Please try again later.",
      };
    }
    const message = error.response?.data?.msg || error.message;
    logger.error(`❌ 17vin API 5109 error: ${message}`);
    return {
      success: false,
      error: `OE parts lookup failed: ${message}`,
    };
  }
}

// ============================================
// COMBINED: DECODE + GET PARTS (CONVENIENCE)
// ============================================

/**
 * Fluxo completo: decodifica VIN (API 3001) e busca todas as peças OE (API 5109)
 * Combina os dois passos em uma única chamada.
 *
 * @param vin - VIN do veículo
 * @param isVinFilterOpen - Ativar filtro por VIN (1=ativado, 0=desativado)
 */
export async function getOePartsByVin(
  vin: string,
  isVinFilterOpen: string = "1"
): Promise<{
  success: boolean;
  vehicle?: Vin17DecodedData;
  parts?: {
    partNumbers: string[];
    totalParts: number;
  };
  error?: string;
}> {
  // Step 1: Decode VIN para obter o epc
  const decodeResult = await decodeVin17(vin);

  if (!decodeResult.success || !decodeResult.data) {
    return {
      success: false,
      error: decodeResult.error || "Failed to decode VIN",
    };
  }

  const { epc } = decodeResult.data;

  // Step 2: Buscar peças OE usando o epc
  const partsResult = await getAllOePartNumbers(vin, epc, isVinFilterOpen);

  if (!partsResult.success || !partsResult.data) {
    return {
      success: false,
      vehicle: decodeResult.data,
      error: partsResult.error || "Failed to retrieve OE parts",
    };
  }

  return {
    success: true,
    vehicle: decodeResult.data,
    parts: {
      partNumbers: partsResult.data.partNumbers,
      totalParts: partsResult.data.totalParts,
    },
  };
}

/**
 * Verifica se as credenciais da API 17vin estão configuradas
 */
export function isVin17Configured(): boolean {
  return !!(API_USERNAME && API_PASSWORD);
}
