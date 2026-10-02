/* ---------- кристаллы над материками ---------- */
const crystals = [];
const crysGeo = new THREE.OctahedronGeometry(17, 0);
LOCS.forEach(function(loc, i){
  const m = new THREE.Mesh(crysGeo, new THREE.MeshStandardMaterial({
    color:0x8fe3ff, emissive:0x35b6ff, emissiveIntensity:1.1,
    roughness:0.12, metalness:0.65, transparent:true, opacity:0.94
  }));
  m.position.set(MX(POS[i][0]), 200, MZ(POS[i][1]));
  m.castShadow = true;
  scene.add(m);
  crystals.push({mesh:m, base:200, phase:i*0.7});
});
let crysOn = true;

/* ---------- отряд героев ---------- */
const HEROES = [
  {name:'Леди Баг',    body:0xe8392f, head:0xffdcc0, hat:0xe8392f},
  {name:'Супер Кот',   body:0x3a7bd5, head:0xffdcc0, hat:0x3a7bd5},
  {name:'Человек-паук',body:0xc0392b, head:0xffdcc0, hat:0xc0392b},
  {name:'Руми',        body:0xff6fb5, head:0xffe0c0, hat:0xf5b042}
];
function makeHero(h){
  const g = new THREE.Group();
  const bodyGeo = THREE.CapsuleGeometry
    ? new THREE.CapsuleGeometry(8, 15, 6, 14)
    : new THREE.CylinderGeometry(8, 8, 26, 14);
  const body = new THREE.Mesh(bodyGeo,
    new THREE.MeshStandardMaterial({color:h.body, roughness:0.72}));
  body.position.y = 15; body.castShadow = true; g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(9.5, 20, 16),
    new THREE.MeshStandardMaterial({color:h.head, roughness:0.66}));
  head.position.y = 35; head.castShadow = true; g.add(head);

  const hat = new THREE.Mesh(new THREE.SphereGeometry(9.8, 20, 16, 0, Math.PI*2, 0, Math.PI*0.55),
    new THREE.MeshStandardMaterial({color:h.hat, roughness:0.6}));
  hat.position.y = 35.6; hat.castShadow = true; g.add(hat);

  const eyeMat = new THREE.MeshStandardMaterial({color:0x22303f, roughness:0.3});
  [-3.6, 3.6].forEach(function(x){
    const e = new THREE.Mesh(new THREE.SphereGeometry(1.7, 10, 8), eyeMat);
    e.position.set(x, 36, 8.4); g.add(e);
  });
  return g;
}
const party = new THREE.Group();
HEROES.forEach(function(h, i){
  const f = makeHero(h);
  f.position.set((i - 1.5) * 22, 0, (i % 2) * 11 - 5);
  party.add(f);
});
party.position.set(MX(POS[0][0]), 32, MZ(POS[0][1]));
scene.add(party);

/* ---------- взаимодействие ---------- */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const infoEl = document.getElementById('info');
let hovered = null;

function pickIsland(ev){
  const r = renderer.domElement.getBoundingClientRect();
  ndc.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  ndc.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(ndc, camera);
  for(let i=0;i<islands.length;i++){
    const hit = ray.intersectObject(islands[i].group, true);
    if(hit.length) return islands[i];
  }
  return null;
}
function showInfo(isl){
  if(!isl){ infoEl.classList.remove('show'); return; }
  infoEl.querySelector('.nm').textContent = isl.loc.icon + ' ' + isl.loc.name;
  infoEl.querySelector('.sb').textContent = isl.loc.sub;
  infoEl.querySelector('.bs').textContent = '👑 Хранитель: ' + isl.loc.boss;
  infoEl.classList.add('show');
}
renderer.domElement.addEventListener('click', function(ev){ showInfo(pickIsland(ev)); });
renderer.domElement.addEventListener('pointermove', function(ev){
  const isl = pickIsland(ev);
  renderer.domElement.style.cursor = isl ? 'pointer' : 'grab';
  if(isl !== hovered){
    if(hovered) hovered.group.scale.setScalar(1);
    hovered = isl;
    if(hovered) hovered.group.scale.setScalar(1.09);
  }
});

/* ---------- кнопки ---------- */
let walking = false, walkT = 0, walkSpeed = 0.055;
const bWalk = document.getElementById('bWalk');
bWalk.onclick = function(){
  walking = !walking;
  if(walking && walkT >= 0.999) walkT = 0;
  bWalk.classList.toggle('on', walking);
  bWalk.textContent = walking ? '⏸ Пауза' : '▶ Пройти путь';
};
document.getElementById('bTop').onclick = function(){
  camera.position.set(0, 1750, 1); controls.target.set(0, 0, 0);
};
document.getElementById('bIso').onclick = function(){
  camera.position.set(-1150, 1280, 1480); controls.target.set(0, 30, 0);
};
const bCry = document.getElementById('bCry');
bCry.classList.add('on');
bCry.onclick = function(){
  crysOn = !crysOn;
  crystals.forEach(function(c){ c.mesh.visible = crysOn; });
  bCry.classList.toggle('on', crysOn);
};

/* ---------- цикл анимации ---------- */
const clock = new THREE.Clock();
let elapsed = 0;

function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  waveWater(elapsed);

  crystals.forEach(function(c){
    c.mesh.rotation.y += dt * 0.9;
    c.mesh.rotation.x = Math.sin(elapsed * 0.8 + c.phase) * 0.25;
    c.mesh.position.y = c.base + Math.sin(elapsed * 1.4 + c.phase) * 9;
  });

  if(walking){
    walkT += dt * walkSpeed;
    if(walkT >= 1){ walkT = 1; walking = false; bWalk.classList.remove('on'); bWalk.textContent = '▶ Пройти путь'; }
  }
  const curve = window.__trailCurve;
  if(curve){
    const p = curve.getPointAt(Math.max(0, Math.min(0.9999, walkT)));
    party.position.set(p.x, 32, p.z);
    const ahead = curve.getPointAt(Math.max(0, Math.min(0.9999, walkT + 0.004)));
    party.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
    party.position.y = 32 + Math.sin(elapsed * 6) * 1.6;
  }

  if(hovered) hovered.label.position.y = LABEL_Y + Math.sin(elapsed * 3) * 4;
  else islands.forEach(function(i){ i.label.position.y = LABEL_Y; });

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('hint').style.display = 'none';
animate();
