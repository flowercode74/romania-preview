'use strict';
const assert = require('node:assert/strict');
const { createGameServer } = require('../scripts/serve.cjs');
(async () => {
  const server = createGameServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const home = await fetch(base + '/');
    assert.equal(home.status, 200);
    const html = await home.text();
    assert(html.includes('continueEntry'));
    for (const name of ['assets/js/game.js', 'assets/css/game.css', 'assets/items/food.webp', 'assets/animations/army.gif']) {
      const asset = await fetch(`${base}/${name}`);
      assert.equal(asset.status, 200, name);
      assert((await asset.arrayBuffer()).byteLength > 0);
      if (name.endsWith('.webp')) assert.equal(asset.headers.get('content-type'), 'image/webp');
    }
    assert.equal((await fetch(`${base}/package.json`)).status, 404);
    assert.equal((await fetch(`${base}/assets/missing.webp`)).status, 404);
    assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
    console.log('PASS: HTTP entry, bundled CSS/JS, inventory art, animation, MIME type and missing/private-file handling.');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
