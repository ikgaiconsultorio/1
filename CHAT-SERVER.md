# Chat de Azarath — contrato para backend

O chat não funciona sem servidor WebSocket `wss://` configurado em `js/online-config.js`. GitHub Pages hospeda apenas o cliente.

Cliente -> servidor: `{"type":"chat_send","channel":"global|nearby|private","text":"Olá","recipientId":"id-opcional"}`.
Servidor -> clientes autorizados: `{"type":"chat_message","id":"uuid","channel":"global","senderId":"id-autenticado","senderName":"Nome","text":"Olá"}`.
Erro: `{"type":"chat_error","message":"Limite de mensagens atingido"}`.
Denúncia: `{"type":"chat_report","messageId":"uuid","reason":"motivo"}`.

**Obrigatório no backend:** autenticar identidade no servidor; jamais confiar em senderId/nome do navegador; autorizar destinatário e filtrar privados; calcular proximidade usando posições validadas no servidor (não coordenadas enviadas na mensagem); limitar tamanho, frequência e conexões; filtrar spam/abuso; persistir denúncias com acesso restrito; permitir bloqueio e silenciamento no servidor; impor política de retenção e privacidade; TLS/WSS e origem permitida. Não encaminhar mensagens privadas a terceiros. O botão de bloquear no cliente apenas oculta mensagens localmente até o backend suportar bloqueio por conta.
