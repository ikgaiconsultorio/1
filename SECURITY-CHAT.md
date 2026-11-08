# Segurança do chat — V6.4.44

## Proteções no navegador
- Mensagens são renderizadas com `textContent`, nunca como HTML.
- Mensagens iniciadas por `/`, `!` ou `\` e padrões comuns de scripts são recusados na interface.
- O adaptador `sendAction` só permite `chat_send` e `chat_report`; não há comandos de XP, moedas ou itens.
- Limite de 240 caracteres na interface.

## Importante: o navegador NÃO é uma fronteira de segurança
Qualquer jogador pode modificar JavaScript no próprio navegador ou enviar mensagens diretamente por WebSocket. Portanto, **essas barreiras não impedem trapaças sozinhas**. O chat continua indisponível até configurar um backend WSS confiável.

## Regras obrigatórias no servidor antes de ativar multiplayer
1. Autenticar cada conexão, rejeitar origens desconhecidas e usar WSS.
2. Permitir apenas tipos de mensagens explicitamente definidos; rejeitar qualquer `give`, `admin`, `xp`, `level`, `coins`, `inventory`, `buff` etc.
3. Validar formato, canal, destinatário, tamanho e taxa de mensagens; aplicar limite por conta/IP e registrar abusos.
4. Tratar mensagens como TEXTO, nunca avaliar código ou interpolar HTML.
5. Calcular XP, captura, dinheiro, itens, buffs e posições no servidor; nunca aceitar valores finais enviados pelo cliente.
6. Conferir permissões para mensagens privadas e proximidade, armazenar denúncias com privacidade e implementar bloqueio persistente por conta.
7. Nunca incluir chaves privadas ou tokens administrativos no repositório GitHub Pages.
8. Testar abuso de WebSocket, replay, duplicação de ações, excesso de mensagens e escalada de privilégios antes de abrir ao público.

O bloqueio de comandos no navegador é uma camada de UX/defesa em profundidade, não uma garantia anti-cheat.
