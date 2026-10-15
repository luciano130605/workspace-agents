import test from 'node:test';
import assert from 'node:assert/strict';
import { chatMessages } from '../server/codex-control.mjs';

test('chat exposes user and assistant text, excluding internal reasoning and tool output', () => {
 const messages=chatMessages({turns:[{id:'t1',items:[
  {id:'u1',type:'userMessage',content:[{type:'text',text:'Hola'},{type:'image',url:'private'},{type:'text',text:'Seguí'}]},
  {id:'r1',type:'reasoning',text:'internal'},
  {id:'c1',type:'commandExecution',text:'secret output'},
  {id:'a1',type:'agentMessage',text:'Listo'},
 ]},{id:'t2',items:[{id:'a2',type:'agentMessage',text:'Siguiente paso'}]}]});
 assert.deepEqual(messages,[{id:'u1',role:'user',text:'Hola\nSeguí'},{id:'a1',role:'assistant',text:'Listo'},{id:'a2',role:'assistant',text:'Siguiente paso'}]);
});
test('chat handles empty history and bounds the visible history', () => {
 assert.deepEqual(chatMessages(null),[]);
 const items=Array.from({length:110},(_,i)=>({id:String(i),type:'agentMessage',text:'Mensaje '+i}));
 const result=chatMessages({turns:[{id:'t',items}]});
 assert.equal(result.length,100); assert.equal(result[0].id,'10'); assert.equal(result.at(-1).id,'109');
});
