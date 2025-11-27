/**
 * ============================================
 * SMS SERVICE
 * ============================================
 * Serviço para envio de SMS via Twilio
 * Suporta modo MOCK para testes locais
 */

import { logger } from '../config/logger';

const MOCK_MODE = process.env.MOCK_TWILIO === 'true';

/**
 * Envia SMS (real ou mock)
 */
export const sendSMS = async (
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string }> => {
  
  // MODO MOCK (para testes sem Twilio)
  if (MOCK_MODE) {
    logger.info(`[MOCK SMS] Para: ${to}, Mensagem: ${message}`);
    return {
      success: true,
      messageId: 'mock-' + Date.now(),
    };
  }

  // MODO REAL (Twilio)
  try {
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    logger.info(`SMS enviado com sucesso para ${to}. SID: ${result.sid}`);

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error: any) {
    logger.error(`Erro ao enviar SMS para ${to}:`, error);
    throw new Error(`Falha ao enviar SMS: ${error.message}`);
  }
};

/**
 * Envia código OTP via SMS
 */
export const sendOTP = async (phone: string, otp: string): Promise<void> => {
  const message = `Seu código de verificação TechTrust é: ${otp}. Válido por 10 minutos.`;
  
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
