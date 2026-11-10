// V1.5 解读增强层：旧解释兼容，新增可审计的 advanced 结构。
import {verifiedCitation,methodReference} from '../knowledge/citations.mjs';
const item=(title,conclusion,facts,explanation,action,paths=[],citations=[])=>({title,conclusion,facts,explanation,action,paths,citations});
const sourceLiuyao=()=>methodReference({title:'六爻纳甲与八宫装卦规则',url:'https://liuyaopaipanzhanbu.com/method/',locator:'第七至九节',summary:'通行京房八宫、世应、六亲与纳甲表（现代规则说明）'});
function bazi(data){const r=data.result,p=r.patternObservation;if(!p)return null;
 const roots=p.rootSignals.sameElement.map(x=>`${x.pillar}：${x.stems.join('、')}`).join('；')||'未见同五行藏干线索';
 return {title:'八字 · 格局线索与旺衰核对',status:'partial',intro:'这次只把格局判断拆成可见证据，不输出缺乏完整规则支持的“身强/身弱”“喜用神”结论。',items:[
  item('格局候选：先看月令',p.pattern.status==='candidate'?`观察到「${p.pattern.label}」候选，尚未判定成格。`:'未形成可以确认的月令透干候选。',
  [`月支：${p.monthCommand.branch} · 本气${p.monthCommand.mainHiddenStem||'未提供'}`,`本气十神：${p.monthCommand.mainHiddenTenGod||'未提供'}`,`透干：${p.pattern.exposedAt.join('、')||'无'}`],p.pattern.description,'可进一步检查月令余气、通根、合化及格局受损条件。',['result.patternObservation.pattern','result.patternObservation.monthCommand'],[verifiedCitation('quote-dty-moon')].filter(Boolean)),
  item('日主强弱：为什么暂不下结论','目前证据不足以给出定性强弱或喜用神。',[
   `月令与日主：${p.monthCommand.seasonSignal}`,`同五行藏干根气：${roots}`],p.strength.why,'不要只凭八个可见位置的五行数量来决定颜色、职业或补救行为。',['result.patternObservation.strength','result.patternObservation.rootSignals']),
 ]};}
function liuyao(data){const x=data.result.advanced;if(!x)return null;
 const lines=x.linesBottomUp.map(v=>`${v.position}爻 ${v.ganZhi}${v.element} · ${v.relative}${v.role?' · '+v.role+'爻':''}${v.spirit?' · '+v.spirit:''}${v.moving?' · 动爻':''}`);
 return {title:'六爻 · 纳甲、六亲、世应',status:'calculated',intro:'这部分是传统装卦的结构化计算。读法先看卦属于哪一宫，再看世应，最后逐爻看干支与六亲；它不是现实吉凶判定。',items:[
  item('本卦所属八宫与世应',`${x.palace.palace}宫 · ${x.palace.stage}；世在${x.palace.shiYao}爻，应在${x.palace.yingYao}爻。`,
   [`卦宫五行：${x.palace.element}`,`变卦归属：${x.changedPalace.palace}宫（另列，不改变本卦六亲参照）`],'世爻可理解成传统推演中的“自身参照位”，应爻可理解成“所对照一方”。不是对人物心理的证明。','想学习六爻，先练习从下往上数六条爻并识别世应。',['result.advanced.palace'],[sourceLiuyao()]),
  item('六亲与逐爻干支','已按本卦卦宫五行推导六亲。',lines,'妻财、官鬼、父母、兄弟、子孙是传统相生相克的分类，不等于现实中的财富、疾病、家庭成员或利益关系。','如果未填写占日天干，六神留空；月建日辰、旬空、用神等尚未计算。',['result.advanced.linesBottomUp'],[sourceLiuyao()])
 ]};}
