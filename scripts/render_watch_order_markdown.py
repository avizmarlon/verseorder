"""Render the single canonical watch sequence from src/data/watch-order.json.

Usage: python scripts/render_watch_order_markdown.py
The editorial JSON is the source of truth. Do not hand-maintain another list.
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'src/data/watch-order.json').read_text(encoding='utf-8'))
items=data['entries']
assert all(e['position']==i for i,e in enumerate(items,1))
assert len({e['id'] for e in items})==len(items)
lines=[
'# VerseOrder — The Ultimate Marvel Multiverse Watch Order','',
'> A narrative viewing order, not an absolute chronology. Updated October 17, 2026; part of the earlier collection still awaits editorial review.', '',
'**Key:** [Optional] = companion title; [External] = legacy film universe; [Alternate universe] = MCU title outside the main timeline; [Currently airing] = season not yet complete.', '',
'## The Watch Order','',
]
last_era=None
for item in items:
    if item['era']!=last_era:
        lines.extend(['',f"### {item['era']}",''])
        last_era=item['era']
    tags=[]
    if item['optional']: tags.append('Optional')
    if item['external']: tags.append('External')
    if item['alternateUniverse']: tags.append('Alternate universe')
    if item.get('releaseStatus')=='releasing':
        n=item['releaseProgress']
        tags.append(f"Currently airing: {n['episodesAvailable']}/{n['episodesTotal']} episodes as of {n['asOf']}")
    tail= ' — ['+' · '.join(tags)+']' if tags else ''
    lines.append(f"{item['position']}. {item['title']}{tail}")
lines.extend(['',f"Total: {len(items)} films, seasons, shorts, and specials. Other titles not selected are listed separately in content/excluded.md."])
(ROOT/'content/watch-order.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(f"Wrote {len(items)} sequenced entries to content/watch-order.md")
