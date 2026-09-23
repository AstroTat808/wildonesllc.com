document.querySelectorAll('[data-print-packet]').forEach((button)=>button.addEventListener('click',()=>window.print()));
const message=document.querySelector('[data-access-message]');
if(message && new URLSearchParams(location.search).get('access')==='required'){
  message.textContent='Use the secure, expiring producer link issued after your project is approved.';
}
