# App Mobile z-notes (React Native / Expo)

Documentação técnica, decisões de arquitetura e guia de implementação do aplicativo mobile do **z-notes** (atendendo integralmente às issues #4 e #82).

---

## 1. Decisão Técnica de Stack: React Native / Expo vs Flutter

A issue #4 colocou em aberto a escolha entre reescrever o cliente em **Flutter** ou consolidar o app existente em **React Native / Expo**.

### Decisão Consolidada
**Adoção definitiva do React Native / Expo** no diretório `apps/mobile/`.

### Critérios e Justificativas Técnicas
1. **Reaproveitamento no Monorepo (`@z-notes/shared`)**:
   - O pacote `packages/shared/` exporta tipos essenciais (`Note`, `NoteMeta`, `FolderTreeNode`, `PublicUser`, `NoteViewFilter`) e funções utilitárias puras (como `deriveTitle`).
   - Manter o ecossistema TypeScript unificado elimina duplicidade de contratos e garante tipagem estática ponta a ponta sem risco de dessincronização entre backend e app.
2. **Reaproveitamento de Testes e Código Existente**:
   - O projeto já possuía componentes de tela, modais, hooks customizados e clientes de API integrados, totalizando mais de 100 testes unitários no Vitest com execução ultra-rápida.
   - Reescrever em Flutter exigiria criar do zero um cliente HTTP em Dart, parsing de Markdown, cache SQLite/Hive local, modelos e suite de testes, gerando custo elevado sem ganho prático para o produto.
3. **Performance Nativa com Expo 57 e Hermes**:
   - Utilização do runtime Hermes pré-compilado, inicialização veloz e suporte pleno a gestos nativos e animações fluidas.
4. **Isolamento e Segurança**:
   - Credenciais gerenciadas pelo `expo-secure-store` nativo e armazenamento offline via `@react-native-async-storage/async-storage`.

---

## 2. Autenticação Google e Isolamento Multiusuário

### Fluxo de Autenticação OAuth no Navegador Nativo
- **Restrição do Google:** O Google bloqueia fluxos OAuth iniciados diretamente dentro de WebViews embebidas (`disallowed_useragent`).
- **Solução Implementada:** O `LoginScreen` utiliza `expo-web-browser` com `openAuthSessionAsync`, abrindo o fluxo no navegador do sistema (Custom Tabs no Android / ASWebAuthenticationSession no iOS) apontando para `/api/auth/google?client=app`.
- **Deep Link de Retorno (`znotes://auth`):**
  - O scheme `znotes` está registrado no manifesto do app em `app.json`.
  - Ao concluir a autenticação, o servidor redireciona para `znotes://auth?token=<jwt>`.
  - O app intercepta a URL com `parseAuthRedirect`, extrai o JWT e grava com segurança no `expo-secure-store`.

### Isolamento Estrito de Cache por Usuário
Para garantir que dois usuários no mesmo dispositivo nunca tenham acesso às anotações um do outro:
1. **Armazenamento de Credenciais (`api/http.ts`)**:
   - `saveCurrentUser(user: PublicUser)` e `saveToken(token: string)` persistem no `SecureStore`.
2. **Chaves de Cache Particionadas (`lib/storage.ts`)**:
   - O cache do React Query é persistido no `AsyncStorage` sob a chave isolada `z-notes-cache:<userId>` via `cacheKeyFor(userId)`.
   - Se o usuário `userId = 1` deslogar e `userId = 2` logar, o cache restaurado é estritamente de `userId = 2`.
3. **Limpeza Completa no Logout (`App.tsx` e `SettingsScreen.tsx`)**:
   - `client.clear()`: limpa o cache em memória do TanStack Query.
   - `clearUserCache(userId)`: remove a chave `z-notes-cache:<userId>` do `AsyncStorage`.
   - `clearToken()` e `clearCurrentUser()`: limpam as chaves do `SecureStore`.
   - Redireciona a tela para o `LoginScreen`.

---

## 3. CRUD de Notas, Busca e Suporte Offline

### Visualização e Organização
- **Filtros de Visão (`NoteViewFilter`)**:
  - **Todas as notas**: listagem de notas ativas.
  - **Fixadas**: notas marcadas com alfinete (📌), destacadas na listagem e agrupadas na visão `view="pinned"`.
  - **Arquivadas**: notas arquivadas (📦), com indicação visual.
  - **Lixeira**: notas excluídas (modo somente-leitura com opções de restauração ou exclusão permanente).
- **Gaveta de Pastas (`FolderDrawer`)**:
  - Navegação entre pastas raiz e subpastas hierárquicas.
  - Acesso direto às configurações do app.

### Edição e Markdown
- **Modo Visualização por Padrão**: a nota abre renderizada em Markdown limpo; toque no lápis (✏️) para editar.
- **Barra de Ferramentas Markdown (`MarkdownToolbar`)**: atalhos rápidos para cabeçalhos (`#`), negrito (`**`), itálico (`*`), caixas de seleção (`- [ ]`) e blocos de código.
- **Autosave Debounced**: alterações são enviadas após 750ms de inatividade, com indicador de status em tempo real ("Salvo", "Salvando...", "Erro").
- **Ações da Nota (`NoteActionModal`)**:
  - Fixar / Desafixar (📌)
  - Mover para pasta (📁)
  - Arquivar / Desarquivar (📦)
  - Mover para a lixeira (🗑️)
  - Restaurar nota (♻️)
  - Excluir definitivamente (⚠️)

### Suporte Offline-First e Fila de Mutações
- **Modo de Rede (`offlineFirst`)**:
  - Leituras consultam imediatamente o cache persistido no `AsyncStorage`, permitindo abrir o app no modo avião instantaneamente.
- **Resumo de Mutações Pausadas**:
  - A chave de mutação `UPDATE_NOTE_KEY` (`["updateNote"]`) está configurada com mutação padrão no `createQueryClient`.
  - Ao editar uma nota sem internet, a mutação fica em estado pausado no cache persistido.
  - Ao reconectar, `onSuccess` do `PersistQueryClientProvider` dispara `client.resumePausedMutations()`, sincronizando todas as edições pendentes com o servidor automaticamente.

---

## 4. Verificação e Testes

### Execução dos Testes Automatizados
```bash
# Testes unitários e de integração do app mobile (116 testes)
pnpm --filter @z-notes/mobile test

# Checagem de tipos estáticos TypeScript
pnpm --filter @z-notes/mobile typecheck

# Suite completa do monorepo (385 testes)
pnpm test
pnpm typecheck
```

---

## 5. Capturas de Tela

### Login com Google e Deep Link
![Login Mobile](https://raw.githubusercontent.com/guiliznas/z-notes/agentes/david/feat-mobile-app/docs/screenshots/mobile-login.png)

### Lista de Notas com Busca e Notas Fixadas
![Lista de Notas Mobile](https://raw.githubusercontent.com/guiliznas/z-notes/agentes/david/feat-mobile-app/docs/screenshots/mobile-notelist.png)

### Detalhe e Edição de Nota com Markdown
![Detalhe da Nota Mobile](https://raw.githubusercontent.com/guiliznas/z-notes/agentes/david/feat-mobile-app/docs/screenshots/mobile-notedetail.png)

### Configurações com Conta Google Conectada e Cache Offline
![Configurações Mobile](https://raw.githubusercontent.com/guiliznas/z-notes/agentes/david/feat-mobile-app/docs/screenshots/mobile-settings.png)
