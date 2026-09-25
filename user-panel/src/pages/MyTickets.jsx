import React, { useState, useEffect, useRef } from 'react';
import { Store } from '../store.js';

const TYPE_LABEL = {
    deposit: 'Deposit',
    withdraw: 'Withdrawal',
    email: 'Email Verify',
    other: 'Other',
    upi: 'UPI Payment',
    redeem: 'Redeem Code',
    login: 'Login Problem'
};

function matches(t, q) {
    var s = q.toLowerCase();
    return (t.mobile || '').toLowerCase() === s ||
        (t.email || '').toLowerCase() === s ||
        (t.id || '').toLowerCase() === s ||
        (t.name || '').toLowerCase() === s;
}

export default function MyTickets() {
    const [query, setQuery] = useState(function () {
        try { return localStorage.getItem('irfan_my_search') || ''; } catch (e) { return ''; }
    }());
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [searching, setSearching] = useState(false);
    const queryRef = useRef(query);

    function render(q) {
        if (!q) { setResults(null); return; }
        var all = Store.getTickets();
        setResults(all.filter(function (t) { return matches(t, q); }));
    }

    useEffect(function () {
        if (query) render(query);
        Store.startRealtime();
        var off = Store.onChange(function () {
            var q = queryRef.current.trim();
            if (q) render(q);
        });
        return off;
    }, []);

    function submit(e) {
        e.preventDefault();
        setError('');
        var q = query.trim();
        if (q === '') {
            setError('Please enter a mobile number or email.');
            return;
        }
        queryRef.current = q;
        setSearching(true);
        try { localStorage.setItem('irfan_my_search', q); } catch (err) { }
        Store.sync().finally(function () {
            setSearching(false);
            render(q);
        });
    }

    return (
        <section className="page">
            <a href="#/" className="back">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                Back
            </a>

            <h1>My Tickets</h1>
            <p className="sub">Check your ticket status and admin replies. Search by mobile or email.</p>

            {error ? <div className="error-box">{error}</div> : null}

            <form className="form" onSubmit={submit} noValidate>
                <label>Mobile Number or Email ID <span>*</span></label>
                <input
                    type="text"
                    placeholder="e.g. 9876543210 or you@email.com"
                    autoComplete="off"
                    value={query}
                    onChange={function (e) { setQuery(e.target.value); queryRef.current = e.target.value; }}
                    required
                />
                <button type="submit" className="btn btn-primary btn-full" disabled={searching}>
                    {searching ? 'Searching...' : 'Find My Tickets'}
                </button>
            </form>

            <div style={{ marginTop: '22px' }}>
                {results !== null && results.length === 0 ? (
                    <div className="success-box" style={{ padding: '28px 20px' }}>
                        <h2 style={{ fontSize: '18px' }}>No Tickets Found</h2>
                        <p>No ticket found for this mobile/email. Fill the support form to create a new request.</p>
                        <a href="#/contact?type=other" className="btn btn-primary">New Request</a>
                    </div>
                ) : results !== null ? (
                    <>
                        <div className="ticket-list">
                            {results.map(function (t) {
                                var resolved = t.status === 'resolved';
                                var msgs = Store.getMessages(t.id);
                                return (
                                    <div className="ticket" key={t.id}>
                                        <div className="ticket-head">
                                            <span
                                                className="badge"
                                                style={{
                                                    background: resolved ? 'var(--green-bg)' : 'var(--orange-bg)',
                                                    color: resolved ? 'var(--green)' : 'var(--orange)'
                                                }}
                                            >
                                                {resolved ? 'Resolved' : 'Pending'}
                                            </span>
                                            <span className="badge">{TYPE_LABEL[t.type] || 'Other'}</span>
                                            <span className="ticket-date">{t.created_at || ''}</span>
                                        </div>
                                        <div className="ticket-row"><strong>Name:</strong> {t.name || ''}</div>
                                        <div className="ticket-row"><strong>Mobile:</strong> {t.mobile || ''}</div>
                                        {t.problem ? <div className="ticket-row"><strong>Problem:</strong> {t.problem}</div> : null}
                                        {t.amount ? <div className="ticket-row"><strong>Amount:</strong> ₹{t.amount}</div> : null}
                                        {t.issue ? <div className="ticket-row"><strong>Issue:</strong> {t.issue}</div> : null}
                                        <div className="ticket-row"><strong>Ticket ID:</strong> {t.id || ''}</div>

                                        <div className="ticket-row" style={{ marginTop: '10px' }}><strong>Admin Replies:</strong></div>
                                        {!msgs || msgs.length === 0 ? (
                                            <div className="ticket-row" style={{ color: 'var(--text2)' }}>
                                                No reply yet. Our team will reply soon.
                                            </div>
                                        ) : (
                                            msgs.map(function (m) {
                                                var mine = m.from === 'admin';
                                                return (
                                                    <div
                                                        key={m.id}
                                                        className="ticket-row"
                                                        style={{
                                                            background: mine ? 'var(--accent2)' : '#f1f4f6',
                                                            padding: '9px 11px',
                                                            borderRadius: '9px',
                                                            marginTop: '6px'
                                                        }}
                                                    >
                                                        <strong>{mine ? 'Admin' : 'You'}:</strong> {m.text}
                                                        <span style={{ color: 'var(--text2)', fontSize: '11.5px', float: 'right' }}>{m.at || ''}</span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ height: '16px' }}></div>
                        <a href="#/contact?type=other" className="btn btn-secondary btn-full">New Request</a>
                    </>
                ) : null}
            </div>
        </section>
    );
}
