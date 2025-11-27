/**
 * ============================================
 * OTP UTILS
 * ============================================
 * Funções para gerar e validar códigos OTP
 */

/**
 * Gera código OTP de 6 dígitos
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Calcula tempo de expiração do OTP (10 minutos)
 */
export const getOTPExpiration = (): Date => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 10);
  return now;
};

/**
 * Verifica se OTP expirou
 */
export const isOTPExpired = (expiresAt: Date | null): boolean => {
  if (!expiresAt) return true;
  return new Date() > expiresAt;
};

/**
 * Valida formato do OTP
 */
export const validateOTPFormat = (otp: string): boolean => {
  return /^\d{6}$/.test(otp);
};
