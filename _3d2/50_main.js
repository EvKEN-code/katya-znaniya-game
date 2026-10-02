/* =========================================================
   ЗАПУСК: кристаллы в 3D, управление, игровой цикл
   ========================================================= */

/* ---------- кристаллы над пройденными материками ---------- */
const crysGeo = new THREE.OctahedronGeometry(17, 0);
const crystals3d = islands.map(function(isl){
  const m = new THREE.Mesh(crysGeo, new THREE.MeshStandardMaterial({
    color:0x8fe3ff, emissive:0x35b6ff, emissiveIntensity:1.1,
    roughness:0.12, metalness:0.65, transparent:true, opacity:0.94
  }));
  m.position.set(isl.base.x, 200, isl.base.z);
  m.visible = false;
  m.castShadow = true;
  scene.add(m);
  return m;
});
function refreshCrystals(){
  crystals3d.forEach(function(m, i){ m.visible = S.crystals.indexOf(LOCS[i].id) >= 0; });
}

/* ---------- взаимодействие с картой ---------- */
let hovered = -1;
function islandUnlocked(i){
  const id = LOCS[i].id;
  return S.crystals.indexOf(id) >= 0 || id <= S.stage;
}
renderer.domElement.addEventListener('pointermove', function(ev){
  const i = pickIsland(ev);
  renderer.domElement.style.cursor = (i >= 0 && islandUnlocked(i)) ? 'pointer' : 'grab';
  if(i !== hovered){
    if(hovered >= 0) islands[hovered].group.scale.setScalar(1);
    hovered = i;
    if(hovered >= 0) islands[hovered].group.scale.setScalar(1.07);
  }
});
renderer.domElement.addEventListener('click', function(ev){
  A.unlock();
  const i = pickIsland(ev);
  if(i < 0) return;
  const loc = LOCS[i];
  const done = S.crystals.indexOf(loc.id) >= 0;
  if(!islandUnlocked(i)){
    A.sfx('wrong');
    toast('🔒 Сначала пройди предыдущий материк','bad');
    TTS.say('Сначала пройди предыдущий материк!', 1.05, 1.2);
    return;
  }
  A.sfx('click');
  if(done){
    showModal('<div class="rwIcon">' + ICONS[loc.id] + '</div><h2>' + loc.name + '</h2>'
      + '<p class="rwSub">' + loc.sub + '</p>'
      + '<p class="rwLine">👑 Хранитель: <b>' + (loc.bossTitle || '') + '</b></p>'
      + '<p class="rwLine">💎 Кристалл уже получен</p>',
      [{t:'🔁 Пройти заново', cls:'primary', fn:function(){ closeModal(); startStage(loc.id, false); }},
       {t:'Закрыть', cls:'ghost', fn:closeModal}]);
    return;
  }
  startStage(loc.id, false);
});

