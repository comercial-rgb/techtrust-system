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
  console.log('🔄 Limpando banco de dados de PRODUÇÃO...');
  console.log(`📡 API: ${API_URL}`);
  console.log(`👤 Admin: ${ADMIN_EMAIL}\n`);

  try {
    // 1. Fazer login como admin
    console.log('1️⃣  Fazendo login como admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const adminToken = loginResponse.data.data.token || loginResponse.data.data.accessToken;
    console.log('✅ Login realizado com sucesso!\n');

    // 2. Chamar endpoint de limpeza
    console.log('2️⃣  Limpando banco de dados...');
    const cleanResponse = await axios.post(
      `${API_URL}/admin/database/clean`,
      {},
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    console.log('✅ Banco de dados limpo com sucesso!');
    console.log(`📊 ${cleanResponse.data.data.usersDeleted} usuários deletados\n`);
    console.log('✨ Agora você pode criar novos usuários no app mobile!\n');

  } catch (error: any) {
    console.error('❌ Erro ao limpar banco:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 401 || error.response?.status === 404) {
      console.error('\n⚠️  SOLUÇÕES POSSÍVEIS:\n');
      console.error('1️⃣  Verifique se o admin existe no banco de produção');
      console.error('2️⃣  Rode o seed em produção para criar o admin:');
      console.error('    npx prisma db seed');
      console.error('\n3️⃣  Ou use credenciais customizadas:');
      console.error('    ADMIN_EMAIL=seu@email.com ADMIN_PASSWORD=senha npm run clean-production\n');
      console.error('4️⃣  ALTERNATIVA: Use e-mail/telefone DIFERENTES no app');
      console.error('    - Não use: admin@techtrust.com ou +14075550000');
      console.error('    - Use: seu.email@teste.com e +5511999998888\n');
    }
    
    process.exit(1);
  }
}

cleanProductionDatabase();
