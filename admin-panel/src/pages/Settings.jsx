import React, { useState } from 'react';
import { Store } from '../store.js';

export default function Settings({ tickets }) {
    const cloud = Store.isCloudReady();
    const last = Store.getLastSync();
    const [alert, setAlert] = useState(null); // {ok, msg}
    const [syncing, setSyncing] = useState(false);
    const [curPwd, setCurPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confPwd, setConfPwd] = useState('');

    function showAlert(ok, msg) { setAlert({ ok, msg }); }

    function syncNow() {
        setSyncing(true);
        Store.sync().then((r) => {
            setSyncing(false);
            if (r && r.ok) showAlert(true, 'Sync complete! (' + (r.count || 0) + ' tickets)');
            else if (!Store.isCloudReady()) showAlert(false, 'Firebase SDK is not available. Running in local mode.');
            else showAlert(false, 'Sync failed. Check Firestore rules / network.');
        }).catch(() => setSyncing(false));
    }

    function changePwd() {
        if (newPwd !== confPwd) return showAlert(false, 'New passwords do not match.');
        const res = Store.changePassword(curPwd, newPwd);
        showAlert(res.ok, res.msg);
        if (res.ok) { setCurPwd(''); setNewPwd(''); setConfPwd(''); }
    }

    function exportJson() {
        const data = JSON.stringify(Store.getTickets(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'irfan-tickets-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function clearAll() {
        if (Store.getTickets().length === 0) return;
        if (window.confirm('All tickets will be deleted (local + cloud). Confirm?')) {
            Store.clearTickets();
            showAlert(true, 'All tickets deleted.');
        }
    }

    return (
        <div className="flat-list">
            <div className="flat-card">
                <div className="flat-card-head">
                    <span className="cell-strong">Cloud Sync (Firebase)</span>
                    <span className={'a-badge ' + (cloud ? 'green' : 'grey')}>{cloud ? 'Connected' : 'Local Only'}</span>
                </div>
                <div className="flat-row"><strong>Project:</strong> site-a9ac1</div>
                <div className="flat-row"><strong>Last Sync:</strong> {last || 'Not yet'}</div>
                <div className="flat-row"><strong>Tickets (local cache):</strong> {tickets.length}</div>
                {alert ? (
                    <div className={'a-alert ' + (alert.ok ? 'ok' : 'error')} style={{ display: 'flex', marginTop: '12px' }}>
                        <span>{alert.msg}</span>
                    </div>
                ) : null}
                <div className="flat-actions">
                    <button type="button" className="a-btn a-btn-primary a-btn-sm" onClick={syncNow} disabled={syncing}>
                        {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                </div>
            </div>

            <div className="flat-card">
                <div className="flat-card-head"><span className="cell-strong">Change Admin Password</span></div>
                <label className="a-label">Current Password</label>
                <input className="a-input" type="password" autoComplete="current-password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} />
                <div style={{ height: '10px' }}></div>
                <label className="a-label">New Password</label>
                <input className="a-input" type="password" autoComplete="new-password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                <div style={{ height: '10px' }}></div>
                <label className="a-label">Confirm New Password</label>
                <input className="a-input" type="password" autoComplete="new-password" value={confPwd} onChange={(e) => setConfPwd(e.target.value)} />
                <div className="flat-actions">
                    <button type="button" className="a-btn a-btn-primary a-btn-sm" onClick={changePwd}>Save Password</button>
                </div>
            </div>

            <div className="flat-card">
                <div className="flat-card-head"><span className="cell-strong">Data</span></div>
                <div className="flat-row">Take a JSON backup of tickets or delete all data.</div>
                <div className="flat-actions">
                    <button type="button" className="a-btn a-btn-sm" onClick={exportJson}>Export JSON</button>
                    <button type="button" className="a-btn a-btn-danger a-btn-sm" onClick={clearAll}>Clear All Tickets</button>
                </div>
            </div>

            <div className="flat-card">
                <div className="flat-card-head"><span className="cell-strong">Quick Links</span></div>
                <div className="flat-actions">
                    <a className="a-btn a-btn-sm" href="../user/index.html">View Site</a>
                    <a className="a-btn a-btn-sm" href="#/">Dashboard</a>
                </div>
            </div>
        </div>
    );
}
