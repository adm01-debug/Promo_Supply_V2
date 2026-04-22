
## Melhorar a ação "Limpar filtros" em todas as telas com filtros

Aplicar o mesmo conjunto de melhorias em **Solicitações**, **Acompanhamento**, **Histórico de Compras** e **Dashboard Executivo**.

### Escopo das melhorias (4 itens)

1. **Modal de confirmação** antes de limpar
2. **Toast detalhado** dizendo o que foi limpo + o que foi removido do storage
3. **Undo de 6 segundos** para restaurar o estado exato anterior
4. **Persistência por conta** (Supabase) substituindo o uso de localStorage

---

### 1. Confirmação antes de limpar (`ConfirmClearFiltersDialog`)

Novo componente `src/components/filters/ConfirmClearFiltersDialog.tsx` usando `AlertDialog`:
- Lista, em bullets, exatamente quais filtros estão ativos e serão limpos (ex.: "Busca: orçamento", "Categoria: Insumos", "Período: últimos 30 dias").
- Botões: "Cancelar" / "Limpar tudo" (destrutivo).
- Checkbox opcional "Não perguntar de novo nesta sessão" (estado em `sessionStorage`, escopo por tela).

### 2. Toast detalhado pós-limpeza

Helper novo `src/lib/filterClearReporter.ts` que recebe o snapshot anterior e devolve a descrição:
- Linhas de **filtros**: "Busca, Categoria, Status, Período (datas), Fornecedor".
- Linhas de **storage**: chaves removidas do localStorage (ex.: `filters_historico-compras`).
- Renderizado com `sonner` em formato rich (descrição multilinha) com botão **"Desfazer"**.

### 3. Undo de 6 segundos

Reusar o `useUndoStore` existente:
- Ao limpar, snapshot completo de filtros (e do payload removido do localStorage) é empilhado via `addAction({ type: 'clear-filters', undo: () => restore(snapshot) })`.
- Toast da etapa 2 expõe o botão "Desfazer" que chama `useUndoStore.undo()` antes de expirar (6s).
- Após expirar sem clique, snapshot é descartado.

### 4. Persistência de filtros na conta (substitui localStorage)

Nova tabela Supabase `user_filter_preferences`:

```text
id uuid pk
user_id uuid (auth.users) — RLS: owner-only
scope text (ex.: 'historico-compras', 'solicitacoes', 'acompanhamento', 'executive-dashboard')
filters jsonb
updated_at timestamptz
unique(user_id, scope)
```

RLS via `has_role`/`auth.uid() = user_id`. Trigger `update_updated_at_column`.

Novo hook `src/hooks/useAccountFilters.ts`:
- `useAccountFilters<T>(scope, defaults)` → `{ filters, setFilters, clearFilters, loading }`.
- **Estratégia de carga**: 1) hidrata com defaults, 2) fetch da conta (overrides), 3) se ausente e existir snapshot legado em `localStorage` (`filters_<scope>`), faz migração one-shot (upsert + remove chave local).
- **Persistência**: debounce de 800ms via `upsert` por `(user_id, scope)`.
- **Sem usuário logado**: cai de volta para `localStorage` (preserva UX anônima das poucas rotas públicas). Em rotas autenticadas o caminho normal é Supabase.
- `clearFilters()` reseta para defaults E deleta a linha em `user_filter_preferences` (e qualquer chave `filters_<scope>` residual).

Aposentar `usePersistentFilters` (não está sendo usado em nenhum lugar — confirmado por busca). Pode ser removido para evitar drift, ou mantido como wrapper interno do fallback anônimo.

---

### Integração nas telas

Substituir cada `clearFilters` / `clearAllFilters` por um único hook compartilhado:

```text
src/hooks/useClearFiltersFlow.ts
  useClearFiltersFlow({ scope, snapshot, applySnapshot, defaultsSnapshot })
    → { requestClear, ConfirmDialog }
```

Telas afetadas (com mudanças mínimas):

| Tela | scope | Filtros gerenciados |
|---|---|---|
| `src/pages/Solicitacoes.tsx` | `solicitacoes` | searchTerm, statusFilter, tipoFilter, advancedFilters |
| `src/pages/Acompanhamento.tsx` | `acompanhamento` | searchTerm, filtroSLA |
| `src/pages/HistoricoCompras.tsx` | `historico-compras` | searchTerm, categoryFilter, statusFilter, dateRange, periodPreset |
| `src/components/compras/ExecutiveDashboard.tsx` | `executive-dashboard` | selectedCategory, selectedSupplier, selectedPeriod, showComparison |

A `dashboard_filter_favorites` continua existindo (favoritos nomeados); a nova `user_filter_preferences` guarda só o **estado atual** dos filtros.

---

### Detalhes técnicos

- **Formato do toast**: `toast.success("Filtros limpos", { description, duration: 6000, action: { label: "Desfazer", onClick: undo } })`.
- **Snapshot inclui**: valores antigos dos filtros + lista de chaves de storage removidas (para o undo restaurar 1:1).
- **Acessibilidade**: AlertDialog tem `aria-label`, foco inicial em "Cancelar" (default destrutivo evita cliques acidentais).
- **Telemetria**: `log_security_event` não é necessário — é UX, não evento de segurança.
- **Idempotência**: se o usuário clicar "Limpar" sem filtros ativos, o modal não abre e um toast neutro avisa "Nenhum filtro ativo".
- **Migração**: triggers `validate_*_status_transition` não são afetados; só nova tabela + RLS.

### Migration SQL (resumida)

```sql
create table public.user_filter_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  filters jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, scope)
);
alter table public.user_filter_preferences enable row level security;
create policy "own_select" on public.user_filter_preferences for select using (auth.uid() = user_id);
create policy "own_insert" on public.user_filter_preferences for insert with check (auth.uid() = user_id);
create policy "own_update" on public.user_filter_preferences for update using (auth.uid() = user_id);
create policy "own_delete" on public.user_filter_preferences for delete using (auth.uid() = user_id);
create trigger trg_ufp_updated before update on public.user_filter_preferences
  for each row execute function public.update_updated_at_column();
```

### Aceitação

- Em cada uma das 4 telas: clicar "Limpar" abre modal com lista exata; confirmar exibe toast detalhado com botão Desfazer; "Desfazer" em <6s restaura filtros idênticos.
- Recarregar página (mesmo navegador ou outro) traz os filtros do usuário do banco.
- Snapshot legado em `localStorage` é migrado uma vez e a chave é removida.
- Sem regressão em `dashboard_filter_favorites` (favoritos nomeados continuam funcionando).
