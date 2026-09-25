import { useEffect, useState } from 'react';

let deferred = null;
const subs = new Set();

function detectInstalled() {
    try {
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (e) { /* ignore */ }
    if (window.navigator && window.navigator.standalone === true) return true;
    return false;
}

let installed = detectInstalled();

function emit() {
    subs.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferred = e;
        emit();
    });
    window.addEventListener('appinstalled', () => {
        deferred = null;
        installed = true;
        emit();
    });
    try {
        const mq = window.matchMedia('(display-mode: standalone)');
        const onMode = () => { installed = detectInstalled(); emit(); };
        if (mq.addEventListener) mq.addEventListener('change', onMode);
        else if (mq.addListener) mq.addListener(onMode);
    } catch (e) { /* ignore */ }
}

export function useInstall() {
    const [, setTick] = useState(0);
    useEffect(() => {
        const fn = () => setTick((t) => t + 1);
        subs.add(fn);
        return () => { subs.delete(fn); };
    }, []);

    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    function install() {
        if (!deferred) return false;
        try { deferred.prompt(); } catch (e) { /* ignore */ }
        if (deferred.userChoice && deferred.userChoice.catch) deferred.userChoice.catch(() => {});
        deferred = null;
        emit();
        return true;
    }

    return {
        installed,
        isIOS,
        canInstall: !!deferred && !installed,
        install
    };
}
