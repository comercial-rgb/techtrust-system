import { logger } from "../src/config/logger";
/**
 * Script para limpar banco de PRODUÇÃO via API
 * Usa o endpoint admin para limpar remotamente
 * 
 * USO:
 * ADMIN_EMAIL=admin@email.com ADMIN_PASSWORD=senha npm run clean-production
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'https://techtrust-api.onrender.com/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@techtrust.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

async function cleanProductionDatabase() {
  logger.info('🔄 Limpando banco de dados de PRODUÇÃO...');
  logger.info(`📡 API: ${API_URL}`);
  logger.info(`👤 Admin: ${ADMIN_EMAIL}\n`);

  try {
    // 1. Fazer login como admin
    logger.info('1️⃣  Fazendo login como admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const adminToken = loginResponse.data.data.token || loginResponse.data.data.accessToken;
    logger.info('✅ Login realizado com sucesso!\n');

    // 2. Chamar endpoint de limpeza
    logger.info('2️⃣  Limpando banco de dados...');
    const cleanResponse = await axios.post(
      `${API_URL}/admin/database/clean`,
      {},
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    logger.info('✅ Banco de dados limpo com sucesso!');
    logger.info(`📊 ${cleanResponse.data.data.usersDeleted} usuários deletados\n`);
    logger.info('✨ Agora você pode criar novos usuários no app mobile!\n');

  } catch (error: any) {
    logger.error('❌ Erro ao limpar banco:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 401 || error.response?.status === 404) {
      logger.error('\n⚠️  SOLUÇÕES POSSÍVEIS:\n');
      logger.error('1️⃣  Verifique se o admin existe no banco de produção');
      logger.error('2️⃣  Rode o seed em produção para criar o admin:');
      logger.error('    npx prisma db seed');
      logger.error('\n3️⃣  Ou use credenciais customizadas:');
      logger.error('    ADMIN_EMAIL=seu@email.com ADMIN_PASSWORD=senha npm run clean-production\n');
      logger.error('4️⃣  ALTERNATIVA: Use e-mail/telefone DIFERENTES no app');
      logger.error('    - Não use: admin@techtrust.com ou +14075550000');
      logger.error('    - Use: seu.email@teste.com e +5511999998888\n');
    }
    
    process.exit(1);
  }
}

cleanProductionDatabase();
