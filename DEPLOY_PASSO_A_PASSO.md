# 🚀 Deploy Completo - Passo a Passo

## Stack Escolhida:
- ✅ **Backend**: Render
- ✅ **Dashboards**: Vercel
- ✅ **Mobile**: Expo EAS
- ✅ **Database**: Supabase

---

## 📌 PARTE 1: Preparar o Repositório

### 1.1. Criar repositório no GitHub

```powershell
# Na pasta raiz do projeto
cd c:\Projetos\TechTrust

# Inicializar Git (se ainda não iniciou)
git init

# Criar .gitignore
# (arquivo já criado, veja abaixo)

# Adicionar todos os arquivos
git add .

# Commit inicial
git commit -m "Initial commit - TechTrust System"

# Criar repositório no GitHub
# Acesse: https://github.com/new
# Nome: techtrust-system
# Deixe PRIVADO por enquanto

# Adicionar remote e push
git remote add origin https://github.com/SEU_USUARIO/techtrust-system.git
git branch -M main
git push -u origin main
```

---

## 🗄️ PARTE 2: Supabase (Banco de Dados)

### 2.1. Criar Projeto no Supabase

1. **Acesse**: https://supabase.com
2. Clique em **"New project"**
3. Preencha:
   - **Name**: `techtrust-prod`
   - **Database Password**: Crie uma senha forte (SALVE EM LUGAR SEGURO!)
   - **Region**: `South America (São Paulo)` (mais próximo do Brasil)
   - **Pricing Plan**: `Free` (pode começar grátis)
4. Clique em **"Create new project"**
5. Aguarde ~2 minutos para provisionar

### 2.2. Obter Connection String

1. No painel do Supabase, vá em **"Settings"** (ícone de engrenagem)
2. Clique em **"Database"**
3. Role até **"Connection string"**
4. Selecione **"URI"**
5. Copie a string (exemplo):
   ```
   postgresql://postgres.xxxxxxxxxxxx:[SUA-SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
   ```
6. **IMPORTANTE**: Substitua `[SUA-SENHA]` pela senha que você criou

### 2.3. Executar Migrations

```powershell
# No seu computador local
cd c:\Projetos\TechTrust\techtrust-backend

# Criar arquivo .env temporário para migration
echo "DATABASE_URL=postgresql://postgres.xxxxxxxxxxxx:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres" > .env.temp

# Executar migrations
$env:DATABASE_URL="SUA_CONNECTION_STRING_AQUI"
npx prisma migrate deploy

# Gerar Prisma Client
npx prisma generate

# Seed inicial (cria usuário admin)
npm run seed
```

**✅ Pronto! Banco de dados configurado e populado.**

---

## 🖥️ PARTE 3: Render (Backend API)

### 3.1. Criar Web Service

1. **Acesse**: https://render.com
2. Clique em **"New +"** > **"Web Service"**
3. Conecte seu GitHub (se primeira vez)
4. Selecione o repositório: `techtrust-system`
5. Configure:
   - **Name**: `techtrust-api`
   - **Region**: `Oregon (US West)` (mais barato/estável)
   - **Branch**: `main`
   - **Root Directory**: `techtrust-backend`
   - **Runtime**: `Node`
   - **Build Command**: 
     ```bash
     npm install && npm run build && npx prisma generate
     ```
   - **Start Command**: 
     ```bash
     npm start
     ```
   - **Instance Type**: `Free` (para começar)

### 3.2. Configurar Variáveis de Ambiente

1. Na página do serviço, vá em **"Environment"**
2. Clique em **"Add Environment Variable"**
3. Adicione TODAS estas variáveis:

