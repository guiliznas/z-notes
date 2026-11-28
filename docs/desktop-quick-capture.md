# Captura Rápida no Desktop via Deep Link (Tauri / Wayland / X11)

Este documento registra a análise técnica (spike), a arquitetura implementada e o guia de configuração da **Captura Rápida no Desktop Linux** do **z-notes** (atendendo às issues #31 e #93).

---

## 1. Contexto e Spike: Atalho Global vs Atalho do Sistema no Wayland

### O Problema do Atalho Global no Wayland

Em sistemas Linux modernos (Ubuntu 22.04/24.04+, Fedora, Debian), o **Wayland** é o servidor de exibição padrão.
Plugins tradicionais de atalho global em frameworks desktop (como `tauri-plugin-global-shortcut`, baseado na biblioteca Rust `global-hotkey` / `tao`):

1. **Isolamento de Janelas por Design:** O protocolo Wayland proíbe explicitamente que clientes sem foco capturem eventos globais de entrada do teclado por motivos de privacidade e segurança (mitigação contra keyloggers).
2. **Inconfiabilidade:** Registrar o atalho via plugin pode retornar sucesso sem erro no Tauri, mas os eventos de tecla simplesmente **nunca disparam** quando qualquer outra janela está em foco.
3. **Portal GlobalShortcuts:** A proposta de protocolo `ext-foreign-toplevel-list-v1` e o portal `org.freedesktop.portal.GlobalShortcuts` ainda exigem interação do usuário, aprovação por diálogo de sistema e não estão universalmente implementados em todos os compositores Wayland.

### Comparação com Alternativas Avaliadas

| Abordagem | Funcionamento no Wayland | Funcionamento no X11 | Consumo de Recursos | Confiabilidade / UX |
| :--- | :--- | :--- | :--- | :--- |
| **Atalho do Sistema + Deep Link (`xdg-open znotes://capture`)** | **100% Funcional** (nativo do compositor) | **100% Funcional** | Zero overhead em segundo plano | **Recomendada:** foco instantâneo (< 1 s) e flexibilidade total de teclas para o usuário |
| **Ícone de Bandeja (System Tray)** | Suportado (via SNI / libappindicator) | Suportado | Baixo | Bom complemento para mouse, mas não atende a captura instantânea com as mãos no teclado |
| **Janelinha Flutuante Mínima (2ª Janela Tauri)** | Limitada (Wayland não permite janelas posicionarem-se livremente sem `wlr-layer-shell`) | Funcional | Médio (2 webviews simultâneos) | Complexidade desnecessária de sincronização de estado e incompatibilidade com GNOME Wayland |
| **Plugin de Atalho Global** | **Falha/Inoperante** | Funcional | Baixo | Rejeitada devido à incompatibilidade inerente com Wayland |

### Comportamento de Foco no Wayland (Focus Stealing Prevention)

Ao disparar um comando a partir de um atalho do próprio desktop:
- **XDG Activation Protocol (`xdg_activation_v1`):** O compositor (GNOME Mutter ou KDE KWin) gera um token de ativação ao detectar a tecla de atalho e o repassa ao processo lançado via `xdg-open`.
- **Single Instance no Tauri:** O plugin `tauri-plugin-single-instance` (compilado com a feature `deep-link`) intercepta a invocação do segundo processo (`z-notes znotes://capture`), repassa a URL para a instância já aberta e executa na janela principal:
  ```rust
  if let Some(window) = app.get_webview_window("main") {
      let _ = window.unminimize();
      let _ = window.show();
      let _ = window.set_focus();
  }
  ```
- **Resultado:** A janela ativa-se imediatamente para o primeiro plano, e o frontend navega para `/inbox` focando o campo de texto do composer em menos de 1 segundo.

---

## 2. Arquitetura da Solução

### 1. Registro do Esquema de URI `znotes://`

No Tauri (`apps/desktop/src-tauri/tauri.conf.json`):
```json
"plugins": {
  "deep-link": {
    "desktop": {
      "schemes": ["znotes"]
    }
  }
}
```
No Linux, o pacote `.deb` registra o MIME type `x-scheme-handler/znotes;` em seu arquivo `.desktop`. Para AppImage e execução em desenvolvimento (`tauri dev`), o setup em `apps/desktop/src-tauri/src/lib.rs` executa `app.deep_link().register_all()?` em runtime, associando o handler ao `xdg-mime`.

### 2. Roteador de Deep Links no Frontend

O componente `DeepLinkRouter` (`apps/web/src/lib/DeepLinkRouter.tsx`) centraliza a escuta de URLs do app Tauri:
- **`znotes://auth?token=...`**: conclui o login com Google delegando a atualização de sessão ao `AuthContext`.
- **`znotes://capture`**:
  - Se o usuário estiver autenticado:
    1. Navega para `/inbox`.
    2. Emite o evento `znotes:desktop-capture`.
    3. `InboxChatView` e `InboxComposer` recebem o evento, preenchem o texto (se fornecido) e focam o campo de texto com o cursor no final.
  - Se o usuário estiver deslogado:
    1. Salva a captura pendente em `localStorage` (`savePendingCapture`).
    2. Exibe alerta na tela de login (`LoginPage`).
    3. Ao concluir a autenticação, redireciona automaticamente para `/inbox` com o composer preenchido e focado.

### 3. Regra de Segurança: Não Gravação Automática

Assim como no Web Share Target, o deep link `znotes://capture?text=...` **apenas pré-preenche o campo do composer**.
- Links em páginas web maliciosas poderiam tentar disparar `znotes://capture` em background.
- Ao exigir que o usuário revise o texto e pressione **Enter** (ou clique em **Enviar**), prevenimos qualquer inserção indevida ou silenciosa de conteúdo.
- Ao ser enviado, o item é gravado no banco de dados com `source: "desktop"`.

---

## 3. Guia de Configuração de Atalhos no Linux

### GNOME (Ubuntu 22.04 / 24.04 LTS, Fedora, Debian, Pop!_OS)

1. Abra o aplicativo **Configurações** (*Settings*) do sistema.
2. Na barra lateral, selecione **Teclado** (*Keyboard*).
3. Na seção *Atalhos de teclado*, clique em **Ver e personalizar atalhos** (*View and Customize Shortcuts*).
4. Role até o fim e selecione **Atalhos personalizados** (*Custom Shortcuts*).
5. Clique em **Adicionar atalho** (`+`) e preencha:
   - **Nome:** `z-notes: Captura Rápida`
   - **Comando:** `xdg-open znotes://capture`
   - **Atalho:** Pressione a combinação desejada (sugestão: `Ctrl + Alt + C` ou `Super + Alt + N`).
6. Clique em **Adicionar**.

Pronto! Ao pressionar a combinação de teclas de qualquer lugar do sistema, a janela do z-notes virá para a frente com o composer do Inbox em foco.

---

### KDE Plasma 5 e 6 (Kubuntu, Fedora KDE, openSUSE)

1. Abra as **Configurações do Sistema** (*System Settings*).
2. Acesse **Atalhos** (*Shortcuts*) → **Atalhos personalizados** (*Custom Shortcuts* ou *Command/URL*).
3. Clique em **Adicionar novo** (*Add New*) → **Atalho global** → **Comando/URL**.
4. Configure:
   - **Nome:** `z-notes Captura`
   - **Comentário:** `Captura rápida no z-notes Inbox`
   - Na aba **Gatilho** (*Trigger*), atribua o atalho (ex.: `Ctrl+Alt+C`).
   - Na aba **Ação** (*Action*), digite: `xdg-open znotes://capture`.
5. Clique em **Aplicar**.

---

### Sway / i3 Window Manager

Adicione a linha abaixo ao seu arquivo de configuração (`~/.config/sway/config` ou `~/.config/i3/config`):

```bash
# z-notes captura rápida
bindsym $mod+Mod1+c exec xdg-open znotes://capture
```

---

### Hyprland

Adicione a linha abaixo ao arquivo `~/.config/hypr/hyprland.conf`:

```ini
# z-notes captura rápida
bind = $mainMod ALT, C, exec, xdg-open znotes://capture
```

---

## 4. Testes e Validação Manual via Terminal

Para validar a integração diretamente pela linha de comando:

```bash
# 1. Abrir e focar o composer vazio do Inbox:
xdg-open znotes://capture

# 2. Abrir e pré-preencher com texto (sem gravar automaticamente):
xdg-open "znotes://capture?text=Comprar%20pao%20na%20padaria"
```
