'use strict';
/* ================================================================
   game.js — Mansion of Destiny FINAL VERSION
   
   C++ → JavaScript translation by Yusuf Dirawi
   
   Original C++: Room (abstract), LuckGameRoom : Room,
                 Player, GameManager — finalexam project
   
   Room order:
   0  Kitchen       Luck game        ☀ Sky blue (stage-0)
   1  Parlour       Secret word      ☀ Sky blue
   2  Study         Math equations   ☀ Sky blue
   3  ASURA I       Boss 1           🌅 Sunset (stage-1)
   4  Arena         Horse racing     🌅 Sunset
   5  Riddles       Puzzle           🌆 Dusk (stage-2)
   6  Cipher Vault  Binary MCQ       🌆 Dusk
   7  Alchemist     Logic MCQ        🌑 Dark (stage-3)
   8  Lore Room     Story + item     🌑 Dark
   9  ASURA II      Final boss       🩸 Blood (stage-4)
   ================================================================ */

/* ── PLAYER STATE ── */
let playerName='Hero', playerHP=100, playerMaxHP=100;
let playerLives=3, playerScore=0, playerInventory=[];
let deathCount=0, firstTryRooms=new Set(), roomStartHP=100;

/* ── GAME STATE ── */
let currentRoomIndex=0, selectedDifficulty='easy', answered=false;
let comboStreak=0, roomsCleared=0, speedrunStart=0;
let visitedRooms=new Set(), clearedRooms=new Set();
let lastApproach='medium'; // 'easy'|'medium'|'hard'
let asura1Beaten=false, asuraRageMode=false;
let chargeCount=0, sneakCount=0; // track approaches for win screen
let timerInterval=null;

/* ── ROOM STATE ── */
let rpsWins=0, rpsAsura=0, puzzleCorrect=0, currentPuzzleIdx=0;
let triviaIdx=0, triviaCorrect=0;
let wordSecret='', wordRevealed='', wordAttempts=0;
let mazePart=0, bossHP=100, bossMaxHP=100;
let isBossTurn=false, shieldActive=false, bossHasHealed=false;

/* ── NPC STATE ── */
let npcOffer=null;

/* ── DIFFICULTY ── */
const DIFF={
  easy:   {pen:.5,  rew:1.0, bossHP:75,  boss2HP:120, label:'Easy'},
  normal: {pen:1.0, rew:1.2, bossHP:100, boss2HP:175, label:'Normal'},
  hard:   {pen:1.5, rew:1.5, bossHP:125, boss2HP:225, label:'Hard'}
};

/* ── APPROACH VARIANTS ── */
const APPROACH={
  easy:   {label:'Sneak',  penMult:.7,  scoreMult:.8,  emoji:'🐔'},
  medium: {label:'Walk',   penMult:1.0, scoreMult:1.0, emoji:'🚶'},
  hard:   {label:'Charge', penMult:1.4, scoreMult:1.5, emoji:'⚔'}
};

/* ── ITEMS ── */
const ITEMS={
  healthPotion:{name:'💊 Health Potion', emoji:'💊', desc:'Restore 40 HP'},
  sword:       {name:'🗡 Cursed Sword',  emoji:'🗡', desc:'+50 boss dmg'},
  shield:      {name:'🛡 Iron Shield',   emoji:'🛡', desc:'Block one hit'},
  scroll:      {name:'📜 Ancient Scroll',emoji:'📜', desc:'Reveal hint'},
  key:         {name:'🔑 Skeleton Key',  emoji:'🔑', desc:'Skip a room'},
  bomb:        {name:'💣 Bomb',          emoji:'💣', desc:'+75 boss dmg'}
};

/* ── ASURA TAUNTS (shown on approach screen after Asura I) ── */
const TAUNTS_EARLY=[
  '"Lucky shot, mortal. Enjoy the silence while it lasts."',
  '"You think that was my true power? How adorable."',
  '"Keep walking. The throne room gets closer with every step."',
  '"I\'ve been watching you. You\'re not as brave as you pretend."'
];
const TAUNTS_LATE=[
  '"You can feel it, can\'t you? The darkness closing in."',
  '"Almost there. Almost... to your end."',
  '"The mansion itself mourns what\'s about to happen to you."',
  '"I\'ll give you this — you lasted longer than the others."'
];

/* ── NPC OFFERS ── */
const NPC_OFFERS=[
  {msg:'👻 A ghost merchant materializes. "Give me 20 HP, and I\'ll give you something useful." Deal?', hpCost:20, reward:'healthPotion'},
  {msg:'👻 A wandering spirit holds out a glowing sword. "15 HP for this blade?" Deal?',              hpCost:15, reward:'sword'},
  {msg:'👻 "A shield for 15 HP — I collected it from someone who no longer needs it." Deal?',         hpCost:15, reward:'shield'},
  {msg:'👻 "I know a secret. 10 HP for a scroll that reveals answers." Deal?',                        hpCost:10, reward:'scroll'},
  {msg:'👻 "This bomb cost me dearly. Yours for 25 HP." Deal?',                                       hpCost:25, reward:'bomb'}
];

/* ── ROOMS ── */
const ROOMS=[
  // ☀ STAGE 0 — Bright daytime sky
  {name:'The Dusty Kitchen',      icon:'🍳',stage:0,
   desc:'Morning light streams through cracked windows. You wake on the cold stone floor, disoriented. A strange locked box hums in the corner.',
   type:'luck',   ctype:'🎲 Guess the Number',
   q:'Guess the number — wrong answers cost HP.',
   min:1,max:5,penalty:10,itemDrop:'healthPotion'},

  {name:'The Grand Parlour',      icon:'🕯',stage:0,
   desc:'Golden morning light fills the parlour. Dust floats through sunbeams. A soft whisper repeats a single word — over and over.',
   type:'word',   ctype:'🔤 Guess the Secret Word',
   q:'A word echoes in the air. Letters reveal themselves with each wrong guess.',
   secret:'mansion',penalty:10,itemDrop:'scroll'},

  {name:'The Scholar\'s Study',   icon:'📚',stage:0,
   desc:'Afternoon light through tall windows. The chalk on a dusty chalkboard moves on its own, writing equations that must be solved.',
   type:'math',   ctype:'🧮 System of Equations',
   q:'Solve the system of equations for x and y.',
   penalty:15,itemDrop:'shield'},

  // 🌅 STAGE 1 — Sunset / Asura I
  {name:'The Gatekeeper\'s Hall', icon:'⚔',stage:1,isBoss:true,bossId:1,
   desc:'The sun vanishes. A massive iron door blocks your path. Before you can touch it — a figure steps from the shadows. Asura, the Gatekeeper. His eyes burn amber.',
   type:'boss1',  ctype:'⚔ ASURA I — The Gatekeeper',
   q:'Defeat Asura to open the iron door! Use your items wisely.'},

  {name:'The Grand Arena',        icon:'🏟',stage:1,
   desc:'You emerge into a grand arena beneath a burning amber sky. Ghostly spectators roar. Five horses stamp at the starting gate.',
   type:'horse',  ctype:'🐎 Horse Racing',
   q:'Pick your horse and watch the race! Wrong pick loses HP — keep racing until you win.',
   horses:['⚡ Thunderbolt','🌩 Lightning Strike','🌙 Shadowfax','🌪 Whirlwind','🌊 Cyclone'],
   penalty:10,itemDrop:'bomb'},

  // 🌆 STAGE 2 — Dusk/purple
  {name:'The Chamber of Riddles', icon:'🧩',stage:2,
   desc:'Purple dusk bleeds through narrow windows. Symbols glow on every surface. A ghostly voice demands three correct answers before the door will open.',
   type:'puzzle', ctype:'🧩 The Riddles',
   q:'Answer 3 riddles correctly to escape. Each wrong answer costs HP.',
   riddles:[
     {q:'I speak without a mouth and hear without ears. I have no body, but come alive with wind.',a:'echo',hint:'A sound that bounces back.'},
     {q:'The more of me you take, the more you leave behind. What am I?',a:'footsteps',hint:'You make these while walking.'},
     {q:'Light as a feather, yet the strongest person cannot hold me for more than a few minutes.',a:'breath',hint:'Every second of your life.'},
     {q:'What has keys but cannot open locks?',a:'piano',hint:'It makes beautiful music.'},
     {q:'What can travel the world while staying in a corner?',a:'stamp',hint:'Often found on mail.'}
   ],penalty:10,itemDrop:'key'},

  {name:'The Cipher Vault',       icon:'💻',stage:2,
   desc:'Walls of glowing scrolls covered in binary code. The torches have gone out. A mechanical voice will not let you pass until you decode its riddle.',
   type:'mcq',    ctype:'💻 Binary Decoder',
   q:'What is the decimal value of the binary number: 01101010?',
   choices:['96','106','108','122'],answer:1,penalty:20,itemDrop:'healthPotion'},

  // 🌑 STAGE 3 — Deep dark
  {name:'The Alchemist\'s Lab',   icon:'⚗',stage:3,
   desc:'Near total darkness. Faint blue flames in cauldrons. A ghost alchemist bars the door, arms folded. "Logic is the only key that opens this lock."',
   type:'mcq',    ctype:'⚗️ Logic of the Alchemist',
   q:'If all Blooms are Glows, and some Glows are Sparks — which MUST be true?',
   choices:['All Sparks are Blooms','Some Blooms may be Sparks','All Blooms are Sparks','No Sparks are Blooms'],
   answer:1,penalty:20,itemDrop:'sword'},

  {name:'The Forgotten Library',  icon:'📖',stage:3,isLore:true,
   desc:'A quiet room. No challenge. Just silence and a journal lying open on a table by a dying candle.',
   type:'lore',   ctype:'📖 A Moment of Silence',
   q:'Read the journal. Rest. Prepare yourself.',
   loreText:`Journal Entry — Unknown Date

I have seen others come through this mansion.
They all faced Asura at the iron gate.
Some beat him. All of them thought it was over.

It was never over.

The mansion chose Asura as its eternal guardian.
The first encounter was only a test —
to see if you were worth his full fury.

At the throne room, he will return.
Stronger. Faster. Furious. Without mercy.

If you have items — save them for the end.
You will need every advantage you can find.

And if you have a bomb... keep it very close.

— A previous visitor who did not make it out.`,
   itemDrop:'bomb'},

  // 🩸 STAGE 4 — Blood red / Asura II
  {name:'The Throne of Destiny',  icon:'👑',stage:4,isBoss:true,bossId:2,
   desc:'Pitch black. Two amber eyes glow from the dark. Asura stands before the throne — twice the size he was before. He speaks quietly: "You actually made it. Let me show you what I was holding back."',
   type:'boss2',  ctype:'👑 ASURA II — Unleashed',
   q:'The final battle. Asura has new moves. At 50% HP he enters RAGE MODE. Use your items wisely!'}
];

const ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X'];

/* ================================================================
   AUDIO
   ================================================================ */
let audioCtx=null;
function audio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();return audioCtx;}
function tone(freq,type,dur,vol=0.25){try{const ctx=audio(),o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=freq;o.type=type;g.gain.setValueAtTime(vol,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);o.start(ctx.currentTime);o.stop(ctx.currentTime+dur);}catch(e){}}
const SFX={
  correct: ()=>{tone(523,'sine',.12);setTimeout(()=>tone(659,'sine',.15),90);setTimeout(()=>tone(784,'sine',.25),180);},
  wrong:   ()=>{tone(200,'sawtooth',.18,.22);setTimeout(()=>tone(150,'sawtooth',.25,.18),140);},
  click:   ()=>tone(380,'sine',.07,.1),
  damage:  ()=>{tone(180,'square',.14,.25);tone(120,'sawtooth',.18,.2);},
  levelUp: ()=>{[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,'sine',.18),i*90));},
  bossHit: ()=>{tone(300,'sawtooth',.09);setTimeout(()=>tone(200,'square',.13),75);},
  bossAtk: ()=>{tone(140,'square',.14,.32);setTimeout(()=>tone(100,'sawtooth',.2,.28),85);},
  rage:    ()=>{[200,180,160,140].forEach((f,i)=>setTimeout(()=>tone(f,'sawtooth',.2,.35),i*80));},
  heal:    ()=>{tone(440,'sine',.1);setTimeout(()=>tone(550,'sine',.15),100);setTimeout(()=>tone(660,'sine',.2),200);},
  gameOver:()=>{[300,250,200,150].forEach((f,i)=>setTimeout(()=>tone(f,'sawtooth',.22,.28),i*140));},
  victory: ()=>{[523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>tone(f,'sine',.28,.38),i*110));},
  walk:    ()=>{tone(200,'sine',.08,.15);setTimeout(()=>tone(220,'sine',.08,.15),150);},
  charge:  ()=>{tone(400,'square',.05,.2);tone(300,'square',.08,.15);setTimeout(()=>tone(500,'square',.1,.25),80);},
  sneak:   ()=>tone(150,'sine',.2,.08),
  horseTrot:()=>{for(let i=0;i<6;i++)setTimeout(()=>tone(160+Math.random()*80,'square',.04,.12),i*110);},
  combo:   ()=>{tone(800,'sine',.09);setTimeout(()=>tone(1000,'sine',.13),75);}
};

/* ================================================================
   SCREENS
   ================================================================ */
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');}
function showAbout(){SFX.click();showScreen('screen-about');}

/* ================================================================
   THEME — sky blue → sunset → dusk → dark → blood
   ================================================================ */
function updateTheme(){
  const stage=ROOMS[currentRoomIndex]?.stage||0;
  document.body.classList.remove('stage-0','stage-1','stage-2','stage-3','stage-4','hp-danger','boss-near');
  document.body.classList.add('stage-'+stage);
  if(playerHP<=25) document.body.classList.add('hp-danger');
  const next=ROOMS[currentRoomIndex+1];
  if(next&&next.isBoss) document.body.classList.add('boss-near');
}

/* ================================================================
   SIDEBAR
   ================================================================ */
function updateSidebar(){buildMap();updateProgress();updateSidebarStats();updateSidebarInv();updateAsuraStatus();updateLocationInfo();}

function buildMap(){
  const c=document.getElementById('castle-map');if(!c)return;c.innerHTML='';
  ROOMS.forEach((room,i)=>{
    const cell=document.createElement('div');cell.className='map-cell';cell.id='map-cell-'+i;cell.title=room.name;
    if(room.isBoss)cell.classList.add('boss');
    if(i>currentRoomIndex&&!visitedRooms.has(i))cell.classList.add('locked');
    else if(clearedRooms.has(i))cell.classList.add('cleared');
    else if(visitedRooms.has(i))cell.classList.add('visited');
    if(i===currentRoomIndex)cell.classList.add('current');
    cell.textContent=room.icon;
    if(firstTryRooms.has(i)){const s=document.createElement('span');s.className='first-star';s.textContent='⭐';cell.appendChild(s);}
    c.appendChild(cell);
  });
}

function updateProgress(){
  const pct=(clearedRooms.size/ROOMS.length)*100;
  const fill=document.getElementById('progress-fill');
  if(fill){
    fill.style.width=pct+'%';
    const stage=ROOMS[currentRoomIndex]?.stage||0;
    const colors=['linear-gradient(90deg,#4a8aaa,#78b8f0)','linear-gradient(90deg,#c07030,#f8c840)','linear-gradient(90deg,#5838a8,#d0a8f0)','linear-gradient(90deg,#302860,#a890d0)','linear-gradient(90deg,#601818,#f08080)'];
    fill.style.background=colors[stage]||colors[0];
  }
  const txt=document.getElementById('progress-text');
  if(txt)txt.textContent=`${clearedRooms.size} / ${ROOMS.length} rooms`;
}

function updateSidebarStats(){
  const elapsed=Math.round((Date.now()-speedrunStart)/1000);
  const mins=Math.floor(elapsed/60),secs=elapsed%60;
  setStat('stat-cleared',`${clearedRooms.size}/${ROOMS.length}`);
  setStat('stat-deaths',deathCount);
  setStat('stat-combo',comboStreak+'x');
  setStat('stat-approach',lastApproach==='hard'?'⚔ Charged':lastApproach==='easy'?'🐔 Sneaked':'🚶 Walked');
  setStat('stat-time',`${mins}:${String(secs).padStart(2,'0')}`);
}
function setStat(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}

function updateSidebarInv(){
  const c=document.getElementById('sidebar-inv');if(!c)return;c.innerHTML='';
  if(!playerInventory.length){const e=document.createElement('div');e.className='sidebar-inv-empty';e.textContent='Empty';c.appendChild(e);return;}
  playerInventory.forEach(k=>{const icon=document.createElement('span');icon.className='sidebar-inv-icon';icon.textContent=ITEMS[k].emoji;icon.title=ITEMS[k].name+' — '+ITEMS[k].desc;icon.onclick=()=>{document.getElementById('inv-panel').classList.add('open');renderInventoryPanel();};c.appendChild(icon);});
}

function updateAsuraStatus(){
  const sec=document.getElementById('asura-status-section'),st=document.getElementById('asura-status');
  if(!sec||!st)return;
  if(!asura1Beaten&&currentRoomIndex<3){sec.style.display='none';return;}
  sec.style.display='block';
  if(asura1Beaten&&currentRoomIndex<9)st.innerHTML=`Fallen once<br><span style="color:#c08060;">Preparing revenge...</span><br>Next: Room 10`;
  else if(currentRoomIndex>=9)st.innerHTML=`<span style="color:#f08080;">⚠ FINAL ENCOUNTER</span><br>He has returned.<br>Full power unleashed.`;
}

function updateLocationInfo(){
  const el=document.getElementById('map-dir-info');if(!el)return;
  const room=ROOMS[currentRoomIndex];
  const ap=APPROACH[lastApproach];
  el.innerHTML=`${room?.name||'—'}<br>Approach: ${ap?.emoji} ${ap?.label}<br>Next: ${ROOMS[currentRoomIndex+1]?.name||'Final'}`;
}

/* ================================================================
   HUD
   ================================================================ */
