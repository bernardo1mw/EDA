# Order Process - Frontend

Frontend Next.js para o sistema de gerenciamento de pedidos com arquitetura orientada a eventos.

## Tecnologias

- **Next.js 16** - Framework React com App Router
- **React 19** - Biblioteca de UI
- **TypeScript** - Tipagem estática
- **Tailwind CSS 4** - Estilização utilitária
- **App Router** - Roteamento moderno do Next.js

## Estrutura do Projeto

```
src/
├── app/                    # App Router do Next.js
│   ├── layout.tsx         # Layout principal
│   ├── page.tsx           # Página inicial (listagem de pedidos)
│   ├── orders/
│   │   ├── new/           # Página de criação de pedidos
│   │   └── [id]/          # Página de detalhes do pedido
│   └── globals.css        # Estilos globais
├── components/
│   ├── ui/                # Componentes UI reutilizáveis
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   ├── Navigation.tsx     # Componente de navegação
│   └── OrderCard.tsx      # Card de pedido
├── lib/
│   ├── api.ts             # Cliente API para comunicação com backend
│   └── utils.ts           # Funções utilitárias
└── types/
    └── order.ts            # Tipos TypeScript
```

## Configuração

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   Crie um arquivo `.env.local` na raiz do projeto:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```
   
   Por padrão, a aplicação se conecta em `http://localhost:8080` (orders-api-python).

3. **Executar em desenvolvimento:**
   ```bash
   npm run dev
   ```
   
   A aplicação estará disponível em [http://localhost:3000](http://localhost:3000)

4. **Build para produção:**
   ```bash
   npm run build
   npm start
   ```

## Funcionalidades

### Páginas Principais

1. **Listagem de Pedidos** (`/`)
   - Visualização de pedidos por cliente
   - Filtro por Customer ID
   - Cards responsivos com informações principais
   - Links para detalhes do pedido

2. **Criação de Pedidos** (`/orders/new`)
   - Formulário completo para criação de pedidos
   - Validação de campos
   - Feedback visual de loading e erros
   - Redirecionamento automático após criação

3. **Detalhes do Pedido** (`/orders/[id]`)
   - Visualização completa dos dados do pedido
   - Status do pedido com cores contextuais
   - Informações temporais formatadas
   - Informações sobre o Outbox Pattern

### Componentes

- **Button**: Botão reutilizável com variantes e estado de loading
- **Input**: Campo de entrada com label e tratamento de erros
- **Card**: Container de conteúdo estilizado
- **OrderCard**: Card especializado para exibição de pedidos
- **Navigation**: Navegação principal com destaque de rota ativa

## Integração com Backend

O frontend se comunica com a API Python através do cliente API (`src/lib/api.ts`):

- **Base URL**: Configurável via `NEXT_PUBLIC_API_URL`
- **Endpoints utilizados**:
  - `POST /orders/` - Criar pedido
  - `GET /orders/{id}` - Buscar pedido por ID
  - `GET /orders/customer/{customerId}` - Listar pedidos por cliente
  - `GET /health/` - Health check

## Outbox Pattern

O frontend mostra informações sobre o **Transactional Outbox Pattern** na página de detalhes do pedido, explicando como os eventos são processados assincronamente pelo `outbox-dispatcher`.

## Desenvolvimento

- **Linting**: `npm run lint`
- **TypeScript**: Verificação automática durante desenvolvimento
- **Hot Reload**: Atualização automática ao salvar arquivos

## Próximos Passos

- [ ] Adicionar paginação na listagem de pedidos
- [ ] Implementar busca e filtros avançados
- [ ] Adicionar dashboard com métricas
- [ ] Integrar visualização de eventos de pagamento
- [ ] Adicionar notificações em tempo real (WebSockets)
- [ ] Implementar autenticação e autorização
