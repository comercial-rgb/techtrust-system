# 🎯 DEPLOY RÁPIDO - 1 PÁGINA

## ⏱️ Tempo Total: 2-3 horas | Custo: $0/mês

---

## 1️⃣ SUPABASE (15 min)

```
1. https://supabase.com → New project
2. Nome: techtrust-prod | Região: São Paulo
3. Copiar Connection String (Settings → Database)
4. Executar:
```

```powershell
cd c:\Projetos\TechTrust\techtrust-backend
$env:DATABASE_URL="postgresql://postgres.xxxxx:SENHA@...supabase.com:5432/postgres"
npx prisma migrate deploy
npx prisma generate
npm run seed
```

✅ **Admin**: admin@techtrust.com / admin123

---

## 2️⃣ GITHUB (10 min)

```powershell
cd c:\Projetos\TechTrust
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SEU_USUARIO/techtrust-system.git
git push -u origin main
```

---

## 3️⃣ RENDER - Backend (20 min)

```
1. https://render.com → New Web Service
2. Connect GitHub → techtrust-system
3. Configurar:
   - Name: techtrust-api
   - Root Directory: techtrust-backend
   - Build: npm install && npm run build && npx prisma generate
   - Start: npm start
   
4. Environment Variables:
```

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=[Cole do Supabase]
JWT_SECRET=[Gere: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"]
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
```

```
5. Create Web Service (aguarde 10 min)
6. Copie URL: https://techtrust-api.onrender.com
```

**Testar**: `curl https://techtrust-api.onrender.com/health`

---

## 4️⃣ VERCEL - Dashboards (30 min)

```powershell
npm install -g vercel
vercel login
```

### Admin:
```powershell
cd c:\Projetos\TechTrust\techtrust-admin-dashboard
vercel
# Nome: techtrust-admin
```
→ Settings → Environment Variables → `NEXT_PUBLIC_API_URL=https://techtrust-api.onrender.com` → Redeploy

### Client:
```powershell
cd c:\Projetos\TechTrust\techtrust-client-dashboard
vercel
# Nome: techtrust-client
```
→ Settings → Environment Variables → `NEXT_PUBLIC_API_URL=https://techtrust-api.onrender.com` → Redeploy

### Provider:
```powershell
cd c:\Projetos\TechTrust\techtrust-provider-dashboard
vercel
# Nome: techtrust-provider
```
→ Settings → Environment Variables → `NEXT_PUBLIC_API_URL=https://techtrust-api.onrender.com` → Redeploy

**Atualizar CORS**: Render → techtrust-api → Environment → `CORS_ORIGIN=[URLs Vercel separadas por vírgula]`

---

## 5️⃣ EXPO - Mobile (30 min)

```powershell
cd c:\Projetos\TechTrust\techtrust-mobile
npm install -g eas-cli
eas login
eas build:configure
```

**Editar app.json** → `extra.apiUrl`: `"https://techtrust-api.onrender.com"`

```powershell
eas build --platform android --profile preview
# Aguarde 15 min → Download APK → Instale no celular
```

---

## ✅ PRONTO!

```
🖥️  API:      https://techtrust-api.onrender.com
👨‍💼 Admin:    https://techtrust-admin-xxx.vercel.app
👥 Client:   https://techtrust-client-xxx.vercel.app
🔧 Provider: https://techtrust-provider-xxx.vercel.app
📱 Mobile:   APK instalado

👤 Login Admin: admin@techtrust.com / admin123
```

---

## 🚨 Troubleshooting

| Problema | Solução |
|----------|---------|
| Backend não sobe | Logs no Render → Verifique DATABASE_URL |
| Dashboard não conecta | CORS_ORIGIN no Render com URLs Vercel |
| Database error | Senha correta? IP whitelist 0.0.0.0/0? |
| Mobile não conecta | apiUrl correto no app.json? Rebuild |

---

## 📚 Documentação Completa

- **Guia Detalhado**: [DEPLOY_PASSO_A_PASSO.md](DEPLOY_PASSO_A_PASSO.md)
- **Comandos**: [COMANDOS_RAPIDOS.md](COMANDOS_RAPIDOS.md)  
- **Checklist**: [CHECKLIST_DEPLOY.md](CHECKLIST_DEPLOY.md)

---

**💰 Custo**: GRATUITO | **⏱️ Uptime**: 99.9% | **🔒 SSL**: Automático
