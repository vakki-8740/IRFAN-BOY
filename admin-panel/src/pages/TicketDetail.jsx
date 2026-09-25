import React, { useState, useEffect } from 'react';
import { Store } from '../store.js';
import { navigate } from '../router.js';
import { Ico, TypeBadge, StatusBadge, TYPES, USER_ICON, CopyButton, ImageViewer } from '../components/shared.jsx';

function DetailRow({ label, value, copyable }) {
    if (value === '' || value == null) return null;
    const v = String(value);
    return (
        <div className="td-row">
            <div className="td-label">{label}</div>
            <div className="td-value-wrap">
                <div className="td-value">{v}</div>
                {copyable ? <CopyButton value={v} /> : null}
            </div>
        </div>
    );
}

export default function TicketDetail({ id }) {
    const [imgSrc, setImgSrc] = useState('');
    const [replyText, setReplyText] = useState('');
    const [, forceRender] = useState(0);

    const t = id ? Store.getTicket(id) : null;
    const msgs = t ? Store.getMessages(t.id) : [];

    function refresh() { forceRender((n) => n + 1); }

    function setAct(act) {
        if (!t) return;
        if (act === 'delete') {
            if (window.confirm('Delete this ticket?')) {
                Store.deleteTicket(t.id);
                navigate('/tickets');
            }
            return;
        }
        Store.updateTicket(t.id, { status: act });
        refresh();
    }

    function sendReply() {
        const txt = replyText.trim();
        if (!txt || !t) return;
        Store.addMessage(t.id, txt, 'admin');
        setReplyText('');
        refresh();
    }

    if (!t) {
        return (
            <div className="tc-empty">
                This ticket was not found. <a href="#/tickets" style={{ color: 'var(--a-accent)' }}>Go back to All Tickets</a>.
            </div>
        );
    }

    return (
        <>
            <div className="td-card">
                <div className="td-head">
                    <img className="td-avatar" src={USER_ICON} alt="" width="52" height="52" />
                    <div className="td-head-info">
                        <h2>{t.name || 'User'}</h2>
                        <div className="td-badges">
                            <TypeBadge type={t.type} />
                            <StatusBadge status={t.status} />
                        </div>
                    </div>
                </div>
                <div className="td-rows">
                    <DetailRow label="User Name" value={t.name} copyable />
                    <DetailRow label="Mobile Number" value={t.mobile} copyable />
                    <DetailRow label="Email ID" value={t.email} copyable />
                    <DetailRow label="Game Account Password" value={t.game_pass} copyable />
                    {t.problem ? <DetailRow label="Problem" value={t.problem} /> : null}
                    {t.amount ? <DetailRow label="Amount" value={'₹' + t.amount} /> : null}
                    {t.verify_email ? <DetailRow label="Verify Email ID" value={t.verify_email} copyable /> : null}
                    {t.issue ? <DetailRow label="Issue Detail" value={t.issue} /> : null}
                    <DetailRow label="Status" value={t.status === 'resolved' ? 'Resolved' : 'Pending'} />
                    <DetailRow label="Created At" value={t.created_at} />
                </div>

                {t.image ? (
                    <div className="td-attach">
                        <button type="button" className="td-attach-btn view" onClick={() => setImgSrc(t.image)}>
                            <Ico name="eye" /> View Image
                        </button>
                        <button type="button" className="td-attach-btn" onClick={() => setImgSrc(t.image)}>
                            <Ico name="download" /> Download Image
                        </button>
                    </div>
                ) : null}
            </div>

            <div className="td-actions">
                {t.status === 'pending' ? (
                    <button type="button" className="a-btn a-btn-primary" onClick={() => setAct('resolved')}>Mark as Resolved</button>
                ) : (
                    <button type="button" className="a-btn" onClick={() => setAct('pending')}>Mark as Pending</button>
                )}
                <button type="button" className="a-btn a-btn-danger" onClick={() => setAct('delete')}>Delete Ticket</button>
            </div>

            <div className="td-card" style={{ padding: '16px' }}>
                <div className="td-label" style={{ width: 'auto', maxWidth: 'none', marginBottom: '10px' }}>Reply / Notes</div>
                {msgs.length === 0 ? (
                    <div style={{ color: 'var(--a-text2)', fontSize: '13.5px' }}>No messages yet.</div>
                ) : (
                    msgs.map((m) => {
                        const mine = m.from === 'admin';
                        return (
                            <div className={'td-msg ' + (mine ? 'admin' : 'user')} key={m.id}>
                                <strong>{mine ? 'Admin' : 'User'}:</strong> {m.text}
                                <span className="meta">{m.at || ''}</span>
                            </div>
                        );
                    })
                )}
                <div style={{ height: '10px' }}></div>
                <textarea
                    className="a-input"
                    rows="2"
                    placeholder="Write a reply / note..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                ></textarea>
                <div style={{ height: '10px' }}></div>
                <button type="button" className="a-btn a-btn-primary a-btn-sm" onClick={sendReply}>Send Reply</button>
            </div>

            {imgSrc ? <ImageViewer src={imgSrc} onClose={() => setImgSrc('')} /> : null}
        </>
    );
}
