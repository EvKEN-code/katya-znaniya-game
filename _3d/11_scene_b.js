const LABEL_Y = 138;                     // высота табличек с названиями

/* ---------- подписи (спрайты из canvas) ---------- */
function roundRect(c,x,y,w,h,r){
  c.beginPath();
  c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
  c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
  c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath();
}
function makeLabel(text, accent){
  const FS = 46, PAD = 20;
  const cv = document.createElement('canvas');
  let ctx = cv.getContext('2d');
  ctx.font = '700 '+FS+'px -apple-system,Segoe UI,Roboto,Arial,sans-serif';
  const w = ctx.measureText(text).width;
  cv.width = Math.ceil(w + PAD*2);
  cv.height = Math.ceil(FS * 1.75);
  ctx = cv.getContext('2d');
  ctx.font = '700 '+FS+'px -apple-system,Segoe UI,Roboto,Arial,sans-serif';
  ctx.fillStyle = 'rgba(8,22,36,0.74)';
  roundRect(ctx, 0, 0, cv.width, cv.height, 20); ctx.fill();
  ctx.strokeStyle = accent || 'rgba(150,205,255,0.55)';
  ctx.lineWidth = 3; roundRect(ctx, 1.5, 1.5, cv.width-3, cv.height-3, 20); ctx.stroke();
  ctx.fillStyle = accent ? '#ffe9b0' : '#eaf3fb';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cv.width/2, cv.height/2 + 2);

  const tex = new THREE.CanvasTexture(cv);
  if(THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map:tex, transparent:true, depthTest:false, depthWrite:false
  }));
  const H = 40;
  spr.scale.set(H * cv.width / cv.height, H, 1);
  spr.renderOrder = 999;
  return spr;
}

/* иконка материка (эмодзи-спрайт над островом) */
function makeIcon(emoji){
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.font = '96px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, S/2, S/2 + 4);
  const tex = new THREE.CanvasTexture(cv);
  if(THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map:tex, transparent:true, depthWrite:false
  }));
  spr.scale.set(66, 66, 1);
  return spr;
}

/* ---------- материки ---------- */
const islands = [];
const treeMats = [0x4f8f3a, 0x5da345, 0x3f7a30].map(function(c){
  return new THREE.MeshStandardMaterial({color:c, roughness:0.85, flatShading:true});
});
const trunkMat = new THREE.MeshStandardMaterial({color:0x7a5a3a, roughness:0.9});

function buildIsland(loc, idx){
  const px = POS[idx][0], py = POS[idx][1];
  const g = new THREE.Group();
  g.position.set(MX(px), 0, MZ(py));

  const sandMat  = new THREE.MeshStandardMaterial({color:new THREE.Color(loc.sand),  roughness:0.92});
  const grassMat = new THREE.MeshStandardMaterial({color:new THREE.Color(loc.grass), roughness:0.88});

  /* песчаное основание */
  const base = new THREE.Mesh(new THREE.CylinderGeometry(ISLE_R, ISLE_R*1.16, 30, 30), sandMat);
  base.position.y = 5; base.castShadow = true; base.receiveShadow = true;
  g.add(base);

  /* травяная шапка */
  const top = new THREE.Mesh(new THREE.CylinderGeometry(ISLE_R*0.84, ISLE_R*0.92, 16, 30), grassMat);
  top.position.y = 28; top.castShadow = true; top.receiveShadow = true;
  g.add(top);

  /* неровный берег: несколько камней по кругу */
  for(let i=0;i<7;i++){
    const a = (i/7)*Math.PI*2 + idx;
    const r = ISLE_R*(1.02 + Math.random()*0.16);
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(4 + Math.random()*5, 0),
      sandMat
    );
    rock.position.set(Math.cos(a)*r, 1 + Math.random()*4, Math.sin(a)*r);
    rock.rotation.set(Math.random()*3, Math.random()*3, Math.random()*3);
    rock.castShadow = true; rock.receiveShadow = true;
    g.add(rock);
  }

  /* деревья */
  const n = 4 + (idx % 4);
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2;
    const r = Math.random()*ISLE_R*0.58;
    const h = 16 + Math.random()*12;
    const tr = new THREE.Group();
    tr.position.set(Math.cos(a)*r, 36, Math.sin(a)*r);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.2, h*0.42, 6), trunkMat);
    trunk.position.y = h*0.21; trunk.castShadow = true;
    tr.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(h*0.42, h*0.85, 7),
      treeMats[(i + idx) % treeMats.length]
    );
    crown.position.y = h*0.42 + h*0.42; crown.castShadow = true;
    tr.add(crown);

    tr.rotation.y = Math.random()*Math.PI;
    g.add(tr);
  }

  /* иконка материка */
  const icon = makeIcon(loc.icon);
  icon.position.set(0, 96, 0);
  g.add(icon);

  /* табличка с названием */
  const label = makeLabel(loc.name, null);
  label.position.set(0, LABEL_Y, 0);
  g.add(label);

  scene.add(g);
  islands.push({loc:loc, group:g, pos:new THREE.Vector3(MX(px), 0, MZ(py)), label:label});
  return g;
}
LOCS.forEach(buildIsland);

/* ---------- тропинка между материками ---------- */
(function(){
  const pts = POS.map(function(p){ return new THREE.Vector3(MX(p[0]), 12, MZ(p[1])); });
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.25);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 200, 3.4, 8, false),
    new THREE.MeshStandardMaterial({
      color:0xffd86a, emissive:0xffb43a, emissiveIntensity:0.85,
      roughness:0.4, metalness:0.1, transparent:true, opacity:0.95
    })
  );
  tube.position.y = 0;
  scene.add(tube);
  window.__trailCurve = curve;
})();
