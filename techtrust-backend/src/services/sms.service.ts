/**
 * ============================================
 * SMS SERVICE
 * ============================================
 * Serviço para envio de SMS via Twilio
 * - OTP: Usa Twilio Verify API (melhor entrega, sem A2P 10DLC)
 * - Notificações: Usa Twilio Messages API
 * - Suporta modo MOCK para testes locais
 */

import { logger } from "../config/logger";

const MOCK_MODE = process.env.MOCK_TWILIO === "true";

const DEFAULT_SMS_TIMEOUT_MS = parseInt(
  process.env.SMS_TIMEOUT_MS || "15000",
  10,
);

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timeout after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
};

/**
 * Normaliza número de telefone para formato E.164
 * Garante que o número começa com + e contém apenas dígitos
 */
export const normalizePhone = (phone: string): string => {
  // Remove espaços, parênteses, hífens
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, "");

  // Se já começa com +, apenas limpa
  if (cleaned.startsWith("+")) {
    return "+" + cleaned.slice(1).replace(/\D/g, "");
  }

  // Se começa com 00 (formato internacional), converte para +
  if (cleaned.startsWith("00")) {
    return "+" + cleaned.slice(2).replace(/\D/g, "");
  }

  // Se tem 10 dígitos (US sem código de país), adiciona +1
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 10) {
    return "+1" + digits;
  }

  // Se tem 11 dígitos e começa com 1 (US com código), adiciona +
  if (digits.length === 11 && digits.startsWith("1")) {
    return "+" + digits;
  }

  // Se tem 12+ dígitos e começa com 55 (Brasil), adiciona +
  if (digits.length >= 12 && digits.startsWith("55")) {
    return "+" + digits;
  }

  // Fallback: adiciona + se não tem
  return "+" + digits;
};

/**
 * Retorna o Twilio client (singleton lazy)
 */
let _twilioClient: any = null;
const getTwilioClient = () => {
  if (_twilioClient) return _twilioClient;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error(
      "Twilio env vars ausentes (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN)",
    );
  }
  const twilio = require("twilio");
  _twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );
  return _twilioClient;
};

// ============================================
// TWILIO VERIFY API (para OTP)
// ============================================

/**
 * Envia código OTP via Twilio Verify API
 * O Twilio gera e gerencia o código automaticamente
 * Suporta SMS, WhatsApp, e-mail como canais
 */
export const sendVerifyOTP = async (
  phone: string,
  channel: "sms" | "email" | "whatsapp" = "sms",
  emailAddress?: string,
): Promise<{ success: boolean; sid?: string }> => {
  const normalizedPhone = normalizePhone(phone);

  // MODO MOCK
  if (MOCK_MODE) {
    logger.info(`[MOCK VERIFY] Para: ${normalizedPhone}, Canal: ${channel}`);
    return { success: true, sid: "mock-verify-" + Date.now() };
  }

  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!verifySid) {
    throw new Error(
      "TWILIO_VERIFY_SERVICE_SID não configurado. Crie um Verify Service no Twilio Console.",
    );
  }

  try {
    const client = getTwilioClient();

    const verifyParams: any = {
      to: channel === "email" ? emailAddress : normalizedPhone,
      channel,
    };

    logger.info(
      `📱 Enviando OTP via Verify (${channel}) para: ${channel === "email" ? emailAddress : normalizedPhone}`,
    );

    const verification: any = await withTimeout(
      client.verify.v2.services(verifySid).verifications.create(verifyParams),
      DEFAULT_SMS_TIMEOUT_MS,
      "Twilio Verify send",
    );

    logger.info(
      `✅ Verify OTP enviado. SID: ${verification.sid}, Status: ${verification.status}, Canal: ${verification.channel}`,
    );

    return { success: true, sid: verification.sid };
  } catch (error: any) {
    logger.error(`❌ Erro ao enviar Verify OTP para ${normalizedPhone}:`, {
      message: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo,
    });
    throw new Error(
      `Falha ao enviar código: ${error.message} (code: ${error.code || "N/A"})`,
    );
  }
};

