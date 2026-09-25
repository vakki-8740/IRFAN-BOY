/* Tiny hash router helpers */

export function getRoute() {
    var raw = location.hash.replace(/^#/, '') || '/';
    var qIndex = raw.indexOf('?');
    var path = qIndex === -1 ? raw : raw.slice(0, qIndex);
    var query = new URLSearchParams(qIndex === -1 ? '' : raw.slice(qIndex + 1));
    if (path.charAt(0) !== '/') path = '/' + path;
    return { path: path, query: query };
}

export function navigate(path) {
    var target = '#' + path;
    if (location.hash === target) {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
        location.hash = target;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
}

export function goHome(anchorId) {
    navigate('/');
    if (anchorId) {
        setTimeout(function () {
            var el = document.getElementById(anchorId);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
    }
}
