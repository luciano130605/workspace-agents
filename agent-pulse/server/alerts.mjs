// Texto legible para avisos: "faltan 1 h 59 min · se renueva hoy a las 18:42".
export function resetText(sec, now = Date.now()) {
 if (!sec) return 'Codex no informó el horario de renovación';
 const ms = sec * 1000 - now;
 if (ms <= 0) return 'Ya llegó la hora de renovación, esperando confirmación de Codex';
 const d = new Date(sec * 1000), today = new Date(now), tomorrow = new Date(now + 86400000);
 const clock = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
 const day = d.toDateString() === today.toDateString() ? 'hoy' : d.toDateString() === tomorrow.toDateString() ? 'mañana' : d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });
 const min = Math.max(1, Math.round(ms / 60000)), h = Math.floor(min / 60), days = Math.floor(h / 24);
 const left = days ? days + ' d ' + (h % 24) + ' h' : h ? h + ' h ' + (min % 60) + ' min' : min + ' min';
 return 'Faltan ' + left + ' · se renueva ' + day + ' a las ' + clock;
}
export function deriveAlerts(previous,current,now=Date.now()){
 const alerts=[];if(!previous)return alerts;
 for(const key of ['primary','secondary']){const old=previous.limits?.[key],next=current.limits?.[key];if(!next)continue;const label=key==='primary'?'Cupo principal':'Cupo semanal';
 const changed=!old||old.resetsAt!==next.resetsAt;
 if(next.usedPercent>=100){if(changed||old.usedPercent<100)alerts.push({id:'empty-'+key+'-'+next.resetsAt,title:'Te quedaste sin cupo',body:label+': 0% disponible. '+resetText(next.resetsAt,now)+'.',kind:'warning'})}
 else if(next.usedPercent>=90&&(changed||old.usedPercent<90))alerts.push({id:'low-'+key+'-'+next.resetsAt,title:'Tu cupo está por agotarse',body:label+': queda '+Math.max(0,100-next.usedPercent)+'%. '+resetText(next.resetsAt,now)+'.',kind:'warning'});
 if(old?.resetsAt&&old.resetsAt*1000<=now&&next.resetsAt>old.resetsAt&&next.usedPercent<old.usedPercent)alerts.push({id:'reset-'+key+'-'+old.resetsAt,title:'Tu cupo se renovó',body:label+' actualizado por Codex.',kind:'reset'});
 }
 for(const agent of current.agents){const old=previous.agents.find(a=>a.id===agent.id);if(old?.status==='running'&&['completed','interrupted'].includes(agent.status))alerts.push({id:agent.id+'-'+agent.status+'-'+agent.updatedAt,title:agent.status==='completed'?'Tarea terminada':'Tarea interrumpida',body:agent.name,kind:agent.status})}
 return alerts;
}
