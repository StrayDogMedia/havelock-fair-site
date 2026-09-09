/**
 * HAVELOCK FAIR 2026 — TWO BREED DIVISIONS
 * =====================================================================
 * Jesse's ruling 2026-09-09: dairy breeds collapse from five divisions
 * to two —
 *
 *   A. Holstein
 *   B. Coloured Breeds (Ayrshire, Jersey, Canadienne, Guernsey & Brown Swiss)
 *
 * This does two jobs, both idempotent:
 *
 *   1. SECTIONS      Class 3 goes from 5 divisions × 10 sections (50 rows)
 *                    to 2 × 10 (20 rows). All five divisions carry the
 *                    IDENTICAL tier and prize amounts (DAIRY_HERITAGE
 *                    120/100/80/60), so no prize money changes — only the
 *                    grouping.
 *   2. REGISTRATIONS existing breed values are relabelled in place, so the
 *                    judging sheets group into two rather than showing the
 *                    old and new labels side by side.
 *
 * Run  HF_mergeBreedsPreview()  first — it reports exactly what WOULD
 * change and writes nothing.
 * Then HF_mergeBreeds()         to apply.
 *
 * ⚠ After applying, re-run "1. Build entries" then "2b. Build JUDGING
 * ENTRY". Both refuse to run once placings exist, so do this BEFORE
 * judging starts.
 *
 * ---------------------------------------------------------------------
 * PATCHED 2026-09-09 after a live half-failure. Two changes:
 *
 *  A. THE DROPDOWN BLOCKED THE WRITE.  HF_Dropdowns.gs line ~189 puts a
 *     requireValueInList rule on SECTIONS!DIVISION with
 *     setAllowInvalid(false) and setHelpText('Division.').  "A. Holstein"
 *     is not in that list, so setValues() was REJECTED and Apps Script
 *     surfaced the rule's help text as the error message — an execution
 *     that failed with the single word "Division."  By then clearContent()
 *     had already run, so Class 3 was wiped and not rewritten.
 *     HF_mergeBreeds now calls clearDataValidations() on the block first.
 *     🔴 Re-run HF_installDropdowns AFTERWARDS to rebuild the DIVISION
 *     list from the two new labels.
 *
 *  B. IT COULD NOT REPAIR ITSELF.  The rewrite takes its ten section
 *     descriptions from the surviving Class 3 rows, so once they were
 *     blank a re-run would have written ten EMPTY sections. Added
 *     HF_restoreClass3Sections() (the original 50 rows, verbatim from
 *     Havelock_Fair_2026_Master_Workbook_TEMPLATE.xlsx) plus a guard in
 *     HF_mergeBreeds that refuses to run against a damaged block.
 * ===================================================================== */

var HF_BREED_HOLSTEIN = 'A. Holstein';
var HF_BREED_COLOURED = 'B. Coloured Breeds (Ayrshire, Jersey, Canadienne, Guernsey & Brown Swiss)';

/* ---- Class 3 reference data, for the one-time repair -----------------
 * Verbatim from the master workbook template. The five old divisions all
 * carried these same ten sections at the same tier and prizes. */
var HF_C3_CLASS_NAME   = 'Dairy Cattle';
var HF_C3_TIER         = 'DAIRY_HERITAGE';
var HF_C3_PRIZES       = [120, 100, 80, 60];
var HF_C3_DIVS_ORIGINAL = ['A. Ayrshire', 'B. Holstein', 'C. Jersey', 'D. Canadienne', 'E. Guernsey'];
var HF_C3_SECTIONS = [
  ['1',  'Junior Heifer (born Mar 1–May 31 2026)'],
  ['2',  'Intermediate Heifer (born Dec 1 2025–Feb 28 2026)'],
  ['3',  'Senior Heifer (born Sept 1–Nov 30 2025)'],
  ['4',  'Summer Yearling Heifer (born Jun 1–Aug 31 2025)'],
  ['5',  'Junior Yearling Heifer (born Mar 1–May 31 2025)'],
  ['6',  'Senior Yearling Heifer (born Sept 1 2024–Feb 28 2025)'],
  ['7',  '2 & 3 year olds in milk (born Sept 1 2022–Aug 31 2024)'],
  ['8',  '4 & 5 year olds in milk (born Sept 1 2020–Aug 31 2022)'],
  ['9',  'Mature cow in milk (born before Sept 1 2020)'],
  ['10', "Breeder's herd (3 animals, bred & owned by exhibitor)"]
];

