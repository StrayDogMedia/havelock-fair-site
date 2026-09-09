/**
 * HAVELOCK FAIR 2026 — JUDGING WEB APP (backend)
 * =====================================================================
 * Receives placings from pages/judging.html on havelockfair.ca and writes
 * them into RESULTS. Paste this as a NEW file in the *Havelock Forms*
 * Apps Script project (the one bound to the Master Workbook, where
 * HF_JudgingSystem.gs and HF_JudgingEntry.gs already live), then deploy
 * it as its OWN web app. See INSTALL_JUDGING_WEB.md.
 *
 * 🔴 This is deliberately a SEPARATE deployment from the registration
 * backend on admin@havelockfair.ca. That project's doPost has an
 * else-fallback that writes a generic row and returns success, so an
 * unrecognised payload would land as junk in REGISTRATIONS while
 * reporting fine. Here, anything that is not a judging payload is refused
 * out loud, and nothing is ever written to REGISTRATIONS.
 *
 *   doGet()                  health check: {ok:true, app:'HF_JudgingWeb'}
 *   doPost()                 the Submit: validate, merge into RESULTS, log
 *   HF_exportJudgingData()   menu item — builds js/judging-data.js for the site
 *
 * MERGE RULES (same shape as HF_syncJudgingToResults, and the reason the
 * money chain stays provable):
 *   - a submitted SECTION is authoritative for that section: every entry in
 *     it either gets the submitted placing or has its placing CLEARED
 *   - one RESULTS row per ENTRY # — update the row if it exists, append if not
 *   - DONATED? / DONATION AMOUNT / NOTES are never touched; JUDGE is filled
 *     only when blank
 *   - a section with a problem (unknown entry, entry not in that section,
 *     one entry given two placings) is REFUSED whole and named in the
 *     response; the other sections in the same POST still go through
 *
 * Requires HF_JudgingSystem.gs (hfReadTable_, hfStr_, hfNum_, HF_TABS,
 * HF_NO_PRIZE_TIER) and HF_JudgingEntry.gs (hfjeGroups_, hfjeLabel_).
 * ===================================================================== */

var HF_JW_VERSION  = 1;
var HF_JW_KIND     = 'judging-results';
var HF_JW_LOG_TAB  = 'JUDGING LOG';
var HF_JW_PLACINGS = ['1st', '2nd', '3rd', '4th'];
var HF_JW_LOG_HEADERS = ['RECEIVED', 'DEVICE', 'JUDGE', 'SECTION KEY', 'PICKS', 'OUTCOME', 'DETAIL'];

/* ---------------------------------------------------------------------
 *  HTTP
 * ------------------------------------------------------------------- */

function hfjwJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return hfjwJson_({ ok: true, app: 'HF_JudgingWeb', version: HF_JW_VERSION,
                     time: new Date().toISOString() });
}

function doPost(e) {
  var lock = null;
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    var body;
    try { body = JSON.parse(raw); }
    catch (err) { return hfjwJson_({ ok: false, error: 'Body is not JSON.' }); }

    // Loud refusal. Never fall through to "write something anyway".
    if (!body || body.kind !== HF_JW_KIND) {
      return hfjwJson_({ ok: false, error: 'Not a judging payload (kind must be "' + HF_JW_KIND + '").' });
    }
    if (!body.sections || !body.sections.length) {
      return hfjwJson_({ ok: false, error: 'No sections in payload.' });
    }

    // Several judges may press Send in the same second. Serialise the merge
    // so two appends cannot land on the same RESULTS row.
    try { lock = LockService.getScriptLock(); lock.waitLock(30000); }
    catch (err) { return hfjwJson_({ ok: false, error: 'Workbook busy — try again.', retry: true }); }

    var out = hfjwApply_(body);
    return hfjwJson_(out);
  } catch (err) {
    Logger.log('HF_JudgingWeb doPost error: ' + err);
    return hfjwJson_({ ok: false, error: String(err && err.message ? err.message : err), retry: true });
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (e2) {} }
  }
}

