// Isolated browser smoke checks; never loads player storage or contacts a backend.
// Run: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/check_art_v4.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, extname, sep, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as L from '../logic.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shots = resolve(root, 'shots/art-v4');
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath && isAbsolute(modulePath) ? pathToFileURL(modulePath).href : modulePath || 'playwright');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
await mkdir(shots, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const results = [];
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-networking'] });
const clone = value => JSON.parse(JSON.stringify(value));
const stamp = Date.now();

function baseSave() {
  const state = L.newState(stamp);
  state.set = { snd: 0, mus: 0, vib: 0, lang: 'tr' };
  state.tut = 9;
  state.login = { n: 3, last: L.day(stamp), total: 3 };
  L.bossWeek(state, stamp);
  return state;
}
function legacySave() {
  const state = baseSave();
  state.v = 1;
  state.stage = 5;
  state.heroes = { reis: { star: 2, sh: 7, lv: 8 }, derya: { star: 1, sh: 3 }, lodos: { star: 2, sh: 6 } };
  state.res = { fish: 180, wood: 320, crys: 96 };
  state.gems = 125;
  delete state.pity2;
  delete state.selTok;
  return state;
}
function advancedSave() {
  const state = baseSave();
  state.stage = 13;
  state.fener = { lv: 8, on: true, end: 0, dur: 0 };
  state.res = { fish: 50000, wood: 50000, crys: 50000 };
  state.gems = 701;
  const building = (k, lv) => ({ k, lv, w: 0, stored: 0 });
  state.g = {
    '1,0': building('mine', 7), '0,1': building('fisher', 4), '-1,0': building('wood', 5),
    '-1,1': building('hut', 7), '1,1': building('yard', 6), '0,-1': building('lab', 4),
    '2,1': building('hut', 1), '2,2': building('hut', 1), '-2,0': building('tower', 7),
  };
  state.isl = {
    home: { own: 1, lv: 1, g: null },
    mercan: { own: 1, lv: 3, g: { '1,0': building('pearl', 4), '0,1': building('hut', 3) } },
    volkan: { own: 1, lv: 3, g: { '1,0': building('forge', 4), '0,1': building('mine', 3) } },
  };
  state.heroes = { kaan: { star: 3, sh: 17, lv: 12 }, mei: { star: 2, sh: 3, lv: 8 }, ali: { star: 2, sh: 8, lv: 6 } };
  state.pity = 39; state.pity2 = 79; state.selTok = 2; state.tickets = 8;
  state.pass = { xp: 450, tq: 270, prem: 1, cl: { f: { 0: 1 }, p: { 0: 1 } } };
  state.st.recruit = 79;
  return state;
}

const progression = state => clone({ v: state.v, stage: state.stage, heroes: state.heroes, gems: state.gems,
  pity: state.pity, pity2: state.pity2, selTok: state.selTok, tickets: state.tickets, pass: state.pass });
async function frame(page, count = 3) {
  await page.evaluate(count => new Promise(resolve => {
    const next = () => --count <= 0 ? resolve() : requestAnimationFrame(next);
    requestAnimationFrame(next);
  }), count);
}
async function ready(page) {
  await page.waitForFunction(() => window.__g && window.__perf && window.__online, null, { timeout: 30000 });
  await page.locator('#loading').waitFor({ state: 'detached', timeout: 10000 });
  // Dismiss only synthetic first-run dialogue, through its actual click handler.
  for (let n = 0; n < 8 && await page.locator('#talk').isVisible(); n++) {
    await page.locator('#talk').click();
    await page.waitForTimeout(80);
  }
  await frame(page);
  assert.equal(await page.evaluate(() => window.__online.on), false, 'backend must remain offline');
}
async function closeSheet(page) {
  await page.evaluate(() => window.__g.closeSheet());
  await page.waitForTimeout(250);
}
async function screenshot(page, name) {
  await page.screenshot({ path: resolve(shots, name + '.png'), animations: 'disabled' });
}
async function menu(page, selector, name) {
  await closeSheet(page);
  await page.locator(selector).click();
  await page.waitForFunction(() => document.querySelector('#sheet').classList.contains('on'));
  assert.ok((await page.locator('#sheet').innerText()).trim().length > 10, `${name} has content`);
}
async function run(name, viewport, state, body) {
  if (process.env.ART_QA_SCENARIO && process.env.ART_QA_SCENARIO !== name) return;
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, serviceWorkers: 'block', locale: 'tr-TR', reducedMotion: 'reduce' });
  const blocked = [], failures = [], shaderErrors = [], localFailures = [];
  // All requests outside this exact disposable origin are aborted before sending.
  await context.route('**/*', route => {
    const request = route.request();
    if (new URL(request.url()).origin !== origin || !['GET', 'HEAD'].includes(request.method())) {
      blocked.push({ method: request.method(), origin: new URL(request.url()).origin });
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  if (context.routeWebSocket) await context.routeWebSocket('**/*', socket => socket.close());
  await context.addInitScript(({ state, origin }) => {
    if (location.origin !== origin) return;
    localStorage.setItem('sf_lang', 'tr');
    localStorage.setItem('sf_q', 'high');
    localStorage.setItem('sf_instNo', '1');
    // Keep the state written by the real game on subsequent reloads.
    if (state && !localStorage.getItem('sonfener1')) localStorage.setItem('sonfener1', JSON.stringify(state));
  }, { state, origin });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => {
    if (/shader error|VALIDATE_STATUS|WebGL: INVALID|GL_INVALID|context lost|THREE\.WebGLProgram.*error/i.test(message.text())) shaderErrors.push(message.text());
  });
  page.on('response', response => {
    if (new URL(response.url()).origin === origin && response.status() >= 400) localFailures.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  const result = { name, blocked, pageErrors: failures, shaderErrors, localFailures };
  try {
    await page.goto(origin + '/index.html?lang=tr&skip=1', { waitUntil: 'domcontentloaded' });
    await ready(page);
    await body(page, result);
    await frame(page);
    assert.deepEqual(failures, [], 'uncaught browser errors');
    assert.deepEqual(shaderErrors, [], 'shader/WebGL errors');
    assert.deepEqual(localFailures, [], 'local assets must load');
    assert.ok(blocked.length > 0, 'automatic backend request was intercepted');
    result.ok = true;
    console.log(`PASS ${name}`);
  } catch (error) {
    result.ok = false; result.error = error.stack;
    await screenshot(page, name + '-failure').catch(() => {});
    console.error(`FAIL ${name}: ${error.message}`);
  } finally {
    results.push(result);
    await context.close();
  }
}

try {
  await run('fresh-mobile', { width: 390, height: 844 }, null, async (page, result) => {
    const state = await page.evaluate(() => JSON.parse(JSON.stringify(window.__g.S)));
    assert.equal(state.v, 2); assert.equal(state.cur, 'home'); assert.equal(Object.keys(state.g).length, 4);
    assert.ok(await page.locator('#c').isVisible());
    assert.ok((await page.evaluate(() => window.__perf())).calls > 0);
    await screenshot(page, '01-fresh-mobile');
    result.performance = await page.evaluate(() => window.__perf());
    await page.evaluate(() => window.__g.save());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready(page);
    assert.deepEqual(await page.evaluate(() => Object.keys(window.__g.S.g)), Object.keys(state.g));
  });

  const legacy = legacySave();
  await run('legacy-desktop', { width: 1365, height: 900 }, legacy, async page => {
    const state = await page.evaluate(() => JSON.parse(JSON.stringify(window.__g.S)));
    assert.equal(state.v, 2); assert.equal(state.stage, legacy.stage); assert.equal(state.gems, legacy.gems);
    assert.deepEqual(state.heroes.kaan, legacy.heroes.reis);
    assert.deepEqual(state.heroes.mei, { lv: 1, ...legacy.heroes.derya });
    assert.equal(state.heroes.reis, undefined); assert.equal(state.pity2, 0); assert.equal(state.selTok, 0);
    assert.deepEqual(state.g, legacy.g);
    await page.evaluate(() => window.__g.save());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready(page);
    assert.deepEqual(progression(await page.evaluate(() => window.__g.S)), progression(state));
    await screenshot(page, '02-legacy-desktop');
  });

  for (const [name, viewport] of [['advanced-mobile', { width: 390, height: 844 }], ['advanced-desktop', { width: 1365, height: 900 }]]) {
    const advanced = advancedSave();
    await run(name, viewport, advanced, async (page, result) => {
      assert.deepEqual(progression(await page.evaluate(() => window.__g.S)), progression(advanced));
      await screenshot(page, `${name}-home`);
      await menu(page, '#bHero', 'captains');
      assert.equal(await page.locator('#sheet .pbar').count(), 2, 'both 40/80 counters are visible');
      assert.ok(await page.locator('[data-a="selOpen"]').isVisible());
      await screenshot(page, `${name}-captains`);
      await menu(page, '#sPass', 'pass');
      assert.equal(await page.locator('#sheet .tier').count(), 31);
      await screenshot(page, `${name}-pass`);
      for (const [selector, title] of [['#bWork','workers'], ['#bMap','sea'], ['#bTask','tasks'], ['#bShop','shop'], ['#bClan','clan'], ['#bChat','chat'], ['#sSet','settings']]) await menu(page, selector, title);
      await closeSheet(page);

      // Click a visible 3D hut, then drag a second hut using actual pointer events.
      const hit = await page.evaluate(() => window.__g.tileScr('2,1', .45));
      await page.mouse.click(hit.x, hit.y);
      await page.waitForFunction(() => document.querySelector('#sheet').classList.contains('on'));
      await closeSheet(page);
      await page.waitForFunction(() => window.__g.cam.goal === null, null, { timeout: 10000 });
      const points = await page.evaluate(() => ({ from: window.__g.tileScr('2,1', .45), to: window.__g.tileScr('2,2', 0) }));
      for (const point of Object.values(points)) assert.equal(await page.evaluate(({x,y}) => document.elementFromPoint(x,y)?.id, point), 'c', 'canvas hit target is unobstructed');
      await page.mouse.move(points.from.x, points.from.y);
      await page.mouse.down();
      await page.mouse.move(points.to.x, points.to.y, { steps: 18 });
      await page.mouse.up();
      await page.waitForFunction(() => !window.__g.S.g['2,1'] && window.__g.S.g['2,2']?.lv === 2);
      await page.waitForTimeout(1400);
      await screenshot(page, `${name}-merged`);

      const grids = await page.evaluate(() => JSON.parse(JSON.stringify(Object.fromEntries(window.__g.L.grids(window.__g.S)))));
      const switchTo = async id => {
        await menu(page, '#pIsl', 'islands');
        await page.locator(`[data-a="go"][data-v="${id}"]`).click();
        await page.waitForFunction(id => window.__g.S.cur === id, id);
        await frame(page, 3);
      };
      for (const id of ['mercan','volkan','home']) { await switchTo(id); await screenshot(page, `${name}-${id}`); }
      for (const id of ['mercan','volkan','home']) { await switchTo(id); }
      const before = await page.evaluate(() => window.__perf());
      for (let i = 0; i < 4; i++) for (const id of ['mercan','volkan','home']) {
        await page.evaluate(id => { window.__g.goIsland(id); window.__g.syncAll(); }, id);
        await frame(page, 3);
      }
      const after = await page.evaluate(() => window.__perf());
      result.resources = { before, after };
      assert.ok(after.geo <= before.geo + 20, `geometry count grew ${before.geo} → ${after.geo}`);
      assert.ok(after.tex <= before.tex + 4, `texture count grew ${before.tex} → ${after.tex}`);
      assert.ok(after.prog <= before.prog + 5, `shader programs grew ${before.prog} → ${after.prog}`);
      assert.deepEqual(await page.evaluate(() => JSON.parse(JSON.stringify(Object.fromEntries(window.__g.L.grids(window.__g.S))))), grids);
      const expected = progression(await page.evaluate(() => window.__g.S));
      await page.evaluate(() => window.__g.save());
      await page.reload({ waitUntil: 'domcontentloaded' });
      await ready(page);
      assert.deepEqual(progression(await page.evaluate(() => window.__g.S)), expected);
      assert.deepEqual(await page.evaluate(() => Object.keys(window.__g.S.isl).sort()), ['home','mercan','volkan']);
      const size = await page.evaluate(() => ({ width: document.querySelector('#c').clientWidth, height: document.querySelector('#c').clientHeight, overflow: document.documentElement.scrollWidth > innerWidth }));
      assert.equal(size.width, viewport.width); assert.equal(size.height, viewport.height); assert.equal(size.overflow, false);
    });
  }

  await run('render-settings', { width: 390, height: 844 }, advancedSave(), async (page, result) => {
    // Resize uses the camera repeatedly to fit the scene; it must not advance focus.
    const camera = await page.evaluate(() => {
      const cam = window.__g.cam;
      cam.goal = cam.target.clone(); cam.goal.x += 1;
      const before = cam.target.toArray();
      dispatchEvent(new Event('resize'));
      return { before, after: cam.target.toArray(), pending: !!cam.goal };
    });
    assert.deepEqual(camera.after, camera.before);
    assert.equal(camera.pending, true);
    const cancel = await page.evaluate(() => {
      document.querySelector('#c').dispatchEvent(new WheelEvent('wheel', { deltaY: 1, cancelable: true }));
      return window.__g.cam.goal;
    });
    assert.equal(cancel, null);
    result.quality = [];
    for (const quality of ['low', 'med', 'high', 'med']) {
      await menu(page, '#sSet', 'settings');
      await page.locator(`[data-a="qual"][data-v="${quality}"]`).click();
      await closeSheet(page); await frame(page, 4);
      const state = await page.evaluate(() => {
        const sun = window.__sc().children.find(o => o.isDirectionalLight);
        return { q: window.__perf().ql, shadows: window.__rn().shadowMap.enabled, size: sun.shadow.mapSize.x };
      });
      assert.equal(state.q, quality);
      assert.equal(state.shadows, quality !== 'low');
      assert.equal(state.size, quality === 'high' ? 2048 : 1024);
      result.quality.push(state);
    }
    // Complete synthetic in-progress construction through the real frame loop.
    await page.evaluate(() => {
      const S = window.__g.S, now = Date.now();
      S.g['2,1'].end = now + 200; S.g['2,1'].dur = 1;
      S.fener.end = now + 200; S.fener.dur = 1;
      window.__g.syncAll();
    });
    await page.waitForFunction(() => window.__g.S.g['2,1'].lv === 2 && window.__g.S.fener.lv === 9);
    await page.waitForTimeout(1800);
    assert.equal(await page.evaluate(() => window.__sc().children.filter(o => o.geometry?.type === 'CylinderGeometry' && o.geometry.parameters.height === 6).length), 0, 'completion pillars are released');
    // Close the synthetic completion announcement, then exercise fog-night shaders.
    await page.evaluate(() => {
      document.querySelectorAll('#modal.on .acts .btn').forEach(b => b.click());
      const S = window.__g.S, L = window.__g.L;
      S.t0 = Date.now() - (L.NIGHT_EVERY - L.NIGHT_LEN + 3) * 1000;
      S.nightN = 1;
    });
    await page.waitForTimeout(2200);
    await screenshot(page, 'render-settings-night');
    assert.deepEqual(await page.evaluate(() => [window.__g.S.pity2, window.__g.S.selTok, window.__g.S.pass.prem]), [79, 2, 1]);
  });
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  await writeFile(resolve(shots, process.env.ART_QA_SCENARIO ? `qa-report-${process.env.ART_QA_SCENARIO}.json` : 'qa-report.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
}
const failed = results.filter(result => !result.ok);
console.log(`${results.length - failed.length}/${results.length} browser scenarios passed; screenshots/report: ${shots}`);
if (failed.length) process.exitCode = 1;
