/*!
 * common-middleware <https://github.com/jonschlinkert/common-middleware>
 *
 * Copyright (c) 2015, Jon Schlinkert.
 * Licensed under the MIT License.
 */

'use strict';

var utils = require('./utils');

module.exports = function(options) {
  options = options || {};

  return function plugin(app) {
    if (this.isView || this.isItem) return;
    if (this.option('common-middleware') === false) return;
    if (typeof this.handler !== 'function') return;

    this.emit('plugin', 'common-middleware', this);

    // we'll assume none of them exist if `onStream` is not registered
    if (typeof this.onStream !== 'function') {
      this.handler('onStream');
      this.handler('preWrite');
      this.handler('postWrite');
    }

    var opts = utils.merge({}, this.options, options);
    var jsonRegex = opts.jsonRegex || /\.(json|jshintrc)$/;
    var extRegex = opts.extRegex || /./;
    var escapeRegex = opts.escapeRegex || /./;

    /**
     * Parses front-matter on files that match `options.extRegex` and
     * adds the resulting data object to `file.data`. This object is
     * passed as context to the template engine at render time.
     *
     * @name front matter
     * @api public
     */

    this.onLoad(extRegex, function(file, next) {
      utils.matter.parse(file, next);
    });

    /**
     * Uses C-style macros to escape templates with `{%%= foo %}` or
     * `<%%= foo %>` syntax, so they will not be evaluated by a template
     * engine when `.render` is called.
     *
     * @name escape templates
     * @api public
     */

    this.onLoad(escapeRegex, function(file, next) {
      file.content = file.content.split('{%% body %}').join('__BODY_TAG__');
      file.content = file.content.replace(/([{<])%%=/g, '__ESC_$1DELIM__');
      next();
    });

    this.postRender(escapeRegex, function(file, next) {
      file.content = file.content.split('__BODY_TAG__').join('{% body %}');
      file.content = file.content.replace(/__ESC_(.)DELIM__/g, '$1%=');
      next();
    });

    /**
     * Adds a `json` property to the `file` object when the file extension
     * matches `options.jsonRegex`. This allows JSON files to be updated
     * by other middleware or pipeline plugins without having to parse and
     * stringify with each modification.
     *
     * @name JSON on-load
     * @api public
     */

    this.onLoad(jsonRegex, function(file, next) {
      utils.define(file, 'originalContent', file.content);
      var json;

      Object.defineProperty(file, 'json', {
        configurable: true,
        enumerable: true,
        set: function(val) {
          json = val;
        },
        get: function() {
          if (!json) json = JSON.parse(file.content);
          if (opts.configName && json.hasOwnProperty(opts.configName)) {
            var config = json[opts.configName];
            if (config && config.data) {
              app.cache.data = utils.merge({}, app.cache.data, config.data);
            }
          }
          return json;
        }
      });

      next();
    });

    /**
     * Updates the `file.content` property with stringified JSON
     * before writing the file back to the file system.
     *
     * @name JSON pre-write
     * @api public
     */

    this.preWrite(jsonRegex, function(file, next) {
      if (file.content !== file.originalContent) {
        return next();
      }

      file.content = JSON.stringify(file.json, null, 2) + '\n';
      next();
    });

    return plugin;
  };
};
