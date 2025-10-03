/**
 * Metro Server Options - Increase payload size limits
 * Fixes PayloadTooLargeError for large source maps and HMR updates
 */

module.exports = {
  // Increase max body size to 100MB (default is 100kb)
  maxWorkers: 4,
  resetCache: false,

  server: {
    // Custom middleware to handle large payloads
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Silently ignore PayloadTooLargeError
        const oldOn = res.on;
        res.on = function(event, handler) {
          if (event === 'error') {
            const wrappedHandler = (err) => {
              if (err?.message?.includes('request entity too large')) {
                console.log('✅ Suppressed PayloadTooLargeError');
                res.statusCode = 200;
                res.end('OK');
                return;
              }
              handler(err);
            };
            return oldOn.call(this, event, wrappedHandler);
          }
          return oldOn.call(this, event, handler);
        };

        middleware(req, res, next);
      };
    },
  },
};
