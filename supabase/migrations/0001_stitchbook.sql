-- StitchBook Pro: many fashion shops in one database. Everything lives in schema "stitchbook".
-- Each row carries shop_id; row-level security keeps every shop's data private.
create schema if not exists stitchbook;
grant usage on schema stitchbook to anon, authenticated, service_role;

create table stitchbook.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  address text not null default '',
  momo text not null default '',                 -- MoMo number/name shown on receipts
  currency text not null default 'GH₵',
  unit text not null default 'in' check (unit in ('in', 'cm')),
  tag_prefix text not null default 'SB' check (tag_prefix ~ '^[A-Z]{1,5}$'),
  next_tag int not null default 1,
  per_day int not null default 3 check (per_day between 1 and 500),   -- pieces the shop can finish a day
  plan text not null default 'solo' check (plan in ('solo', 'studio', 'business')),
  paid_until date,
  trial_until date not null default (current_date + 30),   -- every new shop: 30 days with everything on
  ai_credits int not null default 3,
  markup int not null default 50 check (markup between 0 and 1000),   -- usual profit % for the price helper
  shop_token text not null unique default lower(substr(md5(random()::text), 1, 12)),   -- public online-shop link
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stitchbook.shop_secrets (
  shop_id uuid primary key references stitchbook.shops (id) on delete cascade,
  invite_code text not null unique
);

create table stitchbook.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  shop_id uuid not null references stitchbook.shops (id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  name text not null,
  phone text not null default '',
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  created_at timestamptz not null default now()
);
create index members_shop on stitchbook.members (shop_id);

create table stitchbook.platform_admins (user_id uuid primary key references auth.users (id) on delete cascade);

-- ------------------------------------------------------------------ helpers
create or replace function stitchbook.my_shop() returns uuid
language sql stable security definer set search_path = stitchbook, pg_temp as $$
  select shop_id from stitchbook.members where user_id = auth.uid() and status = 'active';
$$;
create or replace function stitchbook.is_owner() returns boolean
language sql stable security definer set search_path = stitchbook, pg_temp as $$
  select exists (select 1 from stitchbook.members where user_id = auth.uid() and role = 'owner' and status = 'active');
$$;
create or replace function stitchbook.is_platform_admin() returns boolean
language sql stable security definer set search_path = stitchbook, pg_temp as $$
  select exists (select 1 from stitchbook.platform_admins where user_id = auth.uid());
$$;
/** Trial or paid plan still running? (New work needs it; old records stay readable.) */
create or replace function stitchbook.shop_active() returns boolean
language sql stable security definer set search_path = stitchbook, pg_temp as $$
  select exists (select 1 from stitchbook.shops where id = stitchbook.my_shop() and (trial_until >= current_date or paid_until >= current_date));
