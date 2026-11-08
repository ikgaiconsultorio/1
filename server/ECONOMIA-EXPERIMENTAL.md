# API de economia experimental (autenticada)

Configure ALLOWED_ORIGINS e rode `npm install && npm start` em `server/`. Primeiro cadastre ou faça login via `/auth/register` ou `/auth/login`; envie `Authorization: Bearer <token>` em todos os endpoints.

Todos os endpoints são POST com `Content-Type: application/json`:

- `/game/state`: `{}` — consulta progresso do servidor.
- `/game/fish`: `{}` — captura gerada pelo servidor, cooldown de 12s.
- `/game/sell`: `{"fishId":"<id retornado pela pesca>"}` — venda individual.
- `/game/bless`: `{"type":"xp"}` ou `{"type":"coins"}` — custa 50 moedas e dura 10 min.

O jogo web existente NÃO usa esta API ainda. O modo solo segue separado; não há sincronização automática de progresso local. Teste primeiro em ambiente privado.
