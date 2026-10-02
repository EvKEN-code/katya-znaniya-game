/* ---------- материки ---------- */
const islands = [];
const treeMats = [0x4f8f3a, 0x5da345, 0x3f7a30].map(function(c){
  return new THREE.MeshStandardMaterial({color:c, roughness:0.85, flatShading:true});
});
const trunkMat = new THREE.MeshStandardMaterial({color:0x7a5a3a, roughness:0.9});

function buildIsland(loc, idx){
  const g = new THREE.Group();
  g.position.set(MX(POS[idx][0]), 0, MZ(POS[idx][1]));

  const sandMat  = new THREE.MeshStandardMaterial({color:new THREE.Color(loc.sand),  roughness:0.92});
  const grassMat = new THREE.MeshStandardMaterial({color:new THREE.Color(loc.grass), roughness:0.88});

  const base = new THREE.Mesh(new THREE.CylinderGeometry(ISLE_R, ISLE_R*1.16, 30, 30), sandMat);
  base.position.y = 5; base.castShadow = true; base.receiveShadow = true;
  g.add(base);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(ISLE_R*0.84, ISLE_R*0.92, 16, 30), grassMat);
  top.position.y = 28; top.castShadow = true; top.receiveShadow = true;
  g.add(top);

  for(let i=0;i<7;i++){
    const a = (i/7)*Math.PI*2 + idx;
    const r = ISLE_R*(1.02 + Math.random()*0.16);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(4 + Math.random()*5, 0), sandMat);
    rock.position.set(Math.cos(a)*r, 1 + Math.random()*4, Math.sin(a)*r);
    rock.rotation.set(Math.random()*3, Math.random()*3, Math.random()*3);
    rock.castShadow = true; rock.receiveShadow = true;
    g.add(rock);
  }

  const n = 4 + (idx % 4);
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2;
    const r = Math.random()*ISLE_R*0.58;
    const h = 16 + Math.random()*12;
    const tr = new THREE.Group();
    tr.position.set(Math.cos(a)*r, 36, Math.sin(a)*r);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.2, h*0.42, 6), trunkMat);
    trunk.position.y = h*0.21; trunk.castShadow = true; tr.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(h*0.42, h*0.85, 7), treeMats[(i+idx)%3]);
    crown.position.y = h*0.84; crown.castShadow = true; tr.add(crown);
    tr.rotation.y = Math.random()*Math.PI;
    g.add(tr);
  }

  const icon = makeIcon(ICONS[loc.id], 66);
  icon.position.set(0, 96, 0);
  g.add(icon);

  const label = makeLabel(loc.name, null);
  label.position.set(0, LABEL_Y, 0);
  g.add(label);

  /* кольцо-подсветка текущего материка */
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(ISLE_R*1.24, ISLE_R*1.40, 40),
    new THREE.MeshBasicMaterial({color:0xffd86a, transparent:true, opacity:0.9, side:THREE.DoubleSide})
  );
  ring.rotation.x = -Math.PI/2; ring.position.y = 2; ring.visible = false;
  g.add(ring);

  scene.add(g);
  islands.push({loc:loc, group:g, ring:ring, icon:icon, label:label,
                sandMat:sandMat, grassMat:grassMat, base:new THREE.Vector3(MX(POS[idx][0]), 0, MZ(POS[idx][1]))});
  return g;
}
LOCS.forEach(buildIsland);

/* состояние материка: locked | current | done */
function setIslandState(idx, state){
  const isl = islands[idx]; if(!isl) return;
  isl.ring.visible = (state === 'current');
  isl.group.scale.setScalar(1);
  if(state === 'locked'){
    isl.sandMat.color.setHex(0x9fb0bd);
    isl.grassMat.color.setHex(0x93a6b4);
    isl.icon.material.opacity = 0.45; isl.icon.material.transparent = true;
  } else {
    isl.sandMat.color.set(new THREE.Color(isl.loc.sand));
    isl.grassMat.color.set(new THREE.Color(isl.loc.grass));
    isl.icon.material.opacity = 1;
  }
}
function refreshIslandStates(){
  LOCS.forEach(function(loc, i){
    const done = S.crystals.indexOf(loc.id) >= 0;
    if(done) setIslandState(i, 'done');
    else if(loc.id === S.stage) setIslandState(i, 'current');
    else if(loc.id < S.stage) setIslandState(i, 'current');
    else setIslandState(i, 'locked');
  });
}