/* ---------------------------------------------------------------------
 *  THE MERGE
 * ------------------------------------------------------------------- */

function hfjwSectionKey_(e) {
  return [e['CLASS #'], e['DIVISION'], e['SECTION CODE']].join('||');
}

/** Read ENTRIES once: entry -> row, and section key -> [entry ids]. */
function hfjwEntryIndex_() {
  var ent = hfReadTable_(HF_TABS.entries, ['ENTRY #', 'EXHIBITOR #', 'SECTION CODE', 'PRIZE TIER']);
  var byEntry = {}, inSection = {};
  ent.rows.forEach(function (e) {
    var id = hfStr_(e['ENTRY #']).trim().toUpperCase();
    if (!/^E\d+$/.test(id)) return;                 // skips the ⚠ NEEDS ATTENTION block
    byEntry[id] = e;
    var k = hfjwSectionKey_(e);
    (inSection[k] = inSection[k] || []).push(id);
  });
  return { byEntry: byEntry, inSection: inSection };
}

/** Validate ONE submitted section against ENTRIES. Returns [] when clean. */
function hfjwValidateSection_(idx, sec) {
  var errors = [];
  var key = hfStr_(sec && sec.key).trim();
  if (!key || !idx.inSection[key]) { errors.push('Unknown section "' + key + '" — not in ENTRIES.'); return errors; }
  var picks = (sec.picks && typeof sec.picks === 'object') ? sec.picks : {};
  var seen = {};
  Object.keys(picks).forEach(function (placing) {
    var id = hfStr_(picks[placing]).trim().toUpperCase();
    if (!id) return;                                // blank = not awarded
    if (HF_JW_PLACINGS.indexOf(placing) < 0) { errors.push('"' + placing + '" is not a placing.'); return; }
    if (!idx.byEntry[id])                      { errors.push(id + ' is not in ENTRIES.'); return; }
    if (hfjwSectionKey_(idx.byEntry[id]) !== key) { errors.push(id + ' is not entered in this section.'); return; }
    if (seen[id]) errors.push(id + ' is picked for both ' + seen[id] + ' and ' + placing + '.');
    else seen[id] = placing;
  });
  return errors;
}

