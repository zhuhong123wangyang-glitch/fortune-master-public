import {randomInt} from 'node:crypto';
import {standardResult} from '../core/schema.mjs';
import {hexagramFromYaoValues} from './iching.mjs';
import {decorateLiuyao} from './liuyao-najia.mjs';
export function castLiuyao({lines, question='', coins, dayStem}={}) {
  if(typeof question!=='string'||question.length>500) throw new Error('问题长度不能超过 500 字');
  if(lines!==undefined && coins!==undefined) throw new Error('六爻不可同时指定 --lines 和 --coins');
  let observations=[]; let method='random-coins'; let values;
  if(lines!==undefined){
    if (!Array.isArray(lines)||lines.length!==6) throw new Error('六爻必须提供六个数字');
    values=lines.map(Number); method='provided-lines';
  } else {
    const rounds = coins===undefined?Array.from({length:6},()=>Array.from({length:3},()=>randomInt(0,2)?'H':'T').join('')):coins;
    if(!Array.isArray(rounds)||rounds.length!==6 || rounds.some(x=>typeof x!=='string'|| !/^[HT]{3}$/.test(x))) throw new Error('coins 必须是 6 组 H/T 三枚铜钱，如 HHT,TTT,HHH,HTT,HHT,THT');
    observations=rounds;
    // Heads=3, Tails=2; 6老阴、7少阳、8少阴、9老阳。
    values=rounds.map(x=>[...x].reduce((s,c)=>s+(c==='H'?3:2),0));
    method=coins===undefined?'crypto-random':'provided-coins';
  }
  const result=hexagramFromYaoValues(values);
  result.advanced=decorateLiuyao(result,{dayStem});
  return standardResult('liuyao',{question,linesBottomUp:values,coinsBottomUp:observations,casting:method,dayStem:dayStem||null},result,{
    policy:{lineOrder:'初爻→上爻',head:3,tail:2,oldYin:6,youngYang:7,youngYin:8,oldYang:9},
    evidence:[{type:'algorithm',id:'three-coin-basic-hexagram',note:'三钱起卦、京房八宫、通行纳甲、六亲、世应；六神必须显式提供占日天干；未实现完整断卦'}],
    warnings:['六爻已提供装卦结构，但未实现日辰月建、旬空伏神、用神旺衰或断卦应期；不得直接预测现实事件。']
  });
}
