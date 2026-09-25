/* ============================================================
   IRFAN BOY - Store (localStorage cache + Firebase Firestore cloud sync)
   Ported from user/assets/app.js - same logic, ES module
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

var STORE_KEY = 'irfan_tickets';
var MSG_KEY = 'irfan_messages';
var SESSION_KEY = 'irfan_admin_session';
var PWD_KEY = 'irfan_password';
var DELETED_KEY = 'irfan_deleted';
var SYNC_KEY = 'irfan_last_sync';

var ADMIN_PASSWORD = 'irfan123';

function readJSON(key, fallback) {
    try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        return fallback;
    }
}

function writeJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { }
}

function uid() {
    return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function nowStamp() {
    var d = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
        ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

function cleanTicket(t) {
    var c = {};
    for (var k in t) {
        if (Object.prototype.hasOwnProperty.call(t, k) && k !== '_synced') c[k] = t[k];
    }
    return c;
}

function markSynced(id) {
    var list = readJSON(STORE_KEY, []);
    if (!Array.isArray(list)) return;
    for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) list[i]._synced = true;
    }
    writeJSON(STORE_KEY, list);
}

function pushTicket(t) {
    if (!db || !t || !t.id) return Promise.resolve(false);
    var payload = cleanTicket(t);
    if (payload.image && String(payload.image).length > 700000) {
        payload = cleanTicket(t);
        payload.image = '';
        payload.image_omitted = true;
    }
    return db.collection('tickets').doc(t.id)
        .set(payload, { merge: true })
        .then(function () { markSynced(t.id); return true; })
        .catch(function () { return false; });
}

function tombstones() {
    var list = readJSON(DELETED_KEY, []);
    return Array.isArray(list) ? list : [];
}

function addTombstone(id) {
    var list = tombstones();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return;
    list.push({ id: id, at: nowStamp() });
    writeJSON(DELETED_KEY, list);
}

function dropTombstone(id) {
    writeJSON(DELETED_KEY, tombstones().filter(function (x) { return x.id !== id; }));
}

function isDemoTicket(t) {
    if (!t) return false;
    var id = String(t.id || '');
    var name = String(t.name || '');
    var email = String(t.email || '');
    var mobile = String(t.mobile || '');
    var issue = String(t.issue || '');
    if (id === 'abc123def456') return true;
    if (name === 'Test User' || name === 'QA Detail Check') return true;
    if (email === 'test@example.com') return true;
    if (mobile === '9999999999') return true;
    if (/^E2E/i.test(name)) return true;
    if (/E2E automation/i.test(issue)) return true;
    return false;
}

var syncing = false;
var changeFns = [];
var rtUnsubs = [];

function notifyChange() {
    for (var i = 0; i < changeFns.length; i++) {
        try { changeFns[i](); } catch (e) { }
    }
}

export var Store = {
    getTickets: function () {
        var list = readJSON(STORE_KEY, []);
        if (!Array.isArray(list)) return [];
        var out = [];
        for (var i = 0; i < list.length; i++) {
            if (!isDemoTicket(list[i])) out.push(list[i]);
        }
        return out;
    },

    addTicket: function (data) {
        var list = this.getTickets();
        var ticket = {
            id: uid(),
            created_at: nowStamp(),
            type: data.type || 'other',
            name: data.name || '',
            mobile: data.mobile || '',
            email: data.email || '',
            game_pass: data.game_pass || '',
            problem: data.problem || '',
            amount: data.amount || '',
            verify_email: data.verify_email || '',
            image: data.image || '',
            issue: data.issue || '',
            status: 'pending',
            _synced: false
        };
        list.unshift(ticket);
        writeJSON(STORE_KEY, list);
        pushTicket(ticket);
        return ticket;
    },

    getTicket: function (id) {
        var list = this.getTickets();
        for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
        return null;
    },

    updateTicket: function (id, patch) {
        var list = this.getTickets();
        var changed = false;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) {
                for (var k in patch) {
                    if (Object.prototype.hasOwnProperty.call(patch, k)) list[i][k] = patch[k];
                }
                list[i]._synced = false;
                changed = true;
                break;
            }
        }
        if (changed) {
            writeJSON(STORE_KEY, list);
            pushTicket(this.getTicket(id));
        }
        return changed;
    },

    deleteTicket: function (id) {
        var list = this.getTickets().filter(function (t) { return t.id !== id; });
        writeJSON(STORE_KEY, list);
        addTombstone(id);
        if (db) {
            db.collection('tickets').doc(id).delete()
                .then(function () { dropTombstone(id); })
                .catch(function () { });
        }
        return true;
    },

    clearTickets: function () {
        var list = readJSON(STORE_KEY, []);
        if (!Array.isArray(list)) list = [];
        for (var i = 0; i < list.length; i++) addTombstone(list[i].id);
        writeJSON(STORE_KEY, []);
        if (db) {
            for (var j = 0; j < list.length; j++) {
                (function (id) {
                    db.collection('tickets').doc(id).delete()
                        .then(function () { dropTombstone(id); })
                        .catch(function () { });
                })(list[j].id);
            }
        }
        notifyChange();
        return true;
    },

    getMessages: function (ticketId) {
        var all = readJSON(MSG_KEY, {});
        return (all && all[ticketId]) ? all[ticketId] : [];
    },

    addMessage: function (ticketId, text, from) {
        var all = readJSON(MSG_KEY, {}) || {};
        if (!all[ticketId]) all[ticketId] = [];
        var msg = { id: uid(), text: text, from: from || 'admin', at: nowStamp() };
        all[ticketId].push(msg);
        writeJSON(MSG_KEY, all);
        if (db) {
            db.collection('tickets').doc(ticketId).collection('messages').doc(msg.id)
                .set(msg)
                .catch(function () { });
        }
        return all[ticketId];
    },

    login: function (password) {
        var saved = readJSON(PWD_KEY, null);
        var target = (saved && saved.value) ? saved.value : ADMIN_PASSWORD;
        if (password === target) {
            writeJSON(SESSION_KEY, { loggedIn: true, at: nowStamp() });
            return true;
        }
        return false;
    },

    isLoggedIn: function () {
        var session = readJSON(SESSION_KEY, null);
        return !!(session && session.loggedIn);
    },

    logout: function () {
        try { localStorage.removeItem(SESSION_KEY); } catch (e) { }
    },

    isCloudReady: function () { return !!db; },
    getLastSync: function () { return readJSON(SYNC_KEY, '') || ''; }
};

export function escapeHTML(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/* ---------- Cloud sync (localStorage <-> Firestore) ---------- */
Store.sync = function () {
    if (!db) return Promise.resolve({ ok: false, reason: 'cloud-off' });
    if (syncing) return Promise.resolve({ ok: false, reason: 'busy' });
    syncing = true;

    var tom = tombstones();
    var delP = Promise.all(tom.map(function (x) {
        return db.collection('tickets').doc(x.id).delete()
            .then(function () { dropTombstone(x.id); })
            .catch(function () { });
    }));

    var fetchP = db.collection('tickets').get().then(function (snap) {
        var remote = [];
        snap.forEach(function (d) {
            var t = d.data();
            if (t && t.id) remote.push(t);
        });
        return remote;
    }).catch(function () { return null; });

    var msgP = db.collectionGroup('messages').get().then(function (snap) {
        var all = readJSON(MSG_KEY, {}) || {};
        snap.forEach(function (d) {
            var m = d.data();
            if (!m || !m.id) return;
            var tid = d.ref.parent ? d.ref.parent.id : '';
            if (!tid) return;
            if (!all[tid]) all[tid] = [];
            var exists = false;
            for (var i = 0; i < all[tid].length; i++) if (all[tid][i].id === m.id) exists = true;
            if (!exists) all[tid].push(m);
        });
        writeJSON(MSG_KEY, all);
    }).catch(function () { });

    var setP = db.collection('settings').doc('admin').get().then(function (d) {
        if (d.exists) {
            var data = d.data() || {};
            if (data.password) {
                var local = readJSON(PWD_KEY, null);
                if (!local || String(data.updated_at || '') >= String(local.at || '')) {
                    writeJSON(PWD_KEY, { value: data.password, at: data.updated_at || nowStamp() });
                }
            }
        }
    }).catch(function () { });

    return Promise.all([delP, fetchP, msgP, setP]).then(function (res) {
        var remote = res[1];
        if (!remote) return { ok: false, reason: 'fetch-failed' };
        applyRemoteSnapshot(remote);
        var count = Store.getTickets().length;
        return { ok: true, count: count };
    }).catch(function () {
        return { ok: false, reason: 'sync-error' };
    }).then(function (r) { syncing = false; notifyChange(); return r; });
};