function hfjwApply_(body) {
  var idx = hfjwEntryIndex_();
  var res = hfReadTable_(HF_TABS.results, ['RESULT #', 'ENTRY #', 'PLACING', 'FINAL PRIZE ($)']);
  var sh = res.sheet;
  var col = {}; res.cols.forEach(function (c, i) { if (c) col[c] = i + 1; });
  if (!col['ENTRY #'] || !col['PLACING']) throw new Error('RESULTS is missing ENTRY # or PLACING.');

  // Existing rows by entry, next free row, next RESULT #. The next row is
  // max(row)+1, NOT header+count+1 — a blank row in the middle of RESULTS
  // would otherwise make an append overwrite the last real row.
  var rowOf = {}, lastRow = res.headerRow, maxR = 0;
  res.rows.forEach(function (r) {
    var id = hfStr_(r['ENTRY #']).trim().toUpperCase();
    if (id) rowOf[id] = r.__row;
    if (r.__row > lastRow) lastRow = r.__row;
    var m = hfStr_(r['RESULT #']).trim().match(/^R(\d+)$/i);
    if (m && Number(m[1]) > maxR) maxR = Number(m[1]);
  });
  var nextRow = lastRow + 1;

  var device = hfStr_(body.device).trim().slice(0, 40);
  var judge  = hfStr_(body.judge).trim().slice(0, 80);
  var received = new Date();
  var log = [], sections = [], totals = { updated: 0, added: 0, cleared: 0, unchanged: 0, refused: 0 };

  function put(row, name, val) { if (col[name]) sh.getRange(row, col[name]).setValue(val); }

  body.sections.forEach(function (sec) {
    var key = hfStr_(sec && sec.key).trim();
    var picks = (sec && sec.picks && typeof sec.picks === 'object') ? sec.picks : {};
    var errors = hfjwValidateSection_(idx, sec);
    if (errors.length) {
      totals.refused++;
      sections.push({ key: key, ok: false, errors: errors });
      log.push([received, device, judge, key, JSON.stringify(picks), 'REFUSED', errors.join(' | ')]);
      return;
    }

    // entry -> placing wanted, for every entry in the section
    var want = {};
    idx.inSection[key].forEach(function (id) { want[id] = ''; });
    Object.keys(picks).forEach(function (placing) {
      var id = hfStr_(picks[placing]).trim().toUpperCase();
      if (id) want[id] = placing;
    });

    var s = { key: key, ok: true, updated: 0, added: 0, cleared: 0, unchanged: 0 };
    Object.keys(want).forEach(function (id) {
      var placing = want[id];
      var row = rowOf[id];
      if (placing) {
        if (!row) {
          row = nextRow++; rowOf[id] = row;
          put(row, 'ENTRY #', id);
          put(row, 'RESULT #', 'R' + (++maxR));
          put(row, 'PLACING', placing);
          if (judge && col['JUDGE']) put(row, 'JUDGE', judge);
          s.added++;
        } else {
          var cur = hfStr_(sh.getRange(row, col['PLACING']).getValue()).trim();
          if (cur === placing) { s.unchanged++; }
          else { put(row, 'PLACING', placing); s.updated++; }
          if (judge && col['JUDGE'] && !hfStr_(sh.getRange(row, col['JUDGE']).getValue()).trim()) put(row, 'JUDGE', judge);
        }
      } else if (row) {
        // Retracted: the entry has a row but the section no longer awards it.
        // Clear the placing and the money that was computed from it; keep the
        // row (and any hand-typed donation/notes) so the office can see it.
        var had = hfStr_(sh.getRange(row, col['PLACING']).getValue()).trim();
        if (had) {
          put(row, 'PLACING', '');
          put(row, 'PRIZE AMOUNT ($)', '');
          put(row, 'FINAL PRIZE ($)', '');
          s.cleared++;
        }
      }
    });
    totals.updated += s.updated; totals.added += s.added; totals.cleared += s.cleared; totals.unchanged += s.unchanged;
    sections.push(s);
    log.push([received, device, judge, key, JSON.stringify(picks), 'OK',
              s.added + ' added, ' + s.updated + ' updated, ' + s.cleared + ' cleared, ' + s.unchanged + ' unchanged']);
  });

  hfjwLog_(log);

  return { ok: true, version: HF_JW_VERSION, receivedAt: received.toISOString(),
           sections: sections, totals: totals };
}

/** Append-only audit trail. One line per submitted section, refused or not,
 *  so "my phone says sent at 11:42" can be checked against the workbook. */
