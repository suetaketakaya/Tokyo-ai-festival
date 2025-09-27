/**
 * Web Test Global Teardown
 */

module.exports = async function() {
  console.log('Tearing down web test environment...');

  // Could include cleanup for web server if needed

  console.log('Web test environment teardown completed');
};