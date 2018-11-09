/* eslint-env node */
'use strict';

const path = require('path');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');

module.exports = {
  name: require('./package').name,

  treeForAddon(tree) {
    return this._super.treeForAddon.call(this, this.addPhoenixToTree(tree));
  },
  addPhoenixToTree(tree) {
    let phoenixPath = path.join(require.resolve('phoenix'), '..');
    let phoenixTree = new Funnel(phoenixPath, {
      files: ['phoenix.js'],
      getDestinationPath(relativePath) {
        if (relativePath.indexOf('phoenix.js') > -1) {
          return 'index.js';
        }
      }
    });
    return new MergeTrees([tree, phoenixTree]);
  }
};
