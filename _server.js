const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = 8099;

const types = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml'
};

http.createServer((req, res) => {
    let url = decodeURIComponent(req.url.split('?')[0]);
    if (url.endsWith('/')) url += 'index.html';
    let file = path.join(root, url);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end('no'); }
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end('404'); }
        const ext = path.extname(file).toLowerCase();
        const headers = {
            'Content-Type': types[ext] || 'application/octet-stream',
            'Cache-Control': (ext === '.html' || ext === '.js' || ext === '.css' || ext === '.json')
                ? 'no-cache, no-store, must-revalidate'
                : 'public, max-age=3600',
            'Pragma': 'no-cache',
            'Expires': '0'
        };
        res.writeHead(200, headers);
        res.end(data);
    });
}).listen(port, () => console.log('listening ' + port));