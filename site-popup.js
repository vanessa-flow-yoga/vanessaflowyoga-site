/* First-party announcement. No tracking; dismissal lasts for this tab's visit. */
(() => {
  let active, timer;
  const excluded = /\/(?:admin|thankyou|thanks|404)(?:[/.]|$)/;
  function due(data, date = new Date()) {
    const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
    return !data.schedule_enabled || ((!data.start_date || today >= data.start_date) && (!data.end_date || today <= data.end_date));
  }
  function show(data, preview = false) {
    active?.close();
    const dialog = document.createElement('dialog');dialog.className='vfy-popup';
    dialog.setAttribute('aria-labelledby','vfy-popup-title');dialog.setAttribute('aria-describedby','vfy-popup-message');
    const make = (tag,cls,text) => {const node=document.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node};
    const layout=make('div','vfy-popup__layout');
    if(data.image && /^\/images\/[A-Za-z0-9_\-/%.]+$/.test(data.image) && !data.image.includes('..')){const visual=make('div','vfy-popup__visual');const image=make('img','vfy-popup__photo');image.src=data.image;image.alt=data.image_alt||'';visual.append(image,make('span','vfy-popup__seal','Move. Breathe. Be.'));layout.append(visual)}
    else dialog.classList.add('vfy-popup--text');
    const content=make('div','vfy-popup__content');const logo=make('img','vfy-popup__logo');logo.src='/images/new-logo.png';logo.alt='Vanessa Flow Yoga';
    const title=make('h2','vfy-popup__title',data.headline);title.id='vfy-popup-title';
    const message=make('p','vfy-popup__message',data.message);message.id='vfy-popup-message';
    content.append(logo,make('p','vfy-popup__eyebrow',data.eyebrow),title,message);
    if(data.button_text && data.button_url){try{const link=new URL(data.button_url,location.origin);if(['https:'].includes(link.protocol) || (link.origin===location.origin && /^\/(?!\/)/.test(data.button_url))){const button=make('a','vfy-popup__button',data.button_text);button.href=link.href;content.append(button)}}catch{}}
    layout.append(content);dialog.append(layout);
    const close=make('button','vfy-popup__close','×');close.type='button';close.setAttribute('aria-label','Close announcement');close.onclick=()=>dialog.close();dialog.append(close);
    const previous=document.activeElement;const scroll=document.documentElement.style.overflow;
    dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close()}});
    dialog.addEventListener('close',()=>{document.documentElement.style.overflow=scroll;dialog.remove();if(active===dialog)active=null;if(previous?.isConnected)previous.focus();if(!preview)try{sessionStorage.setItem('vfy-popup-seen','1')}catch{}});
    document.body.append(dialog);dialog.showModal();document.documentElement.style.overflow='hidden';active=dialog;close.focus();
    if(!preview)try{sessionStorage.setItem('vfy-popup-seen','1')}catch{}
  }
  // Used only by the same-origin backend iframe; never enabled by a public query string.
  addEventListener('vfy:popup-preview',event=>{if(window.parent===window || !event.detail)return;clearTimeout(timer);show(event.detail,true)});
  if(window.parent!==window || excluded.test(location.pathname))return;
  fetch('/content/popup.json',{cache:'no-store'}).then(response=>response.ok?response.json():null).then(data=>{
    if(!data?.enabled || !due(data) || (data.pages==='homepage' && !['/','/index','/index.html'].includes(location.pathname)))return;
    try{if(sessionStorage.getItem('vfy-popup-seen'))return}catch{}
    const openWhenReady=()=>{
      // Give the cookie choice and any existing modal priority.
      if([...document.querySelectorAll('.cookie-banner, .cookie-modal, dialog[open], [aria-modal="true"]')].some(node=>node.getClientRects().length && getComputedStyle(node).visibility!=='hidden')){timer=setTimeout(openWhenReady,1000);return}
      if(due(data))show(data);
    };
    timer=setTimeout(openWhenReady,Math.max(0,Math.min(60,Number(data.delay_seconds)||0))*1000);
  }).catch(()=>{});
})();
