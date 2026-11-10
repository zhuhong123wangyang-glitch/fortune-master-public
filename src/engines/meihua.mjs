import {standardResult} from '../core/schema.mjs';
import {hexagramFromLines,trigramByNumber} from './iching.mjs';
export function castMeihua({numbers,question=''}={}){
  if(typeof question!=='string'||question.length>500)throw new Error('问题长度不能超过 500 字');
  if(!Array.isArray(numbers)||numbers.length!==3||numbers.some(x=>!Number.isSafeInteger(x)||x<=0)) throw new Error('梅花数字起卦需提供三个正整数（上卦、下卦、动爻）');
  const [a,b,c]=numbers;
  const upper=trigramByNumber(((a-1)%8)+1),lower=trigramByNumber(((b-1)%8)+1),movingLine=((c-1)%6)+1;
  const lines=[...lower.lines,...upper.lines]; const changed=[...lines]; changed[movingLine-1]=1-changed[movingLine-1];
  const mutualLines=[lines[1],lines[2],lines[3],lines[2],lines[3],lines[4]];
  return standardResult('meihua',{question,numbers}, {
    original:hexagramFromLines(lines),changed:hexagramFromLines(changed),mutual:hexagramFromLines(mutualLines),movingLines:[movingLine],
    bodyUse:{body:movingLine<=3?'上卦':'下卦',use:movingLine<=3?'下卦':'上卦',note:'按动爻所在之卦为用、另一卦为体的 V1 约定；暂不做五行生克断事'}
  },{
    policy:{method:'三数字起卦',upperTrigram:'数字1 % 8，余0按8',lowerTrigram:'数字2 % 8，余0按8',movingLine:'数字3 % 6，余0按6',lineOrder:'初爻→上爻'},
    evidence:[{type:'algorithm',id:'meihua-three-numbers-v1',note:'支持数字起卦、本卦、变卦和体用标记，不含时间起卦与自动吉凶断语'}],
    warnings:['梅花易数不同传承起卦口径可能不同，本版使用明确的三数规则。']
  });
}
