# Paleta do z-notes

Material **blue-grey** (superfícies/texto) + **amber** (acento), primária **teal** nos ícones.
Fonte de verdade no código: `apps/web/src/index.css` (`:root` + `prefers-color-scheme: dark`).

## Claras

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#f5f5f0` (papel quente, original) | fundo do app |
| `--surface` | `#ffffff` | cards, editor, sidebar |
| `--surface-2` | `#dde5e9` | inputs, faixas secundárias |
| `--surface-hover` | `#e1e8eb` | hover e item ativo da barra lateral |
| `--text` | `#263238` (blue-grey 900) | texto |
| `--muted` | `#546e7a` (blue-grey 600) | texto secundário (contraste AA sobre branco e sobre `--sidebar`) |
| `--border` | `#e3e9ec` | bordas e divisórias da lista |
| `--accent` | `#ffc107` (amber 500) | botões primários (com texto preto), destaques |
| `--accent-soft` | `#fff4cf` | nota selecionada na lista, destaque de busca |
| `--danger` | `#e53935` (red 600) | ações destrutivas |
| `--sidebar` | `#eef1f2` | fundo da barra lateral e dos campos de busca |
| `--panel` | = `--surface` | fundo da lista de notas e do editor |

## Escuras (`prefers-color-scheme: dark`)

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#1c1c1e` (grafite original) | fundo do app |
| `--surface` | `#37474f` (blue-grey 800) | cards, editor, sidebar |
| `--surface-2` | `#2e383e` | inputs, faixas secundárias |
| `--surface-hover` | `#3a3a3d` | hover e item ativo da barra lateral |
| `--text` | `#eceff1` | texto |
| `--muted` | `#b0bec5` | texto secundário |
| `--border` | `#414144` | bordas e divisórias da lista |
| `--accent` | `#ffc107` | igual ao claro |
| `--accent-soft` | `#4a4120` | nota selecionada na lista no escuro |
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
