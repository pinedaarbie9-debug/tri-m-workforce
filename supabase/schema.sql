-- ============================================================
-- Tri-M Global Logistics & Trading Inc. — Workforce360 schema
-- Run this in Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- Core tables ----------

create table if not exists agencies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists principals (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references agencies(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists merchandisers (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references agencies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  territory text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
  principal_id uuid not null references principals(id) on delete cascade,
  name text not null,
  address text,
  latitude double precision,
  longitude double precision
);

create table if not exists attendance_logs (
  id uuid primary key default uuid_generate_v4(),
  merchandiser_id uuid not null references merchandisers(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  check_in_time timestamptz not null,
  check_out_time timestamptz,
  status text not null check (status in ('on_time', 'late', 'absent', 'awol')),
  biometric_verified boolean not null default false,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create table if not exists leave_requests (
  id uuid primary key default uuid_generate_v4(),
  merchandiser_id uuid not null references merchandisers(id) on delete cascade,
  leave_type text not null check (leave_type in ('regular', 'sick_leave', 'vacation_leave', 'emergency_leave')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  start_date date not null,
  end_date date not null,
  reason text,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists routes (
  id uuid primary key default uuid_generate_v4(),
  merchandiser_id uuid not null references merchandisers(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  scheduled_date date not null,
  created_at timestamptz not null default now()
);

-- ---------- Indexes for common queries ----------

create index if not exists idx_attendance_merchandiser on attendance_logs (merchandiser_id);
create index if not exists idx_attendance_checkin on attendance_logs (check_in_time);
create index if not exists idx_leave_merchandiser on leave_requests (merchandiser_id);
create index if not exists idx_routes_date on routes (scheduled_date);
create index if not exists idx_merchandisers_agency on merchandisers (agency_id);

-- ---------- Row Level Security ----------

alter table agencies enable row level security;
alter table principals enable row level security;
alter table merchandisers enable row level security;
alter table stores enable row level security;
alter table attendance_logs enable row level security;
alter table leave_requests enable row level security;
alter table routes enable row level security;

-- Simple policy set: any authenticated user tied to an agency (via merchandisers.user_id)
-- can read/write records that belong to that same agency. Adjust to match your real
-- role model (e.g. HR admin vs. field merchandiser) before going to production.

create or replace function auth_agency_id()
returns uuid
language sql
security definer
stable
as $$
  select agency_id from merchandisers where user_id = auth.uid() limit 1;
$$;

create policy "Read own agency merchandisers"
  on merchandisers for select
  using (agency_id = auth_agency_id());

create policy "Read own agency attendance"
  on attendance_logs for select
  using (
    merchandiser_id in (select id from merchandisers where agency_id = auth_agency_id())
  );

create policy "Merchandiser can insert own attendance"
  on attendance_logs for insert
  with check (
    merchandiser_id in (select id from merchandisers where user_id = auth.uid())
  );

create policy "Read own agency leave requests"
  on leave_requests for select
  using (
    merchandiser_id in (select id from merchandisers where agency_id = auth_agency_id())
  );

create policy "Merchandiser can file own leave"
  on leave_requests for insert
  with check (
    merchandiser_id in (select id from merchandisers where user_id = auth.uid())
  );

create policy "Read own agency routes"
  on routes for select
  using (
    merchandiser_id in (select id from merchandisers where agency_id = auth_agency_id())
  );

create policy "Read own agency principals"
  on principals for select
  using (agency_id = auth_agency_id());

create policy "Read own agency"
  on agencies for select
  using (id = auth_agency_id());

create policy "Read stores of own agency principals"
  on stores for select
  using (
    principal_id in (select id from principals where agency_id = auth_agency_id())
  );

-- ---------- Sample seed data (safe to remove) ----------

insert into agencies (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Tri-M Global Logistics & Trading Inc.')
on conflict (id) do nothing;

insert into principals (id, agency_id, name) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'SM North'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Robinsons'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Puregold')
on conflict (id) do nothing;
