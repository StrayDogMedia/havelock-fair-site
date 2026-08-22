/* Checks the mailing-address + under-13 fields on both money-generating tabs.
   These drive prize cheques, so they are worth a dedicated test. */
const fs=require('fs'),{JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{runScripts:'dangerously',
 url:'https://havelockfair.ca/pages/registration.html',
 beforeParse(w){w.alert=()=>{};w.scrollTo=()=>{};w.print=()=>{};
  w.fetch=(u,o)=>{w.__last=o.body;return Promise.resolve({json:()=>Promise.resolve({result:'success',exhibitorId:'HF2026-TEST',emailSent:true})});};}});
const w=dom.window,d=w.document;
let fails=0; const ck=(l,g,e)=>{const ok=JSON.stringify(g)===JSON.stringify(e);if(!ok)fails++;
  console.log(`  ${ok?'✅':'❌'} ${l}`);if(!ok)console.log('       got ',JSON.stringify(g),'\n       want',JSON.stringify(e));};
const fill=(form,map)=>Object.keys(map).forEach(n=>{const el=form.querySelector(`[name="${n}"]`);
  if(!el)throw new Error('missing field: '+n);
  if(el.type==='checkbox')el.checked=!!map[n];else el.value=map[n];});

w.addEventListener('load',()=>setTimeout(async()=>{
  w.Element.prototype.scrollIntoView=function(){};

  // ---------- GENERAL ----------
  w.addEntry('homegarden');
  const card=d.querySelector('#entries-homegarden .entry-card'), id=card.id.replace('entry-','');
  card.querySelector(`[name="entry_${id}_class"]`).value='14'; w.onClassChange(Number(id));
  card.querySelectorAll(`[name="entry_${id}_section[]"]`)[0].checked=true;
  const gf=d.getElementById('form-general');
  fill(gf,{firstName:'Ada',lastName:'Lovelace',phone:'450-555-0000',email:'a@example.invalid',
           street:'123 Route 202',unit:'Apt 4',city:'Havelock',province:'QC',postal:'J0S 2C0',under13:true});
  gf.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(r=>setTimeout(r,300));
  const g=JSON.parse(w.__last);
  console.log('\nGENERAL tab:');
  ck('formType still General', g.formType, 'General');
  ck('street', g.street, '123 Route 202');
  ck('unit', g.unit, 'Apt 4');
  ck('city', g.city, 'Havelock');
  ck('province', g.province, 'QC');
  ck('postal', g.postal, 'J0S 2C0');
  ck('under13 = Yes when ticked', g.under13, 'Yes');
  ck('composed one-line address kept for back-compat', g.address, '123 Route 202, Apt 4, Havelock QC J0S 2C0');

  // under13 unticked -> "No"
  d.querySelector('[name="under13"]').checked=false;
  gf.style.display=''; gf.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(r=>setTimeout(r,300));
  ck('under13 = No when unticked', JSON.parse(w.__last).under13, 'No');

  // ---------- YOUTH ----------
  const yf=d.getElementById('form-youth');
  fill(yf,{youthFirstName:'Riley',youthLastName:'Kingsbury',youthDOB:'2014-10-18',youthClass:'26',
           youthGuardian:'Michelle Roy',youthPhone:'514-555-0000',youthEmail:'y@example.invalid',
           youthstreet:'9 Rue Principale',youthcity:'Ormstown',youthprovince:'QC',youthpostal:'J0S 1K0'});
  const ysec=yf.querySelector('input[type=checkbox][name$="[]"]'); if(ysec)ysec.checked=true;
  yf.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(r=>setTimeout(r,300));
  const y=JSON.parse(w.__last);
  console.log('\nYOUTH tab (previously collected NO address at all):');
  ck('formType Youth', y.formType, 'Youth');
  ck('street', y.street, '9 Rue Principale');
  ck('city', y.city, 'Ormstown');
  ck('postal', y.postal, 'J0S 1K0');
  ck('composed address', y.address, '9 Rue Principale, Ormstown QC J0S 1K0');

  console.log(fails?`\n❌ ${fails} failed`:'\n✅ all address/age checks passed');
  process.exit(fails?1:0);
},250));
