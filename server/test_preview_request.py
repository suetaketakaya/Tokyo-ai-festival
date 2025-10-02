#!/usr/bin/env python3
"""
Preview機能テスト用スクリプト
サーバーのプレビュー応答をテストする
"""

import websocket
import json
import time

def test_preview_functionality():
    """プレビュー機能をテストする"""

    # WebSocket接続
    uri = "ws://192.168.0.135:8092/ws?key=3e7b4ef657fdd7efa9d78e8d5359e575"

    print("🔍 Testing preview functionality...")
    print(f"📡 Connecting to: {uri}")

    try:
        ws = websocket.create_connection(uri)
        print("✅ WebSocket connection established")

        # プレビューリクエストを送信
        preview_request = {
            "type": "preview_list_request",
            "data": {
                "project_id": "default",
                "request_type": "list"
            }
        }

        # 最初の接続確立メッセージを受信
        print("📨 Waiting for connection_established...")
        response = ws.recv()
        print(f"📨 Received connection_established: {response}")

        print("📤 Sending preview request...")
        ws.send(json.dumps(preview_request))

        # プレビュー応答を待機
        print("📨 Waiting for preview response...")
        preview_response = ws.recv()
        print(f"📨 Received preview response: {preview_response}")

        # JSON パース
        try:
            data = json.loads(preview_response)
            print("✅ Preview response parsed successfully:")
            print(json.dumps(data, indent=2))
        except json.JSONDecodeError:
            print("❌ Failed to parse JSON response")

        ws.close()
        print("🔚 Connection closed")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_preview_functionality()