#!/usr/bin/env python3
"""
Simple HTTP server to serve matplotlib plots for preview
"""
import http.server
import socketserver
import json
import os
import base64
from datetime import datetime
import glob

PORT = 8094

class PlotHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/preview':
            self.serve_preview_data()
        elif self.path.startswith('/plot/'):
            self.serve_plot_image()
        else:
            self.send_error(404)

    def serve_preview_data(self):
        """Serve preview data as JSON"""
        try:
            plots = []
            png_files = glob.glob("*.png")

            for i, filename in enumerate(png_files):
                if os.path.exists(filename):
                    # Read and encode image
                    with open(filename, 'rb') as f:
                        image_data = f.read()
                        base64_image = base64.b64encode(image_data).decode('utf-8')

                    stat = os.stat(filename)
                    plot_data = {
                        "id": f"plot_{i}",
                        "type": "matplotlib_enhanced" if "wandb" in filename else "matplotlib",
                        "name": filename.replace('.png', '').replace('_', ' ').title(),
                        "description": f"Plot: {filename}",
                        "filename": filename,
                        "path": os.path.abspath(filename),
                        "timestamp": int(stat.st_mtime),
                        "size": stat.st_size,
                        "format": "png",
                        "base64_image": f"data:image/png;base64,{base64_image}"
                    }

                    if "wandb" in filename:
                        plot_data["wandb_metadata"] = {
                            "experiment_id": "cnn_test_exp",
                            "run_id": f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                            "tags": ["CNN", "Classification", "W&B Demo"],
                            "metrics": {"accuracy": 0.92, "loss": 0.15}
                        }
                        plot_data["cnn_prediction"] = {
                            "predicted_class": "Training Curve" if "training" in filename else "Dashboard",
                            "confidence": 0.98,
                            "classification_time": 0.045
                        }

                    plots.append(plot_data)

            response_data = {
                "preview_items": plots,
                "total_count": len(plots),
                "timestamp": datetime.now().isoformat()
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_data, indent=2).encode())

            print(f"✅ Served {len(plots)} plots to preview")

        except Exception as e:
            print(f"❌ Error serving preview data: {e}")
            self.send_error(500)

    def serve_plot_image(self):
        """Serve individual plot image"""
        filename = self.path.replace('/plot/', '')
        if os.path.exists(filename) and filename.endswith('.png'):
            self.send_response(200)
            self.send_header('Content-Type', 'image/png')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with open(filename, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_error(404)

    def log_message(self, format, *args):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {format % args}")

if __name__ == "__main__":
    print(f"🚀 Starting Plot Server on port {PORT}")
    print(f"📊 Preview endpoint: http://localhost:{PORT}/preview")

    with socketserver.TCPServer(("", PORT), PlotHandler) as httpd:
        print(f"✅ Server running at http://localhost:{PORT}")
        httpd.serve_forever()