function hfjwLog_(rows) {
  if (!rows.length) return;
  var sh = hfSheet_(HF_JW_LOG_TAB, true);
  var first = hfStr_(sh.getRange(1, 1).getValue()).trim();
  if (first !== HF_JW_LOG_HEADERS[0]) {
    sh.getRange(1, 1, 1, HF_JW_LOG_HEADERS.length).setValues([HF_JW_LOG_HEADERS])
      .setBackground('#1a2744').setFontColor('#ffffff').setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  var at = Math.max(sh.getLastRow(), 1) + 1;
  sh.getRange(at, 1, rows.length, HF_JW_LOG_HEADERS.length).setValues(rows);
}

/* ---------------------------------------------------------------------
 *  js/judging-data.js — the entries the page ships with
 * ------------------------------------------------------------------- */

/** Group id the page uses in ?class=…  Prize classes by number; the two
 *  position-only groupings by name (they have an EMPTY CLASS #). */
function hfjwGroupId_(e) {
  var cls = hfStr_(e['CLASS #']).trim();
  if (cls) return cls;
  var nm = hfStr_(e['CLASS NAME']).trim().toLowerCase();
  if (nm.indexOf('4-h') >= 0 || nm === '4h') return '4h';
  if (nm.indexOf('equestrian') >= 0) return 'eq';
  return nm.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'other';
}

/** Build the data object. Same grouping and order as JUDGING ENTRY
 *  (hfjeGroups_), so the page and the workbook tab agree section for section.
 *  ⚠ Ships to a public (unlisted) URL: names, animal names and reg/ATQ only —
 *  NEVER email, phone, address or DOB. */
function hfjwBuildData_() {
  var g = hfjeGroups_();
  var groups = [], groupSeen = {}, sections = [];
  g.order.forEach(function (k) {
    var list = g.groups[k], head = list[0];
    var gid = hfjwGroupId_(head);
    var cls = hfStr_(head['CLASS #']).trim();
    var className = hfStr_(head['CLASS NAME']).trim();
    if (!groupSeen[gid]) {
      groupSeen[gid] = 1;
      groups.push({ id: gid, cls: cls, name: className,
                    label: cls ? ('Class ' + cls + ' — ' + className) : className,
                    positionOnly: g.posOnly(k) });
    }
    var isPos = g.posOnly(k);
    sections.push({
      key: k, group: gid, cls: cls, className: className,
      division: hfStr_(head['DIVISION']).trim(),
      code: hfStr_(head['SECTION CODE']).trim(),
      desc: hfStr_(head['SECTION DESCRIPTION']).trim(),
      positionOnly: isPos,
      prizes: isPos ? [0, 0, 0, 0]
                    : [hfNum_(head['1ST ($)']), hfNum_(head['2ND ($)']), hfNum_(head['3RD ($)']), hfNum_(head['4TH ($)'])],
      entries: list.map(function (e) {
        return { id: hfStr_(e['ENTRY #']).trim().toUpperCase(),
                 name: hfStr_(e['EXHIBITOR NAME']).trim(),
                 animal: hfStr_(e['ANIMAL NAME']).trim(),
                 tag: hfStr_(e['REG # / ATQ #']).trim(),
                 label: hfjeLabel_(e) };
      })
    });
  });
  return { generatedAt: new Date().toISOString(), version: HF_JW_VERSION,
           groups: groups, sections: sections };
}

/** The file body, byte for byte. Kept in one place so the Node generator
 *  (judging-tests/build-judging-data.js) and this menu item cannot drift. */
function hfjwDataFile_(data, source) {
  return [
    '/* GENERATED by HF_JudgingWeb.gs (' + (source || 'HF_exportJudgingData') + ') at ' + data.generatedAt + '.',
    ' * DO NOT EDIT BY HAND. Rebuild from the workbook: 🏆 Havelock Fair → 5. Export judging data,',
    ' * then paste over this file and push. Regenerate every time ENTRIES is rebuilt.',
    ' * ' + data.sections.length + ' section(s) across ' + data.groups.length + ' grouping(s); ' +
      data.sections.reduce(function (n, s) { return n + s.entries.length; }, 0) + ' entries. */',
    'window.HF_JUDGING = ' + JSON.stringify(data) + ';',
    ''
  ].join('\n');
}

/** Menu item. Shows the file in a dialog to copy into js/judging-data.js. */
function HF_exportJudgingData() {
  var data = hfjwBuildData_();
  var text = hfjwDataFile_(data, 'HF_exportJudgingData');
  var msg = 'judging-data.js: ' + data.sections.length + ' section(s), ' + data.groups.length +
            ' grouping(s), ' + data.sections.reduce(function (n, s) { return n + s.entries.length; }, 0) + ' entries.';
  Logger.log(msg);
  try {
    var html = HtmlService.createHtmlOutput(
      '<p style="font:14px sans-serif;margin:0 0 8px">' + msg + ' Copy everything below into <b>js/judging-data.js</b> and push.</p>' +
      '<textarea id="t" style="width:100%;height:340px;font:12px monospace" readonly>' +
      text.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</textarea>' +
      '<p><button onclick="var t=document.getElementById(\'t\');t.select();document.execCommand(\'copy\');this.textContent=\'Copied\'">Copy to clipboard</button></p>'
    ).setWidth(760).setHeight(460);
    SpreadsheetApp.getUi().showModalDialog(html, 'Export judging data');
  } catch (e) { /* not run from the UI */ }
  return text;
}