/* ---------- тропинка ---------- */
const trailCurve = (function(){
  const pts = POS.map(function(p){ return new THREE.Vector3(MX(p[0]), 12, MZ(p[1])); });
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.25);
  scene.add(new THREE.Mesh(
    new THREE.TubeGeometry(curve, 200, 3.4, 8, false),
    new THREE.MeshStandardMaterial({color:0xffd86a, emissive:0xffb43a, emissiveIntensity:0.85,
      roughness:0.4, metalness:0.1, transparent:true, opacity:0.95})
  ));
  return curve;
})();

/* ---------- отряд героев ---------- */
function makeHero(color, headColor){
  const g = new THREE.Group();
  const bodyGeo = THREE.CapsuleGeometry
    ? new THREE.CapsuleGeometry(8, 15, 6, 14)
    : new THREE.CylinderGeometry(8, 8, 26, 14);
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({color:color, roughness:0.72}));
  body.position.y = 15; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(9.5, 20, 16),
    new THREE.MeshStandardMaterial({color:headColor||0xffdcc0, roughness:0.66}));
  head.position.y = 35; head.castShadow = true; g.add(head);
  const hat = new THREE.Mesh(new THREE.SphereGeometry(9.8, 20, 16, 0, Math.PI*2, 0, Math.PI*0.55),
    new THREE.MeshStandardMaterial({color:color, roughness:0.6}));
  hat.position.y = 35.6; hat.castShadow = true; g.add(hat);
  const eyeMat = new THREE.MeshStandardMaterial({color:0x22303f, roughness:0.3});
  [-3.6, 3.6].forEach(function(x){
    const e = new THREE.Mesh(new THREE.SphereGeometry(1.7, 10, 8), eyeMat);
    e.position.set(x, 36, 8.4); g.add(e);
  });
  return g;
}
const HERO_COLORS = [0xe8392f, 0x3a7bd5, 0xc0392b, 0xff6fb5, 0x2ecc71, 0xf5b042];
const party = new THREE.Group();
for(let i=0;i<4;i++){
  const f = makeHero(HERO_COLORS[i % HERO_COLORS.length]);
  f.position.set((i-1.5)*22, 0, (i%2)*11 - 5);
  party.add(f);
}
scene.add(party);

/* ---------- камера: перелёт к материку ---------- */
let fly = null;
function flyToIsland(idx, cb){
  const isl = islands[idx]; if(!isl){ if(cb) cb(); return; }
  const p = isl.base;
  const dir = new THREE.Vector3(p.x, 0, p.z).normalize();
  const toPos = new THREE.Vector3(p.x + dir.x*260, 340, p.z + dir.z*260 + 200);
  const toTgt = new THREE.Vector3(p.x, 40, p.z);
  fly = { t:0, dur:1.05, fromPos:camera.position.clone(), toPos:toPos,
          fromTgt:controls.target.clone(), toTgt:toTgt, cb:cb };
}
function easeInOut(t){ return t<0.5 ? 2*t*t : -1+(4-2*t)*t; }

function movePartyToIsland(idx){
  const isl = islands[idx]; if(!isl) return;
  party.position.set(isl.base.x, 32, isl.base.z + 96);
}

/* клик по материку */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pickIsland(ev){
  const r = renderer.domElement.getBoundingClientRect();
  ndc.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  ndc.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(ndc, camera);
  for(let i=0;i<islands.length;i++){
    if(ray.intersectObject(islands[i].group, true).length) return i;
  }
  return -1;
}
