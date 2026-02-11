/**
 * ============================================
 * SERVICE FLOW SERVICE (Mobile)
 * ============================================
 * API calls para o fluxo completo de pagamento:
 * - Aprovação de orçamento com hold no cartão
 * - Suplementos de valor
 * - Cancelamento com validação do fornecedor
 * - Upload de fotos do serviço
 * - Aprovação do cliente com termos legais
 * - Comparação de processadores de pagamento
 * - Consulta de orçamento/recibo
 */

import api from './api';

// ============================================
// TIPOS
// ============================================

export interface PaymentBreakdown {
  serviceAmount: number;
  platformFee: number;
  processingFee: number;
  totalAmount: number;
  providerWillReceive: number;
}

export interface ProcessorComparison {
  stripe: {
    name: string;
    processingFee: number;
    platformFee: number;
    totalAmount: number;
    processingTime: string;
    available: boolean;
  };
  chase: {
    name: string;
    processingFee: number;
    platformFee: number;
    totalAmount: number;
    processingTime: string;
    available: boolean;
    note?: string | null;
  };
  recommendation: {
    processor: 'STRIPE' | 'CHASE';
    savings: number;
    description: string;
  };
}

export interface ApprovedQuoteDetails {
  workOrder: {
    id: string;
    orderNumber: string;
    status: string;
    clientPresent: boolean | null;
    serviceCompletedByProvider: boolean;
    termsAccepted: boolean;
    photos: {
      before: any[];
      during: any[];
      after: any[];
    };
    dates: {
      created: string;
      started: string | null;
      completed: string | null;
      approved: string | null;
    };
  };
  quote: {
    id: string;
    quoteNumber: string;
    partsCost: number;
    laborCost: number;
    travelFee: number;
    totalAmount: number;
    partsList: any[];
    warranty: {
      months: number | null;
      mileage: number | null;
      description: string | null;
    };
    provider: any;
  };
  financials: {
    originalAmount: number;
    additionalAmount: number;
    finalAmount: number;
    totalAuthorized: number;
    totalCaptured: number;
    holdActive: boolean;
  };
  payments: any[];
  supplements: any[];
  cancellation: any | null;
  vehicle: any;
  service: {
    title: string;
    description: string | null;
    type: string;
  };
}

export interface ReceiptData {
  receipt: {
    id: string;
    receiptNumber: string;
    customerName: string;
    providerName: string;
    subtotal: number;
    platformFee: number;
    processingFee: number;
    totalAmount: number;
    supplementsTotal: number;
    paymentProcessor: string;
    paymentMethodInfo: string;
    createdAt: string;
  };
  html: string;
}

// ============================================
// 1. APROVAÇÃO DE ORÇAMENTO COM HOLD
// ============================================

/**
 * Aprovar orçamento e criar hold no cartão
 */
export async function approveQuoteWithHold(params: {
  quoteId: string;
  paymentMethodId: string;
  paymentProcessor?: 'STRIPE' | 'CHASE';
}): Promise<{
  success: boolean;
  message: string;
  data: {
    workOrder: { id: string; orderNumber: string; status: string };
    payment: { id: string; paymentNumber: string; status: string; breakdown: PaymentBreakdown };
    holdInfo: { message: string; expiresInDays: number };
  };
}> {
  const { data } = await api.post('/service-flow/approve-quote', {
    quoteId: params.quoteId,
    paymentMethodId: params.paymentMethodId,
    paymentProcessor: params.paymentProcessor || 'STRIPE',
  });
  return data;
}

// ============================================
// 2. SUPLEMENTOS
// ============================================

/**
 * Fornecedor solicita suplemento de valor
 */
export async function requestSupplement(params: {
  workOrderId: string;
  description: string;
  additionalAmount: number;
  additionalParts?: any[];
  additionalLabor?: number;
  reason?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    supplementId: string;
    supplementNumber: string;
    status: string;
    customerResponseTimeout: string;
  };
}> {
  const { data } = await api.post('/service-flow/request-supplement', params);
  return data;
}

/**
 * Cliente responde ao suplemento (aprovar/rejeitar)
 */
export async function respondToSupplement(params: {
  supplementId: string;
  approved: boolean;
  note?: string;
  paymentMethodId?: string;
}): Promise<{
  success: boolean;
  message: string;
  data?: any;
  code?: string;
}> {
  const { data } = await api.post('/service-flow/respond-supplement', params);
  return data;
}

