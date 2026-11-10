import test from 'node:test';
import assert from 'node:assert/strict';
import {KNOWLEDGE,searchKnowledge,hexagramEntry} from '../src/knowledge/catalog.mjs';
import {castLiuyao} from '../src/engines/liuyao.mjs';
import {castMeihua} from '../src/engines/meihua.mjs';
import {calculateZiwei,timeIndexFromClock} from '../src/engines/ziwei.mjs';
import {renderHTML} from '../src/reports/html.mjs';
import {route} from '../src/core/router.mjs';

const fakePalaceNames=['命宫','兄弟','夫妻','子女','财帛','疾厄','迁移','交友','官禄','田宅','福德','父母'];
function stubZiweilib(){
  const calls=[];
  return {calls,astro:{bySolar(...args){
    calls.push(args);
    return {solarDate:args[0],lunarDate:'二零零五年八月廿八',chineseDate:'乙酉年',time:'申',timeRange:'15:00-16:59',soul:'破军',body:'天相',fiveElementsClass:'水二局',earthlyBranchOfSoulPalace:'辰',earthlyBranchOfBodyPalace:'酉',palaces:fakePalaceNames.map((name,index)=>({
      index,name,heavenlyStem:'乙',earthlyBranch:'辰',isBodyPalace:index===6,
      majorStars: index===0?[{name:'紫微',brightness:'庙',mutagen:'科'}]:index===8?[{name:'天机',brightness:'旺'}]:[],
      minorStars:[{name:'文昌'}],decadal:{range:[index*10+2,index*10+11]}
    }))};
  }}};
}
test('知识库覆盖全部64卦、十四主星、十神、宫位且标注原创摘要',()=>{
  assert.equal(KNOWLEDGE.hexagrams.length,64);
  assert.equal(new Set(KNOWLEDGE.hexagrams.map(x=>x.number)).size,64);
  assert.equal(Object.keys(KNOWLEDGE.stars).length,14);
  assert.ok(KNOWLEDGE.concepts.length>=120);
  assert.ok(KNOWLEDGE.verifiedQuotes.every(x=>x.status==='verified-short-excerpt'));
  assert.ok(KNOWLEDGE.concepts.every(x=>x.originalSummary));
  assert.equal(hexagramEntry(50).name,'火风鼎');
});
test('离线关键词检索和领域过滤，限制异常输入',()=>{
  let data=searchKnowledge({query:'紫微',domain:'ziwei'});
  assert.ok(data.items.some(x=>x.id==='star-紫微'));
  assert.ok(data.items.every(x=>x.domain==='ziwei'));
  assert.ok(searchKnowledge({query:'鼎',domain:'iching'}).total>0);
  assert.equal(searchKnowledge({query:'找不到的数字3030355'}).total,0);
  assert.throws(()=>searchKnowledge({query:'a'.repeat(200)}));
  assert.throws(()=>searchKnowledge({domain:'shell'}));
  assert.throws(()=>searchKnowledge({limit:999}));
});
test('六爻对本卦、变卦、动爻输出可追溯的传统解读',()=>{
  const r=castLiuyao({lines:[9,8,8,7,7,6],question:'学习计划'});
  assert.equal(r.interpretation.sections.length,4);
  assert.deepEqual(r.result.movingLines,[1,6]);
  assert.ok(r.interpretation.summary.includes(r.result.original.name));
  assert.ok(r.interpretation.sections.find(x=>x.id==='liuyao-moving').observations.some(s=>s.includes('老阳转阴')));
  assert.ok(r.interpretation.limitations.some(x=>x.includes('纳甲')));
  const html=renderHTML(r);
  assert.ok(html.includes('高级解读'));
  assert.ok(html.includes('动爻'));
  assert.ok(html.includes('文献与算法来源'));
});
test('梅花三数结果有互卦和体用五行生克，规则一致',()=>{
  const r=castMeihua({numbers:[3,5,2],question:'研发规划'});
  assert.equal(r.result.original.kingWenNumber,50);
  assert.equal(r.result.changed.kingWenNumber,56);
  assert.equal(r.result.mutual.kingWenNumber,43); // 夬卦? 需按卦规则核对
  assert.equal(r.interpretation.sections.length,6);
  assert.ok(r.interpretation.sections.some(s=>s.id==='meihua-body-use'));
  assert.ok(renderHTML(r).includes('体用五行关系'));
});
test('紫微边界时辰映射：早子/丑/亥/晚子',()=>{
  assert.equal(timeIndexFromClock(0),0);
  assert.equal(timeIndexFromClock(1),1);
  assert.equal(timeIndexFromClock(2),1);
  assert.equal(timeIndexFromClock(21),11);
  assert.equal(timeIndexFromClock(22),11);
  assert.equal(timeIndexFromClock(23),12);
});
test('紫微12宫结构与12宫逐项解释，使用真实库同名API注入测试',async()=>{
  const lib=stubZiweilib();
  const r=await calculateZiwei({date:'2005-10-01',time:'15:00',gender:'female'},lib);
  assert.equal(r.method,'ziwei');
  assert.equal(lib.calls[0][0],'2005-10-1');
  assert.equal(lib.calls[0][1],8);
  assert.equal(lib.calls[0][2],'女');
  assert.equal(r.result.palaces.length,12);
  assert.equal(r.result.palaces[0].majorStars[0].mutagen,'科');
  assert.equal(r.interpretation.sections.length,15);
  assert.ok(r.interpretation.summary.includes('紫微'));
  const html=renderHTML(r);
  assert.ok(html.includes('十二宫 · 四方盘'));
  assert.ok(html.includes('紫微'));
  assert.ok(html.includes('星曜')); 
});
test('紫微非法参数在载入依赖前拒绝，边界时间不做自行猜测',async()=>{
  assert.equal(route('紫微斗数命盘').method,'ziwei');
  await assert.rejects(calculateZiwei({date:'2026-02-30',time:'12:00',gender:'male'}),/日期无效/);
  await assert.rejects(calculateZiwei({date:'2005-10-01',time:'15:00',gender:'male',trueSolarTime:true}),/真太阳时/);
  await assert.rejects(calculateZiwei({date:'2005-10-01',time:'15:00',gender:'male',sect:'fake'}),/默认流派/);
});
