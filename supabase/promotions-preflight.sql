-- READ ONLY. Run in the intended STAGING project, then production before rollout.
-- This reports schema/policies/triggers, not customer records or credentials.
select current_database(), current_user;
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('orders', 'products', 'product_variants', 'shipping_methods')
order by table_name, ordinal_position;
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
  and tablename in ('orders', 'products', 'product_variants', 'shipping_methods');
select tgname, pg_get_triggerdef(oid) as definition, pg_get_functiondef(tgfoid) as function_definition
from pg_trigger where tgrelid = 'public.orders'::regclass and not tgisinternal;
select product_code, count(*) from public.product_variants group by product_code having count(*) > 1;
select name, count(*) from public.shipping_methods group by name having count(*) > 1;
select to_regclass('public.promotions') as existing_promotions;
