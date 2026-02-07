/**
 * Lista usuários do app (CUSTOMER e PROVIDER)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAppUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['CLIENT', 'PROVIDER'] }
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        createdAt: true,
        status: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║         USUÁRIOS DO APP MOBILE (CLIENTS & PROVIDERS)    ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    if (users.length === 0) {
      console.log('❌ Nenhum usuário encontrado.\n');
      return;
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.role === 'CLIENT' ? '👤 CLIENT' : '🔧 PROVIDER'}`);
      console.log(`   Nome: ${user.fullName || 'N/A'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Telefone: ${user.phone || 'N/A'}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Criado em: ${new Date(user.createdAt).toLocaleString('pt-BR')}`);
      console.log('');
    });

    console.log(`\n📊 Total: ${users.length} usuários\n`);
    console.log('⚠️  NOTA IMPORTANTE:');
    console.log('   As senhas estão criptografadas no banco (bcrypt hash).');
    console.log('   Para login, use a senha que foi definida ao criar cada usuário.\n');
    
    // Contar por tipo
    const clients = users.filter(u => u.role === 'CLIENT').length;
    const providers = users.filter(u => u.role === 'PROVIDER').length;
    
    console.log('📈 Resumo:');
    console.log(`   - Clients: ${clients}`);
    console.log(`   - Providers: ${providers}\n`);

  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAppUsers();
