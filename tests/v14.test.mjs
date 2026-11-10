import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,symlink,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {calculateHepan,compareCharts,dayBranchRelation,elementRelation} from '../src/engines/hepan.mjs';
import {calculateZiwei} from '../src/engines/ziwei.mjs';
import {renderHTML} from '../src/reports/html.mjs';
import {previewBirthTime} from '../src/core/time-preview.mjs';
import {profileStore} from '../src/profiles/store.mjs';
import {route} from '../src/core/router.mjs';
import {createFortuneServer} from '../src/server.mjs';

function fakeLunar(){return {Solar:{fromYmdHms:(year,month,day,hour)=>({getLunar:()=>({
 getYear:()=>year,getMonth:()=>month,getDay:()=>day,toString:()=>`模拟农历 ${year}`,
 getEightChar:()=>{
  const stems=year===1992?['壬申','乙巳','甲子','丁巳']:['乙亥','戊寅','庚午','乙酉'];
  const cols={Year:stems[0],Month:stems[1],Day:stems[2],Time:stems[3]};const e={setSect(){},getYun:()=>({getStartYear:()=>2,getStartMonth:()=>3,getStartDay:()=>0,getStartHour:()=>0,getStartSolar:()=>({toYmd:()=>`${year+2}-01-01`}),getDaYun:()=>[{getIndex:()=>0},{getIndex:()=>1,getGanZhi:()=> '丙午',getStartYear:()=>2022,getEndYear:()=>2031,getStartAge:()=>3,getEndAge:()=>12}] }),getTaiYuan:()=> '乙亥',getMingGong:()=> '甲戌',getShenGong:()=> '乙酉'};
  for(const [k,v] of Object.entries(cols)){e['get'+k]=()=>v;e['get'+k+'Gan']=()=>v[0];e['get'+k+'Zhi']=()=>v[1];e['get'+k+'HideGan']=()=>['甲'];e['get'+k+'ShiShenZhi']=()=>['比肩'];e['get'+k+'ShiShenGan']=()=> '伤官';e['get'+k+'NaYin']=()=> '海中金';e['get'+k+'DiShi']=()=> '临官';}
  return e;
 }
 })})}};}
