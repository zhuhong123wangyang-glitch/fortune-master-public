const INTENTS = [
  {method:'hepan', re:/合盘|合婚|双人命盘|双人八字|情侣配对|关系运势|人际配对/},
  {method:'daily-sign', re:/每日一签|今日一签|今日运签|抽签|求签|解签|签诗|签筒|签文|灵签|问事求签|签簿|日签/},
  {method:'bazi', re:/八字|四柱|日主|十神|大运|排命盘|生辰|子平/},
  {method:'ziwei', re:/紫微|十二宫|命宫|主星|四化|星曜/},
  {method:'liuyao', re:/六爻|铜钱|摇卦|纳甲/},
  {method:'meihua', re:/梅花|数字起卦|三数起卦/},
  {method:'huangli', re:/黄历|宜忌|择日|冲煞|节气|老黄历/}
];
export function route(query){
  if (typeof query!=='string' || !query.trim()) throw new Error('请输入问题');
  const matched = INTENTS.filter(x=>x.re.test(query));
  if(matched.length === 1) return {method:matched[0].method, confidence:'keyword', alternatives:[]};
  if(matched.length > 1) return {method:null, reason:'涉及多个术数领域，请选择一个优先执行', alternatives:matched.map(x=>x.method)};
  return {method:null, reason:'无法确定领域，请选择：每日一签 / 八字 / 紫微 / 六爻 / 梅花 / 黄历', alternatives:INTENTS.map(x=>x.method)};
}
