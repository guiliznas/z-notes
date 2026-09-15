"""Gera os ícones do z-notes (PWA + favicon) com Pillow, sem dependências externas.

Uso:  python3 apps/web/scripts/generate-icons.py
Saída: apps/web/public/icons/{icon.svg,icon-192.png,icon-512.png,maskable-512.png,apple-touch-icon.png}

Design: folha de nota âmbar de cantos bem arredondados com lápis na diagonal,
sobre fundo primário teal (#0096a7). Paleta: Material blue-grey/amber.
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"

TEAL_TOP = (0, 150, 167)
TEAL_BOTTOM = (0, 98, 110)
AMBER = (255, 193, 7)
AMBER_DARK = (214, 158, 0)
AMBER_LINE = (168, 123, 0)
SLATE = (55, 71, 79)
SLATE_DARK = (38, 50, 56)
WOOD = (232, 197, 148)
SILVER = (176, 190, 197)
ERASER = (217, 140, 140)


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def background(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(size - 1, 1)
        draw.line([(0, y), (size, y)], fill=tuple(lerp(TEAL_TOP[i], TEAL_BOTTOM[i], t) for i in range(3)))
    return img


def sheet(draw: ImageDraw.ImageDraw, size: int, pad: int) -> tuple[int, int, int, int]:
    """Folha âmbar de cantos bem curvos com dobra. Retorna (x0, y0, x1, y1)."""
    x0, y0 = pad, pad
    x1, y1 = size - pad, size - pad
    radius = int((x1 - x0) * 0.20)
    fold = (x1 - x0) * 0.20
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=AMBER)
    # canto superior direito quadrado para receber a dobra
    draw.rectangle([x1 - fold, y0, x1, y0 + fold], fill=AMBER)
    draw.polygon([(x1 - fold, y0), (x1, y0), (x1, y0 + fold)], fill=AMBER_DARK)
    draw.line([(x1 - fold, y0), (x1, y0 + fold)], fill=AMBER_LINE, width=max(2, size // 170))
    # duas linhas de texto (o lápis cobre a parte de baixo)
    lx0 = x0 + (x1 - x0) * 0.18
    lx1 = x1 - (x1 - x0) * 0.18
    top = y0 + (y1 - y0) * 0.34
    gap = (y1 - y0) * 0.13
    thick = max(3, size // 42)
    for i in range(2):
        y = top + i * gap
        draw.line([(lx0, y), (lx1, y)], fill=SLATE, width=thick)
    return x0, y0, x1, y1


def pencil_layer(size: int, box: tuple[int, int, int, int]) -> Image.Image:
    """Lápis horizontal apontando para a esquerda, depois rotacionado."""
    x0, y0, x1, y1 = box
    mx, my = (x1 - x0) * 0.16, (y1 - y0) * 0.16
    ix0, iy0, ix1, iy1 = x0 + mx, y0 + my, x1 - mx, y1 - my
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cy = (iy0 + iy1) / 2
    half = (iy1 - iy0) * 0.075
    tip_x = ix0
    nose_x = ix0 + (ix1 - ix0) * 0.12
    tail_x = ix1
    ferrule_x = tail_x - (ix1 - ix0) * 0.16
    # corpo
    d.rounded_rectangle([nose_x, cy - half, ferrule_x, cy + half], radius=int(half), fill=SLATE)
    # virola + borracha
    d.rectangle([ferrule_x, cy - half, ferrule_x + half * 0.7, cy + half], fill=SILVER)
    d.rounded_rectangle(
        [ferrule_x + half * 0.7, cy - half, tail_x, cy + half], radius=int(half), fill=ERASER
    )
    # ponta de madeira + grafite
    d.polygon([(nose_x, cy - half), (nose_x, cy + half), (tip_x, cy)], fill=WOOD)
    gx = nose_x - (nose_x - tip_x) * 0.45
    gw = half * 0.45
    d.polygon([(gx, cy - gw), (gx, cy + gw), (tip_x, cy)], fill=SLATE_DARK)
    return layer.rotate(-38, resample=Image.BICUBIC, center=((x0 + x1) / 2, (y0 + y1) / 2))


def make_icon(size: int, pad_ratio: float) -> Image.Image:
    img = background(size).convert("RGBA")
    box = sheet(ImageDraw.Draw(img), size, int(size * pad_ratio))
    img.alpha_composite(pencil_layer(size, box))
    return img.convert("RGB")


def hex(rgb: tuple[int, int, int]) -> str:
    return "#%02x%02x%02x" % rgb


SVG = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{hex(TEAL_TOP)}"/>
      <stop offset="1" stop-color="{hex(TEAL_BOTTOM)}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g>
    <path d="M82 410 V150 Q82 82 150 82 H330 L430 182 V442 Q430 410 398 410 H114 Q82 410 82 378 Z" fill="{hex(AMBER)}"/>
    <polygon points="330,82 430,82 430,182" fill="{hex(AMBER_DARK)}"/>
    <g stroke="{hex(SLATE)}" stroke-width="13" stroke-linecap="round">
      <line x1="145" y1="222" x2="367" y2="222"/>
      <line x1="145" y1="266" x2="367" y2="266"/>
    </g>
    <g transform="rotate(-38 256 281)">
      <rect x="150" y="262" width="150" height="38" rx="19" fill="{hex(SLATE)}"/>
      <rect x="300" y="262" width="14" height="38" fill="{hex(SILVER)}"/>
      <rect x="314" y="262" width="38" height="38" rx="19" fill="{hex(ERASER)}"/>
      <polygon points="150,262 150,300 100,281" fill="{hex(WOOD)}"/>
      <polygon points="125,273 125,289 100,281" fill="{hex(SLATE_DARK)}"/>
    </g>
  </g>
</svg>
"""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "icon.svg").write_text(SVG, encoding="utf-8")
    make_icon(192, 0.15).save(OUT / "icon-192.png")
    make_icon(512, 0.15).save(OUT / "icon-512.png")
    make_icon(512, 0.24).save(OUT / "maskable-512.png")
    make_icon(180, 0.15).save(OUT / "apple-touch-icon.png")
    print("OK:", sorted(p.name for p in OUT.iterdir()))


if __name__ == "__main__":
    main()
