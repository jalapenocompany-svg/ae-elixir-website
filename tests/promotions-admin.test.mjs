import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const compiled = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const promotions = { exports: {}, process: { env: {} } };
vm.runInNewContext(compiled(await readFile(new URL('../lib/promotions.ts', import.meta.url), 'utf8')), promotions);
let saved;
const database = { from(table) {
  if (table === 'shipping_methods') return { select() { return this; }, eq() { return this; }, gt() { return this; }, maybeSingle: async () => ({ data: { name: 'standard' }, error: null }) };
  const write = values => { saved = values; return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: values, error: null }) }; };
  return { insert: write, update: write };
} };
const context = { exports: {}, Buffer, Response, console, process: { env: { NEXT_PUBLIC_PROMOTIONS_ENABLED: 'true', PROMO_ADMIN_KEY: 'test-only-password' } }, require(name) {
  if (name === 'node:crypto') return { timingSafeEqual: (a,b) => a.equals(b) };
  if (name === '@/lib/promotions') return promotions.exports;
  if (name === '@/lib/ads-server') return { adsDatabase: () => database, adsReply: (body,status=200) => Response.json(body,{status}) };
  throw new Error(`Unexpected dependency ${name}`);
} };
vm.runInNewContext(compiled(await readFile(new URL('../app/api/admin/promo-codes/route.ts',import.meta.url),'utf8')),context);
const base = { code:'COMBO20', discount_type:'percentage', percent_off:20, fixed_amount:null, minimum_subtotal:100, max_uses:10, enabled:true, starts_at:null, ends_at:null };
async function save(extra={}, password='test-only-password') {
  saved = undefined;
  return context.exports.POST(new Request('http://localhost/api/admin/promo-codes',{ method:'POST', headers:{'Content-Type':'application/json','x-promo-admin-key':password}, body:JSON.stringify({mode:'create',promo:{...base,...extra}}) }));
}
test('admin saves one combined code with shared rules and shipping method', async () => {
  assert.equal((await save({includes_free_shipping:true,eligible_shipping_method:'standard'})).status,200);
  assert.equal(saved.includes_free_shipping,true);
  assert.equal(saved.percent_off,20);
  assert.equal(saved.eligible_shipping_method,'standard');
  assert.equal(saved.max_uses,10);
});
test('ordinary percent/fixed/shipping codes retain their behavior', async () => {
  assert.equal((await save()).status,200);
  assert.equal(saved.includes_free_shipping,false);
  assert.equal((await save({discount_type:'fixed',percent_off:null,fixed_amount:10,includes_free_shipping:true})).status,200);
  assert.equal(saved.fixed_amount,10);
  assert.equal((await save({discount_type:'free_shipping',percent_off:null,eligible_shipping_method:'standard'})).status,200);
});
test('invalid shipping configuration and unauthenticated writes are rejected',async () => {
  for (const values of [{includes_free_shipping:'true'},{eligible_shipping_method:'standard'},{includes_free_shipping:true,eligible_shipping_method:12}]) {
    assert.equal((await save(values)).status,400);
    assert.equal(saved,undefined);
  }
  assert.equal((await save({},'wrong-password')).status,401);
  assert.equal(saved,undefined);
});
