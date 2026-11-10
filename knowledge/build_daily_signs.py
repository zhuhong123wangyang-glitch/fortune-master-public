#!/usr/bin/env python3
"""Build 100 original editorial-draft Chinese cultural fortune slips from a human-readable TSV."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
src = ROOT / 'daily-signs.source.tsv'
signs = []
for raw in src.read_text(encoding='utf-8').splitlines():
    raw = raw.strip()
    if not raw or raw.startswith('#'):
        continue
    cells = raw.split('|')
    if len(cells) != 8:
        raise ValueError(f'Expected 8 fields, got {len(cells)}: {raw}')
    n, title, first, second, theme, meaning, action, grade = cells
    signs.append({
        'id': int(n), 'title': title, 'lines': [first, second],
        'theme': theme, 'grade': grade, 'meaning': meaning, 'action': action,
        'keywords': [theme, title], 'sourceId': 'fortune-master-original-100',
        'editorialStatus': 'original-draft-unreviewed'
    })
assert len(signs) == 100 and [s['id'] for s in signs] == list(range(1, 101))
assert len(set(s['title'] for s in signs)) == 100
assert len(set(''.join(s['lines']) for s in signs)) == 100
assert set(s['grade'] for s in signs) == {'上上', '上吉', '中吉', '中平', '下平'}
payload = {
    'version': '1.0.0',
    'systemId': 'fortune-original-100',
    'systemName': '四时百签 · 原创文化签文',
    'policy': '本库为原创文化内容初稿，尚未通过逐条人工文学审核；非观音灵签、吕祖灵签等传统签本。签等仅为故事/情绪标签，不表示成功率或未来事件概率。',
    'source': {'id':'fortune-master-original-100', 'type':'original', 'title':'Fortune Master 四时百签', 'citationVerified':False, 'traditionalOriginal':False},
    'signs': signs
}
(ROOT / 'daily-signs.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(f"Wrote {len(signs)} original draft signs")
