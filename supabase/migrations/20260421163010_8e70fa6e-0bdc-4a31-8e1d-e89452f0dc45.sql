create table public.dependency_health_history (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  drift_count int not null default 0,
  barrel_imports int not null default 0,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index dependency_health_history_generated_at_idx
  on public.dependency_health_history (generated_at desc);

alter table public.dependency_health_history enable row level security;

create policy "dependency_health_history_read_auth"
  on public.dependency_health_history
  for select
  to authenticated
  using (true);

create policy "dependency_health_history_insert_admin"
  on public.dependency_health_history
  for insert
  to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role));