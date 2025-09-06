#!/bin/bash

# RemoteClaude Server DMG Creation Script

set -e

APP_NAME="RemoteClaudeServer"
APP_VERSION="3.5.0"
DMG_NAME="RemoteClaude-Server-v${APP_VERSION}"
SOURCE_FOLDER="dist/${APP_NAME}.app"
DMG_FOLDER="dmg_temp"
FINAL_DMG="${DMG_NAME}.dmg"

echo "🚀 Creating DMG for RemoteClaude Server v${APP_VERSION}..."

# Clean up any existing temp folder and DMG
rm -rf "${DMG_FOLDER}"
rm -f "${FINAL_DMG}"

# Create temporary DMG folder
mkdir -p "${DMG_FOLDER}"

# Copy app bundle to DMG folder
echo "📦 Copying application bundle..."
cp -R "${SOURCE_FOLDER}" "${DMG_FOLDER}/"

# Create Applications symlink
echo "🔗 Creating Applications symlink..."
ln -s /Applications "${DMG_FOLDER}/Applications"

# Copy README and other documentation
echo "📄 Adding documentation..."
cp README.md "${DMG_FOLDER}/README.txt" 2>/dev/null || echo "README.md not found, skipping..."

# Create install instructions
cat > "${DMG_FOLDER}/Install Instructions.txt" << EOF
RemoteClaude Server v${APP_VERSION} Installation

1. Drag RemoteClaudeServer.app to the Applications folder
2. Open Terminal and install dependencies:
   - Install Docker Desktop from https://docker.com
   - Install Go: brew install go
   - Install Claude CLI: curl -fsSL https://claude.ai/install.sh | sh

3. Launch RemoteClaudeServer from Applications folder
4. The server will start on port 8090 by default
5. Use the mobile app to scan the QR code or connect manually

For detailed setup instructions, visit:
https://github.com/your-repo/remote_manual

Support: Create an issue at https://github.com/your-repo/remote_manual/issues
EOF

# Set permissions
echo "🔐 Setting permissions..."
chmod +x "${DMG_FOLDER}/${APP_NAME}.app/Contents/MacOS/remoteclaude-server"

# Create DMG
echo "💿 Creating DMG image..."
hdiutil create -volname "${DMG_NAME}" -srcfolder "${DMG_FOLDER}" -ov -format UDZO "${FINAL_DMG}"

# Clean up temp folder
rm -rf "${DMG_FOLDER}"

echo "✅ DMG created successfully: ${FINAL_DMG}"
echo "📊 DMG size:"
ls -lh "${FINAL_DMG}"

echo ""
echo "🎉 RemoteClaude Server DMG is ready for distribution!"
echo "📁 Location: $(pwd)/${FINAL_DMG}"