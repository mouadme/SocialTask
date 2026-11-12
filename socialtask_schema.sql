-- SocialTask MVP schema for Supabase (PostgreSQL)
-- Run in Supabase SQL Editor. Review policies before production launch.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('customer', 'worker', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum
    ('awaiting_payment', 'open', 'in_progress', 'submitted', 'revision_requested', 'completed', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'under_review', 'confirmed', 'rejected', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('baridimob', 'binance_pay');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.withdrawal_status as enum ('requested', 'approved', 'paid', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'User',
  role public.user_role not null default 'customer',
  phone text,
  country text not null default 'Algeria',
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  description text not null default '',
  base_price numeric(12,2) not null check (base_price >= 0),
  currency text not null default 'DZD',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  worker_id uuid references public.profiles(id),
  service_id uuid references public.services(id),
  title text not null,
  requirements text not null default '',
  target_url text,
  quantity integer not null default 1 check (quantity > 0),
  gross_amount numeric(12,2) not null check (gross_amount >= 0),
  commission_rate numeric(5,2) not null default 20 check (commission_rate >= 0 and commission_rate <= 100),
  worker_amount numeric(12,2) not null check (worker_amount >= 0),
  platform_amount numeric(12,2) not null check (platform_amount >= 0),
  currency text not null default 'DZD',
  status public.order_status not null default 'awaiting_payment',
  proof_url text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (round(worker_amount + platform_amount, 2) = round(gross_amount, 2))
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  payer_id uuid not null references public.profiles(id),
  method public.payment_method not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null,
  status public.payment_status not null default 'pending',
  customer_reference text,
  proof_url text,
  provider_transaction_id text,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  available_balance numeric(12,2) not null default 0 check (available_balance >= 0),
  pending_balance numeric(12,2) not null default 0 check (pending_balance >= 0),
  currency text not null default 'DZD',
  updated_at timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  order_id uuid references public.orders(id),
  entry_type text not null check (entry_type in ('earning', 'withdrawal', 'adjustment', 'refund')),
  amount numeric(12,2) not null,
  currency text not null default 'DZD',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'DZD',
  payout_method text not null check (payout_method in ('baridimob', 'ccp', 'binance_pay')),
  payout_details text not null,
  status public.withdrawal_status not null default 'requested',
  admin_note text,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.platform_settings (
  setting_key text primary key,
  setting_value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings(setting_key, setting_value)
values
  ('commission_rate', '{"value":20}'::jsonb),
  ('minimum_withdrawal_dzd', '{"value":500}'::jsonb),
  ('payments_enabled', '{"baridimob":true,"binance_pay":false}'::jsonb)
on conflict (setting_key) do nothing;

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;


-- Prevent users from promoting themselves or changing another account's role.
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('postgres', 'supabase_admin', 'service_role')
     and not public.is_admin() then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
before update on public.profiles
for each row execute procedure public.prevent_role_escalation();


-- Compute the commission split in the database; do not trust client-supplied split values.
create or replace function public.set_order_financials()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  rate numeric(5,2);
begin
  select coalesce((setting_value->>'value')::numeric, 20)
    into rate
    from public.platform_settings
    where setting_key = 'commission_rate';

  if rate is null then rate := 20; end if;
  if rate < 0 or rate > 100 then raise exception 'Invalid commission rate'; end if;

  new.commission_rate := rate;
  new.platform_amount := round(new.gross_amount * rate / 100, 2);
  new.worker_amount := round(new.gross_amount - new.platform_amount, 2);
  new.status := 'awaiting_payment';
  new.worker_id := null;
  return new;
end;
$$;

drop trigger if exists set_order_financials_before_insert on public.orders;
create trigger set_order_financials_before_insert
before insert on public.orders
for each row execute procedure public.set_order_financials();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'User'))
  on conflict (id) do nothing;

  insert into public.wallets(user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_socialtask on auth.users;
create trigger on_auth_user_created_socialtask
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.wallets enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.platform_settings enable row level security;

-- Profiles: users can read/update their own profile; admins can manage all.
drop policy if exists "profile read self or admin" on public.profiles;
create policy "profile read self or admin" on public.profiles
for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profile update self or admin" on public.profiles;
create policy "profile update self or admin" on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Public catalog; only admins can modify.
drop policy if exists "active services visible" on public.services;
create policy "active services visible" on public.services
for select using (is_active = true or public.is_admin());

drop policy if exists "admin manages services" on public.services;
create policy "admin manages services" on public.services
for all using (public.is_admin()) with check (public.is_admin());

-- Orders visible to their customer, assigned worker, or admin.
drop policy if exists "order parties read" on public.orders;
create policy "order parties read" on public.orders
for select using (customer_id = auth.uid() or worker_id = auth.uid() or public.is_admin());

drop policy if exists "customer creates own order" on public.orders;
create policy "customer creates own order" on public.orders
for insert with check (customer_id = auth.uid());

drop policy if exists "admin updates orders" on public.orders;
create policy "admin updates orders" on public.orders
for update using (public.is_admin()) with check (public.is_admin());

-- Payment records are private to payer and admin; verification is admin-only.
drop policy if exists "payment read payer or admin" on public.payments;
create policy "payment read payer or admin" on public.payments
for select using (payer_id = auth.uid() or public.is_admin());

drop policy if exists "payer creates pending payment" on public.payments;
create policy "payer creates pending payment" on public.payments
for insert with check (payer_id = auth.uid() and status in ('pending', 'under_review'));

drop policy if exists "admin manages payments" on public.payments;
create policy "admin manages payments" on public.payments
for update using (public.is_admin()) with check (public.is_admin());

-- Wallets and ledger: read-only for owner; changes must happen server-side/admin-side.
drop policy if exists "wallet owner or admin reads" on public.wallets;
create policy "wallet owner or admin reads" on public.wallets
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "ledger owner or admin reads" on public.ledger_entries;
create policy "ledger owner or admin reads" on public.ledger_entries
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admin manages ledger" on public.ledger_entries;
create policy "admin manages ledger" on public.ledger_entries
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "withdrawal owner or admin reads" on public.withdrawal_requests;
create policy "withdrawal owner or admin reads" on public.withdrawal_requests
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user requests own withdrawal" on public.withdrawal_requests;
create policy "user requests own withdrawal" on public.withdrawal_requests
for insert with check (user_id = auth.uid() and status = 'requested');

drop policy if exists "admin manages withdrawals" on public.withdrawal_requests;
create policy "admin manages withdrawals" on public.withdrawal_requests
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings readable" on public.platform_settings;
create policy "settings readable" on public.platform_settings
for select using (true);

drop policy if exists "admin manages settings" on public.platform_settings;
create policy "admin manages settings" on public.platform_settings
for all using (public.is_admin()) with check (public.is_admin());

-- IMPORTANT:
-- 1) Never expose the Supabase service_role key in browser code.
-- 2) Do not let clients update wallet balances or mark payments confirmed.
-- 3) Production payment verification and wallet crediting must be performed by
--    trusted server-side functions after verified provider/admin confirmation.
-- 4) Create the first admin by securely updating profiles.role from the SQL editor.
