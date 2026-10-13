const $=s=>document.querySelector(s);let bpm=100,meter=4,sub=1,mode='sway',playing=false,ctx,next=0,tick=0,scheduler,raf,elapsed=0,started=0,taps=[],queue=[];const characters=[...document.querySelectorAll('.buddy')];
function renderBeats(){ $('#beats').innerHTML=Array.from({length:meter},(_,i)=>`<span class="beat">${i+1}</span>`).join('') }renderBeats();
function setBpm(v){bpm=Math.max(30,Math.min(240,Math.round(Number(v)||100)));$('#bpm').value=bpm;$('#range').value=bpm;$('#tempoName').textContent=bpm<70?'慢慢呼吸':bpm<120?'轻快走走':bpm<170?'活力满满':'全速前进';}
$('#bpm').onchange=e=>setBpm(e.target.value);$('#range').oninput=e=>setBpm(e.target.value);$('#minus').onclick=()=>setBpm(bpm-1);$('#plus').onclick=()=>setBpm(bpm+1);
function sound(time,strong,minor){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(strong?1050:minor?470:730,time);osc.frequency.exponentialRampToValueAtTime(strong?650:350,time+.045);gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime((+$('#volume').value/100)*(minor?.12:.3),time+.002);gain.gain.exponentialRampToValueAtTime(.0001,time+.065);osc.connect(gain);gain.connect(ctx.destination);osc.start(time);osc.stop(time+.07);}
function schedule(){while(next<ctx.currentTime+.1){const beat=Math.floor(tick/sub)%meter,minor=tick%sub!==0;sound(next,beat===0&&!minor&&$('#accent').checked,minor);if(!minor)queue.push({time:next,beat});next+=60/bpm/sub;tick++;}}
function animate(beat){
 document.querySelectorAll('.beat').forEach((e,i)=>e.classList.toggle('on',i===beat));
 const words={sway:['左一下～','右一下～'],jump:['跳起来！','蹦！'],march:['一！踏步！','二！跟上！']};
 $('#bubble').textContent=words[mode][beat%2];
 const duration=60000/bpm*.88;
 characters.forEach((el,i)=>{
  el.getAnimations().forEach(a=>a.cancel());
  const dir=beat%2?1:-1; let frames;
  if(mode==='jump')frames=[
   {transform:'translateY(0) scale(1.12,.88)',offset:0},
   {transform:`translateY(-${beat===0?76:50}px) scale(.94,1.06)`,offset:.36},
   {transform:'translateY(0) scale(1.12,.88)',offset:.78},
   {transform:'translateY(0) scale(1)',offset:1}
  ];
  else if(mode==='march'){
   const step=(beat+i)%2===0;
   frames=[{transform:'translate(0,0) rotate(0deg)'},
    {transform:`translate(${dir*22}px,${step?-30:-5}px) rotate(${dir*(step?9:3)}deg)`,offset:.38},
    {transform:'translate(0,0) rotate(0deg)'}];
  }else frames=[{transform:`rotate(${dir*(i===1?1:-1)*12}deg)`},{transform:'rotate(0deg)'}];
  el.animate(frames,{duration,easing:'ease-in-out'});
 });
}