function updateHUD(){
  document.getElementById('hud-name').textContent=playerName;
  document.getElementById('health-text').textContent=playerHP;
  document.getElementById('hud-room').textContent=`Room ${currentRoomIndex+1}/${ROOMS.length}`;
  document.getElementById('hud-score').textContent=`Score: ${Math.round(playerScore)}`;
  document.getElementById('inv-count').textContent=playerInventory.length;
  const pct=(playerHP/playerMaxHP)*100;
  const fill=document.getElementById('health-fill');
  fill.style.width=pct+'%';
  fill.style.background=pct>60?'linear-gradient(90deg,#8b2020,#e74c3c)':pct>30?'linear-gradient(90deg,#b7950b,#f39c12)':'linear-gradient(90deg,#5e1010,#c0392b)';
  const lw=document.getElementById('lives-wrap');lw.innerHTML='';
  for(let i=0;i<3;i++){const h=document.createElement('span');h.textContent=i<playerLives?'❤':'🖤';h.style.fontSize='.85rem';lw.appendChild(h);}
  const ib=document.getElementById('inv-btn');
  if(ib)ib.classList.toggle('pulse',playerHP<30&&playerInventory.includes('healthPotion'));
}

/* ================================================================
   HP MANAGEMENT
   ================================================================ */
function loseHP(base){
  if(playerHP<=0)return;
  const amt=Math.round(base*DIFF[selectedDifficulty].pen*APPROACH[lastApproach].penMult);
  playerHP=Math.max(0,playerHP-amt);
  triggerDamageFlash();SFX.damage();
  document.body.classList.add('shake');setTimeout(()=>document.body.classList.remove('shake'),380);
  updateHUD();updateTheme();
  if(playerHP<=0){
    deathCount++;playerLives--;
    if(playerLives>0){playerHP=30;updateHUD();showFeedback(`💀 Fallen! ${playerLives} ${playerLives===1?'life':'lives'} left. Revived at 30 HP.`,false);}
    else setTimeout(triggerGameOver,900);
  }
}

function gainHP(base){
  const amt=Math.round(base*DIFF[selectedDifficulty].rew);
  playerHP=Math.min(playerMaxHP,playerHP+amt);
  updateHUD();updateTheme();
}

function addScore(pts){
  playerScore+=Math.round(pts*(selectedDifficulty==='hard'?2:selectedDifficulty==='normal'?1.5:1)*APPROACH[lastApproach].scoreMult);
  document.getElementById('hud-score').textContent=`Score: ${Math.round(playerScore)}`;
}

/* ================================================================
   EFFECTS
   ================================================================ */
function triggerDamageFlash(){const f=document.getElementById('damage-flash');f.classList.add('active');setTimeout(()=>f.classList.remove('active'),200);}
function spawnDmgFloat(text,isBoss,isMiss=false){
  const el=document.createElement('div');el.className='dmg-float '+(isMiss?'miss':isBoss?'boss-dmg':'player-dmg');
  el.textContent=text;el.style.left=(window.innerWidth*(isBoss?.35:.65))+'px';el.style.top=(window.innerHeight*.42)+'px';
  document.body.appendChild(el);setTimeout(()=>el.remove(),1100);
}
function showFeedback(msg,ok){const fb=document.getElementById('feedback');fb.className='feedback '+(ok?'success':'fail');fb.innerHTML=msg;}
function showNext(label){document.getElementById('next-wrap').className='next-wrap visible';document.getElementById('next-btn').textContent=label||'Advance →';}
function hideNext(){document.getElementById('next-wrap').className='next-wrap';}
function isLast(){return currentRoomIndex===ROOMS.length-1;}
function showComboBanner(msg){document.querySelectorAll('.combo-banner').forEach(b=>b.remove());const b=document.createElement('div');b.className='combo-banner';b.textContent=msg;document.body.appendChild(b);setTimeout(()=>b.remove(),2600);}
function typewrite(el,text,speed=20){el.textContent='';let i=0;const iv=setInterval(()=>{el.textContent+=text[i++];if(i>=text.length)clearInterval(iv);},speed);}

function registerCorrect(){
  comboStreak++;roomsCleared++;clearedRooms.add(currentRoomIndex);
  addScore(100+comboStreak*20);
  if(playerHP>=roomStartHP){firstTryRooms.add(currentRoomIndex);addScore(50);showComboBanner('⭐ First Try! +50 bonus score!');}
  else if(comboStreak%3===0){SFX.combo();gainHP(15);showComboBanner(`🔥 ${comboStreak}x Combo! +15 HP`);}
  else SFX.correct();
  const cell=document.getElementById('map-cell-'+currentRoomIndex);
  if(cell){cell.classList.add('just-cleared');setTimeout(()=>cell.classList.remove('just-cleared'),900);}
  updateSidebar();
}
function registerWrong(){comboStreak=0;updateSidebarStats();}

/* ================================================================
   INVENTORY
   ================================================================ */
function addItem(key){playerInventory.push(key);updateHUD();renderInventoryPanel();updateSidebarInv();showComboBanner(`🎁 Found: ${ITEMS[key].name}!`);}

function useItem(key,idx){
  SFX.click();
  const inBoss=ROOMS[currentRoomIndex].type==='boss1'||ROOMS[currentRoomIndex].type==='boss2';
  if(key==='healthPotion'){gainHP(40);showComboBanner('💊 +40 HP restored!');}
  else if(key==='bomb'){if(!inBoss){showComboBanner('💣 Boss fight only!');return;}bossHP=Math.max(0,bossHP-75);updateBossBars();SFX.bossHit();spawnDmgFloat('-75',true);showComboBanner('💣 BOOM! −75 boss HP!');}
  else if(key==='sword'){if(!inBoss){showComboBanner('🗡 Boss fight only!');return;}bossHP=Math.max(0,bossHP-50);updateBossBars();SFX.bossHit();spawnDmgFloat('-50',true);showComboBanner('🗡 Cursed Sword! −50 boss HP!');}
  else if(key==='shield'){shieldActive=true;showComboBanner('🛡 Shield ready — next hit blocked!');}
  else if(key==='key'){showComboBanner('🔑 Room skipped!');setTimeout(nextRoom,800);}
  else if(key==='scroll'){showComboBanner('📜 Check the hint in the current room!');}
  playerInventory.splice(idx,1);updateHUD();renderInventoryPanel();updateSidebarInv();
  if(inBoss&&bossHP<=0)bossDied(ROOMS[currentRoomIndex]);
}

function toggleInventory(){SFX.click();document.getElementById('inv-panel').classList.toggle('open');renderInventoryPanel();}

function renderInventoryPanel(){
  const c=document.getElementById('inv-items');c.innerHTML='';
  if(!playerInventory.length){c.innerHTML='<div style="color:var(--text-muted);font-style:italic;font-size:.82rem;">Empty</div>';return;}
  playerInventory.forEach((k,i)=>{
    const row=document.createElement('div');row.className='inv-item';
    const nm=document.createElement('span');nm.style.fontSize='.8rem';nm.textContent=ITEMS[k].name;
    const btn=document.createElement('button');btn.className='inv-use-btn';btn.textContent='USE';btn.onclick=()=>useItem(k,i);
    row.appendChild(nm);row.appendChild(btn);c.appendChild(row);
  });
}

function renderInventoryBar(){
  const bar=document.getElementById('inv-bar');bar.innerHTML='';
  if(!playerInventory.length){bar.innerHTML='<span class="inv-item-pill">No items</span>';return;}
  playerInventory.forEach(k=>{const p=document.createElement('span');p.className='inv-item-pill';p.textContent=ITEMS[k].name;bar.appendChild(p);});
}

/* ================================================================
   NPC MERCHANT
   ================================================================ */
function maybeSpawnNPC(){
  // 25% chance per approach screen, only if player has enough HP
  if(Math.random()<0.25&&playerHP>30&&currentRoomIndex>0){
    npcOffer=NPC_OFFERS[rnd(NPC_OFFERS.length)];
    const box=document.getElementById('npc-box');
    const msg=document.getElementById('npc-msg');
    if(box&&msg){msg.textContent=npcOffer.msg;box.style.display='block';}
  } else {
    const box=document.getElementById('npc-box');
    if(box)box.style.display='none';
    npcOffer=null;
  }
}

function npcAccept(){
  if(!npcOffer)return;SFX.click();
  if(playerHP<=npcOffer.hpCost){showComboBanner('Not enough HP for this trade!');return;}
  playerHP-=npcOffer.hpCost;updateHUD();
  addItem(npcOffer.reward);
  const box=document.getElementById('npc-box');if(box)box.style.display='none';
  npcOffer=null;
}

function npcDecline(){
  SFX.click();const box=document.getElementById('npc-box');if(box)box.style.display='none';npcOffer=null;
  showComboBanner('The ghost merchant fades away...');
}

/* ================================================================
   APPROACH SCREEN (replaces direction compass)
   ================================================================ */
