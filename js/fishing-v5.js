/* Ravena Fishing V5 - standalone mobile-first skill minigame */
(()=>{
const overlay=document.getElementById('fishingOverlay'), title=document.getElementById('fishingTitle'),
info=document.getElementById('fishingInfo'), action=document.getElementById('fishingAction'),
target=document.getElementById('fishingTarget'),needle=document.getElementById('fishingNeedle'),
progressFill=document.getElementById('fishingProgressFill');
let state=null,frame=0,held=false;
const now=()=>performance.now();
function stop(success){
 if(!state)return;
 const old=state;state=null;held=false;cancelAnimationFrame(frame);overlay.hidden=true;
 if(success)old.onCatch(Math.max(0,1-old.elapsed/16));
 else old.onMiss();
}
function tick(t){
 if(!state)return;
 const dt=Math.min(.05,(t-state.prev)/1000);state.prev=t;
 if(state.phase==='cast'){
  if(t-state.start>1400){
   state.phase='hook';state.elapsed=0;title.textContent='🐟 FISGOU!';info.textContent='Mantenha a linha na zona violeta sem estourar a tensão.';
   action.disabled=false;action.textContent='PUXAR LINHA';
  }
 }else{
  state.elapsed+=dt;
  state.target=.5+Math.sin(t*.0015)*.27;
  state.position=Math.max(0,Math.min(1,state.position+(held?.55:-.33)*dt));
  const distance=Math.abs(state.position-state.target);
  if(held){state.tension+=dt*(distance<.14?.035:.22)}else state.tension-=dt*.28;
  state.tension=Math.max(0,Math.min(1,state.tension));
  if(distance<.14&&held)state.progress+=dt*.20;
  else state.progress-=dt*.045;
  state.progress=Math.max(0,Math.min(1,state.progress));
  target.style.left=`${state.target*100}%`;needle.style.left=`${state.position*100}%`;
  progressFill.style.width=`${state.progress*100}%`;
  progressFill.style.background=state.tension>.75?'#f46b82':'#c786ff';
  info.textContent=`Captura ${Math.round(state.progress*100)}% • Tensão ${Math.round(state.tension*100)}%`;
  if(state.progress>=1)return stop(true);
  if(state.tension>=1||state.elapsed>24)return stop(false);
 }
 frame=requestAnimationFrame(tick);
}
function setHeld(v){held=!!v}
action.addEventListener('pointerdown',e=>{e.preventDefault();setHeld(true);try{action.setPointerCapture(e.pointerId)}catch{}});
for(const ev of ['pointerup','pointercancel','lostpointercapture','pointerleave'])action.addEventListener(ev,()=>setHeld(false));
addEventListener('keydown',e=>{if(e.code==='Space'&&state?.phase==='hook'){e.preventDefault();setHeld(true)}});
addEventListener('keyup',e=>{if(e.code==='Space')setHeld(false)});
window.RavenaFishing={
 get active(){return !!state},
 start({onCatch,onMiss}){
  if(state)return;
  held=false;state={phase:'cast',start:now(),prev:now(),position:.5,target:.5,progress:0,tension:0,elapsed:0,onCatch,onMiss};
  title.textContent='🌙 Lançando a linha...';info.textContent='Observe a água. A fisgada está chegando.';
  action.disabled=true;action.textContent='AGUARDAR...';target.style.left='50%';needle.style.left='50%';progressFill.style.width='0%';
  overlay.hidden=false;frame=requestAnimationFrame(tick);
 }
};
})();
