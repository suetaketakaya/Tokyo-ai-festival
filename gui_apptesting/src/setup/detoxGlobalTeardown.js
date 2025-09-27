/**
 * Detox Global Teardown
 */

const detox = require('detox');

module.exports = async function() {
  await detox.globalCleanup();
};