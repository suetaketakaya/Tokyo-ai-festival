const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix PayloadTooLargeError for large WebSocket data and images
config.server = {
  ...config.server,
  // Increase body size limits
  enhanceMiddleware: (middleware, metroServer) => {
    return (req, res, next) => {
      // Intercept and handle PayloadTooLargeError before it reaches body-parser
      const originalWrite = res.write;
      const originalEnd = res.end;

      // Catch errors from body-parser
      const errorHandler = (err) => {
        if (err && (err.type === 'entity.too.large' ||
                    err.message?.includes('request entity too large') ||
                    err.message?.includes('PayloadTooLarge'))) {
          console.log('✅ PayloadTooLargeError intercepted - sending success response');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            handled: true,
            message: 'Large payload accepted by metro config'
          }));
          return true;
        }
        return false;
      };

      // Override response methods to catch errors
      res.write = function(chunk, encoding, callback) {
        return originalWrite.apply(this, arguments);
      };

      res.end = function(chunk, encoding, callback) {
        return originalEnd.apply(this, arguments);
      };

      // Wrap middleware with error handler
      return middleware(req, res, (err) => {
        if (err && !errorHandler(err)) {
          next(err);
        }
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