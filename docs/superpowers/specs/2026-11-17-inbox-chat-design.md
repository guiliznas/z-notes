# Design Spec: Inbox no estilo chat com captura offline

**Data:** 2026-11-17  
**Issue:** #27 / #89 (parte do épico #25)  
**Autor:** David (@david)

---

## 1. Visão Geral

O **Inbox** é um espaço de alta velocidade para capturar pensamentos, links e tarefas sem atrito de categorização prévia. A experiência do usuário é inspirada em aplicativos de mensagens ("conversa consigo mesmo"):
- Mensagens aparecem em ordem cronológica (mais antigas em cima, mais recentes embaixo);
- O composer fica fixo na base da tela para acesso imediato;
- A captura é instantânea via atualização otimista (com estado "enviando…");
- Suporte total offline: mutações pausadas são persistidas no IndexedDB e retomadas automaticamente ao reconectar sem perda de dados nem duplicidade (`clientId` único);
- Falhas definitivas (ex.: 400) mantêm a mensagem visível com opções de cópia e reenvio manual.

---

## 2. Respostas às Perguntas do Épico #25

1. **Navegação:**
   - O Inbox ocupa o terceiro espaço no alternador de seções: **Notas | Tarefas | Inbox**.
   - O item exibe um badge com a contagem de mensagens pendentes sempre que `count > 0`.
   - Rota canônica: `/inbox`.
2. **Histórico e Itens Processados:**
   - Itens processados (convertidos em nota ou tarefa) **permanecem no histórico** e ganham tag indicativa (`Convertida em tarefa` ou `Convertida em nota`).
   - Filtros na barra lateral e no topo mobile:
     - **Pendentes** (padrão): itens ativos aguardando triagem;
     - **Processadas**: itens convertidos com referência à entidade criada;
     - **Arquivadas**: itens descartados sem conversão.
3. **Comportamento do Composer e Mensagens Longas:**
   - No desktop: `Enter` envia a mensagem; `Shift+Enter` insere quebra de linha.
   - No mobile: `Enter` insere quebra de linha; envio pelo botão com ícone de avião/envio.
   - O campo é auto-expansível até um limite confortável (~160px) com scroll interno a partir disso.
   - Após o envio, o foco retorna automaticamente ao composer.
4. **Links Clicáveis:**
   - URLs no corpo da mensagem (`https?://...`) são detectadas e renderizadas como links acessíveis (`target="_blank" rel="noopener noreferrer"`).
5. **Acessibilidade:**
   - O fluxo de mensagens possui região `aria-live="polite"` para anúncio de novas mensagens adicionadas.
   - Campo de entrada com `aria-label="Mensagem do Inbox"`.

---

## 3. Especificação Visual e Estados

### 3.1. Desktop (Claro e Escuro)
- **Barra lateral (240px, `var(--sidebar)`):**
  - Topo: `SectionSwitch` com abas [Notas | Tarefas | Inbox (badge)].
  - Navegação de filtros:
    - `Pendentes` (com badge de contagem);
    - `Processadas`;
    - `Arquivadas`.
  - Rodapé: `SidebarFooter` (configurações, usuário, logout).
- **Área principal (flex-1, `var(--bg)`):**
  - **Cabeçalho:** Título da visão ("Inbox" / "Pendentes"), contagem de mensagens, e status de conexão.
  - **Área de rolagem:** Lista de mensagens cronológica, abrindo rolada até o final. Botão "Carregar mensagens anteriores" no topo se houver paginação pendente.
  - **Separadores de dia:** Pílulas discretas centralizadas (`var(--surface-hover)`, texto `var(--muted)`): "Hoje", "Ontem" ou data por extenso (ex.: "16 de novembro").
  - **Bolhas de mensagem:**
    - Fundo `var(--surface)`, borda `var(--border)`, texto `var(--text)`.
    - Alinhadas com hora de captura à direita em `var(--muted)`.
    - Indicador "enviando…" durante sincronização otimista.
  - **Composer fixo na base:**
    - Container estilizado com fundo `var(--surface)`, textarea sem bordas invasivas, botão de envio discreto.

### 3.2. Celular (Mobile)
- Ocupa 100% da viewport vertical.
- Topo: Barra com botão de acesso às seções (drawer/menu), título "Inbox" e seletor rápido de filtro (Pendentes / Processadas / Arquivadas).
- Base: Composer fixo acima do teclado virtual com botão de envio evidente.

### 3.3. Folha de Estados
1. **Inbox zero (Vazio):**
   - Ícone de caixa de entrada em destaque (`var(--muted)`).
   - Título: "Inbox zero".
   - Subtítulo: "Nenhuma mensagem pendente. Use o campo abaixo para capturar pensamentos, links ou tarefas rapidamente."
2. **Carregando:**
   - Indicador discreto de carregamento enquanto o cache inicial ou a primeira página é resolvida.
3. **Enviando (Otimista):**
   - Mensagem aparece imediatamente no fim da lista com texto "enviando…" em `var(--muted)`.
4. **Erro de Envio (ex.: 400 ou falha definitiva):**
   - Mensagem ganha contorno de alerta em `var(--danger)`.
   - Ações integradas na própria bolha: "Tentar de novo" e "Copiar texto".
5. **Mensagem Longa:**
   - Preserva quebras de linha (`whitespace-pre-wrap`), quebra palavras longas (`break-words`).
6. **Links:**
   - Detecta URLs e renderiza em cor de destaque (`var(--accent)` com sublinhado suave), abrindo em nova aba com segurança.
7. **Itens Processados e Arquivados:**
   - Exibem selos sutis indicando o desfecho ("Convertida em tarefa", "Convertida em nota" ou "Arquivada").
