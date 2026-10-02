/* =========================================================
   КАРТА ЗНАНИЙ — 3D-визуализация
   Данные материков взяты из игры knowledge-map.html (v3.0.2)
   ========================================================= */
const LOCS = [
 {id:1, name:'Солнечная поляна',        sub:'Буквы от А до Я',            grass:'#A8D96A', sand:'#F5DFA8', icon:'🌻', boss:'Лиса Патрикеевна'},
 {id:2, name:'Сосновая роща',           sub:'Цифры от 1 до 10',           grass:'#8FC98A', sand:'#EFDCA6', icon:'🌲', boss:'Заяц-считалочка'},
 {id:3, name:'Синий пруд Лунтика',      sub:'Слоги-обнимашки',            grass:'#9FD9A8', sand:'#E6F2C8', icon:'💧', boss:'Леди Баг'},
 {id:4, name:'Город мастеров',          sub:'Числа от 10 до 100',         grass:'#A8C8E8', sand:'#DCE6F2', icon:'⚙️', boss:'Фрекен Бок'},
 {id:5, name:'Деревня Простоквашино',   sub:'Слова по слогам',            grass:'#B4D97A', sand:'#F0DFA8', icon:'🏡', boss:'Почтальон Печкин'},
 {id:6, name:'Шоколадная фабрика',      sub:'Сложение и вычитание',       grass:'#D9B08A', sand:'#F2DCC0', icon:'🧁', boss:'Человек-паук'},
 {id:7, name:'Космодром Знайки',        sub:'Таблица умножения (бонус)',  grass:'#C9C4F0', sand:'#DCD8F5', icon:'🚀', boss:'Мудрая Сова'},
 {id:8, name:'Большой театр',           sub:'Финальный салют',            grass:'#F5A0B8', sand:'#FFE0C8', icon:'🎭', boss:'Супер Кот'},
 {id:9, name:'Замок Винкс',             sub:'Феи и звёзды (бонус)',       grass:'#F5B0E0', sand:'#FBE0F4', icon:'🏰', boss:'Руми'},
 {id:10,name:'Сад единицы',             sub:'Умножение на 1',             grass:'#A8D96A', sand:'#F5DFA8', icon:'1️⃣', boss:'Крош'},
 {id:11,name:'Двойная поляна',          sub:'Умножение на 2',             grass:'#8FC98A', sand:'#EFDCA6', icon:'2️⃣', boss:'Нюша'},
 {id:12,name:'Тройной водопад',         sub:'Умножение на 3',             grass:'#9FD9A8', sand:'#E6F2C8', icon:'3️⃣', boss:'Ёжик'},
 {id:13,name:'Вершина пятёрки',         sub:'Умножение на 4 и 5',         grass:'#D9B08A', sand:'#F2DCC0', icon:'5️⃣', boss:'Симба'}
];
const POS = [[110,150],[285,95],[480,175],[665,100],[880,180],
             [790,355],[600,300],[395,390],[195,320],
             [115,545],[330,610],[560,520],[810,600]];
const SCALE = 2.2;                       // 2D-координаты карты -> 3D
const MX = x => (x - 500) * SCALE;       // центр карты в 0
const MZ = y => (y - 390) * SCALE;
const ISLE_R = 80;                       // радиус материка в 3D

/* ---------- рендерер, сцена, камера ---------- */
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
camera.position.set(0, 1240, 1420);      // кадр на все 13 материков

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 260;
controls.maxDistance = 3600;
controls.maxPolarAngle = Math.PI * 0.47;
controls.target.set(0, 30, 0);

/* ---------- небо (градиент) ---------- */
(function(){
  const cv = document.createElement('canvas');
  cv.width = 8; cv.height = 256;
  const g = cv.getContext('2d').createLinearGradient(0,0,0,256);
  g.addColorStop(0.00, '#0a3557');
  g.addColorStop(0.42, '#2b7fb8');
  g.addColorStop(0.72, '#7fc3e0');
  g.addColorStop(1.00, '#cfeaf5');
  const ctx = cv.getContext('2d');
  ctx.fillStyle = g; ctx.fillRect(0,0,8,256);
  const tex = new THREE.CanvasTexture(cv);
  if(THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(3000, 32, 20),
    new THREE.MeshBasicMaterial({map:tex, side:THREE.BackSide, depthWrite:false, fog:false})
  );
  scene.add(sky);
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
/* вода: Phong вместо Standard — заметно дешевле по пикселям (море занимает весь экран) */
const waterMat = new THREE.MeshPhongMaterial({
  color:0x2f7fb8, specular:0xbfe8ff, shininess:72,
  transparent:true, opacity:0.92, flatShading:false
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.position.y = 0;
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
