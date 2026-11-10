import {KNOWLEDGE,sourcesFor,hexagramEntry} from '../knowledge/catalog.mjs';
import {attachTrace} from './trace.mjs';
import {addBeginnerReading} from './beginner.mjs';
import {addStoryReading} from './story.mjs';
import {addAdvancedInterpretation} from './advanced.mjs';
const names=['初','二','三','四','五','上'];
const season={寅:'孟春',卯:'仲春',辰:'季春',巳:'孟夏',午:'仲夏',未:'季夏',申:'孟秋',酉:'仲秋',戌:'季秋',亥:'孟冬',子:'仲冬',丑:'季冬'};
const importantStars=['紫微','天机','太阳','武曲','天同','廉贞','天府','太阴','贪狼','巨门','天相','天梁','七杀','破军'];
const refLine='以下文字是根据可复核盘面和公开规则生成的传统象意说明，不是因果证据或个人未来预测。';
const section=(id,title,summary,observations,interpretation,questions,sourceIds=[])=>({id,title,summary,observations,interpretation,questions,sourceIds});
function pack(summary,sections,ids,limitations=[]){return {
  version:'1.2.0',type:'rule-based-symbolic-interpretation',title:'传统术数分层解读',summary,sections,
  references:sourcesFor(ids),limitations:[refLine,...limitations],
  provenance:'规则模板 + 本地知识库，无外部大模型调用；知识索引不等同逐条逐句的文献引证'
};}
function genBazi(d){
  const r=d.result,p=r.pillars,stem=r.dayMaster,dm=KNOWLEDGE.stems[stem];
  const counts=r.observedFiveElements.counts;
  const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]||'木火土金水'.indexOf(a[0])-'木火土金水'.indexOf(b[0]));
  const max=sorted[0][1],observedStrong=sorted.filter(([,v])=>v===max).map(([k])=>k).join('、');
  const zero=sorted.filter(([,v])=>v===0).map(([k])=>k);
  const seen=p.filter((x,i)=>i!==2&&x.stemTenGod).map(x=>({pillar:x.title,god:x.stemTenGod}));
  const gods=seen.map(x=>`${x.pillar} ${x.god}`).join('；')||'未提取到年、月、时干十神';
  const meta=p.map(x=>`${x.title} ${x.ganZhi}（明干十神：${x.stemTenGod||'未标'}，藏干：${(x.hiddenStems||[]).join('、')||'无'}）`);
  const cycles=r.luck.cycles.slice(0,4).map(x=>`${x.ganZhi}：${x.startYear}—${x.endYear}（${x.startAge}—${x.endAge}岁）`);
  const pick=(god)=>seen.filter(x=>x.god===god).map(x=>x.pillar).join('、');
  const career=['正官','七杀','偏官','食神','伤官'].map(g=>pick(g)?`${g}见于${pick(g)}`:null).filter(Boolean);
  const wealth=['正财','偏财'].map(g=>pick(g)?`${g}见于${pick(g)}`:null).filter(Boolean);
  const sections=[
    section('bazi-four-pillars','四柱结构与日主',`日主为 ${stem}（${dm?.element||'未知'}）`,meta,
      `传统命理以日干为观察中心。${dm?.symbol||'这是一个天干的传统象征'}；${dm?.prompt||'可结合现实经历反思'}。年、月、日、时四柱是不同时间层次的标签，不能将其直接等同个体性格。`,
      ['哪些解释与你的亲身经历有关，哪些只是常见的宽泛类比？','你希望重点分析工作、家庭还是个人规划？'],['ditiansui','lunar']),
    section('bazi-season','月令与季节',`${p[1].branch}月 · ${season[p[1].branch]||'季节信息待查'}`,
      [`月柱 ${p[1].ganZhi}`,`月支 ${p[1].branch}`,`节气划月：${d.policy.monthBoundary}`],
      '《滴天髓》《子平真诠》等传统体系重视月令。当前版本只报告月令的季节类象，不自动宣称日主“身强/身弱”或确定用神；这些判断依赖藏干、通根、合冲与流派。',
      ['若要深究格局，应先决定采用哪一种子平流派，再计算完整的取格证据。'],['ditiansui','ziping']),
    section('bazi-five-elements','五行分布与局限',`8 个可见位置：${Object.entries(counts).map(([k,v])=>k+v).join(' · ')}`,
      [`可见计数并列最多：${observedStrong}（${max}处）`,zero.length?`当前八个可见位置没有：${zero.join('、')}`:'五种元素在八个可见位置均出现'],
      `这里只统计四柱明干和地支本气，不包含藏干，也不按季令加权。“数量最多”不表示最旺，“未出现”也不能等同“命中缺某种元素”，尤其不能据此推荐颜色、职业或补品。`,
      ['是否需要加入藏干层的统计视图？','任何提升计划应优先依据现实资源和目标。'],['ditiansui']),
    section('bazi-ten-gods','十神与人事类象',gods,seen.map(x=>`${x.pillar}的明干十神：${x.god}——${KNOWLEDGE.tenGods[x.god]||'对应传统生克关系'}`),
      '十神是相对于日主定义的生克和阴阳关系，不是人格类型或职业定论。这里优先呈现明干关系，地支藏干及完整格局可在命盘表查看，不用少量十神得出单一吉凶结果。',
      ['你希望讨论角色责任、学习表达，还是资源安排？'],['sanming','ziping']),
    section('bazi-relations','地支关系：冲、合与重复',
      [...r.traditionalRelations.pairs.map(x=>x.description),...r.traditionalRelations.triples.map(x=>x.description),...r.traditionalRelations.repetitions.map(x=>`${x.branch}支重复${x.count}次`)].join('；')||'本盘未发现已实现的冲、合或地支重复',
      [...r.traditionalRelations.pairs.map(x=>`${x.label} ${x.branches.join('')}：${x.positions.map(i=>p[i].title).join('、')}`),...r.traditionalRelations.triples.map(x=>`${x.label} ${x.branches.join('')}：${x.positions.map(i=>p[i].title).join('、')}`),...r.traditionalRelations.repetitions.map(x=>`${x.branch}重复：${x.positions.map(i=>p[i].title).join('、')}`)],
      '六冲、六合与三合是四柱地支之间的传统关系标签。本模块只报告可直接识别的组合，不判定是否合化成功、是否有利，也不据此推断婚姻、迁移、疾病或未来事件。未出现关系标签并不意味着四柱没有其他关系。',
      ['哪些变化来自已经发生的现实选择？','是否需要进一步核验刑、害、破或藏干层面的规则？'],['sanming','ziping']),
    section('bazi-career','事业与表达主题（非预测）',career.join('；')||'明干未出现官杀或食伤的独立标签',
      career.length?career:['事业讨论不仅依赖官杀或食伤，还需要真实经历与机会条件'],
      '传统体系常把官杀关联规则与责任、食伤关联表达与产出。这里只能提供思考角度：个人工作方式是否更需要流程、创造或协调，不能由此推断升职、失业或考试结果。',
      ['当前工作最需要提高的是能力、协作还是执行机制？'],['sanming','ziping']),
    section('bazi-resources','资源与财务主题（非预测）',wealth.join('；')||'明干未出现正财/偏财标签',
      wealth.length?wealth:['没有明干财星不表示缺乏现实财富，更不能推出收入高低'],
      '传统“财”是命理生克关系中的术语，并不对应账户余额。可以借它反思资源如何分配、哪些机会值得审慎评估；实际投资和借贷仍需依据风险、现金流与专业意见。',
      ['你现在更需要提高储备、减少波动，还是做明确的预算？'],['sanming']),
    section('bazi-luck','大运时段与变化',`起运延迟 ${r.luck.startDelay.years}年${r.luck.startDelay.months}月${r.luck.startDelay.days}日；首次起运公历 ${r.luck.firstStartSolar}`,
      cycles, '大运是按传统排运规则生成的干支时段表，不是“某年必发生什么”的事件清单。当前不自动生成逐年吉凶，也不把起运年龄换算成确定人生经历。',
      ['对照这些时段，是否存在值得自己回顾的实际环境变化？'],['sanming','lunar']),
    section('bazi-boundary','情感与身心的阅读边界','不做婚期、疾病、寿命或重大事件预测',
      [`日柱 ${p[2].ganZhi}`,`时柱 ${p[3].ganZhi}`],
      '传统命书会以柱位讨论家庭、伴侣和后代，但无法可靠推断实际婚姻质量、身体疾病或寿命。有关健康、关系等问题应使用现实沟通和专业信息，不以命盘替代决策。',
      ['哪些真正可改善的生活习惯或沟通方式值得现在行动？'],['ditiansui'])
  ];
  return pack(`八字排盘：${p.map(x=>x.ganZhi).join(' · ')}；以 ${stem} 日主为中心，分月令、五行、十神、大运等层次解释。`,sections,['ditiansui','ziping','sanming','lunar'],['未实现格局定性、日主旺衰量化、喜用神自动断定、神煞断语或逐年应期。']);
}
function guaInfo(g){const e=hexagramEntry(g.kingWenNumber);return {theme:e?.theme||'卦象变化',reflection:e?.reflection||'通过多角度检查问题',num:g.kingWenNumber,name:g.name};}
const lineRole=['起始与萌发','内部配合','进退临界','外部协作','关键判断','收束与过渡'];
const questionLens=(question='')=>{
  const q=String(question||'');
  if(!q.trim())return {label:'一般议题',focus:'先把问题写成具体、可核对的一句话',question:'你真正想确认的事实是什么？'};
  if(/健康|疾病|病情|诊断|手术|治疗|身体/.test(q))return {label:'健康与照护',focus:'身体问题应该以医学检查与专业建议为依据；卦象不能用于诊断、判断寿命或选择治疗方案',question:'你能否先获取实际检查结果或医生建议？'};
  if(/投资|股票|炒股|理财|财富|贷款|收入|赚钱|资金|买房/.test(q))return {label:'资金与风险',focus:'把实际现金流、损失承受能力和合同条款放在卦象解释之前',question:'最坏情况下的资金损失与备选方案是什么？'};
  if(/感情|婚姻|恋爱|伴侣|对象|分手|家庭关系/.test(q))return {label:'关系与沟通',focus:'优先核对双方真实表达和边界，不把卦象当作对他人意图的证明',question:'是否有可以直接和当事人沟通确认的事项？'};
  if(/学习|考试|学业|升学|论文|课程/.test(q))return {label:'学习与训练',focus:'对照真实反馈、时间计划和可持续练习来调整节奏',question:'下一次可量化的练习或反馈节点是什么？'};
  if(/合作|项目|工作|职业|事业|面试|跳槽|上线|研发/.test(q))return {label:'工作与协作',focus:'核对目标、责任人、资源与风险，把象征性的变化转换为可执行计划',question:'有哪些关键资源、责任人和验收条件尚未明确？'};
  return {label:'一般议题',focus:'将象征提示映射到可验证的现实条件，不以卦象替代事实核查',question:'下一步最小可验证行动是什么？'};
};

