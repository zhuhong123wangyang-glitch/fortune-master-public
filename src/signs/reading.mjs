import {DISCLAIMER,SCHEMA_VERSION} from '../core/schema.mjs';
import {SIGN_CATALOG_VERSION,DEFAULT_SIGN_SYSTEM,SIGN_POLICY} from './catalog.mjs';
import {storyForSign} from '../interpretation/story.mjs';
const TOPICS={
  general:{label:'综合',focus:'辨别当前最重要的一项事实，再决定如何行动',question:'今天有什么可以通过实际行动验证的改善？'},
  career:{label:'事业',focus:'明确目标、沟通分工、审视阶段任务',question:'当前最可控的工作环节是什么？'},
  finance:{label:'财务',focus:'先核对预算、合同与风险承受能力，不依签文投资',question:'这项财务计划的最坏情形和退出条件是什么？'},
  love:{label:'感情',focus:'采用直接、尊重边界的沟通方式，不猜测他人内心',question:'有什么诉求可以向对方清楚表达？'},
  study:{label:'学业',focus:'根据实际能力与时间制定可执行学习计划',question:'哪个知识点可以通过练习获得反馈？'},
  health:{label:'健康',focus:'关注睡眠、压力和可观察的身体状况；不替代医生诊断',question:'有需要由医疗专业人士评估的症状吗？'},
  family:{label:'家庭',focus:'以同理心确认需求并合理分担责任',question:'哪一次具体交流能改善理解？'}
};
export function validateTopic(topic='general'){
  if(!Object.hasOwn(TOPICS,topic))throw new Error('主题只支持 general/career/finance/love/study/health/family');
  return topic;
}
export function topicOptions(){return Object.entries(TOPICS).map(([value,x])=>({value,label:x.label}));}
export function validateQuestion(question=''){
  if(typeof question!=='string'||question.length>500)throw new Error('问题需为 500 字以内的文字');
  return question.trim();
}
export function buildSignReading(sign,topic='general',question=''){
  const lens=TOPICS[validateTopic(topic)],q=validateQuestion(question);
  const sections=[
    {id:'sign-verse',title:'签诗与文化象意',summary:sign.theme,interpretation:sign.meaning,observations:[`第${sign.id}签 · ${sign.title}`,`签诗：${sign.lines.join(' / ')}`,`签等：${sign.grade}（文化标签）`],trace:[{path:'result.sign.lines',value:sign.lines.join(' / ')},{path:'result.sign.theme',value:sign.theme}],sourceIds:['fortune-master-original-100']},
    {id:'sign-context',title:`${lens.label}主题解签`,summary:`以「${sign.theme}」为线索，而非确定预测`,interpretation:`${sign.meaning}。针对${lens.label}，可以${lens.focus}。这只是思考提示，是否适用仍需现实信息验证。`,observations:q?[`用户本次所问：${q}`]:[`当前选择：${lens.label}`],trace:[{path:'result.sign.action',value:sign.action},{path:'input.topic',value:topic}],questions:[lens.question],sourceIds:['fortune-master-original-100']},
    {id:'sign-action',title:'今日可执行的小行动',summary:sign.action,interpretation:`选择一个低风险、可回顾的步骤：${sign.action}。不必为了贴合签文而强行改变现实安排。`,observations:[`签文主题：${sign.theme}`],trace:[{path:'result.sign.action',value:sign.action}],questions:['今天结束前，能怎样判断这一步是否完成？'],sourceIds:['fortune-master-original-100']},
    {id:'sign-boundary',title:'签等与来源说明',summary:'签等不是概率，签文不是医疗或投资建议',interpretation:'本签属于 Fortune Master 原创文化签文初稿，并非来自任何历史签本。签等是作品风格的分类，不具有科学预测效力；健康、财务、法律和人际重大决定应依据专业意见与现实证据。',observations:[`素材状态：${sign.editorialStatus}`],trace:[{path:'result.sign.sourceId',value:sign.sourceId}],sourceIds:['fortune-master-original-100']}
  ];
  return {story:storyForSign(sign,topic),version:'1.3.0',type:'rule-based-symbolic-interpretation',title:'每日一签 · 文化解读',summary:`${sign.title} · ${sign.theme}：${sign.meaning}`,sections,references:[{id:'fortune-master-original-100',title:'Fortune Master 四时百签（原创初稿）',url:'',locator:`签号 ${sign.id}`,note:'原创作品，不是古籍逐句引文；未经人工逐条文学审核'}],limitations:['签等与象意仅供文化阅读、娱乐及个人反思，不代表未来会发生什么。','不包含真实古籍签诗或未经核对的典故，后续传统签系须独立核验来源。']};
}
export function formatSignResult(record,{topic='general',question=''}={}){
  const sign=structuredClone(record.sign);
  const base={schemaVersion:SCHEMA_VERSION,application:'Fortune Master',version:'1.3.0',method:'daily-sign',
    input:{kind:record.kind,topic:validateTopic(topic),date:record.date,timezone:record.timezone,question:validateQuestion(question)},
    result:{sign,record:{id:record.id,kind:record.kind,date:record.date,timezone:record.timezone,drawnAt:record.drawnAt,favorite:!!record.favorite,systemId:record.systemId,systemVersion:record.systemVersion}},
    evidence:[{id:'fortune-master-original-100',name:'原创签文库',note:`${record.systemId}@${record.systemVersion}；签号 ${sign.id}；首次使用加密随机数抽取，后续读取历史记录`}],
    policy:{source: 'original-cultural-literature',randomness:'crypto.randomInt for initial draw only; persisted snapshot',grade:'cultural-label-not-prediction',editorial:SIGN_POLICY},
    warnings:['签文是原创文化作品初稿，未逐条人工审定，不能冒充传统灵签。', '抽签结果不具有可验证的预知能力，不作为现实决策依据。'],disclaimer:DISCLAIMER};
  base.interpretation=buildSignReading(sign,topic,question);
  return base;
}
