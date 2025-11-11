# Instruções de Uso - Frontend Order Process

## 🚀 Início Rápido

### 1. Instalar Dependências

```bash
cd fe-next
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto `fe-next/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

**Nota:** Por padrão, se não configurado, a aplicação usa `http://localhost:8080` (onde roda o `orders-api-python`).

### 3. Executar em Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em: **http://localhost:3000**

### 4. Build para Produção

```bash
npm run build
npm start
```

## 📁 Estrutura Criada

```
fe-next/
├── src/
│   ├── app/                      # App Router (Next.js 16)
│   │   ├── layout.tsx           # Layout principal com navegação
│   │   ├── page.tsx             # Página inicial - Listagem de pedidos
│   │   ├── orders/
│   │   │   ├── new/
│   │   │   │   └── page.tsx     # Criar novo pedido
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Detalhes do pedido
│   │   └── globals.css          # Estilos globais
│   │
│   ├── components/              # Componentes React
│   │   ├── ui/                  # Componentes UI reutilizáveis
│   │   │   ├── Button.tsx       # Botão com variantes e loading
│   │   │   ├── Input.tsx        # Input com label e validação
│   │   │   └── Card.tsx         # Container de conteúdo
│   │   ├── Navigation.tsx       # Navegação principal
│   │   └── OrderCard.tsx        # Card de exibição de pedido
│   │
│   ├── lib/                      # Utilitários e serviços
│   │   ├── api.ts               # Cliente API (fetch)
│   │   └── utils.ts             # Funções utilitárias (formatação)
│   │
│   └── types/                    # TypeScript
│       └── order.ts              # Tipos e interfaces
│
└── package.json
```

## 🎨 Funcionalidades Implementadas

### 1. Listagem de Pedidos (`/`)
- ✅ Visualização de pedidos por cliente
- ✅ Filtro por Customer ID (ex: `customer-001`)
- ✅ Cards responsivos com informações principais
- ✅ Loading states e tratamento de erros
- ✅ Links para detalhes do pedido

### 2. Criação de Pedidos (`/orders/new`)
- ✅ Formulário completo para criação
- ✅ Validação de campos obrigatórios
- ✅ Feedback visual (loading, erros)
- ✅ Redirecionamento automático após criação
- ✅ Suporte para cancelar e voltar

### 3. Detalhes do Pedido (`/orders/[id]`)
- ✅ Visualização completa dos dados
- ✅ Status do pedido com cores contextuais
- ✅ Formatação de valores monetários (R$)
- ✅ Formatação de datas (pt-BR)
- ✅ Informações sobre Outbox Pattern

## 🔌 Integração com Backend

O frontend se comunica com `orders-api-python` através de:

**Cliente API:** `src/lib/api.ts`

**Endpoints utilizados:**
- `POST /orders/` - Criar pedido
- `GET /orders/{id}` - Buscar pedido por ID
- `GET /orders/customer/{customerId}` - Listar pedidos por cliente
- `GET /health/` - Health check

## 🎯 Exemplos de Uso

### Criar um Pedido

1. Acesse: `http://localhost:3000/orders/new`
2. Preencha os campos:
   - **Customer ID**: `customer-001`
   - **Product ID**: `product-001`
   - **Quantidade**: `2`
   - **Total**: `99.98`
3. Clique em "Criar Pedido"
4. Você será redirecionado para a página de detalhes do pedido

### Visualizar Pedidos

1. Acesse: `http://localhost:3000`
2. No campo "Filtrar por Cliente ID", digite: `customer-001`
3. Clique em "Buscar"
4. Os pedidos do cliente serão exibidos em cards

### Ver Detalhes

1. Na listagem, clique em qualquer card de pedido
2. Ou acesse diretamente: `http://localhost:3000/orders/{order-id}`

## 🎨 Design e Estilo

- **Framework CSS:** Tailwind CSS 4
- **Tema:** Suporte a dark mode (via `prefers-color-scheme`)
- **Responsivo:** Mobile-first design
- **Componentes:** Reutilizáveis e modulares

## ⚙️ Configurações

### Personalizar URL da API

No arquivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://seu-backend:8080
```

### Modificar Estilos

Os estilos estão em:
- `src/app/globals.css` - Estilos globais
- Classes Tailwind nos componentes

## 🔍 Troubleshooting

### Erro: "Failed to fetch"

**Causa:** Backend não está rodando ou URL incorreta.

**Solução:**
1. Verifique se `orders-api-python` está rodando em `http://localhost:8080`
2. Confirme a variável `NEXT_PUBLIC_API_URL` no `.env.local`
3. Verifique o console do navegador para erros de CORS

### Erro: "Module not found"

**Causa:** Paths do TypeScript não configurados.

**Solução:**
O `tsconfig.json` já está configurado com:
```json
"paths": {
  "@/*": ["./src/*"]
}
```

Se persistir, reinicie o servidor de desenvolvimento.

### Página em Branco

**Causa:** Erro no build ou componente quebrado.

**Solução:**
1. Verifique o console do navegador (F12)
2. Execute `npm run build` para verificar erros
3. Verifique se todos os imports estão corretos

## 📝 Próximos Passos (Opcional)

- [ ] Adicionar paginação na listagem
- [ ] Implementar busca avançada
- [ ] Dashboard com métricas
- [ ] Visualização de eventos de pagamento
- [ ] WebSockets para atualizações em tempo real
- [ ] Autenticação e autorização
- [ ] Testes automatizados (Jest + React Testing Library)

## ✨ Recursos Implementados

✅ TypeScript com tipagem completa  
✅ Componentes reutilizáveis  
✅ Tratamento de erros  
✅ Loading states  
✅ Formatação de valores e datas  
✅ Responsividade  
✅ Dark mode  
✅ Navegação intuitiva  
✅ Feedback visual  
✅ Integração completa com API  

---

**Desenvolvido com:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4

