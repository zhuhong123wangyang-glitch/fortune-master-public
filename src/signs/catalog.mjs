import {readFileSync} from 'node:fs';
const raw=JSON.parse(readFileSync(new URL('../../knowledge/daily-signs.json',import.meta.url),'utf8'));
if(raw.signs.length!==100 || new Set(raw.signs.map(x=>x.id)).size!==100)throw new Error('签文库不是完整的 100 签');
const byId=new Map(raw.signs.map(x=>[x.id,Object.freeze(x)]));
export const SIGN_SYSTEMS=Object.freeze([{id:raw.systemId,name:raw.systemName,version:raw.version,count:raw.signs.length,status:'available',sourceId:raw.source.id}]);
export const SIGN_POLICY=raw.policy;
export const SIGN_SOURCE=raw.source;
export function listSigns({query='',limit=100}={}){
  if(typeof query!=='string'||query.length>100)throw new Error('检索词不得超过100字');
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('limit 为 1~100');
  const q=query.trim();
  const items=raw.signs.filter(x=>!q||[x.id,x.title,x.theme,x.meaning,x.action,...x.lines].some(y=>String(y).includes(q)));
  return {systemId:raw.systemId,systemVersion:raw.version,total:items.length,items:items.slice(0,limit),policy:SIGN_POLICY};
}
export function getSign(id,systemId=raw.systemId){
  if(systemId!==raw.systemId)throw new Error('此签系暂未安装，不会假装已有传统签文');
  const sign=byId.get(Number(id));
  if(!sign)throw new Error('签号必须在 1~100 之间');
  return structuredClone(sign);
}
export function availableSignSystems(){return SIGN_SYSTEMS.map(x=>({...x}));}
export const DEFAULT_SIGN_SYSTEM=raw.systemId;
export const SIGN_CATALOG_VERSION=raw.version;
