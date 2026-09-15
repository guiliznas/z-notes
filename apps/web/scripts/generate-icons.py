"""Gera os ícones do z-notes (PWA + favicon) com Pillow, sem dependências externas.

Uso:  python3 apps/web/scripts/generate-icons.py
Saída: apps/web/public/icons/{icon.svg,icon-192.png,icon-512.png,maskable-512.png,apple-touch-icon.png}

Design original: folha de nota dourada com canto dobrado sobre fundo grafite.
O `maskable-512.png` usa o mesmo desenho com respiro extra (safe zone ~80px).
"""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"

BG_TOP = (48, 48, 52)
BG_BOTTOM = (24, 24, 26)
GOLD = (217, 165, 32)
GOLD_DARK = (176, 130, 20)
INK = (28, 28, 30)
RADIUS = 48


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def background(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(size - 1, 1)
        draw.line([(0, y), (size, y)], fill=tuple(lerp(BG_TOP[i], BG_BOTTOM[i], t) for i in range(3)))
    return img


def sheet(draw: ImageDraw.ImageDraw, size: int, pad: int) -> None:
    """Folha com canto superior direito dobrado."""
    x0, y0 = pad, pad
    x1, y1 = size - pad, size - pad
    fold = (x1 - x0) * 0.22
    draw.rounded_rectangle([x0, y0, x1, y1], radius=RADIUS * size / 512, fill=GOLD)
    # canto superior direito quadrado para receber a dobra
    draw.rectangle([x1 - fold, y0, x1, y0 + fold], fill=GOLD)
    # dobra
    draw.polygon([(x1 - fold, y0), (x1, y0), (x1, y0 + fold)], fill=GOLD_DARK)
    draw.line([(x1 - fold, y0), (x1, y0 + fold)], fill=(120, 88, 12), width=max(2, size // 128))
    # linhas de texto
    lx0 = x0 + (x1 - x0) * 0.18
    lx1 = x1 - (x1 - x0) * 0.18
    top = y0 + (y1 - y0) * 0.38
    gap = (y1 - y0) * 0.13
    thick = max(3, size // 42)
    for i in range(3):
        y = top + i * gap
        end = lx1 if i < 2 else lx0 + (lx1 - lx0) * 0.55
        draw.line([(lx0, y), (end, y)], fill=INK, width=thick)


def make_icon(size: int, pad_ratio: float) -> Image.Image:
    img = background(size)
    sheet(ImageDraw.Draw(img), size, int(size * pad_ratio))
    return img


SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#303034"/>
      <stop offset="1" stop-color="#18181a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g>
    <path d="M136 384 V124 Q136 96 164 96 H324 L376 148 V388 Q376 416 348 416 H164 Q136 416 136 388 Z" fill="#d9a520"/>
    <polygon points="324,96 376,96 376,148" fill="#b08214"/>
    <g stroke="#1c1c1e" stroke-width="12" stroke-linecap="round">
      <line x1="179" y1="249" x2="333" y2="249"/>
      <line x1="179" y1="291" x2="333" y2="291"/>
      <line x1="179" y1="333" x2="262" y2="333"/>
    </g>
  </g>
</svg>
"""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "icon.svg").write_text(SVG, encoding="utf-8")
    make_icon(192, 0.16).save(OUT / "icon-192.png")
    make_icon(512, 0.16).save(OUT / "icon-512.png")
    make_icon(512, 0.24).save(OUT / "maskable-512.png")
    make_icon(180, 0.16).save(OUT / "apple-touch-icon.png")
    print("OK:", sorted(p.name for p in OUT.iterdir()))


if __name__ == "__main__":
    main()
