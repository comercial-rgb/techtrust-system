/**
 * ============================================
 * NHTSA vPIC API Service — CAMADA 0 (GRATUITA)
 * ============================================
 * Versão aprimorada com:
 * - DecodeVinExtended (144 variáveis)
 * - Mapeamento por VariableId → campos estruturados
 * - Cache via tabela VinDecodeCache (30 dias)
 * - Completeness scoring (0-100%)
 * - ADAS, Safety, Engine details
 * - formatEngineDescription()
 *
 * Custo: $0 (API do governo dos EUA, pública)
 * Rate: Sem limite explícito, mas cache OBRIGATÓRIO
 *
 * QUEM USA: TODOS os usuários (Free + Premium)
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const VPIC_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

// ═══════════════════════════════════════════════
// Mapeamento de VariableId → campo estruturado
// ═══════════════════════════════════════════════

export const VARIABLE_MAP: Record<number, string> = {
  // Identification
  26: 'make',
  27: 'manufacturer',
  28: 'model',
  29: 'year',
  38: 'trim',
  196: 'vehicleDescriptor',
  110: 'series',

  // Body
  5: 'bodyClass',
  14: 'doors',
  39: 'vehicleType',
  25: 'gvwr',

  // Engine
  9: 'engineCylinders',
  11: 'displacementCC',
  12: 'displacementCI',
  13: 'displacementL',
  71: 'engineHP',
  125: 'engineHPTo',
  24: 'fuelTypePrimary',
  66: 'fuelTypeSecondary',
  67: 'fuelDelivery',
  64: 'engineConfiguration',
  135: 'turbo',
  122: 'coolingType',
  126: 'electrificationLevel',
  18: 'engineModel',

  // Drivetrain
  15: 'driveType',
  37: 'transmissionStyle',
  63: 'transmissionSpeeds',

  // Manufacturing
  31: 'plantCity',
  75: 'plantCountry',
  77: 'plantState',

  // Safety
  65: 'frontAirBags',
  107: 'sideAirBags',
  55: 'curtainAirBags',
  69: 'kneeAirBags',
  78: 'pretensioner',
  79: 'seatBeltType',
  121: 'otherRestraintInfo',
  168: 'tpmsType',
  86: 'abs',
  99: 'esc',
  100: 'tractionControl',

  // ADAS (Advanced Driver Assistance)
  81: 'adaptiveCruiseControl',
  87: 'crashImminentBraking',
  101: 'forwardCollisionWarning',
  170: 'dynamicBrakeSupport',
  171: 'pedestrianAEB',
  88: 'blindSpotWarning',
  193: 'blindSpotIntervention',
  102: 'laneDepartureWarning',
  103: 'laneKeepingAssist',
  194: 'laneCenteringAssist',
  104: 'backupCamera',
  105: 'parkingAssist',
  183: 'rearCrossTrafficAlert',
  192: 'rearAutoEmergencyBraking',
  176: 'keylessIgnition',
  177: 'daytimeRunningLight',
  178: 'headlampLightSource',

  // Seating
  33: 'numberOfSeatRows',
  119: 'numberOfSeats',

  // Errors
  143: 'errorCode',
  191: 'errorText',
  142: 'suggestedVIN',
};

// ═══════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════

export interface VpicVehicleData {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  series: string | null;

  body: {
    bodyClass: string | null;
    vehicleType: string | null;
    doors: number | null;
    gvwr: string | null;
  };

  engine: {
    cylinders: number | null;
    displacementL: number | null;
    displacementCC: number | null;
    hp: number | null;
    fuelType: string | null;
    fuelTypeSecondary: string | null;
    turbo: string | null;
    configuration: string | null;
    electrification: string | null;
    model: string | null;
  };

  drivetrain: {
    driveType: string | null;
    transmissionStyle: string | null;
    transmissionSpeeds: string | null;
  };

  manufacturer: {
    name: string | null;
    plantCity: string | null;
    plantCountry: string | null;
  };

  safety: {
    frontAirBags: string | null;
    sideAirBags: string | null;
    curtainAirBags: string | null;
    kneeAirBags: string | null;
    abs: string | null;
    esc: string | null;
    tractionControl: string | null;
    tpms: string | null;
  };

  adas: {
    adaptiveCruiseControl: string | null;
    forwardCollisionWarning: string | null;
    blindSpotWarning: string | null;
    laneDepartureWarning: string | null;
    laneKeepingAssist: string | null;
    backupCamera: string | null;
    parkingAssist: string | null;
    rearCrossTrafficAlert: string | null;
    pedestrianAEB: string | null;
  };
}

export interface VpicDecodeResult {
  success: boolean;
  tier: 'free';
  source: 'nhtsa_vpic';
  vehicle?: VpicVehicleData;
  completeness?: number;
  hasWarning?: boolean;
  warningText?: string | null;
  engineDescription?: string;
  fromCache?: boolean;
  error?: string;
}

// ═══════════════════════════════════════════════
// VIN Decode — DecodeVinExtended (GRATUITO)
// ═══════════════════════════════════════════════

/**
 * Decode VIN via NHTSA vPIC DecodeVinExtended.
 * Usado para TODOS os usuários (Free + Premium).
 * Cache via banco de dados (30 dias).
 *
 * @param vin - VIN completo (17 chars) ou parcial (com *)
 * @param modelYear - Ano opcional (melhora precisão)
 */
