/**
 * ============================================
 * VEHICLE DATA ROUTER — FREE vs PREMIUM
 * ============================================
 * Decide QUAL fonte de dados usar baseado no plano do usuário.
 *
 * Regra:
 *   FREE    = vPIC (NHTSA) + NHTSA Recalls + Organic Catalog
 *   PREMIUM = tudo acima + VehicleDatabases APIs
 *
 * Camada 0 (NHTSA vPIC):  TODOS os usuários
 * Camada 1 (VehicleDatabases):  PREMIUM subscribers only
 * Camada 2 (PartsTech):  PROVIDERS only
 * Camada 3 (Organic Catalog):  TODOS os usuários
 */

import {
  decodeVIN_vPIC,
  getRecalls_NHTSA,
} from './nhtsa-vpic.service';
import { getRegionalPricing } from './organic-catalog.service';
import prisma from '../config/database';


// ═══════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════

interface UserContext {
  userId: string;
  isPremium: boolean;
  county?: string;
  state?: string;
}

interface LockedFeatureResponse {
  success: false;
  locked: true;
  feature: string;
  teaser: string;
  upgradePrompt: true;
}

type VehicleFeature =
  | 'specs'
  | 'recalls'
  | 'maintenance'
  | 'warranty'
  | 'market_value'
  | 'repair_estimates';

type AddVehicleMethod = 'vin' | 'plate' | 'ocr_vin' | 'ocr_plate';

// ═══════════════════════════════════════════════
// Helper: check if user has active subscription
// ═══════════════════════════════════════════════

export async function checkUserPremium(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      plan: { in: ['PRO', 'ENTERPRISE'] },
      currentPeriodEnd: { gt: new Date() },
    },
  });
  return !!subscription;
}

// ═══════════════════════════════════════════════
// ADD VEHICLE — Decode by method
// ═══════════════════════════════════════════════

interface AddVehicleRequest {
  method: AddVehicleMethod;
  vin?: string;
  plate?: string;
  plateState?: string;
  image?: string; // base64 or URL
  user: UserContext;
}

/**
 * Roteador para adicionar veículo.
 *
 * - VIN: FREE (vPIC)
 * - Plate/OCR: PREMIUM (VehicleDatabases)
 */
export async function addVehicleDecode(input: AddVehicleRequest) {
  switch (input.method) {
    case 'vin':
      // TODOS os planos: vPIC grátis
      if (!input.vin) return { success: false, error: 'VIN is required' };
      return await decodeVIN_vPIC(input.vin);

    case 'plate':
      // 🔒 PREMIUM ONLY
      if (!input.user.isPremium) {
        return {
          success: false,
          error: 'plate_decode_premium',
          message: 'License plate lookup is a Premium feature. Enter your VIN to add a vehicle for free.',
          upgradePrompt: true,
        };
      }
      // TODO: VehicleDatabases plate decode (Fase 5)
      return {
        success: false,
        error: 'not_yet_available',
        message: 'Plate decode will be available soon. Please use VIN for now.',
      };

    case 'ocr_vin':
    case 'ocr_plate':
      // 🔒 PREMIUM ONLY
      if (!input.user.isPremium) {
        return {
          success: false,
          error: 'ocr_premium',
          message: 'Camera scan is a Premium feature. Enter your VIN manually to add a vehicle for free.',
          upgradePrompt: true,
        };
      }
      // TODO: VehicleDatabases OCR (Fase 5)
      return {
        success: false,
        error: 'not_yet_available',
        message: 'Camera scan will be available soon. Please enter VIN manually.',
      };

    default:
      return { success: false, error: 'Invalid method' };
  }
}

// ═══════════════════════════════════════════════
// VEHICLE DETAILS — por feature
// ═══════════════════════════════════════════════

interface VehicleDetailsRequest {
  vehicleId: string;
  feature: VehicleFeature;
  user: UserContext;
}

/**
 * Roteador de detalhes do veículo por feature.
 *
 * FREE: specs (vPIC cached), recalls (NHTSA), repair_estimates (Organic only)
 * PREMIUM: tudo acima + maintenance, warranty, market_value, enriched estimates
 */
export async function getVehicleDetails(input: VehicleDetailsRequest) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: input.vehicleId },
  });

  if (!vehicle) {
    return { success: false, error: 'Vehicle not found' };
  }

  switch (input.feature) {
    case 'specs':
      // FREE: dados vPIC já salvos no banco
      return {
        success: true,
        data: vehicle,
        tier: 'free' as const,
        source: 'vpic_cached',
      };

    case 'recalls':
      // FREE: NHTSA recalls (grátis, sob demanda)
      return await getRecalls_NHTSA(vehicle.make, vehicle.model, vehicle.year);

    case 'maintenance':
      // 🔒 PREMIUM: schedule por mileage (VehicleDatabases)
      if (!input.user.isPremium) {
        return lockedFeature(
          'maintenance',
          `See exactly which services your ${vehicle.year} ${vehicle.make} ${vehicle.model} needs based on mileage.`,
        );
      }
      // TODO: VehicleDatabases maintenance schedule (Fase 3)
      // Fallback: retornar dados do VehicleMaintenanceSchedule modelo
      const schedule = await prisma.vehicleMaintenanceSchedule.findMany({
        where: { vehicleId: input.vehicleId },
        orderBy: { nextServiceDueDate: 'asc' },
      });
      return {
        success: true,
        data: schedule,
        tier: 'premium' as const,
        source: 'internal_schedule',
      };

    case 'warranty':
      // 🔒 PREMIUM
      if (!input.user.isPremium) {
        return lockedFeature(
          'warranty',
          'Check which warranties are still active on your vehicle.',
        );
      }
      // TODO: VehicleDatabases warranty (Fase 3)
      return {
        success: false,
        error: 'not_yet_available',
        message: 'Warranty status will be available soon.',
      };

    case 'market_value':
      // 🔒 PREMIUM
      if (!input.user.isPremium) {
        return lockedFeature(
          'market_value',
          "Know your vehicle's current trade-in and retail value.",
        );
      }
      // TODO: VehicleDatabases market value (Fase 5)
      return {
        success: false,
        error: 'not_yet_available',
        message: 'Market value will be available soon.',
      };

    case 'repair_estimates':
      // 🔒 PREMIUM gets VehicleDatabases, FREE gets Organic Catalog
      if (!input.user.isPremium) {
        const vehicleFingerprint =
          `${vehicle.year}_${vehicle.make}_${vehicle.model}`.toLowerCase().replace(/\s+/g, '_');
        const organic = await getRegionalPricing({
          vehicleFingerprint,
          county: input.user.county,
          state: input.user.state,
        });
        if (organic && organic.length > 0) {
          return {
            success: true,
            data: organic,
            tier: 'free' as const,
            source: 'organic_catalog',
          };
        }
        return lockedFeature(
          'repair_estimates',
          'Get accurate repair cost estimates for your vehicle.',
        );
      }
      // TODO: VehicleDatabases repair estimates (Fase 3)
      return {
        success: false,
        error: 'not_yet_available',
        message: 'Detailed repair estimates will be available soon.',
      };

    default:
      return { success: false, error: 'Unknown feature' };
  }
}

// ═══════════════════════════════════════════════
// Helper: locked feature response
// ═══════════════════════════════════════════════

function lockedFeature(feature: string, teaser: string): LockedFeatureResponse {
  return {
    success: false,
    locked: true,
    feature,
    teaser,
    upgradePrompt: true,
  };
}
