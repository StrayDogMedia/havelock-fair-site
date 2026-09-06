/* Runs HF_JudgingSystem.gs against a mock SpreadsheetApp backed by the REAL
   SECTIONS (all 659 rows) and the REAL REGISTRATIONS rows, end to end. */
const fs = require('fs');
const book = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'mock-book.json'), 'utf8'));

// The mock lives in mock-sheets.js so this harness and simulate.js share ONE
// copy. They had drifted, and data-validation support would have needed
// writing twice.
const mock = require('./mock-sheets.js').makeBook(book);
const SHEETS = mock.SHEETS;
global.SpreadsheetApp = mock.SpreadsheetApp;
global.Logger = { log: m => console.log('   [log] ' + String(m).split('\n')[0]) };

// load the script under test
const src = fs.readFileSync(require('path').join(__dirname, '..', 'HF_JudgingSystem.gs'), 'utf8');
eval(src);
// The JUDGING ENTRY tab builder lives in its own file so the install is a
// new-file paste rather than a replace of the file running the money chain.
eval(fs.readFileSync(require('path').join(__dirname, '..', 'HF_JudgingEntry.gs'), 'utf8'));

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
let refused = false, guardMsg = '';
try { HF_buildEntries(); } catch (err) { guardMsg = err.message; refused = /would renumber/.test(err.message); }
ck('HF_buildEntries refuses to renumber over recorded placings', refused, guardMsg);
ck('the refusal names RESULTS as the reason', /RESULTS holds/.test(guardMsg), guardMsg);

console.log('\n=== 6. JUDGING ENTRY — build ===');
console.log('  ' + HF_buildJudgingEntry());
const JE = SHEETS['JUDGING ENTRY'];
const jeg = JE.g;
const jeCol = { section:0, prize:1, amount:2, winner:3, key:6, entry:7 };
const jeHeaders = jeg.slice(2).filter(r => String(r[jeCol.key]).trim());
const jePrizeRows = jeg.slice(2).filter(r => ['1st','2nd','3rd','4th'].indexOf(String(r[jeCol.prize]).trim()) >= 0);

// Derived from the fixture, never frozen: the fixture grows on every refresh.
const groupKeys = new Set(erows.map(r =>
  [r[eh.indexOf('CLASS #')], r[eh.indexOf('DIVISION')], r[eh.indexOf('SECTION CODE')]].join('||')));
ck('one section header per section with entries', jeHeaders.length === groupKeys.size,
   jeHeaders.length + ' vs ' + groupKeys.size);
ck('four prize rows per section', jePrizeRows.length === groupKeys.size * 4,
   jePrizeRows.length + ' vs ' + (groupKeys.size * 4));
ck('every section header key is a real group', jeHeaders.every(r => groupKeys.has(String(r[jeCol.key]).trim())));

// 🔴 All 13 position-only sections have an EMPTY CLASS #. The older
// HF_makeJudgingSheets format string renders those as "Class  — 4-H".
ck('no section heading renders "Class  — "',
   !jeHeaders.some(r => /Class\s{2,}—/.test(String(r[jeCol.section]))),
   jeHeaders.filter(r => /Class\s{2,}—/.test(String(r[jeCol.section]))).map(r=>r[jeCol.section])[0]);

// Dropdowns: one rule per prize row, none on a section header.
const dvAt = (rowIdx1) => JE._getDV(rowIdx1, 4);
const headerRowNums = [], prizeRowNums = [];
jeg.forEach((r, i) => {
  const n = i + 1;
  if (n < 3) return;
  if (String(r[jeCol.key]).trim()) headerRowNums.push(n);
  else if (['1st','2nd','3rd','4th'].indexOf(String(r[jeCol.prize]).trim()) >= 0) prizeRowNums.push(n);
});
ck('every prize row has a dropdown', prizeRowNums.every(n => !!dvAt(n)));
ck('no section header has a dropdown', headerRowNums.every(n => !dvAt(n)));
ck('dropdowns are strict (no free text)',
   prizeRowNums.every(n => dvAt(n)._spec.allowInvalid === false));

// A section's list must be EXACTLY that section's entries — no more, no fewer.
const sectionOfRow = {};
{ let k = ''; jeg.forEach((r, i) => { const n = i + 1; if (n < 3) return;
    if (String(r[jeCol.key]).trim()) k = String(r[jeCol.key]).trim();
    sectionOfRow[n] = k; }); }