```env
NODE_ENV=production
PORT=10000

# Database (copie do Supabase)
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxx:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

# JWT Secret (gere um aleatório forte)
JWT_SECRET=seu_segredo_muito_forte_e_aleatorio_aqui_123456789
JWT_EXPIRES_IN=7d

# CORS (vamos ajustar depois com domínios reais)
CORS_ORIGIN=https://techtrust-admin.vercel.app,https://techtrust-client.vercel.app,https://techtrust-provider.vercel.app

# Firebase (OPCIONAL - deixe vazio por enquanto se não tiver)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Stripe (OPCIONAL - use chaves de teste)
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio (OPCIONAL)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Google Maps (OBRIGATÓRIO para geocoding)
GOOGLE_MAPS_API_KEY=AIzaSy...
```

### 3.3. Deploy

1. Clique em **"Create Web Service"**
2. Aguarde o build (~5-10 minutos)
3. Quando aparecer **"Live"** (bolinha verde), copie a URL:
   ```
   https://techtrust-api.onrender.com
   ```

### 3.4. Testar API

```powershell
# Testar se API está funcionando
curl https://techtrust-api.onrender.com/health

# Deve retornar algo como:
# {"status":"OK","timestamp":"..."}
```

**✅ Backend rodando em produção!**

---

## 🌐 PARTE 4: Vercel (Dashboards)

Vamos fazer o deploy dos 3 dashboards separadamente.

### 4.1. Admin Dashboard

```powershell
# Instalar Vercel CLI
npm install -g vercel

# Entrar na pasta
cd c:\Projetos\TechTrust\techtrust-admin-dashboard

# Login no Vercel (primeira vez)
vercel login

# Deploy
vercel

# Responda:
# ? Set up and deploy? Yes
# ? Which scope? (seu usuário)
# ? Link to existing project? No
# ? What's your project's name? techtrust-admin
# ? In which directory is your code located? ./
# ? Want to override the settings? No
```

**Configurar Variáveis de Ambiente:**

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **techtrust-admin**
3. Vá em **Settings** > **Environment Variables**
4. Adicione:

```env
NEXT_PUBLIC_API_URL=https://techtrust-api.onrender.com
```

5. Clique em **"Redeploy"** para aplicar

**URL do Admin**: `https://techtrust-admin.vercel.app`

### 4.2. Client Dashboard

```powershell
cd c:\Projetos\TechTrust\techtrust-client-dashboard

vercel

# Responda:
# ? Set up and deploy? Yes
# ? Which scope? (seu usuário)
# ? Link to existing project? No
# ? What's your project's name? techtrust-client
# ? In which directory is your code located? ./
# ? Want to override the settings? No
```

**Configurar Variáveis de Ambiente:**

1. No Vercel Dashboard, selecione **techtrust-client**
2. Settings > Environment Variables:

```env
NEXT_PUBLIC_API_URL=https://techtrust-api.onrender.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_51...
```

3. Redeploy

**URL do Cliente**: `https://techtrust-client.vercel.app`

### 4.3. Provider Dashboard

```powershell
cd c:\Projetos\TechTrust\techtrust-provider-dashboard

vercel

# Responda:
# ? Set up and deploy? Yes
# ? Which scope? (seu usuário)
# ? Link to existing project? No
# ? What's your project's name? techtrust-provider
# ? In which directory is your code located? ./
# ? Want to override the settings? No
```

**Configurar Variáveis de Ambiente:**

```env
NEXT_PUBLIC_API_URL=https://techtrust-api.onrender.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

**URL do Fornecedor**: `https://techtrust-provider.vercel.app`

### 4.4. Atualizar CORS no Backend

Agora que temos as URLs dos dashboards, vamos atualizar o CORS:

1. Vá no **Render Dashboard** > **techtrust-api** > **Environment**
2. Edite `CORS_ORIGIN` para:
   ```
   https://techtrust-admin.vercel.app,https://techtrust-client.vercel.app,https://techtrust-provider.vercel.app
   ```
3. Salve e aguarde o redeploy automático

**✅ Todos os dashboards rodando!**

---

## 📱 PARTE 5: Expo EAS (Aplicativo Mobile)

