'use strict';

/**
 * Serverless Package Plugin
 */

module.exports = function(S) {

  const path       = require('path'),
        SUtils     = S.utils,
        SError     = require(S.getServerlessPath('Error')),
        SCli       = require(S.getServerlessPath('utils/cli')),
        _          = require('lodash'),
        BbPromise  = require('bluebird');

  /**
   * Action instantiation. Used to resemble the SLS core layout to
   * make it easy to integrate into core later.
   */
  let Package = require('./lib/actions/Package')(S);
  Package = new Package();

  /**
   * ServerlessModel
   */

  class ServerlessPackage extends S.classes.Plugin {

    /**
     * Constructor
     */

    constructor() {
      super();
    }

    /**
     * Define your plugins name
     */

    static getName() {
      return 'com.serverless.' + ServerlessPackage.name;
    }

    /**
     * Register Actions
     */

    registerActions() {

      return BbPromise.join(
          Package.registerActions()
          );

    }

    /**
     * Register Hooks
     */

    registerHooks() {

      return BbPromise.resolve();

    }

  }

  return ServerlessPackage;
};
