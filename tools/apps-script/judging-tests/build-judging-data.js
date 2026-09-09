#!/usr/bin/env node
/**
 * Build js/judging-data.js from the FIXTURE (mock-book.json), through the
 * same hfjwBuildData_ / hfjwDataFile_ the workbook menu item uses, so the
 * file the page is developed and tested against has exactly the shape the
 * fair-morning export will have.
 *
 *   node tools/apps-script/judging-tests/build-judging-data.js            # writes js/judging-data.js
 *   node tools/apps-script/judging-tests/build-judging-data.js --stdout   # prints it
 *
 * ⚠ The fixture is a SNAPSHOT of registrations. On fair morning the real
 * file comes from the workbook: 🏆 Havelock Fair → 5. Export judging data.
 */
const fs = require('fs');
const path = require('path');
const HERE = __dirname;
const book = JSON.parse(fs.readFileSync(path.join(HERE, 'mock-book.json'), 'utf8'));
const mock = require('./mock-sheets.js').makeBook(book);
global.SpreadsheetApp = mock.SpreadsheetApp;
global.Logger = { log() {} };
global.ContentService = { createTextOutput: s => ({ setMimeType() { return { getContent: () => s }; } }), MimeType: { JSON: 'json' } };

eval(fs.readFileSync(path.join(HERE, '..', 'HF_JudgingSystem.gs'), 'utf8'));
eval(fs.readFileSync(path.join(HERE, '..', 'HF_JudgingEntry.gs'), 'utf8'));
eval(fs.readFileSync(path.join(HERE, '..', 'HF_JudgingWeb.gs'), 'utf8'));

HF_buildEntries();
const data = hfjwBuildData_();
const text = hfjwDataFile_(data, 'build-judging-data.js, FIXTURE — not the live workbook');

if (process.argv.includes('--stdout')) { process.stdout.write(text); }
else {
  const out = path.join(HERE, '..', '..', '..', 'js', 'judging-data.js');
  fs.writeFileSync(out, text);
  console.log('wrote ' + path.relative(process.cwd(), out) + ': ' + data.sections.length + ' sections, ' +
              data.groups.length + ' groups, ' + data.sections.reduce((n, s) => n + s.entries.length, 0) + ' entries');
}
