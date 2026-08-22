/* Functional check of the entry counter (not a payload test). */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://havelockfair.ca/pages/registration.html',
  beforeParse(w) {
    w.alert = () => {}; w.scrollTo = () => {}; w.print = () => {};
    w.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
  }
});
const w = dom.window, d = w.document;

w.addEventListener('load', () => setTimeout(() => {
  w.Element.prototype.scrollIntoView = function () {};

  function addCard(cat, classId, sectionIdx, breedIdx) {
    w.addEntry(cat);
    const cards = d.querySelectorAll(`#${cat === 'livestock' ? 'entries-livestock' : 'entries-homegarden'} .entry-card`);
    const card = cards[cards.length - 1];
    const id = card.id.replace('entry-', '');
    const sel = card.querySelector(`[name="entry_${id}_class"]`);
    sel.value = String(classId);
    w.onClassChange(Number(id));
    (breedIdx || []).forEach(i => {
      const b = card.querySelectorAll(`[name="entry_${id}_breed[]"]`)[i];
      if (b) { b.checked = true; b.dispatchEvent(new w.Event('change', { bubbles: true })); }
    });
    sectionIdx.forEach(i => {
      const s = card.querySelectorAll(`[name="entry_${id}_section[]"]`)[i];
      if (s) { s.checked = true; s.dispatchEvent(new w.Event('change', { bubbles: true })); }
    });
    return card;
  }

  const badge = () => d.getElementById('count-livestock')?.textContent.trim();
  const note = (c) => c.querySelector('.entry-count-note')?.textContent.trim();

  let fails = 0;
  const check = (label, got, want) => {
    const ok = got === want;
    if (!ok) fails++;
    console.log(`  ${ok ? '✅' : '❌'} ${label}\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`);
  };

  // --- Case 1: the screenshot. Class 2 (Miniature Horse, NO breeds), 3 sections ticked.
  const c1 = addCard('livestock', 2, [0, 2, 4]);
  console.log('\nCase 1 — Class 2, no breeds, 3 sections (the reported bug):');
  check('badge reads 3 entries', badge(), '3 entries');
  check('card note', note(c1), '3 entries in this class');

  // --- Case 2: cross-product. Class 3 (Dairy Cattle, 5 breeds), 2 breeds x 2 sections = 4.
  c1.remove();
  const c2 = addCard('livestock', 3, [0, 1], [0, 1]);
  console.log('\nCase 2 — Class 3, 2 breeds x 2 sections (Jesse\'s ruling = 4):');
  check('badge reads 4 entries', badge(), '4 entries');
  check('card note shows the multiplication', note(c2), '2 breeds × 2 sections = 4 entries');

  // --- Case 3: single section, singular wording
  c2.remove();
  const c3 = addCard('livestock', 2, [0]);
  console.log('\nCase 3 — singular:');
  check('badge reads 1 entry', badge(), '1 entry');
  check('card note singular', note(c3), '1 entry in this class');

  // --- Case 4: class chosen, no sections yet -> contributes 0
  c3.remove();
  addCard('livestock', 2, []);
  console.log('\nCase 4 — class selected but no sections ticked:');
  check('badge empty', badge(), '');

  console.log(fails ? `\n❌ ${fails} check(s) failed` : '\n✅ all counter checks passed');
  process.exit(fails ? 1 : 0);
}, 200));
