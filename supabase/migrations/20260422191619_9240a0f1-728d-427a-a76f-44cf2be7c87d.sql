create table public.user_filter_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, scope)
);

alter table public.user_filter_preferences enable row level security;

create policy "ufp_own_select" on public.user_filter_preferences
  for select using (auth.uid() = user_id);

create policy "ufp_own_insert" on public.user_filter_preferences
  for insert with check (auth.uid() = user_id);

create policy "ufp_own_update" on public.user_filter_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ufp_own_delete" on public.user_filter_preferences
  for delete using (auth.uid() = user_id);

create index idx_ufp_user_scope on public.user_filter_preferences(user_id, scope);

create trigger trg_ufp_updated_at
  before update on public.user_filter_preferences
  for each row execute function public.update_updated_at_column();