import json,re
from pathlib import Path
root=Path(__file__).parent
src=(root.parent/'src/engines/iching.mjs').read_text()
pairs=re.findall(r"'([^'#]+)#(\d+)'",src)
assert len(pairs)==64
names={int(n):name for name,n in pairs}
seeds='''乾|开创与自强|先明确方向，再检查自身资源和边界
坤|承载与协作|厘清支持条件，不必急于争先
屯|开始阶段的困难|先搭建基础，允许过程曲折
蒙|启蒙与求教|识别信息缺口，再寻求有经验者的反馈
需|等待与准备|预留缓冲，避免在条件不足时强推
讼|争议与界限|先核事实和规则，优先沟通而非升级对抗
师|组织与纪律|明确职责分工与共同规则
比|亲近与结盟|审视合作双方是否真正互信
小畜|渐进积累|把大目标拆成可以持续推进的小步
履|谨慎行动|把握分寸，尤其注意过程与承诺
泰|通达与配合|珍惜配合顺畅时的维护工作
否|阻隔与失联|分析沟通和资源的断点，考虑调整路径
同人|求同与协作|围绕共同目标而非表面一致开展合作
大有|资源与责任|有资源时也要考虑分配和持续性
谦|谦逊与节制|保留学习空间，避免只用一种视角判断
豫|准备与动员|热情之外还需清晰计划
随|顺势与适应|辨认变化中的核心原则
蛊|整顿与修复|检查旧问题的根因，不只处理表象
临|临近与观察|接近机会时保持对细节的观察
观|审视与反思|先形成可靠全貌，再选择干预方式
噬嗑|处理障碍|把纠结的问题拆解成可验证的环节
贲|形式与内容|外在呈现应服务于真实价值
剥|收缩与保护|识别应该暂停或缩减的部分
复|回归与复盘|回到核心目的，修正已经偏离的轨道
无妄|真实与谨慎|避免无充分依据的假定
大畜|积累与蓄势|把能力与资源储备放在眼前
颐|养护与供给|关注精力、沟通与资源供给
大过|压力与承重|识别负担是否已超过系统承受范围
坎|重重障碍|设立安全余量，避免一次性押注
离|明晰与依附|核对信息来源，也留意支撑条件
咸|感应与交流|倾听反馈，避免单方面解读
恒|稳定与持续|建立可以重复执行的节奏
遁|主动退让|评估什么时候退出更能保全选择权
大壮|力量与节制|能力提升时同样需要约束
晋|进展与呈现|展示成果，也留意目标是否偏移
明夷|遮蔽与保护|在信息不明时减少暴露与风险
家人|内部角色与秩序|厘清家庭或团队中的期待与责任
睽|分歧与差异|先理解差异所在，不强求立即一致
蹇|受阻与转道|检查阻力来源，考虑绕行或求助
解|疏通与松绑|找到关键阻塞点后再逐项解除
损|有意识地减少|优先减少无效负担而非盲目扩张
益|增益与互利|问清增长能否兼顾各方需要
夬|作出决定|决定前明确依据，避免以情绪替代判断
姤|突然而来的相遇|识别短期诱因与长期影响
萃|汇聚与组织|聚焦共同目标，明确协作机制
升|稳步提升|重视长期训练和实践反馈
困|受限与承压|首先区分可控和不可控的因素
井|稳定的基础资源|回顾哪些基础资源可以长期维护
革|改革与更替|确认变革必要性，并安排平稳过渡
鼎|更新与协同|调整结构时兼顾各部分功能
震|突发与觉醒|面对变化先稳定行动节奏
艮|止步与边界|识别何时需要停止或划清界线
渐|循序渐进|给关系和计划留出自然发展时间
归妹|关系与角色错位|检查双方期待和角色定义是否清晰
丰|盛大与复杂|资源充足时尤其需要控制复杂度
旅|在外与临时状态|优先保障基本条件和退路
巽|柔顺与渗透|以持续的小调整形成影响
兑|喜悦与沟通|沟通中的友善需要与诚实并行
涣|分散与重新联结|重建共同目标和清晰沟通
节|约束与尺度|明确规则与节奏，避免过度限制
中孚|诚信与互信|用可验证行动建立互信
小过|小事可行与谨慎|从低风险的小步骤入手
既济|阶段完成后的维护|完成不等于结束，注意复盘维护
未济|未完成与持续演化|承认尚未完结，逐步补全条件'''
seeds=[line.split('|') for line in seeds.splitlines()]
assert len(seeds)==64
hexagrams=[{'id':f'hexagram-{i+1}', 'number':i+1, 'name':names[i+1], 'theme':theme, 'reflection':reflection,
             'status':'original-summary', 'sourceIds':['zhouyi']} for i,(short,theme,reflection) in enumerate(seeds)]
for i,(short,theme,reflection) in enumerate(seeds):
    assert short in names[i+1],(i+1,short,names[i+1])