/**
 * Verifica código OTP via Twilio Verify API
 * O Twilio valida o código automaticamente
 */
export const checkVerifyOTP = async (
  phone: string,
  code: string,
): Promise<{ valid: boolean; status?: string }> => {
  const normalizedPhone = normalizePhone(phone);

  // MODO MOCK - aceita qualquer código de 6 dígitos
  if (MOCK_MODE) {
    logger.info(`[MOCK VERIFY CHECK] Para: ${normalizedPhone}, Code: ${code}`);
    return { valid: true, status: "approved" };
  }

  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!verifySid) {
    throw new Error("TWILIO_VERIFY_SERVICE_SID não configurado");
  }

  try {
    const client = getTwilioClient();

    const check: any = await withTimeout(
      client.verify.v2.services(verifySid).verificationChecks.create({
        to: normalizedPhone,
        code,
      }),
      DEFAULT_SMS_TIMEOUT_MS,
      "Twilio Verify check",
    );

    logger.info(
      `🔍 Verify check para ${normalizedPhone}: status=${check.status}, valid=${check.valid}`,
    );

    return {
      valid: check.status === "approved",
      status: check.status,
    };
  } catch (error: any) {
    logger.error(`❌ Erro ao verificar código para ${normalizedPhone}:`, {
      message: error.message,
      code: error.code,
    });
    // Se o erro é "resource not found", o código expirou ou nunca foi enviado
    if (error.code === 20404) {
      return { valid: false, status: "expired" };
    }
    throw error;
  }
};

// ============================================
// LEGACY: Twilio Messages API (para notificações)
// ============================================

/**
 * Envia SMS direto via Messages API (para notificações, NÃO para OTP)
 */
export const sendSMS = async (
  to: string,
  message: string,
): Promise<{ success: boolean; messageId?: string }> => {
  const normalizedTo = normalizePhone(to);

  if (MOCK_MODE) {
    logger.info(`[MOCK SMS] Para: ${normalizedTo}, Mensagem: ${message}`);
    return { success: true, messageId: "mock-" + Date.now() };
  }

  try {
    const client = getTwilioClient();
    const hasPhoneNumber = !!process.env.TWILIO_PHONE_NUMBER;

    if (!hasPhoneNumber) {
      throw new Error("TWILIO_PHONE_NUMBER não configurado para envio de SMS");
    }

    const result: any = await withTimeout<any>(
      client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: normalizedTo,
      }),
      DEFAULT_SMS_TIMEOUT_MS,
      "Twilio sendSMS",
    );

    logger.info(`✅ SMS enviado para ${normalizedTo}. SID: ${result.sid}`);
    return { success: true, messageId: result.sid };
  } catch (error: any) {
    logger.error(`❌ Erro ao enviar SMS para ${normalizedTo}:`, {
      message: error.message,
      code: error.code,
    });
    throw new Error(`Falha ao enviar SMS: ${error.message}`);
  }
};

/**
 * @deprecated Use sendVerifyOTP() em vez disso. Mantido para compatibilidade.
 * Envia código OTP via SMS (Messages API) - fallback se Verify não estiver configurado
 */
export const sendOTP = async (
  phone: string,
  otp: string,
  language?: string,
): Promise<void> => {
  // Se Verify está configurado, usar Verify
  if (process.env.TWILIO_VERIFY_SERVICE_SID) {
    const result = await sendVerifyOTP(phone, "sms");
    if (!result.success) {
      throw new Error("Falha ao enviar código de verificação via Verify");
    }
    return;
  }

  // Fallback: enviar via Messages API (legacy)
  const message =
    language === "PT" || language === "ES"
      ? `TechTrust: ${otp} é seu código de verificação. Válido por 10 minutos.`
      : `TechTrust: ${otp} is your verification code. Valid for 10 minutes.`;

  const result = await sendSMS(phone, message);
  if (!result.success) {
    throw new Error("Falha ao enviar código de verificação");
  }
};

/**
 * Envia notificação via SMS
 */
export const sendNotificationSMS = async (
  phone: string,
  message: string,
): Promise<void> => {
  await sendSMS(phone, message);
};
