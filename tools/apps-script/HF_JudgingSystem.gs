/**
 * HAVELOCK FAIR 2026 — JUDGING, PLACINGS & PRIZE MONEY
 * =====================================================================
 * Paste this as a NEW file in the "Havelock Fair Registration" Apps Script
 * project (admin@havelockfair.ca). It does NOT touch doGet/doPost — the
 * registration backend keeps working exactly as it does now.
 *
 * WHAT IT DOES
 *   REGISTRATIONS  ->  ENTRIES          one row per judgeable entry
 *   ENTRIES        ->  JUDGING SHEETS   printable, for fair day
 *   RESULTS        ->  PRIZE CALCULATIONS -> CHEQUE REGISTER
 *
 * THE ONE RULE THAT MATTERS
 *   A judgeable entry is ONE (division x section) pair.
 *   2 breeds x 2 sections = 4 entries.  (Ruling: Jesse, 2026-08-22.)
 *
 * HOW FAIR DAY WORKS
 *   Judges write ENTRY # and PLACING. That is all. Everything else —
 *   class, division, section, prize tier, dollar amount — is looked up
 *   from ENTRY #, so a placing cannot be attached to the wrong prize.
 *
 * ORDER OF OPERATIONS
 *   1. HF_buildEntries()        after registrations close / any time
 *   2. HF_makeJudgingSheets()   print for the judges
 *   3. ...judging happens, someone types ENTRY # + PLACING into RESULTS...
 *   4. HF_calculatePrizes()     fills RESULTS, PRIZE CALCULATIONS, CHEQUE REGISTER
 *   5. HF_verify()              penny reconciliation — run before cheques
 *
 * SAFETY
 *   Nothing here ever writes to REGISTRATIONS. HF_buildEntries() rebuilds
 *   the ENTRIES tab from scratch each run, which is safe because ENTRIES is
 *   derived data. It refuses to run if RESULTS already has placings, so you
 *   cannot renumber entries out from under recorded results.
 */

var HF_WORKBOOK_ID = '1TBxMBM4RSyqDDTxuTiAyxWhOiRvyNfxMzK4LgXqFID0';

var HF_TABS = {
  registrations: 'REGISTRATIONS',
  sections:      'SECTIONS',
  entries:       'ENTRIES',
  results:       'RESULTS',
  prizeCalc:     'PRIZE CALCULATIONS',
  cheques:       'CHEQUE REGISTER',
  judging:       'JUDGING SHEETS',
  judgingEntry:  'JUDGING ENTRY'
};

var HF_MEMBERSHIP_FEE = 15;   // 13+ — deducted from winnings
var HF_NO_PRIZE_TIER  = 'NO PRIZE — POSITION ONLY';   // 4-H + Equestrian

