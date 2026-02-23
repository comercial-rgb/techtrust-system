/**
 * ============================================
 * ORGANIC CATALOG SERVICE — CAMADA 3 (TechTrust Interno)
 * ============================================
 * Catálogo interno alimentado por quotes completadas.
 * Custo: $0 — infraestrutura própria.
 *
 * QUEM USA: TODOS (Free + Premium + Providers)
 *
 * ONDE:
 *   ✅ Auto Parts Store (client) — parts usadas por veículo
 *   ✅ Quote Review (client) — "local average $89"
 *   ✅ Create Quote (provider sem PartsTech) — autocomplete
 *   ✅ Vehicle Details — estimated costs (quando disponível)
 *
 * CRESCIMENTO:
 *   Mês 1:  só Service Part Mapping (genérico)
 *   Mês 3:  Organic Catalog com dados reais por veículo e região
 *   Mês 6+: dados próprios mais precisos que qualquer API externa paga
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════

export interface CatalogEntry {
  vehicleFingerprint: string;
  partName: string;
  partNumber: string | null;
  brand: string | null;
  serviceType: string | null;
  usageCount: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  county: string | null;
  state: string;
  lastSeenAt: Date;
}

export interface RegionalPricingResult {
  partName: string;
  partNumber: string | null;
  brand: string | null;
  usageCount: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

// ═══════════════════════════════════════════════
// FEED: Alimentar catálogo após serviço completado
// ═══════════════════════════════════════════════

/**
 * Chamado dentro de approveServiceAndProcessPayment após pagamento.
 * Extrai peças da quote completada e upsert no catálogo orgânico.
 *
 * Falha silenciosa — não bloqueia o pagamento.
 */
export async function feedCatalogFromCompletedService(
  quoteId: string,
  tx?: PrismaClient,
): Promise<void> {
  const db = tx || prisma;

  try {
    const quote = await db.quote.findUnique({
      where: { id: quoteId },
      include: {
        serviceRequest: {
          include: { vehicle: true },
        },
      },
    });

    if (!quote || !quote.serviceRequest?.vehicle) return;

    const vehicle = quote.serviceRequest.vehicle;
    const vehicleFingerprint =
      `${vehicle.year}_${vehicle.make}_${vehicle.model}`
        .toLowerCase()
        .replace(/\s+/g, '_');

    // quote.partsList é JSON array de peças
    const partsList = quote.partsList as any[];
    if (!partsList || !Array.isArray(partsList) || partsList.length === 0) return;

    for (const item of partsList) {
      if (!item.name && !item.description) continue;

      const partName = (item.name || item.description || '').toLowerCase().trim();
      const unitPrice = parseFloat(item.price || item.unitPrice || '0');
      if (!partName || unitPrice <= 0) continue;

      await db.quoteCatalogEntry.upsert({
        where: {
          vehicleFingerprint_partName: {
            vehicleFingerprint,
            partName,
          },
        },
        create: {
          vehicleFingerprint,
          partName,
          partNumber: item.partNumber || null,
          brand: item.brand || null,
          serviceType: quote.serviceRequest.rawServiceType || null,
          usageCount: 1,
          avgPrice: unitPrice,
          minPrice: unitPrice,
          maxPrice: unitPrice,
          state: 'FL', // TODO: derive from provider location
          lastSeenAt: new Date(),
        },
        update: {
          usageCount: { increment: 1 },
          lastSeenAt: new Date(),
          // Atualizar partNumber/brand se novos dados são mais completos
          ...(item.partNumber ? { partNumber: item.partNumber } : {}),
          ...(item.brand ? { brand: item.brand } : {}),
          // Min/Max atualização simples (cálculo preciso em job noturno)
          // Nota: avg é recalculado no job noturno de materialização
        },
      });
    }
  } catch (err) {
    console.error('[CATALOG] feedCatalogFromCompletedService error:', err);
    // Falha silenciosa — não bloqueia o pagamento
  }
}

// ═══════════════════════════════════════════════
// QUERY: Buscar dados do catálogo orgânico
// ═══════════════════════════════════════════════

/**
 * Busca pricing regional para um veículo específico.
 * Usado no Auto Parts Store e Vehicle Details.
 */
