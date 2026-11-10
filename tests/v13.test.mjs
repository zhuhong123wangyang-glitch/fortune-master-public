import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {getSign,listSigns,availableSignSystems} from '../src/signs/catalog.mjs';
import {SignbookStore,localDay,checkTimezone,checkProfile} from '../src/signs/store.mjs';
import {DailySignService} from '../src/signs/service.mjs';
import {renderHTML} from '../src/reports/html.mjs';
import {route} from '../src/core/router.mjs';
import {searchKnowledge} from '../src/knowledge/catalog.mjs';
import {followUp} from '../src/signs/followup.mjs';
import {createFortuneServer} from '../src/server.mjs';

async function fixture(t,now='2026-11-06T02:00:00.000Z'){
  const dir=await mkdtemp(join(tmpdir(),'fortune-v13-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const store=new SignbookStore(join(dir,'signbook.json'));
  let number=0;
  const service=new DailySignService(store,()=>++number,()=>new Date(now));
  return {store,service,dir,get count(){return number;}};
}
test('原创签系是100条、签号唯一、诗句不重复，明确非古籍与审核边界',()=>{
  const signs=listSigns({limit:100});
  assert.equal(signs.total,100);
  assert.equal(new Set(signs.items.map(s=>s.title)).size,100);
  assert.equal(new Set(signs.items.map(s=>s.lines.join(''))).size,100);
  assert.equal(getSign(1).title,'云开见月');
  assert.equal(getSign(100).title,'千山同春');
  assert.match(signs.policy,/原创/);
  assert.ok(signs.items.every(s=>s.editorialStatus.includes('unreviewed')));
  assert.deepEqual(availableSignSystems().map(x=>x.id),['fortune-original-100']);
  assert.throws(()=>getSign(2,'guanyin-100'),/暂未安装/);
});
test('每日签路由与知识库检索已集成到主 Skill',()=>{
  assert.equal(route('我想抽今日一签').method,'daily-sign');
  assert.equal(route('查看八字和每日一签').method,null);
  assert.equal(searchKnowledge({query:'云开见月',domain:'sign'}).total,1);
  assert.ok(searchKnowledge({query:'云开见月',domain:'sign'}).items[0].sources[0].note.includes('非古籍'));
});
test('时区自然日正确，非法档案与时区拒绝',()=>{
  const d=new Date('2026-11-05T16:05:00Z');
  assert.equal(localDay(d,'Asia/Shanghai'),'2026-11-06');
  assert.equal(localDay(d,'America/Los_Angeles'),'2026-11-05');
  assert.equal(checkTimezone('Etc/GMT+8'),'Etc/GMT+8');
  assert.throws(()=>checkTimezone('foo'),/时区/);
  assert.throws(()=>checkProfile('../../secret'),/档案/);
});
test('首次随机 + 同日稳定，换主题不换签，重启后同签，后续异日可换签',async t=>{
  const f=await fixture(t);
  const p={action:'draw',profileId:'someone',timezone:'Asia/Shanghai',topic:'career'};
  const a=await f.service.perform(p),b=await f.service.perform({...p,topic:'love'});
  assert.equal(a.data.result.sign.id,1);
  assert.equal(b.data.result.sign.id,1);
  assert.equal(f.count,1);
  assert.equal(b.data.interpretation.sections[1].title,'感情主题解签');
  const restarted=new DailySignService(f.store,()=>99,()=>new Date('2026-11-06T02:00:00Z'));
  assert.equal((await restarted.perform(p)).data.result.sign.id,1);
  const next=new DailySignService(f.store,()=>2,()=>new Date('2026-11-07T02:00:00Z'));
  assert.equal((await next.perform(p)).data.result.sign.id,2);
  assert.equal((await f.service.history({profileId:'someone'})).total,2);
});
test('100个并发请求，同一档案同日只产生一次抽签',async t=>{
  const f=await fixture(t);
  const all=await Promise.all(Array.from({length:100},()=>f.service.perform({action:'draw',profileId:'concurrent'})));
  assert.equal(new Set(all.map(x=>x.data.result.record.id)).size,1);
  assert.equal(f.count,1);
  assert.equal((await f.service.history({profileId:'concurrent'})).total,1);
});
test('问事求签单独记录，不覆盖每日签；提问默认不落盘，主动勾选才保存',async t=>{
  const f=await fixture(t);
  const a=await f.service.perform({action:'draw',profileId:'alice'});
  const b=await f.service.perform({action:'question',profileId:'alice',question:'该如何学习？'});
  assert.equal(a.data.result.record.kind,'daily');
  assert.equal(b.data.result.record.kind,'question');
  assert.equal(b.data.input.question,'该如何学习？');
  assert.equal(b.record.storedQuestion,'');
  const c=await f.service.perform({action:'question',profileId:'alice',question:'如何沟通？',saveQuestion:true});
  assert.equal(c.record.storedQuestion,'如何沟通？');
  const saved=await readFile(join(f.dir,'signbook.json'),'utf8');
  assert.ok(!saved.includes('该如何学习'));
  assert.ok(saved.includes('如何沟通'));
  assert.equal((await f.service.perform({action:'peek',profileId:'alice'})).data.result.record.id,a.data.result.record.id);
});
test('收藏/取消收藏、历史查询、删除与清空按档案隔离',async t=>{
  const f=await fixture(t);
  const a=await f.service.perform({action:'draw',profileId:'alice'});
  const b=await f.service.perform({action:'draw',profileId:'bob'});
  const id=a.record.id;
  const fav=await f.service.perform({action:'favorite',profileId:'alice',recordId:id});
  assert.equal(fav.record.favorite,true);
  assert.equal((await f.service.history({profileId:'alice',onlyFavorite:true})).items.length,1);
  assert.equal((await f.service.perform({action:'favorite',profileId:'alice',recordId:id})).record.favorite,false);
  await assert.rejects(f.service.perform({action:'delete',profileId:'bob',recordId:id}),/找不到/);
  await f.service.perform({action:'delete',profileId:'alice',recordId:id});
  assert.equal((await f.service.history({profileId:'alice'})).total,0);
  assert.equal((await f.service.history({profileId:'bob'})).total,1);
  assert.equal((await f.service.perform({action:'clear',profileId:'bob'})).deleted,1);
  assert.equal((await f.service.history({profileId:'bob'})).total,0);
});
test('HTML报告保留原签快照、依据与转义，不注入HTML',async t=>{
  const f=await fixture(t);
  const result=await f.service.perform({action:'question',profileId:'html',question:'<script>alert(1)</script>',topic:'study'});
  const report=renderHTML(result.data);
  assert.match(report,/每日一签/);
  assert.match(report,/签意与今日行动/);
  assert.match(report,/原创/);
  assert.ok(report.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!report.includes('<script>alert(1)</script>'));
});
test('离线追问无外部发送；未明确同意即使有Key也不能发送',async()=>{
  const prevKey=process.env.FORTUNE_LLM_API_KEY,prevModel=process.env.FORTUNE_LLM_MODEL;
  try{
    process.env.FORTUNE_LLM_API_KEY='example-key';process.env.FORTUNE_LLM_MODEL='test-model';
    const noNetwork=()=>{throw Error('不允许发网络请求');};
    const a=await followUp({sign:getSign(10),topic:'career',question:'怎么行动？',allowExternal:false,fetchImpl:noNetwork});
    assert.equal(a.mode,'offline-rule');assert.equal(a.externalSent,false);
  }finally{
    if(prevKey===undefined)delete process.env.FORTUNE_LLM_API_KEY;else process.env.FORTUNE_LLM_API_KEY=prevKey;
    if(prevModel===undefined)delete process.env.FORTUNE_LLM_MODEL;else process.env.FORTUNE_LLM_MODEL=prevModel;
  }
});
test('明示同意且配置模型后仅发送签文与本次问题，密钥不出现在回答',async()=>{
  const before={key:process.env.FORTUNE_LLM_API_KEY,model:process.env.FORTUNE_LLM_MODEL};
  try{
    process.env.FORTUNE_LLM_API_KEY='unit-test-key';process.env.FORTUNE_LLM_MODEL='unit-test-model';
    let n=0;
    const fn=async(url,opts)=>{n++;assert.equal(opts.headers.Authorization,'Bearer unit-test-key');const prompt=JSON.parse(opts.body);assert.ok(prompt.messages[1].content.includes('如何计划'));return {ok:true,json:async()=>({choices:[{message:{content:'先列出任务优先级。'}}]})};};
    const r=await followUp({sign:getSign(3),question:'如何计划',allowExternal:true,fetchImpl:fn});
    assert.equal(r.mode,'ai-remote');assert.equal(n,1);
    assert.ok(!JSON.stringify(r).includes('unit-test-key'));
  }finally{
    for(const [key,value]of [['FORTUNE_LLM_API_KEY',before.key],['FORTUNE_LLM_MODEL',before.model]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  }
});
test('V1.3 本地API：健康检查、签文、历史、报告、跨站来源拦截',async t=>{
  const server=createFortuneServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const port=server.address().port,base=`http://127.0.0.1:${port}`,profile='api-'+randomUUID();
  const req=(url,data,more={})=>fetch(`${base}${url}`,{method:'POST',headers:{'Content-Type':'application/json',...more},body:JSON.stringify(data)});
  assert.equal((await (await fetch(`${base}/health`)).json()).version,'1.5.0');
  assert.ok((await (await fetch(`${base}/daily.js`)).text()).includes('Fortune'));
  const a=await req('/api/daily-sign',{action:'draw',profileId:profile});
  assert.equal(a.status,200);const data=await a.json();assert.equal(data.data.method,'daily-sign');
  const b=await req('/api/daily-sign',{action:'history',profileId:profile});assert.equal((await b.json()).total,1);
  const c=await req('/api/report',{data:data.data});assert.equal(c.status,200);assert.match(await c.text(),/原创文化/);
  const forbidden=await req('/api/daily-sign',{action:'draw',profileId:profile},{Origin:'https://evil.example'});assert.equal(forbidden.status,403);
  await req('/api/daily-sign',{action:'clear',profileId:profile});
});
test('切回每日签时不保存问事签的隐藏问题（含已勾选选项）',async t=>{
  const f=await fixture(t);
  const result=await f.service.perform({action:'draw',profileId:'private',question:'不应该落盘的敏感提问',saveQuestion:true});
  assert.equal(result.data.input.question,'');
  const saved=await readFile(join(f.dir,'signbook.json'),'utf8');
  assert.ok(!saved.includes('不应该落盘的敏感提问'));
});
test('历史签簿支持分页，保证导出不会只拿到第一页',async t=>{
  const f=await fixture(t);
  for(let i=0;i<7;i++)await f.service.perform({action:'question',profileId:'pager',question:'学习'});
  const page1=await f.service.history({profileId:'pager',limit:3,offset:0});
  const page2=await f.service.history({profileId:'pager',limit:3,offset:3});
  const page3=await f.service.history({profileId:'pager',limit:3,offset:6});
  assert.equal(page1.total,7);assert.equal(page1.items.length,3);
  assert.equal(page2.items.length,3);assert.equal(page3.items.length,1);
  assert.equal(new Set([...page1.items,...page2.items,...page3.items].map(x=>x.id)).size,7);
});
