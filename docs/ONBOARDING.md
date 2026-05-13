# 🚀 Guia de Onboarding (Promo Supply ERP)

Bem-vindo ao time de desenvolvimento! Este guia visa tornar você produtivo em menos de 4 horas.

## 🛠️ Setup do Ambiente (60 min)
1. Instale o **Bun** ou **Node.js 20+**.
2. Clone o repositório.
3. Execute `bun install` ou `npm install`.
4. Copie `.env.example` para `.env` (solicite as chaves ao time).
5. Execute `bun run dev` e acesse `localhost:8080`.

## 🧬 Arquitetura (30 min)
- **Frontend**: React + Vite + Tailwind + shadcn/ui.
- **Estado**: Zustand (stores) + React Query (cache).
- **Backend**: Lovable Cloud (Supabase).
- **Estrutura**: 
  - `src/pages`: Componentes de página.
  - `src/hooks`: Lógica reutilizável e integração com API.
  - `src/services`: Camada de comunicação direta com Supabase.
  - `src/components`: UI atômica e componentes de negócio.

## 🔐 Segurança & Multi-tenant (30 min)
- Todo dado deve ser filtrado por `organization_id`.
- O banco usa **RLS (Row Level Security)** rigoroso.
- Nunca faça queries que não incluam o filtro de organização no `WHERE` (ou via hook `useAuth`).

## 🧪 Qualidade & Testes (60 min)
- Execute `bun run test` para validar sua alteração.
- Siga o limite de **400 linhas** por arquivo.
- Respeite o Checklist de Auditoria ao abrir um **Pull Request**.

## 🚩 Comandos Úteis
- `bun run dev`: Inicia servidor dev.
- `bun run build`: Gera build de produção.
- `bun run lint`: Verifica erros de estilo/código.
- `bun run typecheck`: Validação estática de tipos.

---
**RUMO AO 10/10.**
