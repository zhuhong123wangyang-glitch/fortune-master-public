import test from 'node:test';
import assert from 'node:assert/strict';
import {castLiuyao} from '../src/engines/liuyao.mjs';
import {castMeihua} from '../src/engines/meihua.mjs';
import {calculateZiwei} from '../src/engines/ziwei.mjs';
import {renderHTML} from '../src/reports/html.mjs';
import {createFortuneServer} from '../src/server.mjs';

const branches='子丑寅卯辰巳午未申酉戌亥'.split('');
const palaceNames=['命宫','兄弟宫','夫妻宫','子女宫','财帛宫','疾厄宫','迁移宫','交友宫','官禄宫','田宅宫','福德宫','父母宫'];
const fake={astro:{bySolar(){return {solarDate:'2005-10-1',lunarDate:'八月廿八',soul:'破军',body:'天相',fiveElementsClass:'水二局',palaces:branches.map((b,i)=>({index:i,name:palaceNames[i],earthlyBranch:b,heavenlyStem:'乙',isBodyPalace:i===6,majorStars:i===0?[{name:'紫微'}]:i===8?[{name:'天机'}]:[],minorStars:[],decadal:{range:[i*10+2,i*10+11]}}))};}}};

test('六爻：白话总览、动爻生活化解释、术语解释与导出报告齐全',()=>{
  const d=castLiuyao({lines:[9,8,8,7,7,6],question:'准备转岗学习'});
  const b=d.interpretation.beginner;
  assert.match(b.headline,/泽雷随/);assert.ok(b.explanation.includes('第 1、6 爻'));
  assert.ok(b.actions.length>=3);assert.ok(b.steps.length===3);
  assert.ok(b.glossary.find(t=>t.name==='动爻'));
  assert.ok(d.interpretation.sections.every(s=>s.beginner?.oneLine&&s.beginner?.example&&s.beginner?.action));
  const html=renderHTML(d);
  assert.match(html,/FIRST READ \/ 新手先看这里/);assert.match(html,/白话/);assert.match(html,/术语解释/);
});
test('六爻：无动爻不伪造变化；医疗类问题不输出医疗预测',()=>{
  const d=castLiuyao({lines:[8,8,8,7,7,7],question:'我的病会不会治好？'});
  assert.equal(d.result.movingLines.length,0);
  assert.match(d.interpretation.beginner.explanation,/没有动爻/);
  assert.ok(d.interpretation.beginner.actions.some(x=>x.includes('医生')));
});
test('梅花：从本互变三卦与体用的白话术语分层解释',()=>{
  const d=castMeihua({numbers:[3,5,2],question:'如何改进工作计划？'});
  const b=d.interpretation.beginner;
  assert.match(b.explanation,/本卦/);assert.match(b.explanation,/互卦/);assert.match(b.explanation,/变卦/);
  assert.ok(b.glossary.find(t=>t.name==='体 / 用'));
  assert.ok(d.interpretation.sections.every(s=>s.beginner?.example));
  assert.match(renderHTML(d),/分三步读懂/);
});
test('紫微：十二宫零基础白话、空宫不解释为坏运、主星动态映射',async()=>{
  const d=await calculateZiwei({date:'2005-10-01',time:'15:00',gender:'female'},fake);
  const b=d.interpretation.beginner;
  assert.match(b.explanation,/生活/);assert.ok(b.glossary.find(t=>t.name==='十二宫'));
  const life=d.interpretation.sections.find(s=>s.id==='ziwei-palace-0');
  assert.match(life.beginner.oneLine,/命宫/);assert.match(life.beginner.terminology,/紫微/);
  const empty=d.interpretation.sections.find(s=>s.id==='ziwei-palace-1');
  assert.match(empty.beginner.oneLine,/没有十四主星/);assert.ok(empty.beginner.action.includes('对宫'));
  assert.ok(renderHTML(d).includes('先看这里'));
});
test('新手解读中的用户输入也必须 HTML 转义，不能插入脚本',()=>{
  const d=castMeihua({numbers:[1,3,4],question:'<img src=x onerror=alert(1)>'});
  const html=renderHTML(d);
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
  assert.ok(html.includes('&lt;img'));
});
test('每日签误走旧 /api/calculate 时应返回可读提示，而不是 d.original 崩溃',async t=>{
  const server=createFortuneServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const resp=await fetch(base+'/api/calculate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'daily-sign',params:{}})});
  assert.equal(resp.status,400);
  assert.match((await resp.json()).error,/专用接口/);
  const html=await (await fetch(base+'/')).text();
  const js=await (await fetch(base+'/daily.js')).text();
  assert.match(html,/FortuneDailySign\.perform/);assert.match(js,/window\.FortuneDailySign=Object\.freeze/);
});
