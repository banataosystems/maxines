export const tg=window.Telegram?.WebApp;
export const M=window.__MAXINES_MEDIA_MANIFEST__||{assets:{},productMedia:{},editorialOrder:[]};
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}};
export const store={
  products:window.__MAXINES_PRODUCTS__||[],
  health:window.__MAXINES_HEALTH__||{checkoutActivated:false},
  session:window.__MAXINES_SESSION__||{authenticated:false,telegram:false,staffRole:null},
  entered:sessionStorage.getItem('archive_entered_v4')==='1',
  bag:read('maxines_cart_v1',[]),
  saved:new Set(read('maxines_saved_v3',[])),
  recent:read('maxines_recent_v3',[]),
  mood:'All',q:'',open:null,bagOpen:false,accountOpen:false,ownerOpen:false,searchOpen:false,
  requestState:null,account:{loading:false,orders:[],requests:[],error:''},owner:{loading:false,requests:[],error:''}
};
export function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
export const product=sku=>store.products.find(p=>p.sku===sku);
export const mediaIdFor=p=>p?M.productMedia?.[p.sku]||null:null;
export const visualProducts=()=>store.products.filter(p=>mediaIdFor(p)&&M.assets?.[mediaIdFor(p)]);
export const liveVariant=p=>p?.variants?.find(v=>v.enabled&&v.inStock)||p?.variants?.find(v=>v.enabled)||null;
export const availability=p=>p.checkoutEnabled&&p.variants?.some(v=>v.enabled&&v.inStock)?'Available':'Availability on request';
export const priceText=p=>store.health.checkoutActivated&&p.checkoutEnabled?'Live price confirmed at checkout':'Price on request';
export const commerceMode=()=>store.health.checkoutActivated?'checkout':'request';
export const descriptor=p=>({'SHRT-89':'Statement botanical print · contrast collar.','OUT-014':'Easy tailoring · plaid with dark shoulder detail.','OUT-012':'Bold color · brass hardware.','PRT-002':'Statement leopard print · boxy tee.'}[p.sku]||p.tag||p.category||'Source-backed archive piece.');
export function mediaMarkup(id,{className='',eager=false}={}){const a=M.assets?.[id];if(!a)return '';return `<span class="media-frame ${className}" data-media-id="${id}"><span class="media-skeleton" aria-hidden="true"></span><img src="${a.src}" alt="${a.alt}" width="${a.width}" height="${a.height}" loading="${eager?'eager':'lazy'}" fetchpriority="${eager?'high':'auto'}" decoding="async"></span>`}
export function hydrateMedia(root=document){root.querySelectorAll('[data-media-id] img').forEach(img=>{const done=()=>img.closest('.media-frame')?.classList.add('is-loaded');if(img.complete)done();else img.addEventListener('load',done,{once:true})})}
export function saveBag(){write('maxines_cart_v1',store.bag)}
export function bagCount(){return store.bag.reduce((n,i)=>n+(Number(i.qty)||1),0)}
export function saveSaved(){write('maxines_saved_v3',[...store.saved])}
export function remember(sku){store.recent=[sku,...store.recent.filter(x=>x!==sku)].slice(0,6);write('maxines_recent_v3',store.recent)}
export function applyRemote(detail={}){if(Array.isArray(detail.products)&&detail.products.length)store.products=detail.products;if(detail.health)store.health=detail.health;if(detail.session)store.session=detail.session}
export function applyViewport(){const h=tg?.viewportStableHeight||tg?.viewportHeight||window.innerHeight;document.documentElement.style.setProperty('--app-height',`${Math.max(320,h)}px`)}
applyViewport();try{tg?.onEvent?.('viewportChanged',applyViewport)}catch{}window.addEventListener('resize',applyViewport,{passive:true});
