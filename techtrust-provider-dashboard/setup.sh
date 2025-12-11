#!/bin/bash

echo "========================================"
echo " TechTrust Provider Dashboard - Setup"
echo "========================================"
echo ""

echo "[1/3] Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERRO: Node.js não encontrado!"
    echo "Instale com: brew install node (Mac) ou apt install nodejs (Linux)"
    exit 1
fi
echo "OK - Node.js $(node --version) instalado"

echo ""
echo "[2/3] Instalando dependências..."
npm install
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao instalar dependências"
    exit 1
fi
echo "OK - Dependências instaladas"

echo ""
echo "[3/3] Iniciando servidor de desenvolvimento..."
echo ""
echo "========================================"
echo " Dashboard disponível em:"
echo " http://localhost:3000"
echo "========================================"
echo ""
echo "Pressione Ctrl+C para parar o servidor"
echo ""

npm run dev
