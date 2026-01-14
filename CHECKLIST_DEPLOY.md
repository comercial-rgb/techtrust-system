# ✅ Checklist de Deploy - TechTrust

Use esta lista para acompanhar seu progresso no deploy.

---

## 📋 PRÉ-REQUISITOS

- [ ] Node.js 18+ instalado
- [ ] Git instalado
- [ ] PowerShell configurado
- [ ] Conta GitHub criada
- [ ] Conta Supabase criada
- [ ] Conta Render criada
- [ ] Conta Vercel criada
- [ ] Conta Expo criada

---

## 🗄️ DATABASE (Supabase)

- [ ] Projeto criado no Supabase
- [ ] Senha do database salva em local seguro
- [ ] Connection string copiada
- [ ] Migrations executadas (`npx prisma migrate deploy`)
- [ ] Prisma Client gerado (`npx prisma generate`)
- [ ] Seed executado (`npm run seed`)
- [ ] Admin user criado (admin@techtrust.com)
- [ ] Conexão testada localmente

**✅ Database URL:**
```
postgresql://postgres.xxxxx:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

---

## 🐙 GITHUB

- [ ] Repositório criado (techtrust-system)
- [ ] Git inicializado (`git init`)
- [ ] .gitignore configurado
- [ ] Arquivos commitados
- [ ] Remote adicionado
- [ ] Push inicial feito (`git push -u origin main`)

**✅ Repo URL:**
```
https://github.com/[SEU_USUARIO]/techtrust-system
```

---

## 🖥️ BACKEND (Render)

- [ ] Web Service criado
- [ ] Repositório GitHub conectado
- [ ] Root directory configurado: `techtrust-backend`
- [ ] Build command configurado
- [ ] Start command configurado
- [ ] Variáveis de ambiente adicionadas:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=10000`
  - [ ] `DATABASE_URL=[Supabase]`
  - [ ] `JWT_SECRET=[Gerado]`
  - [ ] `JWT_EXPIRES_IN=7d`
  - [ ] `CORS_ORIGIN=[URLs Vercel]`
- [ ] Deploy concluído (status: Live)
- [ ] Health check funcionando
- [ ] Login admin testado

**✅ API URL:**
```
https://techtrust-api.onrender.com
```

---

## 🌐 ADMIN DASHBOARD (Vercel)

- [ ] Vercel CLI instalado (`npm install -g vercel`)
- [ ] Login feito (`vercel login`)
- [ ] Deploy executado
- [ ] Projeto criado: `techtrust-admin`
- [ ] Variáveis de ambiente configuradas:
  - [ ] `NEXT_PUBLIC_API_URL`
- [ ] Redeploy após adicionar variáveis
- [ ] Dashboard acessível
- [ ] Login admin funcionando

**✅ URL:**
```
https://techtrust-admin-xxx.vercel.app
```

---

## 👥 CLIENT DASHBOARD (Vercel)

