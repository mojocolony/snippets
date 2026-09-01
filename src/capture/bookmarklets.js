export const BOOKMARKLET_OPTIONS = Object.freeze([
  { label: 'Save Link', mode: 'link', description: 'Page title + URL' },
  { label: 'Save Selection', mode: 'selection', description: 'Selected text + source' },
  { label: 'Save Page Text', mode: 'page', description: 'Page text + source' }
]);

export function resolveSnippetsAppUrl(href) {
  const url = new URL(href);
  return new URL('./', url).href;
}

export function createBookmarkletCode(mode, appUrl) {
  if (!BOOKMARKLET_OPTIONS.some(option => option.mode === mode)) throw new Error(`Unknown capture mode: ${mode}`);
  const normalizedAppUrl = resolveSnippetsAppUrl(appUrl);
  const capturePrefix = JSON.stringify(`${normalizedAppUrl}?captureSession=`);
  const targetOrigin = JSON.stringify(new URL(normalizedAppUrl).origin);
  const textExpression = mode === 'selection'
    ? 'String(getSelection())'
    : mode === 'page'
      ? `(()=>{const q='article,[itemprop=\"articleBody\"],main,[role=\"main\"]';const c=[...document.querySelectorAll(q)].filter(e=>(e.innerText||'').trim().length>200).sort((a,b)=>(b.innerText||'').length-(a.innerText||'').length)[0]||document.body;const x=c.cloneNode(true);x.querySelectorAll('nav,footer,aside,script,style,noscript,form,button,svg,canvas,[aria-hidden=\"true\"]').forEach(e=>e.remove());Object.assign(x.style,{position:'fixed',left:'-100000px',top:'0',width:'800px',opacity:'0',pointerEvents:'none'});document.body.appendChild(x);const t=(x.innerText||x.textContent||'').replace(/\\n{3,}/g,'\\n\\n').trim();x.remove();return t||document.body.innerText})()`
      : "''";

  return `javascript:(()=>{const n=(crypto.randomUUID?.()||Date.now()+'-'+Math.random());const w=open(${capturePrefix}+encodeURIComponent(n),'_blank');const p={type:'snippets-capture',nonce:n,mode:'${mode}',title:document.title,url:location.href,text:${textExpression}};let i=0;const t=setInterval(()=>{if(!w||w.closed||i++>120){clearInterval(t);return}w.postMessage(p,${targetOrigin})},500)})()`;
}
