# 🚗 TechTrust AutoSolutions

Sistema completo de marketplace automotivo com aplicativo mobile e painéis web administrativos.

---

## 📱 Sobre o Projeto

TechTrust é uma plataforma que conecta clientes a prestadores de serviços automotivos, permitindo:

- 👤 **Clientes**: Solicitar serviços, receber orçamentos, acompanhar trabalhos
- 🔧 **Fornecedores**: Receber solicitações, enviar orçamentos, gerenciar agenda
- 👨‍💼 **Administradores**: Gerenciar plataforma, usuários, conteúdo e pagamentos

---

## 🏗️ Arquitetura

```
📁 TechTrust/
├── 🖥️  techtrust-backend/          → API REST (Node.js + Express + PostgreSQL)
├── 👨‍💼 techtrust-admin-dashboard/   → Painel Admin (Next.js)
├── 👥 techtrust-client-dashboard/  → Painel Cliente (Next.js)
├── 🔧 techtrust-provider-dashboard/→ Painel Fornecedor (Next.js)
└── 📱 techtrust-mobile/            → App Mobile (React Native + Expo)
```

---

## 🚀 Deploy em Produção

### Stack Utilizada:
- ✅ **Backend**: Render
- ✅ **Dashboards**: Vercel
- ✅ **Mobile**: Expo EAS
- ✅ **Database**: Supabase (PostgreSQL)

### 📚 Guias de Deploy:

1. **[INICIO_RAPIDO.md](INICIO_RAPIDO.md)** ⚡
   - Guia passo a passo rápido (2-3 horas)
   - Ideal para primeiro deploy

2. **[DEPLOY_PASSO_A_PASSO.md](DEPLOY_PASSO_A_PASSO.md)** 📖
   - Guia completo e detalhado
   - Todas as opções e troubleshooting

3. **[COMANDOS_RAPIDOS.md](COMANDOS_RAPIDOS.md)** ⚡
   - Referência rápida de comandos
   - Para consultas rápidas

4. **[CHECKLIST_DEPLOY.md](CHECKLIST_DEPLOY.md)** ✅
   - Checklist interativo
   - Acompanhe seu progresso

---

## 🎯 Começar Deploy AGORA

```powershell
# 1. Clone/entre no projeto
cd c:\Projetos\TechTrust

# 2. Execute setup automático
.\setup-deploy.ps1

# 3. Siga o guia
# Abra: INICIO_RAPIDO.md
```

---

## 💻 Desenvolvimento Local

### Pré-requisitos:
- Node.js 18+
- PostgreSQL 14+
- Git

### Configurar Backend:

```powershell
cd techtrust-backend

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
# Edite .env com suas credenciais

# Executar migrations
npx prisma migrate dev

# Seed (usuário admin)
npm run seed

# Rodar servidor
npm run dev
# Roda em: http://localhost:3000
```

### Configurar Dashboards:

```powershell
# Admin Dashboard
cd techtrust-admin-dashboard
npm install
npm run dev  # http://localhost:3003

# Client Dashboard
cd techtrust-client-dashboard
npm install
npm run dev  # http://localhost:3001

# Provider Dashboard
cd techtrust-provider-dashboard
npm install
npm run dev  # http://localhost:3002
```

### Configurar Mobile:

```powershell
cd techtrust-mobile
npm install
npm start
# Pressione 'a' para Android ou 'i' para iOS
```

---

## 🔑 Credenciais Padrão

Após executar o seed:

```
Admin:
  Email: admin@techtrust.com
  Senha: admin123
  
⚠️ TROCAR SENHA EM PRODUÇÃO!
```

---

## 📊 Status do Sistema

### Produção:

```
🖥️  Backend API:      https://techtrust-api.onrender.com
👨‍💼 Admin Dashboard:  https://techtrust-admin.vercel.app
👥 Client Dashboard:  https://techtrust-client.vercel.app
🔧 Provider Dashboard: https://techtrust-provider.vercel.app
📱 Mobile App:        Via Expo EAS / Lojas
```

### Desenvolvimento:

```
🖥️  Backend API:      http://localhost:3000
👨‍💼 Admin Dashboard:  http://localhost:3003
👥 Client Dashboard:  http://localhost:3001
🔧 Provider Dashboard: http://localhost:3002
📱 Mobile App:        Expo Go
```

---

## 🛠️ Tecnologias

### Backend:
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- JWT Authentication
- Socket.io (chat em tempo real)
- Stripe (pagamentos)
- Firebase (notificações)

### Dashboards:
- Next.js 14 + React 18
- TypeScript
- Tailwind CSS
- Recharts (gráficos)

