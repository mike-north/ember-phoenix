/* eslint-env node */
'use strict';

const fastbootTransform = require('fastboot-transform');
const Funnel = require('broccoli-funnel');
const Merge = require('broccoli-merge-trees');

module.exports = {
  name: 'phoenix',

  included() {
    this._super.included.apply(this, arguments);

    this.import('vendor/phoenix.js');
  },

  treeForVendor(tree) {
    let trees = [];

    if (tree) {
      trees.push(tree);
    }

    let phoenixTree = fastbootTransform(new Funnel('vendor', {
      files: ['phoenix.js'],
      destDir: 'phoenix'
    }));

    trees.push(phoenixTree);

    return new Merge(trees);
  }
};
