const fallback=Array.isArray(window.__MAXINES_PRODUCTS__)?window.__MAXINES_PRODUCTS__:[];
const imageBySku=new Map(fallback.map(p=>[p.sku,p.imageUrl]));
window.__MAXINES_BACKEND__={connected:false,mode:'embedded_fallback'};
window.__MAXINES_SESSION__={authenticated:false,telegram:false};
try{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4500);
  const res=await fetch('/api/catalog',{method:'GET',cache:'no-store',signal:controller.signal});
  clearTimeout(timer);
  if(res.ok){
    const body=await res.json();
    if(body?.ok&&Array.isArray(body.products)&&body.products.length){
      window.__MAXINES_PRODUCTS__=body.products.map(p=>({
        ...p,
        imageUrl:imageBySku.get(p.sku)||fallback.find(x=>x.sku===p.sku)?.imageUrl||'',
        variants:Array.isArray(p.variants)?p.variants:[],
      }));
      window.__MAXINES_BACKEND__={connected:true,mode:body?.source?.mode||'supabase_database'};
    }
  }
}catch(_error){}

const initData=window.Telegram?.WebApp?.initData||'';
if(initData){
  try{
    const sessionRes=await fetch('/api/session',{method:'POST',headers:{'x-telegram-init-data':initData,'content-type':'application/json'},body:'{}',cache:'no-store'});
    const sessionBody=await sessionRes.json().catch(()=>null);
    if(sessionRes.ok&&sessionBody?.authenticated) window.__MAXINES_SESSION__=sessionBody;
  }catch(_error){}
}
await import('/shell.js');
