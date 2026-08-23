const fs=require('fs'),{JSDOM}=require('jsdom');
const tsv=fs.readFileSync('entries.tsv','utf8');
const PAGE='/Users/jesseroskies/havelock-fair-site/pages/results-entry.html';
const store={};
function open(){
  return new JSDOM(fs.readFileSync(PAGE,'utf8'),{runScripts:'dangerously',
    url:'https://havelockfair.ca/pages/results-entry.html',
    beforeParse(w){w.alert=m=>{w.__alert=m;};w.confirm=()=>true;w.scrollTo=()=>{};
      Object.defineProperty(w,'localStorage',{value:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}}});}});
}
let fails=0;const ck=(l,c,x)=>{if(!c)fails++;console.log(`  ${c?'✅':'❌'} ${l}${!c&&x!==undefined?'  -> '+x:''}`);};
const dom=open(),w=dom.window,d=w.document;
w.addEventListener('load',()=>setTimeout(()=>{
  d.getElementById('paste').value=tsv;
  d.getElementById('btn-load').click();
  ck('entries loaded',/entries loaded/.test(d.getElementById('load-msg').textContent),d.getElementById('load-msg').textContent);
  ck('judging view shown',d.getElementById('step-load').classList.contains('hide')&&!d.getElementById('step-filter').classList.contains('hide'));
  const secs=d.querySelectorAll('#sections .sec');
  ck('sections rendered',secs.length>0,secs.length);
  ck('4-H shows position-only badge',!!d.querySelector('.noprize'));
  ck('prize sections show amounts',[...d.querySelectorAll('.prizes')].some(p=>/\$/.test(p.textContent)));
  ck('class filter populated',d.getElementById('f-class').options.length>1,d.getElementById('f-class').options.length);

  // find the section that actually holds two exhibitors (sorted position varies)
  const idxOf = () => [...d.querySelectorAll('#sections .sec')].findIndex(s=>s.querySelectorAll('.ent').length===2);
  let di = idxOf();
  ck('found a section with 2 exhibitors',di>-1,di);
  const secN = () => d.querySelectorAll('#sections .sec')[di];
  secN().querySelectorAll('.ent')[0].querySelectorAll('.places button')[0].click();
  di = idxOf();
  ck('placing persisted',/":"1"/.test(store['hf-results-2026']||''));
  ck('section flagged done',secN().classList.contains('done'));
  secN().querySelectorAll('.ent')[1].querySelectorAll('.places button')[0].click();
  di = idxOf();
  ck('two 1st places warns',!!d.querySelector('.dupe'),'no warning shown');
  secN().querySelectorAll('.ent')[1].querySelectorAll('.places button')[1].click();
  di = idxOf();
  ck('fixing to 2nd clears the warning',!d.querySelector('.dupe'));

  // HM carries no money styling
  const anySec=[...d.querySelectorAll('#sections .sec')].find(x=>!x.classList.contains('done'));
  anySec.querySelectorAll('.ent')[0].querySelectorAll('.places button')[4].click();
  ck('HM marked as no-money',anySec.querySelectorAll('.ent')[0].querySelectorAll('.places button')[4].className.indexOf('nomoney')>-1);

  // filter: only-todo hides judged sections
  const before=d.querySelectorAll('#sections .sec').length;
  d.getElementById('f-todo').checked=true; d.getElementById('f-todo').onchange();
  ck('"still to judge" filter hides judged sections',d.querySelectorAll('#sections .sec').length<before,
     d.querySelectorAll('#sections .sec').length+' vs '+before);
  d.getElementById('f-todo').checked=false; d.getElementById('f-todo').onchange();

  d.getElementById('btn-export').click();
  const out=d.getElementById('out').value, lines=out.split('\n');
  ck('export header correct',lines[0]==='ENTRY #\tPLACING',lines[0]);
  ck('every export line is 2 columns',lines.slice(1).every(l=>l.split('\t').length===2),lines[1]);
  ck('export contains the recorded placings',lines.length-1===3,lines.length-1);
  ck('export panel shown',!d.getElementById('step-export').classList.contains('hide'));

  const dom2=open();
  dom2.window.addEventListener('load',()=>setTimeout(()=>{
    const d2=dom2.window.document;
    ck('reopening resumes from localStorage — no re-paste',
       d2.getElementById('step-load').classList.contains('hide')&&d2.querySelectorAll('#sections .sec').length>0);
    ck('placings survived the reload',/":"1"/.test(store['hf-results-2026']||''));
    console.log(fails?`\n❌ ${fails} failed`:'\n✅ all results-entry checks passed');process.exit(fails?1:0);
  },300));
},300));
