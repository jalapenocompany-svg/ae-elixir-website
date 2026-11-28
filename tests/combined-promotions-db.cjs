const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
(async () => {
 const db = new PGlite();
 await db.exec(`
 create role anon; create role authenticated; create role service_role;
 create table products (id uuid primary key, active boolean);
 create table product_variants (product_code text primary key, product_id uuid references products, active boolean, price_zone1 numeric, stock_quantity int);
 create table shipping_methods (name text primary key, enabled boolean, price numeric);
 create table promo_codes (
 code text primary key, percent_off numeric, fixed_amount numeric, discount_type text default 'percentage',
 minimum_subtotal numeric default 0, enabled boolean default false, starts_at timestamptz, ends_at timestamptz,
 max_uses int, uses bigint default 0, eligible_shipping_method text,
 constraint promo_codes_eligible_shipping_method_valid check (eligible_shipping_method is null or discount_type='free_shipping'));
 create table orders (
 id uuid primary key default gen_random_uuid(), subtotal numeric, total numeric, items jsonb,
 shipping_price numeric, shipping_method text, discount_amount numeric default 0, shipping_discount_amount numeric default 0,
 promo_code text references promo_codes, customer_email text, payment_status text default 'pending', order_status text default 'pending',
 created_at timestamptz default now(),
 constraint orders_discount_amount_valid check (
 (promo_code is null and discount_amount=0 and shipping_discount_amount=0)
 or (promo_code is not null and ((discount_amount>0 and shipping_discount_amount=0)
 or (discount_amount=0 and shipping_discount_amount=shipping_price)))));
 insert into products values ('00000000-0000-0000-0000-000000000001',true);
 insert into product_variants values ('ITEM','00000000-0000-0000-0000-000000000001',true,100,50);
 insert into shipping_methods values ('standard',true,10),('express',true,15),('pickup',true,0),('disabled',false,10);
 insert into promo_codes(code,discount_type,percent_off,fixed_amount,enabled,eligible_shipping_method) values
 ('PERCENT','percentage',20,null,true,null),('FIXED','fixed',null,10,true,null),('SHIP','free_shipping',null,null,true,'standard');
 insert into orders(subtotal,total,items,shipping_price,shipping_method,promo_code,discount_amount) values
 (100,90,'[{"product_code":"ITEM","quantity":1,"price":100}]',10,'standard','PERCENT',20);
 `);
 const history = (await db.query('select * from orders')).rows;
 const migration = fs.readFileSync(path.join(root,'supabase/migrations/202611280001_combined_promo_shipping.sql'),'utf8');
 await db.exec(migration);
 await db.exec(migration); // safe rerun
 assert.deepEqual((await db.query('select * from orders')).rows,history);
 assert.equal((await db.query('select count(*)::int n from promo_codes where includes_free_shipping')).rows[0].n,0);
 await db.exec(`create trigger enforce_order_promo_code before insert or update on orders for each row execute function enforce_order_promo_code();
 insert into promo_codes(code,discount_type,percent_off,fixed_amount,enabled,includes_free_shipping,eligible_shipping_method,minimum_subtotal,max_uses) values
 ('COMBO','percentage',20,null,true,true,'standard',100,10),
 ('COMBOFIX','fixed',null,10,true,true,null,0,null),
 ('CAPPED','fixed',null,500,true,true,null,0,null),
 ('ONCE','percentage',20,null,true,true,'standard',0,1),
 ('OFF','percentage',20,null,false,true,null,0,null),
 ('EXPIRED','percentage',20,null,true,true,null,0,null);
 update promo_codes set ends_at=now()-interval '1 day' where code='EXPIRED';
 `);
 const items=[{product_code:'ITEM',quantity:1,price:100}];
 const quote=async code=>(await db.query('select quote_promo_code($1,$2::jsonb) q',[code,JSON.stringify(items)])).rows[0].q;
 assert.equal((await quote('COMBO')).includes_free_shipping,true);
 assert.equal((await quote('PERCENT')).includes_free_shipping,false);
 assert.equal((await quote('SHIP')).includes_free_shipping,true);
 async function order(code,method='standard',shipping=10,shipDiscount=0,extra={}){
  const data={subtotal:100,total:9999,items:JSON.stringify(items),shipping_price:shipping,shipping_method:method,promo_code:code,shipping_discount_amount:shipDiscount,...extra};
  const keys=Object.keys(data);
  return (await db.query(`insert into orders(${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(data))).rows[0];
 }
 const combo=await order('COMBO','standard',10,10,{discount_amount:99});
 assert.equal(Number(combo.discount_amount),20); assert.equal(Number(combo.shipping_discount_amount),10); assert.equal(Number(combo.total),80);
 assert.equal((await db.query("select uses from promo_codes where code='COMBO'")).rows[0].uses,1);
 assert.equal(Number((await order('COMBOFIX','express',15,15)).total),90);
 assert.equal(Number((await order('CAPPED','express',15,15)).total),0);
 assert.equal(Number((await order('PERCENT')).total),90);
 assert.equal(Number((await order('FIXED')).total),100);
 assert.equal(Number((await order('SHIP','standard',10,10)).total),100);
 // Legacy non-promoted orders still work and cannot inject discounts.
 const plain=await order(null,'standard',10,10,{discount_amount:20,total:110});
 assert.equal(Number(plain.shipping_discount_amount),0); assert.equal(Number(plain.discount_amount),0);
 const fails=async (label,fn,regex)=>{await assert.rejects(fn,regex); console.log('PASS rejection:',label);};
 await fails('wrong shipping method',()=>order('COMBO','express',15,15),/does not cover/);
 await fails('pickup with combo',()=>order('COMBOFIX','pickup',0,0),/paid shipping/);
 await fails('forged shipping price',()=>order('COMBO','standard',1,1),/shipping selection/);
 await fails('missing shipping benefit on stale client',()=>order('COMBO'),/apply the free-shipping/);
 await fails('forged line price',()=>order('COMBO','standard',10,10,{items:JSON.stringify([{...items[0],price:1}])}),/price changed/);
 await fails('minimum subtotal',()=>order('COMBO','standard',10,10,{subtotal:50,items:JSON.stringify([{...items[0],quantity:1}])}).then(()=>{}),/price changed/);
 await db.exec("update promo_codes set minimum_subtotal=101 where code='COMBO'");
 await fails('minimum merchandise amount',()=>quote('COMBO'),/requires a merchandise/);
 await db.exec("update promo_codes set minimum_subtotal=100 where code='COMBO'");
 await fails('disabled code',()=>quote('OFF'),/unavailable/);
 await fails('expired code',()=>quote('EXPIRED'),/unavailable/);
 await order('ONCE','standard',10,10);
 await fails('usage cap',()=>order('ONCE','standard',10,10),/usage limit/);
 await db.query("update orders set payment_status='paid', order_status='processing' where id=$1",[combo.id]);
 assert.equal(Number((await db.query('select total from orders where id=$1',[combo.id])).rows[0].total),80);
 await fails('changing saved discounts',()=>db.query('update orders set discount_amount=0 where id=$1',[combo.id]),/cannot be changed/);
 await fails('changing combo shipping',()=>db.query("update orders set shipping_method='express', shipping_price=15 where id=$1",[combo.id]),/shipping method cannot/);
 // Load actual referral migrations against this isolated schema, then test a voucher redemption.
 await db.exec(`create table referrer_profiles(id uuid primary key, code text, display_name text, email text, enabled boolean,
 reward_type text, reward_value integer, minimum_order_cents integer);`);
 for (const name of ['202611170002_referral_order_attribution.sql','202611170003_referral_earned_credits.sql','202611170004_referral_credit_vouchers.sql','202611170009_prevent_referral_credit_reearning.sql','202611270001_checkout_acknowledgment.sql']){
  await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',name),'utf8'));
 }
 const person='00000000-0000-0000-0000-000000000002';
 await db.exec(`insert into referrer_profiles values ('${person}','MARIA','Maria','maria@test.invalid',true,'fixed',3000,0);`);
 const earning=await order('COMBO','standard',10,10,{referral_code:'MARIA',customer_email:'customer@test.invalid'});
 await db.query("update orders set payment_status='paid' where id=$1",[earning.id]);
 const voucher=(await db.query('select issue_referral_credit_voucher(gen_random_uuid(),$1,3000) v',[person])).rows[0].v;
 const redeemed=await order(voucher.promo_code,'standard',10,0,{referral_code:'MARIA',customer_email:'customer@test.invalid'});
 assert.equal(Number(redeemed.total),80); // 100-30+10
 await db.query("update orders set payment_status='paid' where id=$1",[redeemed.id]);
 assert.equal((await db.query('select active from referral_order_credits where order_id=$1',[redeemed.id])).rows[0].active,false);
 await db.query("update orders set order_status='cancelled' where id=$1",[redeemed.id]);
 assert.equal((await db.query('select status from referral_credit_vouchers where order_id=$1',[redeemed.id])).rows[0].status,'released');
 assert.equal((await db.query("select uses from promo_codes where code='COMBO'")).rows[0].uses,2);
 console.log('PASS: migration/rerun/history, percent/fixed/shipping/combined totals, one-use counter, price checks, immutable orders, referral vouchers and credit return.');
 await db.close();
})().catch(e=>{console.error(e);process.exit(1)});
