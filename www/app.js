'use strict';
const BIT={up:1,down:2,left:4,right:8,start:16,back:32,ls:64,rs:128,lb:256,rb:512,guide:1024,a:4096,b:8192,x:16384,y:32768};
const $=s=>document.querySelector(s),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=a=>{a%=360;return a>180?a-360:a<=-180?a+360:a};
const cfg={lock:540,src:'gyro',dead:2,curve:1,invert:false,fuse:true,autoc:true,phys:true,layout:'Volante',vol:{up:'none',down:'none'},ffb:100,pull:60};
try{Object.assign(cfg,JSON.parse(localStorage.getItem('pp')))}catch(e){}
const save=()=>{try{localStorage.setItem('pp',JSON.stringify(cfg))}catch(e){}};
const S={btn:0,ltB:0,rtB:0,ltP:0,rtP:0,lsx:0,lsy:0,rsx:0,rsy:0,angle:0,touch:0,held:false,th:null,got:false,wheel:false,rum:0};
const src=()=>S.tl?'touch':cfg.src;
const lim=()=>Math.max(10,cfg.lock)/2;

/* ---------- layouts ---------- */
const B=(bind,label,x,y,s,c,shape)=>({t:'btn',bind,label,x,y,s,c,shape:shape||''});
const P=(bind,label,x,y)=>({t:'pedal',bind,label,x,y,s:11,c:bind==='lt'?'#ef4444':'#22c55e'});
const G='#64748b';
const LAYOUTS={
 Gamepad:[B('lt','LT',9,12,13,G,'pill'),B('lb','LB',9,27,13,G,'pill'),B('rt','RT',91,12,13,G,'pill'),B('rb','RB',91,27,13,G,'pill'),
  {t:'stick',bind:'left',x:17,y:64,s:30},{t:'dpad',x:38,y:80,s:22},{t:'stick',bind:'right',x:63,y:76,s:26},
  B('y','Y',86,44,12,'#eab308'),B('x','X',78,58,12,'#3b82f6'),B('b','B',94,58,12,'#ef4444'),B('a','A',86,72,12,'#22c55e'),
  B('back','⧉',42,11,9,G,'pill'),B('start','☰',58,11,9,G,'pill'),B('menu','⚙',50,26,8,'#475569')],
 'Volante na tela':[{t:'wheel',x:36,y:56,s:72,c:'#e2e8f0',touch:1},B('lb','−',10,24,12,G),B('rb','+',62,24,12,G),
  P('lt','FREIO',80,66),P('rt','ACEL',92,66),B('back','⧉',16,11,9,G,'pill'),B('recenter','⟲',30,11,9,'#0ea5e9'),
  B('y','Y',72,11,8,'#eab308'),B('x','X',79,11,8,'#3b82f6'),B('b','B',86,11,8,'#ef4444'),B('start','☰',94,24,9,G,'pill'),B('menu','⚙',95,11,8,'#475569')],
 Volante:[{t:'wheel',x:50,y:58,s:62,c:'#e2e8f0'},{t:'dpad',x:13,y:72,s:22},B('lb','−',10,28,12,G),B('rb','+',90,28,12,G),
  P('lt','FREIO',79,66),P('rt','ACEL',92,66),B('back','⧉',16,11,9,G,'pill'),B('recenter','⟲',28,11,9,'#0ea5e9'),
  B('y','Y',40,11,8,'#eab308'),B('x','X',47,11,8,'#3b82f6'),B('b','B',54,11,8,'#ef4444'),B('a','A',61,11,8,'#22c55e'),
  B('start','☰',84,11,9,G,'pill'),B('menu','⚙',95,11,8,'#475569')]};
