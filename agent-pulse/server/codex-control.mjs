import { spawn } from 'node:child_process';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { codexHome, readLocal } from './codex.mjs';
let child=null, ready=null, nextId=1, pending=new Map();
function start(){if(ready)return ready;ready=new Promise((resolve,reject)=>{const bundled=path.join(codexHome,'packages','app-server-daemon','current','bin',process.platform==='win32'?'codex.exe':'codex');const binary=process.env.CODEX_BIN||bundled;child=spawn(binary,['app-server','proxy'],{windowsHide:true,stdio:['pipe','pipe','pipe']});const reader=createInterface({input:child.stdout});const initTimer=setTimeout(()=>{ready=null;reject(new Error('Codex app-server no respondió.'))},20000);child.stderr.resume();child.on('error',e=>{clearTimeout(initTimer);ready=null;reject(new Error('No se pudo iniciar Codex app-server: '+e.message))});child.on('exit',()=>{clearTimeout(initTimer);for(const p of pending.values())p.reject(new Error('Codex app-server se cerró.'));pending.clear();child=null;ready=null});reader.on('line',line=>{let msg;try{msg=JSON.parse(line)}catch{return}if(msg.id!=null&&pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(new Error(msg.error.message||'Falló Codex app-server.')):p.resolve(msg.result)} });request('initialize',{clientInfo:{name:'agent_pulse',title:'Pulse',version:'1.0.0'}}).then(()=>{clearTimeout(initTimer);child.stdin.write(JSON.stringify({method:'initialized',params:{}})+'\n');resolve()}).catch(e=>{clearTimeout(initTimer);ready=null;reject(e)})});return ready}
function request(method,params){if(!child)throw new Error('Codex app-server no está conectado.');const id=nextId++;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Codex tardó demasiado en responder.'))},25000);pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({id,method,params})+'\n',e=>{if(e){clearTimeout(timer);pending.delete(id);reject(e)}})})}
async function resume(threadId,cwd){await start();const state=await readSessionChat(threadId);if(state.externalActive)throw Object.assign(new Error('Esta sesión está trabajando en otra instancia de Codex. Enviá indicaciones o detenela desde esa instancia; Pulse no puede controlar ese turno.'),{status:409});return request('thread/resume',{threadId,cwd,initialTurnsPage:{limit:20,sortDirection:'desc',itemsView:'summary'}})}
function activeTurn(thread){return [...(thread?.turns||[])].reverse().find(t=>t.status==='inProgress')||null}
export async function promptSession(threadId,cwd,prompt){const result=await resume(threadId,cwd),turn=activeTurn(result.thread),input=[{type:'text',text:prompt}];if(turn){await request('turn/steer',{threadId,expectedTurnId:turn.id,input});return{ok:true,action:'steered',turnId:turn.id}}const started=await request('turn/start',{threadId,input});return{ok:true,action:'started',turnId:started?.turn?.id||null}}
export async function stopSession(threadId,cwd){const result=await resume(threadId,cwd),turn=activeTurn(result.thread);if(!turn)throw Object.assign(new Error('Esta sesión no tiene un turno activo.'),{status:409});await request('turn/interrupt',{threadId,turnId:turn.id});return{ok:true,turnId:turn.id}}
export function closeCodexControl(){if(child){child.kill();child=null;ready=null}}

export function chatMessages(thread) {
 const messages=[];
 for(const turn of thread?.turns||[]) for(const item of turn.items||[]) {
  const role=item.type==='userMessage'?'user':item.type==='agentMessage'?'assistant':null;
  if(!role)continue;
  const text=role==='assistant'?item.text:(item.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');
  if(text)messages.push({id:item.id||`${turn.id}-${messages.length}`,role,text});
 }
 return messages.slice(-100);
}
export async function readSessionChat(threadId) {
 await start();
 const {thread}=await request('thread/read',{threadId,includeTurns:true});
 const local=(await readLocal()).agents.find(a=>a.id===threadId);
 const externalActive=thread?.status?.type==='notLoaded'&&['running','waiting'].includes(local?.status);
 return {messages:chatMessages(thread),status:thread?.status?.type||'unknown',active:!!activeTurn(thread)||externalActive,externalActive};
}
