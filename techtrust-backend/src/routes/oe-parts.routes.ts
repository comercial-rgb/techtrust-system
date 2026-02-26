/**
 * ============================================
 * OE PARTS ROUTES
 * ============================================
 * Rotas para busca de peças OE (Original Equipment) via VIN
 * API 17vin.com integration
 */

import { Router } from "express";
import * as oePartsController from "../controllers/oe-parts.controller";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

/**
 * GET /api/v1/oe-parts/by-vin/:vin
 * Fluxo completo: decodifica VIN (3001) + busca todas as peças OE (5109)
 * Retorna dados do veículo + lista de part numbers
 */
router.get("/by-vin/:vin", asyncHandler(oePartsController.getOePartsByVinHandler));

/**
 * GET /api/v1/oe-parts/decode/:vin
 * Apenas decodificar VIN via 17vin (API 3001)
 * Retorna dados do veículo incluindo o epc (brand code)
 */
router.get("/decode/:vin", asyncHandler(oePartsController.decodeVin17Handler));

/**
 * GET /api/v1/oe-parts/parts/:epc/:vin
 * Busca direta de peças OE quando já tem o epc (API 5109)
 * Útil quando o decode já foi feito anteriormente
 */
router.get("/parts/:epc/:vin", asyncHandler(oePartsController.getOePartsDirectHandler));

export default router;
