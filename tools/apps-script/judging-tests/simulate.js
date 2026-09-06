#!/usr/bin/env node
/**
 * FAIR-DAY SIMULATOR
 *
 * Type placings the way the office will on Sept 12–13 and watch the whole
 * money chain run — RESULTS → PRIZE CALCULATIONS → CHEQUE REGISTER →
 * HF_verify — against the REAL judging script and REAL registration data.
 *
 * Nothing here touches the live workbook. It runs the same
 * HF_JudgingSystem.gs against an in-memory copy of the sheet, so you can
 * try anything, including things that should fail.
 *
 *   node tools/apps-script/judging-tests/simulate.js
 *
 * Then at the prompt:
 *   E1001 1st          award a placing
 *   E1005 2nd
 *   list               show every entry you can award
 *   list 14            only class 14
 *   who E1001          what is this entry
 *   run                price it and print the cheques
 *   undo               remove the last placing
 *   clear              start over
 *   quit
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const HERE = __dirname;
const book = JSON.parse(fs.readFileSync(path.join(HERE, 'mock-book.json'), 'utf8'));

/* ---- the same mock SpreadsheetApp the test harness uses ---- */
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
      } return this;
    },
    setValue(v) { sheet._ensure(r, c); sheet.g[r - 1][c - 1] = v; return this; },
    getValues() {
      const o = [];
      for (let i = 0; i < nr; i++) { const row = [];
        for (let j = 0; j < nc; j++) { sheet._ensure(r + i, c + j); row.push(sheet.g[r + i - 1][c + j - 1]); }
        o.push(row); } return o;
    },
    clearContent() { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { sheet._ensure(r+i,c+j); sheet.g[r+i-1][c+j-1]=''; } return this; },
    setBackground(){return this;}, setFontColor(){return this;},
    setFontWeight(){return this;}, setFontSize(){return this;}
  };
}
function Sheet(name, grid) {
  return {
    name, g: grid,
    _ensure(r, c) { while (this.g.length < r) this.g.push([]); const row = this.g[r-1]; while (row.length < c) row.push(''); },
    getDataRange() { const h=this.g.length, w=Math.max(...this.g.map(r=>r.length),1); return Range(this,1,1,h,w); },
    getRange(r,c,nr,nc) { return Range(this,r,c,nr===undefined?1:nr,nc===undefined?1:nc); },
    clear() { this.g = [[]]; return this; },
    setFrozenRows(){return this;}, autoResizeColumns(){return this;}
  };
}
const SHEETS = {};
Object.keys(TABS).forEach(k => { SHEETS[k] = Sheet(k, TABS[k]); });

global.SpreadsheetApp = {
  openById: () => ({ getSheetByName: n => SHEETS[n] || null,
                     insertSheet: n => (SHEETS[n] = Sheet(n, [[]])) }),
  getUi: () => { throw new Error('no ui'); }
};
let QUIET = true;
global.Logger = { log: m => { if (!QUIET) console.log('   ' + String(m).split('\n')[0]); } };

/* ---- load the REAL script under test ---- */
eval(fs.readFileSync(path.join(HERE, '..', 'HF_JudgingSystem.gs'), 'utf8'));

/* ---- build entries once, quietly ---- */
HF_buildEntries();
HF_makeJudgingSheets();

const EH = SHEETS['ENTRIES'].g[0];
const col = n => EH.indexOf(n);
const entries = SHEETS['ENTRIES'].g.slice(1).filter(r => /^E\d+$/.test(String(r[0]).trim()));
const byId = {};
entries.forEach(r => { byId[String(r[0]).trim().toUpperCase()] = r; });

const C = { dim:'\x1b[2m', b:'\x1b[1m', g:'\x1b[32m', y:'\x1b[33m', r:'\x1b[31m', c:'\x1b[36m', x:'\x1b[0m' };
const money = n => '$' + Number(n || 0).toFixed(2);

const PLACINGS = ['1st','2nd','3rd','4th'];
const awarded = [];   // {id, placing}

function describe(r) {
  const tier = String(r[col('PRIZE TIER')]);
  const prizes = PLACINGS.map((p,i) => money(r[col((i+1)+(['ST','ND','RD','TH'][i])+' ($)')] ?? r[col(['1ST ($)','2ND ($)','3RD ($)','4TH ($)'][i])]));
  return {
    id: String(r[0]).trim(),
    who: String(r[col('EXHIBITOR NAME')]).trim(),
    ex: String(r[col('EXHIBITOR #')]).trim(),
    cls: String(r[col('CLASS #')]).trim(),
    clsName: String(r[col('CLASS NAME')]).trim(),
    sec: String(r[col('SECTION DESCRIPTION')]).trim(),
    tier,
    positionOnly: /NO PRIZE/.test(tier),
    prizes: [col('1ST ($)'),col('2ND ($)'),col('3RD ($)'),col('4TH ($)')].map(i => Number(r[i]||0))
  };
}

