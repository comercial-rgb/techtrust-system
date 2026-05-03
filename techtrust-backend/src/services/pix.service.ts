/**
 * ============================================
 * PIX SERVICE
 * ============================================
 * Pagamentos via PIX para usuários brasileiros viajando nos EUA.
 *
 * Fluxo:
 *   1. Cliente BR seleciona PIX como forma de pagamento
 *   2. Backend busca taxa BRL/USD (AwesomeAPI, cache 5 min)
 *   3. Valor USD do pedido é convertido para BRL (+ spread de 2%)
 *   4. Asaas emite cobrança PIX com QR Code + copia-e-cola
 *   5. Cliente paga via app bancário brasileiro
 *   6. Asaas envia webhook → backend confirma pagamento
 *   7. Backend captura o serviço normalmente
 *
 * Gateway: Asaas (https://asaas.com) — aceita PIX instantâneo no Brasil.
 * Variável de ambiente: ASAAS_API_KEY, ASAAS_ENVIRONMENT (sandbox|production)
 * ============================================
 */

import { logger } from '../config/logger';
import { PIX_RULES } from '../config/businessRules';

// ─── TIPOS ──────────────────────────────────────────────────────────────────

export interface PixCharge {
  pixPaymentId: string;   // ID no Asaas (e.g. "pay_abcd1234")
  pixQrCode: string;      // QR code base64 (para exibir ao usuário)
  pixCopyPaste: string;   // Código copia-e-cola
  pixExpiresAt: Date;
  amountBrl: number;
  exchangeRate: number;   // Taxa BRL/USD usada (com spread)
  amountUsd: number;      // Valor equivalente em USD que será cobrado
}

export interface AsaasCustomer {
  id: string;
}

// ─── CACHE DE TAXA ───────────────────────────────────────────────────────────

let cachedRate: number | null = null;
let cacheExpiresAt: number = 0;

/**
 * Busca a taxa de câmbio BRL/USD atual.
 * Usa AwesomeAPI como fonte primária (gratuita, sem auth).
 * Fallback para taxa estática em caso de erro.
 */
export async function getBrlToUsdRate(): Promise<number> {
  const now = Date.now();

  if (cachedRate !== null && now < cacheExpiresAt) {
    return cachedRate;
  }

  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', {
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) throw new Error(`AwesomeAPI status ${res.status}`);

    const data = await res.json() as { USDBRL?: { bid?: string } };
    const rate = parseFloat(data?.USDBRL?.bid ?? '');

    if (!rate || isNaN(rate) || rate < 1 || rate > 20) {
      throw new Error(`Invalid rate value: ${rate}`);
    }

    cachedRate = rate;
    cacheExpiresAt = now + PIX_RULES.EXCHANGE_RATE_CACHE_TTL_SECONDS * 1000;

    logger.info(`Taxa BRL/USD atualizada: ${rate}`);
    return rate;
  } catch (err) {
    logger.warn(`Falha ao buscar taxa BRL/USD, usando fallback ${PIX_RULES.EXCHANGE_RATE_FALLBACK_BRL_PER_USD}: ${err}`);
    return PIX_RULES.EXCHANGE_RATE_FALLBACK_BRL_PER_USD;
  }
}

// ─── ASAAS CLIENT ────────────────────────────────────────────────────────────

function getAsaasBaseUrl(): string {
  const env = process.env.ASAAS_ENVIRONMENT ?? 'sandbox';
  return env === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';
}

function getAsaasHeaders(): Record<string, string> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error('ASAAS_API_KEY não configurada');
  return {
    'Content-Type': 'application/json',
    'access_token': key,
  };
}

/**
 * Cria ou recupera um Customer no Asaas para o usuário.
 * Asaas exige CPF/CNPJ para criar customer.
 */
