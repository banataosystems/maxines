const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const tg=window.Telegram?.WebApp;
const P=window.__MAXINES_PRODUCTS__||[];
const H=window.__MAXINES_HEALTH__||{};
const S=window.__MAXINES_SESSION__||{};
const M=window.__MAXINES_MEDIA_MANIFEST__||{assets:{},productMedia:{},editorialOrder:[]};
window.__MAXINES_HIRES__=window.__MAXINES_HIRES__||{};
const R=window.__MAXINES_HIRES__;

let entered=sessionStorage.getItem('archive_entered_v3')==='1';
let open=null,showBag=false,searchOpen=false,q='',toast='',requestState=null,activeMood='All';
let bag=readJSON('maxines_cart_v1',[]);
let saved=new Set(readJSON('maxines_saved_v2',[]));
let recent=readJSON('maxines_recent_v2',[]);
const mediaPromises=new Map();

function readJSON(k,fallback){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??fallback}catch{return fallback}}
function writeJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const product=sku=>P.find(p=>p.sku===sku);
const mediaIdFor=p=>p?M.productMedia?.[p.sku]||null:null;
const visualProducts=()=>P.filter(p=>mediaIdFor(p)&&M.assets?.[mediaIdFor(p)]);
const sourceLabel=p=>`${Number(p.displayPrice)%1?Number(p.displayPrice).toFixed(2):Number(p.displayPrice)} ${p.displayCurrency}`;
const liveVariant=p=>p?.variants?.find(v=>v.enabled&&v.inStock)||p?.variants?.find(v=>v.enabled)||null;
const availability=p=>p.checkoutEnabled&&p.variants?.some(v=>v.enabled&&v.inStock)?'Available':'Availability on request';
const commerceMode=()=>H.checkoutActivated?'checkout':'request';
const safeDescriptor=p=>({
 'SHRT-89':'Statement botanical print · contrast collar.',
 'OUT-014':'Easy tailoring · plaid with dark shoulder detail.',
 'GRF-101':'Graphic tee · lace-up shoulder detail.',
 'OUT-012':'Bold color · brass hardware.',
 'PRT-003':'Wrap silhouette · statement leopard print.',
 'PRT-002':'Statement leopard print · boxy tee.'
}[p.sku]||p.tag||p.category||'Source-backed archive piece.');

function saveBag(){writeJSON('maxines_cart_v1',bag)}
function bagCount(){return bag.reduce((n,i)=>n+(Number(i.qty)||1),0)}
function saveSaved(){writeJSON('maxines_saved_v2',[...saved])}
function remember(sku){recent=[sku,...recent.filter(x=>x!==sku)].slice(0,6);writeJSON('maxines_recent_v2',recent)}
function asset(id){return M.assets?.[id]||null}
function mediaSrc(id){return R[id]||''}
function mediaMarkup(id,opts={}){
  const a=asset(id); if(!a)return '';
  const cls=opts.className||'';
  const eager=opts.eager?'eager':'lazy';
  const priority=opts.eager?'high':'auto';
  const ready=mediaSrc(id);
  return `<span class="media-frame ${cls}${ready?' is-loaded':''}" data-media-id="${id}"><span class="media-skeleton"></span><img ${ready?'src="'+esc(ready)+'" data-hydrated="1"':''} alt="${esc(a.alt)}" width="${a.width}" height="${a.height}" loading="${eager}" fetchpriority="${priority}" decoding="async"></span>`;
}
function loadMedia(id){
  if(!id||R[id])return Promise.resolve(R[id]||'');
  const a=asset(id); if(!a)return Promise.resolve('');
  const key=a.script;
  if(!mediaPromises.has(key)){
    const p=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src=key;s.async=true;
      s.onload=()=>resolve(true);s.onerror=()=>reject(new Error(`media_load_failed:${key}`));document.head.appendChild(s);
    }).finally(()=>mediaPromises.delete(key));
    mediaPromises.set(key,p);
  }
  return mediaPromises.get(key).then(()=>R[id]||'');
}
function hydrateMedia(root=document){
  const nodes=$$('[data-media-id]',root);
  if(!nodes.length)return;
  const hydrate=async node=>{
    const id=node.dataset.mediaId,img=$('img',node);if(!img||img.dataset.hydrated==='1')return;
    try{const src=await loadMedia(id);if(src){img.src=src;img.dataset.hydrated='1';node.classList.add('is-loaded')}}catch{node.classList.add('is-error')}
  };
  if(!('IntersectionObserver'in window)){nodes.forEach(hydrate);return}
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);hydrate(e.target)}}),{rootMargin:'650px 0px'});
  nodes.forEach(n=>{const img=$('img',n);if(img?.dataset.hydrated==='1'||img?.getAttribute('src'))n.classList.add('is-loaded');else io.observe(n)});
}
function applyViewport(){
  const h=tg?.viewportStableHeight||tg?.viewportHeight||window.innerHeight;
  document.documentElement.style.setProperty('--app-height',`${Math.max(320,h)}px`);
}
applyViewport();
try{tg?.onEvent?.('viewportChanged',applyViewport)}catch{}
window.addEventListener('resize',applyViewport,{passive:true});

