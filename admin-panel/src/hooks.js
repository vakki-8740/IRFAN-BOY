import { useState, useEffect } from 'react';
import { Store } from './store.js';
import { getRoute } from './router.js';

export function useHashRoute() {
    const [route, setRoute] = useState(getRoute());
    useEffect(() => {
        function onChange() { setRoute(getRoute()); }
        window.addEventListener('hashchange', onChange);
        return () => window.removeEventListener('hashchange', onChange);
    }, []);
    return route;
}

export function useTickets() {
    const [tickets, setTickets] = useState(() => Store.getTickets());
    useEffect(() => {
        const off = Store.onChange(() => setTickets(Store.getTickets()));
        return off;
    }, []);
    return tickets;
}