function genLiuyao(d){
  const r=d.result,a=guaInfo(r.original),b=guaInfo(r.changed),moving=r.movingLines,focus=questionLens(d.input.question);
  const movingDetail=moving.map(idx=>{const v=r.yaoBottomUp[idx-1].value;return `${names[idx-1]}爻（第${idx}爻，${v===6?'老阴转阳':'老阳转阴'}）：${lineRole[idx-1]}`;});
  const sections=[
    section('liuyao-main','本卦的核心象意',`${r.original.name} · ${a.theme}`,
      [`文王第 ${a.num} 卦`,`上${r.original.upper.name}下${r.original.lower.name}`,`卦象次序：由下往上`, ...(d.input.question?[`本次所问：${d.input.question}`,`问题类型：${focus.label}`]:[])],
      `这是本次问题的象征性起点。上卦为 ${r.original.upper.name}，下卦为 ${r.original.lower.name}；与“${a.theme}”有关的传统意象可以用于重新组织问题，而不是证明事件一定会发生。针对${focus.label}，${focus.focus}。`,
      [a.reflection,focus.question],['zhouyi']),
    section('liuyao-moving','动爻与问题焦点',moving.length?`共 ${moving.length} 个动爻：${moving.join('、')}`:'没有动爻（静卦）',
      moving.length?movingDetail:['六次起卦均为少阴或少阳，原卦与变卦相同'],
      moving.length?'动爻标示本次计算中发生阴阳反转的爻位。上述“起始/配合”等是本项目的结构性提示，并非各爻古文爻辞或纳甲六亲断语。':'静卦可聚焦本卦整体意象，不应据此判定现实事态毫无变化。',
      ['哪些部分目前可控？哪些只是暂时的担忧？'],['zhouyi']),
    section('liuyao-changed','变卦与可能的思考方向',`${r.changed.name} · ${b.theme}`,[`本卦：${a.theme}`,`变卦：${b.theme}`],
      `从“${a.theme}”转向“${b.theme}”可视为一种理解问题的第二视角，而不是未来必然状态。${b.reflection}。`,
      ['针对这个主题，可以先采取什么低风险、可验证的行动？'],['zhouyi']),
    section('liuyao-method','起卦过程与规则边界',d.input.casting,
      [`由下至上爻值：${d.input.linesBottomUp.join('，')}`,`动爻：${moving.join('、')||'无'}`],
      'H 面记 3、T 面记 2，三枚相加为 6/7/8/9；6、9 为动爻。本版额外计算京房八宫、纳甲、六亲、世应，并可按占日天干排六神；但尚未完整计算月建、日辰、旬空、用神与应期，因此不作严格六爻断事。',
      ['可以保存这次起卦原始记录，用于重复核对。'],['zhouyi'])
  ];
  return pack(`本卦 ${r.original.name}（${a.theme}），${moving.length?`动爻 ${moving.join('、')}`:'静卦'}，变卦 ${r.changed.name}（${b.theme}）。`,sections,['zhouyi'],['已提供纳甲、六亲、世应基本装卦；缺少月建、日辰、旬空和用神等条件，不能提供严格传统六爻断事。']);
}
function elemRelation(body,use){
  if(body===use)return ['体用比和','体与用五行相同，在该传统规则中表示两侧性质相近；不意味着现实一定顺利'];
  const produces={木:'火',火:'土',土:'金',金:'水',水:'木'};
  const controls={木:'土',土:'水',水:'火',火:'金',金:'木'};
  if(produces[use]===body)return ['用生体','外部条件滋养主体的象意；提醒思考已有支持'];
  if(produces[body]===use)return ['体生用','主体向外投入的象意；提醒关注精力与资源消耗'];
  if(controls[body]===use)return ['体克用','主体尝试掌握外部条件的象意；提醒关注行动成本'];
  if(controls[use]===body)return ['用克体','外部条件对主体构成约束的象意；提醒关注风险边界'];
  return ['关系待校验','未找到五行生克关系'];
}
function genMeihua(d){
  const r=d.result,a=guaInfo(r.original),b=guaInfo(r.changed),bodyTop=r.bodyUse.body==='上卦',focus=questionLens(d.input.question);
  const body=bodyTop?r.original.upper:r.original.lower,use=bodyTop?r.original.lower:r.original.upper;
  const [relationship,meaning]=elemRelation(body.element,use.element);
  const mutual=r.mutual?guaInfo(r.mutual):null;
  const sections=[
    section('meihua-base','本卦与所问主题',`${r.original.name} · ${a.theme}`,
      [`上卦 ${r.original.upper.name}（${r.original.upper.element}）`,`下卦 ${r.original.lower.name}（${r.original.lower.element}）`,...(d.input.question?[`本次所问：${d.input.question}`,`问题类型：${focus.label}`]:[])],
      `从传统象意看，本卦强调“${a.theme}”。${a.reflection}。请把这些当作提示，而不是客观的事件预测。针对${focus.label}，${focus.focus}。`,
      ['当前问题里最值得明确的限制条件是什么？',focus.question],['zhouyi','meihua']),
    section('meihua-body-use','体用五行关系',`${relationship}：体 ${body.name}${body.element} / 用 ${use.name}${use.element}`,
      [`体：${r.bodyUse.body}的${body.name}卦`,`用：${r.bodyUse.use}的${use.name}卦`,`五行关系：${relationship}`],
      `当前起卦约定以未发生动爻的一卦为体、发生动爻的一卦为用。${meaning}。这一判断没有考虑旺衰、互卦生克和外应，不能作为完整传统吉凶判定。`,
      ['你的实际环境中有哪些支持、阻碍和投入成本？'],['meihua']),
    section('meihua-changing','动爻与变卦',`第 ${r.movingLines[0]} 爻动 → ${r.changed.name}`,
      [`动爻位置：${r.movingLines[0]}`,`变卦侧重点：${b.theme}`],
      `变卦是将第 ${r.movingLines[0]} 爻阴阳翻转后的计算结果。将“${a.theme}”与“${b.theme}”对照，可以形成第二个观察角度。${b.reflection}。`,
      ['什么条件变化后，才需要重新考虑当前计划？'],['meihua','zhouyi']),
    section('meihua-mutual','互卦与中间过程',mutual?`${r.mutual.name} · ${mutual.theme}`:'未计算互卦',
      mutual?[`互卦：第 ${r.mutual.kingWenNumber} 卦`]:[],
      mutual?`互卦由本卦内部第二、三、四爻和第三、四、五爻构成。它常被拿来象征中间过程，本项目用“${mutual.theme}”作为中程反思提示，不把它视作应期。`:'互卦计算未启用。',
      ['计划的中间环节有哪些可验证的阶段成果？'],['meihua','zhouyi']),
    section('meihua-path','本卦 → 互卦 → 变卦的三阶段对照',
      `${r.original.name} → ${r.mutual.name} → ${r.changed.name}`,
      [`起始类象：${a.theme}`,`中间类象：${mutual?.theme||'未收录'}`,`变化类象：${b.theme}`],
      `把“${a.theme}”作为当前观察角度，将“${mutual?.theme||'中间过程'}”作为过程提醒，再用“${b.theme}”提出变化后的检查项。这个顺序是整理问题的讲述框架，而不是必然发生的时间线或应期。`,
      ['现在可以验证的事实是什么？','中间阶段最应该设立哪一项检查点？','哪些变化会触发调整方案？'],['zhouyi','meihua']),
    section('meihua-method','数字起卦与流派限定','三数字固定口径',
      [`上卦数 ${d.input.numbers[0]}`,`下卦数 ${d.input.numbers[1]}`,`动爻数 ${d.input.numbers[2]}`],
      '数字一、二分别除 8 取余，对应先天八卦序；数字三除 6 取余确定动爻，余 0 按 8/6。本版不提供时间起卦和各流派混用。',
      ['只在选定规则与相同输入下比较结果。'],['meihua'])
  ];
  return pack(`本卦 ${r.original.name}（${a.theme}），${relationship}，动第 ${r.movingLines[0]} 爻，变 ${r.changed.name}。`,sections,['zhouyi','meihua'],['体用生克为简化对照；未覆盖月令旺衰、应期、外应或完整传统断占体系。']);
}
const canonName=name=>name.replace(/宫$/,'').replace(/官禄/,'官禄').replace(/仆役/,'交友');
function genZiwei(d){
  const r=d.result,ps=r.palaces;
  const palaceOf=(label)=>ps.find(p=>canonName(p.name)===label||p.name.includes(label));
  const soul=palaceOf('命'),body=ps.find(p=>p.isBodyPalace);
  const topStars=p=>(p?.majorStars||[]).map(x=>x.name).join('、')||'无十四主星（传统空宫）';
  const special=[['命','命宫','作为传统结构观察的起点'],['官禄','事业角色','用于讨论分工与工作方式'],['财帛','资源安排','用于讨论价值交换与资源管理'],['福德','身心体验','用于讨论休息与内在感受'],['迁移','外部环境','用于讨论出行、迁动与跨环境协作']];
  const overview=special.map(([key,label,ctx])=>{const p=palaceOf(key);return p?`${label} ${p.earthlyBranch||''}：${topStars(p)}`:null}).filter(Boolean);
  const sections=[
    section('ziwei-overview','命盘总览与五行局',`命主 ${r.soul||'未提供'}，身主 ${r.body||'未提供'}，${r.fiveElementsClass||'五行局未提供'}`,
      [`农历日期：${r.lunarDate}`,`命宫地支：${r.earthlyBranchOfSoulPalace}`,`身宫地支：${r.earthlyBranchOfBodyPalace}`],
      '命主、身主、五行局是紫微斗数排盘体系内的术语，不是现代心理学测量。不同流派的定盘与解读可能不同；以下仅根据实际星曜所在宫位做可追溯的传统象意阅读。',
      ['先检查出生时辰和闰月设置是否准确。'],['ziwei-book','iztro']),
    section('ziwei-key','重点宫位速览',overview.join('；')||'命盘未识别到重点宫位',overview,
      '命、事业、财帛、福德和迁移等宫位在传统解盘中用于讨论不同生活主题，但它们相互关联。单颗星曜不能直接推断职业成功、财富数字或心理健康。',
      ['选择最需要讨论的现实主题，再查看相关宫位。'],['ziwei-book'])
  ];
  const lifeRelations=soul?.relations;
  if(lifeRelations){
    const palaceDesc=(x)=>x?`${x.name}${x.earthlyBranch}（${(x.majorStars||[]).map(s=>s.name).join('、')||'无十四主星'}）`:'缺失';
    sections.push(section('ziwei-relationships','命宫的对宫与三方关系（只展示结构）',
      `${soul.name} ${soul.earthlyBranch} · 对宫 ${lifeRelations.opposite?.name||'未识别'}`,
      [`对宫：${palaceDesc(lifeRelations.opposite)}`,...(lifeRelations.triads||[]).map(x=>`三方：${palaceDesc(x)}`)],
      '根据十二地支位置取对宫（相距六支）和三合方位（相距四、八支），再展示对应宫位的实际星曜。仅提供排盘结构与传统观察入口，不根据这些宫位推断确定的命运吉凶。',
      ['是否需要对照命宫、财帛、官禄和迁移宫的真实星曜配置？'],['ziwei-book','iztro']));
  }
  for(const p of ps){
    const key=canonName(p.name),meaning=KNOWLEDGE.palaces[key]||KNOWLEDGE.palaces[p.name]||'用于讨论该宫位对应的传统生活主题';
    const starInfo=p.majorStars.map(st=>{
      const match=importantStars.find(x=>st.name===x||st.name.startsWith(x));
      const core=KNOWLEDGE.stars[match]||'传统星曜类象，尚未录入专项词条';
      return `${st.name}${st.brightness?'（'+st.brightness+'）':''}${st.mutagen?'〔'+st.mutagen+'〕':''}：${core}`;
    });
    const pName=p.name.endsWith('宫')?p.name:`${p.name}宫`;
    sections.push(section('ziwei-palace-'+p.index,`${pName} · ${p.earthlyBranch||'—'}`,
      `${pName}的主星：${topStars(p)}`,
      [`宫干支：${p.heavenlyStem}${p.earthlyBranch}`,`十四主星：${topStars(p)}`,...starInfo,`辅星：${p.minorStars.slice(0,8).map(x=>x.name).join('、')||'未显示'}`],
      `${meaning}。${starInfo.length?`该宫主星的传统象征包括：${starInfo.join('；')}。`:'该宫无十四主星；传统解盘通常会参考对宫与三方四正，但本版不自动推定借星吉凶。'}${p.isBodyPalace?' 这里同时标为身宫。':''} 不能仅凭本宫星曜断定实际人生事件。`,
      ['这组象征对应哪些你能自己观察、验证的行为与环境？'],['ziwei-book']));
  }
  if(r.transits?.available){
    const ts=r.transits,chosen=ts.selected||{};
    const short=(x)=>x?`${x.name||x.palaceName||x.palace||''} ${x.heavenlyStem||''}${x.earthlyBranch||''}${x.year||''}`.trim():'未提供该周期';
    sections.push(section('ziwei-transits','所选日期的传统运限速览',`对照日 ${ts.focusDate}`,
      [`大限：${short(chosen.decadal)}`,`流年：${short(chosen.yearly)}`,`流月：${short(chosen.monthly)}`,`流日：${short(chosen.daily)}`],
      '这是 iztro 对所选日期的运限标签，类似按照不同时间尺度阅读命盘。并不证明在这天或这一年发生特定事件，也没有经过多流派吉凶验证。',
      ['请结合真实日程与目标，不把运限理解为事件预言。'],['iztro']));
  }
  sections.push(section('ziwei-boundary','流派差异与断盘边界','保留计算事实，暂不输出确定性吉凶',
    [`引擎：${d.policy.engine} ${d.policy.engineVersion}`,`流派：${d.policy.sect}`,`闰月修正：${String(d.policy.fixLeap)}`],
    '本版展示十二宫、十四主星、辅星和已有四化字段；运限仅为选定日期的确定性标签，不自动断大限流年吉凶，也不声称完成飞星四化多流派综合验证。',
    ['后续如需高阶流年，可在同一星盘上新增可核验的运限计算。'],['iztro','ziwei-book']));
  return pack(`紫微斗数：命宫 ${soul?.earthlyBranch||r.earthlyBranchOfSoulPalace||'—'}（${topStars(soul)}），身宫 ${body?.earthlyBranch||r.earthlyBranchOfBodyPalace||'—'}；已生成十二宫的传统象意说明。`,sections,['ziwei-book','iztro'],['未实现紫微格局判断、三方四正完整推演、大限流年断语和跨流派对照。']);
}
function genHuangli(d){const r=d.result;return pack(`传统黄历：${d.input.date}，${r.dayGanZhi}；宜忌为民俗条目，不是生活安全或医学建议。`,[
  section('huangli-meaning','宜忌的使用方式','查询式传统民俗内容',
    [`宜：${r.yi.slice(0,12).join('、')}`,`忌：${r.ji.slice(0,12).join('、')}`],
    '宜忌是传统历书中的约定俗成分类，不提供科学因果证据。实际安排应以天气、合同、工作日、交通和安全要求为主。',[],['lunar'])],['lunar']);}
