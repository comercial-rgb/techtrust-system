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

const LOGO_URL = "https://provider.techtrustautosolutions.com/logo-white.png";
const WEBSITE_URL = "https://techtrustautosolutions.com";
const SUPPORT_EMAIL = "contact@techtrustautosolutions.com";

let resendClient: Resend | null = null;

function getClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

// ── shared template shell ─────────────────────────────────────────────────────

function baseTemplate(body: string, footerLang: "EN" | "PT" | "ES" = "EN"): string {
  const footerText = {
    EN: { privacy: "Privacy Policy", terms: "Terms of Use", support: "Support", rights: "All rights reserved." },
    PT: { privacy: "Política de Privacidade", terms: "Termos de Uso", support: "Suporte", rights: "Todos os direitos reservados." },
    ES: { privacy: "Política de Privacidad", terms: "Términos de Uso", support: "Soporte", rights: "Todos los derechos reservados." },
  }[footerLang];

  return `
<!DOCTYPE html>
<html lang="${footerLang.toLowerCase()}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f4f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.10);">

        <!-- ── Header ── -->
        <tr><td style="background:#1e3a6e;padding:28px 40px;text-align:center;">
          <img src="${LOGO_URL}"
               alt="TechTrust Auto Solutions"
               width="160"
               style="display:block;margin:0 auto 8px;max-width:160px;height:auto;"
               onerror="this.style.display='none'"/>
          <span style="display:block;color:#93c5fd;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-top:2px;">Auto Solutions</span>
        </td></tr>

        <!-- ── Body ── -->
        <tr><td style="padding:36px 40px;">
          ${body}
        </td></tr>

        <!-- ── Divider ── -->
        <tr><td style="padding:0 40px;">
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"/>
        </td></tr>

        <!-- ── Footer ── -->
        <tr><td style="background:#f9fafb;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#374151;font-weight:600;">TechTrust Auto Solutions</p>
          <p style="margin:0 0 12px;font-size:12px;color:#6b7280;">
            <a href="${WEBSITE_URL}" style="color:#2B5EA7;text-decoration:none;">${WEBSITE_URL.replace("https://", "")}</a>
            &nbsp;·&nbsp;
            <a href="mailto:${SUPPORT_EMAIL}" style="color:#2B5EA7;text-decoration:none;">${footerText.support}: ${SUPPORT_EMAIL}</a>
          </p>
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            © ${new Date().getFullYear()} TechTrust Auto Solutions — ${footerText.rights}
            &nbsp;·&nbsp;
            <a href="${WEBSITE_URL}/privacy" style="color:#9ca3af;text-decoration:none;">${footerText.privacy}</a>
            &nbsp;·&nbsp;
            <a href="${WEBSITE_URL}/terms" style="color:#9ca3af;text-decoration:none;">${footerText.terms}</a>
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
  const lang = (["EN", "PT", "ES"].includes(language?.toUpperCase()) ? language.toUpperCase() : "EN") as "EN" | "PT" | "ES";

  const content = {
    EN: {
      subject: "Your TechTrust Verification Code",
      title: "Account Verification",
      intro: "Use the code below to verify your account. It expires in 30 minutes.",
      label: "Your verification code",
      note: "If you didn't request this code, you can safely ignore this email.",
      security: "For your security, never share this code with anyone.",
    },
    PT: {
      subject: "Seu Código de Verificação TechTrust",
      title: "Verificação de Conta",
      intro: "Use o código abaixo para verificar sua conta. Ele expira em 30 minutos.",
      label: "Seu código de verificação",
      note: "Se você não solicitou este código, pode ignorar este e-mail com segurança.",
      security: "Por sua segurança, nunca compartilhe este código com ninguém.",
    },
    ES: {
      subject: "Tu Código de Verificación TechTrust",
      title: "Verificación de Cuenta",
      intro: "Usa el código a continuación para verificar tu cuenta. Expira en 30 minutos.",
      label: "Tu código de verificación",
      note: "Si no solicitaste este código, puedes ignorar este correo.",
      security: "Por tu seguridad, nunca compartas este código con nadie.",
    },
  }[lang];

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">${content.title}</h2>
    <p style="color:#4b5563;font-size:15px;line-height:24px;margin:0 0 28px;">${content.intro}</p>

    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">${content.label}</p>
    <div style="text-align:center;margin:0 0 28px;">
      <span style="display:inline-block;background:#1e3a6e;color:#fff;font-size:38px;font-weight:800;letter-spacing:14px;padding:18px 40px;border-radius:12px;font-family:monospace;">${otp}</span>
    </div>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 18px;margin:0 0 20px;">
      <p style="margin:0;font-size:13px;color:#1e40af;">
        🔒 ${content.security}
      </p>
    </div>

    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">${content.note}</p>
  `, lang);

  await sendEmail({ to: email, subject: content.subject, html });
};

