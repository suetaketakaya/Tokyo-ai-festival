#!/usr/bin/env python3
import subprocess
import socketserver
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

class JupyterProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Docker exec を使って新しいコンテナ内のJupyterサーバーにアクセス
            cmd = f'docker exec 4fb29ed35255 curl -s http://localhost:8888{self.path}'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

            if result.returncode == 0:
                content = result.stdout

                # レスポンスを返す
                self.send_response(200)

                # Content-Type を判定
                if self.path.endswith('.html') or self.path == '/' or self.path == '/tree':
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                elif self.path.endswith('.css'):
                    self.send_header('Content-Type', 'text/css')
                elif self.path.endswith('.js'):
                    self.send_header('Content-Type', 'application/javascript')
                elif self.path.endswith('.json'):
                    self.send_header('Content-Type', 'application/json')
                else:
                    self.send_header('Content-Type', 'text/html; charset=utf-8')

                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(content.encode('utf-8'))
            else:
                self.send_error(404, "Jupyter resource not found")

        except Exception as e:
            print(f"Jupyter proxy error: {e}")
            self.send_error(500, f"Jupyter Proxy Error: {str(e)}")

    def do_POST(self):
        self.do_GET()

    def log_message(self, format, *args):
        print(f"📓 NEW {self.address_string()} - {format % args}")

if __name__ == "__main__":
    server = HTTPServer(('0.0.0.0', 15000), JupyterProxyHandler)
    print("📓 Starting NEW Jupyter proxy server on port 15000")
    print("🔗 Access: http://192.168.0.135:15000")
    print("📁 Serving Jupyter from container 4fb29ed35255:8888")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 NEW Jupyter proxy server stopped")
        server.shutdown()