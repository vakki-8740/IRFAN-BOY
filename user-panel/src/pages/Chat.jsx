import React, { useState, useEffect, useRef } from 'react';
import { navigate } from '../router.js';
import {
    Chat, fmtMsgTime, compressChatImage, readChatFile, fmtFileSize, dataUrlToBlob
} from '../chat.js';

function Icon({ d, size }) {
    return (
        <svg viewBox="0 0 24 24" width={size || 16} height={size || 16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
    );
}

const I_SEND = <><path d="M22 2 11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></>;
const I_IMAGE = <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.5-4.5L7 20" /></>;
const I_FILE = <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h4" /></>;
const I_REPLY = <><path d="M9 17l-6-6 6-6" /><path d="M3 11h11a6 6 0 0 1 6 6v2" /></>;
const I_EDIT = <><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></>;
const I_TRASH = <><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>;
const I_CLOSE = <><path d="M18 6 6 18M6 6l12 12" /></>;
const I_DOWNLOAD = <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></>;
const I_BACK = <><path d="m15 18-6-6 6-6" /></>;

function JoinForm({ onDone }) {
    const [form, setForm] = useState({ name: '', mobile: '', email: '', password: '' });
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);

    function set(k) {
        return function (e) { setForm({ ...form, [k]: e.target.value }); };
    }

    function submit(e) {
        e.preventDefault();
        setErr('');
        var name = form.name.trim();
        var mobile = form.mobile.trim();
        var email = form.email.trim();
        var password = form.password;
        if (!name || !mobile || !email || !password) {
            setErr('Please fill all fields (User Name, Mobile Number, Email ID, Password).');
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setErr('Please enter a valid Email ID.');
            return;
        }
        if (mobile.length < 6) {
            setErr('Please enter a valid Mobile Number.');
            return;
        }
        setBusy(true);
        var prof = Chat.saveProfile({ name: name, mobile: mobile, email: email, password: password });
        Promise.resolve(Chat.createChatUser(prof)).then(function () {
            return Chat.ensureWelcome(prof.uid, prof.name);
        }).then(function () {
            setBusy(false);
            onDone(prof);
        }).catch(function () {
            setBusy(false);
            onDone(prof);
        });
    }

    return (
        <div className="chat-join-backdrop">
            <form className="chat-join" onSubmit={submit} noValidate>
                <div className="chat-join-head">
                    <div className="chat-join-avatar">
                        <img src="assets/logo.jpg" alt="IRFAN BOY" />
                    </div>
                    <h2>Start Online Chat</h2>
                    <p>Enter your details to start chatting with our support team.</p>
                </div>
                {err ? <div className="error-box">{err}</div> : null}
                <label>User Name <span>*</span></label>
                <input type="text" placeholder="Your user name" value={form.name} onChange={set('name')} autoFocus />
                <label>Mobile Number <span>*</span></label>
                <input type="tel" placeholder="Mobile number" value={form.mobile} onChange={set('mobile')} />
                <label>Email ID <span>*</span></label>
                <input type="email" placeholder="Your email ID" value={form.email} onChange={set('email')} />
                <label>Password <span>*</span></label>
                <input type="password" placeholder="Choose a password" value={form.password} onChange={set('password')} />
                <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
                    {busy ? 'Starting...' : 'Start Chat'}
                </button>
            </form>
        </div>
    );
}

