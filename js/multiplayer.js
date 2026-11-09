/* Ravena multiplayer adapter (optional). GitHub Pages works without a server.
   Wire a trusted, authenticated backend to enable real shared sessions. */
(function () {
  const config = window.RAVENA_ONLINE_CONFIG || {};
  const peers = new Map();
  let socket = null, status = 'offline', lastSend = 0, reconnect = null;
  const listeners = new Set();
  function emit() { listeners.forEach(fn => fn(status, peers.size)); }
  function setStatus(next) { status = next; emit(); }
  function disconnect() { clearTimeout(reconnect); reconnect = null; if (socket) { socket.onclose = null; socket.close(); socket = null; } peers.clear(); setStatus('offline'); }
  function connect() {
    if (!config.wsUrl || !/^(wss|ws):\/\//.test(config.wsUrl) || !sessionStorage.getItem('ravenaSessionV1')) return setStatus('offline');
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return;
    setStatus('connecting');
    try {
      socket = new WebSocket(config.wsUrl);
      socket.onopen = () => socket.send(JSON.stringify({type:'auth',token:sessionStorage.getItem('ravenaSessionV1')}));
      socket.onmessage = event => {
        let msg; try { msg = JSON.parse(event.data); } catch { return; }
        if (msg.type === 'welcome' && typeof msg.playerId === 'string') {config.playerId = msg.playerId;setStatus('online');}
        if (msg.type === 'snapshot' && Array.isArray(msg.players)) {
          peers.clear(); msg.players.forEach(addPeer); emit();
        } else if (msg.type === 'player_move' || msg.type === 'player_join') addPeer(msg.player);
        else if (msg.type === 'player_leave') peers.delete(String(msg.playerId));
        else if (msg.type === 'chat_message' || msg.type === 'chat_error') window.dispatchEvent(new CustomEvent('ravena:chat', {detail:msg}));
        else if (msg.type === 'account_updated') window.dispatchEvent(new CustomEvent('ravena:account-updated', {detail:msg}));
        emit();
      };
      socket.onclose = () => { peers.clear(); setStatus('offline'); if (config.autoReconnect) reconnect = setTimeout(connect, 5000); };
      socket.onerror = () => setStatus('error');
    } catch { setStatus('error'); }
  }
  function addPeer(p) {
    if (!p || typeof p.id !== 'string' || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    if (p.id === config.playerId) return;
    peers.set(p.id, { id:p.id, name:String(p.name || 'Pescador').slice(0,24), x:Math.max(0,Math.min(2300,p.x)), y:Math.max(0,Math.min(1700,p.y)) });
  }
  function move(x,y) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const now = performance.now(); if (now - lastSend < 100) return; lastSend = now;
    socket.send(JSON.stringify({type:'move', x:Math.round(x), y:Math.round(y)}));
  }
  function sendAction(type, payload={}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    if (!['chat_send','chat_report'].includes(type) || !payload || typeof payload !== 'object') return false;
    if (type === 'chat_send' && (typeof payload.text !== 'string' || payload.text.length > 240 || !['global','nearby','private'].includes(payload.channel))) return false;
    socket.send(JSON.stringify({type, ...payload})); return true;
  }
  window.RavenaOnline = {connect, disconnect, move, sendAction, getPeers:()=>Array.from(peers.values()), getStatus:()=>status, subscribe:fn=>{listeners.add(fn); fn(status,peers.size); return ()=>listeners.delete(fn);}};
  if (config.wsUrl) connect();
})();
