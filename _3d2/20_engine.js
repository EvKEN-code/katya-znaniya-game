/* =========================================================
   ДВИЖОК ЗАДАНИЙ — извлечён из knowledge-map.html (v3.0.2)
   Сгенерировано автоматически скриптом _3d2/extract.js.
   НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ — правьте knowledge-map.html
   или сам скрипт извлечения и пересоберите.
   ========================================================= */

/* ---------- МЕЛКИЕ УТИЛИТЫ + antiOverlap ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));
const rnd = n => Math.floor(Math.random()*n);
const pick = a => a[rnd(a.length)];
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=rnd(i+1); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function uniqPick(arr,n){ return shuffle(arr).slice(0,n); }
function el(tag,cls,txt){ const e=document.createElement(tag); if(cls)e.className=cls; if(txt!=null)e.textContent=txt; return e; }
const clamp = (v,a,b) => v<a?a:(v>b?b:v);

/* =========================================================
   antiOverlap — разносит абсолютно позиционированные
   «плавающие» поля внутри контейнера так, чтобы они не
   пересекались и не вылезали за края экрана.
   Используется во всех задачах, где элементы летают
   (слоги-обнимашки и т.п.). Работает в px, измеряет
   реальные размеры после вставки в DOM, отталкивает
   друг от друга итеративно + страхует границы.
   ========================================================= */
function antiOverlap(container){
  if(!container) return;
  const els = Array.prototype.slice.call(container.querySelectorAll('.letterFloat, .floatTile'));
  if(els.length<2) return;
  const cw = container.clientWidth || container.getBoundingClientRect().width;
  const ch = container.clientHeight || 0;
  // базовый размер одной плитки (для страховки, если замер не удался)
  let base = 96;
  els.forEach(e=>{ const r=e.getBoundingClientRect(); if(r.width>base) base=r.width; });
  // координаты в системе контейнера (px от левого/верхнего края).
  // Уникальный стартовый разброс по сетке — чтобы две одинаковые плитки
  // (например, две «О» в слоге ТО) не лежали в одной точке и не слипались.
  let P = els.map((e,idx)=>{
    const cr=e.getBoundingClientRect(), pr=container.getBoundingClientRect();
    let w=cr.width||base, h=cr.height||base;
    const cols = Math.max(1, Math.floor((cw||680)/(w+8)));
    const gx = (idx%cols)*(w+8) + 4;
    const gy = ((idx/cols|0)%4)*(h+8) + 4;
    let x = clamp(gx, 2, Math.max(2,(cw||680)-w-2));
    let y = clamp(gy, 2, Math.max(2,(ch||200)-h-2));
    return {e,x,y,w,h};
  });
  const pad = 6;
  // 1) жёсткое отталкивание пересечений (коэффициент 1 — сдвиг ровно на
  //    величину перекрытия, повторяем, пока всё не разойдётся).
  //    После каждой пары прижимаем плитки обратно внутрь контейнера,
  //    чтобы они не упирались в стену и не «залипали» в углу.
  for(let it=0; it<400; it++){
    let moved=false;
    for(let i=0;i<P.length;i++){
      for(let j=i+1;j<P.length;j++){
        const a=P[i], b=P[j];
        const ox=(a.w+pad+b.w)/2 - Math.abs(a.x+ a.w/2 - (b.x+b.w/2));
        const oy=(a.h+pad+b.h)/2 - Math.abs(a.y+ a.h/2 - (b.y+b.h/2));
        if(ox>0 && oy>0){
          if(ox<=oy){
            const s=(a.x+a.w/2)<=(b.x+b.w/2)?-1:1;
            a.x+=s*ox; b.x-=s*ox;
          } else {
            const s=(a.y+a.h/2)<=(b.y+b.h/2)?-1:1;
            a.y+=s*oy; b.y-=s*oy;
          }
          // не даём вылететь за стену — прижимаем внутрь сразу
          const maxX=Math.max(2,(cw||680)-a.w-2), maxY=Math.max(2,(ch||200)-a.h-2);
          a.x=clamp(a.x,2,maxX); a.y=clamp(a.y,2,maxY);
          const maxX2=Math.max(2,(cw||680)-b.w-2), maxY2=Math.max(2,(ch||200)-b.h-2);
          b.x=clamp(b.x,2,maxX2); b.y=clamp(b.y,2,maxY2);
          moved=true;
        }
      }
    }
    if(!moved) break;
  }
  // 2) страховка границ (чтобы ничего не уплыло за экран)
  P.forEach(p=>{
    const maxX = Math.max(0, cw - p.w), maxY = Math.max(0, (container.clientHeight||p.h) - p.h);
    p.x = clamp(p.x, 2, maxX-2);
    p.y = clamp(p.y, 2, maxY-2);
  });
  P.forEach(p=>{ p.e.style.left=p.x+'px'; p.e.style.top=p.y+'px'; });
}

/* ---------- СОХРАНЕНИЕ (localStorage) ---------- */
const SAVE_KEY='znaniya_map_v1';
const defSave = () => ({hero:null,team:[],stage:1,crystals:[],stickers:[],solved:0,mistakes:0,plan:{},prog:{},
                        settings:{music:true,voice:true,sfx:true},finished:false});
function loadSave(){ try{ const r=JSON.parse(localStorage.getItem(SAVE_KEY)); return r?Object.assign(defSave(),r):defSave(); }catch(e){ return defSave(); } }
let S = loadSave();
function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){} }

/* ---------- РЕЧЬ (SpeechSynthesis) ---------- */
const TTS = {
  voice:null,
  init(){
    if(!('speechSynthesis' in window)) return;
    const set = ()=>{
      const vs = speechSynthesis.getVoices()||[];
      this.voice = vs.find(v=>/^ru(-|_)?RU/i.test(v.lang)) || vs.find(v=>/Russian|Milena|Yuri/i.test(v.name)) || null;
    };
    set(); speechSynthesis.onvoiceschanged = set;
  },
  say(text, rate, pitch, onend){
    if(!S.settings.voice || !('speechSynthesis' in window) || !text){ if(onend) try{onend();}catch(e){} return; }
    try{
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang='ru-RU'; if(this.voice) u.voice=this.voice;
      u.rate = rate||1.0; u.pitch = pitch||1.1; u.volume=0.98;
      if(onend){ u.onend=onend; u.onerror=onend; }
      speechSynthesis.speak(u);
    }catch(e){ if(onend) try{onend();}catch(e2){} }
  },
  stop(){ try{ if('speechSynthesis' in window) speechSynthesis.cancel(); }catch(e){} }
};

