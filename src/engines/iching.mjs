// 八卦各爻均按“初爻(下)→上爻”顺序存储：1阳 / 0阴。
export const TRIGRAMS = Object.freeze([
  {id:1, name:'乾', symbol:'☰', lines:[1,1,1], element:'金'},
  {id:2, name:'兑', symbol:'☱', lines:[1,1,0], element:'金'},
  {id:3, name:'离', symbol:'☲', lines:[1,0,1], element:'火'},
  {id:4, name:'震', symbol:'☳', lines:[1,0,0], element:'木'},
  {id:5, name:'巽', symbol:'☴', lines:[0,1,1], element:'木'},
  {id:6, name:'坎', symbol:'☵', lines:[0,1,0], element:'水'},
  {id:7, name:'艮', symbol:'☶', lines:[0,0,1], element:'土'},
  {id:8, name:'坤', symbol:'☷', lines:[0,0,0], element:'土'}
]);
// 上卦为行，下卦为列；名称与文王卦序。自编常量表，不复制上游代码。
const MATRIX = [
  ['乾为天#1','天泽履#10','天火同人#13','天雷无妄#25','天风姤#44','天水讼#6','天山遁#33','天地否#12'],
  ['泽天夬#43','兑为泽#58','泽火革#49','泽雷随#17','泽风大过#28','泽水困#47','泽山咸#31','泽地萃#45'],
  ['火天大有#14','火泽睽#38','离为火#30','火雷噬嗑#21','火风鼎#50','火水未济#64','火山旅#56','火地晋#35'],
  ['雷天大壮#34','雷泽归妹#54','雷火丰#55','震为雷#51','雷风恒#32','雷水解#40','雷山小过#62','雷地豫#16'],
  ['风天小畜#9','风泽中孚#61','风火家人#37','风雷益#42','巽为风#57','风水涣#59','风山渐#53','风地观#20'],
  ['水天需#5','水泽节#60','水火既济#63','水雷屯#3','水风井#48','坎为水#29','水山蹇#39','水地比#8'],
  ['山天大畜#26','山泽损#41','山火贲#22','山雷颐#27','山风蛊#18','山水蒙#4','艮为山#52','山地剥#23'],
  ['地天泰#11','地泽临#19','地火明夷#36','地雷复#24','地风升#46','地水师#7','地山谦#15','坤为地#2']
];
const same = (x,y) => x.every((n,i)=>n===y[i]);
export function hexagramFromLines(lines){
  if (!Array.isArray(lines)||lines.length!==6||lines.some(x=>x!==0 && x!==1)) throw new Error('卦象必须是由下至上排列的 6 个阴阳值 0/1');
  const lower = TRIGRAMS.find(x=>same(x.lines,lines.slice(0,3)));
  const upper = TRIGRAMS.find(x=>same(x.lines,lines.slice(3,6)));
  if(!lower||!upper) throw new Error('非法卦象');
  const [name,number] = MATRIX[upper.id-1][lower.id-1].split('#');
  return {name, kingWenNumber:Number(number), upper:{id:upper.id,name:upper.name,symbol:upper.symbol,element:upper.element}, lower:{id:lower.id,name:lower.name,symbol:lower.symbol,element:lower.element}, linesBottomUp:[...lines]};
}
export function trigramByNumber(value){
  if (!Number.isSafeInteger(value)||value <= 0) throw new Error('数字起卦仅接受正整数');
  return TRIGRAMS[(value-1)%8];
}
export function validateLineValues(values){
  if(!Array.isArray(values) || values.length!==6 || values.some(x=>!Number.isInteger(x)|| x<6 || x>9)) throw new Error('六爻必须填写 6 个数字 6/7/8/9，按照初爻到上爻顺序');
  return values;
}
export function hexagramFromYaoValues(values){
  validateLineValues(values);
  const base = values.map(x=>x%2===1?1:0);
  const transformed = values.map(x=>x===6?1:x===9?0:x%2===1?1:0);
  return {
    original:hexagramFromLines(base), changed:hexagramFromLines(transformed),
    movingLines: values.flatMap((v,i)=>(v===6||v===9)?[i+1]:[]),
    yaoBottomUp: values.map((v,i)=>({position:i+1,value:v,yinYang:v%2?'阳':'阴',moving:v===6||v===9}))
  };
}
