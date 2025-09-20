const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix PayloadTooLargeError for large WebSocket data and images
config.server = {
  ...config.server,
  // Increase body parser limit for large payloads (base64 images, etc.)
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Set larger limits for JSON payloads (default: 1mb -> 50mb)
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
        req.headers['content-length'] = Math.min(req.headers['content-length'] || 0, 50 * 1024 * 1024);
      }
      return middleware(req, res, next);
    };
  },
};

// Increase resolver limits
config.resolver = {
  ...config.resolver,
  // Add additional asset extensions for preview functionality
  assetExts: [...config.resolver.assetExts, 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
};

module.exports = config;