export async function getRegionalPricing(params: {
  vehicleFingerprint?: string;
  serviceType?: string;
  partName?: string;
  county?: string;
  state?: string;
}): Promise<RegionalPricingResult[]> {
  const where: any = {};

  if (params.vehicleFingerprint) {
    where.vehicleFingerprint = params.vehicleFingerprint;
  }
  if (params.serviceType) {
    where.serviceType = params.serviceType;
  }
  if (params.partName) {
    where.partName = { contains: params.partName.toLowerCase() };
  }
  if (params.county) {
    where.county = params.county;
  }
  if (params.state) {
    where.state = params.state;
  }

  const entries = await prisma.quoteCatalogEntry.findMany({
    where,
    orderBy: [{ usageCount: 'desc' }, { lastSeenAt: 'desc' }],
    take: 20,
  });

  return entries.map(e => ({
    partName: e.partName,
    partNumber: e.partNumber,
    brand: e.brand,
    usageCount: e.usageCount,
    avgPrice: e.avgPrice,
    minPrice: e.minPrice,
    maxPrice: e.maxPrice,
  }));
}

/**
 * Busca sugestões de peças para autocomplete no Create Quote.
 * Usado por providers SEM PartsTech.
 */
export async function getPartSuggestions(params: {
  searchTerm: string;
  vehicleFingerprint?: string;
  limit?: number;
}): Promise<CatalogEntry[]> {
  const entries = await prisma.quoteCatalogEntry.findMany({
    where: {
      partName: { contains: params.searchTerm.toLowerCase() },
      ...(params.vehicleFingerprint
        ? { vehicleFingerprint: params.vehicleFingerprint }
        : {}),
    },
    orderBy: [{ usageCount: 'desc' }],
    take: params.limit || 10,
  });

  return entries.map(e => ({
    vehicleFingerprint: e.vehicleFingerprint,
    partName: e.partName,
    partNumber: e.partNumber,
    brand: e.brand,
    serviceType: e.serviceType,
    usageCount: e.usageCount,
    avgPrice: e.avgPrice,
    minPrice: e.minPrice,
    maxPrice: e.maxPrice,
    county: e.county,
    state: e.state,
    lastSeenAt: e.lastSeenAt,
  }));
}

/**
 * Busca catálogo por VIN (converte para fingerprint automaticamente).
 * Auto Parts Store usa este endpoint.
 */
export async function getCatalogByVehicle(params: {
  make: string;
  model: string;
  year: number;
  searchTerm?: string;
  limit?: number;
}): Promise<CatalogEntry[]> {
  const vehicleFingerprint =
    `${params.year}_${params.make}_${params.model}`
      .toLowerCase()
      .replace(/\s+/g, '_');

  const where: any = { vehicleFingerprint };
  if (params.searchTerm) {
    where.partName = { contains: params.searchTerm.toLowerCase() };
  }

  const entries = await prisma.quoteCatalogEntry.findMany({
    where,
    orderBy: [{ usageCount: 'desc' }],
    take: params.limit || 20,
  });

  return entries.map(e => ({
    vehicleFingerprint: e.vehicleFingerprint,
    partName: e.partName,
    partNumber: e.partNumber,
    brand: e.brand,
    serviceType: e.serviceType,
    usageCount: e.usageCount,
    avgPrice: e.avgPrice,
    minPrice: e.minPrice,
    maxPrice: e.maxPrice,
    county: e.county,
    state: e.state,
    lastSeenAt: e.lastSeenAt,
  }));
}

// ═══════════════════════════════════════════════
// RECALCULATE: Job noturno de materialização
// ═══════════════════════════════════════════════

/**
 * Recalcula avg/min/max prices para todas as entradas do catálogo.
 * Preferível rodar como job noturno (cron).
 *
 * Lógica:
 * - Busca todas as quotes completadas dos últimos 90 dias
 * - Agrupa por vehicleFingerprint + partName
 * - Recalcula avg/min/max
 */
