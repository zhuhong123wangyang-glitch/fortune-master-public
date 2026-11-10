---
name: fortune-liuyao
description: 通过三钱或六爻数字计算本卦动爻变卦、京房八宫、纳甲、六亲、世应及可选六神，并进行白话解读。
---

# 六爻起卦与解释

```bash
node src/cli.mjs liuyao --lines 9,8,8,7,7,6 --question "目前如何推进项目？" --format html --out output/liuyao.html
node src/cli.mjs liuyao --coins HHT,TTT,HHH,HTT,HHT,THT --day-stem 甲
```

六个值必须按初爻至上爻传入。报告含本卦传统象意、动爻结构解释、变卦与算法来源，可对应本次问题讨论现实可控因素。V1.5 已实现基础 **京房八宫、纳甲、六亲、世应**；可选择 `--day-stem 甲` 等十天干以计算六神。仍缺**月建日辰、旬空伏神、用神与应期**等规则，不得宣称完整六爻断卦。
