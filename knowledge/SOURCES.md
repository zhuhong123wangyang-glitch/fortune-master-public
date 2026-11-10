# Fortune Master V1.2 文献来源与使用规范

## 1. 资料层级

- **原文核验短引**：`catalog.json` 内 `verifiedQuotes` 的 3 个短句，只用于展示具体典籍的局部概念，包含定位和外部访问地址；“已核对”指网页版本文本与短句相符，不代表对版本真伪完成历史学考据。
- **原创传统类象摘要**：`concepts` 的 127 个词条（64 卦、天干、十神、五行、星曜、宫位等）。`originalSummary:true` 表示作者自己的解释文字，**不是任何典籍的逐字原文**。
- **书目/章节索引**：`sources` 的 `sourceIds` 引用相关典籍或计算文档。它们用于提示进一步核读，不意味着每句话都有精确的卷、页、章、句出处。

## 2. 已检索的公开来源

| 名称 | 可访问的公开资料 | 本项目采用范围 |
|---|---|---|
| 《周易》 | https://ctext.org/book-of-changes/zh | 六十四卦名称、传统意象索引；短引核验乾卦 |
| 《梅花易数》 | https://zh.wikisource.org/zh-hans/梅花易数 | 卷一数字/时间起卦目录、卷二体用生克目录；卷一观梅占短引 |
| 《滴天髓》 | https://zh.wikisource.org/zh-hans/滴天髓 | 五行、天干、月令知识索引；月令论短引 |
| 《子平真诠》 | https://libokang.com/zh-hant/classics/bazi/子平真詮原文/ | 用神/月令的现代整理对照；非权威校勘定本 |
| 《三命通会》 | https://zh.wikisource.org/zh-hans/三命通會 | 十神与命理术语的书目索引；维基文库缺部分卷 |
| 《紫微斗数》（续道藏本） | https://zh.wikisource.org/zh-hant/紫微斗數 | 紫微命盘与宫位的术数背景索引；不直接代表现代 iztro 流派 |
| iztro | https://docs.iztro.com/quick-start | 紫微十二宫排盘算法库文档（非古籍） |
| lunar-typescript | https://github.com/6tail/lunar-typescript | 八字/黄历历法库文档（非古籍） |

## 3. 写作规则

1. 绝不能把 `concepts.summary` 冒充古籍原文或“古籍证明”。
2. 只有 `verifiedQuotes` 内的数据允许标为“已核对短引”；新增引用时必须记录来源网页、版本和准确章节后才能标记。
3. 区分：历法/卦象计算是确定性程序结果；传统象意解释是文化阅读；对现实未来的准确预测尚无科学证据。
4. 不得补写未计算的四柱、紫微星曜、六爻纳甲、应期或大运吉凶。
5. 对包含健康、寿命、婚姻、投资等主题不提供确定性吉凶，提示转向现实信息与专业判断。

维护：`knowledge/build_catalog.py` 通过本项目结构化数据和原创类象摘要生成 `knowledge/catalog.json`；修改后应运行 `python knowledge/build_catalog.py` 并执行 `npm test`。
