// V1.5 子平格局观察层：公开规则、事实与判断边界分离。
// 不将可见干支计数当作日主旺衰，也不宣称已求出喜用神。
const STEM_ELEMENT={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const BRANCH_ELEMENT={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const GENERATED={木:'火',火:'土',土:'金',金:'水',水:'木'};
const CONTROLLED={木:'土',火:'金',土:'水',金:'木',水:'火'};
const TEN_GODS=new Set(['比肩','劫财','食神','伤官','偏财','正财','七杀','偏官','正官','偏印','正印']);
const normalize=(g)=>g==='偏官'?'七杀':g;
export function analyzeBaziPattern(pillars){
 if(!Array.isArray(pillars)||pillars.length!==4)throw Error('格局观察必须有完整四柱');
 const month=pillars[1],day=pillars[2];
 const mainStem=month.hiddenStems?.[0],mainGod=normalize(month.hiddenTenGods?.[0]);
 const dayEl=STEM_ELEMENT[day.stem],monthEl=BRANCH_ELEMENT[month.branch];
 if(!dayEl||!monthEl)throw Error('日主或月支缺少五行信息');
 const stems=pillars.flatMap((p,i)=>i===2?[]:[{position:i,pillar:p.title,stem:p.stem}]);
 const exposed=stems.filter(x=>x.stem===mainStem);
 const rootDetails=pillars.map(p=>({pillar:p.title,branch:p.branch,matchingDayStem:(p.hiddenStems||[]).includes(day.stem),sameElementStems:(p.hiddenStems||[]).filter(s=>STEM_ELEMENT[s]===dayEl)}));
 const months=[
  ...(monthEl===dayEl?[{kind:'same',text:'月令地支本气与日主五行相同'}]:[]),
  ...(GENERATED[monthEl]===dayEl?[{kind:'generates',text:'月令本气五行生扶日主'}]:[]),
  ...(GENERATED[dayEl]===monthEl?[{kind:'outputs',text:'日主五行生月令本气'}]:[]),
  ...(CONTROLLED[monthEl]===dayEl?[{kind:'controls',text:'月令本气五行克制日主'}]:[]),
  ...(CONTROLLED[dayEl]===monthEl?[{kind:'controlled',text:'日主五行克月令本气'}]:[])
 ];
 const candidate=(mainStem&&TEN_GODS.has(mainGod)&&exposed.length)
  ?{status:'candidate',label:mainGod,description:`月支${month.branch}首位藏干${mainStem}的十神为${mainGod}，在${exposed.map(p=>p.pillar).join('、')}透出；可作为月令取格的观察线索，不等于格局成败或喜用神已确定。`,stem:mainStem,tenGod:mainGod,exposedAt:exposed.map(p=>p.pillar)}
  :{status:'insufficient',label:null,description:'月令本气未在年、月、时天干透出，或十神信息缺失。本版不凭猜测断格局，可进一步研究月令余气及通根、合化、破格等流派规则。',stem:mainStem||null,tenGod:mainGod||null,exposedAt:[]};
 const roots=rootDetails.filter(p=>p.sameElementStems.length);
 return {method:'month-main-qi-transparency-v1',dayMaster:{stem:day.stem,element:dayEl},monthCommand:{branch:month.branch,element:monthEl,mainHiddenStem:mainStem||null,mainHiddenTenGod:mainGod||null,seasonSignal:months[0]?.text||'季令五行关系未识别'},rootSignals:{sameStem:rootDetails.filter(x=>x.matchingDayStem).map(x=>x.pillar),sameElement:roots.map(x=>({pillar:x.pillar,stems:x.sameElementStems}))},pattern:candidate,strength:{status:'not-determined',score:null,conclusion:null,why:'仅列月令生克和藏干通根线索；未实现司令分日、合化、刑冲权重与全局强弱判断，不能输出身强身弱评分。'},favorableElements:{status:'not-determined',elements:[],why:'本版不自动推断用神或喜用神；不能由五行计数、季令或单一格局候选直接决定。'},ruleRefs:['bazi-pattern-month-command','bazi-pattern-rooting'],limitations:['格局候选不等于成格，未完成完整子平格局论证','出生地、节气边界与排运流派仍需单独复核']};
}
