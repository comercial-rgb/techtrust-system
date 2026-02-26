/**
 * ============================================
 * OE PARTS CONTROLLER
 * ============================================
 * Controller para busca de peças OE (Original Equipment) via VIN
 * Usa a API 17vin.com (APIs 3001 + 5109)
 */

import { Request, Response } from "express";
import { logger } from "../config/logger";
import { AppError } from "../middleware/error-handler";
import {
  decodeVin17,
  getAllOePartNumbers,
  getOePartsByVin,
  isVin17Configured,
} from "../services/17vin.service";

/**
 * GET /api/v1/oe-parts/by-vin/:vin
 * Busca todas as peças OE para um VIN (fluxo completo: decode + parts)
 */
export const getOePartsByVinHandler = async (req: Request, res: Response) => {
  const { vin } = req.params;
  const { isVinFilterOpen } = req.query;

  if (!vin) {
    throw new AppError("VIN is required", 400);
  }

  if (!isVin17Configured()) {
    throw new AppError("17vin API not configured. Contact administrator.", 503);
  }

  // Validar formato do VIN (17 caracteres alfanuméricos)
  const vinClean = vin.toUpperCase().trim();
  if (vinClean.length !== 17) {
    throw new AppError("Invalid VIN format. Must be 17 characters.", 400);
  }

  logger.info(`🔧 OE Parts lookup for VIN: ${vinClean} by user: ${req.user?.id}`);

  const result = await getOePartsByVin(
    vinClean,
    (isVinFilterOpen as string) || "1"
  );

  if (!result.success) {
    throw new AppError(result.error || "Failed to retrieve OE parts", 502);
  }

  res.json({
    success: true,
    data: {
      vehicle: result.vehicle,
      parts: result.parts,
    },
  });
};

/**
 * GET /api/v1/oe-parts/decode/:vin
 * Apenas decodifica o VIN via 17vin (API 3001) - retorna dados do veículo + epc
 */
export const decodeVin17Handler = async (req: Request, res: Response) => {
  const { vin } = req.params;

  if (!vin) {
    throw new AppError("VIN is required", 400);
  }

  if (!isVin17Configured()) {
    throw new AppError("17vin API not configured. Contact administrator.", 503);
  }

  const vinClean = vin.toUpperCase().trim();
  if (vinClean.length !== 17) {
    throw new AppError("Invalid VIN format. Must be 17 characters.", 400);
  }

  logger.info(`🔍 17vin VIN decode for: ${vinClean} by user: ${req.user?.id}`);

  const result = await decodeVin17(vinClean);

  if (!result.success) {
    throw new AppError(result.error || "Failed to decode VIN", 502);
  }

  res.json({
    success: true,
    data: result.data,
  });
};

/**
 * GET /api/v1/oe-parts/parts/:epc/:vin
 * Busca peças OE quando já se tem o epc (API 5109 direto)
 */
export const getOePartsDirectHandler = async (req: Request, res: Response) => {
  const { epc, vin } = req.params;
  const { isVinFilterOpen } = req.query;

  if (!vin || !epc) {
    throw new AppError("VIN and EPC are required", 400);
  }

  if (!isVin17Configured()) {
    throw new AppError("17vin API not configured. Contact administrator.", 503);
  }

  const vinClean = vin.toUpperCase().trim();
  if (vinClean.length !== 17) {
    throw new AppError("Invalid VIN format. Must be 17 characters.", 400);
  }

  logger.info(`🔧 OE Parts direct lookup - epc: ${epc}, VIN: ${vinClean} by user: ${req.user?.id}`);

  const result = await getAllOePartNumbers(
    vinClean,
    epc,
    (isVinFilterOpen as string) || "1"
  );

  if (!result.success) {
    throw new AppError(result.error || "Failed to retrieve OE parts", 502);
  }

  res.json({
    success: true,
    data: result.data,
  });
};