const people={personA:{label:'甲方',date:'1992-05-15',time:'09:00',gender:'male'},personB:{label:'乙方',date:'1995-02-03',time:'18:00',gender:'female'}};
test('合盘: 感情/人际/运势三种模式在相同命盘上采用不同建议且来源可追溯',async()=>{
 const results=[];
 for(const mode of ['love','social','fortune']){
  const d=await calculateHepan({...people,mode,referenceYear:2026},fakeLunar());results.push(d);
  assert.equal(d.method,'hepan');assert.equal(d.schemaVersion,'1.4.0');assert.equal(d.result.people.length,2);
  assert.equal(d.result.people[0].dayMaster,'甲');assert.equal(d.result.people[1].dayMaster,'庚');
  assert.equal(d.result.dayElements.name,'金克木');assert.equal(d.result.dayBranch.name,'日支六冲');
  assert.equal(d.interpretation.sections.length,5);assert.equal(d.interpretation.story.topics.length,4);
  assert.equal(d.interpretation.sections[1].trace[0].path,'result.dayElements');
  assert.equal(d.result.people[0].activeCycle.startYear,2022);
  assert.match(renderHTML(d),/解 曰/);assert.match(renderHTML(d),/双方独立排盘/);
  assert.ok(!renderHTML(d).includes('适配度百分比'));
 }
 assert.notEqual(results[0].interpretation.story.action,results[1].interpretation.story.action);
 assert.notEqual(results[1].interpretation.story.action,results[2].interpretation.story.action);
 assert.equal(route('我要做双人感情合盘').method,'hepan');
});
test('合盘: 不同输入有独立排盘、同支、三合、六合、冲和五行方向规则',()=>{
 assert.equal(dayBranchRelation('子','午').type,'clash');
 assert.equal(dayBranchRelation('子','丑').type,'combine');
 assert.equal(dayBranchRelation('申','子').type,'triad');
 assert.equal(dayBranchRelation('巳','巳').type,'same');
 assert.equal(elementRelation('木','火').direction,'a-to-b');
 assert.equal(elementRelation('火','木').direction,'b-to-a');
 assert.equal(elementRelation('水','水').type,'same');
 assert.equal(elementRelation('木','土').type,'controls');
});
test('合盘: 非法出生时间、空昵称、危险标签和未支持的年份拒绝',async()=>{
 await assert.rejects(calculateHepan({...people,mode:'invalid'},fakeLunar()),/合盘主题/);
 await assert.rejects(calculateHepan({...people,referenceYear:3000},fakeLunar()),/年份/);
 await assert.rejects(calculateHepan({...people,personA:{...people.personA,label:'<script>'}},fakeLunar()),/称呼/);
 await assert.rejects(calculateHepan({...people,personB:{...people.personB,date:'2026-02-30'}},fakeLunar()),/日期无效/);
});
test('紫微: 使用 iztro 官方大限与流年/流月/流日运限接口，不杜撰返回字段',async()=>{
 const called=[];
 const lib={astro:{bySolar(){return {palaces:'子丑寅卯辰巳午未申酉戌亥'.split('').map((branch,i)=>({index:i,name:['命','兄弟','夫妻','子女','财帛','疾厄','迁移','交友','官禄','田宅','福德','父母'][i]+'宫',heavenlyStem:'甲',earthlyBranch:branch,majorStars:[],minorStars:[]})),
 decadalList(){called.push('decadal');return [{name:'命宫',range:[12,21],startYear:2020,endYear:2029,heavenlyStem:'丙',earthlyBranch:'寅'}];},
 horoscope(date){called.push(date);return {decadal:{name:'命宫',heavenlyStem:'丙',earthlyBranch:'寅'},yearly:{name:'夫妻宫',year:2026},monthly:{name:'财帛宫',month:11},daily:{name:'福德宫',day:7},hourly:{name:'官禄宫'}};}
 };}}};
 const r=await calculateZiwei({date:'2005-10-01',time:'15:00',gender:'female',focusDate:'2026-11-07'},lib);
 assert.deepEqual(called,['decadal','2026-11-07']);assert.equal(r.result.transits.available,true);
 assert.equal(r.result.transits.decadals[0].range[0],12);assert.equal(r.result.transits.selected.yearly.year,2026);
 assert.ok(r.interpretation.sections.some(s=>s.id==='ziwei-transits'));
 assert.match(renderHTML(r),/所选日期的运限标签/);
 await assert.rejects(calculateZiwei({date:'2005-10-01',time:'15:00',gender:'female',focusDate:'2026-02-30'},lib),/日期无效/);
});
test('时间预检: 中国标准时、夏令时缺失/重复、未知时区、经度边界',()=>{
 const c=previewBirthTime({date:'2026-11-07',time:'15:00',timezone:'Asia/Shanghai',longitude:116.4});
 assert.equal(c.utcInstant,'2026-11-07T07:00:00.000Z');
 assert.ok(c.approximateSolarClock);assert.match(c.policy,/不.*代入/);
 assert.throws(()=>previewBirthTime({date:'2026-03-08',time:'02:30',timezone:'America/Los_Angeles',longitude:-118.25}),/不存在/);
 assert.throws(()=>previewBirthTime({date:'2026-11-01',time:'01:30',timezone:'America/Los_Angeles',longitude:-118.25}),/重复/);
 assert.throws(()=>previewBirthTime({date:'2026-11-07',time:'13:00',timezone:'Invalid/TimeZone',longitude:116.4}),/未知/);
 assert.throws(()=>previewBirthTime({date:'2026-11-07',time:'13:00',longitude:300}),/经度/);
});
test('个人档案: 未同意不可保存、增查改删、权限、损坏保护、软链接拒绝',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'fm14-profile-'));process.env.FORTUNE_PROFILE_FILE=join(dir,'profiles.json');
 try{
  const value={label:'模拟人物',date:'1992-05-15',time:'09:00',gender:'male'};
  await assert.rejects(profileStore.save(value),/明确/);
  const one=await profileStore.save({...value,consent:true});
  assert.equal((await profileStore.list()).total,1);assert.equal((await profileStore.get(one.item.id)).item.label,'模拟人物');
  assert.equal((await stat(process.env.FORTUNE_PROFILE_FILE)).mode&0o777,0o600);
  assert.equal((await profileStore.save({...value,id:one.item.id,label:'修改昵称',consent:true})).item.label,'修改昵称');
  await assert.rejects(profileStore.delete(one.item.id,false),/确认/);
  assert.deepEqual((await profileStore.delete(one.item.id,true)).deleted,true);
  assert.equal((await profileStore.list()).total,0);
  await writeFile(process.env.FORTUNE_PROFILE_FILE,'{invalid json','utf8');
  await assert.rejects(profileStore.save({...value,consent:true}),/不会覆盖原数据/);
  assert.equal(await readFile(process.env.FORTUNE_PROFILE_FILE,'utf8'),'{invalid json');
 } finally {delete process.env.FORTUNE_PROFILE_FILE;await rm(dir,{recursive:true,force:true});}
});
test('个人档案: 并发 20 项全部保存且无覆盖丢失',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'fm14-concurrent-'));process.env.FORTUNE_PROFILE_FILE=join(dir,'profiles.json');
 try{await Promise.all(Array.from({length:20},(_,i)=>profileStore.save({label:`模拟档案${i}`,date:'2005-10-01',time:'15:00',gender:'female',consent:true})));
 const list=await profileStore.list();assert.equal(list.total,20);assert.equal(new Set(list.items.map(x=>x.id)).size,20);
 } finally {delete process.env.FORTUNE_PROFILE_FILE;await rm(dir,{recursive:true,force:true});}
});
test('V1.4 服务端: 版本、独立前端资源、CSP、同源限定、档案读取与时间预检',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'fm14-http-'));process.env.FORTUNE_PROFILE_FILE=join(dir,'profiles.json');t.after(async()=>{delete process.env.FORTUNE_PROFILE_FILE;await rm(dir,{recursive:true,force:true});});
 const srv=createFortuneServer();await new Promise(r=>srv.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>srv.close(r)));
 const base=`http://127.0.0.1:${srv.address().port}`;const get=(route)=>fetch(base+route);
 const post=(path,payload,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(payload)});
 assert.equal((await (await get('/health')).json()).version,'1.5.0');
 const page=await get('/');assert.match(await page.text(),/双人合盘/);assert.match(page.headers.get('content-security-policy'),/script-src 'self' 'unsafe-inline'/);
 assert.match(await (await get('/v14.js')).text(),/FortuneV14/);assert.match(await (await get('/v14.css')).text(),/v14-people/);
 assert.equal((await post('/api/profiles',{action:'list'})).status,200);
 assert.equal((await post('/api/profiles',{action:'save',label:'A',date:'2005-10-01',time:'15:00',gender:'male'})).status,400);
 const created=await (await post('/api/profiles',{action:'save',label:'A',date:'2005-10-01',time:'15:00',gender:'male',consent:true})).json();
 assert.ok(created.item.id);assert.equal((await (await post('/api/profiles',{action:'list'})).json()).total,1);
 assert.equal((await post('/api/profiles',{action:'delete',id:created.item.id,confirm:true}, {Origin:'https://evil.example'})).status,403);
 const preview=await (await post('/api/time-preview',{date:'2026-11-07',time:'15:00',longitude:116.4})).json();assert.equal(preview.utcInstant,'2026-11-07T07:00:00.000Z');
});