### 5.1. Preparar Projeto

```powershell
cd c:\Projetos\TechTrust\techtrust-mobile

# Instalar EAS CLI globalmente
npm install -g eas-cli

# Login no Expo
eas login

# Configurar projeto
eas build:configure
```

### 5.2. Configurar app.json

Atualize o arquivo `app.json`:

```json
{
  "expo": {
    "name": "TechTrust",
    "slug": "techtrust-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#1E40AF"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.techtrust.app",
      "buildNumber": "1.0.0"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1E40AF"
      },
      "package": "com.techtrust.app",
      "versionCode": 1,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA"
      ]
    },
    "extra": {
      "eas": {
        "projectId": "SEU_PROJECT_ID_AQUI"
      },
      "apiUrl": "https://techtrust-api.onrender.com"
    }
  }
}
```

### 5.3. Criar eas.json

Crie arquivo `eas.json` na raiz do techtrust-mobile:

```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 5.4. Build Android (APK para teste)

```powershell
# Build versão de preview (para testar)
eas build --platform android --profile preview

# Aguarde ~10-15 minutos
# Quando terminar, você receberá um link para download do APK
```

### 5.5. Build iOS (se tiver Mac/conta Apple)

```powershell
# Build versão de preview
eas build --platform ios --profile preview

# NOTA: Requer Apple Developer Account ($99/ano)
```

### 5.6. Build para Produção

Quando estiver pronto para publicar nas lojas:

```powershell
# Android - Build AAB para Google Play
eas build --platform android --profile production

# iOS - Build IPA para App Store
eas build --platform ios --profile production

# Submit para lojas (requer contas de desenvolvedor)
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

**✅ App mobile pronto para distribuição!**

---

## 🎯 PARTE 6: Testes Finais

### 6.1. Testar Backend

```powershell
# Health check
curl https://techtrust-api.onrender.com/health

# Testar login admin (usuário criado no seed)
curl -X POST https://techtrust-api.onrender.com/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@techtrust.com","password":"admin123"}'
```

### 6.2. Testar Dashboards

1. **Admin Dashboard**: https://techtrust-admin.vercel.app
   - Login: `admin@techtrust.com`
   - Senha: `admin123`

2. **Client Dashboard**: https://techtrust-client.vercel.app
   - Criar nova conta ou usar usuário de teste

3. **Provider Dashboard**: https://techtrust-provider.vercel.app
   - Criar nova conta de fornecedor

### 6.3. Testar Mobile

1. Baixe o APK gerado pelo EAS
2. Instale no celular Android
3. Teste login e funcionalidades principais

---

## 📝 PARTE 7: Credenciais e URLs

Guarde estas informações em local seguro:

### 🔗 URLs de Produção

```
Backend API:     https://techtrust-api.onrender.com
Admin Dashboard: https://techtrust-admin.vercel.app
Client App:      https://techtrust-client.vercel.app
Provider App:    https://techtrust-provider.vercel.app
```

### 👤 Usuário Admin Padrão

```
Email: admin@techtrust.com
Senha: admin123
```

**⚠️ IMPORTANTE**: Mude a senha assim que fizer o primeiro login!

### 🗄️ Database

```
Host: Supabase
Connection: (salvo nas variáveis de ambiente)
```

---

## 🔧 PARTE 8: Configurações Pós-Deploy

### 8.1. Configurar Domínio Personalizado (Opcional)

**Para os Dashboards (Vercel):**

1. No Vercel Dashboard, vá em **Settings** > **Domains**
2. Adicione:
   - `admin.seudominio.com` → techtrust-admin
   - `app.seudominio.com` → techtrust-client
   - `provider.seudominio.com` → techtrust-provider

3. Configure DNS no seu provedor:
   ```
   CNAME  admin     cname.vercel-dns.com
   CNAME  app       cname.vercel-dns.com
   CNAME  provider  cname.vercel-dns.com
   ```

