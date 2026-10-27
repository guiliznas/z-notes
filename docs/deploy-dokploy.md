# Plano de deploy — z-notes na VPS Oracle via Dokploy

Objetivo: `main` merged → deploy automático → `https://notes.o.ziltro.dev` funcionando, com
dados persistentes. Complementa o [`deploy.md`](deploy.md) (deploy manual com
`docker compose`).

## 1. Análise

### 1.1 A VPS (verificado em 2026-09-26 por SSH; acesso: `ssh ubuntu@137.131.172.218`, com `sudo`)

| Item | Valor |
|---|---|
| Host / IP | `ziltro-world` — `137.131.172.218` |
| Arquitetura | **aarch64** (Oracle Ampere), Ubuntu 26.04 LTS |
| Recursos | 2 vCPU, 11 GiB RAM, **sem swap**, 180 GB livres |
| Docker | 29.8.1 em modo **Swarm** — Dokploy usa `docker service` |
| Dokploy | v0.30.6, painel `:3000`, Postgres próprio |
| Proxy | `dokploy-traefik` v3.6.7, publica **80 e 443** na internet |
| Firewall | `ufw`: OpenSSH + 80/443. Security list da Oracle já liberada |
| TLS | **zero certificados** (`acme.json` vazio; 443 = `TRAEFIK DEFAULT CERT`) |
| `cloudflared` | não instalado |
| nginx | instalado mas **inactive** (a 80 é do Traefik) |

Vizinhos: `postits-front` (`137-131-172-218.sslip.io`), `vendacorrida` +
`api.vendacorrida.…`, `hello-world`, `postgres:18`. Todos em HTTP puro,
entryPoint `web`. O IP puro devolve 404 do Traefik (nenhum router casa o Host).

### 1.2 O repo

- **`main` já tem tudo que o deploy precisa**: login Google, ownership por
  usuário, admin + métricas (`auth/google.ts`, `routes/admin.ts`, `AdminPage`).
  Não é preciso mergear nenhuma `feat/*` antes — deployar `main` é válido.
- CI em `.github/workflows/ci.yml` roda **testes + typecheck em push para `main`
  e em PR**. Isso habilita um auto-deploy *gated* (seção 3.4).
- `main` ganhou `apps/mobile` (Expo 57 + RN 0.86) e `apps/desktop` (Tauri).
- Dados a migrar: `data/` = **2,7 MB**, `backups/` = 64 KB. Trivial.

### 1.3 Bloqueadores e riscos encontrados

| # | Problema | Impacto | Onde resolve |
|---|---|---|---|
| B1 | **Sem HTTPS na VPS** e cookie de sessão é `Secure` | Login com Google **nunca fixa**; app inutilizável | 3.3 |
| B2 | `Dockerfile` roda `pnpm install` na **raiz do workspace** → instala Expo/React Native e o CLI do Tauri, que o servidor não usa. O estágio de runtime copia `/app` inteiro | Build de vários minutos em 2 vCPU e imagem inflada com centenas de MB inúteis | 3.1 |
| B3 | Swarm pode rodar **>1 réplica**; duas tasks no mesmo SQLite/WAL corrompem dados e duplicam o cron de backup | Perda/corrupção de dados | 3.2 |
| B4 | Sem volume, **todo redeploy apaga o banco** | Perda total a cada deploy | 3.2 |
| B5 | Container em UTC: `Z_NOTES_BACKUP_CRON=0 3 * * *` roda **meia-noite em BRT** | Backup em horário errado (cosmético) | 3.2 |

`sslip.io` não resolve o B1: Let's Encrypt bate em rate limit do domínio
registrado e sem TLS o cookie morre.

## 2. Host e HTTPS (decidido)

O z-notes vai responder em **`https://notes.o.ziltro.dev`**.

O domínio `ziltro.dev` está na Cloudflare. O desenho é um wildcard **DNS-only**
`*.o.ziltro.dev` → `137.131.172.218`, com o Traefik do Dokploy emitindo um
certificado Let's Encrypt **por hostname** (desafio HTTP-01 na porta 80, que já
está aberta). O Traefik roteia por `Host` header, então o mesmo wildcard serve
todos os apps da máquina.

