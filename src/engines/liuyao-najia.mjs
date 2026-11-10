// 京房八宫 / 纳甲 / 六亲 / 世应 / 可选按日干六神。
// 自下而上初爻→上爻；不自动断应期、用神、伏神、旬空。
import {TRIGRAMS,hexagramFromLines} from './iching.mjs';
const NAJIA={
 乾:{inside:['甲子','甲寅','甲辰'],outside:['壬午','壬申','壬戌']},
  坤:{inside:['乙未','乙巳','乙卯'],outside:['癸丑','癸亥','癸酉']},
  震:{inside:['庚子','庚寅','庚辰'],outside:['庚午','庚申','庚戌']},
  巽:{inside:['辛丑','辛亥','辛酉'],outside:['辛未','辛巳','辛卯']},
  坎:{inside:['戊寅','戊辰','戊午'],outside:['戊申','戊戌','戊子']},
  离:{inside:['己卯','己丑','己亥'],outside:['己酉','己未','己巳']},
  艮:{inside:['丙辰','丙午','丙申'],outside:['丙戌','丙子','丙寅']},
  兑:{inside:['丁巳','丁卯','丁丑'],outside:['丁亥','丁酉','丁未']}
};
const BRANCH_EL={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const GENERATES={木:'火',火:'土',土:'金',金:'水',水:'木'};
const CONTROLS={木:'土',土:'水',水:'火',火:'金',金:'木'};
const SPIRITS=['青龙','朱雀','勾陈','螣蛇','白虎','玄武'];
const INITIAL={甲:0,乙:0,丙:1,丁:1,戊:2,己:3,庚:4,辛:4,壬:5,癸:5};
const STAGES=['本宫','一世','二世','三世','四世','五世','游魂','归魂'];
const SHI=[6,1,2,3,4,5,4,3];
const CODE=ls=>ls.join('');
function buildPalaces(){
 const map=new Map();
 for(const tri of TRIGRAMS){
   let lines=[...tri.lines,...tri.lines];
   for(let i=0;i<8;i++){
     if(i>=1&&i<=5)lines[i-1]=1-lines[i-1];
     else if(i===6)lines[3]=1-lines[3];
     else if(i===7)for(let j=0;j<3;j++)lines[j]=1-lines[j];
     const key=CODE(lines);
     if(map.has(key))throw Error('八宫映射重复，程序排盘表错误');
     const shi=SHI[i];map.set(key,{palace:tri.name,element:tri.element,stage:STAGES[i],stageIndex:i,shiYao:shi,yingYao:((shi+2)%6)+1});
   }
 }
 if(map.size!==64)throw Error('八宫映射不完整');
 return map;
}
const PALACES=buildPalaces();
export const allEightPalaceKeys=()=>[...PALACES.keys()];
export function eightPalaceFor(lines){const item=PALACES.get(CODE(lines));if(!item)throw Error('找不到此卦的八宫归属');return {...item};}
export function relativeOf(palaceElement,branchElement){
 if(palaceElement===branchElement)return '兄弟';
 if(GENERATES[branchElement]===palaceElement)return '父母';
 if(GENERATES[palaceElement]===branchElement)return '子孙';
 if(CONTROLS[palaceElement]===branchElement)return '妻财';
 if(CONTROLS[branchElement]===palaceElement)return '官鬼';
 throw Error('无法对照六亲五行');
}
function decorateLines(hex,palaceElement,dayStem){
 const labels=[...NAJIA[hex.lower.name].inside,...NAJIA[hex.upper.name].outside];
 return labels.map((ganZhi,i)=>{
  const branch=ganZhi[1],element=BRANCH_EL[branch];
  return {position:i+1,yinYang:hex.linesBottomUp[i]?'阳':'阴',ganZhi,branch,element,relative:relativeOf(palaceElement,element),spirit:dayStem?SPIRITS[(INITIAL[dayStem]+i)%6]:null};
 });
}
export function decorateLiuyao(result,{dayStem}={}){
 if(dayStem!==undefined&&dayStem!==''&&!Object.hasOwn(INITIAL,dayStem))throw Error('六神排布的日干仅接受甲乙丙丁戊己庚辛壬癸');
 if(!result?.original?.linesBottomUp||!result?.changed?.linesBottomUp)throw Error('六爻高级装卦需要本卦及变卦六爻');
 const main=eightPalaceFor(result.original.linesBottomUp),changed=eightPalaceFor(result.changed.linesBottomUp),palaceEl=main.element;
 const source=decorateLines(result.original,palaceEl,dayStem),target=decorateLines(result.changed,palaceEl,dayStem);
 const lines=source.map((x,i)=>({...x,role:i+1===main.shiYao?'世':i+1===main.yingYao?'应':null,moving:result.movingLines.includes(i+1),changedGanZhi:target[i].ganZhi,changedRelative:target[i].relative}));
 return {palace:main,changedPalace:changed,linesBottomUp:lines,dayStem:dayStem||null,sixSpiritsAvailable:Boolean(dayStem),rules:{name:'京房八宫·通行纳甲表',lineOrder:'初爻向上爻',sixRelativeReference:'本卦所属卦宫的五行（含变爻六亲）',sixSpiritsReference:dayStem?'按用户提供的占日天干':'未提供占日天干，六神不计算',method:'不包含日辰/月建、旬空、伏神、用神、应期、综合吉凶'},referenceUrls:['https://qiyi.site/knowledge/01_基础理论/纳甲装卦法.html','https://liuyaopaipanzhanbu.com/method/']};
}
