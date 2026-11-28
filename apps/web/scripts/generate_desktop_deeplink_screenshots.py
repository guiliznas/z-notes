import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs("docs/screenshots", exist_ok=True)

# Cores do tema (paleta.md)
BG_LIGHT = (245, 245, 240)
SURFACE_LIGHT = (255, 255, 255)
SURFACE_2_LIGHT = (221, 229, 233)
TEXT_LIGHT = (38, 50, 56)
MUTED_LIGHT = (84, 110, 122)
BORDER_LIGHT = (227, 233, 236)
ACCENT = (255, 193, 7) # Amber 500
ACCENT_BG = (255, 244, 207)
ACCENT_BORDER = (255, 214, 102)

BG_DARK = (28, 28, 30)
SURFACE_DARK = (44, 44, 46)
SURFACE_2_DARK = (58, 58, 60)
TEXT_DARK = (236, 239, 241)
MUTED_DARK = (176, 190, 197)
BORDER_DARK = (65, 65, 68)

font = ImageFont.load_default()

def draw_window_frame(draw, width, height, title, is_dark=False):
    bar_color = SURFACE_2_DARK if is_dark else SURFACE_2_LIGHT
    text_color = TEXT_DARK if is_dark else TEXT_LIGHT
    border_color = BORDER_DARK if is_dark else BORDER_LIGHT
    
    # Titlebar
    draw.rectangle([0, 0, width, 38], fill=bar_color)
    draw.line([0, 38, width, 38], fill=border_color, width=1)
    
    # Window buttons
    draw.ellipse([14, 13, 24, 23], fill=(255, 95, 87)) # close
    draw.ellipse([32, 13, 42, 23], fill=(254, 188, 46)) # minimize
    draw.ellipse([50, 13, 60, 23], fill=(40, 201, 64))  # maximize
    
    draw.text((width // 2 - 80, 13), title, fill=text_color, font=font)

def create_desktop_deeplink_focus():
    width, height = 1000, 640
    img = Image.new("RGB", (width, height), BG_LIGHT)
    draw = ImageDraw.Draw(img)
    
    draw_window_frame(draw, width, height, "z-notes (Tauri Desktop - Wayland) - Inbox", is_dark=False)
    
    # Sidebar esquerda (navegação)
    draw.rectangle([0, 39, 220, height], fill=SURFACE_LIGHT)
    draw.line([220, 39, 220, height], fill=BORDER_LIGHT, width=1)
    
    # Brand
    draw.text((20, 55), "z-notes", fill=ACCENT, font=font)
    draw.text((80, 55), "Desktop v0.1.0", fill=MUTED_LIGHT, font=font)
    
    # Seções
    draw.text((20, 95), "NOTAS", fill=MUTED_LIGHT, font=font)
    draw.text((30, 118), "Todas as notas", fill=TEXT_LIGHT, font=font)
    draw.text((30, 140), "Fixadas", fill=TEXT_LIGHT, font=font)
    
    draw.text((20, 175), "TAREFAS", fill=MUTED_LIGHT, font=font)
    draw.text((30, 198), "Quadro de tarefas", fill=TEXT_LIGHT, font=font)
    
    # Inbox item selecionado com badge
    draw.rounded_rectangle([15, 230, 205, 265], radius=8, fill=ACCENT_BG)
    draw.text((30, 241), "Inbox", fill=TEXT_LIGHT, font=font)
    draw.rounded_rectangle([165, 238, 195, 258], radius=6, fill=ACCENT)
    draw.text((176, 242), "3", fill=(0, 0, 0), font=font)
    
    # Indicador de atalho desktop
    draw.rounded_rectangle([15, 570, 205, 620], radius=8, fill=SURFACE_2_LIGHT)
    draw.text((25, 580), "Atalho do Sistema:", fill=MUTED_LIGHT, font=font)
    draw.text((25, 598), "xdg-open znotes://capture", fill=TEXT_LIGHT, font=font)
    
    # Área central (Inbox Chat)
    chat_left = 221
    draw.rectangle([chat_left, 39, width, height], fill=BG_LIGHT)
    
    # Cabeçalho do Inbox
    draw.rectangle([chat_left, 39, width, 85], fill=SURFACE_LIGHT)
    draw.line([chat_left, 85, width, 85], fill=BORDER_LIGHT, width=1)
    draw.text((chat_left + 25, 55), "Inbox", fill=TEXT_LIGHT, font=font)
    draw.text((chat_left + 75, 55), "• 3 pendentes", fill=MUTED_LIGHT, font=font)
    
    # Separador de dia
    draw.text((chat_left + 320, 105), "── Terça-feira, 17 de novembro ──", fill=MUTED_LIGHT, font=font)
    
    # Mensagens
    draw.rounded_rectangle([chat_left + 40, 135, width - 40, 185], radius=12, fill=SURFACE_LIGHT, outline=BORDER_LIGHT)
    draw.text((chat_left + 55, 148), "Comprar café em grãos e filtro para a copa", fill=TEXT_LIGHT, font=font)
    draw.text((width - 90, 165), "16:15", fill=MUTED_LIGHT, font=font)
    
    draw.rounded_rectangle([chat_left + 40, 200, width - 40, 250], radius=12, fill=SURFACE_LIGHT, outline=BORDER_LIGHT)
    draw.text((chat_left + 55, 213), "Agendar alinhamento de infraestrutura com o time", fill=TEXT_LIGHT, font=font)
    draw.text((width - 90, 230), "17:40", fill=MUTED_LIGHT, font=font)
    
    # Banner de foco ativado via Deep Link
    draw.rounded_rectangle([chat_left + 40, 480, width - 40, 520], radius=8, fill=ACCENT_BG, outline=ACCENT_BORDER)
    draw.text((chat_left + 55, 494), "⚡ Captura Rápida ativada via deep link (znotes://capture). O composer está pronto para digitar:", fill=TEXT_LIGHT, font=font)
    
    # Composer na base em FOCO
    draw.rectangle([chat_left, 530, width, height], fill=SURFACE_LIGHT)
    draw.line([chat_left, 530, width, 530], fill=BORDER_LIGHT, width=1)
    
    # Caixa de texto com borda ativa (ACCENT) e cursor piscando
    draw.rounded_rectangle([chat_left + 25, 545, width - 80, 615], radius=12, fill=BG_LIGHT, outline=ACCENT, width=2)
    draw.text((chat_left + 40, 565), "|", fill=ACCENT, font=font) # cursor
    draw.text((chat_left + 48, 565), "Escreva uma mensagem… (Enter envia, Shift+Enter quebra linha)", fill=MUTED_LIGHT, font=font)
    
    # Botão Enviar
    draw.rounded_rectangle([width - 70, 555, width - 25, 605], radius=10, fill=ACCENT)
    draw.text((width - 55, 574), "➤", fill=(0, 0, 0), font=font)
    
    img.save("docs/screenshots/desktop-deeplink-focus.png")

def create_desktop_deeplink_prefilled():
    width, height = 1000, 640
    img = Image.new("RGB", (width, height), BG_DARK)
    draw = ImageDraw.Draw(img)
    
    draw_window_frame(draw, width, height, "z-notes (Tauri Desktop - Wayland) - Captura Pré-preenchida", is_dark=True)
    
    # Sidebar
    draw.rectangle([0, 39, 220, height], fill=SURFACE_DARK)
    draw.line([220, 39, 220, height], fill=BORDER_DARK, width=1)
    
    draw.text((20, 55), "z-notes", fill=ACCENT, font=font)
    draw.text((80, 55), "Desktop (Dark)", fill=MUTED_DARK, font=font)
    
    draw.text((20, 95), "NOTAS", fill=MUTED_DARK, font=font)
    draw.text((30, 118), "Todas as notas", fill=TEXT_DARK, font=font)
    draw.text((30, 140), "Fixadas", fill=TEXT_DARK, font=font)
    
    draw.text((20, 175), "TAREFAS", fill=MUTED_DARK, font=font)
    draw.text((30, 198), "Quadro de tarefas", fill=TEXT_DARK, font=font)
    
    draw.rounded_rectangle([15, 230, 205, 265], radius=8, fill=SURFACE_2_DARK)
    draw.text((30, 241), "Inbox", fill=TEXT_DARK, font=font)
    draw.rounded_rectangle([165, 238, 195, 258], radius=6, fill=ACCENT)
    draw.text((176, 242), "3", fill=(0, 0, 0), font=font)
    
    # Área central
    chat_left = 221
    draw.rectangle([chat_left, 39, width, height], fill=BG_DARK)
    
    # Cabeçalho
    draw.rectangle([chat_left, 39, width, 85], fill=SURFACE_DARK)
    draw.line([chat_left, 85, width, 85], fill=BORDER_DARK, width=1)
    draw.text((chat_left + 25, 55), "Inbox", fill=TEXT_DARK, font=font)
    draw.text((chat_left + 75, 55), "• 3 pendentes", fill=MUTED_DARK, font=font)
    
    # Separador
    draw.text((chat_left + 320, 105), "── Terça-feira, 17 de novembro ──", fill=MUTED_DARK, font=font)
    
    # Mensagem existente
    draw.rounded_rectangle([chat_left + 40, 140, width - 40, 190], radius=12, fill=SURFACE_DARK, outline=BORDER_DARK)
    draw.text((chat_left + 55, 153), "Revisar logs do Dokploy no servidor", fill=TEXT_DARK, font=font)
    draw.text((width - 90, 170), "18:00", fill=MUTED_DARK, font=font)
    
    # Alerta visual de deep link recebido com parâmetro de texto
    draw.rounded_rectangle([chat_left + 40, 465, width - 40, 520], radius=8, fill=SURFACE_2_DARK, outline=ACCENT)
    draw.text((chat_left + 55, 478), "⚡ Deep link recebido: znotes://capture?text=Revisar%20documenta%C3%A7%C3%A3o%20do%20Wayland", fill=ACCENT, font=font)
    draw.text((chat_left + 55, 498), "Origem detectada: desktop. O texto foi pré-preenchido para revisão:", fill=MUTED_DARK, font=font)
    
    # Composer com texto pré-preenchido
    draw.rectangle([chat_left, 530, width, height], fill=SURFACE_DARK)
    draw.line([chat_left, 530, width, 530], fill=BORDER_DARK, width=1)
    
    draw.rounded_rectangle([chat_left + 25, 545, width - 80, 615], radius=12, fill=BG_DARK, outline=ACCENT, width=2)
    draw.text((chat_left + 40, 565), "Revisar documentação do Wayland", fill=TEXT_DARK, font=font)
    draw.text((chat_left + 295, 565), "|", fill=ACCENT, font=font) # cursor no fim
    
    draw.rounded_rectangle([width - 70, 555, width - 25, 605], radius=10, fill=ACCENT)
    draw.text((width - 55, 574), "➤", fill=(0, 0, 0), font=font)
    
    img.save("docs/screenshots/desktop-deeplink-prefilled.png")

def create_desktop_shortcut_gnome():
    width, height = 750, 460
    img = Image.new("RGB", (width, height), (246, 246, 246))
    draw = ImageDraw.Draw(img)
    
    draw_window_frame(draw, width, height, "Configurações do Sistema — Atalhos Personalizados (GNOME / Wayland)", is_dark=False)
    
    # Modal dialog central
    dialog_x1, dialog_y1 = 100, 70
    dialog_x2, dialog_y2 = 650, 410
    draw.rounded_rectangle([dialog_x1, dialog_y1, dialog_x2, dialog_y2], radius=12, fill=(255, 255, 255), outline=(210, 210, 210), width=1)
    
    # Modal header
    draw.text((dialog_x1 + 30, dialog_y1 + 25), "Definir Atalho Personalizado", fill=(30, 30, 30), font=font)
    
    # Campo Nome
    draw.text((dialog_x1 + 30, dialog_y1 + 65), "Nome:", fill=(80, 80, 80), font=font)
    draw.rounded_rectangle([dialog_x1 + 30, dialog_y1 + 85, dialog_x2 - 30, dialog_y1 + 125], radius=8, fill=(250, 250, 250), outline=(200, 200, 200))
    draw.text((dialog_x1 + 45, dialog_y1 + 98), "z-notes: Captura Rápida", fill=(30, 30, 30), font=font)
    
    # Campo Comando
    draw.text((dialog_x1 + 30, dialog_y1 + 145), "Comando:", fill=(80, 80, 80), font=font)
    draw.rounded_rectangle([dialog_x1 + 30, dialog_y1 + 165, dialog_x2 - 30, dialog_y1 + 205], radius=8, fill=(250, 250, 250), outline=ACCENT, width=2)
    draw.text((dialog_x1 + 45, dialog_y1 + 178), "xdg-open znotes://capture", fill=(30, 30, 30), font=font)
    
    # Campo Atalho
    draw.text((dialog_x1 + 30, dialog_y1 + 225), "Atalho:", fill=(80, 80, 80), font=font)
    draw.rounded_rectangle([dialog_x1 + 30, dialog_y1 + 245, dialog_x2 - 30, dialog_y1 + 285], radius=8, fill=(250, 250, 250), outline=(200, 200, 200))
    draw.rounded_rectangle([dialog_x1 + 40, dialog_y1 + 252, dialog_x1 + 150, dialog_y1 + 278], radius=6, fill=ACCENT_BG, outline=ACCENT_BORDER)
    draw.text((dialog_x1 + 52, dialog_y1 + 258), "Ctrl + Alt + C", fill=(20, 20, 20), font=font)
    
    # Botões Cancelar e Adicionar
    draw.rounded_rectangle([dialog_x2 - 210, dialog_y2 - 50, dialog_x2 - 120, dialog_y2 - 15], radius=8, fill=(240, 240, 240))
    draw.text((dialog_x2 - 185, dialog_y2 - 38), "Cancelar", fill=(60, 60, 60), font=font)
    
    draw.rounded_rectangle([dialog_x2 - 105, dialog_y2 - 50, dialog_x2 - 30, dialog_y2 - 15], radius=8, fill=(33, 115, 222))
    draw.text((dialog_x2 - 85, dialog_y2 - 38), "Adicionar", fill=(255, 255, 255), font=font)
    
    img.save("docs/screenshots/desktop-deeplink-shortcut-gnome.png")

if __name__ == "__main__":
    create_desktop_deeplink_focus()
    create_desktop_deeplink_prefilled()
    create_desktop_shortcut_gnome()
    print("Capturas de tela da issue #93 geradas com sucesso!")
