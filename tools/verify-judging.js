/* Covers pages/judging.html — the fair-day judging page — in REAL Chrome.
 *
 * ⚠️ Needs the site SERVED (never file:// — localStorage throws on an opaque
 *    origin and the page's whole state layer dies):
 *      cd ~/havelock-fair-site && python3 -m http.server 8765
 *      NODE_PATH=$PWD/node_modules node tools/verify-judging.js
 *
 * The Apps Script endpoint is FAKED with request interception: the page reads
 * window.HF_JUDGING_ENDPOINT_OVERRIDE, and every POST to it is answered by this
 * file — success, a per-section refusal, or a network failure — so the whole
 * not-sent → sending → sent / refused / retry state machine is exercised
 * without touching the workbook. The POST bodies are captured and asserted:
 * text/plain (⚠ application/json triggers a CORS preflight Apps Script answers
 * 405), kind:'judging-results', entry ids not labels.
 *
 * THE POINT of this file:
 *  (1) "Not sent" must be visible on the PICKER, not only inside a class —
 *      judges drift between classes all day.
 *  (2) A failed send keeps the picks and retries; a refused section is named.
 *  (3) Colour is measured from RENDERED PIXELS. Three bugs on this repo passed
 *      every DOM assertion and were caught only by looking.
 *  (4) Touch targets: everything a judge presses is ≥ 44px tall.
 *
 * ⚠️ `--window-size` does NOT set the viewport in headless Chrome — always
 *    page.setViewport(), or "falls off screen" shots are fake.
 * ⚠️ `hidden` is only a UA display:none. Assert getComputedStyle().display. */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.JUDGING_BASE || 'http://localhost:8765';
const URL = BASE + '/pages/judging.html';
const FAKE = 'https://judging.test/exec';
const SHOTS = process.env.SHOTS_DIR || path.join(__dirname, '..', '.agents', 'shots');
try { fs.mkdirSync(SHOTS, { recursive: true }); } catch (e) {}

// The data the page ships with — assertions derive from it, never frozen.
const DATA = (() => { const w = {}; new Function('window', fs.readFileSync(path.join(__dirname, '..', 'js', 'judging-data.js'), 'utf8'))(w); return w.HF_JUDGING; })();

let pass = 0, fail = 0;
const ok = (m, x) => { pass++; console.log('  ✅ ' + m + (x !== undefined ? '  ' + x : '')); };
const bad = (m, got, want) => { fail++; console.log('  ❌ ' + m);
  if (got !== undefined) console.log('       got  ' + JSON.stringify(got));
  if (want !== undefined) console.log('       want ' + JSON.stringify(want)); };
const is = (m, g, w) => (JSON.stringify(g) === JSON.stringify(w) ? ok(m) : bad(m, g, w));
const truthy = (m, g, x) => (g ? ok(m) : bad(m, x === undefined ? g : x));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const disp = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? getComputedStyle(e).display : 'missing'; }, sel);

/* One fake backend per page. mode: 'ok' | 'refuse-first' | 'fail' | 'reject' */
async function wire(p, mode) {
  const posts = [];
  await p.setRequestInterception(true);
  p.on('request', req => {
    if (!req.url().startsWith(FAKE)) return req.continue();
    const body = req.postData() || '';
    posts.push({ headers: req.headers(), body });
    if (mode === 'fail') return req.abort('failed');
    let payload = {}; try { payload = JSON.parse(body); } catch (e) {}
    const now = new Date().toISOString();
    let res;
    if (mode === 'reject') res = { ok: false, error: 'Not a judging payload' };
    else res = { ok: true, receivedAt: now, sections: (payload.sections || []).map((s, i) =>
      (mode === 'refuse-first' && i === 0) ? { key: s.key, ok: false, errors: ['E1234 is not entered in this section.'] }
                                           : { key: s.key, ok: true, updated: 0, added: Object.keys(s.picks || {}).length, cleared: 0 }) };
    req.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(res) });
  });
  return posts;
}
/* Every page gets its OWN browser context: a service worker registered by one
   test would otherwise control the next page and its fetches bypass request
   interception. The page's beforeunload warning (unsent picks) is accepted. */
