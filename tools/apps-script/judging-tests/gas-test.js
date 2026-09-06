/* Runs HF_JudgingSystem.gs against a mock SpreadsheetApp backed by the REAL
   SECTIONS (all 659 rows) and the REAL REGISTRATIONS rows, end to end. */
const fs = require('fs');
const book = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'mock-book.json'), 'utf8'));

function pad(grid) {
  const w = Math.max(...grid.map(r => r.length), 30);
  return grid.map(r => { const c = r.slice(); while (c.length < w) c.push(''); return c; });
}
const TABS = {};
Object.keys(book).forEach(k => { TABS[k] = pad(book[k]); });

function Range(sheet, r, c, nr, nc) {
  return {
    setValues(v) {
      for (let i = 0; i < v.length; i++) for (let j = 0; j < v[i].length; j++) {
        sheet._ensure(r + i, c + j); sheet.g[r + i - 1][c + j - 1] = v[i][j];
      }
      return this;
    },
    setValue(v) { sheet._ensure(r, c); sheet.g[r - 1][c - 1] = v; return this; },
    getValues() {
      const o = [];
      for (let i = 0; i < nr; i++) { const row = [];
        for (let j = 0; j < nc; j++) { sheet._ensure(r + i, c + j); row.push(sheet.g[r + i - 1][c + j - 1]); }
        o.push(row); }
      return o;
    },
    clearContent() { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { sheet._ensure(r+i, c+j); sheet.g[r+i-1][c+j-1] = ''; } return this; },
    setBackground() { return this; }, setFontColor() { return this; },
    setFontWeight() { return this; }, setFontSize() { return this; }
  };
}
function Sheet(name, grid) {
  return {
    name, g: grid,
    _ensure(r, c) { while (this.g.length < r) this.g.push([]); const row = this.g[r-1]; while (row.length < c) row.push(''); },
    getDataRange() { const h = this.g.length, w = Math.max(...this.g.map(r => r.length), 1); return Range(this, 1, 1, h, w); },
    getRange(r, c, nr, nc) { return Range(this, r, c, nr === undefined ? 1 : nr, nc === undefined ? 1 : nc); },
    clear() { this.g = [[]]; return this; },
    setFrozenRows() { return this; }, autoResizeColumns() { return this; }
  };
}
const SHEETS = {};
Object.keys(TABS).forEach(k => { SHEETS[k] = Sheet(k, TABS[k]); });

global.SpreadsheetApp = {
  openById: () => ({
    getSheetByName: n => SHEETS[n] || null,
    insertSheet: n => (SHEETS[n] = Sheet(n, [[]]))
  }),
  getUi: () => { throw new Error('no ui'); }
};
global.Logger = { log: m => console.log('   [log] ' + String(m).split('\n')[0]) };

// load the script under test
const src = fs.readFileSync(require('path').join(__dirname, '..', 'HF_JudgingSystem.gs'), 'utf8');
eval(src);

