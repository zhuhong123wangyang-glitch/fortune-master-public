#!/usr/bin/env node
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {route} from './core/router.mjs';
import {calculateBazi} from './engines/bazi.mjs';
import {calculateZiwei} from './engines/ziwei.mjs';
import {calculateHepan} from './engines/hepan.mjs';
import {profileStore} from './profiles/store.mjs';
import {previewBirthTime} from './core/time-preview.mjs';
import {searchKnowledge} from './knowledge/catalog.mjs';
import {calculateHuangli} from './engines/huangli.mjs';
import {castLiuyao} from './engines/liuyao.mjs';
import {castMeihua} from './engines/meihua.mjs';
import {renderHTML} from './reports/html.mjs';
import {dailySignService} from './signs/service.mjs';
import {listSigns} from './signs/catalog.mjs';
import {followUp} from './signs/followup.mjs';
const HELP=`Fortune Master V1.5.0 — 命理 Skill + 每日一签 命令行

安装：npm install --ignore-scripts
本地工作台：npm start（浏览器打开 http://127.0.0.1:8766）

八字： node src/cli.mjs bazi --date 2005-10-01 --time 15:00 --gender female [--day-sect 1|2] [--yun-sect 1|2] [--out output/chart.json]
紫微： node src/cli.mjs ziwei --date 2005-10-01 --time 15:00 --gender female [--focus-date 2026-11-07] [--format html]
合盘： node src/cli.mjs hepan --a-label A --a-date 1992-05-15 --a-time 09:00 --a-gender male --b-label B --b-date 1995-02-03 --b-time 18:00 --b-gender female --mode love|social|fortune --year 2026
档案： node src/cli.mjs profiles --action list|save|get|delete（保存必须 --consent true；删除必须 --confirm true）
时区核对：node src/cli.mjs time-preview --date 2005-10-01 --time 15:00 --timezone Asia/Shanghai --longitude 116.4 (不改动正式命盘)
每日签：node src/cli.mjs daily-sign --action draw --profile local-default --timezone Asia/Shanghai [--topic career] [--format html]
签簿：  node src/cli.mjs daily-sign --action history [--profile local-default]
问事签：node src/cli.mjs daily-sign --action question --question "学习规划" --topic study [--save-question true]
签文检索：node src/cli.mjs signs --query "云" [--limit 20]
追问：  node src/cli.mjs sign-followup --record <record-id> --question "我该怎么计划" (默认本地；明确配置外部模型后可 --allow-external true)
知识： node src/cli.mjs knowledge --query 月令 [--domain bazi|ziwei|iching]
黄历： node src/cli.mjs huangli --date 2026-11-05 [--sect 1|2]
六爻： node src/cli.mjs liuyao --lines 9,8,8,7,7,6 [--day-stem 甲] [--question 事业]  (自下至上)
     或 node src/cli.mjs liuyao --coins HHT,TTT,HHH,HTT,HHT,THT
     或 node src/cli.mjs liuyao  (真随机三钱六次，逐爻保存)
梅花： node src/cli.mjs meihua --numbers 3,5,2 [--question 学业]
意图： node src/cli.mjs route --query "帮我看一下八字"
自检： node src/cli.mjs selfcheck

所有计算命令都支持 --format json|html 和 --out path；默认输出标准 JSON 到 stdout。
仅在本地计算；不联网、不上传出生信息。日历依赖初次 npm install 需联网。
提示：八字只支持公历日期、Asia/Shanghai 钟表时间、不启用真太阳时。`;
function parseArgs(args){
  const params={};
  for(let i=0;i<args.length;i++){
    const token=args[i];
    if(!token.startsWith('--'))throw new Error(`参数格式错误：${token}，请使用 --help 查看示例`);
    const pos=token.indexOf('=');
    const key=pos<0?token.slice(2):token.slice(2,pos);
    const val=pos<0?args[++i]:token.slice(pos+1);
    if(!key || val===undefined||val.startsWith('--'))throw new Error(`参数 ${token} 缺少值`);
    if(Object.hasOwn(params,key))throw new Error(`重复参数：${key}`);
    params[key]=val;
  }
  return params;
}
const splitNumbers=(v,len,label)=>{
  if(typeof v!=='string')throw new Error(`${label} 未提供`);
  const arr=v.split(',').map(x=>x.trim());
  if(arr.length!==len||arr.some(x=>!/^[0-9]+$/.test(x)))throw new Error(`${label} 应为 ${len} 个逗号分隔的整数`);
  return arr.map(Number);
};
export async function execute(method,args={}){
  if(method==='route')return route(args.query);
  if(method==='time-preview')return previewBirthTime({date:args.date,time:args.time,timezone:args.timezone||'Asia/Shanghai',longitude:args.longitude});
  if(method==='profiles'){
    switch(args.action||'list'){
      case 'list':return profileStore.list();
      case 'get':return profileStore.get(args.id);
      case 'save':return profileStore.save({id:args.id,label:args.label,date:args.date,time:args.time,gender:args.gender,timezone:args.timezone||'Asia/Shanghai',consent:args.consent==='true'});
      case 'delete':return profileStore.delete(args.id,args.confirm==='true');
      default:throw Error('未知档案操作');
    }
  }
  if(method==='signs')return listSigns({query:args.query||'',limit:args.limit?Number(args.limit):20});
  if(method==='daily-sign'){
    const opt={action:args.action||'draw',profileId:args.profile||'local-default',timezone:args.timezone||'Asia/Shanghai',topic:args.topic||'general',question:args.question||'',saveQuestion:args['save-question']==='true',recordId:args.record};
    if(opt.action==='history')return dailySignService.history(opt);
    if(opt.action==='read')return dailySignService.readRecord(opt);
    return dailySignService.perform(opt);
  }
  if(method==='sign-followup'){
    const record=await dailySignService.readRecord({profileId:args.profile||'local-default',recordId:args.record,topic:args.topic});
    return followUp({sign:record.data.result.sign,topic:args.topic||record.data.input.topic,question:args.question,allowExternal:args['allow-external']==='true'});
  }
  if(method==='bazi')return calculateBazi({date:args.date,time:args.time,gender:args.gender,timezone:args.timezone||'Asia/Shanghai',daySect:args['day-sect']??2,yunSect:args['yun-sect']??1,trueSolarTime:args['true-solar-time']==='true'});
  if(method==='ziwei')return calculateZiwei({date:args.date,time:args.time,gender:args.gender,timezone:args.timezone||'Asia/Shanghai',fixLeap:args['fix-leap']!=='false',focusDate:args['focus-date']||'2026-11-07'});
  if(method==='hepan')return calculateHepan({personA:{label:args['a-label']||'甲方',date:args['a-date'],time:args['a-time'],gender:args['a-gender'],timezone:'Asia/Shanghai'},personB:{label:args['b-label']||'乙方',date:args['b-date'],time:args['b-time'],gender:args['b-gender'],timezone:'Asia/Shanghai'},mode:args.mode||'love',referenceYear:args.year?Number(args.year):2026});
  if(method==='knowledge')return searchKnowledge({query:args.query||'',domain:args.domain||'all',limit:args.limit?Number(args.limit):20});
  if(method==='huangli')return calculateHuangli({date:args.date,sect:args.sect??1,timezone:args.timezone||'Asia/Shanghai'});
  if(method==='liuyao')return castLiuyao({question:args.question||'',lines:args.lines?splitNumbers(args.lines,6,'lines'):undefined,coins:args.coins?args.coins.split(',').map(x=>x.trim()):undefined,dayStem:args['day-stem']||undefined});
  if(method==='meihua')return castMeihua({question:args.question||'',numbers:splitNumbers(args.numbers,3,'numbers')});
  if(method==='selfcheck'){
    const {loadLunar}=await import('./core/load-lunar.mjs');
    const lib=await loadLunar();
    const r=await calculateBazi({date:'2005-10-01',time:'15:00',gender:'female'},lib);
    const got=r.result.pillars.map(p=>p.ganZhi).join(' '),expected='乙酉 乙酉 戊午 庚申';
    if(got!==expected)throw new Error(`样例排盘不符合公开样例：实际 ${got}；期望 ${expected}`);
    const ziwei=await calculateZiwei({date:'2005-10-01',time:'15:00',gender:'female'});
    if(ziwei.result.palaces.length!==12)throw new Error('紫微未返回十二宫');
    if(!ziwei.result.advanced)throw new Error('紫微四化摘要模块未返回');
    if(!r.result.patternObservation)throw new Error('八字格局观察模块未返回');
    const hepan=await calculateHepan({personA:{label:'公开测试甲方',date:'2005-10-01',time:'15:00',gender:'female'},personB:{label:'公开测试乙方',date:'1995-02-03',time:'18:00',gender:'male'},mode:'social',referenceYear:2026},lib);
    if(hepan.result.people.length!==2)throw new Error('合盘未返回两份独立命盘');
    if(!hepan.result.crossChart)throw new Error('合盘四柱交叉关系未返回');
    return {ok:true,reference:expected,observed:got,libraries:['lunar-typescript','iztro'],ziweiPalaces:ziwei.result.palaces.length,hepanPeople:hepan.result.people.length,interpretationSections:{bazi:r.interpretation.sections.length,ziwei:ziwei.interpretation.sections.length},test:'公开八字示例基本盘 + 紫微十二宫结构 + 双人合盘真实计算',note:'基础自检不代表所有历法边界和紫微流派都通过验证'};
  }
  throw new Error(`不支持的命令：${method}`);
}
export async function main(argv=process.argv.slice(2)){
  if(!argv.length||argv.includes('--help')||argv.includes('-h')||argv[0]==='help'){
    process.stdout.write(HELP+'\n');return;
  }
  const [method,...rest]=argv;
  const params=parseArgs(rest);
  const format=params.format||'json';
  if(!['json','html'].includes(format))throw new Error('--format 只能为 json 或 html');
  const data=await execute(method,params);
  if(format==='html'&&(['route','knowledge','selfcheck','signs','sign-followup','profiles','time-preview'].includes(method)|| (method==='daily-sign'&&!data?.data)))throw new Error(`${method} 命令/操作不支持 HTML 报告`);
  const text=format==='html'?renderHTML(data?.data||data):JSON.stringify(data,null,2)+'\n';
  if(params.out){
    const path=resolve(params.out);
    await mkdir(dirname(path),{recursive:true});
    await writeFile(path,text,'utf8');
    process.stderr.write(`已写入 ${path}\n`);
  }else process.stdout.write(text);
}
if (process.argv[1] && import.meta.url===new URL(`file://${resolve(process.argv[1])}`).href){
  main().catch(err=>{console.error('运行失败：'+err.message);process.exitCode=1;});
}