export async function decodeVIN_vPIC(vin: string, modelYear?: number): Promise<VpicDecodeResult> {
  // 1. Validar VIN
  const cleanVin = vin.toUpperCase().replace(/[IOQ]/g, '');
  if (cleanVin.length < 11) {
    return { success: false, tier: 'free', source: 'nhtsa_vpic', error: 'VIN too short (min 11 chars)' };
  }

  // 2. Cache check (tabela VinDecodeCache — 30 dias)
  try {
    const cached = await prisma.vinDecodeCache.findUnique({
      where: { vin: cleanVin },
    });

    if (cached && cached.expiresAt > new Date()) {
      const parsed = cached.parsed as unknown as VpicDecodeResult;
      return { ...parsed, fromCache: true };
    }

    // Se expirou, deletar
    if (cached) {
      await prisma.vinDecodeCache.delete({ where: { vin: cleanVin } });
    }
  } catch {
    // Cache miss — prosseguir com API call
  }

  // 3. Chamar vPIC DecodeVinExtended
  try {
    let url = `${VPIC_BASE}/DecodeVinExtended/${cleanVin}?format=json`;
    if (modelYear) url += `&modelyear=${modelYear}`;

    const { data } = await axios.get(url, { timeout: 10000 });

    if (!data.Results || data.Results.length === 0) {
      return { success: false, tier: 'free', source: 'nhtsa_vpic', error: 'No results from NHTSA' };
    }

    // 4. Parse: transformar array de 144 variáveis em objeto estruturado
    const raw: Record<string, string> = {};
    for (const item of data.Results) {
      const field = VARIABLE_MAP[item.VariableId];
      if (field && item.Value && item.Value.trim() !== '') {
        raw[field] = item.Value.trim();
      }
    }

    // 5. Verificar erros do vPIC
    const errorCode = parseInt(raw.errorCode || '0');
    const hasWarning = [5, 6, 11].includes(errorCode);

    // 6. Estruturar resposta
    const vehicle: VpicVehicleData = {
      vin: cleanVin,
      year: raw.year ? parseInt(raw.year) : null,
      make: raw.make || null,
      model: raw.model || null,
      trim: raw.trim || null,
      series: raw.series || null,

      body: {
        bodyClass: raw.bodyClass || null,
        vehicleType: raw.vehicleType || null,
        doors: raw.doors ? parseInt(raw.doors) : null,
        gvwr: raw.gvwr || null,
      },

      engine: {
        cylinders: raw.engineCylinders ? parseInt(raw.engineCylinders) : null,
        displacementL: raw.displacementL ? parseFloat(raw.displacementL) : null,
        displacementCC: raw.displacementCC ? parseFloat(raw.displacementCC) : null,
        hp: raw.engineHP ? parseInt(raw.engineHP) : null,
        fuelType: raw.fuelTypePrimary || null,
        fuelTypeSecondary: raw.fuelTypeSecondary || null,
        turbo: raw.turbo || null,
        configuration: raw.engineConfiguration || null,
        electrification: raw.electrificationLevel || null,
        model: raw.engineModel || null,
      },

      drivetrain: {
        driveType: raw.driveType || null,
        transmissionStyle: raw.transmissionStyle || null,
        transmissionSpeeds: raw.transmissionSpeeds || null,
      },

      manufacturer: {
        name: raw.manufacturer || null,
        plantCity: raw.plantCity || null,
        plantCountry: raw.plantCountry || null,
      },

      safety: {
        frontAirBags: raw.frontAirBags || null,
        sideAirBags: raw.sideAirBags || null,
        curtainAirBags: raw.curtainAirBags || null,
        kneeAirBags: raw.kneeAirBags || null,
        abs: raw.abs || null,
        esc: raw.esc || null,
        tractionControl: raw.tractionControl || null,
        tpms: raw.tpmsType || null,
      },

      adas: {
        adaptiveCruiseControl: raw.adaptiveCruiseControl || null,
        forwardCollisionWarning: raw.forwardCollisionWarning || null,
        blindSpotWarning: raw.blindSpotWarning || null,
        laneDepartureWarning: raw.laneDepartureWarning || null,
        laneKeepingAssist: raw.laneKeepingAssist || null,
        backupCamera: raw.backupCamera || null,
        parkingAssist: raw.parkingAssist || null,
        rearCrossTrafficAlert: raw.rearCrossTrafficAlert || null,
        pedestrianAEB: raw.pedestrianAEB || null,
      },
    };

    // 7. Calcular completeness
    const essentialFields = [
      vehicle.year, vehicle.make, vehicle.model,
      vehicle.engine.cylinders, vehicle.engine.displacementL,
      vehicle.engine.fuelType, vehicle.drivetrain.driveType,
    ];
    const filled = essentialFields.filter(f => f !== null).length;
    const completeness = Math.round((filled / essentialFields.length) * 100);

    const engineDescription = formatEngineDescription(vehicle.engine);

    const result: VpicDecodeResult = {
      success: true,
      tier: 'free',
      source: 'nhtsa_vpic',
      vehicle,
      completeness,
      hasWarning,
      warningText: hasWarning ? raw.errorText : null,
      engineDescription,
    };

    // 8. Cache 30 dias na tabela VinDecodeCache
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    try {
      await prisma.vinDecodeCache.upsert({
        where: { vin: cleanVin },
        create: {
          vin: cleanVin,
          modelYear: modelYear || null,
          rawData: data.Results,
          parsed: result as any,
          source: 'NHTSA_VPIC',
          completeness,
          expiresAt,
        },
        update: {
          rawData: data.Results,
          parsed: result as any,
          completeness,
          expiresAt,
        },
      });
    } catch (cacheErr) {
      console.warn('[VPIC] Cache write failed (non-blocking):', cacheErr);
    }

    return result;
  } catch (error: any) {
    console.error('[VPIC] Decode error:', error.message);
    return {
      success: false,
      tier: 'free',
      source: 'nhtsa_vpic',
      error: error.code === 'ECONNABORTED'
        ? 'NHTSA timeout — try again'
        : 'NHTSA service unavailable',
    };
  }
}

