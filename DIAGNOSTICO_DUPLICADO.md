# 🔍 Diagnóstico: Erro de E-mail/Telefone Duplicado

## ✅ Status do Banco de Dados

O banco foi verificado e está **LIMPO**:
- ✅ **Apenas 1 usuário**: admin@techtrust.com
- ✅ **0 clientes/fornecedores** cadastrados
- ✅ Script `npm run clean-db` funcionou corretamente

---

## ⚠️ Importante: E-mail e Telefone do Admin

O único usuário no banco é:
- 📧 **E-mail:** `admin@techtrust.com`
- 📱 **Telefone:** `+5511999999999`

**NÃO USE esses dados para cadastro no app!** Eles já estão em uso pelo admin.

---

## 🧪 Como Testar Cadastro no App

### 1. Use dados DIFERENTES do admin

✅ **Exemplos válidos de teste:**

```
Nome: João Silva
E-mail: joao.silva@teste.com
Telefone: +5511988887777
Senha: Senha@123
```

```
Nome: Maria Santos  
E-mail: maria@email.com
Telefone: +5511977776666
Senha: Senha@456
```

### 2. Formato do Telefone

O telefone deve estar no formato **E.164**:
- ✅ `+5511999998888` (correto)
- ❌ `(11) 99999-8888` (errado)
- ❌ `11999998888` (errado)

O app já formata automaticamente, mas verifique se está com `+55`.

---

## 🔄 Se o Erro Persistir

### Opção 1: Verificar logs do backend

```powershell
cd c:\Projetos\TechTrust\techtrust-backend
npm run dev
```

Ao tentar cadastrar no app, os logs mostrarão se é e-mail ou telefone duplicado.

### Opção 2: Verificar usuários no banco

```powershell
cd c:\Projetos\TechTrust\techtrust-backend
npx ts-node prisma/check-users.ts
```

Isso mostra TODOS os usuários cadastrados.

### Opção 3: Limpar cache do app mobile

No app:
1. Feche completamente o app
2. Limpe cache do Expo (se estiver usando Expo Go)
3. Reabra o app

---

## 🐛 Logs Melhorados

Adicionei logs no backend que mostram **qual e-mail/telefone** está tentando duplicar:

```
⚠️ Tentativa de cadastro com email duplicado: usuario@teste.com
⚠️ Tentativa de cadastro com telefone duplicado: +5511999999999
```

Esses logs aparecerão no terminal do backend quando houver erro.

---

## ✅ Teste Completo

1. **Limpar banco:** `npm run clean-db`
2. **Verificar banco:** `npx ts-node prisma/check-users.ts`
3. **Iniciar backend:** `npm run dev`
4. **Abrir app mobile**
5. **Cadastrar com dados novos** (não use admin@techtrust.com ou +5511999999999)
6. **Verificar logs** no terminal do backend

---

## 📝 Comandos Rápidos

```powershell
# No diretório techtrust-backend

# Limpar banco
npm run clean-db

# Verificar usuários
npx ts-node prisma/check-users.ts

# Iniciar servidor
npm run dev
```

---

**Data:** 18/01/2026  
**Status:** Banco limpo, logs melhorados, pronto para testes
