/**
 * HAVELOCK FAIR 2026 — DROPDOWNS / DATA VALIDATION
 * =====================================================================
 * Puts a dropdown on every field in the workbook where the answer comes
 * from a known list, so the office types less and mistypes nothing.
 *
 * Run  HF_installDropdowns()  once. Safe to re-run at any time — it
 * replaces the rules it owns and never touches cell CONTENTS.
 *
 * Two kinds of rule are installed:
 *   • single-pick  — one value only (Placing, Province, Confirmation…)
 *   • multi-pick   — several values in one cell (Class(es) Assigned)
 *
 * The lists come from the workbook itself wherever one already exists:
 * CLASSES for class names, VALIDATION LISTS for everything else. Edit
 * the list, re-run this, and the dropdowns follow — do not retype
 * options into this file.
 *
 * ⚠ Requires the newer Sheets validation API for multi-select. If the
 * account is on an older Apps Script runtime the multi-pick fields fall
 * back to single-pick automatically and the script still completes.
 * ===================================================================== */

var HF_DD_BOOK_ID = '1TBxMBM4RSyqDDTxuTiAyxWhOiRvyNfxMzK4LgXqFID0';

/** How far down to apply each rule. Generous — covers a full fair. */
var HF_DD_ROWS = 500;

function hfddBook_() { return SpreadsheetApp.openById(HF_DD_BOOK_ID); }

function hfddSheet_(name) {
  var sh = hfddBook_().getSheetByName(name);
  return sh || null;
}

/** Find a column by its exact header text, searching the first 6 rows.
 *  Returns {row: headerRowIndex, col: columnIndex} 1-based, or null.
 *  Tabs in this workbook carry a merged banner above the real header,
 *  so the header is rarely on row 1. */
function hfddFind_(sh, header) {
  if (!sh) return null;
  var lastCol = Math.max(1, sh.getLastColumn());
  var vals = sh.getRange(1, 1, Math.min(6, sh.getMaxRows()), lastCol).getValues();
  var want = String(header).trim().toLowerCase();
  for (var r = 0; r < vals.length; r++) {
    for (var c = 0; c < vals[r].length; c++) {
      if (String(vals[r][c] === null ? '' : vals[r][c]).trim().toLowerCase() === want) {
        return { row: r + 1, col: c + 1 };
      }
    }
  }
  return null;
}

/** Read a VALIDATION LISTS column by its header, top-down, stopping at blanks. */
function hfddList_(header) {
  var sh = hfddSheet_('VALIDATION LISTS');
  var at = hfddFind_(sh, header);
  if (!at) return [];
  var n = sh.getMaxRows() - at.row;
  if (n < 1) return [];
  var col = sh.getRange(at.row + 1, at.col, n, 1).getValues();
  var out = [];
  for (var i = 0; i < col.length; i++) {
    var v = String(col[i][0] === null ? '' : col[i][0]).trim();
    if (v) out.push(v);
  }
  return out;
}

/** "Class 14 — Maple & Honey" for every row of the CLASSES tab. */
function hfddClassList_() {
  var sh = hfddSheet_('CLASSES');
  var at = hfddFind_(sh, 'CLASS #');
  if (!at) return [];
  var nameAt = hfddFind_(sh, 'CLASS NAME');
  var n = sh.getMaxRows() - at.row;
  if (n < 1) return [];
  var vals = sh.getRange(at.row + 1, 1, n, Math.max(1, sh.getLastColumn())).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var num  = String(vals[i][at.col - 1] === null ? '' : vals[i][at.col - 1]).trim();
    var name = nameAt ? String(vals[i][nameAt.col - 1] === null ? '' : vals[i][nameAt.col - 1]).trim() : '';
    if (!num) continue;
    out.push(name ? ('Class ' + num + ' — ' + name) : ('Class ' + num));
  }
  return out;
}

/** Apply a dropdown to one column. multi=true allows several picks per cell. */
function hfddApply_(tabName, header, values, multi, helpText) {
  if (!values || !values.length) return tabName + ' · ' + header + ' — SKIPPED (no list values found)';
  var sh = hfddSheet_(tabName);
  if (!sh) return tabName + ' — SKIPPED (tab not found)';
  var at = hfddFind_(sh, header);
  if (!at) return tabName + ' · ' + header + ' — SKIPPED (column not found)';

  var need = at.row + HF_DD_ROWS;
  if (sh.getMaxRows() < need) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows());

  var range = sh.getRange(at.row + 1, at.col, HF_DD_ROWS, 1);
  range.clearDataValidations();

  var built = null, mode = 'single';
  if (multi) {
    // Newer runtimes only. Wrapped because the older builder has no
    // setMultiSelect and would throw, taking the whole install with it.
    try {
      built = SpreadsheetApp.newDataValidation()
        .requireValueInList(values, true)
        .setMultiSelect(true)
        .setAllowInvalid(false)
        .setHelpText(helpText || 'Pick one or more from the list.')
        .build();
      mode = 'multi';
    } catch (e) { built = null; }
  }
  if (!built) {
    // Multi-select was wanted but this runtime has no setMultiSelect (confirmed
    // 2026-09-06 — every field came back single). A STRICT list would now be
    // worse than no dropdown at all: it would reject "Class 3, Class 10" and
    // make a judge covering several classes unrecordable. So when multi was
    // asked for and denied, keep the list as a suggestion but ALLOW free text.
    built = SpreadsheetApp.newDataValidation()
      .requireValueInList(values, true)
      .setAllowInvalid(!!multi)
      .setHelpText(multi
        ? ((helpText || '') + ' Multi-select is unavailable on this account, so the list is a ' +
           'suggestion: pick one, or type several separated by commas.').trim()
        : (helpText || 'Pick from the list.'))
      .build();
    if (multi) mode = 'single, free text allowed';
  }
  range.setDataValidation(built);
  return tabName + ' · ' + header + ' — ' + values.length + ' options (' + mode + ')';
}