function showApproachScreen(){
  // Re-enable buttons
  document.querySelectorAll('.approach-btn').forEach(b=>b.disabled=false);

  const room=ROOMS[currentRoomIndex];
  const sprites=['🧙','🧙','🧝','🧝','🧟','🧟','🧞','🧞','🧞','🧞'];
  document.getElementById('approach-sprite').textContent=sprites[Math.min(currentRoomIndex,sprites.length-1)];
  document.getElementById('approach-title').textContent='A door stands before you...';
  document.getElementById('approach-room-name').textContent=room?.name?.toUpperCase()||'';

  // Flavor subtitles per approach
  const subs=[
    'How will you face what lies ahead?',
    'The door waits. So does Asura.',
    'Choose your moment, choose your fate.',
    'Every room tests a different kind of courage.',
    'Risk more, gain more. Play it safe, survive longer.'
  ];
  document.getElementById('approach-subtitle').textContent=subs[rnd(subs.length)];

  // Boss warning
  const threat=document.getElementById('threat-warning');
  if(room?.isBoss){threat.textContent=room.bossId===1?'⚠ ASURA AWAITS IN THIS ROOM ⚠':'💀 FINAL BOSS — ASURA UNLEASHED 💀';}
  else{threat.textContent='';}

  // Asura taunts after beating him
  const tauntEl=document.getElementById('asura-taunt');
  if(asura1Beaten&&currentRoomIndex>3&&currentRoomIndex<9){
    const pool=currentRoomIndex>=7?TAUNTS_LATE:TAUNTS_EARLY;
    tauntEl.textContent=pool[rnd(pool.length)];
  } else tauntEl.textContent='';

  // Update approach button descriptions based on current room type
  updateApproachDescs(room);

  renderInventoryBar();
  maybeSpawnNPC();
  updateSidebar();
  showScreen('screen-approach');
}

function updateApproachDescs(room){
  // Charge button — show what's harder
  const chargeDesc=document.querySelector('.approach-charge .approach-desc');
  const sneakDesc=document.querySelector('.approach-run .approach-desc');
  if(!chargeDesc||!sneakDesc)return;
  if(room?.type==='luck'){
    chargeDesc.textContent='Guess 1-12 · 1.5× score · 1.4× damage risk';
    sneakDesc.textContent='Guess 1-5 · 0.8× score · 0.7× damage risk';
  } else if(room?.type==='math'){
    chargeDesc.textContent='Bigger numbers · 1.5× score · 1.4× damage risk';
    sneakDesc.textContent='Smaller numbers · 0.8× score · 0.7× damage risk';
  } else if(room?.isBoss){
    chargeDesc.textContent='Rush the boss · 1.5× score (brave!)';
    sneakDesc.textContent='Careful approach · 0.8× score';
  } else {
    chargeDesc.textContent='Hard challenge · 1.5× score · 1.4× damage risk';
    sneakDesc.textContent='Easy challenge · 0.8× score · 0.7× damage risk';
  }
}

function selectDiff(btn){
  document.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');selectedDifficulty=btn.dataset.diff;SFX.click();
}

function pickApproach(variant){
  SFX.click();
  lastApproach=variant;
  if(variant==='hard')chargeCount++;
  if(variant==='easy')sneakCount++;

  // Sound effect per approach
  if(variant==='hard')SFX.charge();
  else if(variant==='easy')SFX.sneak();
  else SFX.walk();

  // Animate sprite walking toward door
  const sprite=document.getElementById('approach-sprite');
  sprite.style.transition='transform .4s ease, font-size .4s ease';
  sprite.style.transform=variant==='hard'?'translateX(30px) scale(1.2)':variant==='easy'?'translateX(-10px) scale(.9)':'translateX(15px)';
  document.querySelectorAll('.approach-btn').forEach(b=>b.disabled=true);

  setTimeout(()=>{
    sprite.style.transform='translateX(0) scale(1)';
    loadRoom();
  },500);
}

/* ================================================================
   GAME START
   ================================================================ */
function startGame(){
  SFX.click();
  playerName=document.getElementById('player-name').value.trim()||'Brave Soul';
  playerHP=100;playerMaxHP=100;playerLives=3;playerScore=0;
  playerInventory=[];currentRoomIndex=0;roomsCleared=0;comboStreak=0;
  visitedRooms=new Set();clearedRooms=new Set();firstTryRooms=new Set();
  deathCount=0;asura1Beaten=false;asuraRageMode=false;
  chargeCount=0;sneakCount=0;lastApproach='medium';
  speedrunStart=Date.now();
  if(timerInterval)clearInterval(timerInterval);
  timerInterval=setInterval(updateSidebarStats,1000);
  updateTheme();updateHUD();
  showApproachScreen();
}

/* ================================================================
   LOAD ROOM
   ================================================================ */
function loadRoom(){
  answered=false;isBossTurn=false;shieldActive=false;asuraRageMode=false;bossHasHealed=false;
  mazePart=0;rpsWins=rpsAsura=0;puzzleCorrect=currentPuzzleIdx=0;
  triviaIdx=triviaCorrect=0;wordAttempts=0;
  bossHP=bossMaxHP=currentRoomIndex===3?DIFF[selectedDifficulty].bossHP:DIFF[selectedDifficulty].boss2HP;
  visitedRooms.add(currentRoomIndex);
  roomStartHP=playerHP;

  const room=ROOMS[currentRoomIndex];
  updateHUD();updateTheme();

  // ── Clear all old content FIRST, then fade in new ──
  const rc=document.getElementById('room-content');
  rc.style.transition='none';rc.style.opacity='0';
  document.getElementById('room-name').textContent='';
  document.getElementById('room-desc').textContent='';
  document.getElementById('challenge-question').textContent='';
  document.getElementById('answer-area').innerHTML='';
  document.getElementById('feedback').className='feedback';
  hideNext();

  showScreen('screen-room');

  setTimeout(()=>{
    const ap=APPROACH[lastApproach];
    document.getElementById('room-badge').textContent=`Room ${ROMAN[currentRoomIndex]} · ${ap.emoji} ${ap.label}`;
    document.getElementById('room-name').textContent=room.name;
    document.getElementById('challenge-type').textContent=room.ctype;
    document.getElementById('approach-tag').textContent=`${ap.emoji} ${ap.label} approach — ${ap.scoreMult>1?'bonus score':'safe mode'}`;

    rc.style.transition='opacity .5s ease';rc.style.opacity='1';

    typewrite(document.getElementById('room-desc'),room.desc,18);
    const qDelay=room.desc.length*18+300;
    setTimeout(()=>typewrite(document.getElementById('challenge-question'),room.q,14),qDelay);
    setTimeout(()=>{buildAnswerArea(room);updateSidebar();},qDelay+room.q.length*14+350);
  },120);
}

/* ================================================================
   ANSWER AREA ROUTER
   ================================================================ */
function buildAnswerArea(room){
  const aa=document.getElementById('answer-area');aa.innerHTML='';
  const map={luck:buildLuck,word:buildWord,math:buildMath,rps:buildRPS,horse:buildHorse,puzzle:buildPuzzle,mcq:buildMCQ,boss1:buildBoss1,boss2:buildBoss2,lore:buildLore};
  if(map[room.type])map[room.type](room,aa);
}

/* ================================================================
   ROOM BUILDERS
   ================================================================ */

// LUCK — elimination system: wrong guess removes numbers, floor of 3
function buildLuck(room,aa){
  const max=lastApproach==="easy"?5:lastApproach==="medium"?8:12;
  const elimPerWrong=lastApproach==="easy"?1:lastApproach==="medium"?2:4;
  const FLOOR=3;
  let secret=rnd(max)+1;
  let remaining=Array.from({length:max},(_,i)=>i+1);

  const updateQ=()=>{
    document.getElementById("challenge-question").textContent=
      remaining.length>FLOOR
        ? "Guess the number! "+remaining.length+" options left. Wrong answers eliminate numbers."
        : "Final "+remaining.length+" numbers remain. Choose carefully!";
  };
  updateQ();

  const g=document.createElement("div");g.className="num-grid";

  const render=()=>{
    g.innerHTML="";
    remaining.slice().sort((a,b)=>a-b).forEach(n=>{
      const b=document.createElement("button");b.className="num-btn";b.textContent=n;
      b.onclick=()=>{
        if(answered)return;SFX.click();
        if(n===secret){
          b.classList.add("correct");
          g.querySelectorAll(".num-btn").forEach(x=>x.disabled=true);
          answered=true;registerCorrect();
          if(room.itemDrop)addItem(room.itemDrop);
          showFeedback("✦ Correct! The box clicks open.",true);
          showNext(isLast()?"🏆 Claim Victory":"Advance →");
        } else {
          b.classList.add("wrong");
          setTimeout(()=>b.classList.remove("wrong"),600);
          registerWrong();loseHP(room.penalty);
          if(remaining.length>FLOOR){
            const canRemove=remaining.filter(x=>x!==secret&&x!==n)
              .sort((a,c)=>Math.abs(a-n)-Math.abs(c-n));
            const toElim=canRemove.slice(0,Math.min(elimPerWrong,remaining.length-FLOOR));
            remaining=remaining.filter(x=>x!==n&&!toElim.includes(x));
            if(!remaining.includes(secret))remaining.push(secret);
            remaining.sort((a,c)=>a-c);
          }
          updateQ();
          showFeedback("Wrong! "+remaining.length+" numbers remain. −HP.",false);
          render();
        }
      };
      g.appendChild(b);
    });
  };

  render();
  aa.appendChild(g);
}

