# 🚀 Guia Completo de Publicação - TechTrust

Este guia detalha o processo completo de publicação de todos os componentes do sistema TechTrust.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Backend (API)](#1-backend-api)
3. [Dashboards Web (Next.js)](#2-dashboards-web-nextjs)
4. [Aplicativo Mobile (React Native)](#3-aplicativo-mobile-react-native)
5. [Banco de Dados](#4-banco-de-dados)
6. [Configurações de Produção](#5-configurações-de-produção)
7. [Monitoramento](#6-monitoramento)

---

## Pré-requisitos

Antes de começar, você precisará:

- [ ] Conta no GitHub/GitLab
- [ ] Conta em plataforma de hospedagem (Vercel, Railway, Render, AWS, etc.)
- [ ] Banco de dados PostgreSQL (Supabase, Railway, ou AWS RDS)
- [ ] Domínio personalizado (opcional, mas recomendado)
- [ ] Contas de serviços externos:
  - Firebase (notificações push)
  - Stripe (pagamentos)
  - Twilio (SMS - opcional)
  - Google Maps API

---

## 1. Backend (API)

### Opção A: Railway (Recomendado - Gratuito para começar)

1. **Acesse**: https://railway.app

2. **Criar Novo Projeto**:
   ```bash
   # No Railway Dashboard:
   # 1. "New Project" > "Deploy from GitHub repo"
   # 2. Selecione o repositório techtrust-backend
   ```

3. **Configurar Variáveis de Ambiente**:
   ```env
   NODE_ENV=production
   PORT=8080
   
   # Database
   DATABASE_URL=postgresql://user:pass@host:5432/techtrust
   
   # JWT
   JWT_SECRET=seu_segredo_super_secreto_aqui
   JWT_EXPIRES_IN=7d
   
   # CORS
   CORS_ORIGIN=https://admin.seudominio.com,https://app.seudominio.com,https://provider.seudominio.com
   
   # Firebase
   FIREBASE_PROJECT_ID=seu-projeto-firebase
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   
   # Stripe
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   
   # Twilio (opcional)
   TWILIO_ACCOUNT_SID=ACxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
   TWILIO_PHONE_NUMBER=+5511999999999
   
   # Redis (se usar)
   REDIS_URL=redis://...
   ```

4. **Configurar Build**:
   ```bash
   # Build Command (Railway detecta automaticamente)
   npm run build
   
   # Start Command
   npm start
   ```

5. **Migrations**:
   ```bash
   # No Railway, adicione um script de deploy:
   # package.json > scripts:
   "deploy": "prisma migrate deploy && prisma generate && npm start"
   ```

### Opção B: Render.com

1. Acesse: https://render.com
2. "New" > "Web Service"
3. Conecte o repositório
4. Configure:
   - **Build Command**: `npm install && npm run build && npx prisma generate`
   - **Start Command**: `npm start`
   - Adicione as mesmas variáveis de ambiente acima

### Opção C: AWS (EC2 + RDS)

```bash
# 1. Criar EC2 Ubuntu Instance
# 2. Conectar via SSH
ssh -i sua-chave.pem ubuntu@seu-ip

# 3. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Instalar PM2
sudo npm install -g pm2

# 5. Clonar repositório
git clone https://github.com/seu-usuario/techtrust-backend.git
cd techtrust-backend

# 6. Instalar dependências
npm install

# 7. Criar arquivo .env com as variáveis

# 8. Build
npm run build

# 9. Rodar migrations
npx prisma migrate deploy

# 10. Iniciar com PM2
pm2 start dist/server.js --name techtrust-api
pm2 startup
pm2 save

# 11. Configurar Nginx como proxy reverso
sudo apt install nginx
sudo nano /etc/nginx/sites-available/techtrust

# Configuração Nginx:
server {
    listen 80;
    server_name api.seudominio.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

sudo ln -s /etc/nginx/sites-available/techtrust /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 12. SSL com Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.seudominio.com
```

---

## 2. Dashboards Web (Next.js)

### Opção A: Vercel (Recomendado - Criadores do Next.js)

1. **Acesse**: https://vercel.com

2. **Para cada dashboard** (admin, client, provider):

   ```bash
   # 1. Instale Vercel CLI
   npm install -g vercel
   
   # 2. Entre no diretório do dashboard
   cd techtrust-admin-dashboard
   
   # 3. Deploy
   vercel
   
   # Siga as instruções:
   # - Link to existing project? No
   # - Project name? techtrust-admin
   # - Directory? ./
   # - Override settings? No
   ```

3. **Configurar Variáveis de Ambiente** (no Vercel Dashboard):
   
   **Admin Dashboard**:
   ```env
   NEXT_PUBLIC_API_URL=https://api.seudominio.com
   NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
   ```
   
   **Client Dashboard**:
   ```env
   NEXT_PUBLIC_API_URL=https://api.seudominio.com
   NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
   ```
   
   **Provider Dashboard**:
   ```env
   NEXT_PUBLIC_API_URL=https://api.seudominio.com
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
   ```

4. **Configurar Domínios Personalizados**:
   - Admin: admin.seudominio.com
   - Cliente: app.seudominio.com
   - Fornecedor: provider.seudominio.com

### Opção B: Netlify

Similar ao Vercel:
1. Conecte o repositório
2. Configure variáveis de ambiente
3. Build command: `npm run build`
4. Publish directory: `.next`

---

## 3. Aplicativo Mobile (React Native)

### iOS (App Store)

#### Pré-requisitos:
- Mac com Xcode instalado
- Apple Developer Account ($99/ano)
- Certificados e provisioning profiles

#### Passos:

1. **Configurar projeto para produção**:
   ```bash
   cd techtrust-mobile
   
   # Instalar EAS CLI
   npm install -g eas-cli
   
   # Login no Expo
   eas login
   
   # Configurar projeto
   eas build:configure
   ```

2. **Criar arquivo eas.json**:
   ```json
   {
     "build": {
       "production": {
         "ios": {
           "bundleIdentifier": "com.techtrust.app",
           "buildConfiguration": "Release"
         }
       }
     },
     "submit": {
       "production": {
         "ios": {
           "appleId": "seu-email@apple.com",
           "ascAppId": "1234567890",
           "appleTeamId": "XXXXXXXXX"
         }
       }
     }
   }
   ```

3. **Build para iOS**:
   ```bash
   eas build --platform ios --profile production
   ```

4. **Submit para App Store**:
   ```bash
   eas submit --platform ios --profile production
   ```

### Android (Google Play)

1. **Criar keystore**:
   ```bash
   # Se ainda não tiver
   keytool -genkeypair -v -storetype PKCS12 -keystore techtrust.keystore \
     -alias techtrust -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configurar eas.json**:
   ```json
   {
     "build": {
       "production": {
         "android": {
           "buildType": "apk",
           "gradleCommand": ":app:assembleRelease"
         }
       }
     },
     "submit": {
       "production": {
         "android": {
           "serviceAccountKeyPath": "./google-service-account.json",
           "track": "production"
         }
       }
     }
   }
   ```

3. **Build para Android**:
   ```bash
   eas build --platform android --profile production
   ```

4. **Submit para Google Play**:
   ```bash
   eas submit --platform android --profile production
   ```

### Alternativa: Expo Build Service

```bash
# Build para ambas plataformas
eas build --platform all --profile production

# Download dos arquivos
# iOS: .ipa
# Android: .apk ou .aab
```

---

## 4. Banco de Dados

### Opção A: Supabase (Recomendado - PostgreSQL gerenciado)

1. **Acesse**: https://supabase.com
2. "New Project"
3. Escolha nome, senha e região
4. Copie a `DATABASE_URL` da seção "Settings > Database"
5. Use essa URL no backend

### Opção B: Railway PostgreSQL

```bash
# No Railway dashboard:
# 1. Add new service > Database > PostgreSQL
# 2. Copie a variável DATABASE_URL
# 3. Cole no seu backend service
```

### Opção C: AWS RDS

1. Crie uma instância PostgreSQL no RDS
2. Configure security groups
3. Use a connection string no backend

### Executar Migrations

```bash
# Após configurar DATABASE_URL
npx prisma migrate deploy
npx prisma generate

# Seed inicial (opcional)
npm run seed
```

---

## 5. Configurações de Produção

### 5.1. Configurar CORS

No backend, ajuste:

```typescript
// src/server.ts
const corsOptions = {
  origin: [
    'https://admin.seudominio.com',
    'https://app.seudominio.com',
    'https://provider.seudominio.com'
  ],
  credentials: true
};
```

### 5.2. Configurar Webhooks

**Stripe**:
```bash
# Criar webhook no Stripe Dashboard
# URL: https://api.seudominio.com/webhook/stripe
# Eventos: payment_intent.succeeded, payment_intent.failed
```

**Firebase Cloud Messaging**:
```json
// Adicionar domínios autorizados
{
  "domains": [
    "seudominio.com",
    "admin.seudominio.com",
    "app.seudominio.com",
    "provider.seudominio.com"
  ]
}
```

### 5.3. DNS e Domínios

Configure os registros DNS:

```
Tipo    Nome        Valor
A       @           IP_DO_SERVIDOR (ou CNAME para Vercel)
CNAME   api         seu-app.railway.app
CNAME   admin       seu-deployment.vercel.app
CNAME   app         seu-deployment.vercel.app
CNAME   provider    seu-deployment.vercel.app
```

---

## 6. Monitoramento

### 6.1. Logs

**Backend** (já configurado com Winston):
```bash
# Ver logs no Railway
railway logs

# Ver logs no AWS
pm2 logs techtrust-api
```

### 6.2. Error Tracking

Recomendado: **Sentry**

```bash
npm install @sentry/node @sentry/express

# Adicionar no backend
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://...@sentry.io/...",
  environment: process.env.NODE_ENV
});
```

### 6.3. Uptime Monitoring

Serviços gratuitos:
- UptimeRobot
- Pingdom
- StatusCake

---

## 7. Checklist Final

### Backend
- [ ] Variáveis de ambiente configuradas
- [ ] Migrations executadas
- [ ] CORS configurado
- [ ] SSL/HTTPS ativo
- [ ] Backups automáticos do banco
- [ ] Rate limiting configurado

### Dashboards Web
- [ ] Builds de produção criados
- [ ] Variáveis de ambiente configuradas
- [ ] Domínios personalizados configurados
- [ ] SSL/HTTPS ativo
- [ ] Analytics configurado (Google Analytics, opcional)

### Mobile
- [ ] Builds gerados
- [ ] App submetido para lojas
- [ ] Ícones e splash screens configurados
- [ ] Permissões revisadas
- [ ] Termos de uso e política de privacidade incluídos

### Segurança
- [ ] Secrets rotacionados
- [ ] Firewall configurado
- [ ] Backups testados
- [ ] Monitoramento ativo
- [ ] SSL certificates válidos

---

## 8. Custos Estimados (Mensais)

### Plano Mínimo (até 1000 usuários):
- **Vercel**: Gratuito (hobby) ou $20/mês (pro)
- **Railway**: $5-20/mês
- **Supabase**: Gratuito (até 500MB) ou $25/mês
- **Firebase**: Gratuito (spark) ou $25/mês (blaze)
- **Apple Developer**: $99/ano
- **Google Play**: $25 (taxa única)
- **Domínio**: $10-15/ano

**Total**: ~$50-100/mês + taxas iniciais

### Plano Crescimento (1000-10000 usuários):
- **Vercel Pro**: $20/mês por dashboard = $60/mês
- **Railway**: $50-100/mês
- **Supabase Pro**: $25/mês
- **Firebase Blaze**: $50-100/mês
- **CDN**: $20-50/mês

**Total**: ~$200-350/mês

---

## 9. Comandos Rápidos

```bash
# === BACKEND ===
cd techtrust-backend
npm run build
npx prisma migrate deploy
npm start

# === ADMIN DASHBOARD ===
cd techtrust-admin-dashboard
npm run build
npm start

# === CLIENT DASHBOARD ===
cd techtrust-client-dashboard
npm run build
npm start

# === PROVIDER DASHBOARD ===
cd techtrust-provider-dashboard
npm run build
npm start

# === MOBILE ===
cd techtrust-mobile
eas build --platform all --profile production
```

---

## 10. Suporte e Próximos Passos

### Após Publicação:

1. **Monitorar** logs e erros nas primeiras 48h
2. **Configurar** backups automáticos
3. **Testar** todos os fluxos em produção
4. **Criar** documentação de usuário
5. **Preparar** materiais de marketing

### Recursos Úteis:

- [Documentação Next.js](https://nextjs.org/docs)
- [Documentação Expo](https://docs.expo.dev)
- [Documentação Prisma](https://www.prisma.io/docs)
- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)

---

## 📞 Troubleshooting Comum

### Erro: "Cannot connect to database"
✅ Verifique DATABASE_URL está correta
✅ Confirme que o banco permite conexões externas

### Erro: "CORS policy blocked"
✅ Adicione domínio no CORS_ORIGIN do backend
✅ Verifique se está usando https:// não http://

### Erro: "Build failed"
✅ Verifique todas as dependências estão no package.json
✅ Confirme variáveis de ambiente estão definidas
✅ Rode `npm install` localmente primeiro

### App mobile crashando
✅ Verifique API_URL está correto
✅ Confirme certificados Firebase estão válidos
✅ Teste em modo de desenvolvimento primeiro

---

**✅ Sistema pronto para produção!**

Para dúvidas específicas, consulte a documentação de cada serviço ou entre em contato com o suporte.
