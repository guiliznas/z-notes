# Deploy e migração — z-notes

Como rodar o projeto em uma máquina nova (do zero ou migrando os dados).

## Pré-requisitos

- Docker + Docker Compose plugin
- Conta no Google Cloud Console (para o login OAuth)
- HTTPS na frente do container (ex.: Cloudflare Tunnel) — o cookie de sessão é
  `Secure`, então **sem HTTPS o login não fixa**

## Rodando do zero

1. Clone o repo e entre na pasta:
   ```bash
   git clone https://github.com/guiliznas/z-notes.git
   cd z-notes
   ```
2. Copie e preencha o `.env`:
   ```bash
   cp .env.example .env
   ```
   | Variável | Obrigatória | Descrição |
   |---|---|---|
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | sim | OAuth client (tipo *Web application*) no Google Cloud Console |
   | `GOOGLE_CALLBACK_URL` | sim | `https://<seu-domínio>/api/auth/google/callback` |
   | `Z_NOTES_SESSION_SECRET` | sim | Segredo aleatório longo (`openssl rand -hex 32`); o compose recusa subir sem ele |
   | `Z_NOTES_ADMIN_EMAILS` | não | CSV de e-mails com acesso a `/admin` |
   | `Z_NOTES_BACKUP_CRON` / `Z_NOTES_BACKUP_WEBHOOK_URL` | não | Defaults: diário 3h, sem webhook |
3. No Google Cloud Console, registre a **Authorized redirect URI** exatamente igual
   à `GOOGLE_CALLBACK_URL` (esquema, domínio, path e barra final contam;
   `redirect_uri_mismatch` = URI divergente).
4. Suba:
   ```bash
   docker compose up -d --build
   ```
   A imagem compila o `better-sqlite3` sozinha (Node 22 + build tools) e cria
   `./data` (SQLite + espelho `.md`) e `./backups` (snapshots) como volumes.
5. Exponha a porta 8787 via HTTPS (ex.: `cloudflared` com o hostname apontando
   para `localhost:8787`) e acesse `https://<seu-domínio>`.

Sem as credenciais Google, o app sobe mas `/api/auth/google` retorna 503
(comportamento esperado até configurar).

## Migrando de máquina (levando os dados)

1. Na máquina antiga, com o container rodando ou parado, copie as pastas:
   - `./data` — SQLite + espelho (obrigatório)
   - `./backups` — snapshots recorrentes (opcional, mas recomendado)
   - `.env` — segredos e credenciais (obrigatório; **nunca commite**)
2. Na máquina nova, clone o repo e coloque essas pastas/arquivo no lugar.
3. Se o domínio mudou, atualize `GOOGLE_CALLBACK_URL` no `.env` **e** a redirect
   URI no Google Cloud Console.
4. `docker compose up -d --build`.
5. No primeiro boot, migrações idempotentes rodam sozinhas (ex.: colunas
   `user_id`/`is_admin`); um snapshot de segurança é gerado quando há mudança
   de schema.
6. Faça login: se as notas vieram de era single-tenant (`user_id` NULL), o
   **primeiro login adota tudo** (só funciona quando ainda há 1 usuário).

Trocar o `Z_NOTES_SESSION_SECRET` só invalida sessões ativas (todo mundo
reloga) — nenhum dado se perde.

## Desenvolvimento (opcional)

```bash
export PATH="/home/guiliznas/.local/share/mise/installs/node/25.8.1/bin:$PATH"  # ABI 141 do better-sqlite3
pnpm install --ignore-scripts
cp .env.example .env   # GOOGLE_CALLBACK_URL=http://localhost:8787/... já é o default em dev
pnpm dev               # server :8787 + web :5173
pnpm test && pnpm typecheck && pnpm build
```

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `redirect_uri_mismatch` | URI no Console diferente da `GOOGLE_CALLBACK_URL` |
| 503 no login | `GOOGLE_*` ausente no `.env` (ver log do container) |
| Conta bloqueada no consentimento | App em modo Testing sem o e-mail em *test users* |
| Boot falha com session secret | `Z_NOTES_SESSION_SECRET` vazio (proposital em produção) |
| Login "não fixa" | Acesso via HTTP puro — o cookie exige HTTPS |
| Testes do server falham localmente | Node diferente do 25 (ver ABI no `CLAUDE.md`, gotcha #4) |