// ═══════════════════════════════════════════════
// Engine Description Formatter
// ═══════════════════════════════════════════════

/**
 * Formata descrição do motor para exibição.
 * "3.0L Inline-6 300HP Turbo Gasoline" ou "5.3L V8 Gasoline"
 */
export function formatEngineDescription(engine: VpicVehicleData['engine']): string {
  const parts: string[] = [];
  if (engine.displacementL) parts.push(`${engine.displacementL}L`);
  if (engine.cylinders) {
    parts.push(engine.configuration
      ? `${engine.configuration}${engine.cylinders}`
      : `${engine.cylinders}-Cyl`);
  }
  if (engine.hp) parts.push(`${engine.hp}HP`);
  if (engine.turbo) parts.push('Turbo');
  if (engine.fuelType) parts.push(engine.fuelType);
  if (engine.electrification) parts.push(`(${engine.electrification})`);
  return parts.join(' ') || 'Unknown Engine';
}

// ═══════════════════════════════════════════════
// NHTSA Recalls API (GRATUITA)
// ═══════════════════════════════════════════════

export interface RecallItem {
  nhtsaCampaignNumber: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  manufacturer: string;
  reportReceivedDate: string;
}

/**
 * NHTSA Recalls — sob demanda quando client abre Recalls tab.
 * ⚠️ NÃO usar em bulk — apenas sob demanda.
 */
export async function getRecalls_NHTSA(
  make: string,
  model: string,
  modelYear: number,
): Promise<{ success: boolean; recalls: RecallItem[]; count: number }> {
  try {
    const { data } = await axios.get(
      'https://api.nhtsa.gov/recalls/recallsByVehicle', {
        params: { make, model, modelYear },
        timeout: 10000,
      }
    );

    const recalls: RecallItem[] = (data.results || []).map((r: any) => ({
      nhtsaCampaignNumber: r.NHTSACampaignNumber || '',
      component: r.Component || '',
      summary: r.Summary || '',
      consequence: r.Consequence || '',
      remedy: r.Remedy || '',
      manufacturer: r.Manufacturer || '',
      reportReceivedDate: r.ReportReceivedDate || '',
    }));

    return { success: true, recalls, count: recalls.length };
  } catch (error: any) {
    console.error('[NHTSA] Recalls error:', error.message);
    return { success: false, recalls: [], count: 0 };
  }
}

