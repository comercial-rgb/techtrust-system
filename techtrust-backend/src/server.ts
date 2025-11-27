/**
 * ============================================
 * TECHTRUST AUTOSOLUTIONS - SERVER PRINCIPAL
 * ============================================
 * 
 * Ponto de entrada da aplicação backend
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

// Configurações
import { logger } from './config/logger';
// import { rateLimiter } from './middleware/rate-limiter'; // DESABILITADO PARA TESTES
import { errorHandler } from './middleware/error-handler';

// Rotas
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import vehicleRoutes from './routes/vehicle.routes';
import serviceRequestRoutes from './routes/service-request.routes';
import quoteRoutes from './routes/quote.routes';
import workOrderRoutes from './routes/work-order.routes';
import paymentRoutes from './routes/payment.routes';
import subscriptionRoutes from './routes/subscription.routes';
import reviewRoutes from './routes/review.routes';
import notificationRoutes from './routes/notification.routes';
import providerRoutes from './routes/provider.routes';
import chatRoutes from './routes/chat.routes';

// Carregar variáveis de ambiente
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = 'v1';
const httpServer = createServer(app);

// ============================================
// SOCKET.IO SETUP (para chat em tempo real)
// ============================================
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Disponibilizar io globalmente
app.set('io', io);

// Socket.io handlers
io.on('connection', (socket) => {
  logger.info(`Socket conectado: ${socket.id}`);
  
  // Join room específico do usuário
  socket.on('join', (userId: string) => {
    socket.join(`user:${userId}`);
    logger.debug(`Usuário ${userId} entrou na sala`);
  });
  
  // Enviar mensagem
  socket.on('send_message', async (data: {
    from: string;
    to: string;
    message: string;
    workOrderId?: string;
  }) => {
    io.to(`user:${data.to}`).emit('receive_message', data);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Socket desconectado: ${socket.id}`);
  });
});

// ============================================
// MIDDLEWARES
// ============================================

// Segurança
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compressão
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting - DESABILITADO PARA TESTES
// app.use(rateLimiter);

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
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
    const { prisma } = await import('./config/database');
    await prisma.$connect();
    logger.info('✅ Conectado ao PostgreSQL');
  } catch (error) {
    logger.error('❌ Erro ao conectar no PostgreSQL:', error);
    process.exit(1);
  }

  logger.info(`🚀 TechTrust API rodando em http://localhost:${PORT}`);
  logger.info(`📚 API version: ${API_VERSION}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('💬 Socket.IO: Ativo para chat em tempo real');
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});