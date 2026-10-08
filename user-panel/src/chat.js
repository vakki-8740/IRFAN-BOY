/* ============================================================
   IRFAN BOY - Chat module
   Firestore realtime chat + local fallback (shared: user & admin)
   ============================================================ */

var firebaseConfig = {
    apiKey: "AIzaSyB14Jlab6DyLOQDwGA7y8-Fqh6cMimK1os",
    authDomain: "site-a9ac1.firebaseapp.com",
    projectId: "site-a9ac1",
    storageBucket: "site-a9ac1.firebasestorage.app",
    messagingSenderId: "501216847535",
    appId: "1:501216847535:web:e633f15d3b4f225e45965a"
};

var db = null;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
    }
} catch (e) {
    db = null;
}

var PROFILE_KEY = 'irfan_chat_profile';
var CACHE_KEY = 'irfan_chat_cache';
var ONLINE_TTL = 60000;
var MAX_FILE_CHARS = 900000;

function readJSON(key, fallback) {
    try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        return fallback;
    }
}

function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { }
}

function makeId() {
    return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function nowStamp() {
    var d = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
        ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

function stampMs(stamp) {
    if (!stamp) return 0;
    var m = String(stamp).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (!m) return 0;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
}

function effectiveOnline(obj) {
    if (!obj || !obj.online) return false;
    return (Date.now() - stampMs(obj.last_seen)) < ONLINE_TTL;
}

/* ---------- local cache (fallback when Firestore unavailable) ---------- */
function loadCache() {
    var c = readJSON(CACHE_KEY, null);
    if (!c || typeof c !== 'object') c = {};
    if (!c.users) c.users = {};
    if (!c.msgs) c.msgs = {};
    return c;
}

function saveCache(c) { writeJSON(CACHE_KEY, c); }

var userSubs = [];   /* cb(list) */
var adminSubs = [];  /* cb({online}) */
var msgSubs = {};    /* uid -> cb(list) */
var singleSubs = {}; /* uid -> cb(user) */
var ticker = null;

function startTicker() {
    if (ticker) return;
    ticker = setInterval(function () {
        if (db) return;
        var c = loadCache();
        emitUsers(c);
        emitAdmin(c);
        for (var uid in singleSubs) {
            try { singleSubs[uid](c.users[uid] || null); } catch (e) { }
        }
    }, 15000);
}

function stopTickerIfIdle() {
    if (!userSubs.length && !adminSubs.length && !Object.keys(msgSubs).length && !Object.keys(singleSubs).length && ticker) {
        clearInterval(ticker);
        ticker = null;
    }
}

function sortUsers(list) {
    return list.sort(function (a, b) {
        var ka = a.last_at || a.created_at || '';
        var kb = b.last_at || b.created_at || '';
        if (ka === kb) return (b.created_at || '') < (a.created_at || '') ? -1 : 1;
        return ka < kb ? 1 : -1;
    });
}

function emitUsers(c) {
    var list = [];
    for (var uid in c.users) {
        var u = c.users[uid];
        if (!u || !u.uid) continue;
        list.push({ uid: u.uid, name: u.name || '', mobile: u.mobile || '', email: u.email || '',
            avatar: u.avatar || 'assets/user-default.png', online: u.online || false, last_seen: u.last_seen || '',
            created_at: u.created_at || '', last_at: u.last_at || u.created_at || '',
            last_text: u.last_text || '', last_type: u.last_type || '', _online: effectiveOnline(u) });
    }
    sortUsers(list);
    for (var i = 0; i < userSubs.length; i++) {
        try { userSubs[i](list); } catch (e) { }
    }
}

function emitAdmin(c) {
    var st = { online: effectiveOnline(c.admin) };
    for (var i = 0; i < adminSubs.length; i++) {
        try { adminSubs[i](st); } catch (e) { }
    }
}

function emitMsgs(uid) {
    var c = loadCache();
    var list = (c.msgs[uid] || []).slice().sort(function (a, b) {
        if (a.at === b.at) return String(a.id) < String(b.id) ? -1 : 1;
        return a.at < b.at ? -1 : 1;
    });
    if (msgSubs[uid]) {
        try { msgSubs[uid](list); } catch (e) { }
    }
}

/* ---------- public API ---------- */
export var Chat = {
    isReady: function () { return !!db; },
    ONLINE_TTL: ONLINE_TTL,

    /* --- user profile (join form) --- */
    getProfile: function () {
        return readJSON(PROFILE_KEY, null);
    },

    saveProfile: function (p) {
        var prof = {
            uid: p.uid || makeId(),
            name: String(p.name || '').trim(),
            mobile: String(p.mobile || '').trim(),
            email: String(p.email || '').trim(),
            password: String(p.password || ''),
            at: nowStamp()
        };
        writeJSON(PROFILE_KEY, prof);
        return prof;
    },

    /* --- presence: user side --- */
    userHeartbeat: function (uid) {
        if (!uid) return;
        if (db) {
            db.collection('chat_users').doc(uid).set({
                online: true, last_seen: nowStamp()
            }, { merge: true }).catch(function () { });
        } else {
            var c = loadCache();
            var u = c.users[uid] || { uid: uid, created_at: nowStamp() };
            u.online = true;
            u.last_seen = nowStamp();
            c.users[uid] = u;
            saveCache(c);
            emitUsers(c);
        }
    },

    userOffline: function (uid) {
        if (!uid) return;
        if (db) {
            db.collection('chat_users').doc(uid).set({
                online: false, last_seen: nowStamp()
            }, { merge: true }).catch(function () { });
        } else {
            var c = loadCache();
            if (c.users[uid]) {
                c.users[uid].online = false;
                c.users[uid].last_seen = nowStamp();
                saveCache(c);
                emitUsers(c);
            }
        }
    },

    /* --- presence: admin side --- */
    adminHeartbeat: function () {
        if (db) {
            db.collection('settings').doc('admin_presence').set({
                online: true, last_seen: nowStamp()
            }, { merge: true }).catch(function () { });
        } else {
            var c = loadCache();
            c.admin = { online: true, last_seen: nowStamp() };
            saveCache(c);
            emitAdmin(c);
        }
    },

    adminOffline: function () {
        if (db) {
            db.collection('settings').doc('admin_presence').set({
                online: false, last_seen: nowStamp()
            }, { merge: true }).catch(function () { });
        } else {
            var c = loadCache();
            c.admin = { online: false, last_seen: nowStamp() };
            saveCache(c);
            emitAdmin(c);
        }
    },

    /* --- watchers (return unsubscribe fn) --- */
    watchAdmin: function (cb) {
        if (db) {
            var unsub = db.collection('settings').doc('admin_presence').onSnapshot(function (snap) {
                var d = snap.exists ? (snap.data() || {}) : null;
                try { cb({ online: effectiveOnline(d) }); } catch (e) { }
            }, function () { });
            var iv = setInterval(function () {
                /* TTL expiry refresh is handled by next snapshot; nothing needed */
            }, 15000);
            adminSubs.push(cb);
            startTicker();
            return function () { clearInterval(iv); unsub(); stopTickerIfIdle(); };
        }
        adminSubs.push(cb);
        emitAdmin(loadCache());
        startTicker();
        return function () {
            var i = adminSubs.indexOf(cb);
            if (i !== -1) adminSubs.splice(i, 1);
            stopTickerIfIdle();
        };
    },

    watchUsers: function (cb) {
        if (db) {
            var last = [];
            var unsub = db.collection('chat_users').onSnapshot(function (snap) {
                last = [];
                snap.forEach(function (d) {
                    var u = d.data() || {};
                    u.uid = u.uid || d.id;
                    u._online = effectiveOnline(u);
                    last.push(u);
                });
                sortUsers(last);
                try { cb(last.slice()); } catch (e) { }
            }, function () { });
            var iv = setInterval(function () {
                if (!last.length) return;
                var fresh = last.map(function (u) {
                    var c = Object.assign({}, u);
                    c._online = effectiveOnline(u);
                    return c;
                });
                try { cb(fresh); } catch (e) { }
            }, 15000);
            return function () { clearInterval(iv); unsub(); };
        }
        userSubs.push(cb);
        emitUsers(loadCache());
        startTicker();
        return function () {
            var i = userSubs.indexOf(cb);
            if (i !== -1) userSubs.splice(i, 1);
            stopTickerIfIdle();
        };
    },

    watchUser: function (uid, cb) {
        if (db) {
            var lastU = null;
            var unsub = db.collection('chat_users').doc(uid).onSnapshot(function (snap) {
                lastU = snap.exists ? (snap.data() || null) : null;
                if (lastU) {
                    lastU.uid = lastU.uid || uid;
                    lastU._online = effectiveOnline(lastU);
                }
                try { cb(lastU); } catch (e) { }
            }, function () { });
            var iv = setInterval(function () {
                if (!lastU) return;
                try { cb(Object.assign({}, lastU, { _online: effectiveOnline(lastU) })); } catch (e) { }
            }, 15000);
            return function () { clearInterval(iv); unsub(); };
        }
        singleSubs[uid] = cb;
        var c = loadCache();
        try { cb(c.users[uid] || null); } catch (e) { }
        startTicker();
        return function () { delete singleSubs[uid]; stopTickerIfIdle(); };
    },

    watchMessages: function (uid, cb) {
        if (db) {
            var unsub = db.collection('chat_users').doc(uid).collection('messages').onSnapshot(function (snap) {
                var list = [];
                snap.forEach(function (d) {
                    var m = d.data() || {};
                    m.id = m.id || d.id;
                    list.push(m);
                });
                list.sort(function (a, b) {
                    if (a.at === b.at) return String(a.id) < String(b.id) ? -1 : 1;
                    return a.at < b.at ? -1 : 1;
                });
                try { cb(list); } catch (e) { }
            }, function () { });
            return unsub;
        }
        msgSubs[uid] = cb;
        emitMsgs(uid);
        startTicker();
        return function () { delete msgSubs[uid]; stopTickerIfIdle(); };
    },

    /* --- message actions --- */
    send: function (uid, from, data) {
        var type = data.type || 'text';
        var text = String(data.text == null ? '' : data.text).trim();
        if (type === 'text' && !text) return Promise.resolve({ ok: false, error: 'Message is empty.' });
        if (text.length > 2000) return Promise.resolve({ ok: false, error: 'Message is too long (max 2000 characters).' });

        var file = data.file || null;
        if ((type === 'image' || type === 'file') && (!file || !file.url)) {
            return Promise.resolve({ ok: false, error: 'File could not be read.' });
        }
        if (file && String(file.url).length > MAX_FILE_CHARS) {
            return Promise.resolve({ ok: false, error: 'File is too large (max 700 KB).' });
        }

        var msg = {
            id: makeId(),
            from: from === 'admin' ? 'admin' : 'user',
            type: type === 'image' ? 'image' : (type === 'file' ? 'file' : 'text'),
            text: text,
            file: file,
            reply: data.reply || null,
            edited: false,
            at: nowStamp()
        };

        if (db) {
            var userRef = db.collection('chat_users').doc(uid);
            return userRef.collection('messages').doc(msg.id).set(msg).then(function () {
                return userRef.set({
                    uid: uid, last_at: msg.at, last_text: msg.type === 'text' ? msg.text : (msg.type === 'image' ? 'Photo' : 'File'),
                    last_type: msg.type, last_from: msg.from
                }, { merge: true });
            }).then(function () { return { ok: true, msg: msg }; })
              .catch(function () { return { ok: false, error: 'Could not send. Check your connection.' }; });
        }

        var c = loadCache();
        if (!c.msgs[uid]) c.msgs[uid] = [];
        c.msgs[uid].push(msg);
        var u = c.users[uid] || { uid: uid, created_at: msg.at, name: '', avatar: 'assets/user-default.png' };
        u.last_at = msg.at;
        u.last_text = msg.type === 'text' ? msg.text : (msg.type === 'image' ? 'Photo' : 'File');
        u.last_type = msg.type;
        u.last_from = msg.from;
        c.users[uid] = u;
        saveCache(c);
        emitMsgs(uid);
        emitUsers(c);
        return Promise.resolve({ ok: true, msg: msg });
    },

    editMsg: function (uid, id, text) {
        text = String(text || '').trim();
        if (!text) return Promise.resolve({ ok: false, error: 'Message is empty.' });
        if (db) {
            return db.collection('chat_users').doc(uid).collection('messages').doc(id)
                .update({ text: text, edited: true })
                .then(function () { return { ok: true }; })
                .catch(function () { return { ok: false, error: 'Could not edit message.' }; });
        }
        var c = loadCache();
        var list = c.msgs[uid] || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) { list[i].text = text; list[i].edited = true; break; }
        }
        saveCache(c);
        emitMsgs(uid);
        return Promise.resolve({ ok: true });
    },

    deleteMsg: function (uid, id) {
        if (db) {
            return db.collection('chat_users').doc(uid).collection('messages').doc(id)
                .delete()
                .then(function () { return { ok: true }; })
                .catch(function () { return { ok: false, error: 'Could not delete message.' }; });
        }
        var c = loadCache();
        c.msgs[uid] = (c.msgs[uid] || []).filter(function (m) { return m.id !== id; });
        saveCache(c);
        emitMsgs(uid);
        return Promise.resolve({ ok: true });
    },

    /* welcome message (sent once, no auto replies after that) */
    ensureWelcome: function (uid, name) {
        if (!uid) return Promise.resolve({ ok: false });
        var text = 'Welcome' + (name ? ', ' + name : '') + '! Thanks for contacting IRFAN BOY Support. How can we help you today?';

        if (db) {
            var userRef = db.collection('chat_users').doc(uid);
            return userRef.collection('messages').orderBy('at').limit(1).get().then(function (snap) {
                if (!snap.empty) return { ok: true, existed: true };
                var msg = {
                    id: makeId(), from: 'admin', type: 'text', text: text,
                    file: null, reply: null, edited: false, at: nowStamp(), welcome: true
                };
                return userRef.collection('messages').doc(msg.id).set(msg).then(function () { return { ok: true }; })
                    .catch(function () { return { ok: false }; });
            }).catch(function () { return { ok: false }; });
        }

        var c = loadCache();
        if (!c.msgs[uid] || !c.msgs[uid].length) {
            if (!c.msgs[uid]) c.msgs[uid] = [];
            c.msgs[uid].push({
                id: makeId(), from: 'admin', type: 'text', text: text,
                file: null, reply: null, edited: false, at: nowStamp(), welcome: true
            });
            saveCache(c);
            emitMsgs(uid);
        }
        return Promise.resolve({ ok: true });
    },

    /* create/update chat user doc on join */
    createChatUser: function (prof) {
        if (!prof || !prof.uid) return Promise.resolve({ ok: false });
        if (db) {
            return db.collection('chat_users').doc(prof.uid).set({
                uid: prof.uid, name: prof.name, mobile: prof.mobile, email: prof.email,
                password: prof.password, avatar: 'assets/user-default.png',
                online: true, last_seen: nowStamp(),
                created_at: nowStamp(), last_at: nowStamp()
            }, { merge: true }).then(function () { return { ok: true }; })
              .catch(function () { return { ok: false }; });
        }
        var c = loadCache();
        var u = c.users[prof.uid] || { uid: prof.uid, created_at: nowStamp() };
        u.name = prof.name; u.mobile = prof.mobile; u.email = prof.email; u.password = prof.password;
        u.avatar = 'assets/user-default.png'; u.online = true; u.last_seen = nowStamp();
        if (!u.last_at) u.last_at = u.created_at;
        c.users[prof.uid] = u;
        saveCache(c);
        emitUsers(c);
        return Promise.resolve({ ok: true });
    }
};

