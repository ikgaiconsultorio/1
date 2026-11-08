/* Edite apenas quando seu backend estiver pronto.
   Em produção, autentique por cookie seguro ou token de sessão curto obtido por HTTPS.
   Não coloque senhas, chaves privadas ou segredos neste arquivo público. */
window.RAVENA_ONLINE_CONFIG = {
  apiUrl: '', // Exemplo: 'https://api.seudominio.com'
  wsUrl: '', // Exemplo: 'wss://api.seudominio.com/ws/pescaria'
  autoReconnect: true,
  playerId: '' // Identidade real deve ser determinada pelo servidor autenticado.
};