/** Old label -> new label. Anything containing "holstein" is Holstein;
 *  every other named dairy breed becomes Coloured Breeds. Matching is on
 *  the breed WORD, so it survives the old "A. "/"B. " letter prefixes,
 *  which no longer line up (Ayrshire used to be A, Holstein is A now). */
function hfbmMap_(value) {
  var v = String(value == null ? '' : value).trim();
  if (!v) return null;                                  // blank stays blank
  if (v === HF_BREED_HOLSTEIN || v === HF_BREED_COLOURED) return null;  // already migrated
  var low = v.toLowerCase();
  if (low.indexOf('holstein') >= 0) return HF_BREED_HOLSTEIN;
  if (/ayrshire|jersey|canadien|guernsey|brown\s*swiss/.test(low)) return HF_BREED_COLOURED;
  return undefined;                                     // unrecognised — report, never guess
}

function hfbmScan_() {
  // Everything below goes through hfSheet_/hfReadTable_ from HF_JudgingSystem.gs,
  // which opens the workbook itself. Referencing HF_Protect.gs's book id here
  // made this file throw whenever that one was not loaded.

  // ---- REGISTRATIONS ------------------------------------------------
  var reg = hfReadTable_(HF_TABS.registrations, ['Exhibitor ID', 'Form Type', 'Class ID', 'Sections']);
  var regCol = {}; reg.cols.forEach(function (c, i) { if (c) regCol[c] = i + 1; });
  var regChanges = [], regUnknown = [];
  ['Breed(s)', '4-H Breed'].forEach(function (colName) {
    if (!regCol[colName]) return;
    reg.rows.forEach(function (r) {
      var to = hfbmMap_(r[colName]);
      if (to === null) return;
      if (to === undefined) {
        regUnknown.push(r['Exhibitor ID'] + ' · ' + colName + ' = "' + r[colName] + '"');
        return;
      }
      regChanges.push({ row: r.__row, col: regCol[colName], colName: colName,
                        from: String(r[colName]).trim(), to: to, who: r['Exhibitor ID'] });
    });
  });

  // ---- SECTIONS -----------------------------------------------------
  var sec = hfReadTable_(HF_TABS.sections, ['CLASS #', 'SECTION CODE', 'SECTION DESCRIPTION', 'PRIZE TIER']);
  var secCol = {}; sec.cols.forEach(function (c, i) { if (c) secCol[c] = i + 1; });
  var secUnknown = [];
  sec.rows.forEach(function (r) {
    if (String(r['CLASS #']).trim() !== '3') return;
    var to = hfbmMap_(r['DIVISION']);
    if (to === undefined) secUnknown.push(String(r['DIVISION']));
  });

  return { reg: reg, regCol: regCol, regChanges: regChanges, regUnknown: regUnknown,
           sec: sec, secCol: secCol, secUnknown: secUnknown };
}

/** The Class 3 rows as they stand, plus a health verdict. */
function hfbmClass3_(sec) {
  var rows = sec.rows.filter(function (r) { return String(r['CLASS #']).trim() === '3'; });
  var codes = {}, blanks = 0;
  rows.forEach(function (r) {
    var code = String(r['SECTION CODE']).trim();
    var desc = String(r['SECTION DESCRIPTION']).trim();
    if (!code || !desc) blanks++; else codes[code] = 1;
  });
  return { rows: rows, distinctCodes: Object.keys(codes).length, blanks: blanks,
           healthy: rows.length > 0 && blanks === 0 &&
                    Object.keys(codes).length === HF_C3_SECTIONS.length };
}

/* ===================================================================
 *  ONE-TIME REPAIR — put the original 50 Class 3 rows back
 *  Only needed if a run of HF_mergeBreeds cleared the block without
 *  rewriting it (see PATCHED note A above). Safe to run twice: it
 *  refuses when the block is already healthy.
 * =================================================================== */
