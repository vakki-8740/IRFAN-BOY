import React, { useState, useEffect } from 'react';
import { navigate } from '../router.js';
import { Chat, fmtListTime } from '../chat.js';

export default function Chats() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(function () {
        var un = Chat.watchUsers(function (list) {
            setUsers(list);
            setLoading(false);
        });
        return un;
    }, []);

    return (
        <div className="chatu-card">
            {loading && !users.length ? (
                <div className="chatu-empty">Loading chats...</div>
            ) : null}
            {!loading && !users.length ? (
                <div className="chatu-empty">No chat users yet. When a user starts Online Chat, they will appear here.</div>
            ) : null}
            {users.map(function (u) {
                return (
                    <button
                        type="button"
                        className="chatu-row"
                        key={u.uid}
                        onClick={function () { navigate('/chat?id=' + encodeURIComponent(u.uid)); }}
                    >
                        <img className="chatu-av" src={u.avatar || 'assets/user-default.png'} alt="" />
                        <div className="chatu-mid">
                            <div className="chatu-name">{u.name || 'User'}</div>
                        </div>
                        <div className="chatu-right">
                            <div className="chatu-time">{fmtListTime(u.last_at || u.created_at)}</div>
                            <div className={'chatu-status' + (u._online ? ' on' : '')}>
                                <i className="chatu-dot"></i>{u._online ? 'Online' : 'Offline'}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
