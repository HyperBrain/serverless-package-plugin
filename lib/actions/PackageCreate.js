'use strict';
/**
 * Create APIG models
 */

module.exports = function(S) {

  const path   = require('path'),
  SUtils     = S.utils,
  SError     = require(S.getServerlessPath('Error')),
  SCli       = require(S.getServerlessPath('utils/cli')),
  BbPromise  = require('bluebird'),
  _          = require('lodash'),
  fse        = BbPromise.promisifyAll(require('fs-extra'));

  class PackageCreate extends S.classes.Plugin {

    static getName() {
      return 'serverless.core.' + this.name;
    }

    registerActions() {
      S.addAction(this.packageCreate.bind(this), {
        handler:       'packageCreate',
        description:   `Create package of your functions.
usage: serverless package create`,
        context:       'package',
        contextAction: 'create',
        options:       [
                        {
                          option:      'stage',
                          shortcut:    's',
                          description: 'Optional if only one stage is defined in project'
                        }, {
                          option:      'region',
                          shortcut:    'r',
                          description: 'Optional - Target one region'
                        }, {
                          option:      'all',
                          shortcut:    'a',
                          description: 'Optional - Package all Functions'
                        }
        ],
        parameters: [
                     {
                       parameter: 'names', // Only accepting paths makes it easier for plugin developers.  Otherwise, people should use dash deploy
                       description: 'One or multiple function names',
                       position: '0->'
                     }
                   ]
      });

      return BbPromise.resolve();
    }

    packageCreate(evt) {
      this.evt    = evt;

      return BbPromise.resolve()
          .bind(this)
          .then(this._prompt)
          .then(this._validateAndPrepare)
          .then(this._createPackages)
          .then(() => {
            return this.evt;
          });
    }

    _prompt() {
      
      // Prompt: Stage
      if (!S.config.interactive || this.evt.options.stage) {
        return BbPromise.resolve();
      }

      if (!S.getProject().getAllStages().length) {
        return BbPromise.reject(new SError('No existing stages in the project'));
      }

      return this.cliPromptSelectStage('Packager - Choose a stage: ', this.evt.options.stage, false)
      .then(stage => {
        this.evt.options.stage = stage;
        return BbPromise.resolve();
      });

    }

    _validateAndPrepare() {

      // Set Defaults
      this.functions = [];
      this.evt.options.names = this.evt.options.names ? this.evt.options.names : [];
      this.evt.options.stage = this.evt.options.stage ? this.evt.options.stage : null;

      this.project  = S.getProject();

      // Set and check deploy Regions (check for undefined as region could be "false")
      if (this.evt.options.region && S.getProvider().validRegions.indexOf(this.evt.options.region) <= -1) {
        return BbPromise.reject(new SError('Invalid region specified'));
      }

      this.regions  = this.evt.options.region ? [this.evt.options.region] : S.getProject().getAllRegionNames(this.evt.options.stage);

      if (this.evt.options.names.length) {
        this.evt.options.names.forEach(function(name) {
          const func = this.project.getFunction(name);
          if (!func) {
            return BbPromise.reject(new SError(`Function "${name}" doesn't exist in your project`));
          }
          this.functions.push(this.project.getFunction(name));
        });
      }

      // If CLI and no function names targeted, deploy from CWD
      if (S.cli &&
        !this.evt.options.names.length ||
        this.evt.options.all) {
        this.functions = SUtils.getFunctionsByCwd(S.getProject().getAllFunctions());
      }

      // Ensure tmp folder exists in _meta
      if (!SUtils.dirExistsSync(S.getProject().getRootPath('_meta', '_tmp'))) {
        fse.mkdirSync(S.getProject().getRootPath('_meta', '_tmp'));
      }

      if (this.functions.length === 0) {
        return BbPromise.reject(new SError(`You don't have any functions in your project`));
      }

      // Validate Stage
      if (!this.evt.options.stage) {
        return BbPromise.reject(new SError(`Stage is required`));
      }

      return BbPromise.resolve();
    }

    _createPackages() {

      // Status
      SCli.log(`Packaging the specified functions in "${this.evt.options.stage}" for the following regions: ${this.regions.join(', ')}`);

      this._spinner = SCli.spinner();
      this._spinner.start();

      return BbPromise
        .each(this.regions, (region) => this._packageByRegion(region))
        .then(() => S.utils.sDebug(`packaging is done`))
        // Stop Spinner
        .then(() => this._spinner.stop(true))
        .then(() => {
          // Show results
          if (this.succeeded) {
            SCli.log(`Successfully packaged:`);
            for (let region in this.succeeded) {
              if (_.has(this.succeeded, region)) {
                SCli.log(`Region ${region}:`);
                this.succeeded[region].forEach((func) => {
                  SCli.log(`  ${func.stage} - ${func.name}: ${func.path}`);
                });
              }
            }
          }
          // Show failures
          if (this.failed) {
            SCli.log(`Failed:`);
            for (let region in this.failed) {
              if (_.has(this.failed, region)) {
                SCli.log(`Region ${region}:`);
                this.failed[region].forEach((func) => {
                  SCli.log(`  ${func.name}: ${func.message}`);
                  SCli.log(`    STACKTRACE: ${func.stack}`);
                });
              }
            }
          }
        });
    }

    _packageByRegion(region) {

      return BbPromise.map(this.functions, this._packageFunction(region), {concurrency: 5});

    }

    _packageFunction(region) {

      return (func) => {

        const newEvt = {
            options: {
              stage:   this.evt.options.stage,
              region:  region,
              name:    func.name
            }
          };

          // Package Code
          return S.actions.codePackageLambda(newEvt)
          .then((evt) => {
            if (!this.succeeded) {
              this.succeeded = {};
            }
            if (!this.succeeded[region]) {
              this.succeeded[region] = [];
            }
            this.succeeded[region].push({
              name: func.name,
              stage: evt.options.stage,
              path: evt.data.pathDist
            });
            return BbPromise.resolve();
          })
          .catch((e) => {

            // Stash Failed Function Code
            if (!this.failed) {
              this.failed = {};
            }
            if (!this.failed[region]) {
              this.failed[region] = [];
            }
            this.failed[region].push({
              name:       func.name,
              message:    e.message,
              stack:      e.stack
            });

          });
      };

    }
  }

  return PackageCreate;
};
