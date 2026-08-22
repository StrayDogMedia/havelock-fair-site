/* Registration page regression harness.
   Loads a registration.html, stubs fetch, drives a REAL submit
   (1 Livestock entry + 1 Home & Garden entry + full contact block)
   and returns the exact POST url/headers/body the page would send.
   Used to prove an edit to registration.html is display-only:
   run against the modified page and the pristine one, byte-compare. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function drive(file) {
  return new Promise((resolve, reject) => {
    const html = fs.readFileSync(file, 'utf8');
    const captured = {};

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'https://havelockfair.ca/pages/registration.html',
      beforeParse(w) {
        w.alert = (m) => { captured.alert = String(m); };
        w.scrollTo = () => {};
        w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener(){}, removeListener(){} }));
        w.fetch = (url, opts) => {
          captured.url = url;
          captured.headers = JSON.parse(JSON.stringify(opts.headers));
          captured.method = opts.method;
          captured.body = opts.body;
          return Promise.resolve({
            json: () => Promise.resolve({ result: 'success', exhibitorId: 'HF2026-TEST', emailSent: true })
          });
        };
        w.print = () => {};
      }
    });

    const w = dom.window, d = w.document;
    const done = () => {
      try {
        // scrollIntoView isn't implemented in jsdom
        w.Element.prototype.scrollIntoView = function () {};

        // --- entry 1: Livestock, Class 3 (Dairy Cattle: has breeds + animal fields)
        w.addEntry('livestock');
        let card = d.querySelector('#entries-livestock .entry-card');
        let id = card.id.replace('entry-', '');
        let sel = card.querySelector(`[name="entry_${id}_class"]`);
        sel.value = '3';
        sel.dispatchEvent(new w.Event('change', { bubbles: true }));
        w.onClassChange(Number(id));
        const breeds = card.querySelectorAll(`[name="entry_${id}_breed[]"]`);
        if (breeds.length) breeds[1].checked = true;            // B. Holstein
        const secs = card.querySelectorAll(`[name="entry_${id}_section[]"]`);
        secs[0].checked = true; secs[4].checked = true;
        card.querySelector(`[name="entry_${id}_animalName"]`).value = 'HARNESS HEIFER';
        card.querySelector(`[name="entry_${id}_regNum"]`).value = 'HARNESS-ATQ-1';
        card.querySelector(`[name="entry_${id}_animalDOB"]`).value = '2025-04-15';
        card.querySelector(`[name="entry_${id}_sex"]`).value = 'Female';
        card.querySelector(`[name="entry_${id}_possDate"]`).value = '2025-06-01';

        // --- entry 2: Home & Garden, Class 14 (no breeds, no animal fields)
        w.addEntry('homegarden');
        card = d.querySelector('#entries-homegarden .entry-card');
        id = card.id.replace('entry-', '');
        sel = card.querySelector(`[name="entry_${id}_class"]`);
        sel.value = '14';
        sel.dispatchEvent(new w.Event('change', { bubbles: true }));
        w.onClassChange(Number(id));
        const secs2 = card.querySelectorAll(`[name="entry_${id}_section[]"]`);
        secs2[0].checked = true; secs2[3].checked = true;

        // --- contact block
        const f = d.getElementById('form-general');
        const set = (n, v) => { const el = f.querySelector(`[name="${n}"]`); if (el) el.value = v; };
        set('firstName', 'HARNESS'); set('lastName', 'COMPARE');
        set('phone', '000-000-0000'); set('email', 'harness@example.invalid');
        set('notes', 'harness run — not submitted anywhere');
        // structured mailing-address fields (added 2026-08-22)
        set('street', '1 Test Road'); set('unit', 'Apt 2');
        set('city', 'Havelock'); set('province', 'QC'); set('postal', 'J0S 2C0');

        f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));

        setTimeout(() => {
          dom.window.close();
          resolve(captured);
        }, 400);
      } catch (e) { reject(e); }
    };

    if (d.readyState === 'complete') setTimeout(done, 120);
    else w.addEventListener('load', () => setTimeout(done, 120));
  });
}

(async () => {
  const [a, b] = process.argv.slice(2);
  const A = await drive(a);
  const B = await drive(b);

  const norm = (o) => JSON.stringify({ url: o.url, method: o.method, headers: o.headers });
  console.log('=== MODIFIED:', path.basename(a));
  console.log('  url     :', A.url);
  console.log('  method  :', A.method, '| headers:', JSON.stringify(A.headers));
  console.log('  body len:', A.body ? A.body.length : '(no body captured!)');
  console.log('=== PRISTINE:', path.basename(b));
  console.log('  body len:', B.body ? B.body.length : '(no body captured!)');

  if (!A.body || !B.body) {
    console.log('\n❌ FAIL — a submit did not fire; harness did not capture a POST.');
    process.exit(2);
  }

  const bodyMatch = Buffer.compare(Buffer.from(A.body, 'utf8'), Buffer.from(B.body, 'utf8')) === 0;
  const metaMatch = norm(A) === norm(B);
  const p = JSON.parse(A.body);

  console.log('\n  formType        :', p.formType);
  console.log('  entries         :', Array.isArray(p.entries) ? p.entries.length : 'MISSING');
  console.log('  payload keys    :', Object.keys(p).join(', '));
  console.log('\n  body byte-identical :', bodyMatch ? '✅ YES' : '❌ NO');
  console.log('  url+method+headers  :', metaMatch ? '✅ identical' : '❌ differ');

  if (!bodyMatch) {
    console.log('\n--- MODIFIED body ---\n' + A.body);
    console.log('\n--- PRISTINE body ---\n' + B.body);
  }
  if (p.formType !== 'General') { console.log('\n❌ formType changed — hard constraint violated.'); process.exit(3); }
  process.exit(bodyMatch && metaMatch ? 0 : 1);
})().catch(e => { console.error('harness error:', e); process.exit(9); });
