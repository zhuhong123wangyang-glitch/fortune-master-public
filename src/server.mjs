#!/usr/bin/env node
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {calculateBazi} from './engines/bazi.mjs';
import {calculateHuangli} from './engines/huangli.mjs';
import {castLiuyao} from './engines/liuyao.mjs';
import {castMeihua} from './engines/meihua.mjs';
import {calculateZiwei} from './engines/ziwei.mjs';
import {calculateHepan} from './engines/hepan.mjs';
import {profileStore} from './profiles/store.mjs';
import {previewBirthTime} from './core/time-preview.mjs';
import {searchKnowledge} from './knowledge/catalog.mjs';
import {route} from './core/router.mjs';
import {renderHTML} from './reports/html.mjs';
import {dailySignService} from './signs/service.mjs';
import {followUp} from './signs/followup.mjs';
import {listSigns,availableSignSystems} from './signs/catalog.mjs';
const host='127.0.0.1',port=Number(process.env.FORTUNE_PORT||8766);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('FORTUNE_PORT 须为 1024-65535');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const FRONTEND=await readFile(resolve(root,'web/index.html'),'utf8');
const DAILY_JS=await readFile(resolve(root,'web/daily.js'),'utf8');
const DAILY_CSS=await readFile(resolve(root,'web/daily.css'),'utf8');
const V14_JS=await readFile(resolve(root,'web/v14.js'),'utf8');
const V14_CSS=await readFile(resolve(root,'web/v14.css'),'utf8');
const V15_JS=await readFile(resolve(root,'web/v15.js'),'utf8');
const V15_CSS=await readFile(resolve(root,'web/v15.css'),'utf8');
const MAX=1000000;
function headers(extra={}){return {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',...extra};}
function json(res,code,value){res.writeHead(code,headers({'Content-Type':'application/json; charset=utf-8','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"}));res.end(JSON.stringify(value));}
function plain(res,code,body,type){res.writeHead(code,headers({'Content-Type':type,'Content-Security-Policy':"default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"}));res.end(body);}
async function calculate(payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('请求需要 JSON 对象');
  const {method,params={}}=payload;
  if(!params||typeof params!=='object'||Array.isArray(params))throw new Error('params 需要是 JSON 对象');
  switch(method){
    case 'bazi':return calculateBazi(params);
    case 'ziwei':return calculateZiwei(params);
    case 'hepan':return calculateHepan(params);
    case 'huangli':return calculateHuangli(params);
    case 'liuyao':return castLiuyao(params);
    case 'meihua':return castMeihua(params);
    case 'daily-sign':throw new Error('每日一签请使用 /api/daily-sign 专用接口；如页面仍显示“开始排盘 / 起卦”，请刷新新版工作台。');
    case 'route':return route(params.query);
    default:throw new Error('未知计算方式');
  }
}
export function createFortuneServer(){return createServer(async(req,res)=>{
  try{
    if(!['127.0.0.1','localhost'].includes(String(req.headers.host||'').split(':')[0]))return json(res,403,{error:'只接受本地访问'});
    const pathname=new URL(req.url,'http://127.0.0.1').pathname;
    if(req.method==='GET'&&pathname==='/')return plain(res,200,FRONTEND,'text/html; charset=utf-8');
    if(req.method==='GET'&&pathname==='/daily.js')return plain(res,200,DAILY_JS,'application/javascript; charset=utf-8');
    if(req.method==='GET'&&pathname==='/daily.css')return plain(res,200,DAILY_CSS,'text/css; charset=utf-8');
    if(req.method==='GET'&&pathname==='/v14.js')return plain(res,200,V14_JS,'application/javascript; charset=utf-8');
    if(req.method==='GET'&&pathname==='/v14.css')return plain(res,200,V14_CSS,'text/css; charset=utf-8');
    if(req.method==='GET'&&pathname==='/v15.js')return plain(res,200,V15_JS,'application/javascript; charset=utf-8');
    if(req.method==='GET'&&pathname==='/v15.css')return plain(res,200,V15_CSS,'text/css; charset=utf-8');
    if(req.method==='GET'&&pathname==='/health')return json(res,200,{ok:true,version:'1.5.0',port,dailySign:'available',systems:availableSignSystems().length,hepan:'available',profiles:'local-opt-in',ziweiTransit:'iztro-adapter',advanced:{bazi:'pattern-observation',liuyao:'najia',ziwei:'mutagen-summary',hepan:'four-pillars'}});
    const endpoints=['/api/calculate','/api/report','/api/knowledge','/api/daily-sign','/api/sign-followup','/api/profiles','/api/time-preview'];
    if(req.method!=='POST'||!endpoints.includes(pathname))return json(res,404,{error:'未找到该地址'});
    const origin=req.headers.origin;
    if(origin && origin!==`http://127.0.0.1:${port}`&&origin!==`http://localhost:${port}`)return json(res,403,{error:'请求来源不属于本地工作台'});
    if((req.headers['content-type']||'').split(';')[0]!=='application/json')return json(res,415,{error:'需要 Content-Type: application/json'});
    let body='';for await(const chunk of req){body+=chunk.toString('utf8');if(Buffer.byteLength(body,'utf8')>MAX)return json(res,413,{error:'请求体超过 1MB'});}
    const payload=JSON.parse(body);
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('请求需要 JSON 对象');
    if(pathname==='/api/time-preview')return json(res,200,previewBirthTime(payload));
    if(pathname==='/api/knowledge')return json(res,200,searchKnowledge(payload));
    if(pathname==='/api/profiles'){
      switch(payload.action){
        case 'list':return json(res,200,await profileStore.list());
        case 'get':return json(res,200,await profileStore.get(payload.id));
        case 'save':return json(res,200,await profileStore.save(payload));
        case 'delete':return json(res,200,await profileStore.delete(payload.id,payload.confirm));
        default:throw Error('档案操作只支持 list/get/save/delete');
      }
    }
    if(pathname==='/api/daily-sign'){
      if(payload.action==='status')return json(res,200,await dailySignService.status());
      if(payload.action==='catalog')return json(res,200,listSigns({query:payload.query||'',limit:payload.limit||100}));
      if(payload.action==='history')return json(res,200,await dailySignService.history(payload));
      if(payload.action==='read')return json(res,200,await dailySignService.readRecord(payload));
      return json(res,200,await dailySignService.perform(payload));
    }
    if(pathname==='/api/sign-followup'){
      const record=await dailySignService.readRecord(payload);
      const answer=await followUp({sign:record.data.result.sign,topic:payload.topic||record.data.input.topic,question:payload.question,allowExternal:payload.allowExternal===true});
      return json(res,200,answer);
    }
    if(pathname==='/api/report'){
      if(!payload.data||payload.data.application!=='Fortune Master'||!['1.2.0','1.3.0','1.4.0'].includes(payload.data.schemaVersion))return json(res,400,{error:'报告需提供已生成的有效计算结果'});
      return plain(res,200,renderHTML(payload.data),'text/html; charset=utf-8');
    }
    return json(res,200,await calculate(payload));
  }catch(error){return json(res,400,{error:error instanceof SyntaxError?'请求 JSON 格式不正确':error?.message||'未知错误'});}
});}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  const server=createFortuneServer();
  server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口 ${port} 被占用，可尝试 FORTUNE_PORT=8770 npm start`:e.message);process.exitCode=1;});
  server.listen(port,host,()=>console.log(`Fortune Master V1.5.0 已启动 http://${host}:${port}。\n每日一签签簿和用户主动保存的命盘档案仅位于本机 data/，不会自动持久化出生信息或向远程模型发送。`));
}
