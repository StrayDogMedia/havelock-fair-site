const fs=require('fs'),path=require('path'),{JSDOM,ResourceLoader}=require('jsdom');
const ROOT='/Users/jesseroskies/havelock-fair-site';
let fails=0;const ck=(l,c,x)=>{if(!c)fails++;console.log(`  ${c?'✅':'❌'} ${l}${!c&&x!==undefined?'  -> '+x:''}`);};
const requested=[];
function boot(rel){
  return new Promise(res=>{
    const file=path.join(ROOT,rel);
    const dom=new JSDOM(fs.readFileSync(file,'utf8'),{
      runScripts:'dangerously', resources:'usable',
      url:'http://localhost:8765/'+rel, pretendToBeVisual:true,
      beforeParse(w){ w.scrollTo=()=>{};
        w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},removeListener(){}}));
        w.IntersectionObserver=class{constructor(cb){this.cb=cb;}observe(el){this.cb([{isIntersecting:true,target:el}],this);}unobserve(){}disconnect(){}};
      }});
    dom.window.addEventListener('load',()=>setTimeout(()=>res(dom),500));
  });
}
(async()=>{
  console.log('\nCLICK-TO-LOAD EMBED — pages/music.html');
  const dom=await boot('pages/music.html'), w=dom.window, d=w.document;

  // 1. nothing can reach Google before the click: no element in the loaded DOM
  //    carries a google/youtube URL in a fetching attribute.
  const fetching=[...d.querySelectorAll('[src],[href],[poster],[data-src]')]
    .flatMap(e=>['src','href','poster','data-src'].map(a=>e.getAttribute(a)).filter(Boolean))
    .filter(u=>/youtube|ytimg|googlevideo|google/.test(u));
  const nonLink=fetching.filter(u=>!/^https:\/\/www\.youtube\.com\/watch/.test(u) && !/fonts\.google/.test(u) && !/fonts\.gstatic/.test(u));
  ck('nothing fetches from YouTube on load (only the plain <a> fallback)', nonLink.length===0, nonLink.join(', '));
  ck('no iframe present before click', d.querySelectorAll('iframe').length===0);
  const imgs=[...d.querySelectorAll('img')].map(i=>i.getAttribute('src'));
  ck('no hotlinked YouTube thumbnail', !imgs.some(s=>/ytimg|youtube/.test(s||'')), imgs.join(','));
  ck('all images are local relative paths', imgs.every(s=>s&&!/^https?:/.test(s)), imgs.join(','));

  // 2. facade is there and accessible
  const btn=d.getElementById('hf-film-player');
  ck('facade button present', !!btn);
  ck('button has aria-label', !!btn.getAttribute('aria-label'));
  ck('caption credits the uploader (Volts)', /Volts/.test(d.querySelector('.hf-film-cap-meta').textContent));
  ck('plain YouTube link offered as fallback', !!d.querySelector('a[href*="youtube.com/watch"]'));

  // 3. click loads the privacy-preserving embed
  btn.click();
  await new Promise(r=>setTimeout(r,150));
  const fr=d.querySelector('iframe');
  ck('iframe created on click', !!fr);
  ck('uses youtube-nocookie.com', /^https:\/\/www\.youtube-nocookie\.com\/embed\/ivvA1uyZ1GI/.test(fr.src), fr&&fr.src);
  ck('autoplay + rel=0', /autoplay=1/.test(fr.src)&&/rel=0/.test(fr.src));
  ck('button replaced by the iframe', !d.getElementById('hf-film-player'));
  ck('iframe allowfullscreen', fr.hasAttribute('allowfullscreen'));

  // 4. language
  const dom2=await boot('pages/music.html'), w2=dom2.window, d2=w2.document;
  const enMeta=d2.querySelector('.hf-film-cap-meta').textContent.trim();
  const enLede=d2.querySelector('[data-i18n="music_video_lede"]').textContent.trim();
  w2.setLanguage('fr');
  await new Promise(r=>setTimeout(r,200));
  ck('caption meta translated to FR', d2.querySelector('.hf-film-cap-meta').textContent.trim()!==enMeta,
     d2.querySelector('.hf-film-cap-meta').textContent.trim());
  ck('lede translated to FR', d2.querySelector('[data-i18n="music_video_lede"]').textContent.trim()!==enLede);
  ck('track title NOT translated', d2.querySelector('[data-i18n="music_video_title"]').textContent.trim()==='Hand Me Down Blues',
     d2.querySelector('[data-i18n="music_video_title"]').textContent.trim());
  // FR click keeps nocookie
  d2.getElementById('hf-film-player').click();
  await new Promise(r=>setTimeout(r,150));
  ck('FR click still uses youtube-nocookie with hl=fr', /youtube-nocookie\.com/.test(d2.querySelector('iframe').src)&&/hl=fr/.test(d2.querySelector('iframe').src),
     d2.querySelector('iframe').src);

  console.log(fails?`\n❌ ${fails} FAILED`:'\n✅ all embed checks passed');
  process.exit(fails?1:0);
})().catch(e=>{console.error('harness error:',e);process.exit(9);});
