const fs=require('fs');
const book=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
function pad(g){const w=Math.max(...g.map(r=>r.length),30);return g.map(r=>{const c=r.slice();while(c.length<w)c.push('');return c;});}
const S={};Object.keys(book).forEach(k=>{S[k]=mk(k,pad(book[k]));});
function Rg(sh,r,c,nr,nc){return{setValues(v){for(let i=0;i<v.length;i++)for(let j=0;j<v[i].length;j++){sh._e(r+i,c+j);sh.g[r+i-1][c+j-1]=v[i][j];}return this;},
 setValue(v){sh._e(r,c);sh.g[r-1][c-1]=v;return this;},
 getValues(){const o=[];for(let i=0;i<nr;i++){const w=[];for(let j=0;j<nc;j++){sh._e(r+i,c+j);w.push(sh.g[r+i-1][c+j-1]);}o.push(w);}return o;},
 clearContent(){return this;},setBackground(){return this;},setFontColor(){return this;},setFontWeight(){return this;},setFontSize(){return this;}};}
function mk(n,g){return{name:n,g,_e(r,c){while(this.g.length<r)this.g.push([]);const w=this.g[r-1];while(w.length<c)w.push('');},
 getDataRange(){return Rg(this,1,1,this.g.length,Math.max(...this.g.map(r=>r.length),1));},
 getRange(r,c,nr,nc){return Rg(this,r,c,nr===undefined?1:nr,nc===undefined?1:nc);},
 getLastColumn(){return Math.max(...this.g.map(r=>r.filter(x=>String(x).trim()!=='').length),0)||this.g[0].length;},
 getLastRow(){return this.g.length;},clear(){this.g=[[]];return this;},setFrozenRows(){return this;},autoResizeColumns(){return this;}};}
global.SpreadsheetApp={openById:()=>({getSheetByName:n=>S[n]||null,insertSheet:n=>(S[n]=mk(n,[[]]))}),getUi:()=>{throw new Error('no ui');}};
global.Logger={log:()=>{}};
eval(fs.readFileSync('/Users/jesseroskies/Documents/Claude/Projects/Havelock Fair/HF_JudgingSystem.gs','utf8'));
let fails=0;const ck=(l,c,x)=>{if(!c)fails++;console.log(`  ${c?'✅':'❌'} ${l}${!c&&x!==undefined?'  -> '+x:''}`);};
console.log('\n=== before upgrade ===');
let rep=HF_checkPatch();
ck('checkPatch flags the missing columns', /ACTION NEEDED/.test(rep) && /missing/.test(rep));
console.log('\n=== HF_upgradeRegistrationsSchema() ===');
const m=HF_upgradeRegistrationsSchema();console.log('  '+m);
ck('appended 6 columns', /Appended 6 column/.test(m), m);
const hdr=S['REGISTRATIONS'].g[0];
ck('headers now end with the new six', hdr.slice(-6).join('|')==='Street Address|Apt / Unit|City|Province|Postal Code|Under 13?', hdr.slice(-6));
console.log('\n=== idempotency ===');
const m2=HF_upgradeRegistrationsSchema();console.log('  '+m2);
ck('second run is a no-op', /already current/.test(m2), m2);
console.log('\n=== after upgrade, before Code.gs patch ===');
rep=HF_checkPatch();
console.log(rep.split('\n').map(l=>'  '+l).join('\n'));
ck('warns that columns exist but nothing lands', /has NOT been patched/.test(rep));
console.log(fails?`\n❌ ${fails} failed`:'\n✅ schema-upgrade checks passed');
process.exit(fails?1:0);
