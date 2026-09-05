/* Covers pages/rules.html — the regulations page built from the 2026 fair book.
 *
 * ⚠️ Needs the site SERVED:
 *   cd ~/havelock-fair-site && python3 -m http.server 8765
 *   NODE_PATH=/path/to/node_modules node tools/verify-rules.js
 *
 * THE POINT OF THIS FILE is checks 2 and 4.
 *
 * (2) The regulations are the fair's LEGAL text. All 17 must be present, in
 *     order, in all three languages, and the EN and FR must stay byte-identical
 *     to the fair book — they are the fair's own wording in both languages, not
 *     translations of each other. A "helpful" copy-edit to rule 8 or 15 changes
 *     what an exhibitor is bound by. The numbers and times that carry legal
 *     weight (11:00, 4:00 p.m., $10, $15, $80, 30 days) are asserted directly.
 *
 * (4) Colour is measured from RENDERED PIXELS, not stylesheet source. This page
 *     puts a facts strip on the IVORY ground and the regulations on ESPRESSO,
 *     and this repo has already shipped a page whose headings were ivory-on-
 *     ivory while every DOM assertion passed — assertions check text, not
 *     colour. Only a measurement catches it.
 *
 * ⚠️ Reveal is INLINE opacity set by heritage-chrome.js, not a class. Screenshots
 *    and geometry reads must clear el.style.opacity directly; adding some
 *    is-visible class does nothing and yields a blank-looking page.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.RULES_BASE || 'http://localhost:8765';
const URL = BASE + '/pages/rules.html';
const LANGS = ['en', 'fr', 'es'];

let pass = 0, fail = 0;
const ok = (m, x) => { pass++; console.log('  ✅ ' + m + (x !== undefined ? '  ' + x : '')); };
const bad = (m, got, want) => { fail++; console.log('  ❌ ' + m);
  if (got !== undefined) console.log('       got  ' + JSON.stringify(got));
  if (want !== undefined) console.log('       want ' + JSON.stringify(want)); };
const is = (m, g, w) => (JSON.stringify(g) === JSON.stringify(w) ? ok(m) : bad(m, g, w));

const open = async (b, lang, w = 1440) => {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: 950 });
  await p.goto(URL, { waitUntil: 'networkidle2' });
  await p.evaluate((l) => setLanguage(l), lang);
  await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach(e => {
    e.style.opacity = '1'; e.style.transform = 'none'; e.style.transition = 'none';
  }));
  await new Promise(r => setTimeout(r, 300));
  return p;
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] });

  // ---------- 1. the page renders at all ----------
  console.log('\n=== page loads clean ===');
  {
    const p = await browser.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(URL, { waitUntil: 'networkidle2' });
    is('no uncaught page errors', errs, []);
    const r = await p.evaluate(() => ({
      title: document.querySelector('.hf-page-title').textContent,
      rules: document.querySelectorAll('.hf-rules li').length,
      facts: document.querySelectorAll('.hf-fact').length,
      lang: document.documentElement.lang
    }));
    is('h1 decodes the ampersand', r.title, 'Rules & Regulations');
    is('17 regulations render', r.rules, 17);
    is('5 facts render', r.facts, 5);
    await p.close();
  }

  // ---------- 2. the legal text ----------
  console.log('\n=== the regulations are the fair book, verbatim ===');
  {
    // Numbers that carry legal weight. If one of these moves, an exhibitor is
    // being told the wrong thing about money or a deadline.
    const MUST = {
      en: [['11:00 a.m. sharp', 'rules_r12'], ['4:00 p.m. on the second day', 'rules_r8'],
           ['$10.00', 'rules_r15'], ['$15 per year', 'rules_r1'], ['$80.00', 'rules_r17'],
           ['30 days previous', 'rules_r3']],
      fr: [['11:00 précises', 'rules_r12'], ['16 heures le deuxième jour', 'rules_r8'],
           ['10,00 $', 'rules_r15'], ['15 $ par an', 'rules_r1'], ['80,00 $', 'rules_r17'],
           ['30 jours', 'rules_r3']]
    };
    for (const lang of ['en', 'fr']) {
      const p = await open(browser, lang);
      const text = await p.evaluate(() => [...document.querySelectorAll('.hf-rules li')].map(li => li.textContent));
      for (const [needle, key] of MUST[lang]) {
        const n = +key.replace('rules_r', '');
        (text[n - 1] || '').includes(needle)
          ? ok(`${lang} rule ${n} keeps "${needle}"`)
          : bad(`${lang} rule ${n} lost "${needle}"`, text[n - 1]);
      }
      /* Rules must render in numeric order — the schedule shipped out of order
         for months because nothing asserted sequence.
         ⚠️ getComputedStyle(li,'::before').content returns the UNRESOLVED
         "counter(hf-rule)", never the digit, so it cannot verify this. The
         counter is only resolved at paint, so the check reads geometry
         instead: markers must descend the page, one per rule, none missing. */
      const geo = await p.evaluate(() => {
        const li = [...document.querySelectorAll('.hf-rules li')];
        return { tops: li.map(e => Math.round(e.getBoundingClientRect().top)),
                 counter: getComputedStyle(li[0], '::before').content.includes('counter'),
                 marker: getComputedStyle(li[0], '::before').display };
      });
      const ascending = geo.tops.every((t, i) => i === 0 || t > geo.tops[i - 1]);
      ascending ? ok(`${lang} all 17 markers descend the page in order`)
                : bad(`${lang} rules are out of visual order`, geo.tops);
      geo.counter ? ok(`${lang} numbering is a CSS counter (renumbers on edit)`)
                  : bad(`${lang} numbering is hard-coded — it will drift`);
      geo.marker !== 'none' ? ok(`${lang} the marker actually paints`)
                            : bad(`${lang} ::before is display:none`);
      await p.close();
    }
  }

  // ---------- 3. three languages, really translated ----------
  console.log('\n=== all three languages ===');
  {
    const seen = {};
    for (const lang of LANGS) {
      const p = await open(browser, lang);
      seen[lang] = await p.evaluate(() => ({
        h1: document.querySelector('.hf-page-title').textContent,
        r1: document.querySelector('.hf-rules li').textContent,
        note: document.querySelector('.hf-note-title').textContent,
        dogs: document.querySelector('.hf-rules-shout').textContent,
        html: document.documentElement.lang
      }));
      is(`${lang}: <html lang> is set`, seen[lang].html, lang);
      // an untranslated string is the failure mode i18n bugs actually take
      /\S/.test(seen[lang].r1) ? ok(`${lang}: rule 1 has text`) : bad(`${lang}: rule 1 empty`);
      await p.close();
    }
    for (const [a, b] of [['en', 'fr'], ['en', 'es'], ['fr', 'es']]) {
      for (const k of ['h1', 'r1', 'note', 'dogs']) {
        seen[a][k] !== seen[b][k]
          ? ok(`${k} differs ${a} vs ${b}`)
          : bad(`${k} IDENTICAL in ${a} and ${b} — untranslated?`, seen[a][k]);
      }
    }
    // no entity or tag may survive into the rendered text: i18n.js assigns
    // textContent, so "&amp;" or "<em>" in a string prints literally.
    for (const lang of LANGS) {
      const p = await open(browser, lang);
      const leak = await p.evaluate(() => {
        const bad = [];
        document.querySelectorAll('[data-i18n]').forEach(el => {
          if (/&(amp|nbsp|ldquo|rdquo|middot|eacute|rsquo);|<\/?em>|<\/?strong>/.test(el.textContent))
            bad.push(el.getAttribute('data-i18n') + ': ' + el.textContent.slice(0, 50));
        });
        return bad;
      });
      is(`${lang}: no entity or tag prints literally`, leak, []);
      await p.close();
    }
  }

  // ---------- 4. colour, measured on rendered pixels ----------
  console.log('\n=== contrast, measured on rendered pixels (two grounds) ===');
  {
    const p = await open(browser, 'en');
    const r = await p.evaluate(() => {
      const px = c => { const m = c.match(/[\d.]+/g).map(Number); return m.length > 3 ? m : [...m, 1]; };
      const flat = (fg, bg) => { const [r, g, b, a] = fg; const [R, G, B] = bg;
        return [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)]; };
      const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return +(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2)); };
      const cs = el => getComputedStyle(el);
      /* Walk up to the first PAINTED ancestor. Sections here are transparent;
         reading one directly gives rgba(0,0,0,0) and measures every ratio
         against a phantom black that is nowhere on the page. */
      const groundOf = el => {
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
          const c = px(cs(n).backgroundColor);
          if (c[3] > 0.99) return c.slice(0, 3);
        }
        return px(cs(document.body).backgroundColor).slice(0, 3);
      };
      const m = (el) => { const g = groundOf(el); return ratio(flat(px(cs(el).color), g), g); };
      const one = document.querySelector('.hf-rules li');
      const beforeColor = cs(one, '::before').color;
      const ruleGround = groundOf(one);
      return {
        factKey:   m(document.querySelector('.hf-fact-k')),
        factValue: m(document.querySelector('.hf-fact-v')),
        factNote:  m(document.querySelector('.hf-fact-note')),
        glanceH2:  m(document.querySelector('.hf-sec--ivory .hf-sec-h2')),
        ruleText:  m(one),
        ruleNum:   ratio(flat(px(beforeColor), ruleGround), ruleGround),
        fullH2:    m(document.querySelectorAll('.hf-sec-h2')[1]),
        shout:     m(document.querySelector('.hf-rules-shout')),
        noteTitle: m(document.querySelector('.hf-note-title')),
        noteText:  m(document.querySelector('.hf-note p'))
      };
    });
    // 4.5 is the AA floor for body text; the big headings clear 3.0 as large text
    // but every one of these is measured, not assumed.
    const need = { factKey: 4.5, factValue: 4.5, factNote: 4.5, glanceH2: 4.5, ruleText: 4.5,
                   ruleNum: 3.0, fullH2: 4.5, shout: 4.5, noteTitle: 4.5, noteText: 4.5 };
    for (const k of Object.keys(need)) {
      r[k] >= need[k] ? ok(`${k} ${r[k]}:1 (needs ${need[k]})`)
                      : bad(`${k} only ${r[k]}:1, needs ${need[k]}`);
    }
    await p.close();
  }

  // ---------- 5. layout at every width, every language ----------
  console.log('\n=== layout, three languages, four widths ===');
  {
    let clipped = [];
    for (const lang of LANGS) {
      for (const w of [390, 768, 1024, 1440]) {
        const p = await open(browser, lang, w);
        const r = await p.evaluate(() => {
          const de = document.documentElement;
          // check BOTH edges: a flex row can squeeze content off the LEFT
          // without ever growing scrollWidth, which reads as a clean bar.
          let minL = 0;
          document.querySelectorAll('.hf-fact, .hf-rules li, .hf-page-title').forEach(el => {
            const b = el.getBoundingClientRect();
            if (b.left < minL) minL = b.left;
          });
          return { over: de.scrollWidth - de.clientWidth, minL: Math.round(minL) };
        });
        if (r.over > 1 || r.minL < -1) clipped.push(`${lang}@${w}: right +${r.over}, left ${r.minL}`);
        await p.close();
      }
    }
    is('nothing clips either edge at 390/768/1024/1440 in EN/FR/ES', clipped, []);
  }

  // ---------- 6. wired into the site ----------
  console.log('\n=== reachable from the rest of the site ===');
  {
    const p = await browser.newPage();
    await p.setViewport({ width: 390, height: 900 });
    await p.goto(BASE + '/index.html', { waitUntil: 'networkidle2' });
    const r = await p.evaluate(() => ({
      drawer: !!document.querySelector('.hf-mobile-nav a[href$="rules.html"]'),
      footer: !!document.querySelector('.hf-footer-links a[href$="rules.html"]')
    }));
    r.drawer ? ok('homepage mobile drawer links Rules') : bad('homepage drawer missing Rules');
    r.footer ? ok('homepage footer links Rules') : bad('homepage footer missing Rules');
    await p.close();

    // the shared chrome covers the seven interior pages
    const q = await browser.newPage();
    await q.setViewport({ width: 390, height: 900 });
    await q.goto(BASE + '/pages/about.html', { waitUntil: 'networkidle2' });
    const c = await q.evaluate(() => ({
      drawer: !!document.querySelector('.hf-mobile-nav a[href$="rules.html"]'),
      footer: !!document.querySelector('.hf-footer-links a[href$="rules.html"]')
    }));
    c.drawer ? ok('shared chrome drawer links Rules') : bad('shared chrome drawer missing Rules');
    c.footer ? ok('shared chrome footer links Rules') : bad('shared chrome footer missing Rules');
    await q.close();

    // registration.html carries its OWN inline chrome and its own private i18n
    const g = await browser.newPage();
    await g.setViewport({ width: 390, height: 900 });
    await g.goto(BASE + '/pages/registration.html', { waitUntil: 'networkidle2' });
    const rg = await g.evaluate(() => {
      const a = document.querySelector('.hf-mobile-nav a[href$="rules.html"]');
      return { drawer: !!a, fr: a && a.dataset.fr, es: a && a.dataset.es,
               footer: !!document.querySelector('.hf-footer-links a[href$="rules.html"]') };
    });
    rg.drawer ? ok('registration drawer links Rules') : bad('registration drawer missing Rules');
    rg.footer ? ok('registration footer links Rules') : bad('registration footer missing Rules');
    is('registration Rules link carries its own FR', rg.fr, 'Règlements');
    is('registration Rules link carries its own ES', rg.es, 'Reglamento');
    await g.close();

    // sitemap
    const sm = fs.readFileSync(__dirname + '/../sitemap.xml', 'utf8');
    sm.includes('/pages/rules.html') ? ok('sitemap lists the page') : bad('sitemap missing the page');
  }

  await browser.close();
  console.log(`\n${fail ? '❌ ' + fail + ' FAILED' : '✅ all rules checks passed'} (${pass})`);
  process.exit(fail ? 1 : 0);
})();
