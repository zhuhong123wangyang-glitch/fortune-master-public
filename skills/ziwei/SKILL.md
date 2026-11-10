---
name: fortune-ziwei
description: 紫微斗数十二宫本命星盘与传统象意解读。仅依赖 iztro 本地算法，不猜算星曜、宫位或四化。
---

# 紫微斗数专用 Skill

输入：公历日期 `YYYY-MM-DD`，24小时 `HH:mm`，传统命盘口径 `--gender male|female`，仅 `Asia/Shanghai` 钟表时间。可选 `--fix-leap false`；默认 true。

```bash
node src/cli.mjs ziwei --date 2005-10-01 --time 15:00 --gender female --format html --out output/ziwei.html
```

输出包含 `result.palaces` 12 个宫位的主星、辅星、宫干支及可得的四化字段；V1.5 新增 `result.advanced.natalTransformations`、`lifeSurround`、`transitTransformations`，仅整理 iztro 实际返回的四化与命宫三方四正地支位置；`interpretation.sections` 为分宫规则解读。宫位没有主星时应明确标注“空宫”，不得想象不存在的主星。

**边界**：23:00–23:59 晚子时使用 iztro 索引 12；不支持真太阳时或跨流派；已计算命宫对宫、三合结构，但**未完成**完整飞宫四化、多流派分析或大限逐年断语；不得声称财运、婚姻、疾病或未来必然如何。
