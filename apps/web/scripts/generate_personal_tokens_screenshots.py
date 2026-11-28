import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs("docs/screenshots", exist_ok=True)

# Cores do tema z-notes (paleta.md)
BG_LIGHT = (245, 245, 240)
SURFACE_LIGHT = (255, 255, 255)
SURFACE_2_LIGHT = (235, 239, 241)
TEXT_LIGHT = (38, 50, 56)
MUTED_LIGHT = (100, 116, 125)
BORDER_LIGHT = (220, 226, 230)
ACCENT = (255, 193, 7) # Amber 500
ACCENT_BG = (255, 244, 207)
ACCENT_BORDER = (255, 214, 102)

EMERALD_BG = (209, 250, 229)
EMERALD_TEXT = (6, 95, 70)
RED_BG = (254, 226, 226)
RED_TEXT = (153, 27, 27)

font = ImageFont.load_default()

def create_personal_tokens_modal():
    img = Image.new("RGB", (1280, 800), (40, 40, 40)) # Backdrop escurecido com modal no centro
    draw = ImageDraw.Draw(img)

    # Modal container centralizado (largura 560, altura 540)
    mx1, my1, mx2, my2 = 360, 130, 920, 670
    draw.rounded_rectangle([mx1, my1, mx2, my2], radius=16, fill=SURFACE_LIGHT, outline=BORDER_LIGHT, width=1)

    # Header do Modal
    draw.text((mx1 + 24, my1 + 20), "Configurações", fill=TEXT_LIGHT, font=font)
    draw.text((mx2 - 36, my1 + 20), "✕", fill=MUTED_LIGHT, font=font)
    draw.line([mx1, my1 + 54, mx2, my1 + 54], fill=BORDER_LIGHT, width=1)

    # Abas (Geral | Tokens de Captura)
    draw.text((mx1 + 24, my1 + 70), "Geral", fill=MUTED_LIGHT, font=font)
    draw.text((mx1 + 90, my1 + 70), "Tokens de Captura", fill=TEXT_LIGHT, font=font)
    draw.line([mx1 + 86, my1 + 92, mx1 + 210, my1 + 92], fill=ACCENT, width=3)
    draw.line([mx1, my1 + 93, mx2, my1 + 93], fill=BORDER_LIGHT, width=1)

    # Conteúdo da aba Tokens
    draw.text((mx1 + 24, my1 + 112), "Tokens Pessoais de Captura", fill=TEXT_LIGHT, font=font)
    draw.text((mx1 + 24, my1 + 132), "Tokens com permissão exclusiva de escrita no Inbox (inbox:write).", fill=MUTED_LIGHT, font=font)
    draw.text((mx1 + 24, my1 + 148), "Use em Atalhos do iOS, Tasker no Android, bots ou linha de comando.", fill=MUTED_LIGHT, font=font)

    # Botão + Novo Token
    draw.rounded_rectangle([mx2 - 130, my1 + 112, mx2 - 24, my1 + 144], radius=8, fill=ACCENT)
    draw.text((mx2 - 116, my1 + 122), "+ Novo Token", fill=(0, 0, 0), font=font)

    # Seção Tokens Existentes
    draw.text((mx1 + 24, my1 + 185), "TOKENS EXISTENTES (2)", fill=MUTED_LIGHT, font=font)

    # Card 1: Atalhos do iPhone
    cy1 = my1 + 206
    draw.rounded_rectangle([mx1 + 24, cy1, mx2 - 24, cy1 + 72], radius=10, fill=SURFACE_LIGHT, outline=BORDER_LIGHT)
    draw.text((mx1 + 38, cy1 + 14), "Atalhos do iPhone", fill=TEXT_LIGHT, font=font)
    draw.rounded_rectangle([mx1 + 160, cy1 + 12, mx1 + 204, cy1 + 28], radius=4, fill=EMERALD_BG)
    draw.text((mx1 + 168, cy1 + 15), "Ativo", fill=EMERALD_TEXT, font=font)
    draw.rounded_rectangle([mx1 + 212, cy1 + 12, mx1 + 284, cy1 + 28], radius=4, fill=SURFACE_2_LIGHT)
    draw.text((mx1 + 220, cy1 + 15), "inbox:write", fill=MUTED_LIGHT, font=font)

    draw.text((mx1 + 38, cy1 + 42), "znt_a1b2c3d4…  ·  Criado: 17/11/2026  ·  Último uso: há 5 minutos", fill=MUTED_LIGHT, font=font)

    # Botão Revogar
    draw.rounded_rectangle([mx2 - 96, cy1 + 20, mx2 - 38, cy1 + 52], radius=6, fill=RED_BG, outline=(252, 165, 165))
    draw.text((mx2 - 84, cy1 + 28), "Revogar", fill=RED_TEXT, font=font)

    # Card 2: Tasker no Android
    cy2 = cy1 + 84
    draw.rounded_rectangle([mx1 + 24, cy2, mx2 - 24, cy2 + 72], radius=10, fill=SURFACE_LIGHT, outline=BORDER_LIGHT)
    draw.text((mx1 + 38, cy2 + 14), "Tasker Automate (Android)", fill=TEXT_LIGHT, font=font)
    draw.rounded_rectangle([mx1 + 200, cy2 + 12, mx1 + 244, cy2 + 28], radius=4, fill=EMERALD_BG)
    draw.text((mx1 + 208, cy2 + 15), "Ativo", fill=EMERALD_TEXT, font=font)
    draw.rounded_rectangle([mx1 + 252, cy2 + 12, mx1 + 324, cy2 + 28], radius=4, fill=SURFACE_2_LIGHT)
    draw.text((mx1 + 260, cy2 + 15), "inbox:write", fill=MUTED_LIGHT, font=font)

    draw.text((mx1 + 38, cy2 + 42), "znt_8f7e6d5c…  ·  Criado: 17/11/2026  ·  Último uso: Nunca utilizado", fill=MUTED_LIGHT, font=font)

    draw.rounded_rectangle([mx2 - 96, cy2 + 20, mx2 - 38, cy2 + 52], radius=6, fill=RED_BG, outline=(252, 165, 165))
    draw.text((mx2 - 84, cy2 + 28), "Revogar", fill=RED_TEXT, font=font)

    # Seção Como Usar (Colapsável)
    draw.line([mx1 + 24, cy2 + 96, mx2 - 24, cy2 + 96], fill=BORDER_LIGHT, width=1)
    draw.text((mx1 + 24, cy2 + 112), "▼ Como configurar no iOS Atalhos, Tasker e cURL", fill=TEXT_LIGHT, font=font)

    draw.rounded_rectangle([mx1 + 24, cy2 + 132, mx2 - 24, my2 - 20], radius=8, fill=SURFACE_2_LIGHT)
    draw.text((mx1 + 36, cy2 + 144), "Endpoint: POST https://znotes.o.ziltro.dev/api/inbox", fill=TEXT_LIGHT, font=font)
    draw.text((mx1 + 36, cy2 + 162), "Header: Authorization: Bearer znt_SEU_TOKEN", fill=MUTED_LIGHT, font=font)
    draw.text((mx1 + 36, cy2 + 180), "Body JSON: {\"content\": \"Minha anotação rápida\"}", fill=MUTED_LIGHT, font=font)

    img.save("docs/screenshots/personal-tokens-modal.png")
    print("Salvo: personal-tokens-modal.png")

