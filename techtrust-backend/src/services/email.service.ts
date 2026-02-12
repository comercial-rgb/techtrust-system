/**
 * ============================================
 * EMAIL SERVICE
 * ============================================
 * Serviço para envio de emails via SMTP (Nodemailer)
 * Suporta modo MOCK para testes locais
 */

import nodemailer from "nodemailer";
import { logger } from "../config/logger";

const MOCK_MODE =
  process.env.MOCK_EMAIL === "true" ||
  (!process.env.SMTP_HOST && !process.env.SENDGRID_API_KEY);

// ============================================
// TRANSPORTER SETUP
// ============================================

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (MOCK_MODE) {
    // In mock mode, create a test transporter that logs to console
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return transporter;
  }

  // SendGrid SMTP (recommended for production)
  if (process.env.SENDGRID_API_KEY) {
    transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY,
      },
    });
    logger.info("Email service initialized with SendGrid SMTP");
    return transporter;
  }

  // Generic SMTP configuration
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  logger.info(`Email service initialized with SMTP: ${process.env.SMTP_HOST}`);
  return transporter;
}

const EMAIL_FROM =
  process.env.EMAIL_FROM || "TechTrust <noreply@techtrust.com>";

// ============================================
// SEND EMAIL
// ============================================

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (
  options: EmailOptions,
): Promise<{ success: boolean; messageId?: string }> => {
  // MOCK MODE
  if (MOCK_MODE) {
    logger.info(`[MOCK EMAIL] To: ${options.to}, Subject: ${options.subject}`);
    logger.info(`[MOCK EMAIL] HTML: ${options.html.substring(0, 200)}...`);
    return {
      success: true,
      messageId: "mock-email-" + Date.now(),
    };
  }

  // REAL MODE
  try {
    const transport = getTransporter();

    const result = await transport.sendMail({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });

    logger.info(`Email sent to ${options.to}. MessageId: ${result.messageId}`);
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: any) {
    logger.error(`Error sending email to ${options.to}:`, error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// ============================================
// OTP EMAIL
// ============================================

export const sendOTPEmail = async (
  email: string,
  otp: string,
  language: string = "EN",
): Promise<void> => {
  const subjects: Record<string, string> = {
    EN: "Your TechTrust Verification Code",
    PT: "Seu Código de Verificação TechTrust",
    ES: "Tu Código de Verificación TechTrust",
  };

  const messages: Record<string, string> = {
    EN: `Your verification code is: <strong>${otp}</strong>. Valid for 10 minutes.`,
    PT: `Seu código de verificação é: <strong>${otp}</strong>. Válido por 10 minutos.`,
    ES: `Tu código de verificación es: <strong>${otp}</strong>. Válido por 10 minutos.`,
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563EB; margin: 0;">TechTrust</h1>
        <p style="color: #6B7280; margin: 5px 0 0;">Auto Solutions</p>
      </div>
      <div style="background: #F9FAFB; border-radius: 12px; padding: 30px; text-align: center;">
        <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">
          ${messages[language] || messages.EN}
        </p>
        <div style="background: #2563EB; color: white; font-size: 32px; letter-spacing: 8px; padding: 15px 30px; border-radius: 8px; display: inline-block; font-weight: bold;">
          ${otp}
        </div>
        <p style="color: #9CA3AF; font-size: 13px; margin: 20px 0 0;">
          ${
            language === "PT"
              ? "Se você não solicitou este código, ignore este email."
              : language === "ES"
                ? "Si no solicitaste este código, ignora este correo."
                : "If you did not request this code, please ignore this email."
          }
        </p>
      </div>
      <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px;">
        © ${new Date().getFullYear()} TechTrust Auto Solutions
      </p>
    </div>
  `;

  const result = await sendEmail({
    to: email,
    subject: subjects[language] || subjects.EN,
    html,
  });

  if (!result.success) {
    throw new Error("Failed to send verification email");
  }
};

// ============================================
// PASSWORD RESET EMAIL
// ============================================

export const sendPasswordResetEmail = async (
  email: string,
  resetCode: string,
  language: string = "EN",
): Promise<void> => {
  const subjects: Record<string, string> = {
    EN: "Reset Your TechTrust Password",
    PT: "Redefinir Senha TechTrust",
    ES: "Restablecer Contraseña TechTrust",
  };

  const titles: Record<string, string> = {
    EN: "Password Reset",
    PT: "Redefinição de Senha",
    ES: "Restablecimiento de Contraseña",
  };

  const messages: Record<string, string> = {
    EN: "Use the code below to reset your password. This code is valid for 1 hour.",
    PT: "Use o código abaixo para redefinir sua senha. Este código é válido por 1 hora.",
    ES: "Usa el código a continuación para restablecer tu contraseña. Este código es válido por 1 hora.",
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563EB; margin: 0;">TechTrust</h1>
        <p style="color: #6B7280; margin: 5px 0 0;">Auto Solutions</p>
      </div>
      <div style="background: #F9FAFB; border-radius: 12px; padding: 30px; text-align: center;">
        <h2 style="color: #111827; margin: 0 0 10px;">${titles[language] || titles.EN}</h2>
        <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">
          ${messages[language] || messages.EN}
        </p>
        <div style="background: #DC2626; color: white; font-size: 32px; letter-spacing: 8px; padding: 15px 30px; border-radius: 8px; display: inline-block; font-weight: bold;">
          ${resetCode}
        </div>
        <p style="color: #9CA3AF; font-size: 13px; margin: 20px 0 0;">
          ${
            language === "PT"
              ? "Se você não solicitou a redefinição de senha, ignore este email."
              : language === "ES"
                ? "Si no solicitaste restablecer tu contraseña, ignora este correo."
                : "If you did not request a password reset, please ignore this email."
          }
        </p>
      </div>
      <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px;">
        © ${new Date().getFullYear()} TechTrust Auto Solutions
      </p>
    </div>
  `;

  const result = await sendEmail({
    to: email,
    subject: subjects[language] || subjects.EN,
    html,
  });

  if (!result.success) {
    throw new Error("Failed to send password reset email");
  }
};

// ============================================
// WELCOME EMAIL (after social login registration)
// ============================================

export const sendWelcomeEmail = async (
  email: string,
  fullName: string,
  language: string = "EN",
): Promise<void> => {
  const subjects: Record<string, string> = {
    EN: "Welcome to TechTrust!",
    PT: "Bem-vindo ao TechTrust!",
    ES: "¡Bienvenido a TechTrust!",
  };

  const messages: Record<string, string> = {
    EN: `Hi ${fullName}, welcome to TechTrust Auto Solutions! Your account has been created successfully.`,
    PT: `Olá ${fullName}, bem-vindo ao TechTrust Auto Solutions! Sua conta foi criada com sucesso.`,
    ES: `Hola ${fullName}, ¡bienvenido a TechTrust Auto Solutions! Tu cuenta ha sido creada exitosamente.`,
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563EB; margin: 0;">TechTrust</h1>
        <p style="color: #6B7280; margin: 5px 0 0;">Auto Solutions</p>
      </div>
      <div style="background: #F0F9FF; border-radius: 12px; padding: 30px; text-align: center;">
        <h2 style="color: #111827; margin: 0 0 15px;">🎉 ${subjects[language] || subjects.EN}</h2>
        <p style="color: #374151; font-size: 16px; margin: 0;">
          ${messages[language] || messages.EN}
        </p>
      </div>
      <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 20px;">
        © ${new Date().getFullYear()} TechTrust Auto Solutions
      </p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: subjects[language] || subjects.EN,
    html,
  }).catch((err) => {
    logger.error("Failed to send welcome email:", err);
    // Don't throw - welcome email is not critical
  });
};
