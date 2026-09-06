/**
 * HAVELOCK FAIR 2026 — JUDGING ENTRY
 * =====================================================================
 * A sheet organised the way judging actually happens: SECTION BY SECTION.
 *
 * For every section that has entries, one row per prize position carrying
 * its dollar value, and beside it a dropdown listing ONLY the entries
 * registered in that section. The judge picks the winner. Nothing typed.
 *
 *   HF_buildJudgingEntry()      build/rebuild the tab (preserves picks)
 *   HF_checkJudgingEntry()      report problems, write nothing
 *   HF_syncJudgingToResults()   send the picks to RESULTS
 *
 * Downstream is UNCHANGED. This writes plain '1st'/'2nd'/'3rd'/'4th' into
 * RESULTS, which is what HF_calculatePrizes already reads, so the prize row
 * shown here and the amount computed there resolve from the same ENTRIES
 * columns and cannot disagree.
 *
 * Requires HF_JudgingSystem.gs (hfSheet_, hfReadTable_, hfNum_, hfStr_,
 * HF_TABS, HF_NO_PRIZE_TIER).
 * ===================================================================== */

var HF_JE_PLACINGS = ['1st', '2nd', '3rd', '4th'];
var HF_JE_AMOUNT_COLS = ['1ST ($)', '2ND ($)', '3RD ($)', '4TH ($)'];

/* Columns on the JUDGING ENTRY tab. G/H are machine columns, hidden. */
var HF_JE_COL = { section: 1, prize: 2, amount: 3, winner: 4, exhibitor: 5, notes: 6, key: 7, entry: 8 };
var HF_JE_HEADERS = ['SECTION', 'PRIZE', 'AMOUNT', 'WINNER', 'EXHIBITOR #', 'NOTES', '_KEY', '_ENTRY'];
var HF_JE_FIRST_ROW = 3;          // row 1 banner, row 2 headers

/** Dropdown label. Entry number FIRST and always present.
 *  Class 17 Sec 37 holds two entries for the SAME exhibitor (E1021 and E1035,
 *  both Lise Brown). A name-only label would put two identical strings in one
 *  list and the reader could not tell them apart. Entry-first also survives
 *  truncation in a narrow column. */
function hfjeLabel_(e) {
  var name = hfStr_(e['EXHIBITOR NAME']).trim();
  var extra = [e['ANIMAL NAME'], e['REG # / ATQ #']]
    .map(function (v) { return hfStr_(v).trim(); }).filter(String).join(' / ');
  return hfStr_(e['ENTRY #']).trim() + ' — ' + name + (extra ? ' (' + extra + ')' : '');
}

/** Pull the ENTRY # back out. Anchored on the entry token only — never split
 *  on the em-dash, which appears inside names and survives paste badly. */
function hfjeParseEntryId_(label) {
  var m = hfStr_(label).trim().match(/^\s*(E\d+)\b/i);
  return m ? m[1].toUpperCase() : null;
}

/** Group ENTRIES by section, same key and sort as HF_makeJudgingSheets, except
 *  prize-bearing sections come first — position-only sections have an empty
 *  CLASS # which would otherwise sort them all to the top. */
function hfjeGroups_() {
  var t = hfReadTable_(HF_TABS.entries, ['ENTRY #', 'EXHIBITOR #', 'SECTION CODE', 'PRIZE TIER']);
  var groups = {}, order = [];
  t.rows.forEach(function (e) {
    if (!/^E\d+$/.test(hfStr_(e['ENTRY #']).trim())) return;   // skips the ⚠ block
    var k = [e['CLASS #'], e['DIVISION'], e['SECTION CODE']].join('||');
    if (!groups[k]) { groups[k] = []; order.push(k); }
    groups[k].push(e);
  });
  function posOnly(k) { return hfStr_(groups[k][0]['PRIZE TIER']) === HF_NO_PRIZE_TIER; }
  order.sort(function (a, b) {
    var pa = posOnly(a) ? 1 : 0, pb = posOnly(b) ? 1 : 0;
    if (pa !== pb) return pa - pb;
    var A = a.split('||'), B = b.split('||');
    return (hfNum_(A[0]) - hfNum_(B[0])) || String(A[1]).localeCompare(String(B[1])) ||
           (hfNum_(A[2]) - hfNum_(B[2]));
  });
  return { groups: groups, order: order, posOnly: posOnly };
}