function HF_restoreClass3Sections() {
  var sec = hfReadTable_(HF_TABS.sections, ['CLASS #', 'SECTION CODE', 'SECTION DESCRIPTION', 'PRIZE TIER']);
  var health = hfbmClass3_(sec);
  if (health.healthy) {
    var msg0 = 'Class 3 looks intact — ' + health.rows.length + ' rows, ' +
               health.distinctCodes + ' distinct section codes, no blanks.\n' +
               'Nothing restored. (Run HF_mergeBreedsPreview to see the divisions.)';
    Logger.log(msg0);
    try { SpreadsheetApp.getUi().alert(msg0); } catch (e) {}
    return msg0;
  }

  var sheet = sec.sheet, nCols = sec.cols.length;
  var need = HF_C3_DIVS_ORIGINAL.length * HF_C3_SECTIONS.length;   // 50

  // Where does the block start? Prefer a surviving Class 3 row; else the
  // row immediately before the first Class 4 row.
  var first = null;
  if (health.rows.length) {
    first = Math.min.apply(null, health.rows.map(function (r) { return r.__row; }));
  } else {
    var c4 = sec.rows.filter(function (r) { return String(r['CLASS #']).trim() === '4'; });
    if (!c4.length) throw new Error('Cannot locate the Class 3 block: no Class 3 and no Class 4 rows found.');
    first = Math.min.apply(null, c4.map(function (r) { return r.__row; })) - need;
  }
  if (first < sec.headerRow + 1) throw new Error('Refusing to write above the header row (computed row ' + first + ').');

  // SAFETY: every row we are about to overwrite must be blank or Class 3.
  var block = sheet.getRange(first, 1, need, nCols).getValues();
  var offenders = [];
  block.forEach(function (row, i) {
    var cls = String(row[0] == null ? '' : row[0]).trim();
    var empty = row.join('').trim() === '';
    if (!empty && cls !== '3') offenders.push('row ' + (first + i) + ' is CLASS ' + (cls || '?'));
  });
  if (offenders.length) {
    throw new Error('Refusing to restore — rows ' + first + '–' + (first + need - 1) +
                    ' are not all blank or Class 3:\n   ' + offenders.slice(0, 8).join('\n   '));
  }

  var out = [];
  HF_C3_DIVS_ORIGINAL.forEach(function (div) {
    HF_C3_SECTIONS.forEach(function (s) {
      out.push(hfbmRow_(sec.cols, div, s[0], s[1]));
    });
  });

  sheet.getRange(first, 1, need, nCols).clearDataValidations();
  sheet.getRange(first, 1, need, nCols).clearContent();
  sheet.getRange(first, 1, out.length, nCols).setValues(out);

  var msg = 'Class 3 restored.\n\n' +
            '  ' + out.length + ' rows written at rows ' + first + '–' + (first + out.length - 1) + '\n' +
            '  ' + HF_C3_DIVS_ORIGINAL.length + ' divisions × ' + HF_C3_SECTIONS.length + ' sections\n' +
            '  ' + HF_C3_TIER + ' ' + HF_C3_PRIZES.join('/') + '\n\n' +
            'Now run HF_mergeBreedsPreview, then HF_mergeBreeds.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

/** Build one SECTIONS row in the sheet's own column order. */
function hfbmRow_(cols, division, code, description) {
  var map = {};
  map['CLASS #']             = 3;
  map['CLASS NAME']          = HF_C3_CLASS_NAME;
  map['DIVISION']            = division;
  map['SECTION CODE']        = code;
  map['SECTION DESCRIPTION'] = description;
  map['PRIZE TIER']          = HF_C3_TIER;
  map['1ST ($)']             = HF_C3_PRIZES[0];
  map['2ND ($)']             = HF_C3_PRIZES[1];
  map['3RD ($)']             = HF_C3_PRIZES[2];
  map['4TH ($)']             = HF_C3_PRIZES[3];
  return cols.map(function (name) {
    if (!name) return '';
    return map.hasOwnProperty(name) ? map[name] : '';
  });
}

function HF_mergeBreedsPreview() {
  var s = hfbmScan_();
  var health = hfbmClass3_(s.sec);
  var out = ['BREED MERGE — PREVIEW. Nothing has been written.', ''];

  if (!health.healthy) {
    out.push('🔴 CLASS 3 IS DAMAGED — ' + health.rows.length + ' row(s), ' +
             health.blanks + ' with a blank code or description.');
    out.push('   Run HF_restoreClass3Sections() FIRST. HF_mergeBreeds will refuse');
    out.push('   until the block is whole, because it builds its ten sections from');
    out.push('   the rows that are there.');
    out.push('');
  }

  out.push('REGISTRATIONS — ' + s.regChanges.length + ' cell(s) would be relabelled:');
  s.regChanges.forEach(function (c) {
    out.push('   row ' + c.row + '  ' + c.who + '  ' + c.colName + ': "' + c.from + '" → "' + c.to + '"');
  });
  if (!s.regChanges.length) out.push('   (none — already migrated)');

  var divs = {};
  s.sec.rows.forEach(function (r) {
    if (String(r['CLASS #']).trim() !== '3') return;
    divs[String(r['DIVISION']).trim()] = (divs[String(r['DIVISION']).trim()] || 0) + 1;
  });
  out.push('');
  out.push('SECTIONS — Class 3 divisions today:');
  Object.keys(divs).forEach(function (d) { out.push('   ' + (d || '(blank)') + '  (' + divs[d] + ' sections)'); });
  out.push('   → becomes 2 divisions × ' + HF_C3_SECTIONS.length + ' sections = ' +
           (2 * HF_C3_SECTIONS.length) + ' rows.');
  out.push('   ⚠ All five divisions carry the same tier and prize amounts, so');
  out.push('     NO prize money changes — only the grouping.');

  if (s.regUnknown.length || s.secUnknown.length) {
    out.push('');
    out.push('⚠ NOT RECOGNISED — these are left alone, never guessed:');
    s.regUnknown.concat(s.secUnknown).forEach(function (u) { out.push('   ' + u); });
  }

  var msg = out.join('\n');
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

function HF_mergeBreeds() {
  var s = hfbmScan_();
  var health = hfbmClass3_(s.sec);

  // GUARD: never rewrite Class 3 from a damaged block — that is how ten
  // empty sections would get written over the real ones.
  if (!health.healthy) {
    throw new Error('Class 3 is damaged (' + health.rows.length + ' row(s), ' + health.blanks +
                    ' blank). Run HF_restoreClass3Sections() first, then re-run this.');
  }

  // ---- 1. relabel REGISTRATIONS in place ---------------------------
  s.regChanges.forEach(function (c) {
    s.reg.sheet.getRange(c.row, c.col).setValue(c.to);
  });

  // ---- 2. rebuild Class 3's block of SECTIONS ----------------------
  // Take one division's ten sections as the template (they are identical
  // across all five), and write two divisions in its place.
  var secSheet = s.sec.sheet;
  var class3 = health.rows;
  var template = {}, order = [];
  class3.forEach(function (r) {
    var code = String(r['SECTION CODE']).trim();
    if (!template[code]) { template[code] = r; order.push(code); }
  });
  order.sort(function (a, b) { return hfNum_(a) - hfNum_(b); });

  var rows = [];
  [HF_BREED_HOLSTEIN, HF_BREED_COLOURED].forEach(function (div) {
    order.forEach(function (code) {
      var t = template[code], row = [];
      s.sec.cols.forEach(function (name) {
        if (!name) { row.push(''); return; }
        row.push(name === 'DIVISION' ? div : t[name]);
      });
      rows.push(row);
    });
  });

  // Clear the old Class 3 block and write the new one at its first row.
  var first = Math.min.apply(null, class3.map(function (r) { return r.__row; }));
  var count = class3.length;

  // 🔴 THE FIX. HF_Dropdowns puts requireValueInList + setAllowInvalid(false)
  // on DIVISION. The new labels are not in that list, so setValues() is
  // rejected — the run dies with the rule's help text, "Division.", AFTER
  // clearContent() has already emptied the block. Drop the rule first and
  // rebuild it afterwards with HF_installDropdowns.
  secSheet.getRange(first, 1, count, s.sec.cols.length).clearDataValidations();
  secSheet.getRange(first, 1, count, s.sec.cols.length).clearContent();
  secSheet.getRange(first, 1, rows.length, s.sec.cols.length).setValues(rows);

  var msg = 'Breeds merged to two divisions.\n\n' +
            '  REGISTRATIONS: ' + s.regChanges.length + ' cell(s) relabelled.\n' +
            '  SECTIONS: Class 3 rewritten from ' + count + ' rows to ' + rows.length + ' ' +
            '(2 divisions × ' + order.length + ' sections).\n' +
            '  Prize amounts unchanged.\n\n' +
            '🔴 Run HF_installDropdowns now — the DIVISION dropdown was dropped\n' +
            '  on the Class 3 block and needs rebuilding with the new labels.\n\n' +
            '⚠ Then re-run "1. Build entries from registrations", then\n' +
            '  "2b. Build JUDGING ENTRY". Both refuse once placings exist.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}