/* =====================================================================
 *  THE INSTALLER
 * ===================================================================== */

function HF_installDropdowns() {
  var log = [];

  var classes   = hfddClassList_();
  var placing   = hfddList_('Placing');
  var judgeStat = hfddList_('JudgeStatus');
  var province  = hfddList_('Province');
  var yesNo     = hfddList_('YesNo');
  var memberTyp = hfddList_('MemberType');
  var division  = hfddList_('Division');
  var ageCat    = hfddList_('AgeCategory');
  var entryType = hfddList_('EntryType');

  // ---- JUDGES ----------------------------------------------------
  // The field that prompted this. A judge covers SEVERAL classes, so
  // this one is multi-select: tick as many as apply in the one cell.
  log.push(hfddApply_('JUDGES', 'CLASS(ES) ASSIGNED', classes, true,
                      'Tick every class this judge is covering.'));
  log.push(hfddApply_('JUDGES', 'CONFIRMATION STATUS', judgeStat, false,
                      'Has the judge confirmed?'));

  // ---- RESULTS ---------------------------------------------------
  // Placing is the one the office types most on fair day.
  log.push(hfddApply_('RESULTS', 'PLACING', placing, false,
                      'Placing from the judge’s sheet. Leave blank if it did not place.'));
  log.push(hfddApply_('RESULTS', 'DONATED?', yesNo, false,
                      'Yes only if the exhibitor is donating these winnings back to the fair.'));

  // ---- REGISTRATIONS ---------------------------------------------
  log.push(hfddApply_('REGISTRATIONS', 'Province', province, false, 'Province.'));
  log.push(hfddApply_('REGISTRATIONS', 'Under 13?', yesNo, false,
                      'Drives the $15 membership fee waiver.'));

  // ---- EXHIBITORS ------------------------------------------------
  log.push(hfddApply_('EXHIBITORS', 'PROVINCE', province, false, 'Province.'));
  // Header names confirmed against the live tab 2026-09-06. EXHIBITORS has no
  // STATUS and no PAYMENT METHOD column; the membership one is MEMBERSHIP TYPE,
  // not MEMBER TYPE. It does have AGE CATEGORY, which was being read and then
  // never used.
  log.push(hfddApply_('EXHIBITORS', 'MEMBERSHIP TYPE', memberTyp, false, 'Membership type.'));
  log.push(hfddApply_('EXHIBITORS', 'AGE CATEGORY', ageCat, false, 'Senior or Junior.'));

  // ---- CHEQUE REGISTER -------------------------------------------
  // No 'CHEQUE ISSUED?' column exists; the tab tracks issue by DATE ISSUED,
  // which is a date and wants a date picker, not a dropdown. Nothing to apply.

  // ---- CLASSES / SECTIONS ----------------------------------------
  log.push(hfddApply_('SECTIONS', 'DIVISION', division, false, 'Division.'));
  log.push(hfddApply_('CLASSES', 'TYPE', entryType, false, 'Animal or Indoor.'));

  // ---- DIRECTORS -------------------------------------------------
  // DIRECTORS has no CLASS(ES) ASSIGNED column — its nearest field is
  // 'ROLE / PORTFOLIO', which is free text by design. Nothing to apply.

  var kept = [], skipped = [];
  for (var i = 0; i < log.length; i++) {
    if (log[i].indexOf('SKIPPED') >= 0) skipped.push(log[i]); else kept.push(log[i]);
  }

  var msg = 'Dropdowns installed: ' + kept.length + ' field(s).\n\n' +
            kept.join('\n') +
            (skipped.length ? '\n\nNot applied (' + skipped.length + '):\n' + skipped.join('\n') : '');
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* not run from the UI */ }
  return msg;
}

/** Remove every dropdown this script installs, leaving cell contents alone. */
function HF_removeDropdowns() {
  var targets = [
    ['JUDGES', 'CLASS(ES) ASSIGNED'], ['JUDGES', 'CONFIRMATION STATUS'],
    ['RESULTS', 'PLACING'], ['RESULTS', 'DONATED?'],
    ['REGISTRATIONS', 'Province'], ['REGISTRATIONS', 'Under 13?'],
    ['EXHIBITORS', 'PROVINCE'], ['EXHIBITORS', 'MEMBERSHIP TYPE'],
    ['EXHIBITORS', 'AGE CATEGORY'],
    ['SECTIONS', 'DIVISION'], ['CLASSES', 'TYPE']
  ];
  var n = 0;
  for (var i = 0; i < targets.length; i++) {
    var sh = hfddSheet_(targets[i][0]);
    var at = hfddFind_(sh, targets[i][1]);
    if (!sh || !at) continue;
    sh.getRange(at.row + 1, at.col, HF_DD_ROWS, 1).clearDataValidations();
    n++;
  }
  var msg = 'Removed dropdowns from ' + n + ' field(s). Cell contents untouched.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}
