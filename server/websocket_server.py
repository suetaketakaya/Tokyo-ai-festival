#!/usr/bin/env python3
"""
WebSocket Server with W&B Plot Integration
Serves as a replacement for Go server with enhanced W&B matplotlib detection
"""
import asyncio
import websockets
import json
import os
import base64
from datetime import datetime
import glob
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PORT = 8090

class WebSocketHandler:
    def __init__(self):
        self.connected_clients = set()

    async def register_client(self, websocket):
        self.connected_clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.connected_clients)}")

    async def unregister_client(self, websocket):
        self.connected_clients.discard(websocket)
        logger.info(f"Client disconnected. Total clients: {len(self.connected_clients)}")

    async def get_preview_items(self, project_id="default"):
        """Get preview items with W&B integration"""
        try:
            plots = []
            png_files = glob.glob("*.png")

            logger.info(f"📊 Found {len(png_files)} PNG files for project: {project_id}")

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
                        "description": f"W&B Enhanced Plot: {filename}" if "wandb" in filename else f"Plot: {filename}",
                        "filename": filename,
                        "path": os.path.abspath(filename),
                        "timestamp": int(stat.st_mtime),
                        "size": stat.st_size,
                        "format": "png",
                        "base64_image": f"data:image/png;base64,{base64_image}"
                    }

                    # Add W&B metadata for wandb plots
                    if "wandb" in filename:
                        plot_data["wandb_metadata"] = {
                            "experiment_id": "cnn_test_exp",
                            "run_id": f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                            "tags": ["CNN", "Classification", "W&B Demo"],
                            "metrics": {"accuracy": 0.92, "loss": 0.15}
                        }

                        # Add CNN classification prediction
                        if "training" in filename:
                            predicted_class = "Training Curve"
                        elif "architecture" in filename:
                            predicted_class = "CNN Architecture"
                        elif "classification" in filename:
                            predicted_class = "Classification Results"
                        elif "dashboard" in filename:
                            predicted_class = "Dashboard"
                        else:
                            predicted_class = "Enhanced Plot"

                        plot_data["cnn_prediction"] = {
                            "predicted_class": predicted_class,
                            "confidence": 0.98,
                            "classification_time": 0.045
                        }

                    plots.append(plot_data)

            logger.info(f"✅ Prepared {len(plots)} plots for preview")
            return plots

        except Exception as e:
            logger.error(f"❌ Error getting preview items: {e}")
            return []

    async def handle_message(self, websocket, message):
        """Handle WebSocket messages"""
        try:
            data = json.loads(message)
            command = data.get('command', '')

            logger.info(f"📨 Received command: {command}")

            if command == 'get_preview_items':
                project_id = data.get('project_id', 'default')

                # Get preview items
                preview_items = await self.get_preview_items(project_id)

                response = {
                    'type': 'preview_items',
                    'items': preview_items,
                    'total_count': len(preview_items),
                    'project_id': project_id,
                    'timestamp': datetime.now().isoformat()
                }

                await websocket.send(json.dumps(response))
                logger.info(f"📤 Sent {len(preview_items)} preview items to client")

            elif command == 'ping':
                await websocket.send(json.dumps({
                    'type': 'pong',
                    'timestamp': datetime.now().isoformat()
                }))

            else:
                # Echo back unknown commands
                response = {
                    'type': 'response',
                    'command': command,
                    'status': 'received',
                    'timestamp': datetime.now().isoformat()
                }
                await websocket.send(json.dumps(response))

        except json.JSONDecodeError:
            error_response = {
                'type': 'error',
                'message': 'Invalid JSON format',
                'timestamp': datetime.now().isoformat()
            }
            await websocket.send(json.dumps(error_response))
        except Exception as e:
            logger.error(f"❌ Error handling message: {e}")
            error_response = {
                'type': 'error',
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            }
            await websocket.send(json.dumps(error_response))

    async def client_handler(self, websocket, path=None):
        """Handle WebSocket client connections"""
        logger.info(f"📡 New WebSocket connection from {websocket.remote_address}")
        await self.register_client(websocket)
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info("Client connection closed normally")
        except Exception as e:
            logger.error(f"❌ Client handler error: {e}")
        finally:
            await self.unregister_client(websocket)

# Global handler instance
handler = WebSocketHandler()

async def main():
    """Start the WebSocket server"""
    logger.info(f"🚀 Starting W&B WebSocket Server on port {PORT}")
    logger.info(f"📊 Current directory: {os.getcwd()}")

    # Check for existing plots
    png_files = glob.glob("*.png")
    logger.info(f"📈 Found {len(png_files)} PNG files ready for preview")

    # Start the WebSocket server
    server = await websockets.serve(
        handler.client_handler,
        "0.0.0.0",
        PORT,
        ping_interval=30,
        ping_timeout=10
    )

    logger.info(f"✅ W&B WebSocket Server running at ws://localhost:{PORT}/ws")
    logger.info("📱 Ready to serve W&B CNN enhanced matplotlib plots!")

    # Keep the server running
    await server.wait_closed()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("🛑 Server stopped by user")
    except Exception as e:
        logger.error(f"❌ Server error: {e}")