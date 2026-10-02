/* =========================================================
   «СТРАНА ЗНАНИЙ» 3D — мир
   ========================================================= */
const ICONS = {1:'🌻',2:'🌲',3:'💧',4:'⚙️',5:'🏡',6:'🧁',7:'🚀',8:'🎭',9:'🏰',10:'1️⃣',11:'2️⃣',12:'3️⃣',13:'5️⃣'};
const POS = [[110,150],[285,95],[480,175],[665,100],[880,180],
             [790,355],[600,300],[395,390],[195,320],
             [115,545],[330,610],[560,520],[810,600]];
const SCALE = 2.2;
const MX = x => (x - 500) * SCALE;
const MZ = y => (y - 390) * SCALE;
const ISLE_R = 80;

/* ---------- рендерер ---------- */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
if(THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x2a6f9e, 0.00020);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 1, 6000);
camera.position.set(0, 1240, 1420);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 260;
controls.maxDistance = 3600;
controls.maxPolarAngle = Math.PI * 0.47;
controls.target.set(0, 30, 0);

/* ---------- небо ---------- */
(function(){
  const cv = document.createElement('canvas');
  cv.width = 8; cv.height = 256;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0,0,0,256);
  g.addColorStop(0.00, '#0a3557');
  g.addColorStop(0.42, '#2b7fb8');
  g.addColorStop(0.72, '#7fc3e0');
  g.addColorStop(1.00, '#cfeaf5');
  ctx.fillStyle = g; ctx.fillRect(0,0,8,256);
  const tex = new THREE.CanvasTexture(cv);
  if(THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(3000, 32, 20),
    new THREE.MeshBasicMaterial({map:tex, side:THREE.BackSide, depthWrite:false, fog:false})
  ));
})();

/* ---------- свет ---------- */
scene.add(new THREE.HemisphereLight(0xbfe4ff, 0x24506e, 0.95));
scene.add(new THREE.AmbientLight(0xffffff, 0.22));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.05);
sun.position.set(600, 900, 500);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 100;
sun.shadow.camera.far = 3000;
sun.shadow.camera.left = -1400;
sun.shadow.camera.right = 1400;
sun.shadow.camera.top = 1400;
sun.shadow.camera.bottom = -1400;
sun.shadow.bias = -0.0009;
scene.add(sun);

/* ---------- вода ---------- */
const waterGeo = new THREE.PlaneGeometry(6000, 6000, 44, 44);
waterGeo.rotateX(-Math.PI/2);
const water = new THREE.Mesh(waterGeo, new THREE.MeshPhongMaterial({
  color:0x2f7fb8, specular:0xbfe8ff, shininess:72, transparent:true, opacity:0.92
}));
water.receiveShadow = true;
scene.add(water);
const wBase = waterGeo.attributes.position.array.slice();
function waveWater(t){
  const p = waterGeo.attributes.position.array;
  for(let i=0;i<p.length;i+=3){
    const x = wBase[i], z = wBase[i+2];
    p[i+1] = Math.sin(x*0.006 + t*1.1)*7 + Math.cos(z*0.0052 + t*0.85)*6;
  }
  waterGeo.attributes.position.needsUpdate = true;
  waterGeo.computeVertexNormals();
}

/* ---------- подписи и иконки ---------- */
const LABEL_Y = 138;
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
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:false, depthWrite:false}));
  const H = 40;
  spr.scale.set(H * cv.width / cv.height, H, 1);
  spr.renderOrder = 999;
  return spr;
}
function makeIcon(emoji, size){
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.font = '96px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, S/2, S/2 + 4);
  const tex = new THREE.CanvasTexture(cv);
  if(THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false}));
  const H = size || 66;
  spr.scale.set(H, H, 1);
  return spr;
}
