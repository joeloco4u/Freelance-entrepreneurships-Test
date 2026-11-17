-- WARNING: Before applying this migration, verify:
--   1. product_stock.location_id is text/varchar (or cast l.code to the actual
--      enum type used by location_id).
--   2. If location_id has an FK to locations(code), the VF and GO rows exist.
--
-- Ensure every composed product has a product_stock row for every location.
-- Row existence is the "offered" signal; stock is a placeholder and is recomputed at read time.
-- Safe to re-run: the ON CONFLICT clause skips rows that already exist.
insert into public.product_stock (product_id, location_id, stock)
select p.id, l.code, 0
from public.products p
cross join (values ('VF'), ('GO')) as l(code)
where p.is_composed = true
on conflict (product_id, location_id) do nothing;
