/* Covers the registration page's category switching: the sticky context bar,
 * the cross-category "add a class in the other group" buttons, and the
 * two-tier card chooser.
 *
 * ⚠️ Needs the site SERVED (real viewport + layout) — this drives Chrome, not
 * jsdom, because everything here is positional:
 *   cd ~/havelock-fair-site && python3 -m http.server 8765
 *   node tools/verify-reg-switcher.js
 *
 * WHY THIS EXISTS. Livestock and Home & Garden are two views of ONE
 * submission (#form-general, one Submit). Youth / 4-H / Equestrian are each a
 * SEPARATE form with its own Submit. Before this, a visitor could fill the
 * General form, click Youth, submit Youth, and their General entries were
 * silently never sent — #entries-summary, the only warning, lives inside the
 * General panel and is hidden exactly when it is needed. The context bar
 * carries that warning across panels; the tests below pin it down.
 */
const puppeteer = require('puppeteer-core');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.REG_BASE || 'http://localhost:8765';
const URL = BASE + '/pages/registration.html';

let pass = 0, fail = 0;
const ok = (m, x) => { pass++; console.log('  ✅ ' + m + (x !== undefined ? '  ' + x : '')); };
const bad = (m, got, want) => { fail++; console.log('  ❌ ' + m);
  if (got !== undefined) console.log('       got  ' + JSON.stringify(got));
  if (want !== undefined) console.log('       want ' + JSON.stringify(want)); };
const is = (m, got, want) => (JSON.stringify(got) === JSON.stringify(want) ? ok(m) : bad(m, got, want));

/* Fill an entry card for real: pick a class, wait for the sections it loads,
   tick one. An empty card is worth ZERO entries by design (countCardEntries
   returns sections x breeds), so a half-filled card would not exercise the
   warning at all. */