// WORD
function buildWord(room,aa){
  wordSecret=room.secret;wordRevealed='_'.repeat(wordSecret.length);wordAttempts=0;
  const disp=document.createElement('div');disp.className='word-display';disp.id='word-disp';disp.textContent=wordRevealed.split('').join(' ');
  const row=document.createElement('div');row.className='text-input-row';
  const inp=document.createElement('input');inp.className='text-inp';inp.id='word-inp';inp.placeholder='Type the word...';inp.onkeydown=e=>{if(e.key==='Enter')submitWord(room);};
  const btn=document.createElement('button');btn.className='btn btn-gold';btn.textContent='Guess';btn.onclick=()=>submitWord(room);
  row.appendChild(inp);row.appendChild(btn);aa.appendChild(disp);aa.appendChild(row);
}
function submitWord(room){
  if(answered)return;SFX.click();
  const inp=document.getElementById('word-inp');const guess=inp.value.trim().toLowerCase();inp.value='';if(!guess)return;
  if(guess===wordSecret){answered=true;registerCorrect();if(room.itemDrop)addItem(room.itemDrop);document.getElementById('word-disp').textContent=wordSecret.split('').join(' ');showFeedback(`✦ Correct! "${wordSecret}" — the whisper fades.`,true);showNext(isLast()?'🏆 Claim Victory':'Advance →');}
  else{registerWrong();wordAttempts++;loseHP(room.penalty);if(wordAttempts<=wordSecret.length){const arr=wordRevealed.split('');arr[wordAttempts-1]=wordSecret[wordAttempts-1];wordRevealed=arr.join('');document.getElementById('word-disp').textContent=wordRevealed.split('').join(' ');}showFeedback(`Wrong! Letter ${wordAttempts} revealed. −HP.`,false);}
}

// MATH — hard approach = bigger coefficients
function buildMath(room,aa){
  const range=lastApproach==='easy'?9:lastApproach==='medium'?15:25;
  let a1,b1,c1,a2,b2,c2,det,sx,sy;
  do{a1=rnd(range)+1;b1=rnd(range)+1;c1=rnd(range*2)+2;a2=rnd(range)+1;b2=rnd(range)+1;c2=rnd(range*2)+2;det=a1*b2-a2*b1;}while(det===0);
  sx=Math.round((c1*b2-c2*b1)/det);sy=Math.round((a1*c2-a2*c1)/det);
  document.getElementById('challenge-question').innerHTML=`Solve:<br><br><span style="font-family:var(--font-m);color:var(--gold);font-size:1.05rem;">${a1}x + ${b1}y = ${c1}<br>${a2}x + ${b2}y = ${c2}</span>`;
  const form=document.createElement('div');form.style.cssText='display:flex;flex-direction:column;gap:.55rem;margin-top:.7rem;';
  ['x','y'].forEach(v=>{
    const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:.6rem;';
    const lbl=document.createElement('span');lbl.style.cssText='font-family:var(--font-m);color:var(--gold);width:30px;';lbl.textContent=v+' =';
    const inp=document.createElement('input');inp.className='text-inp';inp.style.width='100px';inp.type='number';inp.id='math-'+v;inp.placeholder='int';
    row.appendChild(lbl);row.appendChild(inp);form.appendChild(row);
  });
  const btn=document.createElement('button');btn.className='btn btn-gold';btn.style.marginTop='.3rem';btn.textContent='Submit Solution';
  btn.onclick=()=>{if(answered)return;SFX.click();const px=parseInt(document.getElementById('math-x').value),py=parseInt(document.getElementById('math-y').value);if(isNaN(px)||isNaN(py)){showFeedback('Enter both x and y.',false);return;}if(px===sx&&py===sy){answered=true;registerCorrect();if(room.itemDrop)addItem(room.itemDrop);showFeedback(`✦ Correct! x=${sx}, y=${sy}.`,true);showNext(isLast()?'🏆 Claim Victory':'Advance →');}else{registerWrong();loseHP(room.penalty);showFeedback(`Wrong. x=${sx}, y=${sy}. −HP. Try again!`,false);}};
  form.appendChild(btn);aa.appendChild(form);
}

// RPS
function buildRPS(room,aa){
  const score=mkEl('div','rps-scoreboard','rps-score','You 0 — 0 Asura · First to 3 wins!');
  const grid=document.createElement('div');grid.className='rps-grid';
  [['✊','Rock',1],['✋','Paper',2],['✌️','Scissors',3]].forEach(([em,nm,val])=>{const b=document.createElement('button');b.className='rps-btn';b.title=nm;b.innerHTML=em;b.onclick=()=>playRPS(val,room,grid);grid.appendChild(b);});
  const log=mkEl('div','rps-log','rps-log','Choose your move!');
  aa.appendChild(score);aa.appendChild(grid);aa.appendChild(log);
}
function playRPS(p,room,grid){
  if(answered)return;SFX.click();
  const a=rnd(3)+1;const E=['','✊','✋','✌️'];
  let msg=`You: ${E[p]} vs Asura: ${E[a]} — `;
  if(p===a){msg+='Tie!';}
  else if((p===1&&a===3)||(p===2&&a===1)||(p===3&&a===2)){rpsWins++;msg+='You win the round! 🎉';gainHP(10);SFX.correct();}
  else{rpsAsura++;msg+='Asura wins the round!';loseHP(room.penalty);}
  document.getElementById('rps-log').textContent=msg;
  document.getElementById('rps-score').textContent=`You ${rpsWins} — ${rpsAsura} Asura · First to 3 wins!`;
  if(rpsWins>=3){answered=true;registerCorrect();if(room.itemDrop)addItem(room.itemDrop);grid.querySelectorAll('.rps-btn').forEach(b=>b.disabled=true);showFeedback('✦ You defeated Asura! The door swings open.',true);showNext(isLast()?'🏆 Claim Victory':'Advance →');}
  else if(playerHP<=0){answered=true;grid.querySelectorAll('.rps-btn').forEach(b=>b.disabled=true);}
}

// HORSE — wrong pick eliminates that horse, floor of 2
function buildHorse(room,aa){
  // activeHorses tracks which horses are still in the race
  let activeHorses=room.horses.map((name,i)=>({name,i,color:["#e74c3c","#f39c12","#2ecc71","#3498db","#9b59b6"][i]}));
  const FLOOR=2;
  renderHorseGrid(activeHorses,room,aa);
}

function renderHorseGrid(activeHorses,room,aa){
  // Remove old grid and track if they exist
  const oldGrid=document.getElementById("horse-grid");if(oldGrid)oldGrid.remove();
  const oldTrack=document.querySelector(".race-track");if(oldTrack)oldTrack.remove();

  const grid=document.createElement("div");grid.className="horse-grid";grid.id="horse-grid";
  const label=document.createElement("div");
  label.style.cssText="font-family:var(--font-h);font-size:.65rem;color:var(--text-muted);margin-bottom:.5rem;letter-spacing:.1em;";
  label.textContent=activeHorses.length+" horses remaining — eliminated horses are out for good!";
  aa.appendChild(label);

  activeHorses.forEach(h=>{
    const b=document.createElement("button");b.className="horse-btn";b.textContent=h.name;
    b.onclick=()=>runRaceWithActive(activeHorses.indexOf(h),activeHorses,room,grid,aa,label);
    grid.appendChild(b);
  });
  aa.appendChild(grid);
}

