# 🏢 TechTrust Provider Dashboard

Portal web para fornecedores de serviços automotivos gerenciarem seus pedidos, orçamentos e serviços.

## 🚀 Tecnologias

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Axios** - Requisições HTTP
- **Lucide React** - Ícones
- **Recharts** - Gráficos (futuro)

## 📦 Instalação

```bash
# Clonar/copiar para pasta do projeto
cd techtrust-provider-dashboard

# Instalar dependências
npm install

# Copiar .env
cp .env.example .env.local

# Rodar em desenvolvimento
npm run dev
```

Acesse: http://localhost:3001

## 🔧 Configuração

Edite o arquivo `.env.local`:

```env
# URL da API Backend
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

## 📁 Estrutura

```
src/
├── components/          # Componentes reutilizáveis
│   ├── DashboardLayout.tsx  # Layout principal
│   └── Toast.tsx            # Notificações
├── contexts/            # Estado global
│   └── AuthContext.tsx      # Autenticação
├── pages/               # Páginas (rotas)
│   ├── index.tsx            # Redirect
│   ├── login.tsx            # Login
│   ├── dashboard.tsx        # Dashboard
│   ├── pedidos/             # Pedidos
│   │   ├── index.tsx        # Lista
│   │   └── [id].tsx         # Detalhes + Orçamento
│   ├── orcamentos/          # Orçamentos
│   │   └── index.tsx        # Lista de orçamentos enviados
│   ├── servicos/            # Serviços
│   │   ├── index.tsx        # Lista
│   │   └── [id].tsx         # Detalhes + Ações
│   └── configuracoes/       # Configurações
│       └── index.tsx        # Perfil, serviços, horários
├── services/            # Comunicação API
│   └── api.ts
└── styles/
    └── globals.css      # Estilos globais
```

## 🎯 Funcionalidades

### ✅ Implementado

- [x] Login/Autenticação
- [x] Dashboard com estatísticas
- [x] Lista de pedidos (Service Requests)
- [x] Detalhes do pedido
- [x] Criar orçamento
- [x] Lista de serviços (Work Orders)
- [x] Detalhes do serviço (Work Order)
- [x] Iniciar/Concluir serviço
- [x] Lista de orçamentos enviados
- [x] Página de configurações completa
- [x] Sidebar responsivo
- [x] Skeleton loading
- [x] Toast notifications

### 🔜 Próximos passos

- [ ] Relatórios financeiros
- [ ] Gráficos de performance
- [ ] Notificações push (Firebase)
- [ ] Chat com cliente
- [ ] Integração com API real

## 🎨 Design

- **Cores:** Azul primário (#1976d2) consistente com app mobile
- **Fonte:** Plus Jakarta Sans
- **Componentes:** Cards arredondados, sombras suaves
- **Animações:** Fade-in, slide-up, hover effects

## 🔐 Autenticação

O dashboard usa JWT tokens armazenados em cookies:
- `token` - Access token (7 dias)
- `refreshToken` - Refresh token (30 dias)

Apenas usuários com `role: PROVIDER` podem acessar.

## 🌐 API Endpoints Utilizados

```
POST /auth/login          - Login
GET  /users/me            - Dados do usuário
GET  /provider/dashboard  - Estatísticas
GET  /service-requests    - Lista pedidos
GET  /service-requests/:id - Detalhes pedido
POST /quotes              - Criar orçamento
GET  /work-orders         - Lista serviços
GET  /work-orders/:id     - Detalhes serviço
```

## 📱 Responsivo

O dashboard é totalmente responsivo:
- **Desktop:** Sidebar fixa, layout completo
- **Tablet:** Sidebar colapsável
- **Mobile:** Sidebar em overlay, layout adaptado

## 🧪 Para Testar

1. Certifique-se que o backend está rodando
2. Crie um usuário fornecedor via API ou seed
3. Faça login com as credenciais

## 📝 Scripts

```bash
npm run dev      # Desenvolvimento
npm run build    # Build produção
npm run start    # Rodar produção
npm run lint     # Verificar código
```

## 🤝 Integração com Backend

Este dashboard espera que o backend TechTrust esteja rodando em `localhost:3000`. 

Para testar sem backend, os dados são mockados nas páginas.

---

**Parte do projeto TechTrust AutoSolutions** 🚗
