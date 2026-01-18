/**
 * Script para verificar usuários no banco
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        phoneVerified: true,
        createdAt: true,
      },
    });

    console.log(`\n📊 Total de usuários: ${allUsers.length}\n`);

    if (allUsers.length > 0) {
      console.log('Lista de usuários:');
      console.log('─'.repeat(100));
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Telefone: ${user.phone}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Verificado: ${user.phoneVerified ? 'Sim' : 'Não'}`);
        console.log(`   Criado em: ${user.createdAt.toLocaleString('pt-BR')}`);
        console.log('─'.repeat(100));
      });
    } else {
      console.log('✅ Nenhum usuário encontrado no banco!');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
