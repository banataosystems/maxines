const ALLOWED=new Set(['2305','2311','2317','2319']);
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'method_not_allowed'})}
  const id=String(req.query?.id||'');
  if(!ALLOWED.has(id))return res.status(404).json({ok:false,error:'media_not_found'});
  try{
    const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();
    const host=String(req.headers.host||'maxines.vercel.app');
    const upstream=await fetch(`${proto}://${host}/media/hires/${id}.js`,{headers:{accept:'application/javascript'}});
    if(!upstream.ok)throw new Error(`source_${upstream.status}`);
    const js=await upstream.text();
    const m=js.match(/base64,([A-Za-z0-9+/=]+)/);
    if(!m)throw new Error('media_payload_missing');
    const bytes=Buffer.from(m[1],'base64');
    if(bytes.length<1000||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw new Error('invalid_webp');
    res.setHeader('Content-Type','image/webp');
    res.setHeader('Content-Length',String(bytes.length));
    res.setHeader('Cache-Control','public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
    res.setHeader('X-Content-Type-Options','nosniff');
    return res.status(200).send(bytes);
  }catch(_error){return res.status(503).json({ok:false,error:'media_unavailable'})}
}
