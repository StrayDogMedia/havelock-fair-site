/* Covers the shared chrome: menu prominence, the language toggle, and the
   localized wordmark, across every page and all three languages.
 *
 * ⚠️ Serve the site first — NEVER file://. An opaque origin makes
 * localStorage throw, and a page that cannot read it renders untranslated,
 * which looks exactly like a bug in the code under test.
 *
 *   cd ~/havelock-fair-site && python3 -m http.server 8765
 *   NODE_PATH=/path/to/node_modules node tools/verify-chrome.js
 *
 * The two i18n layers are deliberately different and must not be crossed:
 * the 7 interior pages + the homepage use setLanguage() from js/i18n.js;
 * pages/registration.html has its own inline setLang(). This harness drives
 * whichever one the page actually ships.
 */
const { JSDOM } = require('jsdom');

const BASE = process.env.HF_BASE || 'http://localhost:8765';
const PAGES = [
  { url: '/index.html',              nav: 'home',         home: true },
  { url: '/pages/schedule.html',     nav: 'schedule' },
  { url: '/pages/music.html',        nav: 'music' },
  { url: '/pages/directions.html',   nav: 'directions' },
  { url: '/pages/about.html',        nav: 'about' },
  { url: '/pages/gallery.html',      nav: 'gallery' },
  { url: '/pages/contact.html',      nav: 'contact' },
  { url: '/pages/sponsors.html',     nav: 'sponsors' },
  { url: '/pages/registration.html', nav: 'registration', ownI18n: true }
];

const BRAND = { en: 'Havelock Fair', fr: 'Foire Havelock', es: 'Feria de Havelock' };

let pass = 0, fail = 0;
const ok  = (m, extra) => { pass++; console.log('  ✅ ' + m + (extra ? '  ' + extra : '')); };
const bad = (m, got, want) => {
  fail++;
  console.log('  ❌ ' + m);
  if (got !== undefined)  console.log('       got  ' + JSON.stringify(got));
  if (want !== undefined) console.log('       want ' + JSON.stringify(want));
};
const is = (m, got, want) => (got === want ? ok(m) : bad(m, got, want));

async function load(url) {
  const dom = await JSDOM.fromURL(BASE + url, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true
  });
  await new Promise(r => {
    if (dom.window.document.readyState === 'complete') return r();
    dom.window.addEventListener('load', r);
  });
  await new Promise(r => setTimeout(r, 120));
  return dom;
}

const setLang = (w, lang) => {
  if (typeof w.setLanguage === 'function') w.setLanguage(lang);
  else if (typeof w.setLang === 'function') w.setLang(lang);
  else throw new Error('no language switcher on this page');
};

const txt = el => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);