// ═══════════════════════════════════════════════
// Get All Makes (para autocomplete)
// ═══════════════════════════════════════════════

export async function getAllMakes(): Promise<string[]> {
  try {
    const { data } = await axios.get(
      `${VPIC_BASE}/GetAllMakes?format=json`,
      { timeout: 15000 }
    );
    return (data.Results || []).map((r: any) => r.Make_Name).filter(Boolean).sort();
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════
// Get Models for Make+Year (para seleção manual)
// ═══════════════════════════════════════════════

export async function getModelsForMakeYear(make: string, year: number): Promise<string[]> {
  try {
    const { data } = await axios.get(
      `${VPIC_BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`,
      { timeout: 10000 }
    );
    return (data.Results || []).map((r: any) => r.Model_Name).filter(Boolean).sort();
  } catch {
    return [];
  }
}

/**
 * Maps VpicVehicleData to flat fields suitable for Vehicle model update.
 * Used when saving decoded VIN data to a Vehicle record.
 */
export function vpicToVehicleFields(decoded: VpicVehicleData) {
  return {
    make: decoded.make || undefined,
    model: decoded.model || undefined,
    year: decoded.year || undefined,
    trim: decoded.trim || undefined,
    engineType: formatEngineDescription(decoded.engine) || undefined,
    fuelType: decoded.engine.fuelType || undefined,
    fuelTypeSecondary: decoded.engine.fuelTypeSecondary || undefined,
    bodyType: decoded.body.bodyClass || undefined,
    driveType: decoded.drivetrain.driveType || undefined,
    transmission: decoded.drivetrain.transmissionStyle || undefined,
    transmissionSpeeds: decoded.drivetrain.transmissionSpeeds || undefined,
    countryOfManufacturer: decoded.manufacturer.plantCountry || undefined,
    category: decoded.body.vehicleType || undefined,

    // Engine details
    engineCylinders: decoded.engine.cylinders || undefined,
    displacementL: decoded.engine.displacementL || undefined,
    displacementCC: decoded.engine.displacementCC || undefined,
    engineHP: decoded.engine.hp || undefined,
    engineConfiguration: decoded.engine.configuration || undefined,
    turbo: decoded.engine.turbo || undefined,
    electrificationLevel: decoded.engine.electrification || undefined,
    engineDescription: formatEngineDescription(decoded.engine) || undefined,

    // Body
    vehicleType: decoded.body.vehicleType || undefined,
    doors: decoded.body.doors || undefined,
    gvwr: decoded.body.gvwr || undefined,
    manufacturer: decoded.manufacturer.name || undefined,
    plantCity: decoded.manufacturer.plantCity || undefined,

    // Safety
    frontAirBags: decoded.safety.frontAirBags || undefined,
    sideAirBags: decoded.safety.sideAirBags || undefined,
    curtainAirBags: decoded.safety.curtainAirBags || undefined,
    kneeAirBags: decoded.safety.kneeAirBags || undefined,
    abs: decoded.safety.abs || undefined,
    esc: decoded.safety.esc || undefined,
    tractionControl: decoded.safety.tractionControl || undefined,
    tpms: decoded.safety.tpms || undefined,

    // ADAS
    adaptiveCruiseControl: decoded.adas.adaptiveCruiseControl || undefined,
    forwardCollisionWarning: decoded.adas.forwardCollisionWarning || undefined,
    blindSpotWarning: decoded.adas.blindSpotWarning || undefined,
    laneDepartureWarning: decoded.adas.laneDepartureWarning || undefined,
    laneKeepingAssist: decoded.adas.laneKeepingAssist || undefined,
    backupCamera: decoded.adas.backupCamera || undefined,
    parkingAssist: decoded.adas.parkingAssist || undefined,
    rearCrossTrafficAlert: decoded.adas.rearCrossTrafficAlert || undefined,
    pedestrianAEB: decoded.adas.pedestrianAEB || undefined,

    // Metadata
    vinDecoded: true,
    vinDecodedAt: new Date(),
  };
}
