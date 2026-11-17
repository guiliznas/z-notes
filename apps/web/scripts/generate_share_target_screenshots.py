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
SURFACE_DARK = (55, 71, 79)
TEXT_DARK = (236, 239, 241)
MUTED_DARK = (176, 190, 197)
BORDER_DARK = (65, 65, 68)

font = ImageFont.load_default()

def create_mobile_share_target():
    img = Image.new("RGB", (390, 844), BG_LIGHT)
    draw = ImageDraw.Draw(img)

    # Status bar
    draw.rectangle([0, 0, 390, 44], fill=SURFACE_LIGHT)
    draw.text((20, 15), "9:41", fill=TEXT_LIGHT, font=font)
    draw.text((320, 15), "5G  100%", fill=MUTED_LIGHT, font=font)

    # Header
    draw.rectangle([0, 44, 390, 100], fill=SURFACE_LIGHT)
    draw.line([0, 100, 390, 100], fill=BORDER_LIGHT, width=1)
    draw.text((20, 62), "☰  z-notes  /  Inbox", fill=TEXT_LIGHT, font=font)
    draw.rounded_rectangle([300, 58, 370, 86], radius=8, fill=ACCENT_BG, outline=ACCENT_BORDER)
    draw.text((310, 65), "PWA WebAPK", fill=TEXT_LIGHT, font=font)

    # Timeline messages
    draw.text((150, 120), "── Hoje ──", fill=MUTED_LIGHT, font=font)

    # Message 1
    draw.rounded_rectangle([40, 150, 370, 200], radius=12, fill=SURFACE_LIGHT, outline=BORDER_LIGHT)
    draw.text((55, 162), "Reunião de alinhamento com a equipe", fill=TEXT_LIGHT, font=font)
    draw.text((320, 180), "14:20", fill=MUTED_LIGHT, font=font)

    # Banner de Compartilhamento Recebido
    draw.rounded_rectangle([20, 560, 370, 610], radius=10, fill=ACCENT_BG, outline=ACCENT_BORDER)
    draw.text((30, 572), "✓ Link recebido via Web Share Target (Chrome)", fill=TEXT_LIGHT, font=font)
    draw.text((30, 590), "O conteúdo foi inserido abaixo. Revise e envie:", fill=MUTED_LIGHT, font=font)

    # Composer fixo na base
    draw.rectangle([0, 620, 390, 800], fill=SURFACE_LIGHT)
    draw.line([0, 620, 390, 620], fill=BORDER_LIGHT, width=1)

    # Caixa de texto pré-preenchida
    draw.rounded_rectangle([15, 635, 315, 750], radius=12, fill=BG_LIGHT, outline=ACCENT, width=2)
    draw.text((28, 650), "Vite | Ferramenta Frontend de Próxima Geração", fill=TEXT_LIGHT, font=font)
    draw.text((28, 675), "https://vite.dev", fill=(21, 101, 192), font=font)

    # Botão de envio ativo
    draw.rounded_rectangle([325, 670, 375, 715], radius=12, fill=ACCENT)
    draw.text((342, 685), "➤", fill=(0, 0, 0), font=font)

    # Bottom bar indicator
    draw.rounded_rectangle([130, 825, 260, 830], radius=3, fill=MUTED_LIGHT)

    img.save("docs/screenshots/share-target-mobile.png")
    print("Salvo: share-target-mobile.png")

