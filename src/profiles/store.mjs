// 本地命盘档案 V1.4。只在用户主动选择保存时持久化，不记录历史查询与合盘对象。
import {mkdir,readFile,writeFile,rename,chmod,lstat} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertPlainDate,assertClock,assertGender} from '../core/schema.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const MAX_RECORDS=200;
function dbPath(){return process.env.FORTUNE_PROFILE_FILE?resolve(process.env.FORTUNE_PROFILE_FILE):resolve(ROOT,'data/profiles.json');}
let queue=Promise.resolve();
function synchronized(task){const run=queue.then(task,task);queue=run.catch(()=>{});return run;}
async function safeFile(path){try {const s=await lstat(path);if(s.isSymbolicLink()||!s.isFile())throw new Error('档案存储路径不是常规文件，已拒绝访问');}catch(e){if(e.code!=='ENOENT')throw e;}}
async function load(){const p=dbPath();await safeFile(p);try{const parsed=JSON.parse(await readFile(p,'utf8'));if(parsed?.version!==1||!Array.isArray(parsed.entries))throw Error('档案格式不正确');if(parsed.entries.length>MAX_RECORDS)throw Error('档案数超过安全上限');return parsed;}catch(e){if(e.code==='ENOENT')return {version:1,entries:[]};throw Error(`档案读取失败，不会覆盖原数据：${e.message}`);}}
async function persist(db){const p=dbPath();await mkdir(dirname(p),{recursive:true,mode:0o700});await safeFile(p);const tmp=`${p}.${randomUUID()}.tmp`;
 try{await writeFile(tmp,JSON.stringify(db,null,2)+'\n',{mode:0o600,flag:'wx'});await chmod(tmp,0o600);await rename(tmp,p);}catch(e){const {unlink}=await import('node:fs/promises');await unlink(tmp).catch(()=>{});throw e;}}
const idValid=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/.test(v);
function cleanText(value){if(typeof value!=='string'||!value.trim()||value.trim().length>40||/[\u0000-\u001f\u007f]/.test(value))throw Error('档案称呼必须为 1–40 个可见字符');return value.trim();}
export function validateProfile(value){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('缺少档案数据');const label=cleanText(value.label);assertPlainDate(value.date);assertClock(value.time);assertGender(value.gender);
 const timezone=value.timezone||'Asia/Shanghai';if(timezone!=='Asia/Shanghai')throw Error('V1.4 正式排盘档案只支持 Asia/Shanghai；其他时区暂不保存为可直接排盘的资料');
 return {label,date:value.date,time:value.time,gender:value.gender,timezone};}
export const profileStore={
 list:()=>synchronized(async()=>{const d=await load();return {items:d.entries.map(({id,label,date,time,gender,timezone,createdAt,updatedAt})=>({id,label,date,time,gender,timezone,createdAt,updatedAt})),total:d.entries.length};}),
 get:(id)=>synchronized(async()=>{if(!idValid(id))throw Error('档案 ID 无效');const p=(await load()).entries.find(x=>x.id===id);if(!p)throw Error('未找到对应档案');return {item:p};}),
 save:(value)=>synchronized(async()=>{if(value?.consent!==true)throw Error('需要明确勾选“保存到本机”，才会写入档案');const p=validateProfile(value);const d=await load();const now=new Date().toISOString();let item;if(value.id!==undefined&&value.id!==null&&value.id!==''){
   if(!idValid(value.id))throw Error('档案 ID 无效');const n=d.entries.findIndex(x=>x.id===value.id);if(n<0)throw Error('更新失败：档案不存在');item={...d.entries[n],...p,updatedAt:now};d.entries[n]=item;
 }else{if(d.entries.length>=MAX_RECORDS)throw Error('已达到档案上限 200 条');item={id:randomUUID(),...p,createdAt:now,updatedAt:now};d.entries.push(item);}await persist(d);return {item};}),
 delete:(id,confirm)=>synchronized(async()=>{if(confirm!==true)throw Error('请先确认删除');if(!idValid(id))throw Error('档案 ID 无效');const d=await load();const n=d.entries.findIndex(x=>x.id===id);if(n<0)throw Error('档案不存在');d.entries.splice(n,1);await persist(d);return {deleted:true,id};})
};
