#!/usr/bin/env python3
import subprocess
import socketserver
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

class ContainerProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Docker exec を使ってコンテナ内のHTTPサーバーにアクセス
            cmd = f'docker exec eabc0f3ec3ed curl -s http://localhost:3000{self.path}'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

            if result.returncode == 0:
                content = result.stdout

                # レスポンスを返す
                self.send_response(200)

                # Content-Type を判定
                if self.path.endswith('.html') or self.path == '/':
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                elif self.path.endswith('.css'):
                    self.send_header('Content-Type', 'text/css')
                elif self.path.endswith('.js'):
                    self.send_header('Content-Type', 'application/javascript')
                else:
                    self.send_header('Content-Type', 'text/plain')

                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(content.encode('utf-8'))
            else:
                self.send_error(404, "File not found in container")

        except Exception as e:
            print(f"Proxy error: {e}")
            self.send_error(500, f"Proxy Error: {str(e)}")

    def log_message(self, format, *args):
        print(f"🌐 {self.address_string()} - {format % args}")

if __name__ == "__main__":
    server = HTTPServer(('0.0.0.0', 13000), ContainerProxyHandler)
    print("🌐 Starting container proxy server on port 13000")
    print("🔗 Access: http://192.168.0.135:13000")
    print("📁 Serving files from container eabc0f3ec3ed:3000")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Proxy server stopped")
        server.shutdown()