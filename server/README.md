# Ravena V6.4.46 — Backend experimental

Node.js >=20. Execute `npm install` e `ALLOWED_ORIGINS=https://SEU-USUARIO.github.io npm start` (Linux/macOS). Configure `ACCOUNT_DATA_FILE` para caminho persistente e privado. Não publique a pasta `server/data` no GitHub nem inclua senhas/tokens no código. Use HTTPS/WSS atrás de proxy seguro.

Em `js/online-config.js`, defina `apiUrl` (https://...) e `wsUrl` (wss://.../ws). Em `conta.html`, crie conta ou entre; o token fica em sessionStorage e o chat autentica no handshake de aplicação. A API possui `/auth/register`, `/auth/login`, `/auth/me`, `/auth/logout` (POST), e `/health` (GET). Sem backend, a pescaria solo continua disponível e o chat permanece offline.

**Atenção:** a economia, XP, inventário e buffs do jogo ainda NÃO são autoritativos no servidor. O cadastro não importa progresso antigo. Para produção: banco transacional, autenticação gerenciada, rate limits persistentes por conta/IP, logs, política de privacidade, backups, recuperação de senha, proteção contra bots e testes de segurança.
