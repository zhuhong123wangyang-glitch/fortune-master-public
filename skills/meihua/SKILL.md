---
name: fortune-meihua
description: 三数字梅花易数起卦，本卦、互卦、变卦及体用五行生克的传统类象解读。
---

# 梅花易数解读

```bash
node src/cli.mjs meihua --numbers 3,5,2 --question "合作安排" --format html --out output/meihua.html
```

采用数字一、二分别除八取余对应上/下卦，数字三除六取余确定动爻。互卦按本卦内爻组合；体为未动一卦、用为动的一卦。展示 `体克用 / 用克体 / 体生用 / 用生体 / 比和` 象意，但**不自动断定吉凶、成功率、应期**，也不混用时间起卦流派。
