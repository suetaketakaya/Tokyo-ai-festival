#!/bin/bash

# WebSocketServiceをEnhancedWebSocketServiceに置換するスクリプト

echo "🔧 Updating WebSocket imports to Enhanced version..."

files=(
    "./App.tsx"
    "./src/screens/QuickCommandsScreen.tsx"
    "./src/screens/EnhancedPreviewScreen.tsx"
    "./src/screens/ConfigurationScreen.tsx"
    "./src/screens/PreviewScreen.tsx"
    "./src/screens/QuickCommandsScreen_improved.tsx"
    "./src/screens/ProjectListScreen.tsx"
    "./src/screens/DevelopmentScreen_improved.tsx"
    "./src/screens/DetailedSettingsScreen.tsx"
)

for file in "${files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "📝 Updating $file..."

        # Import statement update
        sed -i '' 's/import WebSocketService from/import EnhancedWebSocketService from/g' "$file"
        sed -i '' 's/..\/services\/WebSocketService/..\/services\/EnhancedWebSocketService/g' "$file"

        # Usage updates
        sed -i '' 's/WebSocketService\./EnhancedWebSocketService\./g' "$file"
        sed -i '' 's/WebSocketService\.connect/EnhancedWebSocketService\.connect/g' "$file"
        sed -i '' 's/WebSocketService\.send/EnhancedWebSocketService\.send/g' "$file"
        sed -i '' 's/WebSocketService\.disconnect/EnhancedWebSocketService\.disconnect/g' "$file"
        sed -i '' 's/WebSocketService\.getDebugInfo/EnhancedWebSocketService\.getDetailedDebugInfo/g' "$file"

        echo "✅ Updated $file"
    else
        echo "⚠️  File not found: $file"
    fi
done

echo "🎉 WebSocket imports update completed!"