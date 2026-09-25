import React, { useState } from 'react';
import { Store } from '../store.js';
import { navigate } from '../router.js';
import { Ico, StatsGrid } from './shared.jsx';

const NAV = [
    { view: 'dashboard', href: '#/', label: 'Dashboard', icon: 'dashboard' },
    { view: 'tickets', href: '#/tickets', label: 'All Tickets', badge: true, icon: 'tickets' },
    { view: 'settings', href: '#/settings', label: 'Settings', icon: 'gear' }
];

export default function Layout({ view, meta, tickets, cloudOn, children }) {
    const [sideOpen, setSideOpen] = useState(false);

    const hasStats = meta.stats;
    const total = tickets.length;

    function logout() {
        Store.logout();
        navigate('/login');
    }

    return (
        <>
            <div className={'admin-backdrop' + (sideOpen ? ' show' : '')} onClick={() => setSideOpen(false)}></div>
            <div className="admin-shell">
                <aside className={'admin-side' + (sideOpen ? ' open' : '')}>
                    <div className="admin-brand">
                        <img src="assets/logo.jpg" alt="IRFAN BOY" className="admin-logo" />
                        <div className="admin-brand-txt"><h4>IRFAN BOY</h4><span>Admin Panel</span></div>
                    </div>
                    <nav className="admin-nav">
                        {NAV.map((n) => {
                            const active = (n.view === view) || (view === 'ticket' && n.view === 'tickets');
                            return (
                                <a key={n.view} href={n.href} className={active ? 'active' : ''} onClick={() => setSideOpen(false)}>
                                    <Ico name={n.icon} /> {n.label}
                                    {n.badge ? <span className="a-badge grey" style={{ marginLeft: 'auto' }}>{total}</span> : null}
                                </a>
                            );
                        })}
                    </nav>
                    <div className="admin-side-foot">
                        <a href="../user/index.html" style={{ textDecoration: 'none' }}><Ico name="eye" /> View Site</a>
                        <button type="button" onClick={logout}><Ico name="logout" /> Logout</button>
                    </div>
                </aside>

                <main className="admin-main">
                    <header className="admin-topbar">
                        <button className="admin-side-toggle" aria-label="Menu" onClick={() => setSideOpen(true)}>
                            <Ico name="menu" />
                        </button>
                        <div className="admin-top-title">
                            <h1>{view === 'ticket' ? meta.title : meta.title}</h1>
                            <p>{meta.sub}</p>
                        </div>
                        <span className={'a-badge ' + (cloudOn ? 'green' : 'grey')}>{cloudOn ? 'Cloud: ON' : 'Local Only'}</span>
                        <span className="a-badge">{total} Tickets</span>
                    </header>
                    <div className="admin-content">
                        {hasStats ? <StatsGrid tickets={tickets} /> : null}
                        {children}
                    </div>
                </main>
            </div>
        </>
    );
}