/* ---------- ПЕРСОНАЖИ (данные) ---------- */
const CHARS = {
  masha:{n:'Маша',r:1.15,p:1.35,hi:['Привет! Я Маша! Давай учиться!','Ого, сколько всего интересного!','Я уже всё умею, а ты?'],
    art:{t:'kid',c:'#FFDCC0',c2:'#E0A97A',h:'#E8B24A',ac:'bow',e:'big',m:'grin',cloth:'#F58FAE',legs:'#C9557A'}},
  medved:{n:'Медведь',r:0.85,p:0.80,hi:['Здравствуй! Я Миша-Медведь.','Ну-ка, покажи, что умеешь!','Спокойно, тут ничего страшного.'],
    art:{t:'bear',c:'#C98B54',c2:'#A96C3C',nose:'button',e:'dot',m:'smile',cloth:'#C98B54',legs:'#A96C3C'}},
  fyodor:{n:'Дядя Фёдор',r:1.0,p:1.15,hi:['Привет! Я дядя Фёдор.','Давай вместе разберёмся!','Интересно, а ты справишься?'],
    art:{t:'kid',c:'#FFDCC0',c2:'#E0A97A',h:'#C88B4A',ac:'ushanka',e:'dot',m:'smile',cloth:'#7FB3D9',legs:'#4A5A6A'}},
  matroskin:{n:'Кот Матроскин',r:0.95,p:1.10,hi:['Мяу! Я кот Матроскин.','Хозяйство любит счёт!','Ну-ка, посчитаем?'],
    art:{t:'cat',c:'#E8A85C',c2:'#C9893F',nose:'dot',ac:'whiskers',e:'dot',m:'smile',cloth:'#9BD3A0',legs:'#C9893F'}},
  sharik:{n:'Пёс Шарик',r:1.05,p:1.0,hi:['Гав! Я Шарик!','Давай, у тебя получится!','Я всё сфотографирую!'],
    art:{t:'dog',c:'#D9B382',c2:'#B98F5F',nose:'button',e:'big',m:'grin',cloth:'#C6B6E8',legs:'#B98F5F'}},
  pechkin:{n:'Почтальон Печкин',r:0.90,p:0.90,hi:['Я Печкин. Посылку выдам только за задание!','Документик покажи! Шучу, считай.','Без правильного ответа ничего не отдам.'],
    art:{t:'man',c:'#FFDCC0',c2:'#D8A98A',h:'#C9C4BC',ac:'cap',beard:1,e:'glasses',m:'flat',cloth:'#6FA8A0',legs:'#4A5A6A'}},
  luntik:{n:'Лунтик',r:1.10,p:1.40,hi:['Привет! Я Лунтик!','Давай играть, это так весело!','Я с луны, там тоже считают!'],
    art:{t:'luntik',c:'#B9A6F0',c2:'#DED4FF',e:'big',m:'smile',cloth:'#B9A6F0',legs:'#8E78D8'}},
  kuzya:{n:'Кузя',r:1.15,p:1.45,hi:['Я Кузя-кузнечик!','Прыгай вместе со мной!','Скок-скок, и буква готова!'],
    art:{t:'bug',c:'#8FD86A',c2:'#6BB84A',ac:'antenna',e:'big',m:'grin',cloth:'#8FD86A',legs:'#5E9E3E'}},
  pupsen:{n:'Пупсень',r:0.95,p:1.05,hi:['А я Пупсень!','Мы тут всё запутали, извини!','Попробуй собрать, если сможешь!'],
    art:{t:'caterpillar',c:'#F2C14E',c2:'#D8A02E',ac:'antenna',e:'dot',m:'grin',cloth:'#F2C14E',legs:'#B8862E'}},
  simka:{n:'Симка',r:1.10,p:1.35,hi:['Привет! Я Симка-фиксик!','Фиксики знают, как всё устроено!','Чинить числа — моя работа!'],
    art:{t:'robot',c:'#F5A0B8',c2:'#D97A94',ac:'antenna',e:'goggles',m:'smile',cloth:'#F5A0B8',legs:'#B85C78'}},
  nolik:{n:'Нолик',r:1.12,p:1.42,hi:['Я Нолик! Люблю цифры!','Ноль — тоже число, между прочим!','Давай посчитаем по-фиксиковски!'],
    art:{t:'robot',c:'#8FC7EE',c2:'#5FA3D0',ac:'antenna',e:'goggles',m:'grin',cloth:'#8FC7EE',legs:'#4A86B8'}},
  papus:{n:'Папус',r:0.85,p:0.85,hi:['Я Папус, главный фиксик.','Без порядка техника не работает.','Проверим твои знания.'],
    art:{t:'robot',c:'#C9CFD8',c2:'#98A2AE',ac:'antenna',beard:1,e:'goggles',m:'flat',cloth:'#C9CFD8',legs:'#7A848F'}},
  masya:{n:'Мася',r:1.05,p:1.30,hi:['Я Мася!','Всё будет чики-чики!','Давай быстрее, не терпится!'],
    art:{t:'robot',c:'#FFD86A',c2:'#E0B02E',ac:'antenna',e:'goggles',m:'grin',cloth:'#FFD86A',legs:'#C9922E'}},
  kolobok:{n:'Колобок',r:1.10,p:1.25,hi:['Я Колобок, я от бабушки ушёл!','Покатились учиться!','Я круглый, как буква О!'],
    art:{t:'bread',c:'#F2C572',c2:'#D8A44E',e:'dot',m:'smile',cloth:'#F2C572',legs:'#C9922E'}},
  zayac:{n:'Заяц',r:1.15,p:1.40,hi:['Я Зайка! Считать умею быстро!','Прыг-скок, и пример готов!','Не бойся, я помогу!'],
    art:{t:'bunny',c:'#EFE7DC',c2:'#D8CFC2',nose:'dot',e:'big',m:'smile',cloth:'#EFE7DC',legs:'#C9C0B2'}},
  volk:{n:'Волк',r:0.90,p:0.85,hi:['Ну что, посчитаем?','Я тоже учился в лесной школе.','Только не торопись.'],
    art:{t:'wolf',c:'#98A5B8',c2:'#76839A',nose:'snout',e:'dot',m:'grin',cloth:'#98A5B8',legs:'#6E7C92'}},
  lisa:{n:'Лиса Патрикеевна',r:1.0,p:1.20,hi:['Я Лиса, я спрятала все буквы!','Найдёшь — отдам!','Хитрая загадка, правда?'],
    art:{t:'fox',c:'#F09A4B',c2:'#C9732E',nose:'snout',e:'dot',m:'smile',cloth:'#F09A4B',legs:'#C9732E'}},
  vinni:{n:'Винни-Пух',r:0.85,p:0.95,hi:['Я Винни-Пух, люблю мёд и горшочки!','Считать горшочки — моё любимое!','Ой, кажется, я всё перепутал!'],
    art:{t:'bear',c:'#E8A94B',c2:'#C98B32',nose:'button',e:'dot',m:'smile',cloth:'#E8A94B',legs:'#C98B32'}},
  pyatachok:{n:'Пятачок',r:1.15,p:1.40,hi:['Я Пятачок!','Ой-ой, давай вместе!','Я очень стараюсь!'],
    art:{t:'pig',c:'#F5B8C0',c2:'#E8899B',nose:'pigs',e:'big',m:'smile',cloth:'#8FC7EE',legs:'#C46C7E'}},
  ia:{n:'Ослик Иа',r:0.80,p:0.85,hi:['Я Иа. Всё равно ничего не получится…','Ну давай, попробуем.','Хотя бы попытайся.'],
    art:{t:'donkey',c:'#A8B0BF',c2:'#868F9F',nose:'snout',e:'sleepy',m:'flat',cloth:'#A8B0BF',legs:'#7A828F'}},
  sova:{n:'Мудрая Сова',r:0.90,p:1.0,hi:['Я Мудрая Сова.','Загадка требует смекалки.','Подумай хорошенько, дружок.'],
    art:{t:'bird',c:'#B79A72',c2:'#E8DCC4',nose:'beak',e:'wide',m:'beak',cloth:'#B79A72',legs:'#E8A93B'}},
  neznayka:{n:'Незнайка',r:1.15,p:1.35,hi:['Я Незнайка! А ты знаешь?','Я ничего не знаю, но очень стараюсь!','Ого, ты справишься лучше меня!'],
    art:{t:'kid',c:'#FFDCC0',c2:'#E0A97A',h:'#E8C24A',ac:'hat',e:'dot',m:'grin',cloth:'#F2C14E',legs:'#5A6A9A'}},
  znayka:{n:'Знайка',r:0.95,p:1.05,hi:['Я Знайка. Полёт требует точного счёта!','Проверим готовность к старту.','Таблица умножения — пустяк для тебя!'],
    art:{t:'kid',c:'#FFDCC0',c2:'#E0A97A',h:'#8B6B3A',ac:'cap',e:'glasses',m:'smile',cloth:'#7FB3D9',legs:'#3A4A6A'}},
  sineglazka:{n:'Синеглазка',r:1.05,p:1.30,hi:['Я Синеглазка, я люблю цветы и буквы!','Давай учиться красиво!','У тебя всё получится!'],
    art:{t:'kid',c:'#FFDCC0',c2:'#E0A97A',h:'#7FC7E8',ac:'bow',e:'big',m:'smile',cloth:'#F5A0B8',legs:'#C9557A'}},
  vintik:{n:'Винтик',r:1.0,p:1.10,hi:['Я Винтик! Люблю собирать.','Собирай по порядку!','Закрутим этот пример!'],
    art:{t:'kid',c:'#FFDCC0',c2:'#E0A97A',h:'#C9A24A',ac:'cap',e:'dot',m:'smile',cloth:'#6FA8A0',legs:'#4A5A6A'}},
  shpuntik:{n:'Шпунтик',r:1.05,p:1.15,hi:['А я Шпунтик!','Винтик — мой лучший друг!','Соберём слово вместе!'],
    art:{t:'kid',c:'#FFDCC0',c2:'#E0A97A',h:'#A87B4A',ac:'cap',e:'dot',m:'grin',cloth:'#E8895F',legs:'#4A5A6A'}},
  buratino:{n:'Буратино',r:1.10,p:1.35,hi:['Привет! Я Буратино!','Мой ключик откроет любую дверь!','Давай найдём правильный ответ!'],
    art:{t:'kid',c:'#E8C89A',c2:'#C9A072',h:'#8B5E3C',ac:'cap',nose:'long',e:'big',m:'grin',cloth:'#F2C14E',legs:'#5A4636'}},
  piero:{n:'Пьеро',r:0.95,p:1.0,hi:['Я Пьеро, грустный поэт…','Но с тобой мне веселее.','Прочитаем эту букву вместе.'],
    art:{t:'kid',c:'#FFF3E0',c2:'#E8D8C0',h:'#E8E0D0',ac:'bonnet',e:'sleepy',m:'flat',cloth:'#E8E0D0',legs:'#8A7A6A'}},
  artemon:{n:'Артемон',r:1.05,p:1.20,hi:['Гав! Я Артемон!','Я охраняю правильные ответы!','Смелее, вперёд!'],
    art:{t:'dog',c:'#F3E2C7',c2:'#D8C0A0',nose:'button',ac:'curly',e:'big',m:'grin',cloth:'#F3E2C7',legs:'#D8C0A0'}},
  gena:{n:'Крокодил Гена',r:0.85,p:0.90,hi:['Я Гена, крокодил. Работаю в зоопарке.','Посчитаем вместе?','Точь-в-точь как надо!'],
    art:{t:'croc',c:'#6FB86F',c2:'#4E9A4E',nose:'dot',ac:'hat',e:'dot',m:'grin',cloth:'#3A6FA8',legs:'#4E9A4E'}},
  cheburashka:{n:'Чебурашка',r:1.10,p:1.35,hi:['Я Чебурашка!','Давай дружить и учиться!','У меня уши большие — я всё слышу!'],
    art:{t:'round',c:'#8B5E3C',c2:'#C99560',nose:'button',e:'big',m:'smile',cloth:'#8B5E3C',legs:'#6E4830'}},
  karlson:{n:'Карлсон',r:1.0,p:1.10,hi:['Я Карлсон, лучший в мире шалун!','Сосчитай-ка цифры!','Спокойствие, только спокойствие!'],
    art:{t:'man',c:'#FFDCC0',c2:'#E0A97A',h:'#E8C070',ac:'propeller',e:'dot',m:'grin',cloth:'#F2C14E',legs:'#5A4636'}},
  malysh:{n:'Малыш',r:1.10,p:1.35,hi:['Я Малыш! Карлсон мой друг.','Давай учить буквы!','Мне очень нравится играть!'],
    art:{t:'kid',c:'#FFDCC0',c2:'#E0A97A',h:'#C8A062',e:'big',m:'smile',cloth:'#8FC7EE',legs:'#4A5A6A'}},
  frekenbok:{n:'Фрекен Бок',r:0.90,p:1.0,hi:['Я Фрекен Бок. Люблю порядок!','Числа должны стоять по порядку!','Без порядка никуда!'],
    art:{t:'woman',c:'#FFDCC0',c2:'#E0A97A',h:'#8B6B5A',ac:'bun',e:'dot',m:'flat',cloth:'#B98FC7',legs:'#5A4A6A'}},
  shapoklyak:{n:'Старуха Шапокляк',r:0.90,p:0.85,hi:['Хи-хи! Я Шапокляк, я всё перепутала!','Примеры не сходятся — и пусть!','Отгадаешь — отдам кристалл!'],
    art:{t:'woman',c:'#FFDCC0',c2:'#E0A97A',h:'#C9C4BC',ac:'bonnet',e:'dot',m:'flat',cloth:'#7A6B8A',legs:'#4A3A5A'}},
  ladybug:{n:'Леди Баг',r:1.10,p:1.40,hi:['Я Леди Баг! Справедливость победит!','Вместе мы всё решим!','Ты настоящий герой знаний!'],
    art:{t:'kid',c:'#FFDCC0',c2:'#E0A97A',h:'#E8392F',ac:'ladybug',e:'big',m:'smile',cloth:'#E8392F',legs:'#7A1410'}},
  supercat:{n:'Супер Кот',r:1.05,p:1.30,hi:['Я Супер Кот! Буду рядом!','Мяу-миссия выполнима!','Ты справишься, я верю!'],
    art:{t:'cat',c:'#3A7BD5',c2:'#2A5BA8',h:'#3A7BD5',ac:'mask',e:'big',m:'grin',cloth:'#3A7BD5',legs:'#2A5BA8'}},
  rumi:{n:'Руми',r:1.05,p:1.30,hi:['Я Руми! Давай петь и учиться!','Музыка поможет запомнить!','Ты просто сияешь отлично!'],
    art:{t:'kid',c:'#FFE0C0',c2:'#E8B89A',h:'#F5B042',ac:'hair',e:'big',m:'smile',cloth:'#FF6FB5',legs:'#C9557A'}},
  spiderman:{n:'Человек-паук',r:1.0,p:1.20,hi:['Я Человек-паук! Знания — это сила!','Сосчитаем, как паутину плетём!','Ты большой молодец!'],
    art:{t:'man',c:'#C0392B',c2:'#7B241C',h:'#C0392B',ac:'mask',e:'big',m:'grin',cloth:'#C0392B',legs:'#7B241C'}},

  /* --- v3.0 новые герои --- */
  elsa:{n:'Эльза',r:0.95,p:1.25,hi:['Я Эльза, королева снегов!','Холодный расчёт — точный расчёт!','Отпусти и считай спокойно!'],
    art:{t:'woman',c:'#FFE8DC',c2:'#E8C4B0',h:'#F2E3C8',ac:'elsa',e:'big',m:'smile',cloth:'#7FC7F0',legs:'#4E9AC8'}},
  anna:{n:'Анна',r:1.05,p:1.35,hi:['Я Анна! Я никого не брошу!','Давай решать вместе!','Ты справишься, я знаю!'],
    art:{t:'woman',c:'#FFE0C8',c2:'#E8B898',h:'#C96B3A',ac:'anna',e:'big',m:'grin',cloth:'#8B4FA8',legs:'#3A6E8B'}},
  shrek:{n:'Шрэк',r:0.80,p:0.80,hi:['Я Шрэк. Считать умею, между прочим!','У нас в болоте свои порядки.','Ну-ка, покажи, на что способен!'],
    art:{t:'ogre',c:'#8FBF5E',c2:'#6E9E42',ac:'shrek',e:'dot',m:'flat',cloth:'#C9B89A',legs:'#8A7A5E'}},
  volkNP:{n:'Волк (Ну, погоди!)',r:0.85,p:0.90,hi:['Ну, погоди! Сейчас я всё посчитаю!','Я из лесной школы, между прочим!','Ну заяц, погоди!'],
    art:{t:'wolf',c:'#7A8798',c2:'#5A6675',nose:'snout',ac:'npvolk',e:'dot',m:'grin',cloth:'#7A8798',legs:'#5A6675'}},
  zayacNP:{n:'Заяц (Ну, погоди!)',r:1.15,p:1.45,hi:['Ну, погоди! Я быстро считаю!','Прыг-скок — и пример готов!','Не догонишь!'],
    art:{t:'bunny',c:'#F5F0E8',c2:'#DCD5C8',nose:'dot',ac:'npzayac',e:'big',m:'smile',cloth:'#F5F0E8',legs:'#C9C0B2'}},
  krosh:{n:'Крош',r:1.15,p:1.45,hi:['Я Крош! Йо-хо-хо!','Давай прыгать и считать!','Кро-о-ош, вперёд!'],
    art:{t:'smesh',c:'#7FB8F0',c2:'#5A96D8',nose:'dot',ac:'krosh',e:'big',m:'grin',cloth:'#7FB8F0',legs:'#5A96D8'}},
  ezhik:{n:'Ёжик',r:1.0,p:1.20,hi:['Я Ёжик. Я люблю порядок.','Давай разберёмся потихоньку.','У меня на иголках всё записано!'],
    art:{t:'smesh',c:'#B98FD8',c2:'#8E68AE',nose:'dot',ac:'ezhik',e:'glasses',m:'smile',cloth:'#B98FD8',legs:'#8E68AE'}},
  nyusha:{n:'Нюша',r:1.10,p:1.40,hi:['Я Нюша! Я самая красивая!','Давай учиться красиво!','Ой, какой хороший ответ!'],
    art:{t:'smesh',c:'#F5A8C0',c2:'#DE7E9E',nose:'pigs',ac:'nyusha',e:'big',m:'smile',cloth:'#F5A8C0',legs:'#DE7E9E'}},
  moana:{n:'Моана',r:1.0,p:1.25,hi:['Я Моана! Море зовёт меня!','Плыви туда, где трудно!','Считай, как волну ловишь!'],
    art:{t:'woman',c:'#D9A06A',c2:'#B87E4A',h:'#3A2A20',ac:'moana',e:'big',m:'smile',cloth:'#E86A4A',legs:'#C94F32'}},
  simba:{n:'Симба (Король Лев)',r:0.95,p:1.10,hi:['Я Симба, я король!','Хакуна матата — учись без забот!','Ряв! Считаем вместе!'],
    art:{t:'lion',c:'#F2B85C',c2:'#D89A32',ac:'simba',nose:'snout',e:'big',m:'grin',cloth:'#F2B85C',legs:'#D89A32'}},
  rapunzel:{n:'Рапунцель',r:1.05,p:1.35,hi:['У меня самые длинные волосы!','Я зажгу фонари и посчитаю!','Свет всегда побеждает!'],
    art:{t:'woman',c:'#FFE8D0',c2:'#E8C4A8',h:'#F5D14A',ac:'rapunzel',e:'big',m:'smile',cloth:'#B87FC7',legs:'#8A5A9E'}}
};