// ============================================
// 3. CANCELAMENTO
// ============================================

/**
 * Cliente solicita cancelamento do serviço
 */
export async function requestCancellation(params: {
  workOrderId: string;
  reason?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    cancellationRequestId?: string;
    status?: string;
    providerTimeoutHours?: number;
    cancellationFeePercent?: number;
    cancellationFeeAmount?: number;
    holdsReleased?: number;
    note?: string;
  };
}> {
  const { data } = await api.post('/service-flow/request-cancellation', params);
  return data;
}

/**
 * Fornecedor valida solicitação de cancelamento
 */
export async function validateCancellation(params: {
  cancellationRequestId: string;
  hasIncurredCosts: boolean;
  reportedCosts?: number;
  validation: string;
  evidencePhotos?: string[];
}): Promise<{
  success: boolean;
  message: string;
  data: any;
}> {
  const { data } = await api.post('/service-flow/validate-cancellation', params);
  return data;
}

// ============================================
// 4. FOTOS DO SERVIÇO
// ============================================

/**
 * Upload de fotos do serviço (provider)
 */
export async function uploadServicePhotos(params: {
  workOrderId: string;
  photoUrls: string[];
  photoType: 'before' | 'during' | 'after';
}): Promise<{
  success: boolean;
  message: string;
  data: { totalPhotos: number };
}> {
  const { data } = await api.post('/service-flow/upload-service-photos', params);
  return data;
}

// ============================================
// 5. FORNECEDOR FINALIZA SERVIÇO
// ============================================

/**
 * Fornecedor marca serviço como completo
 */
export async function completeService(params: {
  workOrderId: string;
  completionNotes?: string;
  clientPresent: boolean;
}): Promise<{
  success: boolean;
  message: string;
  data: { status: string };
}> {
  const { data } = await api.post('/service-flow/complete-service', params);
  return data;
}

// ============================================
// 6. CLIENTE APROVA + TERMOS + CAPTURA
// ============================================

/**
 * Cliente aprova serviço com aceitação de termos e captura pagamento
 */
export async function approveServiceAndPay(params: {
  workOrderId: string;
  termsAccepted: boolean;
  fraudDisclaimerAccepted: boolean;
  signatureName: string;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    workOrderStatus: string;
    paymentsCaptured: number;
    totalCharged: number;
    supplementsTotal: number;
    receipt: { id: string; receiptNumber: string } | null;
    termsAccepted: boolean;
    fraudDisclaimerAccepted: boolean;
  };
}> {
  const { data } = await api.post('/service-flow/approve-service', params);
  return data;
}

// ============================================
// 7. COMPARAÇÃO DE PROCESSADORES
// ============================================

/**
 * Comparar taxas entre Stripe e Chase
 */
export async function compareProcessors(params: {
  amount: number;
  cardType?: 'credit' | 'debit';
}): Promise<{
  success: boolean;
  data: {
    serviceAmount: number;
    cardType: string;
    processors: ProcessorComparison['stripe'] & ProcessorComparison['chase'];
    recommendation: ProcessorComparison['recommendation'];
  };
}> {
  const { data } = await api.post('/service-flow/compare-processors', params);
  return data;
}

// ============================================
// 8. CONSULTAS
// ============================================

/**
 * Consultar orçamento aprovado e valores provisionados
 */
export async function getApprovedQuoteDetails(
  workOrderId: string
): Promise<{
  success: boolean;
  data: ApprovedQuoteDetails;
}> {
  const { data } = await api.get(`/service-flow/approved-quote/${workOrderId}`);
  return data;
}

/**
 * Consultar recibo de pagamento
 */
export async function getReceipt(
  paymentId: string
): Promise<{
  success: boolean;
  data: ReceiptData;
}> {
  const { data } = await api.get(`/service-flow/receipt/${paymentId}`);
  return data;
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  // Aprovação com hold
  approveQuoteWithHold,
  // Suplementos
  requestSupplement,
  respondToSupplement,
  // Cancelamento
  requestCancellation,
  validateCancellation,
  // Fotos
  uploadServicePhotos,
  // Completar serviço
  completeService,
  // Aprovação cliente + pagamento
  approveServiceAndPay,
  // Comparação de processadores
  compareProcessors,
  // Consultas
  getApprovedQuoteDetails,
  getReceipt,
};
