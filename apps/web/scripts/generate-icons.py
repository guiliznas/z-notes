"""Gera os ícones do z-notes (PWA + favicon).

Uso:  /tmp/iconvenv/bin/python apps/web/scripts/generate-icons.py
      (venv com cairosvg; ver docs/paleta.md para as cores)
Saída: apps/web/public/icons/{icon.svg,icon-192.png,icon-512.png,maskable-512.png,apple-touch-icon.png}

Design: glifo do bloco de notas (SVG fornecido, paths originais) em âmbar
sobre fundo primário teal. O `maskable-512.png` usa respiro extra (safe zone).
"""

from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"

TEAL_TOP = (0, 150, 167)
TEAL_BOTTOM = (0, 98, 110)
AMBER = "#ffc107"

# Paths do SVG do bloco (originais, só com fill trocado para o âmbar).
GLYPH_PATHS = """
<path opacity="0.2" d="M14.0023 22.9725L22.5834 13.9667H22.5507C22.6943 13.8135 22.7725 13.6104 22.7685 13.4005V8.43474C22.7726 6.76856 22.1595 5.15989 21.0474 3.91912C19.9354 2.67836 18.4032 1.89342 16.7465 1.71577L15.113 1.68311H8.79699L7.16354 1.71577C5.52731 1.9246 4.02291 2.72145 2.93091 3.95772C1.8389 5.19399 1.23386 6.78525 1.22863 8.43474V16.4605C1.23151 18.2502 1.94377 19.9659 3.20932 21.2314C4.47487 22.497 6.1905 23.2092 7.98026 23.2121H13.4251C13.5332 23.2182 13.6412 23.1998 13.7411 23.1583C13.841 23.1168 13.9303 23.0533 14.0023 22.9725Z" fill="#ffc107"/>
<path d="M16.8818 9.4765H7.00821C6.78708 9.4765 6.57501 9.38865 6.41864 9.23229C6.26228 9.07593 6.17444 8.86386 6.17444 8.64273C6.17444 8.4216 6.26228 8.20953 6.41864 8.05317C6.57501 7.89681 6.78708 7.80896 7.00821 7.80896H16.8818C17.1029 7.80896 17.315 7.89681 17.4713 8.05317C17.6277 8.20953 17.7155 8.4216 17.7155 8.64273C17.7155 8.86386 17.6277 9.07593 17.4713 9.23229C17.315 9.38865 17.1029 9.4765 16.8818 9.4765ZM10.8918 13.02H7.07403C6.8529 13.02 6.64083 13.1078 6.48447 13.2642C6.32811 13.4206 6.24026 13.6326 6.24026 13.8538C6.24026 14.0749 6.32811 14.287 6.48447 14.4433C6.64083 14.5997 6.8529 14.6875 7.07403 14.6875H10.8918C11.1129 14.6875 11.325 14.5997 11.4814 14.4433C11.6377 14.287 11.7256 14.0749 11.7256 13.8538C11.7256 13.6326 11.6377 13.4206 11.4814 13.2642C11.325 13.1078 11.1129 13.02 10.8918 13.02ZM22.6633 13.9964L14.0184 23.0691C13.9459 23.1505 13.856 23.2145 13.7553 23.2563C13.6546 23.298 13.5458 23.3166 13.437 23.3104H7.95168C6.14863 23.3075 4.42025 22.59 3.1453 21.315C1.87035 20.0401 1.1528 18.3117 1.1499 16.5087V8.42332C1.15517 6.76158 1.76471 5.1585 2.86482 3.91305C3.96493 2.6676 5.48051 1.86483 7.12888 1.65445V1.52281C7.12888 1.30459 7.21557 1.09531 7.36987 0.941003C7.52418 0.786699 7.73346 0.700012 7.95168 0.700012C8.1699 0.700012 8.37918 0.786699 8.53348 0.941003C8.68779 1.09531 8.77447 1.30459 8.77447 1.52281V1.62154H15.1374V1.52281C15.1374 1.30459 15.2241 1.09531 15.3784 0.941003C15.5327 0.786699 15.742 0.700012 15.9602 0.700012C16.1784 0.700012 16.3877 0.786699 16.542 0.941003C16.6963 1.09531 16.783 1.30459 16.783 1.52281V1.65445C18.452 1.83342 19.9956 2.62419 21.1159 3.87417C22.2362 5.12415 22.8539 6.74476 22.8498 8.42332V13.4259C22.8537 13.6374 22.775 13.8421 22.6304 13.9964H22.6633ZM12.5374 18.264C12.4931 16.8108 13.0274 15.3995 14.023 14.3401C15.0186 13.2808 16.3941 12.6599 17.8472 12.6141H21.2042V8.42332C21.2136 7.18718 20.7739 5.98965 19.9668 5.05336C19.1596 4.11707 18.04 3.50572 16.8159 3.33296V3.53043C16.8159 3.74865 16.7292 3.95793 16.5749 4.11223C16.4206 4.26654 16.2114 4.35322 15.9931 4.35322C15.7749 4.35322 15.5656 4.26654 15.4113 4.11223C15.257 3.95793 15.1703 3.74865 15.1703 3.53043V3.23422H8.77447V3.49752C8.77447 3.71574 8.68779 3.92502 8.53348 4.07932C8.37918 4.23362 8.1699 4.32031 7.95168 4.32031C7.73346 4.32031 7.52418 4.23362 7.36987 4.07932C7.21557 3.92502 7.12888 3.71574 7.12888 3.49752V3.33296C5.91152 3.52084 4.80101 4.13653 3.99673 5.06949C3.19246 6.00245 2.7471 7.19156 2.74064 8.42332V16.5416C2.74354 17.9082 3.28771 19.218 4.25405 20.1843C5.2204 21.1507 6.53021 21.6949 7.89683 21.6978H12.5703L12.5374 18.264ZM17.913 14.2048C16.9013 14.2307 15.941 14.6561 15.2421 15.3879C14.5431 16.1198 14.1624 17.0986 14.183 18.1104V20.4581L20.1071 14.2048H17.913Z" fill="#ffc107"/>
"""  # noqa: E501


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def background(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(size - 1, 1)
        draw.line([(0, y), (size, y)], fill=tuple(lerp(TEAL_TOP[i], TEAL_BOTTOM[i], t) for i in range(3)))
    return img.convert("RGBA")


def glyph_png(px: int) -> Image.Image:
    from io import BytesIO

    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">{GLYPH_PATHS}</svg>'
    data = cairosvg.svg2png(bytestring=svg.encode(), output_width=px, output_height=px)
    img = Image.open(BytesIO(data))
    # cairosvg sem fundo pode sair P (paleta): normaliza para RGBA.
    return img.convert("RGBA") if img.mode != "RGBA" else img


def make_icon(size: int, glyph_ratio: float) -> Image.Image:
    img = background(size)
    glyph = glyph_png(int(size * glyph_ratio))
    img.alpha_composite(glyph, (int((size - glyph.width) / 2), int((size - glyph.height) / 2)))
    return img.convert("RGB")


SVG_DOC = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0096a7"/>
      <stop offset="1" stop-color="#00626e"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(82,82) scale(14.5)">{GLYPH_PATHS}</g>
</svg>
"""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "icon.svg").write_text(SVG_DOC, encoding="utf-8")
    make_icon(192, 0.68).save(OUT / "icon-192.png")
    make_icon(512, 0.68).save(OUT / "icon-512.png")
    make_icon(512, 0.52).save(OUT / "maskable-512.png")
    make_icon(180, 0.68).save(OUT / "apple-touch-icon.png")
    print("OK:", sorted(p.name for p in OUT.iterdir()))


if __name__ == "__main__":
    main()
