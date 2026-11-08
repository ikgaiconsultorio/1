# Multiplayer — integração futura

O jogo **continua totalmente jogável em modo solo** no GitHub Pages. A integração online é opcional e **não é um servidor multiplayer pronto**.

## Ativar mais tarde

1. Crie um backend HTTPS/WSS (por exemplo, Java + Spring Boot WebSocket).
2. Autentique jogadores no backend. Nunca confie no `playerId`, moedas, posição ou inventário enviados pelo navegador.
3. Configure `js/online-config.js` com `wsUrl: 'wss://SEU-SERVIDOR/ws/pescaria'`.
4. Permita apenas a origem do seu domínio no servidor e use cookies de sessão seguros ou credenciais efêmeras autorizadas.
5. O adaptador `js/multiplayer.js` sincroniza **somente a posição e a presença visual** dos jogadores quando o servidor suporta o protocolo abaixo.

## Mensagens WebSocket (JSON)

Cliente → servidor: `{"type":"move","x":1200,"y":1000}` (até 10/s)

Servidor → cliente:
- `{"type":"snapshot","players":[{"id":"u2","name":"Nyx","x":900,"y":1100}]}`
- `{"type":"player_join","player":{"id":"u2","name":"Nyx","x":900,"y":1100}}`
- `{"type":"player_move","player":{"id":"u2","name":"Nyx","x":905,"y":1100}}`
- `{"type":"player_leave","playerId":"u2"}`

O servidor deve verificar limites do mapa, velocidade, identidade, autorização e taxa de mensagens. Ao conectar, envie um snapshot dos outros jogadores; em seguida, distribua movimentos e entradas/saídas.

## Mercado e trocas reais (ainda NÃO implementados)

As operações de mercado no protótipo usam `localStorage` e dois perfis simulados. Para multiplayer real, implemente endpoints autenticados como:

- `GET /api/fishing/inventory` — inventário da conta autenticada
- `GET /api/fishing/listings` — anúncios públicos
- `POST /api/fishing/listings` — cria anúncio e bloqueia o item
- `POST /api/fishing/listings/{id}/buy` — compra atômica
- `DELETE /api/fishing/listings/{id}` — cancela anúncio próprio
- `POST /api/fishing/trades` — proposta de troca com itens bloqueados
- `POST /api/fishing/trades/{id}/accept` — aceite atômico
- `POST /api/fishing/trades/{id}/decline` — recusa e devolução

**Segurança:** preços e saldo devem ser verificados no servidor; operações precisam de transações no banco, proteção contra compra dupla, autorização por usuário, logs e idempotência. Não use o estado local como fonte de verdade.
