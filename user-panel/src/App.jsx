import React, { useEffect, useState } from 'react';
import { getRoute } from './router.js';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Contact from './pages/Contact.jsx';
import MyTickets from './pages/MyTickets.jsx';

export default function App() {
    const [route, setRoute] = useState(getRoute());

    useEffect(() => {
        function onChange() { setRoute(getRoute()); }
        window.addEventListener('hashchange', onChange);
        return () => window.removeEventListener('hashchange', onChange);
    }, []);

    let page;
    if (route.path === '/contact') {
        page = <Contact type={route.query.get('type') || 'other'} />;
    } else if (route.path === '/tickets') {
        page = <MyTickets />;
    } else {
        page = <Home />;
    }

    return (
        <>
            <Header />
            {page}
            <Footer />
        </>
    );
}
