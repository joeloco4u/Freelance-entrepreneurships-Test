-- =============================================================================
-- 20261119_sedes_full_baseline.sql
--
-- Brings a LEGACY single-sede Supabase database up to the multi-location
-- (Sedes) baseline required by backend HEAD.
--
-- Idempotent and transactional. Safe to re-run.
--
-- Already present on the target DB (verified with the A1 diagnostic):
--   core tables, users.is_active, sales.note, get_active_session_count,
--   on_auth_user_created.
--
-- NOTE: public.sale_items.subtotal is a GENERATED column. The RPC below
--       therefore inserts only (sale_id, product_id, quantity, unit_price);
--       Postgres computes subtotal. Inserting it raises SQLSTATE 428C9.
--
-- Rollback (lossy, reverse order):
--   drop function if exists public.process_location_checkout(uuid,numeric,text,text,text,text,jsonb);
--   alter table public.sales drop constraint if exists sales_location_id_fkey;
--   drop index if exists public.sales_location_id_idx;
--   alter table public.sales alter column location_id drop not null;
--   alter table public.sales alter column location_id drop default;
--   alter table public.sales drop column if exists location_id;
--   drop table if exists public.product_stock;
--   alter table public.entrepreneurships drop column if exists description;
--   delete from public.locations where code in ('VF','GO');
--   drop table if exists public.locations;
--   alter table public.sale_items enable trigger trigger_reduce_stock;
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. public.locations
-- -----------------------------------------------------------------------------
create table if not exists public.locations (
  code       text primary key,
  name       text not null,
  created_at timestamptz not null default now()
);

insert into public.locations (code, name) values
  ('VF', 'Valle Frío'),
  ('GO', 'Grano de Oro')
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- 2. public.product_stock
-- -----------------------------------------------------------------------------
create table if not exists public.product_stock (
  product_id  uuid    not null references public.products(id) on delete cascade,
  location_id text    not null references public.locations(code)
                      on update cascade on delete restrict,
  stock       integer not null default 0,
  constraint product_stock_stock_non_negative check (stock >= 0),
  constraint product_stock_pkey primary key (product_id, location_id)
);

create index if not exists product_stock_location_id_idx
  on public.product_stock (location_id);

-- No policies on purpose: the backend uses the service role (bypasses RLS) and
-- the frontend never queries tables directly (auth only).
alter table public.product_stock enable row level security;

-- -----------------------------------------------------------------------------
-- 3. public.sales.location_id
-- -----------------------------------------------------------------------------
alter table public.sales add column if not exists location_id text;

update public.sales set location_id = 'VF' where location_id is null;

alter table public.sales alter column location_id set default 'VF';
alter table public.sales alter column location_id set not null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint c
      join pg_attribute a
        on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.contype = 'f'
       and c.conrelid  = 'public.sales'::regclass
       and c.confrelid = 'public.locations'::regclass
       and a.attname   = 'location_id'
  ) then
    alter table public.sales
      add constraint sales_location_id_fkey
      foreign key (location_id) references public.locations(code)
      on update cascade on delete restrict;
  end if;
end $$;

create index if not exists sales_location_id_idx on public.sales (location_id);

-- -----------------------------------------------------------------------------
-- 4. Backfill product_stock
-- -----------------------------------------------------------------------------
-- Simple products: VF mirrors the legacy scalar, GO starts at 0.
insert into public.product_stock (product_id, location_id, stock)
select p.id, 'VF', greatest(coalesce(p.current_stock, 0), 0)
  from public.products p
 where coalesce(p.is_composed, false) = false
on conflict (product_id, location_id) do nothing;

insert into public.product_stock (product_id, location_id, stock)
select p.id, 'GO', 0
  from public.products p
 where coalesce(p.is_composed, false) = false
on conflict (product_id, location_id) do nothing;

-- Composed products: one offering row per sede; availability is computed at read.
insert into public.product_stock (product_id, location_id, stock)
select p.id, l.code, 0
  from public.products p
 cross join (values ('VF'), ('GO')) as l(code)
 where p.is_composed = true
on conflict (product_id, location_id) do nothing;