def create_desktop_share_target():
    img = Image.new("RGB", (1280, 800), BG_LIGHT)
    draw = ImageDraw.Draw(img)

    # Sidebar
    draw.rectangle([0, 0, 260, 800], fill=SURFACE_LIGHT)
    draw.line([260, 0, 260, 800], fill=BORDER_LIGHT, width=1)

    draw.text((24, 28), "z-notes", fill=TEXT_LIGHT, font=font)

    # Alternador de seção (Notas | Tarefas | Inbox)
    draw.rounded_rectangle([20, 70, 240, 106], radius=8, fill=SURFACE_2_LIGHT)
    draw.text((35, 82), "Notas", fill=MUTED_LIGHT, font=font)
    draw.text((105, 82), "Tarefas", fill=MUTED_LIGHT, font=font)
    draw.rounded_rectangle([165, 74, 235, 102], radius=6, fill=SURFACE_LIGHT)
    draw.text((180, 82), "Inbox (3)", fill=TEXT_LIGHT, font=font)

    # Filtros do Inbox
    draw.rounded_rectangle([16, 130, 244, 164], radius=6, fill=ACCENT_BG)
    draw.text((30, 142), "📥  Pendentes (3)", fill=TEXT_LIGHT, font=font)
    draw.text((30, 182), "📦  Arquivadas (12)", fill=MUTED_LIGHT, font=font)
    draw.text((30, 218), "🗑  Lixeira (2)", fill=MUTED_LIGHT, font=font)

    # Chat Header
    draw.rectangle([261, 0, 1280, 60], fill=SURFACE_LIGHT)
    draw.line([261, 60, 1280, 60], fill=BORDER_LIGHT, width=1)
    draw.text((290, 22), "Inbox  ·  Pendentes", fill=TEXT_LIGHT, font=font)
    draw.text((1100, 22), "Web Share Target: /inbox/share", fill=MUTED_LIGHT, font=font)

    # Timeline
    draw.text((730, 90), "── Hoje ──", fill=MUTED_LIGHT, font=font)

    # Bolhas de mensagens anteriores
    draw.rounded_rectangle([700, 120, 1220, 175], radius=12, fill=SURFACE_LIGHT, outline=BORDER_LIGHT)
    draw.text((720, 135), "Lembrar de rodar a suíte de testes no CI", fill=TEXT_LIGHT, font=font)
    draw.text((1170, 155), "16:40", fill=MUTED_LIGHT, font=font)

    draw.rounded_rectangle([700, 195, 1220, 250], radius=12, fill=SURFACE_LIGHT, outline=BORDER_LIGHT)
    draw.text((720, 210), "Artigo sobre PWA Share Target no MDN", fill=TEXT_LIGHT, font=font)
    draw.text((1170, 230), "17:15", fill=MUTED_LIGHT, font=font)

    # Composer fixo na base
    draw.rectangle([261, 660, 1280, 800], fill=SURFACE_LIGHT)
    draw.line([261, 660, 1280, 660], fill=BORDER_LIGHT, width=1)

    draw.rounded_rectangle([320, 680, 1220, 765], radius=14, fill=BG_LIGHT, outline=ACCENT, width=2)
    draw.text((345, 698), "Documentação oficial Web Share Target W3C", fill=TEXT_LIGHT, font=font)
    draw.text((345, 722), "https://w3c.github.io/web-share-target/", fill=(21, 101, 192), font=font)

    # Botão de envio
    draw.rounded_rectangle([1165, 705, 1205, 745], radius=10, fill=ACCENT)
    draw.text((1180, 720), "➤", fill=(0, 0, 0), font=font)

    img.save("docs/screenshots/share-target-desktop.png")
    print("Salvo: share-target-desktop.png")

def create_unauthenticated_share_target():
    img = Image.new("RGB", (390, 844), BG_LIGHT)
    draw = ImageDraw.Draw(img)

    # Modal de login centralizado
    draw.rounded_rectangle([30, 220, 360, 620], radius=16, fill=SURFACE_LIGHT, outline=BORDER_LIGHT, width=1)

    # Logo
    draw.text((55, 250), "📝 z-notes", fill=TEXT_LIGHT, font=font)

    # Alerta de compartilhamento pendente
    draw.rounded_rectangle([50, 290, 340, 395], radius=10, fill=ACCENT_BG, outline=ACCENT_BORDER, width=1)
    draw.text((65, 305), "Conteúdo compartilhado recebido", fill=TEXT_LIGHT, font=font)
    draw.text((65, 330), "“Receita de Bolo: Cenoura com Chocolate...”", fill=MUTED_LIGHT, font=font)
    draw.text((65, 365), "Faça login com Google para enviar ao Inbox.", fill=MUTED_LIGHT, font=font)

    # Mensagem de boas-vindas
    draw.text((50, 420), "Suas notas, só suas.", fill=MUTED_LIGHT, font=font)
    draw.text((50, 440), "Entre com sua conta Google para continuar.", fill=MUTED_LIGHT, font=font)

    # Botão de Login Google
    draw.rounded_rectangle([50, 480, 340, 525], radius=10, fill=ACCENT)
    draw.text((110, 498), "Entrar com Google", fill=(0, 0, 0), font=font)

    img.save("docs/screenshots/share-target-unauthenticated.png")
    print("Salvo: share-target-unauthenticated.png")

create_mobile_share_target()
create_desktop_share_target()
create_unauthenticated_share_target()