// ── password reset ────────────────────────────────────────────────────────────

export const sendPasswordResetEmail = async (
  email: string,
  resetCode: string,
  language = "EN",
): Promise<void> => {
  const lang = (["EN", "PT", "ES"].includes(language?.toUpperCase()) ? language.toUpperCase() : "EN") as "EN" | "PT" | "ES";

  const content = {
    EN: {
      subject: "Reset Your TechTrust Password",
      title: "Password Reset",
      intro: "We received a request to reset your password. Use the code below — it's valid for 1 hour.",
      label: "Your reset code",
      note: "If you didn't request a password reset, please ignore this email. Your account remains secure.",
    },
    PT: {
      subject: "Redefinir Senha TechTrust",
      title: "Redefinição de Senha",
      intro: "Recebemos uma solicitação para redefinir sua senha. Use o código abaixo — válido por 1 hora.",
      label: "Seu código de redefinição",
      note: "Se você não solicitou a redefinição de senha, ignore este e-mail. Sua conta permanece segura.",
    },
    ES: {
      subject: "Restablecer Contraseña TechTrust",
      title: "Restablecimiento de Contraseña",
      intro: "Recibimos una solicitud para restablecer tu contraseña. Usa el código a continuación — válido por 1 hora.",
      label: "Tu código de restablecimiento",
      note: "Si no solicitaste restablecer tu contraseña, ignora este correo. Tu cuenta sigue siendo segura.",
    },
  }[lang];

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">${content.title}</h2>
    <p style="color:#4b5563;font-size:15px;line-height:24px;margin:0 0 28px;">${content.intro}</p>

    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">${content.label}</p>
    <div style="text-align:center;margin:0 0 28px;">
      <span style="display:inline-block;background:#dc2626;color:#fff;font-size:38px;font-weight:800;letter-spacing:14px;padding:18px 40px;border-radius:12px;font-family:monospace;">${resetCode}</span>
    </div>

    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">${content.note}</p>
  `, lang);

  await sendEmail({ to: email, subject: content.subject, html });
};

// ── welcome ───────────────────────────────────────────────────────────────────

export const sendWelcomeEmail = async (
  email: string,
  fullName: string,
  language = "EN",
): Promise<void> => {
  const lang = (["EN", "PT", "ES"].includes(language?.toUpperCase()) ? language.toUpperCase() : "EN") as "EN" | "PT" | "ES";

  const content = {
    EN: {
      subject: "Welcome to TechTrust Auto Solutions!",
      title: "Welcome aboard!",
      body: `Hi <strong>${fullName}</strong>, your TechTrust account is ready. Request automotive services, track your vehicles, and manage everything in one place.`,
      cta: "Open TechTrust",
      features: [
        "🔧 Request repairs & maintenance",
        "📍 Track service providers near you",
        "💳 Secure & transparent payments",
      ],
    },
    PT: {
      subject: "Bem-vindo ao TechTrust Auto Solutions!",
      title: "Seja bem-vindo!",
      body: `Olá <strong>${fullName}</strong>, sua conta TechTrust está pronta. Solicite serviços automotivos, acompanhe seus veículos e gerencie tudo em um só lugar.`,
      cta: "Abrir TechTrust",
      features: [
        "🔧 Solicite reparos e manutenções",
        "📍 Encontre prestadores próximos a você",
        "💳 Pagamentos seguros e transparentes",
      ],
    },
    ES: {
      subject: "¡Bienvenido a TechTrust Auto Solutions!",
      title: "¡Bienvenido a bordo!",
      body: `Hola <strong>${fullName}</strong>, tu cuenta TechTrust está lista. Solicita servicios automotrices, rastrea tus vehículos y gestiona todo en un solo lugar.`,
      cta: "Abrir TechTrust",
      features: [
        "🔧 Solicita reparaciones y mantenimiento",
        "📍 Encuentra proveedores cerca de ti",
        "💳 Pagos seguros y transparentes",
      ],
    },
  }[lang];

  const featureList = content.features.map(f =>
    `<li style="margin:0 0 8px;font-size:14px;color:#374151;">${f}</li>`
  ).join("");

  const html = baseTemplate(`
    <h2 style="margin:0 0 12px;color:#111827;font-size:24px;font-weight:700;">${content.title}</h2>
    <p style="color:#4b5563;font-size:15px;line-height:24px;margin:0 0 24px;">${content.body}</p>

    <ul style="margin:0 0 28px;padding:0 0 0 4px;list-style:none;">
      ${featureList}
    </ul>

    <div style="text-align:center;">
      <a href="${WEBSITE_URL}" style="display:inline-block;background:#1e3a6e;color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;">${content.cta}</a>
    </div>
  `, lang);

  await sendEmail({ to: email, subject: content.subject, html }).catch((err) => {
    logger.error("Failed to send welcome email:", err);
  });
};

// ── provider approved ─────────────────────────────────────────────────────────

export const sendProviderApprovedEmail = async (
  email: string,
  businessName: string,
  language = "EN",
): Promise<void> => {
  const lang = (["EN", "PT", "ES"].includes(language?.toUpperCase()) ? language.toUpperCase() : "EN") as "EN" | "PT" | "ES";

  const content = {
    EN: {
      subject: "Your TechTrust provider account is approved!",
      title: "Account Approved!",
      congrats: `Congratulations, <strong>${businessName}</strong>! Your TechTrust provider profile has been reviewed and approved.`,
      detail: "You can now receive service requests from customers in your area.",
      tip: "Make sure your services and coverage area are up to date so customers can find you.",
      cta: "Go to Dashboard",
    },
    PT: {
      subject: "Sua conta de prestador TechTrust foi aprovada!",
      title: "Conta Aprovada!",
      congrats: `Parabéns, <strong>${businessName}</strong>! Seu perfil de prestador TechTrust foi analisado e aprovado.`,
      detail: "Você já pode receber solicitações de serviço de clientes na sua área.",
      tip: "Mantenha seus serviços e área de cobertura atualizados para que os clientes possam encontrá-lo.",
      cta: "Ir para o Painel",
    },
    ES: {
      subject: "¡Tu cuenta de proveedor TechTrust fue aprobada!",
      title: "¡Cuenta Aprobada!",
      congrats: `¡Felicidades, <strong>${businessName}</strong>! Tu perfil de proveedor TechTrust ha sido revisado y aprobado.`,
      detail: "Ahora puedes recibir solicitudes de servicio de clientes en tu área.",
      tip: "Mantén tus servicios y área de cobertura actualizados para que los clientes puedan encontrarte.",
      cta: "Ir al Panel",
    },
  }[lang];

  const html = baseTemplate(`
    <div style="text-align:center;margin:0 0 24px;">
      <span style="display:inline-block;background:#dcfce7;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">✅</span>
    </div>
    <h2 style="margin:0 0 12px;color:#15803d;font-size:24px;font-weight:700;text-align:center;">${content.title}</h2>
    <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 8px;">${content.congrats}</p>
    <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 20px;">${content.detail}</p>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px 20px;margin:0 0 28px;">
      <p style="margin:0;font-size:14px;color:#166534;">
        🔔 ${content.tip}
      </p>
    </div>

    <div style="text-align:center;">
      <a href="${WEBSITE_URL}/dashboard" style="display:inline-block;background:#1e3a6e;color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;">${content.cta}</a>
    </div>
  `, lang);

  await sendEmail({
    to: email,
    subject: content.subject,
    html,
  }).catch((err) => logger.error("Failed to send provider approved email:", err));
};
