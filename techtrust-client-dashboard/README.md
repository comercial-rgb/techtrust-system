# TechTrust - Dashboard Web do Cliente

Portal web para clientes do TechTrust gerenciarem seus veículos, solicitações de serviço e acompanharem ordens de serviço.

## 🚀 Stack Tecnológica

- **Next.js 14** - Framework React com SSR
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização utilitária
- **Lucide React** - Ícones modernos
- **js-cookie** - Gerenciamento de cookies

## 📁 Estrutura do Projeto

```
techtrust-client-dashboard/
├── src/
│   ├── components/
│   │   └── DashboardLayout.tsx    # Layout principal com sidebar
│   ├── contexts/
│   │   └── AuthContext.tsx        # Contexto de autenticação
│   ├── pages/
│   │   ├── _app.tsx               # App wrapper
│   │   ├── _document.tsx          # Document customizado
│   │   ├── index.tsx              # Redirect inicial
│   │   ├── login.tsx              # Página de login
│   │   ├── dashboard.tsx          # Dashboard principal
│   │   ├── perfil.tsx             # Perfil do usuário
│   │   ├── veiculos/
│   │   │   └── index.tsx          # Lista de veículos
│   │   ├── solicitacoes/
│   │   │   └── index.tsx          # Lista de solicitações
│   │   └── servicos/
│   │       └── index.tsx          # Lista de serviços
│   └── styles/
│       └── globals.css            # Estilos globais
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

## 🎨 Telas Implementadas

### 1. Login (`/login`)
- Design moderno com duas colunas
- Formulário de login com validação
- Toggle de visibilidade de senha
- Seção de features no lado direito
- Modo demo (qualquer email/senha)

### 2. Dashboard (`/dashboard`)
- Banner de boas-vindas personalizado
- Cards de estatísticas:
  - Serviços ativos
  - Orçamentos pendentes
  - Serviços concluídos
  - Total investido
- Lista de veículos com atalho para adicionar
- Solicitações recentes com status
- Dicas contextuais

### 3. Meus Veículos (`/veiculos`)
- Cards de veículos com informações completas
- Indicador de veículo padrão
- Histórico de serviços por veículo
- Alerta de revisão vencida
- Ação rápida para solicitar serviço
- Card para adicionar novo veículo

### 4. Solicitações (`/solicitacoes`)
- Cards de estatísticas por status
- Busca e filtros avançados
- Lista de solicitações com:
  - Status colorido
  - Contador de orçamentos
  - Tempo desde criação
- Ação para criar nova solicitação

### 5. Meus Serviços (`/servicos`)
- Cards de estatísticas (ativos, pagamento, concluídos)
- Total investido
- Filtros por status
- Cards com barra lateral colorida por status
- Botão de pagamento para serviços pendentes
- Informações do fornecedor com rating

### 6. Perfil (`/perfil`)
- Header com avatar e badge de membro
- Estatísticas do usuário
- Toggles de notificações
- Menu de configurações
- Suporte e ajuda
- Botão de logout

## 🔧 Instalação

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Rodar em produção
npm start
```

## 🌐 Portas

- **Desenvolvimento:** http://localhost:3002
- **API Backend:** http://localhost:3000

## 🔐 Modo Demo

O sistema está configurado em **modo demo**, aceitando qualquer email e senha para login. Os dados são mockados localmente.

### Credenciais de Teste
- **Email:** qualquer email válido
- **Senha:** qualquer senha

## 📱 Responsividade

O dashboard é totalmente responsivo:
- **Desktop:** Sidebar fixa + conteúdo expansivo
- **Tablet:** Sidebar colapsável
- **Mobile:** Menu hamburger + layout otimizado

## 🎨 Design System

### Cores Principais
- **Primary:** `#1976d2` (Azul TechTrust)
- **Success:** `#10b981` (Verde)
- **Warning:** `#f59e0b` (Amarelo)
- **Danger:** `#ef4444` (Vermelho)

### Componentes
- Cards com sombra suave (`shadow-soft`)
- Botões com estados hover/active
- Badges coloridos por status
- Skeletons para loading states
- Animações sutis (fade-in, slide-up)

## 📦 Scripts Disponíveis

```json
{
  "dev": "next dev -p 3002",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

## 🔗 Integração com Mobile

Este dashboard web complementa o app mobile TechTrust, permitindo que clientes acessem suas informações tanto via web quanto pelo aplicativo.

## 📝 Próximos Passos

- [ ] Integração com API real
- [ ] Página de detalhes da solicitação
- [ ] Sistema de chat com fornecedor
- [ ] Integração com gateway de pagamento
- [ ] Notificações em tempo real
- [ ] PWA (Progressive Web App)

---

**TechTrust** - Conectando clientes aos melhores profissionais automotivos.