/* =========================================================
   ХУДОЖНИК: рисуем персонажей кодом (SVG, без картинок)
   ========================================================= */

/* ---------- СПИСОК ПЕРСОНАЖЕЙ, МАТЕРИКИ ---------- */
const CHAR_KEYS = Object.keys(CHARS);
function sayAs(key,text,onend){ const c=CHARS[key]||CHARS.masha; TTS.say(text,c.r,c.p,onend); }

/* =========================================================
   A6. ЛОКАЦИИ
   ========================================================= */
const LOCS = [
 {id:1,name:'Солнечная поляна',sub:'Буквы от А до Я',grass:'#A8D96A',sand:'#F5DFA8',deco:'flowers',
  boss:'lisa',bossTitle:'Лиса Патрикеевна',sea:0,sticker:{t:'Солнечная поляна'}},
 {id:2,name:'Сосновая роща',sub:'Цифры от 1 до 10',grass:'#8FC98A',sand:'#EFDCA6',deco:'forest',
  boss:'zayac',bossTitle:'Заяц-считалочка',sea:0,sticker:{t:'Сосновая роща'}},
 {id:3,name:'Синий пруд Лунтика',sub:'Слоги-обнимашки',grass:'#9FD9A8',sand:'#E6F2C8',deco:'pond',
  boss:'ladybug',bossTitle:'Леди Баг',sea:0,sticker:{t:'Синий пруд'}},
 {id:4,name:'Город мастеров',sub:'Числа от 10 до 100',grass:'#A8C8E8',sand:'#DCE6F2',deco:'gears',
  boss:'frekenbok',bossTitle:'Фрекен Бок',sea:0,sticker:{t:'Город мастеров'}},
 {id:5,name:'Деревня Простоквашино',sub:'Слова по слогам',grass:'#B4D97A',sand:'#F0DFA8',deco:'village',
  boss:'pechkin',bossTitle:'Почтальон Печкин',sea:0,sticker:{t:'Простоквашино'}},
 {id:6,name:'Шоколадная фабрика',sub:'Сложение и вычитание',grass:'#D9B08A',sand:'#F2DCC0',deco:'sweet',
  boss:'spiderman',bossTitle:'Человек-паук',sea:0,sticker:{t:'Шоколадная фабрика'}},
 {id:7,name:'Космодром Знайки',sub:'Таблица умножения (бонус)',grass:'#C9C4F0',sand:'#DCD8F5',deco:'space',
  boss:'sova',bossTitle:'Мудрая Сова',sea:1,sticker:{t:'Космодром'}},
 {id:8,name:'Большой театр',sub:'Финальный салют',grass:'#F5A0B8',sand:'#FFE0C8',deco:'theatre',
  boss:'supercat',bossTitle:'Супер Кот',sea:0,sticker:{t:'Большой театр'}},
 {id:9,name:'Замок Винкс',sub:'Феи и звёзды (бонус)',grass:'#F5B0E0',sand:'#FBE0F4',deco:'castle',
  boss:'rumi',bossTitle:'Руми',sea:1,sticker:{t:'Замок Винкс'}},
 /* --- v3.0 таблица умножения: 4 части строго по порядку --- */
 {id:10,name:'Сад единицы',sub:'Умножение на 1',grass:'#A8D96A',sand:'#F5DFA8',deco:'flowers',
  boss:'krosh',bossTitle:'Крош',sea:0,sticker:{t:'Сад единицы'}},
 {id:11,name:'Двойная поляна',sub:'Умножение на 2',grass:'#8FC98A',sand:'#EFDCA6',deco:'forest',
  boss:'nyusha',bossTitle:'Нюша',sea:0,sticker:{t:'Двойная поляна'}},
 {id:12,name:'Тройной водопад',sub:'Умножение на 3',grass:'#9FD9A8',sand:'#E6F2C8',deco:'pond',
  boss:'ezhik',bossTitle:'Ёжик',sea:0,sticker:{t:'Тройной водопад'}},
 {id:13,name:'Вершина пятёрки',sub:'Умножение на 4 и 5',grass:'#D9B08A',sand:'#F2DCC0',deco:'castle',
  boss:'simba',bossTitle:'Симба',sea:0,sticker:{t:'Вершина пятёрки'}}
];
const MAIN_STAGES = 6;               // обязательных материка (дальше — бонус)
const TEAM_MAX    = 6;               // максимум героев в команде
const locOf = id => LOCS[Math.max(1,Math.min(13,id))-1];
const LAST_STAGE = LOCS.length;   // v3.0: 13 материков