function listEntries(filter) {
  const rows = entries.map(describe)
    .filter(d => !filter || d.cls === String(filter) || d.clsName.toLowerCase().includes(String(filter).toLowerCase()));
  if (!rows.length) return console.log(C.y + '  nothing matches ' + filter + C.x);
  let lastKey = '';
  rows.sort((a,b)=> (a.clsName+a.sec).localeCompare(b.clsName+b.sec) || a.id.localeCompare(b.id))
      .forEach(d => {
    const key = d.clsName + ' · ' + d.sec;
    if (key !== lastKey) {
      const p = d.positionOnly ? C.dim+'position only, no prize money'+C.x
              : C.dim + d.prizes.map((v,i)=>PLACINGS[i]+' '+money(v)).join('  ') + C.x;
      console.log('\n  ' + C.b + key + C.x + '\n  ' + p);
      lastKey = key;
    }
    const got = awarded.find(a => a.id === d.id);
    console.log('    ' + C.c + d.id.padEnd(7) + C.x + d.who.padEnd(24) +
                (got ? C.g + '← ' + got.placing + C.x : ''));
  });
  console.log('');
}

/** Write the awarded placings into the RESULTS sheet, then price them. */
function run() {
  const R = SHEETS['RESULTS'];
  const rh = R.g[1];
  const ci = n => rh.indexOf(n);
  // wipe any previous simulation rows
  for (let r = 3; r <= R.g.length; r++) {
    if (R.g[r-1]) for (let c = 0; c < rh.length; c++) R.g[r-1][c] = '';
  }
  awarded.forEach((a, i) => {
    const row = 3 + i;
    R._ensure(row, rh.length);
    R.g[row-1][ci('RESULT #')] = i + 1;
    R.g[row-1][ci('ENTRY #')]  = a.id;
    R.g[row-1][ci('PLACING')]  = a.placing;
    if (a.donated) R.g[row-1][ci('DONATED?')] = 'Yes';
  });

  QUIET = false;
  console.log('\n' + C.b + '── 3. Calculate prizes & cheques ──' + C.x);
  console.log('   ' + HF_calculatePrizes());

  console.log('\n' + C.b + 'PRIZE CALCULATIONS' + C.x);
  const P = SHEETS['PRIZE CALCULATIONS'].g;
  const ph = P.findIndex(r => String(r[0]).trim() === 'EXHIBITOR #');
  const head = P[ph];
  const idx = n => head.indexOf(n);
  console.log('  ' + 'EXHIBITOR'.padEnd(26) + 'WON'.padStart(9) + 'DONATED'.padStart(10) +
              'FEE'.padStart(8) + 'NET'.padStart(10));
  let anyRow = false;
  P.slice(ph+1).forEach(r => {
    if (!/^HF2026-/.test(String(r[0]).trim())) return;
    anyRow = true;
    const net = Number(r[idx('NET CHEQUE ($)')] || 0);
    console.log('  ' + String(r[idx('EXHIBITOR NAME')]).padEnd(26) +
      money(r[idx('TOTAL PRIZES ($)')]).padStart(9) +
      money(r[idx('TOTAL DONATED ($)')]).padStart(10) +
      money(r[idx('MEMBERSHIP FEE ($)')]).padStart(8) +
      (net > 0 ? C.g : C.dim) + money(net).padStart(10) + C.x +
      (String(r[idx('NOTES')]||'') ? '   ' + C.dim + r[idx('NOTES')] + C.x : ''));
  });
  if (!anyRow) console.log(C.dim + '  (nothing — no placings recorded)' + C.x);

  console.log('\n' + C.b + 'CHEQUE REGISTER' + C.x);
  const Q = SHEETS['CHEQUE REGISTER'].g;
  const qh = Q.findIndex(r => String(r[0]).trim() === 'CHEQUE #');
  let n = 0, total = 0;
  Q.slice(qh+1).forEach(r => {
    if (!String(r[0]).trim()) return;
    n++; total += Number(r[6] || 0);
    console.log('  #' + String(r[0]).padEnd(4) + String(r[2]).padEnd(26) + money(r[6]).padStart(10));
  });
  if (!n) console.log(C.dim + '  (no cheques)' + C.x);
  else console.log('  ' + C.dim + '─'.repeat(40) + C.x + '\n  ' + ''.padEnd(30) + C.b + money(total).padStart(10) + C.x);

  console.log('\n' + C.b + '── 4. Verify ──' + C.x);
  const rep = HF_verify();
  rep.split('\n').forEach(l => {
    if (!l.trim()) return;
    console.log('  ' + (l.startsWith('❌') ? C.r + l + C.x : l.startsWith('✅') ? C.g + l + C.x : l));
  });
  QUIET = true;
  console.log('');
}

