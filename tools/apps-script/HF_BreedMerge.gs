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
 * ===================================================================== */

var HF_BREED_HOLSTEIN = 'A. Holstein';
var HF_BREED_COLOURED = 'B. Coloured Breeds (Ayrshire, Jersey, Canadienne, Guernsey & Brown Swiss)';

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
  var keep = [], drop = [], secUnknown = [];
  sec.rows.forEach(function (r) {
    if (String(r['CLASS #']).trim() !== '3') return;
    var to = hfbmMap_(r['DIVISION']);
    if (to === null) { keep.push(r); return; }           // already a new label
    if (to === undefined) { secUnknown.push(String(r['DIVISION'])); return; }
    if (to === HF_BREED_HOLSTEIN) keep.push({ __row: r.__row, to: to, r: r });
    else drop.push({ __row: r.__row, to: to, r: r });
  });

  return { reg: reg, regCol: regCol, regChanges: regChanges, regUnknown: regUnknown,
           sec: sec, secCol: secCol, secUnknown: secUnknown };
}

function HF_mergeBreedsPreview() {
  var s = hfbmScan_();
  var out = ['BREED MERGE — PREVIEW. Nothing has been written.', ''];

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
  Object.keys(divs).forEach(function (d) { out.push('   ' + d + '  (' + divs[d] + ' sections)'); });
  out.push('   → becomes 2 divisions × 10 sections = 20 rows.');
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

  // ---- 1. relabel REGISTRATIONS in place ---------------------------
  s.regChanges.forEach(function (c) {
    s.reg.sheet.getRange(c.row, c.col).setValue(c.to);
  });

  // ---- 2. rebuild Class 3's block of SECTIONS ----------------------
  // Take one division's ten sections as the template (they are identical
  // across all five), and write two divisions in its place.
  var secSheet = s.sec.sheet;
  var class3 = s.sec.rows.filter(function (r) { return String(r['CLASS #']).trim() === '3'; });
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
  secSheet.getRange(first, 1, count, s.sec.cols.length).clearContent();
  secSheet.getRange(first, 1, rows.length, s.sec.cols.length).setValues(rows);

  var msg = 'Breeds merged to two divisions.\n\n' +
            '  REGISTRATIONS: ' + s.regChanges.length + ' cell(s) relabelled.\n' +
            '  SECTIONS: Class 3 rewritten from ' + count + ' rows to ' + rows.length + ' ' +
            '(2 divisions × ' + order.length + ' sections).\n' +
            '  Prize amounts unchanged.\n\n' +
            '⚠ Now re-run "1. Build entries from registrations", then\n' +
            '  "2b. Build JUDGING ENTRY". Both refuse once placings exist.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}
