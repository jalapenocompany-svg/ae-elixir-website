const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const compile=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const shared={exports:{},require,URLSearchParams,Date,Intl,Error};vm.runInNewContext(compile('lib/referral-report.ts'),shared);
const auth={exports:{},require:n=>n==='server-only'?{}:require(n),process:{env:{MASTER_ADMIN_PASSWORD:'report-test-password'}},Buffer,URL,Date};vm.runInNewContext(compile('lib/admin-session.ts'),auth);
let calls=0,rpcError=null;
const fixture={rows:[],summary:{},rowCount:0,pageSize:25};
const ctx={exports:{},URL,Response,Error,require:n=>n==='@/lib/admin-session'?auth.exports:n==='@/lib/referral-settings'?{REFERRALS_ENABLED:true}:n==='@/lib/referral-report'?shared.exports:{
 adsReply:(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}}),
 adsDatabase:()=>({rpc:async(name,filters)=>{calls++;assert.equal(name,'referral_detailed_report');return {data:fixture,error:rpcError}}})
}};
vm.runInNewContext(compile('app/api/admin/referrers/report/route.ts'),ctx);
const base='https://aeelixir.com/api/admin/referrers/report';
const unsigned=new Request(base);const cookie=auth.exports.adminSessionCookie(unsigned).split(';')[0];
const signed=(query='',headers={})=>new Request(base+query,{headers:{cookie,...headers}});
(async()=>{
assert.equal((await ctx.exports.GET(unsigned)).status,401);assert.equal(calls,0);
assert.equal((await ctx.exports.GET(signed('',{origin:'https://other.example'}))).status,403);assert.equal(calls,0);
assert.equal((await ctx.exports.GET(signed('?start=invalid'))).status,400);assert.equal(calls,0);
let response=await ctx.exports.GET(signed());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
response=await ctx.exports.GET(signed('?format=csv'));assert.equal(response.status,200);assert(response.headers.get('content-type').includes('text/csv'));assert(response.headers.get('content-disposition').includes('referral-orders-report.csv'));
rpcError={code:'PGRST202'};response=await ctx.exports.GET(signed());assert.equal(response.status,503);assert((await response.json()).error.includes('migration 010'));
rpcError={code:'P0001',message:'Export exceeds 10,000 rows.'};assert.equal((await ctx.exports.GET(signed('?format=csv'))).status,400);
console.log('PASS report endpoint: signed auth, cross-origin denial, invalid filters before DB access, private JSON/CSV, migration-missing feedback and export-limit errors.');
})().catch(e=>{console.error(e);process.exitCode=1});