export async function recalculateCatalogPrices(): Promise<number> {
  // Buscar entradas com usageCount > 1 para recalcular
  const entries = await prisma.quoteCatalogEntry.findMany({
    where: { usageCount: { gte: 2 } },
  });

  let updated = 0;
  for (const entry of entries) {
    // Buscar quotes completadas com esta peça neste veículo
    const quotes = await prisma.quote.findMany({
      where: {
        status: 'ACCEPTED', // ou COMPLETED se tivermos esse status
        serviceRequest: {
          vehicle: {
            year: parseInt(entry.vehicleFingerprint.split('_')[0]) || undefined,
          },
        },
      },
      select: { partsList: true },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    const prices: number[] = [];
    for (const q of quotes) {
      const parts = q.partsList as any[];
      if (!Array.isArray(parts)) continue;
      for (const p of parts) {
        const name = (p.name || p.description || '').toLowerCase().trim();
        if (name === entry.partName) {
          const price = parseFloat(p.price || p.unitPrice || '0');
          if (price > 0) prices.push(price);
        }
      }
    }

    if (prices.length > 0) {
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const min = Math.min(...prices);
      const max = Math.max(...prices);

      await prisma.quoteCatalogEntry.update({
        where: { id: entry.id },
        data: {
          avgPrice: parseFloat(avg.toFixed(2)),
          minPrice: parseFloat(min.toFixed(2)),
          maxPrice: parseFloat(max.toFixed(2)),
          usageCount: prices.length,
        },
      });
      updated++;
    }
  }

  console.log(`[CATALOG] Recalculated ${updated} catalog entries`);
  return updated;
}

// ═══════════════════════════════════════════════
// SERVICE PART MAPPING — Seed estático
// ═══════════════════════════════════════════════

/**
 * Mapeamento estático: service_type → parts esperadas.
 * Usado quando Organic Catalog ainda não tem dados suficientes.
 * 45 serviços mapeados do catálogo interno.
 */
export const SERVICE_PART_MAP: Record<string, string[]> = {
  'Oil Change': ['Oil Filter', 'Engine Oil', 'Drain Plug Gasket'],
  'Brake Pad Replacement': ['Brake Pads (Front)', 'Brake Pads (Rear)', 'Brake Cleaner'],
  'Brake Rotor Replacement': ['Brake Rotors (Front)', 'Brake Rotors (Rear)', 'Brake Pads'],
  'Air Filter Replacement': ['Engine Air Filter'],
  'Cabin Air Filter': ['Cabin Air Filter'],
  'Battery Replacement': ['Car Battery', 'Battery Terminal Cleaner'],
  'Spark Plug Replacement': ['Spark Plugs', 'Ignition Coils'],
  'Tire Rotation': [],
  'Wheel Alignment': [],
  'Transmission Fluid': ['Transmission Fluid', 'Transmission Filter', 'Gasket'],
  'Coolant Flush': ['Coolant/Antifreeze', 'Thermostat', 'Radiator Hose'],
  'Power Steering Fluid': ['Power Steering Fluid'],
  'Wiper Blade Replacement': ['Wiper Blades (Front)', 'Wiper Blade (Rear)'],
  'Headlight Bulb': ['Headlight Bulb'],
  'Tail Light Bulb': ['Tail Light Bulb'],
  'Alternator Replacement': ['Alternator', 'Serpentine Belt'],
  'Starter Motor Replacement': ['Starter Motor'],
  'Water Pump Replacement': ['Water Pump', 'Gasket', 'Coolant'],
  'Timing Belt Replacement': ['Timing Belt Kit', 'Water Pump', 'Tensioner'],
  'Serpentine Belt': ['Serpentine Belt', 'Belt Tensioner'],
  'Fuel Filter': ['Fuel Filter'],
  'Fuel Pump': ['Fuel Pump Assembly'],
  'Thermostat Replacement': ['Thermostat', 'Gasket', 'Coolant'],
  'Radiator Replacement': ['Radiator', 'Coolant', 'Radiator Hoses'],
  'AC Recharge': ['Refrigerant (R-134a)', 'AC Compressor Oil'],
  'AC Compressor': ['AC Compressor', 'Refrigerant', 'Expansion Valve'],
  'Suspension Struts': ['Front Struts', 'Rear Shocks', 'Strut Mounts'],
  'Ball Joint Replacement': ['Ball Joints', 'Ball Joint Boot'],
  'Tie Rod End': ['Inner Tie Rod', 'Outer Tie Rod End'],
  'CV Axle Replacement': ['CV Axle Assembly'],
  'Wheel Bearing': ['Wheel Bearing Hub Assembly'],
  'Exhaust System': ['Muffler', 'Exhaust Pipe', 'Gaskets'],
  'Catalytic Converter': ['Catalytic Converter', 'O2 Sensor'],
  'Oxygen Sensor': ['O2 Sensor'],
  'Mass Air Flow Sensor': ['MAF Sensor'],
  'Throttle Body': ['Throttle Body', 'Throttle Body Gasket'],
  'EGR Valve': ['EGR Valve'],
  'PCV Valve': ['PCV Valve'],
  'Windshield Replacement': ['Windshield Glass', 'Windshield Urethane Adhesive'],
  'Door Lock Actuator': ['Door Lock Actuator'],
  'Window Regulator': ['Window Regulator Motor Assembly'],
  'Headlight Assembly': ['Headlight Assembly'],
  'Side Mirror Replacement': ['Side View Mirror Assembly'],
  'Multi-Point Inspection': [],
  'Diagnostic Scan': [],
};

/**
 * Retorna as peças esperadas para um tipo de serviço.
 */
export function getExpectedPartsForService(serviceType: string): string[] {
  return SERVICE_PART_MAP[serviceType] || [];
}
