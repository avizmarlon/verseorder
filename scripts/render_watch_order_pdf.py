"""Render the public single-sequence PDF from src/data/watch-order.json.
Requires reportlab: python -m pip install reportlab
Run: python scripts/render_watch_order_pdf.py
"""
from __future__ import annotations
import json
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "src/data/watch-order.json").read_text(encoding="utf-8"))
OUTPUT = ROOT / "public/verseorder-watch-order.pdf"

def register_fonts() -> tuple[str, str]:
    fonts_dir = Path("C:/Windows/Fonts")
    if fonts_dir.exists() and (fonts_dir / "arial.ttf").exists():
        pdfmetrics.registerFont(TTFont("VerseRegular", str(fonts_dir / "arial.ttf")))
        pdfmetrics.registerFont(TTFont("VerseBold", str(fonts_dir / "arialbd.ttf")))
        return "VerseRegular", "VerseBold"
    return "Helvetica", "Helvetica-Bold"

def main() -> None:
    regular, bold = register_fonts()
    W, H = A4
    c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    c.setTitle("VerseOrder - The Ultimate Marvel Multiverse Watch Order")
    c.setAuthor("VerseOrder")
    page = 0
    y = 0

    def paint_page(first: bool = False) -> None:
        nonlocal page, y
        if page:
            finish_page()
            c.showPage()
        page += 1
        c.setFillColor(HexColor("#080C15"))
        c.rect(0, 0, W, H, fill=1, stroke=0)
        c.setFillColor(HexColor("#EE6F75"))
        c.circle(43, H - 40, 6, fill=1, stroke=0)
        c.setFont(bold, 15)
        c.setFillColor(HexColor("#F4F6FA"))
        c.drawString(58, H - 45, "VERSEORDER")
        c.setFont(regular, 8)
        c.setFillColor(HexColor("#9C9FAE"))
        c.drawRightString(W - 44, H - 43, "THE ULTIMATE MARVEL MULTIVERSE WATCH ORDER")
        c.setStrokeColor(HexColor("#3A4156"))
        c.line(42, H - 59, W - 42, H - 59)
        y = H - 85
        if first:
            c.setFillColor(HexColor("#F6F5FA"))
            c.setFont(bold, 30)
            c.drawString(42, y - 19, "A SINGLE WATCH ORDER")
            y -= 53
            c.setFont(regular, 10)
            c.setFillColor(HexColor("#ABB0C1"))
            c.drawString(42, y, f"Uma jornada. {len(DATA['entries'])} entradas. Curadoria narrativa, não cronologia absoluta.")
            y -= 22
            c.setFont(regular, 8.3)
            c.setFillColor(HexColor("#9BA1B0"))
            c.drawString(42, y, "Revisada em 17/10/2026. O acervo original segue em revisão editorial.")
            y -= 27
            c.setFillColor(HexColor("#DBB7B8"))
            c.setFont(regular, 8)
            c.drawString(42, y, "OPCIONAL = enriquecimento · EXTERNO = legado · ALTERNATIVO = outra realidade MCU")
            y -= 35

    def finish_page() -> None:
        c.setStrokeColor(HexColor("#30374A"))
        c.line(42, 46, W - 42, 46)
        c.setFont(regular, 8)
        c.setFillColor(HexColor("#888E9F"))
        c.drawString(42, 31, "Independent fan-curated guide · verseorder")
        c.drawRightString(W - 42, 31, f"PAGE {page:02d}")

    def ensure(space: float) -> None:
        if y - space < 65:
            paint_page()

    def section(label: str) -> None:
        nonlocal y
        ensure(56)
        y -= 19
        c.setFillColor(HexColor("#EE777F"))
        c.rect(42, y - 9, 3, 18, stroke=0, fill=1)
        c.setFont(bold, 11.3)
        c.setFillColor(HexColor("#F0EAF0"))
        c.drawString(53, y - 4, label.upper())
        y -= 27

    def entry(row: dict) -> None:
        nonlocal y
        title = str(row["title"])
        flags = []
        if row["optional"]: flags.append("OPCIONAL")
        if row["external"]: flags.append("EXTERNO")
        if row["alternateUniverse"]: flags.append("ALTERNATIVO")
        if row.get("releaseStatus")=="releasing":
            progress=row.get("releaseProgress",{})
            flags.append(f"EM EXIBICAO ({progress.get('episodesAvailable','?')}/{progress.get('episodesTotal','?')} EP.)")
        chunks = simpleSplit(title, bold, 10.5, W - 125)
        height = max(29, len(chunks) * 15 + (13 if flags else 6))
        ensure(height)
        c.setFont(bold, 9.2)
        c.setFillColor(HexColor("#EE888C"))
        c.drawString(44, y, f'{row["position"]:03d}')
        for i, line in enumerate(chunks):
            c.setFillColor(HexColor("#ECEFF7"))
            c.setFont(bold, 10.5)
            c.drawString(84, y - i * 15, line)
        if flags:
            c.setFillColor(HexColor("#94A5BC"))
            c.setFont(regular, 7.5)
            c.drawString(84, y - len(chunks) * 15 + 3, " · ".join(flags))
        y -= height
        c.setStrokeColor(HexColor("#1B2638"))
        c.line(44, y + 5, W - 44, y + 5)

    paint_page(first=True)
    previous = None
    for row in DATA["entries"]:
        if row["era"] != previous:
            section(row["era"])
            previous = row["era"]
        entry(row)
    finish_page()
    c.save()
    print(f"Exported {len(DATA['entries'])} entries across {page} PDF pages: {OUTPUT}")

if __name__ == "__main__":
    main()
