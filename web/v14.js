/* Fortune Master V1.4 — 本地双人合盘与个人命盘档案工作台。 */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let data=null,profiles=[],active='';
 async function request(path,body){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});let j;try{j=await r.json();}catch{throw Error('服务器响应不是有效 JSON，确认工作台版本是否为 1.5.0');}if(!r.ok)throw Error(j.error||'操作失败');return j;}
 function info(text,error=false){$('error').hidden=!error;$('error').textContent=error?String(text):'';$('status').textContent=text;}
 function optionList(el){if(!el)return;const old=el.value;el.replaceChildren(new Option('手动输入 / 不使用档案',''));for(const p of profiles)el.add(new Option(`${p.label} · ${p.date}`,p.id));if(profiles.some(x=>x.id===old))el.value=old;}
 async function refresh(){const res=await request('/api/profiles',{action:'list'});profiles=res.items||[];['profile-load-bazi','profile-load-ziwei','hepan-a-profile','hepan-b-profile'].forEach(id=>optionList($(id)));return res;}
 function loadData(target,p){if(!p)return;const prefix=target==='bazi'?'bazi-':target==='ziwei'?'ziwei-':`hepan-${target}-`;
 if(target==='a'||target==='b')$(prefix+'label').value=p.label;
 $(prefix+'date').value=p.date;$(prefix+'time').value=p.time;$(prefix+'gender').value=p.gender;
 }
 async function selectProfile(target,id){if(!id)return;try{const record=await request('/api/profiles',{action:'get',id});loadData(target,record.item);info('已从本机档案载入，可修改后再进行计算');}catch(e){info(e.message,true);}}
 function person(key){return {label:$(`hepan-${key}-label`).value.trim(),date:$(`hepan-${key}-date`).value,time:$(`hepan-${key}-time`).value,gender:$(`hepan-${key}-gender`).value,timezone:'Asia/Shanghai'};}
 const topics={love:'感情',social:'人际',fortune:'运势'};
 function period(x){return x.activeCycle?`${esc(x.activeCycle.ganZhi)} · ${esc(x.activeCycle.startYear)}—${esc(x.activeCycle.endYear)}`:'该年无显示的大运段';}
 function renderHepan(x){const r=x.result,[a,b]=r.people,st=x.interpretation?.story;
 const facts=([['日主五行',r.dayElements.name],['日支关系',r.dayBranch.name],['对照主题',topics[r.mode]],['参考年份',r.referenceYear]]).map(([k,v])=>`<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
 const personCard=p=>`<div class="v14-person-card"><h3>${esc(p.label)}</h3><div class="v14-four">${p.pillars.map(p=>`<span>${esc(p.stem)}${esc(p.branch)}</span>`).join('')}</div><small>日主 ${esc(p.dayMaster)} · 五行 ${esc(p.dayElement)}</small><div class="v14-cycle">${period(p)}</div></div>`;
 const story=window.FortuneStory?window.FortuneStory(st):`<article class="v14-reading"><h3>${esc(st?.title)}</h3><p>${esc(st?.meaning)}</p></article>`;
 const advanced=window.FortuneV15?.renderAdvanced?.(x.interpretation?.advanced)||'';
 const reading=x.interpretation?.sections?.map((s,i)=>`<details class="reading-item"><summary>${i+1}. ${esc(s.title)}</summary><div class="reading-body"><b>${esc(s.summary)}</b><p>${esc(s.interpretation)}</p><div class="reading-facts"><strong>依据</strong>${s.observations.map(z=>`<p>${esc(z)}</p>`).join('')}</div></div></details>`).join('')||'';
 $('stage').innerHTML=`<div class="result-head"><div><small class="eyebrow">TWO PEOPLE · THREE THEMES</small><h2>双人合盘 · ${esc(topics[r.mode])}</h2><p>两份独立的八字数据 · 不计算配对成功率</p></div><span class="chip">已计算</span></div>${story}${advanced}<div class="section"><h3>双方命盘对照</h3><div class="v14-people">${personCard(a)}${personCard(b)}</div></div><div class="section"><h3>四项关键资料</h3>${facts}</div><div class="section"><h3>深入理解（可展开）</h3>${reading}</div><div class="warn">${x.warnings.map(v=>`<p>• ${esc(v)}</p>`).join('')}</div>`;
 }
 async function hepan(){const btn=$('run');data=null;btn.disabled=true;btn.textContent='双人命盘计算中…';info('计算中');$('download').disabled=true;$('json').disabled=true;
 try{const y=Number($('hepan-year').value);const expectedInput=JSON.stringify({personA:person('a'),personB:person('b'),mode:$('hepan-mode').value,referenceYear:y});const res=await request('/api/calculate',{method:'hepan',params:JSON.parse(expectedInput)});if(active!=='hepan'||expectedInput!==JSON.stringify({personA:person('a'),personB:person('b'),mode:$('hepan-mode').value,referenceYear:Number($('hepan-year').value)}))return;if(res.method!=='hepan'||!res.result?.people||res.result.people.length!==2)throw Error('合盘接口未返回完整双人数据');data=res;renderHepan(res);$('download').disabled=false;$('json').disabled=false;info('合盘已完成');}
 catch(e){info(e.message,true);}finally{btn.disabled=false;btn.textContent='开始双人合盘';}}
 function listHtml(){if(!profiles.length)return '<div class="v14-empty"><strong>尚未保存任何命盘档案</strong><p>在左侧填写昵称和出生信息，勾选同意后点击保存。</p></div>';
 return `<div class="v14-profile-list">${profiles.map(p=>`<article class="v14-profile" data-profile="${esc(p.id)}"><div><h3>${esc(p.label)}</h3><p>${esc(p.date)} · ${esc(p.time)} · ${p.gender==='male'?'男':'女'} · ${esc(p.timezone)}</p></div><div class="v14-profile-actions"><button type="button" class="minor" data-action="edit" data-id="${esc(p.id)}">编辑</button><button type="button" class="minor" data-action="delete" data-id="${esc(p.id)}">删除</button></div></article>`).join('')}</div>`;}
 function renderProfiles(){ $('stage').innerHTML=`<div class="result-head"><div><small class="eyebrow">PRIVATE · LOCAL ONLY</small><h2>个人命盘档案</h2><p>仅主动保存 · 可编辑、删除 · 不自动用于合盘</p></div><span class="chip">${profiles.length} 条</span></div><div class="section"><h3>本机保存的出生资料</h3>${listHtml()}</div><div class="warn">为了保护隐私，建议使用昵称，不要在共享电脑上保存真实身份信息。删除档案不会修改任何已经手动下载的报告。</div>`; }
 async function save(){const btn=$('run');btn.disabled=true;btn.textContent='正在保存…';try{
  const res=await request('/api/profiles',{action:'save',id:$('profile-edit-id').value||undefined,label:$('profile-label').value,date:$('profile-date').value,time:$('profile-time').value,gender:$('profile-gender').value,timezone:'Asia/Shanghai',consent:$('profile-consent').checked});
  $('profile-consent').checked=false;$('profile-edit-id').value='';await refresh();renderProfiles();info(`已保存「${res.item.label}」到本机`);
 }catch(e){info(e.message,true);}finally{btn.disabled=false;btn.textContent='保存命盘档案';}}
 function edit(p){$('profile-edit-id').value=p.id;$('profile-label').value=p.label;$('profile-date').value=p.date;$('profile-time').value=p.time;$('profile-gender').value=p.gender;$('profile-consent').checked=false;info('已载入档案用于编辑；保存修改需要重新确认');}
 async function remove(id){const p=profiles.find(x=>x.id===id);if(!p)return;if(!confirm(`确定永久删除本机档案「${p.label}」？此操作无法撤销。`))return;try{await request('/api/profiles',{action:'delete',id,confirm:true});if($('profile-edit-id').value===id)clear();await refresh();renderProfiles();info('已删除本机档案');}catch(e){info(e.message,true);}}
 function clear(){$('profile-edit-id').value='';$('profile-label').value='';$('profile-date').value='2005-10-01';$('profile-time').value='15:00';$('profile-gender').value='female';$('profile-consent').checked=false;}
 function blobDownload(text,filename,mime){const b=new Blob([text],{type:mime}),url=URL.createObjectURL(b),link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
 async function exportHTML(){if(!data)return;try{const r=await fetch('/api/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data})});if(!r.ok)throw Error('HTML 报告导出失败');blobDownload(await r.text(),'fortune-hepan-v1.4.html','text/html;charset=utf-8');}catch(e){info(e.message,true);}}
 async function activate(tab){active=tab;data=null;$('download').disabled=true;$('json').disabled=true;try{await refresh();if(active!==tab)return;if(tab==='profiles')renderProfiles();}catch(e){info('命盘档案暂时不可用：'+e.message,true);} }
 function sample(tab){if(tab==='hepan'){$('hepan-mode').value='love';$('hepan-year').value='2026';const a={label:'甲方',date:'1992-05-15',time:'09:00',gender:'male'},b={label:'乙方',date:'1995-02-03',time:'18:00',gender:'female'};loadData('a',a);loadData('b',b);info('已填写演示数据（虚构，不涉及真人）');}else{clear();$('profile-label').value='示例档案';info('已填写示例，请确认是否真的需要保存');}}
 function installListeners(){
  for(const type of ['bazi','ziwei'])$(`profile-load-${type}`).addEventListener('change',e=>selectProfile(type,e.target.value));
  for(const x of ['a','b'])$(`hepan-${x}-profile`).addEventListener('change',e=>selectProfile(x,e.target.value));
  $('profile-clear').addEventListener('click',()=>{clear();info('已清空编辑状态');});
  document.querySelectorAll('#form-hepan input,#form-hepan select').forEach(el=>{for(const eventName of ['input','change'])el.addEventListener(eventName,()=>{if(active==='hepan'&&data){data=null;$('download').disabled=true;$('json').disabled=true;info('合盘资料已修改，请重新计算后下载报告');}});});
  $('stage').addEventListener('click',e=>{const button=e.target.closest('button[data-action]');if(!button||active!=='profiles')return;const p=profiles.find(x=>x.id===button.dataset.id);if(!p)return;if(button.dataset.action==='edit')edit(p);if(button.dataset.action==='delete')remove(p.id);});
  $('bazi-preview-button').addEventListener('click',async()=>{const el=$('bazi-preview-result');el.textContent='核对中…';try{
    const info=await request('/api/time-preview',{date:$('bazi-date').value,time:$('bazi-time').value,timezone:$('bazi-preview-tz').value,longitude:Number($('bazi-preview-lng').value)});
    el.textContent=`世界标准时：${info.utcInstant}；北京钟表时：${info.beijingClock}；近似地方太阳时：${info.approximateSolarClock}。注意：这些时间尚未代入正式命盘，节气和子时附近需专业核对。`;
  }catch(err){el.textContent='核对失败：'+err.message;}});
  refresh().catch(()=>{});
 }
 installListeners();
 window.FortuneV14=Object.freeze({activate,perform:(m)=>m==='profiles'?save():hepan(),sample,downloadJSON:()=>data&&blobDownload(JSON.stringify(data,null,2),'fortune-hepan-v1.4.json','application/json'),downloadHTML:exportHTML});
})();
