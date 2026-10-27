# Backup e recuperação do z-notes (VPS Oracle)

Tudo vai para o bucket R2 `z-notes-backup` (Cloudflare). Credenciais do R2 e do Dokploy ficam
fora do repo (`~/.config/cloudflare-r2/z-notes.env`, `~/.config/dokploy/token` no zion-2).

## O que é salvo, onde e quando

| O quê | Como | Caminho no bucket | Quando (UTC) | Retenção |
|---|---|---|---|---|
| Banco ativo + `mirror` (consistente, via API de backup do SQLite) | `z-notes-backup.timer` na VPS (`/usr/local/sbin/z-notes-backup`) | `z-notes/live/z-notes-live-<ts>.tgz` | 06:15 | 30 dias |
| Snapshots internos do app (GFS) | Volume backup do Dokploy do volume `z-notes-backups` | `z-notes-ek9sdh/z-notes/volume-backups/*.tar` | 06:30 | 30 backups |
| Configuração do Dokploy (apps, envs, domínios, segredos, banco do Dokploy) | Backup "web-server" do Dokploy | `*/dokploy-config/webserver-backup-*.zip` | 06:00 | 14 backups |
| Código | GitHub `guiliznas/z-notes` | — | — | — |
| DNS | Cloudflare (`*.o` e `o` → IP da VPS, DNS-only) | — | — | — |

**Alerta:** `~/.local/bin/check-r2-backups` roda às 09:00 (BRT) no zion-2 e avisa no Telegram se o
backup do banco ou da config do Dokploy tiver mais de 30h (ou se o bucket não puder ser listado).

## Recuperar só os dados (app de pé, banco perdido/corrompido)

1. Baixar o `.tgz` mais recente de `z-notes/live/` (rclone/qualquer cliente S3 apontando para o endpoint do R2).
2. No Dokploy, parar o app (ou `docker service scale <service>=0` na VPS).
3. Extrair e copiar para o volume:
   ```bash
   tar xzf z-notes-live-<ts>.tgz            # gera z-notes/z-notes.db e z-notes/mirror
   V=/var/lib/docker/volumes/z-notes-data/_data
   sudo rm -f $V/z-notes.db-wal $V/z-notes.db-shm      # obrigatório: sidecars antigos reaplicam transações
   sudo cp z-notes/z-notes.db $V/z-notes.db
   sudo rm -rf $V/mirror && sudo cp -r z-notes/mirror $V/mirror
   ```
4. Subir o app de novo (`scale <service>=1`) e conferir `GET /api/health` e as notas.

## Recuperar a VPS inteira (máquina nova)

1. Instalar o Dokploy na nova VPS e apontar `*.o` / `o` no Cloudflare para o novo IP (DNS-only).
2. Painel → Settings → Web Server → domínio `dokploy.o.ziltro.dev` com Let's Encrypt.
3. Configurar o destino S3 do R2 (endpoint, bucket `z-notes-backup`, região `auto`) e restaurar o
   backup "web-server" mais recente (`dokploy-config/`). Isso traz apps, variáveis (incl.
   `Z_NOTES_SESSION_SECRET`, `GOOGLE_*`) e domínios.
   - Se a restauração do painel não for possível: recriar o app (GitHub `guiliznas/z-notes`,
     build Dockerfile, porta 8787, volumes `z-notes-data` → `/app/data` e `z-notes-backups` →
     `/app/backups`, **1 réplica, update stop-first**, domínio `notes.o.ziltro.dev`), e preencher
     as variáveis de `docs/deploy-dokploy.md` §3.2. Trocar o `SESSION_SECRET` só desloga as sessões.
4. Recuperar os dados conforme a seção anterior.
5. Reinstalar o backup do banco ativo na VPS: copiar `/usr/local/sbin/z-notes-backup`,
   `/etc/z-notes-backup.env` (chaves R2, chmod 600) e a unit/timer `z-notes-backup.{service,timer}`
   (ver abaixo), depois `systemctl enable --now z-notes-backup.timer`.

### Unit/timer do backup do banco

```ini
# /etc/systemd/system/z-notes-backup.service
[Unit]
Description=Backup do z-notes para o R2
After=docker.service
[Service]
Type=oneshot
ExecStart=/usr/local/sbin/z-notes-backup

# /etc/systemd/system/z-notes-backup.timer
[Timer]
OnCalendar=*-*-* 06:15:00 UTC
Persistent=true
[Install]
WantedBy=timers.target
```

O script faz: `better-sqlite3 .backup` dentro do container → `integrity_check` → tar do banco +
`mirror` → upload com rclone (`RCLONE_S3_NO_CHECK_BUCKET=true`, porque o token não cria buckets) →
apaga objetos com mais de 30 dias em `z-notes/live/`.

## Verificação periódica

Uma vez por mês, baixar o último `.tgz` de `z-notes/live/`, extrair e rodar
`sqlite3 z-notes.db "pragma integrity_check; select count(*) from notes;"`. Última verificação
completa: 2026-10-27 (snapshot de volume baixado do R2, 4 zips íntegros; backup do banco ativo
gerado com `integrity_check` ok e 4 notas).