def create_personal_tokens_created():
    img = Image.new("RGB", (1280, 800), (40, 40, 40))
    draw = ImageDraw.Draw(img)

    mx1, my1, mx2, my2 = 360, 130, 920, 670
    draw.rounded_rectangle([mx1, my1, mx2, my2], radius=16, fill=SURFACE_LIGHT, outline=BORDER_LIGHT, width=1)

    draw.text((mx1 + 24, my1 + 20), "Configurações", fill=TEXT_LIGHT, font=font)
    draw.text((mx2 - 36, my1 + 20), "✕", fill=MUTED_LIGHT, font=font)
    draw.line([mx1, my1 + 54, mx2, my1 + 54], fill=BORDER_LIGHT, width=1)

    draw.text((mx1 + 24, my1 + 70), "Geral", fill=MUTED_LIGHT, font=font)
    draw.text((mx1 + 90, my1 + 70), "Tokens de Captura", fill=TEXT_LIGHT, font=font)
    draw.line([mx1 + 86, my1 + 92, mx1 + 210, my1 + 92], fill=ACCENT, width=3)
    draw.line([mx1, my1 + 93, mx2, my1 + 93], fill=BORDER_LIGHT, width=1)

    # Banner de Token Criado com Alerta
    ay1 = my1 + 110
    draw.rounded_rectangle([mx1 + 24, ay1, mx2 - 24, ay1 + 115], radius=12, fill=ACCENT_BG, outline=ACCENT_BORDER, width=1)

    draw.text((mx1 + 40, ay1 + 14), "✓ Token \"Atalhos do iPhone\" gerado com sucesso!", fill=(146, 64, 14), font=font)
    draw.text((mx2 - 110, ay1 + 14), "Fechar aviso", fill=MUTED_LIGHT, font=font)

    draw.text((mx1 + 40, ay1 + 36), "Atenção: Copie seu token agora. Por segurança, ele é salvo como hash e nunca mais será exibido.", fill=TEXT_LIGHT, font=font)

    # Input com token e botão copiar
    draw.rounded_rectangle([mx1 + 40, ay1 + 60, mx2 - 130, ay1 + 96], radius=8, fill=SURFACE_LIGHT, outline=BORDER_LIGHT)
    draw.text((mx1 + 52, ay1 + 72), "znt_f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8", fill=TEXT_LIGHT, font=font)

    draw.rounded_rectangle([mx2 - 120, ay1 + 60, mx2 - 40, ay1 + 96], radius=8, fill=ACCENT)
    draw.text((mx2 - 108, ay1 + 72), "Copiar Token", fill=(0, 0, 0), font=font)

    # Lista abaixo continua visível
    draw.text((mx1 + 24, ay1 + 145), "TOKENS EXISTENTES (1)", fill=MUTED_LIGHT, font=font)

    cy1 = ay1 + 165
    draw.rounded_rectangle([mx1 + 24, cy1, mx2 - 24, cy1 + 72], radius=10, fill=SURFACE_LIGHT, outline=BORDER_LIGHT)
    draw.text((mx1 + 38, cy1 + 14), "Atalhos do iPhone", fill=TEXT_LIGHT, font=font)
    draw.rounded_rectangle([mx1 + 160, cy1 + 12, mx1 + 204, cy1 + 28], radius=4, fill=EMERALD_BG)
    draw.text((mx1 + 168, cy1 + 15), "Ativo", fill=EMERALD_TEXT, font=font)
    draw.rounded_rectangle([mx1 + 212, cy1 + 12, mx1 + 284, cy1 + 28], radius=4, fill=SURFACE_2_LIGHT)
    draw.text((mx1 + 220, cy1 + 15), "inbox:write", fill=MUTED_LIGHT, font=font)

    draw.text((mx1 + 38, cy1 + 42), "znt_f9a8b7c6…  ·  Criado: Agora  ·  Último uso: Nunca utilizado", fill=MUTED_LIGHT, font=font)

    draw.rounded_rectangle([mx2 - 96, cy1 + 20, mx2 - 38, cy1 + 52], radius=6, fill=RED_BG, outline=(252, 165, 165))
    draw.text((mx2 - 84, cy1 + 28), "Revogar", fill=RED_TEXT, font=font)

    img.save("docs/screenshots/personal-tokens-created.png")
    print("Salvo: personal-tokens-created.png")