const DEF=JSON.parse(JSON.stringify(LAYOUTS));
try{Object.assign(LAYOUTS,JSON.parse(localStorage.getItem('pp_lay')))}catch(e){}
const WHEEL='<svg viewBox="-50 -50 100 100"><circle class="s" r="44" stroke-width="7"/><circle class="f" r="9"/><path class="s" d="M-42 0H-9M42 0H9M0 9V42" stroke-width="6" stroke-linecap="round"/><rect x="-4" y="-50" width="8" height="12" rx="2" fill="#ef4444"/></svg><b>0°</b>';

/* ---------- controles na tela ---------- */
function touch(el,down,move,up){let id=null;
  el.onpointerdown=e=>{if(id!==null)return;id=e.pointerId;el.setPointerCapture(id);el.classList.add('on');down(e)};
  el.onpointermove=e=>{if(e.pointerId===id&&move)move(e)};
  const end=e=>{if(e.pointerId!==id)return;id=null;el.classList.remove('on');up(e)};
  el.onpointerup=end;el.onpointercancel=end}
function act(b,on){
  if(b==='recenter'){if(on)recenter();return}
  if(b==='menu'){if(on)openPanel();return}
  if(b==='lt'){S.ltB=on;return}if(b==='rt'){S.rtB=on;return}
  S.btn=on?S.btn|BIT[b]:S.btn&~BIT[b]}
function build(it){
  const el=document.createElement('div');el.className='it '+it.t+' '+(it.shape||'');
  el.style.cssText=`left:${it.x}%;top:${it.y}%;--s:${it.s};--c:${it.c||'#94a3b8'}`;
  if(it.t==='btn'){el.textContent=it.label;touch(el,()=>act(it.bind,1),null,()=>act(it.bind,0))}
  else if(it.t==='pedal'){el.innerHTML='<div class="fill"></div><span>'+it.label+'</span>';
    const f=el.firstChild,k=it.bind==='lt'?'ltP':'rtP';
    const set=e=>{const r=el.getBoundingClientRect();S[k]=clamp(1-(e.clientY-r.top)/r.height,0,1);f.style.height=S[k]*100+'%'};
    touch(el,set,set,()=>{S[k]=0;f.style.height=0})}
  else if(it.t==='stick'){el.innerHTML='<div class="th"></div>';
    const th=el.firstChild,R=it.bind==='right';let cx,cy,rad;
    const upd=e=>{let dx=e.clientX-cx,dy=e.clientY-cy;const d=Math.hypot(dx,dy);if(d>rad){dx*=rad/d;dy*=rad/d}
      th.style.transform=`translate(${dx}px,${dy}px)`;S[R?'rsx':'lsx']=dx/rad;S[R?'rsy':'lsy']=-dy/rad};
    touch(el,e=>{const r=el.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;rad=r.width*.29;upd(e)},upd,
      ()=>{th.style.transform='';S[R?'rsx':'lsx']=S[R?'rsy':'lsy']=0})}
  else if(it.t==='dpad'){el.innerHTML='<i class="up">▲</i><i class="left">◀</i><i class="right">▶</i><i class="down">▼</i>';
    const M=15,upd=e=>{const r=el.getBoundingClientRect(),nx=(e.clientX-r.left)/r.width*2-1,ny=(e.clientY-r.top)/r.height*2-1;let m=0;
      if(Math.hypot(nx,ny)>.2){if(nx<-.35)m|=4;if(nx>.35)m|=8;if(ny<-.35)m|=1;if(ny>.35)m|=2}
      S.btn=(S.btn&~M)|m;for(const k of['up','down','left','right'])el.querySelector('.'+k).classList.toggle('on',!!(m&BIT[k]))};
    touch(el,upd,upd,()=>{S.btn&=~M;el.querySelectorAll('i').forEach(i=>i.classList.remove('on'))})}
  else if(it.t==='wheel'){el.innerHTML=WHEEL;let last=0;
    const ang=e=>{const r=el.getBoundingClientRect();return Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2)*57.29578};
    touch(el,e=>{if(src()==='touch'){S.held=true;last=ang(e)}},
      e=>{if(src()!=='touch')return;const a=ang(e);S.touch=clamp(S.touch+wrap(a-last),-lim(),lim());last=a},()=>{S.held=false})}
  return el}
