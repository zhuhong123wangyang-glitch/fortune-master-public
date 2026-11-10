// V1.5 紫微四化与三方四正结构化审阅。仅使用 iztro 返回的事实数据；不重新推断四化表。
const VALID=new Set(['禄','权','科','忌']);
const LABELS={禄:'化禄：传统上联想到资源与增加',权:'化权：传统上联想到责任与主导',科:'化科：传统上联想到名誉、学习与认可',忌:'化忌：传统上联想到需要投入精力处理的议题'};
export function analyzeZiweiPalaces(palaces,transits){
 if(!Array.isArray(palaces)||palaces.length!==12)throw Error('紫微四化分析需要完整十二宫');
 const records=[];
 for(const p of palaces)for(const star of [...(p.majorStars||[]),...(p.minorStars||[])]){
  if(VALID.has(star.mutagen))records.push({palace:p.name,earthlyBranch:p.earthlyBranch,star:star.name,transformation:star.mutagen,plain:LABELS[star.mutagen]});
 }
 const life=palaces.find(p=>/^命宫?$/.test(p.name));
 const circle=life?.relations?{
  main:{palace:life.name,earthlyBranch:life.earthlyBranch,stars:(life.majorStars||[]).map(s=>s.name)},
  opposite:life.relations.opposite,
  triads:life.relations.triads,
  note:'地支间隔6取对宫、间隔4和8取三合；星曜均来自当前命盘，尚未自动判别吉凶格局。'
 }:null;
 const selected=[];
 for(const [scope,value] of Object.entries(transits?.selected||{})){
  const stars=value?.mutagen;
  // iztro v2.6.x: mutagen 按禄权科忌次序返回相应星名。
  if(Array.isArray(stars)&&stars.length===4&&stars.every(s=>typeof s==='string'&&s)){
   selected.push({scope,focusDate:transits.focusDate,stars:stars.map((star,i)=>({transformation:['禄','权','科','忌'][i],star}))});
  }
 }
 return {natalTransformations:records,natalComplete:VALID.size===new Set(records.map(x=>x.transformation)).size,lifeSurround:circle,transitTransformations:selected,transitAvailable:Boolean(transits?.available),policy:{scope:'生年四化与 iztro 返回的大限流年四化摘要',source:'iztro v2.6.3 星曜 mutagen 字段及运限 mutagen 星名数组',excluded:['飞宫四化因宫干流转的完整推演','跨流派四化表对照','自化/飞入/飞出逐宫推断','吉凶事件预测'],note:'当引擎没有提供四化字段时显示不完整或未提供，不自行补齐。'}};
}
