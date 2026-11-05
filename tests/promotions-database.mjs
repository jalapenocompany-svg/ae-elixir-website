// Uses disposable PostgreSQL, NEVER the configured Supabase database.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create table products(id int primary key, active boolean);
  create table product_variants(product_code text, product_id int, price_zone1 numeric, stock_quantity int, active boolean);
  create table shipping_methods(name text, price numeric, enabled boolean);
  create table orders(id int generated always as identity, items jsonb, subtotal numeric,
    shipping_method text, shipping_price numeric, total numeric, order_status text, customer_name text);
  insert into products values (1, true);
  insert into product_variants values ('TEST', 1, 50, 20, true), ('LOW', 1, 49.99, 20, true), ('PENNY', 1, 0.05, 20, true);
  insert into shipping_methods values ('standard', 10, true), ('express', 20, true), ('disabled', 0, false);
  grant usage on schema public to anon, authenticated;
  grant insert, select, update on orders to anon;
  grant usage on all sequences in schema public to anon;
`);
await db.exec(await readFile(new URL('../supabase/migrations/202611050001_scheduled_promotions.sql', import.meta.url), 'utf8'));
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
async function fails(sql, pattern) { await assert.rejects(() => db.query(sql), pattern); }
const items = `[{"product_code":"TEST","quantity":2,"price":50,"line_total":100}]`;
const quote = (code = 'ACTIVE', cart = items, ship = 'standard') => `select quote_promotion('${code}', '${cart}'::jsonb, '${ship}') as q`;
await check('HOLIDAY10 exact Eastern schedule and minimum', async () => {
  const { rows: [p] } = await db.query(`select percent_off::text, minimum_subtotal::text, starts_at, ends_at from promotions where code='HOLIDAY10'`);
  assert.equal(p.percent_off, '10.00'); assert.equal(p.minimum_subtotal, '100.00');
  assert.equal(new Date(p.starts_at).toISOString(), '2026-11-16T05:00:00.000Z');
  assert.equal(new Date(p.ends_at).toISOString(), '2026-12-01T05:00:00.000Z');
});
await db.exec(`insert into promotions(code, percent_off, minimum_subtotal, starts_at, ends_at, banner_text) values
 ('ACTIVE',10,100,now()-interval '1 day',now()+interval '1 day','Test banner'),
 ('FUTURE',10,100,now()+interval '1 day',now()+interval '2 days','Future banner'),
 ('EXPIRED',10,100,now()-interval '2 days',now()-interval '1 day','Expired banner'),
 ('OFF',10,100,now()-interval '1 day',now()+interval '1 day','Disabled banner'),
 ('ROUND',10,0,now()-interval '1 day',now()+interval '1 day','');
 update promotions set enabled=false where code='OFF';`);
await check('10% on exactly $100, shipping excluded, normalized code', async () => {
  const {rows:[{q}]} = await db.query(quote(' active '));
  assert.equal(q.code,'ACTIVE'); assert.equal(q.subtotal,100); assert.equal(q.discount_amount,10); assert.equal(q.total,100); assert.equal(q.shipping_price,10);
  assert(Number.isFinite(Date.parse(q.server_now)));
});
await check('shipping cannot satisfy minimum', () => fails(quote('ACTIVE', '[{"product_code":"LOW","quantity":2}]'), /at least/));
await check('future, expired, disabled and unknown codes rejected', async () => {
  for (const [code, pattern] of [['FUTURE', /not started/], ['EXPIRED', /expired/], ['OFF', /not valid/], ['UNKNOWN', /not valid/]]) await fails(quote(code), pattern);
});
await check('invalid quantities, duplicate products, unavailable and disabled shipping rejected', async () => {
  for (const qty of [0,-1,1.5,10000]) await fails(quote('ACTIVE', JSON.stringify([{product_code:'TEST', quantity:qty}])), /quantity/);
  await fails(quote('ACTIVE', '[{"product_code":"TEST","quantity":2},{"product_code":"TEST","quantity":2}]'), /Duplicate/);
  await fails(quote('ACTIVE', '[{"product_code":"MISSING","quantity":2}]'), /unavailable/);
  await fails(quote('ACTIVE', items, 'disabled'), /unavailable/);
  await fails(quote('ACTIVE', '[{"product_code":"TEST","quantity":21}]'), /stock/);
});
await check('cent rounding is half up', async () => {
  const {rows:[{q}]}=await db.query(quote('ROUND','[{"product_code":"PENNY","quantity":1}]'));
  assert.equal(q.discount_amount,0.01); assert.equal(q.total,10.04);
});
await check('start inclusive / end exclusive at exact statement timestamp', () => db.exec(`do $$ begin
  insert into promotions(code,percent_off,minimum_subtotal,starts_at,ends_at) values
    ('BOUNDARY',10,0,statement_timestamp(),statement_timestamp()+interval '1 day');
  perform quote_promotion('BOUNDARY','${items}'::jsonb,'standard');
  update promotions set starts_at=statement_timestamp()-interval '1 day',ends_at=statement_timestamp() where code='BOUNDARY';
  begin perform quote_promotion('BOUNDARY','${items}'::jsonb,'standard'); raise exception 'expected expiration';
  exception when others then if sqlerrm not like '%has expired%' then raise; end if; end;
