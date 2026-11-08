import http from 'node:http';
import {randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash} from 'node:crypto';
import {readFileSync, writeFileSync, renameSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {WebSocketServer, WebSocket} from 'ws';

// Chat/presence only. Economy, fishing, XP and buffs are intentionally NOT exposed.
const PORT=Number(process.env.PORT||3000);
const allowedOrigins=(process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
if(!allowedOrigins.length){console.error('Configure ALLOWED_ORIGINS with the exact HTTPS GitHub Pages origin.');process.exit(1);}
// Account storage is a starter implementation. For production, use a transactional database,
// HTTPS, backups, monitoring and a managed identity provider.
const STORE=resolve(process.env.ACCOUNT_DATA_FILE||'./data/accounts.json');
let database={accounts:{},sessions:{}};
try{database=JSON.parse(readFileSync(STORE,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
function save(){mkdirSync(dirname(STORE),{recursive:true});const tmp=STORE+'.'+process.pid+'.tmp';writeFileSync(tmp,JSON.stringify(database),{mode:0o600});renameSync(tmp,STORE);}
const digest=s=>createHash('sha256').update(s).digest('hex');
const passwordHash=(p,salt)=>scryptSync(p,salt,64).toString('hex');
const cleanName=s=>typeof s==='string'&&/^[a-zA-Z0-9_]{3,20}$/.test(s)?s:null;
function sessionAccount(token){if(typeof token!=='string'||token.length!==64)return null;const key=digest(token),sess=database.sessions[key];if(!sess)return null;if(sess.expires<Date.now()){delete database.sessions[key];save();return null;}return database.accounts[sess.user]||null;}
const attempts=new Map();
function rate(ip){const now=Date.now(),x=(attempts.get(ip)||[]).filter(t=>now-t<60000);x.push(now);attempts.set(ip,x);return x.length<=12;}
const json=(res,code,body,origin)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin||'null','Vary':'Origin','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
const clients=new Map(), reports=[];
// Experimental authoritative economy: all random catches and rewards originate here.
// Not connected to the existing offline game. Never accept XP, coins or fish values from clients.
const XP_CAP=1000000;
const rarities=[{name:'comum',weight:70,xp:10,coins:5},{name:'incomum',weight:20,xp:18,coins:12},{name:'raro',weight:7,xp:35,coins:30},{name:'epico',weight:2.5,xp:65,coins:80},{name:'lendario',weight:0.5,xp:120,coins:200}];
const early=[100,150,220,300,400,520,650,800,1000];
function xpAtLevel(level){
 if(level<=1)return 0;
 if(level<=10)return early.slice(0,level-1).reduce((a,b)=>a+b,0);
 const t=(level-10)/90;
 return Math.round(4140+(XP_CAP-4140)*(t*t));
}
function levelForXp(xp){let lo=1,hi=100;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(xpAtLevel(mid)<=xp)lo=mid;else hi=mid-1;}return lo;}
function safeProgress(acc){
 const p=acc.progress||{};
 return {level:levelForXp(p.xp||0),xp:p.xp||0,coins:p.coins||0,fish:(p.fish||[]).map(f=>({id:f.id,rarity:f.rarity,coins:f.coins})),buff:p.buff&&p.buff.expires>Date.now()?{type:p.buff.type,expires:p.buff.expires}:null};
}
function gameAction(acc,path,body){
 const p=acc.progress;
 p.fish??=[];p.xp??=0;p.coins??=0;
 const now=Date.now();
 if(path==='/game/state')return {ok:true,progress:safeProgress(acc)};
 if(path==='/game/fish'){
  if(now-(p.lastCatch||0)<12000)return {error:'Aguarde antes de pescar novamente.',status:429};
  const roll=Math.random()*100;let sum=0;const caught=rarities.find(r=>(sum+=r.weight)>roll)||rarities[0];
  if(p.fish.length>=100)return {error:'Mochila cheia (100 peixes).',status:409};
  const active=p.buff&&p.buff.expires>now?p.buff:null;
  const xp=Math.round(caught.xp*(active?.type==='xp'?1.2:1));
  p.xp=Math.min(XP_CAP,p.xp+xp);
  const fish={id:randomUUID(),rarity:caught.name,coins:caught.coins};
  p.fish.push(fish);p.lastCatch=now;
  return {ok:true,catch:{...fish,xp},progress:safeProgress(acc)};
 }
 if(path==='/game/sell'){
  if(typeof body.fishId!=='string')return {error:'Peixe inválido.',status:400};
  const i=p.fish.findIndex(f=>f.id===body.fishId);
  if(i<0)return {error:'Peixe não encontrado.',status:404};
  const [fish]=p.fish.splice(i,1);
  const active=p.buff&&p.buff.expires>now?p.buff:null;
  const earned=Math.round(fish.coins*(active?.type==='coins'?1.15:1));
  p.coins+=earned;
  return {ok:true,earned,progress:safeProgress(acc)};
 }
 if(path==='/game/bless'){
  if(!['xp','coins'].includes(body.type))return {error:'Bênção inválida.',status:400};
  if(p.buff&&p.buff.expires>now)return {error:'Já existe uma bênção ativa.',status:409};
  if(p.coins<50)return {error:'São necessárias 50 moedas.',status:409};
  p.coins-=50;p.buff={type:body.type,expires:now+10*60*1000};
  return {ok:true,progress:safeProgress(acc)};
 }
 return {error:'Ação inválida.',status:404};
}
const forbidden=/^\s*[/!\\]|(?:<\s*script\b|javascript\s*:|onerror\s*=|onload\s*=)/i;
const clean=s=>typeof s==='string'?s.trim():'';
const send=(ws,obj)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));};
const peers=()=>[...clients.values()].map(p=>({id:p.id,name:p.name,x:p.x,y:p.y}));
const server=http.createServer(async(req,res)=>{
 const origin=req.headers.origin||'';
 if(origin&&!allowedOrigins.includes(origin))return json(res,403,{error:'Origem não autorizada'});
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':origin||'null','Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin'});return res.end();}
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/health'&&req.method==='GET')return json(res,200,{status:'ok',players:clients.size},origin);
 if(!['/auth/register','/auth/login','/auth/me','/auth/logout','/game/state','/game/fish','/game/sell','/game/bless'].includes(path))return json(res,404,{error:'Rota não encontrada'},origin);
 if(req.method!=='POST')return json(res,405,{error:'Método inválido'},origin);
 if(!rate(req.socket.remoteAddress||'unknown'))return json(res,429,{error:'Muitas tentativas'},origin);
 let raw='';try{for await(const chunk of req){raw+=chunk;if(raw.length>4096)throw Error('too big');}}catch{return json(res,413,{error:'Corpo inválido'},origin);}
 let body={};try{body=JSON.parse(raw||'{}');}catch{return json(res,400,{error:'JSON inválido'},origin);}
 if(path.startsWith('/game/')){
  const token=(req.headers.authorization||'').replace(/^Bearer /,'');const acc=sessionAccount(token);
  if(!acc)return json(res,401,{error:'Sessão inválida'},origin);
  const result=gameAction(acc,path,body);
  if(result.ok&&path!=='/game/state')save();
  return json(res,result.status||(result.ok?200:400),result,origin);
 }
 if(path==='/auth/me'||path==='/auth/logout'){
  const token=(req.headers.authorization||'').replace(/^Bearer /,'');const acc=sessionAccount(token);
  if(!acc)return json(res,401,{error:'Sessão inválida'},origin);
  if(path==='/auth/logout'){delete database.sessions[digest(token)];save();return json(res,200,{ok:true},origin);}
  return json(res,200,{username:acc.username,progress:safeProgress(acc)},origin);
 }
 const username=cleanName(body.username),password=body.password;
 if(!username||typeof password!=='string'||password.length<10||password.length>128)return json(res,400,{error:'Usuário ou senha inválidos (senha: 10 a 128 caracteres)'},origin);
 const key=username.toLowerCase();let acc=database.accounts[key];
 if(path==='/auth/register'){
  if(acc)return json(res,409,{error:'Nome indisponível'},origin);
  const salt=randomBytes(16).toString('hex');acc={username,salt,hash:passwordHash(password,salt),progress:{level:1,xp:0,coins:0,fish:[],buffs:[]}};database.accounts[key]=acc;
 }else{
  const candidate=passwordHash(password,acc?.salt||'0'.repeat(32));
  if(!acc||!timingSafeEqual(Buffer.from(candidate,'hex'),Buffer.from(acc.hash,'hex')))return json(res,401,{error:'Credenciais inválidas'},origin);
 }
 const token=randomBytes(32).toString('hex');database.sessions[digest(token)]={user:key,expires:Date.now()+12*60*60*1000};save();
 return json(res,200,{token,username:acc.username,progress:safeProgress(acc)},origin);
});
const wss=new WebSocketServer({noServer:true,maxPayload:2048,perMessageDeflate:false});
server.on('upgrade',(req,socket,head)=>{
 const origin=req.headers.origin;
 if(!origin||!allowedOrigins.includes(origin)||new URL(req.url,'http://localhost').pathname!=='/ws'){
   socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;
 }
 wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
});
function broadcast(obj,filter=()=>true){for(const [ws,p] of clients)if(filter(p))send(ws,obj);}
function error(ws,message){send(ws,{type:'chat_error',message});}
wss.on('connection',ws=>{
 const id=randomUUID(), player={id,name:'Visitante',authenticated:false,x:1100,y:850,lastChat:0,lastMove:0,chatBurst:[],lastReport:0};
 // No presence or messages are broadcast until a valid session is supplied.
 const authTimeout=setTimeout(()=>ws.close(1008,'Autenticação necessária'),10000);
 ws.on('close',()=>clearTimeout(authTimeout));
 ws.on('message',raw=>{
  let m;try{m=JSON.parse(raw.toString());}catch{return error(ws,'Mensagem inválida.');}
  if(!m||typeof m!=='object'||Array.isArray(m)||typeof m.type!=='string')return error(ws,'Formato inválido.');
  const now=Date.now();
  if(m.type==='auth'&&!player.authenticated){
   const acc=sessionAccount(m.token);
   if(!acc)return ws.close(1008,'Sessão inválida');
   clearTimeout(authTimeout);player.authenticated=true;player.name=acc.username;clients.set(ws,player);
   send(ws,{type:'welcome',playerId:id});send(ws,{type:'snapshot',players:peers().filter(p=>p.id!==id)});
   broadcast({type:'player_join',player:{id,name:player.name,x:player.x,y:player.y}},p=>p.id!==id);
   return;
  }
  if(!player.authenticated)return error(ws,'Faça login antes de jogar online.');
  if(m.type==='move'){
   if(now-player.lastMove<100)return;
   if(!Number.isFinite(m.x)||!Number.isFinite(m.y)||m.x<0||m.x>2300||m.y<0||m.y>1700)return;
   // Position is untrusted and is NOT proof of proximity for valuable actions.
   if(Math.hypot(m.x-player.x,m.y-player.y)>160)return;
   player.x=m.x;player.y=m.y;player.lastMove=now;
   broadcast({type:'player_move',player:{id,name:player.name,x:player.x,y:player.y}},p=>p.id!==id);return;
  }
  if(m.type==='chat_send'){
   const txt=clean(m.text), ch=m.channel;
   if(!['global','nearby','private'].includes(ch)||!txt||txt.length>240||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(txt)||forbidden.test(txt))return error(ws,'Mensagem não permitida.');
   player.chatBurst=player.chatBurst.filter(t=>now-t<10000);
   if(now-player.lastChat<1200||player.chatBurst.length>=5)return error(ws,'Aguarde antes de enviar outra mensagem.');
   player.lastChat=now;player.chatBurst.push(now);
   const out={type:'chat_message',id:randomUUID(),senderId:id,senderName:player.name,channel:ch,text:txt};
   if(ch==='private'){
     const target=[...clients].find(([,p])=>p.id===m.recipientId);
     if(!target||target[0]===ws)return error(ws,'Destinatário indisponível.');
     send(target[0],out);send(ws,out);
   }else if(ch==='nearby'){
     broadcast(out,p=>Math.hypot(p.x-player.x,p.y-player.y)<=320);
   }else broadcast(out);
   return;
  }
  if(m.type==='chat_report'){
   if(now-player.lastReport<30000)return error(ws,'Aguarde para denunciar novamente.');
   if(typeof m.messageId!=='string'||m.messageId.length>80||!clean(m.reason)||m.reason.length>180)return error(ws,'Denúncia inválida.');
   player.lastReport=now;
   // In-memory reports are temporary: configure durable moderation storage before public launch.
   reports.push({reporter:id,messageId:m.messageId,reason:m.reason,time:now});if(reports.length>500)reports.shift();
   send(ws,{type:'report_received'});return;
  }
  return error(ws,'Ação não autorizada.');
 });
 ws.on('close',()=>{if(clients.delete(ws))broadcast({type:'player_leave',playerId:id});});
 ws.on('error',()=>{});
});
setInterval(()=>{for(const ws of clients.keys()){if(ws.isAlive===false){ws.terminate();continue;}ws.isAlive=false;ws.ping();}},30000).unref();
wss.on('connection',ws=>{ws.isAlive=true;ws.on('pong',()=>{ws.isAlive=true;});});
server.listen(PORT,()=>console.log(`Ravena chat listening on ${PORT}`));