function runRaceWithActive(pickedIdx,activeHorses,room,grid,aa,label){
  if(answered)return;SFX.click();
  grid.querySelectorAll(".horse-btn").forEach(b=>b.disabled=true);

  const track=document.createElement("div");track.className="race-track";
  const header=document.createElement("div");header.className="race-header";
  header.innerHTML="<span>HORSE</span><span>TRACK</span><span>🏁 FINISH</span>";
  track.appendChild(header);

  const winnerIdx=rnd(activeHorses.length);
  activeHorses.forEach((h,i)=>{
    const row=document.createElement("div");row.className="race-row";
    const name=document.createElement("div");name.className="race-name";name.textContent=h.name;
    const lane=document.createElement("div");lane.className="race-lane";
    const finish=document.createElement("div");finish.className="race-finish-line";
    const flbl=document.createElement("div");flbl.className="race-finish-label";flbl.textContent="FINISH";
    lane.appendChild(finish);lane.appendChild(flbl);
    const fill=document.createElement("div");fill.className="race-horse-fill";fill.id="rfill-"+i;
    fill.style.cssText="background:"+h.color+";width:0%;";fill.textContent="🐎";
    lane.appendChild(fill);row.appendChild(name);row.appendChild(lane);track.appendChild(row);
  });
  aa.appendChild(track);

  const cd=document.createElement("div");cd.className="race-countdown";cd.textContent="Ready...";aa.appendChild(cd);
  showFeedback("🏁 The horses are at the gate!",true);
  setTimeout(()=>{cd.textContent="Set...";SFX.horseTrot();},700);
  setTimeout(()=>{cd.textContent="🚀 GO!";SFX.levelUp();},1400);
  setTimeout(()=>{
    cd.remove();
    let ticks=0;
    const iv=setInterval(()=>{
      ticks++;
      activeHorses.forEach((_,i)=>{
        const fill=document.getElementById("rfill-"+i);
        if(fill){const pos=parseFloat(fill.style.width)||0;fill.style.width=Math.min(pos+(rnd(12)+4)*(i===winnerIdx?1.25:1.0)/300*100,95)+"%";}
      });
      if(ticks%2===0)SFX.horseTrot();
      if(ticks>=18){
        clearInterval(iv);
        activeHorses.forEach((_,i)=>{const fill=document.getElementById("rfill-"+i);if(fill){fill.style.width="100%";fill.style.transition="width .4s ease";}});
        setTimeout(()=>{
          grid.querySelectorAll(".horse-btn").forEach((b,i)=>{b.classList.add(i===winnerIdx?"winner":"loser");});
          if(pickedIdx===winnerIdx){
            answered=true;registerCorrect();if(room.itemDrop)addItem(room.itemDrop);SFX.levelUp();
            showFeedback("🏆 "+activeHorses[winnerIdx].name+" wins! Your horse triumphs!",true);
            showNext(isLast()?"🏆 Claim Victory":"Advance →");
          } else {
            registerWrong();loseHP(room.penalty);
            const losingHorse=activeHorses[pickedIdx];
            // Eliminate the losing horse — unless we are at the floor
            if(activeHorses.length>room.FLOOR||activeHorses.length>2){
              activeHorses=activeHorses.filter((_,i)=>i!==pickedIdx);
            }
            showFeedback(
              activeHorses.length>2
                ? activeHorses[winnerIdx]?.name+" wins! "+losingHorse.name+" is eliminated. "+activeHorses.length+" horses remain."
                : activeHorses[winnerIdx]?.name+" wins! Only 2 horses left. −HP.",
              false
            );
            setTimeout(()=>{
              if(playerHP>0){
                const t=document.querySelector(".race-track");if(t)t.remove();
                label.textContent=activeHorses.length+" horses remaining — eliminated horses are out for good!";
                renderHorseGrid(activeHorses,room,aa);
                document.getElementById("feedback").className="feedback";
              }
            },1800);
          }
        },500);
      }
    },160);
  },2000);
}

// PUZZLE
function buildPuzzle(room,aa){puzzleCorrect=0;nextRiddle(room,aa);}
function nextRiddle(room,aa){
  const idx=rnd(room.riddles.length);currentPuzzleIdx=idx;const r=room.riddles[idx];
  document.getElementById('challenge-question').innerHTML=`<em>${r.q}</em><br><br><span style="color:var(--text-dim);font-size:.86rem;">💡 ${r.hint}</span>`;
  aa.innerHTML='';
  const row=document.createElement('div');row.className='text-input-row';
  const inp=document.createElement('input');inp.className='text-inp';inp.id='puzz-inp';inp.placeholder='Your answer...';inp.onkeydown=e=>{if(e.key==='Enter')submitPuzzle(room,aa);};
  const btn=document.createElement('button');btn.className='btn btn-gold';btn.textContent='Answer';btn.onclick=()=>submitPuzzle(room,aa);
  const prog=document.createElement('div');prog.style.cssText='font-family:var(--font-h);font-size:.6rem;color:var(--text-muted);margin-top:.4rem;';prog.textContent=`Question ${puzzleCorrect+1} of 3`;
  row.appendChild(inp);row.appendChild(btn);aa.appendChild(row);aa.appendChild(prog);
  setTimeout(()=>inp.focus(),100);
}
function submitPuzzle(room,aa){
  if(answered)return;SFX.click();
  const inp=document.getElementById('puzz-inp');const guess=inp.value.trim().toLowerCase();inp.value='';if(!guess)return;
  const r=room.riddles[currentPuzzleIdx];
  if(guess===r.a){puzzleCorrect++;SFX.correct();if(puzzleCorrect>=3){answered=true;registerCorrect();if(room.itemDrop)addItem(room.itemDrop);showFeedback('✦ All 3 riddles solved! The symbols fade.',true);showNext(isLast()?'🏆 Claim Victory':'Advance →');}else{showFeedback(`✦ Correct! ${puzzleCorrect}/3 done.`,true);setTimeout(()=>{document.getElementById('feedback').className='feedback';nextRiddle(room,aa);},900);}}
  else{registerWrong();loseHP(room.penalty);showFeedback(`Wrong! Answer: "${r.a}". −HP.`,false);if(playerHP>0)setTimeout(()=>{document.getElementById('feedback').className='feedback';nextRiddle(room,aa);},1200);}
}

// MCQ
function buildMCQ(room,aa){
  const g=document.createElement('div');g.className='choices';
  room.choices.forEach((c,i)=>{
    const b=document.createElement('button');b.className='choice-btn';b.textContent=`${['A','B','C','D'][i]}. ${c}`;
    b.onclick=()=>{if(answered)return;answered=true;SFX.click();g.querySelectorAll('.choice-btn').forEach(x=>x.disabled=true);g.querySelectorAll('.choice-btn')[room.answer].classList.add('correct');if(i===room.answer){registerCorrect();if(room.itemDrop)addItem(room.itemDrop);showFeedback('✦ Correct!',true);}else{b.classList.add('wrong');registerWrong();loseHP(room.penalty);showFeedback(`Wrong. Correct: ${room.choices[room.answer]}. −HP.`,false);}showNext(isLast()?'🏆 Claim Victory':'Advance →');};
    g.appendChild(b);
  });
  aa.appendChild(g);
}

// LORE ROOM
function buildLore(room,aa){
  const box=document.createElement('div');box.className='lore-box';box.textContent=room.loreText;
  aa.appendChild(box);
  setTimeout(()=>{if(room.itemDrop){addItem(room.itemDrop);showFeedback(`✦ You found a ${ITEMS[room.itemDrop].name} tucked between the pages.`,true);}answered=true;registerCorrect();showNext('Face Asura →');},2500);
}

/* ================================================================
   BOSS 1 — ASURA THE GATEKEEPER
   ================================================================ */
function buildBoss1(room,aa){
  bossHP=bossMaxHP=DIFF[selectedDifficulty].bossHP;
  buildBossArena(room,aa,'asura1',
`    ________________________
   |                        |
   |   ____        ____     |
   |  / () \\      / () \\    |
   |  \\____/      \\____/    |
   |       \\  __  /         |
   |        \\/  \\/          |
   |        /    \\          |
   |   ASURA — THE GATEKEEPER`,
  ['⚔ Attack','🛡 Defend','💥 Heavy Strike'],[1,2,3]);
}

/* ================================================================
   BOSS 2 — ASURA UNLEASHED
   ================================================================ */
function buildBoss2(room,aa){
  bossHP=bossMaxHP=DIFF[selectedDifficulty].boss2HP;
  bossHasHealed=false;asuraRageMode=false;
  buildBossArena(room,aa,'asura2',
`    ________________________________
   |                                |
   |  ___----___        ___----___  |
   | /    ()    \\      /    ()    \\ |
   | \\__________/      \\__________/ |
   |        RAGE MODE ACTIVE        |
   |   ASURA II — FULLY UNLEASHED   `,
  ['⚔ Attack','🛡 Defend','💥 Heavy Strike','🌀 Combo Strike'],[1,2,3,4]);
}