-- -----------------------------------------------------------------------------
-- 5. public.process_location_checkout
-- -----------------------------------------------------------------------------
create or replace function public.process_location_checkout(
  p_consumer_id    uuid,
  p_total          numeric,
  p_payment_type   text,
  p_payment_method text,
  p_note           text,
  p_location_id    text,
  p_cart_items     jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale       public.sales;
  v_sale_id    uuid;
  v_item       jsonb;
  v_product_id uuid;
  v_quantity   integer;
  v_unit_price numeric;
  v_composed   boolean;
  v_comp       record;
begin
  if not exists (select 1 from public.locations where code = p_location_id) then
    raise exception 'process_location_checkout: unknown location %', p_location_id
      using errcode = '23503';
  end if;

  if p_cart_items is null
     or jsonb_typeof(p_cart_items) <> 'array'
     or jsonb_array_length(p_cart_items) = 0 then
    raise exception 'process_location_checkout: p_cart_items must be a non-empty JSON array'
      using errcode = '22023';
  end if;

  -- jsonb_populate_record casts the incoming text values into the real
  -- enum/domain types of sales.payment_type / sales.payment_method without
  -- hard-coding their type names here.
  v_sale := jsonb_populate_record(
    null::public.sales,
    jsonb_build_object(
      'consumer_id',    p_consumer_id,
      'total',          p_total,
      'payment_type',   p_payment_type,
      'payment_method', p_payment_method,
      'note',           p_note,
      'location_id',    p_location_id
    )
  );

  insert into public.sales
    (consumer_id, total, payment_type, payment_method, note, location_id)
  values
    (v_sale.consumer_id, v_sale.total, v_sale.payment_type,
     v_sale.payment_method, v_sale.note, v_sale.location_id)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_cart_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity   := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric;

    if v_product_id is null or v_quantity is null or v_quantity < 1 then
      raise exception 'process_location_checkout: invalid cart item %', v_item
        using errcode = '23514';
    end if;

    -- subtotal is GENERATED ALWAYS AS (quantity * unit_price) STORED:
    -- never insert it (SQLSTATE 428C9).
    insert into public.sale_items (sale_id, product_id, quantity, unit_price)
    values (v_sale_id, v_product_id, v_quantity, v_unit_price);

    select coalesce(is_composed, false) into v_composed
      from public.products where id = v_product_id;

    if not found then
      raise exception 'process_location_checkout: product % not found', v_product_id
        using errcode = '23503';
    end if;

    if v_composed then
      for v_comp in
        select component_product_id, quantity
          from public.composed_product_components
         where composed_product_id = v_product_id
         order by component_product_id
      loop
        update public.product_stock
           set stock = stock - (v_comp.quantity * v_quantity)
         where product_id = v_comp.component_product_id
           and location_id = p_location_id;

        if not found then
          raise exception 'process_location_checkout: component % not offered at %',
            v_comp.component_product_id, p_location_id
            using errcode = '23514';
        end if;
      end loop;
    else
      update public.product_stock
         set stock = stock - v_quantity
       where product_id = v_product_id
         and location_id = p_location_id;

      if not found then
        raise exception 'process_location_checkout: product % not offered at %',
          v_product_id, p_location_id
          using errcode = '23514';
      end if;

      -- Keep the legacy VF mirror aligned while products.current_stock exists.
      if p_location_id = 'VF' then
        update public.products
           set current_stock = greatest(0, current_stock - v_quantity)
         where id = v_product_id
           and coalesce(is_composed, false) = false;
      end if;
    end if;
  end loop;

  return v_sale_id;
end;
$$;

revoke all on function public.process_location_checkout(uuid, numeric, text, text, text, text, jsonb) from PUBLIC;
revoke all on function public.process_location_checkout(uuid, numeric, text, text, text, text, jsonb) from anon;
revoke all on function public.process_location_checkout(uuid, numeric, text, text, text, text, jsonb) from authenticated;
grant execute on function public.process_location_checkout(uuid, numeric, text, text, text, text, jsonb) to service_role;

-- -----------------------------------------------------------------------------
-- 6. Disable the legacy stock trigger (name-agnostic)
-- -----------------------------------------------------------------------------
-- The legacy trigger is named `trigger_reduce_stock` and executes
-- reduce_stock_on_sale(). Match by function so a rename cannot leave it enabled.
do $$
declare
  r record;
begin
  for r in
    select t.tgname
      from pg_trigger t
      join pg_proc p on p.oid = t.tgfoid
     where t.tgrelid = 'public.sale_items'::regclass
       and not t.tgisinternal
       and (p.proname = 'reduce_stock_on_sale'
            or t.tgname in ('trigger_reduce_stock', 'reduce_stock_on_sale'))
       and t.tgenabled <> 'D'
  loop
    execute format('alter table public.sale_items disable trigger %I', r.tgname);
    raise notice 'Disabled trigger % on public.sale_items.', r.tgname;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 7. Parity extras (idempotent)
-- -----------------------------------------------------------------------------
-- Whitelisted by updateEntrepreneurship; unused by the UI today.
alter table public.entrepreneurships add column if not exists description text;

-- uploadImageService.ts hard-codes this public bucket.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

commit;