/* ---------- УЧЕБНЫЕ ДАННЫЕ ---------- */
const ALPHA = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
const LNAME = {А:'а',Б:'бэ',В:'вэ',Г:'гэ',Д:'дэ',Е:'е',Ё:'ё',Ж:'жэ',З:'зэ',И:'и',Й:'и краткое',К:'ка',Л:'эль',
  М:'эм',Н:'эн',О:'о',П:'пэ',Р:'эр',С:'эс',Т:'тэ',У:'у',Ф:'эф',Х:'ха',Ц:'цэ',Ч:'че',Ш:'ша',Щ:'ща',
  Ъ:'твёрдый знак',Ы:'ы',Ь:'мягкий знак',Э:'э',Ю:'ю',Я:'я'};
const SIM = {
  А:['Д','М','Л','О'], Б:['В','Ь','Ъ','Р'], В:['Б','Я','Ь','Н'], Г:['П','Т','Р','Е'], Д:['Л','П','А','М'],
  Е:['Ё','С','Э','З'], Ё:['Е','Э','С'], Ж:['К','Х','Ш','И'], З:['Э','Е','В','С'], И:['Й','Н','П','Ц'],
  Й:['И','Н','Ц','Й'], К:['Ж','Х','Н','И'], Л:['Д','П','М','А'], М:['Н','Л','А','Д'], Н:['М','И','П','К'],
  О:['С','Ф','Ю','А'], П:['Н','Л','Д','И'], Р:['Г','П','В','Ь'], С:['О','Э','Е','З'], Т:['Г','П','Ш','Е'],
  У:['Ч','Ц','И','Ю'], Ф:['О','С','Х','А'], Х:['Ж','К','У','Ф'], Ц:['Щ','У','И','Й'], Ч:['У','Ц','Щ','Т'],
  Ш:['Щ','Ц','Т','И'], Щ:['Ш','Ц','Ч','И'], Ъ:['Ь','Б','Ы'], Ы:['Ь','Ъ','Б'], Ь:['Ъ','Ы','Б','Р'],
  Э:['З','С','Е','Ё'], Ю:['О','У','Ф','А'], Я:['В','Л','М','Д']
};
const WORDS_BY_LETTER = {А:['Арбуз','🍉'],Б:['Банан','🍌'],В:['Волк','🐺'],Г:['Гриб','🍄'],Д:['Дом','🏠'],
  Е:['Ель','🌲'],Ё:['Ёлка','🎄'],Ж:['Жук','🪲'],З:['Зонт','☂️'],И:['Иголка','🪡'],Й:['Йогурт','🥛'],
  К:['Кот','🐱'],Л:['Лимон','🍋'],М:['Машина','🚗'],Н:['Нос','👃'],О:['Облако','☁️'],П:['Пила','🪚'],
  Р:['Рыба','🐟'],С:['Собака','🐶'],Т:['Торт','🍰'],У:['Утка','🦆'],Ф:['Флаг','🚩'],Х:['Хлеб','🍞'],
  Ц:['Цветок','🌸'],Ч:['Часы','⏰'],Ш:['Шапка','🧢'],Щ:['Щётка','🧹'],Э:['Эскимо','🍦'],Ю:['Юла','🌀'],Я:['Яблоко','🍎']};

