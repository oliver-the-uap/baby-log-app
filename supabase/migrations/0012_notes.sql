-- Questions / notes for healthcare appointments, checked off once answered.
create table notes (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  done boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  done_at timestamptz
);
alter table notes enable row level security;
create policy "auth read notes" on notes for select to authenticated using (true);
create policy "auth write notes" on notes for all to authenticated using (true) with check (true);
