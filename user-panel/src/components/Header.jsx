import React, { useState, useEffect } from 'react';
import { navigate, goHome } from '../router.js';

const MENU = [
    {
        label: 'Home',
        icon: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
        go: () => navigate('/')
    },
    {
        label: 'My Tickets',
        icon: <><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" /><path d="M13 5v3M13 16v3" /></>,
        go: () => navigate('/tickets')
    },
    {
        label: 'Deposit Problem',
        icon: <><rect x="2" y="6" width="20" height="13" rx="3" /><path d="M2 10h20M6 15h4" /></>,
        go: () => navigate('/contact?type=deposit')
    },
    {
        label: 'Withdrawal Problem',
        icon: <><path d="M12 15V3m0 0-4 4m4-4 4 4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>,
        go: () => navigate('/contact?type=withdraw')
    },
    {
        label: 'Email Verification',
        icon: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></>,
        go: () => navigate('/contact?type=email')
    },
    {
        label: 'FAQ',
        icon: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.8.3-.9 1-.9 1.7m0 3h.01" /></>,
        go: () => goHome('faq')
    },
    {
        label: 'Other Query',
        icon: <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l2-4.9a8.4 8.4 0 1 1 16-4.6z" />,
        go: () => navigate('/contact?type=other')
    }
];

export default function Header() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        function onKey(e) { if (e.key === 'Escape') setOpen(false); }
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <>
            <header className="topbar">
                <div className="topbar-inner">
                    <button className="menu-btn" aria-label="Menu" onClick={() => setOpen(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
                    </button>
                    <a href="#/" className="logo-link" onClick={() => setOpen(false)}>
                        <img src="assets/logo.jpg" alt="IRFAN BOY" className="logo-img" />
                    </a>
                </div>
            </header>

            <div className={'menu-overlay' + (open ? ' show' : '')} onClick={() => setOpen(false)}></div>
            <nav className={'menu-drawer' + (open ? ' open' : '')}>
                <div className="drawer-head">
                    <img src="assets/logo.jpg" alt="IRFAN BOY" className="drawer-logo" />
                    <button className="drawer-close" aria-label="Close" onClick={() => setOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                {MENU.map((item) => (
                    <a
                        key={item.label}
                        href="#/"
                        onClick={(e) => { e.preventDefault(); setOpen(false); setTimeout(item.go, 180); }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                        {item.label}
                    </a>
                ))}
            </nav>
        </>
    );
}