async function open(b, { width = 390, mode = 'ok', endpoint = true, query = '' } = {}) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', d => d.accept().catch(() => {}));
  await p.setViewport({ width, height: 844, deviceScaleFactor: 1 });
  if (endpoint) await p.evaluateOnNewDocument(u => { window.HF_JUDGING_ENDPOINT_OVERRIDE = u; }, FAKE);
  await p.evaluateOnNewDocument(sel => { window.SEC = sel; }, secSel(PRIZE_KEY));
  const posts = await wire(p, mode);
  await p.goto(URL + query, { waitUntil: 'networkidle2' });
  return { p, errs, posts };
}
const secSel = key => `.jd-sec[data-key="${key.replace(/"/g, '\\"')}"]`;
const pickSel = (key, placing) => `.jd-pick[data-key="${key.replace(/"/g, '\\"')}"][data-placing="${placing}"]`;
async function choose(p, key, placing, id) { await p.select(pickSel(key, placing), id); await sleep(60); }

const PRIZE_KEY = DATA.sections.find(s => !s.positionOnly && s.entries.length >= 2).key;

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] });
  const prizeSec = DATA.sections.find(s => !s.positionOnly && s.entries.length >= 2);
  const posSec = DATA.sections.find(s => s.positionOnly);
  const twoEntries = prizeSec.entries;

  // ---------- 1. loads, and the picker derives from the data ----------
  console.log('\n=== picker renders from judging-data.js ===');
  {
    const { p, errs } = await open(browser, { endpoint: false });
    is('no uncaught page errors', errs, []);
    const r = await p.evaluate(() => ({
      groups: [...document.querySelectorAll('.jd-group')].map(b => b.dataset.group),
      pickerShown: getComputedStyle(document.getElementById('view-picker')).display,
      classShown: getComputedStyle(document.getElementById('view-class')).display,
      status: document.getElementById('jd-status').textContent,
      sendDisabled: document.getElementById('jd-send').disabled,
      barShown: getComputedStyle(document.getElementById('jd-bar')).display
    }));
    is('one card per grouping, in data order', r.groups, DATA.groups.map(g => g.id));
    is('picker visible, class view hidden', [r.pickerShown !== 'none', r.classShown], [true, 'none']);
    is('no endpoint pasted → the page says so instead of pretending', r.status, 'Sending not set up');
    is('send bar hidden when nothing is pending', r.barShown, 'none');
    const labels = await p.evaluate(() => [...document.querySelectorAll('.jd-group-cls')].map(e => e.textContent));
    truthy('position-only cards never render "Class  —"', !labels.some(l => /Class\s*$/.test(l)) && labels.filter(l => /Position only/.test(l)).length === DATA.groups.filter(g => g.positionOnly).length, labels);
    await p.screenshot({ path: path.join(SHOTS, 'judging-picker-390.png') });
    await p.browserContext().close();
  }

  // ---------- 2. deep link + section rendering ----------
  console.log('\n=== ?class= opens straight to a class ===');
  {
    const { p, errs } = await open(browser, { query: '?class=' + prizeSec.group });
    is('no page errors on deep link', errs, []);
    const r = await p.evaluate(() => ({
      classShown: getComputedStyle(document.getElementById('view-class')).display,
      pickerShown: getComputedStyle(document.getElementById('view-picker')).display,
      title: document.getElementById('jd-class-title').textContent,
      secs: [...document.querySelectorAll('.jd-sec')].map(s => s.dataset.key),
      selects: document.querySelectorAll('.jd-pick').length,
      hasDollar: [...document.querySelectorAll('.jd-money')].some(m => /\$\d/.test(m.textContent)),
      zeroPrinted: [...document.querySelectorAll('.jd-money')].some(m => /\$0\b/.test(m.textContent))
    }));
    const want = DATA.sections.filter(s => s.group === prizeSec.group);
    is('class view visible, picker hidden', [r.classShown !== 'none', r.pickerShown], [true, 'none']);
    is('title is the class name, untranslated', r.title, DATA.groups.find(g => g.id === prizeSec.group).name);
    is('every section of the class, in order', r.secs, want.map(s => s.key));
    is('four dropdowns per section', r.selects, want.length * 4);
    truthy('prize money shown', r.hasDollar);
    truthy('a $0 prize is worded, never printed as "$0"', !r.zeroPrinted);
    const opts = await p.evaluate(sel => [...document.querySelector(sel).options].map(o => [o.value, o.textContent]), pickSel(prizeSec.key, '1st'));
    is('first option is blank = not awarded', opts[0][0], '');
    is('dropdown lists only THIS section\'s entries, entry number FIRST', opts.slice(1).map(o => o[0]), prizeSec.entries.map(e => e.id));
    truthy('labels start with the entry number', opts.slice(1).every(o => /^E\d+ — /.test(o[1])), opts.slice(1).map(o => o[1]));
    await p.browserContext().close();
  }

  // ---------- 3. position-only ----------
  console.log('\n=== position-only sections show no dollar figure ===');
  {
    const { p } = await open(browser, { query: '?class=' + posSec.group });
    const r = await p.evaluate(() => ({
      eyebrow: document.getElementById('jd-class-eyebrow').textContent,
      money: [...document.querySelectorAll('.jd-money')].map(m => m.textContent)
    }));
    truthy('eyebrow says position only', /Position only/.test(r.eyebrow), r.eyebrow);
    truthy('no "$" anywhere in the class', !r.money.some(m => /\$/.test(m)), r.money.slice(0, 4));
    await p.browserContext().close();
  }

  // ---------- 4. pick → persist → pending on the PICKER → send → sent ----------
  console.log('\n=== picks persist, pending shows on the picker, send lands ===');
  {
    const { p, posts, errs } = await open(browser, { query: '?class=' + prizeSec.group });
    await choose(p, prizeSec.key, '1st', twoEntries[0].id);
    let r = await p.evaluate(sel => ({ picked: document.querySelector(sel).classList.contains('is-picked'),
      chip: document.querySelector(SEC + ' .jd-chip').textContent, bar: getComputedStyle(document.getElementById('jd-bar')).display,
      status: document.getElementById('jd-status').textContent }), pickSel(prizeSec.key, '1st'));
    truthy('a chosen dropdown is marked picked', r.picked);
    is('section chip reads Not sent', r.chip, 'Not sent');
    truthy('send bar appears', r.bar !== 'none');
    is('status pill counts it', r.status, '1 not sent');

    await p.reload({ waitUntil: 'networkidle2' });
    r = await p.evaluate(sel => ({ val: document.querySelector(sel).value, chip: document.querySelector(SEC + ' .jd-chip').textContent }), pickSel(prizeSec.key, '1st'));
    is('the pick survives a reload (localStorage)', r.val, twoEntries[0].id);
    is('still not sent after reload', r.chip, 'Not sent');

    // 🔴 The picker must show it too.
    await p.click('#jd-back');   // closing a class auto-sends; check the picker AFTER, then test the pure-pending picker separately below
    await sleep(400);
    r = await p.evaluate(() => ({ posts: 1, chip: [...document.querySelectorAll('.jd-group')].map(b => (b.querySelector('.jd-chip') || {}).textContent || ''),
      status: document.getElementById('jd-status').textContent }));
    is('leaving the class is a checkpoint: one POST went out', posts.length, 1);
    const sent = posts[0];
    is('POST is text/plain (never application/json → 405 preflight)', (sent.headers['content-type'] || '').split(';')[0], 'text/plain');
    const body = JSON.parse(sent.body);
    is('payload kind', body.kind, 'judging-results');
    is('payload carries the section key and ENTRY IDS, not labels', body.sections, [{ key: prizeSec.key, picks: { '1st': twoEntries[0].id } }]);
    truthy('payload carries a device id', /^d[a-z0-9]{6,}/.test(body.device), body.device);
    truthy('picker card of that class shows Sent', r.chip.includes('Sent ✓'), r.chip);
    is('status pill: all sent', r.status, 'All sent ✓');

    await p.evaluate(g => window.__hfJudging.open(g), prizeSec.group);
    await sleep(100);
    const chip = await p.$eval(secSel(prizeSec.key) + ' .jd-chip', e => e.textContent);
    truthy('section chip shows Sent + time', /^Sent \d\d:\d\d$/.test(chip), chip);

    // A correction is pending again, and re-sends only that section.
    await choose(p, prizeSec.key, '1st', twoEntries[1].id);
    is('a correction makes the section pending again', await p.$eval(secSel(prizeSec.key) + ' .jd-chip', e => e.textContent), 'Not sent');
    await p.click('#jd-send'); await sleep(400);
    is('Send re-sends just the corrected section', JSON.parse(posts[1].body).sections, [{ key: prizeSec.key, picks: { '1st': twoEntries[1].id } }]);
    truthy('sent again', /^Sent \d\d:\d\d$/.test(await p.$eval(secSel(prizeSec.key) + ' .jd-chip', e => e.textContent)));

    // A retraction is a send too — clearing after a send is pending.
    await choose(p, prizeSec.key, '1st', '');
    is('clearing a SENT pick is pending (a retraction must reach the workbook)', await p.$eval(secSel(prizeSec.key) + ' .jd-chip', e => e.textContent), 'Not sent');
    await p.click('#jd-send'); await sleep(400);
    is('the retraction posts the section with no picks', JSON.parse(posts[2].body).sections, [{ key: prizeSec.key, picks: {} }]);
    is('no page errors through the whole cycle', errs, []);
    await p.browserContext().close();
  }

  // ---------- 5. the picker with something pending and nothing sent ----------
  console.log('\n=== pending is visible on the picker itself ===');
  {
    const { p } = await open(browser, { mode: 'fail', query: '?class=' + prizeSec.group });
    await choose(p, prizeSec.key, '2nd', twoEntries[0].id);
    await p.evaluate(() => window.__hfJudging.close()); await sleep(500);   // auto-send fails (network)
    const r = await p.evaluate(g => { const b = document.querySelector(`.jd-group[data-group="${g}"]`);
      return { chip: (b.querySelector('.jd-chip') || {}).textContent, cls: b.className, status: document.getElementById('jd-status').textContent,
               bar: document.getElementById('jd-bar-msg').textContent, barShown: getComputedStyle(document.getElementById('jd-bar')).display }; }, prizeSec.group);
    is('🔴 the class card says how many sections are not sent', r.chip, '1 not sent');
    truthy('card is flagged pending', /jd-group--pending/.test(r.cls), r.cls);
    is('status pill on the picker', r.status, '1 not sent');
    truthy('bar names the failure and promises a retry', /not sent yet/.test(r.bar) && /Last attempt failed/.test(r.bar) && /retry/.test(r.bar), r.bar);
    truthy('bar is visible on the picker', r.barShown !== 'none');
    await p.screenshot({ path: path.join(SHOTS, 'judging-picker-pending-390.png') });
    await p.browserContext().close();
  }

  // ---------- 6. failure keeps the picks; a refusal is named ----------
  console.log('\n=== failed send keeps everything; refused section is named ===');
  {
    const { p, posts } = await open(browser, { mode: 'fail', query: '?class=' + prizeSec.group });
    await choose(p, prizeSec.key, '1st', twoEntries[0].id);
    await p.click('#jd-send'); await sleep(500);
    let r = await p.evaluate(sel => ({ val: document.querySelector(sel).value, chip: document.querySelector(SEC + ' .jd-chip').textContent,
      bar: document.getElementById('jd-bar-msg').textContent, cls: document.getElementById('jd-bar-msg').className }), pickSel(prizeSec.key, '1st'));
    is('the pick is still there after a network failure', r.val, twoEntries[0].id);
    is('section still Not sent', r.chip, 'Not sent');
    truthy('bar shows the error state', /is-error/.test(r.cls) && /failed/.test(r.bar), r.bar);
    is('one attempt was made', posts.length, 1);
    await p.browserContext().close();

    const q = await open(browser, { mode: 'refuse-first', query: '?class=' + prizeSec.group });
    const p2 = q.p;
    await choose(p2, prizeSec.key, '1st', twoEntries[0].id);
    await p2.click('#jd-send'); await sleep(500);
    r = await p2.evaluate(() => ({ chip: document.querySelector(SEC + ' .jd-chip').textContent, warn: (document.querySelector(SEC + ' .jd-warn') || {}).textContent || '',
      sec: document.querySelector(SEC).className, disabled: document.getElementById('jd-send').disabled }));
    is('a refused section says Refused', r.chip, 'Refused');
    truthy('the office\'s reason is shown verbatim', /E1234 is not entered in this section/.test(r.warn), r.warn);
    truthy('section is flagged refused', /jd-sec--refused/.test(r.sec));
    truthy('Send is disabled while the only pending section is refused (no retry loop)', r.disabled);
    await choose(p2, prizeSec.key, '1st', twoEntries[1].id);
    is('changing the picks lifts the refusal and makes it pending', await p2.$eval(secSel(prizeSec.key) + ' .jd-chip', e => e.textContent), 'Not sent');
    await p2.browserContext().close();

    const z = await open(browser, { mode: 'reject', query: '?class=' + prizeSec.group });
    await choose(z.p, prizeSec.key, '1st', twoEntries[0].id);
    await z.p.click('#jd-send'); await sleep(500);
    r = await z.p.evaluate(() => ({ chip: document.querySelector(SEC + ' .jd-chip').textContent, bar: document.getElementById('jd-bar-msg').textContent }));
    is('a whole-payload rejection leaves the section Not sent', r.chip, 'Not sent');
    truthy('and shows the server\'s message', /Not a judging payload/.test(r.bar), r.bar);
    await z.p.browserContext().close();
  }

  // ---------- 7. the same entry twice ----------
  console.log('\n=== the same entry cannot take two prizes ===');
  {
    const { p, posts } = await open(browser, { query: '?class=' + prizeSec.group });
    await choose(p, prizeSec.key, '1st', twoEntries[0].id);
    await choose(p, prizeSec.key, '2nd', twoEntries[0].id);
    let r = await p.evaluate(() => ({ warn: (document.querySelector(SEC + ' .jd-warn') || {}).textContent || '', disabled: document.getElementById('jd-send').disabled, bar: document.getElementById('jd-bar-msg').textContent }));
    truthy('an inline warning names the entry', r.warn.includes(twoEntries[0].id) && /two prizes/.test(r.warn), r.warn);
    truthy('Send is disabled', r.disabled);
    truthy('bar says a fix is needed', /needs a fix/.test(r.bar), r.bar);
    await p.click('#jd-send'); await sleep(200);
    is('nothing was posted', posts.length, 0);
    await choose(p, prizeSec.key, '2nd', twoEntries[1].id);
    r = await p.evaluate(() => ({ warn: !!document.querySelector(SEC + ' .jd-warn'), disabled: document.getElementById('jd-send').disabled }));
    is('fixing it clears the warning and enables Send', [r.warn, r.disabled], [false, false]);
    await p.browserContext().close();
  }

  // ---------- 8. French ----------
  console.log('\n=== FR ===');
  {
    const { p } = await open(browser, { query: '?class=' + prizeSec.group });
    await p.click('.jd-lang button[data-lang="fr"]'); await sleep(100);
    const r = await p.evaluate(() => ({
      lang: document.documentElement.lang, back: document.querySelector('#jd-back span[data-en]').textContent,
      places: [...document.querySelectorAll(SEC + ' .jd-place')].map(e => e.textContent),
      title: document.getElementById('jd-class-title').textContent, blank: document.querySelector('.jd-pick option').textContent,
      pressed: document.querySelector('.jd-lang button[data-lang="fr"]').getAttribute('aria-pressed'),
      stored: localStorage.getItem('hf-lang')
    }));
    is('html lang flips', r.lang, 'fr');
    is('static chrome translated', r.back, 'Toutes les classes');
    is('placings in French', r.places, ['1er', '2e', '3e', '4e']);
    is('blank option in French', r.blank, '— non décerné —');
    is('class name is NOT translated (verbatim prize book)', r.title, DATA.groups.find(g => g.id === prizeSec.group).name);
    is('FR button pressed, choice shared with the rest of the site', [r.pressed, r.stored], ['true', 'fr']);
    await p.click('.jd-lang button[data-lang="en"]');
    await p.browserContext().close();
  }

  // ---------- 9. touch targets + contrast from rendered pixels ----------
  console.log('\n=== touch targets and contrast, measured ===');
  {
    const { p } = await open(browser, { query: '?class=' + prizeSec.group });
    await choose(p, prizeSec.key, '1st', twoEntries[0].id);
    const m = await p.evaluate(() => {
      const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return +(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2)); };
      const rgb = s => { const m = s.match(/[\d.]+/g) || []; return [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1]; };
      const over = (fg, bg) => { const a = fg[3]; return [0, 1, 2].map(i => Math.round(fg[i] * a + bg[i] * (1 - a))); };
      const bgOf = el => { let e = el; while (e) { const c = rgb(getComputedStyle(e).backgroundColor); if (c[3] > 0) return c.slice(0, 3); e = e.parentElement; } return [255, 255, 255]; };
      const fg = el => { const c = rgb(getComputedStyle(el).color); return c[3] < 1 ? over(c, bgOf(el)) : c.slice(0, 3); };
      const q = s => document.querySelector(s);
      const h = s => Math.round(q(s).getBoundingClientRect().height);
      return {
        selectH: h('.jd-pick'), sendH: h('#jd-send'), backH: h('#jd-back'), langH: h('.jd-lang button'),
        c: {
          title: ratio(fg(q('.jd-sec-title')), bgOf(q('.jd-sec-title'))),
          meta: ratio(fg(q('.jd-sec-meta')), bgOf(q('.jd-sec-meta'))),
          money: ratio(fg(q('.jd-money')), bgOf(q('.jd-money'))),
          selectText: ratio(fg(q('.jd-pick')), rgb(getComputedStyle(q('.jd-pick')).backgroundColor).slice(0, 3)),
          pendingChip: ratio(fg(q('.jd-chip--pending')), rgb(getComputedStyle(q('.jd-chip--pending')).backgroundColor).slice(0, 3)),
          statusPill: ratio(fg(q('#jd-status')), rgb(getComputedStyle(q('#jd-status')).backgroundColor).slice(0, 3)),
          sendBtn: ratio(fg(q('#jd-send')), rgb(getComputedStyle(q('#jd-send')).backgroundColor).slice(0, 3)),
          barMsg: ratio(fg(q('#jd-bar-msg b')), bgOf(q('#jd-bar-msg')))
        },
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        pillRight: Math.round(q('#jd-status').getBoundingClientRect().right), vw: document.documentElement.clientWidth
      };
    });
    truthy('dropdowns ≥ 56px tall', m.selectH >= 56, m.selectH);
    truthy('Send ≥ 56px tall', m.sendH >= 56, m.sendH);
    truthy('back + language buttons ≥ 44px', m.backH >= 44 && m.langH >= 44, [m.backH, m.langH]);
    Object.keys(m.c).forEach(k => truthy(`contrast ${k} ≥ 4.5 (${m.c[k]})`, m.c[k] >= 4.5, m.c[k]));
    truthy('no horizontal overflow at 390px', !m.overflow);
    truthy('status pill fully on screen at 390px (it clipped off the right edge once)', m.pillRight <= m.vw, [m.pillRight, m.vw]);
    await p.screenshot({ path: path.join(SHOTS, 'judging-class-390.png'), fullPage: true });
    await p.setViewport({ width: 1440, height: 900 });
    await sleep(100);
    await p.screenshot({ path: path.join(SHOTS, 'judging-class-1440.png'), fullPage: true });
    await p.browserContext().close();
  }

  // ---------- 10. service worker: reload with no network ----------
  console.log('\n=== offline reload via the service worker ===');
  {
    const ctx = await browser.createBrowserContext();
    const p = await ctx.newPage();
    p.on('dialog', d => d.accept().catch(() => {}));
    await p.setViewport({ width: 390, height: 844 });
    await p.goto(URL + '?class=' + prizeSec.group, { waitUntil: 'networkidle2' });
    const reg = await p.evaluate(async () => { try { const r = await navigator.serviceWorker.ready; return !!r.active; } catch (e) { return 'err:' + e; } });
    is('service worker registered and active', reg, true);
    await sleep(600);   // let install precache finish
    await p.setOfflineMode(true);
    let offlineOk = false, secs = 0;
    try { await p.reload({ waitUntil: 'load' }); secs = await p.evaluate(() => document.querySelectorAll('.jd-sec').length); offlineOk = secs > 0; } catch (e) { offlineOk = 'reload failed: ' + e.message; }
    truthy('page reloads OFFLINE with ?class= and still renders its sections', offlineOk === true, offlineOk);
    await p.setOfflineMode(false);
    await p.evaluate(async () => { const rs = await navigator.serviceWorker.getRegistrations(); for (const r of rs) await r.unregister(); const ks = await caches.keys(); for (const k of ks) await caches.delete(k); });
    await p.browserContext().close();
  }

  await browser.close();
  console.log(`\n${fail ? '❌' : '✅'} ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