const CONS = 'БВГДЖЗКЛМНПРСТФХЦЧШЩ'.split('');
const VOW  = 'АЕЁИОУЫЭЮЯ'.split('');

const WORDS = [
  ['собака',['со','ба','ка'],'🐶'],['машина',['ма','ши','на'],'🚗'],['луна',['лу','на'],'🌙'],
  ['корова',['ко','ро','ва'],'🐄'],['рыба',['ры','ба'],'🐟'],['молоко',['мо','ло','ко'],'🥛'],
  ['яблоко',['яб','ло','ко'],'🍎'],['школа',['шко','ла'],'🏫'],['карандаш',['ка','ран','даш'],'✏️'],
  ['самолёт',['са','мо','лёт'],'✈️'],['солнце',['солн','це'],'☀️'],['чашка',['чаш','ка'],'☕'],
  ['ложка',['лож','ка'],'🥄'],['шапка',['шап','ка'],'🧢'],['книга',['кни','га'],'📖'],
  ['река',['ре','ка'],'🌊'],['гора',['го','ра'],'⛰️'],['цветок',['цве','ток'],'🌸'],
  ['банан',['ба','нан'],'🍌'],['лимон',['ли','мон'],'🍋'],['помидор',['по','ми','дор'],'🍅'],
  ['огурец',['о','гу','рец'],'🥒'],['кукла',['кук','ла'],'🪆'],['мячик',['мя','чик'],'⚽'],
  ['кошка',['кош','ка'],'🐱'],['мышка',['мыш','ка'],'🐭'],['птица',['пти','ца'],'🐦'],
  ['бабочка',['ба','боч','ка'],'🦋'],['картина',['кар','ти','на'],'🖼️'],['подушка',['по','душ','ка'],'🛏️'],
  ['дорога',['до','ро','га'],'🛣️'],['снежинка',['сне','жин','ка'],'❄️'],['радуга',['ра','ду','га'],'🌈'],
  ['зайка',['зай','ка'],'🐰'],['мишка',['миш','ка'],'🐻'],['лодка',['лод','ка'],'⛵'],
  ['конфета',['кон','фе','та'],'🍬'],['тортик',['тор','тик'],'🍰'],['вагон',['ва','гон'],'🚃'],
  ['самокат',['са','мо','кат'],'🛴'],['магазин',['ма','га','зин'],'🏪'],['тетрадь',['тет','радь'],'📓'],
  ['ручка',['руч','ка'],'🖊️'],['сумка',['сум','ка'],'🎒'],['капуста',['ка','пус','та'],'🥬'],
  ['морковь',['мор','ковь'],'🥕'],['музыка',['му','зы','ка'],'🎵']
];

const OBJ = {apple:'🍎',mush:'🍄',coin:'🪙',star:'⭐',fish:'🐟',flower:'🌸',ball:'⚽',candy:'🍬',leaf:'🍃',nut:'🌰'};

const PRAISE = ['Молодец!','Правильно!','Умничка!','Точно!','Здорово!','Верно!','Супер!','Отлично!','Так держать!','В точку!'];
const RETRY  = ['Попробуй ещё раз!','Не совсем, подумай!','Ой! Давай ещё разок.','Почти! Ещё попытка.','Не сдавайся!'];

/* ---------- РЯД ПРЕДМЕТОВ ---------- */
function objRow(n,emoji,startIdx){
  const w=el('div','objects');
  for(let i=0;i<n;i++){ const o=el('span','obj',emoji); o.style.animationDelay=((i+(startIdx||0))*0.05)+'s'; w.appendChild(o); }
  return w;
}

/* ---------- КНОПКИ ВЫБОРА (mkChoice) ---------- */
function mkChoice(ctx,items,isRight,opts){
  opts=opts||{};
  const row=el('div','choices');
  const btns=[];
  items.forEach(it=>{
    const b=el('button','opt '+(opts.cls||'')+(it.cls?' '+it.cls:''));
    b.innerHTML=it.t;
    b.onclick=()=>{
      if(session.lock||b.disabled) return;
      A.sfx('click');
      if(isRight(it)){ b.classList.add('good'); burstAt(b); ctx.correct(); }
      else { b.classList.add('wrong'); b.disabled=true; ctx.wrong(); }
    };
    row.appendChild(b); btns.push(b);
  });
  if(opts.hintText) ctx.setHint(()=>{
    for(let i=0;i<items.length;i++){ if(isRight(items[i])){ btns[i].classList.add('hinted'); break; } }
    TTS.stop(); TTS.say(opts.hintText,VOICE.r,VOICE.p);
  });
  return row;
}

