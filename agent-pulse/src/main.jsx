import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, CheckCheck } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './style.css';

import { HugeiconsIcon } from "@hugeicons/react";
import { AccessIcon, ArrowRight02Icon, ArrowUpRight01Icon, ArtboardToolIcon, CheckCheckFreeIcons, CheckFreeIcons, ChevronRightFreeIcons, ChevronRightIcon, DashboardSpeed02FreeIcons, Download01Icon, EnergyIcon, ListChecksIcon, LiveStreaming02Icon, MaterialAndTextureFreeIcons, MonitorSmartphoneFreeIcons, Moon, Moon02Icon, MoonEclipseFreeIcons, Notification01Icon, NotificationOff01FreeIcons, Pulse02Icon, RefreshDotIcon, Robot01Icon, SaturnIcon, SquareTerminalIcon, Sun01FreeIcons, TerminalIcon, Timer01FreeIcons, WifiOff01Icon, XIcon } from "@hugeicons/core-free-icons";

const labels = { running: 'Actividad reciente', completed: 'Finalizado', interrupted: 'Interrumpido', unknown: 'Sin confirmar' };
const number = n => n == null ? '—' : new Intl.NumberFormat('es', { notation: n > 99999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n);
const date = d => d ? new Date(d).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin datos';
function countdown(sec, now) { if (!sec) return 'Sin horario'; let s = Math.max(0, Math.ceil(sec - now / 1000)); if (!s) return 'Esperando confirmación'; const d = Math.floor(s / 86400); s %= 86400; return (d ? d + 'd ' : '') + [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':') }
function relative(value, now) { if (!value) return 'Sin datos'; const min = Math.max(0, Math.floor((now - Date.parse(value)) / 60000)); return min < 1 ? 'Ahora' : min < 60 ? 'Hace ' + min + ' min' : min < 1440 ? 'Hace ' + Math.floor(min / 60) + ' h' : 'Hace ' + Math.floor(min / 1440) + ' d' }
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } };
async function api(url, body) { const token = sessionStorage.getItem('pulse-token'); const response = await fetch('/api/' + url, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo conectar al monitor'); return data }
function demo() { const now = Date.now(); return { connection: 'demo', updatedAt: new Date(now).toISOString(), limits: { primary: { usedPercent: 64, windowMinutes: 300, resetsAt: Math.floor(now / 1000) + 7264 }, secondary: { usedPercent: 38, windowMinutes: 10080, resetsAt: Math.floor(now / 1000) + 213264 }, observedAt: new Date(now).toISOString(), source: 'Demostración', plan: 'demo' }, agents: [['Rediseñar el dashboard', 'web-platform', 'running', 84200], ['Revisar autenticación', 'api-service', 'running', 45600], ['Optimizar consultas SQL', 'data-engine', 'completed', 32000], ['Escribir pruebas de integración', 'api-service', 'interrupted', 18400], ['Documentar endpoints', 'docs', 'completed', 12600]].map(([name, project, status, tokens], i) => ({ id: 'demo-' + i, name, project, status, tokens, model: 'Codex · demo', updatedAt: new Date(now - i * 140000).toISOString(), contextUsed: tokens / 2, contextMax: 200000, estimated: true })), alerts: [] } }
function Status({ status }) { return <span className={'status ' + status}><i />{labels[status] || status}</span> }
function Meter({ value, label }) { return <div className="meter" role="progressbar" aria-label={label} aria-valuenow={Math.round(value || 0)} aria-valuemin="0" aria-valuemax="100"><span style={{ transform: 'scaleX(' + Math.min(1, Math.max(0, (value || 0) / 100)) + ')' }} /></div> }

function useMedia(query) {
    const [matches, setMatches] = useState(() => matchMedia(query).matches);
    useEffect(() => { const mq = matchMedia(query); const fn = () => setMatches(mq.matches); fn(); mq.addEventListener('change', fn); return () => mq.removeEventListener('change', fn) }, [query]);
    return matches;
}

const mk = children => ({ size = 24, ...p }) => (
    <svg className="ci" viewBox="0 0 24 24" width={size} height={size} fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true" {...p}>{children}</svg>
);

const HomeIcon = mk(<>
    <g className="home">
        <path className="f" d="M3 11.9896V14.5C3 17.7998 3 19.4497 4.02513 20.4749C5.05025 21.5 6.70017 21.5 10 21.5H14C17.2998 21.5 18.9497 21.5 19.9749 20.4749C21 19.4497 21 17.7998 21 14.5V11.9896C21 10.3083 21 9.46773 20.6441 8.74005C20.2882 8.01237 19.6247 7.49628 18.2976 6.46411L16.2976 4.90855C14.2331 3.30285 13.2009 2.5 12 2.5C10.7991 2.5 9.76689 3.30285 7.70242 4.90855L5.70241 6.46411C4.37533 7.49628 3.71179 8.01237 3.3559 8.74005C3 9.46773 3 10.3083 3 11.9896Z" />
        <path className="d-off" d="M16 17H8" />
        <path className="smile" pathLength="1" d="M8 16C9.5 19 14.5 19 16 16" />
    </g>
</>);

const AgentsIcon = mk(<>
    <path d="M20 22C20 17.5817 16.4183 14 12 14C7.58172 14 4 17.5817 4 22" />
    <g className="bot-head">
        <path d="M12 4V2" />
        <path className="bot-eye" d="M9.375 8.25H9.25M9.5 8.25C9.5 8.38807 9.38807 8.5 9.25 8.5C9.11193 8.5 9 8.38807 9 8.25C9 8.11193 9.11193 8 9.25 8C9.38807 8 9.5 8.11193 9.5 8.25Z" />
        <path className="bot-eye" d="M14.875 8.25H14.75M15 8.25C15 8.38807 14.8881 8.5 14.75 8.5C14.6119 8.5 14.5 8.38807 14.5 8.25C14.5 8.11193 14.6119 8 14.75 8C14.8881 8 15 8.11193 15 8.25Z" />
        <path d="M15.1538 4H8.84615C7.59095 4 6.96334 4 6.47397 4.22025C5.91693 4.47095 5.47095 4.91693 5.22025 5.47397C5 5.96334 5 6.59095 5 7.84615C5 9.85448 5 10.8586 5.3524 11.6417C5.75353 12.5329 6.46709 13.2465 7.35835 13.6476C8.14135 14 9.14552 14 11.1538 14H12.8462C14.8545 14 15.8586 14 16.6417 13.6476C17.5329 13.2465 18.2465 12.5329 18.6476 11.6417C19 10.8586 19 9.85448 19 7.84615C19 6.59095 19 5.96334 18.7797 5.47397C18.529 4.91693 18.0831 4.47095 17.526 4.22025C17.0367 4 16.4091 4 15.1538 4Z" />
    </g>
</>);

const UsageIcon = ({ size = 24, value, ...p }) => {
    const hasValue = value != null;
    const animated = useAnimatedValue(hasValue ? value : 0, 0);
    const pct = Math.min(100, Math.max(0, Number(animated) || 0));
    const deg = -80 + (pct / 100) * 160;

    return (
        <svg className="ci" viewBox="0 0 24 24" width={size} height={size} fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" {...p}>
            <circle cx="12" cy="18" r="3" />
            <path
                className="needle"
                d="M12 15V10"
                style={hasValue ? {
                    transform: `rotate(${deg}deg)`,
                    transformOrigin: '12px 18px',
                    transformBox: 'view-box',
                    transition: 'transform .6s cubic-bezier(.4, 0, .2, 1)',
                } : undefined}
            />
            <path d="M22 13C22 7.47715 17.5228 3 12 3C6.47715 3 2 7.47715 2 13" />
        </svg>
    );
};

const AlertsIcon = mk(<>
    <g className="bell">
        <path d="M19.2311 18H4.76887C3.79195 18 3 17.208 3 16.2311C3 15.762 3.18636 15.3121 3.51809 14.9803L4.12132 14.3771C4.68393 13.8145 5 13.0514 5 12.2558V9.5C5 5.63401 8.13401 2.5 12 2.5C15.866 2.5 19 5.634 19 9.5V12.2558C19 13.0514 19.3161 13.8145 19.8787 14.3771L20.4819 14.9803C20.8136 15.3121 21 15.762 21 16.2311C21 17.208 20.208 18 19.2311 18Z" />
        <path className="clapper" d="M15.5 18C15.5 19.933 13.933 21.5 12 21.5C10.067 21.5 8.5 19.933 8.5 18" />
    </g>
</>);

const SettingsIcon = mk(<>
    <path className="f" d="M17.5 14H6.5C4.567 14 3 15.567 3 17.5C3 19.433 4.567 21 6.5 21H17.5C19.433 21 21 19.433 21 17.5C21 15.567 19.433 14 17.5 14Z" />
    <path className="f" d="M6.5 3H17.5C19.433 3 21 4.567 21 6.5C21 8.433 19.433 10 17.5 10H6.5C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3Z" />
    <path className="knob knob-b" d="M21 17.5C21 19.433 19.433 21 17.5 21C15.567 21 14 19.433 14 17.5C14 15.567 15.567 14 17.5 14C19.433 14 21 15.567 21 17.5Z" />
    <path className="knob knob-a" d="M3 6.5C3 8.433 4.567 10 6.5 10C8.433 10 10 8.433 10 6.5C10 4.567 8.433 3 6.5 3C4.567 3 3 4.567 3 6.5Z" />
</>);

/* ── Apariencia: tarjetas Claro / Oscuro / Sistema (PC en desktop, celular en mobile) ── */
const themes = [['light', 'Claro', Sun01FreeIcons], ['dark', 'Oscuro', Moon02Icon], ['system', 'Sistema', MonitorSmartphoneFreeIcons]];
const MiniDesktop = ({ mode }) => <div className={'tp ' + mode}><i className="tp-side" /><div className="tp-main"><b className="tp-line" style={{ width: '45%' }} /><b className="tp-line s" style={{ width: '70%' }} /><div className="tp-hero" /><div className="tp-stats"><u /><u /><u /></div><div className="tp-rows"><u /><u /></div></div></div>;
const MiniPhone = ({ mode }) => <div className={'tp ph ' + mode}><div className="tp-main"><b className="tp-line" style={{ width: '55%' }} /><b className="tp-line s" style={{ width: '80%' }} /><div className="tp-hero" /><div className="tp-stats"><u /><u /></div><div className="tp-rows"><u /><u /></div></div><div className="tp-nav"><u /><u /><u /><u /><u /></div></div>;
function ThemePreview({ mode, phone }) {
    const Mini = phone ? MiniPhone : MiniDesktop, device = phone ? 'phone' : 'desktop';
    return <div className={'tp-wrap ' + device + ' ' + mode} aria-hidden="true">
        <div className="tp-device"><div className="tp-screen">
            {mode === 'system' ? <><Mini mode="dark" /><div className="tp-clip"><Mini mode="light" /></div></> : <Mini mode={mode} />}
        </div></div>
        {!phone && <><i className="tp-neck" /><i className="tp-base" /></>}
    </div>
}

/* ── Agentes: robotitos animados ── */
const palette = [['#c0ed8a', '#203214'], ['#9eb4ef', '#16224a'], ['#e5ba7e', '#43290a'], ['#c5acdf', '#2d1a47'], ['#f08f8f', '#4a1616'], ['#7fd8d0', '#0c3430']];
const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function RobotAvatar({ agent }) {
    const h = hash(agent.id), [c, ink] = palette[h % palette.length], look = (h >> 3) % 3, st = agent.status;
    const eyes = st === 'completed'
        ? <><path d="M13.8 21c.8-2 3-2 3.8 0M22.4 21c.8-2 3-2 3.8 0" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" /><path d="M17 24.2c1.8 1.4 4.2 1.4 6 0" stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round" /></>
        : st === 'interrupted'
            ? <path d="M14.5 18.5l3 3m0-3l-3 3M22.5 18.5l3 3m0-3l-3 3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
            : <g className="rb-look"><ellipse className="rb-eye" cx="16" cy="20" rx="2.2" ry="2.6" fill={c} /><ellipse className="rb-eye" cx="24" cy="20" rx="2.2" ry="2.6" fill={c} /></g>;
    return <span className="agent-avatar" style={{ background: c + '1f', borderColor: c + '38' }}>
        <svg className={'robot ' + st} viewBox="0 0 40 40" aria-hidden="true" style={{ '--c': c, '--d': -(h % 7) * .6 + 's' }}>
            <g className="rb">
                <path d="M20 10V6" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
                {look === 1 && <><path d="M14 10.5L12 7M26 10.5L28 7" stroke={c} strokeWidth="1.6" strokeLinecap="round" /><circle className="rb-bulb" cx="11.6" cy="6.2" r="1.5" fill={c} /><circle className="rb-bulb" cx="28.4" cy="6.2" r="1.5" fill={c} /></>}
                {look !== 1 && <circle className="rb-bulb" cx="20" cy="5" r="2.2" fill={c} />}
                <rect x="4" y="16" width="3.5" height="9" rx="1.7" fill={c} opacity=".75" />
                <rect x="32.5" y="16" width="3.5" height="9" rx="1.7" fill={c} opacity=".75" />
                <rect x="7" y="10" width="26" height="22" rx={[8, 4, 11][look]} fill={c} />
                <rect x="10" y="14" width="20" height="14" rx="5" fill={ink} />
                {eyes}
                <rect x="13" y="33.5" width="14" height="4" rx="2" fill={c} opacity=".6" />
            </g>
        </svg></span>
} const ClockIcon = ({ size = 24, value = 100, ...p }) => {
    const animated = useAnimatedValue(value, 0);
    const pct = Math.min(100, Math.max(0, Number(animated) || 0));
    const arc = "M5 4.82C3.14864 6.63902 2 9.17385 2 11.9776C2 17.5129 6.47715 22.0001 12 22.0001C17.5228 22.0001 22 17.5129 22 11.9776C22 7.1242 18.5581 3.07656 13.9872 2.15288C13.1512 1.98394 12.7332 1.89947 12.3666 2.20022C12 2.50097 12 2.98714 12 3.95949V4.96175";

    return (
        <svg className="ci" viewBox="0 0 24 24" width={size} height={size} fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" {...p}>
            <path d="M11.0809 13.152L8 7L13.4196 11.2796C14.1901 11.888 14.1941 13.0472 13.4277 13.6607C12.6614 14.2743 11.5189 14.0266 11.0809 13.152Z" />
            {/* pista de fondo */}
            <path d={arc} opacity="0.2" />
            {/* arco que se va vaciando */}
            <path
                d={arc}
                pathLength="100"
                strokeDasharray={`${pct} 100`}
                strokeOpacity={pct <= 0 ? 0 : 1}
                style={{ transition: 'stroke-dasharray .6s cubic-bezier(.4, 0, .2, 1)' }}
            />
        </svg>
    );
};

function useAnimatedValue(target, initial = 0) {
    const [v, setV] = React.useState(initial);
    React.useEffect(() => {
        const id = requestAnimationFrame(() => setV(target));
        return () => cancelAnimationFrame(id);
    }, [target]);
    return v;
}

const tabs = [['overview', 'Inicio', HomeIcon], ['agents', 'Agentes', AgentsIcon], ['usage', 'Consumo', UsageIcon], ['alerts', 'Avisos', AlertsIcon], ['settings', 'Ajustes', SettingsIcon]];
function App() {
    const [route, setRoute] = useState(location.hash.slice(1) || 'overview'), [data, setData] = useState(() => read('pulse-cache', null)), [error, setError] = useState(''), [now, setNow] = useState(Date.now()), [offline, setOffline] = useState(!navigator.onLine), [demoMode, setDemoMode] = useState(false), [query, setQuery] = useState(() => sessionStorage.getItem('pulse-query') || ''), [filter, setFilter] = useState(() => sessionStorage.getItem('pulse-filter') || 'all'), [toast, setToast] = useState(''), [busy, setBusy] = useState(false), [theme, setTheme] = useState(() => read('pulse-theme', 'system')), [prefs, setPrefs] = useState(() => read('pulse-prefs', { reset: true, warning: true, completed: true, interrupted: true })), [pushEnabled, setPushEnabled] = useState(false), [installPrompt, setInstallPrompt] = useState(null), [tokenInput, setTokenInput] = useState(''), [seenAt, setSeenAt] = useState(() => read('pulse-seen', 0));
    const isPhone = useMedia('(max-width:800px)');
    const main = useRef(null), title = useRef(null), dialog = useRef(null), returnFocus = useRef(null), scrolls = useRef({}), pointer = useRef(0), demoData = useRef(null), isFetching = useRef(false);
    const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
    const [tab, detailId] = route.split('/'), currentTab = tabs.some(t => t[0] === tab) ? tab : 'overview'; const display = demoMode ? demoData.current : data; const agents = display?.agents || [], limits = display?.limits, alerts = display?.alerts || []; const active = agents.filter(a => a.status === 'running'), completed = agents.filter(a => a.status === 'completed'), selected = agents.find(a => a.id === detailId); const unread = alerts.filter(a => Date.parse(a.at) > seenAt).length;
    function notify(message) { setToast(message) }
    async function load() { if (isFetching.current) return; isFetching.current = true; try { const next = await api('snapshot'); setData(next); localStorage.setItem('pulse-cache', JSON.stringify(next)); setError('') } catch (e) { setError(e.message) } finally { isFetching.current = false } }
    useEffect(() => { void load(); const interval = setInterval(() => { if (!document.hidden) void load() }, 5000); const onVisible = () => { if (!document.hidden) { setNow(Date.now()); void load() } }; document.addEventListener('visibilitychange', onVisible); return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible) } }, []);
    useEffect(() => { const timer = setInterval(() => { if (!document.hidden) setNow(Date.now()) }, 1000); return () => clearInterval(timer) }, []);
    useEffect(() => { const fn = () => setRoute(location.hash.slice(1) || 'overview'); window.addEventListener('hashchange', fn); window.addEventListener('popstate', fn); return () => { window.removeEventListener('hashchange', fn); window.removeEventListener('popstate', fn) } }, []);
    useEffect(() => { const online = () => { setOffline(false); void load() }, off = () => setOffline(true); window.addEventListener('online', online); window.addEventListener('offline', off); return () => { window.removeEventListener('online', online); window.removeEventListener('offline', off) } }, []);
    useEffect(() => {
        const mq = matchMedia('(prefers-color-scheme: light)');
        const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? (mq.matches ? 'light' : 'dark') : theme };
        apply(); localStorage.setItem('pulse-theme', JSON.stringify(theme));
        if (theme === 'system') { mq.addEventListener('change', apply); return () => mq.removeEventListener('change', apply) }
    }, [theme]);
    useEffect(() => { sessionStorage.setItem('pulse-query', query); sessionStorage.setItem('pulse-filter', filter) }, [query, filter]);
    useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer) }, [toast]);
    useEffect(() => { const fn = e => { e.preventDefault(); setInstallPrompt(e) }; window.addEventListener('beforeinstallprompt', fn); return () => window.removeEventListener('beforeinstallprompt', fn) }, []);
    useEffect(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration().then(async reg => { if (reg) setPushEnabled(!!await reg.pushManager?.getSubscription()) }).catch(() => { }) }, []);
    useLayoutEffect(() => { if (main.current) main.current.scrollTop = scrolls.current[currentTab] || 0; if (!detailId) title.current?.focus({ preventScroll: true }) }, [currentTab]);
    useEffect(() => { if (!selected) return; returnFocus.current = document.activeElement; dialog.current?.showModal(); return () => { dialog.current?.close(); returnFocus.current?.focus?.() } }, [selected?.id]);
    function navigate(next) { if (main.current) scrolls.current[currentTab] = main.current.scrollTop; if (next === currentTab && !detailId) { main.current?.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); return } location.hash = next }
    function openAgent(agent) { const next = currentTab + '/' + agent.id; history.pushState({ pulseDetail: true }, '', '#' + next); setRoute(next) }
    function closeDetail() { if (history.state?.pulseDetail) history.back(); else { history.replaceState(null, '', '#' + currentTab); setRoute(currentTab) } }
    async function refresh() { setBusy(true); try { await api('refresh', {}); await load(); notify('Datos actualizados') } catch (e) { notify(e.message) } finally { setBusy(false) } }
    async function push(action) { setBusy(true); try { if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('Este navegador no admite push. En iPhone instalá la app desde Safari.'); if (!window.isSecureContext) throw new Error('Las notificaciones necesitan HTTPS o localhost.'); const reg = await navigator.serviceWorker.getRegistration(); if (!reg?.active) throw new Error('Ejecutá npm run build y npm start para activar la PWA y las notificaciones.'); let sub = await reg.pushManager.getSubscription(); if (action === 'disable') { if (sub) { await api('push/unsubscribe', { endpoint: sub.endpoint }); await sub.unsubscribe() } setPushEnabled(false); notify('Notificaciones desactivadas'); return } if (action === 'test') { if (!sub) throw new Error('Activá primero las notificaciones.'); await api('push/test', { endpoint: sub.endpoint }); notify('Aviso enviado al servicio push'); return } if (await Notification.requestPermission() !== 'granted') throw new Error('Permiso denegado. Podés cambiarlo desde los ajustes del navegador.'); if (!sub) { const { publicKey } = await api('push/key'); const raw = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')); sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, c => c.charCodeAt(0)) }) } await api('push/subscribe', { subscription: sub.toJSON(), preferences: prefs }); setPushEnabled(true); notify('Notificaciones activadas') } catch (e) { notify(e.message) } finally { setBusy(false) } }
    async function togglePreference(key) { const next = { ...prefs, [key]: !prefs[key] }; setPrefs(next); localStorage.setItem('pulse-prefs', JSON.stringify(next)); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(10); if (pushEnabled) try { const reg = await navigator.serviceWorker.getRegistration(); const sub = await reg?.pushManager.getSubscription(); if (sub) await api('push/subscribe', { subscription: sub.toJSON(), preferences: next }) } catch (e) { setPrefs(prefs); localStorage.setItem('pulse-prefs', JSON.stringify(prefs)); notify(e.message) } }
    function toggleDemo() { if (!demoMode) demoData.current = demo(); setDemoMode(!demoMode) }
    const filtered = agents.filter(a => (filter === 'all' || a.status === filter) && (a.name + ' ' + a.project).toLowerCase().includes(query.toLowerCase()));
    function agentList(list) { return list.length ? <div className="agent-list">{list.map(a => <button className="agent-row" key={a.id} onClick={() => openAgent(a)}><RobotAvatar agent={a} /><span className="agent-copy"><strong>{a.name}</strong><small>{a.project} <span>· {a.model}</span></small></span><span className="agent-state"><Status status={a.status} /><small>{relative(a.updatedAt, now)}</small></span><span className="agent-tokens">{number(a.tokens)}<small>tokens</small></span><HugeiconsIcon icon={ChevronRightFreeIcons} size={18} /></button>)}</div> : <div className="empty"><HugeiconsIcon icon={Robot01Icon} size={36} /><h3>No hay agentes en esta vista</h3><p>Probá otro filtro o iniciá una tarea en Codex.</p><button onClick={() => { setQuery(''); setFilter('all') }}>Mostrar todos</button></div> }
    function limitCard(w, label, secondary = false) {
        const available = w?.usedPercent != null ? Math.max(0, 100 - w.usedPercent) : 0;
        const totalMs = (w?.windowMinutes || 0) * 60000;
        const leftMs = w?.resetsAt ? new Date(w.resetsAt).getTime() - now : 0;
        const timeLeftPct = totalMs > 0 ? Math.min(100, Math.max(0, (leftMs / totalMs) * 100)) : 0;
        return (

            <article className={'card quota ' + (secondary ? 'secondary' : '')}><div className="card-label">    <span><UsageIcon size={16} value={available} />{label}</span><span className="subtle">{w?.windowMinutes ? w.windowMinutes >= 1440 ? Math.round(w.windowMinutes / 1440) + ' días' : Math.round(w.windowMinutes / 60) + ' horas' : 'Sin ventana'}</span></div><div className="quota-value">{w?.usedPercent != null ? Math.max(0, 100 - w.usedPercent) : '—'}<span>% disponible</span></div><Meter value={w ? 100 - w.usedPercent : 0} label={label + ' disponible'} />
                <div className="quota-bottom">
                    <span><ClockIcon size={14} value={timeLeftPct} /> Renovación</span>
                    <strong>{countdown(w?.resetsAt, now)}</strong>
                </div>
                <small className="quota-source">{limits?.source || 'Sin datos'} · {relative(limits?.observedAt, now)}</small></article>)
    }
    return <div className="app-shell"><aside className="sidebar"><a href="#overview" className="brand"><span className="brand-symbol"><HugeiconsIcon icon={Pulse02Icon} size={25} /></span>pulse</a><div className="workspace"><span className="workspace-icon">L</span><span>Mi espacio<small>Centro de agentes</small></span><HugeiconsIcon icon={ArtboardToolIcon} size={16} /></div><div className="nav-caption">WORKSPACE</div><nav aria-label="Navegación principal">{tabs.map(([id, label, Icon]) => <button key={id} className={currentTab === id ? 'nav-item selected' : 'nav-item'} onClick={() => navigate(id)} aria-current={currentTab === id ? 'page' : undefined}><Icon size={19} /><span>{label}</span>{id === 'agents' && <b>{agents.length}</b>}{id === 'alerts' && unread > 0 && <b>{unread}</b>}</button>)}</nav><div className="sidebar-bottom"><div className="local-box"><strong>Tu espacio</strong><p>Conexión local a Codex.<br />Vos tenés el control.</p></div><div className="profile"><span>L</span><div>Mi cuenta<small>Codex {limits?.plan || 'local'}</small></div><span className="tiny-dot" /></div></div></aside>
        <div className="content-shell"><header className="topbar"><span className="breadcrumb">Mi espacio <HugeiconsIcon icon={ChevronRightFreeIcons} size={14} /> <strong>{tabs.find(t => t[0] === currentTab)?.[1]}</strong></span><a className="mobile-brand" href="#overview"><HugeiconsIcon icon={Pulse02Icon} /> pulse</a><div className="top-actions"><span className={'connection ' + (display?.connection === 'connected' && !error && !offline ? 'good' : '')}><i />{demoMode ? 'Modo demo' : offline ? 'Sin conexión' : error ? 'Desconectado' : display?.connection === 'connected' ? 'Codex conectado' : 'Conectando'}</span><button className="icon-button" aria-label="Actualizar datos" disabled={busy || offline} onClick={refresh}><HugeiconsIcon icon={RefreshDotIcon} size={18} className={busy ? 'spin' : ''} /></button><button className="icon-button notification-button" aria-label="Ver notificaciones" onClick={() => navigate('alerts')}><HugeiconsIcon icon={Notification01Icon} size={19} />{unread > 0 && <i />}</button></div></header>
            <main ref={main} onScroll={() => { scrolls.current[currentTab] = main.current.scrollTop }}><div className="page" key={currentTab}>
                {(offline || error || display?.error) && <div className="notice" role="status"><HugeiconsIcon icon={WifiOff01Icon} size={18} /><span>{offline ? 'Sin conexión · mostrando lo último guardado' : error || display.error}</span><button onClick={refresh} disabled={busy || offline}>Reintentar</button></div>}{demoMode && <div className="notice demo">Datos de demostración · no representan tu cuenta.<button onClick={toggleDemo}>Volver a Codex</button></div>}
                <div className="page-heading"><div><div className="eyebrow">TU CENTRO DE CONTROL</div><h1 ref={title} tabIndex="-1">{({ overview: 'Todo bajo control.', agents: 'Tu equipo de agentes.', usage: 'Cada token cuenta.', alerts: 'Lo importante, a tiempo.', settings: 'A tu manera.' })[currentTab]}</h1><p>{({ overview: 'Tus agentes trabajan. Vos tenés la visión completa.', agents: 'Seguí la actividad de tus sesiones de Codex en un solo lugar.', usage: 'Cupos de tu cuenta y consumo de las sesiones, sin confusiones.', alerts: 'Enterate cuando tus agentes terminan o tu cupo se renueva.', settings: 'Conexión, apariencia y un lugar en tu pantalla de inicio.' })[currentTab]}</p></div><span className="today">{new Date(now).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}</span></div>
                {!display && <div className="skeleton-grid" aria-label="Cargando agentes"><div /><div /><div /></div>}
                {currentTab === 'overview' && <><section className="hero"><div className="hero-copy"><span className="pill"><HugeiconsIcon icon={LiveStreaming02Icon} size={14} /> {demoMode ? 'VISTA DE EJEMPLO' : 'PULSO DE TU WORKSPACE'}</span><h2>{active.length ? <>Tu equipo está<br /><em>en movimiento.</em></> : <>Todo listo para<br /><em>tu próxima idea.</em></>}</h2><p>{active.length ? active.length + ' sesiones con actividad reciente. Seguí su pulso desde acá.' : 'Abrí una tarea en Codex. Su actividad aparecerá automáticamente.'}</p><button className="primary" onClick={() => navigate('agents')}>Ver mis agentes <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} /></button></div><div className="orbital" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><div className="orbit-dot dot-one" /><div className="orbit-dot dot-two" /><div className="orbit-node node-one"><HugeiconsIcon icon={TerminalIcon} size={24} /></div><div className="orbit-node node-two"><HugeiconsIcon icon={EnergyIcon} size={22} /></div><div className="core"><HugeiconsIcon icon={Pulse02Icon} size={47} /></div><div className="orbit-caption"><i /> {active.length} AGENTES CON ACTIVIDAD</div></div></section>
                    <section className="stats"><article className="stat card"><span><HugeiconsIcon icon={Robot01Icon} size={18} /> Actividad reciente</span><strong>{active.length.toString().padStart(2, '0')}<small> / {agents.length} sesiones</small></strong><div><i className="tiny-dot" /> Inferida de eventos locales</div></article><article className="stat card"><span><HugeiconsIcon icon={ListChecksIcon} size={18} /> Tareas finalizadas</span><strong>{completed.length.toString().padStart(2, '0')}<small> sesiones</small></strong><div>En las últimas {agents.length} sesiones</div></article><article className="stat card"><span><HugeiconsIcon icon={DashboardSpeed02FreeIcons} size={18} /> Tokens procesados</span><strong>{number(agents.reduce((s, a) => s + (a.tokens || 0), 0))}</strong><div>Acumulado · incluye contexto reutilizado</div></article></section>
                    <div className="section-title"><h2>Tu energía disponible <span>CUPO CODEX</span></h2><button className="text-button" onClick={() => navigate('usage')}>Ver consumo <HugeiconsIcon icon={ArrowRight02Icon} size={16} /></button></div><div className="quota-grid">{limitCard(limits?.primary, 'Periódicos')}{limitCard(limits?.secondary, 'Semanal', true)}</div>
                    <div className="section-title"><h2>Agentes recientes <span>{agents.length}</span></h2><button className="text-button" onClick={() => navigate('agents')}>Ver todos <HugeiconsIcon icon={ArrowRight02Icon} size={16} /></button></div><section className="card list-card">{agentList(agents.slice(0, 4))}</section><div className="sync-note"> Solo lectura · {display?.updatedAt ? 'Actualizado ' + relative(display.updatedAt, now) : 'Esperando la primera sincronización'} · cada 5 s</div></>}
                {currentTab === 'agents' && <><div className="filter-bar"><label className="search"><input aria-label="Buscar agentes" placeholder="Buscar por tarea o proyecto…" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Filtrar por estado" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todos los estados</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><div className="section-title"><h2>Sesiones <span>{filtered.length}</span></h2><span className="subtle">Últimas 60 · solo lectura</span></div><section className="card list-card">{agentList(filtered)}</section><p className="helper">“Actividad reciente” se infiere de los eventos de Codex. Sin eventos durante 3 minutos, el estado pasa a “Sin confirmar”. No se inventan porcentajes de avance ni tiempos de finalización.</p></>}
                {currentTab === 'usage' && <><div className="quota-grid">{limitCard(limits?.primary, 'Ventana principal')}{limitCard(limits?.secondary, 'Ventana extendida', true)}</div><div className="notice"><span>El cupo es un porcentaje de uso del plan. No equivale a una cantidad fija de tokens. Los contadores de abajo son acumulados por sesión.</span></div><section className="card usage-chart"><div className="section-title"><h2>Consumo por sesión</h2><span className="subtle">Tokens procesados</span></div>{agents.slice(0, 7).map((a, i) => <button className="bar-row" key={a.id} onClick={() => openAgent(a)}><span>{a.name}</span><div className="bar-track"><i style={{ transform: 'scaleX(' + ((a.tokens || 0) / Math.max(1, ...agents.slice(0, 7).map(a => a.tokens || 0))) + ')' }} /></div><strong>{number(a.tokens)}</strong></button>)}{!agents.length && <p className="helper">El gráfico aparecerá cuando Codex registre sesiones.</p>}</section><section className="card explanation"><HugeiconsIcon icon={Timer01FreeIcons} /><div><h3>El próximo reinicio, sin adivinar.</h3><p>La cuenta regresiva usa el horario reportado por Codex. Al llegar a cero esperamos un dato nuevo para confirmar la renovación.</p><small>Fuente: {limits?.source || 'Sin datos'} · Observado: {date(limits?.observedAt)}</small>{display?.limitError && <p className="warning-text">{display.limitError}</p>}</div></section></>}
                {currentTab === 'alerts' && <><section className="card notification-hero"><div className="bell-art"><HugeiconsIcon icon={Notification01Icon} size={34} /></div><div><span className="eyebrow">MENOS PENDIENTES, MÁS FOCO</span><h2>Dejá que Pulse te avise.</h2><p>Renovaciones, cupo bajo y tareas finalizadas, directo a tu dispositivo.</p></div>
                <button className="primary" disabled={busy || offline || demoMode} onClick={() => push(pushEnabled ? 'disable' : 'enable')}>{pushEnabled ? 'Desactivar push' : 'Activar notificaciones'}<HugeiconsIcon icon={pushEnabled ? NotificationOff01FreeIcons : Notification01Icon} size={17} /></button>

                </section><section className="card settings-list">{[['reset', 'Renovación de cupo', 'Hora prevista y confirmación de renovación.'], ['warning', 'Cupo por agotarse', 'Aviso al alcanzar el 90% de uso.'], ['completed', 'Agente finalizado', 'Cuando una tarea activa termina.'], ['interrupted', 'Tarea interrumpida', 'Cuando Codex registra una interrupción.']].map(([key, label, desc]) => <div className="setting-row" key={key}><div><strong>{label}</strong><p>{desc}</p></div><button role="switch" aria-checked={prefs[key]} aria-label={label} className={'switch ' + (prefs[key] ? 'on' : '')} onClick={() => togglePreference(key)}><i /></button></div>)}</section><div className="alert-actions"><button disabled={!pushEnabled || busy || demoMode} onClick={() => push('test')}>Enviar aviso de prueba</button><button onClick={() => { setSeenAt(Date.now()); localStorage.setItem('pulse-seen', JSON.stringify(Date.now())); notify('Avisos marcados como leídos') }}>Marcar como leídos </button></div><div className="section-title"><h2>Historial de avisos <span>{alerts.length}</span></h2></div><section className="card">{alerts.length ? alerts.map(a => <article className="event" key={a.id}><span className="event-icon"><HugeiconsIcon icon={Notification01Icon} size={19} /></span><div><strong>{a.title}</strong><p>{a.body}</p><small>{date(a.at)}</small></div>{Date.parse(a.at) > seenAt && <i className="tiny-dot" />}</article>) : <div className="empty"><CheckCheck size={36} /><h3>Todo tranquilo por acá</h3><p>Los avisos aparecerán cuando el monitor detecte novedades.</p></div>}</section><p className="helper">El servidor de Pulse tiene que permanecer encendido para enviar avisos. En iPhone, instalá la PWA desde Safari y activá las notificaciones. Su entrega depende del navegador y del sistema operativo.</p></>}
                {currentTab === 'settings' && <><section className="card settings-list"><div className="setting-row"><span className="setting-icon"><HugeiconsIcon icon={TerminalIcon} /></span><div className="grow"><strong>Codex local</strong><p>Lectura de sesiones + consulta de cupo por App Server.</p><small>Actualización: 5 s · cupo remoto: 60 s</small></div><span className="status"><i />{display?.connection === 'connected' ? 'Conectado' : 'Sin conexión'}</span></div><div className="setting-row"><span className="setting-icon"><HugeiconsIcon icon={AccessIcon} /></span><div><strong>Tus credenciales se quedan en Codex</strong><p>Pulse no pide tu API key ni envía tus conversaciones al navegador.</p></div></div></section><section className="card settings-list"><div className="setting-row"><div><strong>Apariencia</strong><p>Elegí cómo querés ver tu espacio.</p></div></div><div className="theme-picker" role="radiogroup" aria-label="Apariencia">{themes.map(([id, label, Icon]) => <button key={id} role="radio" aria-checked={theme === id} className={'theme-card' + (theme === id ? ' on' : '')} onClick={() => setTheme(id)}><ThemePreview mode={id} phone={isPhone} /><span><HugeiconsIcon icon={Icon} size={16} />{label}</span></button>)}</div><div className="setting-row"><div><strong>Explorar con datos de ejemplo</strong><p>Vista de demostración, separada de tu cuenta.</p></div><button role="switch" aria-label="Modo demo" aria-checked={demoMode} className={'switch ' + (demoMode ? 'on' : '')} onClick={toggleDemo}><i /></button></div><div className="setting-row"><div><strong>Instalar Pulse</strong><p>{matchMedia('(display-mode: standalone)').matches ? 'Ya estás usando la app instalada.' : 'En iPhone: Compartir → Agregar a pantalla de inicio. En Chrome: menú → Instalar Pulse.'}</p></div>{installPrompt && <button onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null) }}><HugeiconsIcon icon={Download01Icon} size={18} /> Instalar</button>}</div></section><section className="card remote"><h3>Acceso a un servidor protegido</h3><p>Si configuraste MONITOR_TOKEN en el servidor, ingresá esa clave. Se conserva solo en esta pestaña.</p><form onSubmit={async e => { e.preventDefault(); sessionStorage.setItem('pulse-token', tokenInput); setTokenInput(''); await load(); notify('Clave guardada para esta pestaña') }}><input type="password" autoComplete="off" aria-label="Clave del monitor" placeholder="Clave del monitor" value={tokenInput} onChange={e => setTokenInput(e.target.value)} onFocus={e => e.target.scrollIntoView({ block: 'center' })} /><button className="primary" type="submit">Conectar <HugeiconsIcon icon={ArrowRight02Icon} size={17} /></button></form></section><p className="helper">Para abrir Pulse desde tu celular necesitás servirlo por HTTPS desde tu computadora, con acceso autenticado. El README incluye la configuración. No es necesario subir tus datos de Codex a un hosting.</p></>}
            </div></main><nav className="bottom-nav" aria-label="Navegación móvil">{tabs.map(([id, label, Icon]) => <button key={id} aria-current={currentTab === id ? 'page' : undefined} className={currentTab === id ? 'selected' : ''} onClick={() => navigate(id)}><span><Icon size={21} />{id === 'alerts' && unread > 0 && <i />}</span><small>{label}</small></button>)}</nav></div>
        {toast && <div className="toast" role="status"><HugeiconsIcon icon={CheckFreeIcons} size={18} />{toast}<button aria-label="Cerrar aviso" onClick={() => setToast('')}><HugeiconsIcon icon={XIcon} size={16} /></button></div>}{needRefresh && <div className="update-toast" role="status">Hay una versión nueva <button onClick={() => updateServiceWorker(true)}>Actualizar</button></div>}
        <dialog ref={dialog} className="sheet" onCancel={e => { e.preventDefault(); closeDetail() }} onClick={e => { if (e.target === dialog.current) closeDetail() }} aria-labelledby="detail-title"><div className="sheet-inner"><div className="sheet-handle" onPointerDown={e => { pointer.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId) }} onPointerUp={e => { if (e.clientY - pointer.current > 70) closeDetail() }} /><div className="sheet-top"><span className="eyebrow">DETALLE DEL AGENTE</span><button className="icon-button" aria-label="Cerrar detalle" onClick={closeDetail}><HugeiconsIcon icon={XIcon} /></button></div>{selected && <><RobotAvatar agent={selected} /><h2 id="detail-title">{selected.name}</h2><Status status={selected.status} /><dl><div><dt>Proyecto</dt><dd>{selected.project}</dd></div><div><dt>Modelo</dt><dd>{selected.model}</dd></div><div><dt>Último evento</dt><dd>{date(selected.updatedAt)}</dd></div><div><dt>Tiempo restante</dt><dd>Sin estimación disponible</dd></div><div><dt>Tokens procesados</dt><dd>{number(selected.tokens)}</dd></div><div><dt>Entrada / salida</dt><dd>{number(selected.inputTokens)} / {number(selected.outputTokens)}</dd></div><div><dt>Entrada en caché</dt><dd>{number(selected.cachedTokens)}</dd></div></dl><h3>Ventana de contexto</h3><Meter label="Uso aproximado de contexto" value={selected.contextMax ? selected.contextUsed / selected.contextMax * 100 : 0} /><p className="helper">Última llamada: {number(selected.contextUsed)} / {number(selected.contextMax)} tokens. Es una aproximación de contexto; no es el cupo de la cuenta.</p><button className="primary full" onClick={closeDetail}>Volver al panel </button></>}</div></dialog>
    </div>
}
createRoot(document.getElementById('root')).render(<App />);