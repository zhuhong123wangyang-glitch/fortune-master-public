import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {castLiuyao} from '../src/engines/liuyao.mjs';
import {castMeihua} from '../src/engines/meihua.mjs';
import {calculateZiwei} from '../src/engines/ziwei.mjs';
import {getSign} from '../src/signs/catalog.mjs';
import {formatSignResult} from '../src/signs/reading.mjs';
import {renderHTML} from '../src/reports/html.mjs';
import {createFortuneServer} from '../src/server.mjs';

function signData(id=3,topic='general'){
 const rec={id:'unit-record',profileId:'unit-id',date:'2026-11-06',timezone:'Asia/Shanghai',kind:'daily',drawnAt:'2026-11-06T01:00:00.000Z',sign:getSign(id),systemId:'fortune-original-100',systemVersion:'1.0.0',favorite:false,topic,question:''};
 return formatSignResult(rec,{topic});
}
const branches='子丑寅卯辰巳午未申酉戌亥'.split('');
const names=['命宫','兄弟宫','夫妻宫','子女宫','财帛宫','疾厄宫','迁移宫','交友宫','官禄宫','田宅宫','福德宫','父母宫'];
const fake={astro:{bySolar(){return {lunarDate:'八月廿八',palaces:branches.map((b,i)=>({name:names[i],index:i,earthlyBranch:b,heavenlyStem:'乙',majorStars:i===0?[{name:'紫微'}]:i===8?[{name:'天机'}]:[],minorStars:[],decadal:{range:[i*10,i*10+9]}}))};}}};

test('V1.3.2 修复根因：CSP 同时允许同源 daily.js 和内联工作台脚本',async t=>{
 const s=createFortuneServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>s.close(r)));
 const base=`http://127.0.0.1:${s.address().port}`;
 const page=await fetch(base+'/'),csp=page.headers.get('content-security-policy');
 assert.ok(page.ok);assert.match(csp,/script-src 'self' 'unsafe-inline'/);
 assert.match(page.headers.get('cache-control'),/no-store/);
 const html=await page.text();assert.match(html,/Fortune Master V1.5/);assert.match(html,/<script src="\/daily.js" defer><\/script>/);
 const js=await fetch(base+'/daily.js');assert.equal(js.status,200);assert.match(js.headers.get('content-type'),/application\/javascript/);
 assert.match(await js.text(),/window\.FortuneDailySign=Object\.freeze/);
 assert.equal((await (await fetch(base+'/health')).json()).version,'1.5.0');
});
test('100条原创签都形成签意、行动、四类具体解读与来源声明',()=>{
 for(let i=1;i<=100;i++){
  const d=signData(i);const st=d.interpretation.story;
  assert.equal(st.topics.length,4,`sign-${i}`);assert.deepEqual(st.topics.map(x=>x.name),['事业','财运','感情','健康']);
  assert.ok(st.meaning.includes(d.result.sign.meaning));assert.ok(st.action.includes(d.result.sign.action));
  assert.match(st.source.title,/非历史典故/);assert.match(st.source.note,/没有经过核验的古籍出处/);
  assert.ok(st.topics.every(x=>x.text.length>15));
 }
});
test('每日签 HTML 报告只显示一份签诗纸面，含“解曰”、四个生活主题和版权状态',()=>{
 const d=signData(37,'career'),h=renderHTML(d);
 assert.match(h,/解 曰/);assert.match(h,/行 动 建 议/);assert.match(h,/事业/);assert.match(h,/财运/);assert.match(h,/感情/);assert.match(h,/健康/);
 assert.match(h,/非历史典故/);assert.match(h,/签意与今日行动/);
 assert.equal((h.match(/桥畔候舟/g)||[]).length>=1,true);
 assert.ok(!h.includes('<div class="sign-paper">'), '含 story 的新报告不重复渲染签纸');
});
test('六爻动态解读绑定本卦、动爻、变卦，不随意决定吉凶',()=>{
 const d=castLiuyao({lines:[9,8,8,7,7,6],question:'最近要不要换工作？'}),st=d.interpretation.story;
 assert.match(st.title,/泽雷随/);assert.match(st.meaning,/第 1、6 爻/);assert.match(st.meaning,/你问的是/);
 assert.equal(st.topics.length,4);assert.ok(st.topics.find(t=>t.name==='事业').highlight);
 assert.match(st.source.note,/新增京房八宫、纳甲/ );assert.match(renderHTML(d),/解 曰/);
});
test('梅花起卦白话包含本卦互卦变卦及实际输入',()=>{
 const d=castMeihua({numbers:[3,5,2],question:'今年的工作计划该怎么做'}),st=d.interpretation.story;
 assert.equal(st.lines.length,3);assert.match(st.lines[1],/互卦/);
 assert.match(st.meaning,/你问的是/);assert.match(st.source.note,/项目明确规定的取余算法/);
 assert.equal(st.topics.length,4);
});
test('紫微宫位映射主星传统象意，不虚构空宫含义',async()=>{
 const d=await calculateZiwei({date:'2005-10-01',time:'15:00',gender:'female'},fake);
 const st=d.interpretation.story;assert.match(st.meaning,/紫微/);assert.match(st.meaning,/统筹和责任/);
 assert.match(st.topics.find(x=>x.name==='事业').text,/天机/);
 assert.match(st.topics.find(x=>x.name==='健康').text,/疾厄宫不是体检报告/);
 assert.match(renderHTML(d),/典故|十二宫与主星/);
});
test('用户问题在通俗解读与 HTML 中仍正确转义',()=>{
 const d=castMeihua({numbers:[1,4,6],question:'<script>window.pwn=1</script>'}),h=renderHTML(d);
 assert.ok(!h.includes('<script>window.pwn=1</script>'));
 assert.match(h,/&lt;script&gt;window.pwn=1&lt;\/script&gt;/);
});
test('工作台新入口不再错误地调用通用 d.original 分支',async()=>{
 const html=await readFile(new URL('../web/index.html',import.meta.url),'utf8');
 const daily=await readFile(new URL('../web/daily.js',import.meta.url),'utf8');
 assert.match(html,/window\.FortuneDailySign\?\.perform/);
 assert.match(html,/renderStory\(note\?\.story\)/);
 assert.match(daily,/window\.FortuneStory\?\.\(note\.story\)/);
 assert.match(html,/sign-restore-profile/);
});
