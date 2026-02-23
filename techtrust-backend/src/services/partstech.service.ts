/**
 * ============================================
 * PARTSTECH INTEGRATION SERVICE — CAMADA 2 (B2B)
 * ============================================
 * SOMENTE para PROVIDERS (oficinas).
 * Clientes NUNCA interagem com PartsTech.
 * Cada provider tem sua própria conta/API key PartsTech.
 * Custo: $0 por API call (preço incluso na conta PartsTech do provider)
 *
 * PartsTech = FERRAMENTA DO PROVIDER no Create Quote
 * PartsTech ≠ marketplace de peças para consumidor
 *
 * O CLIENT nunca vê o preço wholesale.
 * O CLIENT vê apenas o preço de VENDA que o provider definiu na quote.
 *
 * Fluxo:
 *   1. Provider abre Create Quote
 *   2. Clica [Find Parts (PartsTech)]
 *   3. PartsTech Punchout abre → busca peça + VIN
 *   4. Vê preço wholesale (preço dele)
 *   5. Seleciona → importa para quote
 *   6. Define sell price (markup dele)
 *   7. Client vê sell price, NÃO vê wholesale
 */

import axios, { AxiosInstance } from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════

export interface PartsTechPart {
  partsTechId: string;
  partNumber: string;
  brand: string;
  description: string;
  category: string;
  wholesalePrice: number;   // Preço de CUSTO (wholesale) — NÃO mostrar ao client
  listPrice?: number;       // Preço sugerido varejo
  coreCharge?: number;      // Taxa de retorno de peça usada
  availability: string;     // In Stock, Available, Backordered
  supplier: string;         // AutoZone, NAPA, WORLDPAC, etc.
  imageUrl?: string;
  fitment?: string;         // Compatibilidade com o veículo
}

export interface PartsTechSearchResult {
  success: boolean;
  parts: PartsTechPart[];
  totalResults: number;
  searchTerm: string;
  vin?: string;
  error?: string;
}

export interface PartsTechConnectionStatus {
  connected: boolean;
  accountId?: string;
  connectedAt?: Date;
  error?: string;
}

// ═══════════════════════════════════════════════
// Validate & Connect PartsTech Account
// ═══════════════════════════════════════════════

/**
 * Provider conecta sua conta PartsTech inserindo API key.
 * Valida a key fazendo uma chamada de teste à API.
 */
export async function connectPartsTechAccount(
  providerId: string,
  apiKey: string,
  accountId?: string,
): Promise<PartsTechConnectionStatus> {
  try {
    // 1. Validar API key fazendo um request de teste
    const isValid = await validatePartsTechApiKey(apiKey);
    if (!isValid) {
      return {
        connected: false,
        error: 'Invalid PartsTech API key. Please check your credentials and try again.',
      };
    }

    // 2. Salvar no perfil do provider
    await prisma.providerProfile.update({
      where: { id: providerId },
      data: {
        partsTechApiKey: apiKey,
        partsTechAccountId: accountId || null,
        partsTechConnected: true,
        partsTechConnectedAt: new Date(),
      },
    });

    return {
      connected: true,
      accountId: accountId || undefined,
      connectedAt: new Date(),
    };
  } catch (error: any) {
    console.error('[PARTSTECH] Connection error:', error.message);
    return {
      connected: false,
      error: 'Failed to connect PartsTech account. Please try again.',
    };
  }
}

/**
 * Desconecta a conta PartsTech do provider.
 */
