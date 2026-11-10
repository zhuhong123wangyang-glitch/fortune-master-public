---
name: fortune-bazi
description: 确定性八字四柱、十神、五行、大运计算并提供分层传统象意解读。
---

# 八字四柱高级解读

输入公历生辰、时间、传统排运性别；仅支持 Asia/Shanghai，不校正出生经度：

```bash
node src/cli.mjs bazi --date 2005-10-01 --time 15:00 --gender female --format html --out output/bazi.html
```

利用实际 `result.pillars`、`observedFiveElements`、`luck` 输出八层报告：日主与四柱、月令、五行、十神、事业、资源、大运与解释边界。参考 `interpretation.sections`、`interpretation.advanced` 与 `references`。V1.5 的 `result.patternObservation` 仅识别月令本气透干的格局候选、同五行藏干通根与季令线索。不能将五行计数等同五行旺衰、缺五行、喜用神，也不能根据命盘预测疾病、收入或婚期。