/* ---------- СЛОГИ: согласные, гласные, список ---------- */
const SYL_C='МНРЛКТСДПБВГЗШЖЧХФ'.split('');
const SYL_V='АОУЫЭЯЁЮИЕ'.split('');
/* =========================================================
   B5-B11. УЧЕБНЫЙ ПЛАН И ЗАДАНИЯ (упрощённый порядок)
   1 — все буквы, 2 — цифры 1..10, 3 — слоги-обнимашки,
   4 — числа 10..100 (ряд с шагом), 5 — слова по слогам,
   6 — сложение и вычитание, 7 (бонус) — таблица умножения
   ========================================================= */
const SYL = ['МА','ПА','НА','КА','РА','СО','ТО','МУ','КУ','ДЕ','ТИ','ША'];

/* ---------- ГЕНЕРАТОР ПРИМЕРОВ ---------- */
function arithItem(max){
  if(Math.random()<0.55){
    const a=1+rnd(Math.max(2,max-2));
    const b=1+rnd(Math.max(1,max-a));
    return {k:'A',a:a,b:b,op:'+'};
  }
  const a=3+rnd(Math.max(2,max-2));
  const b=1+rnd(Math.max(1,a-1));
  return {k:'A',a:a,b:b,op:'-'};
}
/* v3.0
   ПРАВИЛО: все этапы, кроме таблицы умножения, каждый раз строятся ЗАНОВО
   и перемешиваются — ребёнок не должен запоминать порядок.
   Таблица умножения (10–13) идёт СТРОГО по порядку: 1×1,1×2… 2×1,2×2… и т.д.
*/

/* ---------- ПЛАН ЭТАПА И БОСС ---------- */
const MULT_RANGE = 5;                     // для 5 лет: 1×1 … 5×5
function multPlan(stage){
  const ms = stage===10?[1] : stage===11?[2] : stage===12?[3] : [4,5];
  const out=[];
  ms.forEach(m=>{ for(let n=1;n<=MULT_RANGE;n++) out.push({k:'M',a:n,b:m}); });
  return out;                              // НЕ перемешиваем — порядок учебный
}
function makePlan(stage){
  /* ---------- таблица умножения: 4 части, строго по порядку ---------- */
  if(stage>=10 && stage<=13) return multPlan(stage);

  if(stage===1) return shuffle(ALPHA.slice()).map(L=>({k:'L',v:L}));
  if(stage===2) return shuffle([1,2,3,4,5,6,7,8,9,10]).map(n=>({k:'N',v:n}));
  if(stage===3) return shuffle(SYL.slice()).map(s=>({k:'S',v:s}));
  if(stage===4){
    return shuffle([11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,99]).slice(0,10).map(n=>({k:'H',v:n}));
  }
  if(stage===5){
    const ws=shuffle(WORDS.filter(w=>w[1].length>=2&&w[1].length<=3)).slice(0,8);
    return ws.map(w=>({k:'W',v:w[0]}));
  }
  if(stage===6){
    const out=[];
    for(let i=0;i<10;i++) out.push(arithItem(i<5?10:20));
    return shuffle(out);
  }
  /* ---------- 7, 8, 9: обзор-микс всего пройденного (рандом) ---------- */
  if(stage===7||stage===8||stage===9){
    const out=[];
    for(let i=0;i<10;i++){
      const r=Math.random();
      if(r<0.22)      out.push({k:'L',v:pick(ALPHA)});
      else if(r<0.40) out.push({k:'N',v:1+rnd(10)});
      else if(r<0.55) out.push({k:'S',v:pick(SYL)});
      else if(r<0.68) out.push({k:'H',v:pick([11,14,17,20,23,30,40,50,60,75,88,99])});
      else if(r<0.84) out.push({k:'W',v:pick(WORDS.filter(w=>w[1].length>=2&&w[1].length<=3))[0]});
      else            out.push(arithItem(20));
    }
    return shuffle(out);
  }
  /* ---------- запасной вариант: случайная цифра, НЕ всегда 3 ---------- */
  return [{k:'N',v:1+rnd(10)}];
}
function taskFrom(it,hard){
  switch(it.k){
    case 'L': {
      const hasWord=!!WORDS_BY_LETTER[it.v];
      if(hasWord && Math.random()<0.42) return tLetterSound(it.v);
      return tLetterFind(it.v,hard);
    }
    case 'N': return tDigit(it.v, it.v<=3);
    case 'S': return tSyllable(it.v);
    case 'H': return tNumber10_100(it.v);
    case 'W': return tWord(it.v);
    case 'A': return tArith(it);
    case 'M': return tMult(it);
  }
  return tDigit(1+rnd(10),true);   // v3.0: случайная цифра, а не всегда 3
}
/* ---------- ТЕМАТИЧЕСКИЕ ЗАДАНИЯ ГЕРОЕВ ---------- */
/* Леди Баг (loc3 — слоги): обёртка над tSyllable с подачей от лица героя */
function tLadybug(){
  const s=pick(SYL);
  const phrases=[
    'Злодей прячется за слогом '+s+'! Сложи его и поймай нарушителя!',
    'Чтобы спасти Париж, собери магический слог '+s+'!',
    'Троллей много, но нам нужен только слог '+s+'. Обними буквы!'
  ];
  const base=tSyllable(s);
  return {
    text: pick(phrases),
    mount(ctx){
      ctx.area.appendChild(el('div','wordPic','🐞'));
      base.mount(ctx);
      ctx.setHint(()=>{ TTS.stop(); TTS.say('Леди Баг на подсказке: сначала '+LNAME[s[0]]+', потом '+LNAME[s[1]]+'!',1.10,1.40); });
    }
  };
}
/* Человек-паук (loc6 — сложение/вычитание): обёртка над tArith с темой паутины */
function tSpiderman(){
  const it=arithItem(20);
  const phrases=[
    'Паутина тянется через '+it.a+' '+ (it.op==='+'?'точек, добавь ещё '+it.b:'точек, но '+it.b+' порвались') +'. Сколько осталось?',
    'Спасаем соседа: в лифте было '+it.a+' человек, вошло '+it.b+'. Сколько теперь?',
    'Дядя Бен говорил: с большой силой... решай пример из '+it.a+' и '+it.b+'!'
  ];
  const base=tArith(it);
  return {
    text: pick(phrases),
    mount(ctx){
      ctx.area.appendChild(el('div','wordPic','🕷️'));
      base.mount(ctx);
      ctx.setHint(()=>{ TTS.stop(); TTS.say('Человек-паук на подсказке: '+it.a+(it.op==='+'?' плюс ':' минус ')+it.b+' равно '+(it.op==='+'?it.a+it.b:it.a-it.b)+'!',1.0,1.20); });
    }
  };
}
function buildBoss(stage){
  const out=[];
  for(let i=0;i<3;i++){
    if(stage===1) out.push(tLetterFind(pick(ALPHA),true));
    else if(stage===2) out.push(i===2 ? tNeighbour() : tDigit(1+rnd(10),Math.random()<0.5));
    else if(stage===3) out.push(tLadybug());
    else if(stage===4) out.push(tNumber10_100(10+rnd(90)));
    else if(stage===5) out.push(tWord(pick(WORDS.filter(w=>w[1].length>=3))[0]));
    else if(stage===6) out.push(tSpiderman());
    else if(stage>=10 && stage<=13){
      /* v3.0 босс таблицы умножения: факты ИМЕННО этого блока, в случайном порядке */
      const ms = stage===10?[1] : stage===11?[2] : stage===12?[3] : [4,5];
      out.push(tMult({k:'M',a:1+rnd(MULT_RANGE),b:pick(ms)}));
    }
    else if(stage===7||stage===8||stage===9){
      /* босс-микс: берём тип из плана этапа, чтобы не выпадало три раза одно и то же */
      const r=Math.random();
      if(r<0.28)      out.push(tLetterFind(pick(ALPHA),true));
      else if(r<0.52) out.push(tDigit(1+rnd(10),Math.random()<0.5));
      else if(r<0.70) out.push(tSyllable(pick(SYL)));
      else if(r<0.85) out.push(tNumber10_100(pick([12,17,23,30,45,50,68,74,99])));
      else            out.push(tArith(arithItem(20)));
    }
    else out.push(tMult({k:'M',a:pick([2,3,4]),b:2+rnd(5)}));
  }
  return out;
}

