import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronUp, Sparkles, Terminal } from 'lucide-react';
import './account-selector.css';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChatGptIcon, CheckIcon, ClaudeIcon } from '@hugeicons/core-free-icons';

const providers = [
    { id: 'codex', name: 'Codex', subtitle: 'Tu conexión local', Icon: ChatGptIcon },
    { id: 'claude', name: 'Claude Code', subtitle: 'Explorá una nueva apariencia', Icon: ClaudeIcon },
];

export default function AccountSelector({ provider, onChange, connection, plan, compact = false }) {
    const [open, setOpen] = useState(false);
    const root = useRef(null), trigger = useRef(null);
    const panelId = useId();
    const current = providers.find(item => item.id === provider) || providers[0];
    const isPreview = current.id === 'claude';
    const status = isPreview ? 'Vista previa' : connection === 'connected' ? 'Conectado localmente' : connection === 'demo' ? 'Demostración' : 'Sin conexión';
    useEffect(() => {
        if (!open) return;
        const outside = event => { if (!root.current?.contains(event.target)) setOpen(false) };
        const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('focusin', outside);
        document.addEventListener('keydown', escape);
        return () => {
            document.removeEventListener('pointerdown', outside);
            document.removeEventListener('focusin', outside);
            document.removeEventListener('keydown', escape);
        };
    }, [open]);
    return <div className={'account-selector' + (compact ? ' account-selector-mobile' : '')} ref={root}>
        <button ref={trigger} type="button" className="account-trigger" aria-expanded={open} aria-controls={panelId} aria-label={'Mi cuenta: ' + current.name + ', ' + status} title={'Mi cuenta · ' + current.name} onClick={() => setOpen(value => !value)}>
            <span className={'account-avatar ' + current.id}><HugeiconsIcon icon={current.Icon} size={20} aria-hidden="true" /></span>
            <span className="account-trigger-copy"><span>Mi cuenta</span><strong>{current.name}</strong></span>
            <ChevronUp className="account-chevron" size={16} aria-hidden="true" />
        </button>
        {open && <section className="account-popover" id={panelId} aria-label="Elegir proveedor">
            <header className="account-heading"><span>MI ESPACIO</span><h2>Tu cuenta, tu proveedor.</h2><p>Elegí cómo querés trabajar.</p></header>
            <div className="account-options" role="group" aria-label="Proveedor visual">
                {providers.map(({ id, name, subtitle, Icon }) => <button key={id} type="button" className={'account-option ' + id + (current.id === id ? ' selected' : '')} aria-pressed={current.id === id} onClick={() => { onChange(id); setOpen(false); trigger.current?.focus() }}>
                    <span className={'account-avatar ' + id}><HugeiconsIcon icon={Icon} size={21} aria-hidden="true" /></span>
                    <span className="account-option-copy"><strong>{name}{id === 'claude' && <span className="account-badge">PREVIEW</span>}</strong><small>{subtitle}</small></span>
                    <span className="account-check">{current.id === id && <HugeiconsIcon icon={CheckIcon} size={13} aria-hidden="true" />}</span>
                </button>)}
            </div>
            <footer className="account-footer"><span className={'account-status' + (!isPreview && connection === 'connected' ? ' connected' : '')}><i />{status}{!isPreview && plan ? ' · ' + plan : ''}</span><p>{isPreview ? 'Solo cambia el diseño. Tus datos siguen siendo de Codex.' : 'Tus credenciales permanecen en Codex.'}</p></footer>
        </section>}
    </div>;
}
