# Backup recorrente — Design

Snapshot automático e recorrente do banco (SQLite) + espelho `.md` do z-notes, rodando dentro do próprio container, com retenção em camadas (diário/semanal/mensal) e restore assistido.

Data: 2026-07-06 · Status: aprovado em brainstorming

## Decisões

| Tema | Decisão |
|---|---|
| Destino | Local no VPS, pasta `backups/` separada do `data/` ativo |
| Conteúdo do snapshot | Banco SQLite (cópia segura) + pasta `mirror/` inteira, empacotados em `.zip` |
| Detecção de mudança | Fingerprint (`MAX(updated_at)` + `COUNT(*)` de notas e pastas); sem mudança → não gera snapshot |
| Agendamento | Cron dentro do próprio processo Node (sem cron externo, sem sidecar) |
| Frequência | Diária (padrão 3h; configurável via `Z_NOTES_BACKUP_CRON`) |
| Retenção | GFS: todos os diários dos últimos 7 dias; 1 por semana nas 8 semanas seguintes; 1 por mês indefinidamente depois disso |
| Falhas | Log + webhook HTTP configurável (`Z_NOTES_BACKUP_WEBHOOK_URL`), best-effort, nunca derruba o processo |
| Restore | Script (`pnpm --filter @z-notes/server restore <arquivo>`) com backup de segurança do estado atual antes de sobrescrever |
| Extra | `POST /api/admin/backup-now` para disparar sob demanda, reaproveitando a mesma lógica |

## Arquitetura

```
apps/server/src/backup/
├── fingerprint.ts   # MAX(updated_at) + COUNT(*) de notes/folders → string opaca
├── manifest.ts       # lê/escreve backups/manifest.json (histórico de snapshots)
├── retention.ts       # selectSnapshotsToDelete(snapshots, now) — função pura (regra GFS)
├── snapshot.ts         # createSnapshotIfChanged(ctx) — orquestra fingerprint→backup→tar→manifest→limpeza
├── notify.ts            # notifyBackupFailure(webhookUrl, error) — POST best-effort, timeout 5s
├── scheduler.ts           # scheduleBackups(ctx) — cron interno (node-cron), roda runBackupJob
└── restore.ts              # applySnapshot(cfg, snapshotPath) — usado pelo script de restore
```

`apps/server/scripts/restore.ts` é um wrapper CLI fino sobre `applySnapshot`: confirma interativamente (ou `--yes`), chama a função, imprime instruções.

## Fluxo diário

1. `fingerprint.ts` calcula o estado atual do banco.
2. Compara com o fingerprint do último snapshot em `manifest.json`. Igual → encerra sem criar nada.
3. Diferente → `snapshot.ts`:
   - Cópia segura do SQLite via API de backup online do `better-sqlite3` (nunca `cp` cru do arquivo, que corromperia em modo WAL).
   - Copia a pasta `mirror/` inteira.
   - Empacota em `backups/<timestamp>.zip`.
   - Registra entrada no `manifest.json` (nome, `createdAt`, fingerprint).
4. Roda a limpeza de retenção (`retention.ts`) sobre todos os snapshots do manifest, sempre — tenha gerado arquivo novo ou não.
5. Qualquer erro em qualquer etapa → log + `notifyBackupFailure` (webhook, se configurado). Nunca propaga para derrubar o processo do servidor.

## Regra de retenção (GFS)

Dado um snapshot com idade `age = now - createdAt`:

- `age < 7 dias` → mantém sempre (sem afinar).
- `7 dias ≤ age < 7 dias + 8 semanas` → agrupa por bucket semanal (`floor(createdAt / semana_ms)`), mantém só o mais recente de cada bucket.
- `age ≥ 7 dias + 8 semanas` → agrupa por mês-calendário (UTC), mantém só o mais recente de cada bucket, **para sempre** (nunca expira o nível mensal).

Implementado como função pura `selectSnapshotsToDelete(snapshots, now)`, testável com datas sintéticas sem tocar disco.

## Fingerprint

```
fingerprint = "{MAX(notes.updated_at)}:{COUNT(notes)}:{MAX(folders.updated_at)}:{COUNT(folders)}"
```

`COUNT(*)` cobre criação e exclusão definitiva (a linha some da tabela sem bater timestamp em nenhuma remanescente); `MAX(updated_at)` cobre edição, mover, arquivar, lixeira (soft-delete) e restaurar. Primeira execução (sem fingerprint anterior no manifest) sempre gera snapshot.

## Restore

1. Valida que o arquivo existe.
2. Copia o `data/` atual para `data/.pre-restore-backup-<timestamp>/` (rede de segurança — permite desfazer uma restauração errada).
3. Extrai o snapshot para uma pasta de staging, substitui `z-notes.db` e `mirror/`.
4. Exige confirmação explícita (digitar "restaurar") a menos que rode com `--yes`.
5. Instrui reiniciar o servidor — o script não para/inicia o processo sozinho; espera-se que o servidor já esteja parado antes de rodar (evita inconsistência com o arquivo `.db` aberto em WAL por outro processo).

## Configuração (env vars novas)

```
Z_NOTES_BACKUP_WEBHOOK_URL=   # opcional; POST JSON em caso de falha
Z_NOTES_BACKUP_CRON=0 3 * * * # opcional; default diário às 3h
```

`Z_NOTES_BACKUP_DIR` deriva de `Z_NOTES_DATA_DIR` (`<data>/../backups`, ou simplesmente `backups/` no mesmo nível — ver implementação), montado como volume Docker separado do `data/` ativo.

## Testes

- `retention.test.ts` — casos sintéticos de fronteira (7 dias exatos, múltiplos na mesma semana/mês, ausência de snapshot num bucket).
- `fingerprint.test.ts` — muda após criar/editar/excluir definitivamente/arquivar; estável sem mudanças.
- `snapshot.test.ts` — cria notas de teste, gera snapshot, confere `.zip` (banco+mirror) e `manifest.json`; roda de novo sem mudanças → nenhum arquivo novo; integra com a limpeza de retenção.
- `notify.test.ts` — mock de `fetch`; confirma payload e que falha no webhook nunca propaga.
- `restore.test.ts` — snapshot real → modifica os dados → `applySnapshot` → confere conteúdo restaurado e backup de segurança criado.
