# Configuração de Domínio — TechTrust Auto Solutions
## techtrustautosolutions.com (GoDaddy)

---

## 📋 Visão Geral da Arquitetura

| Subdomínio | Dashboard | Deploy |
|---|---|---|
| `provider.techtrustautosolutions.com` | Provider Dashboard (cadastro, login, dashboard) | Vercel / VPS |
| `admin.techtrustautosolutions.com` | Admin Dashboard | Vercel / VPS |
| `app.techtrustautosolutions.com` | Client Dashboard | Vercel / VPS |
| `api.techtrustautosolutions.com` | Backend API | VPS / Railway |
| `techtrustautosolutions.com` | Landing page principal (ou redirect) | Vercel |

---

## 🔗 Link de Cadastro para Compartilhar

Após a configuração, o link público para compartilhar em **Linktree, site, redes sociais** etc:

```
https://provider.techtrustautosolutions.com/register
```

### Links alternativos que também funcionam (redirecionam para /register):
- `https://provider.techtrustautosolutions.com/cadastro`
- `https://provider.techtrustautosolutions.com/signup`
- `https://provider.techtrustautosolutions.com/registro`

---

## 🚀 Opção 1: Deploy na Vercel (Recomendado)

### Passo 1: Deploy do Projeto

```bash
# Na raiz do techtrust-provider-dashboard
cd techtrust-provider-dashboard

# Instalar Vercel CLI (se não tiver)
npm i -g vercel

# Deploy
vercel

# Para produção
vercel --prod
```

### Passo 2: Adicionar Domínio na Vercel

1. Acesse **https://vercel.com/dashboard**
2. Selecione o projeto **techtrust-provider-dashboard**
3. Vá em **Settings → Domains**
4. Adicione: `provider.techtrustautosolutions.com`
5. A Vercel vai mostrar os registros DNS necessários

### Passo 3: Configurar DNS no GoDaddy

1. Acesse **https://dcc.godaddy.com/manage/techtrustautosolutions.com/dns**
2. Login na sua conta GoDaddy
3. Vá em **DNS Management** do domínio `techtrustautosolutions.com`

#### Registros DNS a adicionar:

**Para Vercel:**

| Tipo | Nome | Valor | TTL |
|---|---|---|---|
| `CNAME` | `provider` | `cname.vercel-dns.com` | 600 |
| `CNAME` | `admin` | `cname.vercel-dns.com` | 600 |
| `CNAME` | `app` | `cname.vercel-dns.com` | 600 |

**Para o domínio raiz (techtrustautosolutions.com):**

| Tipo | Nome | Valor | TTL |
|---|---|---|---|
| `A` | `@` | `76.76.21.21` | 600 |

> **Nota:** O IP `76.76.21.21` é o IP da Vercel. Se usar outra plataforma, mude conforme necessário.

**Para API (se estiver em VPS separada):**

| Tipo | Nome | Valor | TTL |
|---|---|---|---|
| `A` | `api` | `SEU_IP_DO_SERVIDOR` | 600 |

---

## 🖥️ Opção 2: Deploy em VPS (DigitalOcean, AWS, etc.)

### Passo 1: Build do projeto

```bash
cd techtrust-provider-dashboard
npm install
npm run build
```

### Passo 2: Configurar Nginx

```nginx
# /etc/nginx/sites-available/provider.techtrustautosolutions.com

server {
    listen 80;
    server_name provider.techtrustautosolutions.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name provider.techtrustautosolutions.com;

    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/provider.techtrustautosolutions.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/provider.techtrustautosolutions.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy origin-when-cross-origin;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Passo 3: SSL com Let's Encrypt

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot --nginx -d provider.techtrustautosolutions.com

# Ativar site
sudo ln -s /etc/nginx/sites-available/provider.techtrustautosolutions.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Passo 4: PM2 para manter online

```bash
# Instalar PM2
npm install -g pm2

