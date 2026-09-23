/* ============================================================
   IRFAN BOY - Shared App Script
   localStorage cache + Firebase Firestore cloud sync
   ============================================================ */

(function (global) {
    'use strict';

    /* ---------- 0. Firebase config + init (guarded) ---------- */
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

    /* ---------- 1. Keys + small helpers ---------- */
    var STORE_KEY = 'irfan_tickets';
    var MSG_KEY = 'irfan_messages';
    var SESSION_KEY = 'irfan_admin_session';
    var PWD_KEY = 'irfan_password';
    var DELETED_KEY = 'irfan_deleted';
    var SYNC_KEY = 'irfan_last_sync';

    var ADMIN_PASSWORD = 'irfan123'; // Default password (Settings page se change kar sakte ho)

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

    /* cloud ko _synced flag nahi bhejna */
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

    /* local ticket ko cloud me upsert karo (best-effort) */
    function pushTicket(t) {
        if (!db || !t || !t.id) return Promise.resolve(false);
        return db.collection('tickets').doc(t.id)
            .set(cleanTicket(t), { merge: true })
            .then(function () { markSynced(t.id); return true; })
            .catch(function () { return false; });
    }

    /* ---------- 2. Delete tombstones (offline delete safe) ---------- */
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

    var syncing = false;

    /* ---------- 3. Data Store ---------- */
    var Store = {
        getTickets: function () {
            var list = readJSON(STORE_KEY, []);
            return Array.isArray(list) ? list : [];
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
            var list = this.getTickets();
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
            return true;
        },

        /* ---- Messages (ticket ke andar notes/reply) ---- */
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

        /* ---- Admin session ---- */
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

        /* ---- Settings ---- */
        changePassword: function (current, next) {
            var saved = readJSON(PWD_KEY, null);
            var target = (saved && saved.value) ? saved.value : ADMIN_PASSWORD;
            if (current !== target) return { ok: false, msg: 'Current password galat hai.' };
            if (!next || next.length < 4) return { ok: false, msg: 'Naya password kam se kam 4 characters ka hona chahiye.' };
            writeJSON(PWD_KEY, { value: next, at: nowStamp() });
            if (db) {
                db.collection('settings').doc('admin')
                    .set({ password: next, updated_at: nowStamp() }, { merge: true })
                    .catch(function () { });
            }
            return { ok: true, msg: 'Password change ho gaya!' };
        },

        isCloudReady: function () { return !!db; },
        getLastSync: function () { return readJSON(SYNC_KEY, '') || ''; }
    };

    /* ---------- 4. Small helpers ---------- */
    function escapeHTML(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function readFileAsDataURL(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /* ---------- 5. Cloud sync (localStorage <-> Firestore) ---------- */
    Store.sync = function () {
        if (!db) return Promise.resolve({ ok: false, reason: 'cloud-off' });
        if (syncing) return Promise.resolve({ ok: false, reason: 'busy' });
        syncing = true;

        /* (1) pending deletes cloud tak pahunchao */
        var tom = tombstones();
        var delP = Promise.all(tom.map(function (x) {
            return db.collection('tickets').doc(x.id).delete()
                .then(function () { dropTombstone(x.id); })
                .catch(function () { });
        }));

        /* (2) remote tickets lao */
        var fetchP = db.collection('tickets').get().then(function (snap) {
            var remote = [];
            snap.forEach(function (d) {
                var t = d.data();
                if (t && t.id) remote.push(t);
            });
            return remote;
        }).catch(function () { return null; });

        /* (3) messages lao (best-effort) */
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

        /* (4) settings/password lao (best-effort) */
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

            var tomIds = {};
            tombstones().forEach(function (x) { tomIds[x.id] = true; });

            var local = Store.getTickets();
            var merged = [];
            var seen = {};

            /* local me jo sync nahi hua (naya/edited) - wo sahi hai, push karo */
            local.forEach(function (t) {
                if (tomIds[t.id] || seen[t.id]) return;
                if (!t._synced) {
                    merged.push(t);
                    seen[t.id] = true;
                    pushTicket(t);
                }
            });

            /* baaki remote se lo (remote fresh hai) */
            remote.forEach(function (t) {
                if (tomIds[t.id] || seen[t.id]) return;
                t._synced = true;
                merged.push(t);
                seen[t.id] = true;
            });

            /* local _synced par remote me nahi => doosre device par delete ho chuka => drop */

            /* write se theek pehle local dobara padho - beech me add hue tickets na jayein */
            Store.getTickets().forEach(function (t) {
                if (tomIds[t.id] || seen[t.id]) return;
                if (!t._synced) {
                    merged.push(t);
                    seen[t.id] = true;
                    pushTicket(t);
                }
            });

            merged.sort(function (a, b) {
                if ((a.created_at || '') < (b.created_at || '')) return 1;
                if ((a.created_at || '') > (b.created_at || '')) return -1;
                return 0;
            });

            writeJSON(STORE_KEY, merged);
            writeJSON(SYNC_KEY, nowStamp());
            return { ok: true, count: merged.length };
        }).catch(function () {
            return { ok: false, reason: 'sync-error' };
        }).then(function (r) { syncing = false; return r; });
    };

    /* ---------- 6. SVG icon set (hand-written) ---------- */
    var Icon = {
        dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
        tickets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z"/><path d="M13 5v3M13 16v3"/></svg>',
        users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 20a6 6 0 0 0-3-5.2"/></svg>',
        logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
        eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4 10-10"/></svg>',
        clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
        mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/></svg>',
        wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="13" rx="3"/><path d="M2 10h20M16 14.5h2"/></svg>',
        cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.6 5 3 5 1.1 5 3-2.2 3-5 3-5-1.1-5-3"/></svg>',
        chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l2-4.9a8.4 8.4 0 1 1 16-4.6z"/></svg>',
        filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18l-7 8v6l-4-2v-4z"/></svg>',
        bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10.5 19a1.8 1.8 0 0 0 3 0"/></svg>',
        menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
        gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
        cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>',
        download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
        key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
        copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
        back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
        user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'
    };

    /* ---------- 7. Shared UI behaviors ---------- */
    function initDrawer() {
        var btn = document.querySelector('.nav-toggle');
        var nav = document.querySelector('.nav-links');
        if (!btn || !nav) return;
        btn.addEventListener('click', function () {
            var isOpen = nav.classList.toggle('open');
            btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
        nav.addEventListener('click', function (e) {
            if (e.target.tagName === 'A') {
                nav.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function initFaq() {
        document.querySelectorAll('.faq-item').forEach(function (item) {
            var btn = item.querySelector('.faq-q');
            var ans = item.querySelector('.faq-a');
            if (!btn || !ans) return;
            btn.addEventListener('click', function () {
                var open = item.classList.toggle('open');
                ans.style.maxHeight = open ? ans.scrollHeight + 'px' : '0px';
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        });
    }

    global.App = {
        Store: Store,
        Icon: Icon,
        escapeHTML: escapeHTML,
        readFileAsDataURL: readFileAsDataURL,
        initDrawer: initDrawer,
        initFaq: initFaq,
        firebaseReady: !!db,
        ADMIN_PASSWORD_HINT: ADMIN_PASSWORD
    };
})(window);