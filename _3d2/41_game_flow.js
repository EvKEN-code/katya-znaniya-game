/* =========================================================
   ИГРОВОЙ ЦИКЛ: этапы, задания, боссы, награды
   ========================================================= */
let session = {stage:1, list:[], idx:0, boss:false, lock:false};
let CUR = null, ATTEMPTS = 0, VOICE = {r:1.05, p:1.2};
let bossGroup = null;

/* locOf() приходит из движка (20_engine.js) */
function pickHosts(){
  const pool = (S.team && S.team.length) ? S.team : ['masha'];
  return [pick(pool)];
}
function panelShow(v){ document.getElementById('taskPanel').classList.toggle('show', !!v); }
function setHost(name){
  const h = document.getElementById('hostName');
  if(h) h.textContent = name || '';
  const b = document.getElementById('bubbleText');
  if(b) b.textContent = '';
}

/* ---------- запуск этапа ---------- */
function startStage(id, bossMode){
  session = {stage:id, idx:0, boss:!!bossMode, lock:false, list:[]};
  if(bossMode){
    session.list = buildBoss(id);
  } else {
    if(!S.plan) S.plan = {};
    if(!S.prog) S.prog = {};
    if(!S.plan[id]){ S.plan[id] = makePlan(id); S.prog[id] = 0; save(); }
    session.list = S.plan[id];
    session.idx = S.prog[id] || 0;
  }
  refreshIslandStates();
  movePartyToIsland(id - 1);
  flyToIsland(id - 1);
  panelShow(true);
  updateHUD();
  if(bossMode) bossIntro(id); else nextTask();
}

/* ---------- бой с боссом: вступление ---------- */
function bossIntro(id){
  const loc = locOf(id), bk = loc.boss, c = CHARS[bk] || {};
  session.lock = true;

  /* босс появляется в 3D рядом с материком */
  if(bossGroup){ scene.remove(bossGroup); bossGroup = null; }
  const art = c.art || {};
  bossGroup = makeHero(new THREE.Color(art.cloth || '#8B5E3C').getHex(),
                       new THREE.Color(art.c || '#FFDCC0').getHex());
  bossGroup.scale.setScalar(1.8);
  const isl = islands[id - 1];
  bossGroup.position.set(isl.base.x, 32, isl.base.z - 100);
  scene.add(bossGroup);

  const area = document.getElementById('taskArea');
  area.innerHTML = '';
  const box = el('div','lbox');
  box.appendChild(el('div','bossName','👑 ' + (loc.bossTitle || c.n || 'Хранитель')));
  box.appendChild(el('div','bossSay','«' + (c.n || 'Хранитель') + ' проверит, чему ты научился на материке „' + loc.name + '“. Три задания — и кристалл твой!»'));
  area.appendChild(box);
  setHost(c.n || 'Хранитель');
  document.getElementById('bubbleText').textContent = 'Испытание материка «' + loc.name + '»!';
  TTS.stop(); TTS.say('Испытание! ' + (loc.bossTitle || '') + ' приготовил три задания.', 1.0, 1.1);

  setTimeout(function(){
    const btn = el('button','btn primary','⚔️ Начать испытание');
    btn.onclick = function(){ A.sfx('click'); nextTask(); };
    box.appendChild(btn);
  }, 260);
}

/* ---------- следующее задание ---------- */
function nextTask(){
  session.lock = false;
  ATTEMPTS = 0;
  if(session.idx >= session.list.length){
    if(session.boss) return finishStage();
    return bossIntro(session.stage);
  }
  const hard = session.boss || session.idx >= 2;
  const item = session.list[session.idx];
  const task = session.boss ? item : taskFrom(item, hard);
  runTask(task);
  const p = document.getElementById('taskProgress');
  if(p) p.textContent = (session.idx + 1) + ' / ' + session.list.length;
}

/* ---------- монтаж задания ---------- */
function runTask(task){
  const area = document.getElementById('taskArea');
  area.innerHTML = '';
  ATTEMPTS = 0;
  CUR = {task:task, hintFn:null};

  const hosts = pickHosts();
  const main = hosts[0] || 'masha';
  const c = CHARS[main] || {};
  VOICE = {r: c.r || 1.05, p: c.p || 1.2};
  setHost(c.n || '');
  document.getElementById('bubbleText').textContent = task.text;

  const ctx = {
    area: area,
    speak: function(t){ TTS.say(t, VOICE.r, VOICE.p); },
    title: function(t){ const h = el('div','taskTitle', t); area.appendChild(h); return h; },
    /* генераторы иногда дают два одинаковых неверных варианта (tMult при
       маленьком произведении, tNeighbour) — убираем дубли, правильный не трогаем */
    choice: function(items, isRight, opts){
      const seen = {}, out = [];
      items.forEach(function(it){
        const key = String(it.t);
        if(isRight(it)){ if(!seen[key]){ seen[key] = true; out.push(it); } return; }
        if(seen[key]) return;
        seen[key] = true; out.push(it);
      });
      return mkChoice(ctx, out, isRight, opts);
    },
    setHint: function(f){ CUR.hintFn = f; },
    correct: function(){ onCorrect(); },
    wrong: function(){ onWrong(); }
  };

  try{
    task.mount(ctx);
    /* раскладку плавающих букв считаем после того, как браузер разложит панель */
    requestAnimationFrame(function(){
      antiOverlap(area);                    // разносим буквы, чтобы не налезали
      centerFloats(area.querySelector('.drift') || area);   // и ставим группу по центру
    });
    TTS.say(task.text, VOICE.r, VOICE.p);
  }catch(err){
    console.error('task mount failed:', err);
    taskError(task, err.message || String(err));
  }
}

