import {assertPlainDate,assertClock,assertGender,assertTimezone,standardResult} from '../core/schema.mjs';
import {loadIztro} from '../core/load-iztro.mjs';
import {analyzeZiweiPalaces} from './ziwei-analysis.mjs';
const toLabel=star=>typeof star==='string'?star:String(star?.name??'');
const readStar=star=>({name:toLabel(star),brightness:star?.brightness??null,mutagen:star?.mutagen??null});
// iztro 的 timeIndex: 0=00:00-00:59 早子; 1=01:00-02:59 丑; ...; 11=亥; 12=23:00-23:59 晚子。
export const timeIndexFromClock=(h)=>h===23?12:Math.floor((h+1)/2);
export async function calculateZiwei(options={},libOverride){
  const {date,time,gender,timezone='Asia/Shanghai',fixLeap=true,sect='default',focusDate='2026-11-07'}=options;
  const d=assertPlainDate(date),t=assertClock(time);
  assertPlainDate(focusDate);
  assertTimezone(timezone);assertGender(gender);
  if(fixLeap!==true && fixLeap!==false)throw new Error('fixLeap 需是 true 或 false');
  if(sect!=='default')throw new Error('本版仅支持 iztro 默认流派；其他流派尚未验证');
  if(options.trueSolarTime===true)throw new Error('暂不支持真太阳时校正');
  const lib=libOverride||await loadIztro();
  const index=timeIndexFromClock(t.h);
  const chart=lib.astro.bySolar(`${d.y}-${d.m}-${d.d}`,index,gender==='male'?'男':'女',fixLeap,'zh-CN');
  if(!chart||!Array.isArray(chart.palaces)||chart.palaces.length!==12)throw new Error('紫微排盘未返回完整十二宫，请检查 iztro 版本');
  const palaces=chart.palaces.map((p,i)=>({
    index:Number.isInteger(p.index)?p.index:i,
    name:String(p.name??`第${i+1}宫`),
    heavenlyStem:String(p.heavenlyStem??''),earthlyBranch:String(p.earthlyBranch??''),
    isBodyPalace:Boolean(p.isBodyPalace),isOriginalPalace:Boolean(p.isOriginalPalace),
    majorStars:(p.majorStars||[]).map(readStar).filter(s=>s.name),
    minorStars:(p.minorStars||[]).map(readStar).filter(s=>s.name),
    decadal:Array.isArray(p.decadal?.range)?{range:p.decadal.range.map(Number)}:null
  }));
  // 由真实地支位置推导对宫 / 三合宫；若数据不完整则不编造关系。
  const BRANCHES='子丑寅卯辰巳午未申酉戌亥'.split('');
  const byBranch=new Map(palaces.map(p=>[p.earthlyBranch,p]));
  if(byBranch.size===12&&BRANCHES.every(b=>byBranch.has(b))){
    for(const p of palaces){
      const n=BRANCHES.indexOf(p.earthlyBranch);
      const simple=q=>({name:q.name,earthlyBranch:q.earthlyBranch,majorStars:q.majorStars.map(st=>({name:st.name,mutagen:st.mutagen}))});
      p.relations={
        opposite:simple(byBranch.get(BRANCHES[(n+6)%12])),
        triads:[4,8].map(offset=>simple(byBranch.get(BRANCHES[(n+offset)%12]))),
        rule:'对宫地支相差6位，三方地支分别相差4/8位；只作盘面结构展示。'
      };
    }
  }
  // V1.4: 官方 iztro v2.6.x 运限接口。若引擎/mock 无接口，明确退化为空，不填造运限。
  const compact = x=>{
    if(!x || typeof x!=='object')return null;
    const o={};
    for(const key of ['index','name','palaceName','heavenlyStem','earthlyBranch','startYear','endYear','nominalAge','year','month','day','age']){
      if(['string','number'].includes(typeof x[key]))o[key]=x[key];
    }
    if(Array.isArray(x.range))o.range=x.range.filter(Number.isFinite).slice(0,2);
    if(Array.isArray(x.palaceNames))o.palaceNames=x.palaceNames.filter(y=>typeof y==='string').slice(0,12);
    if(x.palace && typeof x.palace.name==='string')o.palace=x.palace.name;
    if(Array.isArray(x.mutagen))o.mutagen=x.mutagen.filter(y=>typeof y==='string').slice(0,8);
    return o;
  };
  let transits={focusDate,available:false,decadals:[],selected:null};
  if(typeof chart.decadalList==='function'&&typeof chart.horoscope==='function'){
    const periods=chart.decadalList();
    const current=chart.horoscope(focusDate);
    if(!Array.isArray(periods)||!current||typeof current!=='object')throw Error('iztro 运限接口输出异常，请确认版本');
    const selected={};
    for(const key of ['decadal','yearly','monthly','daily','hourly'])selected[key]=compact(current[key]);
    transits={focusDate,available:true,decadals:periods.slice(0,16).map(compact).filter(Boolean),selected};
  }
  return standardResult('ziwei',{calendar:'solar',date,time,gender,timezone,fixLeap,focusDate,trueSolarTime:false},{
    solarDate:String(chart.solarDate??date),lunarDate:String(chart.lunarDate??''),chineseDate:String(chart.chineseDate??''),
    time:String(chart.time??''),timeRange:String(chart.timeRange??''),
    soul:String(chart.soul??''),body:String(chart.body??''),fiveElementsClass:String(chart.fiveElementsClass??''),
    earthlyBranchOfSoulPalace:String(chart.earthlyBranchOfSoulPalace??''),
    earthlyBranchOfBodyPalace:String(chart.earthlyBranchOfBodyPalace??''),
    palaces,transits,advanced:analyzeZiweiPalaces(palaces,transits)
  },{
    policy:{engine:'iztro',engineVersion:'2.6.3',sect:'iztro 默认流派',fixLeap,lateZi:'23:00-23:59 映射晚子时(12)',timezoneHandling:'仅支持中国时区的当地民用钟表时间，不做真太阳时校正'},
    evidence:[{type:'algorithm',name:'iztro',version:'2.6.3',url:'https://github.com/SylarLong/iztro',note:'确定性生成紫微十二宫、星曜与四化；本版不自动比较不同流派'}],
    warnings:['紫微斗数属传统民俗解释，宫位与星曜不构成对性格、疾病、财富和未来事件的科学判断。','不同排盘流派及闰月处理可能不同，请核对出生时间与排盘配置。', ...(!transits.available?['当前 iztro 对象不具备运限接口，本次未生成流年/大限。']:[])]
  });
}
