const ACCESS_KEY='wildOnesProducerAccess';
const DEMO_CODE='WILD350'; // Prototype only. Replace with signed, expiring server-side CRM access tokens in production.
const unlockForm=document.querySelector('[data-producer-unlock]');
if(unlockForm){ unlockForm.addEventListener('submit',(e)=>{ e.preventDefault(); const code=String(new FormData(unlockForm).get('access_code')||'').trim().toUpperCase(); const msg=document.querySelector('[data-access-message]'); if(code===DEMO_CODE){ localStorage.setItem(ACCESS_KEY,'granted'); if(msg) msg.textContent='Access granted. Opening packet…'; window.location.href='technical-packet.html'; } else { if(msg) msg.textContent='Access code not recognized.'; } }); }
const packet=document.querySelector('[data-packet-page]');
if(packet){ const ok=localStorage.getItem(ACCESS_KEY)==='granted'; document.querySelector('[data-packet-lock]')?.classList.toggle('hidden',ok); document.querySelector('[data-packet-content]')?.classList.toggle('hidden',!ok); document.querySelector('[data-print-packet]')?.addEventListener('click',()=>window.print()); }
