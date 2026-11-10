import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,symlink,readlink,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {detectBranchRelations} from '../src/engines/bazi-relations.mjs';
import {castMeihua} from '../src/engines/meihua.mjs';
import {castLiuyao} from '../src/engines/liuyao.mjs';
import {calculateZiwei} from '../src/engines/ziwei.mjs';
import {renderHTML} from '../src/reports/html.mjs';
const BRANCHES='子丑寅卯辰巳午未申酉戌亥'.split('');
const stub={astro:{bySolar(){return {solarDate:'2005-10-1',lunarDate:'2005年八月廿八',soul:'破军',body:'天相',fiveElementsClass:'水二局',palaces:BRANCHES.map((b,i)=>({index:i,name:i===0?'命宫':`第${i+1}宫`,earthlyBranch:b,heavenlyStem:'乙',isBodyPalace:i===4,majorStars:[{name:i===0?'紫微':'天机',brightness:'庙',mutagen:i===0?'权':null}],minorStars:[],decadal:{range:[i*10,i*10+9]}}))};}}};

test('八字地支六冲与六合精确识别，避免反向重复计数',()=>{
 const rel=detectBranchRelations([{branch:'子'},{branch:'午'},{branch:'丑'},{branch:'子'}]);
 assert.equal(rel.pairs.filter(x=>x.type==='clash').length,1);
 assert.equal(rel.pairs.filter(x=>x.type==='combine').length,1);
 assert.deepEqual(rel.repetitions,[{branch:'子',count:2,positions:[0,3]}]);
 assert.deepEqual(rel.pairs.find(x=>x.type==='clash').positions,[0,3,1]);
 assert.match(rel.policy,/不计算/);
});
test('三合只识别三支齐全，不误判半合',()=>{
 const full=detectBranchRelations(['申','子','辰','戌'].map(branch=>({branch})));
 assert.equal(full.triples.length,1);
 assert.deepEqual(full.triples[0].branches,['申','子','辰']);
 const half=detectBranchRelations(['申','子','午','未'].map(branch=>({branch})));
 assert.equal(half.triples.length,0);
 assert.throws(()=>detectBranchRelations([{branch:'子'}]));
});
test('紫微 12 唯一地支时生成真实宫位对宫和三合关系',async()=>{
 const r=await calculateZiwei({date:'2005-10-01',time:'15:00',gender:'female'},stub);
 const p=r.result.palaces.find(x=>x.name==='命宫');
 assert.equal(p.earthlyBranch,'子');
 assert.equal(p.relations.opposite.earthlyBranch,'午');
 assert.deepEqual(p.relations.triads.map(x=>x.earthlyBranch),['辰','申']);
 assert.ok(r.interpretation.sections.some(s=>s.id==='ziwei-relationships'));
 const html=renderHTML(r);
 assert.match(html,/ziwei-board/);
 assert.match(html,/chart-center/);
 assert.match(html,/命宫 · 对宫与三合方位/);
 assert.match(html,/grid-row:1;grid-column:1/);
});
test('紫微宫位地支不唯一时不臆造三方关系、改为列表版',async()=>{
 const fake={astro:{bySolar(){return {palaces:Array.from({length:12},(_,i)=>({index:i,name:i===0?'命宫':`第${i+1}宫`,earthlyBranch:'辰',majorStars:[],minorStars:[]}))};}}};
 const r=await calculateZiwei({date:'2005-10-01',time:'15:00',gender:'female'},fake);
 assert.equal(r.result.palaces[0].relations,undefined);
 const html=renderHTML(r);
 assert.match(html,/ziwei-fallback/);
 assert.doesNotMatch(html,/class="ziwei-board"/);
});
test('梅花六层解读的路径可追溯，报告三卦可视化与金色动爻',()=>{
 const r=castMeihua({numbers:[3,5,2],question:'合作计划'});
 assert.equal(r.interpretation.sections.length,6);
 assert.equal(r.interpretation.version,'1.2.0');
 const s=r.interpretation.sections.find(s=>s.id==='meihua-path');
 assert.ok(s.observations.some(x=>x.includes('中间类象')));
 assert.ok(s.trace.some(t=>t.path==='result.mutual.name'&&t.value===r.result.mutual.name));
 const html=renderHTML(r);
 assert.match(html,/gua-grid three/);
 assert.match(html,/class="yao-row moving"/);
 assert.match(html,/本卦 → 互卦 → 变卦的三阶段对照/);
 assert.match(html,/result.mutual.name/);
});
test('六爻动爻解释可追溯；恶意问题内容始终 HTML 转义',()=>{
 const r=castLiuyao({lines:[9,8,8,7,7,6],question:'<script>alert(1)</script>'});
 assert.ok(r.interpretation.sections.find(s=>s.id==='liuyao-moving').trace.some(t=>t.path==='result.movingLines'));
 const html=renderHTML(r);
 assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
 assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(html.includes('动爻'));
});
test('更新安装脚本只替换 V1.1 软链接，不覆盖实体目录',async()=>{
 const home=await mkdtemp(join(tmpdir(),'fortune-v12-'));
 try{
  const skills=join(home,'.claude/skills');await mkdir(skills,{recursive:true});
  await symlink('/some/previous/fortune-master-v1.1',join(skills,'fortune-master'));
  const codex=join(home,'.codex/skills/fortune-master');await mkdir(codex,{recursive:true});
  const script=resolve('scripts/安装到Agent.command');
  const ret=spawnSync('bash',[script],{cwd:resolve('.'),env:{...process.env,HOME:home},input:'\n',encoding:'utf8',timeout:7000});
  assert.equal(ret.status,0,ret.stderr);
  assert.equal(await readlink(join(skills,'fortune-master')),resolve('.'));
  assert.ok(ret.stdout.includes('跳过（已有实体目录'));
 }finally{await rm(home,{recursive:true,force:true});}
});
