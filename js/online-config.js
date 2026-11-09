/* Configuração de conexão do cliente Ravena.
   Quando hospedado via backend Node (server/index.js), este arquivo é servido
   dinamicamente de acordo com as variáveis definidas no .env (DOMAIN, PORT, USE_SSL).
   Para hospedagem desacoplada ou estática pura (ex: GitHub Pages), preencha os campos abaixo. */
window.RAVENA_ONLINE_CONFIG = window.RAVENA_ONLINE_CONFIG || {
  apiUrl: '', // Exemplo: 'https://pescavena.moothz.com'
  wsUrl: '',  // Exemplo: 'wss://pescavena.moothz.com/ws'
  autoReconnect: true,
  playerId: '' // Identidade real deve ser determinada pelo servidor autenticado.
};