function genHepan(d){
  const {people:[a,b],dayBranch,dayElements,mode,referenceYear}=d.result;
  const title={love:'感情合盘',social:'人际合盘',fortune:'运势节奏对照'}[mode];
  const topic={love:'感情：相处期待与沟通方式',social:'人际：合作边界与协作分工',fortune:'运势：两个时间周期的并列观察'}[mode];
  const advice={love:'各自写下最重视的三件事，再一起沟通冲突处理、相处节奏和双方边界。',social:'先明确目标、责任、沟通频率和退出机制，用实际合作反馈调整关系。',fortune:'对照两人的时间安排、工作负荷和重要节点，优先处理真实的计划冲突。'}[mode];
  const fmtCycle=p=>p.activeCycle?`${p.activeCycle.ganZhi}（${p.activeCycle.startYear}—${p.activeCycle.endYear}）`:'当年没有可显示的大运段';
  return pack(`${title}：${a.label}（${a.dayMaster}${a.dayElement}）与${b.label}（${b.dayMaster}${b.dayElement}）；日支为${a.dayBranch}、${b.dayBranch}。此结果用于讨论双方关系，不用于打分或预测。`,[
    section('hepan-overview','第一步 · 看双方的基础命盘',`${a.label}：${a.dayMaster}${a.dayElement}；${b.label}：${b.dayMaster}${b.dayElement}`,
      [`${a.label}日柱：${a.pillars[2].ganZhi}`,`${b.label}日柱：${b.pillars[2].ganZhi}`,`主题：${topic}`],
      '日主是八字日柱的天干，在传统命理中代表分析参照点。它不是性格类型，也不意味着任何一方必定具备某种特质。',
      ['双方真正关心的相处议题是什么？'],['lunar']),
    section('hepan-elements','第二步 · 日主五行关系',dayElements.name,
      [`${a.label}：${a.dayElement}`,`${b.label}：${b.dayElement}`,`对照：${dayElements.name}`],
      `${dayElements.description} 可以把它当成关于“支持、资源与边界”的讨论题，而不能直接转化为实际亲密度。`,
      ['谁需要怎样的支持？如何表达而不是假设？'],['ditiansui']),
    section('hepan-branches','第三步 · 日支对照',dayBranch.name,
      [`${a.label}日支：${a.dayBranch}`,`${b.label}日支：${b.dayBranch}`],
      dayBranch.description+' 不将“六合”解读为注定相爱，也不把“六冲”解读为感情破裂。',
      ['遇到分歧时，双方有哪些可以先协调的事实？'],['sanming']),
    section('hepan-theme','第四步 · 按当前主题解释',topic,
      [`当前主题：${title}`,`建议：${advice}`],
      `将合盘看成双方讨论的提纲，而非结论。${advice}`,
      ['请各自给出一件可以具体执行的改变，并约定复盘时间。'],['ziping']),
    section('hepan-time','第五步 · 传统大运时段并列',`${referenceYear} 年；两份独立大运表`,
      [`${a.label}：${fmtCycle(a)}`,`${b.label}：${fmtCycle(b)}`],
      '这里只并列展示两个人的大运干支与年份，用作传统时间标签，不能据此预言结婚、合作、疾病、财富或事件发生。',
      ['以真实工作与生活日历核对未来安排，不用大运标签替代沟通。'],['lunar'])
  ],['lunar','ditiansui','sanming','ziping'],['不实现八字合婚吉凶、夫妻宫断语、婚期推算、人际相容度分数；资料缺失时拒绝生成完整合盘。']);
}
export function interpretResult(data){
  let result;
  switch(data.method){
    case 'bazi':result=genBazi(data);break;
    case 'liuyao':result=genLiuyao(data);break;
    case 'meihua':result=genMeihua(data);break;
    case 'ziwei':result=genZiwei(data);break;
    case 'huangli':result=genHuangli(data);break;
    case 'hepan':result=genHepan(data);break;
    default:return null;
  }
  return addAdvancedInterpretation(data,attachTrace(data,addStoryReading(data,addBeginnerReading(data,result))));
}