function taskError(task, msg){
  const area = document.getElementById('taskArea');
  area.innerHTML = '';
  const box = el('div','lbox');
  box.appendChild(el('div','taskTitle','😕 Задание не открылось'));
  box.appendChild(el('p','sub','Не страшно — нажми «Пропустить», и игра пойдёт дальше.'));
  if(msg) box.appendChild(el('p','sub', msg));
  const btn = el('button','btn ok','Пропустить →');
  btn.onclick = function(){
    session.lock = true; session.idx++;
    if(!session.boss){ S.prog[session.stage] = session.idx; save(); }
    nextTask();
  };
  box.appendChild(btn);
  area.appendChild(box);
  toast('⚠️ Задание пропущено','bad');
}

/* ---------- верно / неверно ---------- */
function onCorrect(){
  if(session.lock) return;
  session.lock = true;
  S.solved++; save();
  A.sfx('correct');
  const praise = pick(PRAISE);
  toast('✅ ' + praise,'ok');
  TTS.stop(); TTS.say(praise, VOICE.r, VOICE.p);
  const area = document.getElementById('taskArea');
  const r = area.getBoundingClientRect();
  burst(r.left + r.width/2, r.top + Math.min(r.height, 120));
  setTimeout(function(){
    session.idx++;
    if(!session.boss){ S.prog[session.stage] = session.idx; save(); }
    nextTask();
  }, 1400);
}
function onWrong(){
  S.mistakes++; save();
  A.sfx('wrong');
  ATTEMPTS++;
  const m = pick(RETRY);
  toast('🤔 ' + m,'bad');
  TTS.stop(); TTS.say(m, VOICE.r, VOICE.p);
  if(ATTEMPTS >= 2 && CUR && CUR.hintFn){
    setTimeout(function(){ if(CUR && CUR.hintFn) CUR.hintFn(); }, 900);
  }
}

/* ---------- материк пройден ---------- */
function finishStage(){
  const id = session.stage, loc = locOf(id);
  if(S.crystals.indexOf(id) < 0) S.crystals.push(id);
  if(S.stickers.indexOf(id) < 0) S.stickers.push(id);
  if(id < LOCS.length) S.stage = Math.min(LOCS.length, id + 1);
  delete S.plan[id]; delete S.prog[id];

  /* новый герой в команду */
  let joined = null;
  const rest = CHAR_KEYS.filter(function(k){ return (S.team || []).indexOf(k) < 0; });
  if(rest.length && S.team.length < TEAM_MAX && Math.random() < 0.85){
    joined = pick(rest); S.team.push(joined);
  }
  save();
  updateHUD(); refreshIslandStates();
  A.sfx('crystal');

  if(bossGroup){ scene.remove(bossGroup); bossGroup = null; }
  movePartyToIsland(Math.min(islands.length - 1, id));
  if(id < LOCS.length) flyToIsland(id);

  const last = (S.crystals.length >= LOCS.length);
  const html = '<div class="rwIcon">💎</div>'
    + '<h2>' + (last ? 'Все материки пройдены!' : 'Материк пройден!') + '</h2>'
    + '<p class="rwSub">' + loc.name + '</p>'
    + '<p class="rwLine">Кристаллов: <b>' + S.crystals.length + ' из ' + LOCS.length + '</b></p>'
    + (joined ? '<p class="rwLine">👋 <b>' + (CHARS[joined].n) + '</b> присоединился к команде!</p>' : '');

  const buttons = [];
  if(last){
    buttons.push({t:'🎉 Финальный салют!', cls:'primary', fn:function(){
      closeModal(); finale();
    }});
  } else {
    buttons.push({t:'Дальше →', cls:'primary', fn:function(){
      closeModal();
      startStage(Math.min(LOCS.length, id + 1), false);
    }});
  }
  buttons.push({t:'🗺️ К карте', cls:'ghost', fn:function(){
    closeModal(); panelShow(false); updateHUD(); refreshIslandStates();
  }});
  showModal(html, buttons);
}

/* ---------- финал ---------- */
function finale(){
  panelShow(false);
  A.sfx('crystal');
  for(let i=0;i<8;i++){
    setTimeout(function(){ burst(rnd(window.innerWidth), rnd(Math.round(window.innerHeight*0.6))); }, i*220);
  }
  showModal(
    '<div class="rwIcon">🎆</div><h2>Путешествие завершено!</h2>'
    + '<p class="rwLine">Пройдено материков: <b>' + LOCS.length + '</b></p>'
    + '<p class="rwLine">Решено заданий: <b>' + S.solved + '</b></p>'
    + '<p class="rwLine">Ошибок: <b>' + S.mistakes + '</b></p>'
    + '<p class="rwSub">Ты выучил буквы, цифры, слоги, слова, примеры и таблицу умножения!</p>',
    [{t:'🏅 Мой альбом', cls:'primary', fn:function(){ closeModal(); showAlbum(); }},
     {t:'🗺️ К карте', cls:'ghost', fn:function(){ closeModal(); updateHUD(); refreshIslandStates(); }}]
  );
}

/* ---------- альбом ---------- */
function showAlbum(){
  let grid = '';
  LOCS.forEach(function(loc){
    const got = S.crystals.indexOf(loc.id) >= 0;
    grid += '<div class="stickerCard' + (got ? '' : ' locked') + '">'
         + '<div class="se">' + (got ? '💎' : '🔒') + '</div>'
         + '<div class="stName">' + loc.name + '</div>'
         + '<div class="stSub">' + loc.sub + '</div></div>';
  });
  showModal(
    '<h2>🏅 Мой альбом</h2>'
    + '<p class="rwSub">Наклейки дают за каждый пройденный материк.</p>'
    + '<div id="albumGrid">' + grid + '</div>',
    [{t:'Закрыть', cls:'primary', fn:closeModal}]
  );
}
