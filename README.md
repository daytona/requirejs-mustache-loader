# requirejs-mustache-loader

> Load Mustache templates dynamically, compile during build and auto resolve partials

The biggest itch while working with Mustache (and many other front-end template engines) is the need to statically declare partials when rendering a template. Adding a partial in some template requires that you also import it to your JavaScript module and declare it as a partial.

With this plugin for [RequireJS](http://requirejs.org) none of that is necessary, instead, this is possible:

```mustache
{{! index.mustache }}
Hello {{> ./name.mustache }}!
```

```mustache
{{! name.mustache }}
<strong>{{ name }}</strong>
```

```javascript
// app.js
define(['template!index.mustache'], template => {
  template({ name: 'brave new world' }); // -> "Hello <strong>brave new world</strong>!"
});
```

## Installation

The package can be installed via [npm](https://www.npmjs.com) and [Bower](http://bower.io).

```
$ npm install --save requirejs-mustache-loader
```

```
$ bower install requirejs-mustache-loader
```

## Resolving file names

For resolving file paths, a method called `resolve`, can be supplied using `require.config`. The `resolve` method is called when transforming partial names as defined in templates to a file path.

```javascript
require.config({
  packages: [{
    name: 'template',
    location: 'node_modules/requirejs-mustache-loader',
    main: 'index'
  }, {
    name: 'mustache',
    location: 'node_modules/mustache',
    main: 'mustache'
  }, {
    name: 'text',
    location: 'node_modules/text',
    main: 'text'
  }],

  paths: {
    templates: 'path/to/templates'
  },

  mustache: {
    resolve: function (name) {
      return 'templates/' + name + '.mustache';
    }
  }
});
```

## Member properties

Apart from just the render method, also the bare template string and all partials are exposed to the template function.

```javascript
require(['template!index.mustache'], function (template) {
  template.text; // Hello {{> ./name.mustache }}!
  template.partials; // { './name.mustache': '<strong>{{ name }}</strong>' }
  template({ name: 'world' }); // Hello world!
});
```

## Regarding peer dependencies

This plugin depends on the RequireJS [text plugin](https://github.com/requirejs/text) available under the `text` namespace and [mustache](https://github.com/janl/mustache.js) available under the `mustache` namespace. I.e. this should resolve just fine:

```javascripts
require(['text', 'mustache']);
```

## License

MIT
