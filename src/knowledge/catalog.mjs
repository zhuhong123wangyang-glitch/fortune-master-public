import {readFileSync} from 'node:fs';
import {listSigns} from '../signs/catalog.mjs';
const catalog=Object.freeze(JSON.parse(readFileSync(new URL('../../knowledge/catalog.json',import.meta.url),'utf8')));
export const KNOWLEDGE=catalog;
const sourceMap=new Map(catalog.sources.map(s=>[s.id,s]));
export function sourcesFor(ids=[]){return [...new Set(ids)].map(id=>sourceMap.get(id)).filter(Boolean).map(s=>({...s}));}
export function hexagramEntry(number){return catalog.hexagrams.find(x=>x.number===number);}
export function searchKnowledge({query='',domain='all',limit=20}={}){
  if(typeof query!=='string'||query.length>120)throw new Error('检索词须为 120 字以内的字符串');
  if(!['all','bazi','ziwei','iching','sign'].includes(domain))throw new Error('知识领域不支持');
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('limit 应为 1~100');
  const q=query.trim().toLowerCase();
  const quotes=catalog.verifiedQuotes.map(x=>({id:x.id,domain:x.domain==='meihua'?'iching':x.domain,name:x.title,keywords:[x.title,x.locator],summary:x.text,sourceIds:[x.sourceId],originalSummary:false,verbatim:true,verification:x.status,locator:x.locator}));
  const found=[...catalog.concepts,...quotes].filter(x=>(domain==='all'||x.domain===domain)&&(!q||[x.name,x.summary,...x.keywords].some(s=>s.toLowerCase().includes(q))));
  const signs=(domain==='all'||domain==='sign')?listSigns({query:q,limit:100}).items.map(x=>({id:`original-sign-${x.id}`,domain:'sign',name:`第${x.id}签 ${x.title}`,keywords:x.keywords,summary:`${x.lines.join('；')}。${x.meaning}`,sourceIds:['fortune-master-original-100'],verbatim:false,verification:'original-editorial-draft',sources:[{id:'fortune-master-original-100',title:'Fortune Master 四时百签（原创初稿）',url:'',note:'未逐条人工文学审核，非古籍原文'}]})):[];
  const items=[...found.map(c=>({...c,sources:sourcesFor(c.sourceIds)})),...signs];
  return {version:`${catalog.version}+signs-1.0`,query,domain,total:items.length,items:items.slice(0,limit),policy:{...catalog.policy,dailySign:'原创签文目录，非古籍原文'}};
}
