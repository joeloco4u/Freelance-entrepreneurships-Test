-- Phase 4 / Test-only change.
--
-- The RPC public.process_location_checkout is now the sole stock-deduction owner.
-- The reduce_stock_on_sale trigger must NOT also deduct stock, otherwise every
-- sale would double-deduct. The trigger is intentionally DISABLED (not dropped)
-- so it can be re-enabled for rollback.
--
-- Ordering: this file is dated 2026-11-06 so it sorts AFTER
-- 20261105_reduce_stock_on_sale.sql (lexicographic ordering). That guarantees
-- the trigger exists before this migration disables it.
--
-- Rollback requires BOTH steps:
--   1. Deploy a controller that does not call process_location_checkout (or make
--      the RPC stop deducting stock).
--   2. ALTER TABLE public.sale_items ENABLE TRIGGER reduce_stock_on_sale;
-- Enabling the trigger while the RPC still deducts stock double-deducts.
--
-- public.process_location_checkout is not yet versioned in this repository.
-- Extract it with pg_get_functiondef before promoting this change beyond Test.

DO $$
DECLARE
  v_tgenabled text;
BEGIN
  IF to_regclass('public.sale_items') IS NULL THEN
    RAISE EXCEPTION 'public.sale_items does not exist; refusing to disable reduce_stock_on_sale.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'process_location_checkout'
  ) THEN
    RAISE EXCEPTION 'public.process_location_checkout does not exist; refusing to disable reduce_stock_on_sale on an environment without the RPC.';
  END IF;

  SELECT t.tgenabled::text
    INTO v_tgenabled
    FROM pg_trigger t
   WHERE t.tgname = 'reduce_stock_on_sale'
     AND t.tgrelid = 'public.sale_items'::regclass;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reduce_stock_on_sale trigger is absent on public.sale_items; apply 20261105_reduce_stock_on_sale.sql first.';
  END IF;

  IF v_tgenabled = 'D' THEN
    RAISE NOTICE 'reduce_stock_on_sale trigger is already disabled on public.sale_items; skipping.';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.sale_items DISABLE TRIGGER reduce_stock_on_sale';

  SELECT t.tgenabled::text
    INTO v_tgenabled
    FROM pg_trigger t
   WHERE t.tgname = 'reduce_stock_on_sale'
     AND t.tgrelid = 'public.sale_items'::regclass;

  IF v_tgenabled IS DISTINCT FROM 'D' THEN
    RAISE EXCEPTION 'reduce_stock_on_sale is still enabled on public.sale_items after ALTER TABLE (tgenabled=%).', v_tgenabled;
  END IF;

  RAISE NOTICE 'reduce_stock_on_sale trigger disabled on public.sale_items.';
END;
$$;
