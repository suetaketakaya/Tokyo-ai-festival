/**
 * Detox Global Setup
 */

const detox = require('detox');

module.exports = async function() {
  await detox.globalInit();
};