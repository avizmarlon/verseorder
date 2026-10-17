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
'> Ordem de experiência narrativa, não cronologia absoluta. Atualizada em 17/10/2026; parte do acervo anterior ainda aguarda revisão editorial.', '',
'**Legenda:** [Opcional] = obra complementar; [Externo] = universo cinematográfico legado; [Universo alternativo] = obra MCU fora da linha principal; [Em exibição] = temporada ainda não concluída.', '',
'## Ordem única para assistir','',
]
last_era=None
for item in items:
    if item['era']!=last_era:
        lines.extend(['',f"### {item['era']}",''])
        last_era=item['era']
    tags=[]
    if item['optional']: tags.append('Opcional')
    if item['external']: tags.append('Externo')
    if item['alternateUniverse']: tags.append('Universo alternativo')
    if item.get('releaseStatus')=='releasing':
        n=item['releaseProgress']
        tags.append(f"Em exibição: {n['episodesAvailable']}/{n['episodesTotal']} episódios em {n['asOf']}")
    tail= ' — ['+' · '.join(tags)+']' if tags else ''
    lines.append(f"{item['position']}. {item['title']}{tail}")
lines.extend(['',f"Total: {len(items)} obras/temporadas/especiais. Outras produções não selecionadas estão registradas separadamente em content/excluded.md."])
(ROOT/'content/watch-order.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(f"Wrote {len(items)} sequenced entries to content/watch-order.md")
