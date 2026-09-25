import React, { useState, useEffect, useRef } from 'react';
import { Store } from '../store.js';
import { navigate } from '../router.js';

export default function Login({ onSuccess }) {
    const [pwd, setPwd] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (Store.isLoggedIn()) navigate('/');
    }, []);

    function submit(e) {
        e.preventDefault();
        if (Store.login(pwd)) {
            onSuccess();
            navigate('/');
            return;
        }
        setError('Wrong password!');
        setPwd('');
        if (inputRef.current) inputRef.current.focus();
        Store.sync();
    }

    return (
        <div className="login-wrap">
            <div className="login-box">
                <div className="login-mark">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v2.5" /></svg>
                </div>

                <h1>Admin Login</h1>
                <p className="login-sub">For admin only. Enter your password.</p>

                {error ? (
                    <div className="a-alert error" style={{ display: 'flex' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
                        <span>{error}</span>
                    </div>
                ) : null}

                <form onSubmit={submit} noValidate>
                    <label className="a-label">Password <span style={{ color: 'var(--a-red)' }}>*</span></label>
                    <input
                        ref={inputRef}
                        className="a-input"
                        type="password"
                        placeholder="Password"
                        required
                        autoFocus
                        autoComplete="current-password"
                        value={pwd}
                        onChange={(e) => setPwd(e.target.value)}
                    />

                    <div style={{ height: '14px' }}></div>

                    <button type="submit" className="a-btn a-btn-primary a-btn-block">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" /></svg>
                        Login
                    </button>
                </form>

                <div style={{ height: '14px' }}></div>
                <a href="../user/index.html" className="a-btn a-btn-block" style={{ justifyContent: 'center' }}>Back to Site</a>
            </div>
        </div>
    );
}
