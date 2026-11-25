# Captura Rápida no Android via Web Share Target (PWA)

## Visão Geral

O **z-notes** integra-se à folha de compartilhamento nativa do **Android** através da API **Web Share Target** do PWA. Isso permite compartilhar textos, links e anotações a partir de qualquer aplicativo (Google Chrome, YouTube, WhatsApp, Twitter/X, navegadores e apps de notas) diretamente para o **Inbox** do z-notes.

---

## Como Funciona

### 1. Manifesto PWA (`share_target`)

No arquivo de configuração do PWA (`apps/web/vite.config.ts`), declaramos o alvo de compartilhamento:

```json
"share_target": {
  "action": "/inbox/share",
  "method": "GET",
  "params": {
    "title": "title",
    "text": "text",
    "url": "url"
  }
}
```

- **Método GET sem Service Worker customizado**: A requisição cai diretamente no `navigateFallback` do SPA (`/index.html`) e o frontend lê e processa os parâmetros da query string (`?title=...&text=...&url=...`).
- **Sem envio automático (segurança e controle)**: Abrir `/inbox/share` apenas **pré-preenche o composer** do Inbox. O usuário tem a oportunidade de revisar, adicionar comentários ou cancelar antes de tocar em **Enviar**. Isso previne efeitos colaterais indesejados ao clicar em links acidentalmente.

### 2. Normalização Inteligente de Conteúdo

Diferentes aplicativos no Android enviam dados em formatos variados:
- **Chrome / Navegadores**: enviam `title` com o título da aba e `url` com o link (deixando `text` vazio).
- **YouTube**: envia `title` com o nome do vídeo, `text` com a URL e `url` com o mesmo link.
- **WhatsApp**: envia apenas `text` com a mensagem pura ou links colados.
- **Apps de anotação**: enviam `title` e `text` em múltiplas linhas, sem URL.

A função `normalizeSharePayload` (`apps/web/src/lib/shareTarget.ts`) unifica o conteúdo evitando repetições desnecessárias:
- Se a URL já estiver presente dentro do texto, ela não é concatenada novamente.
- Se o título for idêntico à URL ou já estiver contido no texto, evita duplicações.
- Limpa a URL na barra de endereços (`history.replaceState` para `/inbox`) após o pré-preenchimento para que recarregar a tela não repita a captura.

### 3. Preservação de Conteúdo para Usuários Deslogados

Se o usuário receber um compartilhamento com a sessão expirada ou deslogado:
1. O conteúdo compartilhado é normalizado e persistido temporariamente no `localStorage` sob a chave `znotes:pending_share` com validade de 15 minutos.
2. A tela de login (`LoginPage`) exibe um alerta confirmando o recebimento do conteúdo.
3. Ao concluir a autenticação com a conta Google, o app redireciona automaticamente para o `/inbox`.
4. O composer é restaurado com o texto original e a chave temporária é removida.

### 4. Captura Offline

Como o composer utiliza a fila offline do React Query (`useCreateInboxItem`), o envio de itens compartilhados funciona mesmo em modo avião ou sem conexão. A mensagem ganha ID otimista temporário, exibe o indicador visual na timeline e sincroniza com o servidor assim que a conexão for restabelecida, registrando a origem como `source: "share"`.

---

## Como Instalar e Usar no Android

### Passo a Passo de Instalação:
1. Abra o z-notes no **Google Chrome** no Android (ex: `https://notes.o.ziltro.dev`).
2. Toque no menu de opções do navegador (**⋮** no canto superior direito).
3. Selecione **"Instalar aplicativo"** (ou **"Adicionar à tela inicial"**).
4. Confirme a instalação. O Android criará o aplicativo WebAPK e registrará os intents de compartilhamento do sistema.

### Como Compartilhar:
1. Em qualquer aplicativo (por exemplo, lendo uma notícia no Chrome ou um vídeo no YouTube), toque no botão **Compartilhar** nativo do Android.
2. Na folha de compartilhamento do sistema, selecione o ícone do **z-notes**.
3. O app será aberto diretamente na aba **Inbox**, com o texto e o link prontos no composer.
4. Faça os ajustes desejados e toque em **Enviar**.

> [!NOTE]
> **Atualização do WebAPK**: O Android atualiza os WebAPKs em segundo plano periodicamente. Caso o z-notes não apareça imediatamente na lista de compartilhamento após uma atualização do app, desinstale o atalho existente e reinstale-o pelo Chrome para forçar o registro instantâneo dos alvos.

---

## Compatibilidade e Limitações

| Plataforma / Navegador | Suporte Web Share Target | Observações |
|---|---|---|
| **Chrome Android** (76+) | **Sim** | Suporte completo via PWA instalado |
| **Samsung Internet** | **Sim** | Suporte completo via PWA instalado |
| **Edge Android** | **Sim** | Suporte completo via PWA instalado |
| **Opera Android** | **Sim** | Suporte completo via PWA instalado |
| **Safari / iOS** | **Não** | A Apple não implementa Web Share Target para PWAs no iOS. Para captura no iPhone/iPad, utilize a automação do app Atalhos (Shortcuts) via API de token pessoal (ver issue #32). |
| **Firefox** (Android e Desktop) | **Não** | O Firefox ainda não oferece suporte à especificação Web Share Target. |
