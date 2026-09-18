-- Medi Key: hospital authorization + audited private record access
-- Run this in Supabase SQL Editor AFTER the existing Medi Key schema/policies.
-- Keep the medical-records Storage bucket PRIVATE.

create table if not exists public.hospital_access_grants (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.family_members(id) on delete cascade,
  hospital_id uuid not null references public.hospitals(id) on delete restrict,
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null
);

create index if not exists hospital_access_grants_member_idx
  on public.hospital_access_grants(member_id, expires_at desc);

create table if not exists public.medical_access_logs (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid references public.hospital_access_grants(id) on delete set null,
  member_id uuid not null references public.family_members(id) on delete cascade,
  hospital_id uuid references public.hospitals(id) on delete set null,
  record_id uuid references public.medical_records(id) on delete set null,
  action text not null check (action in ('grant_created','record_view','access_denied')),
  accessed_at timestamptz not null default now()
);

create index if not exists medical_access_logs_member_idx
  on public.medical_access_logs(member_id, accessed_at desc);

alter table public.hospital_access_grants enable row level security;
alter table public.medical_access_logs enable row level security;

-- No public SELECT/INSERT policies are intentionally created for these tables.
-- The security-definer functions and server route perform the controlled access.

create or replace function public.create_hospital_access_grant(
  p_token text,
  p_registration_number text,
  p_hospital_name text
)
returns table (
  grant_id uuid,
  member_id uuid,
  hospital_id uuid,
  hospital_name text,
  registration_number text,
  city text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_hospital public.hospitals%rowtype;
  v_grant_id uuid;
  v_expires timestamptz := now() + interval '10 minutes';
begin
  select c.member_id
    into v_member_id
  from public.medikey_cards c
  where c.qr_token = trim(p_token)
    and c.is_active = true
  limit 1;

  if v_member_id is null then
    raise exception 'This MediKey card is invalid or inactive.';
  end if;

  select *
    into v_hospital
  from public.hospitals h
  where h.registration_number = trim(p_registration_number)
    and h.is_active = true
    and lower(trim(h.hospital_name)) = lower(trim(p_hospital_name))
  limit 1;

  if v_hospital.id is null then
    raise exception 'Hospital not recognized. Check the hospital name and registration number.';
  end if;

  insert into public.hospital_access_grants(member_id, hospital_id, expires_at)
  values (v_member_id, v_hospital.id, v_expires)
  returning id into v_grant_id;

  insert into public.medical_access_logs(grant_id, member_id, hospital_id, action)
  values (v_grant_id, v_member_id, v_hospital.id, 'grant_created');

  return query
  select v_grant_id, v_member_id, v_hospital.id, v_hospital.hospital_name,
         v_hospital.registration_number, v_hospital.city, v_expires;
end;
$$;

grant execute on function public.create_hospital_access_grant(text, text, text) to anon, authenticated;

create or replace function public.get_hospital_access_records(p_grant_id uuid)
returns table (
  id uuid,
  title text,
  record_type text,
  record_date date,
  file_path text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
begin
  select g.member_id
    into v_member_id
  from public.hospital_access_grants g
  where g.id = p_grant_id
    and g.revoked_at is null
    and g.expires_at > now();

  if v_member_id is null then
    raise exception 'Hospital access has expired or been revoked.';
  end if;

  return query
  select r.id, r.title, r.record_type, r.record_date, r.file_path, r.created_at
  from public.medical_records r
  where r.member_id = v_member_id
  order by r.record_date desc nulls last, r.created_at desc;
end;
$$;

grant execute on function public.get_hospital_access_records(uuid) to anon, authenticated;
