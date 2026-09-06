/**
 * HAVELOCK FAIR 2026 — TAB PROTECTION
 * =====================================================================
 * Locks the tabs nobody should type into, while leaving the 🏆 menu
 * scripts free to rebuild them.
 *
 * WHY THIS WORKS: a protected range does not stop the sheet's OWNER, and
 * Apps Script run from the menu executes as the person who ran it. So
 * the owner keeps full script access while everyone else is locked out.
 * Nothing here changes how HF_buildEntries / HF_makeJudgingSheets /
 * HF_calculatePrizes behave for you.
 *
 * Run  HF_protectTabs()   to apply.
 * Run  HF_unprotectTabs() to remove every protection this script owns.
 * Run  HF_protectionReport() to see what is currently protected.
 *
 * Safe to re-run: it clears its own protections first, so it never
 * stacks duplicates. It never reads or writes a single cell VALUE.
 * ===================================================================== */

var HF_PROT_BOOK_ID = '1TBxMBM4RSyqDDTxuTiAyxWhOiRvyNfxMzK4LgXqFID0';

/** Marker so we only ever remove protections WE added — never one a
 *  human set up by hand. */
var HF_PROT_TAG = '[HF-auto]';

/**
 * HARD LOCK — generated tabs. Rebuilt wholesale by the menu scripts;
 * a hand edit is always either pointless (overwritten next rebuild) or
 * harmful (silently disagrees with ENTRIES).
 */
var HF_PROT_LOCK = [
  ['ENTRIES',            'Built by "1. Build entries from registrations". Hand edits are overwritten on the next rebuild.'],
  ['JUDGING SHEETS',     'Built by "2. Make judging sheets". Edit the source data, then rebuild.'],
  ['PRIZE CALCULATIONS', 'Built by "3. Calculate prizes & cheques". Change RESULTS, then recalculate.'],
  ['SECTIONS',           'The prize book: 659 sections and every prize amount. Changing a figure here changes what the fair pays out.'],
  ['CLASSES',            'The class list. The judges dropdown and the entry builder both read it.'],
  ['VALIDATION LISTS',   'Feeds every dropdown in the workbook. Renaming a column breaks the dropdowns that read it.']
];

/**
 * WARNING ONLY — prompts "are you sure?" but never blocks a write.
 *
 * REGISTRATIONS is deliberately NOT hard-locked: it is written by the
 * website's registration backend, which is a SEPARATE Apps Script project
 * on admin@havelockfair.ca opening this workbook by ID. A hard lock that
 * account is not an editor of would make live registrations fail
 * SILENTLY. A warning costs nothing and carries no such risk.
 */
var HF_PROT_WARN = [
  ['REGISTRATIONS', 'Filled automatically by the website. Do not sort, filter or delete rows — ENTRIES points back at these row numbers.'],
  ['SETTINGS',      'Fair dates, the $15 membership fee, contacts. Changing these changes what the cheque run calculates.']
];

/**
 * CHEQUE REGISTER is generated, but the treasurer must tick things off
 * as cheques are written. So: lock the sheet, then punch holes in it for
 * the columns a human legitimately fills in.
 */
var HF_PROT_CHEQUES = {
  tab: 'CHEQUE REGISTER',
  reason: 'Built by "3. Calculate prizes & cheques". You may fill the ticked-off columns; the rest is generated.',
  editable: ['CHEQUE ISSUED?', 'DATE ISSUED', 'MEMO', 'NOTES']
};

/**
 * JUDGING ENTRY is generated, but the office picks winners in it all fair day.
 * Same shape as CHEQUE REGISTER: lock the sheet, punch holes for the columns a
 * human legitimately fills in.
 */
var HF_PROT_JUDGING_ENTRY = {
  tab: 'JUDGING ENTRY',
  reason: 'Built by "2b. Build JUDGING ENTRY". Pick winners in WINNER; the rest is generated.',
  editable: ['WINNER', 'NOTES']
};

/** Tabs deliberately left wide open, and why. Used by the report only. */
var HF_PROT_OPEN = {
  'RESULTS':    'This is the fair-day typing tab — placings go here.',
  'JUDGES':     'Office maintains the judging panel.',
  'DIRECTORS':  'Office maintains the board list.',
  'EXHIBITORS': 'Office reference.',
  'PRIZE TABLES': 'Reference.'
};

function hfpBook_() { return SpreadsheetApp.openById(HF_PROT_BOOK_ID); }

/** Drop every protection carrying our marker. Leaves hand-made ones alone. */
function hfpClearOurs_(sh) {
  var n = 0;
  var sheetProts = sh.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  var rangeProts = sh.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  [].concat(sheetProts, rangeProts).forEach(function (p) {
    if (String(p.getDescription() || '').indexOf(HF_PROT_TAG) === 0) { p.remove(); n++; }
  });
  return n;
}

/** Find a column by header text in the first 6 rows. 1-based, or null. */
function hfpFindCol_(sh, header) {
  var lastCol = Math.max(1, sh.getLastColumn());
  var vals = sh.getRange(1, 1, Math.min(6, sh.getMaxRows()), lastCol).getValues();
  var want = String(header).trim().toLowerCase();
  for (var r = 0; r < vals.length; r++) {
    for (var c = 0; c < vals[r].length; c++) {
      if (String(vals[r][c] === null ? '' : vals[r][c]).trim().toLowerCase() === want) return c + 1;
    }
  }
  return null;
}

/* =====================================================================
 *  APPLY
 * ===================================================================== */

