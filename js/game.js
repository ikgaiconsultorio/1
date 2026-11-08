const c=document.getElementById('game'),ctx=c.getContext('2d'),mini=document.getElementById('mini'),mctx=mini.getContext('2d');let DPR=Math.min(devicePixelRatio||1,(innerWidth<=720?1.25:1.5)),W,H;
const GRAPHICS_KEY='ravenaGraphicsV1';
const GRAPHICS_LEVELS={leve:{mobile:.85,desktop:1,cap:30},equilibrado:{mobile:1.25,desktop:1.5,cap:0},alto:{mobile:1.75,desktop:2,cap:60}};
let graphicsSettings={quality:'equilibrado',showFps:false};
try{const saved=JSON.parse(localStorage.getItem(GRAPHICS_KEY)||'{}');if(GRAPHICS_LEVELS[saved.quality])graphicsSettings.quality=saved.quality;graphicsSettings.showFps=saved.showFps===true;}catch(e){}
function graphicsDpr(vw){const q=GRAPHICS_LEVELS[graphicsSettings.quality];return Math.min(devicePixelRatio||1,vw<=720?q.mobile:q.desktop);}
let cameraScale=1;
function resize(){
 const vw=document.documentElement.clientWidth||innerWidth,vh=innerHeight;
 DPR=graphicsDpr(vw);
 // Wider field of view on portrait phones; canvas stays sharp on high-DPI displays.
 cameraScale=vw<=720?(vw<400?.78:.83):1;
 W=vw/cameraScale;H=vh/cameraScale;
 c.width=Math.round(vw*DPR);c.height=Math.round(vh*DPR);
 c.style.width=vw+'px';c.style.height=vh+'px';
 ctx.setTransform(DPR*cameraScale,0,0,DPR*cameraScale,0,0);
}addEventListener('resize',resize);resize();
const world={w:2300,h:1700,lake:{x:535,y:310,w:1130,h:850},pier:{x:1030,y:1080,w:155,h:240},shop:{x:1900,y:350,w:195,h:160},market:{x:1880,y:1020,w:225,h:175},board:{x:170,y:400,w:145,h:110},altar:{x:355,y:1315,w:140,h:95}};
let scene='lake',marketReturn={x:1990,y:1230},sanctuaryReturn={x:1110,y:1370};
const sanctuaryWorld={w:1050,h:1000,altar:{x:455,y:265,w:140,h:95},exit:{x:465,y:840}};
const SOLID_BUILDINGS=[world.shop,world.market,world.board,world.altar];
const SANCTUARY_ALTAR_NEAR=['statue',{x:525,y:485},180,'🔮','Altar da Ravena','Oferecer'];
const SANCTUARY_EXIT_NEAR=['sanctuaryExit',sanctuaryWorld.exit,140,'🚪','Portal de Azarath','Voltar'];
const MARKET_INTERACTIONS=[['marketCounter',{x:1140,y:650},370,'🌹','Balcão do Mercado','Negociar'],['marketExit',{x:1120,y:1290},165,'🚪','Escadas','Sair']];
const LAKE_INTERACTIONS=[
 ['shop',{x:world.shop.x+world.shop.w/2,y:world.shop.y+world.shop.h+30},130,'🏮','Loja','Entrar'],
 ['market',{x:world.market.x+world.market.w/2,y:world.market.y+world.market.h+30},140,'🌹','Mercado','Entrar'],
 ['ranking',{x:world.board.x+world.board.w/2,y:world.board.y+world.board.h+30},120,'🪦','Lápide dos Campeões','Consultar'],
 ['sanctuaryPortal',{x:1110,y:1370},125,'🚪','Portal do Santuário','Entrar']
];
const FISHING_PIER_NEAR=['fishing',world.pier,0,'🎣','Píer','Pescar'];
const FISHING_SHORE_NEAR=['fishing',world.lake,0,'🎣','Margem do Lago','Pescar'];
const player={x:1110,y:1370,r:17,speed:220,dir:0};let cam={x:0,y:0},last=performance.now(),near=null,coins=1635,bait=7,inventory=[];
const fish=[['Carpa Lunar','Comum',1,4,45],['Tilápia Sombria','Comum',.5,2.8,35],['Dourado de Azarath','Raro',3,11,160],['Bagre Fantasma','Épico',5,18,320],['Leviatã Jovem','Lendário',12,28,900],['Corvo Abissal','Lendário',18,35,1500]];
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='e')interact()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
function rr(x,y,w,h,r=10){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function glow(x,y,r,col){let g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function lantern(x,y){x-=cam.x;y-=cam.y;glow(x,y,48,'#ffb24a55');ctx.fillStyle='#24170e';ctx.fillRect(x-2,y-20,4,22);ctx.fillStyle='#ffd27a';ctx.fillRect(x-5,y-17,10,12);ctx.strokeStyle='#8d5b2e';ctx.strokeRect(x-5,y-17,10,12)}
function flower(x,y,i){x-=cam.x;y-=cam.y;ctx.fillStyle=i%3?'#b7438b':'#e45475';for(let a=0;a<5;a++){let q=a*Math.PI*2/5;ctx.beginPath();ctx.arc(x+Math.cos(q)*4,y+Math.sin(q)*4,3,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#f5d8a1';ctx.fillRect(x-1,y-1,2,2)}
function npc(x,y,name){x-=cam.x;y-=cam.y;ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(x,y+12,14,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3a2b23';ctx.beginPath();ctx.arc(x,y-5,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#6f3e4f';ctx.fillRect(x-9,y+2,18,18);ctx.fillStyle='#eee2cf';ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillText(name,x,y-20)}
// V5.3 — partículas determinísticas, sem gerar objetos a cada quadro.
const ambience=Array.from({length:65},(_,i)=>({x:(i*503+97)%2300,y:(i*337+31)%1700,phase:i*1.73,r:1.2+i%3}));
const waterSparkles=Array.from({length:50},(_,i)=>({angle:i*2.399,rad:.13+(i%12)/15,phase:i*1.51}));
let avatarFacing=1,avatarWalk=0,avatarMoving=false;
function drawAmbience(t){
 const simplified=graphicsSettings.quality==='leve'||(graphicsSettings.quality==='equilibrado'&&innerWidth<=720);
 ctx.save();ctx.globalCompositeOperation='screen';
 for(let i=0;i<ambience.length;i+=simplified?2:1){
  const p=ambience[i],x=p.x-cam.x+Math.sin(t*.00055+p.phase)*17,y=p.y-cam.y+Math.cos(t*.00037+p.phase)*10;
  if(x<-20||y<-20||x>W+20||y>H+20)continue;
  const alpha=.18+.36*(.5+.5*Math.sin(t*.002+p.phase));
  ctx.fillStyle=i%4===0?`rgba(255,145,175,${alpha})`:`rgba(188,139,255,${alpha})`;
  ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function drawLakeReflections(t,L,cx,cy){
 // Do not draw water effects if the entire lake is outside the camera.
 if(cx+L.w/2<0||cx-L.w/2>W||cy+L.h/2<0||cy-L.h/2>H)return;
 ctx.save();ctx.beginPath();ctx.ellipse(cx,cy,L.w/2-12,L.h/2-12,0,0,Math.PI*2);ctx.clip();
 const g=ctx.createLinearGradient(cx-180,cy-450,cx+180,cy+470);
 g.addColorStop(0,'#25466a44');g.addColorStop(.45,'#74508c22');g.addColorStop(1,'#3b8a9a11');
 ctx.fillStyle=g;ctx.fillRect(cx-L.w/2,cy-L.h/2,L.w,L.h);
 const simplified=graphicsSettings.quality==='leve'||(graphicsSettings.quality==='equilibrado'&&innerWidth<=720);
 for(let i=0;i<waterSparkles.length;i+=simplified?2:1){
  const p=waterSparkles[i];
  const x=cx+Math.cos(p.angle)*L.w*.44*p.rad,y=cy+Math.sin(p.angle)*L.h*.42*p.rad;
  if(x<-22||x>W+22||y<-10||y>H+10)continue;
  const wave=Math.sin(t*.0017+p.phase),width=13+wave*7;
  ctx.strokeStyle=`rgba(172,184,240,${.09+.13*(wave+1)/2})`;
  ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-width/2,y);ctx.lineTo(x+width/2,y);ctx.stroke();
 }
 // Moving moonlight, confined to the lake.
 for(let i=0;i<(simplified?7:13);i++){
  const x=cx+L.w*.21+Math.sin(t*.0007+i)*16+i%3*16;
  const y=cy-145+i*29;
  if(x<-110||x>W+110||y<0||y>H)continue;
  ctx.fillStyle=`rgba(198,184,241,${.045+.03*Math.sin(t*.002+i)})`;
  ctx.fillRect(x,y,65+(i%4)*22,2);
 }
 ctx.restore();
}
function drawForeground(t){
 // Soft screen-space vignette gives the village a moonlit frame.
 const radius=Math.max(W,H)*.78,g=ctx.createRadialGradient(W*.5,H*.46,radius*.22,W*.5,H*.46,radius);
 g.addColorStop(0,'#00000000');g.addColorStop(1,'#050410aa');
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 if(scene==='lake')drawAmbience(t);
}

// V5.4 — cenário autoral procedural: detalhes desenhados em camadas, sem imagens externas.
function stonePath(x1,y1,x2,y2,seed=0){
 const dx=x2-x1,dy=y2-y1,length=Math.hypot(dx,dy),count=Math.floor(length/28);
 if(Math.max(x1,x2)<cam.x-45||Math.min(x1,x2)>cam.x+W+45||Math.max(y1,y2)<cam.y-45||Math.min(y1,y2)>cam.y+H+45)return;
 const angle=Math.atan2(dy,dx),nx=-dy/length,ny=dx/length;
 for(let i=0;i<count;i++){
  const u=i/count,x=x1+dx*u-cam.x,y=y1+dy*u-cam.y;
  if(x<-40||x>W+40||y<-40||y>H+40)continue;
  const offset=Math.sin(i*2.3+seed)*12;
  ctx.save();ctx.translate(x+nx*offset,y+ny*offset);ctx.rotate(angle);
  ctx.fillStyle=i%3?'#544654':'#66515c';rr(-12,-11,25,20,4);
  ctx.fillStyle='#88707a44';ctx.fillRect(-9,-8,16,2);ctx.restore();
 }
}
function cherryTree(wx,wy,seed,t){
 const x=wx-cam.x,y=wy-cam.y;if(x<-100||x>W+100||y<-130||y>H+100)return;
 const sway=Math.sin(t*.0008+seed)*2;
 ctx.fillStyle='#050a16aa';ctx.beginPath();ctx.ellipse(x+12,y+15,52,17,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#3c2836';ctx.lineWidth=13;ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(x,y+8);ctx.lineTo(x+sway,y-49);ctx.lineTo(x-24+sway,y-74);ctx.moveTo(x+sway,y-49);ctx.lineTo(x+24+sway,y-82);ctx.stroke();
 for(let j=0;j<9;j++){
  const a=j*2.4+seed,r=16+Math.sqrt(j)*13,xx=x+Math.cos(a)*r+sway,yy=y-85+Math.sin(a)*r*.53;
  ctx.fillStyle=j%3===0?'#b45c86':j%3===1?'#8b456e':'#dc84a4';
  ctx.beginPath();ctx.arc(xx,yy,22+j%3*3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f7b7c455';ctx.beginPath();ctx.arc(xx-7,yy-8,8,0,Math.PI*2);ctx.fill();
 }
 for(let j=0;j<4;j++){
  let px=x+Math.sin(t*.0006+j*2+seed)*36,py=y-65+(t*.025+j*37)%110;
  ctx.fillStyle='#e89ab5bb';ctx.beginPath();ctx.ellipse(px,py,4,2,j,0,Math.PI*2);ctx.fill();
 }
}
function torch(wx,wy,t){
 let x=wx-cam.x,y=wy-cam.y;
 if(x<-75||x>W+75||y<-75||y>H+75)return;
 glow(x,y-33,83,'#f9a25135');
 ctx.fillStyle='#19121d';ctx.fillRect(x-6,y-32,12,38);
 ctx.fillStyle='#bd8867';ctx.fillRect(x-9,y-37,18,6);
 ctx.fillStyle='#ffcf83';ctx.beginPath();ctx.moveTo(x-9,y-39);ctx.quadraticCurveTo(x-12,y-58+Math.sin(t*.008)*3,x,y-65);ctx.quadraticCurveTo(x+13,y-53,x+9,y-39);ctx.fill();
 ctx.fillStyle='#fff3c5';ctx.beginPath();ctx.ellipse(x,y-43,4,9,0,0,Math.PI*2);ctx.fill();
}
function torii(wx,wy){
 const x=wx-cam.x,y=wy-cam.y;
 if(x<-160||x>W+160||y<-130||y>H+130)return;
 ctx.fillStyle='#0a0a17aa';ctx.fillRect(x-74,y-6,148,16);
 ctx.fillStyle='#8c334e';ctx.fillRect(x-65,y-107,17,112);ctx.fillRect(x+48,y-107,17,112);
 ctx.fillStyle='#c55a71';ctx.fillRect(x-86,y-120,172,15);ctx.fillRect(x-73,y-92,146,13);
 ctx.fillStyle='#4c263f';ctx.fillRect(x-86,y-126,172,7);
 ctx.fillStyle='#f7cba3';ctx.fillRect(x-9,y-104,18,23);
}
// V6.4.54: lightweight village accents, camera-culled.
function villageSign(wx,wy,label){
 const x=wx-cam.x,y=wy-cam.y;if(x<-140||x>W+140||y<-120||y>H+90)return;
 ctx.fillStyle='#0a091580';ctx.beginPath();ctx.ellipse(x+8,y+5,37,10,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#4a302d';ctx.fillRect(x-5,y-78,10,82);ctx.fillStyle='#b28b66';ctx.fillRect(x-3,y-76,3,77);
 ctx.fillStyle='#382635';rr(x-64,y-96,128,38,7);ctx.strokeStyle='#9e7581';ctx.lineWidth=2;ctx.strokeRect(x-60,y-92,120,30);
 ctx.fillStyle='#f2d4d7';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(label,x,y-72);
}
function villagePlanter(wx,wy){
 const x=wx-cam.x,y=wy-cam.y;if(x<-55||x>W+55||y<-65||y>H+55)return;
 ctx.fillStyle='#130e19aa';ctx.beginPath();ctx.ellipse(x+7,y+7,27,9,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#6d4b4a';rr(x-24,y-15,48,25,6);ctx.fillStyle='#b17c6b';ctx.fillRect(x-23,y-16,46,5);
 for(let i=0;i<7;i++){const dx=(i-3)*6;ctx.strokeStyle=i%2?'#57766b':'#486c5a';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(x+dx,y-15);ctx.lineTo(x+dx*1.4,y-30-(i%3)*5);ctx.stroke();
 if(i%2===0){ctx.fillStyle='#bd7b9d';ctx.beginPath();ctx.arc(x+dx*1.4,y-31-(i%3)*5,4,0,Math.PI*2);ctx.fill();}}
}
function drawVillageDetails(t){
 const L=world.lake;
 // Cobblestone routes make the buildings feel connected to the village.
 stonePath(1950,690,1950,990,2);
 stonePath(1930,690,1710,890,3);
 stonePath(1720,890,1740,1300,4);
 stonePath(330,555,395,940,5);
 stonePath(1090,1370,1590,1400,6);
 for(const [x,y] of [[425,250],[1900,240],[170,1110],[2180,800],[720,1510]])cherryTree(x,y,(x+y)%11,t);
 villageSign(1840,810,'MERCADO');villageSign(1050,1430,'VILA');
 for(const [x,y] of [[1820,770],[2050,790],[1020,1460],[1210,1450]])villagePlanter(x,y);
 // V6.4.14: removido o antigo portao vermelho; o portal do santuario e a unica entrada.
 for(const [x,y] of [[1790,710],[2050,760],[1780,1280],[2100,1260],[385,510],[350,1030],[1040,1480],[1200,1490]])torch(x,y,t);
 // Lily pads and animated floating petals around the shoreline.
 for(let i=0;i<17;i++){
  const a=i*2.399,r=.79+(i%5)*.035,x=L.x+L.w/2+Math.cos(a)*L.w*.5*r-cam.x,
  y=L.y+L.h/2+Math.sin(a)*L.h*.5*r-cam.y;
  ctx.fillStyle=i%3?'#315d58':'#497b70';ctx.beginPath();ctx.ellipse(x,y,12,6,a,0,Math.PI*2);ctx.fill();
  if(i%4===0){ctx.fillStyle='#e7a4c7';ctx.beginPath();ctx.arc(x,y-3,4,0,Math.PI*2);ctx.fill()}
 }
}
// V6.0: shoreline, pier and ritual stone detail. All deterministic and canvas-only.
function lakeReeds(t,L){
 const cx=L.x+L.w/2,cy=L.y+L.h/2;
 for(let i=0;i<48;i++){
  const a=i*2.39996323,rad=1.012+(i%4)*.009;
  const wx=cx+Math.cos(a)*L.w*.5*rad,wy=cy+Math.sin(a)*L.h*.5*rad;
  const x=wx-cam.x,y=wy-cam.y;if(x<-30||x>W+30||y<-40||y>H+40)continue;
  const sway=Math.sin(t*.001+i)*3;
  ctx.strokeStyle=i%3?'#49776b':'#8c6c79';ctx.lineWidth=1.8;
  ctx.beginPath();ctx.moveTo(x,y+7);ctx.quadraticCurveTo(x+sway-4,y-9,x+sway,y-17-(i%5)*3);ctx.stroke();
  if(i%9===0){ctx.fillStyle='#c9869e';ctx.beginPath();ctx.ellipse(x+sway,y-24,3,7,.2,0,Math.PI*2);ctx.fill()}
 }
}
function drawPierDetail(t,P){
 const x=P.x-cam.x,y=P.y-cam.y,w=P.w,h=P.h;
 if(x>W+90||x+w<-90||y>H+90||y+h<-90)return;
 // Submerged piles and side rails cast visible shadows.
 ctx.fillStyle='#0b111c88';ctx.fillRect(x-21,y+9,15,h+26);ctx.fillRect(x+w+6,y+9,15,h+26);
 for(const side of [-1,1]){
  const px=side<0?x-10:x+w+4;
  ctx.fillStyle='#34261f';ctx.fillRect(px,y-3,9,h+9);
  ctx.fillStyle='#a57c58';ctx.fillRect(px+1,y-1,3,h+5);
  for(let j=0;j<5;j++){
   const py=y+16+j*(h-25)/4;
   ctx.fillStyle='#291c1c';ctx.fillRect(px-3,py-8,15,18);
   ctx.fillStyle='#bb9266';ctx.fillRect(px-3,py-8,15,4);
   ctx.fillStyle='#d7b184';ctx.fillRect(px+3,py-6,2,3);
  }
 }
 // Alternating boards, seams, grain and nail heads.
 for(let j=0;j<Math.ceil(h/23);j++){
  const by=y+j*23;
  ctx.fillStyle=j%2?'#805d49':'#987255';ctx.fillRect(x+2,by,w-4,20);
  ctx.fillStyle='#b99170aa';ctx.fillRect(x+4,by+2,w-8,2);
  ctx.fillStyle='#3d2a27';ctx.fillRect(x+7,by+4,3,3);ctx.fillRect(x+w-10,by+4,3,3);
  for(let k=0;k<3;k++){
   ctx.strokeStyle='#523c3488';ctx.lineWidth=1;ctx.beginPath();
   ctx.moveTo(x+18+k*39,by+10+k%2*3);ctx.lineTo(x+40+k*39,by+10+k%2*3);ctx.stroke();
  }
 }
 // Rope mooring and a small coiled fishing line.
 ctx.strokeStyle='#d6ba8a';ctx.lineWidth=2.4;ctx.beginPath();
 ctx.moveTo(x+8,y+14);ctx.bezierCurveTo(x+31,y+23,x+15,y+46,x+8,y+51);ctx.stroke();
 ctx.strokeStyle='#c9ad83';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x+w-25,y+h-37,11,6,-.3,0,Math.PI*2);ctx.stroke();
}
// V6.4.55: fishing-dock props drawn only when the dock is visible.
function drawDockAccessories(P){
 const x=P.x-cam.x,y=P.y-cam.y;
 if(x>W+90||x+P.w<-90||y>H+90||y+P.h<-90)return;
 ctx.save();
 // Mooring rope loop on the far side of the planks.
 ctx.strokeStyle='#c5a47c';ctx.lineWidth=3;
 ctx.beginPath();ctx.ellipse(x+27,y+P.h-38,14,8,-.2,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.ellipse(x+27,y+P.h-38,8,4,-.2,0,Math.PI*2);ctx.stroke();
 // Compact bait crate at the end of the pier; purely decorative.
 ctx.fillStyle='#3c2925';rr(x+P.w-58,y+16,43,31,4);
 ctx.fillStyle='#98714f';ctx.fillRect(x+P.w-56,y+18,39,5);
 ctx.fillStyle='#bd9770';ctx.fillRect(x+P.w-56,y+27,39,3);
 ctx.strokeStyle='#c9a57b';ctx.lineWidth=2;ctx.strokeRect(x+P.w-56,y+17,39,28);
 ctx.restore();
}
function drawLakeFauna(t,L){
 const cx=L.x+L.w/2-cam.x,cy=L.y+L.h/2-cam.y;
 ctx.save();ctx.beginPath();ctx.ellipse(cx,cy,L.w*.5-15,L.h*.5-15,0,0,Math.PI*2);ctx.clip();
 for(let i=0;i<17;i++){
  const a=i*2.399,rx=Math.cos(a)*L.w*.36,ry=Math.sin(a)*L.h*.36;
  const x=cx+rx+Math.sin(t*.00035+i)*11,y=cy+ry+Math.cos(t*.00041+i)*5;
  ctx.fillStyle=i%3===0?'#568c8a70':'#29515c90';ctx.beginPath();ctx.ellipse(x,y,10+i%3*4,4+i%2*2,a,0,Math.PI*2);ctx.fill();
  if(i%4===0){ctx.fillStyle='#efb0d1';ctx.beginPath();ctx.arc(x+2,y-3,3,0,Math.PI*2);ctx.fill()}
 }
 for(let i=0;i<7;i++){
  const x=cx+Math.sin(t*.00026+i*2.7)*L.w*.28,y=cy+Math.cos(t*.00031+i*2.7)*L.h*.29;
  ctx.strokeStyle='#9eb3d230';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,16+Math.sin(t*.002+i)*5,6,0,0,Math.PI*2);ctx.stroke();
 }
 ctx.restore();
}
let lastMiniPaint=0;function drawMini(){if(performance.now()-lastMiniPaint<100)return;lastMiniPaint=performance.now();if(scene==='sanctuary'){mctx.clearRect(0,0,150,150);mctx.fillStyle='#1b1528';mctx.fillRect(0,0,150,150);mctx.fillStyle='#b787e4';mctx.beginPath();mctx.arc(75,55,11,0,Math.PI*2);mctx.fill();mctx.fillStyle='#f3d6ff';mctx.font='bold 12px system-ui';mctx.textAlign='center';mctx.fillText('SANTUÁRIO',75,102);mctx.fillStyle='#df67ff';mctx.beginPath();mctx.arc(player.x/1050*150,player.y/1000*150,4,0,Math.PI*2);mctx.fill();return;}if(scene==='market'){mctx.clearRect(0,0,150,150);mctx.fillStyle='#21152b';mctx.fillRect(0,0,150,150);mctx.fillStyle='#f3cae8';mctx.font='bold 15px system-ui';mctx.textAlign='center';mctx.fillText('MERCADO',75,65);mctx.fillText('NOTURNO',75,85);return;}let w=mini.width,h=mini.height;mctx.clearRect(0,0,w,h);mctx.fillStyle='#111a22';mctx.fillRect(0,0,w,h);let sx=w/world.w,sy=h/world.h,L=world.lake;mctx.fillStyle='#0b3447';mctx.beginPath();mctx.ellipse((L.x+L.w/2)*sx,(L.y+L.h/2)*sy,L.w/2*sx,L.h/2*sy,0,0,Math.PI*2);mctx.fill();mctx.fillStyle='#b15a7d';for(const b of [world.shop,world.market,world.board])mctx.fillRect(b.x*sx,b.y*sy,Math.max(4,b.w*sx),Math.max(4,b.h*sy));mctx.fillStyle='#e8c263';mctx.fillRect(world.pier.x*sx,world.pier.y*sy,world.pier.w*sx,world.pier.h*sy);mctx.fillStyle='#b874f2';mctx.beginPath();mctx.arc((world.altar.x+world.altar.w/2)*sx,(world.altar.y+world.altar.h/2)*sy,4,0,Math.PI*2);mctx.fill();mctx.fillStyle='#df67ff';mctx.beginPath();mctx.arc(player.x*sx,player.y*sy,4,0,Math.PI*2);mctx.fill()}
// V6.4.31: sprite estático recortado da arte aprovada; animação leve em Canvas.
const ravenaSculptureSprite=new Image();
let ravenaSculptureReady=false;
ravenaSculptureSprite.onload=()=>{ravenaSculptureReady=true;};
ravenaSculptureSprite.src='assets/ravena-estatua-v6431.webp';
function drawRavenaSculpture(t){
 const A=sanctuaryWorld.altar,x=A.x+A.w/2-cam.x,y=A.y+10-cam.y;
 if(!ravenaSculptureReady){drawStatue(t);return;}
 ctx.save();
 // V6.4.32: iluminação fixa atrás da silhueta, sem novas partículas.
 const halo=ctx.createRadialGradient(x,y-125,18,x,y-125,220);
 halo.addColorStop(0,'rgba(129,55,180,.18)');halo.addColorStop(.5,'rgba(94,39,139,.075)');halo.addColorStop(1,'rgba(94,39,139,0)');
 ctx.fillStyle=halo;ctx.fillRect(x-225,y-350,450,440);
 // Pedestal gótico em três níveis, com faces laterais e contato no piso.
 ctx.fillStyle='rgba(3,2,9,.60)';ctx.beginPath();ctx.ellipse(x,y+86,169,20,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#17101f';ctx.beginPath();ctx.moveTo(x-155,y+58);ctx.lineTo(x+155,y+58);ctx.lineTo(x+145,y+83);ctx.lineTo(x-145,y+83);ctx.closePath();ctx.fill();
 ctx.fillStyle='#3d294a';ctx.beginPath();ctx.moveTo(x-151,y+57);ctx.lineTo(x+151,y+57);ctx.lineTo(x+140,y+66);ctx.lineTo(x-140,y+66);ctx.closePath();ctx.fill();
 ctx.fillStyle='#25192f';ctx.fillRect(x-131,y+39,262,19);
 ctx.fillStyle='#64446f';ctx.fillRect(x-135,y+36,270,6);
 ctx.fillStyle='#120e1b';ctx.fillRect(x-109,y+60,218,16);
 ctx.fillStyle='#a27ab4';ctx.fillRect(x-135,y+36,270,2);
 // Placa de pedra e inscrições discretas, posicionadas abaixo do manto.
 ctx.fillStyle='#382442';ctx.beginPath();ctx.moveTo(x-62,y+65);ctx.lineTo(x+62,y+65);ctx.lineTo(x+54,y+80);ctx.lineTo(x-54,y+80);ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(205,143,231,.6)';ctx.lineWidth=1;ctx.strokeRect(x-48,y+69,96,7);
 // A arte aprovada continua intacta e fica acima da estrutura.
 ctx.drawImage(ravenaSculptureSprite,x-161,y-260,322,325);
 // Somente a esfera recebe um brilho sutil e barato.
 const pulse=.55+.45*Math.sin(t*.002);
 const ox=x,oy=y-139;
 const g=ctx.createRadialGradient(ox,oy,1,ox,oy,28);
 g.addColorStop(0,`rgba(246,201,255,${.18*pulse})`);
 g.addColorStop(.4,`rgba(172,67,255,${.12*pulse})`);
 g.addColorStop(1,'rgba(140,45,220,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(ox,oy,28,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
function drawStatue(t){
 const A=world.altar,x=A.x+A.w/2-cam.x,y=A.y+10-cam.y;
 if(x<-330||x>W+330||y<-360||y>H+300)return;
 const pulse=.5+.5*Math.sin(t*.0022);
 ctx.save();
 // Stone sanctuary: stepped, not a floating black ellipse.
 glow(x,y+66,220,'#7434b744');
 ctx.fillStyle='#0b1020';ctx.beginPath();ctx.ellipse(x,y+78,176,64,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#31283c';ctx.beginPath();ctx.ellipse(x,y+62,152,49,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#9663b7';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y+63,146,43,0,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#53425c';ctx.fillRect(x-81,y+27,162,31);
 ctx.fillStyle='#201a30';ctx.fillRect(x-88,y+53,176,12);
 ctx.fillStyle='#b78ba5';ctx.fillRect(x-74,y+56,148,2);
 // Ravena is a wingless sorceress. A soft violet aura replaces the old wings.
 for(let i=0;i<3;i++){
  ctx.strokeStyle=['#b063dc30','#7e4eb328','#d083ed20'][i];ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(x,y-94,67+i*16,117+i*12,0,Math.PI*.78,Math.PI*2.22);ctx.stroke();
 }
 // Floating arcane motes around the hood and mantle.
 for(let i=0;i<5;i++){
  const a=i*2.399+t*.00022,r=76+(i%3)*19;
  const px=x+Math.cos(a)*r,py=y-92+Math.sin(a)*r*.95;
  ctx.fillStyle=i%3===0?'#e49bfa99':'#9d68dc77';
  ctx.beginPath();ctx.arc(px,py,1.5+(i%3)*.5,0,Math.PI*2);ctx.fill();
 }
 // V6.4.24: silhueta de pedra em tres planos; sombras fixas, sem novos sprites.
 ctx.fillStyle='#100d1b';ctx.beginPath();ctx.moveTo(x-31,y-133);
 ctx.bezierCurveTo(x-76,y-115,x-68,y-40,x-91,y+29);
 ctx.quadraticCurveTo(x-73,y+50,x-55,y+39);ctx.lineTo(x-39,y+11);
 ctx.lineTo(x-31,y-133);ctx.closePath();ctx.fill();
 ctx.beginPath();ctx.moveTo(x+31,y-133);
 ctx.bezierCurveTo(x+76,y-115,x+68,y-40,x+91,y+29);
 ctx.quadraticCurveTo(x+73,y+50,x+55,y+39);ctx.lineTo(x+39,y+11);
 ctx.closePath();ctx.fill();
 ctx.fillStyle='#463650';ctx.beginPath();ctx.moveTo(x-54,y-106);
 ctx.quadraticCurveTo(x-69,y-29,x-78,y+28);ctx.lineTo(x-65,y+35);
 ctx.quadraticCurveTo(x-52,y-30,x-47,y-105);ctx.closePath();ctx.fill();
 ctx.fillStyle='#33273f';ctx.beginPath();ctx.moveTo(x+54,y-106);
 ctx.quadraticCurveTo(x+69,y-29,x+78,y+28);ctx.lineTo(x+65,y+35);
 ctx.quadraticCurveTo(x+52,y-30,x+47,y-105);ctx.closePath();ctx.fill();
 // Body: separated shoulders, waist and two asymmetric fabric tails (not a triangle).
 ctx.fillStyle='#171122';ctx.beginPath();ctx.moveTo(x-34,y-126);
 ctx.bezierCurveTo(x-55,y-103,x-51,y-44,x-68,y+25);
 ctx.lineTo(x-46,y+40);ctx.lineTo(x-24,y+21);ctx.lineTo(x-9,y+45);
 ctx.lineTo(x+9,y+39);ctx.lineTo(x+31,y+22);ctx.lineTo(x+57,y+42);
 ctx.lineTo(x+69,y+25);ctx.bezierCurveTo(x+49,y-55,x+55,y-104,x+34,y-126);
 ctx.closePath();ctx.fill();
 ctx.fillStyle='#31233f';ctx.beginPath();ctx.moveTo(x-24,y-106);
 ctx.lineTo(x-29,y+24);ctx.lineTo(x-8,y+34);ctx.lineTo(x+4,y-7);
 ctx.lineTo(x+17,y+33);ctx.lineTo(x+32,y+22);ctx.lineTo(x+23,y-106);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#9b679e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-21,y-98);ctx.lineTo(x-25,y+19);
 ctx.moveTo(x+20,y-98);ctx.lineTo(x+24,y+19);ctx.stroke();
 // Visible broad shoulders and separate hanging sleeves.
 for(const side of [-1,1]){
  ctx.save();ctx.translate(x+side*30,y-116);ctx.scale(side,1);
  ctx.fillStyle='#3d304d';ctx.beginPath();ctx.moveTo(-6,-5);ctx.quadraticCurveTo(14,-16,28,0);
  ctx.lineTo(32,15);ctx.lineTo(5,17);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#b58bba';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-3,-4);ctx.quadraticCurveTo(16,-13,27,1);ctx.stroke();
  ctx.fillStyle='#23192e';ctx.beginPath();ctx.moveTo(19,10);ctx.lineTo(39,14);
  ctx.lineTo(30,64);ctx.lineTo(10,61);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#74558d';ctx.beginPath();ctx.moveTo(31,18);ctx.lineTo(24,56);ctx.stroke();
  ctx.restore();
 }
 // Hood: dark face, deep cowl, tiny violet eyes.
 ctx.fillStyle='#2c203d';ctx.beginPath();ctx.moveTo(x-42,y-151);
 ctx.quadraticCurveTo(x-38,y-211,x,y-215);
 ctx.quadraticCurveTo(x+38,y-211,x+42,y-151);
 ctx.lineTo(x+27,y-139);ctx.lineTo(x-27,y-139);ctx.closePath();ctx.fill();
 ctx.fillStyle='#080811';ctx.beginPath();ctx.moveTo(x-30,y-151);
 ctx.quadraticCurveTo(x-23,y-183,x,y-185);
 ctx.quadraticCurveTo(x+23,y-183,x+30,y-151);
 ctx.lineTo(x+18,y-126);ctx.lineTo(x-18,y-126);ctx.closePath();ctx.fill();
 glow(x,y-151,46,'#8755ff55');ctx.fillStyle='#c3a2ff';
 ctx.fillRect(x-19,y-152,11,3);ctx.fillRect(x+8,y-152,11,3);
 // Single ruby diamond on forehead (not a chest crystal).
 glow(x,y-185,30+pulse*11,'#ee327899');ctx.fillStyle='#f14a75';ctx.beginPath();
 ctx.moveTo(x,y-201);ctx.lineTo(x+9,y-186);ctx.lineTo(x,y-173);
 ctx.lineTo(x-9,y-186);ctx.closePath();ctx.fill();
 ctx.fillStyle='#ffd3d7';ctx.fillRect(x-2,y-195,3,6);
 ctx.fillStyle='#8b244b';ctx.beginPath();ctx.moveTo(x+9,y-186);ctx.lineTo(x,y-173);ctx.lineTo(x+3,y-185);ctx.closePath();ctx.fill();
 // V6.4.20: volume de pedra no capuz e no busto, sem novos efeitos animados.
 ctx.fillStyle='#48364f';ctx.beginPath();ctx.moveTo(x-41,y-157);
 ctx.quadraticCurveTo(x-47,y-193,x-17,y-211);ctx.quadraticCurveTo(x-37,y-191,x-34,y-159);
 ctx.lineTo(x-27,y-143);ctx.closePath();ctx.fill();
 ctx.fillStyle='#5b4566';ctx.beginPath();ctx.moveTo(x+21,y-208);
 ctx.quadraticCurveTo(x+44,y-190,x+41,y-155);ctx.lineTo(x+32,y-143);
 ctx.quadraticCurveTo(x+35,y-183,x+21,y-208);ctx.fill();
 ctx.strokeStyle='#9a769f';ctx.lineWidth=1.5;ctx.beginPath();
 ctx.moveTo(x-39,y-160);ctx.quadraticCurveTo(x-39,y-196,x-9,y-211);
 ctx.moveTo(x+28,y-199);ctx.quadraticCurveTo(x+40,y-182,x+38,y-159);ctx.stroke();
 // Gargantilha de pedra sob a face e pequenas placas nos ombros.
 ctx.fillStyle='#4c3856';ctx.beginPath();ctx.moveTo(x-21,y-124);
 ctx.lineTo(x,y-115);ctx.lineTo(x+21,y-124);ctx.lineTo(x+13,y-110);
 ctx.lineTo(x-13,y-110);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#a17cab';ctx.lineWidth=2;ctx.beginPath();
 ctx.moveTo(x-20,y-122);ctx.lineTo(x,y-115);ctx.lineTo(x+20,y-122);ctx.stroke();
 // Faixas esculpidas dão peso ao manto, sem alterar a silhueta sem asas.
 ctx.strokeStyle='#594368';ctx.lineWidth=5;ctx.beginPath();
 ctx.moveTo(x-37,y-98);ctx.bezierCurveTo(x-42,y-49,x-36,y-5,x-52,y+28);
 ctx.moveTo(x+37,y-98);ctx.bezierCurveTo(x+42,y-49,x+36,y-5,x+52,y+28);ctx.stroke();
 ctx.strokeStyle='#b49ac2';ctx.lineWidth=1;ctx.beginPath();
 ctx.moveTo(x-34,y-92);ctx.quadraticCurveTo(x-33,y-46,x-42,y+14);
 ctx.moveTo(x+34,y-92);ctx.quadraticCurveTo(x+33,y-46,x+42,y+14);ctx.stroke();
 // V6.4.21: relevos de pedra nas dobras do manto, sem particulas extras.
 ctx.fillStyle='#493650';ctx.beginPath();ctx.moveTo(x-17,y-102);
 ctx.bezierCurveTo(x-21,y-49,x-15,y-5,x-29,y+26);
 ctx.lineTo(x-12,y+31);ctx.quadraticCurveTo(x-7,y-19,x-8,y-92);ctx.closePath();ctx.fill();
 ctx.fillStyle='#241a31';ctx.beginPath();ctx.moveTo(x+8,y-91);
 ctx.quadraticCurveTo(x+5,y-23,x+13,y+32);ctx.lineTo(x+27,y+23);
 ctx.quadraticCurveTo(x+17,y-34,x+20,y-97);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#a58ab1';ctx.lineWidth=1.3;ctx.beginPath();
 ctx.moveTo(x-19,y-87);ctx.quadraticCurveTo(x-16,y-16,x-26,y+24);
 ctx.moveTo(x+9,y-85);ctx.quadraticCurveTo(x+6,y-12,x+15,y+27);ctx.stroke();
 // Cinto cerimonial e fecho facetado criam separacao entre busto e vestes.
 ctx.strokeStyle='#5e476c';ctx.lineWidth=7;ctx.beginPath();
 ctx.moveTo(x-25,y-41);ctx.quadraticCurveTo(x,y-31,x+25,y-41);ctx.stroke();
 ctx.fillStyle='#7d5c90';ctx.beginPath();ctx.moveTo(x,y-47);ctx.lineTo(x+7,y-39);
 ctx.lineTo(x,y-31);ctx.lineTo(x-7,y-39);ctx.closePath();ctx.fill();
 // V6.4.29: pescoco e gola unem a cabeca ao torso, sem alterar a silhueta sem asas.
 ctx.fillStyle='#21192b';ctx.beginPath();ctx.moveTo(x-23,y-134);
 ctx.quadraticCurveTo(x-19,y-119,x-33,y-111);ctx.quadraticCurveTo(x,y-96,x+33,y-111);
 ctx.quadraticCurveTo(x+19,y-119,x+23,y-134);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#80618c';ctx.lineWidth=2;ctx.beginPath();
 ctx.moveTo(x-30,y-113);ctx.quadraticCurveTo(x,y-100,x+30,y-113);ctx.stroke();
 // Ombreiras conectadas por uma gola frontal de pedra.
 ctx.fillStyle='#45354e';ctx.beginPath();ctx.moveTo(x-33,y-116);
 ctx.quadraticCurveTo(x,y-106,x+33,y-116);ctx.lineTo(x+19,y-102);
 ctx.quadraticCurveTo(x,y-94,x-19,y-102);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#9a78a4';ctx.lineWidth=1.4;ctx.beginPath();
 ctx.moveTo(x-24,y-109);ctx.quadraticCurveTo(x,y-101,x+24,y-109);ctx.stroke();
 // Arms reach inward, with two clearly visible hands around an orb.
 ctx.strokeStyle='#34273e';ctx.lineWidth=14;ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(x-43,y-99);ctx.lineTo(x-30,y-66);ctx.lineTo(x-12,y-59);
 ctx.moveTo(x+43,y-99);ctx.lineTo(x+30,y-66);ctx.lineTo(x+12,y-59);ctx.stroke();
 ctx.strokeStyle='#967a9f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-32,y-70);ctx.lineTo(x-15,y-61);
 ctx.moveTo(x+32,y-70);ctx.lineTo(x+15,y-61);ctx.stroke();
 glow(x,y-57,49+pulse*10,'#a344f788');
 ctx.fillStyle='#8f43e5';ctx.beginPath();ctx.arc(x,y-57,11+pulse*2,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#ead0ff';ctx.beginPath();ctx.arc(x-3,y-61,4,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#b5a2c8';ctx.beginPath();ctx.ellipse(x-14,y-56,9,5,-.3,0,Math.PI*2);
 ctx.ellipse(x+14,y-56,9,5,.3,0,Math.PI*2);ctx.fill();
 // Dedos esculpidos ao redor da esfera: maos distintas, nao mangas planas.
 ctx.strokeStyle='#c1a9c8';ctx.lineWidth=2;ctx.lineCap='round';
 for(const side of [-1,1]){
  const hx=x+side*15;
  ctx.beginPath();ctx.moveTo(hx,y-60);ctx.lineTo(hx-side*6,y-55);
  ctx.moveTo(hx,y-56);ctx.lineTo(hx-side*5,y-51);ctx.stroke();
 }
 // Base de pedra com frisos de profundidade e pequenas gravuras.
 ctx.fillStyle='#1b1526';ctx.fillRect(x-89,y+65,178,13);
 ctx.fillStyle='#66516d';ctx.fillRect(x-80,y+58,160,5);
 ctx.strokeStyle='#b28abb';ctx.lineWidth=1.2;ctx.beginPath();
 for(let i=-2;i<=2;i++){
  const px=x+i*28;ctx.moveTo(px-5,y+68);ctx.lineTo(px,y+72);ctx.lineTo(px+5,y+68);
 }ctx.stroke();
 // V6.4.24: base octogonal em perspectiva, evitando pedestal retangular plano.
 ctx.fillStyle='#171320';ctx.beginPath();ctx.moveTo(x-100,y+76);
 ctx.lineTo(x-80,y+89);ctx.lineTo(x+80,y+89);ctx.lineTo(x+100,y+76);
 ctx.lineTo(x+84,y+68);ctx.lineTo(x-84,y+68);ctx.closePath();ctx.fill();
 ctx.fillStyle='#574660';ctx.beginPath();ctx.moveTo(x-84,y+68);
 ctx.lineTo(x+84,y+68);ctx.lineTo(x+100,y+76);ctx.lineTo(x-100,y+76);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#92799e';ctx.lineWidth=1.5;ctx.beginPath();
 ctx.moveTo(x-94,y+77);ctx.lineTo(x-77,y+84);ctx.lineTo(x+77,y+84);
 ctx.lineTo(x+94,y+77);ctx.stroke();
 // V6.4.16: acabamento da escultura, sem asas e sem efeitos pesados.
 // Frisos do capuz acompanham o volume, em vez de formar um recorte plano.
 ctx.strokeStyle='#806394';ctx.lineWidth=3;ctx.beginPath();
 ctx.moveTo(x-39,y-151);ctx.quadraticCurveTo(x-34,y-207,x,y-214);
 ctx.quadraticCurveTo(x+34,y-207,x+39,y-151);ctx.stroke();
 ctx.strokeStyle='#c5a1ce';ctx.lineWidth=1.5;ctx.beginPath();
 ctx.moveTo(x-31,y-154);ctx.quadraticCurveTo(x-20,y-185,x,y-187);
 ctx.quadraticCurveTo(x+20,y-185,x+31,y-154);ctx.stroke();
 // Olhos como fendas luminosas com ponto central, não dois retângulos soltos.
 ctx.fillStyle='#f0d6ff';ctx.fillRect(x-16,y-151,4,2);ctx.fillRect(x+12,y-151,4,2);
 // Reflexos facetados no rubi e bordas do manto.
 ctx.strokeStyle='#f69bb0';ctx.lineWidth=1.5;ctx.beginPath();
 ctx.moveTo(x,y-199);ctx.lineTo(x+5,y-186);ctx.lineTo(x,y-176);ctx.stroke();
 ctx.strokeStyle='#6b4d80';ctx.lineWidth=2;ctx.beginPath();
 ctx.moveTo(x-36,y-94);ctx.quadraticCurveTo(x-32,y-15,x-50,y+29);
 ctx.moveTo(x+36,y-94);ctx.quadraticCurveTo(x+32,y-15,x+50,y+29);ctx.stroke();
 // Bordado rúnico limitado a cinco marcas, sem partículas adicionais por quadro.
 ctx.strokeStyle='#b38ad0';ctx.lineWidth=1.4;
 for(let i=0;i<5;i++){
  const ry=y-29+i*13,rx=x+(i%2?15:-15);
  ctx.beginPath();ctx.moveTo(rx-4,ry-4);ctx.lineTo(rx+3,ry);
  ctx.lineTo(rx-3,ry+5);ctx.stroke();
 }
 // A esfera ganha anéis finos que giram suavemente em torno da própria magia.
 ctx.save();ctx.translate(x,y-57);ctx.rotate(t*.00035);
 ctx.strokeStyle='#d3a1ff';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.ellipse(0,0,21,8,-.35,0,Math.PI*2);ctx.stroke();
 ctx.restore();
 // V6.4.23: face esculpida com profundidade, sem asas ou efeitos pesados.
 // A sombra do rosto recebe planos laterais discretos, preservando o rubi.
 ctx.fillStyle='#21192d';ctx.beginPath();ctx.moveTo(x-27,y-150);
 ctx.quadraticCurveTo(x-26,y-167,x-17,y-174);ctx.lineTo(x-19,y-136);
 ctx.lineTo(x-11,y-129);ctx.lineTo(x-24,y-135);ctx.closePath();ctx.fill();
 ctx.fillStyle='#3a2a48';ctx.beginPath();ctx.moveTo(x+27,y-150);
 ctx.quadraticCurveTo(x+26,y-167,x+17,y-174);ctx.lineTo(x+19,y-136);
 ctx.lineTo(x+11,y-129);ctx.lineTo(x+24,y-135);ctx.closePath();ctx.fill();
 // Olhos como duas fendas angulares, com centro luminoso em vez de barras retas.
 ctx.fillStyle='#0b0812';ctx.fillRect(x-22,y-156,18,9);ctx.fillRect(x+4,y-156,18,9);
 ctx.strokeStyle='#bb83fa';ctx.lineWidth=2.3;ctx.beginPath();
 ctx.moveTo(x-20,y-152);ctx.lineTo(x-12,y-150);ctx.lineTo(x-7,y-153);
 ctx.moveTo(x+7,y-153);ctx.lineTo(x+12,y-150);ctx.lineTo(x+20,y-152);ctx.stroke();
 ctx.fillStyle='#f1d9ff';ctx.fillRect(x-13,y-152,3,2);ctx.fillRect(x+10,y-152,3,2);
 // O arco superior do capuz cria uma aba de pedra acima dos olhos.
 ctx.strokeStyle='#6c527a';ctx.lineWidth=3;ctx.beginPath();
 ctx.moveTo(x-29,y-157);ctx.quadraticCurveTo(x,y-178,x+29,y-157);ctx.stroke();
 // A esfera recebe um núcleo de luz e dois arcos curtos de energia.
 const orbPulse=.5+.5*Math.sin(t*.0022);
 ctx.fillStyle='#3c176d';ctx.beginPath();ctx.arc(x,y-57,8.5,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#b67aff';ctx.beginPath();ctx.arc(x,y-57,6+orbPulse,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#fff1ff';ctx.beginPath();ctx.arc(x-2,y-60,2.5,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#d8a6ff';ctx.lineWidth=1.5;ctx.beginPath();
 ctx.arc(x,y-57,18,-1.1,.9);ctx.arc(x,y-57,18,2.05,3.95);ctx.stroke();
 // V6.4.27: anatomia das maos em planos de pedra, dedos curvos e polegares visiveis.
 // As maos ficam sobre o aro da esfera, mas deixam o nucleo luminoso livre.
 for(const side of [-1,1]){
  ctx.save();ctx.translate(x+side*17,y-57);ctx.scale(side,1);
  ctx.fillStyle='#65536e';ctx.beginPath();ctx.moveTo(9,-10);
  ctx.quadraticCurveTo(0,-12,-3,-6);ctx.lineTo(-5,1);
  ctx.quadraticCurveTo(-2,8,5,7);ctx.lineTo(12,3);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#c1a9ce';ctx.lineWidth=1.5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(4,-7);ctx.quadraticCurveTo(-2,-6,-3,-1);
  ctx.moveTo(5,-3);ctx.quadraticCurveTo(-1,-1,-2,3);
  ctx.moveTo(8,1);ctx.quadraticCurveTo(3,5,0,6);ctx.stroke();
  ctx.strokeStyle='#947eaa';ctx.lineWidth=2;ctx.beginPath();
  ctx.moveTo(10,-7);ctx.quadraticCurveTo(6,-13,1,-12);ctx.stroke();
  ctx.restore();
 }
 // Arestas e placas de pedra nos ombros reforcam o volume sem aumentar a silhueta.
 for(const side of [-1,1]){
  ctx.save();ctx.translate(x+side*39,y-116);ctx.scale(side,1);
  ctx.fillStyle='#51405e';ctx.beginPath();ctx.moveTo(-5,-8);
  ctx.quadraticCurveTo(11,-12,19,0);ctx.lineTo(11,8);
  ctx.lineTo(-1,5);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#a58ab6';ctx.lineWidth=1.4;ctx.beginPath();
  ctx.moveTo(-2,-6);ctx.quadraticCurveTo(10,-9,16,-1);ctx.stroke();
  ctx.restore();
 }
 // Vincos convergem para a cintura, evitando a forma de cone do manto.
 ctx.strokeStyle='#8d70a0';ctx.lineWidth=1.4;ctx.beginPath();
 ctx.moveTo(x-8,y-34);ctx.quadraticCurveTo(x-15,y+3,x-25,y+31);
 ctx.moveTo(x+8,y-34);ctx.quadraticCurveTo(x+16,y+5,x+27,y+30);
 ctx.stroke();
 // V6.4.22: luz lateral esculpida no capuz e no manto, sem partículas novas.
 // Traços curtos simulam arestas de pedra atingidas pelo vitral do templo.
 ctx.save();ctx.lineCap='round';
 ctx.strokeStyle='#b89bcb88';ctx.lineWidth=2.2;ctx.beginPath();
 ctx.moveTo(x-38,y-171);ctx.quadraticCurveTo(x-37,y-196,x-18,y-207);
 ctx.moveTo(x-43,y-94);ctx.quadraticCurveTo(x-49,y-55,x-44,y-23);
 ctx.moveTo(x-47,y+3);ctx.lineTo(x-54,y+26);
 ctx.moveTo(x+29,y-111);ctx.quadraticCurveTo(x+40,y-86,x+39,y-68);
 ctx.stroke();
 ctx.strokeStyle='#d6b3e066';ctx.lineWidth=1.2;ctx.beginPath();
 ctx.moveTo(x-17,y-101);ctx.quadraticCurveTo(x-13,y-61,x-17,y-32);
 ctx.moveTo(x+20,y-17);ctx.lineTo(x+25,y+16);
 ctx.moveTo(x-72,y+57);ctx.lineTo(x+72,y+57);ctx.stroke();
 // Pedestal em tres níveis com frente sombreada, sem ampliar sua área de colisão.
 ctx.fillStyle='#130f1d';ctx.beginPath();ctx.moveTo(x-97,y+78);ctx.lineTo(x+97,y+78);
 ctx.lineTo(x+85,y+89);ctx.lineTo(x-85,y+89);ctx.closePath();ctx.fill();
 ctx.fillStyle='#46364e';ctx.fillRect(x-84,y+77,168,4);
 ctx.strokeStyle='#9c79ae88';ctx.lineWidth=1.3;ctx.beginPath();
 ctx.moveTo(x-91,y+83);ctx.lineTo(x+91,y+83);ctx.stroke();
 // V6.4.28: planos esculpidos em vez de mais particulas ou decoracoes.
 // Maçãs do rosto em pedra escura: mantém os olhos como foco, sem desenhar uma face humana completa.
 ctx.fillStyle='#4a3657';ctx.beginPath();ctx.moveTo(x-23,y-146);
 ctx.lineTo(x-17,y-138);ctx.lineTo(x-10,y-135);ctx.lineTo(x-16,y-145);ctx.closePath();ctx.fill();
 ctx.fillStyle='#30233e';ctx.beginPath();ctx.moveTo(x+23,y-146);
 ctx.lineTo(x+17,y-138);ctx.lineTo(x+10,y-135);ctx.lineTo(x+16,y-145);ctx.closePath();ctx.fill();
 // Rebaixo central do capuz e queixo mergulhado em sombra, sem tampar o rubi.
 ctx.fillStyle='#0a0812';ctx.beginPath();ctx.moveTo(x-8,y-138);
 ctx.quadraticCurveTo(x,y-133,x+8,y-138);ctx.lineTo(x+4,y-130);
 ctx.lineTo(x,y-128);ctx.lineTo(x-4,y-130);ctx.closePath();ctx.fill();
 // Luz lateral assimetrica e planos do manto reforcam a sensacao de escultura macica.
 ctx.fillStyle='#594467';ctx.beginPath();ctx.moveTo(x-48,y-88);
 ctx.quadraticCurveTo(x-53,y-36,x-59,y+21);ctx.lineTo(x-51,y+26);
 ctx.quadraticCurveTo(x-40,y-30,x-42,y-88);ctx.closePath();ctx.fill();
 ctx.fillStyle='#21182e';ctx.beginPath();ctx.moveTo(x+45,y-86);
 ctx.quadraticCurveTo(x+53,y-36,x+59,y+24);ctx.lineTo(x+48,y+28);
 ctx.quadraticCurveTo(x+41,y-31,x+38,y-88);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#9f83b1';ctx.lineWidth=1.4;ctx.beginPath();
 ctx.moveTo(x-47,y-82);ctx.quadraticCurveTo(x-47,y-28,x-55,y+19);
 ctx.moveTo(x+47,y-64);ctx.quadraticCurveTo(x+48,y-11,x+54,y+18);ctx.stroke();
 // Pequenos planos de punho com juntas gravadas, preservando o centro da esfera.
 for(const side of [-1,1]){
  ctx.save();ctx.translate(x+side*25,y-64);ctx.scale(side,1);
  ctx.fillStyle='#4a3958';ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(11,-8);
  ctx.lineTo(13,2);ctx.lineTo(2,5);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#b69bc2';ctx.lineWidth=1.2;ctx.beginPath();
  ctx.moveTo(2,-3);ctx.lineTo(10,-5);ctx.moveTo(3,2);ctx.lineTo(11,0);ctx.stroke();
  ctx.restore();
 }
 // Reflexo direcional leve sobre a face esquerda do manto.
 const sheen=ctx.createLinearGradient(x-55,y-110,x+42,y+24);
 sheen.addColorStop(0,'#d2a9ee22');sheen.addColorStop(.55,'#9e75c50c');sheen.addColorStop(1,'#8c63ad00');
 ctx.fillStyle=sheen;ctx.beginPath();ctx.moveTo(x-38,y-100);ctx.lineTo(x-23,y-103);
 ctx.lineTo(x-29,y+21);ctx.lineTo(x-51,y+30);ctx.closePath();ctx.fill();
 ctx.restore();
 // Subtle floating sparks and pedestal name.
 for(let i=0;i<4;i++){
  const ang=i*2.399+t*.00025,rad=73+(i%5)*24;
  const px=x+Math.cos(ang)*rad,py=y+15+Math.sin(ang)*rad*.38;
  ctx.fillStyle=i%3?'#9d67c6a8':'#ed7caaaf';ctx.beginPath();ctx.arc(px,py,2+(i%2),0,Math.PI*2);ctx.fill();
 }
 ctx.fillStyle='#ead4f5';ctx.font='bold 17px Georgia';ctx.textAlign='center';
 ctx.shadowColor='#9a4bdc';ctx.shadowBlur=8;ctx.fillText('R A V E N A',x,y+105);ctx.shadowBlur=0;
  // V6.4.24: contorno de ombros e pedra nas extremidades para leitura em telas pequenas.
 ctx.strokeStyle='rgba(176,141,188,.65)';ctx.lineWidth=1.6;
 ctx.beginPath();ctx.moveTo(x-43,y-121);ctx.quadraticCurveTo(x-63,y-91,x-62,y-61);
 ctx.moveTo(x+43,y-121);ctx.quadraticCurveTo(x+63,y-91,x+62,y-61);ctx.stroke();
 ctx.restore();
}
function drawMarketInterior(){
 const X=x=>x-cam.x,Y=y=>y-cam.y;
 ctx.save();ctx.fillStyle='#0c0913';ctx.fillRect(0,0,W,H);ctx.fillStyle='#271d2e';ctx.fillRect(X(430),Y(180),1430,1240);
 // Weathered stone tiles: skip invisible tiles for mobile performance.
 for(let x=435;x<1855;x+=92)for(let y=205;y<1415;y+=78){if(X(x)>W+100||X(x)<-120||Y(y)>H+90||Y(y)<-90)continue;const v=(Math.floor(x/92)*7+Math.floor(y/78)*11)%4;ctx.fillStyle=['#302438','#32283b','#2b2233','#35293c'][v];ctx.fillRect(X(x+2+(Math.floor(y/78)%2)*14),Y(y+2),88,74);ctx.strokeStyle='#503c5055';ctx.strokeRect(X(x+5),Y(y+5),82,68)}
 ctx.fillStyle='#4d3446';ctx.fillRect(X(430),Y(180),1430,70);ctx.fillStyle='#785064';ctx.fillRect(X(430),Y(236),1430,13);ctx.strokeStyle='#a06e83';ctx.lineWidth=23;ctx.strokeRect(X(430),Y(180),1430,1240);
 // Gothic pillars and hanging lanterns.
 for(let x=490;x<1850;x+=220){ctx.fillStyle='#694658';ctx.fillRect(X(x),Y(185),32,115);ctx.fillStyle='#9a7081';ctx.fillRect(X(x-6),Y(292),44,16);ctx.strokeStyle='#ba8b65';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(X(x+16),Y(252));ctx.lineTo(X(x+16),Y(287));ctx.stroke();glow(X(x+16),Y(302),58,'#e3a07635');ctx.fillStyle='#b98b63';rr(X(x),Y(285),32,34,5);ctx.fillStyle='#ffe1a1';rr(X(x+7),Y(292),18,20,3)}
 // Decorative alcoves and merchant stock against rear wall.
 for(let x=660;x<1800;x+=520){ctx.fillStyle='#1c1425';rr(X(x-100),Y(259),200,135,18);ctx.fillStyle='#866179';ctx.fillRect(X(x-95),Y(370),190,8);for(let j=0;j<4;j++){ctx.fillStyle=j%2?'#956b96':'#75658b';rr(X(x-73+j*45),Y(318-j%2*12),24,50,4);ctx.fillStyle='#d0a96c';ctx.fillRect(X(x-69+j*45),Y(327),15,5)}}
 // Burgundy runner: the center remains open for walking.
 ctx.fillStyle='#492c43';rr(X(1075),Y(700),130,475,12);ctx.strokeStyle='#8c5b73';ctx.lineWidth=3;ctx.strokeRect(X(1087),Y(712),106,451);
 for(let y=760;y<1170;y+=80){ctx.fillStyle='#b07d92';ctx.beginPath();ctx.moveTo(X(1140),Y(y-12));ctx.lineTo(X(1153),Y(y));ctx.lineTo(X(1140),Y(y+12));ctx.lineTo(X(1127),Y(y));ctx.closePath();ctx.fill()}
 // Three visually distinct stalls, same original interaction coordinates.
 for(const [x,title,color,goods] of [[690,'COMPRAR','#925c79',['🪙','🎣','🧺','🕯️']],[1140,'VENDER','#647b8f',['🐟','⚖️','🧊','🪙']],[1590,'TROCAR','#805a96',['💎','📜','🔮','🗝️']]]){
 ctx.fillStyle='#231924';rr(X(x-163),Y(335),326,152,12);for(let j=0;j<8;j++){ctx.fillStyle=j%2?color:'#422b45';ctx.fillRect(X(x-162+j*40),Y(341),40,40)}ctx.fillStyle='#ad8069';ctx.fillRect(X(x-152),Y(381),12,168);ctx.fillRect(X(x+140),Y(381),12,168);
 ctx.fillStyle='#573a38';rr(X(x-151),Y(411),302,137,10);ctx.fillStyle='#8e6454';ctx.fillRect(X(x-145),Y(429),290,11);ctx.font='25px system-ui';ctx.textAlign='center';goods.forEach((g,j)=>ctx.fillText(g,X(x-110+j*73),Y(416)));
 ctx.fillStyle=color;rr(X(x-161),Y(488),322,92,10);ctx.fillStyle='#c49a87';ctx.fillRect(X(x-154),Y(560),308,12);ctx.fillStyle='#fbe3e6';ctx.font='bold 22px system-ui';ctx.fillText(title,X(x),Y(537));}
 // Side crates stay away from the player path.
 for(const [x,y] of [[540,800],[1740,800],[540,1080],[1740,1080]]){ctx.fillStyle='#51362f';rr(X(x-38),Y(y-24),76,51,5);ctx.fillStyle='#a07654';ctx.fillRect(X(x-36),Y(y-21),72,10);ctx.strokeStyle='#c19a6b';ctx.lineWidth=3;ctx.strokeRect(X(x-34),Y(y-20),68,45)}
 // Recessed stairwell, six stone steps and rails.
 const sx=1120,sy=1310;ctx.fillStyle='#120e19';rr(X(sx-150),Y(sy-45),300,145,8);for(let i=0;i<6;i++){ctx.fillStyle=i%2?'#806476':'#ac8797';ctx.fillRect(X(sx-130+i*3),Y(sy-22+i*19),260-i*6,13)}ctx.strokeStyle='#c49c91';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(X(sx-155),Y(sy-38));ctx.lineTo(X(sx-140),Y(sy+100));ctx.moveTo(X(sx+155),Y(sy-38));ctx.lineTo(X(sx+140),Y(sy+100));ctx.stroke();ctx.fillStyle='#f2d0e5';ctx.font='bold 20px system-ui';ctx.textAlign='center';ctx.fillText('↓ ESCADAS • SAÍDA',X(sx),Y(sy-65));ctx.fillStyle='#f4d8e9';ctx.font='bold 28px Georgia';ctx.fillText('MERCADO NOTURNO DE AZARATH',X(1140),Y(145));ctx.restore();drawMini();
}

// V6.1 — detalhes ambientais leves, calculados por posição (sem alterar colisões).
function ravenaScenePolish(t,L){
 const cx=L.x+L.w/2-cam.x,cy=L.y+L.h/2-cam.y;
 // Moonlit ripples and occasional submerged fish silhouettes.
 ctx.save();ctx.beginPath();ctx.ellipse(cx,cy,L.w*.49,L.h*.49,0,0,Math.PI*2);ctx.clip();
 for(let i=0;i<23;i++){
  const a=i*2.399963,r=.16+(i%8)*.095;
  const x=cx+Math.cos(a)*L.w*.46*r,y=cy+Math.sin(a)*L.h*.46*r;
  if(x<-50||x>W+50||y<-25||y>H+25)continue;
  const v=(t*.00035+i*.17)%1;
  ctx.strokeStyle=`rgba(151,193,214,${.06+(1-v)*.11})`;ctx.lineWidth=1;
  ctx.beginPath();ctx.ellipse(x,y,7+v*19,3+v*7,0,0,Math.PI*2);ctx.stroke();
 }
 for(let i=0;i<8;i++){
  const x=cx+Math.cos(i*2.8+t*.00012)*L.w*.28;
  const y=cy+Math.sin(i*2.8+t*.00012)*L.h*.25;
  ctx.fillStyle='#061c2b88';ctx.beginPath();ctx.ellipse(x,y,13,4,i*.35,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(x-11,y);ctx.lineTo(x-19,y-6);ctx.lineTo(x-19,y+6);ctx.closePath();ctx.fill();
 }
 ctx.restore();
 // Pebbles and mushrooms: sparse, only on the outer shore.
 for(let i=0;i<82;i++){
  const a=i*2.399963,rx=L.w*.5+52+(i%5)*12,ry=L.h*.5+49+(i%5)*11;
  const x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry;
  if(x<-30||x>W+30||y<-30||y>H+30)continue;
  ctx.fillStyle=i%4===0?'#5c5363':'#384750';
  ctx.beginPath();ctx.ellipse(x,y,3+i%4,2+i%3,a,0,Math.PI*2);ctx.fill();
  if(i%11===0){
   glow(x,y-8,18,'#b18dff22');
   ctx.fillStyle='#d49ab9';ctx.beginPath();ctx.arc(x,y-6,4,Math.PI,0);ctx.fill();
   ctx.fillStyle='#c6b7a0';ctx.fillRect(x-1,y-6,2,6);
  }
 }
}
function ravenaDockAccents(t,P){
 const x=P.x-cam.x,y=P.y-cam.y,w=P.w,h=P.h;
 if(x>W+70||x+w<-70||y>H+70||y+h<-70)return;
 // Two mooring lamps and soft pools of amber light.
 for(const side of [-1,1]){
  const lx=side<0?x-14:x+w+14,ly=y+h*.77;
  glow(lx,ly-20,48,'#f6a25a3b');
  ctx.fillStyle='#251e25';ctx.fillRect(lx-3,ly-25,6,32);
  ctx.fillStyle='#f6c78d';ctx.fillRect(lx-5,ly-33,10,12);
  ctx.fillStyle='#ffe5ac';ctx.fillRect(lx-2,ly-30,4,6);
 }
 // Occasional petals drift over the wood, with minimal draw calls.
 for(let i=0;i<6;i++){
  const px=x+18+(i*47)%Math.max(25,w-30)+Math.sin(t*.0006+i)*5;
  const py=y+((t*.009+i*43)%h);
  ctx.fillStyle=i%2?'#df88ae99':'#b879d299';
  ctx.beginPath();ctx.ellipse(px,py,3,1.5,i,0,Math.PI*2);ctx.fill();
 }
}
// V6.3.1 — cenografia em camadas: caminhos, fachadas e iluminação alinhados ao mapa físico.
function azarethPaving(){
 const zones=[{x:1690,y:290,w:545,h:530},{x:1670,y:925,w:560,h:510},{x:75,y:300,w:355,h:350},{x:925,y:1335,w:470,h:235}];
 for(const z of zones){
  let x=z.x-cam.x,y=z.y-cam.y;if(x>W+80||y>H+80||x+z.w< -80||y+z.h< -80)continue;
  ctx.fillStyle='#302733';ctx.fillRect(x,y,z.w,z.h);
  ctx.strokeStyle='#554352';ctx.lineWidth=2;ctx.strokeRect(x+6,y+6,z.w-12,z.h-12);
  for(let yy=0;yy<z.h;yy+=27)for(let xx=0;xx<z.w;xx+=42){
   const stagger=(Math.floor(yy/27)%2)*21,px=x+xx+stagger,py=y+yy;
   if(px>x+z.w-7)continue;
   ctx.fillStyle=((xx/42+yy/27)%4===0)?'#4c3946':'#3c303d';
   ctx.fillRect(px+2,py+2,37,23);ctx.fillStyle='#9b6c7950';ctx.fillRect(px+4,py+3,25,2);
  }
 }
}
function azarethShore(){
 // Shoreline remains a clean bank; irregular stones are drawn by azarethLakeFinishing.
}
function azarethWaterDetails(t){
 const L=world.lake;
 for(let i=0;i<26;i++){
  let a=i*2.3999,r=.15+(i%9)*.075,x=L.x+L.w/2+Math.cos(a)*L.w*.5*r-cam.x,
  y=L.y+L.h/2+Math.sin(a)*L.h*.5*r-cam.y;
  if(x<-30||x>W+30||y<-30||y>H+30)continue;
  ctx.strokeStyle='#69b5d044';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(x,y,12+Math.sin(t*.001+i)*3,4,0,0,Math.PI*2);ctx.stroke();
  if(i%5===0){glow(x,y,25,'#a65de622');ctx.fillStyle='#b36ec9';ctx.beginPath();ctx.ellipse(x,y,4,2,0,0,Math.PI*2);ctx.fill()}
 }
}
// V6.4.5 — Lake finishing: restrained lily clusters, irregular rocky banks and amber reflections.
// Purely decorative: none of these features changes fishing or collision geometry.
function azarethLakeFinishing(t){
 const L=world.lake,cx=L.x+L.w/2-cam.x,cy=L.y+L.h/2-cam.y;
 ctx.save();ctx.beginPath();ctx.ellipse(cx,cy,L.w*.5-18,L.h*.5-18,0,0,Math.PI*2);ctx.clip();
 // Sparse pads in small groups instead of an evenly repeated ring.
 const clusters=[[-.67,-.37],[-.55,.28],[.62,-.23],[.55,.38],[-.17,.70],[.18,-.64]];
 for(let c=0;c<clusters.length;c++){
  const [u,v]=clusters[c];
  for(let j=0;j<3;j++){
   const x=cx+u*L.w*.47+(j-1)*18,y=cy+v*L.h*.45+(j%2)*12;
   ctx.fillStyle=j===1?'#376e65':'#285950';ctx.beginPath();ctx.ellipse(x,y,13-j*2,6-j*.5,-.25,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#83a38a55';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+9,y-2);ctx.stroke();
   if(j===1&&c%2===0){ctx.fillStyle='#d97faf';for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*4,y-3+Math.sin(a)*3,4,2,a,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#f3d8b2';ctx.fillRect(x-1,y-4,2,2)}
  }
 }
 // A few scattered fish shadows, with a visible tail instead of ambiguous dots.
 for(let i=0;i<8;i++){
  const a=i*2.399,r=.18+(i%4)*.15,x=cx+Math.cos(a)*L.w*.43*r+Math.sin(t*.00032+i)*9,y=cy+Math.sin(a)*L.h*.42*r;
  ctx.save();ctx.translate(x,y);ctx.rotate(a+.4);ctx.fillStyle='#183b4a8c';ctx.beginPath();ctx.ellipse(0,0,11,4,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(-17,-5);ctx.lineTo(-17,5);ctx.closePath();ctx.fill();ctx.restore();
 }
 ctx.restore();
 // Uneven stone groups only at selected shore points; avoids a necklace of identical ovals.
 for(let i=0;i<34;i++){
  const a=i*2.399963,r=1.015+(i%3)*.018,x=cx+Math.cos(a)*L.w*.5*r,y=cy+Math.sin(a)*L.h*.5*r;
  if(x<-40||y<-40||x>W+40||y>H+40)continue;
  const w=8+(i%4)*4,h=4+(i%3)*3;
  ctx.fillStyle=i%3===0?'#706578':'#464957';ctx.beginPath();ctx.moveTo(x-w,y+2);ctx.lineTo(x-w*.55,y-h);ctx.lineTo(x+w*.4,y-h*.8);ctx.lineTo(x+w,y);ctx.lineTo(x+w*.6,y+h);ctx.lineTo(x-w*.6,y+h);ctx.closePath();ctx.fill();
 }
}
function azarethPierReflections(t,P){
 const x=P.x-cam.x,y=P.y-cam.y;
 for(let i=0;i<2;i++){
  const lx=x+(i?P.w+14:-14),ly=y+P.h*.77+8;
  ctx.save();ctx.beginPath();ctx.ellipse(lx,ly+24,19,27,0,0,Math.PI*2);ctx.clip();
  for(let j=0;j<5;j++){ctx.fillStyle=`rgba(244,169,95,${.19-j*.025})`;ctx.fillRect(lx-7-j*2+Math.sin(t*.002+j)*3,ly+j*10,14+j*4,2)}ctx.restore();
 }
}
// V6.4.34 — arte da Guardiã Serena carregada uma vez, sem processamento por quadro.
const guardianSerenaSprite=new Image();
let guardianSerenaReady=false;
guardianSerenaSprite.onload=()=>{guardianSerenaReady=true;};
guardianSerenaSprite.src='assets/mae-das-aguas-guardia-serena-v6436.webp';
// V6.4.4 — Monumento original da Mãe das Águas. A Ravena permanece no bosque.
// O monumento é decorativo e está sobre um pedestal submerso, sem ilha transitável.
function drawMotherOfWaters(t){
 const L=world.lake, x=L.x+L.w*.50-cam.x, y=L.y+L.h*.51-cam.y;
 if(x<-190||x>W+190||y<-230||y>H+130)return;
 ctx.save();ctx.translate(x,y);
 const pulse=.5+.5*Math.sin(t*.0013);
 // Reflexo na água e anéis orgânicos, bem menos regulares que os antigos.
 glow(0,6,112,'#9771d524');
 for(let i=0;i<3;i++){
  ctx.strokeStyle=['#7b90bf36','#b28ad04a','#8fc6d033'][i];ctx.lineWidth=1.6;
  ctx.beginPath();ctx.ellipse(0,18+i*6,76+i*19,18+i*5,0,Math.PI*.08,Math.PI*.92);ctx.stroke();
 }
 // A base da arte agora está completa; apenas uma sombra submersa discreta.
 ctx.fillStyle='#10172555';ctx.beginPath();ctx.ellipse(0,17,81,15,0,0,Math.PI*2);ctx.fill();
 // Escultura aprovada: mãe sentada com filho adormecido, diretamente sobre o lago.
 // A imagem transparente substitui o desenho simplificado anterior.
 if(guardianSerenaReady){
  ctx.drawImage(guardianSerenaSprite,-124,-249,248,259);
 }else{
  // Silhueta provisória enquanto o arquivo termina de carregar.
  ctx.fillStyle='#6a7389';ctx.beginPath();ctx.ellipse(0,-73,38,81,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#a0aabd';ctx.beginPath();ctx.arc(-12,-125,19,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(19,-75,16,0,Math.PI*2);ctx.fill();
 }
 // Reflexos suaves na água, sem criar uma ilha nem efeitos custosos.
 ctx.fillStyle='#a9d9ed44';
 for(let i=0;i<4;i++){
  const rx=Math.sin(t*.0008+i*2.1)*11;
  ctx.fillRect(rx-28-i*5,37+i*8,56+i*10,1.5);
 }
 ctx.restore();
}
// V6.4.6 — acabamento de pedra, luz e agua. Elementos puramente visuais.
function azarethMonumentFinish(t){
 const L=world.lake,x=L.x+L.w*.50-cam.x,y=L.y+L.h*.51-cam.y;
 if(x<-180||x>W+180||y<-210||y>H+150)return;
 ctx.save();ctx.translate(x,y);
 // Pedestal submerso: pedras irregulares com juntas e borda iluminada.
 for(let i=0;i<9;i++){
  const a=i*Math.PI*2/9,px=Math.cos(a)*78,py=23+Math.sin(a)*24;
  ctx.fillStyle=i%2?'#373648':'#494257';ctx.beginPath();ctx.ellipse(px,py,11+i%3*2,5+i%2*2,a*.1,0,Math.PI*2);ctx.fill();
 }
 ctx.strokeStyle='#b6a3c077';ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(0,20,72,23,0,.05,Math.PI-.05);ctx.stroke();
 // Duas lanternas baixas, pequenas para nao esconder a mae e a crianca.
 for(const side of [-1,1]){
  const lx=side*58,ly=0;ctx.fillStyle='#201b2a';ctx.fillRect(lx-3,ly-15,6,17);
  ctx.fillStyle='#e6b979';ctx.fillRect(lx-3,ly-13,6,7);
  glow(lx,ly-10,21,'#e4b47822');
 }
 // Reflexos quebrados, em vez de anel circular continuo.
 for(let i=0;i<8;i++){
  const yy=39+i*7,xx=Math.sin(i*2.1+t*.001)*13;
  ctx.strokeStyle=i%2?'#ad91c33d':'#e0b99032';ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(xx-18+i%3*3,yy);ctx.lineTo(xx+15-i%4*2,yy);ctx.stroke();
 }
 ctx.restore();
}
function azarethDockFinish(t,P){
 const x=P.x-cam.x,y=P.y-cam.y,w=P.w,h=P.h;
 if(x>W+100||x+w<-100||y>H+100||y+h<-100)return;
 ctx.save();
 // Travessas e sombras de sustentacao para evitar o aspecto de prancha solta.
 for(const side of [-1,1]){
  const px=side<0?x-12:x+w+5;
  ctx.fillStyle='#17182088';ctx.beginPath();ctx.moveTo(px,y+24);ctx.lineTo(px+side*19,y+43);ctx.lineTo(px+side*19,y+h+28);ctx.lineTo(px,y+h-5);ctx.fill();
  for(let i=0;i<4;i++){
   const py=y+20+i*(h-45)/3;
   ctx.fillStyle='#332822';ctx.fillRect(px-4,py,14,7);
   ctx.fillStyle='#bb956b';ctx.fillRect(px-4,py,14,2);
  }
 }
 // Luz de borda e textura discreta das ripas.
 ctx.strokeStyle='#d1a67866';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+3,y+5);ctx.lineTo(x+3,y+h-5);ctx.moveTo(x+w-3,y+5);ctx.lineTo(x+w-3,y+h-5);ctx.stroke();
 for(let i=0;i<10;i++){
  const py=y+10+i*(h-20)/10;
  ctx.strokeStyle='#3c292b77';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x+13+(i%3)*6,py);ctx.lineTo(x+35+(i%3)*8,py);ctx.stroke();
 }
 ctx.restore();
}

// V6.4.50 — Vitrines e bancas permanentes: a loja continua sendo um painel rápido.
// Os objetos são puramente visuais e ficam nas laterais, fora do acesso central.
function azarathTradingFronts(t){
 if(scene!=='lake')return;
 function barrel(x,y){
  ctx.fillStyle='#080a11aa';ctx.beginPath();ctx.ellipse(x,y+5,16,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#634330';ctx.fillRect(x-12,y-20,24,23);
  ctx.fillStyle='#906743';ctx.beginPath();ctx.ellipse(x,y-20,12,5,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#b28c62';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-12,y-14);ctx.lineTo(x+12,y-14);ctx.moveTo(x-12,y-3);ctx.lineTo(x+12,y-3);ctx.stroke();
 }
 function crate(x,y){
  ctx.fillStyle='#3a2a28';ctx.fillRect(x-17,y-20,34,25);ctx.strokeStyle='#a67d59';ctx.lineWidth=3;ctx.strokeRect(x-17,y-20,34,25);
  ctx.beginPath();ctx.moveTo(x-15,y-18);ctx.lineTo(x+15,y+3);ctx.moveTo(x+15,y-18);ctx.lineTo(x-15,y+3);ctx.stroke();
 }
 for(const [b,market] of [[world.shop,false],[world.market,true]]){
  const x=b.x-cam.x,y=b.y-cam.y,w=b.w,h=b.h;
  if(x>W+180||x+w<-180||y>H+180||y+h<-240)continue;
  ctx.save();
  // Bancada com tampo sólido e suportes, substituindo a aparência de tábuas no chão.
  const counterY=y+h-20;
  ctx.fillStyle='#1c1721';ctx.fillRect(x+12,counterY-23,w-24,26);
  ctx.fillStyle=market?'#78415b':'#70523e';ctx.fillRect(x+9,counterY-27,w-18,11);
  ctx.fillStyle='#b9926d';ctx.fillRect(x+12,counterY-27,w-24,3);
  for(const xx of [x+24,x+w-29]){ctx.fillStyle='#3b2c2b';ctx.fillRect(xx,counterY-16,11,20);}
  // Prateleira visível, mercadorias e letreiro de loja.
  ctx.fillStyle='#342734';ctx.fillRect(x+19,y+44,w-38,8);
  ctx.fillStyle='#b48a63';ctx.fillRect(x+22,y+44,w-44,3);
  for(let i=0;i<5;i++){
   const px=x+36+i*(w-72)/4;
   if(market){
    ctx.fillStyle=i%2?'#a86a96':'#855eaa';ctx.beginPath();ctx.arc(px,y+34,7,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e0c2e5';ctx.fillRect(px-2,y+27,4,3);
   }else{
    ctx.strokeStyle=i%2?'#c5a77e':'#86aeb4';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(px,y+21);ctx.lineTo(px+2,y+42);ctx.stroke();
    ctx.fillStyle='#d4b989';ctx.beginPath();ctx.arc(px+2,y+41,3,0,Math.PI*2);ctx.fill();
   }
  }
  // Caixotes e barris encostados nas extremidades: passagem central livre.
  barrel(x+5,y+h+4);crate(x+w-5,y+h+4);
  if(!market){
   // Redes de pesca suspensas na lateral, com flutuadores.
   ctx.strokeStyle='#a9b8aa88';ctx.lineWidth=1;
   for(let i=0;i<6;i++){
    ctx.beginPath();ctx.moveTo(x+w-26+i*4,y+66);ctx.lineTo(x+w-26+i*4,y+101);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+w-27,y+69+i*5);ctx.lineTo(x+w-5,y+69+i*5);ctx.stroke();
   }
   for(let i=0;i<3;i++){ctx.fillStyle='#d0a16a';ctx.beginPath();ctx.arc(x+w-24+i*8,y+66,3,0,Math.PI*2);ctx.fill();}
  }else{
   // Tecido vinho e pequenos produtos no balcão do mercado.
   ctx.fillStyle='#78374f';ctx.fillRect(x+18,counterY-15,w-36,8);
   for(let i=0;i<4;i++){const px=x+44+i*(w-88)/3;ctx.fillStyle=i%2?'#c5a0b4':'#d6ae79';ctx.fillRect(px-6,counterY-34,12,7);}
  }
  // Iluminação quente discreta, sem encobrir a fachada.
  const pulse=.88+.12*Math.sin(t*.002+(market?2:0));
  glow(x+24,y+80,27*pulse,market?'#e57c9a2d':'#eeb4772b');
  ctx.restore();
 }
}

function azarethNightLighting(t){
 // Luz quente apenas nas areas construidas, com intensidade suave.
 for(const b of [world.shop,world.market]){
  const x=b.x+b.w*.5-cam.x,y=b.y+b.h*.7-cam.y;
  if(x>-140&&x<W+140&&y>-140&&y<H+140)glow(x,y,85,'#f3aa4d13');
 }
 // Brilho frio em torno do santuario, longe do lago.
 const a=world.altar,x=a.x+a.w*.5-cam.x,y=a.y+a.h*.5-cam.y;
 if(x>-160&&x<W+160&&y>-160&&y<H+160)glow(x,y,95,'#9d70df18');
}
// V6.4.8 — cenografia de bairro: bancos, canteiros e barracas com sombras de contato.
// Sao decoracoes de borda, sem criar novas zonas de colisao ou bloquear as rotas.
function azarathDistrictFinishing(t){
 const benches=[[1655,840],[2105,840],[1675,1215],[2135,1255]];
 for(const [wx,wy] of benches){
  const x=wx-cam.x,y=wy-cam.y;if(x<-85||x>W+85||y<-100||y>H+60)continue;
  ctx.save();ctx.fillStyle='#05081488';ctx.beginPath();ctx.ellipse(x+4,y+7,43,12,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#211c25';ctx.fillRect(x-31,y-20,7,30);ctx.fillRect(x+24,y-20,7,30);
  ctx.fillStyle='#775744';ctx.beginPath();ctx.moveTo(x-39,y-21);ctx.lineTo(x+35,y-21);ctx.lineTo(x+30,y-12);ctx.lineTo(x-35,y-12);ctx.closePath();ctx.fill();
  ctx.fillStyle='#aa8160';ctx.fillRect(x-37,y-9,72,7);ctx.fillStyle='#d5a57d55';ctx.fillRect(x-34,y-8,65,2);ctx.restore();
 }
 const beds=[[1605,755],[2125,760],[1660,1160],[2145,1340]];
 for(let i=0;i<beds.length;i++){
  const [wx,wy]=beds[i],x=wx-cam.x,y=wy-cam.y;if(x<-90||x>W+90||y<-65||y>H+65)continue;
  ctx.fillStyle='#080e1688';ctx.beginPath();ctx.ellipse(x+3,y+7,54,22,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#665563';ctx.beginPath();ctx.ellipse(x,y,49,19,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1c3c38';ctx.beginPath();ctx.ellipse(x,y-3,43,14,0,0,Math.PI*2);ctx.fill();
  for(let j=0;j<9;j++){let a=j*2.4+i,px=x+Math.cos(a)*30,py=y-4+Math.sin(a)*9;
   ctx.fillStyle=j%3===0?'#d788b7':j%3===1?'#a96dbd':'#efb3a7';ctx.beginPath();ctx.arc(px,py,3.5,0,Math.PI*2);ctx.fill();}
 }
 // Pequenas bancas encostadas na borda da praca do mercado, sem fingir ser lojas acessiveis.
 for(const [wx,wy,col] of [[1720,1120,'#804c72'],[2130,1090,'#584c83']]){
  const x=wx-cam.x,y=wy-cam.y;if(x<-90||x>W+90||y<-110||y>H+70)continue;
  ctx.fillStyle='#06071099';ctx.beginPath();ctx.ellipse(x,y+8,49,13,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3e2b2b';ctx.fillRect(x-37,y-26,74,32);ctx.fillStyle='#a27b60';ctx.fillRect(x-41,y-31,82,9);
  ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x-48,y-34);ctx.lineTo(x-30,y-75);ctx.lineTo(x+30,y-75);ctx.lineTo(x+48,y-34);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#c79cba';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-48,y-34);ctx.lineTo(x+48,y-34);ctx.stroke();
  for(let j=0;j<5;j++){ctx.fillStyle=j%2?'#d8a36f':'#9d6ba6';ctx.beginPath();ctx.arc(x-26+j*13,y-26,5,0,Math.PI*2);ctx.fill();}
  glow(x,y-48,35,'#e9aa6930');
 }
}
function azarethVillageProps(t){
 // Lanterns and banners placed on traversable squares, never used as hidden collision blockers.
 for(const [x,y] of [[1690,440],[1720,800],[1830,910],[2080,935],[1690,1310],[2150,1400],[375,655],[1010,1400],[1260,1410]]){
  const X=x-cam.x,Y=y-cam.y;if(X<-60||Y<-90||X>W+60||Y>H+60)continue;
  glow(X,Y-29,53,'#ffb35a45');ctx.fillStyle='#271d25';ctx.fillRect(X-4,Y-40,8,41);
  ctx.fillStyle='#d69a56';ctx.fillRect(X-9,Y-47,18,18);ctx.fillStyle='#ffe5a0';ctx.fillRect(X-5,Y-44,10,12);
  ctx.strokeStyle='#6b405b';ctx.lineWidth=2;ctx.strokeRect(X-10,Y-48,20,20);
 }
 for(const [x,y] of [[1700,340],[2120,360],[1730,1090],[2080,1060]]){
  const X=x-cam.x,Y=y-cam.y;ctx.fillStyle='#34202e';ctx.fillRect(X-3,Y-92,6,100);
  ctx.fillStyle='#8e2859';ctx.beginPath();ctx.moveTo(X+4,Y-90);ctx.lineTo(X+38,Y-82);ctx.lineTo(X+38,Y-29);ctx.lineTo(X+21,Y-41);ctx.lineTo(X+4,Y-29);ctx.closePath();ctx.fill();
  ctx.fillStyle='#e2a5cf';ctx.font='22px Georgia';ctx.fillText('✦',X+13,Y-52);
 }
}
// V6.3.2 — caminhos e ambientação são decorativos; não inventam passagens sobre água.
// V6.3.4 — rotas de exploração: mesma geometria para arte e reserva de passagem.
const AZARATH_ROUTES=[
 [[1120,1350],[1460,1390],[1730,1310],[1950,1195]],
 [[1730,1310],[1790,900],[1920,640],[1970,535]],
 [[1780,900],[2070,870],[2150,750]],
 [[420,1290],[600,1370],[840,1420],[1120,1350]]
];
function distanceToRoute(x,y,route){
 let best=Infinity;
 for(let i=1;i<route.length;i++){
  const [ax,ay]=route[i-1],[bx,by]=route[i],dx=bx-ax,dy=by-ay;
  const u=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));
  best=Math.min(best,Math.hypot(x-(ax+u*dx),y-(ay+u*dy)));
 }
 return best;
}
function azarathWayfinding(t){
 const signs=[
  {x:1490,y:1390,label:'MERCADO  →',angle:-.1},
  {x:1765,y:780,label:'LOJA  ↗',angle:0},
  {x:830,y:1450,label:'←  BOSQUE',angle:.06},
  {x:2080,y:820,label:'JARDINS  ↓',angle:0}
 ];
 for(const sign of signs){
  const x=sign.x-cam.x,y=sign.y-cam.y;
  if(x<-140||x>W+140||y<-110||y>H+90)continue;
  ctx.save();ctx.translate(x,y);ctx.rotate(sign.angle);
  ctx.fillStyle='#090d17aa';ctx.beginPath();ctx.ellipse(3,5,37,10,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#281d2b';ctx.fillRect(-4,-60,8,64);
  ctx.fillStyle='#81576c';ctx.fillRect(-44,-64,88,28);
  ctx.strokeStyle='#d1a77c';ctx.lineWidth=2;ctx.strokeRect(-43,-63,86,26);
  ctx.fillStyle='#fff0d2';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText(sign.label,0,-46);
  glow(0,-51,33,'#d38bba26');ctx.restore();
 }
 // Pontos de orientação sem barreiras invisíveis: pequenas marcas de praça.
 for(const [wx,wy] of [[1480,1390],[1770,900],[2040,870]]){
  const x=wx-cam.x,y=wy-cam.y;if(x<-90||x>W+90||y<-90||y>H+90)continue;
  ctx.strokeStyle='#d1a97b77';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(x,y,31,12,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<8;i++){let a=i*Math.PI/4;ctx.fillStyle='#a77d9b';ctx.fillRect(x+Math.cos(a)*26-2,y+Math.sin(a)*9-2,4,4)}
 }
}
// V6.4.10 — connected, layered paths: no hard-edged paper strips.
function azarathRoads(t){
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 for(const points of AZARATH_ROUTES){
  const stroke=(color,width)=>{ctx.beginPath();points.forEach(([wx,wy],i)=>i?ctx.lineTo(wx-cam.x,wy-cam.y):ctx.moveTo(wx-cam.x,wy-cam.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()};
  stroke('#0b171d66',118);stroke('#273039',103);stroke('#3c3943',93);stroke('#554952',79);stroke('#695962',60);
  // Uneven stone joints, aligned with the actual walking route.
  for(let k=0;k<points.length-1;k++){
   const [ax,ay]=points[k],[bx,by]=points[k+1],dx=bx-ax,dy=by-ay,dist=Math.hypot(dx,dy);
   const nx=-dy/dist,ny=dx/dist,angle=Math.atan2(dy,dx);
   for(let j=0;j<Math.floor(dist/32);j++){
    const u=(j+.5)*32/dist,wx=ax+dx*u,wy=ay+dy*u,x=wx-cam.x,y=wy-cam.y;
    if(x<-90||x>W+90||y<-90||y>H+90)continue;
    for(let side=-1;side<=1;side++){
     const offset=side*22+Math.sin(j*2.41+side*3+k)*4;
     ctx.save();ctx.translate(x+nx*offset,y+ny*offset);ctx.rotate(angle);
     ctx.fillStyle=(j+side+k)%4===0?'#826d74':'#72616b';
     ctx.beginPath();ctx.moveTo(-12,-7);ctx.lineTo(10,-8);ctx.lineTo(13,5);ctx.lineTo(-9,7);ctx.closePath();ctx.fill();
     ctx.strokeStyle='#261f2b55';ctx.lineWidth=1;ctx.stroke();ctx.restore();
    }
   }
  }
 }
 ctx.restore();
}
// Lighting and small environmental seams are drawn over roads, never as collision objects.
function azarathRoadTransitions(t){
 ctx.save();
 const junctions=[[1120,1350],[1730,1310],[1790,900],[1780,900]];
 for(let i=0;i<junctions.length;i++){
  const [wx,wy]=junctions[i],x=wx-cam.x,y=wy-cam.y;
  if(x<-100||x>W+100||y<-100||y>H+100)continue;
  ctx.fillStyle='#66545e';ctx.beginPath();ctx.ellipse(x,y,40,30,-.16,0,Math.PI*2);ctx.fill();
  for(let j=0;j<8;j++){
   const a=j*2.399+i,r=8+j%3*8;
   ctx.fillStyle=j%3?'#806b75':'#554852';ctx.beginPath();ctx.ellipse(x+Math.cos(a)*r,y+Math.sin(a)*r*.7,7,4,a,0,Math.PI*2);ctx.fill();
  }
 }
 // Lantern pools make the street readable without flooding the screen.
 for(const [wx,wy] of [[1510,1360],[1790,1050],[1910,760],[620,1380]]){
  const x=wx-cam.x,y=wy-cam.y;if(x<-90||x>W+90||y<-90||y>H+90)continue;
  const g=ctx.createRadialGradient(x,y,2,x,y,70);g.addColorStop(0,'#d49a6530');g.addColorStop(1,'#d49a6500');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,70,32,0,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function azarathVillageAtmosphere(t){
 // Garden lanterns, ornamental fences and illuminated flowers along the east plaza.
 for(let i=0;i<9;i++){
  const x=1660+(i%3)*184,y=690+Math.floor(i/3)*245;
  const X=x-cam.x,Y=y-cam.y;
  if(X<-40||X>W+40||Y<-60||Y>H+60||inLake(x,y))continue;
  ctx.fillStyle='#1c2830';ctx.fillRect(X-18,Y-2,36,5);
  ctx.fillStyle=i%3===0?'#ac5b93':'#634a85';
  for(let a=0;a<5;a++){let ang=a*Math.PI*2/5;ctx.beginPath();ctx.arc(X+Math.cos(ang)*8,Y-9+Math.sin(ang)*5,5,0,Math.PI*2);ctx.fill()}
  glow(X,Y-10,18,'#a95cd322');
 }
 for(const [x,y] of [[1660,670],[1820,720],[2130,650],[1720,1160],[2110,1230]]){
  const X=x-cam.x,Y=y-cam.y;if(X<-40||X>W+40||Y<-100||Y>H+40)continue;
  ctx.fillStyle='#171723';ctx.fillRect(X-3,Y-48,6,50);ctx.fillStyle='#956b8c';ctx.fillRect(X-7,Y-51,14,5);
  glow(X,Y-49,58,'#ffbd7655');ctx.fillStyle='#ffdc9a';ctx.beginPath();ctx.arc(X,Y-50,6,0,Math.PI*2);ctx.fill();
 }
}
// V6.3.3 — village details, deliberately non-blocking and away from lake water.
function azarathArchitectureAccents(t){
 const plazas=[[1840,830,110,60],[1950,1350,120,65],[480,1190,100,55]];
 for(const [wx,wy,rw,rh] of plazas){
  const x=wx-cam.x,y=wy-cam.y;if(x>W+rw||x+rw<0||y>H+rh||y+rh<0)continue;
  ctx.save();ctx.strokeStyle='#b594a344';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(x,y,rw/2,rh/2,0,0,Math.PI*2);ctx.stroke();
  for(let j=0;j<12;j++){const a=j*Math.PI/6;ctx.fillStyle=j%2?'#67536a':'#75616d';ctx.beginPath();ctx.ellipse(x+Math.cos(a)*rw*.4,y+Math.sin(a)*rh*.4,8,4,a,0,Math.PI*2);ctx.fill()}
  ctx.restore();
 }
 // Removed distant flat roof cutouts: real buildings provide the skyline.

}
// V6.3.5 — perspectivas arquitetônicas decorativas; sem criar colisões falsas.
function azarathPerspectiveDistricts(t){
 const districts=[
  {x:1950,y:775,rx:175,ry:78,name:'PRAÇA DAS LANTERNAS'},
  {x:1970,y:1335,rx:190,ry:85,name:'BAIRRO DO MERCADO'},
  {x:405,y:1190,rx:150,ry:72,name:'JARDINS DO CREPÚSCULO'}
 ];
 for(const d of districts){
  const x=d.x-cam.x,y=d.y-cam.y;
  if(x+d.rx<0||x-d.rx>W||y+d.ry<0||y-d.ry>H)continue;
  ctx.save();ctx.beginPath();ctx.ellipse(x,y,d.rx,d.ry,0,0,Math.PI*2);ctx.clip();
  ctx.fillStyle='#342b3b99';ctx.fillRect(x-d.rx,y-d.ry,d.rx*2,d.ry*2);
  for(let row=-7;row<=7;row++){
   const yy=y+row*15,shift=(row%2)*19;
   for(let col=-9;col<=9;col++){
    const xx=x+col*39+shift;
    ctx.fillStyle=(col+row)%3===0?'#57445c':'#46384d';
    ctx.beginPath();ctx.moveTo(xx-17,yy-5);ctx.lineTo(xx+15,yy-7);ctx.lineTo(xx+18,yy+4);ctx.lineTo(xx-14,yy+6);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#9c7b9950';ctx.lineWidth=1;ctx.stroke();
   }
  }
  ctx.restore();
  ctx.strokeStyle='#98748a55';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,d.rx,d.ry,0,0,Math.PI*2);ctx.stroke();
  ctx.font='bold 11px Georgia';ctx.textAlign='center';ctx.fillStyle='#e5bdd4a6';ctx.fillText(d.name,x,y+d.ry-14);
 }
 // Fachadas laterais agora são desenhadas uma única vez em building().
}
// V6.4.12 — Transição do bosque e luz ambiente: detalhes no chão,
// sem objetos sólidos ou mudanças na malha de colisão.
function azarathForestFloor(t){
 const groves=[[425,250],[1900,240],[170,1110],[2180,800],[720,1510],[395,1190],[355,1320]];
 for(let g=0;g<groves.length;g++){
  const [gx,gy]=groves[g];
  for(let i=0;i<15;i++){
   const a=i*2.399963+g*1.17,dist=38+(i%5)*19;
   const wx=gx+Math.cos(a)*dist,wy=gy+Math.sin(a)*dist*.72;
   if(inLake(wx,wy))continue;
   const x=wx-cam.x,y=wy-cam.y;
   if(x<-35||x>W+35||y<-35||y>H+35)continue;
   ctx.fillStyle=i%4===0?'#5c56602b':'#45634b25';
   ctx.beginPath();ctx.ellipse(x,y,9+i%4*3,3+i%3,Math.sin(i*3.1),0,Math.PI*2);ctx.fill();
   if(i%6===0){
    ctx.strokeStyle='#65826966';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(x,y+3);ctx.lineTo(x-3,y-5);ctx.moveTo(x,y+3);ctx.lineTo(x+4,y-7);ctx.stroke();
   }
  }
 }
}
function azarathGroundLight(t){
 const lights=[[1790,710],[2050,760],[1780,1280],[2100,1260],[385,510],[350,1030],[1040,1480],[1200,1490]];
 for(let i=0;i<lights.length;i++){
  const [wx,wy]=lights[i],x=wx-cam.x,y=wy-cam.y;
  if(x<-120||x>W+120||y<-120||y>H+120)continue;
  const pulse=.92+.08*Math.sin(t*.002+i*1.7);
  ctx.save();ctx.translate(x,y);ctx.scale(1,.36);
  const gr=ctx.createRadialGradient(0,0,2,0,0,92*pulse);
  gr.addColorStop(0,'#f3a75a30');gr.addColorStop(.45,'#bd794a14');gr.addColorStop(1,'#d39a5200');
  ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,92*pulse,0,Math.PI*2);ctx.fill();ctx.restore();
 }
}
function ground(){if(scene==='sanctuary'){drawSeparateSanctuary(performance.now());return;}if(scene==='market'){drawMarketInterior();return;}const t=performance.now();ctx.fillStyle='#0c1720';ctx.fillRect(0,0,W,H);
 // Natural, continuous ground: no visible square tiles that resemble paper sheets.
 const soil=ctx.createLinearGradient(0,0,W,H);soil.addColorStop(0,'#10242a');soil.addColorStop(.55,'#14252a');soil.addColorStop(1,'#0d1d25');ctx.fillStyle=soil;ctx.fillRect(0,0,W,H);
 for(let i=0;i<115;i++){const wx=(i*379+47)%world.w,wy=(i*613+79)%world.h,x=wx-cam.x,y=wy-cam.y;if(x<-25||y<-25||x>W+25||y>H+25||inLake(wx,wy))continue;ctx.fillStyle=i%3===0?'#41605228':'#334a5024';ctx.beginPath();ctx.ellipse(x,y,9+i%5*3,3+i%3,((i*7)%9)*.3,0,Math.PI*2);ctx.fill()}
 azarathForestFloor(t);azarethPaving();azarathRoads(t);azarathRoadTransitions(t);azarathGroundLight(t);
 // walking trail around the lake
 const L=world.lake,cx=L.x+L.w/2-cam.x,cy=L.y+L.h/2-cam.y;
 ctx.strokeStyle='#3d3434';ctx.lineWidth=74;ctx.beginPath();ctx.ellipse(cx,cy,L.w/2+80,L.h/2+74,0,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle='#625047';ctx.lineWidth=3;ctx.setLineDash([10,25]);ctx.beginPath();ctx.ellipse(cx,cy,L.w/2+80,L.h/2+74,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle='#091c2b';ctx.beginPath();ctx.ellipse(cx,cy,L.w/2,L.h/2,0,0,Math.PI*2);ctx.fill();drawLakeReflections(t,L,cx,cy);drawLakeFauna(t,L);azarethShore();azarethWaterDetails(t);azarethLakeFinishing(t);
 ctx.strokeStyle='#557e8666';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(cx,cy,L.w/2,L.h/2,0,0,Math.PI*2);ctx.stroke();
 // Shore glints instead of seven artificial concentric pool rings.
 ctx.save();ctx.beginPath();ctx.ellipse(cx,cy,L.w/2-10,L.h/2-10,0,0,Math.PI*2);ctx.clip();
 const gentleShore=graphicsSettings.quality==='leve'||(graphicsSettings.quality==='equilibrado'&&innerWidth<=720);
 for(let i=0;i<19;i+=gentleShore?2:1){let a=i*2.399,rad=.2+(i%7)*.10,x=cx+Math.cos(a)*L.w*.43*rad,y=cy+Math.sin(a)*L.h*.40*rad;if(x<-35||x>W+35||y<-15||y>H+15)continue;ctx.strokeStyle='#66a1b04d';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y,9+(i%4)*5,3+(i%3)*2,0,0,Math.PI*1.35);ctx.stroke()}ctx.restore();
 for(let i=0;i<40;i++){let x=L.x+120+(i*191)%1070,y=L.y+80+(i*103)%800;if(!inLake(x,y))continue;let drift=Math.sin(t*.0007+i)*12;if(x-cam.x<-70||x-cam.x>W+70||y-cam.y<-10||y-cam.y>H+10)continue;ctx.fillStyle=i%3?'#40637b66':'#a47edb55';ctx.fillRect(x-cam.x+drift,y-cam.y,24+(i%4)*13,2)}
 // Remove suspended waterfalls until actual rock ledges and elevation exist.
 lakeReeds(t,L);
 ravenaScenePolish(t,L);
 drawMotherOfWaters(t);azarethMonumentFinish(t);
 // The fishing lake is now clear of the sanctuary.
 // dock, wood grain and posts
 const P=world.pier;ctx.fillStyle='#372b26';ctx.fillRect(P.x-12-cam.x,P.y-10-cam.y,P.w+24,P.h+20);ctx.fillStyle='#7b5943';ctx.fillRect(P.x-cam.x,P.y-cam.y,P.w,P.h);
 for(let y=P.y;y<P.y+P.h;y+=23){ctx.strokeStyle='#b48a65';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(P.x-cam.x,y-cam.y);ctx.lineTo(P.x+P.w-cam.x,y-cam.y);ctx.stroke()}
 for(let y of [P.y+14,P.y+P.h-18])for(let x of [P.x+10,P.x+P.w-10]){ctx.fillStyle='#34251e';ctx.fillRect(x-6-cam.x,y-6-cam.y,12,16)}
 drawPierDetail(t,P);drawDockAccessories(P);ravenaDockAccents(t,P);azarethPierReflections(t,P);azarethDockFinish(t,P);
 // Acessos e calçadas sob os edifícios, antes das fachadas.
 azarathBuildingApproaches();
 // redesigned trading buildings
 building(world.shop,'LOJA DO PESCADOR','🎣','#55446d');building(world.market,'MERCADO NOTURNO','🌹','#6e334f');azarathTradingFronts(t);drawTombstone();drawSanctuaryPortal(t);
 azarethNightLighting(t);azarathStreetIdentity(t);drawVillageDetails(t);azarathPerspectiveDistricts(t);azarathDistrictFinishing(t);azarethVillageProps(t);azarathVillageAtmosphere(t);azarathArchitectureAccents(t);azarathWayfinding(t);
 // woodland and cherry blossom groves
 for(const tree of sceneryTrees){let {x,y,i}=tree;let X=x-cam.x,Y=y-cam.y;if(X<-50||X>W+50||Y<-50||Y>H+50)continue;ctx.fillStyle='#0b141b';ctx.beginPath();ctx.ellipse(X,Y+15,31,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#27352f';ctx.beginPath();ctx.ellipse(X,Y+13,23,8,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#5a4347';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(X,Y+5);ctx.lineTo(X-14,Y+15);ctx.moveTo(X,Y+6);ctx.lineTo(X+13,Y+14);ctx.stroke();
 ctx.fillStyle='#493444';ctx.fillRect(X-4,Y-19,8,33);for(let k=0;k<3;k++){ctx.fillStyle=i%5===0?['#8c3f72','#b85a91','#e184b2'][k]:i%4===0?['#292e52','#3d4671','#55608a'][k]:['#193d3c','#295a51','#377166'][k];ctx.beginPath();const tx=X+(k-1)*10,ty=Y-27-k*12,r=17+(i%3)*4;ctx.moveTo(tx-r,ty+5);ctx.quadraticCurveTo(tx-r*.95,ty-r*.8,tx-5,ty-r*1.18);ctx.quadraticCurveTo(tx+r*.7,ty-r*1.1,tx+r,ty+1);ctx.quadraticCurveTo(tx+r*.6,ty+r*.7,tx+4,ty+r*.55);ctx.quadraticCurveTo(tx-r*.5,ty+r*.8,tx-r,ty+5);ctx.fill()}ctx.fillStyle='#ffffff17';ctx.beginPath();ctx.arc(X-8,Y-52,7,0,Math.PI*2);ctx.fill()}
 for(let i=0;i<26;i++){let a=i*2.399,rx=L.w/2+125,ry=L.h/2+118,x=L.x+L.w/2+Math.cos(a)*rx,y=L.y+L.h/2+Math.sin(a)*ry;if(i%4===0)lantern(x,y);else flower(x,y,i)}
 npc(980,1400,'Pescador');npc(1810,990,'Nyx');npc(1840,530,'Mercadora');
 // distant skyline and moon
 ctx.fillStyle='#d9d1ff';ctx.beginPath();ctx.arc(2160-cam.x,95-cam.y,39,0,Math.PI*2);ctx.fill();glow(2160-cam.x,95-cam.y,110,'#a785ff33');
 drawMini()}
function drawTombstone(){
 const b=world.board,x=b.x-cam.x,y=b.y-cam.y;
 glow(x+70,y+72,105,'#9d53c033');
 ctx.fillStyle='#100e1a';ctx.beginPath();ctx.ellipse(x+72,y+120,95,29,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#332c40';ctx.fillRect(x+12,y+65,122,64);
 ctx.beginPath();ctx.arc(x+73,y+65,61,Math.PI,0);ctx.fill();
 ctx.strokeStyle='#ad79b8';ctx.lineWidth=4;ctx.strokeRect(x+17,y+67,112,57);
 ctx.fillStyle='#dfc3e8';ctx.textAlign='center';ctx.font='bold 16px Georgia';ctx.fillText('✦ RAVENA ✦',x+73,y+67);
 ctx.font='bold 12px Georgia';ctx.fillText('CAMPEÕES',x+73,y+91);
 ctx.fillStyle='#e36b94';for(let i=0;i<5;i++)flower(b.x+10+i*28,b.y+126,i);
}

// V6.4.13: A estrutura vermelha ao sul do pier leva a um mapa separado.
function drawSanctuaryPortal(t){
 const x=1110-cam.x,y=1370-cam.y;
 if(x<-145||x>W+145||y<-180||y>H+145)return;
 ctx.save();
 // Entrada unica: portal de alvenaria compacto, separado visualmente do pier.
 ctx.fillStyle='rgba(8,7,15,.50)';ctx.beginPath();ctx.ellipse(x,y+19,77,18,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#29202f';ctx.fillRect(x-65,y-79,22,95);ctx.fillRect(x+43,y-79,22,95);
 ctx.fillStyle='#63516b';ctx.fillRect(x-61,y-75,7,82);ctx.fillRect(x+47,y-75,7,82);
 ctx.fillStyle='#33243e';ctx.beginPath();ctx.moveTo(x-76,y-79);ctx.lineTo(x,y-134);ctx.lineTo(x+76,y-79);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#ad83ba';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-69,y-78);ctx.lineTo(x,y-125);ctx.lineTo(x+69,y-78);ctx.stroke();
 const pulse=.18+.06*Math.sin(t*.0015);
 ctx.fillStyle=`rgba(142,79,191,${pulse})`;ctx.beginPath();ctx.moveTo(x-42,y-74);ctx.lineTo(x,y-105);ctx.lineTo(x+42,y-74);ctx.lineTo(x+42,y+10);ctx.lineTo(x-42,y+10);ctx.closePath();ctx.fill();
 ctx.fillStyle='#e5c6eb';ctx.textAlign='center';ctx.font='bold 11px Georgia';ctx.fillText('SANTUÁRIO',x,y-141);
 ctx.restore();
}
// V6.4.15: arquitetura exclusiva do santuário, com detalhes leves para celulares.
function sanctuaryArchitecture(t){
 const X=x=>x-cam.x,Y=y=>y-cam.y;
 ctx.save();
 // Fachada gótica ao fundo: volumes, contrafortes e vitral central.
 ctx.fillStyle='#161722';ctx.fillRect(X(305),Y(132),440,235);
 ctx.fillStyle='#373044';ctx.fillRect(X(320),Y(154),410,194);
 for(const bx of [324,408,642,720]){
  ctx.fillStyle='#1d1b2b';ctx.fillRect(X(bx-12),Y(142),24,235);
  ctx.fillStyle='#55425c';ctx.fillRect(X(bx-9),Y(155),7,194);
  ctx.fillStyle='#181522';ctx.beginPath();ctx.moveTo(X(bx-23),Y(151));ctx.lineTo(X(bx),Y(104));ctx.lineTo(X(bx+23),Y(151));ctx.fill();
 }
 ctx.fillStyle='#21192e';ctx.beginPath();ctx.moveTo(X(445),Y(182));ctx.lineTo(X(525),Y(95));ctx.lineTo(X(605),Y(182));ctx.closePath();ctx.fill();
 // Vitral em ogiva: poucas formas para reduzir custo de renderização.
 ctx.fillStyle='#100f1c';ctx.beginPath();ctx.moveTo(X(494),Y(220));ctx.lineTo(X(494),Y(177));ctx.quadraticCurveTo(X(525),Y(120),X(556),Y(177));ctx.lineTo(X(556),Y(220));ctx.closePath();ctx.fill();
 ctx.fillStyle='#8554b5';ctx.beginPath();ctx.moveTo(X(501),Y(211));ctx.lineTo(X(501),Y(180));ctx.quadraticCurveTo(X(525),Y(139),X(549),Y(180));ctx.lineTo(X(549),Y(211));ctx.closePath();ctx.fill();
 ctx.strokeStyle='#d5a6e4';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(X(525),Y(153));ctx.lineTo(X(525),Y(213));ctx.moveTo(X(500),Y(187));ctx.lineTo(X(550),Y(187));ctx.stroke();
 // Lajes descontínuas na rota central; caminho livre para o jogador.
 for(let i=0;i<9;i++){
  const yy=565+i*37,ww=55+i*3;
  ctx.fillStyle=i%2?'#63546b':'#51465c';
  ctx.beginPath();ctx.moveTo(X(525-ww),Y(yy));ctx.lineTo(X(525+ww-5),Y(yy-2));ctx.lineTo(X(525+ww),Y(yy+14));ctx.lineTo(X(525-ww+7),Y(yy+15));ctx.closePath();ctx.fill();
 }
 // Castiçais laterais e cristais baixos, fora da rota de passagem.
 for(const side of [-1,1])for(let i=0;i<3;i++){
  const bx=525+side*(160+i*20),by=560+i*105;
  ctx.fillStyle='#201927';ctx.fillRect(X(bx-7),Y(by-35),14,43);
  ctx.fillStyle='#a37ca9';ctx.fillRect(X(bx-10),Y(by-40),20,7);
  ctx.fillStyle='#d8a0ee';ctx.beginPath();ctx.moveTo(X(bx),Y(by-57));ctx.quadraticCurveTo(X(bx+8),Y(by-45),X(bx),Y(by-39));ctx.quadraticCurveTo(X(bx-8),Y(by-45),X(bx),Y(by-57));ctx.fill();
 }
 // Título fixo no piso superior, sem sobreposição ao personagem.
 ctx.fillStyle='#e1c1eb';ctx.font='bold 15px Georgia';ctx.textAlign='center';
 // O titulo anterior ficava atras do capuz; agora integra a interface do mapa.
 // Sem texto sobreposto a escultura.
 ctx.restore();
}
// V6.4.25: enquadramento arquitetonico da Ravena, sem particulas novas.
function sanctuaryGothicFrame(){
 const X=v=>v-cam.x,Y=v=>v-cam.y;
 ctx.save();
 // Duas colunas com faces iluminadas e bases ancoradas ao piso.
 for(const side of [-1,1]){
  const cx=525+side*185;
  ctx.fillStyle='rgba(6,5,12,.40)';ctx.beginPath();ctx.ellipse(X(cx),Y(375),36,12,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#181522';ctx.fillRect(X(cx-23),Y(184),46,185);
  ctx.fillStyle='#44364f';ctx.fillRect(X(cx-17),Y(188),30,173);
  ctx.fillStyle='#70547c';ctx.fillRect(X(cx-15),Y(192),5,160);
  ctx.fillStyle='#211b2b';ctx.fillRect(X(cx-31),Y(355),62,17);
  ctx.fillStyle='#6c5277';ctx.fillRect(X(cx-30),Y(352),60,5);
  ctx.fillStyle='#201a2a';ctx.fillRect(X(cx-27),Y(178),54,13);
  ctx.fillStyle='#745b82';ctx.fillRect(X(cx-25),Y(177),50,4);
  // Capitel triangular, sem novas fontes de luz.
  ctx.fillStyle='#292033';ctx.beginPath();ctx.moveTo(X(cx-30),Y(177));ctx.lineTo(X(cx),Y(132));ctx.lineTo(X(cx+30),Y(177));ctx.closePath();ctx.fill();
  ctx.strokeStyle='#77598a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X(cx-20),Y(174));ctx.lineTo(X(cx),Y(144));ctx.lineTo(X(cx+20),Y(174));ctx.stroke();
 }
 // Rosacea discreta atras da escultura: arco ogival e lancetas.
 ctx.fillStyle='#12101e';ctx.beginPath();ctx.moveTo(X(455),Y(314));ctx.lineTo(X(455),Y(195));ctx.quadraticCurveTo(X(525),Y(93),X(595),Y(195));ctx.lineTo(X(595),Y(314));ctx.closePath();ctx.fill();
 ctx.fillStyle='#39294e';ctx.beginPath();ctx.moveTo(X(466),Y(304));ctx.lineTo(X(466),Y(199));ctx.quadraticCurveTo(X(525),Y(117),X(584),Y(199));ctx.lineTo(X(584),Y(304));ctx.closePath();ctx.fill();
 ctx.strokeStyle='#9b78b6';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(X(455),Y(314));ctx.lineTo(X(455),Y(195));ctx.quadraticCurveTo(X(525),Y(93),X(595),Y(195));ctx.lineTo(X(595),Y(314));ctx.stroke();
 ctx.strokeStyle='rgba(207,161,232,.55)';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(X(525),Y(153));ctx.lineTo(X(525),Y(301));ctx.moveTo(X(469),Y(227));ctx.lineTo(X(581),Y(227));ctx.moveTo(X(486),Y(185));ctx.lineTo(X(525),Y(227));ctx.lineTo(X(564),Y(185));ctx.stroke();
 // Faixa de sombra atras da base da estatua, preservando contraste.
 ctx.fillStyle='rgba(8,7,15,.25)';ctx.fillRect(X(409),Y(353),232,18);
 ctx.restore();
}
// V6.4.26: moldura discreta e contraste, atras da escultura.
// Nao adiciona particulas nem cria objetos persistentes por quadro.
function sanctuaryAltarComposition(){
 const X=v=>v-cam.x,Y=v=>v-cam.y;
 ctx.save();
 // Uma sombra central unifica o vitral e separa a silhueta da Ravena.
 ctx.fillStyle='rgba(7,6,15,.48)';
 ctx.beginPath();ctx.moveTo(X(432),Y(338));ctx.lineTo(X(450),Y(240));
 ctx.quadraticCurveTo(X(525),Y(157),X(600),Y(240));
 ctx.lineTo(X(618),Y(338));ctx.closePath();ctx.fill();
 // Pequenos filetes laterais, evitando uma segunda moldura sobre a estatua.
 for(const side of [-1,1]){
  const xx=525+side*137;
  ctx.strokeStyle='rgba(159,116,183,.55)';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(X(xx),Y(250));ctx.lineTo(X(xx),Y(348));ctx.stroke();
  ctx.fillStyle='#6c537c';ctx.beginPath();ctx.moveTo(X(xx),Y(237));
  ctx.lineTo(X(xx+side*7),Y(250));ctx.lineTo(X(xx),Y(260));
  ctx.lineTo(X(xx-side*7),Y(250));ctx.closePath();ctx.fill();
 }
 // Sombra sob o pedestal: profundidade sem mais objetos no piso.
 ctx.fillStyle='rgba(5,4,11,.46)';ctx.beginPath();
 ctx.ellipse(X(525),Y(536),145,23,0,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
// V6.4.18: detalhes cerimoniais baratos, desenhados apenas no mapa separado.
function sanctuaryCeremonialFinish(t){
 const X=v=>v-cam.x,Y=v=>v-cam.y;
 ctx.save();
 // Piso com juntas de pedra em perspectiva, restrito a uma area pequena.
 ctx.beginPath();ctx.ellipse(X(525),Y(535),303,233,0,0,Math.PI*2);ctx.clip();
 ctx.strokeStyle='rgba(189,158,196,.15)';ctx.lineWidth=2;
 for(let i=0;i<6;i++){
  const yy=Y(365+i*63);ctx.beginPath();ctx.moveTo(X(205),yy);ctx.lineTo(X(845),yy);ctx.stroke();
 }
 for(let row=0;row<5;row++)for(let j=0;j<6;j++){
  const yy=385+row*63,xx=235+j*110+(row%2)*55;
  ctx.beginPath();ctx.moveTo(X(xx),Y(yy));ctx.lineTo(X(xx),Y(yy+42));ctx.stroke();
 }
 ctx.restore();ctx.save();
 // Degraus de pedra sob a estatua, mantendo livre o acesso pela frente.
 for(let i=0;i<3;i++){
  const yy=505+i*15,ww=105+i*19;
  ctx.fillStyle=['#41334b','#52405a','#67516b'][i];
  ctx.beginPath();ctx.moveTo(X(525-ww),Y(yy));ctx.lineTo(X(525+ww),Y(yy));ctx.lineTo(X(525+ww+8),Y(yy+12));ctx.lineTo(X(525-ww-8),Y(yy+12));ctx.closePath();ctx.fill();
 }
 // Inscricoes geometricas no piso: estaticas, sem particulas extras.
 ctx.strokeStyle='rgba(189,122,226,.45)';ctx.lineWidth=2;
 for(const side of [-1,1]){
  const xx=525+side*208,yy=475;
  ctx.beginPath();ctx.moveTo(X(xx),Y(yy-22));ctx.lineTo(X(xx+18),Y(yy));ctx.lineTo(X(xx),Y(yy+22));ctx.lineTo(X(xx-18),Y(yy));ctx.closePath();ctx.stroke();
  ctx.fillStyle='#302139';ctx.fillRect(X(xx-15),Y(yy+65),30,12);
  ctx.fillStyle='#6d4c80';ctx.fillRect(X(xx-11),Y(yy+48),22,20);
  ctx.fillStyle='#b88ad7';ctx.beginPath();ctx.moveTo(X(xx),Y(yy+31));ctx.lineTo(X(xx+10),Y(yy+48));ctx.lineTo(X(xx),Y(yy+54));ctx.lineTo(X(xx-10),Y(yy+48));ctx.closePath();ctx.fill();
 }
 // Pequeno brilho do vitral sobre a pedra, sem gradientes adicionais.
 ctx.fillStyle='rgba(137,86,180,.09)';ctx.beginPath();ctx.moveTo(X(525),Y(225));ctx.lineTo(X(445),Y(425));ctx.lineTo(X(605),Y(425));ctx.closePath();ctx.fill();
 ctx.restore();
}
// V6.4.18: paredes laterais e arcos com volume, sem particulas ou sombras animadas.
function sanctuaryWallDepth(){
 const X=v=>v-cam.x,Y=v=>v-cam.y;
 ctx.save();
 // Paredes inclinadas criam uma sala, em vez de um altar solto no terreno.
 for(const side of [-1,1]){
  const inner=525+side*250,outer=525+side*370;
  ctx.fillStyle='#171723';ctx.beginPath();ctx.moveTo(X(inner),Y(180));ctx.lineTo(X(outer),Y(265));ctx.lineTo(X(outer),Y(680));ctx.lineTo(X(inner),Y(570));ctx.closePath();ctx.fill();
  ctx.fillStyle='#302b3b';ctx.beginPath();ctx.moveTo(X(inner+side*9),Y(190));ctx.lineTo(X(outer-side*11),Y(275));ctx.lineTo(X(outer-side*11),Y(650));ctx.lineTo(X(inner+side*9),Y(550));ctx.closePath();ctx.fill();
  ctx.strokeStyle='#51415d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(X(inner+side*9),Y(190));ctx.lineTo(X(inner+side*9),Y(550));ctx.stroke();
  // Arcos rebaixados e nichos na alvenaria, com rebaixo escuro.
  for(let i=0;i<2;i++){
   const xx=525+side*(288+i*46),yy=302+i*85;
   ctx.fillStyle='#16131f';ctx.beginPath();ctx.moveTo(X(xx-18),Y(yy+88));ctx.lineTo(X(xx-18),Y(yy+20));ctx.quadraticCurveTo(X(xx),Y(yy-17),X(xx+18),Y(yy+20));ctx.lineTo(X(xx+18),Y(yy+88));ctx.closePath();ctx.fill();
   ctx.strokeStyle='#63516c';ctx.lineWidth=4;ctx.stroke();
   ctx.fillStyle='#4c385d';ctx.fillRect(X(xx-4),Y(yy+40),8,31);
  }
  // Base macica e rodape conectam parede ao piso.
  ctx.strokeStyle='#55465c';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(X(inner),Y(570));ctx.lineTo(X(outer),Y(680));ctx.stroke();
 }
 // Sombra curta de contato na parede do fundo, abaixo do vitral.
 ctx.fillStyle='rgba(8,7,15,.38)';ctx.fillRect(X(310),Y(345),430,18);
 ctx.restore();
}
// V6.4.19: entrada interna e foco no altar, sem particulas ou animacoes adicionais.
function sanctuaryEntranceAndFocus(){
 const X=v=>v-cam.x,Y=v=>v-cam.y;
 ctx.save();
 // V6.4.21: portal de retorno discreto, sem arco gigante cobrindo o caminho.
 // O portal interativo continua na mesma coordenada; esta e so a moldura visual.
 const ex=525,ey=840;
 ctx.strokeStyle='#765783';ctx.lineWidth=5;ctx.beginPath();
 ctx.moveTo(X(ex-72),Y(ey+5));ctx.lineTo(X(ex-72),Y(ey-42));
 ctx.quadraticCurveTo(X(ex),Y(ey-101),X(ex+72),Y(ey-42));
 ctx.lineTo(X(ex+72),Y(ey+5));ctx.stroke();
 ctx.strokeStyle='#c49bd0';ctx.lineWidth=1.5;ctx.beginPath();
 ctx.moveTo(X(ex-62),Y(ey-4));ctx.lineTo(X(ex-62),Y(ey-38));
 ctx.quadraticCurveTo(X(ex),Y(ey-88),X(ex+62),Y(ey-38));
 ctx.lineTo(X(ex+62),Y(ey-4));ctx.stroke();
 // Luz violeta concentrada no altar, com gradiente estatico e sem criar objetos extras.
 const cx=X(525),cy=Y(445);
 const light=ctx.createRadialGradient(cx,cy,12,cx,cy,190);
 light.addColorStop(0,'rgba(174,105,217,.20)');
 light.addColorStop(.45,'rgba(128,76,166,.09)');
 light.addColorStop(1,'rgba(128,76,166,0)');
 ctx.fillStyle=light;ctx.beginPath();ctx.arc(cx,cy,190,0,Math.PI*2);ctx.fill();
 // Sombra nas bordas do caminho, deixando o centro legivel para a movimentacao.
 ctx.strokeStyle='rgba(13,10,22,.36)';ctx.lineWidth=10;
 for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(X(525+side*90),Y(590));ctx.lineTo(X(525+side*126),Y(790));ctx.stroke();}
 ctx.restore();
}
// V6.4.32: arandelas fixas nas colunas; sem animação e sem custo de partículas.
function sanctuaryStaticSconces(){
 const X=v=>v-cam.x,Y=v=>v-cam.y;
 ctx.save();
 for(const side of [-1,1]){
  const bx=525+side*205,by=325;
  const light=ctx.createRadialGradient(X(bx),Y(by),3,X(bx),Y(by),75);
  light.addColorStop(0,'rgba(185,105,233,.22)');light.addColorStop(1,'rgba(185,105,233,0)');
  ctx.fillStyle=light;ctx.fillRect(X(bx-75),Y(by-75),150,150);
  ctx.fillStyle='#17111e';ctx.fillRect(X(bx-9),Y(by+7),18,18);
  ctx.fillStyle='#7a568c';ctx.fillRect(X(bx-11),Y(by+3),22,6);
  ctx.fillStyle='#a66cc6';ctx.beginPath();ctx.moveTo(X(bx),Y(by-22));ctx.lineTo(X(bx+9),Y(by-4));ctx.lineTo(X(bx),Y(by+4));ctx.lineTo(X(bx-9),Y(by-4));ctx.closePath();ctx.fill();
  ctx.fillStyle='#eed3fa';ctx.beginPath();ctx.moveTo(X(bx),Y(by-13));ctx.lineTo(X(bx+3),Y(by-4));ctx.lineTo(X(bx),Y(by));ctx.closePath();ctx.fill();
 }
 ctx.restore();
}
// V6.4.57 — detalhes permanentes do santuario, sem particulas ou texturas extras.
// Desenhados sob a escultura para respeitar sua silhueta e o espaco de circulacao.
function sanctuaryQuietAccents(){
 const X=v=>v-cam.x,Y=v=>v-cam.y;
 const visible=(wx,wy,pad=90)=>wx-cam.x>-pad&&wx-cam.x<W+pad&&wy-cam.y>-pad&&wy-cam.y<H+pad;
 ctx.save();
 // Filetes de metal oxidado ao lado do corredor: marcas no piso, nao obstaculos.
 for(const side of [-1,1]){
  const xx=525+side*155;
  if(visible(xx,675,225)){
   ctx.strokeStyle='#79617d';ctx.lineWidth=3;ctx.beginPath();
   ctx.moveTo(X(xx),Y(562));ctx.lineTo(X(xx+side*36),Y(787));ctx.stroke();
   ctx.strokeStyle='rgba(201,151,194,.30)';ctx.lineWidth=1.5;ctx.beginPath();
   ctx.moveTo(X(xx-side*5),Y(562));ctx.lineTo(X(xx+side*31),Y(787));ctx.stroke();
   // Selos gravados no chao, baixos e totalmente transitaveis.
   for(let i=0;i<3;i++){
    const cx=xx+side*(6+i*10),cy=610+i*73;
    ctx.strokeStyle='rgba(195,148,201,.35)';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(X(cx),Y(cy-11));ctx.lineTo(X(cx+11),Y(cy));
    ctx.lineTo(X(cx),Y(cy+11));ctx.lineTo(X(cx-11),Y(cy));ctx.closePath();ctx.stroke();
    ctx.fillStyle='#775585';ctx.fillRect(X(cx-2),Y(cy-2),4,4);
   }
  }
  // Bandeiras de tecido preso nas paredes, simetricas e fora da rota central.
  const bx=525+side*238,by=320;
  if(visible(bx,by,155)){
   ctx.strokeStyle='#a7848e';ctx.lineWidth=5;ctx.beginPath();
   ctx.moveTo(X(bx-22),Y(by-78));ctx.lineTo(X(bx+22),Y(by-78));ctx.stroke();
   ctx.fillStyle='#39243f';ctx.beginPath();ctx.moveTo(X(bx-17),Y(by-72));
   ctx.lineTo(X(bx+17),Y(by-72));ctx.lineTo(X(bx+17),Y(by+41));
   ctx.lineTo(X(bx),Y(by+61));ctx.lineTo(X(bx-17),Y(by+41));ctx.closePath();ctx.fill();
   ctx.strokeStyle='#946a87';ctx.lineWidth=2;ctx.stroke();
   ctx.fillStyle='#b995ad';ctx.beginPath();ctx.moveTo(X(bx),Y(by-29));
   ctx.lineTo(X(bx+9),Y(by-16));ctx.lineTo(X(bx),Y(by-3));
   ctx.lineTo(X(bx-9),Y(by-16));ctx.closePath();ctx.fill();
   ctx.strokeStyle='#ab819b';ctx.lineWidth=1.3;ctx.beginPath();
   ctx.moveTo(X(bx),Y(by+3));ctx.lineTo(X(bx),Y(by+31));ctx.stroke();
  }
  // Pequenas flores nas frestas da muralha, nao no corredor de movimento.
  const fx=525+side*325,fy=724;
  if(visible(fx,fy,55)){
   ctx.fillStyle='#191b26';ctx.beginPath();ctx.ellipse(X(fx),Y(fy+4),26,8,0,0,Math.PI*2);ctx.fill();
   for(let j=0;j<5;j++){
    const dx=(j-2)*8;
    ctx.strokeStyle='#49655c';ctx.lineWidth=2;ctx.beginPath();
    ctx.moveTo(X(fx+dx),Y(fy));ctx.lineTo(X(fx+dx*1.3),Y(fy-12-j%3*5));ctx.stroke();
    if(j%2===0){ctx.fillStyle='#ae799e';ctx.beginPath();
     ctx.arc(X(fx+dx*1.3),Y(fy-12-j%3*5),3.5,0,Math.PI*2);ctx.fill();}
   }
  }
 }
 // Gravuras discretas na entrada do templo, sem sobrepor a area de interacao.
 if(visible(525,825,190)){
  for(const side of [-1,1]){
   const x=525+side*113;
   ctx.strokeStyle='#8e6b89';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(X(x),Y(794));ctx.lineTo(X(x),Y(870));ctx.stroke();
   ctx.fillStyle='#6e4e7b';ctx.fillRect(X(x-5),Y(794),10,7);
  }
 }
 ctx.restore();
}
function drawSeparateSanctuary(t){
 ctx.save();ctx.fillStyle='#101321';ctx.fillRect(0,0,W,H);
 const x=525-cam.x,y=390-cam.y;
 let g=ctx.createRadialGradient(x,y,30,x,y,610);g.addColorStop(0,'#302341');g.addColorStop(.6,'#1a2230');g.addColorStop(1,'#101921');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // Construção gótica em camadas, com paredes de pedra e corredores largos.
 ctx.fillStyle='#272332';ctx.beginPath();
 const floorPts=[[-290,-82],[-235,-172],[235,-172],[290,-82],[330,100],[290,288],[-290,288],[-330,100]];
 floorPts.forEach(([dx,dy],i)=>i?ctx.lineTo(x+dx,y+145+dy):ctx.moveTo(x+dx,y+145+dy));ctx.closePath();ctx.fill();
 ctx.strokeStyle='#6c536e';ctx.lineWidth=8;ctx.stroke();
 // Sem segundo anel claro no piso: menos ruido visual.
 // Caminho entre o portal e o altar.
 ctx.fillStyle='#4b4053';ctx.beginPath();ctx.moveTo(x-67,y+175);ctx.lineTo(x+67,y+175);ctx.lineTo(525-cam.x+115,920-cam.y);ctx.lineTo(525-cam.x-115,920-cam.y);ctx.fill();
 // Caminho limpo: juntas ja desenhadas por sanctuaryCeremonialFinish.
 for(const side of [-1,1]){
  const px=525+side*285-cam.x;
  ctx.fillStyle='#151520';ctx.fillRect(px-25,220-cam.y,50,320);
  ctx.fillStyle='#4b4059';ctx.fillRect(px-21,230-cam.y,42,255);
  ctx.fillStyle='#302438';ctx.beginPath();ctx.moveTo(px-42,230-cam.y);ctx.lineTo(px,150-cam.y);ctx.lineTo(px+42,230-cam.y);ctx.fill();
  glow(px,440-cam.y,90,'#a364d04a');ctx.fillStyle='#c998e2';ctx.fillRect(px-8,418-cam.y,16,28);
  for(let i=0;i<2;i++){const bx=525+side*(350+i*50)-cam.x,by=240+i*135-cam.y;ctx.fillStyle='#13252a';ctx.beginPath();ctx.arc(bx,by,35+i%2*8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#4e3b60';ctx.fillRect(bx-4,by,8,46)}
 }
 sanctuaryWallDepth();
 // V6.4.29: juntas curtas e contidas para sugerir blocos em profundidade.
 ctx.save();ctx.strokeStyle='rgba(174,135,184,.16)';ctx.lineWidth=2;
 for(const side of [-1,1]){
  const wx=525+side*258-cam.x;
  for(let j=0;j<5;j++){
   const wy=255+j*51-cam.y;
   ctx.beginPath();ctx.moveTo(wx-side*32,wy);ctx.lineTo(wx+side*18,wy);ctx.stroke();
  }
 }
 ctx.restore();
 sanctuaryArchitecture(t);
 sanctuaryQuietAccents();
 // V6.4.31: alvenaria em camadas nas laterais, sem particulas ou animacoes.
 ctx.save();
 for(const side of [-1,1]){
  const edge=525+side*248-cam.x;
  ctx.strokeStyle='#796481';ctx.lineWidth=5;ctx.beginPath();
  ctx.moveTo(edge,215-cam.y);ctx.lineTo(edge+side*65,260-cam.y);
  ctx.lineTo(edge+side*65,500-cam.y);ctx.stroke();
  ctx.strokeStyle='rgba(10,8,18,.50)';ctx.lineWidth=12;ctx.beginPath();
  ctx.moveTo(edge+side*65,510-cam.y);ctx.lineTo(edge+side*105,558-cam.y);ctx.stroke();
 }
 ctx.restore();
 sanctuaryGothicFrame();
 sanctuaryAltarComposition();
 sanctuaryStaticSconces();
 sanctuaryCeremonialFinish(t);
 sanctuaryEntranceAndFocus();
 // Reaproveita a estátua existente, mas somente dentro do mapa do santuário.
 glow(525-cam.x,410-cam.y,165,'#7331a622');
 drawRavenaSculpture(t);
 const exitY=840-cam.y;ctx.fillStyle='rgba(69,43,82,.55)';ctx.beginPath();ctx.ellipse(525-cam.x,exitY,65,16,0,0,Math.PI*2);ctx.fill();
 // A identificacao do portal fica no botao contextual, sem texto sob os controles.
 ctx.restore();drawMini();
}

function drawSanctuaryTrail(){
 // Accessible stone path from the southern village to the secluded western grove.
 const points=[[1010,1490],[820,1490],[660,1465],[520,1450],[425,1450]];
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x-cam.x,y-cam.y):ctx.moveTo(x-cam.x,y-cam.y));
 ctx.strokeStyle='#272b32';ctx.lineWidth=94;ctx.stroke();ctx.strokeStyle='#514554';ctx.lineWidth=77;ctx.stroke();
 ctx.strokeStyle='#8e7891';ctx.lineWidth=2;ctx.setLineDash([10,20]);ctx.stroke();ctx.setLineDash([]);
 for(let i=0;i<27;i++){let x=425+i*21,y=1450+(i>5?Math.min(40,(i-5)*2):0);ctx.fillStyle=i%2?'#6e5c70':'#766577';ctx.beginPath();ctx.ellipse(x-cam.x,y-cam.y,8,4,0,0,Math.PI*2);ctx.fill()}
 ctx.restore();
}
function drawSanctuary(t){
 const a=world.altar,x=a.x+a.w/2-cam.x,y=a.y+10-cam.y;
 if(x<-270||x>W+270||y<-330||y>H+230)return;
 // Forest clearing, stone approach and a separate shrine away from fishing waters.
 ctx.save();
 ctx.fillStyle='#182c2b';ctx.beginPath();ctx.ellipse(x,y+95,235,145,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#5b4c65';ctx.lineWidth=9;ctx.beginPath();ctx.ellipse(x,y+95,215,128,0,0,Math.PI*2);ctx.stroke();
 for(let i=0;i<10;i++){let px=x-110+i*24,py=y+120+(i%2)*5;ctx.fillStyle=i%2?'#59485c':'#4b4258';ctx.beginPath();ctx.ellipse(px,py,13,7,0,0,Math.PI*2);ctx.fill()}
 for(const side of [-1,1]){
  const lx=a.x+a.w/2+side*177,ly=a.y+115;
  lantern(lx,ly);
  for(let j=0;j<3;j++){ctx.fillStyle='#ac68c5';ctx.beginPath();ctx.arc(x+side*(110+j*28),y+45+j*13,2.5,0,Math.PI*2);ctx.fill()}
 }
 ctx.fillStyle='#e1b8f0';ctx.font='bold 15px Georgia';ctx.textAlign='center';ctx.fillText('SANTUÁRIO DA RAVENA',x,y+178);
 ctx.restore();
 drawStatue(t);
}

// V6.4.7 — acesso arquitetônico integrado ao terreno, sem alterar colisões.
function azarathBuildingApproaches(){
 if(scene!=='lake')return;
 for(const [b,seed] of [[world.shop,2],[world.market,5]]){
  const cx=b.x+b.w/2-cam.x, front=b.y+b.h-cam.y;
  if(cx<-220||cx>W+220||front<-180||front>H+230)continue;
  ctx.save();
  // Sombra suave de contato, calçada e caminho até a entrada.
  ctx.fillStyle='#070a13a0';ctx.beginPath();ctx.ellipse(cx,front+10,b.w*.60,25,0,0,Math.PI*2);ctx.fill();
  const p=ctx.createLinearGradient(0,front,0,front+105);
  p.addColorStop(0,'#66535c');p.addColorStop(1,'#3a3744');
  ctx.fillStyle=p;ctx.beginPath();ctx.moveTo(cx-57,front-2);ctx.lineTo(cx+57,front-2);ctx.lineTo(cx+82,front+102);ctx.lineTo(cx-82,front+102);ctx.closePath();ctx.fill();
  ctx.save();ctx.beginPath();ctx.moveTo(cx-57,front-2);ctx.lineTo(cx+57,front-2);ctx.lineTo(cx+82,front+102);ctx.lineTo(cx-82,front+102);ctx.closePath();ctx.clip();
  for(let row=0;row<5;row++)for(let col=-3;col<=3;col++){
   const yy=front+row*22+7,xx=cx+col*26+(row%2)*13;
   ctx.fillStyle=(row+col+seed)%3===0?'#776371':'#574e5e';
   ctx.beginPath();ctx.moveTo(xx-11,yy-7);ctx.lineTo(xx+10,yy-8);ctx.lineTo(xx+12,yy+7);ctx.lineTo(xx-12,yy+8);ctx.closePath();ctx.fill();
  }
  ctx.restore();
  // Postes à altura da entrada; nenhum deles bloqueia o trajeto central.
  for(const side of [-1,1]){
   const px=cx+side*75,py=front+69;
   ctx.fillStyle='#100e1c';ctx.fillRect(px-3,py-30,6,32);
   glow(px,py-30,39,'#f2b16b3b');
   ctx.fillStyle='#d39a5d';ctx.fillRect(px-7,py-39,14,13);
   ctx.fillStyle='#ffe3a0';ctx.fillRect(px-3,py-36,6,7);
  }
  ctx.restore();
 }
}

// V6.4.9: small street furnishings are kept outside building collision footprints.
function azarathStreetIdentity(t){
 const lights=[[1800,630],[2115,630],[1745,1000],[2145,1260],[1535,1390],[610,1390]];
 for(const [wx,wy] of lights){
  const x=wx-cam.x,y=wy-cam.y;if(x<-85||x>W+85||y<-100||y>H+85)continue;
  ctx.fillStyle='#060a13a0';ctx.beginPath();ctx.ellipse(x+8,y+5,24,8,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3d3040';ctx.fillRect(x-4,y-52,8,53);
  ctx.fillStyle='#ad8293';ctx.fillRect(x-7,y-56,14,5);
  glow(x,y-65,38,'#ffb95a40');
  ctx.fillStyle='#382b37';ctx.fillRect(x-11,y-82,22,27);
  ctx.fillStyle='#ffc97b';ctx.fillRect(x-7,y-77,14,17);
  ctx.strokeStyle='#e3b88a';ctx.lineWidth=2;ctx.strokeRect(x-11,y-82,22,27);
  ctx.fillStyle='#3a2a38';ctx.beginPath();ctx.moveTo(x-15,y-83);ctx.lineTo(x,y-95);ctx.lineTo(x+15,y-83);ctx.fill();
 }
 // Roadside markers: they communicate destinations rather than filling the map.
 for(const [wx,wy,name] of [[1770,795,'LOJA'],[1790,1330,'MERCADO'],[590,1250,'BOSQUE']]){
  const x=wx-cam.x,y=wy-cam.y;if(x<-110||x>W+110||y<-90||y>H+90)continue;
  ctx.fillStyle='#352733';ctx.fillRect(x-3,y-35,6,38);
  ctx.fillStyle='#6e4a54';ctx.fillRect(x-35,y-51,70,22);
  ctx.strokeStyle='#ba8d7b';ctx.lineWidth=2;ctx.strokeRect(x-35,y-51,70,22);
  ctx.fillStyle='#ffe1aa';ctx.textAlign='center';ctx.font='bold 10px Georgia';ctx.fillText(name,x,y-36);
 }
}
function building(b,label,icon,col){
 // V6.4.1: a fachada é vertical, a cobertura tem planos laterais e o piso permanece na pegada física original.
 const x=b.x-cam.x,y=b.y-cam.y,w=b.w,h=b.h;
 if(x>W+110||x+w<-110||y>H+155||y+h<-110)return;
 const market=label.includes('MERCADO'), depth=32, roofHeight=75;
 ctx.save();
 // Terreno de contato: irregular stone edging ties the footprint to the surrounding ground.
 ctx.fillStyle='#1a2428';ctx.beginPath();ctx.ellipse(x+w*.5,y+h+10,w*.65,31,0,0,Math.PI*2);ctx.fill();
 for(let i=0;i<15;i++){
  const a=i*2.39996,px=x+w*.5+Math.cos(a)*w*.58,py=y+h+10+Math.sin(a)*22;
  ctx.fillStyle=i%3===0?'#514b53':'#3d4248';ctx.beginPath();ctx.ellipse(px,py,9+i%3*3,4+i%2*2,a*.15,0,Math.PI*2);ctx.fill();
 }
 // Sombras projetadas no solo: a construção não é um decalque sobre o terreno.
 ctx.fillStyle='#05071099';ctx.beginPath();ctx.ellipse(x+w*.57,y+h+14,w*.65,27,-.06,0,Math.PI*2);ctx.fill();
 // Alicerce de pedras e paredes de madeira com lateral sombreada.
 ctx.fillStyle='#24202d';ctx.fillRect(x-6,y+20,w+12,h-12);
 ctx.fillStyle='#181320';ctx.beginPath();ctx.moveTo(x+w,y+20);ctx.lineTo(x+w+depth,y+4);ctx.lineTo(x+w+depth,y+h-19);ctx.lineTo(x+w,y+h+4);ctx.closePath();ctx.fill();
 for(let i=0;i<Math.ceil(w/23);i++){
  ctx.fillStyle=i%2?'#584252':'#624a5a';ctx.fillRect(x+i*23,y+24,21,h-40);
  ctx.fillStyle='#b68d9950';ctx.fillRect(x+i*23+2,y+28,2,h-47);
 }
 ctx.fillStyle='#302737';ctx.fillRect(x-8,y+h-18,w+16,22);
 for(let i=0;i<Math.ceil(w/27);i++){
  ctx.fillStyle=i%2?'#716078':'#53475d';ctx.fillRect(x-5+i*27,y+h-15,25,12);
 }
 // Beiral, águas do telhado e empena triangular com volume.
 ctx.fillStyle='#110d1c';ctx.beginPath();ctx.moveTo(x+w/2+6,y-roofHeight-13);ctx.lineTo(x+w/2+depth+5,y-roofHeight-29);ctx.lineTo(x+w+depth+23,y+10);ctx.lineTo(x+w+17,y+30);ctx.closePath();ctx.fill();
 ctx.fillStyle='#34263e';ctx.beginPath();ctx.moveTo(x+w/2,y-roofHeight);ctx.lineTo(x+w/2+depth,y-roofHeight-17);ctx.lineTo(x+w+depth+20,y+8);ctx.lineTo(x+w+17,y+25);ctx.closePath();ctx.fill();
 ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x-25,y+25);ctx.lineTo(x+w/2,y-roofHeight);ctx.lineTo(x+w+18,y+25);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#d09abb';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-25,y+25);ctx.lineTo(x+w/2,y-roofHeight);ctx.lineTo(x+w+18,y+25);ctx.stroke();
 // Fileiras de telhas acompanham a inclinação do telhado.
 for(let row=0;row<5;row++){
  const t=(row+1)/6,yy=y-roofHeight+t*(roofHeight+23),half=t*(w*.5+20);
  for(let k=-5;k<=5;k++){
   const xx=x+w/2+k*half/5;
   if(Math.abs(k)>5)continue;
   ctx.strokeStyle=(k+row)%2?'#c18ba35c':'#1d142d88';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(xx-9,yy-3);ctx.lineTo(xx+7,yy-3);ctx.stroke();
  }
 }
 // Vigas, porta rebaixada e degrau de acesso.
 ctx.fillStyle='#2a1b28';ctx.fillRect(x+10,y+26,10,h-42);ctx.fillRect(x+w-20,y+26,10,h-42);
 ctx.fillStyle='#100d1a';ctx.fillRect(x+w/2-29,y+h-85,58,70);
 ctx.strokeStyle='#c79b70';ctx.lineWidth=4;ctx.strokeRect(x+w/2-29,y+h-85,58,70);
 ctx.fillStyle='#f7cb92';ctx.beginPath();ctx.arc(x+w/2+18,y+h-49,3,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#67505c';ctx.fillRect(x+w/2-39,y+h-14,78,10);
 // Vitrais com arco pontudo, travessas e iluminação.
 for(const wx of [x+37,x+w-37]){
  const wy=y+78;glow(wx,wy,47,'#ffb05c38');
  ctx.fillStyle='#211627';ctx.beginPath();ctx.moveTo(wx-15,wy-13);ctx.lineTo(wx,wy-36);ctx.lineTo(wx+15,wy-13);ctx.lineTo(wx+15,wy+20);ctx.lineTo(wx-15,wy+20);ctx.closePath();ctx.fill();
  ctx.fillStyle='#efb76e';ctx.fillRect(wx-10,wy-12,20,28);
  ctx.strokeStyle='#58354f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(wx,wy-12);ctx.lineTo(wx,wy+16);ctx.moveTo(wx-10,wy+3);ctx.lineTo(wx+10,wy+3);ctx.stroke();
 }
 // Lateral com janelas oblíquas, sem uma segunda fachada desenhada por cima.
 for(let i=0;i<2;i++){
  const yy=y+58+i*47;ctx.fillStyle='#e6a66c';ctx.beginPath();ctx.moveTo(x+w+8,yy);ctx.lineTo(x+w+23,yy-8);ctx.lineTo(x+w+23,yy+9);ctx.lineTo(x+w+8,yy+17);ctx.closePath();ctx.fill();
 }
 // A distinct shop entrance and hanging wooden emblem help identify buildings at game scale.
 if(!market){
  ctx.fillStyle='#283c40';ctx.beginPath();ctx.moveTo(x+w/2-51,y+h-91);ctx.lineTo(x+w/2+51,y+h-91);ctx.lineTo(x+w/2+42,y+h-74);ctx.lineTo(x+w/2-42,y+h-74);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#c6a77a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+w/2-51,y+h-91);ctx.lineTo(x+w/2+51,y+h-91);ctx.stroke();
  ctx.fillStyle='#443443';ctx.fillRect(x+w-21,y+42,13,49);
  ctx.fillStyle='#745c4a';ctx.fillRect(x+w-48,y+48,42,28);
  ctx.strokeStyle='#d6b180';ctx.lineWidth=2;ctx.strokeRect(x+w-48,y+48,42,28);
  ctx.fillStyle='#f6d5a4';ctx.textAlign='center';ctx.font='20px serif';ctx.fillText('✦',x+w-27,y+70);
 }
 // Marquise de tecido e decoração específica do Mercado Noturno.
 if(market){
  ctx.fillStyle='#7e2c4f';ctx.fillRect(x+16,y+26,w-32,17);
  for(let i=0;i<7;i++){ctx.fillStyle=i%2?'#b75d76':'#d48b90';ctx.beginPath();ctx.arc(x+25+i*(w-50)/6,y+44,9,0,Math.PI);ctx.fill()}
  for(let i=0;i<5;i++){let px=x+22+i*(w-44)/4;glow(px,y+47,16,'#ff9c5c44');ctx.fillStyle='#ffc87e';ctx.beginPath();ctx.arc(px,y+47,3,0,Math.PI*2);ctx.fill()}
 }
 ctx.strokeStyle='#d6a7ca';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+w/2,y-roofHeight);ctx.lineTo(x+w/2,y-roofHeight-23);ctx.stroke();
 ctx.fillStyle='#f3c7a5';ctx.beginPath();ctx.arc(x+w/2,y-roofHeight-25,4,0,Math.PI*2);ctx.fill();
 // Saliências e elementos de escala: chaminé, calhas e apoios dos beirais.
 ctx.fillStyle='#201924';ctx.fillRect(x+w*.76,y-roofHeight*.73,19,34);
 ctx.fillStyle='#7c6176';ctx.fillRect(x+w*.76-3,y-roofHeight*.73-5,25,8);
 ctx.fillStyle='#0b0b16a6';ctx.fillRect(x+w*.76+15,y-roofHeight*.73+6,4,22);
 for(const bx of [x+13,x+w-13]){
  ctx.strokeStyle='#b18a7d';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(bx,y+29);ctx.lineTo(bx,y+48);ctx.stroke();
  ctx.fillStyle='#d8ac7d';ctx.beginPath();ctx.arc(bx,y+49,3,0,Math.PI*2);ctx.fill();
 }
 // Faixa de alicerce e pedras irregulares conectam a casa ao solo.
 for(let i=0;i<Math.ceil(w/21);i++){
  ctx.fillStyle=i%3===0?'#807081':'#5e5467';
  ctx.beginPath();ctx.moveTo(x+i*21-4,y+h-15);ctx.lineTo(x+i*21+14,y+h-16);ctx.lineTo(x+i*21+17,y+h-5);ctx.lineTo(x+i*21-3,y+h-4);ctx.closePath();ctx.fill();
 }
 // Placa suspensa sob o beiral, sem cobrir o telhado inteiro.
 ctx.fillStyle='#201627';rr(x+12,y+9,w-24,27,6);ctx.strokeStyle='#a8739c';ctx.lineWidth=1.5;ctx.strokeRect(x+12,y+9,w-24,27);
 ctx.fillStyle='#f6dfcf';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(icon+' '+label,x+w/2,y+27);
 ctx.restore();
}
function inLake(x,y){let L=world.lake,dx=(x-(L.x+L.w/2))/(L.w/2),dy=(y-(L.y+L.h/2))/(L.h/2);return dx*dx+dy*dy<1}
function inside(x,y,b,p=0){return x>b.x-p&&x<b.x+b.w+p&&y>b.y-p&&y<b.y+b.h+p}
// V6.3: colisão física com raio do personagem, margem e obstáculos do cenário.
// O mesmo catálogo de árvores é usado pelo desenho e pela física para evitar árvores fantasmas.
const sceneryTrees=Array.from({length:85},(_,i)=>({x:(i*419)%2240+30,y:(i*557)%1640+30,i})).filter(t=>
 !inLake(t.x,t.y)&&lakeEdgeFactor(t.x,t.y)>=1.16&&
 !inside(t.x,t.y,world.pier,90)&&!inside(t.x,t.y,world.shop,135)&&
 !inside(t.x,t.y,world.market,140)&&!inside(t.x,t.y,world.board,65)&&
 !inside(t.x,t.y,world.altar,255)&&Math.hypot(t.x-1110,t.y-1370)>85&&
 !(t.y>1370&&t.y<1565&&t.x>330&&t.x<1050)&&
 AZARATH_ROUTES.every(route=>distanceToRoute(t.x,t.y,route)>125)).filter((tree,index,all)=>all.findIndex(other=>Math.hypot(tree.x-other.x,tree.y-other.y)<155)===index);
const PLAYER_RADIUS=12;
function circleRect(x,y,r,b,pad=0){
 const left=b.x-pad,right=b.x+b.w+pad,top=b.y-pad,bottom=b.y+b.h+pad;
 const cx=Math.max(left,Math.min(right,x)),cy=Math.max(top,Math.min(bottom,y));
 return (x-cx)**2+(y-cy)**2<r*r;
}
function onPier(x,y,r=0){const p=world.pier;return x>=p.x+r&&x<=p.x+p.w-r&&y>=p.y+r&&y<=p.y+p.h-r;}
function collides(x,y){
 const r=PLAYER_RADIUS;
 if(scene==='sanctuary'){
  // V6.4.37: o limite frontal fica junto aos pés do pedestal (base em y~360),
  // permitindo chegar ao altar e ver a Ravena inteira. Mantém o bloqueio
  // da escultura, das paredes e dos cantos fora da sala.
  if(y<378+r || y>925-r)return true;
  let left,right;
  if(y<=790){
    // Salão em frente ao altar, com bordas laterais sólidas.
    left=250;right=800;
  }else if(y<=835){
    // Transição gradual do salão para o corredor central.
    const t=(y-790)/45;
    left=250+155*t;right=800-155*t;
  }else{
    // Corredor de saída, incluindo o ponto de interação do portal.
    left=405;right=645;
  }
  return x<left+r || x>right-r;
 }if(scene==='market')return x<470+r||x>1810-r||y<245+r||y>1380-r;
 if(x<25+r||y<25+r||x>world.w-25-r||y>world.h-25-r)return true;
 // A margem é circular: verificar os quatro pontos extremos impede atravessar a água.
 const wet=inLake(x-r,y)||inLake(x+r,y)||inLake(x,y-r)||inLake(x,y+r);
 if(wet&&!onPier(x,y,r))return true;
 for(const b of SOLID_BUILDINGS)if(circleRect(x,y,r,b,5))return true;
 for(const t of sceneryTrees){const dx=x-t.x,dy=y-(t.y+5);if(Math.abs(dx)<r+11&&Math.abs(dy)<r+11&&dx*dx+dy*dy<(r+11)*(r+11))return true;}
 return false;
}
// Não iniciar ou retornar dentro de um obstáculo após uma atualização.
function ensureSafePosition(){
 if(scene!=='lake'||!collides(player.x,player.y))return;
 for(let radius=15;radius<=400;radius+=15){
  for(let a=0;a<24;a++){const theta=a*Math.PI/12,x=player.x+radius*Math.cos(theta),y=player.y+radius*Math.sin(theta);
   if(!collides(x,y)){player.x=x;player.y=y;return;}
  }
 }
 player.x=1110;player.y=1370;
}

// Skins cosméticas: nenhuma altera a chance de pesca ou o progresso.
const skins=[
 {id:'classic',level:1,name:'Pescador Clássico',rarity:'Inicial',cape:'#21192f',edge:'#a34f76',vest:'#4c493a',pocket:'#6e674a',hat:'#29222f',rod:'#d2b487',price:0},
 {id:'raven',level:25,name:'Pescador da Ravena',rarity:'Épica',cape:'#32154e',edge:'#c17af4',vest:'#3e2c58',pocket:'#76579a',hat:'#27153e',rod:'#b884fa',price:250},
 {id:'ghost',level:50,name:'Pescador Fantasma',rarity:'Lendária',cape:'#123e4b',edge:'#79e7f1',vest:'#25505a',pocket:'#438b93',hat:'#183843',rod:'#8af5f5',price:450},
 {id:'abyss',level:75,name:'Pescador Abissal',rarity:'Lendária',cape:'#360e1e',edge:'#f75a75',vest:'#55202b',pocket:'#9a3c4a',hat:'#310e1a',rod:'#ff8795',price:650}
];
// Customização independente por perfil local, migrando os desbloqueios antigos.
const skinStorageKey='ravenaSkinsV2';
let skinProfiles={};
try{skinProfiles=JSON.parse(localStorage.getItem(skinStorageKey))||{}}catch{}
if(!skinProfiles.Marley){try{const old=JSON.parse(localStorage.getItem('ravenaSkinsV1'));if(old)skinProfiles.Marley=old}catch{}}
let skinState={active:'classic',owned:['classic'],model:'masculino'};
// V6.4.60: acesso por nível, igual para os modelos feminino e masculino.
// Todos os progressos antigos continuam salvos, mas não substituem o requisito de nível.
function skinLevel(){return playerXpInfo(progress.players[demo.active]||{}).level;}
function skinUnlocked(id){const sk=skins.find(x=>x.id===id);return !!sk&&skinLevel()>=sk.level;}
function loadSkinProfile(){
 const st=skinProfiles[demo.active]||{};
 const owned=['classic',...(Array.isArray(st.owned)?st.owned.filter(id=>skins.some(sk=>sk.id===id)):[])];
 const equipped=skins.some(sk=>sk.id===st.active)&&skinUnlocked(st.active)?st.active:'classic';
 skinState={owned:[...new Set(owned)],active:equipped,model:st.model==='feminino'?'feminino':'masculino'};
}
function persistSkin(){skinProfiles[demo.active]={...skinState};try{localStorage.setItem(skinStorageKey,JSON.stringify(skinProfiles))}catch{}}
function chooseModel(model){if(!['masculino','feminino'].includes(model))return;skinState.model=model;persistSkin();renderSkins();toast('🎣 Modelo selecionado: '+model);}
function chooseSkin(id){
 const sk=skins.find(x=>x.id===id);if(!sk)return;
 const level=skinLevel();
 if(level<sk.level)return toast(`🔒 ${sk.name} desbloqueia no nível ${sk.level}. Você está no nível ${level}.`);
 if(!skinState.owned.includes(id))skinState.owned.push(id);
 skinState.active=id;persistSkin();renderSkins();
 toast('🎭 Skin equipada: '+(skinState.model==='feminino'?({'classic':'Pescadora Clássica','raven':'Filha da Ravena','ghost':'Pescadora Fantasma','abyss':'Rainha do Abismo'}[id]):sk.name));
}
// As imagens aprovadas aparecem apenas no Ateliê; no mapa são usados sprites em cache.
let skinPreviewMode='art';
function setSkinPreview(mode){
 if(mode!=='art'&&mode!=='sprite')return;
 skinPreviewMode=mode;
 renderSkins();
}
function renderSkins(){
 const b=document.getElementById('panelBody'),level=skinLevel();
 b.innerHTML=`<div class="atelier-hero"><div class="eyebrow">Personalização de ${escapeProfileText(playerDisplayName())}</div><h2>🎭 Ateliê de Azarath</h2><p>Trajes de Azarath: arte original no provador e versão otimizada durante a aventura.</p></div>
 <div class="atelier-models"><button class="btn ${skinState.model==='masculino'?'selected':''}" aria-pressed="${skinState.model==='masculino'}" onclick="chooseModel('masculino')">🧑 Pescador</button><button class="btn ${skinState.model==='feminino'?'selected':''}" aria-pressed="${skinState.model==='feminino'}" onclick="chooseModel('feminino')">👩 Pescadora</button></div>
 <div class="atelier-toolbar"><span>✦ Nível ${level} de 100</span><div class="atelier-view" role="group" aria-label="Tipo de prévia"><button class="${skinPreviewMode==='art'?'selected':''}" aria-pressed="${skinPreviewMode==='art'}" onclick="setSkinPreview('art')">🎨 Arte</button><button class="${skinPreviewMode==='sprite'?'selected':''}" aria-pressed="${skinPreviewMode==='sprite'}" onclick="setSkinPreview('sprite')">🎮 No mapa</button></div></div>
 <div class="skin-grid">${skins.map(sk=>{
   const unlocked=level>=sk.level,active=unlocked&&skinState.active===sk.id;
   const name=skinState.model==='feminino'?({'classic':'Pescadora Clássica','raven':'Filha da Ravena','ghost':'Pescadora Fantasma','abyss':'Rainha do Abismo'}[sk.id]):sk.name;
   const requirement=sk.level===1?'Gratuita desde o início':`Desbloqueia no nível ${sk.level}`;
   const graphic=skinPreviewMode==='art'?`<img loading="lazy" decoding="async" src="assets/skins/${skinState.model}-${sk.id}.webp" alt="Ilustração de ${name}">`:`<canvas data-skin-preview="${sk.id}" aria-label="Sprite de ${name} usado no mapa"></canvas>`;
   return `<div class="skin-tile ${unlocked?'skin-unlocked':'skin-locked'} ${active?'skin-equipped':''}" style="--skin:${sk.edge};--skin-cape:${sk.cape}"><div class="skin-preview ${skinPreviewMode==='art'?'skin-art-view':'skin-sprite-view'}">${graphic}${unlocked?'':`<span class="skin-lock-icon" aria-hidden="true">🔒</span>`}</div><h3>${name}</h3><small class="skin-rarity">${sk.rarity} · ${requirement}</small><button class="btn" onclick="chooseSkin('${sk.id}')" ${active||!unlocked?'disabled':''} aria-label="${unlocked?(active?'Equipada':'Equipar'):`Bloqueada até o nível ${sk.level}`}: ${name}">${active?'✓ Equipada':unlocked?'Equipar':`🔒 Nível ${sk.level}`}</button></div>`;
 }).join('')}</div><p class="atelier-footer">🔐 Skins desbloqueadas por nível, sem moedas. Suas escolhas ficam salvas no perfil. As artes não alteram as chances de pesca.</p>`;
 if(skinPreviewMode==='sprite')drawSkinPreviews();
}
// V6.2.4 — arte vetorial em camadas: o mesmo personagem aparece no mundo e no provador.
// Cada traje possui silhueta, acessórios e acabamentos próprios, sem mudar a jogabilidade.
function paintFisher(g,model,skinId,phase=0,facing=1){
 const sk=skins.find(v=>v.id===skinId)||skins[0],female=model==='feminino',walk=Math.sin(phase),sway=Math.sin(phase*.7);
 const raven=skinId==='raven',ghost=skinId==='ghost',abyss=skinId==='abyss';
 const ink='#15121d',skin=female?'#d3a78c':'#b98c70',cloth=ghost?'#24535d':abyss?'#51222d':raven?'#403050':'#4a4240';
 const light=ghost?'#8ce9e8':abyss?'#f87c91':raven?'#d6a0fa':'#dfb47c';
 const metal=ghost?'#b4f8f4':abyss?'#d7838e':raven?'#a889c7':'#c3a274';
 function shape(fill,pts,stroke=ink,lw=1.5){g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke();}}
 function line(color,lw,pts){g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);g.strokeStyle=color;g.lineWidth=lw;g.lineCap='round';g.stroke()}
 function dot(color,x,y,r){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=color;g.fill()}
 function oval(color,x,y,rx,ry){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=color;g.fill()}
 g.save();g.scale(facing,1);
 // Sombra e botas separadas, articuladas ao caminhar.
 oval('#06061188',0,21,18,5);
 for(const side of [-1,1]){const step=side*walk*2.4,xx=side*6;
  shape('#252632',[[xx-4,5],[xx+4,5],[xx+4,17+step],[xx-4,17+step]]);
  shape(abyss?'#3d1a23':'#342d2c',[[xx-5,15+step],[xx+4,15+step],[xx+7,22+step],[xx-6,22+step]]);
  line(metal,1.5,[[xx-4,17+step],[xx+4,17+step]]);line('#b9a084',1,[[xx-4,20+step],[xx+5,20+step]]);
 }
 // Manto com caimento, pontas independentes e forro; não é um retângulo.
 shape(sk.cape,[[-11,-12],[-17,-4],[-18+sway,12],[-12+sway,9],[-7+sway,15],[0,11],[9+sway,14],[17+sway,8],[14,-8],[8,-13]]);
 line(sk.edge,1.5,[[-16,-4],[-16+sway,10],[-12+sway,8]]);
 // V6.4.61 — cada traje masculino tem uma silhueta própria, inclusive no mapa.
 if(!female&&raven){
  shape('#231132',[[-13,-9],[-23,-7],[-26,-2],[-18,1],[-23,6],[-11,3]]);
  shape('#39204e',[[13,-9],[21,-8],[25,-2],[18,2],[22,7],[11,4]]);
  line('#c18bea',1.3,[[-22,-4],[-18,-2],[-14,0]]);
  for(const side of [-1,1]){shape('#4c276c',[[side*13,2],[side*21,8],[side*17,9],[side*23,14],[side*9,11]],null);}
 }
 if(!female&&ghost){
  for(const side of [-1,1]){
   shape('#196374',[[side*13,-7],[side*21,2],[side*16,4],[side*21,11],[side*11,8]],null);
   line('#73e8ea',1.4,[[side*17,3],[side*13,9],[side*21,12]]);
  }
  line('#78d8df',1.5,[[-12,10],[-9,17],[-4,13],[0,18],[7,13],[12,17],[16,11]]);
 }
 if(!female&&abyss){
  for(const side of [-1,1]){
   shape('#501427',[[side*12,-8],[side*19,-5],[side*26,-1],[side*18,3],[side*23,13],[side*10,9]]);
   line('#d64b71',1.4,[[side*18,0],[side*13,4],[side*22,12]]);
  }
  shape('#71192e',[[-7,12],[-12,20],[-2,15],[5,20],[11,13]],null);
 }

 if(raven){shape('#251535',[[-12,-9],[-22,-5],[-16,1],[-21,5],[-10,4]]);shape('#251535',[[12,-9],[22,-5],[16,1],[21,5],[10,4]]);}
 if(ghost){line('#83dce0',1,[[-17,7],[-12,12],[-7,9]]);dot('#9cecf0',-13,8,1.4)}
 if(abyss){shape('#622536',[[-17,0],[-20,7],[-13,5]]);shape('#622536',[[17,0],[20,7],[13,5]]);}
 // Manga e braços anatômicos com luvas e punhos.
 shape(cloth,[[-10,-12],[-15,-10],[-18,-3],[-16,6],[-12,8],[-10,2],[-11,-4]]);
 shape(cloth,[[10,-12],[15,-10],[18,-3],[16,6],[12,8],[10,2],[11,-4]]);
 line(light,1,[[-17,2],[-12,3]]);line(light,1,[[12,3],[17,2]]);
 shape('#49342d',[[-17,5],[-12,5],[-11,9],[-16,10]]);shape('#49342d',[[12,5],[17,5],[16,10],[11,9]]);
 // Jaqueta ajustada com lapelas, pespontos e bolsos com abas.
 shape(cloth,[[-10,-13],[-4,-15],[4,-15],[10,-13],[12,-3],[10,9],[5,12],[-5,12],[-10,9],[-12,-3]]);
 shape(sk.vest,[[-8,-12],[-2,-13],[0,2],[-4,9],[-9,8],[-10,-2]]);
 shape(sk.vest,[[8,-12],[2,-13],[0,2],[4,9],[9,8],[10,-2]]);
 line(light,1,[[-7,-10],[-5,5],[-3,7]]);line(light,1,[[7,-10],[5,5],[3,7]]);
 for(const side of [-1,1]){const x=side*6;shape(sk.pocket,[[x-3,1],[x+3,1],[x+3,7],[x-3,7]],ink,.7);line(metal,1,[[x-3,2],[x+3,2]]);dot(light,x,3,0.7)}
 line('#b48b65',2.2,[[-9,-10],[7,10]]);line('#261f2a',3,[[-11,8],[11,8]]);
 shape(metal,[[-2,7],[3,7],[3,10],[-2,10]],ink,.7);shape('#27232c',[[-1,8],[2,8],[2,9],[-1,9]],null);
 // Bolsa pendurada, com tampa, costura e fivela.
 shape('#654333',[[-18,4],[-10,4],[-9,15],[-17,15]]);shape('#825940',[[-18,4],[-10,4],[-11,9],[-17,9]]);
 line('#c8a47d',.9,[[-17,12],[-11,12]]);dot('#e1bd83',-14,8,1.2);
 if(!female){
  if(!raven&&!ghost&&!abyss){
   // Lenço, alforje com pergaminho e jaqueta verde-mata da coleção inicial.
   shape('#b98b55',[[-9,-13],[0,-11],[8,-13],[3,-8],[-4,-8]]);
   line('#deb77d',1,[[-3,-11],[5,-10]]);
   shape('#9c7547',[[-18,2],[-10,1],[-9,13],[-18,14]]);
   shape('#d6b981',[[-14,-1],[-12,-1],[-12,5],[-14,5]],null);
  }
  if(raven){
   // Penas sobre os ombros e um broche violeta central.
   for(const side of [-1,1]){
    shape('#5b3174',[[side*11,-14],[side*17,-16],[side*21,-11],[side*18,-7],[side*12,-9]]);
    line('#d69dff',1,[[side*13,-13],[side*18,-11]]);
   }
   shape('#d2a4fc',[[0,-9],[3,-6],[0,-3],[-3,-6]],null);
   dot('#fff0ff',0,-6,1);
  }
  if(ghost){
   // Fitas espectrais, sem partículas animadas e sem cálculos por quadro.
   shape('#377b88',[[-8,-12],[3,-13],[9,-10],[0,-7]],null);
   line('#b7ffff',1.4,[[-7,-11],[3,-10],[7,-11]]);
   dot('#9cffff',-2,0,2);
  }
  if(abyss){
   // Peitoral carmesim em placas e gema central.
   shape('#341624',[[-10,-10],[0,-12],[10,-10],[8,6],[0,9],[-8,6]]);
   line('#a94262',1.4,[[-8,-8],[0,-5],[8,-8]]);
   shape('#ff678d',[[0,-7],[5,-1],[0,5],[-5,-1]],null);
   shape('#ffe3e6',[[0,-5],[2,-1],[0,1],[-2,-1]],null);
  }
 }

 // V6.2.6: camadas de acabamento com costuras, joelheiras, alças e insígnias.
 for(const side of [-1,1]){
  const xx=side*6;
  shape(ghost?'#365d67':abyss?'#63303d':'#49434a',[[xx-3,10],[xx+3,10],[xx+3,14],[xx-3,14]],ink,.6);
  line(light,.7,[[xx-2,11],[xx+2,11]]);
  dot(metal,xx,12,.65);
 }
 line(metal,.85,[[-9,-9],[-8,7]]);line(metal,.85,[[9,-9],[8,7]]);
 for(const yy of [-6,-2,2]){dot(metal,1,yy,.8)}
 // Acessórios diferentes por coleção: nada de simples recoloração.
 if(raven){
  shape('#21142f',[[-14,-11],[-20,-17],[-17,-8],[-12,-6]]);
  shape('#21142f',[[14,-11],[20,-17],[17,-8],[12,-6]]);
  shape('#c79af3',[[-2,-7],[1,-10],[4,-7],[1,-4]],null);
  line('#a66add',1,[[-17,8],[-14,13],[-11,9]]);
 }
 if(ghost){
  // Frasco luminoso e pingente de caçador espectral.
  shape('#173d49',[[12,8],[18,8],[19,15],[12,15]]);
  dot('#91ffff',15.5,12,2.2);
  line('#b7fafa',1,[[-4,-10],[0,-7],[4,-10]]);
  dot('#8cfafa',0,-6,1.7);
 }
 if(abyss){
  // Armadura escamada, ombreiras e correntes carmesim.
  for(const side of [-1,1]){
   shape('#622534',[[side*10,-13],[side*17,-12],[side*19,-7],[side*12,-8]]);
   dot('#f98c9c',side*14,-10,1);
  }
  line('#d26b7e',1.1,[[-10,5],[-5,9],[0,7],[5,9],[10,5]]);
  dot('#ff9bb0',0,7,1.4);
 }
 if(!raven&&!ghost&&!abyss){
  // Coleção clássica: fivela extra, lenço e kit de iscas.
  line('#d6a478',1.5,[[-7,-12],[0,-9],[7,-12]]);
  shape('#6b563c',[[12,9],[17,9],[17,15],[12,15]]);
  dot('#e6c38c',14.5,11.5,.9);
 }
 // Pescoço e cabeça arredondada (não quadrada).
 shape(skin,[[-3,-16],[3,-16],[3,-12],[-3,-12]]);
 if(female){
  // V6.4.62: cabelo longo e camadas das quatro artes aprovadas.
  const hair=ghost?'#a7c9d8':abyss?'#832846':raven?'#29193f':'#674034';
  const hairLight=ghost?'#daffff':abyss?'#d4517d':raven?'#8f5bbb':'#ab725a';
  shape(hair,[[-8,-32],[-13,-27],[-14,-18],[-18,-11],[-17,-4],[-22,0],[-13,-1],[-9,-7],[-8,-22],[8,-22],[10,-7],[14,-1],[21,0],[16,-7],[17,-14],[12,-24],[8,-32]],null);
  line(hairLight,1.6,[[-10,-25],[-13,-15],[-15,-8],[-12,-4]]);
  line(hairLight,1.6,[[9,-25],[12,-16],[14,-6],[18,-3]]);
  if(ghost){line('#c7fcff',1,[[-17,-4],[-20,1],[-16,3]]);line('#75f3ef',1,[[14,-5],[21,1],[17,4]]);}
  if(abyss){line('#ef668d',1.2,[[-18,-3],[-22,3],[-16,1]]);}
  if(raven){shape('#291732',[[-17,-12],[-23,-10],[-20,-6],[-25,-3],[-17,-4]],null);}
 }
 else {shape(ghost?'#a5c7d1':abyss?'#562436':raven?'#1f1630':'#45302c',[[-8,-28],[-9,-22],[-7,-18],[7,-18],[9,-24],[6,-29]]);}
 g.beginPath();g.moveTo(-7,-27);g.quadraticCurveTo(-10,-20,-6,-15);g.quadraticCurveTo(0,-11,6,-15);g.quadraticCurveTo(10,-20,7,-27);g.closePath();g.fillStyle=skin;g.fill();g.strokeStyle=ink;g.lineWidth=1;g.stroke();
 // Cabelo, olhos, sobrancelha, nariz e expressão discretos.
 shape(female?(ghost?'#c4e3e9':abyss?'#9e3258':raven?'#35214e':'#674235'):(ghost?'#bfdce6':abyss?'#6f243a':raven?'#251937':'#382824'),[[-8,-27],[-6,-31],[4,-31],[8,-27],[4,-26],[0,-29],[-5,-25]]);
 line('#34202a',1.2,[[-5,-22],[-2,-22]]);line('#34202a',1.2,[[2,-22],[5,-22]]);
 dot('#1b1b2c',-3,-21,1);dot('#1b1b2c',4,-21,1);dot('#f3d8b3',-2.7,-21.4,.35);
 line('#986c58',.8,[[0,-20],[1,-18],[0,-17]]);line('#754d48',.9,[[-2,-15],[2,-15]]);
 if(!female){line('#553a36',1.2,[[-5,-16],[-2,-14],[2,-14],[5,-16]]);}
 // Masculino: cabelo em mechas, barba e pescoço mais orgânicos; feminino preservado.
 if(!female){
  shape('#30232a',[[-8,-26],[-10,-22],[-7,-19],[-6,-25]],null);
  shape('#30232a',[[8,-26],[10,-22],[7,-19],[6,-25]],null);
  line('#51352e',1.3,[[-5,-17],[-4,-14],[-1,-12],[2,-12],[5,-15]]);
  line('#6e4939',.9,[[-3,-14],[0,-13],[3,-14]]);
  dot('#c99a7e',-5,-19,.6);
  if(ghost){
   shape('#bad9e1',[[-8,-29],[-10,-27],[-12,-24],[-10,-20],[-8,-23],[-5,-27]],null);
   shape('#d9f5ed',[[7,-29],[10,-26],[11,-20],[7,-22]],null);
   line('#89c8d2',1,[[-8,-26],[-10,-22]]);
  }
  if(abyss){
   shape('#72283c',[[7,-29],[10,-26],[12,-21],[7,-23]],null);
   line('#e36a88',1,[[-7,-26],[-3,-28]]);
  }

 }
 // Chapéu de aba larga, faixa, pena e emblema — varia por raridade.
 shape(sk.hat,[[-9,-30],[-7,-38],[-3,-41],[5,-40],[9,-36],[10,-30]]);
 shape(sk.hat,[[-16,-31],[-9,-34],[9,-34],[17,-31],[11,-28],[-11,-28]]);
 line(light,2,[[-9,-34],[9,-34]]);line('#d5a979',1,[[-14,-30],[13,-30]]);
 shape(light,[[6,-38],[12,-46],[10,-39],[7,-35]],null);line('#f1d7a7',.7,[[7,-36],[11,-43]]);
 dot(light,-4,-34,1.5);
 if(raven){dot('#d29aff',-4,-34,2);line('#c48bf8',1,[[11,-42],[15,-47]])}
 if(ghost){dot('#a2ffff',-4,-34,2);line('#8ce9e8',1,[[10,-39],[15,-42]])}
 if(abyss){shape('#d75472',[[0,-37],[3,-34],[0,-31],[-3,-34]],null);line('#f7a0ac',1,[[0,-37],[0,-31]])}
 if(!female){
  if(!raven&&!ghost&&!abyss){
   // Aba de couro com fivela dourada e pluma longa.
   shape('#b28b52',[[-8,-35],[7,-35],[9,-33],[-9,-33]],null);
   shape('#e5c28e',[[6,-38],[12,-49],[14,-50],[10,-41],[8,-35]],null);
   line('#f6dcb0',.75,[[8,-36],[13,-48]]);
   shape('#dec088',[[-4,-35],[-1,-35],[-1,-32],[-4,-32]],null);
  }
  if(raven){
   // Chapéu com penas da Ravena e uma gema central.
   shape('#5a3173',[[-6,-40],[-8,-47],[-4,-44],[0,-41]],null);
   shape('#a969d7',[[8,-37],[15,-49],[15,-43],[11,-36]],null);
   line('#ebbdff',1,[[11,-37],[15,-47]]);
   dot('#e4b7ff',0,-34,1.8);
  }
  if(ghost){
   // Chamas frias sobre o chapéu, em formas estáticas e baratas.
   shape('#5ed9e6',[[-9,-40],[-11,-48],[-7,-44],[-4,-50],[-3,-42]],null);
   shape('#a2ffff',[[9,-39],[13,-47],[13,-41],[16,-45],[14,-36]],null);
   dot('#d3ffff',-4,-35,2);
  }
  if(abyss){
   // Coroa de espinhos, acima da faixa escarlate do chapéu.
   shape('#9c3150',[[-11,-35],[-9,-44],[-5,-40],[0,-49],[4,-41],[9,-45],[12,-35]],'#1d1020',1);
   line('#ff7d9b',1,[[-8,-39],[-5,-38],[0,-45],[4,-38],[9,-39]]);
   dot('#ffc0d1',0,-42,1.2);
  }
 }

 // Vara de pesca: punho, reel, anéis e linha, conectada à mão.
 line('#8d654a',3.8,[[15,6],[23,-14]]);line(sk.rod,2.2,[[23,-14],[39,-55]]);
 line('#f5d6a7',.8,[[26,-22],[30,-32]]);line('#f5d6a7',.8,[[32,-37],[36,-46]]);
 dot('#c7b6a8',23,-10,4);dot('#34303c',23,-10,2);dot(light,23,-10,.8);
 g.beginPath();g.moveTo(39,-55);g.quadraticCurveTo(46,-34,37,-13);g.strokeStyle='#d9d9e9';g.lineWidth=.8;g.stroke();
 dot(light,37,-13,1.3);
 // Pequenos acessórios de cada skin.
 if(raven){dot('#a867eb',-8,-1,1.8);dot('#a867eb',8,-1,1.8);}
 if(ghost){dot('#a8ffff',-14,12,1.8);dot('#a8ffff',10,-6,1.4);}
 if(abyss){line('#f38b96',1,[[-8,-5],[-5,-2]]);dot('#ff7792',7,5,1.6);}
 if(female){
  if(raven){
   // Filha da Ravena: pequeno corvo e ombreira de penas.
   shape('#17121f',[[-14,-15],[-20,-20],[-24,-17],[-22,-12],[-17,-10],[-12,-12]],null);
   shape('#3d2252',[[-20,-17],[-25,-21],[-25,-14],[-21,-12]],null);
   dot('#d5a0ff',-20,-16,1);line('#a45cd6',1,[[-18,-9],[-17,-5]]);
   for(const side of [-1,1])shape('#48245d',[[side*11,-11],[side*20,-7],[side*17,-2],[side*22,4],[side*9,0]],null);
  }
  if(ghost){
   // Pescadora Fantasma: lanterna espectral e cauda de manto fria.
   shape('#235f6f',[[-21,12],[-12,12],[-12,22],[-21,22]],null);
   shape('#b0ffff',[[-19,14],[-14,14],[-14,20],[-19,20]],null);
   line('#bdfdff',1,[[-20,11],[-17,8],[-14,11]]);
  }
  if(abyss){
   // Rainha do Abismo: pingente escarlate e pequenos espinhos na capa.
   shape('#ed577c',[[0,-11],[4,-6],[0,-2],[-4,-6]],null);
   shape('#ffe4e5',[[0,-9],[2,-6],[0,-4],[-2,-6]],null);
   shape('#9d3d57',[[-12,-36],[-10,-41],[-6,-37]],null);
  }
 }
 if(!female){
  if(raven){
   // Corvo pousado no ombro: ícone fixo, sem efeitos pesados.
   shape('#191326',[[-20,-16],[-23,-19],[-26,-15],[-24,-10],[-20,-9],[-16,-12]]);
   shape('#38204b',[[-24,-16],[-29,-18],[-26,-12],[-23,-13]],null);
   dot('#d9a7ff',-22,-15,.9);shape('#aa8197',[[-26,-15],[-30,-13],[-26,-12]],null);
   line('#8a609e',1,[[-21,-9],[-21,-6]]);
  }
  if(ghost){
   // Lanterna espectral à mão esquerda e luz desenhada no próprio sprite.
   line('#a6d0d4',1.5,[[-15,8],[-17,14]]);
   shape('#2f7382',[[-22,13],[-12,13],[-12,23],[-22,23]]);
   shape('#87fbff',[[-20,15],[-14,15],[-14,21],[-20,21]],null);
   shape('#e2ffff',[[-19,15],[-17,14],[-15,15],[-17,19]],null);
   line('#b7ffff',1,[[-20,12],[-17,9],[-14,12]]);
  }
  if(abyss){
   // Pingente de cristal vermelho e ponta de manto blindada.
   shape('#ff426e',[[16,10],[19,15],[16,20],[13,15]],null);
   line('#ffa7b4',1,[[16,12],[16,18]]);
  }
 }

 g.restore();
}
// V6.4.61: sprite cache. Em vez de redesenhar dezenas de formas por frame,
// renderizamos uma vez os cinco passos de animação quando necessários.
// O mesmo sprite é usado no mapa e no Ateliê, inclusive para o modelo masculino.
const FISHER_SPRITE_W=100,FISHER_SPRITE_H=96,FISHER_ANCHOR_X=31,FISHER_ANCHOR_Y=61;
const fisherSpriteCache=new Map();
function fisherSprite(model,skinId,frame=0){
 const safeId=skins.some(s=>s.id===skinId)?skinId:'classic';
 const safeModel=model==='feminino'?'feminino':'masculino';
 const safeFrame=Math.max(0,Math.min(4,frame|0));
 const key=safeModel+'|'+safeId+'|'+safeFrame;
 if(fisherSpriteCache.has(key))return fisherSpriteCache.get(key);
 const el=document.createElement('canvas');
 el.width=FISHER_SPRITE_W*2;el.height=FISHER_SPRITE_H*2;
 const g=el.getContext('2d');
 // Dois pixels internos por unidade — imagem suave sem renderizar os vetores 30 vezes/s.
 g.setTransform(2,0,0,2,2*FISHER_ANCHOR_X,2*FISHER_ANCHOR_Y);
 const phase=[0,-Math.PI/2,0,Math.PI/2,Math.PI][safeFrame];
 paintFisher(g,safeModel,safeId,phase,1);
 // Máximo: 4 skins x 2 modelos x 5 passos (até ~6 MB de memória de canvas).
 fisherSpriteCache.set(key,el);
 return el;
}
function playerDraw(){
 const x=player.x-cam.x,y=player.y-cam.y,t=performance.now();
 ctx.save();ctx.translate(x,y+(avatarMoving?Math.abs(Math.sin(avatarWalk))*1.2:Math.sin(t*.002)*.5));
 if(innerWidth<=720)ctx.scale(1.25,1.25);
 const walkFrame=avatarMoving?1+Math.floor((((avatarWalk%(Math.PI*2))+(Math.PI*2))%(Math.PI*2))/(Math.PI/2)):0;
 const sprite=fisherSprite(skinState.model,skinState.active,walkFrame);
 if(avatarFacing<0)ctx.scale(-1,1);
 ctx.drawImage(sprite,-FISHER_ANCHOR_X,-FISHER_ANCHOR_Y,FISHER_SPRITE_W,FISHER_SPRITE_H);
 if(avatarFacing<0)ctx.scale(-1,1);
 ctx.fillStyle='#eee0e8';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.shadowColor='#13071c';ctx.shadowBlur=7;
 ctx.fillText(playerDisplayName(),0,-64);ctx.restore();
}
function drawSkinPreviews(){
 document.querySelectorAll('canvas[data-skin-preview]').forEach(el=>{
  const g=el.getContext('2d');if(!g)return;
  const dpr=Math.min(devicePixelRatio||1,2);el.width=116*dpr;el.height=146*dpr;
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,116,146);
  const skinId=el.dataset.skinPreview;
  const tint=(skins.find(s=>s.id===skinId)||skins[0]).edge;
  g.globalAlpha=.20;g.fillStyle=tint;g.beginPath();g.arc(58,61,42,0,Math.PI*2);g.fill();g.globalAlpha=1;
  const sprite=fisherSprite(skinState.model,skinId,0);
  g.save();g.translate(55,109);g.scale(1.68,1.68);
  g.drawImage(sprite,-FISHER_ANCHOR_X,-FISHER_ANCHOR_Y,FISHER_SPRITE_W,FISHER_SPRITE_H);
  g.restore();
 });
}
// V6.4.59 — câmera com suavização dependente do tempo, sem atrasar transições.
function updateCamera(dt,instant=false){
 const map=scene==='sanctuary'?sanctuaryWorld:world;
 const clamp=(value,max)=>Math.max(0,Math.min(Math.max(0,max),value));
 const targetX=clamp(player.x-W/2,map.w-W);
 let targetY=clamp(player.y-H/2,map.h-H);
 // Preserve the full altar framing when close to Ravena.
 if(scene==='sanctuary'&&player.y<570)targetY=Math.min(targetY,clamp(player.y-390,map.h-H));
 const follow=instant?1:1-Math.exp(-12*Math.max(0,dt));
 cam.x+=(targetX-cam.x)*follow;
 cam.y+=(targetY-cam.y)*follow;
 // Avoid tiny floating-point jitter when the player is standing still.
 if(Math.abs(cam.x-targetX)<.12)cam.x=targetX;
 if(Math.abs(cam.y-targetY)<.12)cam.y=targetY;
}
function update(dt){
 if(window.RavenaFishing?.active){avatarMoving=false;detectNear();return;}
 let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joyX;
 let dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joyY;
 const moving=Math.abs(dx)>.015||Math.abs(dy)>.015;
 avatarMoving=moving;
 if(moving){
  avatarWalk+=dt*13;
  if(Math.abs(dx)>.1)avatarFacing=dx>0?1:-1;
  const length=Math.hypot(dx,dy)||1;
  const step=player.speed*dt;
  dx/=length;dy/=length;
  const segments=Math.max(1,Math.ceil(step/6));
  const stepX=dx*step/segments,stepY=dy*step/segments;
  for(let i=0;i<segments;i++){
   const nx=player.x+stepX,ny=player.y+stepY;
   if(!collides(nx,player.y))player.x=nx;
   if(!collides(player.x,ny))player.y=ny;
  }
 }
 updateCamera(dt);
 detectNear();
}
function lakeEdgeFactor(x,y){let L=world.lake,dx=(x-(L.x+L.w/2))/(L.w/2),dy=(y-(L.y+L.h/2))/(L.h/2);return Math.sqrt(dx*dx+dy*dy)}
// DOM interactions are expensive on Android: render only when a target changes.
let lastNearbyUiKey=null;
function updateActionLabel(){
 const button=document.getElementById('action');
 const label=near?near[5]:'EXPLORAR';
 button.innerHTML=`<span aria-hidden="true">${near?'✦':'•'}</span><small>${label}</small>`;
 button.setAttribute('aria-label',near?label:'Explorar');
 button.disabled=!near;
}
function syncNearbyUi(){
 const key=scene+'|'+(near?near[0]+'|'+near[4]+'|'+near[5]:'none')+'|'+(innerWidth<=720?'mobile':'desktop');
 if(key===lastNearbyUiKey)return;
 lastNearbyUiKey=key;
 const hint=document.getElementById('hint');
 if(!near)hint.classList.add('hidden');
 else{
  const instruction=scene==='sanctuary'?'Toque':innerWidth<=720?'Toque no botão de ação':'Pressione E ou toque';
  hint.classList.remove('hidden');
  hint.innerHTML=`${near[3]} <b>${near[4]}</b><span>${instruction} para ${near[5].toLowerCase()}</span>`;
 }
 updateActionLabel();
}
function detectNear(){
 if(scene==='sanctuary'){
  const dist=Math.hypot(player.x-525,player.y-485),exit=Math.hypot(player.x-525,player.y-840);
  near=exit<140?SANCTUARY_EXIT_NEAR:dist<180?SANCTUARY_ALTAR_NEAR:null;
 }else if(scene==='market'){
  near=null;
  for(const item of MARKET_INTERACTIONS){
   if(Math.hypot(player.x-item[1].x,player.y-item[1].y)<item[2]){near=item;break;}
  }
 }else{
  near=null;
  for(const item of LAKE_INTERACTIONS){
   if(Math.hypot(player.x-item[1].x,player.y-item[1].y)<item[2]){near=item;break;}
  }
  // Fishing is possible along the whole lake shore and on the pier.
  if(!near){
   const edge=lakeEdgeFactor(player.x,player.y);
   const standingOnPier=onPier(player.x,player.y,PLAYER_RADIUS);
   if((edge>=1&&edge<=1.18)||standingOnPier)near=standingOnPier?FISHING_PIER_NEAR:FISHING_SHORE_NEAR;
  }
 }
 syncNearbyUi();
}
function enterMarket(){marketReturn={x:player.x,y:player.y};scene='market';player.x=1120;player.y=1170;updateCamera(0,true);toast('🌹 Desça ao salão e caminhe até o balcão para negociar.')}
function leaveMarket(){scene='lake';player.x=marketReturn.x;player.y=marketReturn.y;ensureSafePosition();updateCamera(0,true);document.getElementById('panel').classList.remove('show');toast('🌙 Você voltou à vila.')}
function enterSanctuary(){sanctuaryReturn={x:player.x,y:player.y};scene='sanctuary';player.x=525;player.y=730;updateCamera(0,true);toast('🔮 Bem-vindo ao Templo do Crepúsculo.')}
function leaveSanctuary(){scene='lake';player.x=sanctuaryReturn.x;player.y=sanctuaryReturn.y;ensureSafePosition();updateCamera(0,true);toast('🌙 Você retornou a Azarath.')}
function interact(){if(!near)return;if(near[0]==='fishing')goFish();else if(near[0]==='sanctuaryPortal')transition('Santuário da Ravena',enterSanctuary);else if(near[0]==='sanctuaryExit')transition('Vila de Azarath',leaveSanctuary);else if(near[0]==='market')transition('Mercado Noturno',enterMarket);else if(near[0]==='marketExit')transition('Vila da Ravena',leaveMarket);else if(near[0]==='marketCounter')openPanel('market');else transition(near[4],()=>openPanel(near[0]))}
// V5: a captura agora depende de habilidade, não de sorte instantânea.
function goFish(){
 if(window.RavenaFishing?.active)return;
 if(bait<=0)return toast('Você ficou sem iscas. Visite a Loja.');
 if(bagWeight()>=100)return toast('🎒 Mochila cheia! Venda ou troque peixes antes de pescar.');
 if(scene!=='lake')return;
 bait--;updateHud();save();
 window.RavenaFishing.start({
  onCatch:(skill)=>{
   let roll=Math.random()+Math.min(.13,skill*.11)+currentRod().bonus+(activeRavenaBuff()==='sorte'?.035:0);
   let idx=roll>.997?5:roll>.985?4:roll>.91?3:roll>.68?2:roll>.32?1:0;
   let f=fish[idx],weight=+(f[2]+Math.random()*(f[3]-f[2])).toFixed(2);
   if(!canCarry(weight)){bait++;updateHud();save();return toast('🎒 Captura devolvida ao lago: sem espaço na mochila. Sua isca foi reembolsada.')}
   inventory.push({id:++demo.nextId,name:f[0],rarity:f[1],weight,value:Math.round(f[4]*weight/f[2])});recordCatch(f[0],f[1],weight);
   updateHud();save();
   toast(`🎣 Você pescou <b>${f[0]}</b> • ${weight} kg • ${f[1]}!`);
  },
  onMiss:()=>toast('💦 O peixe escapou! Tente novamente.')
 });
}
// Economia demonstrativa: dois perfis locais, sem rede e sem dinheiro real.
const demoKey='ravenaTradeV4';
const progressionKey='ravenaProgressV5_2';
let progress={players:{},blessingUntil:{},blessingType:{}};
try{const data=JSON.parse(localStorage.getItem(progressionKey));if(data&&typeof data==='object'){progress.players=data.players||{};progress.blessingUntil=data.blessingUntil||{};progress.blessingType=data.blessingType||{}}}catch{}
let ravenaBlessingUntil=0;
const RAVENA_BUFFS={sorte:{name:'Sorte das Profundezas',icon:'🐟',desc:'Aumenta a chance de peixes raros (+3,5 pontos percentuais na rolagem).'},sabedoria:{name:'Sabedoria Sombria',icon:'✨',desc:'+20% de XP por captura.'},fortuna:{name:'Fortuna da Ravena',icon:'🪙',desc:'+15% de moedas ao vender peixes ao sistema.'},aguas:{name:'Favor das Águas',icon:'🌊',desc:'Uma isca extra a cada 10 capturas durante a bênção.'}};
let selectedRavenaBuff='sorte';
function activeRavenaBuff(){return Date.now()<ravenaBlessingUntil?(progress.blessingType[demo.active]||'sorte'):null}
function buffRemaining(){return Math.max(0,Math.ceil((ravenaBlessingUntil-Date.now())/60000))}
function chooseRavenaBuff(type){if(!RAVENA_BUFFS[type])return;selectedRavenaBuff=type;renderStatue(document.getElementById('panelBody'))}
function ravenaSaleValue(value){return activeRavenaBuff()==='fortuna'?Math.round(value*1.15):value}

function saveProgress(){localStorage.setItem(progressionKey,JSON.stringify(progress))}
// V6.4.42 — progressão persistente: 4.140 XP no nível 10 e 1.000.000 no nível 100.
const XP_MAX=1000000;
const XP_EARLY=[0,100,250,470,770,1170,1690,2340,3140,4140];
const XP_REWARDS={'Comum':10,'Incomum':18,'Raro':35,'Épico':65,'Lendário':120};
const XP_TITLES=[[100,'Lenda de Azarath'],[81,'Lenda das Profundezas'],[61,'Guardião de Azarath'],[41,'Mestre das Águas'],[26,'Pescador Veterano'],[11,'Pescador Experiente'],[1,'Pescador Iniciante']];
function xpThreshold(level){
 const n=Math.max(1,Math.min(100,Math.floor(level)));
 if(n<=10)return XP_EARLY[n-1];
 // Curva crescente após o nível 10, sem ultrapassar o teto.
 const t=(n-10)/90;
 return 4140+Math.round((XP_MAX-4140)*Math.pow(t,1.72));
}
function playerXpInfo(stats){
 const legacy=Math.max(0,Math.floor(Number(stats?.catches)||0))*10;
 const xp=Math.min(XP_MAX,Math.max(0,Math.floor(Number(stats?.xpTotal ?? legacy)||0)));
 let low=1,high=100;
 while(low<high){const mid=Math.ceil((low+high)/2);if(xpThreshold(mid)<=xp)low=mid;else high=mid-1}
 const level=low,start=xpThreshold(level),next=level===100?XP_MAX:xpThreshold(level+1);
 return {xp,level,current:xp-start,required:next-start,percent:level===100?100:Math.min(100,100*(xp-start)/(next-start)),title:XP_TITLES.find(([min])=>level>=min)[1]};
}
function migrateLegacyXp(entry){
 if(!Number.isFinite(Number(entry.xpTotal)))entry.xpTotal=Math.max(0,Math.floor(Number(entry.catches)||0))*10;
 entry.xpTotal=Math.min(XP_MAX,Math.max(0,Math.floor(Number(entry.xpTotal)||0)));
 return entry;
}
// V6.4.48: recompensas de marco concedidas apenas uma vez por perfil local.
const LEVEL_MILESTONES=[
 {level:5,coins:100,bait:3,name:'Primeiros Passos'},
 {level:10,coins:250,bait:5,name:'Pescador de Azarath'},
 {level:25,coins:600,bait:8,name:'Explorador das Águas'},
 {level:50,coins:1500,bait:12,name:'Mestre da Pescaria'},
 {level:75,coins:2500,bait:18,name:'Guardião das Profundezas'},
 {level:100,coins:5000,bait:25,name:'Lenda de Azarath'}
];
function awardLevelMilestones(entry,beforeLevel,afterLevel){
 if(!Array.isArray(entry.claimedMilestones))entry.claimedMilestones=[];
 let earned=[];
 for(const milestone of LEVEL_MILESTONES){
  if(beforeLevel<milestone.level&&afterLevel>=milestone.level&&!entry.claimedMilestones.includes(milestone.level)){
   entry.claimedMilestones.push(milestone.level);
   coins+=milestone.coins;bait+=milestone.bait;earned.push(milestone);
  }
 }
 return earned;
}
function nextLevelMilestone(level){return LEVEL_MILESTONES.find(m=>m.level>level)||null}
function recordCatch(name,rarity,weight){
 let entry=migrateLegacyXp(progress.players[demo.active]||{catches:0,best:0,legendary:0});
 const before=playerXpInfo(entry);
 entry.catches++;entry.best=Math.max(entry.best,weight);
 if(activeRavenaBuff()==='aguas'&&entry.catches%10===0){bait++;toast('🌊 Ravena concedeu uma isca extra!')}
 const baseReward=XP_REWARDS[rarity]||10;
 const reward=activeRavenaBuff()==='sabedoria'?Math.round(baseReward*1.2):baseReward;
 entry.xpTotal=Math.min(XP_MAX,entry.xpTotal+reward);
 const after=playerXpInfo(entry);
 const earnedMilestones=awardLevelMilestones(entry,before.level,after.level);
 if(earnedMilestones.length){
  save();
  const reward=earnedMilestones[earnedMilestones.length-1];
  toast(`🏆 ${reward.name}! +${earnedMilestones.reduce((sum,m)=>sum+m.coins,0)} moedas e +${earnedMilestones.reduce((sum,m)=>sum+m.bait,0)} iscas`);
 }
 else if(after.level>before.level)toast(`🌟 Nível ${after.level} alcançado! ${after.title}`);
 else if(before.xp<XP_MAX)toast(`✨ +${reward} XP • ${after.title}`);
 if(rarity==='Lendário'){entry.legendary++;toast('✨ Uma criatura lendária respondeu ao chamado da Ravena!')}
 progress.players[demo.active]=entry;saveProgress();
}
function offerToRavena(id){
 const i=inventory.findIndex(f=>f.id===id);if(i<0)return;
 if(!RAVENA_BUFFS[selectedRavenaBuff])return;
 if(!confirm(`Oferecer ${inventory[i].name} para receber ${RAVENA_BUFFS[selectedRavenaBuff].name} por 10 minutos? O peixe será consumido.`))return;
 const fish=inventory[i];inventory.splice(i,1);
 ravenaBlessingUntil=Date.now()+10*60*1000;
 progress.blessingUntil[demo.active]=ravenaBlessingUntil;
 progress.blessingType[demo.active]=selectedRavenaBuff;
 save();saveProgress();openPanel('statue');updateHud();
 toast('🔮 Ravena aceitou '+escapeProfileText(fish.name)+'. '+RAVENA_BUFFS[selectedRavenaBuff].name+' ativa por 10 minutos!');
}
function renderStatue(b){
 const remaining=buffRemaining(),active=activeRavenaBuff(),chosen=RAVENA_BUFFS[selectedRavenaBuff];
 b.innerHTML=`<div class="eyebrow">Santuário • bosque ocidental</div><h2>🔮 Bênçãos da Ravena</h2><p>Ofereça um peixe para receber uma bênção por 10 minutos. Uma nova oferenda substitui a bênção anterior; os efeitos não se acumulam.</p>
 <div class="card"><h3>${active?'✨ '+RAVENA_BUFFS[active].name+' • '+remaining+' min restantes':'🌙 A Ravena aguarda sua oferenda'}</h3><small>${active?RAVENA_BUFFS[active].desc:'Selecione uma bênção e escolha o peixe que deseja oferecer.'}</small></div>
 <h3>Escolha uma bênção</h3><div class="cards">${Object.entries(RAVENA_BUFFS).map(([id,buff])=>`<div class="card"><h3>${buff.icon} ${buff.name}</h3><small>${buff.desc}</small><div class="row"><button class="btn" onclick="chooseRavenaBuff('${id}')" ${selectedRavenaBuff===id?'disabled':''}>${selectedRavenaBuff===id?'✓ Selecionada':'Selecionar'}</button></div></div>`).join('')}</div>
 <h3>Oferecer peixe • ${chosen.icon} ${chosen.name}</h3><p class="disclaimer">A oferenda consome permanentemente o peixe escolhido. O XP de capturas anteriores permanece salvo.</p>
 <div class="cards">${inventory.map(f=>`<div class="card"><h3>🐟 ${escapeProfileText(f.name)}</h3><small>${escapeProfileText(f.rarity)} • ${Number(f.weight).toFixed(2)} kg</small><button class="btn" onclick="offerToRavena(${Number(f.id)})">Oferecer à Ravena</button></div>`).join('')||'<div class="card">Você não possui peixes para oferecer.</div>'}</div>`;
}
function renderRanking(b){
 const players=Object.entries(progress.players).sort((a,c)=>c[1].legendary-a[1].legendary||c[1].best-a[1].best||c[1].catches-a[1].catches);
 b.innerHTML=`<div class="eyebrow">Lápide dos Campeões • registros locais</div><h2>🪦 Ranking da Ravena</h2><p>Classificação deste navegador por lendários, maior peso e total de capturas. Ainda não é um ranking online.</p><div class="cards">${players.map(([name,v],i)=>`<div class="card"><h3>${['🥇','🥈','🥉'][i]||'🪦'} ${escapeProfileText(playerDisplayName(name))}</h3><small>✨ ${v.legendary} lendários • ⚖️ ${v.best.toFixed(2)} kg • 🎣 ${v.catches} capturas</small></div>`).join('')||'<div class="card">A lápide está vazia. Pesque para gravar seu primeiro registro!</div>'}</div>`;
}

let demo={active:'Marley',users:{Marley:{coins:1635,bait:7,inventory:[]},Nyx:{coins:2400,bait:9,inventory:[{id:101,name:'Bagre Fantasma',rarity:'Épico',weight:13.2,value:620},{id:102,name:'Carpa Lunar',rarity:'Comum',weight:2.4,value:90}]}},listings:[],offers:[],nextId:1000};
try{let saved=JSON.parse(localStorage.getItem(demoKey));if(saved&&saved.users&&saved.listings&&saved.offers)demo=saved}catch{}
const profileKey='ravenaPlayerProfilesV1';
let playerProfiles={};
try{const stored=JSON.parse(localStorage.getItem(profileKey));if(stored&&typeof stored==='object'&&!Array.isArray(stored))playerProfiles=stored}catch{}
function playerDisplayName(key=demo.active){
 const fallback=key==='Marley'?'cape_lossi':key;
 return playerProfiles[key]?.name||fallback;
}
function safeProfileName(name){return String(name||'').trim().replace(/\s+/g,' ').slice(0,18)}
function escapeProfileText(value){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
// V6.4.49: varas por nivel, salvas localmente por perfil.
const RODS=[
 {id:'initial',name:'Vara inicial',level:1,bonus:0,desc:'Equilibrada para aprender a pescar.'},
 {id:'willow',name:'Vara de Salgueiro',level:10,bonus:.012,desc:'Leve e precisa. Pequena vantagem na raridade.'},
 {id:'moon',name:'Vara Lunar',level:25,bonus:.025,desc:'Afinidade com as aguas de Azarath.'},
 {id:'abyssal',name:'Vara Abissal',level:50,bonus:.038,desc:'Preparada para as profundezas.'},
 {id:'legend',name:'Vara Lenda de Azarath',level:75,bonus:.05,desc:'Recompensa de pescadores veteranos.'}
];
const rodStorageKey='ravenaRodsV649';
let equippedRods={};
try{const saved=JSON.parse(localStorage.getItem(rodStorageKey));if(saved&&typeof saved==='object'&&!Array.isArray(saved))equippedRods=saved}catch{}
function currentRod(){
 const level=playerXpInfo(progress.players[demo.active]||{}).level;
 const selected=RODS.find(r=>r.id===equippedRods[demo.active]&&r.level<=level);
 return selected||RODS[0];
}
function equipRod(id){
 const rod=RODS.find(r=>r.id===id);if(!rod)return;
 if(playerXpInfo(progress.players[demo.active]||{}).level<rod.level)return toast('🎣 Esta vara ainda nao foi desbloqueada.');
 equippedRods[demo.active]=id;
 try{localStorage.setItem(rodStorageKey,JSON.stringify(equippedRods))}catch{return toast('Nao foi possivel salvar a vara.')}
 updateHud();renderProfile();toast('🎣 '+rod.name+' equipada!');
}
function renderRodChoices(level){return `<div class="card"><b>🎣 Varas de pesca</b><p>Desbloqueie novas varas ao subir de nivel. A vantagem na raridade e pequena e nao substitui a habilidade.</p><div class="rod-choices">${RODS.map(rod=>`<div class="rod-option"><div><b>${rod.name}</b><small>${rod.desc} • Nivel ${rod.level} • Bonus +${Math.round(rod.bonus*1000)/10}%</small></div><button class="btn" ${level<rod.level?'disabled':''} onclick="equipRod('${rod.id}')">${level<rod.level?'🔒 Nv. '+rod.level:currentRod().id===rod.id?'Equipada':'Equipar'}</button></div>`).join('')}</div></div>`}
function renderProfile(){
 const b=document.getElementById('panelBody'),stats=progress.players[demo.active]||{};
 const captures=Math.max(0,Number(stats.catches)||0),legendary=Math.max(0,Number(stats.legendary)||0);
 const xpInfo=playerXpInfo(stats),level=xpInfo.level;
 const equipped=skins.find(x=>x.id===skinState.active)||skins[0];
 b.innerHTML=`<div class="eyebrow">Identidade do pescador • dados locais</div><h2>👤 Meu perfil</h2>
 <div class="profile-hero"><div class="profile-avatar">${skinState.model==='feminino'?'👩':'🧑'}🎣</div><div><h3>${escapeProfileText(playerDisplayName())}</h3><small>Nível ${level} • ${skinState.model==='feminino'?'Pescadora':'Pescador'}</small><div class="profile-xp"><i style="width:${xpInfo.percent}%"></i></div><small>${xpInfo.level===100?'Nível máximo • Prestígio em breve':`${xpInfo.current.toLocaleString('pt-BR')} / ${xpInfo.required.toLocaleString('pt-BR')} XP para o próximo nível`}</small><small>✨ ${xpInfo.xp.toLocaleString('pt-BR')} / 1.000.000 XP • ${xpInfo.title}</small></div></div>
 <label class="profile-label" for="profileNameInput">Editar nome do jogador</label>
 <div class="profile-edit"><input id="profileNameInput" maxlength="18" autocomplete="off" placeholder="Nome do pescador" value="${escapeProfileText(playerDisplayName())}"><button class="btn" onclick="savePlayerName()">Salvar</button></div>
 <small>De 3 a 18 caracteres. O nome é salvo neste navegador e não altera sua conta de teste nem suas moedas.</small>
 <div class="card"><b>🔮 Bênção da Ravena</b><p>${activeRavenaBuff()?RAVENA_BUFFS[activeRavenaBuff()].name+' • '+buffRemaining()+' min restantes':'Nenhuma bênção ativa'}</p><small>${activeRavenaBuff()?RAVENA_BUFFS[activeRavenaBuff()].desc:'Visite o santuário e ofereça um peixe para receber um buff.'}</small></div>
 ${renderRodChoices(level)}
 <div class="card"><b>🏆 Recompensas de evolução</b><p>${nextLevelMilestone(level)?`Próximo marco: nível ${nextLevelMilestone(level).level} • ${nextLevelMilestone(level).name}`:'Todos os marcos concluídos! Lenda de Azarath.'}</p><small>As recompensas são entregues uma única vez ao alcançar os níveis 5, 10, 25, 50, 75 e 100. ${Array.isArray(stats.claimedMilestones)?stats.claimedMilestones.length:0} de 6 marcos recebidos.</small></div>
 <div class="profile-stats"><div>🎣 <b>${captures}</b><small>Capturas</small></div><div>✨ <b>${legendary}</b><small>Lendários</small></div><div>⚖️ <b>${Number(stats.best||0).toFixed(2)} kg</b><small>Recorde</small></div><div>🪙 <b>${coins}</b><small>Moedas</small></div></div>
 <div class="card"><b>🎭 Skin equipada</b><p>${escapeProfileText(equipped.name)}</p><button class="btn" onclick="openPanel('skins')">Abrir guarda-roupa</button></div>
 <p class="disclaimer">Perfil de demonstração local. Não é login online nem sincronização entre celulares.</p>`;
}
function savePlayerName(){
 const input=document.getElementById('profileNameInput');if(!input)return;
 const name=safeProfileName(input.value);
 if(name.length<3||!/^[\p{L}\p{N}_ .-]+$/u.test(name)){toast('Use 3 a 18 caracteres: letras, números, espaço, _ . ou -');return}
 playerProfiles[demo.active]={...(playerProfiles[demo.active]||{}),name};
 try{localStorage.setItem(profileKey,JSON.stringify(playerProfiles))}catch{toast('Não foi possível salvar o nome neste navegador.');return}
 document.getElementById('playerName').textContent=name;updateRpgProfile();
 renderProfile();toast('👤 Nome atualizado!');
}
function updateRpgProfile(){
 const stats=progress.players[demo.active]||{};
 const catches=Math.max(0,Math.floor(Number(stats.catches)||0));
 const xpInfo=playerXpInfo(stats),level=xpInfo.level;
 const equipped=skins.find(x=>x.id===skinState.active)||skins[0];
 document.getElementById('playerName').textContent=playerDisplayName();
 document.getElementById('rpgLevel').textContent='Nv. '+level;
 document.getElementById('rpgTitle').textContent=xpInfo.title;
 document.getElementById('rpgFish').textContent=catches.toLocaleString('pt-BR');
 document.getElementById('rpgXpFill').style.width=xpInfo.percent+'%';
 const xpBar=document.querySelector('.rpg-xp');xpBar.setAttribute('aria-valuenow',String(Math.round(xpInfo.percent)));xpBar.setAttribute('aria-valuetext',level===100?'Nível máximo':xpInfo.current+' de '+xpInfo.required+' XP para o próximo nível');
 document.getElementById('rpgXpText').textContent=level===100?'Nível máximo':xpInfo.current.toLocaleString('pt-BR')+' / '+xpInfo.required.toLocaleString('pt-BR')+' XP';
 // Vara inicial é o equipamento atual; skins não modificam o desempenho da vara.
 document.getElementById('rpgRod').textContent=currentRod().name;
 document.querySelector('.rpg-portrait').textContent=skinState.model==='feminino'?'👩🎣':'🧑🎣';
 document.getElementById('rpgProfile').title=activeRavenaBuff()?'🔮 '+RAVENA_BUFFS[activeRavenaBuff()].name+' • '+buffRemaining()+' min':'Sem bênção ativa';
 document.getElementById('rpgProfile').setAttribute('aria-label','Abrir perfil de '+playerDisplayName()+', nível '+level+', '+catches+' peixes capturados');
}
function me(){return demo.users[demo.active]}
function syncFromAccount(){loadSkinProfile();ravenaBlessingUntil=progress.blessingUntil[demo.active]||0;selectedRavenaBuff=progress.blessingType[demo.active]||'sorte';coins=me().coins;bait=me().bait;inventory=me().inventory;updateHud();document.getElementById('playerName').textContent=playerDisplayName();updateRpgProfile()}
function syncToAccount(){me().coins=coins;me().bait=bait;me().inventory=inventory}
function save(){syncToAccount();localStorage.setItem(demoKey,JSON.stringify(demo))}
function switchPlayer(){if(scene!=='market')return toast('Entre no Mercado Noturno.');save();demo.active=demo.active==='Marley'?'Nyx':'Marley';syncFromAccount();save();openPanel('market');toast('🎭 Agora você está testando como '+demo.active)}
function safeNum(v){return Math.max(1,Math.min(999999,Math.floor(Number(v)||0)))}
function openPanel(type){if(type==='market'&&scene!=='market'){toast('🌹 Entre no Mercado Noturno para negociar.');return;}let b=document.getElementById('panelBody');
 if(type==='shop')b.innerHTML=`<div class="eyebrow">Mercadora da Lua</div><h2>🏮 Loja de Pesca</h2><p>Loja do sistema: compre iscas para pescar.</p><div class="cards"><div class="card"><h3>🪱 Pacote de Iscas</h3><small>+5 iscas</small><div class="row"><b class="price">🪙 120</b><button class="btn" onclick="buyBait()">Comprar</button></div></div></div>`;
 else if(type==='market')renderMarket(b);
 else if(type==='ranking')renderRanking(b);
 else if(type==='statue')renderStatue(b);
 else if(type==='skins')renderSkins();
 else if(type==='profile')renderProfile();
 else renderInventory(b);
 document.getElementById('panel').classList.add('show')}
// V6.4.40: filtros locais da mochila; não alteram o progresso salvo.
let inventoryFilter='Todos',inventoryOrder='recentes';
const rarityOrder={'Comum':0,'Incomum':1,'Raro':2,'Épico':3,'Lendário':4};
function inventoryView(){
 let items=inventory.filter(f=>inventoryFilter==='Todos'||f.rarity===inventoryFilter).slice();
 if(inventoryOrder==='valor')items.sort((a,b)=>b.value-a.value);
 else if(inventoryOrder==='peso')items.sort((a,b)=>b.weight-a.weight);
 else if(inventoryOrder==='raridade')items.sort((a,b)=>(rarityOrder[b.rarity]??0)-(rarityOrder[a.rarity]??0));
 else items.reverse();
 return items;
}
function setInventoryFilter(v){inventoryFilter=v;renderInventory()}
function setInventoryOrder(v){inventoryOrder=v;renderInventory()}
function sellCommonFish(){
 const commons=inventory.filter(f=>f.rarity==='Comum');
 if(!commons.length)return toast('Nenhum peixe comum na mochila.');
 const total=commons.reduce((n,f)=>n+ravenaSaleValue(f.value),0);
 if(!confirm(`Vender ${commons.length} peixe(s) comum(ns) por ${total} moedas? Essa ação não pode ser desfeita.`))return;
 const ids=new Set(commons.map(f=>f.id));inventory=inventory.filter(f=>!ids.has(f.id));coins+=total;
 updateHud();save();renderInventory();toast(`🪙 ${commons.length} peixes comuns vendidos por ${total} moedas.`);
}
function renderInventory(b=document.getElementById('panelBody')){
 const weight=bagWeight(),items=inventoryView(),total=inventory.reduce((n,f)=>n+f.value,0);
 const options=['Todos','Comum','Incomum','Raro','Épico','Lendário'];
 b.innerHTML=`<div class="eyebrow">Mochila de ${escapeProfileText(playerDisplayName())}</div><h2>🎒 Inventário</h2>
 <p>${inventory.length} peixe(s) • ${weight.toFixed(1)}/100 kg • valor estimado 🪙 ${total.toLocaleString('pt-BR')}</p>
 <div class="inventory-tools"><label>Raridade <select aria-label="Filtrar por raridade" onchange="setInventoryFilter(this.value)">${options.map(v=>`<option value="${v}" ${v===inventoryFilter?'selected':''}>${v}</option>`).join('')}</select></label>
 <label>Ordenar <select aria-label="Ordenar peixes" onchange="setInventoryOrder(this.value)"><option value="recentes" ${inventoryOrder==='recentes'?'selected':''}>Mais recentes</option><option value="valor" ${inventoryOrder==='valor'?'selected':''}>Maior valor</option><option value="peso" ${inventoryOrder==='peso'?'selected':''}>Maior peso</option><option value="raridade" ${inventoryOrder==='raridade'?'selected':''}>Raridade</option></select></label></div>
 <div class="row inventory-actions"><button class="btn" onclick="sellCommonFish()" ${inventory.some(f=>f.rarity==='Comum')?'':'disabled'}>🪙 Vender peixes comuns</button></div>
 <p class="disclaimer">A venda em lote exige confirmação. Peixes raros, épicos e lendários nunca entram nessa venda.</p>
 <div class="cards">${items.map(f=>`<div class="card"><h3>🐟 ${escapeProfileText(f.name)}</h3><small>${escapeProfileText(f.rarity)} • ${Number(f.weight).toFixed(2)} kg</small><div class="row"><span class="price">🪙 ${f.value}</span><button class="btn" onclick="sellFish(${Number(f.id)})">Venda rápida</button></div><div class="row"><button class="btn" onclick="createListing(${Number(f.id)})" ${scene==='market'?'':'disabled'}>🌹 Anunciar no Mercado</button><button class="btn" onclick="createOffer(${Number(f.id)})" ${scene==='market'?'':'disabled'}>🔄 Oferecer trade</button></div></div>`).join('')||'<div class="card">Nenhum peixe neste filtro. Experimente outra raridade ou vá pescar.</div>'}</div>`;
}

function marketTabs(){return `<div class="market-tools"><span>🎭 Jogador de teste: <b>${escapeProfileText(playerDisplayName())}</b></span><button class="btn" onclick="switchPlayer()">Alternar cape_lossi / Nyx</button></div><div class="market-tools"><button class="btn" onclick="openPanel('inventory')">🎒 Meu inventário / Anunciar</button><button class="btn" onclick="renderMarket()">🌹 Atualizar Mercado</button></div>`}
function renderMarket(b=document.getElementById('panelBody')){if(scene!=='market')return toast('Entre no Mercado Noturno para negociar.');
 let listings=demo.listings.map(l=>{let mine=l.seller===demo.active;return `<div class="card"><h3>🐟 ${l.fish.name}</h3><small>${l.fish.rarity} • ${l.fish.weight} kg • vendedor: ${escapeProfileText(playerDisplayName(l.seller))}</small><div class="row"><b class="price">🪙 ${l.price}</b><button class="btn" onclick="${mine?'cancelListing':'buyListing'}(${l.id})">${mine?'Cancelar anúncio':'Comprar'}</button></div></div>`}).join('');
 let offers=demo.offers.map(o=>{let mine=o.from===demo.active,other=demo.users[demo.active].inventory;return `<div class="card"><h3>🔄 ${o.fish.name}</h3><small>${o.fish.weight} kg • oferecido por ${escapeProfileText(playerDisplayName(o.from))}</small><p>${mine?'Aguardando outro jogador aceitar.':'Selecione um peixe seu para dar em troca.'}</p><div class="row">${mine?`<button class="btn" onclick="cancelOffer(${o.id})">Cancelar oferta</button>`:`<select id="trade-${o.id}" aria-label="Peixe para trocar">${other.map(f=>`<option value="${f.id}">${f.name} (${f.weight} kg)</option>`).join('')}</select><button class="btn" onclick="acceptOffer(${o.id})" ${other.length?'':'disabled'}>Aceitar troca</button>`}</div></div>`}).join('');
 b.innerHTML=`<div class="eyebrow">Negociações entre jogadores • demonstração local</div><h2>🌹 Mercado Noturno</h2><p>Os anúncios e trocas ficam reservados até serem comprados, cancelados ou aceitos.</p>${marketTabs()}<h3>🪙 Compra e venda</h3><div class="cards">${listings||'<div class="card">Nenhum peixe anunciado. Abra o inventário e anuncie um.</div>'}</div><h3>🤝 Trocas diretas</h3><div class="cards">${offers||'<div class="card">Nenhuma oferta de troca. Abra o inventário para oferecer um peixe.</div>'}</div><p class="disclaimer">Teste no mesmo navegador: alternar perfil não representa multiplayer online.</p>`}
function buyBait(){if(coins<120)return toast('Saldo insuficiente.');coins-=120;bait+=5;updateHud();save();toast('🪱 +5 iscas adicionadas.')}
function sellFish(id){let i=inventory.findIndex(x=>x.id===id);if(i<0)return;let f=inventory[i];const payout=ravenaSaleValue(f.value);coins+=payout;inventory.splice(i,1);updateHud();save();renderInventory();toast(`🪙 ${payout} moedas pela venda ao sistema${payout>f.value?' (bônus da Ravena)':''}.`)}
function createListing(id){if(scene!=='market')return toast('🌹 Negociações só são permitidas no Mercado Noturno.');let f=inventory.find(x=>x.id===id);if(!f)return;let price=prompt(`Preço em moedas para ${f.name}:`,String(f.value));if(price===null)return;price=safeNum(price);if(!price)return toast('Preço inválido.');inventory=inventory.filter(x=>x.id!==id);demo.listings.push({id:++demo.nextId,seller:demo.active,fish:f,price});save();updateHud();renderMarket();toast('🌹 Peixe anunciado! Troque para Nyx para testar a compra.')}
function bagWeight(){return inventory.reduce((a,f)=>a+(Number(f.weight)||0),0)}
function canCarry(weight){return bagWeight()+Number(weight)<=100.0001}
function buyListing(id){if(scene!=='market')return toast('🌹 Negociações só são permitidas no Mercado Noturno.');let l=demo.listings.find(x=>x.id===id);if(!l||l.seller===demo.active)return toast('Você não pode comprar seu anúncio.');if(coins<l.price)return toast('Saldo insuficiente.');if(!canCarry(l.fish.weight))return toast('🎒 Mochila cheia para receber este peixe.');let seller=demo.users[l.seller];if(!seller)return toast('Vendedor indisponível.');coins-=l.price;seller.coins+=l.price;if(!canCarry(l.fish.weight))return toast('🎒 Sem espaço para cancelar o anúncio.');inventory.push(l.fish);demo.listings=demo.listings.filter(x=>x.id!==id);save();updateHud();renderMarket();toast(`🐟 Compra concluída! ${l.seller} recebeu 🪙 ${l.price}.`)}
function cancelListing(id){if(scene!=='market')return toast('🌹 Negociações só são permitidas no Mercado Noturno.');let l=demo.listings.find(x=>x.id===id);if(!l||l.seller!==demo.active)return;if(!canCarry(l.fish.weight))return toast('🎒 Sem espaço para cancelar o anúncio.');inventory.push(l.fish);demo.listings=demo.listings.filter(x=>x.id!==id);save();updateHud();renderMarket();toast('Anúncio cancelado; peixe devolvido.')}
function createOffer(id){if(scene!=='market')return toast('🌹 Negociações só são permitidas no Mercado Noturno.');let f=inventory.find(x=>x.id===id);if(!f)return;inventory=inventory.filter(x=>x.id!==id);demo.offers.push({id:++demo.nextId,from:demo.active,fish:f});save();updateHud();renderMarket();toast('🤝 Oferta criada. Troque de jogador para aceitar.')}
function cancelOffer(id){if(scene!=='market')return toast('🌹 Negociações só são permitidas no Mercado Noturno.');let o=demo.offers.find(x=>x.id===id);if(!o||o.from!==demo.active)return;if(!canCarry(o.fish.weight))return toast('🎒 Sem espaço para cancelar a oferta.');inventory.push(o.fish);demo.offers=demo.offers.filter(x=>x.id!==id);save();updateHud();renderMarket();toast('Oferta cancelada.')}
function acceptOffer(id){if(scene!=='market')return toast('🌹 Negociações só são permitidas no Mercado Noturno.');let o=demo.offers.find(x=>x.id===id);if(!o||o.from===demo.active)return;let selector=document.getElementById('trade-'+id),fishId=Number(selector?.value),idx=inventory.findIndex(f=>f.id===fishId);if(idx<0)return toast('Você precisa ter um peixe para trocar.');let given=inventory[idx];if(bagWeight()-given.weight+o.fish.weight>100.0001)return toast('🎒 Mochila cheia para esta troca.');let recipient=demo.users[o.from];if(!recipient||recipient.inventory.reduce((a,f)=>a+(Number(f.weight)||0),0)+given.weight>100.0001)return toast('🎒 O outro jogador está sem espaço na mochila.');inventory.splice(idx,1);demo.users[o.from].inventory.push(given);if(!canCarry(o.fish.weight))return toast('🎒 Sem espaço para cancelar a oferta.');inventory.push(o.fish);demo.offers=demo.offers.filter(x=>x.id!==id);save();updateHud();renderMarket();toast('🤝 Troca concluída! Cada jogador recebeu o peixe do outro.')}
function transition(name,cb){let el=document.getElementById('roseTransition');document.getElementById('roseText').textContent='Entrando em '+name+'...';el.classList.add('show');setTimeout(()=>{cb();setTimeout(()=>el.classList.remove('show'),180)},520)}
function toast(s){let t=document.getElementById('toast');t.innerHTML=s;t.classList.add('show');clearTimeout(t._to);t._to=setTimeout(()=>t.classList.remove('show'),2400)}
function updateHud(){document.getElementById('coins').textContent=coins;document.getElementById('bait').textContent=bait;document.getElementById('bag').textContent=bagWeight().toFixed(1);updateRpgProfile()}
syncFromAccount();
function bindTap(el,fn){let fired=0;el.addEventListener('pointerup',e=>{e.preventDefault();e.stopPropagation();fired=Date.now();fn(e)});el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(Date.now()-fired>450)fn(e)})}
bindTap(document.getElementById('closePanel'),()=>document.getElementById('panel').classList.remove('show'));document.getElementById('panel').addEventListener('pointerup',e=>{if(e.target.id==='panel')e.currentTarget.classList.remove('show')});bindTap(document.getElementById('rpgProfile'),()=>openPanel('profile'));bindTap(document.getElementById('bagBtn'),()=>openPanel('inventory'));bindTap(document.getElementById('skinBtn'),()=>openPanel('skins'));bindTap(document.getElementById('action'),interact);
// Botões criados dentro dos painéis usam delegação para responder melhor a toque no celular.
// Botões internos usam click nativo, evitando disparos duplicados no toque.
let joyX=0,joyY=0,joy=document.getElementById('joy'),stick=document.getElementById('stick'),jid=null;
function resetJoystick(){jid=null;joyX=joyY=0;stick.style.transform='';}
function joyMove(e){
 const t=Array.from(e.changedTouches).find(x=>x.identifier===jid);
 if(!t)return;
 const r=joy.getBoundingClientRect();
 let dx=t.clientX-(r.left+r.width/2),dy=t.clientY-(r.top+r.height/2);
 const m=Math.hypot(dx,dy),max=Math.max(24,Math.min(r.width,r.height)*.29);
 // Small dead zone keeps the character still when a finger is near center.
 if(m<5){dx=0;dy=0;}
 else if(m>max){dx=dx/m*max;dy=dy/m*max;}
 joyX=dx/max;joyY=dy/max;
 stick.style.transform=`translate(${dx}px,${dy}px)`;
}
joy.addEventListener('touchstart',e=>{
 if(jid!==null)return;
 jid=e.changedTouches[0].identifier;
 e.preventDefault();joyMove(e);
},{passive:false});
joy.addEventListener('touchmove',e=>{if(jid!==null){e.preventDefault();joyMove(e);}},{passive:false});
for(const event of ['touchend','touchcancel'])joy.addEventListener(event,e=>{
 if(Array.from(e.changedTouches).some(t=>t.identifier===jid)){e.preventDefault();resetJoystick();}
},{passive:false});
addEventListener('blur',()=>{resetJoystick();for(const key in keys)keys[key]=false;});

function drawRemotePlayers(){
  if(!window.RavenaOnline)return;
  for(const p of RavenaOnline.getPeers()){
    const x=p.x-cam.x,y=p.y-cam.y;
    if(x < -30 || y < -40 || x > W+30 || y > H+30)continue;
    ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(x,y+15,16,6,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#9e62ba';ctx.beginPath();ctx.arc(x,y-7,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#553a75';ctx.fillRect(x-10,y+3,20,17);
    ctx.fillStyle='#fff';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText(p.name,x,y-24);
  }
}
if(window.RavenaOnline){
  RavenaOnline.subscribe((status,count)=>{
    const el=document.getElementById('onlineStatus');if(!el)return;
    el.textContent=status==='online'?`● Online • ${count+1} jogadores`:status==='connecting'?'◌ Conectando...':status==='error'?'● Sem conexão':'◌ Modo solo';
    el.dataset.status=status;
  });
}
// V6.3.6: perspectiva diagonal 2.5D aplicada apenas ao mundo (HUD permanece plano).
// A fisica e as colisoes continuam em coordenadas de mundo para evitar regressao.
const VIEW_SHEAR=.19, VIEW_DEPTH=.86;
// V6.4.52: graphics quality selector and optional measured FPS.
const graphicsPanel=document.getElementById('graphicsPanel');
const graphicsQuality=document.getElementById('graphicsQuality');
const graphicsFpsToggle=document.getElementById('graphicsShowFps');
const graphicsFpsReadout=document.getElementById('graphicsFps');
function persistGraphics(){try{localStorage.setItem(GRAPHICS_KEY,JSON.stringify(graphicsSettings));}catch(e){}}
function updateFrameCap(){const q=GRAPHICS_LEVELS[graphicsSettings.quality];const cap=q.cap||(innerWidth<=720||reducedMotion?.matches?30:60);minFrameMs=1000/(reducedMotion?.matches?Math.min(cap,30):cap);}
graphicsQuality.value=graphicsSettings.quality;
graphicsFpsToggle.checked=graphicsSettings.showFps;
graphicsFpsReadout.hidden=!graphicsSettings.showFps;
graphicsQuality.addEventListener('change',()=>{if(!GRAPHICS_LEVELS[graphicsQuality.value])return;graphicsSettings.quality=graphicsQuality.value;persistGraphics();resize();updateFrameCap();});
graphicsFpsToggle.addEventListener('change',()=>{graphicsSettings.showFps=graphicsFpsToggle.checked;graphicsFpsReadout.hidden=!graphicsSettings.showFps;persistGraphics();});
document.getElementById('graphicsOpen').addEventListener('click',()=>{graphicsPanel.hidden=!graphicsPanel.hidden;});
document.getElementById('graphicsClose').addEventListener('click',()=>{graphicsPanel.hidden=true;});
let fpsFrames=0,fpsStart=performance.now();
// V6.4.51: stable frame pacing and reduced background work.
let lastRendered=0,lastPeerSync=0;
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
let minFrameMs=(innerWidth<=720||reducedMotion?.matches)?1000/30:1000/60;
addEventListener('resize',updateFrameCap,{passive:true});updateFrameCap();
document.addEventListener('visibilitychange',()=>{last=performance.now();lastRendered=0;});
function loop(now){
 if(document.hidden){last=now;requestAnimationFrame(loop);return;}
 if(now-lastRendered<minFrameMs-1){requestAnimationFrame(loop);return;}lastRendered=now;
 if(graphicsSettings.showFps){fpsFrames++;if(now-fpsStart>=1000){graphicsFpsReadout.textContent=Math.round(fpsFrames*1000/(now-fpsStart))+' FPS';fpsFrames=0;fpsStart=now;}}
 else{fpsFrames=0;fpsStart=now;}
 let dt=Math.max(0,Math.min((now-last)/1000,.05));last=now;update(dt);
 ctx.setTransform(DPR*cameraScale,0,0,DPR*cameraScale,0,0);
 ctx.clearRect(0,0,W,H);
 ctx.save();
 // Inclina o plano do terreno e comprime a profundidade vertical.
 ctx.transform(1,0,VIEW_SHEAR,VIEW_DEPTH,-VIEW_SHEAR*H/2,(1-VIEW_DEPTH)*H/2);
 ground();drawRemotePlayers();playerDraw();drawForeground(now);
 ctx.restore();
 if(window.RavenaOnline&&scene==='lake'&&now-lastPeerSync>=120){lastPeerSync=now;RavenaOnline.move(player.x,player.y);}
 requestAnimationFrame(loop);
}ensureSafePosition();requestAnimationFrame(loop);
