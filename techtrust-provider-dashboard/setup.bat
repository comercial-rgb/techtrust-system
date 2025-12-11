@echo off
echo ========================================
echo  TechTrust Provider Dashboard - Setup
echo ========================================
echo.

echo [1/3] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Baixe em: https://nodejs.org/
    pause
    exit /b 1
)
echo OK - Node.js instalado

echo.
echo [2/3] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependencias
    pause
    exit /b 1
)
echo OK - Dependencias instaladas

echo.
echo [3/3] Iniciando servidor de desenvolvimento...
echo.
echo ========================================
echo  Dashboard disponivel em:
echo  http://localhost:3000
echo ========================================
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

call npm run dev
