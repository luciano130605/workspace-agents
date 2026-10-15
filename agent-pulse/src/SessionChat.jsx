import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUp, Square, MessageSquare, ArrowDown } from 'lucide-react';
import './session-chat.css';

const drafts = new Map();
export default function SessionChat({ agent, api, offline, demoMode, onClose, onUpdate }) {
    const [text, setText] = useState(() => drafts.get(agent.id) || '');
    const [messages, setMessages] = useState([]), [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true), [error, setError] = useState('');
    const [actionError, setActionError] = useState(''), [busy, setBusy] = useState('');
    const [active, setActive] = useState(agent.status === 'running');
    const [externalActive, setExternalActive] = useState(false);
    const [atBottom, setAtBottom] = useState(true);
    const modal = useRef(null), list = useRef(null), input = useRef(null), lock = useRef(false);
    const alive = useRef(true), stick = useRef(true), fetching = useRef(false);
    const refreshRef = useRef(null);
    const url = 'sessions/' + encodeURIComponent(agent.id);

    useEffect(() => {
        alive.current = true;
        const previous = document.activeElement;
        const node = modal.current;
        node.showModal();
        const viewport = window.visualViewport;
        const resize = () => {
            node.style.setProperty('--chat-height', (viewport?.height || window.innerHeight) + 'px');
            node.style.setProperty('--chat-top', (viewport?.offsetTop || 0) + 'px');
        };
        resize(); viewport?.addEventListener('resize', resize); viewport?.addEventListener('scroll', resize);
        return () => {
            alive.current = false; node.close(); previous?.focus?.();
            viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize);
        };
    }, []);

    async function refresh() {
        if (fetching.current || offline || demoMode) { setLoading(false); return; }
        fetching.current = true;
        try {
            const result = await api(url + '/messages');
            if (!alive.current) return;
            setMessages(result.messages); setActive(result.active); setExternalActive(result.externalActive); setError('');
            setPending(items => items.filter(p => !result.messages.some(m => m.role === 'user' && m.text === p.text && !p.before.includes(m.id))));
        } catch (e) { if (alive.current) setError(e.message); }
        finally { fetching.current = false; if (alive.current) setLoading(false); }
    }
    refreshRef.current = refresh;
    useEffect(() => {
        void refreshRef.current();
        const timer = setInterval(() => { if (!document.hidden) void refreshRef.current(); }, 3000);
        return () => clearInterval(timer);
    }, [offline, demoMode]);
    useLayoutEffect(() => {
        if (stick.current && list.current) list.current.scrollTop = list.current.scrollHeight;
    }, [messages, pending, active]);
    useLayoutEffect(() => {
        if (input.current) { input.current.style.height = 'auto'; input.current.style.height = Math.min(input.current.scrollHeight, 160) + 'px'; }
    }, [text]);

    function changeText(value) { setText(value); drafts.set(agent.id, value); }
    async function send(e) {
        e.preventDefault();
        const prompt = text.trim();
        if (!prompt || lock.current || offline || demoMode || externalActive || loading) return;
        lock.current = true; setBusy('send'); setActionError('');
        const id = crypto.randomUUID();
        setPending(items => [...items, { id, role: 'user', text: prompt, state: 'Enviando…', before: messages.map(m => m.id) }]);
        changeText(''); stick.current = true; setAtBottom(true);
        try {
            await api(url + '/prompt', { prompt });
            if (!alive.current) return;
            setPending(items => items.map(p => p.id === id ? { ...p, state: 'Enviado · esperando respuesta' } : p));
            setActive(true); void refreshRef.current(); void onUpdate();
        } catch (e) {
            if (!alive.current) { drafts.set(agent.id, prompt); return; }
            setPending(items => items.map(p => p.id === id ? { ...p, state: 'Envío sin confirmar' } : p));
            setActionError(e.message + ' Revisá el historial antes de reenviar.');
            setText(current => { const next = current || prompt; drafts.set(agent.id, next); return next; });
        } finally { lock.current = false; if (alive.current) { setBusy(''); input.current?.focus(); } }
    }
    async function stop() {
        if (lock.current || offline || demoMode) return;
        lock.current = true; setBusy('stop'); setActionError('');
        try { await api(url + '/stop', {}); if (alive.current) { setActive(false); void refreshRef.current(); void onUpdate(); } }
        catch (e) { if (alive.current) setActionError(e.message); }
        finally { lock.current = false; if (alive.current) setBusy(''); }
    }
    const disabled = offline || demoMode || externalActive || loading;
    return <dialog ref={modal} className="session-chat" aria-labelledby="chat-title" onCancel={e => { e.preventDefault(); onClose(); }}>
        <header className="chat-header">
            <button className="chat-icon" aria-label="Volver a las sesiones" onClick={onClose}><ArrowLeft size={22} /></button>
            <div><span>{agent.project}</span><h2 id="chat-title">{agent.name}</h2><small>{active ? 'Codex está trabajando' : 'Conversación con Codex'}</small></div>
            {active && <button className="chat-stop" disabled={disabled || !!busy} onClick={stop}><Square size={14} />{busy === 'stop' ? 'Deteniendo…' : 'Detener'}</button>}
        </header>
        {(offline || demoMode) && <div className="chat-notice" role="status">{demoMode ? 'Modo demo: el envío está deshabilitado.' : 'Sin conexión. Tu borrador se conserva.'}</div>}
        {externalActive && <div className="chat-notice" role="status">En curso en otra instancia de Codex. Podés leer el chat acá; para enviar indicaciones o detener este turno, usá la instancia donde está trabajando.</div>}
        {error && <div className="chat-notice" role="alert">{error}<button onClick={refresh} disabled={offline}>Reintentar</button></div>}
        <div className="chat-messages" ref={list} role="log" aria-label="Mensajes de la sesión" aria-live="polite" aria-relevant="additions text" onScroll={e => {
            const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 70; setAtBottom(stick.current);
        }}>
            {loading && <div className="chat-skeleton" aria-label="Cargando conversación"><i /><i /><i /></div>}
            {!loading && !messages.length && !pending.length && <div className="chat-empty"><MessageSquare size={32} /><h3>Seguí la conversación</h3><p>Pedile el siguiente paso a Codex. Sus respuestas aparecerán acá.</p></div>}
            {messages.length > 0 && <p className="chat-history-note">Últimos mensajes de esta sesión</p>}
            {[...messages, ...pending].map(m => <article key={m.id} className={'chat-message ' + m.role}><span>{m.role === 'user' ? 'Vos' : 'Codex'}</span><div>{m.text}</div>{m.state && <small>{m.state}</small>}</article>)}
            {active && <p className="chat-working" role="status"><i />Codex está trabajando…</p>}
        </div>
        {!atBottom && <button className="chat-latest" onClick={() => { stick.current = true; setAtBottom(true); list.current.scrollTop = list.current.scrollHeight; }}><ArrowDown size={16} />Ir al último mensaje</button>}
        <form className="chat-composer" onSubmit={send}>
            {actionError && <p role="alert" className="chat-action-error">{actionError}</p>}
            <div className="chat-input-wrap"><textarea ref={input} aria-label="Mensaje para Codex" placeholder="Escribile a Codex…" rows={1} maxLength={8000} value={text} onChange={e => changeText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form.requestSubmit(); } }} /><button className="chat-send" type="submit" disabled={disabled || !!busy || !text.trim()} aria-label={busy === 'send' ? 'Enviando mensaje' : 'Enviar mensaje'}><ArrowUp size={22} /></button></div>
            <div className="chat-composer-hint"><span>{busy === 'send' ? 'Enviando…' : 'Enter para enviar · Shift+Enter para nueva línea'}</span><span>{text.length}/8000</span></div>
        </form>
    </dialog>;
}