### Mobile:
- React Native + Expo
- TypeScript
- React Navigation
- Expo Location, Camera, etc.

---

## 📁 Estrutura dos Projetos

### Backend (`techtrust-backend/`)
```
src/
├── controllers/    → Lógica de negócio
├── routes/        → Definição de rotas
├── services/      → Serviços externos
├── middleware/    → Autenticação, validação
├── models/        → Tipos TypeScript
├── config/        → Configurações
└── utils/         → Funções auxiliares
```

### Dashboards
```
src/
├── pages/         → Páginas Next.js
├── components/    → Componentes React
├── contexts/      → Estado global
├── services/      → Chamadas API
└── i18n/          → Internacionalização
```

### Mobile
```
src/
├── screens/       → Telas do app
├── components/    → Componentes reutilizáveis
├── navigation/    → Navegação
├── services/      → API client
├── contexts/      → Estado global
└── i18n/          → Traduções
```

---

## 🧪 Testes

```powershell
# Backend
cd techtrust-backend
npm test

# Dashboards
cd techtrust-admin-dashboard
npm run lint

# Mobile
cd techtrust-mobile
npm test
```

---

## 📝 Scripts Disponíveis

### Backend:
```json
npm run dev      - Desenvolvimento com hot reload
npm run build    - Build para produção
npm start        - Rodar build de produção
npm test         - Executar testes
npm run seed     - Popular banco com dados iniciais
```

### Dashboards:
```json
npm run dev      - Desenvolvimento
npm run build    - Build para produção
npm start        - Rodar build de produção
npm run lint     - Verificar código
```

### Mobile:
```json
npm start        - Iniciar Expo
npm run android  - Rodar em Android
npm run ios      - Rodar em iOS (Mac only)
```

---

## 🔐 Variáveis de Ambiente

### Backend (`.env`):
```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
STRIPE_SECRET_KEY=sk_...
FIREBASE_PROJECT_ID=...
GOOGLE_MAPS_API_KEY=AIza...
```

### Dashboards (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_...
```

### Mobile (`app.json` → `extra`):
```json
{
  "apiUrl": "http://localhost:3000",
  "googleMapsApiKey": "AIza..."
}
```

---

## 📦 Dependências Principais

### Backend:
- express
- prisma + @prisma/client
- jsonwebtoken
- bcrypt
- stripe
- socket.io
- firebase-admin

### Frontend:
- next
- react + react-dom
- axios
- recharts (gráficos)
- lucide-react (ícones)

### Mobile:
- expo
- react-native
- @react-navigation
- axios
- expo-location
- expo-camera

---

## 🚨 Problemas Comuns

### ❌ Erro: "Cannot connect to database"
✅ Verifique DATABASE_URL no .env
✅ Confirme que PostgreSQL está rodando

### ❌ Erro: "CORS policy blocked"
✅ Adicione URL do frontend no CORS_ORIGIN do backend
✅ Confirme que está usando http:// ou https:// correto

### ❌ Erro: Build failed
✅ Rode `npm install` novamente
✅ Verifique versão do Node (deve ser 18+)
✅ Delete node_modules e .next, reinstale

---

## 📞 Suporte e Contato

- **Documentação**: Ver arquivos `*.md` na raiz
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/techtrust-system/issues)
- **Email**: suporte@techtrust.com

---

## 📄 Licença

Este projeto é proprietário e confidencial.

---

## 🎯 Roadmap

- [x] Sistema base funcional
- [x] Autenticação e autorização
- [x] CRUD completo de todas entidades
- [x] Sistema de orçamentos
- [x] Sistema de pagamentos (Stripe)
- [x] Chat em tempo real
- [x] Notificações push
- [x] Busca por geolocalização
- [ ] Sistema de avaliações
- [ ] Programa de fidelidade
- [ ] Integrações com oficinas
- [ ] Analytics avançado

---

## 👥 Equipe

- **Desenvolvimento**: [Seu Nome]
- **Design**: [Designer]
- **Produto**: [Product Owner]

---

## 🙏 Agradecimentos

Tecnologias e serviços que tornaram este projeto possível:
- Vercel (hosting dashboards)
- Render (hosting backend)
- Supabase (database)
- Expo (mobile framework)
- Stripe (pagamentos)

---

**Última atualização**: Janeiro 2026
**Versão**: 1.0.0
**Status**: ✅ Em Produção

---

<div align="center">

**[⚡ Começar Deploy](INICIO_RAPIDO.md)** | **[📖 Guia Completo](DEPLOY_PASSO_A_PASSO.md)** | **[✅ Checklist](CHECKLIST_DEPLOY.md)**

</div>
