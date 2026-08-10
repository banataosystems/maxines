const EDGE_BASE='https://uweqyehikjliykjzgdgm.supabase.co/functions/v1/maxines-api';

export async function proxy(req,res,route,methods=['GET']){
  if(!methods.includes(req.method)){
    res.setHeader('Allow',methods.join(', '));
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }
  try{
    const headers={'accept':'application/json'};
    const initData=req.headers['x-telegram-init-data'];
    if(typeof initData==='string'&&initData) headers['x-telegram-init-data']=initData;
    const init={method:req.method,headers};
    if(req.method!=='GET'&&req.method!=='HEAD'){
      headers['content-type']='application/json';
      init.body=JSON.stringify(req.body??{});
    }
    const rawUrl=String(req.url||'');
    const query=rawUrl.includes('?')?rawUrl.slice(rawUrl.indexOf('?')):'';
    const upstream=await fetch(`${EDGE_BASE}/${route}${query}`,init);
    const text=await upstream.text();
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.status(upstream.status);
    res.setHeader('Content-Type',upstream.headers.get('content-type')||'application/json; charset=utf-8');
    return res.send(text);
  }catch(_error){
    return res.status(503).json({ok:false,error:'backend_unavailable'});
  }
}