/* ---------- 1. БУКВЫ ---------- */

/* ---------- ГЕНЕРАТОРЫ ЗАДАНИЙ ---------- */
function tLetterFind(L,hard){
  const target = Math.random()<0.5 ? L : L.toLowerCase();
  const cnt = hard?5:4;
  const sim = SIM[L]||[];
  const src = shuffle(hard ? sim.concat(ALPHA,sim) : ALPHA.filter(c=>c!==L && sim.indexOf(c)<0));
  const set=[target];
  for(let i=0;i<src.length && set.length<cnt;i++){
    const v = Math.random()<0.5 ? src[i] : src[i].toLowerCase();
    if(v.toLowerCase()!==target.toLowerCase() && set.indexOf(v)<0) set.push(v);
  }
  const opts=shuffle(set);
  return {
    text:'Найди букву '+LNAME[L],
    mount(ctx){
      ctx.title('Найди эту букву');
      const box=el('div','lbox');
      box.appendChild(el('div','bigLetter',target));
      box.appendChild(ctx.choice(opts.map(o=>({v:o,t:o})), it=>it.v===target,
        {cls:'sm',hintText:'Это буква '+LNAME[L]+'. Найди такую же.'}));
      ctx.area.appendChild(box);
    }
  };
}
function tLetterSound(L){
  const w=WORDS_BY_LETTER[L][0], e=WORDS_BY_LETTER[L][1];
  const keys=Object.keys(WORDS_BY_LETTER).filter(c=>c!==L);
  const opts=shuffle([L].concat(uniqPick(keys,2)));
  return {
    text:'С какой буквы начинается слово '+w+'?',
    mount(ctx){
      ctx.title('С какой буквы начинается слово?');
      const box=el('div','lbox');
      box.appendChild(el('div','wordPic',e));
      box.appendChild(el('div','wordName',w.toUpperCase()));
      box.appendChild(ctx.choice(opts.map(o=>({v:o,t:o})), it=>it.v===L,
        {hintText:'Слово '+w+' начинается с буквы '+LNAME[L]}));
      ctx.area.appendChild(box);
    }
  };
}

/* ---------- 2. ЦИФРЫ 1..10 ---------- */
function tDigit(n,mode){
  const k=pick(Object.keys(OBJ));
  const opts=shuffle(uniqPick([1,2,3,4,5,6,7,8,9,10].filter(v=>v!==n),3).concat([n]));
  return {
    text: mode ? ('Покажи цифру '+n) : ('Сосчитай предметы и покажи цифру'),
    mount(ctx){
      ctx.title(mode?('Покажи цифру '+n):'Сколько тут предметов?');
      const box=el('div','lbox');
      box.appendChild(objRow(n,OBJ[k]));
      if(mode) box.appendChild(el('div','bigLetter',String(n)));
      box.appendChild(ctx.choice(opts.map(o=>({v:o,t:o})), it=>it.v===n,
        {cls:'sm',hintText:'Считай: один, два, три… Тут '+n}));
      ctx.area.appendChild(box);
    }
  };
}
function tNeighbour(){
  const n=2+rnd(8);
  const after=Math.random()<0.5;
  const right=after?n+1:n-1;
  const opts=shuffle(uniqPick([n,right+(after?1:-1),right+(after?2:-2),right+(after?3:-3)].filter(v=>v>0&&v!==right),3).concat([right]));
  return {
    text: after?('Какое число идёт после '+n+'?'):('Какое число стоит перед '+n+'?'),
    mount(ctx){
      ctx.title(after?('Следующее за '+n):('Перед числом '+n));
      const row=el('div','objects');
      [n-1,n,n+1].forEach(v=>{ if(v<1)return; const d=el('div','opt sm',v); if(v===n) d.style.outline='5px solid #FFC94D'; row.appendChild(d); });
      const box=el('div','lbox');
      box.appendChild(row);
      box.appendChild(ctx.choice(opts.map(o=>({v:o,t:o})), it=>it.v===right,
        {cls:'sm',hintText: after?('После '+n+' идёт '+right):('Перед '+n+' стоит '+right)}));
      ctx.area.appendChild(box);
    }
  };
}

/* ---------- 3. СЛОГИ-ОБНИМАШКИ ---------- */
function tSyllable(s){
  const need=s.split('');
  const letters=shuffle(need.concat(uniqPick(SYL_C.concat(SYL_V).filter(c=>c!==need[0]&&c!==need[1]),2)));
  return {
    text:'Сложи слог '+s,
    mount(ctx){
      ctx.title('Нажми буквы по порядку — пусть они обнимутся!');
      const box=el('div','lbox');
      const res=el('div','syllResult','? + ? = ?');
      box.appendChild(res);
      const drift=el('div','drift');
      const nodes={};
      let sel=[];
      letters.forEach((L,i)=>{
        const f=el('div','letterFloat',L);
        // мягкий стартовый разброс (px); финальное безопасное
        // раскладывание без пересечений делает antiOverlap() в runTask
        const col=i%3, row=(i/3)|0;
        f.style.left=(8+col*30)+'px';
        f.style.top =(8+row*30)+'px';
        f.onclick=()=>{
          if(session.lock) return;
          A.sfx('pop');
          if(sel.indexOf(L)>=0) return;
          sel.push(L); f.classList.add('sel');
          if(sel.length===2){
            if(sel.join('')===s){
              res.textContent=need[0]+' + '+need[1]+' = '+s;
              res.style.color='#2E7D32';
              burstAt(drift);
              ctx.correct();
            } else {
              sel=[];
              letters.forEach(x=>{ if(nodes[x]) nodes[x].classList.remove('sel'); });
              res.textContent='? + ? = ?';
              ctx.wrong();
            }
          } else res.textContent=sel[0]+' + ? = ?';
        };
        drift.appendChild(f); nodes[L]=f;
      });
      box.appendChild(drift);
      ctx.area.appendChild(box);
      ctx.setHint(()=>{
        letters.forEach(x=>nodes[x].classList.remove('hinted'));
        need.forEach(x=>{ if(nodes[x]) nodes[x].classList.add('hinted'); });
        TTS.stop(); TTS.say('Сначала '+LNAME[need[0]]+', потом '+LNAME[need[1]],VOICE.r,VOICE.p);
      });
    }
  };
}