(async () => {
  for (const page of PAGES) {
    console.log('\n=== ' + page.url + ' ===');
    let dom;
    try { dom = await load(page.url); }
    catch (e) { bad('page loads', e.message); continue; }
    const { window: w } = dom;
    const d = w.document;

    // ---- the menu is present and reachable ------------------------------
    const header = d.getElementById('hf-header');
    header ? ok('header present with #hf-header') : bad('header present with #hf-header');

    const nav = d.querySelector('.hf-header .hf-nav');
    const navCount = nav ? nav.querySelectorAll('a').length : 0;
    navCount >= 6 && navCount <= 8
      ? ok('desktop nav has a workable item count', '(' + navCount + ')')
      : bad('desktop nav item count 6-8', navCount);

    const drawer = d.querySelector('.hf-mobile-menu .hf-mobile-nav');
    const drawerCount = drawer ? drawer.querySelectorAll('a').length : 0;
    drawerCount >= navCount
      ? ok('drawer carries at least the desktop set', '(' + drawerCount + ')')
      : bad('drawer >= desktop nav', drawerCount, '>= ' + navCount);

    // Sponsors and Registration leave the top bar but must stay reachable.
    const shell = d.querySelector('.hf-mobile-menu');
    const drawerHrefs = shell ? [...shell.querySelectorAll('a')].map(a => a.getAttribute('href')) : [];
    drawerHrefs.some(h => /sponsors\.html/.test(h))
      ? ok('Sponsors still reachable from the drawer') : bad('Sponsors in drawer', drawerHrefs);
    drawerHrefs.some(h => /registration\.html/.test(h))
      ? ok('Registration still reachable from the drawer (as its gold CTA)')
      : bad('Registration in drawer', drawerHrefs);
    const drawerCta = shell && shell.querySelector('.hf-mobile-foot .hf-tickets');
    drawerCta ? ok('drawer carries the Register CTA') : bad('drawer carries the Register CTA');

    // ---- THE REGRESSION THAT STARTED THIS -------------------------------
    // .hf-lang used to live inside .hf-nav-side, which is display:none in the
    // collapsed layout — that is how the toggle vanished on every phone.
    const lang = d.querySelector('.hf-header .hf-lang');
    lang ? ok('language toggle is in the header') : bad('language toggle is in the header');
    if (lang) {
      is('toggle is a direct child of <header>, NOT inside .hf-nav-side',
        lang.parentElement === header, true);
      is('toggle offers three languages', lang.querySelectorAll('.lang-btn').length, 3);
      const codes = [...lang.querySelectorAll('.lang-btn')]
        .map(b => b.dataset.lang || (b.getAttribute('onclick') || '').match(/'(\w+)'/)?.[1]);
      is('toggle order EN/FR/ES', codes.join(','), 'en,fr,es');
    }

    const skip = d.querySelector('.hf-skip');
    skip ? ok('skip link present') : bad('skip link present');
    if (skip) {
      const target = d.querySelector(skip.getAttribute('href'));
      target ? ok('skip link resolves to a real target') : bad('skip target exists', skip.getAttribute('href'));
    }

    // ---- sticky: the bar must come back once the hero is behind us ------
    if (header) {
      is('bar starts transparent at the top', header.classList.contains('is-stuck'), false);
      Object.defineProperty(w, 'scrollY', { value: 900, configurable: true });
      w.dispatchEvent(new w.Event('scroll'));
      await new Promise(r => w.requestAnimationFrame(() => setTimeout(r, 30)));
      is('bar goes opaque after scrolling past the hero',
        header.classList.contains('is-stuck'), true);
    }

    // ---- the wordmark localizes -----------------------------------------
    for (const code of ['en', 'fr', 'es']) {
      setLang(w, code);
      const brand = d.querySelector('.hf-header .hf-brand');
      is('brand in ' + code.toUpperCase(), txt(brand), BRAND[code]);

      const active = [...d.querySelectorAll('.hf-header .lang-btn')].filter(b => b.classList.contains('active'));
      is('exactly one lang button lit in ' + code.toUpperCase(), active.length, 1);
      if (active.length === 1) {
        const lit = active[0].dataset.lang || (active[0].getAttribute('onclick') || '').match(/'(\w+)'/)?.[1];
        is('  and it is the ' + code.toUpperCase() + ' button', lit, code);
        is('  aria-pressed set', active[0].getAttribute('aria-pressed'), 'true');
      }
      is('<html lang> follows the toggle', d.documentElement.lang, code);
    }

    // ---- homepage-only: the first screen has to be actionable ------------
    if (page.home) {
      for (const code of ['en', 'fr', 'es']) {
        setLang(w, code);
        // the wordmark is split over two lines by <br>, which textContent drops
        const h1el = d.querySelector('.hf-h1');
        const h1 = [...h1el.childNodes]
          .map(n => (n.nodeName === 'BR' ? ' ' : n.textContent))
          .join('').replace(/\s+/g, ' ').trim();
        is('hero <h1> reads the localized name in ' + code.toUpperCase(), h1, BRAND[code]);
      }
      setLang(w, 'en');
      const ctas = d.querySelectorAll('.hf-hero-cta a');
      is('hero has an action row', ctas.length, 3);
      const hrefs = [...ctas].map(a => a.getAttribute('href'));
      ['schedule.html', 'registration.html', 'directions.html'].forEach(t => {
        hrefs.some(h => h.includes(t))
          ? ok('hero CTA → ' + t) : bad('hero CTA → ' + t, hrefs);
      });
      setLang(w, 'fr');
      const frCtas = [...d.querySelectorAll('.hf-hero-cta a')].map(a => txt(a));
      frCtas.every(t => t && !/^(View Schedule|Enter a Class|Get Directions)$/.test(t))
        ? ok('hero CTAs translate', JSON.stringify(frCtas)) : bad('hero CTAs translate', frCtas);
    }

    // ---- the button no longer promises tickets it cannot sell ------------
    const tickets = d.querySelector('.hf-tickets');
    if (tickets) {
      setLang(w, 'en');
      const label = txt(d.querySelector('.hf-tickets'));
      /ticket/i.test(label)
        ? bad('gold button must not say "Tickets" (it links to the entry form)', label)
        : ok('gold button label matches its destination', JSON.stringify(label));
    }

    // ---- registration: the silent Spanish failure ------------------------
    if (page.ownI18n) {
      setLang(w, 'es');
      const notice = d.getElementById('es-form-notice');
      notice ? ok('Spanish explainer exists') : bad('Spanish explainer exists');
      if (notice) {
        is('  visible in ES', notice.hidden, false);
        setLang(w, 'en'); is('  hidden in EN', notice.hidden, true);
        setLang(w, 'fr'); is('  hidden in FR', notice.hidden, true);
      }
      // The exact path that used to fail: choose ES elsewhere, arrive here.
      const dom2 = await JSDOM.fromURL(BASE + '/pages/registration.html', {
        runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
        beforeParse(win) { try { win.localStorage.setItem('hf-lang', 'es'); } catch (e) {} }
      });
      await new Promise(r => dom2.window.addEventListener('load', r));
      await new Promise(r => setTimeout(r, 120));
      const d2 = dom2.window.document;
      is('arriving with hf-lang=es lights the ES button',
        d2.querySelector('.hf-header .lang-btn.active')?.getAttribute('onclick'), "setLang('es')");
      is('arriving with hf-lang=es shows the explainer',
        d2.getElementById('es-form-notice')?.hidden, false);
      is('arriving with hf-lang=es sets <html lang>', d2.documentElement.lang, 'es');
      dom2.window.close();
    }

    w.close();
  }

  console.log('\n' + (fail === 0
    ? '✅ all chrome checks passed (' + pass + ')'
    : '❌ ' + fail + ' failed, ' + pass + ' passed'));
  process.exit(fail === 0 ? 0 : 1);
})();