Por que não outras formas: o Universal SSL da Cloudflare cobre só um nível de
wildcard (`*.ziltro.dev`), **não** `*.o.ziltro.dev` — wildcard aninhado com
proxy laranja quebraria o TLS sem o Advanced Certificate Manager. E `sslip.io`
(padrão dos outros apps da VPS) não serve porque o Let's Encrypt bate em rate
limit desse domínio, e sem TLS o cookie `Secure` morre (B1).

A configuração de DNS/TLS em si não é específica deste projeto: os registros na
Cloudflare, a correção do e-mail do ACME e o passo a passo estão documentados
fora do repo, junto com a máquina. Aqui interessa só o resultado: o hostname
acima com cert válido apontando para a porta `8787` do container.

## 3. Plano de execução

### 3.1 Enxugar o build (antes do primeiro deploy) — repo

No `Dockerfile`, restringir a instalação ao que o servidor precisa:

```dockerfile
RUN pnpm install --frozen-lockfile --filter "@z-notes/server..." --filter "@z-notes/web..."
```

O `...` inclui as dependências de workspace (`@z-notes/shared`), e Expo/Tauri
ficam de fora. `pnpm build` já só builda `shared + web + server`.
Validar localmente com `docker build .` antes de subir. Ganho esperado: build
bem mais curto em 2 vCPU e imagem sem React Native.

Opcional no mesmo passo: acrescentar `apps/mobile`, `apps/desktop` e `backups`
ao `.dockerignore`.

### 3.2 Criar a aplicação no Dokploy

1. **Create Application** (tipo *Application*, não *Compose* — o Dokploy assume o
   papel do `docker-compose.yml`).
2. Provider **GitHub**, repo `guiliznas/z-notes` (público), branch **`main`**.
3. **Build Type: Dockerfile** (raiz). **Port: 8787**.
4. **Environment:**
   ```env
   PORT=8787
   TZ=America/Sao_Paulo
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   GOOGLE_CALLBACK_URL=https://notes.o.ziltro.dev/api/auth/google/callback
   Z_NOTES_SESSION_SECRET=<openssl rand -hex 32>
   Z_NOTES_ADMIN_EMAILS=gui.liznas@gmail.com
   Z_NOTES_BACKUP_CRON=0 3 * * *
   ```
   `Z_NOTES_SESSION_SECRET` é obrigatório (boot falha sem ele, de propósito).
   Sem `GOOGLE_*`, o app sobe mas `/api/auth/google` → 503.
5. **Volumes** (resolve B4):

   | Tipo | Nome | Container path |
   |---|---|---|
   | Volume | `z-notes-data` | `/app/data` |
   | Volume | `z-notes-backups` | `/app/backups` |

6. **Réplicas = 1 e nunca escalar** (resolve B3). Confirmar que o update é
   *stop-first* (para a task antiga antes de subir a nova) — SQLite não admite
   dois escritores.
7. **Healthcheck:** `GET /api/health` → 200 `{"ok":true}` (público, sem sessão).

### 3.3 Host + HTTPS

1. Cloudflare (zona `ziltro.dev`): `A` de `*.o` **e** de `o` →
   `137.131.172.218`, ambos **DNS-only** (cinza; proxied quebra o HTTP-01).
2. Dokploy → **Domains → Add Domain**: host `notes.o.ziltro.dev`, container
   port **8787**, **HTTPS on**, provider **Let's Encrypt**.
3. Se for o primeiro cert da máquina, corrigir antes o `email` do ACME em
   `/etc/dokploy/traefik/traefik.yml` (vem `test@localhost.com` do install).
Depois, no Google Cloud Console, registrar a *Authorized redirect URI*
**idêntica** à `GOOGLE_CALLBACK_URL` (esquema, domínio, path e barra final
contam — divergência = `redirect_uri_mismatch`).

### 3.4 Deploy automático no merge para `main`

Duas formas; a segunda é a recomendada.

**(i) Nativa do Dokploy** — conectar a GitHub App do Dokploy e ligar
*Auto Deploy*. Todo push em `main` dispara build.
Contra: deploya **mesmo se o CI falhar**.

