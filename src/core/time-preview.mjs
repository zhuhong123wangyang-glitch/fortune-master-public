// 公开时间核对工具：为研究型预览，不直接替代使用北京时间的命理库排盘。
import {assertPlainDate,assertClock} from './schema.mjs';
function parts(ts,timezone){
 const fmt=new Intl.DateTimeFormat('en-US',{timeZone:timezone,calendar:'gregory',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const o=Object.fromEntries(fmt.formatToParts(ts).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
 return {y:o.year,m:o.month,d:o.day,h:o.hour,min:o.minute};
}
const equal=(a,b)=>['y','m','d','h','min'].every(k=>a[k]===b[k]);
function minutesOffset(ts,timezone){const p=parts(ts,timezone);return (Date.UTC(p.y,p.m-1,p.d,p.h,p.min)-Math.floor(ts/60000)*60000)/60000;}
function validZone(tz){if(typeof tz!=='string'||tz.length>80||!/^[A-Za-z0-9_+\-/]+$/.test(tz))throw Error('时区格式不正确，请填写 IANA 时区，如 Asia/Shanghai');
 try{new Intl.DateTimeFormat('en-US',{timeZone:tz});}catch{throw Error('未知 IANA 时区：'+tz);}return tz;}
export function previewBirthTime({date,time,timezone='Asia/Shanghai',longitude}={}){
 const d=assertPlainDate(date),t=assertClock(time),tz=validZone(timezone);
 const lng=Number(longitude);
 if(!Number.isFinite(lng)||lng< -180||lng>180)throw Error('经度应为 -180 到 180 度（东经为正）');
 const target=Date.UTC(d.y,d.m-1,d.d,t.h,t.min),desired={...d,h:t.h,min:t.min};
 const offsets=new Set();for(const delta of [-172800000,-86400000,-43200000,0,43200000,86400000,172800000])offsets.add(minutesOffset(target+delta,tz));
 const candidates=[...offsets].map(offset=>target-offset*60000).filter(instant=>equal(parts(instant,tz),desired));
 const uniq=[...new Set(candidates)];
 if(!uniq.length)throw Error('该当地时间不存在（可能是夏令时跳时），请检查出生时间');
 if(uniq.length>1)throw Error('该当地时间因夏令时回拨而重复，请核对当时的 UTC 偏移，不能擅自选一个时间');
 const ms=uniq[0],utc=new Date(ms),january=Date.UTC(utc.getUTCFullYear(),0,1);
 const n=Math.floor((Date.UTC(d.y,d.m-1,d.d)-Date.UTC(d.y,0,1))/86400000)+1;
 const B=2*Math.PI*(n-81)/364;
 const equation=9.87*Math.sin(2*B)-7.53*Math.cos(B)-1.5*Math.sin(B);
 const approx=new Date(ms+(lng*4+equation)*60000);
 const bj=parts(ms,'Asia/Shanghai');
 const pad=x=>String(x).padStart(2,'0');
 return {input:{date,time,timezone:tz,longitude:lng},utcInstant:new Date(ms).toISOString(),beijingClock:`${bj.y}-${pad(bj.m)}-${pad(bj.d)} ${pad(bj.h)}:${pad(bj.min)}`,approximateSolarClock:`${approx.getUTCFullYear()}-${pad(approx.getUTCMonth()+1)}-${pad(approx.getUTCDate())} ${pad(approx.getUTCHours())}:${pad(approx.getUTCMinutes())}`,equationOfTimeMinutes:Number(equation.toFixed(2)),
  policy:'仅供人工核对时区、夏令时与太阳时估算；太阳时采用简化均时差近似，不是天文历表精算，结果不会自动代入八字/紫微排盘。',
  warnings:['在节气交界、子时换日、历史时区秒级偏移附近，必须使用专业天文历表与流派规则进一步校验。','不同命理流派对当地民用时、真太阳时及换日规则有不同口径；本工具不会偷偷改写出生输入。']};
}