export async function disconnectPartsTechAccount(providerId: string): Promise<boolean> {
  try {
    await prisma.providerProfile.update({
      where: { id: providerId },
      data: {
        partsTechApiKey: null,
        partsTechAccountId: null,
        partsTechConnected: false,
        partsTechConnectedAt: null,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica se provider tem PartsTech conectado.
 */
export async function getPartsTechStatus(
  providerId: string,
): Promise<PartsTechConnectionStatus> {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerId },
    select: {
      partsTechConnected: true,
      partsTechAccountId: true,
      partsTechConnectedAt: true,
    },
  });

  if (!profile) {
    return { connected: false, error: 'Provider profile not found' };
  }

  return {
    connected: profile.partsTechConnected,
    accountId: profile.partsTechAccountId || undefined,
    connectedAt: profile.partsTechConnectedAt || undefined,
  };
}

// ═══════════════════════════════════════════════
// Search Parts by VIN (Provider B2B)
// ═══════════════════════════════════════════════

/**
 * Busca peças por VIN + search term no PartsTech.
 * SOMENTE para providers com conta conectada.
 *
 * @param providerId - ID do provider (para buscar API key)
 * @param vin - VIN do veículo
 * @param searchTerm - Termo de busca (ex: "oil filter", "brake pads")
 */
export async function searchPartsByVIN(
  providerId: string,
  vin: string,
  searchTerm: string,
): Promise<PartsTechSearchResult> {
  // 1. Buscar API key do provider
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerId },
    select: { partsTechApiKey: true, partsTechConnected: true },
  });

  if (!profile || !profile.partsTechConnected || !profile.partsTechApiKey) {
    return {
      success: false,
      parts: [],
      totalResults: 0,
      searchTerm,
      error: 'PartsTech not connected. Please connect your PartsTech account first.',
    };
  }

  try {
    // 2. Chamar PartsTech API
    const client = createPartsTechClient(profile.partsTechApiKey);
    const response = await client.get('/parts/search', {
      params: {
        vin,
        q: searchTerm,
        limit: 20,
      },
    });

    // 3. Mapear resultado
    const parts: PartsTechPart[] = (response.data?.parts || []).map((p: any) => ({
      partsTechId: p.id || p.partsTechId,
      partNumber: p.partNumber || p.part_number,
      brand: p.brand || p.manufacturer,
      description: p.description || p.name,
      category: p.category || '',
      wholesalePrice: parseFloat(p.wholesalePrice || p.price || '0'),
      listPrice: p.listPrice ? parseFloat(p.listPrice) : undefined,
      coreCharge: p.coreCharge ? parseFloat(p.coreCharge) : undefined,
      availability: p.availability || p.stock_status || 'Unknown',
      supplier: p.supplier || p.distributor || '',
      imageUrl: p.imageUrl || p.image || undefined,
      fitment: p.fitment || p.fitmentNote || undefined,
    }));

    return {
      success: true,
      parts,
      totalResults: response.data?.totalResults || parts.length,
      searchTerm,
      vin,
    };
  } catch (error: any) {
    console.error('[PARTSTECH] Search error:', error.message);
    return {
      success: false,
      parts: [],
      totalResults: 0,
      searchTerm,
      vin,
      error: 'Failed to search parts. Please try again.',
    };
  }
}

// ═══════════════════════════════════════════════
// Import Part to Quote (sets source = 'PARTSTECH')
// ═══════════════════════════════════════════════

/**
 * Dados de peça importada do PartsTech para inclusão na quote.
 * Provider define o sellPrice (markup sobre wholesale).
 * Client NUNCA vê o wholesalePrice.
 */
export interface ImportedPartForQuote {
  partsTechId: string;
  partNumber: string;
  brand: string;
  name: string;          // Descrição da peça
  quantity: number;
  wholesalePrice: number; // Custo do provider (NÃO mostrar ao client)
  sellPrice: number;      // Preço que o client vai pagar
  source: 'PARTSTECH';
}

/**
 * Prepara dados de peça para serem inseridos na quote.
 * O provider define o sellPrice — a plataforma salva o wholesalePrice
 * internamente para analytics mas NUNCA expõe ao client.
 */
export function preparePartForQuote(
  part: PartsTechPart,
  sellPrice: number,
  quantity: number = 1,
): ImportedPartForQuote {
  return {
    partsTechId: part.partsTechId,
    partNumber: part.partNumber,
    brand: part.brand,
    name: part.description,
    quantity,
    wholesalePrice: part.wholesalePrice,
    sellPrice,
    source: 'PARTSTECH',
  };
}

// ═══════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════

/**
 * Cria um Axios client autenticado para PartsTech API.
 * A URL base será configurada quando PartsTech fornecer especificações.
 */
function createPartsTechClient(apiKey: string): AxiosInstance {
  return axios.create({
    baseURL: process.env.PARTSTECH_API_URL || 'https://api.partstech.com/v1',
    timeout: 15000,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Source': 'TechTrust',
    },
  });
}

/**
 * Valida se a API key é válida fazendo um request de teste.
 */
async function validatePartsTechApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = createPartsTechClient(apiKey);
    const response = await client.get('/account/info');
    return response.status === 200;
  } catch (error: any) {
    // Se retornar 401/403, key é inválida
    if (error.response?.status === 401 || error.response?.status === 403) {
      return false;
    }
    // Se for outro erro (timeout, rede), presumir que key pode ser válida
    // mas API indisponível — logar e retornar true para não bloquear
    console.warn('[PARTSTECH] Validation request failed (non-auth):', error.message);
    return true;
  }
}
