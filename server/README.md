# Ravena V6.4.46 — Backend & Servidor Unificado

Node.js >= 20. O servidor entrega de forma integrada o jogo no navegador (HTML5/Canvas), a API HTTP (`/auth/*`, `/game/*`) e o WebSocket (`/ws`).

---

## 🚀 Como Rodar Localmente (Sem Domínio / Zero Config)

Para testar no próprio computador sem precisar de domínio, túnel ou certificados SSL:

1. **Instalar dependências e iniciar:**
   ```bash
   cd server
   npm install
   npm start
   ```
   *(Ou na raiz do projeto: `npm --prefix server install && node server/index.js`)*

2. **Acessar no navegador:**
   Abra [http://localhost:3000](http://localhost:3000) (ou [http://127.0.0.1:3000](http://127.0.0.1:3000)).

* **Não é necessário criar `.env`:** O servidor detecta o ambiente local automaticamente, desativa a exigência de HTTPS/WSS, habilita CORS para `localhost` e configura o chat e multiplayer para `ws://localhost:3000/ws`.

---

## 🌐 Como Rodar Online com Domínio Próprio (Cloudflare Tunnel, VPS, etc.)

Para colocar o jogo online sob um domínio com certificado SSL:

1. **Criar o arquivo `.env` na raiz:**
   ```bash
   cp .env.example .env
   ```

2. **Ajustar as variáveis no `.env`:**
   ```ini
   PORT=12000
   DOMAIN=seu-dominio.com
   USE_SSL=true
   ALLOWED_ORIGINS=https://seu-dominio.com
   ```

3. **Iniciar o serviço:**
   - **Com Node diretamente:**
     ```bash
     node server/index.js
     ```
   - **Com PM2 (gerenciador de processos em segundo plano):**
     ```bash
     pm2 start ecosystem.config.cjs
     pm2 save
     ```

4. **Configuração de Proxy / Túnel (Cloudflare Tunnel):**
   Aponte o hostname público (ex: `seu-dominio.com`) para `http://localhost:PORT` com WebSockets habilitado. O Cloudflare gerencia a camada TLS (HTTPS/WSS).

---

## 📋 Variáveis Disponíveis no `.env`

| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `PORT` | `3000` | Porta local de escuta HTTP/WS. |
| `HOST` | `0.0.0.0` | Interface de rede para escuta. |
| `DOMAIN` | `localhost:PORT` | Domínio público ou endereço de acesso. |
| `USE_SSL` | `false` (local) / `true` (externo) | Habilita URLs com prefixo `https://` e `wss://`. |
| `ALLOWED_ORIGINS` | Derivado de `DOMAIN` + `localhost` | Origens aceitas em CORS e WebSocket handshake. |
| `ACCOUNT_DATA_FILE` | `./server/data/accounts.json` | Arquivo persistente para contas e sessões. |
| `API_URL` | Derivado automaticamente | Sobrescrita manual da URL REST da API. |
| `WS_URL` | Derivado automaticamente | Sobrescrita manual da URL do WebSocket. |

---

**Atenção:** a economia, XP, inventário e buffs do jogo ainda NÃO são autoritativos no servidor. O cadastro não importa progresso antigo. Para produção: banco transacional, autenticação gerenciada, rate limits persistentes por conta/IP, logs, política de privacidade, backups, recuperação de senha, proteção contra bots e testes de segurança.
