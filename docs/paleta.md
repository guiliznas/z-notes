# Paleta do z-notes

Material **blue-grey** (superfícies/texto) + **amber** (acento), primária **teal** nos ícones.
Fonte de verdade no código: `apps/web/src/index.css` (`:root` + `prefers-color-scheme: dark`).

## Claras

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#f5f5f0` (papel quente, original) | fundo do app |
| `--surface` | `#ffffff` | cards, editor, sidebar |
| `--surface-2` | `#dde5e9` | inputs, faixas secundárias |
| `--surface-hover` | `#cfd8dc` (blue-grey 100) | hover |
| `--text` | `#263238` (blue-grey 900) | texto |
| `--muted` | `#607d8b` (blue-grey 500) | texto secundário |
| `--border` | `#cfd8dc` | bordas |
| `--accent` | `#ffc107` (amber 500) | botões primários (com texto preto), destaques |
| `--accent-soft` | `#ffecb3` (amber 100) | fundos suaves de destaque |
| `--danger` | `#e53935` (red 600) | ações destrutivas |
| `--sidebar` | = `--surface-2` | fundo da barra lateral de pastas |
| `--panel` | = `--surface` | fundo da lista de notas e do editor |

## Escuras (`prefers-color-scheme: dark`)

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#1c1c1e` (grafite original) | fundo do app |
| `--surface` | `#37474f` (blue-grey 800) | cards, editor, sidebar |
| `--surface-2` | `#2e383e` | inputs, faixas secundárias |
| `--surface-hover` | `#455a64` (blue-grey 700) | hover |
| `--text` | `#eceff1` | texto |
| `--muted` | `#b0bec5` | texto secundário |
| `--border` | `#455a64` | bordas |
| `--accent` | `#ffc107` | igual ao claro |
| `--accent-soft` | `#544800` | fundos suaves de destaque no escuro |
| `--danger` | `#ef5350` | ações destrutivas |
| `--sidebar` | `#28282a` | fundo da barra lateral de pastas |
| `--panel` | `#303032` | fundo da lista de notas e do editor |

## Ícones do app (`apps/web/scripts/generate-icons.py`)

| Elemento | Hex |
|---|---|
| Fundo | `#232325` (grafite sólido) |
| Glifo do bloco | `#ffc107` (amber 500, com camada 20% de profundidade) |

Regenerar: `/tmp/iconvenv/bin/python apps/web/scripts/generate-icons.py`
(venv com `cairosvg`; o `public/icons/` resultante entra no build do web).
