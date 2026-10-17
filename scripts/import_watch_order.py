"""One-time importer for the original curated Markdown.
Usage: python scripts/import_watch_order.py path/to/marvel-timeline.md
The public JSON and Markdown are intentionally free of private working notes.
"""
from __future__ import annotations
import argparse
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SECTION_NAMES = {
    "Pré-MCU moderno (século 13 a.C. a 1995)": "Origins / Origens",
    "Início da Iniciativa Vingadores (2010-2013)": "The Avengers Initiative / Iniciativa Vingadores",
    "Era pré-Ultron (2014-2015)": "The World Expands / Um mundo em expansão",
    "Rumo à Guerra do Infinito (2016-2019)": "Road to Infinity / Rumo ao Infinito",
    "Pós-Endgame, início do Multiverso (2023-2024)": "A Fractured Reality / Realidades fragmentadas",
    "BLOCO SONY SPIDER-MAN — antes de No Way Home": "The Spider-Man Legacy / Legado do Homem-Aranha",
    "Volta pro MCU + fechamento Venom": "Converging Worlds / Mundos convergentes",
    "BLOCO SPIDER-VERSE — opcional recomendado": "Beyond the Spider-Verse / Além do Aranhaverso",
    "Volta ao MCU (2024-2025)": "After the Rift / Depois da ruptura",
    "Fase 5 in-universe (2026)": "A New Era / Nova era",
    "BLOCO BLADE + DAREDEVIL 2003 + FF ANTIGOS — antes de Deadpool & Wolverine": "Legacy Heroes / Heróis de outras eras",
    "BLOCO X-MEN/FOX — antes de Deadpool & Wolverine (ordem B: timeline/reset)": "The Mutant Legacy / Legado mutante",
    "Volta ao MCU": "The Multiverse Collides / Colisão de universos",
    "Fase 6 in-universe (2027-)": "What Comes Next / O que vem depois",
}
WHY = {
    "Spider-Man: No Way Home": {
        "en": "The earlier Spider-Man and Venom stories are placed just before this entry so the multiverse payoff carries more weight.",
        "pt-BR": "As histórias anteriores do Homem-Aranha e Venom entram logo antes para ampliar o impacto narrativo do encontro entre universos.",
    },
    "Logan": {
        "en": "Placed immediately before Deadpool & Wolverine to preserve the emotional weight of the characters' journey.",
        "pt-BR": "Posicionado imediatamente antes de Deadpool & Wolverine para preservar o peso emocional da jornada dos personagens.",
    },
    "X-Men: Days of Future Past": {
        "en": "Watching the original story first makes the consequences of this turning point more meaningful.",
        "pt-BR": "Conhecer a história original primeiro torna as consequências deste ponto de virada mais significativas.",
    },
    "Spider-Man: Into the Spider-Verse": {
        "en": "An optional companion that offers a fresh perspective on parallel realities before the next multiverse stories.",
        "pt-BR": "Uma companhia opcional que oferece outra perspectiva sobre realidades paralelas antes das próximas histórias multiversais.",
    },
    "The Amazing Spider-Man 2 (2014)": {
        "en": "This story does not resolve every arc on its own; the later multiverse films provide additional context.",
        "pt-BR": "Esta história não encerra todos os seus arcos; filmes multiversais posteriores acrescentam contexto.",
    },
}
SEASON_RE = re.compile(r"\bT([1-9])\b")
TV = {"The Defenders", "WandaVision", "The Falcon and the Winter Soldier", "Hawkeye", "Moon Knight", "Echo", "She-Hulk: Attorney at Law", "Ms. Marvel", "Ironheart", "Secret Invasion", "Agatha All Along", "Wonder Man", "Marvel Zombies", "Eyes of Wakanda"}
SPECIAL = {"Werewolf by Night", "The Guardians of the Galaxy Holiday Special", "The Punisher: One Last Kill"}

