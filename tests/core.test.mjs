import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPlainDate,assertClock,assertTimezone} from '../src/core/schema.mjs';
import {route} from '../src/core/router.mjs';
import {TRIGRAMS,hexagramFromLines,hexagramFromYaoValues,trigramByNumber} from '../src/engines/iching.mjs';
import {castLiuyao} from '../src/engines/liuyao.mjs';
import {castMeihua} from '../src/engines/meihua.mjs';
import {renderHTML} from '../src/reports/html.mjs';
import {calculateBazi} from '../src/engines/bazi.mjs';

test('公历非法日期必须拒绝，闰年合法',()=>{
  assert.equal(assertPlainDate('2000-02-29').d,29);
  assert.throws(()=>assertPlainDate('2001-02-29'));
  assert.throws(()=>assertPlainDate('2026-13-15'));
  assert.throws(()=>assertPlainDate('2026-01-32'));
  assert.throws(()=>assertPlainDate('2099/01/01'));
  assert.throws(()=>assertPlainDate('1899-12-31'));
});
test('时辰和时区校验',()=>{
  assert.deepEqual(assertClock('23:59'),{h:23,min:59});
  assert.throws(()=>assertClock('24:00'));
  assert.throws(()=>assertClock('7:00'));
  assert.throws(()=>assertTimezone('America/Los_Angeles'));
});
test('路由优先明确领域，多领域不猜测',()=>{
  assert.equal(route('帮我排八字').method,'bazi');
  assert.equal(route('梅花易数数字起卦').method,'meihua');
  assert.equal(route('六爻铜钱卦').method,'liuyao');
  assert.equal(route('看黄历').method,'huangli');
  assert.equal(route('八字和六爻一起看').method,null);
  assert.equal(route('想算一下').method,null);
});
test('八卦互不重叠，64卦文王序号完整唯一',()=>{
  const set=new Set();
  for(const lo of TRIGRAMS)for(const up of TRIGRAMS){
    const r=hexagramFromLines([...lo.lines,...up.lines]);
    set.add(r.kingWenNumber);
    assert.equal(r.lower.id,lo.id);
    assert.equal(r.upper.id,up.id);
  }
  assert.equal(set.size,64);
  assert.deepEqual([...set].sort((a,b)=>a-b),Array.from({length:64},(_,i)=>i+1));
  assert.equal(hexagramFromLines([1,1,1,1,1,1]).kingWenNumber,1);
  assert.equal(hexagramFromLines([0,0,0,0,0,0]).kingWenNumber,2);
  assert.equal(hexagramFromLines([1,0,0,0,1,0]).kingWenNumber,3); // 水雷屯
  assert.equal(hexagramFromLines([0,1,0,0,0,1]).kingWenNumber,4); // 山水蒙
});
test('六爻六数字动爻算法、异常值校验',()=>{
  const r=hexagramFromYaoValues([6,7,8,9,7,8]);
  assert.deepEqual(r.movingLines,[1,4]);
  assert.deepEqual(r.original.linesBottomUp,[0,1,0,1,1,0]);
  assert.deepEqual(r.changed.linesBottomUp,[1,1,0,0,1,0]);
  assert.throws(()=>hexagramFromYaoValues([5,7,8,9,7,8]));
  assert.throws(()=>hexagramFromYaoValues([6,7,8]));
});
test('三钱记录可复现且上下爻顺序固定',()=>{
  const coins=['TTT','HTT','HHT','HHH','THT','HTH'];
  const r=castLiuyao({coins,question:'学习'});
  assert.deepEqual(r.input.linesBottomUp,[6,7,8,9,7,8]);
  assert.deepEqual(r.result.movingLines,[1,4]);
  assert.equal(r.input.casting,'provided-coins');
  assert.equal(r.evidence[0].id,'three-coin-basic-hexagram');
  assert.throws(()=>castLiuyao({coins:['HHT']}));
});
test('梅花三数字 3/5/2 映射火风鼎→火山旅，体用可溯源',()=>{
  const r=castMeihua({numbers:[3,5,2]});
  assert.equal(r.result.original.kingWenNumber,50);
  assert.equal(r.result.changed.kingWenNumber,56);
  assert.deepEqual(r.result.movingLines,[2]);
  assert.equal(r.result.bodyUse.use,'下卦');
  assert.equal(trigramByNumber(8).name,'坤');
  assert.throws(()=>castMeihua({numbers:[0,5,2]}));
});
test('HTML 转义问题和其他字段，不允许注入标签',()=>{
  const r=castMeihua({numbers:[3,5,2],question:'<img src=x onerror=alert(1)>'});
  const out=renderHTML(r);
  assert.ok(out.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!out.includes('<img src=x onerror=alert(1)>'));
  assert.ok(out.includes('火风鼎'));
});
test('八字输入非法时应在加载 npm 依赖之前失败',async()=>{
  await assert.rejects(calculateBazi({date:'2026-02-30',time:'10:00',gender:'male'}),/日期无效/);
  await assert.rejects(calculateBazi({date:'2005-10-01',time:'15:00',gender:'male',trueSolarTime:true}),/真太阳时/);
  await assert.rejects(calculateBazi({date:'2005-10-01',time:'15:00',gender:'other'}),/gender/);
});
test('测试注入的历法库应产生完整四柱和大运 JSON 协议',async()=>{
  const cols={Year:'乙酉',Month:'乙酉',Day:'戊午',Time:'庚申'};
  const mkEight=()=>{
    const e={setSect(){},getYun(){return {getStartYear:()=>2,getStartMonth:()=>3,getStartDay:()=>0,getStartHour:()=>0,getStartSolar:()=>({toYmd:()=> '2008-01-01'}),getDaYun:()=>[{getIndex:()=>0},{getIndex:()=>1,getGanZhi:()=> '丙戌',getStartYear:()=>2008,getEndYear:()=>2017,getStartAge:()=>3,getEndAge:()=>12}]};},getTaiYuan:()=> '甲子',getMingGong:()=> '乙丑',getShenGong:()=> '丙寅'};
    for(const [k,v] of Object.entries(cols)){
      e['get'+k]=()=>v;e['get'+k+'Gan']=()=>v[0];e['get'+k+'Zhi']=()=>v[1];e['get'+k+'HideGan']=()=>['庚'];e['get'+k+'ShiShenZhi']=()=>['食神'];e['get'+k+'ShiShenGan']=()=> '伤官';e['get'+k+'NaYin']=()=> '泉中水';e['get'+k+'DiShi']=()=> '临官';
    }return e;
  };
  const fakeLib={Solar:{fromYmdHms:()=>({getLunar:()=>({getEightChar:mkEight,getYear:()=>2005,getMonth:()=>8,getDay:()=>28,toString:()=> '二零零五年八月廿八'})})}};
  const r=await calculateBazi({date:'2005-10-01',time:'15:00',gender:'female'},fakeLib);
  assert.equal(r.method,'bazi');
  assert.deepEqual(r.result.pillars.map(p=>p.ganZhi),Object.values(cols));
  assert.equal(Object.values(r.result.observedFiveElements.counts).reduce((a,b)=>a+b),8);
  assert.equal(r.result.luck.cycles.length,1);
  assert.ok(renderHTML(r).includes('乙'));
  assert.equal(r.interpretation.sections.length,9);
  assert.ok(r.interpretation.sections.some(x=>x.id==='bazi-ten-gods'));
  assert.ok(renderHTML(r).includes('事业与表达主题'));
  assert.ok(r.interpretation.limitations.some(x=>x.includes('喜用神')));
});
