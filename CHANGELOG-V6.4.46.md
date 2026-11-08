# V6.4.46 — Contas e segurança (base experimental)

- Cadastro/login HTTPS com senha derivada via scrypt e salt aleatório.
- Tokens de sessão aleatórios de 12 horas; apenas hash SHA-256 dos tokens persistido no servidor.
- WebSocket exige autenticação antes de entrar no chat ou na presença.
- API /auth/me e /auth/logout; armazenamento JSON local para testes.
- Página conta.html e configuração apiUrl, wsUrl.

**Limites importantes:** progresso atual do jogo ainda fica no navegador. A estrutura de progresso da conta é inicial e não permite ao cliente gravar XP, moedas, itens ou buffs; isso exige migração de regras de pesca e recompensas para o servidor. JSON não é adequado para múltiplas instâncias ou produção. Não publique o backend sem TLS, backups, limites de conexão, persistência robusta e auditoria. Contas não migram automaticamente o progresso antigo.
