'use strict';

const fs = require('fs');
const resolve = require('path').resolve;
const requirejs = require('requirejs');
const test = require('tape');

const CONFIG = {
  nodeRequire: require,

  baseUrl: __dirname,
  name: 'program',
  out: resolve(__dirname, 'build.js'),

  packages: [{
    name: 'template',
    location: '../',
    main: 'index'
  }, {
    name: 'text',
    location: '../node_modules/text',
    main: 'text'
  }, {
    name: 'mustache',
    location: '../node_modules/mustache',
    main: 'mustache'
  }],

  paths: {
    templates: 'fixtures'
  },

  mustache: {
    resolve: file => `fixtures/${ file }.mustache`
  }
};

requirejs.config(CONFIG);

requirejs(['template!fixtures/main.mustache'], template => {
  test('template renders', assert => {
    assert.equal(template().replace(/\n/g, ''), 'Hello !');
    assert.end();
  });

  test('template has partials', assert => {
    assert.equal(
      template({ name: 'brave new world' }).replace(/\n/g, ''),
      'Hello brave new world!');
    assert.end();
  });

  test('partials are resolved recursively', assert => {
    assert.equal(
      template({ name: 'brave new world', important: true }).replace(/\n/g, ''),
      'Hello brave new world!!!');
    assert.end();
  });
});

test('it builds', assert => {
  requirejs.optimize(CONFIG,
    () => {
      fs.readFile(CONFIG.out, 'utf8', function (err, contents) {
        if (err) { assert.fail(err); }

        [
          'template!fixtures/main.mustache',
          'template!fixtures/partial.mustache',
          'template!fixtures/exclamation.mustache'
        ].forEach(str => {
          assert.ok(
            contents.indexOf(str) !== -1,
            `"${ str.match(/\/(.+)\.[mustache]+/)[1] }" in build`);
        });

        assert.end();
      });
    },
    err => assert.fail(err));
});
