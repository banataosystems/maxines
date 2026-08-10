export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'method_not_allowed'});
  const nonce=String(req.query?.n||'');
  if(!nonce)return res.status(400).json({ok:false,error:'nonce_required'});
  try{
    const r=await fetch(`https://uweqyehikjliykjzgdgm.supabase.co/functions/v1/maxines-e2e-test?nonce=${encodeURIComponent(nonce)}`,{headers:{accept:'application/json'}});
    const body=await r.json().catch(()=>({ok:false,error:'invalid_e2e_response'}));
    res.setHeader('Cache-Control','no-store');
    return res.status(r.status).json(body);
  }catch(_error){return res.status(503).json({ok:false,error:'e2e_bridge_unavailable'})}
}