def slug(value: str) -> str:
    norm = unicodedata.normalize("NFKD", value.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", norm)).strip("-")

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path)
    args = ap.parse_args()
    raw = args.source.read_text(encoding="utf-8-sig")
    assert "## LISTA 1" in raw and "## LISTA 2" in raw and "## Fica de Fora" in raw
    timeline = raw.split("## LISTA 1", 1)[1].split("## LISTA 2", 1)[0]
    excluded = raw.split("## Fica de Fora", 1)[1].split("## Recomendação de uso", 1)[0]
    phase = "Origins / Origens"
    entries: list[dict] = []
    headings: list[tuple[int, str]] = []
    for line in timeline.splitlines():
        stripped = line.strip()
        if stripped.startswith("### "):
            phase_orig = stripped[4:].strip()
            phase = SECTION_NAMES.get(phase_orig, phase_orig.replace("BLOCO ", ""))
            headings.append((len(entries) + 1, phase))
            continue
        match = re.match(r"^(\d+)\.\s+(.+)$", stripped)
        if not match:
            continue
        order, original = int(match[1]), match[2]
        assert order == len(entries) + 1, f"Gap or duplicate at {order}"
        optional = "[Opcional recomendado]" in original
        external = "[Externo]" in original
        alternate = "[Universo alternativo oficial]" in original
        title = re.split(r"\s+—\s+", original, 1)[0].strip()
        notes = re.findall(r"\[NOTA:\s*(.*?)\]", original)
        season = SEASON_RE.search(title)
        kind = "short" if "Marvel One-Shot" in title else ("special" if title in SPECIAL else ("series" if season or title in TV else "movie"))
        universe = "Spider-Verse" if "Spider-Verse" in title else ("Legacy / Sony / Fox" if external else ("Alternate MCU" if alternate else "MCU"))
        slug_base = slug(title)
        entries.append({
            "id": slug_base, "position": order, "title": title, "kind": kind,
            "era": phase, "universe": universe, "optional": optional,
            "external": external, "alternateUniverse": alternate,
            "note": " ".join(notes), "whyHere": WHY.get(title, None),
            "trailerYouTubeId": None, "posterPath": None,
            "verification": "original-curation-unreviewed",
        })
    if len(entries) != 110:
        raise RuntimeError(f"Expected 110 curated entries, got {len(entries)}")
    if len({entry["id"] for entry in entries}) != len(entries):
        raise RuntimeError("Duplicate entry IDs: examine titles")
    result = {
        "name": "VerseOrder",
        "subtitle": "The Ultimate Marvel Multiverse Watch Order",
        "sourceDate": "2026-07-07",
        "importedDate": "2026-10-17",
        "editorialStatus": "baseline-unreviewed",
        "editorialNotice": {
            "en": "Initial curated order imported from a July 2026 snapshot. New releases and story placements still require editorial verification.",
            "pt-BR": "Ordem inicial importada de uma curadoria de julho de 2026. Lançamentos e posicionamentos ainda precisam de revisão editorial.",
        },
        "entries": entries,
    }
    (ROOT / "src" / "data").mkdir(parents=True, exist_ok=True)
    (ROOT / "content").mkdir(parents=True, exist_ok=True)
    (ROOT / "src" / "data" / "watch-order.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md = [
        "# VerseOrder — The Ultimate Marvel Multiverse Watch Order",
        "",
        "> Curadoria narrativa, não cronologia absoluta. Base de julho de 2026 ainda em revisão editorial.",
        "",
        "Legenda: [Opcional] = enriquecimento opcional; [Externo] = fora da timeline principal do MCU; [Universo alternativo] = produção MCU fora da Terra principal.",
        "",
        "## Ordem única para assistir", "",
    ]
    phase_by_position = dict(headings)
    for entry in entries:
        if entry["position"] in phase_by_position:
            md += ["", f"### {phase_by_position[entry['position']]}", ""]
        tags = []
        if entry["optional"]: tags.append("Opcional")
        if entry["external"]: tags.append("Externo")
        if entry["alternateUniverse"]: tags.append("Universo alternativo")
        trail = "  [" + " · ".join(tags) + "]" if tags else ""
        md.append(f"{entry['position']}. {entry['title']}{trail}")
    (ROOT / "content" / "watch-order.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    (ROOT / "content" / "excluded.md").write_text(
        "# Produções fora da curadoria principal\n\n"
        "Estas obras não entram na ordem principal nesta versão; exclusão não é julgamento de qualidade. "
        "A lista pode mudar com novas conexões narrativas ou propostas da comunidade.\n\n"
        + excluded.strip() + "\n", encoding="utf-8")
    print(f"Imported {len(entries)} unique entries across {len(headings)} sections. Exclusions stored separately.")

if __name__ == "__main__":
    main()
