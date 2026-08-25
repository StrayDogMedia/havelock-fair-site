/* Covers the fairgrounds plan on pages/directions.html — the inline SVG, its
 * hotspots, the legend, the detail panel, and the link back from the schedule.
 *
 * ⚠️ Needs the site SERVED:
 *   cd ~/havelock-fair-site && python3 -m http.server 8765
 *   NODE_PATH=/path/to/node_modules node tools/verify-map.js
 *
 * THE POINT OF THIS FILE is check 1: every location resolves BOTH WAYS.
 * Place names live once, in js/map-data.js, and the schedule references pin
 * numbers (`venue: 10`) instead of repeating a name. That only stays true if
 * something asserts it — otherwise a renamed building or a deleted pin drifts
 * silently and the schedule sends someone to a barn that isn't there.
 */
const puppeteer = require('puppeteer-core');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.MAP_BASE || 'http://localhost:8765';
const URL = BASE + '/pages/directions.html';
const LANGS = ['en', 'fr', 'es'];

let pass = 0, fail = 0;
const ok = (m, x) => { pass++; console.log('  ✅ ' + m + (x !== undefined ? '  ' + x : '')); };
const bad = (m, got, want) => { fail++; console.log('  ❌ ' + m);
  if (got !== undefined) console.log('       got  ' + JSON.stringify(got));
  if (want !== undefined) console.log('       want ' + JSON.stringify(want)); };
const is = (m, g, w) => (JSON.stringify(g) === JSON.stringify(w) ? ok(m) : bad(m, g, w));

