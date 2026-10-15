import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
export const codexHome=process.env.CODEX_HOME||path.join(os.homedir(),'.codex');
const cache=new Map();
export function parseEvents(text,now=Date.now()){
 let tokens=null,limits=null,limitAt=null,lastAt=null,phase='unknown',startedAt=null;
 for(const line of text.split('\n')){let row;try{row=JSON.parse(line)}catch{continue}if(row.type!=='event_msg')continue;const p=row.payload||{};lastAt=row.timestamp||lastAt;
 if(phase==='unknown'&&['token_count','item_completed'].includes(p.type))phase='running';
 if(p.type==='task_started'){phase='running';startedAt=row.timestamp}
 if(['task_complete','task_completed'].includes(p.type))phase='completed';
 if(['turn_aborted','task_aborted'].includes(p.type))phase='interrupted';
 if(p.type==='token_count'){if(p.info)tokens=p.info;if(p.rate_limits){limits=p.rate_limits;limitAt=row.timestamp}}
 }
 if(phase==='running'&&now-Date.parse(lastAt)>180000)phase='unknown';
 return {tokens,limits,limitAt,lastAt,phase,startedAt};
}
async function tail(file){const stat=await fs.stat(file);const previous=cache.get(file);if(previous?.mtime===stat.mtimeMs)return parseEvents(previous.text);const f=await fs.open(file,'r');try{const size=Math.min(stat.size,2*1024*1024);const b=Buffer.alloc(size);await f.read(b,0,size,stat.size-size);let text=b.toString('utf8');if(stat.size>size)text=text.slice(text.indexOf('\n')+1);cache.set(file,{mtime:stat.mtimeMs,text});if(cache.size>100)cache.delete(cache.keys().next().value);return parseEvents(text)}finally{await f.close()}}
export function normalizeLimits(raw,at,source){if(!raw)return null;const map=w=>w?{usedPercent:w.usedPercent??w.used_percent,windowMinutes:w.windowDurationMins??w.window_minutes,resetsAt:w.resetsAt??w.resets_at}:null;return{primary:map(raw.primary),secondary:map(raw.secondary),plan:raw.planType??raw.plan_type??null,observedAt:at,source}}
export async function readLocal(){
 const names=(await fs.readdir(codexHome)).filter(x=>/^state_\d+\.sqlite$/.test(x)).sort((a,b)=>Number(b.match(/\d+/)[0])-Number(a.match(/\d+/)[0]));if(!names.length)throw new Error('No se encontró la base local de Codex. Abrí Codex en esta computadora o configurá CODEX_HOME.');
 const db=new DatabaseSync(path.join(codexHome,names[0]),{readOnly:true});let rows;try{rows=db.prepare('SELECT id,title,rollout_path,cwd,model,source,tokens_used,updated_at FROM threads WHERE archived=0 ORDER BY updated_at DESC LIMIT 60').all()}finally{db.close()}
 let limits=null;
 const agents=await Promise.all(rows.map(async row=>{let event={};try{const resolved=path.resolve(row.rollout_path);const relative=path.relative(path.resolve(codexHome),resolved);if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Ruta fuera de Codex');event=await tail(resolved)}catch{}
 if(event.limits&&(!limits||Date.parse(event.limitAt)>Date.parse(limits.observedAt)))limits=normalizeLimits(event.limits,event.limitAt,'Eventos locales');
 return{id:row.id,name:row.title||'Sesión sin título',project:path.basename(row.cwd.replaceAll('\\','/')),model:row.model||'Sin datos',status:event.phase||'unknown',updatedAt:event.lastAt||new Date(row.updated_at*1000).toISOString(),startedAt:event.startedAt||null,tokens:event.tokens?.total_token_usage?.total_tokens??row.tokens_used??null,inputTokens:event.tokens?.total_token_usage?.input_tokens??null,outputTokens:event.tokens?.total_token_usage?.output_tokens??null,cachedTokens:event.tokens?.total_token_usage?.cached_input_tokens??null,contextUsed:event.tokens?.last_token_usage?.total_tokens??null,contextMax:event.tokens?.model_context_window??null,source:'Codex local',origin:String(row.source??''),estimated:true};}));return{agents,limits};
}
export async function fetchLiveLimits(){
 const bundled=path.join(codexHome,'packages','app-server-daemon','current','bin',process.platform==='win32'?'codex.exe':'codex');
 const binary=process.env.CODEX_BIN||(await fs.access(bundled).then(()=>bundled).catch(()=> 'codex'));
 return new Promise((resolve,reject)=>{const child=spawn(binary,['app-server'],{stdio:['pipe','pipe','pipe'],windowsHide:true});const reader=createInterface({input:child.stdout});let finished=false;const finish=(err,data)=>{if(finished)return;finished=true;clearTimeout(timer);reader.close();child.kill();err?reject(err):resolve(data)};const timer=setTimeout(()=>finish(new Error('Codex no respondió a la consulta de cupo.')),18000);const send=o=>child.stdin.write(JSON.stringify(o)+'\n');child.on('error',()=>finish(new Error('No se pudo iniciar Codex app-server.')));child.on('exit',()=>finish(new Error('Codex cerró la consulta de cupo.')));child.stderr.resume();child.stdin.on('error',()=>{});
 reader.on('line',line=>{let m;try{m=JSON.parse(line)}catch{return}if(m.id===1){if(m.error)return finish(new Error('Codex no pudo inicializar la consulta.'));send({method:'initialized',params:{}});send({id:2,method:'account/rateLimits/read'})}if(m.id===2){if(m.error)return finish(new Error('El servicio de Codex no devolvió los límites; se muestran los últimos eventos locales.'));const raw=m.result?.rateLimitsByLimitId?.codex||m.result?.rateLimits;finish(null,normalizeLimits(raw,new Date().toISOString(),'Codex App Server'))}});
 send({id:1,method:'initialize',params:{clientInfo:{name:'agent_pulse',title:'Agent Pulse monitor',version:'1.0.0'}}});
 });
}