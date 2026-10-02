/* =========================================================
   ИГРОВОЙ СЛОЙ: звук, эффекты, панель прогресса
   ========================================================= */

/* ---------- звук (WebAudio, без файлов) ---------- */
const A = (function(){
  let ctx = null;
  function ac(){
    if(!ctx){ try{ ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ ctx = null; } }
    if(ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol){
    if(!S.settings.sfx) return;
    const c = ac(); if(!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(vol || 0.14, c.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  function chord(list){
    list.forEach(function(f, i){ setTimeout(function(){ tone(f, 0.34, 'sine', 0.12); }, i*90); });
  }
  return {
    unlock: ac,
    sfx: function(kind){
      if(kind === 'click')   tone(520, 0.09, 'triangle', 0.10);
      else if(kind === 'pop')tone(760, 0.11, 'sine', 0.11);
      else if(kind === 'correct') chord([660, 880, 1180]);
      else if(kind === 'wrong'){ tone(300, 0.18, 'sawtooth', 0.09); setTimeout(function(){ tone(220, 0.22, 'sawtooth', 0.09); }, 130); }
      else if(kind === 'crystal') chord([520, 780, 1040, 1560]);
      else if(kind === 'walk') tone(420, 0.07, 'sine', 0.07);
    }
  };
})();

/* ---------- эффекты ---------- */
function burst(x, y){
  const fx = document.getElementById('fx');
  const glyphs = ['✨','⭐','💫','🌟'];
  for(let i=0;i<12;i++){
    const s = el('span','spark', pick(glyphs));
    s.style.left = x+'px'; s.style.top = y+'px';
    s.style.setProperty('--dx', (rnd(180)-90)+'px');
    s.style.setProperty('--dy', (-40-rnd(140))+'px');
    s.style.animationDelay = (i*0.02)+'s';
    fx.appendChild(s);
    setTimeout(function(){ if(s.parentNode) s.parentNode.removeChild(s); }, 1400);
  }
}
function burstAt(node){
  if(!node) return;
  const r = node.getBoundingClientRect();
  burst(r.left + r.width/2, r.top + r.height/2);
}
function toast(text, kind){
  const t = el('div','toast'+(kind?' '+kind:''), text);
  document.body.appendChild(t);
  setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 1450);
}

/* ---------- центрирование плавающих полей ----------
   antiOverlap() разносит буквы, но прижимает их к левому верхнему углу.
   Здесь сдвигаем всю группу целиком в центр контейнера. */
function centerFloats(container){
  if(!container) return;
  const els = Array.prototype.slice.call(container.querySelectorAll('.letterFloat,.floatTile'));
  if(!els.length) return;
  const cr = container.getBoundingClientRect();
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  els.forEach(function(e){
    const r = e.getBoundingClientRect();
    minX = Math.min(minX, r.left - cr.left); minY = Math.min(minY, r.top - cr.top);
    maxX = Math.max(maxX, r.right - cr.left); maxY = Math.max(maxY, r.bottom - cr.top);
  });
  const w = maxX - minX, h = maxY - minY;
  const dx = (cr.width  - w)/2 - minX;
  const dy = (cr.height - h)/2 - minY;
  els.forEach(function(e){
    e.style.left = ((parseFloat(e.style.left) || 0) + dx) + 'px';
    e.style.top  = ((parseFloat(e.style.top)  || 0) + dy) + 'px';
  });
}

/* ---------- панель прогресса ---------- */
function updateHUD(){
  const total = LOCS.length;
  const got = S.crystals.length;
  const fill = document.getElementById('progFill');
  const txt  = document.getElementById('progText');
  if(fill) fill.style.width = Math.round(got/total*100)+'%';
  if(txt)  txt.textContent = got+' / '+total;

  const row = document.getElementById('crystals');
  if(row){
    row.innerHTML = '';
    LOCS.forEach(function(loc){
      const c = el('span','crys'+(S.crystals.indexOf(loc.id)>=0?' on':''));
      c.textContent = '💎';
      c.title = loc.name;
      row.appendChild(c);
    });
  }
  const loc = LOCS[Math.max(0, Math.min(total-1, S.stage-1))];
  const nowEl = document.getElementById('nowIsland');
  if(nowEl) nowEl.textContent = loc ? (ICONS[loc.id]+' '+loc.name) : '';
}

/* ---------- модальные окна ---------- */
function showModal(html, buttons){
  const m = document.getElementById('modal');
  m.innerHTML = '';
  const card = el('div','modalCard');
  card.innerHTML = html;
  (buttons||[]).forEach(function(b){
    const btn = el('button','btn '+(b.cls||'primary'), b.t);
    btn.onclick = function(){ A.sfx('click'); if(b.fn) b.fn(); };
    card.appendChild(btn);
  });
  m.appendChild(card);
  m.classList.add('show');
}
function closeModal(){ document.getElementById('modal').classList.remove('show'); }
