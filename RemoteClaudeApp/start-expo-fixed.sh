#!/bin/bash
# Start Expo with increased payload size limits

export NODE_OPTIONS="--max-http-header-size=80000"
export EXPO_NO_BODY_PARSER_LIMIT=true

# Kill any existing Expo processes
pkill -f "expo start" 2>/dev/null || true
pkill -f "react-native" 2>/dev/null || true

# Clear Metro cache
npx expo start --clear

echo "✅ Expo started with PayloadTooLargeError fix"