function hfBook_()  { return SpreadsheetApp.openById(HF_WORKBOOK_ID); }
function hfSheet_(name, createIfMissing) {
  var ss = hfBook_(), sh = ss.getSheetByName(name);
  if (!sh && createIfMissing) sh = ss.insertSheet(name);
  if (!sh) throw new Error('Tab not found: ' + name);
  return sh;
}
function hfNum_(v) {
  if (v === '' || v === null || v === undefined) return 0;
  var n = Number(hfStr_(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function hfNorm_(s) {
  return hfStr_(s)
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
/** Never let a null/undefined cell become the string "undefined". */
function hfStr_(v) { return (v === null || v === undefined) ? '' : String(v); }

/** Join several pipe-separated section columns into one pipe-separated list,
 *  dropping the empties. The Equestrian form fills "Show Sections" and
 *  "Gymkhana Sections" independently and a rider may enter either or both. */
function hfJoinSections_(/* ...columns */) {
  var parts = [];
  for (var i = 0; i < arguments.length; i++) {
    hfStr_(arguments[i]).split('|').forEach(function (s) {
      if (s.trim()) parts.push(s.trim());
    });
  }
  return parts.join(' | ');
}

/** Header row differs per tab (most have a merged banner on row 1).
 *  Matching must be on EXACT cell names, not a substring of the joined row:
 *  the RESULTS banner reads "Judging Results & Placings 2026", which contains
 *  "placing" and would otherwise be mistaken for the header. Require at least
 *  two exact column-name hits. */
function hfReadTable_(sheetName, expectedCols) {
  var sh = hfSheet_(sheetName), values = sh.getDataRange().getValues();
  var want = {};
  expectedCols.forEach(function (c) { want[String(c).trim().toLowerCase()] = 1; });
  var hdr = -1, best = 0;
  for (var i = 0; i < Math.min(values.length, 10); i++) {
    var hits = 0;
    for (var c = 0; c < values[i].length; c++) {
      if (want[hfStr_(values[i][c]).trim().toLowerCase()]) hits++;
    }
    if (hits > best && hits >= Math.min(2, expectedCols.length)) { best = hits; hdr = i; }
  }
  if (hdr === -1) throw new Error('Could not find header row in ' + sheetName +
                                  ' (expected columns: ' + expectedCols.join(', ') + ')');
  var cols = values[hdr].map(function (c) { return hfStr_(c).trim(); });
  var rows = [];
  for (var r = hdr + 1; r < values.length; r++) {
    var obj = {}, blank = true;
    for (var c = 0; c < cols.length; c++) {
      if (!cols[c]) continue;
      obj[cols[c]] = values[r][c];
      if (hfStr_(values[r][c]).trim() !== '') blank = false;
    }
    if (!blank) { obj.__row = r + 1; rows.push(obj); }
  }
  return { sheet: sh, headerRow: hdr + 1, cols: cols, rows: rows };
}

/* ===================================================================
 *  0. SCHEMA UPGRADE + PATCH CHECK
 *  Run HF_upgradeRegistrationsSchema() ONCE. It appends the six new column
 *  headers to REGISTRATIONS so you do not have to hand-edit the HEADERS array
 *  in Code.gs. Appending only — existing 43-column rows keep their alignment.
 * =================================================================== */

var HF_NEW_COLUMNS = ['Street Address', 'Apt / Unit', 'City', 'Province', 'Postal Code', 'Under 13?'];

function HF_upgradeRegistrationsSchema() {
  var sh = hfSheet_(HF_TABS.registrations);
  var lastCol = Math.max(1, sh.getLastColumn());
  var hdr = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (c) { return hfStr_(c).trim(); });

  var missing = HF_NEW_COLUMNS.filter(function (c) { return hdr.indexOf(c) === -1; });
  if (!missing.length) {
    var msg0 = 'Schema already current — all ' + HF_NEW_COLUMNS.length + ' columns present. Nothing to do.';
    Logger.log(msg0); return msg0;
  }
  sh.getRange(1, lastCol + 1, 1, missing.length).setValues([missing])
    .setBackground('#1a2744').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);

  var msg = 'Appended ' + missing.length + ' column(s) to REGISTRATIONS: ' + missing.join(', ') +
            '.  Existing rows are untouched and still aligned.';
  Logger.log(msg);
  return msg;
}

/** Non-destructive. Tells you whether the Code.gs patch is actually working. */
function HF_checkPatch() {
  var out = [], ok = true;
  var t = hfReadTable_(HF_TABS.registrations, ['Exhibitor ID', 'Form Type', 'Class ID', 'Sections']);

  var present = HF_NEW_COLUMNS.filter(function (c) { return t.cols.indexOf(c) !== -1; });
  var missing = HF_NEW_COLUMNS.filter(function (c) { return t.cols.indexOf(c) === -1; });
  if (missing.length) {
    ok = false;
    out.push('❌ REGISTRATIONS is missing: ' + missing.join(', '));
    out.push('   -> run HF_upgradeRegistrationsSchema() first.');
  } else {
    out.push('✅ all six columns exist on REGISTRATIONS');
  }

  // Has anything actually landed in them?
  var filled = 0, rowsWithAddress = 0;
  t.rows.forEach(function (r) {
    if (hfStr_(r['Street Address']).trim() || hfStr_(r['Under 13?']).trim()) filled++;
    if (hfStr_(r['Address']).trim()) rowsWithAddress++;
  });
  out.push((filled ? '✅ ' : '⚠️ ') + filled + ' of ' + t.rows.length +
           ' row(s) carry the new granular values');
  if (!filled && present.length === HF_NEW_COLUMNS.length) {
    ok = false;
    out.push('   The columns exist but nothing is landing in them. That means');
    out.push('   Code.gs has NOT been patched yet (edits 2 and 3 in');
    out.push('   CODEGS_PATCH_2026-08-22.md), or no registration has arrived since.');
    out.push('   Submit one test registration from the live form to confirm.');
  }
  out.push('ℹ️ ' + rowsWithAddress + ' row(s) have the one-line Address — that keeps');
  out.push('   working regardless, so no mailing address is ever lost.');

  var report = (ok ? '✅ PATCH LOOKS GOOD\n\n' : '⚠️ ACTION NEEDED\n\n') + out.join('\n');
  Logger.log(report);
  try { SpreadsheetApp.getUi().alert(report); } catch (e) {}
  return report;
}

/* ===================================================================
 *  1. REGISTRATIONS  ->  ENTRIES
 * =================================================================== */

var HF_ENTRY_HEADERS = [
  'ENTRY #', 'EXHIBITOR #', 'EXHIBITOR NAME', 'FORM TYPE',
  'CLASS #', 'CLASS NAME', 'DIVISION', 'SECTION CODE', 'SECTION DESCRIPTION',
  'PRIZE TIER', '1ST ($)', '2ND ($)', '3RD ($)', '4TH ($)',
  'ANIMAL NAME', 'REG # / ATQ #', 'ANIMAL DOB', 'SEX', 'DATE OF POSSESSION',
  'EMAIL', 'PHONE', 'SOURCE ROW', 'JOINED BY', 'FLAG'
];

function hfSectionIndex_() {
  var t = hfReadTable_(HF_TABS.sections, ['CLASS #', 'SECTION CODE', 'SECTION DESCRIPTION', 'PRIZE TIER']);
  var byCode = {}, byDesc = {};
  t.rows.forEach(function (r) {
    var cls = hfNum_(r['CLASS #']);
    if (!cls) return;
    var code = hfStr_(r['SECTION CODE']).trim();
    var rec = {
      cls: cls, className: r['CLASS NAME'], division: r['DIVISION'] || '',
      code: code, desc: r['SECTION DESCRIPTION'], tier: r['PRIZE TIER'],
      p1: hfNum_(r['1ST ($)']), p2: hfNum_(r['2ND ($)']),
      p3: hfNum_(r['3RD ($)']), p4: hfNum_(r['4TH ($)'])
    };
    (byCode[cls + '|' + code] = byCode[cls + '|' + code] || []).push(rec);
    var dk = cls + '|' + hfNorm_(r['SECTION DESCRIPTION']);
    (byDesc[dk] = byDesc[dk] || []).push(rec);
  });
  return { byCode: byCode, byDesc: byDesc };
}

/** Join a submitted section string to its SECTIONS row(s).
 *  Primary key is the leading code; description is the fallback, which is
 *  what rescues Class 17 "39" against the workbook's "38b". */
function hfResolveSection_(idx, cls, raw) {
  var m = hfStr_(raw).match(/^\s*([0-9]+[a-z]?)\s*[.\-]\s*(.+)$/i);
  var code = m ? m[1] : null, desc = m ? m[2] : raw;
  if (code && idx.byCode[cls + '|' + code]) return { hits: idx.byCode[cls + '|' + code], how: 'code' };
  var d = idx.byDesc[cls + '|' + hfNorm_(desc)];
  if (d) return { hits: d, how: 'description' };
  return { hits: [], how: 'UNRESOLVED' };
}

/** Several candidates -> the exhibitor's chosen division decides. */
function hfPickDivision_(hits, chosen) {
  if (hits.length === 1) return hits[0];
  if (!chosen) return null;
  var letter = hfStr_(chosen).trim().charAt(0).toUpperCase();
  for (var i = 0; i < hits.length; i++) {
    var dv = hfStr_(hits[i].division);
    if (hfNorm_(dv) === hfNorm_(chosen)) return hits[i];
    if (letter && new RegExp('^\\s*' + letter + '\\s*[.\\-]').test(dv)) return hits[i];
  }
  return null;
}

function HF_buildEntries() {
  // Refuse to renumber entries if any placing has been recorded — renumbering
  // would silently re-point it at a different exhibit.
  var existing = 0;
  try {
    var res = hfReadTable_(HF_TABS.results, ['RESULT #', 'ENTRY #', 'PLACING', 'FINAL PRIZE ($)']);
    existing = res.rows.filter(function (r) { return hfStr_(r['PLACING']).trim() !== ''; }).length;
  } catch (e) { /* RESULTS may be untouched */ }

  // Picks can also sit in JUDGING ENTRY without having been synced to RESULTS
  // yet — a morning of judging with nothing in RESULTS at all. Counting only
  // RESULTS would let a rebuild renumber straight through it.
  var picks = 0;
  try { picks = hfjeCountPicks_(); } catch (e) { /* tab may not exist */ }

  if (existing > 0 || picks > 0) {
    var what = [];
    if (existing) what.push('RESULTS holds ' + existing + ' placing(s)');
    if (picks)    what.push('JUDGING ENTRY holds ' + picks + ' un-synced pick(s)');
    throw new Error(what.join(' and ') + '. Rebuilding ENTRIES would renumber them. ' +
                    'Clear them first, or edit ENTRIES by hand.');
  }

  var idx  = hfSectionIndex_();
  var regs = hfReadTable_(HF_TABS.registrations, ['Exhibitor ID', 'Form Type', 'Class ID', 'Sections']);
  var out = [], flags = [], n = 1000;

  regs.rows.forEach(function (r) {
    var ft = hfStr_(r['Form Type']).trim();
    // The live backend writes "4-H" into REGISTRATIONS; older test data used "4H".
    var ftNorm = (ft === '4-H') ? '4H' : ft;
    var rawClass, rawSections, rawDiv;
    if (ftNorm === 'Youth')           { rawClass = r['Youth Class'];  rawSections = r['Youth Sections']; rawDiv = ''; }
    else if (ftNorm === '4H')         { rawClass = '';                rawSections = r['4-H Section'];    rawDiv = r['4-H Breed']; }
    // The Equestrian form posts TWO independent section fields — showSections and
    // gymkhana — into two columns. A rider may enter either, or both. Reading only
    // "Show Sections" silently dropped every gymkhana-only rider (HF2026-1018 had
    // all three of her events there and produced one "(no section recorded)" entry).
    else if (ftNorm === 'Equestrian') { rawClass = '';                rawSections = hfJoinSections_(r['Show Sections'], r['Gymkhana Sections']); rawDiv = ''; }
    else                          { rawClass = r['Class ID'];     rawSections = r['Sections'];       rawDiv = r['Breed(s)']; }

    var name = hfStr_(r['First Name']).trim() + ' ' + hfStr_(r['Last Name']).trim();
    var cls  = hfNum_(rawClass);

    if (ftNorm === '4H' || ftNorm === 'Equestrian') {
      // Ruling (Jesse, 2026-08-22): 4-H and Equestrian are a separate thing from
      // the exhibition classes. They win NO prize money — we only log the
      // position — so they need no SECTIONS rows and no prize table. They still
      // get ENTRY #s so placings can be recorded the same way as everything else.
      var evSections = hfStr_(rawSections).split('|')
        .map(function (x) { return x.trim(); }).filter(String);
      // A position-only registrant with no events at all is a real problem, not a
      // row to paper over: they would otherwise get an ENTRY # reading
      // "(no section recorded)" and appear on no judging sheet anyone can use.
      if (!evSections.length) {
        flags.push([r['Exhibitor ID'], name.trim(), ft,
                    'No events recorded on this ' + (ftNorm === '4H' ? '4-H' : 'Equestrian') + ' registration']);
        return;
      }
      evSections.forEach(function (raw) {
        var m = hfStr_(raw).match(/^\s*([0-9]+[a-z]?)\s*[.\-]\s*(.+)$/i);
        n++;
        out.push([
          'E' + n, r['Exhibitor ID'], name.trim(), ft,
          '', ftNorm === '4H' ? '4-H' : 'Equestrian & Gymkhana',
          hfStr_(rawDiv).trim(), m ? m[1] : '', m ? m[2] : raw,
          HF_NO_PRIZE_TIER, 0, 0, 0, 0,
          r['Animal Name (4-H)'] || r['Horse/Pony Name'] || '',
          r['ATQ # (4-H)'] || '', '', '', '',
          r['Email'] || '', r['Phone'] || '',
          r.__row, 'position only', 'No prize money — position logged only'
        ]);
      });
      return;
    }

    if (!cls) {
      flags.push([r['Exhibitor ID'], name.trim(), ft, 'No class recorded on this row']);
      return;
    }

    var sections = hfStr_(rawSections).split('|')
      .map(function (s) { return s.trim(); }).filter(String);
    var divisions = hfStr_(rawDiv).split(',')
      .map(function (s) { return s.trim(); }).filter(String);

    if (!sections.length) {
      flags.push([r['Exhibitor ID'], name.trim(), ft, 'Class ' + cls + ' but no sections recorded']);
      return;
    }

    sections.forEach(function (raw) {
      var r2 = hfResolveSection_(idx, cls, raw);
      if (!r2.hits.length) {
        flags.push([r['Exhibitor ID'], name.trim(), ft, 'Class ' + cls + ': cannot resolve section "' + raw + '"']);
        return;
      }
      var divs = divisions.length ? divisions : [null];
      divs.forEach(function (dv) {
        var hit = r2.hits.length === 1 ? r2.hits[0] : hfPickDivision_(r2.hits, dv);
        if (!hit) {
          flags.push([r['Exhibitor ID'], name.trim(), ft,
                      'Class ' + cls + ' section "' + raw + '": ' + r2.hits.length +
                      ' divisions and the exhibitor named none — AMBIGUOUS, assign by hand']);
          return;
        }
        n++;
        out.push([
          'E' + n, r['Exhibitor ID'], name.trim(), ft || 'General',
          hit.cls, hit.className, hit.division, hit.code, hit.desc,
          hit.tier, hit.p1, hit.p2, hit.p3, hit.p4,
          r['Animal Name'] || '', r['Reg # / ATQ #'] || '', r['Animal DOB'] || '',
          r['Sex'] || '', r['Date of Possession'] || '',
          r['Email'] || '', r['Phone'] || '',
          r.__row, r2.how, ''
        ]);
      });
    });
  });

  var sh = hfSheet_(HF_TABS.entries, true);
  sh.clear();
  sh.getRange(1, 1, 1, HF_ENTRY_HEADERS.length).setValues([HF_ENTRY_HEADERS])
    .setBackground('#1a2744').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
  sh.setFrozenRows(1);
  if (out.length) sh.getRange(2, 1, out.length, HF_ENTRY_HEADERS.length).setValues(out);

  if (flags.length) {
    var fr = out.length + 3;
    sh.getRange(fr, 1, 1, 4).setValues([['⚠ NEEDS ATTENTION', 'NAME', 'FORM TYPE', 'PROBLEM']])
      .setBackground('#8a1c1c').setFontColor('#ffffff').setFontWeight('bold');
    sh.getRange(fr + 1, 1, flags.length, 4).setValues(flags);
  }
  sh.autoResizeColumns(1, HF_ENTRY_HEADERS.length);

  var msg = 'ENTRIES rebuilt: ' + out.length + ' judgeable entries from ' +
            regs.rows.length + ' registration rows.' +
            (flags.length ? '  ⚠ ' + flags.length + ' row(s) need attention — see the red block.' : '  No problems.');
  Logger.log(msg);
  return msg;
}

/* ===================================================================
 *  2. PRINTABLE JUDGING SHEETS
 * =================================================================== */

function HF_makeJudgingSheets() {
  var t = hfReadTable_(HF_TABS.entries, ['ENTRY #', 'EXHIBITOR #', 'SECTION CODE', 'PRIZE TIER']);
  var groups = {}, order = [];
  t.rows.forEach(function (e) {
    if (!e['ENTRY #']) return;
    var k = [e['CLASS #'], e['DIVISION'], e['SECTION CODE']].join('||');
    if (!groups[k]) { groups[k] = []; order.push(k); }
    groups[k].push(e);
  });
  order.sort(function (a, b) {
    var A = a.split('||'), B = b.split('||');
    return (hfNum_(A[0]) - hfNum_(B[0])) || String(A[1]).localeCompare(String(B[1])) ||
           (hfNum_(A[2]) - hfNum_(B[2]));
  });

  var rows = [['CLASS', 'DIVISION', 'SECTION', 'ENTRY #', 'EXHIBITOR', 'ANIMAL / ATQ',
               'PLACING (write here)', '1ST', '2ND', '3RD', '4TH']];
  order.forEach(function (k) {
    var g = groups[k], h = g[0];
    rows.push(['', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Class ' + h['CLASS #'] + ' — ' + h['CLASS NAME'],
               h['DIVISION'] || '', 'Sec ' + h['SECTION CODE'] + ': ' + h['SECTION DESCRIPTION'],
               '', '', '', '', h['1ST ($)'], h['2ND ($)'], h['3RD ($)'], h['4TH ($)']]);
    g.forEach(function (e) {
      rows.push(['', '', '', e['ENTRY #'], e['EXHIBITOR NAME'],
                 [e['ANIMAL NAME'], e['REG # / ATQ #']].filter(String).join(' / '),
                 '', '', '', '', '']);
    });
  });

  var sh = hfSheet_(HF_TABS.judging, true);
  sh.clear();
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.getRange(1, 1, 1, rows[0].length).setBackground('#1a2744').setFontColor('#ffffff').setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, rows[0].length);
  var msg = 'JUDGING SHEETS built: ' + order.length + ' section(s), ' + (rows.length - 1) + ' printed lines.';
  Logger.log(msg);
  return msg;
}

/* ===================================================================
 *  3. RESULTS -> PRIZE CALCULATIONS -> CHEQUE REGISTER
 * =================================================================== */

function hfPlacingToAmount_(entry, placing) {
  var p = hfStr_(placing).trim().toLowerCase().replace(/[^0-9a-z]/g, '');
  var map = { '1': 'p1', '1st': 'p1', 'first': 'p1',
              '2': 'p2', '2nd': 'p2', 'second': 'p2',
              '3': 'p3', '3rd': 'p3', 'third': 'p3',
              '4': 'p4', '4th': 'p4', 'fourth': 'p4' };
  if (hfStr_(entry['PRIZE TIER']) === HF_NO_PRIZE_TIER) return 0;   // 4-H / Equestrian: position only
  var key = map[p];
  if (!key) return null;                       // HM / DQ / blank -> no money
  return hfNum_(entry[{ p1: '1ST ($)', p2: '2ND ($)', p3: '3RD ($)', p4: '4TH ($)' }[key]]);
}

/** Under-13 status per exhibitor, resolved once from REGISTRATIONS.
 *  Priority: the "Under 13?" checkbox column -> Youth Class 26 ("12 & under")
 *  -> a Youth DOB that puts them under 13 on fair day -> otherwise 13+. */
var HF__u13cache = null;
function hfIsUnder13_(exhibitorId) {
  if (!HF__u13cache) {
    HF__u13cache = {};
    var t = hfReadTable_(HF_TABS.registrations, ['Exhibitor ID', 'Form Type', 'Class ID', 'Sections']);
    t.rows.forEach(function (r) {
      var id = hfStr_(r['Exhibitor ID']).trim();
      if (!id || HF__u13cache[id]) return;
      var flag = hfStr_(r['Under 13?']).trim().toLowerCase();
      if (flag === 'yes' || flag === 'y' || flag === 'true' || flag === 'oui') { HF__u13cache[id] = true; return; }
      if (flag === 'no'  || flag === 'n' || flag === 'false' || flag === 'non') { HF__u13cache[id] = false; return; }
      if (hfStr_(r['Form Type']).trim() === 'Youth') {
        var yc = hfStr_(r['Youth Class']).trim();
        if (yc === '26') { HF__u13cache[id] = true;  return; }
        if (yc === '27') { HF__u13cache[id] = false; return; }
        var dob = r['Youth DOB'];
        if (dob) {
          var d = (dob instanceof Date) ? dob : new Date(dob);
          if (!isNaN(d.getTime())) {
            var fair = new Date(2026, 8, 12);          // 12 Sept 2026
            var age = fair.getFullYear() - d.getFullYear();
            var m = fair.getMonth() - d.getMonth();
            if (m < 0 || (m === 0 && fair.getDate() < d.getDate())) age--;
            HF__u13cache[id] = age < 13;
            return;
          }
        }
      }
      HF__u13cache[id] = false;
    });
  }
  return !!HF__u13cache[hfStr_(exhibitorId).trim()];
}

function HF_calculatePrizes() {
  var ent = hfReadTable_(HF_TABS.entries, ['ENTRY #', 'EXHIBITOR #', 'SECTION CODE', 'PRIZE TIER']);
  var byEntry = {};
  ent.rows.forEach(function (e) { if (e['ENTRY #']) byEntry[hfStr_(e['ENTRY #']).trim()] = e; });

  var res = hfReadTable_(HF_TABS.results, ['RESULT #', 'ENTRY #', 'PLACING', 'FINAL PRIZE ($)']);
  var sh  = res.sheet;
  var col = {}; res.cols.forEach(function (c, i) { if (c) col[c] = i + 1; });

  var perExhibitor = {}, unknown = [], priced = 0;

  res.rows.forEach(function (r) {
    var id = hfStr_(r['ENTRY #']).trim();
    if (!id) return;
    var e = byEntry[id];
    if (!e) { unknown.push(id); return; }

    var amount = hfPlacingToAmount_(e, r['PLACING']);
    var donated = hfNum_(r['DONATION AMOUNT ($)']);
    var isDonated = /^(y|yes|true|1|oui)$/i.test(hfStr_(r['DONATED?']).trim());
    if (isDonated && !donated && amount !== null) donated = amount;
    var finalPrize = Math.max(0, (amount || 0) - donated);

    // Backfill the descriptive columns so RESULTS is self-explanatory,
    // and so a placing can never be read against the wrong section.
    function put(name, val) { if (col[name]) sh.getRange(r.__row, col[name]).setValue(val); }
    put('EXHIBITOR #',        e['EXHIBITOR #']);
    put('CLASS #',            e['CLASS #']);
    put('SECTION CODE',       e['SECTION CODE']);
    put('PRIZE TIER',         e['PRIZE TIER']);
    put('PRIZE AMOUNT ($)',   amount === null ? 0 : amount);
    put('DONATION AMOUNT ($)', donated);
    put('FINAL PRIZE ($)',    finalPrize);
    priced++;

    var ex = hfStr_(e['EXHIBITOR #']).trim();
    if (!perExhibitor[ex]) {
      perExhibitor[ex] = { name: e['EXHIBITOR NAME'], total: 0, donated: 0,
                           under13: hfIsUnder13_(e['EXHIBITOR #']) };
    }
    perExhibitor[ex].total   += (amount || 0);
    perExhibitor[ex].donated += donated;
  });

  // ---- PRIZE CALCULATIONS
  var calcRows = [];
  Object.keys(perExhibitor).sort().forEach(function (ex) {
    var p = perExhibitor[ex];
    // Membership: $15 for 13 and over, waived for under-13s. Source of truth is
    // the "Under 13?" column the form now fills. Youth Class 26 is "12 & under"
    // and Class 27 is "13-17", so youth rows resolve even without the checkbox.
    var fee = p.under13 ? 0 : HF_MEMBERSHIP_FEE;
    var net = p.total - p.donated - fee;
    calcRows.push([ex, p.name, p.total, p.donated, fee, '', '', Math.max(0, net), '',
                   p.under13 ? 'Under 13 — no membership fee' : '']);
  });

  var cs = hfSheet_(HF_TABS.prizeCalc);
  var ct = hfReadTable_(HF_TABS.prizeCalc, ['EXHIBITOR #', 'EXHIBITOR NAME', 'TOTAL PRIZES ($)', 'NET CHEQUE ($)']);
  if (ct.rows.length) cs.getRange(ct.headerRow + 1, 1, ct.rows.length + 5, 10).clearContent();
  if (calcRows.length) cs.getRange(ct.headerRow + 1, 1, calcRows.length, 10).setValues(calcRows);

  // ---- CHEQUE REGISTER
  var chq = [], num = 1;
  calcRows.forEach(function (row) {
    if (hfNum_(row[7]) <= 0) return;
    chq.push([num++, row[0], row[1], '', '', '', hfNum_(row[7]), '', 'Havelock Fair 2026 prize money']);
  });
  var qs = hfSheet_(HF_TABS.cheques);
  var qt = hfReadTable_(HF_TABS.cheques, ['CHEQUE #', 'EXHIBITOR #', 'AMOUNT ($)']);
  if (qt.rows.length) qs.getRange(qt.headerRow + 1, 1, qt.rows.length + 5, 9).clearContent();
  if (chq.length) qs.getRange(qt.headerRow + 1, 1, chq.length, 9).setValues(chq);

  var msg = 'Priced ' + priced + ' result(s) across ' + calcRows.length + ' exhibitor(s); ' +
            chq.length + ' cheque(s) to issue.' +
            (unknown.length ? '  ⚠ UNKNOWN ENTRY #: ' + unknown.join(', ') : '');
  Logger.log(msg);
  return msg;
}

/* ===================================================================
 *  4. RECONCILIATION — run before any cheque is written
 * =================================================================== */

function HF_verify() {
  var out = [], ok = true;
  function line(pass, text) { ok = ok && pass; out.push((pass ? '✅ ' : '❌ ') + text); }

  var ent = hfReadTable_(HF_TABS.entries, ['ENTRY #', 'EXHIBITOR #', 'SECTION CODE', 'PRIZE TIER']);
  var ids = {}, dupes = [];
  ent.rows.forEach(function (e) {
    var id = hfStr_(e['ENTRY #']).trim();
    // The ⚠ NEEDS ATTENTION block lives in the same sheet below the entries, and
    // its first column holds the banner and then flagged EXHIBITOR IDs. Counting
    // those as entries inflated the total, and a flagged exhibitor appearing twice
    // would have failed the uniqueness check that gates cheque writing.
    if (!/^E\d+$/.test(id)) return;
    if (ids[id]) dupes.push(id); else ids[id] = 1;
  });
  line(dupes.length === 0, 'ENTRY # unique (' + Object.keys(ids).length + ' entries' +
       (dupes.length ? ', DUPLICATES: ' + dupes.join(',') : '') + ')');

  var res = hfReadTable_(HF_TABS.results, ['RESULT #', 'ENTRY #', 'PLACING', 'FINAL PRIZE ($)']);
  var orphan = [], resTotal = 0, placed = 0;
  res.rows.forEach(function (r) {
    var id = hfStr_(r['ENTRY #']).trim();
    if (!id) return;
    if (!ids[id]) orphan.push(id);
    if (hfStr_(r['PLACING']).trim() !== '') placed++;
    resTotal += hfNum_(r['FINAL PRIZE ($)']);
  });
  line(orphan.length === 0, 'every RESULTS row points at a real ENTRY #' +
       (orphan.length ? ' — ORPHANS: ' + orphan.join(',') : ''));
  line(true, placed + ' placing(s) recorded');

  var calc = hfReadTable_(HF_TABS.prizeCalc, ['EXHIBITOR #', 'EXHIBITOR NAME', 'TOTAL PRIZES ($)', 'NET CHEQUE ($)']);
  var calcTotal = 0, calcNet = 0;
  calc.rows.forEach(function (r) {
    calcTotal += hfNum_(r['TOTAL PRIZES ($)']) - hfNum_(r['TOTAL DONATED ($)']);
    calcNet   += hfNum_(r['NET CHEQUE ($)']);
  });
  line(Math.abs(resTotal - calcTotal) < 0.005,
       'RESULTS final prizes ($' + resTotal.toFixed(2) + ') = PRIZE CALCULATIONS after donations ($' + calcTotal.toFixed(2) + ')');

  var chq = hfReadTable_(HF_TABS.cheques, ['CHEQUE #', 'EXHIBITOR #', 'AMOUNT ($)']);
  var chqTotal = 0;
  chq.rows.forEach(function (r) { chqTotal += hfNum_(r['AMOUNT ($)']); });
  line(Math.abs(chqTotal - calcNet) < 0.005,
       'CHEQUE REGISTER ($' + chqTotal.toFixed(2) + ') = sum of NET CHEQUE ($' + calcNet.toFixed(2) + ')');

  var report = (ok ? '✅ ALL CHECKS PASSED — safe to write cheques\n\n' : '❌ DO NOT WRITE CHEQUES YET\n\n') + out.join('\n');
  Logger.log(report);
  try { SpreadsheetApp.getUi().alert(report); } catch (e) { /* not run from the UI */ }
  return report;
}

/* ===================================================================
 *  Menu
 * =================================================================== */

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('🏆 Havelock Fair')
      .addItem('0. Upgrade REGISTRATIONS schema (once)', 'HF_upgradeRegistrationsSchema')
      .addItem('0b. Check the Code.gs patch',            'HF_checkPatch')
      .addSeparator()
      .addItem('1. Build entries from registrations', 'HF_buildEntries')
      .addItem('2. Make judging sheets (to print)',   'HF_makeJudgingSheets')
      .addItem('2b. Build JUDGING ENTRY (pick winners)', 'HF_buildJudgingEntry')
      .addSeparator()
      .addItem('2c. Check JUDGING ENTRY for problems', 'HF_checkJudgingEntry')
      .addItem('2d. Send picks to RESULTS',            'HF_syncJudgingToResults')
      .addSeparator()
      .addItem('3. Calculate prizes & cheques',       'HF_calculatePrizes')
      .addItem('4. Verify before writing cheques',    'HF_verify')
      .addToUi();
  } catch (e) { /* standalone project — menu only appears on a bound script */ }
}
