# serverless-package-plugin

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

This plugin adds function packaging to Serverless 0.5.x.

## Overview
The plugin lets you package your functions without the need to deploy.

## Installation

1. Install the plugin module.

   `npm install serverless-package-plugin` will install the latest version of the plugin.

   If you want to debug, you also can reference the source repository at a specific version or branch
   with `npm install https://github.com/HyperBrain/serverless-package-plugin#<tag or branch name>`

2. Activate the plugin in your Serverless project.

   Add `serverless-package-plugin` to the plugins array in your `s-project.json`.
   ```
   {
     "name": "testp1",
     "custom": {},
     "plugins": [
       "serverless-package-plugin"
     ]
   }
   ```

## Usage

### Commands
The plugin adds some new commands to Serverless: `serverless package XXXXXX`

#### create
Creates the packaged functions. The function runtime will be used, so any standard
runtime (nodejs, nodejs4.3, python) and 3rd party runtimes (babel) and all plugins
are supported (serverless-optimizer-plugin).
The options are the same as with `function deploy` with the exception of the -t switch.

## Releases

### 1.0.2
* Bug #3: Function names cannot be specified

### 1.0.1
* Trigger installed plugins on packaging

### 1.0.0
* Initial release
