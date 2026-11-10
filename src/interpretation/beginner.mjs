// V1.3.1: 零基础解释层。仅将已经算出的盘面事实翻译成通俗中文；
// 不把传统术数比喻当成对现实的确定性预测，也不让 LLM 虚构缺失的排盘数据。
import {hexagramEntry} from '../knowledge/catalog.mjs';

const term=(name,meaning)=>({name,meaning});
const commonTerms={
  original:term('本卦','起卦后最初得到的卦，可以理解为“当前问题的主题卡片”，不是现实情况的证明。'),
  changed:term('变卦','把动爻的阴阳翻转后得到的卦，用作观察变化的另一种角度，不等于未来必然发生。'),
  moving:term('动爻','六条横线中被标记为“发生变化”的位置，按照从下到上的顺序数。'),
  mutual:term('互卦','从本卦中间四条爻重新组合得到的卦，传统上用来联想事情的中间环节。'),
  bodyUse:term('体 / 用','“体”代表关注的主体，“用”代表所面对的外部条件；用于传统的五行关系比喻。'),
  palace:term('十二宫','紫微命盘把生活主题分为十二个栏目，比如自己、工作、财务、关系等，并非真实的人生分区。'),
  stars:term('主星','紫微斗数中的象征标签，可以联想某类行事风格，但不能单独判定一个人的性格或命运。'),
  bodyPalace:term('身宫','紫微盘中另一个重点观察位置，是传统命理符号，并不代表人的身体健康情况。'),
  four:term('四化','星曜的化禄、化权、化科、化忌等传统变化标记，不对应真实的得失概率。'),
  opposite:term('三方四正','解读某个宫位时，同时参照相关宫位与对宫的一种看盘方法，类似把关联栏目放在一起看。'),
  decadal:term('大限','紫微体系里按年龄段划分的传统观察周期，不是该年龄必然发生的事件。')
};
const guaTheme=g=>hexagramEntry(g?.kingWenNumber)?.theme||'留意条件与变化';
const guaAdvice=g=>hexagramEntry(g?.kingWenNumber)?.reflection||'先核对现实条件，再选择可验证的下一步';
const plainFocus=q=>{
  if(/健康|疾病|患病|生病|病情|治好|病|治疗|手术|身体|寿命/.test(q))return '先以实际检查和医生意见为依据；卦象不能判断疾病或治疗结果。';
  if(/投资|股票|买房|贷款|资金|财务|赚钱|理财/.test(q))return '先列清收益、成本与最坏损失，不根据卦象买卖或借贷。';
  if(/感情|婚姻|恋爱|伴侣|分手/.test(q))return '先与当事人沟通事实和感受，不能靠卦象猜对方想法。';
  if(/考试|学习|课程|学业/.test(q))return '把学习目标拆成计划，利用测验和反馈检验进展。';
  if(/工作|事业|合作|项目|跳槽|面试/.test(q))return '先确认目标、资源、时间和关键责任人。';
  return '先写出你能核实的事实，再挑一个风险较低的小动作试试看。';
};
const palaceKinds={
  命:{topic:'看待自己与做事方式',ex:'比如遇到新项目时，习惯先规划、先沟通，还是边做边调整？'},
  兄弟:{topic:'同辈、手足与合作支持',ex:'比如需要帮忙时，身边哪些人能一起分工？'},
  夫妻:{topic:'伴侣关系与亲密沟通',ex:'比如重要决定会不会提前沟通需求和边界？'},
  子女:{topic:'照护、教育与下一代议题',ex:'比如和孩子或晚辈相处时，如何安排支持与规则？'},
  财帛:{topic:'钱财与日常资源管理',ex:'比如收支预算、技能变现和风险预留是否清楚？'},
  疾厄:{topic:'生活节奏与健康关注',ex:'比如睡眠、运动、压力管理是否需要更有规律？这不是疾病诊断。'},
  迁移:{topic:'外出、迁居与环境变化',ex:'比如换城市或工作环境前，是否确认适应成本？'},
  交友:{topic:'朋友、同事与人际协作',ex:'比如合作前，是否讲清彼此的责任和期待？'},
  仆役:{topic:'朋友、同事与人际协作',ex:'比如团队工作时，如何选择可靠的伙伴？'},
  官禄:{topic:'工作角色、职责与事业规划',ex:'比如岗位更需要专业钻研、协调沟通还是统筹管理？'},
  事业:{topic:'工作角色、职责与事业规划',ex:'比如工作中哪些能力需要持续培养？'},
  田宅:{topic:'居住空间与家庭资源',ex:'比如居家环境、搬迁计划或家庭预算如何协调？'},
  福德:{topic:'休息、兴趣与内在感受',ex:'比如忙碌之后，能不能留出恢复精力的时间？'},
  父母:{topic:'长辈、家庭支持与早期环境',ex:'比如家庭期待、沟通方式和相互支持是否平衡？'}
};
const starPlain={
  紫微:'传统上联想到统筹、主导和责任',天机:'联想到思考、变化与应变',太阳:'联想到表达、公开和付出',
  武曲:'联想到执行、管理和资源意识',天同:'联想到温和、协调与舒适',廉贞:'联想到边界、原则和取舍',
  天府:'联想到储备、稳健和管理',太阴:'联想到细致、照顾和积累',贪狼:'联想到兴趣、社交与尝试',
  巨门:'联想到语言、讨论和辨析',天相:'联想到配合、秩序和支持',天梁:'联想到照护、经验和责任',
  七杀:'联想到决断、突破和压力',破军:'联想到调整、改变和重建'
};
const ziweiName=p=>String(p?.name||'').replace(/宫$/,'').replace(/仆役/,'交友');
function palaceText(p){
  const key=ziweiName(p);const item=palaceKinds[key]||{topic:'这个宫位所对应的生活主题',ex:'比如先把现状、资源和待解决的问题写清楚。'};
  const names=(p.majorStars||[]).map(x=>x.name).filter(Boolean);
  const named=names.length?`这张盘的${p.name}出现 ${names.join('、')}。`:`这张盘的${p.name}没有十四主星（俗称“空宫”），并不是不好，也不是没有内容。`;
  const stars=names.slice(0,3).map(name=>`${name}：${starPlain[name]||'一种传统象征标签'}`).join('；');
  return {
    oneLine:`${p.name}主要讨论“${item.topic}”。${named}`,
    example:item.ex,
    action:`可以把“${item.topic}”当作自我回顾的题目；${names.length?'先理解星曜象征，再对照真实经历':'若想深入，需一并看对宫及相关宫位'}，不要据此直接断定吉凶。`,
    terminology:stars||'空宫：本宫没有十四主星，仍可参考对宫与三方。'
  };
}
function lineMeaning(n){return ['刚起步','内部配合','开始出现转折','与外界接触','做关键判断','收尾或准备转入下一阶段'][n-1]||'一个变化位置';}
function liuyaoBeginner(d){
  const r=d.result,m=r.movingLines,theme=guaTheme(r.original),after=guaTheme(r.changed);
  const movement=m.length?`变化线在第 ${m.join('、')} 爻（从下往上数），可用来提醒关注${m.map(lineMeaning).join('、')}。`:'这次没有动爻，先从整体卦意出发思考，不代表事情不会变。';
  return {
    headline:`这次抽到「${r.original.name}」，关键词是「${theme}」。`,
    explanation:`把它当成一张讨论问题的主题卡：先看眼前需留意「${theme}」；${movement} 换一个角度看，变卦「${r.changed.name}」强调「${after}」。`,
    example:`例如你在思考一个选择：先列出目前已知的信息，再想想哪些环节最容易变化，最后用“${after}”作为第二个检查方向。`,
    actions:[guaAdvice(r.original),plainFocus(d.input.question||''),'把需要确认的一件事写下来，向相关人或可靠来源核实。'],
    steps:[`本卦「${r.original.name}」：目前要讨论的主题「${theme}」。`,m.length?`动爻第 ${m.join('、')} 爻：特别留意${m.map(lineMeaning).join('、')}。`:'没有动爻：这次不做局部变化标记。',`变卦「${r.changed.name}」：对变化再做一次「${after}」的反思。`],
    glossary:[commonTerms.original,commonTerms.moving,commonTerms.changed],
    caution:'这是基于基础卦象的传统文化解释，已纳入纳甲、六亲、世应的基础装卦，但未纳入月建、日辰、旬空、用神等完整断卦规则。'
  };
}
function meihuaBeginner(d){
  const r=d.result;const bodyTop=r.bodyUse.body==='上卦';
  const body=bodyTop?r.original.upper:r.original.lower,use=bodyTop?r.original.lower:r.original.upper;
  const produces={木:'火',火:'土',土:'金',金:'水',水:'木'},controls={木:'土',土:'水',水:'火',火:'金',金:'木'};
  let relation,plain;
  if(body.element===use.element){relation='体用比和';plain='双方的属性相近，可以想成做事节奏容易相似，但仍需核对实际条件。';}
  else if(produces[use.element]===body.element){relation='用生体';plain='传统上比作外界给你提供支持，可借此检查有哪些资源和帮助。';}
  else if(produces[body.element]===use.element){relation='体生用';plain='传统上比作你向外投入精力，可借此检查时间、金钱和体力是否够用。';}
  else if(controls[body.element]===use.element){relation='体克用';plain='传统上比作尝试掌控外部条件，可借此思考是否有足够的资源。';}
  else if(controls[use.element]===body.element){relation='用克体';plain='传统上比作外部条件形成阻力，可借此识别实际的限制和风险。';}
  else{relation='关系未识别';plain='五行对照不完整，无法作进一步解释。';}
  const a=guaTheme(r.original),mid=guaTheme(r.mutual),b=guaTheme(r.changed),n=r.movingLines[0];
  return {
    headline:`起点是「${r.original.name}」：${a}。`,
    explanation:`用三个卦做一次复盘：本卦提醒看眼前的「${a}」，互卦提醒检查过程中的「${mid}」，变卦则提出变化视角「${b}」。另外“${relation}”在传统上只是一种资源关系的比喻。`,
    example:`比如你准备推进一项计划：先确认当下的主要问题，再定中期检查点，最后考虑变化后如何调整；不是说这三件事一定依次发生。`,
    actions:[guaAdvice(r.original),`检查你与外部条件的关系：${plain}`,plainFocus(d.input.question||'')],
    steps:[`本卦「${r.original.name}」：当前的主题是「${a}」。`,`互卦「${r.mutual.name}」：中间阶段可关注「${mid}」。`,`第 ${n} 爻变化后的变卦「${r.changed.name}」：换个角度看「${b}」。`],
    glossary:[commonTerms.original,commonTerms.mutual,commonTerms.changed,commonTerms.moving,commonTerms.bodyUse],
    caution:'体用五行是简化的传统比喻；这里不预测事情何时发生，也未实现旺衰、应期、外应等完整规则。'
  };
}
function ziweiBeginner(d){
  const ps=d.result.palaces||[],life=ps.find(p=>ziweiName(p)==='命'),work=ps.find(p=>['官禄','事业'].includes(ziweiName(p))),money=ps.find(p=>ziweiName(p)==='财帛');
  const lifeStar=life?.majorStars?.map(x=>x.name).join('、')||'没有十四主星';
  const headline=`紫微斗数可以先当作一张“12 个生活主题”的地图，不需要一次看懂所有星曜。`;
  return {
    headline,
    explanation:`先看命宫（这张盘在自我生活主题下的传统符号），再看官禄宫（工作）与财帛宫（资源），最后按你的兴趣查看其他宫。当前命宫：${life?.name||'未识别'}，主星：${lifeStar}。这只是在介绍排盘结果，并不是对你的性格或未来下结论。`,
    example:`就像看一份生活复盘表：命宫是“我平时怎么做决定”，官禄宫是“我如何做事与协作”，财帛宫是“我如何安排资金和资源”。可以把每个宫位当作一个讨论话题。`,
    actions:[`先看命宫：${life?palaceText(life).oneLine:'请检查命宫数据。'}`,`再看工作：${work?palaceText(work).oneLine:'当前未识别官禄宫。'}`,`最后看资源：${money?palaceText(money).oneLine:'当前未识别财帛宫。'}`],
    steps:[`1. 找“命宫”${life?`（${life.earthlyBranch}）`:''}，看有哪些主星。`, '2. 找“官禄宫”“财帛宫”，只把它们当作工作和资源的主题。','3. 点开每个宫的白话说明；如果想细看，还可查看原始星曜与对宫。'],
    glossary:[commonTerms.palace,commonTerms.stars,commonTerms.bodyPalace,commonTerms.four,commonTerms.opposite,commonTerms.decadal],
    caution:'星曜和宫位属于传统符号系统，不能作为性格测试、健康诊断、财富或婚恋预测。'
  };
}
function sectionBeginner(d,s){const r=d.result;
  if(d.method==='liuyao'){
    const a=guaTheme(r.original),b=guaTheme(r.changed);const m=r.movingLines;
    const dict={
      'liuyao-main':{oneLine:`先看这次抽到的「${r.original.name}」：传统主题是「${a}」。`,example:'例如做决定之前，先把已知条件、所需资源和时间表写下来。',action:guaAdvice(r.original)},
      'liuyao-moving':{oneLine:m.length?`第 ${m.join('、')} 爻变化，提醒留意${m.map(lineMeaning).join('、')}。`:'没有变化线，先从总体象意入手。',example:'六爻像六层楼，从最下面的第一层数到最上面的第六层；亮起的层就是动爻。',action:'检查问题中哪个环节最不确定，而不要直接猜“结果会怎样”。'},
      'liuyao-changed':{oneLine:`变卦「${r.changed.name}」的主题是「${b}」，是另一种观察角度。`,example:'例如计划原本顺利，但条件改变后可能需要调整优先级。',action:guaAdvice(r.changed)},
      'liuyao-method':{oneLine:'三枚硬币算一次，连续六次从下往上得到六条线。',example:'每次相加只会得到 6、7、8、9；6 和 9 对应动爻。',action:'如果对起卦过程有疑问，可查看六次原始数字并重新核对。'}
    };return dict[s.id]||null;
  }
  if(d.method==='meihua'){
    const themes=[guaTheme(r.original),guaTheme(r.mutual),guaTheme(r.changed)];
    const dict={
      'meihua-base':{oneLine:`本卦「${r.original.name}」用「${themes[0]}」表达一个观察角度。`,example:'可以想成你拿到一张提示卡，先问“此刻最值得注意什么”。',action:guaAdvice(r.original)},
      'meihua-body-use':{oneLine:'体可以理解成“你关心的一方”，用可以理解成“外部环境”；五行用来打比方。',example:'比如制定计划时，一边是你的时间和能力，一边是资源、合作或限制。',action:'先找出现实中的支持、消耗、阻力，别把五行关系直接理解成吉凶。'},
      'meihua-changing':{oneLine:`第 ${r.movingLines[0]} 爻翻转后，变卦是「${r.changed.name}」，主题「${themes[2]}」。`,example:'想象条件发生一处变化，你是否会修改自己的安排？',action:guaAdvice(r.changed)},
      'meihua-mutual':{oneLine:`互卦「${r.mutual.name}」用「${themes[1]}」提醒检查事情的中间环节。`,example:'做项目时别只盯最终结果，也要设置过程检查点。',action:'列出一个中期里程碑，并约定如何核验。'},
      'meihua-path':{oneLine:`可以依次把「${themes.join(' → ')}」当作三个思考题，而不是一条已注定的时间线。`,example:'现在观察 → 中间核验 → 变化后调整。',action:'分别写下一条已知事实、一个检查点和一个备选方案。'},
      'meihua-method':{oneLine:'三个正整数依次确定上卦、下卦和哪条爻发生变化。',example:'不同起卦流派可能用不同规则，必须先固定一套方法。',action:'保存输入的三个数字，方便对照同一计算口径。'}
    };return dict[s.id]||null;
  }
  if(d.method==='ziwei'){
    if(s.id.startsWith('ziwei-palace-')){const n=Number(s.id.slice('ziwei-palace-'.length));const p=r.palaces.find(x=>x.index===n)||r.palaces[n];return p?palaceText(p):null;}
    const dict={
      'ziwei-overview':{oneLine:'这里是出生时间转换得到的星盘基础信息，不是人格鉴定结果。',example:'就像一张地图的图例：先认清位置与标记，再看各个区域。',action:'确认出生日期、性别、时辰和使用的排盘口径是否准确。'},
      'ziwei-key':{oneLine:'先看命宫、工作（官禄）和财帛，其他宫位可以按需再看。',example:'像阅读分章节的报告，不用一次读完十二章。',action:'挑一个眼下真正关心的主题，先读那一宫的白话说明。'},
      'ziwei-relationships':{oneLine:'对宫与三方就是“看这个栏目时，也要顺带看看相关栏目”。',example:'比如谈工作，不只看岗位，还可以参考资源和外部环境。',action:'不要只凭单颗主星或单个宫位下结论。'},
      'ziwei-transits':{oneLine:'大限像按十年分的目录，流年像某一年的页码，只是传统时间标记。',example:'像在日历上筛选“这一年有哪些计划”，不代表一定会发生某件事。',action:'核对所选日期并结合现实安排，不用运限代替行动。'},
      'ziwei-boundary':{oneLine:'不同流派的排盘规则可能不同，这一版只做基础位置与象意解释。',example:'类似同一本书有不同注释版本，先说明采用哪一个版本。',action:'不要用命盘替代实际沟通、诊断或财务规划。'}
    };return dict[s.id]||null;
  }
  return null;
}
export function addBeginnerReading(d,note){
  if(!note || !['liuyao','meihua','ziwei'].includes(d.method))return note;
  const beginner=d.method==='liuyao'?liuyaoBeginner(d):d.method==='meihua'?meihuaBeginner(d):ziweiBeginner(d);
  return {...note,beginner,sections:note.sections.map(s=>({...s,beginner:sectionBeginner(d,s)}))};
}
