// Uses the actual email route with mocked Supabase/Resend. Nothing is sent.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const sent=[];
let saved;
const mockSupabase={from:()=>({select:()=>({eq:()=>({single:async()=>saved})})})};
class MockResend {emails={send:async(message)=>{sent.push(message);return {data:{id:'mock'},error:null};}};}
const source=readFileSync(new URL('../app/api/send-order-email/route.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
new Function('require','module','exports',js)((name)=>name==='resend'?{Resend:MockResend}:name==='@/lib/supabaseClient'?{supabase:mockSupabase}:require(name),module,module.exports);
const {POST}=module.exports;
process.env.ADMIN_ORDER_EMAIL='admin@example.test';
const body={orderId:'12345678-0000-0000-0000-000000000001',orderNumber:'12345678',customerName:'Test Customer',customerEmail:'customer@example.test',paymentMethod:'zelle',items:[{name:'Test',price:100,quantity:1}],subtotal:100,shippingPrice:10,total:110};
async function call(payload){sent.length=0;return POST(new Request('http://localhost/api/send-order-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}));}
let count=0;
async function check(name,fn){await fn();count++;console.log(`PASS ${name}`);}
await check('missing order fields rejected before sending',async()=>{assert.equal((await call({})).status,400);assert.equal(sent.length,0);});
await check('non-promotion confirmation retains ordinary total and payment instructions',async()=>{
  assert.equal((await call({...body,paymentMethodLabel:'Zelle',paymentAccountValue:'payments@example.test',paymentInstructions:'Use your order number'})).status,200);
  assert.equal(sent.length,2);assert(sent[0].text.includes('Total: $110.00'));assert(sent[0].html.includes('payments@example.test'));assert(!sent[0].text.includes('Promotion ('));
});
await check('promotion confirmation uses persisted totals instead of forged request amounts',async()=>{
  saved={data:{id:body.orderId,customer_email:body.customerEmail,subtotal:100,shipping_price:10,total:100,promotion_code:'HOLIDAY10',discount_amount:10},error:null};
  assert.equal((await call({...body,promotionCode:'FORGED',discountAmount:99,total:1})).status,200);
  assert.equal(sent.length,2);assert(sent[1].text.includes('Promotion (HOLIDAY10): -$10.00'));assert(sent[0].text.includes('Promotion (HOLIDAY10): -$10.00'));assert(sent[0].text.includes('Total: $100.00'));assert(sent[0].html.includes('−$10.00'));assert(!sent[0].text.includes('FORGED'));
});
await check('admin resend can suppress duplicate admin notification',async()=>{
  assert.equal((await call({...body,promotionCode:'HOLIDAY10',discountAmount:10,suppressAdminEmail:true})).status,200);assert.equal(sent.length,1);
});
await check('unverified promotion order is rejected without sending',async()=>{
  saved={data:null,error:{message:'not found'}};
  assert.equal((await call({...body,promotionCode:'HOLIDAY10',discountAmount:10})).status,400);assert.equal(sent.length,0);
  assert.equal((await call({...body,orderId:null,promotionCode:'HOLIDAY10',discountAmount:10})).status,400);assert.equal(sent.length,0);
});
console.log(`${count} email checks passed; no real email sent.`);
