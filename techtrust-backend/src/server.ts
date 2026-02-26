/**
 * ============================================
 * TECHTRUST AUTOSOLUTIONS - SERVER PRINCIPAL
 * ============================================
 *
 * Ponto de entrada da aplicação backend
 */

import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";

// Configurações
import { logger } from "./config/logger";
// import { rateLimiter } from './middleware/rate-limiter'; // DESABILITADO PARA TESTES
import { errorHandler } from "./middleware/error-handler";

// Rotas
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import vehicleRoutes from "./routes/vehicle.routes";
import serviceRequestRoutes from "./routes/service-request.routes";
import quoteRoutes from "./routes/quote.routes";
import workOrderRoutes from "./routes/work-order.routes";
import paymentRoutes from "./routes/payment.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import reviewRoutes from "./routes/review.routes";
import notificationRoutes from "./routes/notification.routes";
import providerRoutes from "./routes/provider.routes";
import chatRoutes from "./routes/chat.routes";
import adminRoutes from "./routes/admin.routes";
import contentRoutes from "./routes/content.routes";
import geocodingRoutes from "./routes/geocoding.routes";
import databaseRoutes from "./routes/database.routes";
import uploadRoutes from "./routes/upload.routes";
import paymentMethodsRoutes from "./routes/payment-methods.routes";
import webhookRoutes from "./routes/webhook.routes";
import connectRoutes from "./routes/connect.routes";
import serviceFlowRoutes from "./routes/service-flow.routes";
import supportRoutes from "./routes/support.routes";
import walletRoutes from "./routes/wallet.routes";
import tipRoutes from "./routes/tip.routes";
import appointmentRoutes from "./routes/appointment.routes";
import estimateShareRoutes from "./routes/estimate-share.routes";
import repairInvoiceRoutes from "./routes/repair-invoice.routes";
import complianceRoutes from "./routes/compliance.routes";
import technicianRoutes from "./routes/technician.routes";
import insuranceRoutes from "./routes/insurance.routes";
import verificationRoutes from "./routes/verification.routes";
import multiStateRoutes from "./routes/multi-state.routes";
import carWashRoutes from "./routes/car-wash.routes";
import partsStoreRoutes from "./routes/parts-store.routes";
import oePartsRoutes from "./routes/oe-parts.routes";

// Carregar variáveis de ambiente
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = "v1";
const httpServer = createServer(app);

// Render/Reverse proxy: trust X-Forwarded-* headers for correct client IP handling
if (
  process.env.TRUST_PROXY === "true" ||
  process.env.NODE_ENV === "production"
) {
  app.set("trust proxy", 1);
}

// ============================================
// SOCKET.IO SETUP (para chat em tempo real)
// ============================================
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Disponibilizar io globalmente
app.set("io", io);

// Socket.io handlers
io.on("connection", (socket) => {
  logger.info(`Socket conectado: ${socket.id}`);

  // Join room específico do usuário
  socket.on("join", (userId: string) => {
    socket.join(`user:${userId}`);
    logger.debug(`Usuário ${userId} entrou na sala`);
  });

  // Enviar mensagem (persists to DB)
  socket.on(
    "send_message",
    async (data: {
      from: string;
      to: string;
      message: string;
      workOrderId?: string;
      serviceRequestId?: string;
    }) => {
      try {
        const { prisma: db } = await import("./config/database");
        const sorted = [data.from, data.to].sort();
        const conversationId = data.serviceRequestId
          ? `${sorted[0]}_${sorted[1]}_${data.serviceRequestId}`
          : `${sorted[0]}_${sorted[1]}`;

        const saved = await db.chatMessage.create({
          data: {
            fromUserId: data.from,
            toUserId: data.to,
            message: data.message,
            workOrderId: data.workOrderId || null,
            serviceRequestId: data.serviceRequestId || null,
            conversationId,
          },
        });
        io.to(`user:${data.to}`).emit("receive_message", {
          ...saved,
          conversationId,
        });
      } catch (err) {
        logger.error("Socket send_message error:", err);
        io.to(`user:${data.to}`).emit("receive_message", data);
      }
    },
  );

  socket.on("disconnect", () => {
    logger.info(`Socket desconectado: ${socket.id}`);
  });
});

// ============================================
// MIDDLEWARES
// ============================================

// Segurança
app.use(helmet());

// CORS - Dynamic origin handling
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [
  "http://localhost:3000",
];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow any Vercel deployment
      if (origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }

      // Block others
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// ============================================
// STRIPE WEBHOOK - Raw body (ANTES do json parser)
// ============================================
// O Stripe precisa do raw body para verificar assinatura do webhook
app.use(
  `/api/${API_VERSION}/webhooks/stripe`,
  express.raw({ type: "application/json" }),
);

// Body parser (para todas as outras rotas)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use("/uploads", express.static("uploads"));

// Compressão
app.use(compression());

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate limiting - DESABILITADO PARA TESTES
// app.use(rateLimiter);

