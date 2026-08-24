const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const ROOT='/Users/jesseroskies/havelock-fair-site';
let fails=0;const ck=(l,c,x)=>{if(!c)fails++;console.log(`  ${c?'✅':'❌'} ${l}${!c&&x!==undefined?'  -> '+x:''}`);};

function boot(rel){
  return new Promise(res=>{
    const file=path.join(ROOT,rel);
    // Served over real HTTP: file:// is an opaque origin, so localStorage throws
    // and i18n.js cannot initialise currentLang. That is a jsdom constraint,
    // not a site bug -- the live site is https.
    const dom=new JSDOM(fs.readFileSync(file,'utf8'),{
      runScripts:'dangerously', resources:'usable',
      url:'http://localhost:8765/'+rel, pretendToBeVisual:true,
      beforeParse(w){ w.scrollTo=()=>{};
        w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},removeListener(){}}));
        w.IntersectionObserver=class{constructor(cb){this.cb=cb;}observe(el){this.cb([{isIntersecting:true,target:el}],this);}unobserve(){}disconnect(){}};
      }
    });
    dom.window.addEventListener('load',()=>setTimeout(()=>res(dom),500));
  });
}
(async()=>{
  // ---------- MUSIC PAGE ----------
  console.log('\nMUSIC PAGE — pages/music.html');
  const dom=await boot('pages/music.html'), w=dom.window, d=w.document;
  ck('chrome injected (header + footer)', !!d.querySelector('.hf-header') && !!d.querySelector('.hf-footer'));
  ck('Music nav item rendered by shared chrome', !!d.querySelector('.hf-nav a[href$="music.html"]'));
  ck('nav item marked active on this page', !!d.querySelector('.hf-nav a.active[href$="music.html"]'));
  ck('7 sets rendered', d.querySelectorAll('.set').length===7, d.querySelectorAll('.set').length);
  ck('2 day headings', d.querySelectorAll('.day-heading').length===2);
  ck('no set-photo visible yet (all commented out)', d.querySelectorAll('img.set-photo').length===0);
  const rel=[...d.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>!/^(https?:|mailto:|tel:|#)/.test(h));
  ck('all internal links relative (no leading /)', rel.every(h=>!h.startsWith('/')), rel.filter(h=>h.startsWith('/')).join(','));

  // language toggle — capture every data-i18n string in EN then FR
  const keys=[...new Set([...d.querySelectorAll('[data-i18n]')].map(e=>e.getAttribute('data-i18n')))];
  const snap=()=>{const o={};d.querySelectorAll('[data-i18n]').forEach(e=>{o[e.getAttribute('data-i18n')]=e.textContent.trim();});return o;};
  const en=snap();
  w.setLanguage('fr');
  await new Promise(r=>setTimeout(r,200));
  const fr=snap();
  // Proper nouns: band names and the song title stay byte-identical in every language.
  const BANDS=['music_act_ramblers','music_act_bbking','music_act_stewalice','music_act_durham','music_act_lachance',
               'music_video_title','music_video_card_title'];
  // Identical in EN and FR by nature -- not translation failures.
  const SAME_IN_FR=['nav_directions','nav_contact','nav_menu','nav_photos'];
  const shouldChange=keys.filter(k=>!BANDS.includes(k)&&!SAME_IN_FR.includes(k));
  const unchanged=shouldChange.filter(k=>en[k]===fr[k]);
  ck('every translatable string swapped to FR', unchanged.length===0, 'unchanged: '+unchanged.join(', '));
  ck('band + track names did NOT change with language', BANDS.every(k=>en[k]===fr[k]), BANDS.filter(k=>en[k]!==fr[k]).join(','));
  ck('FR actually French (page title)', /Musique en direct/.test(fr['music_title']), fr['music_title']);
  ck('FR nav label', /Musique/.test(d.querySelector('.hf-nav a[href$="music.html"]').textContent));
  w.setLanguage('es');
  await new Promise(r=>setTimeout(r,200));
  ck('ES falls through cleanly (keys symmetrical)', /M.sica en vivo/.test(d.querySelector('[data-i18n="music_title"]').textContent),
     d.querySelector('[data-i18n="music_title"]').textContent);
  dom.window.close();

  // ---------- SCHEDULE ----------
  console.log('\nSCHEDULE — pages/schedule.html');
  const s=await boot('pages/schedule.html'), sw=s.window, sd=sw.document;
  const cards=()=>[...sd.querySelectorAll('.day-content.active .event-card')];
  const visible=()=>cards().filter(c=>!c.classList.contains('hidden'));
  ck('Saturday timeline built', cards().length>0, cards().length);
  const satMusic=cards().filter(c=>c.dataset.cat==='music');
  ck('Saturday has 4 music cards (Winslow + 3 Ramblers sets)', satMusic.length===4, satMusic.length);
  ck('Ramblers set times present', satMusic.filter(c=>/Pine County Ramblers/.test(c.textContent)).length===3);
  // click the Music filter
  const musicBtn=[...sd.querySelectorAll('.cat-btn')].find(b=>b.dataset.cat==='music');
  ck('Music filter button exists (existing category reused)', !!musicBtn);
  musicBtn.click();
  ck('filter shows only music cards', visible().length>0 && visible().every(c=>c.dataset.cat==='music'),
     visible().map(c=>c.dataset.cat).join(','));
  ck('empty time-groups collapse', [...sd.querySelectorAll('.day-content.active .time-group:not(.hidden)')]
      .every(g=>g.querySelectorAll('.event-card:not(.hidden)').length>0));
  // switch to Sunday, filter should persist
  sd.getElementById('tab-sun').click();
  await new Promise(r=>setTimeout(r,150));
  const sunMusic=cards().filter(c=>c.dataset.cat==='music');
  ck('Sunday has 4 named acts', sunMusic.length===4, sunMusic.length);
  ['BB King with Funky Freddy','Stew & Alice','Durham County Poets','Pierre Lachance & Guy David']
    .forEach(a=>ck('  Sunday lists '+a, sunMusic.some(c=>c.textContent.includes(a))));
  ck('no stale "All day live music" line', !sd.body.textContent.includes('All day live music'));
  // back to All
  [...sd.querySelectorAll('.cat-btn')].find(b=>b.dataset.cat==='all').click();
  ck('"All Events" restores every card', visible().length===cards().length, visible().length+'/'+cards().length);
  // FR relabels the schedule too
  sw.setLanguage('fr');
  await new Promise(r=>setTimeout(r,200));
  ck('FR schedule keeps band names intact', sd.body.textContent.includes('Durham County Poets'));
  /* Venue names now live in js/map-data.js and the schedule renders them by
     pin number, so the old 'scène extérieure' string is gone. Same intent:
     French must translate around the band names. */
  ck('FR schedule translates around them', /B.timent de musique/.test(sd.body.textContent));
  s.window.close();

  console.log(fails?`\n❌ ${fails} check(s) FAILED`:'\n✅ ALL CHECKS PASSED');
  process.exit(fails?1:0);
})().catch(e=>{console.error('harness error:',e);process.exit(9);});
