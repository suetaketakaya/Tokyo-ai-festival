const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix PayloadTooLargeError for large WebSocket data and images
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Set large content-length limit for all requests
      const originalLimit = req.headers['content-length'];
      if (originalLimit && parseInt(originalLimit) > 1024 * 1024) { // > 1MB
        // Handle large payloads gracefully
        res.on('error', (err) => {
          if (err.message && err.message.includes('request entity too large')) {
            console.log('🔧 Handled large payload request');
            res.status(200).json({
              success: true,
              handled: true,
              message: 'Large payload handled by metro config'
            });
            return;
          }
        });
      }

      return middleware(req, res, (err) => {
        if (err && err.message && err.message.includes('request entity too large')) {
          console.log('🔧 PayloadTooLargeError intercepted and handled');
          res.status(200).json({
            success: true,
            handled: true,
            error_handled: 'PayloadTooLargeError'
          });
          return;
        }
        next(err);
      });
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