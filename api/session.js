const EDGE='https://uweqyehikjliykjzgdgm.supabase.co/functions/v1/maxines-api/session';
function cookieValue(req,name){const raw=String(req.headers?.cookie||'');for(const part of raw.split(';')){const i=part.indexOf('=');if(i<0)continue;if(part.slice(0,i).trim()===name)return decodeURIComponent(part.slice(i+1).trim())}return ''}
function setCookie(res,token,maxAge=1800){res.setHeader('Set-Cookie',`mx_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`)}
export default async function handler(req,res){
  if(req.method==='DELETE'){setCookie(res,'',0);return res.status(204).end()}
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST, DELETE');return res.status(405).json({ok:false,error:'method_not_allowed'})}
  try{
    const headers={'accept':'application/json'};let body;
    const session=cookieValue(req,'mx_session');if(session)headers['x-maxines-session']=session;
    const initData=req.headers['x-telegram-init-data'];if(typeof initData==='string'&&initData)headers['x-telegram-init-data']=initData;
    if(req.method==='POST'){headers['content-type']='application/json';body='{}'}
    const upstream=await fetch(EDGE,{method:req.method,headers,body});
    const data=await upstream.json().catch(()=>({ok:false,error:'invalid_upstream'}));
    if(upstream.ok&&data?.authenticated&&data?.sessionToken){setCookie(res,data.sessionToken,Number(data.sessionMaxAge)||1800);delete data.sessionToken;delete data.sessionMaxAge}
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');return res.status(upstream.status).json(data);
  }catch(_error){return res.status(503).json({ok:false,error:'backend_unavailable'})}
}
