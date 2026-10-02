/* Извлекает готовый движок заданий из knowledge-map.html в 20_engine.js.
   Так 3D-игра переиспользует проверенный контент (буквы, цифры, слоги,
   слова, примеры, таблица умножения), а не дублирует его.
   Запуск: node _3d2/extract.js  (из корня проекта) */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'knowledge-map.html');
const OUT  = path.join(__dirname, '20_engine.js');

const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join('\n');

/* границы блоков (номера строк включительно) */
const BLOCKS = [
  ['МЕЛКИЕ УТИЛИТЫ + antiOverlap',      417,  495],
  ['СОХРАНЕНИЕ (localStorage)',         508,  513],
  ['РЕЧЬ (SpeechSynthesis)',            623,  645],
  ['ПЕРСОНАЖИ (данные)',                650,  757],
  ['СПИСОК ПЕРСОНАЖЕЙ, МАТЕРИКИ',       934,  972],
  ['УЧЕБНЫЕ ДАННЫЕ',                    977, 1021],
  ['РЯД ПРЕДМЕТОВ',                    1433, 1437],
  ['КНОПКИ ВЫБОРА (mkChoice)',         1575, 1595],
  ['СЛОГИ: согласные, гласные, список', 1625, 1633],
  ['ГЕНЕРАТОР ПРИМЕРОВ',               1641, 1655],
  ['ПЛАН ЭТАПА И БОСС',                1656, 1780],
  ['ГЕНЕРАТОРЫ ЗАДАНИЙ',               1781, 2080]
];

const parts = [
  '/* =========================================================',
  '   ДВИЖОК ЗАДАНИЙ — извлечён из knowledge-map.html (v3.0.2)',
  '   Сгенерировано автоматически скриптом _3d2/extract.js.',
  '   НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ — правьте knowledge-map.html',
  '   или сам скрипт извлечения и пересоберите.',
  '   ========================================================= */'
];

for (const [title, a, b] of BLOCKS) {
  parts.push('');
  parts.push('/* ---------- ' + title + ' ---------- */');
  parts.push(slice(a, b));
}

fs.writeFileSync(OUT, parts.join('\n') + '\n', 'utf8');

const out = fs.readFileSync(OUT, 'utf8');
console.log('20_engine.js: ' + out.split('\n').length + ' строк, ' + out.length + ' байт');
console.log('блоков: ' + BLOCKS.length);

/* ---- стили заданий: оба <style>-блока из 2D-игры ---- */
const CSS_OUT = path.join(__dirname, '10_style.css');
const css = [
  '/* Стили заданий — извлечены из knowledge-map.html (v3.0.2) */',
  slice(11, 196),   // основной UI + задания
  slice(199, 295)   // персонажи, карта, мобильная вёрстка заданий
].join('\n');
fs.writeFileSync(CSS_OUT, css + '\n', 'utf8');
console.log('10_style.css: ' + css.length + ' байт');
