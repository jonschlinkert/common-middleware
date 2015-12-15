'use strict';

require('mocha');
var assert = require('assert');
var assemble = require('assemble-core');
var middleware = require('./');
var app;

describe('middleware', function() {
  beforeEach(function() {
    app = assemble();
    app.use(middleware({
      escapeRegex: /\.(md|tmpl|foo)$/
    }));

    app.engine(['tmpl', 'foo'], require('engine-base'));
    app.engine('md', require('engine-base'), {
      delims: ['{%', '%}']
    });

    app.create('pages');
    app.page('one.md', {
      content: 'a {%= name %} b {%%= foo %} c'
    });
    app.page('yfm.md', {
      content: '---\ntitle: YFM\n---\n{%= title %}'
    });
    app.page('two.tmpl', {
      content: 'a <%= name %> b <%%= foo %> c'
    });
    app.page('three.foo', {
      content: 'a <%= name %> b <%%= foo %> c'
    });
  });

  it('should register onLoad middleware:', function() {
    var page = app.pages.getView('one.md');
    assert(page.options.handled[0] === 'onLoad');
  });

  it('should parse front-matter:', function() {
    var page = app.pages.getView('yfm.md');
    assert.equal(page.data.title, 'YFM');
  });

  // test getter
  it('should create a json property on json files:', function() {
    var page = app.page('name.json', {
      content: '{"name": "Halle Schlinkert"}'
    });
    assert(page.json);
    assert.equal(typeof page.json, 'object');
    assert.equal(page.json.name, 'Halle Schlinkert');
  });

  // test setter
  it('should update json before preWrite', function() {
    var page = app.page('name.json', {
      content: '{"name": "Halle Schlinkert"}'
    });
    assert.equal(page.json.name, 'Halle Schlinkert');
    page.json.name = 'Brooke Schlinkert';
    app.handle('preWrite', page);
    assert.equal(page.content, '{\n' +
      '  "name": "Brooke Schlinkert"\n' +
    '}\n');
  });

  it('should update json file content on preWrite:', function() {
    var page = app.page('name.json', {
      content: '{"name": "Brooke Schlinkert"}'
    });
    page.json.description = '2 yr old';
    app.handle('preWrite', page);
    assert.equal(page.content, '{\n' +
      '  "name": "Brooke Schlinkert",\n' +
      '  "description": "2 yr old"\n' +
    '}\n');
  });

  it('should allow a configName to be defined on file.json', function() {
    var page = app.page('name.json', {
      content: '{"name": "Halle Schlinkert"}'
    });
    assert(page.json);
    assert.equal(typeof page.json, 'object');
    assert.equal(page.json.name, 'Halle Schlinkert');
  });

  it('should escape curly brace delimiters:', function(cb) {
    var page = app.pages.getView('one.md');
    page.render({name: 'Brooke'}, function(err, res) {
      assert(!err);
      assert.equal(res.content, 'a Brooke b {%= foo %} c');
      cb();
    });
  });

  it('should escape angle bracket delimiters:', function(cb) {
    var page = app.pages.getView('two.tmpl');
    page.render({name: 'Brooke'}, function(err, res) {
      assert(!err);
      assert.equal(res.content, 'a Brooke b <%= foo %> c');
      cb();
    });
  });

  it('should use custom file extension regex:', function(cb) {
    var page = app.pages.getView('three.foo');
    page.render({name: 'Brooke'}, function(err, res) {
      assert(!err);
      assert.equal(res.content, 'a Brooke b <%= foo %> c');
      cb();
    });
  });
});

describe('json config', function() {
  beforeEach(function() {
    app = assemble();
    app.use(middleware({
      escapeRegex: /\.(md|tmpl|foo)$/,
      configName: 'fake'
    }));

    app.engine(['tmpl', 'foo', 'json'], require('engine-base'));
    app.engine('md', require('engine-base'), {
      delims: ['{%', '%}']
    });

    app.create('pages');
    app.page('one.md', {
      content: 'a {%= name %} b {%%= foo %} c'
    });
    app.page('yfm.md', {
      content: '---\ntitle: YFM\n---\n{%= title %}'
    });
    app.page('two.tmpl', {
      content: 'a <%= name %> b <%%= foo %> c'
    });
    app.page('three.foo', {
      content: 'a <%= name %> b <%%= foo %> c'
    });
  });

  it('should allow a configName to be defined on file.json', function() {
    var pkg = require('./package.json');
    pkg.fake = {};

    var page = app.page('package.json', {
      content: JSON.stringify(pkg)
    });

    assert(page.json.fake);
    assert.equal(typeof page.json.fake, 'object');
  });

  it('should update app.data with file.json.data', function() {
    var pkg = require('./package.json');
    pkg.fake = {};
    pkg.fake.data = {foo: 'bar'};

    var page = app.page('package.json', {
      content: JSON.stringify(pkg)
    });

    assert(app.cache.data.foo === undefined);

    assert(page.json);
    assert(app.cache.data.foo === 'bar');

    page.json.fake.data.bar = 'baz';

    assert(page.json);
    assert(app.cache.data.bar === 'baz');
  });

  it('should update app.cache.data on preRender', function(cb) {
    var pkg = require('./package.json');
    pkg.fake = {};
    pkg.fake.data = {};

    assert(app.cache.data.foo === undefined);

    app.onLoad(/./, function(view, next) {
      view.json.fake.data.foo = 'bar';
      view.json.fake.data.bar = 'baz';
      assert(app.cache.data.foo === undefined);
      assert(app.cache.data.bar === undefined);
      next();
    });

    var page = app.page('package.json', {
      content: JSON.stringify(pkg)
    });

    app.preRender(/./, function(view, next) {
      assert(app.cache.data.foo === 'bar');
      assert(app.cache.data.bar === 'baz');
      next();
    });

    app.postRender(/./, function(view, next) {
      assert(app.cache.data.foo === 'bar');
      assert(app.cache.data.bar === 'baz');
      next();
    });

    app.render('package.json', function(err, res) {
      if (err) return cb(err);
      assert(app.cache.data.foo === 'bar');
      assert(app.cache.data.bar === 'baz');
      cb();
    });
  });
});