const items=()=>LAYOUTS[cfg.layout]||LAYOUTS.Volante;
let editing=false,sel=-1;
function render(){const st=$('#stage'),L=items();st.innerHTML='';
  S.wheel=L.some(i=>i.t==='wheel');S.tl=L.some(i=>i.t==='wheel'&&i.touch);
  L.forEach((it,i)=>{const e=build(it);e.dataset.i=i;if(i===sel)e.classList.add('sel');st.appendChild(e)});st.classList.toggle('editing',editing)}

/* ---------- volante: giroscópio / inclinação / toque ---------- */
let lastT=0,ref=null,bias=0,calN=0,acc=0;const CAL=30;
function recenter(){S.angle=0;S.touch=0;ref=S.th;calN=CAL;acc=0;toast('Volante centralizado — segure parado')}
function onMotion(ev){
  S.got=true;if(!S.wheel||src()==='touch')return;
  const now=performance.now(),dt=lastT?Math.min((now-lastT)/1000,.1):0;lastT=now;
  const g=ev.accelerationIncludingGravity,r=ev.rotationRate;let th=null;
  // direção da "gravidade" no plano da tela: cresce quando o celular gira no sentido horário
  if(g&&g.x!=null&&Math.hypot(g.x,g.y)>3){const raw=Math.atan2(g.y,g.x)*57.29578;S.th=S.th==null?raw:S.th+wrap(raw-S.th)*.25;th=S.th}
  if(ref===null&&th!==null)ref=th;
  const L=lim();
  if(src()==='tilt'){if(th!==null&&ref!==null)S.angle=clamp(wrap(th-ref),-Math.min(L,90),Math.min(L,90));return}
  if(!r||r.alpha==null)return;
  if(calN>0){acc+=r.alpha;if(--calN===0){bias=acc/CAL;S.angle=0}return}
  S.angle-=(r.alpha-bias)*dt;                       // integra o giro (vale mais de 360°)
  if(cfg.fuse&&th!==null&&ref!==null&&dt>0){const t=wrap(th-ref);S.angle+=(t+360*Math.round((S.angle-t)/360)-S.angle)*Math.min(1,dt/3)}
  S.angle=clamp(S.angle,-L,L)}
async function sensors(){
  try{if(window.DeviceMotionEvent&&DeviceMotionEvent.requestPermission)await DeviceMotionEvent.requestPermission()}catch(e){}
  window.removeEventListener('devicemotion',onMotion);window.addEventListener('devicemotion',onMotion);
  setTimeout(()=>{if(!S.got&&S.wheel&&src()!=='touch')toast('Sem acesso aos sensores: use o app APK ou o modo Toque')},2500)}
function steer(){
  let v=clamp((src()==='touch'?S.touch:S.angle)/lim(),-1,1);const d=cfg.dead/100;
  v=Math.abs(v)<d?0:Math.sign(v)*(Math.abs(v)-d)/(1-d);v=Math.sign(v)*Math.pow(Math.abs(v),cfg.curve);
  return cfg.invert?-v:v}

