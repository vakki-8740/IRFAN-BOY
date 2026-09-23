/* ============================================================
   IRFAN BOY - Admin Panel shared page controller
   Menu: Dashboard | All Tickets | Settings
   Ticket tap → ticket.html?id=...
   ============================================================ */
(function () {
    'use strict';

    if (!window.App) return;
    if (!App.Store.isLoggedIn()) {
        location.replace('login.html');
        return;
    }

    var esc = App.escapeHTML;
    var view = document.body.getAttribute('data-view') || 'dashboard';
    var state = { view: view, search: '' };
    var USER_ICON = 'assets/user-icons/user-default.png';
    var params = new URLSearchParams(location.search);
    var ticketId = params.get('id') || '';

    var TYPES = {
        deposit: { label: 'Deposit', color: '#047857', bg: '#d1fae5' },
        withdraw: { label: 'Withdrawal', color: '#b45309', bg: '#fef3c7' },
        email: { label: 'Email Verify', color: '#6d28d9', bg: '#ede9fe' },
        other: { label: 'Other Problem', color: '#0369a1', bg: '#e0f2fe' },
        upi: { label: 'UPI Payment', color: '#6d28d9', bg: '#ede9fe' },
        redeem: { label: 'Redeem Code', color: '#b45309', bg: '#fef3c7' },
        login: { label: 'Login Problem', color: '#b91c1c', bg: '#fee2e2' }
    };

    var VIEW_META = {
        dashboard: { title: 'Dashboard', sub: 'Aaj ka sab kuch ek jagah' },
        tickets: { title: 'All Tickets', sub: 'Sabhi tickets ek jagah' },
        settings: { title: 'Settings', sub: 'Admin panel settings aur cloud sync' },
        ticket: { title: 'Ticket Details', sub: 'Line by line user details' },
        pending: { title: 'Pending Tickets', sub: 'Abhi resolve nahi huye' },
        resolved: { title: 'Resolved Tickets', sub: 'Ho chuke kaam' },
        users: { title: 'Users', sub: 'Unique users jinke tickets hain' }
    };

    /* Sirf 3 menu buttons */
    var NAV = [
        { view: 'dashboard', href: 'index.html', label: 'Dashboard', icon: App.Icon.dashboard },
        { view: 'tickets', href: 'tickets.html', label: 'All Tickets', badge: true, icon: App.Icon.tickets },
        { view: 'settings', href: 'settings.html', label: 'Settings', icon: App.Icon.gear }
    ];

    if (!VIEW_META[state.view]) state.view = 'dashboard';

    var hasToolbar = state.view === 'tickets' || state.view === 'pending' || state.view === 'resolved';
    var hasStats = state.view === 'dashboard' || hasToolbar;

    /* ---------- Shell builders ---------- */
    function navHTML() {
        var html = '';
        for (var i = 0; i < NAV.length; i++) {
            var n = NAV[i];
            var active = (n.view === state.view) ||
                (state.view === 'ticket' && n.view === 'tickets');
            html += '<a href="' + n.href + '" data-view="' + n.view + '"' +
                (active ? ' class="active"' : '') + '>' +
                n.icon + ' ' + n.label +
                (n.badge ? '<span class="a-badge grey" id="navTicketCount" style="margin-left:auto">0</span>' : '') +
                '</a>';
        }
        return html;
    }

    function statsHTML() {
        function card(id, label, icon, tone) {
            return '<div class="stat">' +
                '<div class="stat-top"><span class="stat-label">' + label + '</span>' +
                '<div class="stat-ico ' + tone + '">' + icon + '</div></div>' +
                '<span class="stat-value" id="' + id + '">0</span></div>';
        }
        return '<div class="stat-grid">' +
            card('statTotal', 'Kul Tickets', App.Icon.tickets, 'blue') +
            card('statPending', 'Pending', App.Icon.clock, 'orange') +
            card('statResolved', 'Resolved', App.Icon.check, 'green') +
            card('statUsers', 'Unique Users', App.Icon.users, 'purple') +
            '</div>';
    }

    function toolbarHTML() {
        if (!hasToolbar) return '';
        return '<div class="admin-toolbar">' +
            '<div class="admin-search">' + App.Icon.search +
            '<input type="text" id="searchInput" placeholder="Name, mobile, email, password search..." autocomplete="off"></div>' +
            '<button class="a-btn a-btn-sm" id="refreshBtn" type="button">Refresh</button>' +
            '<button class="a-btn a-btn-danger a-btn-sm" id="clearAllBtn" type="button">Clear All</button>' +
            '</div>';
    }

    function shellHTML() {
        var meta = VIEW_META[state.view];
        var hideBack = state.view === 'ticket';

        return '<div class="admin-backdrop" id="sideBackdrop"></div>' +
            '<div class="admin-shell">' +
            '<aside class="admin-side" id="adminSide">' +
            '<div class="admin-brand">' +
            '<img src="assets/logo.jpg" alt="IRFAN BOY" class="admin-logo">' +
            '<div class="admin-brand-txt"><h4>IRFAN BOY</h4><span>Admin Panel</span></div>' +
            '</div>' +
            '<nav id="adminNav" class="admin-nav">' + navHTML() + '</nav>' +
            '<div class="admin-side-foot">' +
            '<a href="../user/index.html" style="text-decoration:none">' + App.Icon.eye + ' View Site</a>' +
            '<button type="button" id="logoutBtn">' + App.Icon.logout + ' Logout</button>' +
            '</div>' +
            '</aside>' +
            '<main class="admin-main">' +
            '<header class="admin-topbar">' +
            '<button class="admin-side-toggle" id="sideToggle" aria-label="Menu">' + App.Icon.menu + '</button>' +
            '<div class="admin-top-title"><h1 id="viewTitle">' + esc(meta.title) + '</h1><p id="viewSub">' + esc(meta.sub) + '</p></div>' +
            '<span class="a-badge grey" id="syncBadge">Cloud</span>' +
            '<span class="a-badge" id="topTotal">0</span>' +
            '</header>' +
            '<div class="admin-content" id="adminContent">' +
            (hideBack ? '' : '<a class="td-back" id="topBack" href="index.html" style="display:none"></a>') +
            (hasStats ? statsHTML() : '') +
            toolbarHTML() +
            '<div id="listWrap"></div>' +
            '</div>' +
            '</main>' +
            '</div>' +

            '<div class="img-viewer" id="imgViewer">' +
            '<button class="img-viewer-close" id="imgViewerClose" aria-label="Close">' + App.Icon.close + '</button>' +
            '<div class="img-viewer-box">' +
            '<img id="imgViewerSrc" alt="Ticket attachment">' +
            '<div class="img-viewer-bar">' +
            '<button type="button" class="a-btn a-btn-primary" id="imgDownloadBtn">' + App.Icon.download + ' Download</button>' +
            '<button type="button" class="a-btn" id="imgCloseBtn">' + App.Icon.close + ' Close</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }

    document.body.insertAdjacentHTML('afterbegin', shellHTML());

    /* ticket.html: header me back link dikhao */
    if (state.view === 'ticket') {
        var topBack = document.getElementById('topBack');
        if (topBack) {
            topBack.style.display = 'inline-flex';
            topBack.href = 'tickets.html';
            topBack.innerHTML = App.Icon.back + ' All Tickets';
        }
        /* stats hatana - ticket page pe nahi chahiye */
        var sg = document.querySelector('.stat-grid');
        if (sg) sg.remove();
    }

    /* ---------- Elements + bindings ---------- */
    var side = document.getElementById('adminSide');
    var backdrop = document.getElementById('sideBackdrop');
    var imgViewer = document.getElementById('imgViewer');

    document.getElementById('sideToggle').addEventListener('click', function () {
        side.classList.add('open');
        backdrop.classList.add('show');
    });
    backdrop.addEventListener('click', function () {
        side.classList.remove('open');
        backdrop.classList.remove('show');
    });

    document.getElementById('adminNav').addEventListener('click', function () {
        side.classList.remove('open');
        backdrop.classList.remove('show');
    });

    document.getElementById('logoutBtn').addEventListener('click', function () {
        App.Store.logout();
        location.href = 'login.html';
    });

    /* ---- Image viewer (View / Close / Download) ---- */
    var currentImgSrc = '';

    function openImageViewer(src) {
        if (!src) return;
        currentImgSrc = src;
        document.getElementById('imgViewerSrc').src = src;
        imgViewer.classList.add('show');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    }

    function closeImageViewer() {
        imgViewer.classList.remove('show');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    }

    document.getElementById('imgViewerClose').addEventListener('click', closeImageViewer);
    document.getElementById('imgCloseBtn').addEventListener('click', closeImageViewer);
    imgViewer.addEventListener('click', function (e) {
        if (e.target === imgViewer) closeImageViewer();
    });

    document.getElementById('imgDownloadBtn').addEventListener('click', function () {
        if (!currentImgSrc) return;
        var a = document.createElement('a');
        a.href = currentImgSrc;
        a.download = 'ticket-attachment-' + (ticketId || Date.now()) +
            (currentImgSrc.indexOf('image/png') > -1 || currentImgSrc.indexOf('.png') > -1 ? '.png' : '.jpg');
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeImageViewer();
    });

    /* ---- Copy button (delegated) ---- */
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-copy]');
        if (!btn) return;
        var text = btn.getAttribute('data-copy') || '';
        if (!text) return;

        function done() {
            btn.classList.add('copied');
                setTimeout(function () { btn.classList.remove('copied'); }, 1400);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(function () {
                fallbackCopy(text);
                done();
            });
        } else {
            fallbackCopy(text);
            done();
        }
    });

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (err) { }
        document.body.removeChild(ta);
    }

    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            state.search = searchInput.value.toLowerCase().trim();
            renderList();
        });
    }

    var refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'Syncing...';
            App.Store.sync().then(function () {
                refreshBtn.disabled = false;
                refreshBtn.textContent = 'Refresh';
                render();
            });
        });
    }

    var clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', function () {
            if (App.Store.getTickets().length === 0) return;
            if (confirm('Sabhi tickets delete ho jayengi (local + cloud). Confirm?')) {
                App.Store.clearTickets();
                render();
            }
        });
    }

    /* ---------- Format helpers ---------- */
    function typeBadge(type) {
        var t = TYPES[type] || { label: 'Other', color: '#0369a1', bg: '#e0f2fe' };
        return '<span class="ticket-type" style="background:' + t.bg + ';color:' + t.color + '">' + esc(t.label) + '</span>';
    }

    function statusBadge(status) {
        var label = status === 'resolved' ? 'Resolved' : 'Pending';
        var color = status === 'resolved' ? '#047857' : '#b45309';
        var bg = status === 'resolved' ? '#d1fae5' : '#fef3c7';
        return '<span class="ticket-status" style="background:' + bg + ';color:' + color + '">' + label + '</span>';
    }

    function filterTickets(all) {
        var list = all;
        if (state.view === 'pending') list = list.filter(function (t) { return t.status === 'pending'; });
        if (state.view === 'resolved') list = list.filter(function (t) { return t.status === 'resolved'; });
        if (state.search) {
            list = list.filter(function (t) {
                return (t.name + ' ' + t.mobile + ' ' + t.email + ' ' + t.problem + ' ' + t.type +
                    ' ' + (t.game_pass || '') + ' ' + (t.issue || '') + ' ' + (t.amount || ''))
                    .toLowerCase().includes(state.search);
            });
        }
        return list;
    }

    function uniqueUsers(all) {
        var map = {};
        all.forEach(function (t) { map[t.mobile || t.email || t.name] = true; });
        return Object.keys(map).length;
    }

    function ticketHref(id) {
        return 'ticket.html?id=' + encodeURIComponent(id);
    }

    /* ---------- List card: user logo + name ---------- */
    function ticketRowHTML(t) {
        return '<a class="tc-row" href="' + ticketHref(t.id) + '" data-id="' + esc(t.id) + '">' +
            '<img class="tc-avatar" src="' + USER_ICON + '" alt="" width="44" height="44">' +
            '<div class="tc-main">' +
            '<div class="tc-top">' +
            typeBadge(t.type) +
            statusBadge(t.status) +
            '</div>' +
            '<div class="tc-name">' + esc(t.name || 'User') + '</div>' +
            '<div class="tc-meta">' +
            (t.mobile ? '<span>' + esc(t.mobile) + '</span>' : '') +
            (t.amount ? '<span>₹' + esc(t.amount) + '</span>' : '') +
            (t.created_at ? '<span>' + esc(t.created_at) + '</span>' : '') +
            '</div>' +
            '</div>' +
            '<span class="tc-arrow" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' +
            '</span>' +
            '</a>';
    }

    function renderTicketList(list, emptyMsg) {
        var wrap = document.getElementById('listWrap');
        if (list.length === 0) {
            wrap.innerHTML = '<div class="tc-empty">' + esc(emptyMsg) + '</div>';
            return;
        }
        var html = '<div class="ticket-cards">';
        list.forEach(function (t) { html += ticketRowHTML(t); });
        html += '</div>';
        wrap.innerHTML = html;
    }

    /* ---------- Detail page (ticket.html?id=) ---------- */
    function detailRow(label, value, copyable) {
        if (value === '' || value == null) return '';
        var v = String(value);
        return '<div class="td-row">' +
            '<div class="td-label">' + esc(label) + '</div>' +
            '<div class="td-value-wrap">' +
            '<div class="td-value">' + esc(v) + '</div>' +
            (copyable
                ? '<button type="button" class="td-copy" data-copy="' + esc(v) + '" aria-label="Copy ' + esc(label) + '" title="Copy">' +
                App.Icon.copy + '</button>'
                : '') +
            '</div>' +
            '</div>';
    }

    function renderTicketDetail() {
        var wrap = document.getElementById('listWrap');
        var t = ticketId ? App.Store.getTicket(ticketId) : null;

        if (!t) {
            wrap.innerHTML = '<div class="tc-empty">Ye ticket nahi mili. ' +
                '<a href="tickets.html" style="color:var(--a-accent)">All Tickets</a> pe wapas jayein.</div>';
            return;
        }

        document.getElementById('viewTitle').textContent =
            (TYPES[t.type] ? TYPES[t.type].label : 'Other') + ' Ticket';

        var html = '<div class="td-card">' +
            '<div class="td-head">' +
            '<img class="td-avatar" src="' + USER_ICON + '" alt="" width="52" height="52">' +
            '<div class="td-head-info">' +
            '<h2>' + esc(t.name || 'User') + '</h2>' +
            '<div class="td-badges">' + typeBadge(t.type) + statusBadge(t.status) + '</div>' +
            '</div>' +
            '</div>' +
            '<div class="td-rows">';

        /* Sirf wahi details jo user ne form me bhari — sahi naam ke saath */
        html += detailRow('User Name', t.name, true);
        html += detailRow('Mobile Number', t.mobile, true);
        html += detailRow('Email ID', t.email, true);
        html += detailRow('Game Account Password', t.game_pass, true);

        if (t.problem) html += detailRow('Problem', t.problem, false);
        if (t.amount) html += detailRow('Amount', '₹' + t.amount, false);
        if (t.verify_email) html += detailRow('Verify Email ID', t.verify_email, true);
        if (t.issue) html += detailRow('Issue Detail', t.issue, false);

        html += detailRow('Status', t.status === 'resolved' ? 'Resolved' : 'Pending', false);
        html += detailRow('Created At', t.created_at, false);

        html += '</div>';

        if (t.image) {
            html += '<div class="td-attach">' +
                '<button type="button" class="td-attach-btn view" id="viewImgBtn">' +
                App.Icon.eye + ' View Image</button>' +
                '<button type="button" class="td-attach-btn" id="dlImgBtn">' +
                App.Icon.download + ' Download Image</button>' +
                '</div>';
        }

        html += '</div>';

        /* Actions: resolve/pending + delete */
        html += '<div class="td-actions">';
        if (t.status === 'pending') {
            html += '<button type="button" class="a-btn a-btn-primary" data-act="resolved">Mark as Resolved</button>';
        } else {
            html += '<button type="button" class="a-btn" data-act="pending">Mark as Pending</button>';
        }
        html += '<button type="button" class="a-btn a-btn-danger" data-act="delete">Delete Ticket</button>';
        html += '</div>';

        /* Reply / notes */
        var msgs = App.Store.getMessages(t.id);
        html += '<div class="td-card" style="padding:16px">' +
            '<div class="td-label" style="width:auto;max-width:none;margin-bottom:10px">Reply / Notes</div>';
        if (msgs.length === 0) {
            html += '<div style="color:var(--a-text2);font-size:13.5px">Abhi koi message nahi.</div>';
        } else {
            msgs.forEach(function (m) {
                var mine = m.from === 'admin';
                html += '<div class="td-msg ' + (mine ? 'admin' : 'user') + '">' +
                    '<strong>' + (mine ? 'Admin' : 'User') + ':</strong> ' + esc(m.text) +
                    '<span class="meta">' + esc(m.at || '') + '</span></div>';
            });
        }
        html += '<div style="height:10px"></div>' +
            '<textarea id="replyText" class="a-input" rows="2" placeholder="Reply / note likhein..."></textarea>' +
            '<div style="height:10px"></div>' +
            '<button type="button" class="a-btn a-btn-primary a-btn-sm" id="replySend">Send Reply</button>' +
            '</div>';

        wrap.innerHTML = html;

        var viewBtn = document.getElementById('viewImgBtn');
        if (viewBtn) {
            viewBtn.addEventListener('click', function () { openImageViewer(t.image); });
        }
        var dlBtn = document.getElementById('dlImgBtn');
        if (dlBtn) {
            dlBtn.addEventListener('click', function () {
                currentImgSrc = t.image;
                document.getElementById('imgDownloadBtn').click();
            });
        }

        document.getElementById('replySend').addEventListener('click', function () {
            var txt = document.getElementById('replyText').value.trim();
            if (!txt) return;
            App.Store.addMessage(t.id, txt, 'admin');
            renderTicketDetail();
        });

        wrap.querySelectorAll('[data-act]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var act = btn.getAttribute('data-act');
                if (act === 'delete') {
                    if (confirm('Ye ticket delete karni hai?')) {
                        App.Store.deleteTicket(t.id);
                        location.href = 'tickets.html';
                    }
                    return;
                }
                App.Store.updateTicket(t.id, { status: act });
                renderTicketDetail();
                renderStats();
                renderHeader();
            });
        });
    }

    /* ---------- Settings ---------- */
    function renderSettings() {
        var wrap = document.getElementById('listWrap');
        var tickets = App.Store.getTickets();
        var cloud = App.Store.isCloudReady();
        var last = App.Store.getLastSync();

        wrap.innerHTML = '<div class="flat-list">' +
            '<div class="flat-card">' +
            '<div class="flat-card-head"><span class="cell-strong">Cloud Sync (Firebase)</span>' +
            '<span class="a-badge ' + (cloud ? 'green' : 'grey') + '">' + (cloud ? 'Connected' : 'Local Only') + '</span></div>' +
            '<div class="flat-row"><strong>Project:</strong> site-a9ac1</div>' +
            '<div class="flat-row"><strong>Last Sync:</strong> ' + esc(last || 'Abhi nahi hua') + '</div>' +
            '<div class="flat-row"><strong>Tickets (local cache):</strong> ' + tickets.length + '</div>' +
            '<div class="a-alert ok" id="settingsAlert" style="display:none;margin-top:12px"><span id="settingsAlertText"></span></div>' +
            '<div class="flat-actions"><button type="button" class="a-btn a-btn-primary a-btn-sm" id="syncNowBtn">Sync Now</button></div>' +
            '</div>' +

            '<div class="flat-card">' +
            '<div class="flat-card-head"><span class="cell-strong">Change Admin Password</span></div>' +
            '<label class="a-label" for="curPwd">Current Password</label>' +
            '<input class="a-input" type="password" id="curPwd" autocomplete="current-password">' +
            '<div style="height:10px"></div>' +
            '<label class="a-label" for="newPwd">New Password</label>' +
            '<input class="a-input" type="password" id="newPwd" autocomplete="new-password">' +
            '<div style="height:10px"></div>' +
            '<label class="a-label" for="confPwd">Confirm New Password</label>' +
            '<input class="a-input" type="password" id="confPwd" autocomplete="new-password">' +
            '<div class="flat-actions"><button type="button" class="a-btn a-btn-primary a-btn-sm" id="changePwdBtn">Save Password</button></div>' +
            '</div>' +

            '<div class="flat-card">' +
            '<div class="flat-card-head"><span class="cell-strong">Data</span></div>' +
            '<div class="flat-row">Tickets ka JSON backup lein ya sab data delete karein.</div>' +
            '<div class="flat-actions">' +
            '<button type="button" class="a-btn a-btn-sm" id="exportBtn">Export JSON</button>' +
            '<button type="button" class="a-btn a-btn-danger a-btn-sm" id="settingsClearBtn">Clear All Tickets</button>' +
            '</div>' +
            '</div>' +

            '<div class="flat-card">' +
            '<div class="flat-card-head"><span class="cell-strong">Quick Links</span></div>' +
            '<div class="flat-actions">' +
            '<a class="a-btn a-btn-sm" href="../user/index.html">View Site</a>' +
            '<a class="a-btn a-btn-sm" href="index.html">Dashboard</a>' +
            '</div>' +
            '</div>' +
            '</div>';

        function alertBox(ok, msg) {
            var box = document.getElementById('settingsAlert');
            box.className = 'a-alert ' + (ok ? 'ok' : 'error');
            document.getElementById('settingsAlertText').textContent = msg;
            box.style.display = 'flex';
        }

        document.getElementById('syncNowBtn').addEventListener('click', function () {
            var btn = this;
            btn.disabled = true;
            btn.textContent = 'Syncing...';
            App.Store.sync().then(function (r) {
                btn.disabled = false;
                btn.textContent = 'Sync Now';
                if (r && r.ok) alertBox(true, 'Sync complete! (' + (r.count || 0) + ' tickets)');
                else if (!App.Store.isCloudReady()) alertBox(false, 'Firebase SDK available nahi hai. Local mode me chal raha hai.');
                else alertBox(false, 'Sync fail hua. Firestore rules / network check karein.');
                renderSyncBadge();
            });
        });

        document.getElementById('changePwdBtn').addEventListener('click', function () {
            var cur = document.getElementById('curPwd').value;
            var nw = document.getElementById('newPwd').value;
            var cf = document.getElementById('confPwd').value;
            if (nw !== cf) return alertBox(false, 'Naye password match nahi kar rahe.');
            var res = App.Store.changePassword(cur, nw);
            alertBox(res.ok, res.msg);
            if (res.ok) {
                document.getElementById('curPwd').value = '';
                document.getElementById('newPwd').value = '';
                document.getElementById('confPwd').value = '';
            }
        });

        document.getElementById('exportBtn').addEventListener('click', function () {
            var data = JSON.stringify(App.Store.getTickets(), null, 2);
            var blob = new Blob([data], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'irfan-tickets-' + new Date().toISOString().slice(0, 10) + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        });

        document.getElementById('settingsClearBtn').addEventListener('click', function () {
            if (App.Store.getTickets().length === 0) return;
            if (confirm('Sabhi tickets delete ho jayengi (local + cloud). Confirm?')) {
                App.Store.clearTickets();
                render();
                alertBox(true, 'Sabhi tickets delete ho gayi.');
            }
        });
    }

    /* ---------- Render list by view ---------- */
    function renderList() {
        var wrap = document.getElementById('listWrap');
        var all = App.Store.getTickets();

        if (state.view === 'settings') {
            renderSettings();
            return;
        }

        if (state.view === 'ticket') {
            renderTicketDetail();
            return;
        }

        if (state.view === 'users') {
            wrap.innerHTML = '<div class="tc-empty">Users view ab menu me nahi hai.</div>';
            return;
        }

        var list = filterTickets(all);

        /* Dashboard: sirf recent tickets (neeche) */
        if (state.view === 'dashboard') {
            var recent = list.slice(0, 8);
            var head = '<div class="ticket-list-head">' +
                '<h2>Recent Tickets</h2>' +
                '<a href="tickets.html">View All</a>' +
                '</div>';
            if (recent.length === 0) {
                wrap.innerHTML = head + '<div class="tc-empty">Abhi koi ticket nahi. User side se aate hi yahan dikhenge.</div>';
                return;
            }
            var html = head + '<div class="ticket-cards">';
            recent.forEach(function (t) { html += ticketRowHTML(t); });
            html += '</div>';
            wrap.innerHTML = html;
            return;
        }

        var emptyMsg = state.search
            ? 'Is search se koi ticket nahi mila.'
            : 'User side se aate hi tickets yahan dikhenge.';
        renderTicketList(list, emptyMsg);
    }

    /* ---------- Stats / header / badge ---------- */
    function renderStats() {
        var elTotal = document.getElementById('statTotal');
        if (!elTotal) return;
        var all = App.Store.getTickets();
        elTotal.textContent = all.length;
        document.getElementById('statPending').textContent =
            all.filter(function (t) { return t.status === 'pending'; }).length;
        document.getElementById('statResolved').textContent =
            all.filter(function (t) { return t.status === 'resolved'; }).length;
        document.getElementById('statUsers').textContent = uniqueUsers(all);
    }

    function renderHeader() {
        var meta = VIEW_META[state.view];
        document.getElementById('viewTitle').textContent = meta.title;
        document.getElementById('viewSub').textContent = meta.sub;
        var all = App.Store.getTickets();
        document.getElementById('topTotal').textContent = all.length + ' Tickets';
        var navCount = document.getElementById('navTicketCount');
        if (navCount) navCount.textContent = all.length;
        document.querySelectorAll('#adminNav a[data-view]').forEach(function (a) {
            var v = a.getAttribute('data-view');
            var active = (v === state.view) || (state.view === 'ticket' && v === 'tickets');
            a.classList.toggle('active', active);
        });
    }

    function renderSyncBadge() {
        var el = document.getElementById('syncBadge');
        if (!el) return;
        if (App.Store.isCloudReady()) {
            el.textContent = 'Cloud: ON';
            el.className = 'a-badge green';
        } else {
            el.textContent = 'Local Only';
            el.className = 'a-badge grey';
        }
    }

    function render() {
        renderStats();
        renderHeader();
        renderList();
        renderSyncBadge();
    }

    function doSync() {
        App.Store.sync().then(function () {
            render();
        });
    }

    render();
    renderSyncBadge();
    doSync();
    setInterval(doSync, 60000);
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) doSync();
    });
})();
