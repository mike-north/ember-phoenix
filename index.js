/* eslint-env node */
'use strict';

module.exports = {
  name: 'phoenix',

  included: function(app) {
    this._super.included(app);
    if (process.env.EMBER_CLI_FASTBOOT !== 'true') {
      app.import('vendor/phoenix.js');
    } else {
      app.import('vendor/phoenix-stub.js');
    }
  }
};