function buildBossArena(room,aa,cssClass,ascii,labels,ids){
  const arena=document.createElement('div');arena.className='boss-arena';
  const art=document.createElement('div');art.className=`boss-ascii ${cssClass}`;art.id='boss-art';art.textContent=ascii;

  const vsRow=document.createElement('div');vsRow.className='boss-vs-row';
  const bF=document.createElement('div');bF.className='boss-fighter';
  bF.innerHTML=`<div class="fighter-name" style="color:#f08080;">👹 ${cssClass==='asura1'?'ASURA I':'ASURA II'}</div>
    <div class="fighter-hp-bar-bg"><div class="fighter-hp-bar-fill" id="boss-hp-fill" style="width:100%;background:linear-gradient(90deg,#8b0000,#e74c3c);"></div></div>
    <div class="fighter-hp-text" id="boss-hp-text">${bossHP}/${bossMaxHP}</div>`;
  const vsd=document.createElement('div');vsd.className='vs-divider';vsd.textContent='VS';
  const yF=document.createElement('div');yF.className='boss-fighter';
  yF.innerHTML=`<div class="fighter-name" style="color:#80f080;">⚔ ${playerName.toUpperCase()}</div>
    <div class="fighter-hp-bar-bg"><div class="fighter-hp-bar-fill" id="you-hp-fill" style="width:${playerHP}%;background:linear-gradient(90deg,#006000,#27ae60);"></div></div>
    <div class="fighter-hp-text" id="you-hp-text">${playerHP}/${playerMaxHP}</div>`;
  vsRow.appendChild(bF);vsRow.appendChild(vsd);vsRow.appendChild(yF);

  const turnBanner=document.createElement('div');turnBanner.className='boss-turn-banner player-turn';turnBanner.id='boss-turn-banner';turnBanner.textContent='⚔ YOUR TURN — Choose your action!';
  const log=document.createElement('div');log.className='boss-log';log.id='boss-log';
  log.textContent=cssClass==='asura1'?'"You dare enter my domain?" Asura steps forward, amber eyes glowing.':'"You actually made it." Asura\'s voice shakes the floor. "Now face my true power."';

  const moves=document.createElement('div');moves.className='boss-moves';moves.id='boss-moves';
  const cls=['btn-red','btn-blue','btn-purple','btn-orange'];
  const descs=['25 dmg, reliable','Reduce incoming','40 dmg, may miss','2×15 dmg, risky'];
  ids.forEach((id,i)=>{
    const b=document.createElement('button');b.className=`btn ${cls[i]}`;b.id=`boss-move-${id}`;
    b.innerHTML=`${labels[i]}<br><span style="font-size:.5rem;opacity:.7;">${descs[i]}</span>`;
    b.onclick=()=>playerTurn(id,room,moves);
    moves.appendChild(b);
  });

  arena.appendChild(art);arena.appendChild(vsRow);arena.appendChild(turnBanner);arena.appendChild(log);arena.appendChild(moves);
  aa.appendChild(arena);
}

/* ================================================================
   BOSS COMBAT
   ================================================================ */
function playerTurn(action,room,moves){
  if(answered||isBossTurn)return;
  isBossTurn=true;SFX.click();setMoves(moves,false);
  const art=document.getElementById('boss-art'),log=document.getElementById('boss-log'),banner=document.getElementById('boss-turn-banner');
  let msg='';

  if(action===1){const dmg=25;bossHP=Math.max(0,bossHP-dmg);SFX.bossHit();flashBoss(art);spawnDmgFloat('-'+dmg,true);msg=`You strike for ${dmg} damage! ⚔`;}
  else if(action===2){shieldActive=true;msg='You raise your shield, bracing for impact... 🛡';}
  else if(action===3){
    const hit=Math.random()>.38;
    if(hit){const dmg=40;bossHP=Math.max(0,bossHP-dmg);SFX.bossHit();flashBoss(art);spawnDmgFloat('-'+dmg,true);msg=`💥 Heavy Strike connects! ${dmg} damage!`;}
    else{SFX.wrong();spawnDmgFloat('MISS',false,true);msg='💥 Heavy Strike — you miss! Asura sidesteps!';}
  }
  else if(action===4){
    // Combo — two quick hits
    const h1=Math.random()>.3,h2=Math.random()>.3;let total=0;
    if(h1){total+=15;setTimeout(()=>{SFX.bossHit();flashBoss(document.getElementById('boss-art'));spawnDmgFloat('-15',true);},100);}
    if(h2){total+=15;setTimeout(()=>{SFX.bossHit();flashBoss(document.getElementById('boss-art'));spawnDmgFloat('-15',true);},350);}
    if(!h1&&!h2)spawnDmgFloat('MISS',false,true);
    setTimeout(()=>{bossHP=Math.max(0,bossHP-total);if(log)log.textContent=`🌀 Combo: ${total} total damage!`;updateBossBars();checkRageMode(room);if(bossHP<=0){bossDied(room);return;}},450);
    msg='🌀 Launching combo...';
  }

  if(log&&action!==4)log.textContent=msg;
  updateBossBars();
  if(action!==4){checkRageMode(room);if(bossHP<=0){bossDied(room);return;}}
  if(banner){banner.className='boss-turn-banner enemy-turn';banner.textContent=asuraRageMode?'🔥 ASURA RAGES — HIS TURN!':'👹 ASURA\'S TURN...';}
  const delay=action===4?700:1200;
  setTimeout(()=>enemyTurn(action,room,moves),delay);
}

function checkRageMode(room){
  if(room.type==='boss2'&&!asuraRageMode&&bossHP<=bossMaxHP*.5&&bossHP>0){
    asuraRageMode=true;SFX.rage();triggerDamageFlash();
    const art=document.getElementById('boss-art');if(art)art.className='boss-ascii asura2';
    const log=document.getElementById('boss-log');if(log)log.textContent='⚠ RAGE MODE! Asura\'s power doubles — he attacks every turn!';
    const existing=document.querySelector('.rage-banner');if(existing)existing.remove();
    const banner=document.createElement('div');banner.className='rage-banner';banner.textContent='🔥 RAGE MODE — ATTACKS EVERY TURN! 🔥';
    const art2=document.getElementById('boss-art');if(art2)art2.insertAdjacentElement('afterend',banner);
  }
  // Hard mode: Asura II heals once at 70%
  if(room.type==='boss2'&&!bossHasHealed&&bossHP<=bossMaxHP*.7&&bossHP>0&&selectedDifficulty==='hard'){
    bossHasHealed=true;const h=30;bossHP=Math.min(bossMaxHP,bossHP+h);SFX.heal();spawnDmgFloat('+'+h,true);
    const log=document.getElementById('boss-log');if(log)log.textContent=`Asura draws on dark energy — heals ${h} HP!`;
    updateBossBars();
  }
}

function enemyTurn(playerAction,room,moves){
  const log=document.getElementById('boss-log'),banner=document.getElementById('boss-turn-banner');
  const attacks=asuraRageMode||Math.random()<0.6;
  if(attacks){
    const rageBonus=asuraRageMode?1.5:1;
    const maxD=playerAction===2?10:28,minD=playerAction===2?3:8;
    const dmg=Math.round((rnd(maxD-minD+1)+minD)*rageBonus);
    if(shieldActive){shieldActive=false;spawnDmgFloat('BLOCKED',false,true);if(log)log.textContent=`${asuraRageMode?'🔥':''} Asura strikes — your shield absorbs it! 🛡`;}
    else{SFX.bossAtk();triggerDamageFlash();loseHP(dmg);spawnDmgFloat('-'+dmg,false);if(log)log.textContent=`${asuraRageMode?'🔥 RAGE! ':''} Asura strikes for ${dmg} damage! ❤ ${playerHP} HP remaining.`;
      const yf=document.getElementById('you-hp-fill');if(yf)yf.style.width=(playerHP/playerMaxHP*100)+'%';
      const yt=document.getElementById('you-hp-text');if(yt)yt.textContent=`${playerHP}/${playerMaxHP}`;}
  } else {
    SFX.click();spawnDmgFloat('MISS',false,true);if(log)log.textContent='Asura swings — and misses! 💨 Your opening!';
  }
  updateBossBars();isBossTurn=false;shieldActive=false;
  if(playerHP<=0)return;
  if(bossHP<=0){bossDied(room);return;}
  if(banner){banner.className='boss-turn-banner player-turn';banner.textContent=asuraRageMode?'⚔ YOUR TURN — Asura is enraged! Strike fast!':'⚔ YOUR TURN — Choose your action!';}
  setMoves(moves,true);
}

function bossDied(room){
  answered=true;
  if(room.type==='boss1'){
    asura1Beaten=true;registerCorrect();SFX.victory();
    setMoves(document.getElementById('boss-moves'),false);
    const art=document.getElementById('boss-art');if(art){art.style.opacity='.3';art.style.color='#606060';}
    showFeedback('✦ ASURA FALLS! He laughs as he fades: "This isn\'t over, mortal... I\'ll be waiting at the throne." The iron door opens.',true);
    showNext('Advance →');
  } else {
    registerCorrect();SFX.victory();
    setMoves(document.getElementById('boss-moves'),false);
    document.querySelectorAll('.rage-banner').forEach(b=>b.remove());
    const art=document.getElementById('boss-art');if(art){art.style.opacity='.2';art.style.color='#404040';}
    showFeedback('✦ ASURA IS DEFEATED! His form dissolves into shadow. "Impossible..." The mansion falls silent. You have won.',true);
    showNext('🏆 Claim Victory');
  }
  updateSidebar();
}

function updateBossBars(){
  const bf=document.getElementById('boss-hp-fill');if(bf)bf.style.width=Math.max(0,(bossHP/bossMaxHP)*100)+'%';
  const bt=document.getElementById('boss-hp-text');if(bt)bt.textContent=`${Math.max(0,bossHP)}/${bossMaxHP}`;
  const yf=document.getElementById('you-hp-fill');if(yf)yf.style.width=(playerHP/playerMaxHP*100)+'%';
  const yt=document.getElementById('you-hp-text');if(yt)yt.textContent=`${playerHP}/${playerMaxHP}`;
}

function flashBoss(art){if(!art)return;art.classList.add('hit');setTimeout(()=>art.classList.remove('hit'),360);}
function setMoves(moves,on){if(!moves)return;moves.querySelectorAll('button').forEach(b=>b.disabled=!on);}

/* ================================================================
   NAVIGATION
   ================================================================ */
