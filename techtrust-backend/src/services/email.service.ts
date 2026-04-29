/**
 * ============================================
 * EMAIL SERVICE — Resend
 * ============================================
 */

import { Resend } from "resend";
import { logger } from "../config/logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "TechTrust <noreply@techtrustautosolutions.com>";
const MOCK_MODE = !RESEND_API_KEY || process.env.MOCK_EMAIL === "true";

let resendClient: Resend | null = null;

function getClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

// ── shared template shell ─────────────────────────────────────────────────────

function baseTemplate(body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr><td style="background:#2B5EA7;padding:28px 40px;text-align:center;">
          <span style="color:#fff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">TechTrust</span>
          <span style="display:block;color:#93c5fd;font-size:13px;margin-top:4px;">Auto Solutions</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            © ${new Date().getFullYear()} TechTrust Auto Solutions &nbsp;·&nbsp;
            <a href="https://techtrust.app/privacy" style="color:#6b7280;text-decoration:none;">Privacy Policy</a> &nbsp;·&nbsp;
            <a href="https://techtrust.app/terms" style="color:#6b7280;text-decoration:none;">Terms of Use</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── core send ─────────────────────────────────────────────────────────────────

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (
  options: EmailOptions,
): Promise<{ success: boolean; messageId?: string }> => {
  if (MOCK_MODE) {
    logger.info(`[MOCK EMAIL] To: ${options.to} | Subject: ${options.subject}`);
    return { success: true, messageId: "mock-" + Date.now() };
  }

  try {
    const { data, error } = await getClient().emails.send({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });

    if (error) {
      logger.error(`Resend error to ${options.to}:`, error);
      throw new Error(error.message);
    }

    logger.info(`Email sent to ${options.to}. ID: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    logger.error(`Failed to send email to ${options.to}:`, err);
    throw new Error(`Failed to send email: ${err.message}`);
  }
};

// ── OTP verification ──────────────────────────────────────────────────────────

export const sendOTPEmail = async (
  email: string,
  otp: string,
  language = "EN",
): Promise<void> => {
  const content = {
    EN: { subject: "Your TechTrust Verification Code", intro: "Enter the code below to verify your account.", note: "This code expires in 10 minutes. If you didn't request it, ignore this email." },
    PT: { subject: "Seu Código de Verificação TechTrust", intro: "Digite o código abaixo para verificar sua conta.", note: "Este código expira em 10 minutos. Se não foi você, ignore este email." },
    ES: { subject: "Tu Código de Verificación TechTrust", intro: "Ingresa el código a continuación para verificar tu cuenta.", note: "Este código expira en 10 minutos. Si no lo solicitaste, ignora este correo." },
  };
  const c = content[language as keyof typeof content] || content.EN;

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Account Verification</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 28px;">${c.intro}</p>
    <div style="text-align:center;margin:0 0 28px;">
      <span style="display:inline-block;background:#2B5EA7;color:#fff;font-size:36px;font-weight:800;letter-spacing:12px;padding:18px 36px;border-radius:12px;">${otp}</span>
    </div>
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">${c.note}</p>
  `);

  await sendEmail({ to: email, subject: c.subject, html });
};

// ── password reset ────────────────────────────────────────────────────────────

export const sendPasswordResetEmail = async (
  email: string,
  resetCode: string,
  language = "EN",
): Promise<void> => {
  const content = {
    EN: { subject: "Reset Your TechTrust Password", title: "Password Reset", intro: "Use the code below to reset your password. Valid for 1 hour.", note: "If you didn't request this, ignore this email." },
    PT: { subject: "Redefinir Senha TechTrust", title: "Redefinição de Senha", intro: "Use o código abaixo para redefinir sua senha. Válido por 1 hora.", note: "Se não foi você, ignore este email." },
    ES: { subject: "Restablecer Contraseña TechTrust", title: "Restablecimiento", intro: "Usa el código para restablecer tu contraseña. Válido por 1 hora.", note: "Si no lo solicitaste, ignora este correo." },
  };
  const c = content[language as keyof typeof content] || content.EN;

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">${c.title}</h2>
    <p style="color:#6b7280;font-size:15px;margin:0 0 28px;">${c.intro}</p>
    <div style="text-align:center;margin:0 0 28px;">
      <span style="display:inline-block;background:#dc2626;color:#fff;font-size:36px;font-weight:800;letter-spacing:12px;padding:18px 36px;border-radius:12px;">${resetCode}</span>
    </div>
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">${c.note}</p>
  `);

  await sendEmail({ to: email, subject: c.subject, html });
};

// ── welcome ───────────────────────────────────────────────────────────────────

export const sendWelcomeEmail = async (
  email: string,
  fullName: string,
  language = "EN",
): Promise<void> => {
  const content = {
    EN: { subject: "Welcome to TechTrust!", body: `Hi <strong>${fullName}</strong>, welcome to TechTrust Auto Solutions! Your account is ready. Request services, track your vehicles, and manage everything in one place.` },
    PT: { subject: "Bem-vindo ao TechTrust!", body: `Olá <strong>${fullName}</strong>, bem-vindo ao TechTrust Auto Solutions! Sua conta está pronta. Solicite serviços, acompanhe seus veículos e gerencie tudo em um só lugar.` },
    ES: { subject: "¡Bienvenido a TechTrust!", body: `Hola <strong>${fullName}</strong>, ¡bienvenido a TechTrust Auto Solutions! Tu cuenta está lista. Solicita servicios, rastrea tus vehículos y gestiona todo en un solo lugar.` },
  };
  const c = content[language as keyof typeof content] || content.EN;

  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#111827;font-size:22px;">🎉 ${c.subject}</h2>
    <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 24px;">${c.body}</p>
    <div style="text-align:center;">
      <a href="https://techtrust.app" style="display:inline-block;background:#2B5EA7;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">Open TechTrust</a>
    </div>
  `);

  await sendEmail({ to: email, subject: c.subject, html }).catch((err) => {
    logger.error("Failed to send welcome email:", err);
  });
};

// ── provider approved ─────────────────────────────────────────────────────────

export const sendProviderApprovedEmail = async (
  email: string,
  businessName: string,
): Promise<void> => {
  const html = baseTemplate(`
    <h2 style="margin:0 0 12px;color:#15803d;font-size:22px;">✅ Your provider account is approved!</h2>
    <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 20px;">
      Congratulations, <strong>${businessName}</strong>! Your TechTrust provider profile has been reviewed and approved.
      You can now receive service requests from customers in your area.
    </p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;font-size:14px;color:#166534;">
        🔔 Make sure your services and coverage area are up to date in the app so customers can find you.
      </p>
    </div>
    <div style="text-align:center;">
      <a href="https://techtrust.app" style="display:inline-block;background:#2B5EA7;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">Go to Dashboard</a>
    </div>
  `);

  await sendEmail({
    to: email,
    subject: "Your TechTrust provider account is approved!",
    html,
  }).catch((err) => logger.error("Failed to send provider approved email:", err));
};
