# ============================================
# SCRIPT DE SETUP INICIAL - TECHTRUST
# ============================================
# Este script prepara o ambiente para deploy

Write-Host "🚀 TechTrust - Setup Inicial para Deploy" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
$currentPath = Get-Location
if ($currentPath.Path -notlike "*TechTrust*") {
    Write-Host "❌ Erro: Execute este script da pasta TechTrust" -ForegroundColor Red
    exit 1
}

# 1. Verificar Node.js
Write-Host "📦 Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado! Instale em: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 2. Verificar Git
Write-Host "📦 Verificando Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "✅ Git instalado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git não encontrado! Instale em: https://git-scm.com" -ForegroundColor Red
    exit 1
}

# 3. Instalar CLI tools
Write-Host ""
Write-Host "📦 Instalando ferramentas CLI..." -ForegroundColor Yellow

$installVercel = Read-Host "Instalar Vercel CLI? (s/n)"
if ($installVercel -eq "s") {
    npm install -g vercel
    Write-Host "✅ Vercel CLI instalado" -ForegroundColor Green
}

$installEAS = Read-Host "Instalar EAS CLI? (s/n)"
if ($installEAS -eq "s") {
    npm install -g eas-cli
    Write-Host "✅ EAS CLI instalado" -ForegroundColor Green
}

# 4. Instalar dependências
Write-Host ""
Write-Host "📦 Instalando dependências dos projetos..." -ForegroundColor Yellow

Write-Host "  → Backend..." -ForegroundColor Gray
Set-Location techtrust-backend
npm install
Set-Location ..

Write-Host "  → Admin Dashboard..." -ForegroundColor Gray
Set-Location techtrust-admin-dashboard
npm install
Set-Location ..

Write-Host "  → Client Dashboard..." -ForegroundColor Gray
Set-Location techtrust-client-dashboard
npm install
Set-Location ..

Write-Host "  → Provider Dashboard..." -ForegroundColor Gray
Set-Location techtrust-provider-dashboard
npm install
Set-Location ..

Write-Host "  → Mobile..." -ForegroundColor Gray
Set-Location techtrust-mobile
npm install
Set-Location ..

Write-Host "✅ Todas as dependências instaladas!" -ForegroundColor Green

# 5. Criar .env de exemplo
Write-Host ""
Write-Host "📝 Criando arquivos .env locais..." -ForegroundColor Yellow

if (-not (Test-Path "techtrust-backend\.env")) {
    Copy-Item "techtrust-backend\.env.example" "techtrust-backend\.env"
    Write-Host "✅ Criado: techtrust-backend\.env" -ForegroundColor Green
}

# 6. Inicializar Git (se ainda não foi)
Write-Host ""
Write-Host "🔧 Configurando Git..." -ForegroundColor Yellow

if (-not (Test-Path ".git")) {
    git init
    Write-Host "✅ Git inicializado" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Git já está inicializado" -ForegroundColor Blue
}

# 7. Verificar build local
Write-Host ""
$testBuild = Read-Host "Testar build local do backend? (s/n)"
if ($testBuild -eq "s") {
    Write-Host "🔨 Testando build do backend..." -ForegroundColor Yellow
    Set-Location techtrust-backend
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build do backend OK!" -ForegroundColor Green
    } else {
        Write-Host "❌ Build falhou! Verifique os erros acima." -ForegroundColor Red
    }
    Set-Location ..
}

# 8. Resumo final
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Setup Concluído!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Próximos Passos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 🗄️  Criar projeto no Supabase:" -ForegroundColor White
Write-Host "   → https://supabase.com" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 🔑 Configurar variáveis de ambiente:" -ForegroundColor White
Write-Host "   → Edite: techtrust-backend\.env" -ForegroundColor Gray
Write-Host "   → Adicione DATABASE_URL do Supabase" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 🗃️  Executar migrations:" -ForegroundColor White
Write-Host "   → cd techtrust-backend" -ForegroundColor Gray
Write-Host "   → npx prisma migrate deploy" -ForegroundColor Gray
Write-Host "   → npm run seed" -ForegroundColor Gray
Write-Host ""
Write-Host "4. 🖥️  Deploy no Render:" -ForegroundColor White
Write-Host "   → https://render.com" -ForegroundColor Gray
Write-Host "   → Conecte o repositório GitHub" -ForegroundColor Gray
Write-Host ""
Write-Host "5. 🌐 Deploy no Vercel:" -ForegroundColor White
Write-Host "   → vercel login" -ForegroundColor Gray
Write-Host "   → cd techtrust-admin-dashboard && vercel" -ForegroundColor Gray
Write-Host ""
Write-Host "6. 📱 Build Mobile:" -ForegroundColor White
Write-Host "   → eas login" -ForegroundColor Gray
Write-Host "   → cd techtrust-mobile" -ForegroundColor Gray
Write-Host "   → eas build --platform android --profile preview" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Guia completo: DEPLOY_PASSO_A_PASSO.md" -ForegroundColor Cyan
Write-Host "⚡ Comandos rápidos: COMANDOS_RAPIDOS.md" -ForegroundColor Cyan
Write-Host ""
