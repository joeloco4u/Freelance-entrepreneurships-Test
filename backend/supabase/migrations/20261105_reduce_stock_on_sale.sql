-- Versioned definition of the per-location stock deduction trigger.
-- Extracted from the live Supabase project and verified on 2026-11-05.
-- The trigger resolves the sede from the parent sale (public.sales.location_id)
-- and deducts from public.product_stock(product_id, location_id).
-- A sale without location_id aborts with SQLSTATE 23502.

CREATE OR REPLACE FUNCTION public.reduce_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
AS $$
declare
  v_location_id text;
  comp_record record;
begin
  -- 1. Resolve the sede that owns this sale.
  select s.location_id
    into v_location_id
    from public.sales s
   where s.id = new.sale_id;

  -- 2. Fail safe when the sale has no location.
  if v_location_id is null then
    raise exception 'reduce_stock_on_sale: sale % has no location_id', new.sale_id
      using errcode = '23502';
  end if;

  -- 3. Composed product: deduct its ingredients at this sede.
  if exists (
    select 1
      from public.products
     where id = new.product_id
       and is_composed = true
  ) then
    for comp_record in
      select component_product_id, quantity
        from public.composed_product_components
       where composed_product_id = new.product_id
    loop
      update public.product_stock
         set stock = stock - (comp_record.quantity * new.quantity)
       where product_id = comp_record.component_product_id
         and location_id = v_location_id;

      if not found then
        raise exception 'reduce_stock_on_sale: component % is not offered at location % (sale %)',
          comp_record.component_product_id, v_location_id, new.sale_id;
      end if;
    end loop;

  -- 4. Simple product: deduct stock directly at this sede.
  else
    update public.product_stock
       set stock = stock - new.quantity
     where product_id = new.product_id
       and location_id = v_location_id;

    if not found then
      raise exception 'reduce_stock_on_sale: product % is not offered at location % (sale %)',
        new.product_id, v_location_id, new.sale_id;
    end if;
  end if;

  return new;
end;
$$;

-- Idempotent trigger definition on public.sale_items.
drop trigger if exists reduce_stock_on_sale on public.sale_items;

create trigger reduce_stock_on_sale
after insert on public.sale_items
for each row
execute function public.reduce_stock_on_sale();