**(ii) Gated pelo CI** (recomendada) — o Dokploy expõe uma *Deploy Webhook URL*
por aplicação. Guardar como secret `DOKPLOY_DEPLOY_WEBHOOK` no repo e acrescentar
ao `ci.yml` um job que só roda depois dos testes:

```yaml
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsSL -X POST "${{ secrets.DOKPLOY_DEPLOY_WEBHOOK }}"
```

Assim só entra em produção o que passou nos testes, e o merge do PR continua
sendo o gatilho. Com *Auto Deploy* desligado no Dokploy para não disparar duas
vezes.

### 3.5 Migrar os dados atuais

```bash
# local
cd /home/guiliznas/services/z-notes && tar czf /tmp/z-notes-data.tgz data backups
scp /tmp/z-notes-data.tgz ubuntu@137.131.172.218:/tmp/
# na VPS, após o primeiro deploy ter criado o volume
docker cp /tmp/z-notes-data.tgz <task>:/tmp/ && docker exec <task> tar xzf /tmp/z-notes-data.tgz -C /app
```

Depois reiniciar a aplicação. Migrações idempotentes rodam no boot
(`user_id`/`is_admin`) e geram snapshot de segurança quando o schema muda. No
primeiro login, notas com `user_id` NULL são **adotadas** (só enquanto há 1
usuário) — logue com a conta certa primeiro.

### 3.6 Validação

- [ ] `https://notes.o.ziltro.dev` carrega a tela de login (cadeado válido)
- [ ] Login Google conclui e **sobrevive a um F5** (prova que o cookie fixou)
- [ ] Notas migradas aparecem
- [ ] `/admin` renderiza para o e-mail admin, e 403 para outro
- [ ] Criar nota → redeploy pelo painel → nota continua lá (prova o volume)
- [ ] `docker service ls` mostra `1/1` réplica

## 4. Ordem sugerida

1. Criar os registros `*.o` / `o` na Cloudflare (seção 2).
2. Ajustar o `Dockerfile` (3.1) e mergear em `main`.
3. Criar OAuth client no Google Console com o callback definitivo
   (`https://notes.o.ziltro.dev/api/auth/google/callback`).
4. Criar o app no Dokploy com envs + volumes (3.2) e deployar na mão.
5. Domain + HTTPS (3.3) e validar o login.
6. Migrar os dados (3.5).
7. Ligar o auto-deploy (3.4) e testar com um commit bobo.
8. Rodar o checklist (3.6).

Passos 1–3 são pré-requisito; 4–8 são sequenciais e cada um é verificável.

## 5. Cuidados permanentes

- **Nunca trocar o CMD por `pnpm start`**: o `pnpm` não repassa `SIGTERM`, o
  SQLite não faz checkpoint do WAL e um redeploy pode custar dados (gotcha #1).
- **Nunca escalar além de 1 réplica** (B3).
- Backup interno roda no container (`/app/backups`, cron 3h). Para redundância,
  apontar o *volume backup* do Dokploy para `z-notes-data`.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Login não fixa / volta pra tela de login | HTTP puro (cookie `Secure`) — seção 3.3 |
| Notas desaparecem após redeploy | Volume não configurado (3.2) |
| 502 no domínio | Port errada no Domain (é 8787) |
| Cert não emite | `A` proxied na opção A, porta 80 inacessível, ou e-mail ACME inválido |
| `redirect_uri_mismatch` | URI do Console ≠ `GOOGLE_CALLBACK_URL` |
| Boot falha no start | `Z_NOTES_SESSION_SECRET` ausente (proposital) |
| Build lento/imagem enorme | `Dockerfile` sem o filtro de workspace (3.1) |
| Backup em horário estranho | `TZ` não definido (container em UTC) |

## Pendências

- Fechar a porta 3000 do Dokploy ao público: [#19](https://github.com/guiliznas/z-notes/issues/19).
- Ativar 2FA no painel do Dokploy: [#20](https://github.com/guiliznas/z-notes/issues/20).
- Cópia dos backups na NAS: [#21](https://github.com/guiliznas/z-notes/issues/21).