# Iniciar
cd /var/www/techtrust-provider-dashboard
pm2 start npm --name "provider-dashboard" -- start
pm2 save
pm2 startup
```

### Passo 5: DNS no GoDaddy (para VPS)

| Tipo | Nome | Valor | TTL |
|---|---|---|---|
| `A` | `provider` | `IP_DO_SEU_SERVIDOR` | 600 |
| `A` | `admin` | `IP_DO_SEU_SERVIDOR` | 600 |
| `A` | `app` | `IP_DO_SEU_SERVIDOR` | 600 |
| `A` | `api` | `IP_DO_SEU_SERVIDOR` | 600 |
| `A` | `@` | `IP_DO_SEU_SERVIDOR` | 600 |

---

## ⚙️ Variáveis de Ambiente (Produção)

Crie o arquivo `.env.production` no provider-dashboard:

```env
# Provider Dashboard - Production
NEXT_PUBLIC_API_URL=https://api.techtrustautosolutions.com/api/v1
NEXT_PUBLIC_SITE_URL=https://provider.techtrustautosolutions.com
```

Para o Backend:

```env
# Backend - Production  
DATABASE_URL=postgresql://...
CORS_ORIGINS=https://provider.techtrustautosolutions.com,https://admin.techtrustautosolutions.com,https://app.techtrustautosolutions.com
```

---

## 📱 Configuração Linktree

Após tudo configurado, adicione no seu Linktree:

1. **Título:** `Register Your Auto Shop — Free` (ou em PT/ES)
2. **URL:** `https://provider.techtrustautosolutions.com/register`
3. **Thumbnail:** Use a logo da TechTrust

### Outros links para o Linktree:
- `https://techtrustautosolutions.com` → Site principal
- `https://provider.techtrustautosolutions.com/register` → Cadastro de providers
- Link da App Store (quando publicado)
- Link do Google Play (quando publicado)

---

## ✅ Checklist de Configuração

- [ ] Deploy do provider-dashboard (Vercel ou VPS)
- [ ] Configurar DNS no GoDaddy (CNAME/A records)
- [ ] Aguardar propagação DNS (até 48h, geralmente 15-30 min)
- [ ] Configurar SSL (automático na Vercel, Let's Encrypt no VPS)
- [ ] Configurar variáveis de ambiente de produção
- [ ] Testar `https://provider.techtrustautosolutions.com/register`
- [ ] Testar compartilhamento do link (preview no WhatsApp, Facebook, etc.)
- [ ] Adicionar link no Linktree
- [ ] Configurar CORS no backend para o novo domínio
- [ ] Repetir para admin e client dashboards

---

## 🔍 Verificar Propagação DNS

```bash
# Verificar se o DNS propagou
dig provider.techtrustautosolutions.com
nslookup provider.techtrustautosolutions.com

# Verificar HTTPS
curl -I https://provider.techtrustautosolutions.com/register
```

Ou use: https://www.whatsmydns.net/#CNAME/provider.techtrustautosolutions.com

---

## 📊 Deploy de Todos os Dashboards

| Dashboard | Diretório | Porta Local | Subdomínio |
|---|---|---|---|
| Provider | `techtrust-provider-dashboard/` | 3001 | `provider.techtrustautosolutions.com` |
| Admin | `techtrust-admin-dashboard/` | 3002 | `admin.techtrustautosolutions.com` |
| Client | `techtrust-client-dashboard/` | 3003 | `app.techtrustautosolutions.com` |
| Backend | `techtrust-backend/` | 3000 | `api.techtrustautosolutions.com` |

---

## 🆘 Troubleshooting

### DNS não propaga
- Verifique que não há conflito de registros (ex: A e CNAME no mesmo nome)
- Aguarde até 48h para propagação completa
- Limpe cache DNS local: `sudo dscacheutil -flushcache` (macOS)

### CORS errors
- Adicione o novo domínio no CORS_ORIGINS do backend
- Verifique que a URL inclui `https://` e não tem trailing slash

### SSL não funciona
- Vercel: automático, basta esperar os DNS propagarem
- VPS: execute `sudo certbot --nginx -d provider.techtrustautosolutions.com`

### Página não carrega
- Verifique que a variável `NEXT_PUBLIC_API_URL` aponta para o backend correto
- Verifique os logs: `pm2 logs provider-dashboard` (VPS) ou dashboard da Vercel
