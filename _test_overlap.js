// Проверка: плавающие поля не пересекаются и не выходят за экран.
// Запуск: node _test_overlap.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join('C:/Users/krepakov/.workbuddy-ai/binaries/node/workspace/node_modules', 'jsdom'));

const html = fs.readFileSync(path.join(__dirname, 'knowledge-map.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

// jsdom не считает getBoundingClientRect реально; подменяем на измерение по
// заданным стилям/классам. Для .letterFloat размер известен: на десктопе 96,
// на узком экране (max-width:520) 72. Имитируем ширину вьюпорта 360px (телефон).

const NARROW = process.argv.indexOf('--wide')>=0 ? false : true;  // телефон по умолчанию
const VW = NARROW ? 360 : 1000; // ширина вьюпорта
const TILE = NARROW ? 72 : 96;  // размер .letterFloat
const DRIFT_W = NARROW ? 360 : 680;
const DRIFT_H = NARROW ? 180 : 200;

// мини-Detection: какой размер у .letterFloat
function tileSize(){ return TILE; }

// Подменяем getBoundingClientRect для .letterFloat (и контейнера .drift),
// чтобы antiOverlap работал как в браузере, но на детерминированных числах.
let CONTAINER = null;
function setContainer(c){ CONTAINER = c; }
window.Element.prototype.getBoundingClientRect = function(){
  const cls = this.className || '';
  if(this === CONTAINER){
    return { left:0, top:0, width:DRIFT_W, height:DRIFT_H, right:DRIFT_W, bottom:DRIFT_H };
  }
  if(typeof cls === 'string' && cls.indexOf('letterFloat') >= 0){
    const w = tileSize(), h = tileSize();
    const left = parseFloat(this.style.left) || 0;
    const top  = parseFloat(this.style.top)  || 0;
    return { left, top, width:w, height:h, right:left+w, bottom:top+h };
  }
  return { left:0, top:0, width:0, height:0, right:0, bottom:0 };
};
Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', { get(){ return this===CONTAINER?DRIFT_W:0; } });
Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { get(){ return this===CONTAINER?DRIFT_H:0; } });

// вытаскиваем нужные функции из скрипта
const m = html.match(/<script>([\s\S]*)<\/script>/);
let code = m[1];
// выполняем
const scriptEl = document.createElement('script');
scriptEl.textContent = code;
// патчим глобальные window/document
const fn = new Function('window','document','console','performance','requestAnimationFrame','cancelAnimationFrame','setTimeout',
  'var module,exports;' + code + '\nreturn {tLetterFind,tDigit,tNeighbour,tSyllable,tNumber10_100,tArith,tMult,antiOverlap,ALPHA,SYL_C,SYL_V,runTask,el,mkChoice,ctxStub:null};');

// создадим заглушку контекста как в runTask (минимум)
function makeCtx(area){
  return {
    area,
    speak(){}, title(){ return document.createElement('div'); },
    choice:(items,isRight,opts)=>{ const row=document.createElement('div'); row.className='choices'; items.forEach(it=>{const b=document.createElement('button');b.className='opt '+(opts&&opts.cls||'');b.innerHTML=it.t;row.appendChild(b);});return row; },
    setHint(){}, correct(){}, wrong(){}
  };
}

const api = fn(window, document, console, { now:()=>0 }, ()=>0, ()=>{}, ()=>{}, null, null);

let fails = 0, checks = 0;
function rectsOverlap(a,b,pad){ return !(a.right+pad<=b.left || b.right+pad<=a.left || a.bottom+pad<=b.top || b.bottom+pad<=a.top); }

// перебираем все генераторы задач
const plan = [
  ['tLetterFind', ()=>api.tLetterFind(api.ALPHA[Math.floor(Math.random()*api.ALPHA.length)], Math.random()<0.5)],
  ['tDigit', ()=>api.tDigit(1+Math.floor(Math.random()*10), true)],
  ['tNeighbour', ()=>api.tNeighbour()],
  ['tSyllable', ()=>api.tSyllable('ТО')],
  ['tNumber10_100', ()=>api.tNumber10_100(10+Math.floor(Math.random()*90))],
  ['tArith', ()=>{ const a=1+Math.floor(Math.random()*20), op=Math.random()<0.5?'+':'-'; const b=op==='+'?1+Math.floor(Math.random()*(20-a)):1+Math.floor(Math.random()*a); return api.tArith({a,b,op}); }],
  ['tMult', ()=>api.tMult({a:1+Math.floor(Math.random()*5), b:1+Math.floor(Math.random()*5)})],
];

for(const [name, gen] of plan){
  for(let trial=0; trial<200; trial++){
    const task = gen();
    const area = document.createElement('div'); area.id='taskArea';
    const ctx = makeCtx(area);
    try { task.mount(ctx); } catch(e){ console.log('MOUNT ERROR', name, e.message); fails++; continue; }
    // если есть плавающие буквы — запускаем antiOverlap и проверяем
    const floats = area.querySelectorAll('.letterFloat');
    if(floats.length){
      const drift = area.querySelector('.drift') || area;
      setContainer(drift);
      api.antiOverlap(drift);
      const rs = Array.from(floats).map(f=>f.getBoundingClientRect());
      // пересечения
      for(let i=0;i<rs.length;i++) for(let j=i+1;j<rs.length;j++){
        checks++;
        if(rectsOverlap(rs[i],rs[j],2)){ console.log('OVERLAP', name, JSON.stringify([rs[i],rs[j]])); fails++; }
      }
      // выход за экран/контейнер
      for(const r of rs){
        checks++;
        if(r.left < -1 || r.top < -1 || r.right > DRIFT_W+1 || r.bottom > DRIFT_H+1){ console.log('OUT', name, JSON.stringify(r),'drift',DRIFT_W,DRIFT_H); fails++; }
      }
    }
  }
}
console.log('ПРОВЕРКА ПЕРЕСЕЧЕНИЙ: проверено', checks, '| ошибок', fails);
console.log(fails===0 ? 'ВСЁ ОК — поля не пересекаются и не выходят за экран' : 'ЕСТЬ ОШИБКИ');