/* ---------- кнопки ---------- */
document.getElementById('bHint').onclick = function(){
  A.sfx('click');
  if(session.lock) return;
  if(CUR && CUR.hintFn) CUR.hintFn();
  else toast('💡 Подсказка тут не нужна','ok');
};
document.getElementById('bMap').onclick = function(){
  A.sfx('click');
  panelShow(false);
  if(bossGroup){ scene.remove(bossGroup); bossGroup = null; }
  updateHUD(); refreshIslandStates(); refreshCrystals();
};
['bAlbum','bAlbum2','bAlbum3'].forEach(function(id){
  const b = document.getElementById(id);
  if(b) b.onclick = function(){ A.sfx('click'); showAlbum(); };
});
document.getElementById('bMenu').onclick = function(){
  A.sfx('click');
  const total = LOCS.length;
  showModal(
    '<h2>⚙️ Меню</h2>'
    + '<p class="rwLine">Кристаллов: <b>' + S.crystals.length + ' из ' + total + '</b></p>'
    + '<p class="rwLine">Решено заданий: <b>' + S.solved + '</b> · Ошибок: <b>' + S.mistakes + '</b></p>'
    + '<p class="rwLine">Героев в команде: <b>' + (S.team ? S.team.length : 0) + '</b></p>',
    [{t:(S.settings.voice ? '🔊 Озвучка: вкл' : '🔇 Озвучка: выкл'), cls:'ghost', fn:function(){
        S.settings.voice = !S.settings.voice; save(); closeModal();
        toast(S.settings.voice ? '🔊 Озвучка включена' : '🔇 Озвучка выключена','ok');
        document.getElementById('bMenu').click();
      }},
     {t:(S.settings.sfx ? '🎵 Звуки: вкл' : '🔕 Звуки: выкл'), cls:'ghost', fn:function(){
        S.settings.sfx = !S.settings.sfx; save(); closeModal();
        document.getElementById('bMenu').click();
      }},
     {t:'🗺️ Вид сверху', cls:'ghost', fn:function(){
        closeModal();
        camera.position.set(0, 1750, 1); controls.target.set(0, 0, 0);
      }},
     {t:'🔄 Начать заново', cls:'ghost', fn:function(){
        closeModal();
        showModal('<h2>Начать заново?</h2><p class="rwSub">Весь прогресс будет сброшен: кристаллы, команда, решённые задания.</p>',
          [{t:'Да, сбросить', cls:'primary', fn:function(){
              S = defSave(); save(); closeModal();
              panelShow(false); updateHUD(); refreshIslandStates(); refreshCrystals();
              camera.position.set(0, 1240, 1420); controls.target.set(0, 30, 0);
              toast('🔄 Начинаем заново!','ok');
            }},
           {t:'Отмена', cls:'ghost', fn:closeModal}]);
      }},
     {t:'Закрыть', cls:'primary', fn:closeModal}]
  );
};
document.getElementById('bStart').onclick = function(){
  A.unlock(); A.sfx('pop');
  document.getElementById('startScreen').classList.add('hide');
  const cur = Math.max(1, Math.min(LOCS.length, S.stage));
  movePartyToIsland(cur - 1);
  flyToIsland(cur - 1);
  toast('Нажми на материк, чтобы начать','ok');
};

/* ---------- игровой цикл ---------- */
const clock = new THREE.Clock();
let elapsed = 0;

function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  waveWater(elapsed);

  crystals3d.forEach(function(m, i){
    if(!m.visible) return;
    m.rotation.y += dt * 0.9;
    m.rotation.x = Math.sin(elapsed * 0.8 + i * 0.7) * 0.25;
    m.position.y = 200 + Math.sin(elapsed * 1.4 + i * 0.7) * 9;
  });

  islands.forEach(function(isl, i){
    if(isl.ring.visible){
      const s = 1 + Math.sin(elapsed * 2.2) * 0.03;
      isl.ring.scale.setScalar(s);
      isl.ring.material.opacity = 0.55 + Math.sin(elapsed * 2.2) * 0.3;
    }
    if(i === hovered) isl.label.position.y = LABEL_Y + Math.sin(elapsed * 3) * 4;
    else isl.label.position.y = LABEL_Y;
  });

  if(bossGroup) bossGroup.position.y = 32 + Math.sin(elapsed * 2.4) * 2.5;

  /* перелёт камеры к материку */
  if(fly){
    fly.t += dt / fly.dur;
    const k = easeInOut(Math.min(1, fly.t));
    camera.position.lerpVectors(fly.fromPos, fly.toPos, k);
    controls.target.lerpVectors(fly.fromTgt, fly.toTgt, k);
    if(fly.t >= 1){ const cb = fly.cb; fly = null; if(cb) cb(); }
  }

  party.position.y = 32 + Math.sin(elapsed * 6) * 1.6;
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------- старт ---------- */
TTS.init();
if(!S.team || !S.team.length) S.team = ['masha'];
if(!S.settings) S.settings = {music:true, voice:true, sfx:true};
refreshIslandStates();
refreshCrystals();
updateHUD();
movePartyToIsland(Math.max(0, Math.min(LOCS.length - 1, S.stage - 1)));
document.getElementById('hint').style.display = 'none';
animate();
