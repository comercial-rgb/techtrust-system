# 🚀 COMO RODAR O DASHBOARD

## Opção 1: Script Automático (Recomendado)

### Windows:
```
Dê duplo clique em: setup.bat
```

### Mac/Linux:
```bash
chmod +x setup.sh
./setup.sh
```

---

## Opção 2: Manual

### Passo 1 - Instalar dependências
```bash
npm install
```

### Passo 2 - Rodar o projeto
```bash
npm run dev
```

### Passo 3 - Abrir no navegador
```
http://localhost:3000
```

---

## 🔐 Login de Teste

Use qualquer email e senha:
```
Email: fornecedor@teste.com
Senha: 123456
```

---

## 📱 Telas Disponíveis

| URL | Tela |
|-----|------|
| /login | Login |
| /dashboard | Dashboard |
| /pedidos | Lista de Pedidos |
| /pedidos/1 | Detalhes do Pedido |
| /orcamentos | Lista de Orçamentos |
| /servicos | Lista de Serviços |
| /servicos/1 | Detalhes do Serviço |
| /configuracoes | Configurações |

---

## ❓ Problemas?

### "Port 3000 is already in use"
```bash
npm run dev:3001
```
Então acesse: http://localhost:3001

### Erro de dependências
```bash
rm -rf node_modules
npm install
```

---

## 📖 Guia Completo

Para instruções detalhadas de teste, veja:
**GUIA_COMPLETO.md**
