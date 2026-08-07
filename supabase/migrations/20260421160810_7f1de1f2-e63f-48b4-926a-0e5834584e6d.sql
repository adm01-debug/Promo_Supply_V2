create table public.dependency_health (
  id boolean primary key default true check (id),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.dependency_health enable row level security;

create policy "dependency_health_read_auth"
  on public.dependency_health for select
  to authenticated using (true);

create policy "dependency_health_write_admin"
  on public.dependency_health for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger update_dependency_health_updated_at
before update on public.dependency_health
for each row execute function public.update_updated_at_column();