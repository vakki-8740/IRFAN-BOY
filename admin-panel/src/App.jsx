import React, { useState, useEffect } from 'react';
import { Store } from './store.js';
import { navigate } from './router.js';
import { useHashRoute, useTickets } from './hooks.js';
import Login from './components/Login.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TicketListPage from './pages/TicketListPage.jsx';
import TicketDetail from './pages/TicketDetail.jsx';
import Settings from './pages/Settings.jsx';
import { TYPES } from './components/shared.jsx';

const VIEW_META = {
    '/': { view: 'dashboard', title: 'Dashboard', sub: 'Everything for today in one place', stats: true },
    '/tickets': { view: 'tickets', title: 'All Tickets', sub: 'All tickets in one place', stats: true },
    '/pending': { view: 'pending', title: 'Pending Tickets', sub: 'Not resolved yet', stats: true },
    '/resolved': { view: 'resolved', title: 'Resolved Tickets', sub: 'Completed tickets', stats: true },
    '/settings': { view: 'settings', title: 'Settings', sub: 'Admin panel settings and cloud sync', stats: false },
    '/ticket': { view: 'ticket', title: 'Ticket Details', sub: 'User details, line by line', stats: false }
};

export default function App() {
    const route = useHashRoute();
    const tickets = useTickets();
    const [loggedIn, setLoggedIn] = useState(() => Store.isLoggedIn());
    const [cloudOn, setCloudOn] = useState(() => Store.isCloudReady());

    /* auth guard */
    useEffect(() => {
        if (!loggedIn && route.path !== '/login') navigate('/login');
        if (loggedIn && route.path === '/login') navigate('/');
    }, [loggedIn, route.path]);

    /* sync + realtime lifecycle */
    useEffect(() => {
        Store.startRealtime();
        let alive = true;
        function syncNow() {
            Store.sync().then(() => { if (alive) setCloudOn(Store.isCloudReady()); });
        }
        syncNow();
        const iv = setInterval(syncNow, 60000);
        function onVis() { if (!document.hidden) syncNow(); }
        document.addEventListener('visibilitychange', onVis);
        return () => {
            alive = false;
            clearInterval(iv);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, []);

    if (!loggedIn || route.path === '/login') {
        return <Login onSuccess={() => setLoggedIn(true)} />;
    }

    const meta = VIEW_META[route.path] || VIEW_META['/'];

    let title = meta.title;
    if (meta.view === 'ticket') {
        const t = Store.getTicket(route.query.get('id') || '');
        if (t) title = (TYPES[t.type] ? TYPES[t.type].label : 'Other') + ' Ticket';
    }

    let page;
    if (meta.view === 'dashboard') page = <Dashboard tickets={tickets} />;
    else if (meta.view === 'ticket') page = <TicketDetail id={route.query.get('id') || ''} />;
    else if (meta.view === 'settings') page = <Settings tickets={tickets} />;
    else page = <TicketListPage tickets={tickets} view={meta.view} />;

    return (
        <Layout view={meta.view} meta={{ ...meta, title }} tickets={tickets} cloudOn={cloudOn}>
            {page}
        </Layout>
    );
}
