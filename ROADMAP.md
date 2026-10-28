# ROADMAP — z-notes

Estado em 2026-10-27. Specs de design em `docs/superpowers/specs/`.

## Entregue
- App web (3 colunas, espelho `.md`, offline, backup GFS) e PWA instalável.
- **P0** Login Google + isolamento por usuário (issue #3).
- Métricas periódicas + `/admin` (issue #6).
- Login Google nos apps (mobile e desktop) por deep link `znotes://auth` + Bearer.
- Notas fixadas (pasta virtual Fixadas), editor abre em visualização e visual novo.
- **Tarefas (issue #15):** seção separada com pastas → listas em colunas → tarefas (título + prioridade), concluídas visíveis com "Arquivar concluídas" + Desfazer, arquivar/restaurar por item, arrastar para reordenar/mover.

## Em andamento — apps (issue #4)
Decisão: **React Native / Expo** no mobile (só Android) e **Tauri** no desktop (só Linux).
Referência visual: Simplenote (lista limpa, editor sem ruído); funcionalidades seguem as do z-notes.

Falta validar em dispositivo real (não dá para automatizar aqui):
- [ ] Mobile: APK via EAS (`EXPO_TOKEN`), login Google ponta a ponta, 2 usuários isolados, CRUD + busca + offline.
- [ ] Desktop: `.deb`/AppImage do CI, deep link `znotes://auth` abrindo a instância já rodando, URL do servidor de produção.
- [ ] Mobile: trocar o chaveamento por `useState` do `App.tsx` por React Navigation (hoje só o botão voltar do Android é tratado).
- [ ] Mobile: cache offline por usuário (hoje uma chave única, limpa no logout).

## Aberto
- Issue #8 (PWA): falta validar login no app instalado, modo avião e iOS; depois fechar.
- Tarefas no app mobile nativo (hoje só web/PWA/desktop, que reaproveitam o mesmo código web) e espelho `.md` das tarefas (decidido não espelhar na v1).
- Futuro: push, Background Sync, Web Share Target, badging; fixar notas, tags e histórico de versões por nota.
