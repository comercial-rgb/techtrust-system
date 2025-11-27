/**
 * ============================================
 * PASSWORD UTILS
 * ============================================
 * Funções para hash e verificação de senhas
 */

import bcrypt from 'bcrypt';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

/**
 * Cria hash da senha
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compara senha com hash
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Valida força da senha
 * Regras: mínimo 8 caracteres, 1 letra, 1 número
 */
export const validatePasswordStrength = (password: string): {
  valid: boolean;
  message?: string;
} => {
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Senha deve ter no mínimo 8 caracteres'
    };
  }

  if (!/[a-zA-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Senha deve conter pelo menos uma letra'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Senha deve conter pelo menos um número'
    };
  }

  return { valid: true };
};