let listMismatch = null;
prizeRowNums.forEach(n => {
  const want = erows.filter(r =>
    [r[eh.indexOf('CLASS #')], r[eh.indexOf('DIVISION')], r[eh.indexOf('SECTION CODE')]].join('||') === sectionOfRow[n])
    .map(r => String(r[0]).trim()).sort();
  const got = dvAt(n)._spec.values.map(v => hfjeParseEntryId_(v)).sort();
  if (JSON.stringify(want) !== JSON.stringify(got) && !listMismatch)
    listMismatch = sectionOfRow[n] + ' want ' + want + ' got ' + got;
});
ck('each dropdown lists exactly its own section\'s entries', !listMismatch, listMismatch);

// Every label must round-trip to its entry number.
const allLabels = prizeRowNums.flatMap(n => dvAt(n)._spec.values);
ck('every label is "E#### — ..." and parses back',
   allLabels.every(l => /^E\d+ — /.test(l) && hfjeParseEntryId_(l) === l.split(' ')[0]));

// 🔴 The real collision: Class 17 Sec 37 holds TWO entries for Lise Brown.
// A name-only label would put two identical strings in one list.
const lise = erows.filter(r => String(r[1]).trim() === 'HF2026-1020' &&
  String(r[eh.indexOf('SECTION CODE')]).trim() === '37');
if (lise.length > 1) {
  const row = prizeRowNums.find(n => sectionOfRow[n] ===
    [lise[0][eh.indexOf('CLASS #')], lise[0][eh.indexOf('DIVISION')], lise[0][eh.indexOf('SECTION CODE')]].join('||'));
  const labels = dvAt(row)._spec.values;
  ck('duplicate exhibitor in one section gets distinguishable labels',
     new Set(labels).size === labels.length && lise.every(l => labels.some(x => hfjeParseEntryId_(x) === String(l[0]).trim())),
     labels.join(' | '));
} else {
  ck('duplicate exhibitor case present in fixture', false, 'expected 2 Lise Brown entries in sec 37');
}

// Position-only sections show no dollar figure.
const posKeys = new Set(erows.filter(r => r[iTier] === 'NO PRIZE — POSITION ONLY')
  .map(r => [r[eh.indexOf('CLASS #')], r[eh.indexOf('DIVISION')], r[eh.indexOf('SECTION CODE')]].join('||')));
ck('position-only sections are labelled, not priced',
   jeHeaders.filter(r => posKeys.has(String(r[jeCol.key]).trim()))
            .every(r => String(r[jeCol.prize]).trim() === 'POSITION ONLY'));
ck('position-only prize rows carry $0',
   prizeRowNums.filter(n => posKeys.has(sectionOfRow[n])).every(n => Number(jeg[n-1][jeCol.amount]) === 0));

console.log('\n=== 7. JUDGING ENTRY — pick, validate, sync ===');
// Clear RESULTS so the new path is measured on its own.
const rhdr = SHEETS['RESULTS'].g[1];
for (let r = 3; r <= SHEETS['RESULTS'].g.length; r++)
  if (SHEETS['RESULTS'].g[r-1]) for (let c = 0; c < rhdr.length; c++) SHEETS['RESULTS'].g[r-1][c] = '';
SHEETS['PRIZE CALCULATIONS'].g = SHEETS['PRIZE CALCULATIONS'].g.slice(0, 2);
SHEETS['CHEQUE REGISTER'].g = SHEETS['CHEQUE REGISTER'].g.slice(0, 2);

// Pick the SAME awards section 3 typed straight into RESULTS.
const pickInto = (entryId, placing) => {
  const key = (() => { const r = erows.find(x => String(x[0]).trim() === entryId);
    return [r[eh.indexOf('CLASS #')], r[eh.indexOf('DIVISION')], r[eh.indexOf('SECTION CODE')]].join('||'); })();
  const row = prizeRowNums.find(n => sectionOfRow[n] === key &&
    String(jeg[n-1][jeCol.prize]).trim() === placing);
  const label = dvAt(row)._spec.values.find(v => hfjeParseEntryId_(v) === entryId);
  JE.g[row-1][jeCol.winner] = label;
  return row;
};
pickInto(claudia[0][0], '1st'); pickInto(claudia[1][0], '2nd'); pickInto(claudia[2][0], '3rd');
pickInto(karen[0][0], '1st');   pickInto(riley[0][0], '1st');   pickInto(riley[1][0], '4th');
pickInto(fh1[0], '1st');

ck('check reports no blocking problems', /no blocking problems/.test(HF_checkJudgingEntry()));
console.log('  ' + HF_syncJudgingToResults().split('\n')[0]);

const resRows = SHEETS['RESULTS'].g.slice(2).filter(r => String(r[rhdr.indexOf('ENTRY #')]).trim());
ck('sync wrote one RESULTS row per pick', resRows.length === 7, resRows.length);
ck('placings are plain 1st/2nd/3rd/4th',
   resRows.every(r => ['1st','2nd','3rd','4th'].indexOf(String(r[rhdr.indexOf('PLACING')]).trim()) >= 0));

