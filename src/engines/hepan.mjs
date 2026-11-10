// V1.4 双人合盘：只比较已经算出的八字结构，不做结婚/性格/财富概率预测。
import {calculateBazi} from './bazi.mjs';
import {compareFourPillars} from './hepan-analysis.mjs';
import {standardResult,assertPlainDate,assertClock} from '../core/schema.mjs';

const stemElement={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const produces={木:'火',火:'土',土:'金',金:'水',水:'木'};
const controls={木:'土',土:'水',水:'火',火:'金',金:'木'};
const he=['子丑','寅亥','卯戌','辰酉','巳申','午未'];
const chong=['子午','丑未','寅申','卯酉','辰戌','巳亥'];
const sanhe=['申子辰','亥卯未','寅午戌','巳酉丑'];
export function dayBranchRelation(a,b){
 if(a===b)return {type:'same',name:'日支相同',description:'双方的日支符号相同，可以把它作为“有哪些相似习惯”的讨论话题。'};
 const pair=a+b;
 if(he.some(x=>x.includes(a)&&x.includes(b)))return {type:'combine',name:'日支六合',description:'传统六合属于地支关系，不表示两人一定合得来。'};
 if(chong.some(x=>x.includes(a)&&x.includes(b)))return {type:'clash',name:'日支六冲',description:'传统六冲可以提醒多检查差异与沟通，但不代表两人会争吵或分开。'};
 if(sanhe.some(x=>x.includes(a)&&x.includes(b)))return {type:'triad',name:'同属三合组的两支',description:'只有两支，不构成完整三合局；只是结构上的同组标记。'};
 return {type:'neutral',name:'无已识别的日支六合或六冲',description:'未匹配到这些规则，并不代表关系好坏。'};
}
export function elementRelation(a,b){
 if(a===b)return {type:'same',name:'日主五行相同',direction:'both',description:'两种日主元素相同，传统上用来象征相近的关注点。'};
 if(produces[a]===b)return {type:'produces',name:`${a}生${b}`,direction:'a-to-b',description:'传统相生只是资源互补的比喻，不代表一方一定要付出。'};
 if(produces[b]===a)return {type:'produces',name:`${b}生${a}`,direction:'b-to-a',description:'传统相生只是资源互补的比喻，不代表一方一定要付出。'};
 if(controls[a]===b)return {type:'controls',name:`${a}克${b}`,direction:'a-to-b',description:'传统相克可用来提醒讨论边界与决策，不是任何一方控制另一方的事实。'};
 if(controls[b]===a)return {type:'controls',name:`${b}克${a}`,direction:'b-to-a',description:'传统相克可用来提醒讨论边界与决策，不是任何一方控制另一方的事实。'};
 throw Error('五行关系无法识别');
}
function validatePerson(obj,name){if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error(`${name}的出生资料不完整`);
  assertPlainDate(obj.date);assertClock(obj.time);
  const label=typeof obj.label==='string'?obj.label.trim():'';if(!label||label.length>40||/[\u0000-\u001f<>]/.test(label))throw Error(`${name}的称呼需要 1–40 个普通字符`);
  return {label,date:obj.date,time:obj.time,gender:obj.gender,timezone:obj.timezone||'Asia/Shanghai',daySect:obj.daySect??2,yunSect:obj.yunSect??1};}
export function compareCharts(a,b,{mode='love',referenceYear=2026}={}){
 if(!['love','social','fortune'].includes(mode))throw Error('合盘主题只能是感情、人际或运势');
 if(!Number.isInteger(referenceYear)||referenceYear<1900||referenceYear>2099)throw Error('对照年份必须为 1900–2099 整数');
 const ap=a.result.pillars,bp=b.result.pillars;
 const elA=stemElement[ap[2].stem],elB=stemElement[bp[2].stem];
 if(!elA||!elB)throw Error('两个人的日主五行未计算完成');
 const active=chart=>chart.result.luck.cycles.find(x=>x.startYear<=referenceYear&&x.endYear>=referenceYear)||null;
 return {mode,referenceYear,people:[{label:a.input.label||'甲方',pillars:ap,dayMaster:a.result.dayMaster,dayElement:elA,dayBranch:ap[2].branch,visibleElements:a.result.observedFiveElements.counts,activeCycle:active(a)},{label:b.input.label||'乙方',pillars:bp,dayMaster:b.result.dayMaster,dayElement:elB,dayBranch:bp[2].branch,visibleElements:b.result.observedFiveElements.counts,activeCycle:active(b)}],dayBranch:dayBranchRelation(ap[2].branch,bp[2].branch),crossChart:compareFourPillars(ap,bp),dayElements:elementRelation(elA,elB),rules:['比较双方四柱地支的相同/六合/六冲，日主五行及指定年份的大运段；只作传统结构观察','未实现纳音合婚、生肖断婚、神煞合婚或配对分数','运势是两个传统时间标签的并列展示，不能推断具体事件']};
}
export async function calculateHepan(options={},libOverride){
 const {personA,personB,mode='love',referenceYear=2026}=options;
 const a=validatePerson(personA,'甲方'),b=validatePerson(personB,'乙方');
 const year=Number(referenceYear);if(!Number.isInteger(year)||year<1900||year>2099)throw Error('请提供 1900–2099 的对照年份');
 const [chartA,chartB]=await Promise.all([calculateBazi(a,libOverride),calculateBazi(b,libOverride)]);
 chartA.input.label=a.label;chartB.input.label=b.label;
 const result=compareCharts(chartA,chartB,{mode,referenceYear:year});
 return standardResult('hepan',{personA:a,personB:b,mode,referenceYear:year},result,{
  evidence:[{type:'algorithm',name:'lunar-typescript',version:'1.8.6',note:'双方四柱分别由同一历法引擎计算；日干五行、日支结构由明确的规则表对照'}],
  policy:{method:'two-independent-bazi',scope:'日主五行/日支/大运并列',referenceYear:year,timezoneHandling:'双方均需使用 Asia/Shanghai 出生钟表时间'},
  warnings:['合盘只提供传统文化框架下的关系讨论，不能推断感情稳定性、伴侣忠诚度、人际适配或财富未来。','不提供“合适度百分比”“正缘”“必然冲克”或合婚吉凶结论。','双方资料仅用于本次计算；除用户单独确认保存到命盘档案外，不会持久化。']
 });
}
