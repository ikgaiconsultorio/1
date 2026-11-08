# V6.4.43 — Chat multiplayer (interface e protocolo)
- Chat Global, Proximidade e Privado em janela compacta responsiva.
- Mensagens recebidas pelo WebSocket existente; envio via `chat_send`.
- Bloqueio local e envio de denúncias ao servidor.
- Sem mensagens falsas em modo solo.
- **Requer backend real** para autenticar, moderar e encaminhar mensagens. GitHub Pages sozinho não hospeda WebSocket.
- Ver `CHAT-SERVER.md` para contrato do backend.