function HF_protectTabs() {
  var ss = hfpBook_(), log = [], me = Session.getEffectiveUser();

  // ---- hard locks -------------------------------------------------
  HF_PROT_LOCK.forEach(function (row) {
    var sh = ss.getSheetByName(row[0]);
    if (!sh) { log.push('SKIPPED · ' + row[0] + ' — tab not found'); return; }
    hfpClearOurs_(sh);
    var p = sh.protect().setDescription(HF_PROT_TAG + ' ' + row[1]);
    // Owner stays an editor, so the menu scripts keep working.
    p.addEditor(me);
    try { p.removeEditors(p.getEditors().filter(function (u) {
      return u.getEmail() !== me.getEmail(); })); } catch (e) {}
    if (p.canDomainEdit && p.canDomainEdit()) p.setDomainEdit(false);
    log.push('LOCKED  · ' + row[0]);
  });

  // ---- warning only ----------------------------------------------
  HF_PROT_WARN.forEach(function (row) {
    var sh = ss.getSheetByName(row[0]);
    if (!sh) { log.push('SKIPPED · ' + row[0] + ' — tab not found'); return; }
    hfpClearOurs_(sh);
    var p = sh.protect().setDescription(HF_PROT_TAG + ' ' + row[1]);
    p.setWarningOnly(true);           // prompts, never blocks
    log.push('WARNING · ' + row[0]);
  });

  // ---- cheque register: locked, with holes for the treasurer -----
  var cs = ss.getSheetByName(HF_PROT_CHEQUES.tab);
  if (!cs) {
    log.push('SKIPPED · ' + HF_PROT_CHEQUES.tab + ' — tab not found');
  } else {
    hfpClearOurs_(cs);
    var cp = cs.protect().setDescription(HF_PROT_TAG + ' ' + HF_PROT_CHEQUES.reason);
    cp.addEditor(me);
    try { cp.removeEditors(cp.getEditors().filter(function (u) {
      return u.getEmail() !== me.getEmail(); })); } catch (e) {}

    var holes = [], names = [];
    HF_PROT_CHEQUES.editable.forEach(function (h) {
      var c = hfpFindCol_(cs, h);
      if (!c) return;
      holes.push(cs.getRange(1, c, Math.max(cs.getMaxRows(), 2), 1));
      names.push(h);
    });
    if (holes.length) cp.setUnprotectedRanges(holes);
    log.push('LOCKED  · ' + HF_PROT_CHEQUES.tab +
             (names.length ? '  (still editable: ' + names.join(', ') + ')' : '  (no editable columns found)'));
  }

  // ---- judging entry: locked, with holes for the judge ------------
  var je = ss.getSheetByName(HF_PROT_JUDGING_ENTRY.tab);
  if (!je) {
    log.push('SKIPPED · ' + HF_PROT_JUDGING_ENTRY.tab + ' — tab not found (run "2b. Build JUDGING ENTRY" first)');
  } else {
    hfpClearOurs_(je);
    var jp = je.protect().setDescription(HF_PROT_TAG + ' ' + HF_PROT_JUDGING_ENTRY.reason);
    jp.addEditor(me);
    try { jp.removeEditors(jp.getEditors().filter(function (u) {
      return u.getEmail() !== me.getEmail(); })); } catch (e) {}
    var jholes = [], jnames = [];
    HF_PROT_JUDGING_ENTRY.editable.forEach(function (h) {
      var c = hfpFindCol_(je, h);
      if (!c) return;
      jholes.push(je.getRange(1, c, Math.max(je.getMaxRows(), 2), 1));
      jnames.push(h);
    });
    if (jholes.length) jp.setUnprotectedRanges(jholes);
    log.push('LOCKED  · ' + HF_PROT_JUDGING_ENTRY.tab +
             (jnames.length ? '  (still editable: ' + jnames.join(', ') + ')' : ''));
  }

  var msg = 'Tab protection applied.\n\n' + log.join('\n') +
    '\n\nOPEN, on purpose:\n' +
    Object.keys(HF_PROT_OPEN).map(function (k) { return '  ' + k + ' — ' + HF_PROT_OPEN[k]; }).join('\n') +
    '\n\nThe 🏆 menu scripts are unaffected — they run as you, and a protection ' +
    'never blocks its own editor.\n' +
    'To undo everything: run HF_unprotectTabs.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

/* =====================================================================
 *  REMOVE / REPORT
 * ===================================================================== */

function HF_unprotectTabs() {
  var ss = hfpBook_(), n = 0, tabs = [];
  ss.getSheets().forEach(function (sh) {
    var c = hfpClearOurs_(sh);
    if (c) { n += c; tabs.push(sh.getName()); }
  });
  var msg = 'Removed ' + n + ' protection(s) from: ' + (tabs.join(', ') || '(none)') +
            '\nProtections added by hand were left alone. No cell contents changed.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

function HF_protectionReport() {
  var ss = hfpBook_(), out = [];
  ss.getSheets().forEach(function (sh) {
    var ps = [].concat(sh.getProtections(SpreadsheetApp.ProtectionType.SHEET),
                       sh.getProtections(SpreadsheetApp.ProtectionType.RANGE));
    if (!ps.length) { out.push('open    · ' + sh.getName()); return; }
    ps.forEach(function (p) {
      var mine = String(p.getDescription() || '').indexOf(HF_PROT_TAG) === 0;
      out.push((p.isWarningOnly() ? 'warning · ' : 'locked  · ') + sh.getName() +
               (mine ? '' : '   (set by hand, not by this script)'));
    });
  });
  var msg = 'Protection report\n\n' + out.join('\n');
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}
