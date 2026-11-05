// Disposable DOM tests. No real Supabase requests or emails.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { JSDOM } = await import('jsdom');
const React = require('react');
const { createRoot } = require('react-dom/client');
const ts = require('typescript');
const dom = new JSDOM('<!doctype html><div id="root"></div>', {url:'http://localhost'});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = React;
let rpcImpl;
function loadTs(path) {
  const js = ts.transpileModule(readFileSync(new URL(path, import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const module = {exports:{}};
  new Function('require','module','exports',js)((id) => id==='@/lib/supabaseClient' ? {supabase:{rpc:(...args)=>rpcImpl(...args)}} : id==='@/lib/promotion-settings' ? {PROMOTIONS_ENABLED:true} : require(id),module,module.exports);
  return module.exports;
}
const {usePromotion} = loadTs('../lib/use-promotion.ts');
const {allocateDiscount}=loadTs('../lib/promotion-reporting.ts');
let state;
const root=createRoot(document.getElementById('root'));
const cart=[{product_code:'TEST',quantity:2,price:50}];
function Test({items=cart,ship='standard'}) {state=usePromotion(items,ship);return null;}
async function render(items=cart,ship='standard') {await act(async()=>root.render(React.createElement(Test,{items,ship})));}
async function changeCode(code) {await act(async()=>state.setInput(code));}
function goodQuote(ends_at=new Date(Date.now()+60_000).toISOString()) {return {data:{code:'TEST10',subtotal:100,shipping_price:10,discount_amount:10,total:100,ends_at,server_now:new Date(Date.now()).toISOString()},error:null};}
let count=0;
async function check(name,fn) {await fn();count++;console.log(`PASS ${name}`);}
await render();
await check('no code has no discount',async()=>assert.equal(state.quote,null));
await check('apply sends product identities and shipping; uses returned quote',async()=>{
  rpcImpl=async(name,args)=>{assert.equal(name,'quote_promotion');assert.deepEqual(args,{p_code:'TEST10',p_items:[{product_code:'TEST',quantity:2}],p_shipping_method:'standard'});return goodQuote();};
  await changeCode(' test10 ');await act(async()=>state.apply());assert.equal(state.quote.discount_amount,10);
});
await check('cart changes invalidate applied promotion',async()=>{await render([{...cart[0],quantity:3}]);assert.equal(state.quote,null);assert.equal(state.needsReapply,true);});
await check('removing a code clears stale state',async()=>{await act(async()=>state.remove());assert.equal(state.needsReapply,false);assert.equal(state.input,'');});
await check('shipping change discards a late response',async()=>{
  await render();await changeCode('TEST10');let resolve;
  rpcImpl=()=>new Promise(r=>resolve=r);let pending;
  await act(async()=>{pending=state.apply();});await render(cart,'express');
  await act(async()=>{resolve(goodQuote());await pending;});assert.equal(state.quote,null);assert.equal(state.busy,false);
});
await check('server rejection keeps code unapplied',async()=>{
  rpcImpl=async()=>({data:null,error:{message:'This promotion has expired.'}});
  await act(async()=>state.apply());assert.equal(state.quote,null);assert.match(state.notice,/expired/);
  assert.equal(state.needsReapply,true);
});
await check('stale catalog price is rejected in the UI',async()=>{
  rpcImpl=async()=>({data:{...goodQuote().data,subtotal:110},error:null});
  await act(async()=>state.apply());assert.equal(state.quote,null);assert.match(state.notice,/prices changed/);
});
await check('expiry clears discount while page remains open',async()=>{
  await render();rpcImpl=async()=>goodQuote(new Date(Date.now()+40).toISOString());
  await act(async()=>state.apply());assert(state.quote);
  await act(async()=>{await new Promise(r=>setTimeout(r,70));});assert.equal(state.quote,null);assert.equal(state.needsReapply,true);
});
await check('report discount allocation preserves exact cents',async()=>{
  assert.deepEqual(allocateDiscount([33.33,33.33,33.34],10),[3.33,3.34,3.33]);
  assert.equal(allocateDiscount([0.05,0.05],0.01).reduce((a,b)=>a+b,0),0.01);
  assert.deepEqual(allocateDiscount([50,50],0),[0,0]);assert.deepEqual(allocateDiscount([0],10),[0]);
});
await check('an unapplied code blocks review until applied or removed',async()=>{
  await act(async()=>state.remove());await changeCode('TEST10');
  assert.equal(state.needsReapply,true);
  await act(async()=>state.remove());assert.equal(state.needsReapply,false);
});
await check('quote expiration uses server time despite a wrong device clock',async()=>{
  const response=goodQuote();const original=Date.now;
  try {
    Date.now=()=>0;rpcImpl=async()=>response;
    await changeCode('TEST10');await act(async()=>state.apply());assert(state.quote);
    Date.now=()=>original()+365*24*60*60*1000;
    await act(async()=>window.dispatchEvent(new window.Event('focus')));assert(state.quote);
  } finally {Date.now=original;await act(async()=>state.remove());}
});
const PromotionBanner=loadTs('../components/PromotionBanner.tsx').default;
await check('banner expires with the server clock, even while subsequent requests fail',async()=>{
  let first=true;
  rpcImpl=async(name)=>{
    assert.equal(name,'storefront_promotion_schedule');
    if(!first) return {data:null,error:{message:'offline'}};
    first=false;const server=Date.parse('2026-11-20T12:00:00Z');
    return {data:{server_now:new Date(server).toISOString(),next_change_at:new Date(server+50).toISOString(),
      promotions:[{code:'CLOCK10',banner_text:'Clock safe banner',ends_at:new Date(server+50).toISOString()}]},error:null};
  };
  await act(async()=>root.render(React.createElement(PromotionBanner)));
  assert.match(document.body.textContent,/Clock safe banner/);
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,80));});
  assert.doesNotMatch(document.body.textContent,/Clock safe banner/);
});
await act(async()=>root.unmount());
dom.window.close();
console.log(`${count} client/report checks passed; no remote requests used.`);
