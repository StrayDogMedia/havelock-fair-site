/* A mock SpreadsheetApp good enough to run HF_JudgingSystem.gs end to end.
 *
 * Extracted from gas-test.js so the harness and the simulator share ONE copy —
 * they had drifted apart, and the data-validation support added for the
 * JUDGING ENTRY tab would otherwise have had to be written twice.
 *
 * Data validation is recorded, not enforced: rules are stored per cell so
 * assertions can read back "which entries does THIS dropdown offer?", which is
 * the whole point of the per-section dropdowns.
 */

function makeBook(book) {
  function pad(grid) {
    const w = Math.max(...grid.map(r => r.length), 30);
    return grid.map(r => { const c = r.slice(); while (c.length < w) c.push(''); return c; });
  }
  const SHEETS = {};

  /* ---- DataValidation ---- */
  function DataValidationBuilder() {
    const spec = { type: null, values: null, allowInvalid: true, help: '', multi: false };
    const b = {
      requireValueInList(values, showDropdown) {
        spec.type = 'LIST'; spec.values = values.slice(); spec.showDropdown = showDropdown !== false; return b;
      },
      setAllowInvalid(v) { spec.allowInvalid = !!v; return b; },
      setHelpText(t) { spec.help = String(t || ''); return b; },
      // Real Apps Script only has this on newer runtimes. The live account does
      // NOT have it (confirmed 2026-09-06), so the mock throws to match — code
      // that calls it must carry its own fallback.
      setMultiSelect() { throw new Error('setMultiSelect is not available on this runtime'); },
      build() {
        return {
          _spec: spec,
          getCriteriaValues: () => [spec.values],
          getHelpText: () => spec.help,
          copy: () => b
        };
      }
    };
    return b;
  }

  function Range(sheet, r, c, nr, nc) {
    const self = {
      setValues(v) {
        for (let i = 0; i < v.length; i++) for (let j = 0; j < v[i].length; j++) {
          sheet._ensure(r + i, c + j); sheet.g[r + i - 1][c + j - 1] = v[i][j];
        }
        return self;
      },
      setValue(v) { sheet._ensure(r, c); sheet.g[r - 1][c - 1] = v; return self; },
      getValues() {
        const o = [];
        for (let i = 0; i < nr; i++) { const row = [];
          for (let j = 0; j < nc; j++) { sheet._ensure(r + i, c + j); row.push(sheet.g[r + i - 1][c + j - 1]); }
          o.push(row); }
        return o;
      },
      getValue() { sheet._ensure(r, c); return sheet.g[r - 1][c - 1]; },
      clearContent() {
        for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { sheet._ensure(r+i,c+j); sheet.g[r+i-1][c+j-1] = ''; }
        return self;
      },
      /* ---- validation ---- */
      setDataValidation(rule) {
        for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) sheet._setDV(r + i, c + j, rule);
        return self;
      },
      setDataValidations(rules) {
        for (let i = 0; i < rules.length; i++)
          for (let j = 0; j < rules[i].length; j++) sheet._setDV(r + i, c + j, rules[i][j]);
        return self;
      },
      getDataValidation() { return sheet._getDV(r, c); },
      getDataValidations() {
        const o = [];
        for (let i = 0; i < nr; i++) { const row = [];
          for (let j = 0; j < nc; j++) row.push(sheet._getDV(r + i, c + j));
          o.push(row); }
        return o;
      },
      clearDataValidations() {
        for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) sheet._setDV(r + i, c + j, null);
        return self;
      },
      /* ---- formatting: accepted and ignored ---- */
      setBackground() { return self; }, setBackgrounds() { return self; },
      setFontColor() { return self; }, setFontColors() { return self; },
      setFontWeight() { return self; }, setFontSize() { return self; },
      setFontStyle() { return self; }, setNumberFormat() { return self; },
      setHorizontalAlignment() { return self; }, setWrap() { return self; },
      merge() { return self; }, setBorder() { return self; },
      getRow: () => r, getColumn: () => c, getNumRows: () => nr, getNumColumns: () => nc,
      getA1Notation: () => 'R' + r + 'C' + c
    };
    return self;
  }

  function Sheet(name, grid) {
    return {
      name, g: grid, dv: {},
      _ensure(r, c) { while (this.g.length < r) this.g.push([]); const row = this.g[r-1]; while (row.length < c) row.push(''); },
      _setDV(r, c, rule) { if (rule) this.dv[r + ',' + c] = rule; else delete this.dv[r + ',' + c]; },
      _getDV(r, c) { return this.dv[r + ',' + c] || null; },
      getName() { return this.name; },
      getDataRange() { const h = this.g.length, w = Math.max(...this.g.map(r => r.length), 1); return Range(this, 1, 1, h, w); },
      getRange(r, c, nr, nc) { return Range(this, r, c, nr === undefined ? 1 : nr, nc === undefined ? 1 : nc); },
      getLastRow() { for (let i = this.g.length; i >= 1; i--) if (this.g[i-1].some(v => String(v).trim() !== '')) return i; return 0; },
      getLastColumn() { return Math.max(...this.g.map(r => r.length), 1); },
      getMaxRows() { return Math.max(this.g.length, 1); },
      getMaxColumns() { return this.getLastColumn(); },
      insertRowsAfter(after, howMany) { for (let i = 0; i < howMany; i++) this.g.push([]); return this; },
      clear() { this.g = [[]]; this.dv = {}; return this; },
      setFrozenRows() { return this; }, setFrozenColumns() { return this; },
      autoResizeColumns() { return this; }, setColumnWidth() { return this; },
      hideColumns() { return this; }, protect() { return { setDescription(){return this;}, addEditor(){return this;},
        removeEditors(){return this;}, getEditors(){return [];}, setUnprotectedRanges(){return this;},
        setWarningOnly(){return this;}, remove(){}, isWarningOnly(){return false;}, getDescription(){return '';} }; },
      getProtections() { return []; }
    };
  }

  Object.keys(book).forEach(k => { SHEETS[k] = Sheet(k, pad(book[k])); });

  const SpreadsheetApp = {
    openById: () => ({
      getSheetByName: n => SHEETS[n] || null,
      insertSheet: n => (SHEETS[n] = Sheet(n, [[]])),
      getSheets: () => Object.keys(SHEETS).map(k => SHEETS[k])
    }),
    newDataValidation: () => DataValidationBuilder(),
    getUi: () => { throw new Error('no ui'); },
    ProtectionType: { SHEET: 'SHEET', RANGE: 'RANGE' }
  };

  return { SHEETS, SpreadsheetApp };
}

module.exports = { makeBook };
