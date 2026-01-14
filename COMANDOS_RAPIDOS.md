# 🚀 Comandos Rápidos - Deploy TechTrust

## 🔧 Preparação Inicial

```powershell
# 1. Navegar para pasta do projeto
cd c:\Projetos\TechTrust

# 2. Instalar CLI tools (uma vez)
npm install -g vercel eas-cli

# 3. Fazer login
vercel login
eas login
```

---

## 🗄️ Supabase - Database

### Executar Migrations Localmente

```powershell
cd c:\Projetos\TechTrust\techtrust-backend

# Definir DATABASE_URL (substitua pela sua connection string do Supabase)
$env:DATABASE_URL="postgresql://postgres.xxxxxxxxxxxx:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Executar migrations
npx prisma migrate deploy

# Gerar client
npx prisma generate

# Seed inicial (cria admin)
npm run seed

# Visualizar dados (abre Prisma Studio)
npx prisma studio
```

---

## 🖥️ Backend - Render

### Deploy Manual (via Git)

```powershell
cd c:\Projetos\TechTrust

# Commit e push
git add .
git commit -m "Update backend"
git push origin main

# Render detecta automaticamente e faz redeploy
```

### Testar API Local

```powershell
cd techtrust-backend

# Criar .env local
cp .env.example .env
# Edite .env com suas credenciais

# Instalar dependências
npm install

# Rodar localmente
npm run dev

# Testar
curl http://localhost:3000/health
```

---

## 🌐 Dashboards - Vercel

### Deploy Admin Dashboard

```powershell
cd c:\Projetos\TechTrust\techtrust-admin-dashboard

# Deploy
vercel

# Deploy para produção (após testar)
vercel --prod
```

### Deploy Client Dashboard

```powershell
cd c:\Projetos\TechTrust\techtrust-client-dashboard

vercel
vercel --prod
```

### Deploy Provider Dashboard

```powershell
cd c:\Projetos\TechTrust\techtrust-provider-dashboard

vercel
vercel --prod
```

### Testar Localmente

```powershell
# Admin
cd techtrust-admin-dashboard
npm run dev
# Abre em: http://localhost:3003

# Client
cd techtrust-client-dashboard
npm run dev
# Abre em: http://localhost:3001

# Provider
cd techtrust-provider-dashboard
npm run dev
# Abre em: http://localhost:3002
```

---

## 📱 Mobile - Expo EAS

### Build Android APK (Preview)

```powershell
cd c:\Projetos\TechTrust\techtrust-mobile

# Build APK para teste
eas build --platform android --profile preview

# Aguarde ~10-15 minutos
# Download do APK será disponibilizado no terminal
```

### Build Android AAB (Produção - Google Play)

```powershell
eas build --platform android --profile production
```

### Build iOS (requer conta Apple Developer)

```powershell
# Preview
eas build --platform ios --profile preview

# Produção
eas build --platform ios --profile production
```

### Build Ambas Plataformas

```powershell
eas build --platform all --profile production
```

### Submit para Lojas

```powershell
# Google Play
eas submit --platform android --profile production

# App Store
eas submit --platform ios --profile production
```

### Testar Localmente

```powershell
cd techtrust-mobile

# Iniciar Expo
npm start

# Opções:
# - Pressione 'a' para Android emulator
# - Pressione 'i' para iOS simulator (Mac only)
# - Escaneie QR code com Expo Go app
```

---

## 🔍 Testes e Debug

### Testar Backend em Produção

```powershell
# Health check
curl https://techtrust-api.onrender.com/health

# Login admin
$body = @{
    email = "admin@techtrust.com"
    password = "admin123"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "https://techtrust-api.onrender.com/api/v1/auth/login" -Body $body -ContentType "application/json"
```

### Ver Logs

```powershell
# Vercel (no dashboard)
# 1. Acesse: https://vercel.com/dashboard
# 2. Selecione projeto > Deployments > clique no deploy > View Logs

# Render (no dashboard)
# 1. Acesse: https://dashboard.render.com
# 2. Selecione serviço > Logs tab
```

---

## 🔄 Atualizar Sistema

### Atualizar Apenas Backend

```powershell
cd c:\Projetos\TechTrust\techtrust-backend

# Fazer alterações...

git add .
git commit -m "Update: descrição da mudança"
git push origin main

# Render faz redeploy automático
```