end $$;`));
const insert = (total=100, discount=10, cart=items, code="'ACTIVE'", subtotal=100, shipping=10) => `insert into orders(items,subtotal,shipping_method,shipping_price,total,promotion_code,discount_amount) values ('${cart}',${subtotal},'standard',${shipping},${total},${code},${discount}) returning id`;
await check('direct order insert cannot forge discount, totals, prices or subtotal', async () => {
  await fails(insert(1), /changed/); await fails(insert(99,11), /changed/);
  await fails(insert(100,10,items,"'ACTIVE'",99), /changed/);
  await fails(insert(100,10,items,"'ACTIVE'",100,0), /changed/);
  await fails(insert(100,10,items.replace('"price":50','"price":1')), /Item prices/);
  await fails(insert(90,10,items,'null'), /valid promotion/);
  await fails(insert(1,0,items,'null'), /changed/);
  await fails(insert(110,0,items.replace('"price":50','"price":1'),'null'), /Item prices/);
});
let orderId;
await check('anonymous checkout can apply a valid promotion', async () => {
  await db.exec('set role anon');
  const {rows:[{id}]}=await db.query(insert()); orderId=id;
  await db.exec('reset role');
});
await check('non-promotion legacy checkout and status edits work', async () => {
  await db.query(insert(110,0,items,'null'));
  await db.query(`update orders set order_status='shipped',customer_name='Updated' where id=${orderId}`);
});
await check('old discounts survive expiration and shipping edits', async () => {
  await db.exec(`update promotions set ends_at=now()-interval '1 hour',starts_at=now()-interval '1 day' where code='ACTIVE'`);
  await db.query(`update orders set shipping_method='express',shipping_price=20,total=110 where id=${orderId}`);
  await fails(`update orders set total=120 where id=${orderId}`, /saved promotion discount/);
  await fails(`update orders set promotion_code=null where id=${orderId}`, /cannot be changed/);
  await fails(`update orders set discount_amount=11 where id=${orderId}`, /cannot be changed/);
  await fails(insert(), /expired/);
});
await check('promotion cannot be added retroactively', () => fails(`update orders set promotion_code='ROUND' where promotion_code is null`, /when placing/));
await check('public banner excludes inactive and scheduled promotions', async () => {
  const { rows }=await db.query('select * from active_storefront_promotions()');
  assert(!rows.some(p=>['ACTIVE','FUTURE','EXPIRED','OFF'].includes(p.code)));
});
await check('anonymous roles cannot manage promotions or read schedule table', async () => {
  await db.exec('set role anon');
  await fails(`update promotions set percent_off=100`, /permission denied/);
  await fails(`select * from promotions`, /permission denied/);
  await db.query('select * from active_storefront_promotions()');
  const {rows:[{schedule}]}=await db.query('select storefront_promotion_schedule() as schedule');
  assert(Number.isFinite(Date.parse(schedule.server_now)));
  assert(schedule.next_change_at);
  assert(!schedule.promotions.some(row=>['FUTURE','EXPIRED','OFF'].includes(row.code)));
  await db.exec('reset role');
});
await check('string quantities, markup codes, and nonfinite catalog prices are rejected',async()=>{
  await fails(quote('ROUND','[{"product_code":"TEST","quantity":"2"}]'),/quantity/);
  await fails(quote('<SCRIPT>'),/not valid/);
  await db.exec("update product_variants set price_zone1='NaN'::numeric where product_code='TEST'");
  await fails(quote('ROUND'),/Invalid product price/);
  await db.exec("update product_variants set price_zone1=50 where product_code='TEST'");
});
await db.close();
console.log(`${passed} database checks passed; no remote database used.`);
