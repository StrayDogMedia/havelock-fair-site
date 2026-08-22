const fs=require('fs'),{JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{runScripts:'dangerously',
 url:'https://havelockfair.ca/pages/registration.html',
 beforeParse(w){w.alert=()=>{};w.scrollTo=()=>{};w.print=()=>{};
  w.fetch=(u,o)=>{w.__body=o.body;return Promise.resolve({json:()=>Promise.resolve({result:'success',exhibitorId:'X',emailSent:true})});};}});
const w=dom.window,d=w.document;
let fails=0; const ck=(l,g,e)=>{const ok=JSON.stringify(g)===JSON.stringify(e);if(!ok)fails++;
  console.log(`  ${ok?'✅':'❌'} ${l}`); if(!ok)console.log('       got ',JSON.stringify(g),'\n       want',JSON.stringify(e));};
w.addEventListener('load',()=>setTimeout(()=>{
  w.Element.prototype.scrollIntoView=function(){};
  w.addEntry('livestock');
  const card=d.querySelector('#entries-livestock .entry-card'), id=card.id.replace('entry-','');
  card.querySelector(`[name="entry_${id}_class"]`).value='10'; w.onClassChange(Number(id));
  const breeds=[...card.querySelectorAll(`[name="entry_${id}_breed[]"]`)].map(b=>b.value);
  ck('9 bird types offered for Fowl', breeds.length, 9);
  ck('bird types correct', breeds.slice(0,3), ['Chickens / Poulets','Turkeys / Dindons','Guineas / Pintades']);
  const lbl=card.querySelector('.breed-selector [data-en]');
  ck('label says bird type, not breed', lbl.textContent.trim(), 'Type of bird — select all that apply');
  // cross-product: 2 birds x 2 sections = 4
  [0,3].forEach(i=>{const b=card.querySelectorAll(`[name="entry_${id}_breed[]"]`)[i];b.checked=true;b.dispatchEvent(new w.Event('change',{bubbles:true}));});
  [0,1].forEach(i=>{const x=card.querySelectorAll(`[name="entry_${id}_section[]"]`)[i];x.checked=true;x.dispatchEvent(new w.Event('change',{bubbles:true}));});
  ck('badge = 4 entries (2 birds x 2 sections)', d.getElementById('count-livestock').textContent.trim(), '4 entries');
  // class 1 keeps the Division label; class 3 keeps Breed(s)
  w.addEntry('livestock');
  const c2=[...d.querySelectorAll('#entries-livestock .entry-card')].pop(), i2=c2.id.replace('entry-','');
  c2.querySelector(`[name="entry_${i2}_class"]`).value='1'; w.onClassChange(Number(i2));
  ck('class 1 label = Division', c2.querySelector('.breed-selector [data-en]').textContent.trim(),'Division — select all that apply');
  c2.querySelector(`[name="entry_${i2}_class"]`).value='3'; w.onClassChange(Number(i2));
  ck('class 3 label falls back to Breed(s)', c2.querySelector('.breed-selector [data-en]').textContent.trim(),'Breed(s) — select all that apply');
  // FR toggle on the new label
  c2.querySelector(`[name="entry_${i2}_class"]`).value='10'; w.onClassChange(Number(i2));
  w.setLang('fr');
  ck('FR label', c2.querySelector('.breed-selector [data-en]').textContent.trim(),"Type de volaille — cochez tout ce qui s'applique");
  console.log(fails?`\n❌ ${fails} failed`:'\n✅ all fowl checks passed'); process.exit(fails?1:0);
},250));