// ============================================
// HEALTH CHECK
// ============================================
app.get("/health", (_req, res) => {
  const cloudinaryConfigured = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== "sua_cloud_name"
  );

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cloudinary: {
      configured: cloudinaryConfigured,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || "not set",
    },
    environment: process.env.NODE_ENV || "development",
  });
});

// ============================================
// PUBLIC CONFIG (Stripe publishable key, etc.)
// ============================================
app.get(`/api/${API_VERSION}/config/stripe`, (_req, res) => {
  res.json({
    success: true,
    data: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
      merchantIdentifier: "merchant.com.techtrustautosolutions",
    },
  });
});

// ============================================
// API ROUTES
// ============================================
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/vehicles`, vehicleRoutes);
app.use(`/api/${API_VERSION}/service-requests`, serviceRequestRoutes);
app.use(`/api/${API_VERSION}/quotes`, quoteRoutes);
app.use(`/api/${API_VERSION}/work-orders`, workOrderRoutes);
app.use(`/api/${API_VERSION}/payments`, paymentRoutes);
app.use(`/api/${API_VERSION}/subscriptions`, subscriptionRoutes);
app.use(`/api/${API_VERSION}/reviews`, reviewRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/providers`, providerRoutes);
app.use(`/api/${API_VERSION}/chat`, chatRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/content`, contentRoutes); // Rotas públicas de conteúdo
app.use(`/api/${API_VERSION}/geocoding`, geocodingRoutes); // Rotas públicas de geocoding
app.use(`/api/${API_VERSION}/admin/database`, databaseRoutes); // Rotas admin de database
app.use(`/api/${API_VERSION}/upload`, uploadRoutes); // Rotas de upload de imagens
app.use(`/api/${API_VERSION}/payment-methods`, paymentMethodsRoutes); // Métodos de pagamento do usuário
app.use(`/api/${API_VERSION}/connect`, connectRoutes); // Stripe Connect (providers)
app.use(`/api/${API_VERSION}/webhooks`, webhookRoutes); // Stripe Webhooks
app.use(`/api/${API_VERSION}/service-flow`, serviceFlowRoutes); // Fluxo completo de pagamento
app.use(`/api/${API_VERSION}/support`, supportRoutes); // Support tickets
app.use(`/api/${API_VERSION}/wallet`, walletRoutes); // Wallet balance & transactions
app.use(`/api/${API_VERSION}/tips`, tipRoutes); // Tips/gratuity system
app.use(`/api/${API_VERSION}/appointments`, appointmentRoutes); // Diagnostic visit scheduling
app.use(`/api/${API_VERSION}/estimate-shares`, estimateShareRoutes); // Share estimates for competing quotes
app.use(`/api/${API_VERSION}/repair-invoices`, repairInvoiceRoutes); // FDACS Repair Invoices
app.use(`/api/${API_VERSION}/compliance`, complianceRoutes); // Provider compliance (FDACS, BTR, EPA)
app.use(`/api/${API_VERSION}/technicians`, technicianRoutes); // Technician management
app.use(`/api/${API_VERSION}/insurance`, insuranceRoutes); // Insurance policies
app.use(`/api/${API_VERSION}/verification`, verificationRoutes); // Verification & risk acceptance
app.use(`/api/${API_VERSION}/multi-state`, multiStateRoutes); // Multi-state compliance management
app.use(`/api/${API_VERSION}/car-wash`, carWashRoutes); // Car Wash discovery & management
app.use(`/api/${API_VERSION}/parts-store`, partsStoreRoutes); // Auto Parts Store discovery & management
app.use(`/api/${API_VERSION}/oe-parts`, oePartsRoutes); // OE Parts lookup via 17vin API

// ============================================
// ERROR HANDLER (deve ser o último middleware)
// ============================================
app.use(errorHandler);

// ============================================
// INICIAR SERVIDOR
// ============================================
httpServer.listen(PORT, async () => {
  // Testar conexão com banco
  try {
    const { prisma } = await import("./config/database");
    await prisma.$connect();
    logger.info("✅ Conectado ao PostgreSQL");
  } catch (error) {
    logger.error("❌ Erro ao conectar no PostgreSQL:", error);
    process.exit(1);
  }

  // Start compliance expiration checker
  try {
    const { scheduleExpirationCheck } =
      await import("./services/expiration-checker");
    scheduleExpirationCheck();
    logger.info("🔄 Compliance expiration checker: Ativo");
  } catch (error) {
    logger.warn("⚠️ Expiration checker failed to start:", error);
  }

  // Start quote & estimate share expiration checker (BUG 4 FIX)
  try {
    const { scheduleQuoteExpirationCheck } =
      await import("./services/quote-expiration.service");
    scheduleQuoteExpirationCheck();
    logger.info("🔄 Quote expiration checker: Ativo (every 1h)");
  } catch (error) {
    logger.warn("⚠️ Quote expiration checker failed to start:", error);
  }

  logger.info(`🚀 TechTrust API rodando em http://localhost:${PORT}`);
  logger.info(`📚 API version: ${API_VERSION}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info("💬 Socket.IO: Ativo para chat em tempo real");
});

// Tratamento de erros não capturados
process.on("unhandledRejection", (reason: Error) => {
  logger.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});
