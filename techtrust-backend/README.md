# 🚀 TechTrust AutoSolutions - Backend

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Instalação](#instalação)
3. [Configuração](#configuração)
4. [Executar o Projeto](#executar-o-projeto)
5. [Estrutura do Projeto](#estrutura-do-projeto)
6. [Scripts Disponíveis](#scripts-disponíveis)
7. [Rodar Testes](#rodar-testes)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Pré-requisitos

Certifique-se de ter seguido o guia `05_SETUP_WINDOWS.md` e ter instalado:

```
✅ Node.js 18+ e NPM
✅ PostgreSQL 15+
✅ Git
✅ Visual Studio Code
```

Verifique as instalações:
```bash
node --version    # Deve mostrar v18.x ou v20.x
npm --version     # Deve mostrar v9.x ou v10.x
psql --version    # Deve mostrar PostgreSQL 15.x
```

---

## 📦 Instalação

### Passo 1: Navegar para a pasta do projeto

```bash
cd C:\Projetos\TechTrust
```

### Passo 2: Clonar ou copiar o código do backend

Se você recebeu um arquivo ZIP:
```bash
# Extrair o ZIP na pasta C:\Projetos\TechTrust\techtrust-backend
```

Se você tem um repositório Git:
```bash
git clone https://github.com/seu-repo/techtrust-backend.git
cd techtrust-backend
```

### Passo 3: Instalar dependências

```bash
npm install
```

**⏱️ Tempo estimado:** 3-5 minutos

**Se der erro:**
```bash
# Limpar cache e tentar novamente
npm cache clean --force
npm install
```

---

## ⚙️ Configuração

### Passo 1: Criar arquivo `.env`

Copie o arquivo de exemplo:

```bash
copy .env.example .env
```

### Passo 2: Editar `.env` com suas configurações

Abra o arquivo `.env` no VS Code:

```bash
code .env
```

**MÍNIMO NECESSÁRIO PARA COMEÇAR:**

```env
# Database
DATABASE_URL="postgresql://techtrust_user:techtrust123@localhost:5432/techtrust_dev"

# JWT (use uma string aleatória)
JWT_SECRET=sua-chave-super-secreta-minimo-32-caracteres-aqui-12345
JWT_REFRESH_SECRET=sua-chave-refresh-diferente-da-outra-abcdef67890

# Server
NODE_ENV=development
PORT=3000

# Comissões (suas regras definidas)
COMMISSION_PERCENTAGE=15
COMMISSION_SUBSCRIPTION_PRICE=39.99
COMMISSION_SUBSCRIPTION_PERCENTAGE=5

# Cancelamentos
CANCELLATION_FEE_BEFORE_24H=10
CANCELLATION_FEE_WITHIN_24H=25

# Para testes locais (desativa serviços externos)
MOCK_TWILIO=true
MOCK_STRIPE=true
SKIP_EMAIL_VERIFICATION=true
```

**⚠️ IMPORTANTE:**
- As chaves JWT devem ser strings aleatórias longas
- Para gerar uma chave segura, rode: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

### Passo 3: Configurar Database

Abra o PowerShell e conecte ao PostgreSQL:

```bash
psql -U postgres
```

Dentro do psql, execute:

```sql
-- Já criamos isso no setup, mas vamos confirmar
\c techtrust_dev

-- Instalar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Sair
\q
```

---

### Passo 4: Inicializar Prisma

```bash
# Gerar cliente Prisma
npm run prisma:generate

# Criar tabelas no banco
npm run prisma:migrate

# (Opcionalmente) Popular com dados de exemplo
npm run seed
```

**⏱️ Tempo estimado:** 1-2 minutos

**O que acontece:**
1. `prisma:generate` - Cria o cliente TypeScript do Prisma
2. `prisma:migrate` - Cria todas as tabelas no PostgreSQL
3. `seed` - Insere dados de teste (usuários, veículos, etc)

**Se der erro no migrate:**
```bash
# Reset completo do banco (CUIDADO: apaga tudo)
npx prisma migrate reset

# Ou criar migration manualmente
npx prisma migrate dev --name init
```

---

## 🏃 Executar o Projeto

### Modo Desenvolvimento (com auto-reload)

```bash
npm run dev
```

**Você deve ver:**
```
🚀 TechTrust API rodando em http://localhost:3000
📚 API version: v1
🌍 Environment: development
💬 Socket.IO: Ativo para chat em tempo real
```

**✅ Sucesso!** O servidor está rodando!

### Testar se está funcionando

Abra outra janela do PowerShell e teste:

```bash
curl http://localhost:3000/health
```

**Resposta esperada:**
```json
{
  "status": "OK",
  "timestamp": "2025-11-25T...",
  "uptime": 10.5,
  "environment": "development"
}
```

Ou abra no navegador: http://localhost:3000/health

---

### Modo Produção

```bash
# Compilar TypeScript
npm run build

# Executar versão compilada
npm start
```

---

## 📁 Estrutura do Projeto

```
techtrust-backend/
├── src/
│   ├── config/           # Configurações (logger, database, etc)
│   ├── controllers/      # Lógica dos endpoints
│   ├── middleware/       # Middlewares (auth, validation, etc)
│   ├── models/          # (Opcional - Prisma já gerencia)
│   ├── routes/          # Definição de rotas
│   ├── services/        # Lógica de negócio
│   ├── utils/           # Funções utilitárias
│   ├── types/           # Tipos TypeScript
│   └── server.ts        # Ponto de entrada
├── prisma/
│   ├── schema.prisma    # Schema do banco
│   ├── migrations/      # Migrations
│   └── seed.ts          # Dados de exemplo
├── config/              # Arquivos de config (Firebase, etc)
├── uploads/             # Upload de arquivos
├── logs/                # Logs da aplicação
├── .env                 # Variáveis de ambiente (NÃO commitar)
├── .env.example         # Exemplo de .env
├── package.json         # Dependências
├── tsconfig.json        # Config TypeScript
└── README.md            # Este arquivo
```

---

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor com auto-reload

# Build
npm run build            # Compila TypeScript para JavaScript
npm start                # Executa versão compilada

# Prisma
npm run prisma:generate  # Gera cliente Prisma
npm run prisma:migrate   # Cria/aplica migrations
npm run prisma:studio    # Abre interface visual do banco
npm run seed             # Popula banco com dados de teste

# Testes
npm test                 # Roda testes (quando implementados)

# Utilitários
npm run lint             # Verifica código (quando configurado)
```

---

## 🧪 Testar Endpoints

### Opção 1: Thunder Client (VS Code)

1. Abra VS Code
2. Clique no ícone do raio ⚡ (Thunder Client)
3. **New Request**
4. Teste: `GET http://localhost:3000/health`

### Opção 2: Postman

1. Abra Postman
2. Import → Cole esta collection (criar depois)
3. Teste os endpoints

### Opção 3: cURL (PowerShell)

```bash
# Health check
curl http://localhost:3000/health

# Cadastrar usuário (quando implementado)
curl -X POST http://localhost:3000/api/v1/auth/signup `
  -H "Content-Type: application/json" `
  -d '{
    \"fullName\": \"João Teste\",
    \"email\": \"joao@teste.com\",
    \"phone\": \"+14075551234\",
    \"password\": \"Teste123\",
    \"language\": \"PT\"
  }'
```

---

## 🐞 Troubleshooting

### Erro: "Cannot find module 'express'"

**Solução:**
```bash
npm install
```

### Erro: "Port 3000 already in use"

**Solução 1 - Mudar porta:**
No arquivo `.env`, mude:
```env
PORT=3001
```

**Solução 2 - Matar processo:**
```bash
# Encontrar processo
netstat -ano | findstr :3000

# Matar processo (substitua 12345 pelo PID)
taskkill /PID 12345 /F
```

### Erro: "Database connection failed"

**Verificar se PostgreSQL está rodando:**
1. Windows + R → `services.msc`
2. Procure "postgresql-x64-15"
3. Se não estiver "Em execução" → Iniciar

**Verificar credenciais:**
```bash
psql -U techtrust_user -d techtrust_dev
# Senha: techtrust123
```

Se não funcionar:
```bash
# Conectar como postgres
psql -U postgres

# Recriar usuário
DROP USER IF EXISTS techtrust_user;
CREATE USER techtrust_user WITH PASSWORD 'techtrust123';
GRANT ALL PRIVILEGES ON DATABASE techtrust_dev TO techtrust_user;
```

### Erro: "Prisma Client not generated"

**Solução:**
```bash
npm run prisma:generate
```

### Erro: "Migration failed"

**Reset completo (CUIDADO: apaga dados):**
```bash
npx prisma migrate reset
```

### Logs não aparecem

**Criar pasta de logs:**
```bash
mkdir logs
```

### TypeScript errors

**Recompilar:**
```bash
npm run build
```

---

## 🔑 Integrações Externas (Futuro)

Por enquanto, estamos usando **MOCK MODE** para desenvolvimento local.

Quando você quiser ativar os serviços reais:

### Stripe (Pagamentos)

1. Criar conta: https://dashboard.stripe.com/register
2. Obter chaves: Dashboard → Developers → API keys
3. No `.env`:
```env
STRIPE_SECRET_KEY=sk_test_sua_chave
STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave
MOCK_STRIPE=false
```

### Twilio (SMS)

1. Criar conta: https://www.twilio.com/try-twilio
2. Console: https://console.twilio.com/
3. No `.env`:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=sua_token
TWILIO_PHONE_NUMBER=+15555551234
MOCK_TWILIO=false
```

### Google Maps

1. Console: https://console.cloud.google.com/
2. Ativar APIs: Maps, Places, Distance Matrix
3. Criar API key
4. No `.env`:
```env
GOOGLE_MAPS_API_KEY=AIzaxxxxxxxxx
```

### Firebase (Push Notifications)

1. Console: https://console.firebase.google.com/
2. Criar projeto
3. Download service account JSON
4. Salvar em `config/firebase-service-account.json`
5. No `.env`:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
```

---

## 📚 Próximos Passos

Após rodar o backend com sucesso:

1. ✅ Testar health check
2. ✅ Testar cadastro de usuário
3. ✅ Testar login
4. ✅ Explorar Prisma Studio: `npm run prisma:studio`
5. ⏳ Aguardar frontend mobile (próxima entrega)
6. ⏳ Aguardar dashboard web fornecedor

---

## 💬 Suporte

**Problemas comuns:**
- Verifique que todas as dependências estão instaladas
- Confirme que o PostgreSQL está rodando
- Verifique o arquivo `.env`
- Veja os logs em `logs/error.log`

**Ainda com problemas?**
- Documente o erro completo
- Informe qual comando rodou
- Anexe screenshot se possível

---

## 📝 Changelog

### v1.0.0 (25 Nov 2025)
- ✅ Estrutura inicial do projeto
- ✅ Configuração Prisma + PostgreSQL
- ✅ Sistema de autenticação (base)
- ✅ Logger com Winston
- ✅ Rate limiting
- ✅ Socket.IO para chat
- ✅ Health check endpoint

---

**Backend pronto para desenvolvimento!** 🚀

Continue testando e me avise se encontrar algum problema.
