#!/usr/bin/env python3
import socket
import threading
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # コンテナのHTTPサーバーにリクエストを転送
            container_url = f"http://192.168.0.135:3000{self.path}"

            # Dockerコンテナ内のサーバーにプロキシ
            response = requests.get(f"http://localhost:3000{self.path}",
                                  proxies={'http': None, 'https': None})

            # レスポンスを返す
            self.send_response(response.status_code)

            # ヘッダーをコピー
            for header, value in response.headers.items():
                if header.lower() not in ['connection', 'transfer-encoding']:
                    self.send_header(header, value)

            self.end_headers()
            self.wfile.write(response.content)

        except Exception as e:
            print(f"Proxy error: {e}")
            self.send_error(500, f"Proxy Error: {str(e)}")

    def do_POST(self):
        self.do_GET()

if __name__ == "__main__":
    server = HTTPServer(('0.0.0.0', 13000), ProxyHandler)
    print("🌐 Starting proxy server on port 13000 -> container:3000")
    print("🔗 Access: http://192.168.0.135:13000")
    server.serve_forever()