/** Section heading. ⚠ All 13 position-only sections have an EMPTY CLASS #, so
 *  the 'Class N — ' prefix must be conditional or they render "Class  — 4-H". */
function hfjeHeading_(e) {
  var bits = [];
  var cls = hfStr_(e['CLASS #']).trim();
  var nm  = hfStr_(e['CLASS NAME']).trim();
  bits.push(cls ? ('Class ' + cls + ' — ' + nm) : nm);
  var div = hfStr_(e['DIVISION']).trim();
  if (div) bits.push(div);
  bits.push('Sec ' + hfStr_(e['SECTION CODE']).trim() + ': ' + hfStr_(e['SECTION DESCRIPTION']).trim());
  return bits.filter(String).join(' · ');
}

/** Read the tab into { key: { '1st': 'E1001', ... } } plus any stray picks
 *  sitting on a section-header row (which has no dropdown to constrain it). */
function hfjeReadPicks_() {
  var sh;
  try { sh = hfSheet_(HF_TABS.judgingEntry); } catch (e) { return { picks: {}, stray: [], rows: [] }; }
  var vals = sh.getDataRange().getValues();
  var picks = {}, stray = [], rows = [], key = '';
  for (var r = HF_JE_FIRST_ROW; r <= vals.length; r++) {
    var row = vals[r - 1] || [];
    var k = hfStr_(row[HF_JE_COL.key - 1]).trim();
    var prize = hfStr_(row[HF_JE_COL.prize - 1]).trim().toLowerCase();
    var win = hfStr_(row[HF_JE_COL.winner - 1]).trim();
    if (k) key = k;
    if (!prize) { if (win) stray.push({ row: r, value: win, key: key }); continue; }
    if (HF_JE_PLACINGS.indexOf(prize) < 0) continue;
    if (win) {
      if (!picks[key]) picks[key] = {};
      picks[key][prize] = win;
      rows.push({ row: r, key: key, placing: prize, label: win });
    }
  }
  return { picks: picks, stray: stray, rows: rows };
}

/** Used by the HF_buildEntries guard: how many picks are sitting here unsynced. */
function hfjeCountPicks_() { return hfjeReadPicks_().rows.length; }

/* =====================================================================
 *  BUILD
 * ===================================================================== */