/* ---------- estado enviado ao PC ---------- */
const PM=[BIT.a,BIT.b,BIT.x,BIT.y,BIT.lb,BIT.rb,0,0,BIT.back,BIT.start,BIT.ls,BIT.rs,BIT.up,BIT.down,BIT.left,BIT.right,BIT.guide];
function state(){
  let b=S.btn,lx=S.lsx,ly=S.lsy,rx=S.rsx,ry=S.rsy,lt=Math.max(S.ltB,S.ltP),rt=Math.max(S.rtB,S.rtP);
  if(S.wheel){const s=steer();if(Math.abs(s)>Math.abs(lx))lx=s}
  const gp=cfg.phys&&navigator.getGamepads?[...navigator.getGamepads()].find(g=>g&&g.connected&&g.mapping==='standard'):null;
  if(gp){PM.forEach((m,i)=>{if(m&&gp.buttons[i]&&gp.buttons[i].pressed)b|=m});
    lt=Math.max(lt,gp.buttons[6]?gp.buttons[6].value:0);rt=Math.max(rt,gp.buttons[7]?gp.buttons[7].value:0);
    const a=i=>Math.abs(gp.axes[i])>.1?gp.axes[i]:0;
    if(Math.abs(a(0))>Math.abs(lx))lx=a(0);if(Math.abs(a(1))>Math.abs(ly))ly=-a(1);
    if(Math.abs(a(2))>Math.abs(rx))rx=a(2);if(Math.abs(a(3))>Math.abs(ry))ry=-a(3)}
  const q=v=>Math.round(v*1000)/1000;
  return JSON.stringify({t:'s',b,lx:q(lx),ly:q(ly),rx:q(rx),ry:q(ry),lt:q(lt),rt:q(rt)})}

let ws=null,lastKey='',lastSend=0,tPrev=performance.now();
setInterval(()=>{const now=performance.now(),dt=(now-tPrev)/1000;tPrev=now;
  if(src()==='touch'){const k=S.rum*cfg.pull/100*8;if(k>0)S.touch*=Math.exp(-dt*k);if(cfg.autoc&&!S.held)S.touch*=Math.exp(-dt*5)}
  if(!ws||ws.readyState!==1)return;
  const k=state();if(k!==lastKey||now-lastSend>100){ws.send(k);lastKey=k;lastSend=now}},8);
setInterval(()=>{const w=$('.wheel');if(!w)return;const a=src()==='touch'?S.touch:S.angle;
  w.querySelector('b').textContent=Math.round(a)+'°';w.querySelector('svg').style.transform=src()==='touch'?`rotate(${a}deg)`:''},40);

/* ---------- conexão ---------- */
let tt,err='';
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2400)}
const msg=m=>$('#msg').textContent=m;
function show(on){$('#home').hidden=on;$('#stage').hidden=!on;$('#gear').hidden=!on;if(on){render();try{navigator.wakeLock&&navigator.wakeLock.request('screen').catch(()=>{})}catch(e){}}}
function connect(addr){
  addr=addr.trim().replace(/^wss?:\/\//,'').replace(/\/.*$/,'');
  if(!addr)return msg('Digite o IP que aparece no programa do PC.');
  if(!/:\d+$/.test(addr))addr+=':8765';
  try{localStorage.setItem('pp_addr',addr)}catch(e){}
  msg('Conectando…');err='';let w,ok=false;
  try{w=new WebSocket('ws://'+addr+'/ws')}catch(e){return msg('Endereço inválido.')}
  const to=setTimeout(()=>{if(!ok)w.close()},5000);
  w.onopen=()=>{ok=true;clearTimeout(to);ws=w;msg('');show(true);recenter();setCap()};
  w.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return}
    if(m.t==='hello')toast('Controle '+(m.slot+1));
    else if(m.t==='rumble'){S.rum=Math.max(m.l,m.s)/255;const g=cfg.ffb/100,l=Math.min(255,m.l*g),v=Math.min(255,m.s*g);
      if(window.PPNative&&PPNative.vibrate)PPNative.vibrate(Math.round(l),Math.round(v));
      else if(navigator.vibrate){const q=Math.max(l,v);navigator.vibrate(q>0?Math.round(20+q/255*80):0)}}
    else if(m.t==='err')err=m.m;else if(m.t==='full')err='O PC já tem 4 controles conectados.'};
  w.onclose=()=>{clearTimeout(to);if(ws===w){ws=null;S.rum=0;show(false);setCap();if(window.PPNative&&PPNative.vibrate)PPNative.vibrate(0,0)}msg(err||(ok?'Conexão encerrada.':'Não conectou. Confira IP, Wi-Fi e firewall.'))}}