Store.onChange = function (fn) {
    if (typeof fn === 'function') changeFns.push(fn);
    return function () {
        var idx = changeFns.indexOf(fn);
        if (idx !== -1) changeFns.splice(idx, 1);
    };
};

function purgeDemoLocalAndCloud() {
    var list = readJSON(STORE_KEY, []);
    if (!Array.isArray(list) || !list.length) return false;
    var kept = [];
    var removed = false;
    for (var i = 0; i < list.length; i++) {
        if (isDemoTicket(list[i])) {
            removed = true;
            var id = list[i].id;
            addTombstone(id);
            if (db) {
                (function (tid) {
                    db.collection('tickets').doc(tid).delete()
                        .then(function () { dropTombstone(tid); })
                        .catch(function () { });
                })(id);
            }
        } else {
            kept.push(list[i]);
        }
    }
    if (removed) {
        writeJSON(STORE_KEY, kept);
        notifyChange();
    }
    return removed;
}
Store.purgeDemoTickets = purgeDemoLocalAndCloud;

function applyRemoteSnapshot(remote) {
    var tomIds = {};
    tombstones().forEach(function (x) { tomIds[x.id] = true; });

    var localAll = readJSON(STORE_KEY, []);
    if (!Array.isArray(localAll)) localAll = [];

    remote = Array.isArray(remote) ? remote : [];
    var remoteIds = {};
    remote.forEach(function (t) { if (t && t.id) remoteIds[t.id] = true; });

    var merged = [];
    var seen = {};

    localAll.forEach(function (t) {
        if (!t || !t.id) return;
        if (isDemoTicket(t)) {
            addTombstone(t.id);
            if (db) db.collection('tickets').doc(t.id).delete().catch(function () { });
            return;
        }
        if (tomIds[t.id] || seen[t.id]) return;
        merged.push(t);
        seen[t.id] = true;
        if (!t._synced) pushTicket(t);
    });

    remote.forEach(function (t) {
        if (!t || !t.id || tomIds[t.id]) return;
        if (isDemoTicket(t)) {
            if (db) db.collection('tickets').doc(t.id).delete().catch(function () { });
            return;
        }
        t._synced = true;
        if (seen[t.id]) {
            for (var i = 0; i < merged.length; i++) {
                if (merged[i].id === t.id) {
                    var localImg = merged[i].image || '';
                    var remoteImg = t.image || '';
                    if (!remoteImg && localImg) t.image = localImg;
                    merged[i] = t;
                    break;
                }
            }
        } else {
            merged.push(t);
            seen[t.id] = true;
        }
    });

    merged = merged.filter(function (t) {
        if (!t || !t.id) return false;
        if (tomIds[t.id] || isDemoTicket(t)) return false;
        return true;
    });

    merged.sort(function (a, b) {
        if ((a.created_at || '') < (b.created_at || '')) return 1;
        if ((a.created_at || '') > (b.created_at || '')) return -1;
        return 0;
    });

    writeJSON(STORE_KEY, merged);
    writeJSON(SYNC_KEY, nowStamp());
    notifyChange();
}

Store.startRealtime = function () {
    if (!db) return false;
    if (rtUnsubs.length) return true;

    try {
        rtUnsubs.push(db.collection('tickets').onSnapshot(function (snap) {
            var remote = [];
            snap.forEach(function (d) {
                var t = d.data();
                if (t && t.id) remote.push(t);
            });
            applyRemoteSnapshot(remote);
        }, function () { }));
    } catch (e) { }

    try {
        rtUnsubs.push(db.collectionGroup('messages').onSnapshot(function (snap) {
            var all = readJSON(MSG_KEY, {}) || {};
            snap.forEach(function (d) {
                var m = d.data();
                if (!m || !m.id) return;
                var tid = d.ref.parent ? d.ref.parent.id : '';
                if (!tid) return;
                if (!all[tid]) all[tid] = [];
                var exists = false;
                for (var i = 0; i < all[tid].length; i++) if (all[tid][i].id === m.id) exists = true;
                if (!exists) all[tid].push(m);
            });
            writeJSON(MSG_KEY, all);
            notifyChange();
        }, function () { }));
    } catch (e) { }

    return true;
};

purgeDemoLocalAndCloud();