async function fillFirst(page, container) {
  await page.evaluate(c => {
    const card = document.querySelector('#' + c + ' .entry-card');
    const sel = card.querySelector('[name$="_class"]');
    sel.value = sel.options[1].value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, container);
  await new Promise(r => setTimeout(r, 250));
  return page.evaluate(c => {
    const card = document.querySelector('#' + c + ' .entry-card');
    const box = card.querySelector('[name$="_section[]"]');
    if (!box) return 0;
    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    return 1;
  }, container);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] });

  // ---------------- desktop ----------------
  console.log('\n=== sticky context bar (1440x900) ===');
  let p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(URL, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 700));

  is('hidden on first paint, before the reader reaches the cards',
    await p.evaluate(() => document.getElementById('reg-context').hidden), true);

  await p.evaluate(() => document.querySelector('.cat-chooser').scrollIntoView({ block: 'start' }));
  await new Promise(r => setTimeout(r, 400));
  is('still hidden while the cards themselves are on screen',
    await p.evaluate(() => document.getElementById('reg-context').hidden), true);

  await p.evaluate(() => window.scrollTo(0, 2400));
  await new Promise(r => setTimeout(r, 400));
  const geo = await p.evaluate(() => {
    const b = document.getElementById('reg-context');
    const r = b.getBoundingClientRect(), h = document.querySelector('.hf-header').getBoundingClientRect();
    return { hidden: b.hidden, top: Math.round(r.top), headerBottom: Math.round(h.bottom), h: Math.round(r.height) };
  });
  is('shown once the cards are above you', geo.hidden, false);
  geo.top >= geo.headerBottom - 1
    ? ok('sits below the site header, no overlap', `bar top ${geo.top} / header bottom ${geo.headerBottom}`)
    : bad('bar must not tuck under the header', geo, 'top >= headerBottom');

  await p.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 400));
  is('hides again when you scroll back up',
    await p.evaluate(() => document.getElementById('reg-context').hidden), true);

  // ---------------- switching without scrolling back ----------------
  console.log('\n=== switching from where you are ===');
  is('starts on Livestock',
    await p.evaluate(() => document.querySelector('.entries-group.active').id), 'group-livestock');

  const cross = await p.evaluate(() => {
    addEntryIn('homegarden');
    return { liv: document.querySelectorAll('#entries-livestock .entry-card').length,
             hg: document.querySelectorAll('#entries-homegarden .entry-card').length,
             group: document.querySelector('.entries-group.active').id,
             chip: document.getElementById('chip-homegarden').getAttribute('aria-pressed'),
             card: document.getElementById('tab-homegarden').getAttribute('aria-pressed') };
  });
  is('cross-add puts the new card in the OTHER container', cross.hg, 2);
  is('  and leaves the first group untouched', cross.liv, 1);
  is('  and switches the visible group', cross.group, 'group-homegarden');
  is('  and lights the bar chip', cross.chip, 'true');
  is('  and lights the top card too', cross.card, 'true');

  /* .add-entry-btn sets width:100%, so the two buttons stack unless the row
     override is declared AFTER it. They did, and the row was 120px tall. */
  const row = await p.evaluate(() => {
    const r = [...document.querySelectorAll('.add-entry-row')].find(x => x.offsetParent);
    const tops = [...r.querySelectorAll('.add-entry-btn')].map(b => Math.round(b.getBoundingClientRect().top));
    return { n: tops.length, rows: new Set(tops).size, h: Math.round(r.getBoundingClientRect().height),
             cross: !!r.querySelector('.add-entry-cross') };
  });
  is('the visible group offers both add buttons', row.n, 2);
  is('  one of them is the cross-category escape hatch', row.cross, true);
  is('  side by side on desktop, not stacked', row.rows, 1);
  row.h <= 70 ? ok('  row stays compact', row.h + 'px') : bad('add row <= 70px', row.h + 'px');

  is('a bar chip switches back',
    await p.evaluate(() => { switchTab('livestock'); return document.querySelector('.entries-group.active').id; }),
    'group-livestock');

  // ---------------- counts + the cross-panel warning ----------------
  console.log('\n=== the warning that used to be impossible to see ===');
  await fillFirst(p, 'entries-livestock');
  const counted = await p.evaluate(() => ({
    chip: document.getElementById('chip-n-livestock').textContent.trim(),
    badge: document.getElementById('count-livestock').textContent.trim()
  }));
  /·\s*\d+/.test(counted.chip) ? ok('bar chip shows a live count', JSON.stringify(counted.chip))
                               : bad('bar chip shows a live count', counted);
  counted.badge ? ok('top card badge still updates', JSON.stringify(counted.badge))
                : bad('top card badge still updates', counted);

  const onYouth = await p.evaluate(() => {
    switchTab('youth');
    const w = document.getElementById('reg-context-warn');
    const gone = id => getComputedStyle(document.getElementById(id)).display === 'none';
    return { switcher: gone('reg-context-switch'),
             where: document.getElementById('reg-context-where').textContent,
             warnHidden: getComputedStyle(w).display === 'none', warn: w.textContent,
             warnTitle: w.title };
  });
  is('switcher is NOT RENDERED on a separate programme', onYouth.switcher, true);
  /separate registration/i.test(onYouth.where)
    ? ok('bar says Youth is a separate registration', JSON.stringify(onYouth.where))
    : bad('bar names the separate programme', onYouth.where);
  is('WARNS about the unsubmitted General entries', onYouth.warnHidden, false);
  /not submitted/i.test(onYouth.warn)
    ? ok('  warning names the risk', JSON.stringify(onYouth.warn))
    : bad('  warning names the risk', onYouth.warn);
  /own submit button/i.test(onYouth.warnTitle)
    ? ok('  full sentence kept in title= for hover / assistive tech')
    : bad('  full sentence in title=', onYouth.warnTitle);

  is('no warning when nothing is pending',
    await p.evaluate(() => {
      document.querySelectorAll('#entries-livestock .entry-card, #entries-homegarden .entry-card').forEach(c => c.remove());
      updateCatCounts();
      return getComputedStyle(document.getElementById('reg-context-warn')).display === 'none';
    }), true);

  // The bar sits under a 75px site header; a tall one eats the form.
  const barH = await p.evaluate(() => {
    switchTab('livestock'); window.scrollTo(0, 2400);
    return Math.round(document.getElementById('reg-context').getBoundingClientRect().height);
  });
  barH <= 60 ? ok('bar stays slim on desktop', barH + 'px')
             : bad('bar height <= 60px on desktop', barH + 'px');
  const warnH = await p.evaluate(() => {
    addEntry('livestock'); // the check above cleared every card
    const s = document.querySelector('#entries-livestock .entry-card [name$="_class"]');
    s.value = s.options[1].value; s.dispatchEvent(new Event('change', { bubbles: true }));
    return new Promise(r => setTimeout(() => {
      const b = document.querySelector('#entries-livestock [name$="_section[]"]');
      if (b) { b.checked = true; b.dispatchEvent(new Event('change', { bubbles: true })); }
      switchTab('youth');
      r(Math.round(document.getElementById('reg-context').getBoundingClientRect().height));
    }, 300));
  });
  warnH <= 60 ? ok('  and while showing the warning', warnH + 'px')
              : bad('bar height <= 60px with warning', warnH + 'px');
  await p.close();

  // ---------------- cards ----------------
  console.log('\n=== the chooser cards ===');
  for (const [w, h, cap] of [[1440, 900, 420], [390, 844, 560]]) {
    const q = await browser.newPage();
    await q.setViewport({ width: w, height: h });
    await q.goto(URL, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));
    const m = await q.evaluate(() => ({
      chooser: Math.round(document.querySelector('.cat-chooser').getBoundingClientRect().height),
      tiers: document.querySelectorAll('.cat-tier').length,
      emoji: /[\u{1F300}-\u{1FAFF}]/u.test(document.querySelector('.cat-chooser').textContent),
      subShown: getComputedStyle(document.querySelector('.cat-card-sub')).display,
      cards: document.querySelectorAll('.cat-card').length,
      clipped: [...document.querySelectorAll('.cat-card')].some(c => {
        const r = c.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; })
    }));
    console.log(`  -- ${w}px --`);
    is('five cards, two tiers', [m.cards, m.tiers], [5, 2]);
    is('no emoji left in the chooser', m.emoji, false);
    is('no card clips the viewport', m.clipped, false);
    m.chooser <= cap ? ok('chooser height within budget', `${m.chooser}px (cap ${cap})`)
                     : bad('chooser height within budget', m.chooser + 'px', '<= ' + cap + 'px');
    if (w === 390) is('blurbs dropped on phones', m.subShown, 'none');
    await q.close();
  }

  // The bar was only height-checked at 1440px, and the chips wrapped onto a
  // second row at 390px — ~110px of a 844px phone. Check the phone too.
  console.log('\n=== bar on a phone (390x844) ===');
  const mp = await browser.newPage();
  await mp.setViewport({ width: 390, height: 844 });
  await mp.goto(URL, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 700));
  await mp.evaluate(() => window.scrollTo(0, 2200));
  await new Promise(r => setTimeout(r, 400));
  const mob = await mp.evaluate(() => {
    const b = document.getElementById('reg-context');
    const chips = [...document.querySelectorAll('.reg-chip')].map(c => Math.round(c.getBoundingClientRect().top));
    return { hidden: b.hidden, h: Math.round(b.getBoundingClientRect().height),
             rows: new Set(chips).size, right: Math.round(b.getBoundingClientRect().right), vw: innerWidth };
  });
  is('bar is showing', mob.hidden, false);
  // On a phone the warning must be READABLE, not ellipsised to a sliver.
  const mw = await mp.evaluate(async () => {
    const sel = document.querySelector('#entries-livestock .entry-card [name$="_class"]');
    sel.value = sel.options[1].value; sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    const box = document.querySelector('#entries-livestock [name$="_section[]"]');
    if (box) { box.checked = true; box.dispatchEvent(new Event('change', { bubbles: true })); }
    switchTab('youth');
    const w = document.getElementById('reg-context-warn');
    return { w: Math.round(w.getBoundingClientRect().width), text: w.textContent,
             whereShown: getComputedStyle(document.getElementById('reg-context-where')).display !== 'none',
             h: Math.round(document.getElementById('reg-context').getBoundingClientRect().height) };
  });
  mw.w >= 120 ? ok('warning is readable on a phone', `${mw.w}px wide, ${JSON.stringify(mw.text)}`)
              : bad('warning >= 120px wide on a phone', mw);
  is('  the orientation label yields to it', mw.whereShown, false);
  mw.h <= 56 ? ok('  and the bar is still slim', mw.h + 'px') : bad('bar <= 56px with warning on phone', mw.h);
  is('both chips share ONE row', mob.rows, 1);
  mob.h <= 56 ? ok('bar stays slim on a phone', mob.h + 'px') : bad('bar height <= 56px on phone', mob.h + 'px');
  mob.right <= mob.vw + 1 ? ok('bar does not overflow the viewport') : bad('bar within viewport', mob);
  await mp.close();

  /* ---------------- contrast, measured from what the browser RENDERS ----
     Not from the stylesheet source: these are alpha-composited colours, and
     the whole point of the palette change was that the source values looked
     fine while the composited result failed. */
  console.log('\n=== contrast (option B, measured on rendered pixels) ===');
  const cp = await browser.newPage();
  await cp.setViewport({ width: 1440, height: 900 });
  await cp.goto(URL, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 700));
  const cr = await cp.evaluate(() => {
    const px = c => { const m = c.match(/[\d.]+/g).map(Number); return m.length > 3 ? m : [...m, 1]; };
    const flat = (fg, bg) => { const [r, g, b, a] = fg; const [R, G, B] = bg;
      return [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)]; };
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return +(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2)); };
    const cs = el => getComputedStyle(el);
    /* Resolve the REAL backdrop by walking up to the first painted ancestor.
       .reg-section is transparent, so reading it directly yields rgba(0,0,0,0)
       and every ratio gets measured against phantom black — which reported the
       card lifting 1.49 off a ground it never touches. The true ground is the
       body's espresso. */
    const groundOf = el => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const c = px(cs(n).backgroundColor);
        if (c[3] > 0.99) return c.slice(0, 3);
      }
      return px(cs(document.body).backgroundColor).slice(0, 3);
    };
    const page = groundOf(document.querySelector('.cat-chooser'));
    const off = document.getElementById('tab-homegarden');
    const on = document.getElementById('tab-livestock');
    const offBg = flat(px(cs(off).backgroundColor), page);
    const onBg = flat(px(cs(on).backgroundColor), page);
    const offEdge = flat(px(cs(off).borderTopColor), offBg);
    const onTitle = flat(px(cs(on.querySelector('.cat-card-title')).color), onBg);
    const onSub = flat(px(cs(on.querySelector('.cat-card-sub')).color), onBg);
    const onMeta = flat(px(cs(on.querySelector('.cat-card-meta')).color), onBg);
    const offTitle = flat(px(cs(off.querySelector('.cat-card-title')).color), offBg);
    const offSub = flat(px(cs(off.querySelector('.cat-card-sub')).color), offBg);
    const chip = document.getElementById('chip-homegarden');
    const barBg = flat(px(cs(document.getElementById('reg-context')).backgroundColor), page);
    return {
      surface: ratio(offBg, page),
      edge: ratio(offEdge, offBg),
      selection: ratio(onBg, offBg),
      onTitle: ratio(onTitle, onBg), onSub: ratio(onSub, onBg), onMeta: ratio(onMeta, onBg),
      offTitle: ratio(offTitle, offBg), offSub: ratio(offSub, offBg),
      chipEdge: ratio(flat(px(cs(chip).borderTopColor), barBg), barBg)
    };
  });
  const need = (label, got, min) => got >= min
    ? ok(label, `${got}:1  (needs ${min})`)
    : bad(label, `${got}:1`, `>= ${min}:1`);
  need('unselected card EDGE clears WCAG 1.4.11 non-text', cr.edge, 3.0);
  cr.surface >= 1.2
    ? ok('card surface lifts off the page', `${cr.surface}:1  (was 1.06, flat)`)
    : bad('card vs page >= 1.20', cr.surface);
  need('bar chip edge clears it too', cr.chipEdge, 3.0);
  cr.selection >= 4.5
    ? ok('selected vs unselected card is unmistakable', `${cr.selection}:1  (was 1.18)`)
    : bad('selection separation >= 4.5', cr.selection);
  need('title on the GOLD selected card', cr.onTitle, 4.5);
  need('blurb on the gold selected card', cr.onSub, 4.5);
  need('class range on the gold selected card', cr.onMeta, 4.5);
  need('title on an unselected card', cr.offTitle, 4.5);
  need('blurb on an unselected card', cr.offSub, 4.5);
  await cp.close();

  await browser.close();
  console.log('\n' + (fail === 0 ? `✅ all switcher checks passed (${pass})` : `❌ ${fail} failed, ${pass} passed`));
  process.exit(fail ? 1 : 0);
})();