$('#bConn').onclick=async()=>{await sensors();connect($('#addr').value)};
$('#bUsb').onclick=async()=>{await sensors();connect('localhost')};
try{$('#addr').value=localStorage.getItem('pp_addr')||'';if(location.port==='8765')$('#addr').value=location.hostname}catch(e){}

/* ---------- painel ---------- */
function sync(){$('#cLay').innerHTML=Object.keys(LAYOUTS).map(n=>'<option>'+n+'</option>').join('');$('#cLay').value=cfg.layout;$('#cSrc').value=cfg.src;$('#cLock').value=cfg.lock;
  $('#cDead').value=$('#vDead').textContent=cfg.dead;$('#cCurve').value=$('#vCurve').textContent=cfg.curve;
  $('#cPull').value=$('#vPull').textContent=cfg.pull;$('#cFfb').value=$('#vFfb').textContent=cfg.ffb;$('#cVu').value=cfg.vol.up;$('#cVd').value=cfg.vol.down;
  [['invert','cInv'],['fuse','cFuse'],['autoc','cAuto'],['phys','cPhys']].forEach(([k,id])=>$('#'+id).checked=cfg[k])}
function openPanel(){sync();$('#panel').hidden=false}
function setLock(v){cfg.lock=clamp(Math.round(v)||540,20,7200);
  if(cfg.src==='tilt'&&cfg.lock>180){cfg.src='gyro';toast('Acima de 180° o sensor muda para Giroscópio')}save();sync()}
$('#gear').onclick=openPanel;$('#bClose').onclick=()=>$('#panel').hidden=true;
$('#bRec').onclick=()=>{$('#panel').hidden=true;recenter()};
$('#bDisc').onclick=()=>{$('#panel').hidden=true;if(ws)ws.close()};
$('#cLock').onchange=e=>setLock(+e.target.value);
document.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>setLock(+b.dataset.l));
$('#cSrc').onchange=e=>{cfg.src=e.target.value;if(cfg.src==='tilt'&&cfg.lock>180)cfg.lock=180;S.angle=S.touch=0;save();sync()};
$('#cLay').onchange=e=>{cfg.layout=e.target.value;save();render()};
$('#cDead').oninput=e=>{cfg.dead=+e.target.value;$('#vDead').textContent=cfg.dead;save()};
$('#cCurve').oninput=e=>{cfg.curve=+e.target.value;$('#vCurve').textContent=cfg.curve;save()};
[['cInv','invert'],['cFuse','fuse'],['cAuto','autoc'],['cPhys','phys']].forEach(([id,k])=>$('#'+id).onchange=e=>{cfg[k]=e.target.checked;save()});

/* ---------- editor de layout ---------- */
const clone=o=>JSON.parse(JSON.stringify(o));
const persist=()=>{try{localStorage.setItem('pp_lay',JSON.stringify(LAYOUTS))}catch(e){}};
const cur=()=>items()[sel];
function fillLay(){$('#eLay').innerHTML=Object.keys(LAYOUTS).map(n=>'<option>'+n+'</option>').join('');$('#eLay').value=cfg.layout}
function setEdit(on){editing=on;sel=-1;$('#panel').hidden=true;$('#edbar').hidden=!on;$('#gear').hidden=on;if(on)fillLay();render();syncBar()}
function syncBar(){const it=cur(),b=$('#edbar');$('#eSel').hidden=!it;
  b.style.top=it&&it.y>50?'0':'auto';b.style.bottom=it&&it.y>50?'auto':'0';if(!it)return;
  $('#eSize').value=it.s;$('#eCol').value=/^#[0-9a-f]{6}$/i.test(it.c||'')?it.c:'#94a3b8';
  $('#eLab').hidden=!(it.t==='btn'||it.t==='pedal');$('#eLab').value=it.label||'';
  $('#eBind').hidden=it.t!=='btn';$('#eBind').value=it.bind||'a';
  $('#eTouch').parentNode.hidden=it.t!=='wheel';$('#eTouch').checked=!!it.touch}
