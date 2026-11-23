"""Local receiver: the browser POSTs JSON here (http://127.0.0.1:8777/?name=FILE) and it is saved into tools/inbox/."""
import os, re
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inbox')
os.makedirs(OUT, exist_ok=True)
class H(BaseHTTPRequestHandler):
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*'); self.send_header('Access-Control-Allow-Private-Network', 'true')
    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()
    def do_POST(self):
        name = re.sub(r'[^\w.\-]', '_', parse_qs(urlparse(self.path).query).get('name', ['x'])[0])
        data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        open(os.path.join(OUT, name), 'wb').write(data)
        self.send_response(200); self.cors(); self.end_headers(); self.wfile.write(str(len(data)).encode())
    def log_message(self, *a): pass
HTTPServer(('127.0.0.1', 8777), H).serve_forever()
