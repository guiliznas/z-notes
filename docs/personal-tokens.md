# Tokens Pessoais de Captura (iOS Atalhos, Tasker, bots e terminal)

Este documento descreve a arquitetura, segurança e guia de uso dos **Tokens Pessoais de Captura** do z-notes (implementados a partir das issues #32 e #94).

---

## 1. Objetivo e Motivação

O z-notes disponibiliza captura rápida interna no app e no desktop, além de Web Share Target no Android via PWA. Contudo, integrações externas e automações exigiam um mecanismo de autenticação dedicado:

- **Por que não reaproveitar o login (JWT / cookie)?**
  O JWT gerado na autenticação possui validade de 30 dias e concede **acesso administrativo e de leitura/escrita irrestrito** a todas as notas, pastas, tarefas e configurações da conta. Colá-lo em scripts, webhooks ou atalhos de terceiros seria um risco inaceitável de vazamento de credenciais.
- **Tokens de escopo restrito (`inbox:write`):**
  O token pessoal foi desenhado com o princípio do menor privilégio. Ele permite **exclusivamente enviar mensagens ao Inbox** (`POST /api/inbox`), sem qualquer capacidade de listar ou ler notas, tarefas ou o próprio Inbox.

---

## 2. Arquitetura e Modelo de Segurança

1. **Formato com Prefixo Reconhecível (`znt_`):**
   - Cada token possui o prefixo `znt_` seguido por 32 bytes aleatórios criptograficamente seguros codificados em hexadecimal (64 caracteres), ex.: `znt_9f83a1b2c3d4e5f6...`.
   - O prefixo facilita varredores de segredos (como git-secrets / gitleaks) e permite ao roteador do servidor identificar o tipo de credencial antes de qualquer decodificação.

2. **Armazenamento Apenas do Hash SHA-256:**
   - A tabela `api_tokens` armazena `token_hash = sha256(token)` e um prefixo visual de exibição (`token_prefix`, ex.: `znt_9f83a1b2…`).
   - O token completo em texto puro é retornado **uma única vez** no momento de sua criação (`POST /api/tokens`). O servidor nunca grava o token em texto puro e ele nunca aparece em logs da aplicação.

3. **Escopo Estrito e Isolamento de Dados:**
   - Requisições com token pessoal em rotas de leitura (`GET /api/inbox`, `GET /api/notes`, `GET /api/tasks`, etc.) ou mutação fora do Inbox recebem imediatamente **403 Forbidden**.
   - Cada token pertence a um `userId`. As mensagens capturadas são gravadas exclusivamente na timeline daquele usuário (`userId`), garantindo 100% de isolamento entre contas.

4. **Revogação Imediata:**
   - Ao revogar um token na interface ou via `DELETE /api/tokens/:id`, o campo `revoked_at` é registrado com o timestamp atual.
   - Qualquer chamada subsequente com aquele token é rejeitada instantaneamente com **401 Unauthorized**.

5. **Proteção Contra Sobrecarga (Rate Limiting):**
   - O endpoint `POST /api/inbox` conta com taxa de limite dedicada (máximo de 60 requisições por minuto por IP/token), mitigando loops acidentais de scripts ou bots.

---

## 3. Guia de Integração e Exemplos

### A. Terminal e Linha de Comando (cURL / Bash / Zsh)

Capture ideias diretamente do terminal executando:

```bash
curl -X POST https://seu-znotes.com/api/inbox \
  -H "Authorization: Bearer znt_SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"content": "Comprar café e revisar relatório do projeto"}'
```

#### Alias de Terminal (`znote`)
Adicione ao seu `~/.bashrc` ou `~/.zshrc`:

```bash
znote() {
  local token="znt_SEU_TOKEN_AQUI"
  local url="https://seu-znotes.com/api/inbox"
  curl -s -X POST "$url" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"$*\"}" > /dev/null && echo "✓ Capturado no z-notes!"
}
```

Uso:
```bash
znote Ideia rápida para o próximo release
```

---

### B. Atalhos do iOS (Apple Shortcuts / Siri)

O iOS não oferece suporte a Web Share Target para PWAs instalados na tela inicial. A integração oficial com iPhone e iPad é feita pelo app nativo **Atalhos (Shortcuts)**:

1. Abra o app **Atalhos** no iOS e crie um **Novo Atalho**.
2. Adicione a ação **"Obter Conteúdo do URL"** (Get Contents of URL).
3. Configure os seguintes campos:
   - **URL:** `https://seu-znotes.com/api/inbox`
   - **Método:** `POST`
   - **Cabeçalhos (Headers):**
     - Chave: `Authorization`
     - Valor: `Bearer znt_SEU_TOKEN_AQUI`
     - Chave: `Content-Type`
     - Valor: `application/json`
   - **Corpo da Requisição (Request Body):** `JSON`
     - Chave: `content`
     - Valor: selecione a variável **"Entrada do Atalho"** (Shortcut Input) ou use a ação prévia **"Solicitar Entrada"** (Ask for Input) para digitar ao disparar.
4. (Opcional) Adicione uma ação **"Exibir Notificação"** com o texto "Capturado no z-notes!".
5. Ative a opção **"Mostrar na Folha de Compartilhamento"** nas configurações do atalho para que ele apareça ao compartilhar qualquer link ou texto no Safari, Twitter, YouTube e outros apps.

---

### C. Android Tasker / Automate

Para automações avançadas no Android (ex.: registrar SMS bancário ou anotações por voz):

1. Crie uma nova Ação em **Tasker** do tipo **Net -> HTTP Request**.
2. **Method:** `POST`
3. **URL:** `https://seu-znotes.com/api/inbox`
4. **Headers:**
   ```http
   Authorization: Bearer znt_SEU_TOKEN_AQUI
   Content-Type: application/json
   ```
5. **Body:**
   ```json
   {"content": "%TEXT_VAR"}
   ```

---

### D. Bots e Webhooks (Telegram / Discord)

Exemplo em Node.js para encaminhar mensagens de um bot do Telegram:

```typescript
async function sendToZNotes(messageText: string) {
  const response = await fetch("https://seu-znotes.com/api/inbox", {
    method: "POST",
    headers: {
      "Authorization": "Bearer znt_SEU_TOKEN_AQUI",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: messageText,
      source: "api",
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar ao z-notes: ${response.status}`);
  }
}
```

---

## 4. Referência dos Endpoints

| Método | Endpoint | Autenticação | Descrição |
|---|---|---|---|
| `GET` | `/api/tokens` | Cookie de Sessão / JWT | Lista os tokens criados pelo usuário logado |
| `POST` | `/api/tokens` | Cookie de Sessão / JWT | Cria um novo token (`name` obrigatório). Retorna o token em texto puro uma única vez |
| `DELETE` | `/api/tokens/:id` | Cookie de Sessão / JWT | Revoga imediatamente o token especificado |
| `POST` | `/api/inbox` | `Bearer znt_...` ou Cookie | Captura item no Inbox. Aceita `{ "content": "..." }` ou `{ "text": "..." }`. `clientId` é gerado automaticamente se omitido |
