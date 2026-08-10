const EDGE_CATALOG='https://uweqyehikjliykjzgdgm.supabase.co/functions/v1/maxines-api/catalog';
const fallback=Array.isArray(window.__MAXINES_PRODUCTS__)?window.__MAXINES_PRODUCTS__:[];
const imageBySku=new Map(fallback.map(p=>[p.sku,p.imageUrl]));
try{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4500);
  const res=await fetch(EDGE_CATALOG,{method:'GET',mode:'cors',cache:'no-store',signal:controller.signal});
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
}catch(_error){
  window.__MAXINES_BACKEND__={connected:false,mode:'embedded_fallback'};
}
await import('/shell.js');
