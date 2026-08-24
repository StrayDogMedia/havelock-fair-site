/* Covers pages/schedule.html: chronological order, the all-day band, the
 * "Don't miss" strip, category colour, and the live on-now view.
 *
 * ⚠️ Needs the site SERVED — this drives real Chrome, because order, layout
 * and colour are all positional/computed:
 *   cd ~/havelock-fair-site && python3 -m http.server 8765
 *   NODE_PATH=/path/to/node_modules node tools/verify-schedule.js
 *
 * THE CHECK THAT MATTERS MOST is the first one. buildTimeline() used to group
 * events into a plain object keyed by "9:00"-style strings — those aren't
 * array-index-like, so the keys kept INSERTION order and the timeline rendered
 * in whatever order schedule-data.js happened to list. Saturday ran
 * 12:30 -> 3:00 PM -> 11:00 AM and Sunday jumped 3:00 PM -> 9:00 AM, live, for
 * months, because nothing ever asserted the order.
 */
const puppeteer = require('puppeteer-core');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.SCHED_BASE || 'http://localhost:8765';
const URL = BASE + '/pages/schedule.html';
const DAYS = ['saturday', 'sunday'];
const LANGS = ['en', 'fr', 'es'];

let pass = 0, fail = 0;
const ok = (m, x) => { pass++; console.log('  ✅ ' + m + (x !== undefined ? '  ' + x : '')); };
const bad = (m, got, want) => { fail++; console.log('  ❌ ' + m);
  if (got !== undefined) console.log('       got  ' + JSON.stringify(got));
  if (want !== undefined) console.log('       want ' + JSON.stringify(want)); };
const is = (m, g, w) => (JSON.stringify(g) === JSON.stringify(w) ? ok(m) : bad(m, g, w));

