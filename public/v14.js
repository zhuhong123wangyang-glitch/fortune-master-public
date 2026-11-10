/* Fortune Master V1.4 — 本地双人合盘与个人命盘档案工作台。 */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let data=null,profiles=[],active='';
 const PROFILE_KEY='fortune-master-public-profiles-v1';
 function readProfiles(){try{const v=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');return Array.isArray(v)?v:[];}catch{return [];}}
 function writeProfiles(){const local=profiles.filter(p=>!p.cloudOnly).map(({cloudOnly,cloudSaved,cloudExists,...p})=>p);localStorage.setItem(PROFILE_KEY,JSON.stringify(local));}
 async function request(path,body){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});let j;try{j=await r.json();}catch{throw Error('服务器响应不是有效 JSON，确认工作台版本是否为 1.5.0');}if(!r.ok)throw Error(j.error||'操作失败');return j;}
 function info(text,error=false){$('error').hidden=!error;$('error').textContent=error?String(text):'';$('status').textContent=text;}
 function optionList(el){if(!el)return;const old=el.value;el.replaceChildren(new Option('手动输入 / 不使用档案',''));for(const p of profiles)el.add(new Option(`${p.label} · ${p.date}`,p.id));if(profiles.some(x=>x.id===old))el.value=old;}
 async function refresh(){
  const local=readProfiles().map(p=>({...p,cloudOnly:false,cloudSaved:false,cloudExists:false}));
  const byId=new Map(local.map(p=>[p.id,p]));
  let remote=[];try{remote=await window.FortuneStorage?.listCloudProfiles?.()||[];}catch{}
  for(const cloud of remote){if(!cloud?.id)continue;const existing=byId.get(cloud.id);if(existing){existing.cloudExists=true;existing.cloudSaved=Boolean(existing.updatedAt&&cloud.updatedAt&&existing.updatedAt===cloud.updatedAt);}else byId.set(cloud.id,{...cloud,cloudOnly:true,cloudSaved:true,cloudExists:true});}
  profiles=[...byId.values()];['profile-load-bazi','profile-load-ziwei','hepan-a-profile','hepan-b-profile'].forEach(id=>optionList($(id)));return {items:profiles,total:profiles.length};
 }
 function loadData(target,p){if(!p)return;const prefix=target==='bazi'?'bazi-':target==='ziwei'?'ziwei-':`hepan-${target}-`;
 if(target==='a'||target==='b')$(prefix+'label').value=p.label;
 $(prefix+'date').value=p.date;$(prefix+'time').value=p.time;$(prefix+'gender').value=p.gender;
 }
 async function selectProfile(target,id){if(!id)return;const item=profiles.find(x=>x.id===id);if(!item){info('未找到这条本机档案',true);return;}loadData(target,item);info('已从当前浏览器档案载入，可修改后再进行计算');}
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
 try{const y=Number($('hepan-year').value);const expectedInput=JSON.stringify({personA:person('a'),personB:person('b'),mode:$('hepan-mode').value,referenceYear:y});const res=await request('/api/calculate',{method:'hepan',params:JSON.parse(expectedInput)});if(active!=='hepan'||expectedInput!==JSON.stringify({personA:person('a'),personB:person('b'),mode:$('hepan-mode').value,referenceYear:Number($('hepan-year').value)}))return;if(res.method!=='hepan'||!res.result?.people||res.result.people.length!==2)throw Error('合盘接口未返回完整双人数据');data=res;window.dispatchEvent(new CustomEvent('fortune:result',{detail:res}));renderHepan(res);$('download').disabled=false;$('json').disabled=false;info('合盘已完成');}
 catch(e){info(e.message,true);}finally{btn.disabled=false;btn.textContent='开始双人合盘';}}
 function listHtml(){if(!profiles.length)return '<div class="v14-empty"><strong>尚未保存任何命盘档案</strong><p>在左侧填写昵称和出生信息，勾选同意后点击保存。</p></div>';
 return `<div class="v14-profile-list">${profiles.map(p=>`<article class="v14-profile" data-profile="${esc(p.id)}"><div><h3>${esc(p.label)} <small class="v14-profile-sync">${p.cloudSaved?'已加密同步云端':p.cloudExists?'本机修改未同步':p.cloudOnly?'云端档案':'仅本机'}</small></h3><p>${esc(p.date)} · ${esc(p.time)} · ${p.gender==='male'?'男':'女'} · ${esc(p.timezone)}</p></div><div class="v14-profile-actions"><button type="button" class="minor" data-action="edit" data-id="${esc(p.id)}">编辑</button><button type="button" class="minor" data-action="delete" data-id="${esc(p.id)}">删除</button></div></article>`).join('')}</div>`;}
 function renderProfiles(){ $('stage').innerHTML=`<div class="result-head"><div><small class="eyebrow">PRIVATE · DEVICE VAULT</small><h2>个人命盘档案</h2><p>默认仅保存在当前浏览器；单独勾选后可用独立密钥加密同步云端。可编辑、删除 · 不自动用于合盘</p></div><span class="chip">${profiles.length} 条</span></div><div class="section"><h3>本机与云端出生资料</h3>${listHtml()}</div><div class="warn">出生资料较为私密，云端同步需逐条明确同意。云端只接收密文；请妥善保管设备备份，并避免在共享电脑保存真实身份信息。</div>`; }
 async function save(){const btn=$('run');btn.disabled=true;btn.textContent='正在保存…';try{
  if(!$('profile-consent').checked)throw Error('请先勾选同意保存到当前浏览器');
  const label=$('profile-label').value.trim(),date=$('profile-date').value,time=$('profile-time').value,gender=$('profile-gender').value;
  if(!label||label.length>40||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time)||!['male','female'].includes(gender))throw Error('请检查称呼、出生日期、出生时间和性别');
  const id=$('profile-edit-id').value,cloudConsent=$('profile-cloud-consent').checked;const now=new Date().toISOString();let item;
  if(id){const i=profiles.findIndex(x=>x.id===id);if(i<0)throw Error('原档案不存在，请新建档案');item={...profiles[i],label,date,time,gender,timezone:'Asia/Shanghai',updatedAt:now,cloudOnly:false,cloudSaved:false};profiles[i]=item;}
  else{if(profiles.length>=200)throw Error('本机档案已达到 200 条上限');item={id:crypto.randomUUID(),label,date,time,gender,timezone:'Asia/Shanghai',createdAt:now,updatedAt:now,cloudOnly:false,cloudSaved:false,cloudExists:false};profiles.unshift(item);}
  writeProfiles();$('profile-consent').checked=false;$('profile-cloud-consent').checked=false;$('profile-edit-id').value='';
  let cloudError='';if(cloudConsent){try{await window.FortuneStorage?.saveProfileToCloud?.(item);if(!window.FortuneStorage?.saveProfileToCloud)throw Error('云端加密模块尚未加载');}catch(e){cloudError=e.message;}}
  await refresh();renderProfiles();info(cloudError?`本机已保存，但云端同步失败：${cloudError}`:`已保存「${item.label}」到当前浏览器${cloudConsent?'并加密同步到云端':''}` ,Boolean(cloudError));
 }catch(e){info(e.message,true);}finally{btn.disabled=false;btn.textContent='保存命盘档案';}}
 function edit(p){$('profile-edit-id').value=p.id;$('profile-label').value=p.label;$('profile-date').value=p.date;$('profile-time').value=p.time;$('profile-gender').value=p.gender;$('profile-consent').checked=false;$('profile-cloud-consent').checked=false;info('已载入档案用于编辑；保存到本机及云端均需重新确认');}
 async function remove(id){const p=profiles.find(x=>x.id===id);if(!p)return;const scope=p.cloudExists?'本机和加密云端':'当前浏览器';if(!confirm(`确定永久删除${scope}中的命盘档案「${p.label}」？此操作无法撤销。`))return;try{if(p.cloudExists)await window.FortuneStorage.deleteCloudProfile(id);profiles=profiles.filter(x=>x.id!==id);writeProfiles();if($('profile-edit-id').value===id)clear();await refresh();renderProfiles();info('命盘档案已删除');}catch(e){info(`删除未完成：${e.message}`,true);}}
 function clear(){$('profile-edit-id').value='';$('profile-label').value='';$('profile-date').value='2005-10-01';$('profile-time').value='15:00';$('profile-gender').value='female';$('profile-consent').checked=false;$('profile-cloud-consent').checked=false;}
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
  window.addEventListener('fortune:profiles-imported',async()=>{await refresh();if(active==='profiles')renderProfiles();});
 }
 installListeners();
 window.FortuneV14=Object.freeze({activate,perform:(m)=>m==='profiles'?save():hepan(),sample,downloadJSON:()=>data&&blobDownload(JSON.stringify(data,null,2),'fortune-hepan-v1.4.json','application/json'),downloadHTML:exportHTML});
})();
