import test from 'node:test';
import assert from 'node:assert/strict';
import {allEightPalaceKeys,eightPalaceFor,decorateLiuyao,relativeOf} from '../src/engines/liuyao-najia.mjs';
import {hexagramFromLines,hexagramFromYaoValues} from '../src/engines/iching.mjs';
import {castLiuyao} from '../src/engines/liuyao.mjs';
import {analyzeBaziPattern} from '../src/engines/bazi-pattern.mjs';
import {compareFourPillars} from '../src/engines/hepan-analysis.mjs';
import {calculateZiwei} from '../src/engines/ziwei.mjs';
import {verifiedCitation} from '../src/knowledge/citations.mjs';
import {renderHTML} from '../src/reports/html.mjs';
import {createFortuneServer} from '../src/server.mjs';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';

const resultFor=hex=>eightPalaceFor(hexagramFromLines(hex).linesBottomUp);

test('V1.5 京房八宫64卦无重、乾宫八序与世应独立验算',()=>{
 assert.equal(new Set(allEightPalaceKeys()).size,64);
 const testCases=[
  [[1,1,1,1,1,1],'乾为天','本宫',6,3],
  [[0,1,1,1,1,1],'天风姤','一世',1,4],
  [[0,0,1,1,1,1],'天山遁','二世',2,5],
  [[0,0,0,1,1,1],'天地否','三世',3,6],
  [[0,0,0,0,1,1],'风地观','四世',4,1],
  [[0,0,0,0,0,1],'山地剥','五世',5,2],
  [[0,0,0,1,0,1],'火地晋','游魂',4,1],
  [[1,1,1,1,0,1],'火天大有','归魂',3,6]
 ];
 for(const [lines,name,stage,shi,ying] of testCases){
  assert.equal(hexagramFromLines(lines).name,name);
  const p=resultFor(lines);assert.equal(p.palace,'乾');assert.equal(p.stage,stage);assert.equal(p.shiYao,shi);assert.equal(p.yingYao,ying);
 }
});
test('V1.5 通行纳甲表验算乾/坤/泰及变卦六亲仍按本宫',()=>{
 const pure=decorateLiuyao(hexagramFromYaoValues([7,7,7,7,7,7]),{dayStem:'甲'});
 assert.deepEqual(pure.linesBottomUp.map(x=>x.ganZhi),['甲子','甲寅','甲辰','壬午','壬申','壬戌']);
 assert.deepEqual(pure.linesBottomUp.map(x=>x.relative),['子孙','妻财','父母','官鬼','兄弟','父母']);
 assert.equal(pure.linesBottomUp[2].role,'应');assert.equal(pure.linesBottomUp[5].role,'世');
 assert.deepEqual(pure.linesBottomUp.map(x=>x.spirit),['青龙','朱雀','勾陈','螣蛇','白虎','玄武']);
 const kun=decorateLiuyao(hexagramFromYaoValues([8,8,8,8,8,8]));
 assert.deepEqual(kun.linesBottomUp.map(x=>x.ganZhi),['乙未','乙巳','乙卯','癸丑','癸亥','癸酉']);
 assert.ok(kun.linesBottomUp.every(x=>x.spirit===null));
 const tai=decorateLiuyao(hexagramFromYaoValues([7,7,7,8,8,8]));
 assert.equal(tai.palace.palace,'坤');
 assert.deepEqual(tai.linesBottomUp.map(x=>x.ganZhi),['甲子','甲寅','甲辰','癸丑','癸亥','癸酉']);
 assert.equal(relativeOf('土','水'),'妻财');
 const change=decorateLiuyao(hexagramFromYaoValues([9,7,7,7,7,7]),{dayStem:'辛'});
 assert.equal(change.linesBottomUp[0].moving,true);
 assert.notEqual(change.linesBottomUp[0].ganZhi,change.linesBottomUp[0].changedGanZhi);
 assert.equal(change.linesBottomUp[0].spirit,'白虎');
 assert.throws(()=>decorateLiuyao(hexagramFromYaoValues([7,7,7,7,7,7]),{dayStem:'？'}),/日干/);
});
test('V1.5 卦象起卦解读将纳甲逐爻数据绑定到报告，且保留原4层解读',()=>{
 const d=castLiuyao({lines:[9,8,8,7,7,6],dayStem:'乙',question:'最近如何开展新项目？'});
 assert.equal(d.interpretation.sections.length,4);
 assert.equal(d.interpretation.advanced?.items.length,2);
 assert.equal(d.result.advanced.linesBottomUp.length,6);
 assert.match(d.interpretation.advanced.items[1].facts[0],/爻/);
 const h=renderHTML(d);assert.match(h,/纳甲/);assert.match(h,/六亲/);assert.match(h,/解 曰/);assert.match(h,/计算依据与文献分类/);
 assert.ok(!h.includes('吉凶概率为'));
});
test('V1.5 月令本气透干仅标格局候选；强弱和用神仍明确不足',()=>{
 const p=[
  {stem:'庚',branch:'子',title:'年柱',hiddenStems:['癸']},
  {stem:'己',branch:'寅',title:'月柱',hiddenStems:['甲','丙','戊'],hiddenTenGods:['比肩','食神','偏财']},
  {stem:'甲',branch:'午',title:'日柱',hiddenStems:['丁','己']},
  {stem:'甲',branch:'亥',title:'时柱',hiddenStems:['壬','甲']}
 ];
 const c=analyzeBaziPattern(p);assert.equal(c.pattern.status,'candidate');assert.equal(c.pattern.label,'比肩');
 assert.deepEqual(c.pattern.exposedAt,['时柱']);assert.equal(c.strength.status,'not-determined');assert.equal(c.favorableElements.status,'not-determined');
 const other=analyzeBaziPattern([...p.slice(0,3),{...p[3],stem:'丙'}]);assert.equal(other.pattern.status,'insufficient');
 assert.ok(other.rootSignals.sameElement.length>0);
});
test('V1.5 紫微星曜四化与日期运限只从实际 mock 字段读，不补缺的四化',async()=>{
 const branches='子丑寅卯辰巳午未申酉戌亥'.split('');const mutations=['禄','权','科','忌'];
 const palaces=branches.map((branch,i)=>({index:i,name:['命宫','兄弟宫','夫妻宫','子女宫','财帛宫','疾厄宫','迁移宫','交友宫','官禄宫','田宅宫','福德宫','父母宫'][i],heavenlyStem:'甲',earthlyBranch:branch,majorStars:i<4?[{name:['紫微','天机','武曲','太阳'][i],mutagen:mutations[i]}]:[],minorStars:[]}));
 const lib={astro:{bySolar(){return {palaces,decadalList(){return [{name:'命宫',range:[10,19]}];},horoscope(){return {yearly:{year:2026,mutagen:['紫微','天机','武曲','太阳']},decadal:{name:'命宫',mutagen:['廉贞','破军','太阳','巨门']}};}};}}};
 const d=await calculateZiwei({date:'2005-10-01',time:'15:00',gender:'female'},lib);
 assert.equal(d.result.advanced.natalComplete,true);
 assert.equal(d.result.advanced.natalTransformations.length,4);
 assert.deepEqual(d.result.advanced.transitTransformations[0].stars.map(x=>x.transformation),['禄','权','科','忌']);
 assert.match(renderHTML(d),/生年四化/);
 assert.equal(d.interpretation.advanced.items.length,3);
 const partial=await calculateZiwei({date:'2005-10-01',time:'15:00',gender:'female'}, {astro:{bySolar(){return {palaces:palaces.map(p=>({...p,majorStars:[]}))};}}});
 assert.equal(partial.result.advanced.natalComplete,false);
 assert.match(partial.interpretation.advanced.items[0].conclusion,/未返回/);
});
test('V1.5 双人四柱 4×4 对照具备全部列，识别多种结构但不计分',()=>{
 const a=['甲子','乙亥','庚午','丁酉'].map((g,i)=>({ganZhi:g,branch:g[1]}));
 const b=['乙丑','丁巳','壬子','辛卯'].map((g,i)=>({ganZhi:g,branch:g[1]}));
 const c=compareFourPillars(a,b);
 assert.equal(c.matchingPillars.length,4);
 assert.ok(c.crossRelations.some(x=>x.aBranch==='子'&&x.bBranch==='午')===false);
 assert.ok(c.crossRelations.some(x=>x.aBranch==='子'&&x.bBranch==='丑'&&x.relation==='六合'));
 assert.ok(c.crossRelations.some(x=>x.aBranch==='午'&&x.bBranch==='子'&&x.relation==='六冲'));
 assert.ok(!JSON.stringify(c).includes('适配度'));
});
test('V1.5 只有明确登记的已校验短引才能声明古籍原文',()=>{
 const v=verifiedCitation('quote-dty-moon');assert.equal(v.kind,'verified-excerpt');assert.match(v.locator,/月令/);
 assert.equal(verifiedCitation('not-researched'),null);
});
test('V1.5 接口提供静态组件、版本健康检查与 HTML 报告；CSP 允许同源脚本',async()=>{
 const server=createFortuneServer();server.listen(0,'127.0.0.1');await once(server,'listening');
 try{const base=`http://127.0.0.1:${server.address().port}`;
  const health=await (await fetch(base+'/health')).json();assert.equal(health.version,'1.5.0');
  const web=await fetch(base+'/');assert.match(web.headers.get('content-security-policy'),/script-src 'self'/);
  const content=await web.text();assert.match(content,/v15.js/);assert.match(content,/liuyao-day-stem/);
  const js=await fetch(base+'/v15.js');assert.equal(js.status,200);assert.match(await js.text(),/window.FortuneV15/);
  assert.equal((await fetch(base+'/v15.css')).status,200);
  const response=await fetch(base+'/api/calculate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'liuyao',params:{lines:[7,7,7,7,7,7],dayStem:'甲'}})});
  assert.equal(response.status,200);const d=await response.json();assert.equal(d.result.advanced.palace.palace,'乾');
  const html=await fetch(base+'/api/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:d})});assert.equal(html.status,200);assert.match(await html.text(),/纳甲、六亲、世应/);
 } finally {server.close();await once(server,'close');}
});
test('V1.5 独立前端脚本可解析、必要组件已真实引用',async()=>{
 const html=await readFile(new URL('../web/index.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../web/v15.js',import.meta.url),'utf8');
 assert.match(html,/<script src="\/v15.js" defer>/);
 assert.match(html,/renderAdvanced/);
 assert.match(js,/esc\(x\.explanation\)/);
});
