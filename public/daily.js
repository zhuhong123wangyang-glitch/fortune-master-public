(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const active=()=>document.querySelector('.tab.active')?.dataset.tab==='daily-sign';
const storeKey='fortune-sign-profile-v1';
let profile;
try {profile=localStorage.getItem(storeKey);if(!profile){profile='visitor-'+crypto.randomUUID();localStorage.setItem(storeKey,profile);}}catch{profile='local-default';}
let result=null,modelEnabled=false,latestAnswer=null,requestSerial=0;
$('sign-profile-id').textContent=profile;
$('sign-copy-profile').addEventListener('click',()=>navigator.clipboard.writeText(profile).then(()=>status('已复制档案 ID')).catch(e=>setupError(e.message)));
$('sign-restore-profile').addEventListener('click',()=>setupError('公网版不支持直接读取旧版本机签簿文件。请使用页面下方的“导出设备备份 / 导入设备备份”管理新版本资料。'));

try{$('sign-timezone').value=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Shanghai';}catch{}
const params=()=>({profileId:profile,timezone:$('sign-timezone').value.trim()||'Asia/Shanghai',topic:$('sign-topic').value,question:$('sign-mode').value==='question'?$('sign-question').value:'',saveQuestion:$('sign-mode').value==='question'&&$('sign-save-question').checked});
const setupError=msg=>{const box=$('error');box.hidden=!msg;box.textContent=msg||'';};
function status(label){$('status').textContent=label;}
function downloads(enabled){$('download').disabled=!enabled;$('json').disabled=!enabled;}
function deviceToken(){let t=localStorage.getItem('fm_device_token_v1');if(!t||!/^[A-Za-z0-9_-]{43}$/.test(t)){const a=crypto.getRandomValues(new Uint8Array(32));let b='';for(const x of a)b+=String.fromCharCode(x);t=btoa(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');localStorage.setItem('fm_device_token_v1',t);}return t;}
async function post(url,data){const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${deviceToken()}`},body:JSON.stringify(data)});let json;try{json=await res.json();}catch{throw Error('服务端未返回有效 JSON');}if(!res.ok)throw Error(json.error||'网络请求失败');return json;}
function welcome(date){result=null;downloads(false);status('今日尚未抽签');$('stage').innerHTML=`<div class="sign-welcome"><span class="medallion">签</span><h2>今日一签，心有所向</h2><p>今日${esc(date||'')}尚未抽签。左侧选择主题后点击「开始抽签」。首次随机，结果会在设定时区的今日保持不变。</p><div class="benefits"><span>100 原创签诗</span><span>设备隔离签簿</span><span>主题解读</span></div></div>`;}
function readingSections(data){const note=data.interpretation;return `<div class="section"><h3>签文解释 · ${note.sections.length} 个层次</h3><p class="reading-summary">${esc(note.summary)}</p>${note.sections.map((s,i)=>`<details class="reading-item" ${i<2?'open':''}><summary><span>${i+1}</span>${esc(s.title)}</summary><div class="reading-body"><strong>${esc(s.summary)}</strong><p>${esc(s.interpretation)}</p>${s.observations?.length?`<div class="reading-facts"><b>内容依据</b>${s.observations.map(x=>`<div>· ${esc(x)}</div>`).join('')}</div>`:''}${s.trace?.length?`<details class="reading-trace"><summary>查看依据字段</summary>${s.trace.map(x=>`<div><code>${esc(x.path)}</code>：${esc(x.value)}</div>`).join('')}</details>`:''}${s.questions?.length?`<div class="reading-qs"><b>思考问题</b>${s.questions.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}</div></details>`).join('')}</div>`;}
function paint(data){
  result=data;window.dispatchEvent(new CustomEvent('fortune:result',{detail:data}));latestAnswer=null;downloads(true);status('签文已生成');
  const s=data.result.sign,r=data.result.record,note=data.interpretation;
  const lines=s.lines.map(v=>`<p>${esc(v)}</p>`).join('');
  $('stage').innerHTML=`<div class="result-head"><div><small class="eyebrow">DAILY SIGN / 匿名设备签簿</small><h2>${r.kind==='daily'?'今日一签':'问事求签'}</h2><p>${esc(r.date)} · ${esc(r.timezone)} · 原创文化签</p></div><span class="chip">${r.kind==='daily'?'当日固定':'独立签文'}</span></div>
  ${note.story?'':`<div class="sign-center"><div class="sign-id">第 ${String(s.id).padStart(3,'0')} 签</div><h2 class="sign-title">${esc(s.title)}</h2><div class="sign-grade">${esc(s.grade)} · ${esc(s.theme)}</div><div class="sign-poem">${lines}</div><p class="sign-small-muted">原创文化签诗初稿 · 非古籍逐句引文</p></div>`}
  ${window.FortuneStory?.(note.story)||`<div class="sign-main-meaning"><h3>签意</h3>${esc(s.meaning)}<h3>今日行动</h3>${esc(s.action)}</div>`}
  <div class="sign-buttons"><button data-signact="favorite">${r.favorite?'★ 已收藏':'☆ 收藏本签'}</button><button data-signact="poster">下载分享海报 PNG</button><button data-signact="copy">复制签诗</button><button data-signact="history">查看签簿</button></div>
  <details class="story-more"><summary>想查看更多签文分析、规则及来源？</summary>${readingSections(data)}</details>
  <div class="sign-qa"><h3>继续追问签意</h3><label for="sign-followup-q">围绕当前签文提问（不默认保存）</label><textarea id="sign-followup-q" maxlength="500" placeholder="例如：这个‘稳步推进’建议，我可以怎样落实？"></textarea><label class="sign-check"><input type="checkbox" id="sign-remote-allow" ${modelEnabled?'':'disabled'}> ${modelEnabled?'明确同意将本次签诗与问题发送至已配置的外部 AI 模型':'未配置外部 AI 模型：仅使用本地规则追问'}</label><button class="minor" data-signact="followup">解读追问</button><div id="sign-followup-answer" class="sign-answer" hidden></div></div>
  <div class="warn">${esc(note.limitations.join('；'))}<p>${esc(data.disclaimer)}</p></div>`;
}
async function perform(action='draw'){
  const ticket=++requestSerial;
  setupError('');status('处理中');$('run').disabled=true;
  if(action==='draw'||action==='question'){
    $('stage').innerHTML='<div class="sign-shaking" role="status"><div class="sign-cup" aria-hidden="true"></div><strong>摇签问心，静候一签</strong><p>抽签结果会进入当前设备独立签簿；重要结果请另存到记录库</p></div>';
    await new Promise(resolve=>setTimeout(resolve,540));
    if(!active()||ticket!==requestSerial){if(ticket===requestSerial)$('run').disabled=false;return;}
  }
  try{
    const raw=await post('/api/daily-sign',{...params(),action});
    if(!active()||ticket!==requestSerial)return;
    if(raw.data)paint(raw.data);
    else welcome(raw.date);
  }catch(e){status('请求失败');setupError(e.message);}finally{if(ticket===requestSerial)$('run').disabled=false;}
}
async function loadHistory(){
  setupError('');status('签簿');
  try{
    const hist=await post('/api/daily-sign',{action:'history',profileId:profile,limit:200});
    const items=hist.items;
    $('stage').innerHTML=`<div class="sign-history-head"><div><small class="eyebrow">DEVICE SIGNBOOK · TEMPORARY</small><h2>个人历史签簿</h2><p class="sign-small-muted">当前设备记录 ${hist.total} 条，显示最近 ${items.length} 条；服务端临时保存，部署重启后可能清空；问题仅在勾选“保存提问”时记录</p></div><span class="chip">设备独立记录</span></div>
    <div class="sign-pager"><button data-signact="peek">返回今日签文</button><button data-signact="export-history">导出历史 JSON</button><button data-signact="clear" ${items.length?'':'disabled'}>清空当前档案</button></div>
    <div class="sign-history-items">${items.map(x=>`<div class="sign-entry"><div><strong>${esc(x.title)} · 第${x.signId}签 ${x.favorite?'★':''}</strong><small>${esc(x.date)} · ${x.kind==='daily'?'每日':'问事'} · ${esc(x.grade)} · ${esc(x.theme)}</small></div><div class="sign-ops"><button data-signact="read" data-id="${esc(x.id)}">详情</button><button data-signact="delete" data-id="${esc(x.id)}" class="remove">删除</button></div></div>`).join('')||'<p class="sign-small-muted">还没有历史签文，请先抽一签。</p>'}</div>`;
  }catch(e){setupError(e.message);}
}
async function catalog(){
  try{const data=await post('/api/daily-sign',{action:'catalog',limit:100});
    $('stage').innerHTML=`<div class="result-head"><div><h2>四时百签 · 目录</h2><p>共 ${data.total} 条原创文化签诗。签系其他版本需独立版权与来源审核后才能上架。</p></div></div><div class="sign-pager"><button data-signact="peek">返回今日签文</button></div><div class="sign-library-grid">${data.items.map(x=>`<div class="sign-library-card"><span>第 ${x.id} 签 · ${esc(x.grade)}</span><strong>${esc(x.title)}</strong><p>${esc(x.lines.join(' / '))}</p></div>`).join('')}</div>`;
  }catch(e){setupError(e.message);}
}
function download(filename,value,mime){const blob=value instanceof Blob?value:new Blob([value],{type:mime});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function paintPoster(){
  if(!result)return;
  const sign=result.result.sign,date=result.result.record.date,canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1520;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('当前浏览器不支持 Canvas');
  const gradient=ctx.createLinearGradient(0,0,900,1500);gradient.addColorStop(0,'#faf6eb');gradient.addColorStop(1,'#eae9df');ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1520);
  ctx.strokeStyle='#c4ab82';ctx.lineWidth=4;ctx.strokeRect(65,65,950,1390);
  ctx.textAlign='center';ctx.fillStyle='#7b704d';ctx.font='28px serif';ctx.fillText('F O R T U N E   M A S T E R  ·  四 时 百 签',540,165);
  ctx.font='30px serif';ctx.fillText(`第 ${String(sign.id).padStart(3,'0')} 签    ${sign.grade}`,540,270);
  ctx.fillStyle='#754d3c';ctx.font='bold 80px "Songti SC",serif';ctx.fillText(sign.title,540,395);
  ctx.fillStyle='#2d4637';ctx.font='53px "Songti SC",serif';sign.lines.forEach((line,i)=>ctx.fillText(line,540,570+i*110));
  ctx.fillStyle='#8b7458';ctx.fillRect(165,850,750,2);
  ctx.fillStyle='#385849';ctx.font='37px "Songti SC",serif';ctx.fillText('「'+sign.theme+'」',540,930);
  ctx.textAlign='left';ctx.font='31px "PingFang SC",sans-serif';
  function wrap(text,x,y,maxWidth,lineHeight,maxLines){let row='',count=0;for(const ch of text){if(ctx.measureText(row+ch).width>maxWidth){ctx.fillText(row,x,y);row=ch;y+=lineHeight;if(++count>=maxLines)return;}else row+=ch;}if(row)ctx.fillText(row,x,y);}
  wrap(sign.meaning,155,1025,770,55,3);ctx.font='29px "PingFang SC",sans-serif';ctx.fillStyle='#466e58';wrap('今日行动：'+sign.action,155,1220,770,52,2);
  ctx.fillStyle='#8f8f7b';ctx.textAlign='center';ctx.font='23px sans-serif';ctx.fillText(date+' · 原创文化签文 / 非科学预测',540,1380);
  canvas.toBlob(blob=>{if(blob)download(`fortune-daily-${date}-${sign.id}.png`,blob,'image/png');else setupError('海报生成失败，请重试')},'image/png');
}
async function actionHandler(e){
  if(!active())return;
  const btn=e.target.closest('button[data-signact]');if(!btn)return;
  const action=btn.dataset.signact,id=btn.dataset.id;
  btn.disabled=true;setupError('');
  try{
    if(action==='history')await loadHistory();
    else if(action==='peek')await perform('peek');
    else if(action==='read'){const r=await post('/api/daily-sign',{action:'read',profileId:profile,recordId:id});paint(r.data);}
    else if(action==='favorite'&&result){const r=await post('/api/daily-sign',{action:'favorite',profileId:profile,recordId:result.result.record.id});result.result.record.favorite=r.record.favorite;paint(result);}
    else if(action==='delete'){
      if(confirm('确定删除这一条签簿记录？删除后无法恢复。')){await post('/api/daily-sign',{action:'delete',profileId:profile,recordId:id});await loadHistory();}
    }
    else if(action==='clear'){
      if(confirm('确定删除当前匿名档案的所有签簿记录？此操作不可恢复。')){await post('/api/daily-sign',{action:'clear',profileId:profile});await loadHistory();}
    }
    else if(action==='poster')paintPoster();
    else if(action==='copy'&&result){const s=result.result.sign;await navigator.clipboard.writeText(`第${s.id}签 · ${s.title}\n${s.lines.join('\n')}\n${s.meaning}\n— Fortune Master 原创文化签`);status('已复制签诗');}
    else if(action==='export-history'){
      const first=await post('/api/daily-sign',{action:'history',profileId:profile,limit:500,offset:0});
      const items=[...first.items];
      for(let i=500;i<first.total;i+=500){const more=await post('/api/daily-sign',{action:'history',profileId:profile,limit:500,offset:i});items.push(...more.items);}
      download('fortune-signbook.json',JSON.stringify({total:items.length,items,exportedAt:new Date().toISOString()},null,2),'application/json');
    }
    else if(action==='followup'&&result){
      const q=$('sign-followup-q').value,remote=$('sign-remote-allow').checked;
      if(remote&&!confirm('你将把本次签诗和问题发送至自己配置的第三方 AI 模型，是否继续？'))return;
      const ans=await post('/api/sign-followup',{recordId:result.result.record.id,profileId:profile,topic:$('sign-topic').value,question:q,allowExternal:remote});
      const field=$('sign-followup-answer');field.hidden=false;field.textContent=`${ans.mode==='ai-remote'?'外部 AI 解读':'离线规则解读'}\n${ans.answer}\n\n${ans.note}`;
    }
  }catch(err){setupError(err.message);}finally{if(btn.isConnected)btn.disabled=false;}
}
$('sign-mode').addEventListener('change',()=>{$('sign-question-area').hidden=$('sign-mode').value!=='question';$('run').textContent=$('sign-mode').value==='draw'?'开始抽取今日签文':'开始问事求签';});
async function downloadHTML(){
  if(!result)return;
  try{const response=await fetch('/api/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:result})});if(!response.ok)throw Error('报告导出失败');download(`fortune-sign-${result.result.record.date}.html`,await response.text(),'text/html;charset=utf-8');}
  catch(err){setupError(err.message);}
}
function downloadJSON(){if(result)download(`fortune-sign-${result.result.record.date}.json`,JSON.stringify(result,null,2),'application/json');}
async function activate(){
  const ticket=++requestSerial;
  modelEnabled=false;status('读取今日签文');$('run').textContent=$('sign-mode').value==='draw'?'开始抽取今日签文':'开始问事求签';
  try{const state=await post('/api/daily-sign',{action:'status'});modelEnabled=state.modelEnabled;if(active()&&ticket===requestSerial)await perform('peek');}
  catch(err){setupError('每日一签初始化失败：'+err.message);status('每日一签无法使用');}
}
// 每日一签操作仅由主工作台分发，避免双重事件处理器发生竞争或错渲染。
window.FortuneDailySign=Object.freeze({activate,perform,sample:()=>perform('peek'),downloadHTML,downloadJSON});
$('stage').addEventListener('click',actionHandler);
$('sign-history').addEventListener('click',async()=>{if(active())await loadHistory();});
$('sign-catalog').addEventListener('click',async()=>{if(active())await catalog();});
// Opt-in reminders only run while this page is open. No service worker, background daemon or remote push.
const reminderKey='fortune-daily-reminder-v1';let reminder={on:false,at:'09:00'};
try{reminder=JSON.parse(localStorage.getItem(reminderKey))||reminder;}catch{}
$('sign-remind').checked=Boolean(reminder.on);$('sign-remind-at').value=reminder.at||'09:00';
function saveReminder(){reminder={on:$('sign-remind').checked,at:$('sign-remind-at').value};try{localStorage.setItem(reminderKey,JSON.stringify(reminder));}catch{}}
$('sign-remind').addEventListener('change',async()=>{
  if($('sign-remind').checked){
    if(!('Notification'in window)){$('sign-remind').checked=false;alert('浏览器不支持系统通知');}
    else{const p=await Notification.requestPermission();if(p!=='granted'){$('sign-remind').checked=false;alert('未授予浏览器通知权限，提醒未启用');}}
  }
  saveReminder();
});$('sign-remind-at').addEventListener('change',saveReminder);
function checkReminder(){
  if(!reminder.on||document.hidden||!('Notification'in window)||Notification.permission!=='granted')return;
  const tz=$('sign-timezone').value||'Asia/Shanghai';try{
    const now=new Date(),parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
    const day=`${parts.year}-${parts.month}-${parts.day}`,clock=`${parts.hour}:${parts.minute}`,key=`fortune-reminded-${tz}-${day}`;
    if(clock>=reminder.at && localStorage.getItem(key)!=='yes'){new Notification('Fortune Master · 今日一签',{body:'工作台已打开，可以查看今日的原创文化签诗。'});localStorage.setItem(key,'yes');}
  }catch{}
}
setInterval(checkReminder,60000);
})();
