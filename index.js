/* eslint-env node */
'use strict';

const Path = require('path');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');

function isNotFastBoot() {
  return typeof FastBoot === 'undefined';
}

module.exports = {
  name: 'phoenix',

  treeForAddon(tree) {
    if (isNotFastBoot()) {
      tree = this.addPhoenixToTree(tree);
    }

    return this._super.treeForAddon.call(this, tree);
  },

  addPhoenixToTree(tree) {
    let phoenixPath = Path.join(this.project.nodeModulesPath, 'phoenix');

    let phoenixTree = new Funnel(phoenixPath, {
      files: ['web/static/js/phoenix.js'],
      getDestinationPath(relativePath) {
        if (relativePath.indexOf('phoenix.js') > -1) {
          return 'index.js';
        }
      }
    });

    return new MergeTrees([tree, phoenixTree]);
  }
};
