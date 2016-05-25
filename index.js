/* jshint node: true */
'use strict';
var esTranspiler = require('broccoli-babel-transpiler');
var BroccoliMergeTrees = require('broccoli-merge-trees');

module.exports = {
  name: 'phoenix',

  included: function(app) {
    this._super.included(app);
    if (process.env.EMBER_CLI_FASTBOOT !== 'true') {
      app.import('vendor/phoenix.js');
    }
  }
};
