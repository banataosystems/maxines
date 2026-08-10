const fallback=Array.isArray(window.__MAXINES_PRODUCTS__)?window.__MAXINES_PRODUCTS__:[];
window.__MAXINES_BACKEND__={connected:false,mode:'embedded_fallback'};
window.__MAXINES_HEALTH__={checkoutActivated:false,ready:false};
window.__MAXINES_SESSION__={authenticated:false,telegram:false,staffRole:null};

const emit=()=>window.dispatchEvent(new CustomEvent('maxines:state',{detail:{
  products:window.__MAXINES_PRODUCTS__||fallback,
  backend:window.__MAXINES_BACKEND__,
  health:window.__MAXINES_HEALTH__,
  session:window.__MAXINES_SESSION__
}}));

async function fetchJson(url,init={},timeout=4500){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const res=await fetch(url,{...init,credentials:'same-origin',signal:controller.signal,cache:'no-store'});
    const body=await res.json().catch(()=>null);
    return {res,body};
  }finally{clearTimeout(timer)}
}

async function hydratePublicState(){
  const [catalogResult,healthResult]=await Promise.allSettled([
    fetchJson('/api/catalog'),
    fetchJson('/api/health')
  ]);
  if(catalogResult.status==='fulfilled'){
    const {res,body}=catalogResult.value;
    if(res.ok&&body?.ok&&Array.isArray(body.products)&&body.products.length){
      window.__MAXINES_PRODUCTS__=body.products.map(p=>({...p,variants:Array.isArray(p.variants)?p.variants:[]}));
      window.__MAXINES_BACKEND__={connected:true,mode:body?.source?.mode||'supabase_database'};
    }
  }
  if(healthResult.status==='fulfilled'){
    const {res,body}=healthResult.value;
    if(res.ok&&body?.ok)window.__MAXINES_HEALTH__=body;
  }
  emit();
}

async function hydrateSession(){
  const initData=window.Telegram?.WebApp?.initData||'';
  try{
    let result;
    if(initData){
      result=await fetchJson('/api/session',{method:'POST',headers:{'x-telegram-init-data':initData,'content-type':'application/json'},body:'{}'},5000);
    }else{
      result=await fetchJson('/api/session',{method:'GET'},3500);
    }
    if(result.res.ok&&result.body?.authenticated)window.__MAXINES_SESSION__=result.body;
  }catch(_error){}
  emit();
}

hydratePublicState().catch(()=>{});
hydrateSession().catch(()=>{});