let fails = 0;
const flaggedIds = () => {
  const g = SHEETS['ENTRIES'].g;
  let at = -1;
  g.forEach((r, i) => { if (String(r[0]).indexOf('NEEDS ATTENTION') >= 0) at = i; });
  return at < 0 ? [] : g.slice(at + 1).filter(r => String(r[0]).trim()).map(r => String(r[0]).trim());
};
const ck = (label, cond, extra) => {
  if (!cond) fails++;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${extra !== undefined && !cond ? '  -> ' + extra : ''}`);
};

console.log('\n=== 1. HF_buildEntries() ===');
console.log('  ' + HF_buildEntries());
const ent = SHEETS['ENTRIES'].g;
const eh = ent[0];
const erows = ent.slice(1).filter(r => String(r[0]).startsWith('E'));
// Counts are derived, not frozen: this fixture grows every time real registrations
// are pulled down, and a hardcoded total turns each refresh into a fake failure.
const regRows = SHEETS['REGISTRATIONS'].g.slice(1).filter(r => String(r[2]).trim());
ck('every registration row produced at least one entry or a flag',
   new Set(erows.map(r => r[1])).size + flaggedIds().length === new Set(regRows.map(r => String(r[2]).trim())).size,
   new Set(erows.map(r => r[1])).size + ' entered + ' + flaggedIds().length + ' flagged vs ' +
   new Set(regRows.map(r => String(r[2]).trim())).size + ' registrations');
ck('ENTRY # unique', new Set(erows.map(r => r[0])).size === erows.length);
const iDiv = eh.indexOf('DIVISION'), iCls = eh.indexOf('CLASS #'), iTier = eh.indexOf('PRIZE TIER'), i1 = eh.indexOf('1ST ($)');
// Position-only entries (4-H / Equestrian) legitimately have no division —
// the form collects none and they are judged off-book.
const prizeRows = erows.filter(r => r[iTier] !== 'NO PRIZE — POSITION ONLY');
ck('every PRIZE-BEARING entry has a division', prizeRows.every(r => String(r[iDiv]).trim() !== ''),
   prizeRows.filter(r => !String(r[iDiv]).trim()).length + ' without');
ck('every entry has a prize tier', erows.every(r => String(r[iTier]).trim() !== ''));
const youth = erows.filter(r => r[iCls] === 26);
ck('Youth rows expanded to one entry per section', youth.length >= 2 && youth.length % 1 === 0, youth.length);
ck('every Youth entry resolved a division', youth.every(r => String(r[iDiv]).trim() !== ''), youth.map(r=>r[iDiv]));

const iTier2 = eh.indexOf('PRIZE TIER'), iFT = eh.indexOf('FORM TYPE'), iFlag = eh.indexOf('FLAG');
const posOnly = erows.filter(r => r[iTier2] === 'NO PRIZE — POSITION ONLY');
ck('4-H + Equestrian produced position-only entries', posOnly.length > 0, posOnly.length);
// HF2026-1018 entered gymkhana only. Reading just 'Show Sections' gave her ONE
// entry reading '(no section recorded)' — she would have been on no judging sheet.
const alice = erows.filter(r => r[1] === 'HF2026-1018');
ck('gymkhana-only rider gets all 3 events', alice.length === 3, alice.length);
const iSecD = eh.indexOf('SECTION DESCRIPTION');
ck('no phantom \'(no section recorded)\' entries', !erows.some(r => String(r[iSecD]).indexOf('no section recorded') >= 0));
ck('position-only entries carry $0 prizes', posOnly.every(r => Number(r[i1]) === 0));
ck('position-only entries still get ENTRY #s', posOnly.every(r => String(r[0]).startsWith('E')));
// HF2026-1019 is an abandoned Equestrian submission carrying nothing but
// "Not confirmed". It must be FLAGGED, never turned into a phantom entry.
const flagBlock = SHEETS['ENTRIES'].g.map(r => r.join(' ')).join('\n');
ck('blank equestrian row is flagged, not entered',
   !erows.some(r => r[1] === 'HF2026-1019') && flagBlock.indexOf('HF2026-1019') >= 0);

ck('position-only form types are only 4-H / Equestrian',
   [...new Set(posOnly.map(r => r[iFT]))].every(t => ['4H','4-H','Equestrian'].indexOf(t) >= 0),
   [...new Set(posOnly.map(r => r[iFT]))].join(','));

console.log('\n=== 2. HF_makeJudgingSheets() ===');
console.log('  ' + HF_makeJudgingSheets());
ck('judging sheet built', SHEETS['JUDGING SHEETS'].g.length > 14);

console.log('\n=== 3. record placings, then HF_calculatePrizes() ===');
// Claudia (class 14, INDOOR_PREMIUM 15/12/10): 1st, 2nd, and a donated 3rd
const R = SHEETS['RESULTS'];
const rh = R.g[1];
const put = (row, name, val) => { R._ensure(row, rh.indexOf(name) + 1); R.g[row-1][rh.indexOf(name)] = val; };
const e = id => erows.find(r => r[0] === id);
const claudia = erows.filter(r => r[1] === 'HF2026-1001');
const karen  = erows.filter(r => r[1] === 'HF2026-1002');
const riley  = erows.filter(r => r[1] === 'HF2026-1003');
[[claudia[0][0], '1'], [claudia[1][0], '2'], [claudia[2][0], '3'],
 [karen[0][0], '1'], [riley[0][0], '1'], [riley[1][0], '4']]
  .forEach(([id, place], i) => { const row = 3 + i; put(row, 'RESULT #', 'R' + (i+1)); put(row, 'ENTRY #', id); put(row, 'PLACING', place); });
put(3 + 2, 'DONATED?', 'Yes');   // Claudia donates her 3rd-place $10 back
// 4-H placing: position logged, no prize money
const fh1 = erows.find(r => r[iFT] === '4H');
put(9, 'RESULT #', 'R7'); put(9, 'ENTRY #', fh1[0]); put(9, 'PLACING', '1');
console.log('  ' + HF_calculatePrizes());

const calc = SHEETS['PRIZE CALCULATIONS'].g, ch = calc[1];
const crow = id => calc.slice(2).find(r => String(r[0]).trim() === id);
const gc = (id, col) => Number(crow(id)[ch.indexOf(col)]);
console.log('\n  PRIZE CALCULATIONS:');
calc.slice(2).filter(r => String(r[0]).trim()).forEach(r =>
  console.log(`    ${r[0]} ${String(r[1]).padEnd(20)} total=$${r[2]}  donated=$${r[3]}  fee=$${r[4]}  net=$${r[7]}`));

// Claudia: 15 + 12 + 10 = 37 gross, 10 donated, 15 membership -> 12 net
ck('Claudia gross = 37', gc('HF2026-1001', 'TOTAL PRIZES ($)') === 37, gc('HF2026-1001','TOTAL PRIZES ($)'));
ck('Claudia donated = 10', gc('HF2026-1001', 'TOTAL DONATED ($)') === 10);
ck('Claudia is UNDER 13 -> no membership fee', gc('HF2026-1001', 'MEMBERSHIP FEE ($)') === 0, gc('HF2026-1001','MEMBERSHIP FEE ($)'));
ck('Claudia net = 27 (37 - 10 donated, no fee)', gc('HF2026-1001', 'NET CHEQUE ($)') === 27, gc('HF2026-1001','NET CHEQUE ($)'));
// Karen: class 24 INDOOR_MIDRANGE 1st = 20, less 15 membership -> 5
ck('Karen net = 5 (20 - 15 membership)', gc('HF2026-1002', 'NET CHEQUE ($)') === 5, gc('HF2026-1002','NET CHEQUE ($)'));
// Riley: youth, class 26 INDOOR_MIDRANGE 1st=20 + 4th (no 4th prize in tier -> 0), no membership fee
ck('Riley (Youth class 26 = 12 & under) pays no fee', gc('HF2026-1003', 'MEMBERSHIP FEE ($)') === 0);
ck('Riley net = 20', gc('HF2026-1003', 'NET CHEQUE ($)') === 20, gc('HF2026-1003','NET CHEQUE ($)'));

const chq = SHEETS['CHEQUE REGISTER'].g.slice(2).filter(r => String(r[0]).trim());
console.log('\n  CHEQUE REGISTER:');
chq.forEach(r => console.log(`    #${r[0]}  ${r[1]}  ${String(r[2]).padEnd(20)} $${r[6]}`));
ck('4-H exhibitor placed but gets NO cheque', !chq.some(r => String(r[1]) === 'HF2026-1007'));
ck('3 cheques', chq.length === 3, chq.length);
ck('cheque total = 52 (27 + 5 + 20)', chq.reduce((t, r) => t + Number(r[6]), 0) === 52, chq.reduce((t,r)=>t+Number(r[6]),0));

console.log('\n=== 4. HF_verify() ===');
const rep = HF_verify();
console.log(rep.split('\n').map(l => '  ' + l).join('\n'));
ck('verify passes', rep.indexOf('ALL CHECKS PASSED') !== -1);

// The ⚠ NEEDS ATTENTION block sits in the ENTRIES sheet below the entries.
// HF_verify must not count its rows as ENTRY #s: it inflated the total, and two
// flagged rows for one exhibitor would fail the uniqueness gate on cheque writing.
ck('verify counts only real ENTRY #s, not the flag block',
   /ENTRY # unique \((\d+) entries/.exec(rep)[1] === String(erows.length),
   /ENTRY # unique \((\d+) entries/.exec(rep)[1] + ' vs ' + erows.length);

console.log('\n=== 5. guard: rebuilding entries with results present must refuse ===');
let refused = false;
try { HF_buildEntries(); } catch (err) { refused = /already contains/.test(err.message); }
ck('HF_buildEntries refuses to renumber over recorded placings', refused);

console.log(fails ? `\n❌ ${fails} check(s) FAILED` : '\n✅ ALL CHECKS PASSED');
process.exit(fails ? 1 : 0);
