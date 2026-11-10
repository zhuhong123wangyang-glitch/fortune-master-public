// 仅报告地支的传统关系标签，不据此直接推断喜忌、事件或吉凶。
const LIUCHONG=[['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
const LIUHE=[['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']];
const SANHE=[['申','子','辰'],['亥','卯','未'],['寅','午','戌'],['巳','酉','丑']];
const names={clash:'六冲',combine:'六合',triple:'三合'};
const uniq=(xs)=>[...new Set(xs)];
export function detectBranchRelations(pillars){
  if(!Array.isArray(pillars)||pillars.length!==4||pillars.some(p=>typeof p.branch!=='string'))throw new Error('四柱地支信息不完整');
  const bs=pillars.map(x=>x.branch);
  const pairFind=(pairs,type)=>pairs.flatMap(([a,b])=>{
    const positionsA=bs.flatMap((v,i)=>v===a?[i]:[]), positionsB=bs.flatMap((v,i)=>v===b?[i]:[]);
    if(!positionsA.length||!positionsB.length)return [];
    return [{type,label:names[type],branches:[a,b],positions:uniq([...positionsA,...positionsB]),description:`${a}${b}${names[type]}`}];
  });
  const triples=SANHE.flatMap(group=>group.every(b=>bs.includes(b))?[{type:'triple',label:names.triple,branches:group,positions:uniq(group.flatMap(b=>bs.flatMap((v,i)=>v===b?[i]:[]))),description:`${group.join('')}${names.triple}`}]:[]);
  const repetitions=[...new Set(bs)].flatMap(b=>{
    const positions=bs.flatMap((v,i)=>v===b?[i]:[]);
    return positions.length>1?[{branch:b,count:positions.length,positions}]:[];
  });
  return {pairs:[...pairFind(LIUCHONG,'clash'),...pairFind(LIUHE,'combine')],triples,repetitions,policy:'仅检查四柱地支的六冲、六合和完整三合；不计算半合、暗合、刑害破、合化成立或整体吉凶。'};
}
