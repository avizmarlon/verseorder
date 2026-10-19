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
'# VerseOrder: The Ultimate Marvel Multiverse Watch Order','',
'> The order where the story makes the most sense, not strict in-universe chronology. Updated October 17, 2026. Some of the older picks are still getting a second look.', '',
'**What the tags mean**', '',
'- **Optional**: nice extra, skip it if you want',
'- **Legacy**: Marvel movie from outside the MCU (Sony, Fox and older ones)',
'- **Alternate universe**: MCU story outside the main timeline',
'- **Currently airing**: season still coming out', '',
'## The list','',
]
last_era=None
for item in items:
    if item['era']!=last_era:
        lines.extend(['',f"### {item['era']}",''])
        last_era=item['era']
    tags=[]
    if item['optional']: tags.append('Optional')
    if item['external']: tags.append('Legacy')
    if item['alternateUniverse']: tags.append('Alternate universe')
    if item.get('releaseStatus')=='releasing':
        n=item['releaseProgress']
        tags.append(f"Currently airing: {n['episodesAvailable']}/{n['episodesTotal']} episodes as of {n['asOf']}")
    tail= ' ['+' · '.join(tags)+']' if tags else ''
    lines.append(f"{item['position']}. {item['title']}{tail}")
lines.extend(['',f"That's {len(items)} movies, seasons, shorts and specials. Wondering about something that isn't here? Check [what's left out](excluded.md)."])
(ROOT/'content/watch-order.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(f"Wrote {len(items)} sequenced entries to content/watch-order.md")