def create_personal_tokens_mobile():
    img = Image.new("RGB", (390, 844), BG_LIGHT)
    draw = ImageDraw.Draw(img)

    # Status bar
    draw.rectangle([0, 0, 390, 44], fill=SURFACE_LIGHT)
    draw.text((20, 15), "9:41", fill=TEXT_LIGHT, font=font)
    draw.text((320, 15), "5G  100%", fill=MUTED_LIGHT, font=font)

    # Header
    draw.rectangle([0, 44, 390, 100], fill=SURFACE_LIGHT)
    draw.line([0, 100, 390, 100], fill=BORDER_LIGHT, width=1)
    draw.text((20, 62), "Configurações", fill=TEXT_LIGHT, font=font)
    draw.text((350, 62), "✕", fill=MUTED_LIGHT, font=font)

    # Tabs no mobile
    draw.text((20, 116), "Geral", fill=MUTED_LIGHT, font=font)
    draw.text((80, 116), "Tokens de Captura", fill=TEXT_LIGHT, font=font)
    draw.line([76, 138, 195, 138], fill=ACCENT, width=3)
    draw.line([0, 139, 390, 139], fill=BORDER_LIGHT, width=1)

    # Subtítulo
    draw.text((20, 155), "Tokens Pessoais de Captura", fill=TEXT_LIGHT, font=font)
    draw.text((20, 175), "Permissão exclusiva de escrita no Inbox.", fill=MUTED_LIGHT, font=font)

    # Botão + Novo Token
    draw.rounded_rectangle([20, 205, 370, 245], radius=8, fill=ACCENT)
    draw.text((145, 218), "+ Novo Token Pessoal", fill=(0, 0, 0), font=font)

    # Lista de tokens
    draw.text((20, 270), "TOKENS EXISTENTES (2)", fill=MUTED_LIGHT, font=font)

    # Token 1
    draw.rounded_rectangle([20, 290, 370, 385], radius=12, fill=SURFACE_LIGHT, outline=BORDER_LIGHT)
    draw.text((34, 305), "Atalhos do iPhone", fill=TEXT_LIGHT, font=font)
    draw.rounded_rectangle([160, 302, 204, 318], radius=4, fill=EMERALD_BG)
    draw.text((168, 305), "Ativo", fill=EMERALD_TEXT, font=font)

    draw.text((34, 332), "Prefixo: znt_a1b2c3d4…", fill=TEXT_LIGHT, font=font)
    draw.text((34, 350), "Último uso: há 5 minutos", fill=MUTED_LIGHT, font=font)

    draw.rounded_rectangle([290, 335, 355, 368], radius=6, fill=RED_BG, outline=(252, 165, 165))
    draw.text((305, 345), "Revogar", fill=RED_TEXT, font=font)

    # Token 2
    draw.rounded_rectangle([20, 400, 370, 495], radius=12, fill=SURFACE_LIGHT, outline=BORDER_LIGHT)
    draw.text((34, 415), "Tasker Automate", fill=TEXT_LIGHT, font=font)
    draw.rounded_rectangle([150, 412, 194, 428], radius=4, fill=EMERALD_BG)
    draw.text((158, 415), "Ativo", fill=EMERALD_TEXT, font=font)

    draw.text((34, 442), "Prefixo: znt_8f7e6d5c…", fill=TEXT_LIGHT, font=font)
    draw.text((34, 460), "Último uso: Nunca utilizado", fill=MUTED_LIGHT, font=font)

    draw.rounded_rectangle([290, 445, 355, 478], radius=6, fill=RED_BG, outline=(252, 165, 165))
    draw.text((305, 455), "Revogar", fill=RED_TEXT, font=font)

    # Card Guia
    draw.rounded_rectangle([20, 520, 370, 640], radius=12, fill=SURFACE_2_LIGHT)
    draw.text((34, 535), "Como usar no iOS Atalhos (Shortcuts):", fill=TEXT_LIGHT, font=font)
    draw.text((34, 555), "1. Crie uma ação 'Obter Conteúdo do URL'.", fill=MUTED_LIGHT, font=font)
    draw.text((34, 575), "2. Método POST para /api/inbox.", fill=MUTED_LIGHT, font=font)
    draw.text((34, 595), "3. Header: Authorization: Bearer znt_...", fill=MUTED_LIGHT, font=font)
    draw.text((34, 615), "4. Body JSON: {\"content\": \"Texto do Atalho\"}", fill=MUTED_LIGHT, font=font)

    # Bottom bar indicator
    draw.rounded_rectangle([130, 825, 260, 830], radius=3, fill=MUTED_LIGHT)

    img.save("docs/screenshots/personal-tokens-mobile.png")
    print("Salvo: personal-tokens-mobile.png")

create_personal_tokens_modal()
create_personal_tokens_created()
create_personal_tokens_mobile()