function ziwei(data){const x=data.result.advanced;if(!x)return null;
 const natal=x.natalTransformations.map(v=>`${v.palace} ${v.star}化${v.transformation}`).join('；');
 const trans=x.transitTransformations.flatMap(v=>v.stars.map(s=>`${({decadal:'大限',yearly:'流年',monthly:'流月',daily:'流日',hourly:'流时'})[v.scope]||v.scope} ${s.star}化${s.transformation}`));
 const life=x.lifeSurround;
 return {title:'紫微 · 生年四化与三方四正',status:x.natalComplete?'calculated':'partial',intro:'仅整理 iztro 实际返回的四化与宫位关系；没有返回的四化不会依出生年自行补编。',items:[
  item('生年四化',natal||'引擎未返回可确认的生年四化星曜。',natal?x.natalTransformations.map(v=>`${v.palace} · ${v.star} · 化${v.transformation}`):['未收到完整四化数据'],x.natalComplete?'已找到禄、权、科、忌四类标记，仍需核对采用的流派与计算配置。':'当前数据不完整：不能据此认定没有某一化，也不会推断对应星名。','把四化理解成传统关注主题标签，不用于评判真实吉凶。',['result.advanced.natalTransformations'],[methodReference({title:'iztro 四化数据类型',url:'https://docs.iztro.com/type-definition',locator:'Mutagen 与 Star 定义'})]),
  item('命宫三方四正',life?`命宫${life.main.earthlyBranch} · 对宫${life.opposite?.name} · 三方${life.triads.map(x=>x.name).join('、')}`:'缺少命宫方位信息。',life?[`命宫：${life.main.palace}`,`对宫：${life.opposite?.name||'—'}`,...life.triads.map(p=>`三合：${p.name}`)]:['十二宫不全或未建立关系'],life?.note||'本次未提供足够方位信息。','对照事业、资源、迁移等相关宫位一起看，不依据一颗星下结论。',['result.advanced.lifeSurround']),
  item('运限四化摘要',trans.length?trans.join('；'):'所选日期没有返回可呈现的运限四化数组。',trans.length?trans:['未提供完整的四颗星数组'], '大限和流年是传统时间标签；这里不将其解释成具体事件、吉凶概率。','若要深入比较流年，先核对所选日期、时辰和流派一致。',['result.advanced.transitTransformations'],[methodReference({title:'iztro 运限查询文档',url:'https://docs.iztro.com/posts/horoscope',locator:'大限、流年与四化'})])
 ]};}
function hepan(data){const x=data.result.crossChart;if(!x)return null;
 const matches=x.crossRelations.slice(0,16).map(v=>`${v.aTitle}${v.aBranch} × ${v.bTitle}${v.bBranch}：${v.relation}`);
 return {title:'双人合盘 · 四柱全局关系对照',status:'calculated',intro:'把双方四柱的地支成对对照，不把“合”视为现实相爱，也不把“冲”视为现实矛盾。',items:[
 item('四柱并排',x.matchingPillars.map(v=>`${v.label}：${v.a} / ${v.b}`).join('；'),x.matchingPillars.map(v=>`${v.label}：甲方${v.a}，乙方${v.b}`),'四柱是传统时间标签；仅用这些干支标记不能推断双方的信任、忠诚度或未来。','有关系议题时，优先明确各自的感受、需求与边界。',['result.crossChart.matchingPillars']),
 item('跨盘地支关系',matches.length?`识别 ${matches.length} 条相同 / 六合 / 六冲结构标签。`:'本次没有识别同支、六合或六冲标签。',matches.length?matches:['未出现本模块所涵盖的组合'],x.note,'核对双方实际沟通与合作经历，不计“合冲总分”。',['result.crossChart.crossRelations'])
 ]};}
export function addAdvancedInterpretation(data,interpretation){
 if(!interpretation)return interpretation;
 const advanced=({bazi,liuyao,ziwei,hepan})[data.method]?.(data)||null;
 return advanced?{...interpretation,advanced,version:'1.5.0'}:interpretation;
}