function frame(){if(!playing)return;while(queue.length&&queue[0].time<=ctx.currentTime)animate(queue.shift().beat);const seconds=Math.floor((elapsed+performance.now()-started)/1000);$('#timer').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');raf=requestAnimationFrame(frame);}
async function toggle(){stopPreview();if(playing){playing=false;if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null;}elapsed+=performance.now()-started;clearInterval(scheduler);cancelAnimationFrame(raf);queue=[];await ctx.close();ctx=null;$('#play').innerHTML='▶ <span>继续练习</span>';$('#state').textContent='休息一下，也很好';$('#bubble').textContent='等你回来～';document.querySelectorAll('.beat').forEach(x=>x.classList.remove('on'));return;}try{ctx??=new(window.AudioContext||window.webkitAudioContext)();await ctx.resume();playing=true;keepAwake();started=performance.now();next=ctx.currentTime+.12;tick=0;queue=[];schedule();scheduler=setInterval(schedule,25);frame();$('#play').innerHTML='Ⅱ <span>暂停练习</span>';$('#state').textContent='正在练习 · 跟上奶娃';}catch(e){$('#state').textContent='声音暂时无法启动，请再试一次';}}
$('#play').onclick=toggle;$('#meter').onchange=e=>{meter=+e.target.value;tick=0;queue=[];renderBeats()};document.querySelectorAll('#sub button').forEach(b=>b.onclick=()=>{sub=+b.dataset.v;tick=0;queue=[];document.querySelectorAll('#sub button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b)})});
function tap(){const now=performance.now();if(taps.length&&now-taps.at(-1)>2200)taps=[];taps.push(now);if(taps.length>6)taps.shift();if(taps.length>1)setBpm(60000/((taps.at(-1)-taps[0])/(taps.length-1)));$('#tap').animate([{background:'#f6d64c'},{background:'#f4f4e9'}],{duration:250});}$('#tap').onclick=tap;
let previewInterval,previewEnd;
function stopPreview(){clearInterval(previewInterval);clearTimeout(previewEnd)}
document.querySelectorAll('.scene').forEach(b=>{
 b.setAttribute('aria-pressed',b.dataset.mode===mode);
 b.onclick=()=>{
  stopPreview();mode=b.dataset.mode;
  document.querySelectorAll('.scene').forEach(x=>{const selected=x===b;x.classList.toggle('active',selected);x.setAttribute('aria-pressed',selected);x.querySelector('i').textContent=selected?'✓':'↗'});
  $('.stage').dataset.mode=mode;
  $('#sceneLabel').textContent=b.querySelector('b').textContent;
  if(!playing){let demoBeat=0;animate(demoBeat++);previewInterval=setInterval(()=>animate(demoBeat++%meter),60000/bpm);previewEnd=setTimeout(()=>{stopPreview();$('#bubble').textContent='点开始，奶娃陪你练';document.querySelectorAll('.beat').forEach(x=>x.classList.remove('on'))},60000/bpm*4);}
 };
});
$('#help').onclick=()=>$('#dialog').showModal();$('#close').onclick=()=>$('#dialog').close();document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName)||$('#dialog').open||e.repeat)return;if(e.code==='Space'){e.preventDefault();toggle()}else if(e.key.toLowerCase()==='t')tap();else if(e.key==='ArrowLeft'){e.preventDefault();setBpm(bpm-1)}else if(e.key==='ArrowRight'){e.preventDefault();setBpm(bpm+1)}});

// Remember practice settings on this device, without an account.
function saveSettings(){try{localStorage.setItem('naiwa-settings',JSON.stringify({bpm,meter,sub,mode,accent:$('#accent').checked,volume:$('#volume').value}))}catch{}}
try{const saved=JSON.parse(localStorage.getItem('naiwa-settings')||'null');if(saved){setBpm(saved.bpm);if([2,3,4,6].includes(saved.meter)){meter=saved.meter;$('#meter').value=meter;renderBeats()}if([1,2,3].includes(saved.sub)){sub=saved.sub;document.querySelectorAll('#sub button').forEach(b=>{b.classList.toggle('active',+b.dataset.v===sub);b.setAttribute('aria-pressed',+b.dataset.v===sub)})}if(['sway','jump','march'].includes(saved.mode)){mode=saved.mode;$('.stage').dataset.mode=mode;document.querySelectorAll('.scene').forEach(b=>{const selected=b.dataset.mode===mode;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected);b.querySelector('i').textContent=selected?'✓':'↗';if(selected)$('#sceneLabel').textContent=b.querySelector('b').textContent})}if(typeof saved.accent==='boolean')$('#accent').checked=saved.accent;if(Number.isFinite(+saved.volume))$('#volume').value=Math.max(0,Math.min(100,+saved.volume));}}catch{}
document.addEventListener('change',saveSettings);document.addEventListener('click',saveSettings);
let wakeLock;
async function keepAwake(){if(playing&&document.visibilityState==='visible'&&'wakeLock' in navigator){try{wakeLock=await navigator.wakeLock.request('screen')}catch{}}}

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){keepAwake();if(playing&&ctx){queue=[];next=ctx.currentTime+.1;tick=0}}});

const desktopLayout=matchMedia('(min-width:901px)');
function syncSettingsPanel(){document.querySelector('.advanced').open=desktopLayout.matches}
syncSettingsPanel();desktopLayout.addEventListener('change',syncSettingsPanel);
