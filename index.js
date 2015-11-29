/*!
 * common-middleware <https://github.com/jonschlinkert/common-middleware>
 *
 * Copyright (c) 2015, Jon Schlinkert.
 * Licensed under the MIT License.
 */

'use strict';

var utils = require('./utils');

module.exports = function(options) {
  return function plugin(app) {
    if (typeof app.handler !== 'function') {
      throw new TypeError('common-middleware expects the base-routes plugin to be registered');
    }

    if (typeof this.preWrite !== 'function') {
      this.handler('preWrite');
    }

    var opts = utils.extend({}, app.options, options);
    var jsonRegex = opts.jsonRegex || /\.(json|jshintrc)$/;
    var extRegex = opts.extRegex || /\.(md|tmpl)$/;

    /**
     * Parse front-matter. Adds the data object to `file.data`,
     * which is passed to templates as context at render time.
     */

    app.onLoad(extRegex, function(file, next) {
      utils.matter.parse(file, next);
    });

    /**
     * Uses C-style-ish macros to escape templates with `{%%= foo %}` or
     * `<%%= foo %>` syntax
     */

    app.onLoad(extRegex, function(file, next) {
      file.content = file.content.replace(/([{<])%%=/, '__ESC_$1DELIM__');
      next();
    });

    app.postRender(extRegex, function(file, next) {
      file.content = file.content.replace(/__ESC_(.)DELIM__/, '$1%=');
      next();
    });

    /**
     * Add a `json` property to the file object as a convenience for
     * updating json files.
     */

    app.onLoad(jsonRegex, function(file, next) {
      file.json = JSON.parse(file.content);
      next();
    });

    /**
     * Update the `file.content` property with stringified JSON
     * before writing the file back to the file system.
     */

    app.preWrite(jsonRegex, function(file, next) {
      file.content = JSON.stringify(file.json, null, 2);
      next();
    });

    /**
     * Return the plugin function if the instance is not a
     * collection or view
     */

    if (app.isApp) {
      return plugin;
    }
  };
};