const open = async (b, q = '', w = 1440) => {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: 950 });
  await p.goto(URL + q, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));
  return p;
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] });

  // ---------- 1. referential integrity, both directions ----------
  console.log('\n=== every location resolves both ways ===');
  {
    const p = await open(browser);
    const r = await p.evaluate(() => {
      const ids = Object.keys(mapLocations).map(Number).sort((a, b) => a - b);
      const svgIds = [...document.querySelectorAll('.hf-pin')].map(g => +g.dataset.loc).sort((a, b) => a - b);
      const legendIds = [...document.querySelectorAll('.pl-legend-item')].map(b => +b.dataset.loc).sort((a, b) => a - b);
      const venues = [];
      for (const d of Object.keys(scheduleData))
        scheduleData[d].events.forEach(e => { if (e.venue) venues.push(e.venue); });
      return {
        named: ids,
        onPlan: svgIds,
        inLegend: legendIds,
        namedNotOnPlan: ids.filter(i => !svgIds.includes(i)),
        namedNotInLegend: ids.filter(i => !legendIds.includes(i)),
        planNotNamed: svgIds.filter(i => !ids.includes(i)),
        venuesWithNoLocation: [...new Set(venues)].filter(v => !ids.includes(v)),
        badCats: ids.filter(i => !mapCategories[mapLocations[i].cat]),
        noCoords: ids.filter(i => typeof mapLocations[i].x !== 'number' || typeof mapLocations[i].y !== 'number'),
        /* a pin at 103% is off the picture — easy to do by hand, invisible
           until someone looks */
        outside: ids.filter(i => { const l = mapLocations[i];
          return l.x < 2 || l.x > 98 || l.y < 2 || l.y > 98; }),
        missingLang: ids.filter(i => !['en', 'fr', 'es'].every(l => mapLocations[i][l]))
      };
    });
    is('every named location has a shape on the plan', r.namedNotOnPlan, []);
    is('every named location has a legend row', r.namedNotInLegend, []);
    is('every event venue points at a location that exists', r.venuesWithNoLocation, []);
    is('every location has a valid category', r.badCats, []);
    is('every location is named in all three languages', r.missingLang, []);
    /* The fair's own bilingual plan named all 17, including 16 (Barn) and the
       four the first draft omitted — 9, 11, 13, 14. Nothing may be unnamed. */
    is('no pin on the map is unnamed', r.planNotNamed, []);
    is('every location carries hotspot coordinates', r.noCoords, []);
    is('every hotspot sits within the artwork', r.outside, []);
    is('all seventeen locations are present', r.named.length, 17);
    /* Pin 1 is "Gate #2" and pin 2 is "Gate #1" on the fair's own plan. It
       looks like a transposition and it is not — it matches their signage. */
    const gates = await p.evaluate(() => ({ one: mapLocations[1].en, two: mapLocations[2].en }));
    /#2/.test(gates.one) && /#1/.test(gates.two)
      ? ok('the inverted gate numbering is preserved, as the fair has it', `1 = ${gates.one}, 2 = ${gates.two}`)
      : bad('gate numbering matches the fair plan', gates, '1 = Gate #2, 2 = Gate #1');
    ok('locations on the plan', r.onPlan.join(', '));
    await p.close();
  }

  // ---------- 2. selection + panel ----------
  console.log('\n=== selecting a location ===');
  {
    const p = await open(browser);
    const r = await p.evaluate(() => {
      document.querySelector('.hf-pin[data-loc="10"]').click();
      const panel = document.getElementById('plan-panel');
      return {
        planOn: [...document.querySelectorAll('.hf-pin.is-on')].map(g => g.dataset.loc),
        legendOn: [...document.querySelectorAll('.pl-legend-item.is-on')].map(b => b.dataset.loc),
        name: panel.querySelector('.pp-name').textContent,
        hash: location.hash
      };
    });
    is('the pin lights up', r.planOn, ['10']);
    is('  and so does its legend row', r.legendOn, ['10']);
    is('  panel names it', r.name, 'Horse Ring');
    is('  and the URL deep-links to it', r.hash, '#loc-10');

    const viaLegend = await p.evaluate(() => {
      document.querySelector('.pl-legend-item[data-loc="8"]').click();
      return { on: [...document.querySelectorAll('.hf-pin.is-on')].map(g => g.dataset.loc),
               name: document.querySelector('.pp-name').textContent };
    });
    is('selecting from the legend drives the plan', viaLegend.on, ['8']);
    is('  panel follows', viaLegend.name, 'Music Building');
    await p.close();
  }

  // ---------- 3. what's on here ----------
  console.log('\n=== "here today", read from the schedule ===');
  {
    const p = await open(browser, '?now=2026-09-13T12:00');
    const r = await p.evaluate(() => {
      document.querySelector('.hf-pin[data-loc="8"]').click();
      const items = [...document.querySelectorAll('.pp-events li')].map(li => li.textContent);
      const expected = scheduleData.sunday.events.filter(e => e.venue === 8).length;
      return { items, expected };
    });
    is('Sunday at the Music Building lists every act there', r.items.length, r.expected);
    /Durham County Poets/.test(r.items.join(' '))
      ? ok('  including Durham County Poets') : bad('Durham in the list', r.items);
    const empty = await p.evaluate(() => {
      document.querySelector('.hf-pin[data-loc="3"]').click();
      return document.querySelector('.pp-empty') ? document.querySelector('.pp-empty').textContent : null;
    });
    empty ? ok('a location with nothing on says so', JSON.stringify(empty.trim()))
          : bad('empty location explains itself', empty);
    await p.close();
  }

  // ---------- 4. keyboard ----------
  console.log('\n=== keyboard, not just tap ===');
  {
    const p = await open(browser);
    /* real <button>s now, so they are tab-reachable with no tabindex hack */
    const focusable = await p.evaluate(() =>
      [...document.querySelectorAll('.hf-pin')].every(b => b.tagName === 'BUTTON'));
    is('every pin is a real button, not a div with a click handler', focusable, true);

    await p.evaluate(() => document.querySelector('.hf-pin[data-loc="7"]').focus());
    await p.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 200));
    const afterEnter = await p.evaluate(() => ({
      on: [...document.querySelectorAll('.hf-pin.is-on')].map(g => g.dataset.loc),
      focusIsPanel: document.activeElement.id === 'plan-panel'
    }));
    is('Enter selects it', afterEnter.on, ['7']);
    is('  and moves focus to the panel', afterEnter.focusIsPanel, true);

    await p.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 200));
    const afterEsc = await p.evaluate(() => ({
      on: [...document.querySelectorAll('.hf-pin.is-on')].length,
      focusBack: document.activeElement.dataset ? document.activeElement.dataset.loc : null
    }));
    is('Escape clears the selection', afterEsc.on, 0);
    is('  and returns focus to the pin', afterEsc.focusBack, '7');
    await p.close();
  }

  // ---------- 5. three languages, no baked English ----------
  console.log('\n=== three languages ===');
  {
    const p = await open(browser);
    for (const lang of LANGS) {
      const r = await p.evaluate(l => {
        setLanguage(l);
        document.querySelector('.hf-pin[data-loc="10"]').click();
        return {
          name: document.querySelector('.pp-name').textContent,
          expect: mapLocations[10][l],
          legend: document.querySelector('.pl-legend-item[data-loc="10"] .pl-legend-name').textContent,
          aria: document.querySelector('.hf-pin[data-loc="10"]').getAttribute('aria-label'),
          today: document.querySelector('.pp-today').textContent
        };
      }, lang);
      is(`${lang.toUpperCase()} panel name`, r.name, r.expect);
      is(`  legend agrees`, r.legend, r.expect);
      r.aria && r.aria.includes(r.expect)
        ? ok(`  accessible name follows the language`, JSON.stringify(r.aria))
        : bad(`${lang} aria-label`, r.aria, 'contains ' + r.expect);
      if (lang !== 'en') {
        /Here today/i.test(r.today) ? bad(`${lang}: "Here today" left in English`, r.today)
                                    : ok(`  panel chrome translated too`, JSON.stringify(r.today));
      }
    }
    await p.close();
  }

  // ---------- 6. the loop back from the schedule ----------
  console.log('\n=== schedule → map ===');
  {
    const p = await browser.newPage();
    await p.setViewport({ width: 1440, height: 950 });
    await p.goto(BASE + '/pages/schedule.html', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 700));
    const links = await p.evaluate(() => {
      const a = [...document.querySelectorAll('a.ev-venue')];
      const l = (() => { try { return currentLang || 'en'; } catch (e) { return 'en'; } })();
      /* whatever language the page is in, the link text must equal the name
         mapLocations holds for the pin it points at — never a copy of it */
      const mismatched = a.filter(x => {
        const id = +x.getAttribute('href').split('#loc-')[1];
        const loc = mapLocations[id];
        return !loc || x.textContent !== (loc[l] || loc.en);
      }).map(x => x.textContent);
      return { n: a.length, lang: l, mismatched,
               hrefs: [...new Set(a.map(x => x.getAttribute('href')))] };
    });
    links.n > 0 ? ok('venues on the schedule are links', links.n + ' rows') : bad('venue links exist', links.n);
    is('  pointing at map pins', links.hrefs.every(h => /^directions\.html#loc-\d+$/.test(h)), true);
    is('  every label matches mapLocations exactly (' + links.lang.toUpperCase() + ')', links.mismatched, []);
    await p.close();

    const q = await open(browser, '#loc-10');
    /* language persists in localStorage across pages, so assert against
       mapLocations in whatever language is live rather than hardcoding EN */
    const deep = await q.evaluate(() => {
      const l = (() => { try { return currentLang || 'en'; } catch (e) { return 'en'; } })();
      const el = document.querySelector('.pp-name');
      return { on: [...document.querySelectorAll('.hf-pin.is-on')].map(g => g.dataset.loc),
               name: el ? el.textContent : null, expect: mapLocations[10][l], lang: l };
    });
    is('arriving at #loc-10 selects it', deep.on, ['10']);
    is('  and shows its panel (' + deep.lang.toUpperCase() + ')', deep.name, deep.expect);
    await q.close();
  }

  // ---------- 6b. contrast, measured on rendered pixels ----------
  console.log('\n=== contrast on the IVORY ground ===');
  {
    /* The plan sits in an .hf-sec--ivory section. The first build styled this
       column for a dark ground and shipped cream-on-cream — every location
       name invisible, while all 43 assertions above passed, because they check
       text and not colour. This is that check. */
    const p = await open(browser);
    await p.evaluate(() => document.querySelector('.hf-pin[data-loc="10"]').click());
    await new Promise(r => setTimeout(r, 250));
    const r = await p.evaluate(() => {
      const px = c => { const m = c.match(/[\d.]+/g).map(Number); return m.length > 3 ? m : [...m, 1]; };
      const flat = (f, b) => { const [r, g, bl, a] = f; return [r * a + b[0] * (1 - a), g * a + b[1] * (1 - a), bl * a + b[2] * (1 - a)]; };
      const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return +(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2)); };
      const ground = el => { for (let n = el; n; n = n.parentElement) {
        const c = px(getComputedStyle(n).backgroundColor); if (c[3] > 0.99) return c.slice(0, 3); }
        return px(getComputedStyle(document.body).backgroundColor).slice(0, 3); };
      const of = sel => { const el = document.querySelector(sel); if (!el) return null;
        const g = ground(el); return ratio(flat(px(getComputedStyle(el).color), g), g); };
      const out = { name: of('.pp-name'), cat: of('.pp-cat'), today: of('.pp-today'),
                    time: of('.pp-t'), event: of('.pp-events li span:last-child'), hint: of('.hf-plan-hint') };
      out.legendNames = [...document.querySelectorAll('.pl-legend-name')].map(e => {
        const g = ground(e); return ratio(flat(px(getComputedStyle(e).color), g), g); });
      out.legendHeads = [...document.querySelectorAll('.pl-legend-h')].map(e => {
        const g = ground(e); return ratio(flat(px(getComputedStyle(e).color), g), g); });
      return out;
    });
    const need = (label, v, min) => v >= min ? ok(label, `${v}:1`) : bad(label, `${v}:1`, `>= ${min}:1`);
    need('location name in the panel', r.name, 4.5);
    need('category label', r.cat, 4.5);
    need('"here today" heading', r.today, 4.5);
    need('event time', r.time, 4.5);
    need('event title', r.event, 4.5);
    need('the hint above the panel', r.hint, 4.5);
    const worstName = Math.min(...r.legendNames);
    const worstHead = Math.min(...r.legendHeads);
    need(`every legend name (worst of ${r.legendNames.length})`, worstName, 4.5);
    need(`every category heading (worst of ${r.legendHeads.length})`, worstHead, 4.5);
    await p.close();
  }

  // ---------- 6c. zoom ----------
  console.log('\n=== zoom, which is how crowded pins get separated now ===');
  {
    const p = await open(browser, '', 390);
    const start = await p.evaluate(() => {
      const f = document.getElementById('map-wrap');
      return { side: Math.max(0, f.scrollWidth - f.clientWidth),
               t: getComputedStyle(document.getElementById('map-view')).transform };
    });
    is('fits the frame at 390px with no sideways scroll', start.side, 0);
    is('  and starts unzoomed', start.t === 'none' || /matrix\(1,\s*0,\s*0,\s*1/.test(start.t), true);

    await p.evaluate(() => document.querySelector('[data-zoom="in"]').click());
    /* .hf-pin transitions its transform over 0.18s — reading the computed
       style straight after the click catches it mid-flight and reports the
       pre-scale size. Let it land. */
    await new Promise(r => setTimeout(r, 350));
    const zoomed = await p.evaluate(() => {
      const pin = document.querySelector('.hf-pin').getBoundingClientRect();
      const frame = document.getElementById('map-wrap');
      return { t: getComputedStyle(document.getElementById('map-view')).transform,
               pinW: +pin.width.toFixed(1),
               /* overflow:hidden means the frame CANNOT be scrolled, so
                  scrollWidth is not the question — whether it is clipped is */
               clipped: getComputedStyle(frame).overflowX };
    });
    /matrix\(1\.6/.test(zoomed.t) ? ok('zoom in scales the map', zoomed.t)
                                  : bad('zoom in scales the map', zoomed.t, 'scale 1.6');
    /* the pin counter-scales, so zooming must NOT inflate the touch target
       away from its designed size */
    zoomed.pinW >= 24 && zoomed.pinW <= 34
      ? ok('  pins keep their real size while zoomed', zoomed.pinW + 'px')
      : bad('pin size while zoomed', zoomed.pinW + 'px', '24-34px');
    is('  and the overflow stays clipped, never scrollable', zoomed.clipped, 'hidden');

    await p.evaluate(() => document.querySelector('[data-zoom="reset"]').click());
    await new Promise(r => setTimeout(r, 350));
    const reset = await p.evaluate(() => {
      const t = getComputedStyle(document.getElementById('map-view')).transform;
      return t === 'none' || /matrix\(1,\s*0,\s*0,\s*1/.test(t);
    });
    is('reset returns to fit', reset, true);

    await p.evaluate(() => { for (let i = 0; i < 6; i++) document.querySelector('[data-zoom="out"]').click(); });
    await new Promise(r => setTimeout(r, 350));
    const floor = await p.evaluate(() => {
      const t = getComputedStyle(document.getElementById('map-view')).transform;
      return t === 'none' || /matrix\(1,\s*0,\s*0,\s*1/.test(t);
    });
    is('zooming out never shrinks below fit', floor, true);
    await p.close();
  }

  // ---------- 7. layout ----------
  console.log('\n=== layout, three languages, three widths ===');
  {
    let problems = 0;
    for (const w of [390, 768, 1440]) {
      for (const lang of LANGS) {
        const p = await open(browser, '', w);
        await p.evaluate(l => setLanguage(l), lang);
        await new Promise(r => setTimeout(r, 250));
        const r = await p.evaluate(() => {
          const W = innerWidth;
          /* Pins are deliberately NOT in this sweep: below 820px the stage
           scrolls, so pins past the fold are correct, not clipped. Their
           containment is checked against the ARTWORK in the referential
           section instead (x/y must be 2-98%). */
        const off = [...document.querySelectorAll('.hf-plan-side *, .hf-plan-stage')].filter(e => {
            const b = e.getBoundingClientRect();
            return b.width > 0 && (b.left < -1 || b.right > W + 1);
          }).map(e => (e.className.baseVal !== undefined ? e.className.baseVal : e.className));
          const svgEl = document.querySelector('.hf-map-art');
          const svg = svgEl.getBoundingClientRect();
          /* pins are fixed-size HTML over a fluid image: check they are still
             a real touch target and the numeral is legible at every width */
          const t = document.querySelector('.hf-pin');
          const pinPx = t ? +(t.getBoundingClientRect().width).toFixed(1) : 0;
          /* two pins on top of each other are two pins you cannot tap apart */
          const boxes = [...document.querySelectorAll('.hf-pin')].map(b => b.getBoundingClientRect());
          let collisions = 0;
          for (let i = 0; i < boxes.length; i++)
            for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i], b = boxes[j];
              const ov = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
                         Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
              /* 8%, not 35%: pins 1 and 3 overlapped visibly at 390px and
                 the looser threshold waved them through */
              if (ov > a.width * a.height * 0.08) collisions++;
            }
          /* THE COMPLAINT THIS FIXES: the map used to be forced wider than
             its frame, so a phone had to scroll sideways to see it. */
          const frame = document.getElementById('map-wrap');
          const sideScroll = Math.max(0, frame.scrollWidth - frame.clientWidth);
          return { off: off.slice(0, 3), docOver: document.documentElement.scrollWidth > W + 1,
                   svgW: Math.round(svg.width), svgH: Math.round(svg.height), pinPx, collisions, sideScroll };
        });
        if (r.off.length || r.docOver) { problems++; bad(`${w}px ${lang.toUpperCase()}`, r); }
        else if (lang === 'en') {
          /* a pin number rendered at ~4px is on the page but not readable */
          if (r.pinPx < 24) { problems++; bad(`${w}px pin target size`, r.pinPx + 'px', '>= 24px'); }
          else if (r.sideScroll) { problems++; bad(`${w}px map must fit its frame`, r.sideScroll + 'px of overflow', 'none'); }
          else if (r.collisions > 0) { problems++; bad(`${w}px pins overlap at default zoom`, r.collisions + ' pair(s)', '0'); }
          else ok(`${w}px map fits`, `${r.svgW}x${r.svgH}, pins ${r.pinPx}px, ${r.collisions} overlapping pair(s)`);
        }
        await p.close();
      }
    }
    if (!problems) ok('nothing clips either edge, any width, any language');
  }

  await browser.close();
  console.log('\n' + (fail === 0 ? `✅ all map checks passed (${pass})` : `❌ ${fail} failed, ${pass} passed`));
  process.exit(fail ? 1 : 0);
})();
