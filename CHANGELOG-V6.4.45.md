# V6.4.45 — Servidor experimental de chat
- Adicionado servidor WebSocket Node.js (`server/`) para presença, chat global, proximidade e privado.
- Validação de origem, limites de tamanho/taxa, rejeição de comandos e ações fora da lista permitida.
- IDs de visitantes gerados no servidor, eventos de entrada/saída e denúncias temporárias.
- Adaptador do navegador recebe o ID de sessão; confirmação de denúncia exibida apenas após resposta.
- **Não é backend anti-cheat de economia**: XP, inventário e buffs continuam locais. Consulte `server/README.md`.