function nextRoom(){
  SFX.click();currentRoomIndex++;
  if(currentRoomIndex>=ROOMS.length)triggerWin();
  else showApproachScreen();
}

/* ================================================================
   ENDINGS
   ================================================================ */
function triggerGameOver(){
  SFX.gameOver();if(timerInterval){clearInterval(timerInterval);timerInterval=null;}
  showScreen('screen-gameover');
  document.getElementById('gameover-msg').textContent=`${playerName} fought bravely through ${currentRoomIndex+1} rooms — but the mansion's darkness consumed them. The Mansion of Destiny claims another soul.`;
  document.getElementById('go-rooms').textContent=`🏰 Reached Room: ${currentRoomIndex+1}`;
  document.getElementById('go-score').textContent=`⭐ Score: ${Math.round(playerScore)}`;
  document.getElementById('go-deaths').textContent=`💀 Deaths: ${deathCount}`;
}

function triggerWin(){
  SFX.victory();if(timerInterval){clearInterval(timerInterval);timerInterval=null;}
  const elapsed=Math.round((Date.now()-speedrunStart)/1000);
  const rank=playerHP>=90?'🏅 S Rank':playerHP>=70?'🥇 A Rank':playerHP>=40?'🥈 B Rank':'🥉 C Rank';
  const stars='⭐'.repeat(Math.max(1,playerLives+1));
  showScreen('screen-win');
  document.getElementById('win-msg').textContent=`${playerName} conquered all ${ROOMS.length} chambers and defeated Asura twice! The mansion is yours.`;
  document.getElementById('win-stars').textContent=stars;
  document.getElementById('win-hp').textContent=`❤ HP: ${playerHP}`;
  document.getElementById('win-rooms').textContent=`🏰 ${clearedRooms.size}/${ROOMS.length}`;
  document.getElementById('win-score').textContent=`⭐ ${Math.round(playerScore)}`;
  document.getElementById('win-rank').textContent=rank;
  document.getElementById('win-deaths').textContent=`💀 Deaths: ${deathCount}`;
  document.getElementById('win-time').textContent=`⏱ ${Math.floor(elapsed/60)}m ${elapsed%60}s`;
  document.getElementById('win-charges').textContent=`⚔ Charged: ${chargeCount}x`;
  document.getElementById('share-card').textContent=
    `🏰 I completed Mansion of Destiny!\n`+
    `📊 Score: ${Math.round(playerScore)} · HP: ${playerHP} · ${rank}\n`+
    `💀 Deaths: ${deathCount} · ⏱ ${Math.floor(elapsed/60)}m ${elapsed%60}s\n`+
    `⚔ Charged in ${chargeCount}x · 🐔 Sneaked ${sneakCount}x\n`+
    `🎮 [your portfolio link here]`;
  saveScore(playerName,Math.round(playerScore),rank,selectedDifficulty);

  // Show global rank if Supabase is configured
  if(SUPABASE_URL!=="YOUR_SUPABASE_URL"){
    setTimeout(async()=>{
      const all=await fetchGlobalScores();
      if(all&&all.length){
        const pos=all.findIndex(s=>s.name===playerName&&s.score===Math.round(playerScore));
        if(pos>=0){
          const rankChip=document.getElementById("win-rank");
          if(rankChip)rankChip.textContent=rank+" · #"+(pos+1)+" Globally";
        }
        const count=await fetchPlayerCount();
        if(count){showComboBanner("🌍 You are player #"+count+" worldwide!");}
      }
    },1500);
  }
}

/* ================================================================
   LEADERBOARD
   ================================================================ */
/* ================================================================
   SUPABASE GLOBAL LEADERBOARD
   Replace SUPABASE_URL and SUPABASE_KEY with your own from supabase.com
   Free tier — no backend needed, just sign up and create a table called
   "scores" with columns: name(text), score(int8), rank(text), diff(text)
   ================================================================ */
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY";

// Submit score to Supabase global leaderboard
async function saveScoreGlobal(name,score,rank,diff){
  // Always save locally as backup
  try{
    let s=JSON.parse(localStorage.getItem("mansion_final")||"[]");
    s.push({name,score,rank,diff,date:new Date().toLocaleDateString()});
    s.sort((a,b)=>b.score-a.score);s=s.slice(0,10);
    localStorage.setItem("mansion_final",JSON.stringify(s));
  }catch(e){}

  // Skip Supabase if not configured yet
  if(SUPABASE_URL==="YOUR_SUPABASE_URL")return;

  try{
    await fetch(SUPABASE_URL+"/rest/v1/scores",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "apikey":SUPABASE_KEY,
        "Authorization":"Bearer "+SUPABASE_KEY,
        "Prefer":"return=minimal"
      },
      body:JSON.stringify({name,score,rank,diff,played_at:new Date().toISOString()})
    });
  }catch(e){console.log("Supabase save failed:",e);}
}

// Fetch global scores from Supabase
async function fetchGlobalScores(){
  if(SUPABASE_URL==="YOUR_SUPABASE_URL")return null;
  try{
    const res=await fetch(
      SUPABASE_URL+"/rest/v1/scores?select=name,score,rank,diff&order=score.desc&limit=10",
      {headers:{"apikey":SUPABASE_KEY,"Authorization":"Bearer "+SUPABASE_KEY}}
    );
    return await res.json();
  }catch(e){return null;}
}

// Count total players from Supabase
async function fetchPlayerCount(){
  if(SUPABASE_URL==="YOUR_SUPABASE_URL")return null;
  try{
    const res=await fetch(
      SUPABASE_URL+"/rest/v1/scores?select=id",
      {headers:{"apikey":SUPABASE_KEY,"Authorization":"Bearer "+SUPABASE_KEY,"Prefer":"count=exact","Range":"0-0"}}
    );
    const count=res.headers.get("content-range");
    return count?parseInt(count.split("/")[1]):null;
  }catch(e){return null;}
}

function saveScore(name,score,rank,diff){
  saveScoreGlobal(name,score,rank,diff);
}

async function showLeaderboard(){
  SFX.click();
  showScreen("screen-leaderboard");
  const list=document.getElementById("lb-list");
  list.innerHTML="<div class='lb-empty'>Loading scores...</div>";

  // Try global first, fall back to local
  let scores=await fetchGlobalScores();
  const isGlobal=scores&&scores.length>0;
  const playerCount=await fetchPlayerCount();

  if(!isGlobal){
    try{scores=JSON.parse(localStorage.getItem("mansion_final")||"[]");}catch(e){scores=[];}
  }

  list.innerHTML="";

  // Player count banner
  if(playerCount!=null){
    const banner=document.createElement("div");
    banner.style.cssText="font-family:var(--font-h);font-size:.65rem;color:var(--text-muted);letter-spacing:.1em;margin-bottom:.8rem;padding:.4rem;border:1px solid var(--border);border-radius:var(--r);background:rgba(0,0,0,.15);";
    banner.textContent="👥 "+playerCount+" adventurers have entered the mansion worldwide";
    list.appendChild(banner);
  }

  // Leaderboard type label
  const typeLabel=document.createElement("div");
  typeLabel.style.cssText="font-family:var(--font-h);font-size:.55rem;color:var(--text-muted);letter-spacing:.15em;text-transform:uppercase;margin-bottom:.5rem;";
  typeLabel.textContent=isGlobal?"🌍 Global Leaderboard":"📱 Local Leaderboard (configure Supabase for global)";
  list.appendChild(typeLabel);

  if(!scores||!scores.length){
    list.innerHTML+="<div class='lb-empty'>No scores yet. Be the first!</div>";
    return;
  }

  scores.forEach((s,i)=>{
    const row=document.createElement("div");row.className="lb-row";
    row.innerHTML="<span class='lb-rank'>"+(["🥇","🥈","🥉"][i]||(i+1)+".")+"</span>"+
      "<span class='lb-name'>"+s.name+"</span>"+
      "<span style='font-size:.68rem;color:var(--text-muted);margin-right:.5rem;'>"+s.rank+" · "+s.diff+"</span>"+
      "<span class='lb-score'>"+s.score+"</span>";
    list.appendChild(row);
  });
}

/* ================================================================
   UTILS
   ================================================================ */
function rnd(n){return Math.floor(Math.random()*n);}
function mkEl(tag,cls,id,text){const e=document.createElement(tag);if(cls)e.className=cls;if(id)e.id=id;if(text)e.textContent=text;return e;}

function restartGame(){
  SFX.click();if(timerInterval){clearInterval(timerInterval);timerInterval=null;}
  playerHP=100;playerLives=3;playerScore=0;playerInventory=[];currentRoomIndex=0;
  roomsCleared=0;comboStreak=0;visitedRooms=new Set();clearedRooms=new Set();
  firstTryRooms=new Set();deathCount=0;asura1Beaten=false;asuraRageMode=false;
  shieldActive=false;lastApproach='medium';chargeCount=0;sneakCount=0;npcOffer=null;
  document.body.className='stage-0';
  showScreen('screen-title');
}

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('player-name').addEventListener('keydown',e=>{if(e.key==='Enter')startGame();});
  document.body.classList.add('stage-0');
});