### Atualizar Apenas Dashboard

```powershell
cd c:\Projetos\TechTrust\techtrust-admin-dashboard

# Fazer alterações...

vercel --prod
```

### Atualizar Mobile

```powershell
cd c:\Projetos\TechTrust\techtrust-mobile

# Fazer alterações...

# Incrementar version no app.json
# "version": "1.0.1" (ou "1.1.0")

# Build nova versão
eas build --platform android --profile production

# Submit
eas submit --platform android --profile production
```

---

## 📊 Comandos Úteis de Monitoramento

### Ver Status dos Serviços

```powershell
# Render
# Acesse: https://dashboard.render.com
# Verde = rodando, Vermelho = erro

# Vercel
# Acesse: https://vercel.com/dashboard
# Verde = live, Amarelo = building

# Supabase
# Acesse: https://app.supabase.com
# Project > Settings > Database
```

### Rollback (voltar versão)

```powershell
# Vercel - via Dashboard
# 1. Deployments > selecione deploy anterior
# 2. Clique nos 3 pontos > Promote to Production

# Render - via Dashboard
# 1. Vai em Events
# 2. Seleciona deploy anterior > Redeploy

# Git (qualquer serviço)
git revert HEAD
git push origin main
```

---

## 🛠️ Troubleshooting

### Problema: Build falha no Render

```powershell
# Teste build local
cd techtrust-backend
npm install
npm run build

# Se funcionar local, verifique:
# - Variáveis de ambiente no Render
# - Node version (deve ser 18+)
```

### Problema: Vercel não conecta na API

```powershell
# Verifique variável de ambiente
# No Vercel Dashboard:
# Settings > Environment Variables
# NEXT_PUBLIC_API_URL deve estar correto

# Redeploy após mudar
vercel --prod
```

### Problema: Database connection error

```powershell
# Teste conexão local
cd techtrust-backend
$env:DATABASE_URL="sua_connection_string"
npx prisma db push

# Se falhar:
# - Verifique senha
# - Verifique IP whitelist no Supabase (deve estar como 0.0.0.0/0)
# - Verifique connection string está completa
```

---

## 📝 Checklist Antes de Deploy

```
Backend:
☐ DATABASE_URL configurada
☐ JWT_SECRET gerado (forte e aleatório)
☐ CORS_ORIGIN com URLs dos dashboards
☐ npm run build funciona localmente
☐ Migrations testadas localmente

Dashboards:
☐ NEXT_PUBLIC_API_URL configurada
☐ npm run build funciona localmente
☐ Variáveis de ambiente no Vercel

Mobile:
☐ version incrementada no app.json
☐ extra.apiUrl correta
☐ Ícones e splash screen configurados
☐ Permissões revisadas

Geral:
☐ .gitignore configurado
☐ Credenciais não commitadas
☐ README atualizado
☐ Testes locais passando
```

---

## 🎯 URLs de Acesso Rápido

```
🌐 Dashboards:
- Render: https://dashboard.render.com
- Vercel: https://vercel.com/dashboard
- Supabase: https://app.supabase.com
- Expo: https://expo.dev/accounts/[seu-usuario]/projects

📚 Documentação:
- Render: https://render.com/docs
- Vercel: https://vercel.com/docs
- Expo EAS: https://docs.expo.dev/eas/
- Supabase: https://supabase.com/docs

🔧 APIs:
- Stripe: https://dashboard.stripe.com
- Google Cloud: https://console.cloud.google.com
- Firebase: https://console.firebase.google.com
```

---

## 💡 Dicas Importantes

1. **Sempre teste localmente antes de fazer deploy**
2. **Commit frequentemente com mensagens descritivas**
3. **Monitore logs após cada deploy**
4. **Mantenha backups do banco de dados**
5. **Use variáveis de ambiente, nunca hardcode secrets**
6. **Incremente version no app.json a cada release mobile**

---

## 🆘 Suporte

Se encontrar problemas:
1. Verifique logs no dashboard da plataforma
2. Teste localmente primeiro
3. Consulte documentação oficial
4. Verifique variáveis de ambiente

**Guia completo**: [DEPLOY_PASSO_A_PASSO.md](DEPLOY_PASSO_A_PASSO.md)
