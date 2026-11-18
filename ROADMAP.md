# ROADMAP — z-notes

Estado em 2026-10-27. Specs de design em `docs/superpowers/specs/`.

## Entregue
- App web (3 colunas, espelho `.md`, offline, backup GFS) e PWA instalável.
- **P0** Login Google + isolamento por usuário (issue #3).
- Métricas periódicas + `/admin` (issue #6).
- Login Google nos apps (mobile e desktop) por deep link `znotes://auth` + Bearer.
- **P1** App mobile em React Native / Expo (issue #4 / #82): login Google via Custom Tab, isolamento de cache multiusuário por `userId` (`z-notes-cache:<userId>`), CRUD de notas, busca em tempo real, suporte a notas fixadas e sincronização offline com fila de mutações.

## Em andamento — apps (issue #4)
Decisão: **React Native / Expo** no mobile (Android) e **Tauri** no desktop (só Linux).
Referência visual: Simplenote (lista limpa, editor sem ruído); funcionalidades seguem as do z-notes.

Falta validar em dispositivo real (não dá para automatizar aqui):
- [ ] Mobile: compilação de release com APK via EAS (`EXPO_TOKEN`) e teste em aparelho físico.
- [ ] Desktop: `.deb`/AppImage do CI, deep link `znotes://auth` abrindo a instância já rodando, URL do servidor de produção.
- [ ] Mobile: trocar o chaveamento por `useState` do `App.tsx` por React Navigation (hoje o botão voltar do Android é tratado via BackHandler).

## Aberto
- Issue #8 (PWA): falta validar login no app instalado, modo avião e iOS; depois fechar.
- Futuro: push, Background Sync, Web Share Target, badging; fixar notas, tags e histórico de versões por nota.