const upd=f=>{const it=cur();if(it){f(it);persist();render()}};
$('#stage').addEventListener('pointerdown',e=>{
  if(!editing)return;e.stopPropagation();e.preventDefault();
  const el=e.target.closest('.it');sel=el?+el.dataset.i:-1;
  document.querySelectorAll('.it').forEach(x=>x.classList.toggle('sel',x===el));syncBar();
  if(!el)return;const it=cur(),r=$('#stage').getBoundingClientRect();
  const mv=ev=>{it.x=Math.round(clamp((ev.clientX-r.left)/r.width*100,0,100)*10)/10;it.y=Math.round(clamp((ev.clientY-r.top)/r.height*100,0,100)*10)/10;el.style.left=it.x+'%';el.style.top=it.y+'%'};
  const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);persist();syncBar()};
  addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up)},true);
$('#eSize').oninput=e=>upd(it=>it.s=+e.target.value);
$('#eCol').oninput=e=>upd(it=>it.c=e.target.value);
$('#eLab').oninput=e=>upd(it=>it.label=e.target.value);
$('#eBind').onchange=e=>upd(it=>it.bind=e.target.value);
$('#eTouch').onchange=e=>upd(it=>it.touch=e.target.checked?1:0);
$('#eDel').onclick=()=>{if(sel<0)return;items().splice(sel,1);sel=-1;persist();render();syncBar()};
$('#eAddB').onclick=()=>{const N={btn:{t:'btn',bind:'a',label:'A',s:12,c:'#22c55e',shape:''},stickL:{t:'stick',bind:'left',s:28},stickR:{t:'stick',bind:'right',s:28},dpad:{t:'dpad',s:22},wheel:{t:'wheel',s:50,c:'#e2e8f0'},pedal:{t:'pedal',bind:'rt',label:'ACEL',s:11,c:'#22c55e'}};
  items().push(Object.assign({x:50,y:50},clone(N[$('#eAdd').value])));sel=items().length-1;persist();render();syncBar()};
$('#eLay').onchange=e=>{cfg.layout=e.target.value;save();sel=-1;render();syncBar()};
$('#eDone').onclick=()=>{setEdit(false);if(!ws)show(false)};
$('#bEdit').onclick=()=>setEdit(true);
$('#bEditH').onclick=()=>{show(true);setEdit(true)};
$('#bDup').onclick=()=>{let n=1;while(LAYOUTS['Meu layout '+n])n++;const name='Meu layout '+n;LAYOUTS[name]=clone(items());cfg.layout=name;persist();save();sync();render();toast('Criado: '+name)};
$('#bRst').onclick=()=>{if(!DEF[cfg.layout])return toast('Só layouts padrão podem ser restaurados');LAYOUTS[cfg.layout]=clone(DEF[cfg.layout]);persist();render();toast('Layout restaurado')};
$('#bDelL').onclick=()=>{if(DEF[cfg.layout])return toast('Layouts padrão não podem ser excluídos');delete LAYOUTS[cfg.layout];cfg.layout='Volante';persist();save();sync();render()};

/* ---------- teclas de volume como botões (só no APK) ---------- */
function setCap(){if(window.PPNative)PPNative.capture(!!ws&&(cfg.vol.up!=='none'||cfg.vol.down!=='none'))}
window.__vk=(k,down)=>{const b=cfg.vol[k];if(b&&b!=='none')act(b,down?1:0)};
$('#cVu').onchange=e=>{cfg.vol.up=e.target.value;save();setCap()};
$('#cVd').onchange=e=>{cfg.vol.down=e.target.value;save();setCap()};
$('#cFfb').oninput=e=>{cfg.ffb=+e.target.value;$('#vFfb').textContent=cfg.ffb;save()};
$('#cPull').oninput=e=>{cfg.pull=+e.target.value;$('#vPull').textContent=cfg.pull;save()};
