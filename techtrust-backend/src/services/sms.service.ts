/**
 * ============================================
 * SMS SERVICE
 * ============================================
 * Serviço para envio de SMS via Twilio
 * Suporta modo MOCK para testes locais
 * Suporta Messaging Service SID para melhor entrega nos EUA (A2P 10DLC)
 */

import { logger } from '../config/logger';

const MOCK_MODE = process.env.MOCK_TWILIO === 'true';

const DEFAULT_SMS_TIMEOUT_MS = parseInt(
  process.env.SMS_TIMEOUT_MS || '15000',
  10
);

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
};

/**
 * Normaliza número de telefone para formato E.164
 * Garante que o número começa com + e contém apenas dígitos
 */
export const normalizePhone = (phone: string): string => {
  // Remove espaços, parênteses, hífens
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Se já começa com +, apenas limpa
  if (cleaned.startsWith('+')) {
    return '+' + cleaned.slice(1).replace(/\D/g, '');
  }

  // Se começa com 00 (formato internacional), converte para +
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.slice(2).replace(/\D/g, '');
  }

  // Se tem 10 dígitos (US sem código de país), adiciona +1
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 10) {
    return '+1' + digits;
  }

  // Se tem 11 dígitos e começa com 1 (US com código), adiciona +
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }

  // Se tem 11 dígitos e começa com 55 (Brasil fixo com DDD), adiciona +
  // Se tem 13 dígitos e começa com 55 (Brasil celular com +55), já é E.164
  if (digits.length >= 12 && digits.startsWith('55')) {
    return '+' + digits;
  }

  // Fallback: adiciona + se não tem
  return '+' + digits;
};

/**
 * Detecta se o número é dos EUA (+1)
 */
const isUSNumber = (phone: string): boolean => {
  const normalized = normalizePhone(phone);
  return normalized.startsWith('+1') && normalized.length === 12;
};

/**
 * Envia SMS (real ou mock)
 */
export const sendSMS = async (
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string }> => {
  
  // Normalizar o número de destino
  const normalizedTo = normalizePhone(to);
  
  // MODO MOCK (para testes sem Twilio)
  if (MOCK_MODE) {
    logger.info(`[MOCK SMS] Para: ${normalizedTo}, Mensagem: ${message}`);
    return {
      success: true,
      messageId: 'mock-' + Date.now(),
    };
  }

  // MODO REAL (Twilio)
  try {
    const hasMessagingService = !!process.env.TWILIO_MESSAGING_SERVICE_SID;
    const hasPhoneNumber = !!process.env.TWILIO_PHONE_NUMBER;

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio env vars ausentes (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN)');
    }

    if (!hasMessagingService && !hasPhoneNumber) {
      throw new Error('Necessário TWILIO_MESSAGING_SERVICE_SID ou TWILIO_PHONE_NUMBER');
    }

    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Preferir Messaging Service SID (melhor entrega nos EUA com A2P 10DLC)
    // Fallback para número direto
    const fromConfig = hasMessagingService
      ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }
      : { from: process.env.TWILIO_PHONE_NUMBER };

    logger.info(`📱 Enviando SMS para ${normalizedTo} via ${hasMessagingService ? 'Messaging Service' : 'Phone Number'} (US: ${isUSNumber(normalizedTo)})`);

    const result: any = await withTimeout<any>(
      client.messages.create({
        body: message,
        ...fromConfig,
        to: normalizedTo,
      }),
      DEFAULT_SMS_TIMEOUT_MS,
      'Twilio sendSMS'
    );

    logger.info(`✅ SMS enviado com sucesso para ${normalizedTo}. SID: ${result.sid}, Status: ${result.status}`);

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error: any) {
    // Log detalhado do erro Twilio para diagnóstico
    logger.error(`❌ Erro ao enviar SMS para ${normalizedTo}:`, {
      message: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo,
      isUSNumber: isUSNumber(normalizedTo),
      from: process.env.TWILIO_PHONE_NUMBER ? '***' + process.env.TWILIO_PHONE_NUMBER.slice(-4) : 'N/A',
      hasMessagingService: !!process.env.TWILIO_MESSAGING_SERVICE_SID,
    });
    throw new Error(`Falha ao enviar SMS: ${error.message} (code: ${error.code || 'N/A'})`);
  }
};

/**
 * Envia código OTP via SMS
 * Mensagem bilíngue para melhor experiência
 */
export const sendOTP = async (phone: string, otp: string, language?: string): Promise<void> => {
  // Mensagem bilíngue - mais confiável com operadoras dos EUA
  const message = language === 'PT' || language === 'ES'
    ? `TechTrust: ${otp} é seu código de verificação. Válido por 10 minutos.`
    : `TechTrust: ${otp} is your verification code. Valid for 10 minutes.`;
  
  const result = await sendSMS(phone, message);
  
  if (!result.success) {
    throw new Error('Falha ao enviar código de verificação');
  }
};

/**
 * Envia notificação via SMS
 */
export const sendNotificationSMS = async (
  phone: string,
  message: string
): Promise<void> => {
  await sendSMS(phone, message);
};