export async function getOrCreateAsaasCustomer(params: {
  userId: string;
  name: string;
  email: string;
  cpfCnpj: string;   // CPF (11 dígitos) ou CNPJ (14 dígitos) sem pontuação
}): Promise<AsaasCustomer> {
  const headers = getAsaasHeaders();
  const base = getAsaasBaseUrl();

  // Tenta localizar customer pelo cpfCnpj
  const searchRes = await fetch(`${base}/customers?cpfCnpj=${params.cpfCnpj}`, {
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (!searchRes.ok) {
    throw new Error(`Asaas customer search failed: ${searchRes.status}`);
  }

  const searchData = await searchRes.json() as { data?: Array<{ id: string; cpfCnpj?: string }> };
  // Filtrar pelo CPF/CNPJ exato para evitar usar customer errado em caso de resultado ambíguo
  const existing = searchData.data?.find(
    (c) => c.id && (c.cpfCnpj?.replace(/\D/g, '') === params.cpfCnpj || !c.cpfCnpj),
  );

  if (existing?.id) {
    return { id: existing.id };
  }

  // Criar novo customer
  const createRes = await fetch(`${base}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      cpfCnpj: params.cpfCnpj,
      externalReference: params.userId,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!createRes.ok) {
    const errBody = await createRes.text();
    throw new Error(`Asaas customer create failed: ${createRes.status} — ${errBody}`);
  }

  const created = await createRes.json() as { id: string };
  logger.info(`Asaas Customer criado: ${created.id} para user ${params.userId}`);
  return { id: created.id };
}

/**
 * Emite uma cobrança PIX no Asaas.
 *
 * @param asaasCustomerId - ID do customer no Asaas
 * @param amountBrl       - Valor em BRL a cobrar
 * @param description     - Descrição que aparece na cobrança
 * @param externalRef     - Referência externa (paymentId do TechTrust)
 */
async function issueAsaasPixCharge(
  asaasCustomerId: string,
  amountBrl: number,
  description: string,
  externalRef: string,
): Promise<{ id: string; encodedImage: string; payload: string; expirationDate: string }> {
  const headers = getAsaasHeaders();
  const base = getAsaasBaseUrl();

  const expiresAt = new Date(Date.now() + PIX_RULES.QR_CODE_EXPIRATION_MINUTES * 60 * 1000);
  const dueDate = expiresAt.toISOString().split('T')[0]; // YYYY-MM-DD

  const body = {
    customer: asaasCustomerId,
    billingType: 'PIX',
    value: amountBrl,
    dueDate,
    description,
    externalReference: externalRef,
  };

  const res = await fetch(`${base}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Asaas PIX charge failed: ${res.status} — ${errBody}`);
  }

  const payment = await res.json() as { id: string };

  // Buscar QR code
  const qrRes = await fetch(`${base}/payments/${payment.id}/pixQrCode`, {
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (!qrRes.ok) {
    throw new Error(`Asaas QR code fetch failed: ${qrRes.status}`);
  }

  const qr = await qrRes.json() as { encodedImage: string; payload: string; expirationDate: string };

  return {
    id: payment.id,
    encodedImage: qr.encodedImage,
    payload: qr.payload,
    expirationDate: qr.expirationDate,
  };
}

// ─── FUNÇÃO PRINCIPAL ────────────────────────────────────────────────────────

/**
 * Cria uma cobrança PIX para um pagamento TechTrust.
 *
 * @param params.amountUsd      - Valor em USD do serviço
 * @param params.asaasCustomerId - ID do customer no Asaas (já criado/recuperado)
 * @param params.paymentId      - ID do Payment no banco TechTrust (referência externa)
 * @param params.orderNumber    - Número da ordem (para a descrição)
 */
export async function createPixCharge(params: {
  amountUsd: number;
  asaasCustomerId: string;
  paymentId: string;
  orderNumber: string;
}): Promise<PixCharge> {
  const rateBrlPerUsd = await getBrlToUsdRate();

  // Aplica spread: o cliente paga um pouco mais de BRL para cobrir a variação
  const spreadFactor = 1 + PIX_RULES.CONVERSION_SPREAD_PERCENT / 100;
  const effectiveRate = rateBrlPerUsd * spreadFactor;
  const amountBrl = Math.ceil(params.amountUsd * effectiveRate * 100) / 100; // arredonda para cima

  if (amountBrl < PIX_RULES.MIN_AMOUNT_BRL) {
    throw new Error(`Valor mínimo PIX é R$ ${PIX_RULES.MIN_AMOUNT_BRL}`);
  }
  if (amountBrl > PIX_RULES.MAX_AMOUNT_BRL) {
    throw new Error(`Valor máximo PIX por transação é R$ ${PIX_RULES.MAX_AMOUNT_BRL.toLocaleString('pt-BR')}`);
  }

  const charge = await issueAsaasPixCharge(
    params.asaasCustomerId,
    amountBrl,
    `TechTrust - Serviço #${params.orderNumber}`,
    params.paymentId,
  );

  const expiresAt = new Date(Date.now() + PIX_RULES.QR_CODE_EXPIRATION_MINUTES * 60 * 1000);

  logger.info(`PIX charge criado: ${charge.id} | R$ ${amountBrl} | USD ${params.amountUsd}`);

  return {
    pixPaymentId: charge.id,
    pixQrCode: charge.encodedImage,
    pixCopyPaste: charge.payload,
    pixExpiresAt: expiresAt,
    amountBrl,
    exchangeRate: effectiveRate,
    amountUsd: params.amountUsd,
  };
}

/**
 * Verifica o status de um pagamento PIX no Asaas.
 * Retorna true se confirmado (RECEIVED ou CONFIRMED).
 */
export async function verifyPixPayment(asaasPaymentId: string): Promise<{
  confirmed: boolean;
  status: string;
}> {
  const headers = getAsaasHeaders();
  const base = getAsaasBaseUrl();

  const res = await fetch(`${base}/payments/${asaasPaymentId}`, {
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Asaas payment fetch failed: ${res.status}`);
  }

  const data = await res.json() as { status: string };
  const confirmed = data.status === 'RECEIVED' || data.status === 'CONFIRMED';
  return { confirmed, status: data.status };
}

/**
 * Cancela (exclui) uma cobrança PIX no Asaas (ex: expirada ou cancelada).
 */
export async function cancelPixCharge(asaasPaymentId: string): Promise<void> {
  const headers = getAsaasHeaders();
  const base = getAsaasBaseUrl();

  await fetch(`${base}/payments/${asaasPaymentId}`, {
    method: 'DELETE',
    headers,
    signal: AbortSignal.timeout(10_000),
  });
}