$$;
create or replace function stitchbook.touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ------------------------------------------------------------------ shop data (ids are made on the phone so offline saves can be re-sent)
create table stitchbook.customers (
  id uuid primary key,
  shop_id uuid not null default stitchbook.my_shop() references stitchbook.shops (id) on delete cascade,
  name text not null,
  phone text not null default '',
  gender text not null default 'female' check (gender in ('female', 'male', 'child')),
  photo text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_shop on stitchbook.customers (shop_id);

create table stitchbook.measurements (
  id uuid primary key,
  shop_id uuid not null default stitchbook.my_shop() references stitchbook.shops (id) on delete cascade,
  customer_id uuid not null references stitchbook.customers (id) on delete cascade,
  taken_at timestamptz not null default now(),
  unit text not null default 'in' check (unit in ('in', 'cm')),
  "values" jsonb not null default '{}',
  note text not null default '',
  source text not null default 'shop' check (source in ('shop', 'self')),   -- self = customer typed it on a group link
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index measurements_customer on stitchbook.measurements (customer_id);

create table stitchbook.events (
  id uuid primary key,
  shop_id uuid not null default stitchbook.my_shop() references stitchbook.shops (id) on delete cascade,
  name text not null,
  event_date date,
  garment text not null default '',
  fabric_note text not null default '',
  fabric_photo text,
  style_photos jsonb not null default '[]',
  price numeric(12, 2) not null default 0,       -- per person
  due_date date,
  join_token text not null unique,
  open boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stitchbook.orders (
  id uuid primary key,
  shop_id uuid not null default stitchbook.my_shop() references stitchbook.shops (id) on delete cascade,
  customer_id uuid not null references stitchbook.customers (id) on delete cascade,
  event_id uuid references stitchbook.events (id) on delete set null,
  code text not null,
  garment text not null default 'Other',
  title text not null default '',
  style_photos jsonb not null default '[]',
  fabric_photo text,
  fabric_note text not null default '',
  measurement jsonb,                              -- copy of the measurements used: {gender, unit, values}
  price numeric(12, 2) not null default 0,
  due_date date,
  fitting_date date,
  stage text not null default 'received' check (stage in ('received', 'cutting', 'sewing', 'fitting', 'finishing', 'ready', 'collected')),
  ready_on date,
  collected_on date,
  notes text not null default '',
  costs jsonb not null default '[]',               -- price helper: [{name, amount}]
  track_token text not null unique,
  cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, code)
);
create index orders_shop_due on stitchbook.orders (shop_id, due_date);

create table stitchbook.payments (
  id uuid primary key,
  shop_id uuid not null default stitchbook.my_shop() references stitchbook.shops (id) on delete cascade,
  order_id uuid not null references stitchbook.orders (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'momo', 'bank', 'other')),
  at timestamptz not null default now(),
  note text not null default '',
  voided boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order on stitchbook.payments (order_id);

create table stitchbook.tasks (
  id uuid primary key,
  shop_id uuid not null default stitchbook.my_shop() references stitchbook.shops (id) on delete cascade,
  order_id uuid not null references stitchbook.orders (id) on delete cascade,
  stage text not null check (stage in ('cutting', 'sewing', 'finishing')),
  staff_id uuid not null references stitchbook.members (user_id) on delete cascade,
  rate numeric(12, 2) not null default 0,        -- pay for this piece of work
  done_at timestamptz,
  paid boolean not null default false,
  paid_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_staff on stitchbook.tasks (staff_id);

-- Ready-made pieces for sale (Business plan) and their sales.
create table stitchbook.products (
  id uuid primary key,
  shop_id uuid not null default stitchbook.my_shop() references stitchbook.shops (id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  price numeric(12, 2) not null default 0,
  cost numeric(12, 2) not null default 0,
  sizes jsonb not null default '{}',               -- {"M": 2, "L": 0}
  photos jsonb not null default '[]',
  description text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table stitchbook.sales (
  id uuid primary key,
  shop_id uuid not null default stitchbook.my_shop() references stitchbook.shops (id) on delete cascade,
  product_id uuid references stitchbook.products (id) on delete set null,
  product_name text not null default '',
  size text not null default '',
  qty int not null default 1 check (qty > 0),
  amount numeric(12, 2) not null default 0,
  method text not null default 'cash' check (method in ('cash', 'momo', 'bank', 'other')),
  customer_name text not null default '',
  customer_phone text not null default '',
  note text not null default '',
  at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stitchbook.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references stitchbook.shops (id) on delete cascade,
  order_id uuid references stitchbook.orders (id) on delete set null,
  status text not null default 'done' check (status in ('done', 'failed')),
  prompt text not null default '',
  result text,
  error text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stitchbook.upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default stitchbook.my_shop() references stitchbook.shops (id) on delete cascade,
  plan text not null check (plan in ('solo', 'studio', 'business')),
  months int not null default 1 check (months between 1 and 24),
  amount numeric(12, 2) not null default 0,
  momo_ref text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['shops','customers','measurements','events','orders','payments','tasks','ai_jobs','upgrade_requests','products','sales'] loop
    execute format('create trigger touch before update on stitchbook.%I for each row execute function stitchbook.touch()', t);
  end loop;
end $$;

-- Only the platform admin may change a shop's plan, expiry or AI credits.
create or replace function stitchbook.guard_shop() returns trigger
language plpgsql security definer set search_path = stitchbook, pg_temp as $$
begin
  if not stitchbook.is_platform_admin() and coalesce(auth.role(), '') <> 'service_role' then
    new.plan = old.plan; new.paid_until = old.paid_until; new.ai_credits = old.ai_credits; new.trial_until = old.trial_until; new.shop_token = old.shop_token;
  end if;
  return new;
end $$;
create trigger guard_shop before update on stitchbook.shops for each row execute function stitchbook.guard_shop();

-- Tag codes are made offline on the phone; if two phones picked the same number, the later one moves up.
create or replace function stitchbook.order_code() returns trigger
language plpgsql security definer set search_path = stitchbook, pg_temp as $$
declare pfx text; n int;
begin
  select tag_prefix into pfx from stitchbook.shops where id = new.shop_id;
  if new.code is null or new.code = '' or exists (select 1 from stitchbook.orders where shop_id = new.shop_id and code = new.code and id <> new.id) then
    select next_tag into n from stitchbook.shops where id = new.shop_id for update;
    loop
      new.code = pfx || '-' || lpad(n::text, 4, '0');
      exit when not exists (select 1 from stitchbook.orders where shop_id = new.shop_id and code = new.code);
      n = n + 1;
    end loop;
  end if;
  n = coalesce(nullif(regexp_replace(new.code, '^.*-', ''), '')::int, 0);
  update stitchbook.shops set next_tag = greatest(next_tag, n + 1) where id = new.shop_id;
  return new;
end $$;
create trigger order_code before insert on stitchbook.orders for each row execute function stitchbook.order_code();

-- ------------------------------------------------------------------ row-level security
alter table stitchbook.shops enable row level security;
alter table stitchbook.shop_secrets enable row level security;
alter table stitchbook.members enable row level security;
alter table stitchbook.platform_admins enable row level security;
alter table stitchbook.customers enable row level security;
alter table stitchbook.measurements enable row level security;
alter table stitchbook.events enable row level security;
alter table stitchbook.orders enable row level security;
alter table stitchbook.payments enable row level security;
alter table stitchbook.tasks enable row level security;
alter table stitchbook.ai_jobs enable row level security;
alter table stitchbook.upgrade_requests enable row level security;
alter table stitchbook.products enable row level security;
alter table stitchbook.sales enable row level security;

create policy shop_read on stitchbook.shops for select using (id = stitchbook.my_shop() or stitchbook.is_platform_admin());
create policy shop_edit on stitchbook.shops for update using ((id = stitchbook.my_shop() and stitchbook.is_owner()) or stitchbook.is_platform_admin());
create policy secret_read on stitchbook.shop_secrets for select using (shop_id = stitchbook.my_shop() and stitchbook.is_owner());
create policy secret_edit on stitchbook.shop_secrets for update using (shop_id = stitchbook.my_shop() and stitchbook.is_owner());
-- Members: everyone sees themselves (even while pending); owners see and manage their team.
create policy member_read on stitchbook.members for select using (user_id = auth.uid() or shop_id = stitchbook.my_shop() or stitchbook.is_platform_admin());
create policy member_edit on stitchbook.members for update using (shop_id = stitchbook.my_shop() and stitchbook.is_owner() and user_id <> auth.uid());
create policy member_del on stitchbook.members for delete using (shop_id = stitchbook.my_shop() and stitchbook.is_owner() and user_id <> auth.uid());
create policy padmin_read on stitchbook.platform_admins for select using (user_id = auth.uid());

-- The whole shop (staff too) can read the work; only the owner changes it.
do $$ declare t text; begin
  foreach t in array array['customers','measurements','events','orders'] loop
    execute format('create policy shop_read on stitchbook.%I for select using (shop_id = stitchbook.my_shop())', t);
    execute format('create policy owner_write on stitchbook.%I for insert with check (shop_id = stitchbook.my_shop() and stitchbook.is_owner() and stitchbook.shop_active())', t);
    execute format('create policy owner_update on stitchbook.%I for update using (shop_id = stitchbook.my_shop() and stitchbook.is_owner()) with check (shop_id = stitchbook.my_shop())', t);
    execute format('create policy owner_delete on stitchbook.%I for delete using (shop_id = stitchbook.my_shop() and stitchbook.is_owner())', t);
  end loop;
end $$;
-- Stock & sales: owner only, and only on the Business plan (or the trial) for new items.
create policy owner_read on stitchbook.products for select using (shop_id = stitchbook.my_shop() and stitchbook.is_owner());
create policy owner_add on stitchbook.products for insert with check (shop_id = stitchbook.my_shop() and stitchbook.is_owner() and stitchbook.shop_active());
create policy owner_upd on stitchbook.products for update using (shop_id = stitchbook.my_shop() and stitchbook.is_owner()) with check (shop_id = stitchbook.my_shop());
create policy owner_del on stitchbook.products for delete using (shop_id = stitchbook.my_shop() and stitchbook.is_owner());
create policy owner_all on stitchbook.sales for all using (shop_id = stitchbook.my_shop() and stitchbook.is_owner()) with check (shop_id = stitchbook.my_shop() and stitchbook.is_owner());
-- Money is owner-only.
create policy owner_all on stitchbook.payments for all using (shop_id = stitchbook.my_shop() and stitchbook.is_owner()) with check (shop_id = stitchbook.my_shop() and stitchbook.is_owner());
create policy owner_all on stitchbook.ai_jobs for select using (shop_id = stitchbook.my_shop() and stitchbook.is_owner());
create policy owner_all on stitchbook.upgrade_requests for all using ((shop_id = stitchbook.my_shop() and stitchbook.is_owner()) or stitchbook.is_platform_admin()) with check ((shop_id = stitchbook.my_shop() and stitchbook.is_owner() and status = 'pending') or stitchbook.is_platform_admin());
-- Tasks: owner manages; staff read their own (they finish them through staff_done()).
create policy task_read on stitchbook.tasks for select using (shop_id = stitchbook.my_shop() and (stitchbook.is_owner() or staff_id = auth.uid()));
create policy task_owner on stitchbook.tasks for insert with check (shop_id = stitchbook.my_shop() and stitchbook.is_owner());
create policy task_owner_upd on stitchbook.tasks for update using (shop_id = stitchbook.my_shop() and stitchbook.is_owner());
create policy task_owner_del on stitchbook.tasks for delete using (shop_id = stitchbook.my_shop() and stitchbook.is_owner());

grant select, insert, update, delete on all tables in schema stitchbook to authenticated;
grant all on all tables in schema stitchbook to service_role;
revoke all on stitchbook.platform_admins from authenticated;
grant select on stitchbook.platform_admins to authenticated;

-- ------------------------------------------------------------------ RPCs
create or replace function stitchbook.new_code() returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6);
$$;

/** Sign-up step 2 for a designer: makes the shop and the owner account. */
create or replace function stitchbook.create_shop(p_name text, p_phone text, p_shop text, p_prefix text default 'SB')
returns uuid language plpgsql security definer set search_path = stitchbook, pg_temp as $$
declare sid uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if exists (select 1 from stitchbook.members where user_id = auth.uid()) then raise exception 'This account already belongs to a shop'; end if;
  if coalesce(trim(p_shop), '') = '' or coalesce(trim(p_name), '') = '' then raise exception 'Your name and the shop name are needed'; end if;
  insert into stitchbook.shops (name, phone, tag_prefix) values (trim(p_shop), coalesce(p_phone, ''), upper(coalesce(nullif(regexp_replace(p_prefix, '[^A-Za-z]', '', 'g'), ''), 'SB'))) returning id into sid;
  insert into stitchbook.shop_secrets values (sid, stitchbook.new_code());
  insert into stitchbook.members (user_id, shop_id, role, name, phone, status) values (auth.uid(), sid, 'owner', trim(p_name), coalesce(p_phone, ''), 'active');
  return sid;
end $$;

/** A tailor/apprentice joins a shop with the invite code; the owner then approves them. */
create or replace function stitchbook.join_shop(p_name text, p_phone text, p_code text)
returns uuid language plpgsql security definer set search_path = stitchbook, pg_temp as $$
declare sid uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if exists (select 1 from stitchbook.members where user_id = auth.uid()) then raise exception 'This account already belongs to a shop'; end if;
  select shop_id into sid from stitchbook.shop_secrets where invite_code = upper(trim(p_code));
  if sid is null then raise exception 'Wrong invite code — ask the shop owner for it'; end if;
  insert into stitchbook.members (user_id, shop_id, role, name, phone, status) values (auth.uid(), sid, 'staff', trim(p_name), coalesce(p_phone, ''), 'pending');
  return sid;
end $$;

/** Staff mark their task finished; the order moves on to the next stage. */
create or replace function stitchbook.staff_done(p_task uuid, p_done boolean default true)
returns void language plpgsql security definer set search_path = stitchbook, pg_temp as $$
declare t stitchbook.tasks; nxt text; stages text[] := array['received','cutting','sewing','fitting','finishing','ready','collected'];
begin
  select * into t from stitchbook.tasks where id = p_task and shop_id = stitchbook.my_shop() and (staff_id = auth.uid() or stitchbook.is_owner());
  if t.id is null then raise exception 'Task not found'; end if;
  if t.paid then raise exception 'This task is already paid'; end if;
  update stitchbook.tasks set done_at = case when p_done then now() else null end where id = p_task;
  if p_done then
    nxt = stages[array_position(stages, t.stage) + 1];
    update stitchbook.orders set stage = nxt, ready_on = case when nxt = 'ready' then current_date else ready_on end
      where id = t.order_id and array_position(stages, stage) <= array_position(stages, t.stage);
  end if;
end $$;

/** Public tracking page (no sign-in): only what the customer needs. */
create or replace function stitchbook.track_order(p_token text)
returns jsonb language sql stable security definer set search_path = stitchbook, pg_temp as $$
  select jsonb_build_object(
    'shop', jsonb_build_object('name', s.name, 'phone', s.phone, 'momo', s.momo, 'currency', s.currency, 'address', s.address),
    'order', jsonb_build_object('code', o.code, 'garment', o.garment, 'title', o.title, 'stage', o.stage, 'due_date', o.due_date,
      'fitting_date', o.fitting_date, 'ready_on', o.ready_on, 'collected_on', o.collected_on, 'style_photos', o.style_photos,
      'price', o.price, 'cancelled', o.cancelled,
      'paid', coalesce((select sum(amount) from stitchbook.payments p where p.order_id = o.id and not p.voided), 0)),
    'customer', split_part(c.name, ' ', 1))
  from stitchbook.orders o join stitchbook.shops s on s.id = o.shop_id join stitchbook.customers c on c.id = o.customer_id
  where o.track_token = p_token and length(p_token) >= 8;
$$;

/** Public online shop: published ready-made pieces (no costs). */
create or replace function stitchbook.shop_catalog(p_token text)
returns jsonb language sql stable security definer set search_path = stitchbook, pg_temp as $$
  select jsonb_build_object(
    'shop', jsonb_build_object('name', s.name, 'phone', s.phone, 'currency', s.currency, 'address', s.address, 'momo', s.momo),
    'products', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'category', p.category, 'price', p.price, 'sizes', p.sizes,
      'photos', p.photos, 'description', p.description) order by p.name) from stitchbook.products p where p.shop_id = s.id and p.published), '[]'::jsonb))
  from stitchbook.shops s
  where s.shop_token = p_token and length(p_token) >= 8
    and (s.trial_until >= current_date or (s.plan = 'business' and s.paid_until >= current_date));
$$;

/** Public group sign-up form: what the member sees before entering their measurements. */
create or replace function stitchbook.event_info(p_token text)
returns jsonb language sql stable security definer set search_path = stitchbook, pg_temp as $$
  select jsonb_build_object('shop', jsonb_build_object('name', s.name, 'phone', s.phone, 'currency', s.currency, 'unit', s.unit, 'momo', s.momo),
    'event', jsonb_build_object('name', e.name, 'event_date', e.event_date, 'garment', e.garment, 'price', e.price, 'open', e.open,
      'style_photos', e.style_photos, 'fabric_photo', e.fabric_photo, 'notes', e.notes,
      'joined', (select count(*) from stitchbook.orders o where o.event_id = e.id)))
  from stitchbook.events e join stitchbook.shops s on s.id = e.shop_id
  where e.join_token = p_token and length(p_token) >= 8;
$$;

/** Public group sign-up: the member's own measurements become a customer + measurement + order. Returns the tracking token. */
create or replace function stitchbook.event_join(p_token text, p_name text, p_phone text, p_gender text, p_unit text, p_values jsonb, p_note text default '')
returns text language plpgsql security definer set search_path = stitchbook, pg_temp as $$
declare e stitchbook.events; cid uuid; tok text; digits text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
begin
  select * into e from stitchbook.events where join_token = p_token and length(p_token) >= 8;
  if e.id is null then raise exception 'This link is not valid'; end if;
  if not e.open then raise exception 'Sign-up for this group is closed'; end if;
  if length(coalesce(trim(p_name), '')) < 2 or length(digits) < 9 then raise exception 'Please enter your name and phone number'; end if;
  if p_gender not in ('female', 'male', 'child') then p_gender = 'female'; end if;
  if (select count(*) from stitchbook.orders where event_id = e.id) >= 1000 then raise exception 'This group is full'; end if;
  if jsonb_typeof(p_values) <> 'object' or (select count(*) from jsonb_object_keys(p_values)) > 40 then raise exception 'Measurements look wrong'; end if;
  select id into cid from stitchbook.customers where shop_id = e.shop_id and right(regexp_replace(phone, '\D', '', 'g'), 9) = digits and lower(name) = lower(trim(p_name)) limit 1;
  if cid is null then
    cid = gen_random_uuid();
    insert into stitchbook.customers (id, shop_id, name, phone, gender) values (cid, e.shop_id, left(trim(p_name), 80), left(p_phone, 20), p_gender);
  end if;
  insert into stitchbook.measurements (id, shop_id, customer_id, unit, "values", note, source)
    values (gen_random_uuid(), e.shop_id, cid, case when p_unit = 'cm' then 'cm' else 'in' end, p_values, left(coalesce(p_note, ''), 300), 'self');
  if exists (select 1 from stitchbook.orders where event_id = e.id and customer_id = cid) then
    update stitchbook.orders set measurement = jsonb_build_object('gender', p_gender, 'unit', p_unit, 'values', p_values) where event_id = e.id and customer_id = cid returning track_token into tok;
    return tok;
  end if;
  tok = lower(stitchbook.new_code() || stitchbook.new_code());
  insert into stitchbook.orders (id, shop_id, customer_id, event_id, code, garment, title, style_photos, fabric_photo, fabric_note, measurement, price, due_date, notes, track_token)
    values (gen_random_uuid(), e.shop_id, cid, e.id, '', coalesce(nullif(e.garment, ''), 'Other'), e.name, e.style_photos, e.fabric_photo, e.fabric_note,
      jsonb_build_object('gender', p_gender, 'unit', p_unit, 'values', p_values), e.price, e.due_date, left(coalesce(p_note, ''), 300), tok);
  return tok;
end $$;

/** Platform admin: approve an upgrade (extends from today or the current expiry). */
create or replace function stitchbook.approve_upgrade(p_id uuid, p_credits int default null)
returns void language plpgsql security definer set search_path = stitchbook, pg_temp as $$
declare r stitchbook.upgrade_requests;
begin
  if not stitchbook.is_platform_admin() then raise exception 'Not allowed'; end if;
  select * into r from stitchbook.upgrade_requests where id = p_id and status = 'pending';
  if r.id is null then raise exception 'Request not found'; end if;
  update stitchbook.shops set plan = r.plan,
    paid_until = greatest(coalesce(paid_until, current_date), current_date) + make_interval(months => r.months),
    ai_credits = ai_credits + coalesce(p_credits, case when r.plan = 'business' then 20 * r.months else 0 end)
    where id = r.shop_id;
  update stitchbook.upgrade_requests set status = 'approved' where id = p_id;
end $$;

revoke all on function stitchbook.create_shop, stitchbook.join_shop, stitchbook.staff_done, stitchbook.approve_upgrade from public, anon;
grant execute on function stitchbook.create_shop, stitchbook.join_shop, stitchbook.staff_done, stitchbook.approve_upgrade to authenticated;
grant execute on function stitchbook.track_order, stitchbook.event_info, stitchbook.event_join, stitchbook.shop_catalog to anon, authenticated;
grant execute on function stitchbook.my_shop, stitchbook.is_owner, stitchbook.is_platform_admin to authenticated;

-- ------------------------------------------------------------------ photos (public bucket, unguessable names, one folder per shop)
insert into storage.buckets (id, name, public) values ('stitchbook', 'stitchbook', true) on conflict (id) do nothing;
create policy stitchbook_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'stitchbook' and (storage.foldername(name))[1] = stitchbook.my_shop()::text and stitchbook.is_owner());
create policy stitchbook_delete on storage.objects for delete to authenticated
  using (bucket_id = 'stitchbook' and (storage.foldername(name))[1] = stitchbook.my_shop()::text and stitchbook.is_owner());

/** Platform admin: every shop with its size. */
create or replace function stitchbook.admin_shops()
returns table (id uuid, name text, phone text, plan text, paid_until date, trial_until date, ai_credits int, created_at timestamptz, customers bigint, orders bigint, owner text)
language plpgsql stable security definer set search_path = stitchbook, pg_temp as $$
begin
  if not stitchbook.is_platform_admin() then raise exception 'Not allowed'; end if;
  return query select s.id, s.name, s.phone, s.plan, s.paid_until, s.trial_until, s.ai_credits, s.created_at,
    (select count(*) from stitchbook.customers c where c.shop_id = s.id),
    (select count(*) from stitchbook.orders o where o.shop_id = s.id),
    (select m.name || ' · ' || m.phone from stitchbook.members m where m.shop_id = s.id and m.role = 'owner' limit 1)
  from stitchbook.shops s order by s.created_at desc;
end $$;
revoke all on function stitchbook.admin_shops from public, anon;
grant execute on function stitchbook.admin_shops to authenticated;
