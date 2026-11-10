// 将每条传统解读的“依据”显式映射到本次计算生成的字段。
// 这只是程序事实路径追溯，不代表古籍逐字引证，也不证明未来事件预测。
const TRACE_PATHS={
  'bazi-four-pillars':['result.pillars.0.ganZhi','result.pillars.1.ganZhi','result.pillars.2.ganZhi','result.pillars.3.ganZhi'],
  'bazi-season':['result.pillars.1.branch','policy.monthBoundary'],
  'bazi-five-elements':['result.observedFiveElements.counts','result.observedFiveElements.rule'],
  'bazi-ten-gods':['result.pillars.0.stemTenGod','result.pillars.1.stemTenGod','result.pillars.3.stemTenGod'],
  'bazi-relations':['result.traditionalRelations'],
  'bazi-career':['result.pillars.1.stemTenGod','result.pillars.3.stemTenGod'],
  'bazi-resources':['result.pillars.0.stemTenGod','result.pillars.1.stemTenGod'],
  'bazi-luck':['result.luck.startDelay','result.luck.firstStartSolar'],
  'bazi-boundary':['result.pillars.2.ganZhi','result.pillars.3.ganZhi'],
  'liuyao-main':['result.original.name','result.original.kingWenNumber'],
  'liuyao-moving':['result.movingLines','result.yaoBottomUp'],
  'liuyao-changed':['result.changed.name','result.changed.kingWenNumber'],
  'liuyao-method':['input.linesBottomUp','input.casting'],
  'meihua-base':['result.original.name','input.numbers'],
  'meihua-body-use':['result.bodyUse'],
  'meihua-changing':['result.movingLines','result.changed.name'],
  'meihua-mutual':['result.mutual.name'],
  'meihua-path':['result.original.name','result.mutual.name','result.changed.name'],
  'meihua-method':['input.numbers','policy.method'],
  'ziwei-overview':['result.soul','result.body','result.fiveElementsClass'],
  'ziwei-key':['result.palaces'],
  'ziwei-relationships':['result.palaces'],
  'ziwei-boundary':['policy.engine','policy.fixLeap'],
  'ziwei-transits':['result.transits.focusDate','result.transits.selected'],
  'hepan-overview':['result.people.0.dayMaster','result.people.1.dayMaster'],
  'hepan-elements':['result.dayElements'],
  'hepan-branches':['result.dayBranch'],
  'hepan-theme':['result.mode'],
  'hepan-time':['result.people.0.activeCycle','result.people.1.activeCycle'],
  'huangli-meaning':['result.yi','result.ji']
};
function pathValue(obj,path){
  const parts=path.split('.');let node=obj;
  for(const p of parts){
    if(!node||typeof node!=='object'||!Object.hasOwn(node,p))return undefined;
    node=node[p];
  }
  return node;
}
function shortValue(value){
  const raw=typeof value==='string'?value:JSON.stringify(value);
  return raw.length<=180?raw:raw.slice(0,177)+'…';
}
export function attachTrace(data,interpretation){
  if(!interpretation)return null;
  const sections=interpretation.sections.map(s=>{
    const spec=s.id.startsWith('ziwei-palace-')
      ?[`result.palaces.${Number(s.id.slice(13))}.name`,`result.palaces.${Number(s.id.slice(13))}.majorStars`,`result.palaces.${Number(s.id.slice(13))}.relations`]
      :TRACE_PATHS[s.id]||[];
    const trace=spec.flatMap(path=>{
      const value=pathValue(data,path);
      return value===undefined?[]:[{path,value:shortValue(value)}];
    });
    return {...s,trace};
  });
  return {...interpretation,sections,tracePolicy:'依据路径仅指向本次排盘/起卦生成的数据。规则说明和古籍主题索引不等于逐句考据或科学预测。'};
}
