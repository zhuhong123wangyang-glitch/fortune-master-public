// Fortune Master V1.3.2 — 面向零基础读者的“解曰、行动建议、四个生活主题、来源”结构。
// 只读取已经产生的命盘、卦象、原创签文；不把传统象意转换成未来事件或成功率。
import {hexagramEntry} from '../knowledge/catalog.mjs';

const FOUR = ['事业','财运','感情','健康'];
const GROUPS = [
  {terms:'开端 行动 希望 机会 开路 探索 复苏 转机 更新 革新 转晴 建设',
   tips:['想推进工作，可以从一个可在今天完成的任务开始，先获得真实反馈。','面对新的收入或支出机会，先核算成本与风险，不急着投入大额资金。','想改善关系，可以先主动表达一个具体的想法，同时尊重对方意愿。','选择一种容易坚持的小习惯，先从规律作息或适量运动开始。']},
  {terms:'谨慎 审势 审慎 避险 防护 控制 警醒 辨别 甄选 细察 明晰 清醒',
   tips:['重要工作先核实条件、责任与截止时间，再决定要不要承诺。','核对账单、合同和资金安排，暂缓信息不足的高风险决定。','不要急着猜测对方想法，先问清事实并听完解释。','若有身体不适应依据实际症状就医，不用签文或卦象判断病情。']},
  {terms:'协作 合作 配合 互助 互惠 连接 理解 倾听 表达 感恩 善意 协调 圆融',
   tips:['把团队目标和分工讲清楚，减少“以为彼此都懂”的误会。','与人有资金往来时，把责任、金额与约定写清楚。','试着先倾听，再说清自己的感受和边界。','若作息受人际事务影响，留出休息和自我照顾的时间。']},
  {terms:'休整 留白 安定 平衡 节律 照顾 放下 守成 定盘 定力 沉静 等待',
   tips:['不必同时推进所有事情，挑最重要的一项保持稳定节奏。','优先保证必要支出和应急储备，不因一时情绪改变预算。','关系中给双方留出空间，有话可以约个合适时间再聊。','关注睡眠、运动和压力，必要时向专业人士寻求帮助。']},
  {terms:'学习 养成 积累 成长 方法 根基 追根 温故 格局 价值 请教 完整 笃行 韧性 坚持',
   tips:['选一项关键技能持续练习，记录每周一次的可见进步。','先建立稳定的储蓄与消费记录，别把积累误解成会突然发财。','比起一次漂亮表达，更值得关注持续、可信的实际行动。','建立可执行的日常习惯，不以签文代替体检或医疗建议。']},
  {terms:'取舍 选择 方向 定位 视野 独立 原则 边界 自知 简化 顺势 适应',
   tips:['明确优先级：哪些事必须做，哪些可以暂缓或交给别人。','做财务选择前写下预算上限和最坏情况，再比较方案。','说清自己的期待，也问问对方真正重视的是什么。','根据实际精力调整节奏，避免为了完成计划而持续透支。']},
  {terms:'修补 归整 校准 反思 转化 整顿 建设 防护',
   tips:['回头检查一个长期卡点，先修复具体问题而不是全面推倒。','复核一笔旧账或一项固定开支，看有没有可以改善的地方。','发现误会时先澄清一次事实，再讨论怎么相处。','回顾影响睡眠、压力或运动的习惯，做一个可验证的小调整。']}
];
const fallbackTips=[
  '结合眼前任务核对事实，选一个小步骤推进，别把文化象意当作结果保证。',
  '先看现金流、合同和风险承受能力，不依照签文或卦象进行交易。',
  '尊重双方感受和边界，重要问题以直接沟通为准。',
  '注意作息与现实身体状况；有症状请咨询医生。'
];
function selectTips(theme=''){
  const group=GROUPS.find(g=>g.terms.split(' ').some(t=>theme.includes(t)));
  return group?.tips||fallbackTips;
}
function topicsFrom(theme){return FOUR.map((name,i)=>({name,text:selectTips(theme)[i]}));}
function statement(value){return String(value??'').trim();}
function common({label,number='',title,grade='',lines=[],meaning,action,topics,sourceTitle,sourceNote,tags=[]}){
  return {version:'1.3.2',label,number,title,grade,lines,meaning,action,topics,
    source:{title:sourceTitle,note:sourceNote},tags,disclaimer:'本页是传统术数与原创文化签文的通俗解释，不代表未来事实或成功概率。'};
}
export function storyForSign(sign,topic='general'){
  const theme=statement(sign.theme)||'今日观察';
  const named={general:'综合',career:'事业',finance:'财务',love:'感情',study:'学业',health:'健康',family:'家庭'}[topic]||'综合';
  return common({label:'四时百签 · 签文解读',number:`第 ${String(sign.id).padStart(3,'0')} 签`,title:sign.title,grade:`${sign.grade} · 文化标签`,lines:sign.lines,
    meaning:`这支签以「${theme}」为主题。${sign.meaning} 换成大白话：不用猜事情一定会怎样，重点是看清目前可以处理的部分。`,
    action:`${sign.action}（本次关注：${named}；按真实情况选择是否适用。）`,
    topics:topicsFrom(theme),sourceTitle:'创作意象 · 非历史典故',
    sourceNote:`「${sign.title}」是本项目原创签诗的意象，围绕「${theme}」展开，尚未逐条人工文学审核；没有经过核验的古籍出处，不会冒称传统签本或历史故事。`,tags:[theme,'四时百签','原创作品']});
}
const themeOf=g=>hexagramEntry(g?.kingWenNumber)?.theme||'观察事物的条件与变化';
const actionOf=g=>hexagramEntry(g?.kingWenNumber)?.reflection||'先核实具体条件，再确定下一步';
function questionTopic(question=''){
  if(/健康|病|医疗|手术|身体/.test(question))return '健康';
  if(/工作|职业|项目|面试|升职|事业|跳槽/.test(question))return '事业';
  if(/财|资金|股票|投资|买房|贷款/.test(question))return '财运';
  if(/恋爱|关系|婚姻|伴侣|分手|感情/.test(question))return '感情';
  return '';
}
export function storyForHex(data){
  const r=data.result,mei=data.method==='meihua',q=statement(data.input?.question),orig=r.original,changed=r.changed,theme=themeOf(orig),next=themeOf(changed);
  const mid=mei?`中间还有「${r.mutual?.name}」，可借它提醒自己检查过程中的「${themeOf(r.mutual)}」。`:'';
  const motion=(r.movingLines||[]).length?`这次第 ${r.movingLines.join('、')} 爻标记为变化（从最下面开始数）。`:'这次没有动爻，不表示现实事情不会变化。';
  const qLabel=questionTopic(q);
  const a=`${actionOf(orig)}。${q?'针对你提出的问题，先列出能够确认的事实与约束，再决定下一步。':'把它用作一个思考提醒即可。'}`;
  return common({label:mei?'梅花易数 · 白话解卦':'六爻起卦 · 白话解卦',number:mei?'本卦 · 互卦 · 变卦':'本卦 · 动爻 · 变卦',
    title:`${orig.name} → ${changed.name}`,grade:'文化象意 · 非吉凶预测',
    lines:[`本卦「${orig.name}」：${theme}`,mei?`互卦「${r.mutual.name}」：${themeOf(r.mutual)}`:motion,`变卦「${changed.name}」：${next}`],
    meaning:`先用「${theme}」理解当前要思考的主题。${mid}${motion}变卦的「${next}」是另一种观察角度，而不是已经确定的未来结果。${q?`你问的是「${q}」，可以对照现实条件来理解。`:''}`,
    action:a,topics:topicsFrom(`${theme} ${next}`).map(t=>({...t,highlight:t.name===qLabel})),
    sourceTitle:'卦象出处与解释口径',sourceNote:`卦名及六十四卦编号对应《周易》系统；本卦为「${orig.name}」（第${orig.kingWenNumber}卦），变卦为「${changed.name}」（第${changed.kingWenNumber}卦）。以上文字是本项目的现代白话整理，不是对古籍卦辞或爻辞的逐字引用。${mei?'三数起卦采用项目明确规定的取余算法，不代表所有梅花流派。':'本版新增京房八宫、纳甲、世应及六亲结构化装卦；仍未完整实现月建日辰、旬空、用神和应期等严格断卦。'}`,
    tags:[theme,next,mei?'三数起卦':'动爻']});
}
function palaceName(p){return statement(p?.name).replace(/宫$/,'');}
function findPalace(ps,names){return ps.find(p=>names.includes(palaceName(p)));}
const STAR_SYMBOL={紫微:'统筹和责任',天机:'思考与变化',太阳:'表达和承担',武曲:'执行与资源意识',天同:'协调和温和',廉贞:'原则与边界',天府:'稳健与储备',太阴:'细致与积累',贪狼:'兴趣与社交',巨门:'沟通与辨析',天相:'配合与秩序',天梁:'照护与经验',七杀:'决断与突破',破军:'调整与重建'};
function describePalace(p){if(!p)return '这张命盘暂未提供对应宫位，无法做具体解释。';const stars=(p.majorStars||[]).map(s=>s.name).filter(Boolean);return `${p.name}在${p.earthlyBranch||'未注明位置'}位，${stars.length?'主要标记为'+stars.join('、')+'（传统上分别联想到'+stars.map(x=>STAR_SYMBOL[x]||'某种文化象征').join('、')+'）':'没有十四主星（俗称空宫）'}。这是传统符号，不代表现实情况已被验证。`;}
export function storyForZiwei(data){
  const ps=data.result.palaces||[],life=findPalace(ps,['命']),career=findPalace(ps,['官禄','事业']),money=findPalace(ps,['财帛']),love=findPalace(ps,['夫妻']),health=findPalace(ps,['疾厄']);
  return common({label:'紫微斗数 · 白话命盘',number:'十二宫 · 生活主题',title:'先看自己，再看工作、财务与关系',grade:'基于本次命盘 · 传统解释',
    lines:[`命宫：${life?`${life.earthlyBranch} · ${(life.majorStars||[]).map(s=>s.name).join('、')||'无十四主星'}`:'未识别'}`,'把十二宫看作十二个生活主题，不需要先记住星曜术语。'],
    meaning:`命宫可以理解为“自我与做事方式”这个栏目。${describePalace(life)} 官禄宫主要讨论工作，财帛宫讨论资源安排；它们不能单独证明一个人的性格、财运或未来事件。`,
    action:'先挑一项你正在关心的生活主题，读对应宫位；写下实际经历和目前的选择，再把星曜象意当作反思材料。',
    topics:[
      {name:'事业',text:`工作栏目：${describePalace(career)} 可以回顾自己在工作中更需要培养哪种能力。`},
      {name:'财运',text:`资源栏目：${describePalace(money)} 真正的财务安排仍需预算、现金流和风险评估。`},
      {name:'感情',text:`关系栏目：${describePalace(love)} 现实相处以相互沟通和尊重为准。`},
      {name:'健康',text:`身心关注栏目：${describePalace(health)} 疾厄宫不是体检报告，不可用来预测疾病。`}
    ],sourceTitle:'十二宫与主星的来源',sourceNote:'本次宫位和星曜来自 iztro 计算结果；解释依据为紫微斗数传统宫位象征的现代整理，并非经验证的人格或命运预测。暂未逐句核验古籍对应文句，不提供虚构典故。',tags:['十二宫','命宫','主星']});
}
export function storyForHepan(data){
  const r=data.result,[a,b]=r.people;
  const types={love:'感情合盘 · 相处沟通',social:'人际合盘 · 合作交往',fortune:'运势合盘 · 年度节奏'};
  const topic={love:'亲密关系中的沟通、边界和真实期待',social:'朋友或同事之间的信任、分工与协作方式',fortune:'两人当前时间安排与需要协调的现实计划'}[r.mode];
  const steps={love:'安排一次不被打断的对话，各自表达需要、冲突处理方式和底线。',social:'先做一项小范围合作，明确分工并记录反馈，不单凭命盘定义对方。',fortune:'把两人的真实日程与资源约束摆在一起，讨论可调整的时间安排。'};
  const active=x=>x.activeCycle?`${x.activeCycle.ganZhi}（${x.activeCycle.startYear}—${x.activeCycle.endYear}）`:'未显示大运';
  return common({label:types[r.mode],number:`${a.label} × ${b.label}`,title:'双人命盘 · 五步看懂',grade:'传统象意 · 不打分',
    lines:[`${a.label}：${a.pillars[2].ganZhi}（日主${a.dayElement}）`,`${b.label}：${b.pillars[2].ganZhi}（日主${b.dayElement}）`,`日主：${r.dayElements.name} · 日支：${r.dayBranch.name}`],
    meaning:`这份合盘对照双方的日干五行、日支和传统大运，围绕「${topic}」提供一个讨论框架。${r.dayElements.description}${r.dayBranch.description} 不能证明两人的情绪、忠诚度、适配度或未来。`,
    action:steps[r.mode],
    topics:[
      {name:'感情',text:'看双方真实表达、相互尊重与冲突解决方式，不把六合/六冲当作婚恋结论。',highlight:r.mode==='love'},
      {name:'人际',text:'先确认共同目标、约定和信任的实际表现，不凭星命符号评价他人。',highlight:r.mode==='social'},
      {name:'运势节奏',text:`以 ${r.referenceYear} 年为参考：${a.label} ${active(a)}；${b.label} ${active(b)}。这只是传统年份标签。`,highlight:r.mode==='fortune'},
      {name:'行动建议',text:'写下两个具体需求，明确一个可验证的共同计划，约定何时复盘。'}
    ],sourceTitle:'计算依据与文化解释',sourceNote:'双人的四柱分别使用 lunar-typescript 计算；日主五行与日支关系来自明示规则。解释为现代整理而非古籍逐字引用，不提供相配概率、婚期或财务预测。',tags:['双人四柱','日支对照','独立大运']});
}
export function addStoryReading(data,interpretation){
  if(!interpretation)return interpretation;
  const story=data.method==='hepan'?storyForHepan(data):data.method==='ziwei'?storyForZiwei(data):['liuyao','meihua'].includes(data.method)?storyForHex(data):null;
  return story?{...interpretation,story}:interpretation;
}