function syncBack(){
  try{
    tg?.BackButton?.offClick?.(closeOverlay);
    if(open||showBag||searchOpen){tg?.BackButton?.show();tg?.BackButton?.onClick?.(closeOverlay)}
    else tg?.BackButton?.hide();
  }catch{}
}
function closeOverlay(){open=null;showBag=false;searchOpen=false;requestState=null;syncBack();render()}
function openProduct(p){
  if(!p||!mediaIdFor(p))return;
  open=p;showBag=false;searchOpen=false;requestState=null;remember(p.sku);
  tg?.HapticFeedback?.impactOccurred?.('light');syncBack();render();
}
function toggleSaved(sku){
  if(saved.has(sku))saved.delete(sku);else saved.add(sku);
  saveSaved();tg?.HapticFeedback?.selectionChanged?.();render();
}
function renderLanding(){
  const hero=M.hero||'2311';
  $('#app').innerHTML=`<section class="entry" id="enterArchive">
    <div class="entry-visual">${mediaMarkup(hero,{className:'entry-media',eager:true})}<div class="entry-shade"></div></div>
    <div class="entry-panel">
      <div class="entry-meta"><span>MAXINES</span><span>Private Access</span></div>
      <div class="entry-copy"><div class="entry-eyebrow">The Manila Edit</div><h1>Archive</h1><p>Vol. I — A private selection</p></div>
      <button class="entry-enter" type="button"><span>Enter the Archive</span><i aria-hidden="true"></i></button>
    </div></section>`;
  hydrateMedia();
  $('#enterArchive').onclick=()=>{entered=true;sessionStorage.setItem('archive_entered_v3','1');tg?.HapticFeedback?.impactOccurred?.('soft');render()};
}
function moodList(){
  const cats=[...new Set(visualProducts().map(p=>p.category).filter(Boolean))];
  return ['All',...cats];
}
function filteredProducts(){
  const term=q.trim().toLowerCase();
  return visualProducts().filter(p=>(activeMood==='All'||p.category===activeMood)&&(!term||`${p.name} ${p.sku} ${p.category} ${p.tag}`.toLowerCase().includes(term)));
}
function productCard(p,i){
  const id=mediaIdFor(p),isSaved=saved.has(p.sku);
  return `<article class="product-card ${i%5===0?'feature-card':''}">
    <button class="product-media" data-open="${esc(p.sku)}" aria-label="Open ${esc(p.name)}">${mediaMarkup(id)}
      <span class="studio-badge">Studio View</span>
    </button>
    <div class="product-copy">
      <div><p class="eyebrow">${esc(p.category)}</p><h3>${esc(p.name)}</h3><p class="descriptor">${esc(safeDescriptor(p))}</p></div>
      <div class="product-meta"><span>${esc(sourceLabel(p))} · source label</span><span>${esc(availability(p))}</span></div>
      <div class="product-actions"><button data-open="${esc(p.sku)}">Discover</button><button class="save-btn ${isSaved?'is-saved':''}" data-save="${esc(p.sku)}" aria-pressed="${isSaved}">${isSaved?'Saved':'Save'}</button></div>
    </div>
  </article>`;
}
function studioGallery(){
  return M.editorialOrder.map((id,i)=>`<figure class="studio-shot ${i%6===0?'studio-wide':''}">${mediaMarkup(id)}<figcaption>${String(i+1).padStart(2,'0')} · Studio Archive</figcaption></figure>`).join('');
}
function renderHome(){
  const items=filteredProducts(),moods=moodList(),savedProducts=visualProducts().filter(p=>saved.has(p.sku)),recentProducts=recent.map(product).filter(p=>p&&mediaIdFor(p));
  $('#app').innerHTML=`<div class="archive-shell">
    <header class="archive-header">
      <button id="searchBtn" class="nav-text" aria-expanded="${searchOpen}">Search</button>
      <button class="wordmark" id="topHome" aria-label="MAXINES Archive home"><span>MAXINES</span><b>Archive</b></button>
      <div class="header-actions"><button id="savedJump" class="nav-text">Saved ${saved.size?`(${saved.size})`:''}</button><button id="bagBtn" class="nav-text">Bag (${bagCount()})</button></div>
    </header>
    <main>
      <section class="home-hero">
        <div class="home-hero-media">${mediaMarkup('2319',{eager:true})}</div>
        <div class="home-hero-copy"><p class="eyebrow">Vol. I · The Manila Edit</p><h1>Private fashion archive, presented with restraint.</h1><p>Only high-resolution Studio Views are used in the customer experience.</p><button data-scroll="edit">Shop the Edit</button></div>
      </section>
      <section class="just-in section-pad" aria-labelledby="justInTitle"><div class="section-head"><div><p class="eyebrow">Just In</p><h2 id="justInTitle">The current studio selection.</h2></div><span>${M.editorialOrder.length} editorial portraits</span></div><div class="just-in-rail">${M.editorialOrder.slice(0,8).map(id=>`<div class="rail-shot">${mediaMarkup(id)}</div>`).join('')}</div></section>
      <section class="mood-strip section-pad"><div class="section-head compact"><div><p class="eyebrow">Shop by mood</p><h2>Choose a point of view.</h2></div></div><div class="mood-buttons">${moods.map(m=>`<button data-mood="${esc(m)}" class="${m===activeMood?'active':''}">${esc(m)}</button>`).join('')}</div></section>
      <section id="edit" class="the-edit section-pad"><div class="section-head"><div><p class="eyebrow">The Edit</p><h2>A considered selection of source-backed pieces.</h2></div><p>${items.length} studio-ready ${items.length===1?'piece':'pieces'}</p></div>${items.length?`<div class="product-grid">${items.map(productCard).join('')}</div>`:`<div class="empty-state"><h3>No studio-ready pieces match.</h3><p>Change the search or mood filter.</p></div>`}</section>
      ${recentProducts.length?`<section class="recent section-pad"><div class="section-head compact"><div><p class="eyebrow">Recently Viewed</p><h2>Return to a piece.</h2></div></div><div class="mini-grid">${recentProducts.map((p,i)=>productCard(p,i)).join('')}</div></section>`:''}
      ${savedProducts.length?`<section id="saved" class="saved section-pad"><div class="section-head compact"><div><p class="eyebrow">Saved</p><h2>Your private shortlist.</h2></div></div><div class="mini-grid">${savedProducts.map((p,i)=>productCard(p,i)).join('')}</div></section>`:''}
      <section class="studio section-pad"><div class="section-head"><div><p class="eyebrow">The Studio</p><h2>High-resolution editorial archive.</h2></div><p>Unlinked images remain editorial-only until catalog association is verified.</p></div><div class="studio-grid">${studioGallery()}</div></section>
      <footer class="archive-footer"><span>MAXINES Archive</span><p>Only source-backed commerce data. Only high-resolution customer-facing imagery.</p></footer>
    </main>
    ${searchOpen?renderSearch():''}${open?renderPdp(open):''}${showBag?renderBag():''}${toast?`<div class="toast">${esc(toast)}</div>`:''}
  </div>`;
  wireHome();hydrateMedia();
}
function renderSearch(){
  return `<div class="search-overlay" role="dialog" aria-modal="true" aria-label="Search the archive"><div class="search-sheet"><div class="search-top"><p class="eyebrow">Search</p><button id="searchClose" aria-label="Close search">Close</button></div><label><span class="sr-only">Search products</span><input id="searchInput" value="${esc(q)}" placeholder="Title, category, or SKU" autocomplete="off"></label><p>${filteredProducts().length} studio-ready result${filteredProducts().length===1?'':'s'}</p></div></div>`;
}
function detailRows(p){
  const v=liveVariant(p);
  return `<div class="facts"><div><small>Category</small><strong>${esc(p.category||'Not specified')}</strong></div><div><small>Availability</small><strong>${esc(availability(p))}</strong></div><div><small>Size</small><strong>${esc(v?.size||'Not specified')}</strong></div><div><small>Source</small><strong>${p.sourceVerified?'Verified source record':'Needs review'}</strong></div></div>`;
}
function renderPdp(p){
  const id=mediaIdFor(p),isSaved=saved.has(p.sku);
  return `<div class="pdp-overlay" role="dialog" aria-modal="true" aria-label="${esc(p.name)} details">
    <div class="pdp-top"><button id="pdpBack" aria-label="Back">Back</button><span>Archive Details</span><button data-save="${esc(p.sku)}" class="${isSaved?'is-saved':''}">${isSaved?'Saved':'Save'}</button></div>
    <div class="pdp-layout">
      <section class="pdp-hero">${mediaMarkup(id,{eager:true})}<span class="studio-badge">Studio View · High Resolution</span></section>
      <section class="pdp-info"><div class="pdp-kicker">${esc(p.sku)} · ${esc(p.category||'Archive')}</div><h1>${esc(p.name)}</h1><p class="pdp-story">${esc(p.description||safeDescriptor(p))}</p>${detailRows(p)}<div class="source-price"><small>Source display label</small><strong>${esc(sourceLabel(p))}</strong><p>Shown exactly as recorded in the source catalog. It is not treated as an approved settlement price.</p></div><div class="pdp-note"><strong>Source authenticity retained</strong><p>The original source photograph remains archived internally; this customer view intentionally uses the high-resolution editorial presentation only.</p></div><button class="primary" id="addSelection">Add to Selection</button><button class="secondary" id="openBagFromPdp">${commerceMode()==='checkout'?'Continue to checkout':'Request availability'}</button></section>
    </div></div>`;
}
function bagItem(i,n){
  const p=product(i.sku)||i,id=mediaIdFor(p);
  return `<div class="reservation-item">${id?mediaMarkup(id):'<div class="no-media"></div>'}<div><h3>${esc(i.name||p.name)}</h3><p>${esc(i.sku)} · ${esc(i.size||'OS')} · ${esc(sourceLabel(i))}</p><div class="qty"><button data-qty="-1" data-i="${n}" aria-label="Decrease quantity">−</button><span>${i.qty}</span><button data-qty="1" data-i="${n}" aria-label="Increase quantity">+</button></div></div></div>`;
}
function renderBag(){
  const live=commerceMode()==='checkout';
  return `<div class="drawer-backdrop" id="drawerBackdrop"><section class="drawer" role="dialog" aria-modal="true"><div class="drawer-handle"></div><button class="drawer-close" id="drawerClose" aria-label="Close">Close</button><div class="drawer-title"><small>MAXINES Archive</small><h2>${live?'Your Selection':'Availability Request'}</h2><p>${live?'Your selected pieces are ready for secure checkout.':'Submit your selected pieces for verification. This is not a confirmed order and no payment will be taken.'}</p></div>${bag.length?`<div class="reservation-list">${bag.map(bagItem).join('')}</div><div class="drawer-note"><span class="status-dot"></span><div><strong>${live?'Secure checkout gates verified':'Verification required'}</strong><p>${live?'Totals are calculated server-side.':'MAXINES must confirm live stock and pricing before any sale can proceed.'}</p></div></div><button class="primary" id="drawerAction">${live?'Continue in Telegram':'Request Availability'}</button>${requestState?`<div class="request-state ${requestState.type}">${esc(requestState.text)}</div>`:''}`:`<div class="empty-state"><h3>Your selection is empty.</h3><p>Discover a studio-ready piece and add it here.</p></div>`}</section></div>`;
}
function addToBag(p){
  const size=liveVariant(p)?.size||'OS';let x=bag.find(i=>i.sku===p.sku&&i.size===size);
  if(x)x.qty=Math.min(10,(x.qty||1)+1);else bag.push({sku:p.sku,name:p.name,size,displayPrice:Number(p.displayPrice),displayCurrency:p.displayCurrency,qty:1});
  saveBag();toast='Added to your selection.';tg?.HapticFeedback?.impactOccurred?.('medium');showBag=true;open=null;syncBack();render();setTimeout(()=>{toast=''},1400);
}
async function requestAvailability(){
  if(!S.authenticated){requestState={type:'warning',text:'Open MAXINES inside Telegram to submit an authenticated availability request.'};render();return}
  const btn=$('#drawerAction');if(btn){btn.disabled=true;btn.textContent='Sending request…'}
  try{
    const res=await fetch('/api/request',{method:'POST',headers:{'content-type':'application/json','x-telegram-init-data':tg?.initData||''},body:JSON.stringify({items:bag.map(i=>({sku:i.sku,size:i.size||'OS',quantity:i.qty||1}))}),cache:'no-store'});
    const body=await res.json().catch(()=>null);if(!res.ok||!body?.request?.id)throw new Error(body?.error||'Request could not be sent.');
    requestState={type:'success',text:`Request ${String(body.request.id).slice(0,8)} received. No payment was taken and this is not a confirmed order.`};tg?.HapticFeedback?.notificationOccurred?.('success');render();
  }catch(e){requestState={type:'warning',text:String(e?.message||'Request could not be sent.')};render()}
}
async function startCheckout(){
  if(!H.checkoutActivated)return requestAvailability();
  if(!S.authenticated){requestState={type:'warning',text:'Open MAXINES inside Telegram to continue secure checkout.'};render();return}
  const btn=$('#drawerAction');if(btn){btn.disabled=true;btn.textContent='Preparing checkout…'}
  try{
    const res=await fetch('/api/checkout',{method:'POST',headers:{'content-type':'application/json','x-telegram-init-data':tg?.initData||''},body:JSON.stringify({items:bag.map(i=>({sku:i.sku,size:i.size||'OS',quantity:i.qty||1}))}),cache:'no-store'});
    const body=await res.json().catch(()=>null);if(!res.ok||!body?.invoiceUrl)throw new Error(body?.error||'Checkout could not be created.');
    if(!tg?.openInvoice)throw new Error('Open MAXINES inside Telegram to continue payment.');
    tg.openInvoice(body.invoiceUrl,status=>{requestState={type:status==='paid'?'success':'warning',text:`Invoice ${status}.`};if(status==='paid'){bag=[];saveBag()}render()});
  }catch(e){requestState={type:'warning',text:String(e?.message||'Checkout could not be created.')};render()}
}
function wireHome(){
  $('#searchBtn')?.addEventListener('click',()=>{searchOpen=true;syncBack();render();requestAnimationFrame(()=>$('#searchInput')?.focus())});
  $('#searchClose')?.addEventListener('click',()=>{searchOpen=false;q='';syncBack();render()});
  $('#searchInput')?.addEventListener('input',e=>{q=e.target.value;render();requestAnimationFrame(()=>{const x=$('#searchInput');x?.focus();x?.setSelectionRange(q.length,q.length)})});
  $('#bagBtn')?.addEventListener('click',()=>{showBag=true;syncBack();render()});
  $('#savedJump')?.addEventListener('click',()=>{document.querySelector('#saved')?.scrollIntoView({behavior:'smooth'});});
  $('#topHome')?.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  $$('[data-open]').forEach(b=>b.addEventListener('click',()=>openProduct(product(b.dataset.open))));
  $$('[data-save]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggleSaved(b.dataset.save)}));
  $$('[data-mood]').forEach(b=>b.addEventListener('click',()=>{activeMood=b.dataset.mood;render();requestAnimationFrame(()=>$('#edit')?.scrollIntoView({block:'start'}))}));
  $$('[data-scroll]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.scroll)?.scrollIntoView({behavior:'smooth'})));
  $('#pdpBack')?.addEventListener('click',closeOverlay);
  $('#addSelection')?.addEventListener('click',()=>addToBag(open));
  $('#openBagFromPdp')?.addEventListener('click',()=>addToBag(open));
  $('#drawerClose')?.addEventListener('click',closeOverlay);
  $('#drawerBackdrop')?.addEventListener('click',e=>{if(e.target.id==='drawerBackdrop')closeOverlay()});
  $$('[data-qty]').forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.i),d=Number(b.dataset.qty);bag[n].qty=(bag[n].qty||1)+d;if(bag[n].qty<=0)bag.splice(n,1);saveBag();render()}));
  $('#drawerAction')?.addEventListener('click',startCheckout);
}
function render(){if(!entered)return renderLanding();renderHome()}
try{tg?.ready();tg?.expand();tg?.setHeaderColor?.('#FDFCF8');tg?.setBackgroundColor?.('#FDFCF8');document.documentElement.dataset.theme='light'}catch{}
syncBack();render();