/* ---------- 4. ЧИСЛА 10..100 (знакомство с двузначными) ---------- */
function tNumber10_100(n){
  const opts=shuffle(uniqPick([n-1,n+1,n-10,n+10,Math.max(10,n-2),Math.min(99,n+2)].filter(v=>v>=10&&v<=99&&v!==n),3).concat([n]));
  return {
    text:'Покажи число '+n,
    mount(ctx){
      ctx.title('Найди число '+n+' среди других');
      const box=el('div','lbox');
      box.appendChild(el('div','bigLetter',String(n)));
      box.appendChild(ctx.choice(opts.map(o=>({v:o,t:o})), it=>it.v===n,
        {cls:'sm',hintText:'Это число '+n+'. Найди такое же.'}));
      ctx.area.appendChild(box);
    }
  };
}
/* ---------- 5. СЛОВА ПО СЛОГАМ ---------- */
function tWord(word){
  const rec=WORDS.filter(w=>w[0]===word)[0];
  const syl=rec[1], e=rec[2];
  return {
    text:'Собери слово '+word,
    mount(ctx){
      ctx.title('Переставь кубики — собери слово');
      let placed=[], free=shuffle(syl.map((s,i)=>({s:s,id:i})));
      const board=el('div','board');
      const slotsWrap=el('div','slots'), poolWrap=el('div','pool');
      board.appendChild(slotsWrap); board.appendChild(poolWrap);
      ctx.area.appendChild(el('div','wordPic',e));
      ctx.area.appendChild(board);
      const foot=el('div','btnRow');
      const bMix=el('button','btn ghost','🔀 Перемешать');
      const bClr=el('button','btn ghost','✖️ Убрать всё');
      bMix.onclick=()=>{ if(session.lock)return; A.sfx('pop'); free=shuffle(free.concat(placed)); placed=[]; render(); };
      bClr.onclick=()=>{ if(session.lock)return; A.sfx('pop'); free=free.concat(placed); placed=[]; render(); };
      foot.appendChild(bMix); foot.appendChild(bClr);
      ctx.area.appendChild(foot);
      function makeCube(it){
        const c=el('div','cube',it.s); c.dataset.sid=it.id;
        c.addEventListener('pointerdown',ev=>startDrag(ev,c,it));
        return c;
      }
      function render(){
        slotsWrap.innerHTML=''; poolWrap.innerHTML='';
        placed.forEach(it=>slotsWrap.appendChild(makeCube(it)));
        for(let i=placed.length;i<syl.length;i++) slotsWrap.appendChild(el('div','slot',String(i+1)));
        free.forEach(it=>poolWrap.appendChild(makeCube(it)));
      }
      function check(){
        if(placed.length<syl.length) return;
        if(placed.map(x=>x.s).join('')===syl.join('')){ burstAt(slotsWrap); ctx.correct(); }
        else { ctx.wrong(); setTimeout(()=>{ free=shuffle(free.concat(placed)); placed=[]; render(); },800); }
      }
      let drag=null;
      function startDrag(ev,cube,it){
        if(session.lock) return;
        ev.preventDefault();
        const r=cube.getBoundingClientRect();
        const ghost=cube.cloneNode(true); ghost.className='cube ghost';
        ghost.style.left=r.left+'px'; ghost.style.top=r.top+'px';
        ghost.style.width=r.width+'px'; ghost.style.height=r.height+'px';
        document.body.appendChild(ghost);
        const ph=el('div','placeholder');
        cube.classList.add('hidden');
        cube.parentNode.insertBefore(ph,cube);
        drag={cube,ghost,ph,from:cube.parentNode,it,sx:ev.clientX,sy:ev.clientY,moved:false};
        window.addEventListener('pointermove',onMove);
        window.addEventListener('pointerup',onUp,{once:true});
      }
      function onMove(ev){
        if(!drag) return;
        if(Math.abs(ev.clientX-drag.sx)>6||Math.abs(ev.clientY-drag.sy)>6) drag.moved=true;
        drag.ghost.style.left=(ev.clientX-46)+'px';
        drag.ghost.style.top=(ev.clientY-42)+'px';
        const t=document.elementFromPoint(ev.clientX,ev.clientY);
        if(!t||!t.closest) return;
        const cubeEl=t.closest('.cube');
        if(cubeEl && cubeEl!==drag.cube && cubeEl.parentNode && (cubeEl.parentNode===slotsWrap||cubeEl.parentNode===poolWrap)){
          const r=cubeEl.getBoundingClientRect();
          cubeEl.parentNode.insertBefore(drag.ph, (ev.clientX<r.left+r.width/2)?cubeEl:cubeEl.nextSibling);
        } else if(t.classList && t.classList.contains('slot')){
          slotsWrap.insertBefore(drag.ph,t);
        }
      }
      function onUp(){
        window.removeEventListener('pointermove',onMove);
        if(!drag) return;
        const d=drag; drag=null;
        d.ghost.remove(); d.cube.classList.remove('hidden');
        d.ph.parentNode.insertBefore(d.cube,d.ph); d.ph.remove();
        if(!d.moved){
          if(d.from===poolWrap){ free=free.filter(x=>x.id!==d.it.id); placed.push(d.it); }
          else { placed=placed.filter(x=>x.id!==d.it.id); free.unshift(d.it); }
          A.sfx('pop'); render(); check(); return;
        }
        const ids=Array.prototype.slice.call(slotsWrap.querySelectorAll('.cube')).map(n=>+n.dataset.sid);
        const all=placed.concat(free);
        placed=ids.map(id=>all.filter(x=>x.id===id)[0]).filter(Boolean);
        free=all.filter(x=>ids.indexOf(x.id)<0);
        A.sfx('pop'); render(); check();
      }
      render();
      ctx.setHint(()=>{
        const need=syl[placed.length];
        const it=free.filter(f=>f.s===need)[0];
        if(it){ free.splice(free.indexOf(it),1); placed.push(it); render(); check(); }
        TTS.stop(); TTS.say('Дальше ставим слог '+need,VOICE.r,VOICE.p);
      });
    }
  };
}

/* ---------- 6. СЛОЖЕНИЕ И ВЫЧИТАНИЕ ---------- */
function tArith(it){
  const k=pick(['🍎','🍄','🪙','🌰','🎈']);
  const right = it.op==='+' ? it.a+it.b : it.a-it.b;
  const cands=[right+1,right-1,right+2,right-2,right+3].filter(v=>v>=0&&v!==right);
  const opts=shuffle(uniqPick(cands,3).concat([right]));
  return {
    text: it.op==='+' ? ('К '+it.a+' прибавили '+it.b+'. Сколько стало?')
                      : ('Было '+it.a+', убрали '+it.b+'. Сколько осталось?'),
    mount(ctx){
      ctx.title(it.a+' '+(it.op==='+'?'+':'−')+' '+it.b+' = ?');
      const row=el('div','objects');
      if(it.op==='+'){
        row.appendChild(objRow(it.a,k,0));
        const s=el('div','sign','+'); row.appendChild(s);
        row.appendChild(objRow(it.b,k,it.a));
      } else {
        for(let i=0;i<it.a;i++){
          const o=el('span','obj',k);
          o.style.animationDelay=(i*0.04)+'s';
          if(i>=it.a-it.b){ o.style.opacity='.25'; o.style.filter='grayscale(1)'; }
          row.appendChild(o);
        }
        const s=el('div','sign','−'); row.appendChild(s);
        const gone=el('div','obj',k); gone.style.opacity='.25'; gone.style.filter='grayscale(1)';
        row.appendChild(gone);
      }
      const box=el('div','lbox');
      box.appendChild(row);
      box.appendChild(ctx.choice(opts.map(o=>({v:o,t:o})), it2=>it2.v===right,
        {cls:'sm',hintText: it.a+(it.op==='+'?' плюс ':' минус ')+it.b+' — получается '+right}));
      ctx.area.appendChild(box);
    }
  };
}

/* ---------- 7. УМНОЖЕНИЕ (бонус) ---------- */
function tMult(it){
  const rows=it.a, per=it.b, right=rows*per;
  const cands=[right+per,right-per,right+1,right-1,right+2].filter(v=>v>0&&v!==right);
  const opts=shuffle(uniqPick(cands,3).concat([right]));
  const emoji=pick(['🍯','🪴','🌰','🎈']);
  return {
    text:'По '+per+' в '+rows+' рядах. Сколько всего?',
    mount(ctx){
      ctx.title('По '+per+' в '+rows+' рядах');
      const g=el('div','grid');
      g.style.gridTemplateColumns='repeat('+per+', auto)';
      for(let i=0;i<rows*per;i++) g.appendChild(el('div','cell',emoji));
      const box=el('div','lbox');
      box.appendChild(g);
      box.appendChild(el('div','wordName',per+' × '+rows+' = ?'));
      box.appendChild(ctx.choice(opts.map(o=>({v:o,t:o})), it2=>it2.v===right,
        {cls:'sm',hintText:'Это то же самое, что '+Array(rows).fill(per).join(' + ')+' = '+right}));
      ctx.area.appendChild(box);
    }
  };
}
