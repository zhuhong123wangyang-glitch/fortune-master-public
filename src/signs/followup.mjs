import {validateQuestion,validateTopic,buildSignReading} from './reading.mjs';

// No outbound requests unless (1) keys are explicitly configured and (2) user explicitly clicks/consents.
export async function followUp({sign,topic='general',question,allowExternal=false,fetchImpl=fetch}={}){
  validateTopic(topic);question=validateQuestion(question);
  if(!question||question.length<2)throw new Error('请输入至少2个字的追问');
  const reading=buildSignReading(sign,topic,question);
  const fallback=`从「${sign.title}」中的“${sign.theme}”出发：${sign.meaning}。结合你的问题「${question}」，可以先考虑：${sign.action}。也请核对实际条件，不将签等作为未来结果的判断。`;
  const key=process.env.FORTUNE_LLM_API_KEY,model=process.env.FORTUNE_LLM_MODEL;
  if(!allowExternal||!key||!model){return {mode:'offline-rule',answer:fallback,externalSent:false,note:key&&model?'可选择明确同意后使用已配置的外部模型':'未配置外部模型，使用本地规则解读',context:reading.summary};}
  const endpoint=process.env.FORTUNE_LLM_ENDPOINT||'https://api.openai.com/v1/chat/completions';
  let url;
  try{url=new URL(endpoint);}catch{throw new Error('模型端点配置无效');}
  if(url.protocol!=='https:'||url.username||url.password)throw new Error('外部模型端点必须是 HTTPS，且不能包含账号密码');
  const prompt={
    model,messages:[
      {role:'system',content:'你是 Fortune Master 的传统文化签文讲解员。给出中文简明解读，来源仅为提供的原创签文，严禁编造古籍出处、具体未来概率、健康诊断或投资保证。把建议变为可核实的低风险步骤。对医疗、财务、法律重要事项提醒咨询专业人士。'},
      {role:'user',content:JSON.stringify({title:sign.title,verse:sign.lines,theme:sign.theme,meaning:sign.meaning,action:sign.action,topic,question})}
    ],temperature:0.3,max_tokens:450,stream:false
  };
  const reply=await fetchImpl(url,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(prompt),signal:AbortSignal.timeout(20000)});
  if(!reply.ok)throw new Error(`外部模型请求失败，HTTP ${reply.status}；可取消勾选改用离线解读`);
  const json=await reply.json();
  const answer=json?.choices?.[0]?.message?.content;
  if(typeof answer!=='string'||!answer.trim())throw new Error('模型返回内容为空，请改用离线解读');
  return {mode:'ai-remote',answer:answer.slice(0,4000),externalSent:true,provider:new URL(url).hostname,note:'本次追问与签文已发送至用户配置的外部模型服务；密钥未发送到前端'};
}
