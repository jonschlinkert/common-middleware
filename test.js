'use strict';

require('mocha');
var assert = require('assert');
var assemble = require('assemble-core');
var middleware = require('./');
var app;

describe('middleware', function () {
  beforeEach(function () {
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

  it('should register onLoad middleware:', function () {
    var page = app.pages.getView('one.md');
    assert(page.options.handled[0] === 'onLoad');
  });

  it('should parse front-matter:', function () {
    var page = app.pages.getView('yfm.md');
    assert.equal(page.data.title, 'YFM');
  });

  it('should create a json property on json files:', function () {
    var page = app.page('name.json', {
      content: '{"name": "Halle Schlinkert"}'
    });
    assert(page.json);
    assert.equal(typeof page.json, 'object');
    assert.equal(page.json.name, 'Halle Schlinkert');
  });

  it('should update json file content on preWrite:', function () {
    var page = app.page('name.json', {
      content: '{"name": "Brooke Schlinkert"}'
    });
    page.json.description = '2 yr old';
    app.handle('preWrite', page);
    assert.equal(page.content, '{\n' +
      '  "name": "Brooke Schlinkert",\n' +
      '  "description": "2 yr old"\n' +
    '}');
  });

  it('should escape curly brace delimiters:', function (cb) {
    var page = app.pages.getView('one.md');
    page.render({name: 'Brooke'}, function(err, res) {
      assert(!err);
      assert.equal(res.content, 'a Brooke b {%= foo %} c');
      cb();
    });
  });

  it('should escape angle bracket delimiters:', function (cb) {
    var page = app.pages.getView('two.tmpl');
    page.render({name: 'Brooke'}, function(err, res) {
      assert(!err);
      assert.equal(res.content, 'a Brooke b <%= foo %> c');
      cb();
    });
  });

  it('should use custom file extension regex:', function (cb) {
    var page = app.pages.getView('three.foo');
    page.render({name: 'Brooke'}, function(err, res) {
      assert(!err);
      assert.equal(res.content, 'a Brooke b <%= foo %> c');
      cb();
    });
  });
});
