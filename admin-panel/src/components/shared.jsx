import React, { useState, useEffect, useRef } from 'react';
import { Store, Icon } from '../store.js';

export const TYPES = {
    deposit: { label: 'Deposit', color: '#047857', bg: '#d1fae5' },
    withdraw: { label: 'Withdrawal', color: '#b45309', bg: '#fef3c7' },
    email: { label: 'Email Verify', color: '#6d28d9', bg: '#ede9fe' },
    other: { label: 'Other Problem', color: '#0369a1', bg: '#e0f2fe' },
    upi: { label: 'UPI Payment', color: '#6d28d9', bg: '#ede9fe' },
    redeem: { label: 'Redeem Code', color: '#b45309', bg: '#fef3c7' },
    login: { label: 'Login Problem', color: '#b91c1c', bg: '#fee2e2' }
};

export const USER_ICON = 'assets/user-default.png';

export function Ico({ name }) {
    return <span style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: Icon[name] || '' }} />;
}

export function TypeBadge({ type }) {
    const t = TYPES[type] || { label: 'Other', color: '#0369a1', bg: '#e0f2fe' };
    return <span className="ticket-type" style={{ background: t.bg, color: t.color }}>{t.label}</span>;
}

export function StatusBadge({ status }) {
    const resolved = status === 'resolved';
    return (
        <span
            className="ticket-status"
            style={{
                background: resolved ? '#d1fae5' : '#fef3c7',
                color: resolved ? '#047857' : '#b45309'
            }}
        >
            {resolved ? 'Resolved' : 'Pending'}
        </span>
    );
}

export function uniqueUsers(all) {
    const map = {};
    all.forEach((t) => { map[t.mobile || t.email || t.name] = true; });
    return Object.keys(map).length;
}

export function StatsGrid({ tickets }) {
    const pending = tickets.filter((t) => t.status === 'pending').length;
    const resolved = tickets.filter((t) => t.status === 'resolved').length;
    function card(label, icon, tone, value) {
        return (
            <div className="stat">
                <div className="stat-top">
                    <span className="stat-label">{label}</span>
                    <div className={'stat-ico ' + tone} dangerouslySetInnerHTML={{ __html: icon }} />
                </div>
                <span className="stat-value">{value}</span>
            </div>
        );
    }
    return (
        <div className="stat-grid">
            {card('Total Tickets', Icon.tickets, 'blue', tickets.length)}
            {card('Pending', Icon.clock, 'orange', pending)}
            {card('Resolved', Icon.check, 'green', resolved)}
            {card('Unique Users', Icon.users, 'purple', uniqueUsers(tickets))}
        </div>
    );
}

export function Toolbar({ search, onSearch, onRefresh, onClearAll }) {
    const [syncing, setSyncing] = useState(false);
    function refresh() {
        setSyncing(true);
        Store.sync().finally(() => setSyncing(false));
    }
    function clearAll() {
        if (Store.getTickets().length === 0) return;
        if (window.confirm('All tickets will be deleted (local + cloud). Confirm?')) {
            Store.clearTickets();
        }
    }
    return (
        <div className="admin-toolbar">
            <div className="admin-search">
                <Ico name="search" />
                <input
                    type="text"
                    placeholder="Search name, mobile, email, password..."
                    autoComplete="off"
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                />
            </div>
            <button className="a-btn a-btn-sm" type="button" onClick={refresh} disabled={syncing}>
                {syncing ? 'Syncing...' : 'Refresh'}
            </button>
            <button className="a-btn a-btn-danger a-btn-sm" type="button" onClick={clearAll}>Clear All</button>
        </div>
    );
}

export function TicketCard({ t }) {
    return (
        <a className="tc-row" href={'#/ticket?id=' + encodeURIComponent(t.id)}>
            <img className="tc-avatar" src={USER_ICON} alt="" width="44" height="44" />
            <div className="tc-main">
                <div className="tc-top">
                    <TypeBadge type={t.type} />
                    <StatusBadge status={t.status} />
                </div>
                <div className="tc-name">{t.name || 'User'}</div>
                <div className="tc-meta">
                    {t.mobile ? <span>{t.mobile}</span> : null}
                    {t.amount ? <span>₹{t.amount}</span> : null}
                    {t.created_at ? <span>{t.created_at}</span> : null}
                </div>
            </div>
            <span className="tc-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </span>
        </a>
    );
}

export function TicketList({ list, emptyMsg }) {
    if (list.length === 0) return <div className="tc-empty">{emptyMsg}</div>;
    return (
        <div className="ticket-cards">
            {list.map((t) => <TicketCard key={t.id} t={t} />)}
        </div>
    );
}

export function CopyButton({ value }) {
    const [copied, setCopied] = useState(false);
    function copy() {
        const done = () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value).then(done).catch(done);
        } else {
            const ta = document.createElement('textarea');
            ta.value = value;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) { }
            document.body.removeChild(ta);
            done();
        }
    }
    return (
        <button
            type="button"
            className={'td-copy' + (copied ? ' copied' : '')}
            onClick={copy}
            aria-label="Copy value"
            title="Copy"
            dangerouslySetInnerHTML={{ __html: Icon.copy }}
        />
    );
}

export function ImageViewer({ src, onClose }) {
    const boxRef = useRef(null);

    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', onKey);
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        };
    }, [onClose]);

    function download() {
        if (!src) return;
        const a = document.createElement('a');
        a.href = src;
        a.download = 'ticket-attachment-' + Date.now() + (src.indexOf('image/png') > -1 || src.indexOf('.png') > -1 ? '.png' : '.jpg');
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    return (
        <div className="img-viewer show" onClick={(e) => { if (e.target === boxRef.current) onClose(); }} ref={boxRef}>
            <button className="img-viewer-close" onClick={onClose} aria-label="Close" dangerouslySetInnerHTML={{ __html: Icon.close }} />
            <div className="img-viewer-box">
                <img src={src} alt="Ticket attachment" />
                <div className="img-viewer-bar">
                    <button type="button" className="a-btn a-btn-primary" onClick={download}>
                        <Ico name="download" /> Download
                    </button>
                    <button type="button" className="a-btn" onClick={onClose}>
                        <Ico name="close" /> Close
                    </button>
                </div>
            </div>
        </div>
    );
}
