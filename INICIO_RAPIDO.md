# 🎯 INÍCIO RÁPIDO - Deploy TechTrust

Siga estes passos na ordem para publicar o sistema completo.

---

## ⏱️ Tempo Estimado Total: 2-3 horas

---

## 🚀 PASSO 1: Preparação (10 min)

### 1.1. Instalar ferramentas

```powershell
# Executar script de setup
cd c:\Projetos\TechTrust
.\setup-deploy.ps1
```

### 1.2. Criar conta nos serviços

- [ ] Supabase: https://supabase.com
- [ ] Render: https://render.com
- [ ] Vercel: https://vercel.com
- [ ] Expo: https://expo.dev

---

## 🗄️ PASSO 2: Database - Supabase (15 min)

### 2.1. Criar Projeto

1. Acesse https://supabase.com
2. "New project"
3. Nome: `techtrust-prod`
4. Senha: `[CRIE UMA FORTE]` ⚠️ **SALVE EM LUGAR SEGURO!**
5. Region: `South America (São Paulo)`
6. "Create project" (aguarde ~2 min)

### 2.2. Copiar Connection String

1. Settings → Database → Connection string
2. Modo: **URI**
3. Copie a string completa
4. Substitua `[YOUR-PASSWORD]` pela senha que você criou

```
postgresql://postgres.xxxxx:[SUA-SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

### 2.3. Executar Migrations

```powershell
cd c:\Projetos\TechTrust\techtrust-backend

# Definir DATABASE_URL (cole sua connection string)
$env:DATABASE_URL="postgresql://postgres.xxxxx:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Executar migrations
npx prisma migrate deploy

# Gerar Prisma Client
npx prisma generate

# Criar usuário admin inicial
npm run seed
```

**✅ Credenciais Admin:**
- Email: `admin@techtrust.com`
- Senha: `admin123` (mude depois!)

---

## 🐙 PASSO 3: GitHub (10 min)

### 3.1. Criar Repositório

1. Acesse https://github.com/new
2. Nome: `techtrust-system`
3. Visibilidade: **Private** (por enquanto)
4. "Create repository"

### 3.2. Push do Código

```powershell
cd c:\Projetos\TechTrust

# Configurar Git (se primeira vez)
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"

# Inicializar (se ainda não fez)
git init
git add .
git commit -m "Initial commit: TechTrust System"

# Adicionar remote (substitua SEU_USUARIO)
git remote add origin https://github.com/SEU_USUARIO/techtrust-system.git
git branch -M main
git push -u origin main
```

---

## 🖥️ PASSO 4: Backend - Render (20 min)

### 4.1. Criar Web Service

1. Acesse https://render.com
2. "New +" → "Web Service"
3. "Connect GitHub" (autorize)
4. Selecione repositório: `techtrust-system`

### 4.2. Configurar Service

- **Name**: `techtrust-api`
- **Region**: `Oregon (US West)`
- **Branch**: `main`
- **Root Directory**: `techtrust-backend`
- **Runtime**: `Node`
- **Build Command**:
  ```
  npm install && npm run build && npx prisma generate
  ```
- **Start Command**:
  ```
  npm start
  ```
- **Instance Type**: `Free`

### 4.3. Adicionar Environment Variables

Clique em "Advanced" → "Add Environment Variable", adicione TODAS:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=[COLE SUA CONNECTION STRING DO SUPABASE]
JWT_SECRET=[GERE UM ALEATÓRIO FORTE - USE GERADOR ABAIXO]
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
```

**🔑 Gerar JWT_SECRET:**
```powershell
# Executar para gerar secret aleatório
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4.4. Deploy

1. "Create Web Service"
2. Aguarde build (~5-10 min)
3. Quando ficar **"Live"** (verde), copie a URL:
   ```
   https://techtrust-api.onrender.com
   ```

### 4.5. Testar

```powershell
# Testar health check
curl https://techtrust-api.onrender.com/health

# Deve retornar: {"status":"OK",...}
```

---

## 🌐 PASSO 5: Dashboards - Vercel (30 min)

### 5.1. Login

```powershell
# Instalar e logar (se ainda não fez)
npm install -g vercel
vercel login
```

### 5.2. Deploy Admin Dashboard

```powershell
cd c:\Projetos\TechTrust\techtrust-admin-dashboard

# Deploy
vercel

# Responda:
# ? Set up and deploy? Yes
# ? Which scope? [seu usuário]
# ? Link to existing project? No
# ? What's your project's name? techtrust-admin
# ? In which directory is your code located? ./
# ? Want to override the settings? No
```

**Copie a URL** (algo como: `https://techtrust-admin-xxx.vercel.app`)

**Adicionar variáveis:**
1. Acesse https://vercel.com/dashboard
2. Selecione `techtrust-admin`
3. Settings → Environment Variables
4. Adicione:
   ```
   NEXT_PUBLIC_API_URL=https://techtrust-api.onrender.com
   ```
5. Clique "Save"
6. Deployments → clique nos 3 pontos do último → "Redeploy"

### 5.3. Deploy Client Dashboard

```powershell
cd c:\Projetos\TechTrust\techtrust-client-dashboard

vercel

# Mesmo processo, nome: techtrust-client
```

