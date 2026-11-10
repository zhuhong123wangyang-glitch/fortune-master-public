import {KNOWLEDGE,sourcesFor} from './catalog.mjs';
// 只有 catalog.verifiedQuotes 中已核对的短引文允许标为原文；其余仅能标作规则说明/书目索引。
export function verifiedCitation(id){
 const found=KNOWLEDGE.verifiedQuotes.find(q=>q.id===id&&q.status==='verified-short-excerpt');
 if(!found)return null;
 const source=sourcesFor([found.sourceId])[0];
 if(!source)return null;
 return {id:found.id,kind:'verified-excerpt',title:found.title,quote:found.text,locator:found.locator,source:source.title,url:found.url||source.url,verification:'已核对短引文；非对整个解读结论的引证'};
}
export function methodReference({title,url,locator,summary}={}){
 if(typeof url!=='string'||!url.startsWith('https://'))throw Error('规则说明必须有可信的 https 来源');
 return {kind:'algorithm-rule',title,url,locator:locator||'',summary:summary||'',verification:'现代排盘口径参考，非逐字古籍引用'};
}