/* ---- the prompt ---- */
console.log('\n' + C.b + 'Havelock Fair — fair-day simulator' + C.x);
console.log(C.dim + entries.length + ' judgeable entries built from ' +
            (SHEETS['REGISTRATIONS'].g.length - 2) + ' registration rows.' + C.x);
console.log(C.dim + 'Nothing here touches the live workbook.' + C.x);
// The fixture carries two deliberate deviations from live data, both there to
// keep test branches covered. Say so, so a number is never quietly misread.
console.log(C.y + '\n  Two fixture quirks, so you are not misled:' + C.x);
console.log(C.dim + '  · Claudia Deschamps is flagged Under 13 here (she is not, live) — it is' +
            '\n    how the suite tests the fee waiver. Live, she pays the $15.' +
            '\n  · E1009 is a synthetic rider (Pat Tremblay). Live, E1009 is Sarah Kobel, 4-H.' +
            '\n    Both are position-only, so the behaviour you see is the same.' + C.x);
console.log('\n  ' + C.c + 'E1001 1st' + C.x + '   award a placing        ' +
            C.c + 'list' + C.x + '    every entry (or: list 14)');
console.log('  ' + C.c + 'run' + C.x + '         price it + cheques     ' +
            C.c + 'who E1001' + C.x + '  what is this entry');
console.log('  ' + C.c + 'undo' + C.x + '        remove the last        ' +
            C.c + 'clear' + C.x + '     start over        ' + C.c + 'quit' + C.x + '\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '› ' });
rl.prompt();
rl.on('line', line => {
  const t = line.trim();
  if (!t) return rl.prompt();
  const [cmd, ...rest] = t.split(/\s+/);
  const lc = cmd.toLowerCase();

  if (lc === 'quit' || lc === 'exit' || lc === 'q') return rl.close();
  if (lc === 'list')  { listEntries(rest[0]); return rl.prompt(); }
  if (lc === 'clear') { awarded.length = 0; console.log(C.y + '  cleared' + C.x + '\n'); return rl.prompt(); }
  if (lc === 'undo')  {
    const g = awarded.pop();
    console.log(g ? C.y + '  removed ' + g.id + ' ' + g.placing + C.x + '\n' : C.dim + '  nothing to undo\n' + C.x);
    return rl.prompt();
  }
  if (lc === 'run')   { run(); return rl.prompt(); }
  if (lc === 'who')   {
    const r = byId[(rest[0]||'').toUpperCase()];
    if (!r) { console.log(C.r + '  no such entry' + C.x + '\n'); return rl.prompt(); }
    const d = describe(r);
    console.log('\n  ' + C.b + d.id + C.x + '  ' + d.who + '  ' + C.dim + '(' + d.ex + ')' + C.x);
    console.log('  ' + d.clsName + ' · ' + d.sec);
    console.log('  ' + (d.positionOnly
      ? C.y + 'position only — records a placing but never gets a cheque' + C.x
      : C.dim + d.prizes.map((v,i)=>PLACINGS[i]+' '+money(v)).join('   ') + C.x) + '\n');
    return rl.prompt();
  }

  // "E1001 1st"
  const id = cmd.toUpperCase();
  const placing = (rest[0] || '').toLowerCase();
  if (!byId[id]) {
    console.log(C.r + '  no entry ' + id + C.x + C.dim + '  (try: list)' + C.x + '\n');
    return rl.prompt();
  }
  if (!PLACINGS.includes(placing)) {
    console.log(C.r + '  placing must be one of: ' + PLACINGS.join(', ') + C.x + '\n');
    return rl.prompt();
  }
  const d = describe(byId[id]);
  // Warn on the mistake that is invisible on a printed sheet.
  const clash = awarded.find(a => {
    const o = describe(byId[a.id]);
    return a.placing === placing && o.clsName === d.clsName && o.sec === d.sec;
  });
  const dup = awarded.find(a => a.id === id);
  if (dup) { dup.placing = placing; console.log(C.y + '  updated ' + id + ' → ' + placing + C.x); }
  else { awarded.push({ id, placing }); console.log('  ' + C.g + id + ' ' + placing + C.x + '  ' + d.who + C.dim + ' · ' + d.sec + C.x); }
  if (clash && !dup) {
    console.log('  ' + C.r + '⚠ ' + clash.id + ' already has ' + placing + ' in this same section' + C.x);
  }
  if (d.positionOnly) console.log('  ' + C.dim + '(position only — no prize money)' + C.x);
  console.log('');
  rl.prompt();
});
rl.on('close', () => { console.log('\n' + C.dim + 'bye' + C.x + '\n'); process.exit(0); });