**Adicionar variáveis:**
```env
NEXT_PUBLIC_API_URL=https://techtrust-api.onrender.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[SE TIVER]
```

### 5.4. Deploy Provider Dashboard

```powershell
cd c:\Projetos\TechTrust\techtrust-provider-dashboard

vercel

# Mesmo processo, nome: techtrust-provider
```

**Adicionar variáveis:**
```env
NEXT_PUBLIC_API_URL=https://techtrust-api.onrender.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[SE TIVER]
```

### 5.5. Atualizar CORS no Backend

Agora que temos as URLs dos dashboards:

1. Volte no **Render Dashboard**
2. Selecione `techtrust-api`
3. Environment → edite `CORS_ORIGIN`
4. Cole suas URLs reais (separadas por vírgula):
   ```
   https://techtrust-admin-xxx.vercel.app,https://techtrust-client-xxx.vercel.app,https://techtrust-provider-xxx.vercel.app
   ```
5. "Save Changes" (redeploy automático)

---

## 📱 PASSO 6: Mobile - Expo EAS (30 min)

### 6.1. Login e Configurar

```powershell
cd c:\Projetos\TechTrust\techtrust-mobile

# Instalar EAS CLI (se não fez)
npm install -g eas-cli

# Login
eas login

# Configurar
eas build:configure
```

### 6.2. Atualizar app.json

Edite `techtrust-mobile/app.json`, atualize a seção `extra`:

```json
{
  "expo": {
    ...
    "extra": {
      "eas": {
        "projectId": "SEU_PROJECT_ID_AQUI"
      },
      "apiUrl": "https://techtrust-api.onrender.com"
    }
  }
}
```

(O `projectId` é gerado pelo comando anterior)

### 6.3. Build Android APK (para teste)

```powershell
# Build APK
eas build --platform android --profile preview

# Aguarde ~10-15 minutos
# Link para download aparecerá no terminal e no e-mail
```

### 6.4. Testar APK

1. Download do APK no celular Android
2. Instale (pode precisar permitir apps de fontes desconhecidas)
3. Abra e teste login

---

## ✅ PASSO 7: Verificação Final (10 min)

### 7.1. Testar Tudo

**Backend:**
```powershell
curl https://techtrust-api.onrender.com/health
```

**Admin Dashboard:**
1. Acesse sua URL do Vercel
2. Login: `admin@techtrust.com` / `admin123`

**Client Dashboard:**
1. Acesse sua URL do Vercel
2. Crie uma conta de teste

**Provider Dashboard:**
1. Acesse sua URL do Vercel
2. Crie uma conta de fornecedor

**Mobile:**
1. Abra o app no celular
2. Teste login/cadastro

### 7.2. Salvar Informações

Anote em local seguro:

```
=== TECHTRUST - CREDENCIAIS PRODUÇÃO ===

🗄️  Supabase:
   URL: https://app.supabase.com/project/[PROJECT_ID]
   Database Password: [SUA_SENHA]

🖥️  Render (Backend):
   URL: https://techtrust-api.onrender.com
   Dashboard: https://dashboard.render.com

🌐 Vercel (Dashboards):
   Admin: https://techtrust-admin-xxx.vercel.app
   Client: https://techtrust-client-xxx.vercel.app
   Provider: https://techtrust-provider-xxx.vercel.app

👤 Admin Inicial:
   Email: admin@techtrust.com
   Senha: admin123
   ⚠️  TROCAR SENHA URGENTE!

🐙 GitHub:
   Repo: https://github.com/[SEU_USUARIO]/techtrust-system
```

---

## 🎉 PRONTO!

Seu sistema está 100% online e funcionando!

### 📋 Próximos Passos:

1. ✅ Trocar senha do admin
2. ✅ Configurar domínios personalizados (opcional)
3. ✅ Testar todos os fluxos de usuário
4. ✅ Configurar Google Maps API (para busca de endereços)
5. ✅ Configurar Stripe (para pagamentos reais)
6. ✅ Monitorar logs nas primeiras 48h

### 📚 Documentação:

- **Guia Completo**: [DEPLOY_PASSO_A_PASSO.md](DEPLOY_PASSO_A_PASSO.md)
- **Comandos Rápidos**: [COMANDOS_RAPIDOS.md](COMANDOS_RAPIDOS.md)
- **Troubleshooting**: Ver seção no guia completo

### 💰 Custos:

- Render Free: $0/mês
- Vercel Hobby: $0/mês
- Supabase Free: $0/mês
- Expo EAS: $0/mês (builds limitados)

**Total: GRATUITO!** 🎉

---

## 🆘 Problemas?

Se algo não funcionar:

1. Verifique os logs:
   - Render: Dashboard → Logs
   - Vercel: Dashboard → Deployments → View Logs
   
2. Verifique variáveis de ambiente:
   - Todas configuradas?
   - URLs corretas?
   - Sem espaços extras?

3. Teste local primeiro:
   ```powershell
   cd techtrust-backend
   npm run dev
   ```

4. Consulte: [DEPLOY_PASSO_A_PASSO.md](DEPLOY_PASSO_A_PASSO.md)

---

**Boa sorte com o lançamento! 🚀**
