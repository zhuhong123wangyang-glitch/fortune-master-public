import {randomInt} from 'node:crypto';
import {defaultSignbook,checkProfile,checkTimezone,localDay} from './store.mjs';
import {getSign,DEFAULT_SIGN_SYSTEM,SIGN_CATALOG_VERSION,listSigns,availableSignSystems} from './catalog.mjs';
import {formatSignResult,validateTopic,validateQuestion,topicOptions} from './reading.mjs';

export class DailySignService {
  constructor(store=defaultSignbook,rand=randomInt,clock=()=>new Date()){this.store=store;this.rand=rand;this.clock=clock;}
  async perform({action='peek',profileId='local-default',timezone='Asia/Shanghai',topic='general',question='',saveQuestion=false,recordId,systemId=DEFAULT_SIGN_SYSTEM}={}){
    checkProfile(profileId);checkTimezone(timezone);validateTopic(topic);question=validateQuestion(question);
    // Daily draws never persist (or interpret) hidden questions from a previous question-sign form.
    if(action==='draw'||action==='peek'){question='';saveQuestion=false;}
    if(systemId!==DEFAULT_SIGN_SYSTEM)throw new Error('只安装了原创四时百签，其他签系尚未审核上线');
    if(typeof saveQuestion!=='boolean')throw new Error('saveQuestion 必须为布尔值');
    const common={action,profileId,timezone,now:this.clock(),randomSign:()=>getSign(this.rand(1,101)),systemId,systemVersion:SIGN_CATALOG_VERSION,topic,question,saveQuestion,recordId};
    if(action==='history'){
      const records=await this.store.history(profileId);
      return {action,records,timezone,systems:availableSignSystems()};
    }
    if(action==='catalog')return {action,...listSigns({query:question,limit:100})};
    const record=await this.store.run(common);
    if(action==='clear'||action==='delete')return {action,...record};
    if(action==='peek'&&!record)return {action,date:localDay(common.now,timezone),record:null,systems:availableSignSystems()};
    // On repeated daily draw, return the saved topic and saved interpretation unchanged.
    // Explicit topic change is an alternate reading, NOT a new draw.
    const readTopic=action==='draw'&&record.kind==='daily'?topic:(record.topic||topic);
    const readQuestion=action==='question'?question:record.question||'';
    return {action,date:record.date,record:{id:record.id,kind:record.kind,date:record.date,timezone:record.timezone,favorite:record.favorite,drawnAt:record.drawnAt,systemId:record.systemId,signId:record.sign.id,title:record.sign.title,grade:record.sign.grade,topic:record.topic,storedQuestion:record.question||''},data:formatSignResult(record,{topic:readTopic,question:readQuestion})};
  }
  async history({profileId='local-default',kind='all',limit=100,offset=0,month,onlyFavorite=false}={}){
    const hist=await this.store.history(profileId,{kind,limit,offset,month});
    const items=hist.items.filter(x=>!onlyFavorite||x.favorite).map(r=>({id:r.id,kind:r.kind,date:r.date,timezone:r.timezone,drawnAt:r.drawnAt,signId:r.sign.id,title:r.sign.title,grade:r.sign.grade,theme:r.sign.theme,lines:r.sign.lines,favorite:r.favorite,topic:r.topic,storedQuestion:r.question||''}));
    return {total:hist.total,items,privacy:'本地文件持久化；问题仅在明确同意保存时写入。'};
  }
  async readRecord({profileId='local-default',recordId,topic,question=''}={}){
    checkProfile(profileId);validateQuestion(question);
    if(typeof recordId!=='string'||recordId.length>64)throw new Error('记录标识无效');
    const r=await this.store.find(profileId,recordId);
    if(!r)throw new Error('找不到该记录');
    return {action:'read',data:formatSignResult(r,{topic:topic||r.topic,question:question||r.question||''})};
  }
  async status(){return {systems:availableSignSystems(),topics:topicOptions(),modelEnabled:Boolean(process.env.FORTUNE_LLM_API_KEY&&process.env.FORTUNE_LLM_MODEL),reminderMode:'browser-open-only'};}
}
export const dailySignService=new DailySignService();
