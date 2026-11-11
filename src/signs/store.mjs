import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

export const DEFAULT_SIGNBOOK_PATH=resolve(fileURLToPath(new URL('../../data/signbook.json',import.meta.url)));
const MAX_RECORDS_PER_PROFILE=5000;
const DEFAULT_PROFILE='local-default';
export function checkProfile(profileId=DEFAULT_PROFILE){
  if(typeof profileId!=='string'|| !/^[a-zA-Z0-9_-]{1,64}$/.test(profileId))throw new Error('档案标识只支持1~64位英文、数字、_、-');
  return profileId;
}
export function checkTimezone(timezone='Asia/Shanghai'){
  if(typeof timezone!=='string'||timezone.length>80||(!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+){1,3}$/.test(timezone)&&timezone!=='UTC'))throw new Error('请使用 IANA 时区，例如 Asia/Shanghai');
  try {new Intl.DateTimeFormat('en-US',{timeZone:timezone}).format(new Date());}catch {throw new Error('无效的时区');}
  return timezone;
}
export function localDay(date=new Date(),timezone='Asia/Shanghai'){
  checkTimezone(timezone);
  if(!(date instanceof Date)||!Number.isFinite(date.getTime()))throw new Error('日期时间不合法');
  const pieces=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return `${pieces.year}-${pieces.month}-${pieces.day}`;
}
const empty=()=>({schemaVersion:1,records:[]});
export class SignbookStore {
  #queue=Promise.resolve();
  constructor(path=DEFAULT_SIGNBOOK_PATH){this.path=path;this.storageType='file';}
  async read(){
    try{
      const data=JSON.parse(await readFile(this.path,'utf8'));
      if(data.schemaVersion!==1||!Array.isArray(data.records))throw new Error('签簿格式不兼容，请先备份再修复');
      return data;
    }catch(e){if(e.code==='ENOENT')return empty();throw e;}
  }
  async #persist(data){
    await mkdir(dirname(this.path),{recursive:true,mode:0o700});
    const tmp=`${this.path}.${randomUUID()}.tmp`;
    await writeFile(tmp,JSON.stringify(data,null,2)+'\n',{encoding:'utf8',mode:0o600,flag:'wx'});
    await rename(tmp,this.path);
  }
  // Serialize every read-modify-write operation within the process.
  update(callback){
    const task=this.#queue.then(async()=>{
      const data=await this.read();
      const {value,dirty}=await callback(data);
      if(dirty)await this.#persist(data);
      return structuredClone(value);
    });
    this.#queue=task.then(()=>undefined,()=>undefined);
    return task;
  }
  async find(profileId,id){
    const data=await this.read();
    return structuredClone(data.records.find(x=>x.profileId===checkProfile(profileId)&&x.id===id)||null);
  }
  async importRecords(profileId, records){
    profileId=checkProfile(profileId);
    if(!Array.isArray(records)||records.length>5000)throw new Error('备份最多允许导入 5000 条记录');
    return this.update(async(db)=>{
      const mine=db.records.filter(x=>x.profileId===profileId);
      const ids=new Set(mine.map(x=>x.id));
      const dailyDates=new Set(mine.filter(x=>x.kind==='daily').map(x=>x.date));
      let imported=0,skipped=0;
      for(const record of records){
        if(ids.has(record.id)||(record.kind==='daily'&&dailyDates.has(record.date))){skipped++;continue;}
        if(mine.length+imported>=MAX_RECORDS_PER_PROFILE)throw new Error('当前设备签簿达到 5000 条上限，已停止导入');
        db.records.push({...structuredClone(record),profileId});
        ids.add(record.id);
        if(record.kind==='daily')dailyDates.add(record.date);
        imported++;
      }
      return {value:{imported,skipped},dirty:imported>0};
    });
  }
  async history(profileId,{kind='all',limit=100,offset=0,month}={}){
    checkProfile(profileId);
    if(!['all','daily','question'].includes(kind))throw new Error('kind 无效');
    if(!Number.isInteger(limit)||limit<1||limit>500)throw new Error('limit 必须在 1~500');
    if(!Number.isInteger(offset)||offset<0||offset>5000)throw new Error('offset 必须在 0~5000');
    if(month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('month 必须为 YYYY-MM');
    const data=await this.read();
    const items=data.records.filter(x=>x.profileId===profileId&&(kind==='all'||x.kind===kind)&&(!month||x.date.startsWith(month))).sort((a,b)=>b.drawnAt.localeCompare(a.drawnAt));
    return {total:items.length,items:structuredClone(items.slice(offset,offset+limit))};
  }
  async run({action,profileId=DEFAULT_PROFILE,kind='daily',timezone='Asia/Shanghai',now=new Date(),randomSign,recordId,saveQuestion=false,question='',systemId,systemVersion,topic='general'}={}){
    profileId=checkProfile(profileId);
    if(!['peek','draw','question','favorite','delete','clear'].includes(action))throw new Error('未知签簿操作');
    if(['peek','draw','question'].includes(action))checkTimezone(timezone);
    return this.update(async(db)=>{
      const mine=db.records.filter(x=>x.profileId===profileId);
      const date=localDay(now,timezone);
      if(action==='peek')return {value:mine.find(x=>x.kind==='daily'&&x.date===date)||null,dirty:false};
      if(action==='clear'){const count=mine.length;db.records=db.records.filter(x=>x.profileId!==profileId);return {value:{deleted:count},dirty:count>0};}
      if(['favorite','delete'].includes(action)){
        if(typeof recordId!=='string'||recordId.length>64)throw new Error('记录标识无效');
        const item=db.records.find(x=>x.profileId===profileId&&x.id===recordId);
        if(!item)throw new Error('当前档案中找不到这条记录');
        if(action==='favorite'){item.favorite=!item.favorite;return {value:item,dirty:true};}
        db.records=db.records.filter(x=>x.id!==recordId);return {value:{deleted:1},dirty:true};
      }
      if(action==='draw'){
        const existing=mine.find(x=>x.kind==='daily'&&x.date===date);
        if(existing)return {value:existing,dirty:false};
      }
      if(mine.length>=MAX_RECORDS_PER_PROFILE)throw new Error('签簿记录已达上限，请先导出或清理历史记录');
      if(typeof randomSign!=='function')throw new Error('缺少签文随机抽取函数');
      const sign=randomSign(); // cryptographically random selected once, snapshot persisted below
      const record={id:randomUUID(),profileId,kind:action==='draw'?'daily':'question',date,timezone,drawnAt:now.toISOString(),sign,systemId,systemVersion,topic,question:saveQuestion?question:'',favorite:false};
      db.records.push(record);
      return {value:record,dirty:true};
    });
  }
}
export const defaultSignbook=new SignbookStore();
