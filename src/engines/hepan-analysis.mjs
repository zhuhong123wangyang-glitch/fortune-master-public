// 两人全部四柱信息并列观察；跨盘组合只列有明确规则的结构标签。
const HE=['子丑','寅亥','卯戌','辰酉','巳申','午未'];
const CHONG=['子午','丑未','寅申','卯酉','辰戌','巳亥'];
const BRANCH_EL={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const KEYS=['year','month','day','time'];
const NAMES=['年柱','月柱','日柱','时柱'];
export function compareFourPillars(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==4||b.length!==4)throw Error('完整双人四柱才能对照');
 const matched=[];
 for(let i=0;i<4;i++)for(let j=0;j<4;j++){
  const x=a[i].branch,y=b[j].branch,pair=x+y;
  if(!BRANCH_EL[x]||!BRANCH_EL[y])throw Error('双人地支信息异常');
  const same=x===y;
  const combine=HE.some(v=>v.includes(x)&&v.includes(y));
  const clash=CHONG.some(v=>v.includes(x)&&v.includes(y));
  const relation=same?'相同':combine?'六合':clash?'六冲':null;
  if(relation)matched.push({aPillar:KEYS[i],bPillar:KEYS[j],aTitle:NAMES[i],bTitle:NAMES[j],aBranch:x,bBranch:y,relation,description:`甲方${NAMES[i]}${x} 与乙方${NAMES[j]}${y}：${relation}（传统结构标记，不能推断现实关系）。`});
 }
 return {crossRelations:matched,matchingPillars:KEYS.map((key,i)=>({key,label:NAMES[i],a:a[i].ganZhi,b:b[i].ganZhi})),observationScope:'4×4 地支同支/六合/六冲对照',notIncluded:['暗合、刑害破及合化成局','神煞合婚、婚期、匹配分数','双方人格、忠诚度或关系未来推断'],note:'跨盘关系标签允许有多个同时存在，不能统计“合多必好”“冲多必坏”。'};
}