// 🔴 THE LOAD-BEARING CHECK: the new path must produce the SAME money as the
// old one. Section 3 typed these same awards straight into RESULTS and got
// Claudia 27 / Karen 5 / Riley 20, three cheques.
SHEETS['RESULTS'].g[2][rhdr.indexOf('DONATED?')] = 'Yes';   // Claudia's 3rd, as before
// (row 3 is Claudia's 1st; find her 3rd instead)
resRows.forEach((r, i) => { r[rhdr.indexOf('DONATED?')] = ''; });
const claudia3 = resRows.find(r => String(r[rhdr.indexOf('ENTRY #')]).trim() === claudia[2][0]);
claudia3[rhdr.indexOf('DONATED?')] = 'Yes';
console.log('  ' + HF_calculatePrizes());
const calc2 = SHEETS['PRIZE CALCULATIONS'].g, ch2 = calc2[1];
const gc2 = (id, col) => { const r = calc2.slice(2).find(x => String(x[0]).trim() === id);
  return r ? Number(r[ch2.indexOf(col)]) : null; };
ck('JUDGING ENTRY path: Claudia net = 27 (same as typing it)', gc2('HF2026-1001','NET CHEQUE ($)') === 27, gc2('HF2026-1001','NET CHEQUE ($)'));
ck('JUDGING ENTRY path: Karen net = 5', gc2('HF2026-1002','NET CHEQUE ($)') === 5, gc2('HF2026-1002','NET CHEQUE ($)'));
ck('JUDGING ENTRY path: Riley net = 20', gc2('HF2026-1003','NET CHEQUE ($)') === 20, gc2('HF2026-1003','NET CHEQUE ($)'));
const chq2 = SHEETS['CHEQUE REGISTER'].g.slice(2).filter(r => String(r[0]).trim());
ck('JUDGING ENTRY path: same 3 cheques, same $52 total',
   chq2.length === 3 && chq2.reduce((s,r)=>s+Number(r[6]||0),0) === 52,
   chq2.length + ' cheques, $' + chq2.reduce((s,r)=>s+Number(r[6]||0),0));
ck('verify still passes on the new path', /ALL CHECKS PASSED/.test(HF_verify()));

console.log('\n=== 8. JUDGING ENTRY — safety ===');
// Rebuild must preserve picks.
const before = jePrizeRows.filter(r => String(r[jeCol.winner]).trim()).length;
HF_buildJudgingEntry();
const after = SHEETS['JUDGING ENTRY'].g.slice(2)
  .filter(r => ['1st','2nd','3rd','4th'].indexOf(String(r[jeCol.prize]).trim()) >= 0 && String(r[jeCol.winner]).trim()).length;
ck('a rebuild preserves picks', after === 7, before + ' -> ' + after);

// The same entry cannot take two positions in one section.
const jg = SHEETS['JUDGING ENTRY'].g;
let firstK = '', r1st = -1, r2nd = -1;
for (let i = 2; i < jg.length; i++) {
  const k = String(jg[i][jeCol.key]).trim();
  if (k && !firstK) firstK = k;
  if (firstK && String(jg[i][jeCol.prize]).trim() === '1st' && r1st < 0) r1st = i;
  if (firstK && String(jg[i][jeCol.prize]).trim() === '2nd' && r2nd < 0) r2nd = i;
  if (r1st >= 0 && r2nd >= 0) break;
}
const dupLabel = JE._getDV(r1st + 1, 4)._spec.values[0];
jg[r1st][jeCol.winner] = dupLabel; jg[r2nd][jeCol.winner] = dupLabel;
const dupReport = HF_syncJudgingToResults();
ck('same entry twice in one section is REFUSED', /REFUSING TO SYNC/.test(dupReport), dupReport.split('\n')[0]);
jg[r2nd][jeCol.winner] = '';   // undo

// Unsynced picks must block a rebuild of ENTRIES.
for (let r = 3; r <= SHEETS['RESULTS'].g.length; r++)
  if (SHEETS['RESULTS'].g[r-1]) for (let c = 0; c < rhdr.length; c++) SHEETS['RESULTS'].g[r-1][c] = '';
let blocked = '';
try { HF_buildEntries(); } catch (err) { blocked = err.message; }
ck('picks in JUDGING ENTRY block a renumber even with RESULTS empty',
   /JUDGING ENTRY holds/.test(blocked), blocked || '(did not throw)');

console.log(fails ? `\n❌ ${fails} check(s) FAILED` : '\n✅ ALL CHECKS PASSED');
process.exit(fails ? 1 : 0);