export default function ChatPage() {
    const [profile, setProfile] = useState(() => Chat.getProfile());
    const [needJoin, setNeedJoin] = useState(() => !Chat.getProfile());
    const [msgs, setMsgs] = useState([]);
    const [adminSt, setAdminSt] = useState({ online: false });
    const [text, setText] = useState('');
    const [reply, setReply] = useState(null);
    const [editState, setEditState] = useState(null); // {id, text}
    const [toast, setToast] = useState('');
    const [viewer, setViewer] = useState(null);
    const [sending, setSending] = useState(false);

    const bodyRef = useRef(null);
    const imgInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const uid = profile ? profile.uid : null;

    useEffect(function () {
        if (!uid) return undefined;
        var un1 = Chat.watchMessages(uid, function (list) { setMsgs(list); });
        return un1;
    }, [uid]);

    useEffect(function () {
        var un = Chat.watchAdmin(function (st) { setAdminSt(st); });
        return un;
    }, []);

    useEffect(function () {
        if (!uid) return undefined;
        Chat.userHeartbeat(uid);
        var iv = setInterval(function () { Chat.userHeartbeat(uid); }, 20000);
        function onHide() { if (document.hidden) Chat.userHeartbeat(uid); }
        function onLeave() { Chat.userOffline(uid); }
        document.addEventListener('visibilitychange', onHide);
        window.addEventListener('pagehide', onLeave);
        return function () {
            clearInterval(iv);
            document.removeEventListener('visibilitychange', onHide);
            window.removeEventListener('pagehide', onLeave);
            Chat.userOffline(uid);
        };
    }, [uid]);

    useEffect(function () {
        if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, [msgs.length]);

    useEffect(function () {
        if (!toast) return undefined;
        var t = setTimeout(function () { setToast(''); }, 3000);
        return function () { clearTimeout(t); };
    }, [toast]);

    function afterJoin(prof) {
        setProfile(prof);
        setNeedJoin(false);
    }

    function doSend() {
        if (editState) {
            var et = editState.text.trim();
            if (!et) return;
            Chat.editMsg(uid, editState.id, et).then(function (r) {
                if (!r.ok) setToast(r.error || 'Could not edit.');
            });
            setEditState(null);
            return;
        }
        var t = text.trim();
        if (!t || !uid) return;
        setSending(true);
        Chat.send(uid, 'user', { type: 'text', text: t, reply: reply }).then(function (r) {
            setSending(false);
            if (!r.ok) setToast(r.error || 'Could not send.');
        });
        setText('');
        setReply(null);
    }

    function onPickImage(e) {
        var f = e.target.files[0];
        e.target.value = '';
        if (!f || !uid) return;
        if (f.size > 5 * 1024 * 1024) { setToast('Image is too large (max 5 MB).'); return; }
        setSending(true);
        compressChatImage(f).then(function (img) {
            return Chat.send(uid, 'user', { type: 'image', file: img, reply: reply });
        }).then(function (r) {
            setSending(false);
            if (!r.ok) setToast(r.error || 'Could not send image.');
            else setReply(null);
        }).catch(function () {
            setSending(false);
            setToast('Image could not be read.');
        });
    }

    function onPickFile(e) {
        var f = e.target.files[0];
        e.target.value = '';
        if (!f || !uid) return;
        if (f.size > 700 * 1024) { setToast('File is too large (max 700 KB).'); return; }
        setSending(true);
        readChatFile(f).then(function (file) {
            return Chat.send(uid, 'user', { type: 'file', file: file, reply: reply });
        }).then(function (r) {
            setSending(false);
            if (!r.ok) setToast(r.error || 'Could not send file.');
            else setReply(null);
        }).catch(function () {
            setSending(false);
            setToast('File could not be read.');
        });
    }

    function removeMsg(m) {
        if (m.from !== 'user') return;
        if (!window.confirm('Delete this message?')) return;
        Chat.deleteMsg(uid, m.id).then(function (r) {
            if (!r.ok) setToast(r.error || 'Could not delete.');
        });
    }

    function openFile(file) {
        var blob = dataUrlToBlob(file.url);
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    }

    function downloadFile(file) {
        var blob = dataUrlToBlob(file.url);
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = file.name || 'file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    }

    return (
        <section className="page chat-page">
            <a href="#/" className="back"><Icon d={I_BACK} /> Back</a>
            <h1>Online Chat</h1>
            <p className="sub">Chat with our support team in real time.</p>

            <div className="chat-shell">
                <div className="chat-head">
                    <div className="chat-head-avatar"><img src="assets/logo.jpg" alt="Support" /></div>
                    <div className="chat-head-txt">
                        <h3>IRFAN BOY Support</h3>
                        <span className={'chat-status ' + (adminSt.online ? 'on' : 'off')}>
                            <i className="chat-dot"></i>{adminSt.online ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>

                <div className="chat-body" ref={bodyRef}>
                    {msgs.length === 0 ? (
                        <div className="chat-empty">Loading conversation...</div>
                    ) : null}
                    {msgs.map(function (m) {
                        var mine = m.from === 'user';
                        return (
                            <div className={'msg-row' + (mine ? ' me' : '')} key={m.id}>
                                <div className={'msg-bubble' + (m.type !== 'text' ? ' media' : '')}>
                                    {m.reply ? (
                                        <div className="msg-quote">
                                            <b>{m.reply.from === 'user' ? 'You' : 'Support'}</b>
                                            <span>{m.reply.text || (m.reply.type === 'image' ? 'Photo' : 'File')}</span>
                                        </div>
                                    ) : null}

                                    {m.type === 'text' ? (
                                        <div className="msg-text">
                                            {m.text}
                                            {m.edited ? <em className="msg-edited">edited</em> : null}
                                        </div>
                                    ) : null}

                                    {m.type === 'image' && m.file ? (
                                        <button type="button" className="msg-image" onClick={function () { setViewer(m.file); }}>
                                            <img src={m.file.url} alt={m.file.name || 'Photo'} />
                                        </button>
                                    ) : null}

                                    {m.type === 'file' && m.file ? (
                                        <div className="msg-file">
                                            <span className="msg-file-ic"><Icon d={I_FILE} size={18} /></span>
                                            <span className="msg-file-meta">
                                                <b>{m.file.name}</b>
                                                <i>{fmtFileSize(m.file.size)}</i>
                                            </span>
                                            <span className="msg-file-acts">
                                                <button type="button" title="Open" onClick={function () { openFile(m.file); }}>Open</button>
                                                <button type="button" title="Download" onClick={function () { downloadFile(m.file); }}><Icon d={I_DOWNLOAD} size={14} /></button>
                                            </span>
                                        </div>
                                    ) : null}

                                    <div className="msg-meta">
                                        <span>{fmtMsgTime(m.at)}</span>
                                        <button type="button" title="Reply" onClick={function () { setEditState(null); setReply({ id: m.id, from: m.from, text: m.type === 'text' ? m.text : '', type: m.type }); }}><Icon d={I_REPLY} size={13} /></button>
                                        {mine && m.type === 'text' ? (
                                            <button type="button" title="Edit" onClick={function () { setReply(null); setEditState({ id: m.id, text: m.text }); setText(''); }}><Icon d={I_EDIT} size={13} /></button>
                                        ) : null}
                                        {mine ? (
                                            <button type="button" title="Delete" className="danger" onClick={function () { removeMsg(m); }}><Icon d={I_TRASH} size={13} /></button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="chat-composer">
                    {editState ? (
                        <div className="chat-chip">
                            <span>Editing message</span>
                            <button type="button" onClick={function () { setEditState(null); }}><Icon d={I_CLOSE} size={13} /></button>
                        </div>
                    ) : null}
                    {reply ? (
                        <div className="chat-chip">
                            <span>Replying to <b>{reply.from === 'user' ? 'your message' : 'Support'}</b>{reply.text ? ': ' + reply.text.slice(0, 40) : ''}</span>
                            <button type="button" onClick={function () { setReply(null); }}><Icon d={I_CLOSE} size={13} /></button>
                        </div>
                    ) : null}
                    <div className="chat-input-row">
                        <button type="button" className="chat-tool" title="Send image" onClick={function () { imgInputRef.current && imgInputRef.current.click(); }}><Icon d={I_IMAGE} size={19} /></button>
                        <button type="button" className="chat-tool" title="Send file / PDF" onClick={function () { fileInputRef.current && fileInputRef.current.click(); }}><Icon d={I_FILE} size={19} /></button>
                        <input ref={imgInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPickImage} />
                        <input ref={fileInputRef} type="file" accept="application/pdf,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip" hidden onChange={onPickFile} />
                        <input
                            className="chat-input"
                            type="text"
                            placeholder={editState ? 'Edit your message...' : 'Type a message...'}
                            value={editState ? editState.text : text}
                            onChange={function (e) { if (editState) setEditState({ ...editState, text: e.target.value }); else setText(e.target.value); }}
                            onKeyDown={function (e) { if (e.key === 'Enter') doSend(); }}
                        />
                        <button type="button" className="chat-send" title="Send" onClick={doSend} disabled={sending}><Icon d={I_SEND} size={18} /></button>
                    </div>
                </div>
            </div>

            {needJoin ? <JoinForm onDone={afterJoin} /> : null}

            {viewer ? (
                <div className="chat-viewer" onClick={function () { setViewer(null); }}>
                    <button type="button" className="chat-viewer-close" title="Close" onClick={function () { setViewer(null); }}><Icon d={I_CLOSE} size={22} /></button>
                    <img src={viewer.url} alt={viewer.name || 'Image'} onClick={function (e) { e.stopPropagation(); }} />
                    <button type="button" className="chat-viewer-dl" title="Download" onClick={function (e) { e.stopPropagation(); downloadFile(viewer); }}><Icon d={I_DOWNLOAD} size={20} /></button>
                </div>
            ) : null}

            {toast ? <div className="chat-toast">{toast}</div> : null}
        </section>
    );
}
