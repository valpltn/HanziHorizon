create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

revoke all on table public.user_roles from anon;
grant select on table public.user_roles to authenticated;

create policy "user_roles_owner_select"
  on public.user_roles for select to authenticated
  using ((select auth.uid()) = user_id);

alter table public.user_settings
  add column if not exists admin_mode boolean not null default false;

insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'vaplat31@gmail.com'
on conflict (user_id) do update set role = excluded.role;
