import {assertPlainDate,assertClock,assertTimezone,assertGender,assertSect,standardResult} from '../core/schema.mjs';
import {loadLunar} from '../core/load-lunar.mjs';
import {detectBranchRelations} from './bazi-relations.mjs';
import {analyzeBaziPattern} from './bazi-pattern.mjs';
const PILLARS = [
  ['year','年柱','Year'],['month','月柱','Month'],['day','日柱','Day'],['time','时柱','Time']
];
const GAN_WUXING = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
const ZHI_WUXING = {'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
export async function calculateBazi(options={},libOverride){
  const {date,time,gender,timezone='Asia/Shanghai',daySect=2,yunSect=1} = options;
  const d=assertPlainDate(date), t=assertClock(time);
  assertTimezone(timezone); assertGender(gender); const ds=assertSect(daySect,'daySect'),ys=assertSect(yunSect,'yunSect');
  if(options.trueSolarTime === true) throw new Error('V1.2 暂不支持真太阳时校正，请关闭后重试，不会默默忽略此设置');
  const lib=libOverride||await loadLunar();
  const solar=lib.Solar.fromYmdHms(d.y,d.m,d.d,t.h,t.min,0);
  const lunar=solar.getLunar();const eight=lunar.getEightChar();eight.setSect(ds);
  const pillars=PILLARS.map(([key,title,s])=>({
    key,title,ganZhi:eight[`get${s}`](),
    stem:eight[`get${s}Gan`](),branch:eight[`get${s}Zhi`](),
    hiddenStems:eight[`get${s}HideGan`](),
    hiddenTenGods:eight[`get${s}ShiShenZhi`](),
    stemTenGod:eight[`get${s}ShiShenGan`](),
    naYin:eight[`get${s}NaYin`](),
    growthStage:eight[`get${s}DiShi`]()
  }));
  const observedWuxing=Object.fromEntries(['木','火','土','金','水'].map(x=>[x,0]));
  for(const p of pillars){
    observedWuxing[GAN_WUXING[p.stem]]++;
    observedWuxing[ZHI_WUXING[p.branch]]++;
  }
  const yun=eight.getYun(gender==='male'?1:0,ys);
  const daYun=yun.getDaYun().filter(c=>c.getIndex()>=1).map(c=>({
    index:c.getIndex(),ganZhi:c.getGanZhi(),startYear:c.getStartYear(),endYear:c.getEndYear(),
    startAge:c.getStartAge(),endAge:c.getEndAge()
  }));
  const result={
    lunarDate:{year:lunar.getYear(),month:lunar.getMonth(),day:lunar.getDay(),text:lunar.toString()},
    pillars,dayMaster:pillars[2].stem,
    patternObservation:analyzeBaziPattern(pillars),
    traditionalRelations:detectBranchRelations(pillars),
    observedFiveElements:{counts:observedWuxing,rule:'只统计四柱明干与地支本气，共 8 个位置；不计藏干、不加权、不等同旺衰或用神判定'},
    luck:{startDelay:{years:yun.getStartYear(),months:yun.getStartMonth(),days:yun.getStartDay(),hours:yun.getStartHour()},
      firstStartSolar:yun.getStartSolar().toYmd(),cycles:daYun},
    special:{taiYuan:eight.getTaiYuan(),mingGong:eight.getMingGong(),shenGong:eight.getShenGong()}
  };
  return standardResult('bazi',{calendar:'solar',date,time,gender,timezone,trueSolarTime:false},result,{
    policy:{yearBoundary:'立春精确时刻',monthBoundary:'节气精确时刻',daySect:ds,daySectDesc:ds===1?'晚子时日柱算次日':'晚子时日柱算当日',yunSect:ys,timezoneHandling:'视为中国标准时的民用时间（不做出生地/经度校正）'},
    evidence:[{type:'algorithm',name:'lunar-typescript',version:'1.8.6',url:'https://github.com/6tail/lunar-typescript',note:'立春/节气四柱与传统大运算法；具体准确性需配合测试集验证'}],
    warnings:['四柱与历法结果可校验；十神等属于传统术数规则，不等于科学命运预测。','月令格局只提供可追溯的候选线索，不自动断定身强身弱或喜用神。','起运流派可配置，不同排盘网站结果可能不同。', ...(t.h===23?['出生在 23:00–23:59，注意早晚子时换日流派差异。']:[])]
  });
}
