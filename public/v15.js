/* Fortune Master V1.5 — compatible structured advanced reading, safe HTML render. */
(()=>{'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const sourceLink=x=>{try{const u=new URL(x.url);return u.protocol==='https:'?`<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${esc(x.title||x.source)}</a>`:esc(x.title||x.source);}catch{return esc(x.title||x.source);}};
 function renderAdvanced(advanced){
  if(!advanced||!Array.isArray(advanced.items))return '';
  return `<section class="v15-advanced"><div class="v15-title"><small>ADVANCED · EXPLAINABLE</small><h3>${esc(advanced.title)}</h3><span>${advanced.status==='calculated'?'已生成结构化分析':'证据有限 · 谨慎解释'}</span></div><p class="v15-intro">${esc(advanced.intro)}</p><div class="v15-grid">${advanced.items.map((x,i)=>`<article class="v15-item"><h4>${i+1}. ${esc(x.title)}</h4><strong>${esc(x.conclusion)}</strong><p>${esc(x.explanation)}</p><div class="v15-action"><b>可以怎么做</b><p>${esc(x.action)}</p></div><details><summary>计算依据与规则出处（${(x.facts||[]).length} 项）</summary><ul>${(x.facts||[]).map(f=>`<li>${esc(f)}</li>`).join('')}</ul>${(x.paths||[]).map(p=>`<code>${esc(p)}</code>`).join(' ')}${(x.citations||[]).length?`<div class="v15-citations"><b>引用类型与出处</b>${x.citations.map(c=>`<p>${esc(c.kind==='verified-excerpt'?'已核验短引文':'现代规则参考')}：${sourceLink(c)}${c.locator?' · '+esc(c.locator):''}${c.quote?`<q>${esc(c.quote)}</q>`:''}</p>`).join('')}</div>`:''}</details></article>`).join('')}</div></section>`;
 }
 window.FortuneV15={renderAdvanced};
})();