/* ---------- helpers ---------- */
export function fmtMsgTime(stamp) {
    var ms = stampMs(stamp);
    if (!ms) return '';
    var d = new Date(ms);
    var h = d.getHours();
    var m = d.getMinutes();
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ap;
}

export function fmtListTime(stamp) {
    var ms = stampMs(stamp);
    if (!ms) return '';
    var d = new Date(ms);
    var now = new Date();
    var sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (sameDay) return fmtMsgTime(stamp);
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + fmtMsgTime(stamp);
}

export function compressChatImage(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
            var dataUrl = reader.result;
            var im = new Image();
            im.onload = function () {
                try {
                    var w = im.naturalWidth || im.width;
                    var h = im.naturalHeight || im.height;
                    var scale = Math.min(1, 900 / Math.max(w, h));
                    var cw = Math.max(1, Math.round(w * scale));
                    var ch = Math.max(1, Math.round(h * scale));
                    var canvas = document.createElement('canvas');
                    canvas.width = cw;
                    canvas.height = ch;
                    var ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(0, 0, cw, ch);
                    ctx.drawImage(im, 0, 0, cw, ch);
                    var out = canvas.toDataURL('image/jpeg', 0.68);
                    if (!out || out.indexOf('data:image/jpeg') !== 0) { resolve(dataUrl); return; }
                    resolve({ url: out, w: cw, h: ch, name: file.name || 'photo.jpg', size: file.size || 0 });
                } catch (e) { resolve(dataUrl); }
            };
            im.onerror = function () { reject(new Error('bad image')); };
            im.src = dataUrl;
        };
        reader.onerror = function () { reject(new Error('read failed')); };
        reader.readAsDataURL(file);
    });
}

export function readChatFile(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
            resolve({ url: reader.result, name: file.name || 'file', size: file.size || 0 });
        };
        reader.onerror = function () { reject(new Error('read failed')); };
        reader.readAsDataURL(file);
    });
}

export function fmtFileSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function dataUrlToBlob(dataUrl) {
    try {
        var parts = dataUrl.split(',');
        var mime = (parts[0].match(/data:(.*?);/) || [])[1] || 'application/octet-stream';
        var bin = atob(parts[1]);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return new Blob([arr], { type: mime });
    } catch (e) {
        return null;
    }
}