const open = async (browser, query = '', w = 1440) => {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: 900 });
  await p.goto(URL + query, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 700));
  return p;
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] });

  // ---------------- 1. chronology ----------------
  console.log('\n=== chronological order (the bug that shipped) ===');
  for (const lang of LANGS) {
    const p = await open(browser);
    await p.evaluate(l => setLanguage(l), lang);
    await new Promise(r => setTimeout(r, 300));
    for (const day of DAYS) {
      await p.evaluate(d => switchDay(d), day);
      await new Promise(r => setTimeout(r, 250));
      const r = await p.evaluate(d => {
        const gs = [...document.querySelectorAll(`#timeline-${d} .time-group`)];
        const mins = gs.map(g => { const [h, m] = g.dataset.time.split(':').map(Number); return h * 60 + m; });
        const drops = [];
        for (let i = 1; i < mins.length; i++) if (mins[i] < mins[i - 1]) drops.push(`${gs[i - 1].dataset.time} -> ${gs[i].dataset.time}`);
        return { drops, n: gs.length, labels: gs.map(g => g.querySelector('.time-label').textContent.trim()) };
      }, day);
      r.drops.length === 0
        ? ok(`${lang.toUpperCase()} ${day} runs forwards`, `${r.n} slots, ${r.labels[0]} → ${r.labels[r.labels.length - 1]}`)
        : bad(`${lang.toUpperCase()} ${day} runs forwards`, r.drops, 'no backward steps');
    }
    await p.close();
  }

  // ---------------- 2. nothing lost ----------------
  console.log('\n=== nothing lost splitting out the all-day band ===');
  {
    const p = await open(browser);
    for (const day of DAYS) {
      await p.evaluate(d => switchDay(d), day);
      await new Promise(r => setTimeout(r, 250));
      const r = await p.evaluate(d => ({
        data: scheduleData[d].events.length,
        allDayData: scheduleData[d].events.filter(e => e.allDay).length,
        rendered: document.querySelectorAll(`#timeline-${d} .event-card`).length,
        inBand: document.querySelectorAll(`#timeline-${d} .sched-allday .event-card`).length,
        inSlots: document.querySelectorAll(`#timeline-${d} .time-group .event-card`).length
      }), day);
      is(`${day}: every event still renders exactly once`, r.rendered, r.data);
      is(`  all-day events sit in the band, not a time slot`, r.inBand, r.allDayData);
      is(`  and the slots hold the rest`, r.inSlots, r.data - r.allDayData);
    }
    await p.close();
  }

  // ---------------- 3. the "Don't miss" strip ----------------
  console.log('\n=== "Don\'t miss" strip ===');
  {
    const p = await open(browser);
    for (const day of DAYS) {
      await p.evaluate(d => switchDay(d), day);
      await new Promise(r => setTimeout(r, 250));
      const r = await p.evaluate(d => {
        const cards = [...document.querySelectorAll(`#timeline-${d} .sched-highlight`)];
        return {
          n: cards.length,
          flagged: scheduleData[d].events.filter(e => e.highlight).length,
          broken: cards.filter(c => { const i = c.querySelector('img'); return i && (!i.complete || i.naturalWidth === 0); }).length,
          noArt: cards.filter(c => !c.querySelector('img')).length,
          overflow: cards.filter(c => {
            const t = c.querySelector('.sh-title'); return t.scrollHeight > t.clientHeight + 1;
          }).map(c => c.querySelector('.sh-title').textContent),
          jumps: cards.map(c => c.dataset.jump),
          slots: [...document.querySelectorAll(`#timeline-${d} .time-group`)].map(g => g.dataset.time)
        };
      }, day);
      is(`${day}: strip matches the flagged events`, r.n, r.flagged);
      is(`  every photo loads`, r.broken, 0);
      is(`  every card has one`, r.noArt, 0);
      r.overflow.length === 0 ? ok('  no title overflows its card')
        : bad('  no title overflows its card', r.overflow, 'clamped to 2 lines');
      const dangling = r.jumps.filter(j => !r.slots.includes(j));
      is(`  every card jumps to a real time slot`, dangling, []);
    }
    // BB King is unconfirmed and must not be featured
    const feat = await p.evaluate(() => {
      const t = [];
      for (const d of ['saturday', 'sunday'])
        scheduleData[d].events.filter(e => e.highlight).forEach(e => t.push(e.en));
      return t;
    });
    feat.some(t => /BB King/i.test(t))
      ? bad('BB King (unconfirmed billing) must NOT be a highlight', feat)
      : ok('BB King stays out of the strip — billing still unconfirmed');
    await p.close();
  }

  // ---------------- 4. on now / up next ----------------
  console.log('\n=== live view, driven by ?now= ===');
  const at = async (iso, day, expect) => {
    const p = await open(browser, `?now=${encodeURIComponent(iso)}`);
    await p.evaluate(d => switchDay(d), day);
    await new Promise(r => setTimeout(r, 300));
    const r = await p.evaluate(d => ({
      now: [...document.querySelectorAll(`#timeline-${d} .time-group.is-now`)].map(g => g.dataset.time),
      next: [...document.querySelectorAll(`#timeline-${d} .time-group.is-next`)].map(g => g.dataset.time),
      done: document.querySelectorAll(`#timeline-${d} .time-group.is-done`).length
    }), day);
    is(`${iso}  on-now`, r.now, expect.now);
    is(`${iso}  up-next`, r.next, expect.next);
    if (expect.done !== undefined) is(`${iso}  finished slots`, r.done, expect.done);
    await p.close();
  };
  await at('2026-09-12T07:15', 'saturday', { now: ['6:00'], next: ['8:00'], done: 0 });
  await at('2026-09-12T13:20', 'saturday', { now: ['13:00'], next: ['15:00'] });
  await at('2026-09-12T23:00', 'saturday', { now: ['16:30'], next: [] });
  await at('2026-09-13T12:30', 'sunday',  { now: ['12:00'], next: ['13:00'] });
  {
    const p = await open(browser); // no override — 19 days before the fair
    const r = await p.evaluate(() => document.querySelectorAll('.time-group.is-now, .time-group.is-done').length);
    is('outside the fair nothing is marked live', r, 0);
    await p.close();
  }

  // ---------------- 5. category colour ----------------
  console.log('\n=== category colour, measured on rendered pixels ===');
  {
    const p = await open(browser);
    const r = await p.evaluate(() => {
      const px = c => { const m = c.match(/[\d.]+/g).map(Number); return m.length > 3 ? m : [...m, 1]; };
      const flat = (f, b) => { const [r, g, bl, a] = f; return [r * a + b[0] * (1 - a), g * a + b[1] * (1 - a), bl * a + b[2] * (1 - a)]; };
      const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return +(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2)); };
      const ground = el => { for (let n = el; n; n = n.parentElement) {
        const c = px(getComputedStyle(n).backgroundColor); if (c[3] > 0.99) return c.slice(0, 3); }
        return px(getComputedStyle(document.body).backgroundColor).slice(0, 3); };
      const out = {};
      document.querySelectorAll('.event-card').forEach(card => {
        const rule = card.querySelector('.ev-rule');
        if (!rule) return;
        out[card.dataset.cat] = ratio(flat(px(getComputedStyle(rule).backgroundColor), ground(card)), ground(card));
      });
      return { ratios: out,
               swatches: document.querySelectorAll('.cat-btn .cat-swatch').length,
               srText: document.querySelectorAll('.event-card .sr-only').length,
               rows: document.querySelectorAll('.event-card').length };
    });
    is('all six categories actually got measured', Object.keys(r.ratios).sort(),
       ['animals', 'antique', 'food', 'general', 'kids', 'music']);
    Object.entries(r.ratios).forEach(([cat, v]) =>
      v >= 3 ? ok(`${cat} rule clears 3:1 non-text`, `${v}:1`)
             : bad(`${cat} rule clears 3:1`, v, '>= 3'));
    is('colour is never the only signal — every row names its category', r.srText, r.rows);
    r.swatches > 0 ? ok('filter buttons carry the same colour key', r.swatches + ' swatches')
                   : bad('filter buttons carry swatches', r.swatches);
    await p.close();
  }

  // ---------------- 6. filtering still collapses empties ----------------
  console.log('\n=== filtering ===');
  {
    const p = await open(browser);
    const pick = cat => p.evaluate(c => {
      document.querySelector(`.cat-btn[data-cat="${c}"]`).click();
      const groups = [...document.querySelectorAll('.day-content.active .time-group:not(.hidden)')];
      return {
        allMatch: [...document.querySelectorAll('.day-content.active .event-card:not(.hidden)')].every(x => x.dataset.cat === c),
        noEmptyGroups: groups.every(g => g.querySelectorAll('.event-card:not(.hidden)').length > 0),
        stripHidden: document.querySelector('.day-content.active .sched-highlights').classList.contains('hidden'),
        bandHidden: document.querySelector('.day-content.active .sched-allday').classList.contains('hidden'),
        bandRows: document.querySelectorAll('.day-content.active .sched-allday .event-card:not(.hidden)').length
      };
    }, cat);

    const music = await pick('music');
    is('only music rows remain', music.allMatch, true);
    is('empty time slots collapse', music.noEmptyGroups, true);
    is('the highlights strip steps aside when filtering', music.stripHidden, true);
    /* Saturday's all-day band is antique/food/kids/animals — no music at all,
       so it must disappear rather than leave a stranded "ALL DAY" heading. */
    is('all-day band hides when the filter empties it', music.bandHidden, true);

    const food = await pick('food');
    is('...and comes back for a category it does have', food.bandHidden, false);
    food.bandRows > 0 ? ok('  showing only the matching all-day rows', food.bandRows + ' row(s)')
                      : bad('all-day band shows matching rows', food.bandRows);

    const all = await pick('all');
    is('"All events" restores the strip', all.stripHidden, false);
    is('...and the band', all.bandHidden, false);
    await p.close();
  }

  // ---------------- 7. layout, all languages ----------------
  console.log('\n=== layout, three languages, four widths ===');
  {
    let clipped = 0;
    for (const w of [390, 768, 1024, 1440]) {
      for (const lang of LANGS) {
        const p = await open(browser, '', w);
        await p.evaluate(l => setLanguage(l), lang);
        await new Promise(r => setTimeout(r, 250));
        const r = await p.evaluate(() => {
          const W = innerWidth;
          const off = [...document.querySelectorAll('.timeline *')].filter(e => {
            const b = e.getBoundingClientRect();
            return b.width > 0 && (b.left < -1 || b.right > W + 1);
          }).map(e => e.className);
          return { off: off.slice(0, 3), docOver: document.documentElement.scrollWidth > W + 1 };
        });
        if (r.off.length || r.docOver) { clipped++; bad(`${w}px ${lang.toUpperCase()} clips`, r); }
        await p.close();
      }
    }
    if (!clipped) ok('nothing clips either edge at 390/768/1024/1440 in EN/FR/ES');
  }

  await browser.close();
  console.log('\n' + (fail === 0 ? `✅ all schedule checks passed (${pass})` : `❌ ${fail} failed, ${pass} passed`));
  process.exit(fail ? 1 : 0);
})();