function HF_buildJudgingEntry() {
  var saved = hfjeReadPicks_().picks;          // preserve BEFORE clearing
  var g = hfjeGroups_(), groups = g.groups, order = g.order;

  var rows = [];
  rows.push(['JUDGING ENTRY — pick the winner for each prize. Blank = not awarded.',
             '', '', '', '', '', '', '']);
  rows.push(HF_JE_HEADERS.slice());

  var dropped = [], validation = [];   // validation[i] pairs with rows[i+2]
  order.forEach(function (k) {
    var list = groups[k], head = list[0];
    var isPos = g.posOnly(k);
    var labels = list.map(hfjeLabel_);
    var byId = {};
    list.forEach(function (e) { byId[hfStr_(e['ENTRY #']).trim().toUpperCase()] = hfjeLabel_(e); });

    rows.push([hfjeHeading_(head),
               isPos ? 'POSITION ONLY' : '',
               isPos ? 'no prize money' : '',
               '', '', '', k, '']);
    validation.push(null);

    HF_JE_PLACINGS.forEach(function (p, i) {
      var amt = isPos ? 0 : hfNum_(head[HF_JE_AMOUNT_COLS[i]]);
      // Restore a previous pick, but only if that entry is STILL in this
      // section. Match on entry id, not label — a corrected name would
      // otherwise silently drop a valid pick.
      var keep = '';
      if (saved[k] && saved[k][p]) {
        var id = hfjeParseEntryId_(saved[k][p]);
        if (id && byId[id]) keep = byId[id];
        else dropped.push(k + ' ' + p + ': ' + saved[k][p]);
      }
      rows.push(['', p, amt, keep, '', '', '', keep ? hfjeParseEntryId_(keep) : '']);
      validation.push(labels);
    });
  });

  if (dropped.length) {
    rows.push(['', '', '', '', '', '', '', '']);
    rows.push(['⚠ PICKS DROPPED IN REBUILD — these entries are no longer in their section',
               '', '', '', '', '', '', '']);
    dropped.forEach(function (d) { rows.push([d, '', '', '', '', '', '', '']); });
  }

  var sh = hfSheet_(HF_TABS.judgingEntry, true);
  sh.clear();
  sh.getRange(1, 1, rows.length, HF_JE_HEADERS.length).setValues(rows);
  sh.getRange(1, 1, 1, HF_JE_HEADERS.length)
    .setBackground('#1a2744').setFontColor('#ffffff').setFontWeight('bold');
  sh.getRange(2, 1, 1, HF_JE_HEADERS.length)
    .setBackground('#1a2744').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
  sh.setFrozenRows(2);

  // One rule per SECTION, reused across its four prize rows: 28 rule objects,
  // not 112. Applied in ONE setDataValidations call — per-cell calls would be
  // ~112 API round trips against the 6-minute quota.
  var dvRules = [];
  for (var i = 0; i < validation.length; i++) {
    var labels2 = validation[i];
    if (!labels2) { dvRules.push([null]); continue; }
    dvRules.push([SpreadsheetApp.newDataValidation()
      .requireValueInList(labels2, true)
      .setAllowInvalid(false)   // strict: the winner is always one of THIS section's entries
      .setHelpText('Pick the winning entry for this prize. Leave blank if not awarded.')
      .build()]);
  }
  var dvRange = sh.getRange(HF_JE_FIRST_ROW, HF_JE_COL.winner, dvRules.length, 1);
  dvRange.clearDataValidations();
  dvRange.setDataValidations(dvRules);

  try { sh.hideColumns(HF_JE_COL.key, 2); } catch (e) { /* mock/older runtime */ }
  try { sh.autoResizeColumns(1, HF_JE_HEADERS.length); } catch (e) {}

  var msg = 'JUDGING ENTRY built: ' + order.length + ' section(s), ' +
            (order.length * HF_JE_PLACINGS.length) + ' prize row(s).' +
            (dropped.length ? '  ⚠ ' + dropped.length + ' pick(s) dropped — see the red block.' : '');
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

/* =====================================================================
 *  VALIDATE
 * ===================================================================== */

function hfjeValidate_() {
  var ent = hfReadTable_(HF_TABS.entries, ['ENTRY #', 'EXHIBITOR #', 'SECTION CODE', 'PRIZE TIER']);
  var byEntry = {}, sectionOf = {};
  ent.rows.forEach(function (e) {
    var id = hfStr_(e['ENTRY #']).trim();
    if (!/^E\d+$/.test(id)) return;
    byEntry[id] = e;
    sectionOf[id] = [e['CLASS #'], e['DIVISION'], e['SECTION CODE']].join('||');
  });

  var read = hfjeReadPicks_();
  var fatal = [], warn = [], resolved = [];

  read.stray.forEach(function (s) {
    fatal.push('Row ' + s.row + ': "' + s.value + '" sits on a section heading, not a prize row.');
  });

  read.rows.forEach(function (p) {
    var id = hfjeParseEntryId_(p.label);
    if (!id)             { fatal.push('Row ' + p.row + ': cannot read an entry number from "' + p.label + '".'); return; }
    if (!byEntry[id])    { fatal.push('Row ' + p.row + ': ' + id + ' is not in ENTRIES.'); return; }
    if (sectionOf[id] !== p.key) {
      fatal.push('Row ' + p.row + ': ' + id + ' is not entered in this section.'); return;
    }
    resolved.push({ row: p.row, key: p.key, placing: p.placing, id: id, entry: byEntry[id] });
  });

  // Same entry cannot take two positions in one section.
  var seen = {};
  resolved.forEach(function (r) {
    var kk = r.key + '||' + r.id;
    if (seen[kk]) fatal.push(r.id + ' is picked for both ' + seen[kk] + ' and ' + r.placing + ' in the same section.');
    else seen[kk] = r.placing;
  });

  // A lower placing awarded with no higher one is legal but usually a slip.
  var byKey = {};
  resolved.forEach(function (r) { (byKey[r.key] = byKey[r.key] || {})[r.placing] = r.id; });
  Object.keys(byKey).forEach(function (k) {
    for (var i = 1; i < HF_JE_PLACINGS.length; i++) {
      if (byKey[k][HF_JE_PLACINGS[i]] && !byKey[k][HF_JE_PLACINGS[i - 1]]) {
        warn.push(k + ': ' + HF_JE_PLACINGS[i] + ' awarded but ' + HF_JE_PLACINGS[i - 1] + ' left blank.');
      }
    }
  });

  return { fatal: fatal, warn: warn, resolved: resolved, sections: Object.keys(byKey).length };
}

function HF_checkJudgingEntry() {
  var v = hfjeValidate_();
  var out = [];
  out.push(v.fatal.length ? '❌ ' + v.fatal.length + ' problem(s) — the sync will refuse to run'
                          : '✅ no blocking problems');
  v.fatal.forEach(function (f) { out.push('   ❌ ' + f); });
  v.warn.forEach(function (w) { out.push('   ⚠ ' + w); });
  out.push('');
  out.push(v.resolved.length + ' pick(s) across ' + v.sections + ' section(s).');
  var msg = out.join('\n');
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

/* =====================================================================
 *  SYNC → RESULTS
 * ===================================================================== */

function HF_syncJudgingToResults() {
  var v = hfjeValidate_();
  if (v.fatal.length) {
    var stop = '❌ REFUSING TO SYNC — ' + v.fatal.length + ' problem(s). Nothing was written.\n\n   ' +
               v.fatal.join('\n   ');
    Logger.log(stop);
    try { SpreadsheetApp.getUi().alert(stop); } catch (e) {}
    return stop;
  }

  var res = hfReadTable_(HF_TABS.results, ['RESULT #', 'ENTRY #', 'PLACING', 'FINAL PRIZE ($)']);
  var sh = res.sheet;
  var col = {}; res.cols.forEach(function (c, i) { if (c) col[c] = i + 1; });

  // Merge, don't replace: DONATED? / DONATION AMOUNT / JUDGE / NOTES are typed
  // by hand and are load-bearing for the money chain. A full rewrite would
  // silently discard donations.
  var rowOf = {};
  res.rows.forEach(function (r) {
    var id = hfStr_(r['ENTRY #']).trim();
    if (id) rowOf[id] = r.__row;
  });

  var picked = {}, updated = 0, added = 0;
  var nextRow = res.headerRow + res.rows.length + 1;
  v.resolved.forEach(function (r) {
    picked[r.id] = 1;
    var row = rowOf[r.id];
    if (!row) { row = nextRow++; added++; sh.getRange(row, col['ENTRY #']).setValue(r.id); }
    else updated++;
    sh.getRange(row, col['PLACING']).setValue(r.placing);
    if (col['RESULT #'] && !hfStr_(sh.getRange(row, col['RESULT #']).getValue()).trim()) {
      sh.getRange(row, col['RESULT #']).setValue('R' + (updated + added));
    }
  });

  // A RESULTS row this tab does not cover is either a hand-typed placing or a
  // retracted one. Either way it still reaches the cheque run, and HF_verify
  // cannot catch it — a stale row is internally consistent. Name them.
  var uncovered = [];
  res.rows.forEach(function (r) {
    var id = hfStr_(r['ENTRY #']).trim();
    if (id && !picked[id] && hfStr_(r['PLACING']).trim()) uncovered.push(id);
  });

  var msg = 'Synced ' + v.resolved.length + ' pick(s) to RESULTS (' + updated + ' updated, ' + added + ' added).' +
            (uncovered.length ? '\n\n⚠ ' + uncovered.length + ' RESULTS row(s) NOT covered by JUDGING ENTRY and left as they are: ' +
                                uncovered.join(', ') + '\n   Check these are meant to be there — they will still be paid.' : '') +
            (v.warn.length ? '\n\n⚠ ' + v.warn.join('\n   ⚠ ') : '');
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}
