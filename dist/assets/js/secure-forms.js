(() => {
  const forms=[...document.querySelectorAll('[data-secure-form]')];
  if(!forms.length) return;

  let siteKey='';
  let turnstileReady=null;

  const loadTurnstile=()=>{
    if(window.turnstile) return Promise.resolve(window.turnstile);
    if(turnstileReady) return turnstileReady;
    turnstileReady=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async=true; script.defer=true;
      script.onload=()=>resolve(window.turnstile);
      script.onerror=()=>reject(new Error('Security verification could not load.'));
      document.head.appendChild(script);
    });
    return turnstileReady;
  };

  const configPromise=fetch('/api/public-config',{cache:'no-store'})
    .then((response)=>response.ok?response.json():null)
    .then((data)=>{siteKey=String(data?.turnstileSiteKey||'').trim();return siteKey;})
    .catch(()=>'');

  const setStatus=(form,message,error=false)=>{
    const target=form.querySelector('[data-form-status]');
    if(target){target.textContent=message;target.style.color=error?'#ffb2b2':'';}
  };

  const initForm=async(form)=>{
    const key=await configPromise;
    const holder=form.querySelector('[data-turnstile]');
    const tokenInput=form.querySelector('input[name="turnstileToken"]');
    if(!key){
      if(holder) holder.innerHTML='<span class="helper">Local preview: secure submission activates after Netlify environment variables are configured.</span>';
      return;
    }
    if(!holder||!tokenInput) return;
    try{
      const turnstile=await loadTurnstile();
      turnstile.render(holder,{
        sitekey:key,
        action:form.dataset.turnstileAction||'wild_ones_inquiry',
        theme:'dark',
        callback:(token)=>{tokenInput.value=token;setStatus(form,'Security check complete.');},
        'expired-callback':()=>{tokenInput.value='';setStatus(form,'Security check expired. Complete it again.',true);},
        'error-callback':()=>{tokenInput.value='';setStatus(form,'Security verification failed to load.',true);}
      });
    }catch(error){
      setStatus(form,error instanceof Error?error.message:'Security verification unavailable.',true);
    }
  };

  forms.forEach((form)=>{
    initForm(form);
    form.addEventListener('submit',async(event)=>{
      event.preventDefault();
      const button=form.querySelector('button[type="submit"]');
      const original=button?.textContent||'Submit';
      if(siteKey && !String(form.elements.turnstileToken?.value||'')){
        setStatus(form,'Complete the security verification before submitting.',true);
        return;
      }
      if(!siteKey){
        setStatus(form,'Local preview only. Form submission will activate after Netlify configuration.',true);
        return;
      }
      if(button){button.disabled=true;button.textContent='Submitting…';}
      setStatus(form,'Sending securely…');
      try{
        const response=await fetch('/api/inquiry',{method:'POST',body:new FormData(form),headers:{'Accept':'application/json'}});
        const result=await response.json().catch(()=>({}));
        if(!response.ok) throw new Error(result.error||'Submission could not be accepted.');
        const destination=new URL('/thank-you',location.origin);
        if(result.id) destination.searchParams.set('ref',result.id);
        location.assign(destination.toString());
      }catch(error){
        setStatus(form,error instanceof Error?error.message:'Submission failed. Try again.',true);
        if(button){button.disabled=false;button.textContent=original;}
        if(window.turnstile){
          const holder=form.querySelector('[data-turnstile]');
          if(holder) try{window.turnstile.reset(holder);}catch{}
        }
        if(form.elements.turnstileToken) form.elements.turnstileToken.value='';
      }
    });
  });
})();