- [ ] Deploy executado
- [ ] Projeto criado: `techtrust-client`
- [ ] Variáveis de ambiente configuradas:
  - [ ] `NEXT_PUBLIC_API_URL`
  - [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (opcional)
- [ ] Redeploy após adicionar variáveis
- [ ] Dashboard acessível
- [ ] Registro de cliente testado

**✅ URL:**
```
https://techtrust-client-xxx.vercel.app
```

---

## 🔧 PROVIDER DASHBOARD (Vercel)

- [ ] Deploy executado
- [ ] Projeto criado: `techtrust-provider`
- [ ] Variáveis de ambiente configuradas:
  - [ ] `NEXT_PUBLIC_API_URL`
  - [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (opcional)
- [ ] Redeploy após adicionar variáveis
- [ ] Dashboard acessível
- [ ] Registro de fornecedor testado

**✅ URL:**
```
https://techtrust-provider-xxx.vercel.app
```

---

## 📱 MOBILE APP (Expo EAS)

- [ ] EAS CLI instalado (`npm install -g eas-cli`)
- [ ] Login feito (`eas login`)
- [ ] Projeto configurado (`eas build:configure`)
- [ ] `app.json` atualizado com:
  - [ ] `projectId`
  - [ ] `extra.apiUrl`
- [ ] `eas.json` criado
- [ ] Build Android preview executado
- [ ] APK baixado
- [ ] APK instalado em dispositivo
- [ ] App testado e funcionando

**✅ Build Status:**
```
Acesse: https://expo.dev/accounts/[SEU_USER]/projects/techtrust-mobile/builds
```

---

## 🔄 CORS ATUALIZADO

- [ ] URLs Vercel copiadas
- [ ] CORS_ORIGIN atualizado no Render com todas as URLs
- [ ] Backend redeployado
- [ ] Conexão entre dashboards e API testada

---

## 🧪 TESTES FINAIS

### Backend
- [ ] Health check: `curl https://techtrust-api.onrender.com/health`
- [ ] Login admin via Postman/curl

### Admin Dashboard
- [ ] Acesso à página de login
- [ ] Login com admin@techtrust.com
- [ ] Visualização do dashboard
- [ ] Navegação entre páginas

### Client Dashboard
- [ ] Acesso à página inicial
- [ ] Registro de novo cliente
- [ ] Login de cliente
- [ ] Busca de serviços

### Provider Dashboard
- [ ] Acesso à página inicial
- [ ] Registro de fornecedor
- [ ] Login de fornecedor
- [ ] Visualização de solicitações

### Mobile App
- [ ] App abre sem crash
- [ ] Tela de login carrega
- [ ] Conexão com API funciona
- [ ] Registro/Login funciona
- [ ] Navegação entre telas

---

## 📝 DOCUMENTAÇÃO

- [ ] URLs de produção salvas
- [ ] Credenciais salvas em local seguro
- [ ] Database password anotado
- [ ] JWT_SECRET anotado
- [ ] Repositório GitHub documentado

---

## 🔐 SEGURANÇA

- [ ] Senha do admin trocada (de admin123 para algo forte)
- [ ] .env adicionado ao .gitignore
- [ ] Nenhuma credencial commitada no Git
- [ ] JWT_SECRET aleatório e forte
- [ ] Database password forte

---

## 🎯 PÓS-DEPLOY (Opcional)

- [ ] Domínio personalizado configurado
- [ ] SSL/HTTPS verificado (automático)
- [ ] Google Analytics adicionado
- [ ] Google Maps API configurada
- [ ] Stripe configurado (para pagamentos)
- [ ] Firebase configurado (para notificações)
- [ ] Monitoramento configurado (Sentry, etc.)
- [ ] Backups automáticos configurados
- [ ] Alertas de erro configurados

---

## 💰 CUSTOS

**Plano Gratuito Atual:**
- Render Free: $0/mês (com sleep após inatividade)
- Vercel Hobby: $0/mês
- Supabase Free: $0/mês (até 500MB)
- Expo EAS: $0/mês (builds limitados)

**Total: GRATUITO** ✅

**Upgrade Recomendado (depois de validar):**
- Render Starter: $7/mês (sem sleep, mais recursos)
- Vercel Pro: $20/mês (3 projetos inclusos)
- Supabase Pro: $25/mês (mais storage, backups)

**Total com upgrade: ~$52/mês**

---

## 📊 MÉTRICAS DE SUCESSO

Após deploy, monitore:

- [ ] Backend responde em < 1s (health check)
- [ ] Dashboards carregam em < 3s
- [ ] Mobile conecta sem erros
- [ ] 0 erros de CORS
- [ ] 0 erros de conexão database
- [ ] Login funciona 100%

---

## 🆘 TROUBLESHOOTING

### ❌ Problema: Backend não sobe
**Verificar:**
- [ ] Logs no Render Dashboard
- [ ] DATABASE_URL está correta?
- [ ] Build local funciona? (`npm run build`)
- [ ] Todas variáveis de ambiente configuradas?

### ❌ Problema: Dashboard erro CORS
**Verificar:**
- [ ] CORS_ORIGIN no Render inclui URL do Vercel?
- [ ] Backend foi redeployado após mudar CORS?
- [ ] URL está com https:// ?

### ❌ Problema: Database connection error
**Verificar:**
- [ ] Senha do Supabase está correta?
- [ ] Connection string completa (com porta)?
- [ ] IP whitelist no Supabase (0.0.0.0/0)?

### ❌ Problema: Mobile não conecta API
**Verificar:**
- [ ] `extra.apiUrl` no app.json está correto?
- [ ] URL tem https:// ?
- [ ] Rebuild do app após mudar config?

---

## 🎉 DEPLOY COMPLETO!

Quando todos os checkboxes estiverem marcados, seu sistema está:

✅ **PUBLICADO**  
✅ **FUNCIONANDO**  
✅ **PRONTO PARA USO**

---

## 📞 RECURSOS DE AJUDA

- **Guia Completo**: [DEPLOY_PASSO_A_PASSO.md](DEPLOY_PASSO_A_PASSO.md)
- **Início Rápido**: [INICIO_RAPIDO.md](INICIO_RAPIDO.md)
- **Comandos**: [COMANDOS_RAPIDOS.md](COMANDOS_RAPIDOS.md)

**Render**: https://render.com/docs  
**Vercel**: https://vercel.com/docs  
**Expo**: https://docs.expo.dev/build/introduction/  
**Supabase**: https://supabase.com/docs

---

**Última atualização:** $(Get-Date -Format "dd/MM/yyyy HH:mm")
**Status:** [ ] Em Progresso  [ ] Concluído

---

💡 **Dica**: Imprima este checklist ou mantenha aberto durante o deploy!
