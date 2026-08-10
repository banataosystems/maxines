const EDGE_BASE='https://uweqyehikjliykjzgdgm.supabase.co/functions/v1/maxines-request';

export async function requestProxy(req,res,methods=['GET']){
  if(!methods.includes(req.method)){
    res.setHeader('Allow',methods.join(', '));
    return res.status(405).json({ok:false,error:'method_not_allowed'});
  }
  try{
    const headers={'accept':'application/json'};
    const initData=req.headers['x-telegram-init-data'];
    if(typeof initData==='string'&&initData)headers['x-telegram-init-data']=initData;
    const init={method:req.method,headers};
    if(req.method!=='GET'&&req.method!=='HEAD'){
      headers['content-type']='application/json';
      init.body=JSON.stringify(req.body??{});
    }
    let upstream=await fetch(EDGE_BASE,init);
    if(req.method==='GET'&&[502,503,504].includes(upstream.status))upstream=await fetch(EDGE_BASE,init);
    const text=await upstream.text();
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.status(upstream.status);
    res.setHeader('Content-Type',upstream.headers.get('content-type')||'application/json; charset=utf-8');
    return res.send(text);
  }catch(_error){
    return res.status(503).json({ok:false,error:'request_backend_unavailable'});
  }
}
