'use strict';

var utils = require('lazy-cache')(require);
var fn = require;
require = utils;

/**
 * Lazily required module dependencies
 */

require('define-property', 'define');
require('isobject', 'isObject');
require('is-valid-app', 'isValid');
require('mixin-deep', 'merge');
require('parser-front-matter', 'matter');
require = fn;

/**
 * Expose `utils` modules
 */

module.exports = utils;
