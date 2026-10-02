'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'assets/js/game.js'), 'utf8');
new vm.Script(script);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/game.css'), 'utf8');
const references = new Set([...`${script}\n${html}\n${css}`.matchAll(/assets\/[a-zA-Z0-9_/-]+\.(?:png|webp|jpg|gif|css|js)/g)].map(match => match[0]));
for (const banner of ['tutorial-banner.webp', 'daily-quests.webp', 'growth-quests.webp']) references.add(`assets/ui/${banner}`);
for (const id of ['castle', 'hospital', 'camp', 'barracks', 'research', 'embassy', 'hideout', 'farm', 'lumber', 'stone', 'iron']) references.add(`assets/buildings/${id}.webp`);
for (const id of ['food', 'wood', 'stone', 'iron', 'speed-build', 'speed-troop', 'speed-heal', 'speed-research', 'speed-universal', 'shield', 'teleport', 'stamina', 'speed-march', 'march-recall', 'production-boost']) references.add(`assets/items/${id}.webp`);
for (const reference of references) {
  if (!fs.existsSync(path.join(root, reference))) throw Error(`Missing asset: ${reference}`);
}
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
if (new Set(ids).size !== ids.length) throw Error('Duplicate HTML id');
const cleanCSS = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '');
let depth = 0;
for (const char of cleanCSS) {
  if (char === '{') depth++;
  if (char === '}') depth--;
  if (depth < 0) throw Error('Invalid CSS brace order');
}
if (depth) throw Error('Unbalanced CSS braces');
console.log(`PASS: JavaScript syntax, CSS brace structure, HTML ids and ${references.size} static/dynamic asset references.`);