**Para Backend (Render):**

1. No Render Dashboard, vá em **Settings** > **Custom Domain**
2. Adicione: `api.seudominio.com`
3. Configure DNS:
   ```
   CNAME  api  techtrust-api.onrender.com
   ```

### 8.2. Habilitar HTTPS (Automático)

- ✅ Vercel: SSL automático
- ✅ Render: SSL automático
- ✅ Supabase: SSL habilitado por padrão

### 8.3. Configurar Backups (Supabase)

1. No Supabase, vá em **Database** > **Backups**
2. Backups diários automáticos (plano gratuito: 7 dias de retenção)
3. Plano Pro ($25/mês): 30 dias de retenção

---

## 📊 PARTE 9: Monitoramento

### 9.1. Render (Backend)

- **Logs**: No dashboard do Render, aba "Logs"
- **Metrics**: Aba "Metrics" mostra CPU/Memória
- **Alerts**: Configure em Settings > Alerts

### 9.2. Vercel (Dashboards)

- **Analytics**: Settings > Analytics (gratuito)
- **Logs**: Aba "Deployments" > clique no deploy > "View Function Logs"

### 9.3. Supabase (Database)

- **Queries**: Database > Query Performance
- **Logs**: Logs > Postgres Logs

---

## 🚨 Troubleshooting Comum

### ❌ Problema: Backend não conecta no banco

**Solução:**
```powershell
# Verifique se DATABASE_URL está correto no Render
# Teste conexão local:
cd techtrust-backend
$env:DATABASE_URL="sua_connection_string"
npx prisma db push
```

### ❌ Problema: Dashboard não conecta na API

**Solução:**
1. Verifique `NEXT_PUBLIC_API_URL` nas variáveis do Vercel
2. Verifique CORS no Render
3. Teste API direto no navegador

### ❌ Problema: Build falhou no Render

**Solução:**
1. Verifique logs de build
2. Teste build local:
   ```powershell
   cd techtrust-backend
   npm run build
   ```

### ❌ Problema: App mobile não conecta

**Solução:**
1. Verifique `apiUrl` no `app.json`
2. Rebuild o app após mudar configuração

---

## ✅ Checklist Final

### Backend
- [ ] Deploy no Render completo
- [ ] Variáveis de ambiente configuradas
- [ ] Migrations executadas
- [ ] Health check retornando OK
- [ ] Login admin funcionando

### Dashboards
- [ ] Admin dashboard acessível
- [ ] Client dashboard acessível
- [ ] Provider dashboard acessível
- [ ] Variáveis de ambiente configuradas
- [ ] Conexão com API funcionando

### Mobile
- [ ] Build Android gerado
- [ ] APK testado em dispositivo
- [ ] Conexão com API funcionando
- [ ] Permissões configuradas

### Database
- [ ] Supabase configurado
- [ ] Migrations aplicadas
- [ ] Dados seed inseridos
- [ ] Conexões funcionando

---

## 🎉 Sistema Publicado!

Seu sistema TechTrust está agora rodando em produção!

### Próximos Passos:

1. **Testar todas as funcionalidades**
2. **Configurar domínios personalizados**
3. **Monitorar logs nas primeiras 48h**
4. **Configurar backups automáticos**
5. **Preparar material de lançamento**

### Custos Mensais Estimados:

- Render Free: $0 (com limitações)
- Render Starter: $7/mês (recomendado)
- Vercel Hobby: $0
- Supabase Free: $0 (até 500MB)
- Expo EAS: $0 (builds gratuitos limitados)

**Total inicial**: $0-7/mês 🎉

---

## 📞 Suporte

- Render: https://render.com/docs
- Vercel: https://vercel.com/docs
- Expo: https://docs.expo.dev
- Supabase: https://supabase.com/docs

**Documentação completa em**: [GUIA_PUBLICACAO.md](GUIA_PUBLICACAO.md)
