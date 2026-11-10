---
name: fortune-daily-sign
version: 1.3.1
description: Fortune Master 内置「每日一签 / 问事求签」子技能，使用原创四时百签；本地加密随机首次抽取、自然日内固定、签簿保存、主题解读、可选明确授权的模型追问。
---

# 每日一签 · Daily Sign

该子 Skill 是 Fortune Master V1.3.1 的内置模块，不是一个独立应用。总入口在项目根目录 [`SKILL.md`](../../SKILL.md)。

## 使用判断

- 用户说“每日一签、今日一签、抽签、解签、签诗”：优先询问/推断是每日签还是单独问事；默认每日签。
- 每日签默认不需要出生年月日、姓名、性别、地址；只需要本地匿名档案标识和所选自然日时区。
- 问事求签允许提供问题和解读主题；问题不必包含敏感细节，不默认持久化。
- 查询签诗含义时应优先读取 CLI 返回的 `data.result.sign`、`data.interpretation.sections`，不能自行创造签号或古籍出处。
- 用户想看今日签时，必须调用 `daily-sign --action draw` 或 `--action peek`，不得在模型上下文中随机选号；`draw` 会在首次抽签时写入本机签簿。

## CLI 实例

```bash
# 首次抽签；同日重复调用得到同一签号
node src/cli.mjs daily-sign --action draw --profile local-default --timezone Asia/Shanghai --topic general

# 不产生新签，仅查看今天已有结果
node src/cli.mjs daily-sign --action peek --profile local-default --timezone Asia/Shanghai

# 另起问事签，提问默认不保存到文件
node src/cli.mjs daily-sign --action question --profile local-default --question '今天如何规划复习？' --topic study

# 用户明确同意保存该提问时
node src/cli.mjs daily-sign --action question --profile local-default --question '如何沟通？' --save-question true

# 查看历史签簿
node src/cli.mjs daily-sign --action history --profile local-default

# 导出本次每日签 HTML
node src/cli.mjs daily-sign --action draw --profile local-default --format html --out output/daily-sign.html

# 检索原创签文库
node src/cli.mjs signs --query '清醒' --limit 20

# 离线规则追问（无需 API Key）
node src/cli.mjs sign-followup --profile local-default --record <record-id> --question '这签有什么行动提醒？'
```

## 出处、解释与隐私

签系 `fortune-original-100@1.0.0` 是原创文化签文 **初稿**，尚未经过逐条人工文学审核；**不是** 观音、吕祖、月老等古籍灵签，也不能用「古籍原文」描述。五档签等只是作品风格标签，不表示未来事件的可能性。签文解读应结合现实可验证的小行动，而非医疗、投资、婚姻、法律等结论。

首次随机使用 Node `crypto.randomInt(1, 101)`，生成的签号和签文快照储存在 `data/signbook.json`；原日期（带指定时区）重复调用不重抽。改变时区导致自然日不同可能被视为新的一日，应向用户说明。

本地 HTML / PNG 分享海报不会访问外部图像。外部 LLM 追问 **默认关闭**；只有通过环境变量配置 `FORTUNE_LLM_API_KEY`/`FORTUNE_LLM_MODEL` 且用户主动允许后才会传输签诗和本次追问，不应自动发送个人资料。

详见 `knowledge/daily-signs.source.tsv` 和 `docs/DAILY-SIGN-DESIGN.md`。
