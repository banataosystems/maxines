const tg=window.Telegram?.WebApp;
const S=window.__MAXINES_SESSION__||{};
const H=window.__MAXINES_HEALTH__||{};

function cart(){try{return JSON.parse(localStorage.getItem('maxines_cart_v1')||'[]')}catch{return[]}}
function payload(){return cart().map(i=>({sku:String(i.sku||''),size:String(i.size||'OS'),quantity:Number(i.qty||1)}))}
function addStatus(text,type='warning'){
  const btn=document.querySelector('#requestAvailabilityBtn');
  if(!btn)return;
  let box=document.querySelector('#requestAvailabilityStatus');
  if(!box){box=document.createElement('div');box.id='requestAvailabilityStatus';box.className=`notice ${type}`;btn.insertAdjacentElement('afterend',box)}
  box.textContent=text;
}
async function submit(){
  const btn=document.querySelector('#requestAvailabilityBtn');
  if(!btn)return;
  const items=payload();
  if(!items.length)return addStatus('Your bag is empty.');
  btn.disabled=true;btn.textContent='Sending request…';
  try{
    const res=await fetch('/api/request',{method:'POST',headers:{'content-type':'application/json','x-telegram-init-data':tg?.initData||''},body:JSON.stringify({items}),cache:'no-store'});
    const body=await res.json().catch(()=>null);
    if(!res.ok||!body?.request?.id)throw new Error(body?.error||'Request could not be sent.');
    btn.textContent='Request received';
    addStatus(`Availability request ${String(body.request.id).slice(0,8)} received. This is not a confirmed order and no payment was taken.`,'success');
    tg?.HapticFeedback?.notificationOccurred?.('success');
  }catch(e){
    btn.disabled=false;btn.textContent='Request availability';
    addStatus(String(e?.message||'Request could not be sent.'));
  }
}
function enhance(){
  const checkout=document.querySelector('#checkoutBtn');
  if(!checkout||!checkout.disabled||H.checkoutActivated||!S.authenticated||document.querySelector('#requestAvailabilityBtn')||!cart().length)return;
  const btn=document.createElement('button');
  btn.className='cta';btn.id='requestAvailabilityBtn';btn.type='button';btn.textContent='Request availability';
  checkout.insertAdjacentElement('afterend',btn);
  const note=document.createElement('div');
  note.className='notice warning';note.textContent='No payment will be taken. This submits an availability request only; MAXINES must confirm stock and live pricing separately.';
  btn.insertAdjacentElement('afterend',note);
  btn.addEventListener('click',submit);
}

const root=document.querySelector('#app');
if(root)new MutationObserver(enhance).observe(root,{childList:true,subtree:true});
enhance();
