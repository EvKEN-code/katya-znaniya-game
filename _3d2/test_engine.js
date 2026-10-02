/* Проверка извлечённого движка: все этапы, боссы и монтаж заданий.
   Запуск: node _3d2/test_engine.js */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('C:/Users/krepakov/.workbuddy-ai/binaries/node/workspace/node_modules/jsdom');

const code = fs.readFileSync(path.join(__dirname, '20_engine.js'), 'utf8');
const dom = new JSDOM('<!DOCTYPE html><body></body>', { pretendToBeVisual: true, url: 'http://localhost/' });
const w = dom.window;

w.speechSynthesis = { getVoices: function(){ return []; }, speak: function(){}, cancel: function(){} };

let fails = 0, checks = 0;
function ok(cond, msg){ checks++; if(!cond){ fails++; console.log('  FAIL: ' + msg); } }

/* заглушки того, что движок ожидает из игрового слоя */
const prelude = `
  var A = { sfx: function(){} };
  function burstAt(){}
  function burst(){}
  function toast(){}
  var session = { stage:1, list:[], idx:0, boss:false, lock:false };
  var VOICE = { r:1.05, p:1.2 };
`;

let api;
try {
  api = new Function('window','document','console','localStorage','speechSynthesis',
    prelude + code + `
    return { makePlan:makePlan, multPlan:multPlan, taskFrom:taskFrom, buildBoss:buildBoss,
             LOCS:LOCS, LAST_STAGE:LAST_STAGE, CHARS:CHARS, ALPHA:ALPHA, SYL:SYL, WORDS:WORDS,
             S:S, antiOverlap:antiOverlap, el:el };
  `)(w, w.document, console, w.localStorage, w.speechSynthesis);
} catch(e) {
  console.log('ОШИБКА ЗАГРУЗКИ ДВИЖКА: ' + e.message);
  process.exit(1);
}

console.log('=== 1. Данные ===');
console.log('  материков: ' + api.LOCS.length + ' | LAST_STAGE: ' + api.LAST_STAGE +
            ' | героев: ' + Object.keys(api.CHARS).length);
ok(api.LOCS.length === 13, 'должно быть 13 материков');
ok(Object.keys(api.CHARS).length === 50, 'должно быть 50 героев');

console.log('\n=== 2. План этапов ===');
for(let st=1; st<=13; st++){
  try {
    const plan = api.makePlan(st);
    ok(Array.isArray(plan) && plan.length > 0, 'этап ' + st + ': пустой план');
    if(st >= 10){                       // таблица умножения — строгий порядок
      const seq = plan.map(function(it){ return it.a + 'x' + it.b; }).join(' ');
      console.log('  этап ' + st + ': ' + plan.length + ' зад. [' + seq + ']');
    } else {
      console.log('  этап ' + st + ': ' + plan.length + ' зад.');
    }
  } catch(e){ fails++; console.log('  ОШИБКА этап ' + st + ': ' + e.message); }
}

console.log('\n=== 3. Боссы всех этапов ===');
for(let st=1; st<=13; st++){
  try {
    const boss = api.buildBoss(st);
    ok(boss.length === 3, 'босс ' + st + ': должно быть 3 задания');
  } catch(e){ fails++; console.log('  ОШИБКА босс ' + st + ': ' + e.message); }
}

console.log('\n=== 4. Монтаж всех заданий ===');
function mkCtx(area){
  const ctx = {
    area: area,
    speak: function(){},
    title: function(t){ const h = w.document.createElement('div'); h.className='taskTitle'; h.textContent=t; area.appendChild(h); return h; },
    choice: function(items, isRight, opts){
      const row = w.document.createElement('div'); row.className = 'choices';
      items.forEach(function(it){
        const b = w.document.createElement('button');
        b.className = 'opt ' + ((opts && opts.cls) || '');
        b.innerHTML = it.t;
        row.appendChild(b);
      });
      if(opts && opts.hintText) ctx.setHint(function(){});
      return row;
    },
    setHint: function(){},
    correct: function(){},
    wrong: function(){}
  };
  return ctx;
}
let mounted = 0, mErr = [];
for(let st=1; st<=13; st++){
  const plan = api.makePlan(st);
  const hard = true;
  plan.forEach(function(item){
    const area = w.document.createElement('div');
    const ctx = mkCtx(area);
    try { api.taskFrom(item, hard).mount(ctx); mounted++; }
    catch(e){ mErr.push('этап ' + st + ' (' + item.k + '): ' + e.message); }
  });
  api.buildBoss(st).forEach(function(task){
    const area = w.document.createElement('div');
    const ctx = mkCtx(area);
    try { task.mount(ctx); mounted++; }
    catch(e){ mErr.push('босс ' + st + ': ' + e.message); }
  });
}
console.log('  смонтировано: ' + mounted + ', ошибок: ' + mErr.length);
mErr.slice(0, 12).forEach(function(m){ console.log('    ' + m); });
ok(mErr.length === 0, 'ошибки монтажа заданий');

console.log('\n=== 5. Материки: хранители ===');
let noBoss = api.LOCS.filter(function(l){ return !l.boss || !api.CHARS[l.boss]; });
console.log('  материков без валидного хранителя: ' + noBoss.length);
noBoss.forEach(function(l){ console.log('    ' + l.name + ' -> ' + l.boss); });
ok(noBoss.length === 0, 'у материка нет хранителя из списка персонажей');

console.log('\n=== ИТОГ: проверок ' + checks + ', провалено ' + fails + ' ===');
console.log(fails === 0 ? 'ВСЁ ОК' : 'ЕСТЬ ОШИБКИ');
process.exit(fails ? 1 : 0);
