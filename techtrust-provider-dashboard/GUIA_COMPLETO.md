# 🏢 TechTrust Provider Dashboard - Guia Completo

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Requisitos](#requisitos)
3. [Instalação](#instalação)
4. [Configuração](#configuração)
5. [Executando o Projeto](#executando-o-projeto)
6. [Testando as Funcionalidades](#testando-as-funcionalidades)
7. [Estrutura do Projeto](#estrutura-do-projeto)
8. [Screenshots das Telas](#screenshots-das-telas)

---

## 🎯 Visão Geral

O **TechTrust Provider Dashboard** é o portal web para fornecedores de serviços automotivos (oficinas, borracharias, guinchos, etc.) gerenciarem:

- 📋 **Pedidos** - Visualizar solicitações de clientes na região
- 💰 **Orçamentos** - Criar e acompanhar orçamentos enviados
- 🔧 **Serviços** - Gerenciar trabalhos em andamento
- ⚙️ **Configurações** - Perfil, horários, serviços oferecidos

### Stack Tecnológica
- **Next.js 14** - Framework React com SSR
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização utilitária
- **Axios** - Cliente HTTP
- **Lucide React** - Ícones

---

## 💻 Requisitos

### Software Necessário
- **Node.js** 18+ (recomendado 20 LTS)
- **npm** 9+ ou **yarn** 1.22+
- **Git** (opcional)

### Verificar Instalação
```bash
node --version   # deve mostrar v18+ ou v20+
npm --version    # deve mostrar 9+
```

### Instalar Node.js (se necessário)
- **Windows**: Baixe de https://nodejs.org/
- **Mac**: `brew install node`
- **Linux**: `sudo apt install nodejs npm`

---

## 📦 Instalação

### Passo 1: Extrair/Copiar o Projeto

Se você baixou o ZIP:
```bash
# Extrair o arquivo
unzip techtrust-provider-dashboard.zip

# Entrar na pasta
cd techtrust-provider-dashboard
```

Se copiou a pasta:
```bash
cd caminho/para/techtrust-provider-dashboard
```

### Passo 2: Instalar Dependências

```bash
npm install
```

Isso instalará:
- next, react, react-dom
- axios (requisições HTTP)
- lucide-react (ícones)
- tailwindcss (estilos)
- typescript e tipos

### Passo 3: Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env.local

# Editar (opcional - já tem valor padrão)
# NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

---

## ⚙️ Configuração

### Arquivo .env.local

```env
# URL da API Backend (ajuste se necessário)
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### Modos de Operação

| Modo | Descrição |
|------|-----------|
| **Sem Backend** | Funciona com dados mockados (padrão) |
| **Com Backend** | Conecta ao techtrust-backend real |

> ⚠️ **Nota**: O dashboard funciona perfeitamente sem o backend, usando dados de demonstração!

---

## 🚀 Executando o Projeto

### Iniciar em Modo Desenvolvimento

```bash
npm run dev
```

Você verá:
```
▲ Next.js 14.0.4
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in 2.3s
```

### Acessar no Navegador

Abra: **http://localhost:3000**

> Se a porta 3000 estiver ocupada (pelo backend), o Next.js usará 3001 automaticamente.

### Outros Comandos

```bash
npm run build    # Gerar build de produção
npm run start    # Rodar build de produção
npm run lint     # Verificar código
```

---

## 🧪 Testando as Funcionalidades

### 1️⃣ Tela de Login (`/login`)

**URL**: http://localhost:3000/login

**O que testar**:
- [ ] Layout responsivo (redimensione a janela)
- [ ] Campo de email com validação
- [ ] Campo de senha com toggle mostrar/ocultar
- [ ] Checkbox "Lembrar de mim"
- [ ] Link "Esqueci a senha"
- [ ] Botão de login com loading state
- [ ] Estatísticas no painel direito (desktop)

**Para fazer login (modo demo)**:
- Qualquer email/senha funciona
- O sistema simula autenticação e redireciona ao dashboard

**Credenciais de teste**:
```
Email: fornecedor@teste.com
Senha: 123456
```

---

### 2️⃣ Dashboard (`/dashboard`)

**URL**: http://localhost:3000/dashboard (após login)

**O que testar**:
- [ ] Banner de boas-vindas com nome do fornecedor
- [ ] Cards de estatísticas (4 cards)
  - Pedidos Pendentes
  - Serviços Ativos
  - Concluídos (mês)
  - Ganhos (mês)
- [ ] Indicadores de tendência (+15%, +8%, etc.)
- [ ] Lista de atividade recente
- [ ] Card de avaliação (estrelas)
- [ ] Ações rápidas (3 botões)
- [ ] Sidebar responsivo (menu hambúrguer no mobile)
- [ ] Menu dropdown do usuário (canto superior direito)
- [ ] Skeleton loading (recarregue a página)

---

### 3️⃣ Lista de Pedidos (`/pedidos`)

**URL**: http://localhost:3000/pedidos

**O que testar**:
- [ ] Campo de busca (digite "Honda" ou "Civic")
- [ ] Filtro "Todos" vs "Urgentes"
- [ ] Cards de pedidos com:
  - Ícone do tipo de serviço
  - Badge de urgente (quando aplicável)
  - Informações do veículo
  - Localização do cliente
  - Tempo restante para orçar
  - Contador de orçamentos enviados
- [ ] Hover effect nos cards
- [ ] Clique em um pedido para ver detalhes

**Dados de teste incluídos**:
- 4 pedidos de exemplo
- 1 pedido urgente (freio fazendo barulho)
- Diferentes tipos de serviço

---

### 4️⃣ Detalhes do Pedido (`/pedidos/[id]`)

**URL**: http://localhost:3000/pedidos/1

**O que testar**:
- [ ] Botão voltar funcional
- [ ] Header com tipo de serviço e tempo restante
- [ ] Descrição completa do pedido
- [ ] Card do cliente (nome, telefone, localização)
- [ ] Card do veículo (marca, modelo, ano, placa, km)
- [ ] Seção de criar orçamento:
  - [ ] Botão "Criar Orçamento"
  - [ ] Formulário com campos:
    - Custo das Peças ($)
    - Mão de Obra ($)
    - Descrição do Serviço
    - Tempo Estimado (dropdown)
    - Observações
  - [ ] Cálculo automático do total
  - [ ] Aviso de comissão (10%)
  - [ ] Botão enviar com loading
  - [ ] Mensagem de sucesso após envio

**Teste de envio de orçamento**:
1. Clique em "Criar Orçamento"
2. Preencha: Peças $200, M.O. $150
3. Descrição: "Troca de óleo sintético 5W30"
4. Tempo: 1 hora
5. Clique "Enviar Orçamento"
6. Aguarde loading e veja mensagem de sucesso

---

### 5️⃣ Lista de Orçamentos (`/orcamentos`)

**URL**: http://localhost:3000/orcamentos

**O que testar**:
- [ ] Cards de estatísticas (5 cards):
  - Total
  - Aguardando
  - Aceitos
  - Recusados
  - Taxa de Conversão (%)
- [ ] Indicador de tendência na taxa
- [ ] Campo de busca
- [ ] Filtro por status (dropdown)
- [ ] Lista de orçamentos com:
  - Status colorido (badge)
  - Valor total
  - Tempo restante (para pendentes)
  - Detalhamento (peças, M.O., tempo)
  - Data de criação
  - Link para ver serviço (se aceito)

**Dados de teste incluídos**:
- 5 orçamentos em diferentes status
- 2 pendentes, 1 aceito, 1 recusado, 1 expirado

---

### 6️⃣ Lista de Serviços (`/servicos`)

**URL**: http://localhost:3000/servicos

**O que testar**:
- [ ] Cards de status (4 mini cards):
  - Aguardando
  - Em Andamento
  - Aguardando Aprovação
  - Concluídos
- [ ] Campo de busca
- [ ] Filtro por status (dropdown)
- [ ] Lista de work orders com:
  - Ícone de status
  - Título e descrição
  - Nome do cliente
  - Veículo
  - Valor
  - Data de criação
  - Info adicional por status
- [ ] Clique em um serviço para ver detalhes

**Dados de teste incluídos**:
- 4 work orders em diferentes status

---

### 7️⃣ Detalhes do Serviço (`/servicos/[id]`)

**URL**: http://localhost:3000/servicos/1

**O que testar**:
- [ ] Header com status e valor
- [ ] Descrição do serviço
- [ ] Botões de ação:
  - 🟢 "Iniciar Serviço" (se status PENDING_START)
  - ✅ "Concluir Serviço" (se status IN_PROGRESS)
  - 📞 "Ligar para Cliente"
  - 💬 "Enviar Mensagem"
- [ ] Card do cliente
- [ ] Card do veículo
- [ ] Detalhes do orçamento:
  - Descrição do serviço
  - Custo de peças
  - Mão de obra
  - Tempo estimado
  - Total
  - Observações
- [ ] Timeline de eventos

**Teste de Iniciar Serviço**:
1. Acesse um serviço com status "Aguardando"
2. Clique em "Iniciar Serviço"
3. Aguarde loading
4. Veja status mudar para "Em Andamento"
5. Timeline atualizada

**Teste de Concluir Serviço**:
1. Acesse um serviço com status "Em Andamento"
2. Clique em "Concluir Serviço"
3. Modal abre com:
   - Campo valor final (editável)
   - Campo observações
   - Botão adicionar fotos
4. Clique "Confirmar"
5. Status muda para "Aguardando Aprovação"

---

### 8️⃣ Configurações (`/configuracoes`)

**URL**: http://localhost:3000/configuracoes

**O que testar**:

#### Aba "Perfil"
- [ ] Header com logo e info do fornecedor
- [ ] Badge "Verificado"
- [ ] Formulário editável:
  - Nome do Negócio
  - Tipo de Negócio (dropdown)
  - Descrição
  - Telefone
  - Email
  - Endereço completo
  - Raio de atendimento (km)
- [ ] Botão "Salvar Alterações"
- [ ] Mensagem de sucesso

#### Aba "Serviços"
- [ ] Cards selecionáveis (5 tipos)
- [ ] Visual de selecionado vs não selecionado
- [ ] Clique para toggle
- [ ] Salvar alterações

#### Aba "Horários"
- [ ] 7 linhas (seg a dom)
- [ ] Checkbox "Aberto"
- [ ] Inputs de horário (abertura/fechamento)
- [ ] "Fechado" quando desmarcado
- [ ] Salvar alterações

#### Aba "Notificações"
- [ ] 5 toggles de notificação
- [ ] Toggle switches funcionais
- [ ] Descrição de cada tipo
- [ ] Salvar alterações

#### Aba "Segurança"
- [ ] Botão "Alterar senha"
- [ ] Botão "Autenticação em dois fatores"
- [ ] Email de recuperação
- [ ] Botão "Sair da conta" (logout)

---

### 9️⃣ Sidebar e Navegação

**O que testar**:
- [ ] Logo clicável (vai para dashboard)
- [ ] Info do fornecedor (nome, rating)
- [ ] Badge "Verificado"
- [ ] Links de navegação (5 itens)
- [ ] Item ativo destacado
- [ ] Badge de contador em "Pedidos"
- [ ] Botão Sair (logout)
- [ ] **Mobile**: menu hambúrguer
- [ ] **Mobile**: overlay ao abrir sidebar
- [ ] **Mobile**: fechar ao clicar fora

---

### 🔟 Header

**O que testar**:
- [ ] Título da página atual
- [ ] Botão de notificações (sino com badge)
- [ ] Menu dropdown do usuário
- [ ] Opções: Configurações, Sair

---

## 📁 Estrutura do Projeto

```
techtrust-provider-dashboard/
├── .env.example              # Variáveis de ambiente
├── next.config.js            # Config do Next.js
├── package.json              # Dependências
├── postcss.config.js         # Config PostCSS
├── tailwind.config.js        # Config Tailwind
├── tsconfig.json             # Config TypeScript
├── README.md                 # Este arquivo
│
└── src/
    ├── components/
    │   ├── DashboardLayout.tsx   # Layout com sidebar
    │   └── Toast.tsx             # Sistema de notificações
    │
    ├── contexts/
    │   └── AuthContext.tsx       # Contexto de autenticação
    │
    ├── pages/
    │   ├── _app.tsx              # App wrapper
    │   ├── _document.tsx         # HTML document
    │   ├── index.tsx             # Redirect para login/dashboard
    │   ├── login.tsx             # Tela de login
    │   ├── dashboard.tsx         # Dashboard principal
    │   │
    │   ├── pedidos/
    │   │   ├── index.tsx         # Lista de pedidos
    │   │   └── [id].tsx          # Detalhes + criar orçamento
    │   │
    │   ├── orcamentos/
    │   │   └── index.tsx         # Lista de orçamentos
    │   │
    │   ├── servicos/
    │   │   ├── index.tsx         # Lista de work orders
    │   │   └── [id].tsx          # Detalhes + ações
    │   │
    │   └── configuracoes/
    │       └── index.tsx         # Configurações (5 abas)
    │
    ├── services/
    │   └── api.ts                # Cliente Axios
    │
    └── styles/
        └── globals.css           # Estilos globais + Tailwind
```

---

## 📸 Resumo das Telas

| # | Tela | Rota | Funcionalidades Principais |
|---|------|------|---------------------------|
| 1 | Login | `/login` | Autenticação, branding |
| 2 | Dashboard | `/dashboard` | Stats, atividades, ações |
| 3 | Pedidos | `/pedidos` | Lista, busca, filtros |
| 4 | Detalhes Pedido | `/pedidos/[id]` | Info, criar orçamento |
| 5 | Orçamentos | `/orcamentos` | Lista, stats, conversão |
| 6 | Serviços | `/servicos` | Lista, status, filtros |
| 7 | Detalhes Serviço | `/servicos/[id]` | Timeline, iniciar/concluir |
| 8 | Configurações | `/configuracoes` | 5 abas de settings |

---

## 🐛 Solução de Problemas

### Erro: "Port 3000 is already in use"
```bash
# Usar outra porta
npm run dev -- -p 3001
```

### Erro: "Module not found"
```bash
# Reinstalar dependências
rm -rf node_modules
npm install
```

### Erro: "EACCES permission denied"
```bash
# Mac/Linux - Corrigir permissões npm
sudo chown -R $USER ~/.npm
```

### Tela branca / Erro de hydration
```bash
# Limpar cache do Next.js
rm -rf .next
npm run dev
```

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os requisitos (Node.js 18+)
2. Reinstale dependências (`npm install`)
3. Verifique o console do navegador (F12)
4. Verifique o terminal onde roda o projeto

---

## 🎉 Pronto!

O dashboard está funcionando quando você:
1. ✅ Consegue acessar http://localhost:3000
2. ✅ Consegue fazer login
3. ✅ Vê o dashboard com estatísticas
4. ✅ Consegue navegar entre as páginas
5. ✅ Consegue criar um orçamento
6. ✅ Consegue iniciar/concluir um serviço

**Bom teste!** 🚀
