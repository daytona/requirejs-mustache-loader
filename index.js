define([
  'text',
  'mustache',
  'text!./lib/template.mustache'
], function (text, mustache, template) {
  'use strict';

  var PARTIAL_REG = '{{>\\s*([^\\s}]+)\\s*}}';
  var PARTIAL_REG_ALL = new RegExp(PARTIAL_REG, 'igm');
  var PARTIAL_REG_NAME = new RegExp(PARTIAL_REG, 'i');
  var DEFAULTS = {
    resolve: function (name) { return name; }
  };

  var id = 0;
  var refs = [];
  var written = [];

  /**
   * Asyncronously and recursively load template and nestled partials
   * @param  {String} name     Template name
   * @param  {Function} parent Parent require instance
   * @param  {Function} onload Callback
   * @param  {Object} config   RequireJS config object
   * @return {void}
   */

  function load(name, parent, onload, config) {
    var options = config.mustache;

    /**
     * Extend config with default settings
     */

    Object.keys(DEFAULTS).forEach(function (key) {
      if (!options.hasOwnProperty(key)) {
        options[key] = DEFAULTS[key];
      }
    });

    /**
     * Process the entry file and exit when done
     */

    process(name, function (contents, partials) {
      function render(data) {
        return mustache.render(contents, (data || {}), partials);
      }

      /**
       * Expose the underlying template string and partials
       */

      render.text = contents;
      render.partials = partials;

      /**
       * Expose render function as default export
       */

      onload(render);
    });

    /**
     * Load and parse given file for partials
     * @param  {String}   name     File name to load
     * @param  {Function} callback Callback when done
     * @return {void}
     */

    function process(name, callback) {

      /**
       * Load file using text plugin
       */

      text.get(parent.toUrl(name), function (contents) {
        var partials = {};
        var all = contents.match(PARTIAL_REG_ALL);
        var queue = (all && all.length);

        function done(contents, partials) {
          var isParsed = refs.some(function (ref) { return ref.name === name; });

          /**
           * Save a reference for a later write if it is building
           */

          if (config.isBuild && !isParsed) {
            refs.push({
              name: name,
              id: ('partial_' + (id += 1)),
              text: escapeTemplate(contents),
              partials: Object.keys(partials).map(function (key, index, list) {
                return {
                  name: options.resolve(key),
                  partial: key,
                  id: ('partial_' + (id += 1)),
                  is_last: (index === (list.length - 1)),
                  partials: false
                };
              })
            });
          }

          callback(contents, partials);
        }

        if (!queue) {
          done(contents, {});
          return;
        }

        all.forEach(function (partial) {
          /**
           * Identify partial name
           */

          var match = partial.match(PARTIAL_REG_NAME);
          var name = (match && match[1]);

          /**
           * Exit if it couldn't be found
           */

          if (!name) { return; }

          /**
           * Recursively parse partial
           */

          process(options.resolve(name), function (child, childParts) {
            partials[name] = child;

            /**
             * Extend this scope's `partials` with child's
             */

            if (!config.isBuild) {
              Object.keys(childParts).forEach(function (key) {
                partials[key] = childParts[key];
              });
            }

            /**
             * Decrement the queue and exit if done
             */

            queue -= 1;
            if (queue === 0) {
              done(contents, partials);
            }
          });
        });
      });
    }
  }

  /**
   * Write template as module during build
   * @param  {String} pluginName   Namespace for this plugin
   * @param  {String} moduleName   Name of module being built
   * @param  {Function} write      Callback for writing to file
   * @return {void}
   */

  function write(pluginName, moduleName, write) {
    var exists = refs.some(function (ref) { return ref.name === moduleName; });

    if (!exists) { return; }

    return write(refs.reduce(function (str, ref) {
      /**
       * Expose plugin name to ref
       */

      ref.plugin = pluginName;

      /**
       * Exit if this ref has already been written
       */

      if (written.indexOf(ref.name) !== -1) {
        return str;
      }

      /**
       * Remember that it has now been written
       */

      written.push(ref.name);

      /**
       * Render ref module and add it to the output string
       */

      return (str + mustache.render(template, ref));
    }, ''));
  }

  function escapeTemplate(text) {
    return text.replace(/(['\\])/g, '\\$1')
        .replace(/[\f]/g, '\\f')
        .replace(/[\b]/g, '\\b')
        .replace(/[\n]/g, '\\n')
        .replace(/[\t]/g, '\\t')
        .replace(/[\r]/g, '\\r')
        .replace(/[\u2028]/g, '\\u2028')
        .replace(/[\u2029]/g, '\\u2029');
  }

  /**
   * Compiles a templates partials recursively
   * Used by built templates to alleviate code bloat
   * @param  {Object} source Hash of partials (name/value<string|object>)
   * @return {Object}        All nestled partials in a flat name/value hash
   */

  function compile(source) {
    var partials = {};

    /**
     * Inherit partial from child partials
     * @param  {Object} obj Hash of partial (name/value<string|object>)
     * @return {void}
     */

    function inherit(obj) {
      Object.keys(obj).forEach(function (key) {
        var partial = obj[key];

        /**
         * Children that have already gone through this process
         * exposes only a string as partial. Unprocessed templates exposes
         * the render method with a template string attached to it. We'll need
         * tot ake that intp concideration.
         */

        partials[key] = (partial.text || partial);

        /**
         * Recursively parse partials
         */

        if (partial.hasOwnProperty('partials')) {
          inherit(partial.partials);
        }
      });
    }

    inherit(source);

    return partials;
  }

  return { load: load, write: write, compile: compile };
});