# Each paragraph below is an original symbolic gloss, NOT a translated or verbatim classic quote.
stems={
'甲':['阳木','树木向上生长的象征','观察长期方向和原则'], '乙':['阴木','藤草与柔韧生长的象征','观察灵活协作和适应'],
'丙':['阳火','日光与外显能量的象征','观察如何让信息更清楚'], '丁':['阴火','灯火与细密照明的象征','关注专注投入与持续维护'],
'戊':['阳土','高山厚土、承载之象','检查稳定性与责任边界'], '己':['阴土','田园培植、整理之象','关注细节与资源培育'],
'庚':['阳金','金属锻造、决断之象','观察边界与执行力度'], '辛':['阴金','精工细琢、辨析之象','重视质量与具体标准'],
'壬':['阳水','江河流动、联通之象','留意信息流动与变通'], '癸':['阴水','雨露润泽、渗透之象','重视耐心与环境反馈']}
tenGods={
'比肩':'同类与自我主张的象征；可用于讨论协同和独立的平衡',
'劫财':'同伴、竞争和资源分配的象征；可用于思考边界与合作',
'食神':'表达、产出和滋养的象征；可用于讨论稳定创造',
'伤官':'表达、质疑和突破的象征；可用于讨论创新与规则',
'偏财':'资源调配与机会选择的象征；不代表实际收入',
'正财':'秩序化的资源管理的象征；不代表个人财富金额',
'七杀':'外部压力、竞争与挑战的象征；不等于必有危险',
'偏官':'七杀的另一种称呼，传统流派称谓略有不同',
'正官':'规则、角色责任和社会秩序的象征；不等于职业地位',
'偏印':'非标准学习、吸收和思维方式的象征；不等于性格诊断',
'枭神':'偏印的传统别称，使用条件因流派不同',
'正印':'学习、支持和知识传承的象征；不等于学历判断'}
elements={
'木':'生长、规划与更新的传统类象', '火':'表达、温度与外显的传统类象', '土':'承载、管理与稳定的传统类象',
'金':'结构、界线与整合的传统类象', '水':'流动、联结与适应的传统类象'}
stars={
'紫微':'统筹、组织与责任的传统类象', '天机':'思考、设计与变化的传统类象', '太阳':'外显、照应与行动的传统类象',
'武曲':'纪律、执行与资源管理的传统类象', '天同':'和缓、体验与调适的传统类象', '廉贞':'原则、辨析与人际分寸的传统类象',
'天府':'储备、统筹与稳健的传统类象', '太阴':'内省、积累与细腻的传统类象', '贪狼':'探索、社交与兴趣的传统类象',
'巨门':'表达、质询与观点分歧的传统类象', '天相':'协调、程序与合作的传统类象', '天梁':'守护、原则与长程责任的传统类象',
'七杀':'决断、变化与承压的传统类象', '破军':'更新、重组与突破旧结构的传统类象'}
palaces={
'命宫':'传统上用来讨论自我呈现与行为方式', '兄弟':'传统上用于讨论手足及同辈互动',
'夫妻':'传统上用于讨论亲密关系中的相处模式', '子女':'传统上用于讨论养育、创造与代际交流',
'财帛':'传统上用于讨论资源管理和价值交换', '疾厄':'传统上用于讨论身体照护的象征，并非医疗判断',
'迁移':'传统上用于讨论外部环境、迁动和对外联系', '交友':'传统上用于讨论社交与合作网络',
'仆役':'交友宫的传统称呼', '官禄':'传统上用于讨论工作角色、职责与事业安排',
'事业':'官禄宫的通俗称呼', '田宅':'传统上用于讨论居住空间、资产与家庭基础',
'福德':'传统上用于讨论心理感受、休闲与内在资源', '父母':'传统上用于讨论上一代及外部支持关系'}
trigrams={
'乾':'天，阳健之象', '兑':'泽，交流与喜悦之象','离':'火，明晰与依附之象','震':'雷，发动与变化之象',
'巽':'风，柔顺与渗透之象', '坎':'水，险阻与流动之象','艮':'山，停止与节制之象','坤':'地，承载与柔顺之象'}
sources=[
{'id':'zhouyi','title':'周易','url':'https://ctext.org/book-of-changes/zh','locator':'六十四卦与经传目录','verification':'source-verified','note':'原文来源已核实；本项目卦义为独立概括，未逐条校对爻辞'},
{'id':'meihua','title':'梅花易数','url':'https://zh.wikisource.org/zh-hans/梅花易数','locator':'卷一·卦以八除/爻以六除；卷二·体用生克','verification':'source-verified','note':'目录结构已核实；三数起卦与体用生克由本项目明确限定口径'},
{'id':'ditiansui','title':'滴天髓','url':'https://zh.wikisource.org/zh-hans/滴天髓','locator':'月令论、天干论、寒暖论','verification':'source-verified','note':'章节存在已核实；现代解读为本项目作者概括'},
{'id':'ziping','title':'子平真诠','url':'https://libokang.com/zh-hant/classics/bazi/子平真詮原文/','locator':'论用神、月令格局相关章节','verification':'secondary-source','note':'第三方原文整理与译注，并非版本校勘结论'},
{'id':'sanming','title':'三命通会','url':'https://zh.wikisource.org/zh-hans/三命通會','locator':'卷一至卷九目录','verification':'source-verified','note':'文献索引；维基文库缺卷十至十二，不强行伪造引文'},
{'id':'ziwei-book','title':'紫微斗数（续道藏本）','url':'https://zh.wikisource.org/zh-hant/紫微斗數','locator':'卷之一至三','verification':'source-verified','note':'用于知识索引；不同排盘流派和现代 iztro 实现未必完全一致'},
{'id':'iztro','title':'iztro 开源排盘文档','url':'https://docs.iztro.com/quick-start','locator':'通过阳历排盘 API','verification':'documentation','note':'紫微确定性排盘来源，非古籍'},
{'id':'lunar','title':'lunar-typescript 开源历法库','url':'https://github.com/6tail/lunar-typescript','locator':'八字与节气 API','verification':'documentation','note':'计算实现来源，非古籍'}
]
concepts=[]
for i,h in enumerate(hexagrams):concepts.append({'id':h['id'],'domain':'iching','name':h['name'],'keywords':[h['name'],h['theme'],str(i+1)],'summary':f"{h['theme']}。{h['reflection']}。",'sourceIds':['zhouyi'],'originalSummary':True})
for key,data in stems.items():concepts.append({'id':f'stem-{key}','domain':'bazi','name':key+'日主','keywords':[key,'天干','日主',data[0]],'summary':f'{data[0]}：{data[1]}。{data[2]}。','sourceIds':['ditiansui'],'originalSummary':True})
for key,s in tenGods.items():concepts.append({'id':f'tengod-{key}','domain':'bazi','name':key,'keywords':[key,'十神'],'summary':s,'sourceIds':['sanming','ziping'],'originalSummary':True})
for key,s in elements.items():concepts.append({'id':f'element-{key}','domain':'bazi','name':key+'五行','keywords':[key,'五行'],'summary':s,'sourceIds':['ditiansui'],'originalSummary':True})
for key,s in stars.items():concepts.append({'id':f'star-{key}','domain':'ziwei','name':key+'星','keywords':[key,'星曜'],'summary':s,'sourceIds':['ziwei-book'],'originalSummary':True})
for key,s in palaces.items():concepts.append({'id':f'palace-{key}','domain':'ziwei','name':key+'宫','keywords':[key,'宫位'],'summary':s,'sourceIds':['ziwei-book'],'originalSummary':True})
for key,s in trigrams.items():concepts.append({'id':f'trigram-{key}','domain':'iching','name':key+'卦','keywords':[key,'八卦'],'summary':s,'sourceIds':['zhouyi','meihua'],'originalSummary':True})
# Direct verified short excerpts with exact chapter anchors from the web lookup
verified_quotes=[
{'id':'quote-dty-moon','domain':'bazi','title':'月令与格局','text':'月令提纲，譬之宅也，人元用事之神，宅之向也，不可以不卜。','sourceId':'ditiansui','locator':'月令论','status':'verified-short-excerpt','url':'https://zh.wikisource.org/zh/滴天髓'},
{'id':'quote-meihua-first','domain':'meihua','title':'起卦有其情境','text':'不動不占，不因事不占。','sourceId':'meihua','locator':'卷一·观梅占','status':'verified-short-excerpt','url':'https://zh.wikisource.org/zh-hant/梅花易數/卷一'},
{'id':'quote-zhouyi-qian','domain':'iching','title':'乾卦卦辞','text':'元亨利貞。','sourceId':'zhouyi','locator':'乾卦','status':'verified-short-excerpt','url':'https://ctext.org/book-of-changes/qian/zh'}]
obj={'version':'1.2.0','policy':'本知识库包含自主撰写的象意摘要，不代表古籍逐字原文。只有 verifiedQuotes 标记为已核对的短引文，其余 sourceIds 为来源主题索引而非逐句引证。传统术数不构成可验证的未来预测。','sources':sources,'hexagrams':hexagrams,'stems':dict(zip(stems.keys(),[{'element':v[0],'symbol':v[1],'prompt':v[2]} for v in stems.values()])), 'tenGods':tenGods,'elements':elements,'stars':stars,'palaces':palaces,'trigrams':trigrams,'concepts':concepts,'verifiedQuotes':verified_quotes}
(root/'catalog.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print('created KB:',len(hexagrams),'hexagrams',len(concepts),'concepts',len(sources),'sources',len(verified_quotes),'verified short excerpts')
