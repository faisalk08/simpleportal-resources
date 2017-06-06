//     Backbone.js 0.9.2

//     (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(){

  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `global`
  // on the server).
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create a local reference to slice/splice.
  var slice = Array.prototype.slice;
  var splice = Array.prototype.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '0.9.2';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // For Backbone's purposes, jQuery, Zepto, or Ender owns the `$` variable.
  var $ = root.jQuery || root.Zepto || root.ender;

  // Set the JavaScript library that will be used for DOM manipulation and
  // Ajax calls (a.k.a. the `$` variable). By default Backbone will use: jQuery,
  // Zepto, or Ender; but the `setDomLibrary()` method lets you inject an
  // alternate JavaScript library (or a mock library for testing your views
  // outside of a browser).
  Backbone.setDomLibrary = function(lib) {
    $ = lib;
  };

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // -----------------

  // Regular expression used to split event strings
  var eventSplitter = /\s+/;

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback functions
  // to an event; trigger`-ing an event fires all callbacks in succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind one or more space separated events, `events`, to a `callback`
    // function. Passing `"all"` will bind the callback to all events fired.
    on: function(events, callback, context) {

      var calls, event, node, tail, list;
      if (!callback) return this;
      events = events.split(eventSplitter);
      calls = this._callbacks || (this._callbacks = {});

      // Create an immutable callback list, allowing traversal during
      // modification.  The tail is an empty object that will always be used
      // as the next node.
      while (event = events.shift()) {
        list = calls[event];
        node = list ? list.tail : {};
        node.next = tail = {};
        node.context = context;
        node.callback = callback;
        calls[event] = {tail: tail, next: list ? list.next : node};
      }

      return this;
    },

    // Remove one or many callbacks. If `context` is null, removes all callbacks
    // with that function. If `callback` is null, removes all callbacks for the
    // event. If `events` is null, removes all bound callbacks for all events.
    off: function(events, callback, context) {
      var event, calls, node, tail, cb, ctx;

      // No events, or removing *all* events.
      if (!(calls = this._callbacks)) return;
      if (!(events || callback || context)) {
        delete this._callbacks;
        return this;
      }

      // Loop through the listed events and contexts, splicing them out of the
      // linked list of callbacks if appropriate.
      events = events ? events.split(eventSplitter) : _.keys(calls);
      while (event = events.shift()) {
        node = calls[event];
        delete calls[event];
        if (!node || !(callback || context)) continue;
        // Create a new list, omitting the indicated callbacks.
        tail = node.tail;
        while ((node = node.next) !== tail) {
          cb = node.callback;
          ctx = node.context;
          if ((callback && cb !== callback) || (context && ctx !== context)) {
            this.on(event, cb, ctx);
          }
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(events) {
      var event, node, calls, tail, args, all, rest;
      if (!(calls = this._callbacks)) return this;
      all = calls.all;
      events = events.split(eventSplitter);
      rest = slice.call(arguments, 1);

      // For each event, walk through the linked list of callbacks twice,
      // first to trigger the event, then to trigger any `"all"` callbacks.
      while (event = events.shift()) {
        if (node = calls[event]) {
          tail = node.tail;
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, rest);
          }
        }
        if (node = all) {
          tail = node.tail;
          args = [event].concat(rest);
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, args);
          }
        }
      }

      return this;
    }

  };

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Backbone.Model
  // --------------

  // Create a new model, with defined attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    attributes || (attributes = {});
    if (options && options.parse) attributes = this.parse(attributes);
    if (defaults = getValue(this, 'defaults')) {
      attributes = _.extend({}, defaults, attributes);
    }
    if (options && options.collection) this.collection = options.collection;
    this.attributes = {};
    this._escapedAttributes = {};
    this.cid = _.uniqueId('c');
    this.changed = {};
    this._silent = {};
    this._pending = {};
    this.set(attributes, {silent: true});
    // Reset change tracking.
    this.changed = {};
    this._silent = {};
    this._pending = {};
    this._previousAttributes = _.clone(this.attributes);
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // A hash of attributes that have silently changed since the last time
    // `change` was called.  Will become pending attributes on the next call.
    _silent: null,

    // A hash of attributes that have changed since the last `'change'` event
    // began.
    _pending: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      var html;
      if (html = this._escapedAttributes[attr]) return html;
      var val = this.get(attr);
      return this._escapedAttributes[attr] = _.escape(val == null ? '' : '' + val);
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"` unless
    // you choose to silence it.
    set: function(key, value, options) {
      var attrs, attr, val;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (_.isObject(key) || key == null) {
        attrs = key;
        options = value;
      } else {
        attrs = {};
        attrs[key] = value;
      }

      // Extract attributes and options.
      options || (options = {});
      if (!attrs) return this;
      if (attrs instanceof Model) attrs = attrs.attributes;
      if (options.unset) for (attr in attrs) attrs[attr] = void 0;

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      var changes = options.changes = {};
      var now = this.attributes;
      var escaped = this._escapedAttributes;
      var prev = this._previousAttributes || {};

      // For each `set` attribute...
      for (attr in attrs) {
        val = attrs[attr];

        // If the new and current value differ, record the change.
        if (!_.isEqual(now[attr], val) || (options.unset && _.has(now, attr))) {
          delete escaped[attr];
          (options.silent ? this._silent : changes)[attr] = true;
        }

        // Update or delete the current value.
        options.unset ? delete now[attr] : now[attr] = val;

        // If the new and previous value differ, record the change.  If not,
        // then remove changes for this attribute.
        if (!_.isEqual(prev[attr], val) || (_.has(now, attr) != _.has(prev, attr))) {
          this.changed[attr] = val;
          if (!options.silent) this._pending[attr] = true;
        } else {
          delete this.changed[attr];
          delete this._pending[attr];
        }
      }

      // Fire the `"change"` events.
      if (!options.silent) this.change(options);
      return this;
    },

    // Remove an attribute from the model, firing `"change"` unless you choose
    // to silence it. `unset` is a noop if the attribute doesn't exist.
    unset: function(attr, options) {
      (options || (options = {})).unset = true;
      return this.set(attr, null, options);
    },

    // Clear all attributes on the model, firing `"change"` unless you choose
    // to silence it.
    clear: function(options) {
      (options || (options = {})).unset = true;
      return this.set(_.clone(this.attributes), options);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overriden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        if (!model.set(model.parse(resp, xhr), options)) return false;
        if (success) success(model, resp);
      };
      options.error = Backbone.wrapError(options.error, model, options);
      return (this.sync || Backbone.sync).call(this, 'read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, value, options) {
      var attrs, current;

      // Handle both `("key", value)` and `({key: value})` -style calls.
      if (_.isObject(key) || key == null) {
        attrs = key;
        options = value;
      } else {
        attrs = {};
        attrs[key] = value;
      }
      options = options ? _.clone(options) : {};

      // If we're "wait"-ing to set changed attributes, validate early.
      if (options.wait) {
        if (!this._validate(attrs, options)) return false;
        current = _.clone(this.attributes);
      }

      // Regular saves `set` attributes before persisting to the server.
      var silentOptions = _.extend({}, options, {silent: true});
      if (attrs && !this.set(attrs, options.wait ? silentOptions : options)) {
        return false;
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        var serverAttrs = model.parse(resp, xhr);
        if (options.wait) {
          delete options.wait;
          serverAttrs = _.extend(attrs || {}, serverAttrs);
        }
        if (!model.set(serverAttrs, options)) return false;
        if (success) {
          success(model, resp);
        } else {
          model.trigger('sync', model, resp, options);
        }
      };

      // Finish configuring and sending the Ajax request.
      options.error = Backbone.wrapError(options.error, model, options);
      var method = this.isNew() ? 'create' : 'update';
      var xhr = (this.sync || Backbone.sync).call(this, method, this, options);
      if (options.wait) this.set(current, silentOptions);
      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var triggerDestroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      if (this.isNew()) {
        triggerDestroy();
        return false;
      }

      options.success = function(resp) {
        if (options.wait) triggerDestroy();
        if (success) {
          success(model, resp);
        } else {
          model.trigger('sync', model, resp, options);
        }
      };

      options.error = Backbone.wrapError(options.error, model, options);
      var xhr = (this.sync || Backbone.sync).call(this, 'delete', this, options);
      if (!options.wait) triggerDestroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = getValue(this, 'urlRoot') || getValue(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, xhr) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Call this method to manually fire a `"change"` event for this model and
    // a `"change:attribute"` event for each changed attribute.
    // Calling this will cause all objects observing the model to update.
    change: function(options) {
      options || (options = {});
      var changing = this._changing;
      this._changing = true;

      // Silent changes become pending changes.
      for (var attr in this._silent) this._pending[attr] = true;

      // Silent changes are triggered.
      var changes = _.extend({}, options.changes, this._silent);
      this._silent = {};
      for (var attr in changes) {
        this.trigger('change:' + attr, this, this.get(attr), options);
      }
      if (changing) return this;

      // Continue firing `"change"` events while there are pending changes.
      while (!_.isEmpty(this._pending)) {
        this._pending = {};
        this.trigger('change', this, options);
        // Pending and silent changes still remain.
        for (var attr in this.changed) {
          if (this._pending[attr] || this._silent[attr]) continue;
          delete this.changed[attr];
        }
        this._previousAttributes = _.clone(this.attributes);
      }

      this._changing = false;
      return this;
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (!arguments.length) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false, old = this._previousAttributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (!arguments.length || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Check if the model is currently in a valid state. It's only possible to
    // get into an *invalid* state if you're using silent changes.
    isValid: function() {
      return !this.validate(this.attributes);
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. If a specific `error` callback has
    // been passed, call that instead of firing the general `"error"` event.
    _validate: function(attrs, options) {
      if (options.silent || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validate(attrs, options);
      if (!error) return true;
      if (options && options.error) {
        options.error(this, error, options);
      } else {
        this.trigger('error', this, error, options);
      }
      return false;
    }

  });

  // Backbone.Collection
  // -------------------

  // Provides a standard collection class for our sets of models, ordered
  // or unordered. If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, {silent: true, parse: options.parse});
  };

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Add a model, or list of models to the set. Pass **silent** to avoid
    // firing the `add` event for every new model.
    add: function(models, options) {
      var i, index, length, model, cid, id, cids = {}, ids = {}, dups = [];
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];

      // Begin by turning bare objects into model references, and preventing
      // invalid models or duplicate models from being added.
      for (i = 0, length = models.length; i < length; i++) {
        if (!(model = models[i] = this._prepareModel(models[i], options))) {
          throw new Error("Can't add an invalid model to a collection");
        }
        cid = model.cid;
        id = model.id;
        if (cids[cid] || this._byCid[cid] || ((id != null) && (ids[id] || this._byId[id]))) {
          dups.push(i);
          continue;
        }
        cids[cid] = ids[id] = model;
      }

      // Remove duplicates.
      i = dups.length;
      while (i--) {
        models.splice(dups[i], 1);
      }

      // Listen to added models' events, and index models for lookup by
      // `id` and by `cid`.
      for (i = 0, length = models.length; i < length; i++) {
        (model = models[i]).on('all', this._onModelEvent, this);
        this._byCid[model.cid] = model;
        if (model.id != null) this._byId[model.id] = model;
      }

      // Insert models into the collection, re-sorting if needed, and triggering
      // `add` events unless silenced.
      this.length += length;
      index = options.at != null ? options.at : this.models.length;
      splice.apply(this.models, [index, 0].concat(models));
      if (this.comparator) this.sort({silent: true});
      if (options.silent) return this;
      for (i = 0, length = this.models.length; i < length; i++) {
        if (!cids[(model = this.models[i]).cid]) continue;
        options.index = i;
        model.trigger('add', model, this, options);
      }
      return this;
    },

    // Remove a model, or a list of models from the set. Pass silent to avoid
    // firing the `remove` event for every model removed.
    remove: function(models, options) {
      var i, l, index, model;
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];
      for (i = 0, l = models.length; i < l; i++) {
        model = this.getByCid(models[i]) || this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byCid[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, options);
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Get a model from the set by id.
    get: function(id) {
      if (id == null) return void 0;
      return this._byId[id.id != null ? id.id : id];
    },

    // Get a model from the set by client id.
    getByCid: function(cid) {
      return cid && this._byCid[cid.cid || cid];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of `filter`.
    where: function(attrs) {
      if (_.isEmpty(attrs)) return [];
      return this.filter(function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      options || (options = {});
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      var boundComparator = _.bind(this.comparator, this);
      if (this.comparator.length == 1) {
        this.models = this.sortBy(boundComparator);
      } else {
        this.models.sort(boundComparator);
      }
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.map(this.models, function(model){ return model.get(attr); });
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any `add` or `remove` events. Fires `reset` when finished.
    reset: function(models, options) {
      models  || (models = []);
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      this._reset();
      this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `add: true` is passed, appends the
    // models to the collection instead of resetting.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === undefined) options.parse = true;
      var collection = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        collection[options.add ? 'add' : 'reset'](collection.parse(resp, xhr), options);
        if (success) success(collection, resp);
      };
      options.error = Backbone.wrapError(options.error, collection, options);
      return (this.sync || Backbone.sync).call(this, 'read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      var coll = this;
      options = options ? _.clone(options) : {};
      model = this._prepareModel(model, options);
      if (!model) return false;
      if (!options.wait) coll.add(model, options);
      var success = options.success;
      options.success = function(nextModel, resp, xhr) {
        if (options.wait) coll.add(nextModel, options);
        if (success) {
          success(nextModel, resp);
        } else {
          nextModel.trigger('sync', model, resp, options);
        }
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, xhr) {
      return resp;
    },

    // Proxy to _'s chain. Can't be proxied the same way the rest of the
    // underscore methods are proxied because it relies on the underscore
    // constructor.
    chain: function () {
      return _(this.models).chain();
    },

    // Reset all internal state. Called when the collection is reset.
    _reset: function(options) {
      this.length = 0;
      this.models = [];
      this._byId  = {};
      this._byCid = {};
    },

    // Prepare a model or hash of attributes to be added to this collection.
    _prepareModel: function(model, options) {
      options || (options = {});
      if (!(model instanceof Model)) {
        var attrs = model;
        options.collection = this;
        model = new this.model(attrs, options);
        if (!model._validate(model.attributes, options)) model = false;
      } else if (!model.collection) {
        model.collection = this;
      }
      return model;
    },

    // Internal method to remove a model's ties to a collection.
    _removeReference: function(model) {
      if (this == model.collection) {
        delete model.collection;
      }
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event == 'add' || event == 'remove') && collection != this) return;
      if (event == 'destroy') {
        this.remove(model, options);
      }
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  var methods = ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find',
    'detect', 'filter', 'select', 'reject', 'every', 'all', 'some', 'any',
    'include', 'contains', 'invoke', 'max', 'min', 'sortBy', 'sortedIndex',
    'toArray', 'size', 'first', 'initial', 'rest', 'last', 'without', 'indexOf',
    'shuffle', 'lastIndexOf', 'isEmpty', 'groupBy'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      return _[method].apply(_, [this.models].concat(_.toArray(arguments)));
    };
  });

  // Backbone.Router
  // -------------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var namedParam    = /:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[-[\]{}()+?.,\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      Backbone.history || (Backbone.history = new History);
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (!callback) callback = this[name];
      Backbone.history.route(route, _.bind(function(fragment) {
        var args = this._extractParameters(route, fragment);
        callback && callback.apply(this, args);
        this.trigger.apply(this, ['route:' + name].concat(args));
        Backbone.history.trigger('route', this, name, args);
      }, this));
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      var routes = [];
      for (var route in this.routes) {
        routes.unshift([route, this.routes[route]]);
      }
      for (var i = 0, l = routes.length; i < l; i++) {
        this.route(routes[i][0], routes[i][1], this[routes[i][1]]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(namedParam, '([^\/]+)')
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted parameters.
    _extractParameters: function(route, fragment) {
      return route.exec(fragment).slice(1);
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on URL fragments. If the
  // browser does not support `onhashchange`, falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');
  };

  // Cached regex for cleaning leading hashes and slashes .
  var routeStripper = /^[#\/]/;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(windowOverride) {
      var loc = windowOverride ? windowOverride.location : window.location;
      var match = loc.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || forcePushState) {
          fragment = window.location.pathname;
          var search = window.location.search;
          if (search) fragment += search;
        } else {
          fragment = this.getHash();
        }
      }
      if (!fragment.indexOf(this.options.root)) fragment = fragment.substr(this.options.root.length);
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && window.history && window.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      if (oldIE) {
        this.iframe = $('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        $(window).bind('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        $(window).bind('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = window.location;
      var atRoot  = loc.pathname == this.options.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        window.location.replace(this.options.root + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + this.options.root + this.fragment);
      }

      if (!this.options.silent) {
        return this.loadUrl();
      }
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      $(window).unbind('popstate', this.checkUrl).unbind('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current == this.fragment && this.iframe) current = this.getFragment(this.getHash(this.iframe));
      if (current == this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      var frag = (fragment || '').replace(routeStripper, '');
      if (this.fragment == frag) return;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        if (frag.indexOf(this.options.root) != 0) frag = this.options.root + frag;
        this.fragment = frag;
        window.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, frag);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this.fragment = frag;
        this._updateHash(window.location, frag, options.replace);
        if (this.iframe && (frag != this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a history entry on hash-tag change.
          // When replace is true, we don't want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, frag, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        window.location.assign(this.options.root + fragment);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        location.replace(location.toString().replace(/(javascript:|#).*$/, '') + '#' + fragment);
      } else {
        location.hash = fragment;
      }
    }
  });

  // Backbone.View
  // -------------

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view from the DOM. Note that the view isn't present in the
    // DOM by default, so calling this method may be a no-op.
    remove: function() {
      this.$el.remove();
      return this;
    },

    // For small amounts of DOM Elements, where a full-blown template isn't
    // needed, use **make** to manufacture elements, one at a time.
    //
    //     var el = this.make('li', {'class': 'row'}, this.model.escape('title'));
    //
    make: function(tagName, attributes, content) {
      var el = document.createElement(tagName);
      if (attributes) $(el).attr(attributes);
      if (content) $(el).html(content);
      return el;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = (element instanceof $) ? element : $(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = getValue(this, 'events')))) return;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) throw new Error('Method "' + events[key] + '" does not exist');
        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.bind(eventName, method);
        } else {
          this.$el.delegate(selector, eventName, method);
        }
      }
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.unbind('.delegateEvents' + this.cid);
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(model, collection, id, className)*, are
    // attached directly to the view.
    _configure: function(options) {
      if (this.options) options = _.extend({}, this.options, options);
      for (var i = 0, l = viewOptions.length; i < l; i++) {
        var attr = viewOptions[i];
        if (options[attr]) this[attr] = options[attr];
      }
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = getValue(this, 'attributes') || {};
        if (this.id) attrs.id = this.id;
        if (this.className) attrs['class'] = this.className;
        this.setElement(this.make(this.tagName, attrs), false);
      } else {
        this.setElement(this.el, false);
      }
    }

  });

  // The self-propagating extend function that Backbone classes use.
  var extend = function (protoProps, classProps) {
    var child = inherits(this, protoProps, classProps);
    child.extend = this.extend;
    return child;
  };

  // Set up inheritance for the model, collection, and view.
  Model.extend = Collection.extend = Router.extend = View.extend = extend;

  // Backbone.sync
  // -------------

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    options || (options = {});

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = getValue(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (!options.data && model && (method == 'create' || method == 'update')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(model.toJSON());
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (Backbone.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (Backbone.emulateHTTP) {
      if (type === 'PUT' || type === 'DELETE') {
        if (Backbone.emulateJSON) params.data._method = type;
        params.type = 'POST';
        params.beforeSend = function(xhr) {
          xhr.setRequestHeader('X-HTTP-Method-Override', type);
        };
      }
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !Backbone.emulateJSON) {
      params.processData = false;
    }

    // Make the request, allowing the user to override any Ajax options.
    return $.ajax(_.extend(params, options));
  };

  // Wrap an optional error callback with a fallback error event.
  Backbone.wrapError = function(onError, originalModel, options) {
    return function(model, resp) {
      resp = model === originalModel ? resp : model;
      if (onError) {
        onError(originalModel, resp, options);
      } else {
        originalModel.trigger('error', originalModel, resp, options);
      }
    };
  };

  // Helpers
  // -------

  // Shared empty constructor function to aid in prototype-chain creation.
  var ctor = function(){};

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var inherits = function(parent, protoProps, staticProps) {
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ parent.apply(this, arguments); };
    }

    // Inherit class (static) properties from parent.
    _.extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Add static properties to the constructor function, if supplied.
    if (staticProps) _.extend(child, staticProps);

    // Correctly set child's `prototype.constructor`.
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Helper function to get a value from a Backbone object as a property
  // or as a function.
  var getValue = function(object, prop) {
    if (!(object && object[prop])) return null;
    return _.isFunction(object[prop]) ? object[prop]() : object[prop];
  };

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

}).call(this);
/**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*
**/
 
var Base64 = {
 
	// private property
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
 
	// public method for encoding
	encode : function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = Base64._utf8_encode(input);
 
		while (i < input.length) {
 
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);
 
			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;
 
			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}
 
			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
 
		}
 
		return output;
	},
 
	// public method for decoding
	decode : function (input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
		while (i < input.length) {
 
			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));
 
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
 
			output = output + String.fromCharCode(chr1);
 
			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}
 
		}
 
		output = Base64._utf8_decode(output);
 
		return output;
 
	},
 
	// private method for UTF-8 encoding
	_utf8_encode : function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
 
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
 
		return utftext;
	},
 
	// private method for UTF-8 decoding
	_utf8_decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;
 
		while ( i < utftext.length ) {
 
			c = utftext.charCodeAt(i);
 
			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
 
		}
 
		return string;
	}
 
}
/*
	
	var $loader = $('<img src="loading.gif" alt="Loading..." title="Loading..." style="margin-right:15px;" />');
	$(function() {
		var hashObj = new jsSHA("mySuperPassword", "ASCII");
		var password = hashObj.getHash("SHA-512", "HEX");
	 
		$.jCryption.authenticate(password, "encrypt.php?generateKeypair=true", "encrypt.php?handshake=true", function(AESKey) {
			$("#text,#encrypt,#decrypt,#serverChallenge").attr("disabled",false);
			$("#status").html('<span style="font-size: 16px;">Let\'s Rock!</span>');
		}, function() {
			// Authentication failed
		});
	 
		$("#encrypt").click(function() {
			var encryptedString = $.jCryption.encrypt($("#text").val(), password);
			$("#log").prepend("\n").prepend("----------");
			$("#log").prepend("\n").prepend("String: " + $("#text").val());
			$("#log").prepend("\n").prepend("Encrypted: " + encryptedString);
			$.ajax({
				url: "encrypt.php",
				dataType: "json",
				type: "POST",
				data: {
					jCryption: encryptedString
				},
				success: function(response) {
					$("#log").prepend("\n").prepend("Server decrypted: " + response.data);
				}
			});
		});
	 
		$("#serverChallenge").click(function() {
			$.ajax({
				url: "encrypt.php?decrypttest=true",
				dataType: "json",
				type: "POST",
				success: function(response) {
					$("#log").prepend("\n").prepend("----------");
					$("#log").prepend("\n").prepend("Server original: " + response.unencrypted);
					$("#log").prepend("\n").prepend("Server sent: " + response.encrypted);
					var decryptedString = $.jCryption.decrypt(response.encrypted, password);
					$("#log").prepend("\n").prepend("Decrypted: " + decryptedString);
				}
			});
		});
	 
		$("#decrypt").click(function() {
			var decryptedString = $.jCryption.decrypt($("#text").val(), password);
			$("#log").prepend("\n").prepend("----------");
			$("#log").prepend("\n").prepend("Decrypted: " + decryptedString);
		});
	 
	});*/

/*

Copyright (c) 2009 Dimas Begunoff, http://www.farinspace.com

Licensed under the MIT license
http://en.wikipedia.org/wiki/MIT_License

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

*/

;(function($){

	var scrollbarWidth = 0;

	// http://jdsharp.us/jQuery/minute/calculate-scrollbar-width.php
	function getScrollbarWidth() 
	{
		if (scrollbarWidth) return scrollbarWidth;
		var div = $('<div style="width:50px;height:50px;overflow:hidden;position:absolute;top:-200px;left:-200px;"><div style="height:100px;"></div></div>'); 
		$('body').append(div); 
		var w1 = $('div', div).innerWidth(); 
		div.css('overflow-y', 'auto'); 
		var w2 = $('div', div).innerWidth(); 
		$(div).remove(); 
		scrollbarWidth = (w1 - w2);
		return scrollbarWidth;
	}
	
	$.fn.tableScroll = function(options)
	{
		if (options == 'undo')
		{
			var container = $(this).parent().parent();
			if (container.hasClass('tablescroll_wrapper')) 
			{
				container.find('.tablescroll_head thead').prependTo(this);
				container.find('.tablescroll_foot tfoot').appendTo(this);
				container.before(this);
				container.empty();
			}
			return;
		}

		var settings = $.extend({},$.fn.tableScroll.defaults,options);
		
		// Bail out if there's no vertical overflow
		//if ($(this).height() <= settings.height)
		//{
		//  return this;
		//}

		settings.scrollbarWidth = getScrollbarWidth();

		this.each(function()
		{
			var flush = settings.flush;
			
			var tb = $(this).addClass('tablescroll_body');

            // find or create the wrapper div (allows tableScroll to be re-applied)
            var wrapper;
            if (tb.parent().hasClass('tablescroll_wrapper')) {
                wrapper = tb.parent();
            }
            else {
                wrapper = $('<div class="tablescroll_wrapper"></div>').insertBefore(tb).append(tb);
            }

			// check for a predefined container
			if (!wrapper.parent('div').hasClass(settings.containerClass))
			{
				$('<div></div>').addClass(settings.containerClass).insertBefore(wrapper).append(wrapper);
			}

			var width = settings.width ? settings.width : tb.outerWidth();

			wrapper.css
			({
				'width': width+'px',
				'height': settings.height+'px',
				'overflow': 'auto'
			});

			tb.css('width',width+'px');

			// with border difference
			var wrapper_width = wrapper.outerWidth();
			var diff = wrapper_width-width;

			// assume table will scroll
			wrapper.css({width:((width-diff)+settings.scrollbarWidth)+'px'});
			tb.css('width',(width-diff)+'px');

			if (tb.outerHeight() <= settings.height)
			{
				wrapper.css({height:'auto',width:(width-diff)+'px'});
				flush = false;
			}

			// using wrap does not put wrapper in the DOM right 
			// away making it unavailable for use during runtime
			// tb.wrap(wrapper);

			// possible speed enhancements
			var has_thead = $('thead',tb).length ? true : false ;
			var has_tfoot = $('tfoot',tb).length ? true : false ;
			var thead_tr_first = $('thead tr:first',tb);
			var tbody_tr_first = $('tbody tr:first',tb);
			var tfoot_tr_first = $('tfoot tr:first',tb);

			// remember width of last cell
			var w = 0;

			$('th, td',thead_tr_first).each(function(i)
			{
				w = $(this).width();

				$('th:eq('+i+'), td:eq('+i+')',thead_tr_first).css('width',w+'px');
				$('th:eq('+i+'), td:eq('+i+')',tbody_tr_first).css('width',w+'px');
				if (has_tfoot) $('th:eq('+i+'), td:eq('+i+')',tfoot_tr_first).css('width',w+'px');
			});

			if (has_thead) 
			{
				var tbh = $('<table class="tablescroll_head" cellspacing="0"></table>').insertBefore(wrapper).prepend($('thead',tb));
			}

			if (has_tfoot) 
			{
				var tbf = $('<table class="tablescroll_foot" cellspacing="0"></table>').insertAfter(wrapper).prepend($('tfoot',tb));
			}

			if (tbh != undefined)
			{
				tbh.css('width',width+'px');
				
				if (flush)
				{
					$('tr:first th:last, tr:first td:last',tbh).css('width',(w+settings.scrollbarWidth)+'px');
					tbh.css('width',wrapper.outerWidth() + 'px');
				}
			}

			if (tbf != undefined)
			{
				tbf.css('width',width+'px');

				if (flush)
				{
					$('tr:first th:last, tr:first td:last',tbf).css('width',(w+settings.scrollbarWidth)+'px');
					tbf.css('width',wrapper.outerWidth() + 'px');
				}
			}
		});

		return this;
	};

	// public
	$.fn.tableScroll.defaults =
	{
		flush: true, // makes the last thead and tbody column flush with the scrollbar
		width: null, // width of the table (head, body and foot), null defaults to the tables natural width
		height: 100, // height of the scrollable area
		containerClass: 'tablescroll' // the plugin wraps the table in a div with this css class
	};

})(jQuery);

/*
 * jQuery validation plug-in 1.7
 *
 * http://bassistance.de/jquery-plugins/jquery-plugin-validation/
 * http://docs.jquery.com/Plugins/Validation
 *
 * Copyright (c) 2006 - 2008 Jï¿½rn Zaefferer
 *
 * $Id: jquery.validate.js 6403 2009-06-17 14:27:16Z joern.zaefferer $
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */

(function($) {

$.extend($.fn, {
	// http://docs.jquery.com/Plugins/Validation/validate
	validate: function( options ) {

		// if nothing is selected, return nothing; can't chain anyway
		if (!this.length) {
			options && options.debug && window.console && console.warn( "nothing selected, can't validate, returning nothing" );
			return;
		}

		// check if a validator for this form was already created
		var validator = $.data(this[0], 'validator');
		if ( validator ) {
			return validator;
		}
		
		validator = new $.validator( options, this[0] );
		$.data(this[0], 'validator', validator); 
		
		if ( validator.settings.onsubmit ) {
		
			// allow suppresing validation by adding a cancel class to the submit button
			this.find("input, button").filter(".cancel").click(function() {
				validator.cancelSubmit = true;
			});
			
			// when a submitHandler is used, capture the submitting button
			if (validator.settings.submitHandler) {
				this.find("input, button").filter(":submit").click(function() {
					validator.submitButton = this;
				});
			}
		
			// validate the form on submit
			this.submit( function( event ) {
				if ( validator.settings.debug )
					// prevent form submit to be able to see console output
					event.preventDefault();
					
				function handle() {
					if ( validator.settings.submitHandler ) {
						if (validator.submitButton) {
							// insert a hidden input as a replacement for the missing submit button
							var hidden = $("<input type='hidden'/>").attr("name", validator.submitButton.name).val(validator.submitButton.value).appendTo(validator.currentForm);
						}
						validator.settings.submitHandler.call( validator, validator.currentForm );
						if (validator.submitButton) {
							// and clean up afterwards; thanks to no-block-scope, hidden can be referenced
							hidden.remove();
						}
						return false;
					}
					return true;
				}
					
				// prevent submit for invalid forms or custom submit handlers
				if ( validator.cancelSubmit ) {
					validator.cancelSubmit = false;
					return handle();
				}
				if ( validator.form() ) {
					if ( validator.pendingRequest ) {
						validator.formSubmitted = true;
						return false;
					}
					return handle();
				} else {
					validator.focusInvalid();
					return false;
				}
			});
		}
		
		return validator;
	},
	// http://docs.jquery.com/Plugins/Validation/valid
	valid: function() {
        if ( $(this[0]).is('form')) {
            return this.validate().form();
        } else {
            var valid = true;
            var validator = $(this[0].form).validate();
            this.each(function() {
				valid &= validator.element(this);
            });
            return valid;
        }
    },
	// attributes: space seperated list of attributes to retrieve and remove
	removeAttrs: function(attributes) {
		var result = {},
			$element = this;
		$.each(attributes.split(/\s/), function(index, value) {
			result[value] = $element.attr(value);
			$element.removeAttr(value);
		});
		return result;
	},
	// http://docs.jquery.com/Plugins/Validation/rules
	rules: function(command, argument) {
		var element = this[0];
		
		if (command) {
			var settings = $.data(element.form, 'validator').settings;
			var staticRules = settings.rules;
			var existingRules = $.validator.staticRules(element);
			switch(command) {
			case "add":
				$.extend(existingRules, $.validator.normalizeRule(argument));
				staticRules[element.name] = existingRules;
				if (argument.messages)
					settings.messages[element.name] = $.extend( settings.messages[element.name], argument.messages );
				break;
			case "remove":
				if (!argument) {
					delete staticRules[element.name];
					return existingRules;
				}
				var filtered = {};
				$.each(argument.split(/\s/), function(index, method) {
					filtered[method] = existingRules[method];
					delete existingRules[method];
				});
				return filtered;
			}
		}
		
		var data = $.validator.normalizeRules(
		$.extend(
			{},
			$.validator.metadataRules(element),
			$.validator.classRules(element),
			$.validator.attributeRules(element),
			$.validator.staticRules(element)
		), element);
		
		// make sure required is at front
		if (data.required) {
			var param = data.required;
			delete data.required;
			data = $.extend({required: param}, data);
		}
		
		return data;
	}
});

// Custom selectors
$.extend($.expr[":"], {
	// http://docs.jquery.com/Plugins/Validation/blank
	blank: function(a) {return !$.trim("" + a.value);},
	// http://docs.jquery.com/Plugins/Validation/filled
	filled: function(a) {return !!$.trim("" + a.value);},
	// http://docs.jquery.com/Plugins/Validation/unchecked
	unchecked: function(a) {return !a.checked;}
});

// constructor for validator
$.validator = function( options, form ) {
	this.settings = $.extend( true, {}, $.validator.defaults, options );
	this.currentForm = form;
	this.init();
};

$.validator.format = function(source, params) {
	if ( arguments.length == 1 ) 
		return function() {
			var args = $.makeArray(arguments);
			args.unshift(source);
			return $.validator.format.apply( this, args );
		};
	if ( arguments.length > 2 && params.constructor != Array  ) {
		params = $.makeArray(arguments).slice(1);
	}
	if ( params.constructor != Array ) {
		params = [ params ];
	}
	$.each(params, function(i, n) {
		source = source.replace(new RegExp("\\{" + i + "\\}", "g"), n);
	});
	return source;
};

$.extend($.validator, {
	
	defaults: {
		messages: {},
		groups: {},
		rules: {},
		errorClass: "error",
		validClass: "valid",
		errorElement: "label",
		focusInvalid: true,
		errorContainer: $( [] ),
		errorLabelContainer: $( [] ),
		onsubmit: true,
		ignore: [],
		ignoreTitle: false,
		onfocusin: function(element) {
			this.lastActive = element;
				
			// hide error label and remove error class on focus if enabled
			if ( this.settings.focusCleanup && !this.blockFocusCleanup ) {
				this.settings.unhighlight && this.settings.unhighlight.call( this, element, this.settings.errorClass, this.settings.validClass );
				this.errorsFor(element).hide();
			}
		},
		onfocusout: function(element) {
			if ( !this.checkable(element) && (element.name in this.submitted || !this.optional(element)) ) {
				this.element(element);
			}
		},
		onkeyup: function(element) {
			if ( element.name in this.submitted || element == this.lastElement ) {
				this.element(element);
			}
		},
		onclick: function(element) {
			// click on selects, radiobuttons and checkboxes
			if ( element.name in this.submitted )
				this.element(element);
			// or option elements, check parent select in that case
			else if (element.parentNode.name in this.submitted)
				this.element(element.parentNode);
		},
		highlight: function( element, errorClass, validClass ) {
			$(element).addClass(errorClass).removeClass(validClass);
		},
		unhighlight: function( element, errorClass, validClass ) {
			$(element).removeClass(errorClass).addClass(validClass);
		}
	},

	// http://docs.jquery.com/Plugins/Validation/Validator/setDefaults
	setDefaults: function(settings) {
		$.extend( $.validator.defaults, settings );
	},

	messages: {
		required: "This field is required.",
		remote: "Please fix this field.",
		email: "Please enter a valid email address.",
		url: "Please enter a valid URL.",
		date: "Please enter a valid date.",
		dateISO: "Please enter a valid date (ISO).",
		number: "Please enter a valid number.",
		digits: "Please enter only digits.",
		creditcard: "Please enter a valid credit card number.",
		equalTo: "Please enter the same value again.",
		accept: "Please enter a value with a valid extension.",
		maxlength: $.validator.format("Please enter no more than {0} characters."),
		minlength: $.validator.format("Please enter at least {0} characters."),
		rangelength: $.validator.format("Please enter a value between {0} and {1} characters long."),
		range: $.validator.format("Please enter a value between {0} and {1}."),
		max: $.validator.format("Please enter a value less than or equal to {0}."),
		min: $.validator.format("Please enter a value greater than or equal to {0}."),
		// Added by EviMed Online GmbH for float
		floatVal: "Please enter Integer/Float value." 
	},
	
	autoCreateRanges: false,
	
	prototype: {
		
		init: function() {
			this.labelContainer = $(this.settings.errorLabelContainer);
			this.errorContext = this.labelContainer.length && this.labelContainer || $(this.currentForm);
			this.containers = $(this.settings.errorContainer).add( this.settings.errorLabelContainer );
			this.submitted = {};
			this.valueCache = {};
			this.pendingRequest = 0;
			this.pending = {};
			this.invalid = {};
			this.reset();
			
			var groups = (this.groups = {});
			$.each(this.settings.groups, function(key, value) {
				$.each(value.split(/\s/), function(index, name) {
					groups[name] = key;
				});
			});
			var rules = this.settings.rules;
			$.each(rules, function(key, value) {
				rules[key] = $.validator.normalizeRule(value);
			});
			
			function delegate(event) {
				var validator = $.data(this[0].form, "validator"),
					eventType = "on" + event.type.replace(/^validate/, "");
				validator.settings[eventType] && validator.settings[eventType].call(validator, this[0] );
			}
			$(this.currentForm)
				.validateDelegate(":text, :password, :file, select, textarea", "focusin focusout keyup", delegate)
				.validateDelegate(":radio, :checkbox, select, option", "click", delegate);

			if (this.settings.invalidHandler)
				$(this.currentForm).bind("invalid-form.validate", this.settings.invalidHandler);
		},

		// http://docs.jquery.com/Plugins/Validation/Validator/form
		form: function() {
			this.checkForm();
			$.extend(this.submitted, this.errorMap);
			this.invalid = $.extend({}, this.errorMap);
			if (!this.valid())
				$(this.currentForm).triggerHandler("invalid-form", [this]);
			this.showErrors();
			return this.valid();
		},
		
		checkForm: function() {
			this.prepareForm();
			for ( var i = 0, elements = (this.currentElements = this.elements()); elements[i]; i++ ) {
				this.check( elements[i] );
			}
			return this.valid(); 
		},
		
		// http://docs.jquery.com/Plugins/Validation/Validator/element
		element: function( element ) {
			element = this.clean( element );
			this.lastElement = element;
			this.prepareElement( element );
			this.currentElements = $(element);
			var result = this.check( element );
			if ( result ) {
				delete this.invalid[element.name];
			} else {
				this.invalid[element.name] = true;
			}
			if ( !this.numberOfInvalids() ) {
				// Hide error containers on last error
				this.toHide = this.toHide.add( this.containers );
			}
			this.showErrors();
			return result;
		},

		// http://docs.jquery.com/Plugins/Validation/Validator/showErrors
		showErrors: function(errors) {
			if(errors) {
				// add items to error list and map
				$.extend( this.errorMap, errors );
				this.errorList = [];
				for ( var name in errors ) {
					this.errorList.push({
						message: errors[name],
						element: this.findByName(name)[0]
					});
				}
				// remove items from success list
				this.successList = $.grep( this.successList, function(element) {
					return !(element.name in errors);
				});
			}
			this.settings.showErrors
				? this.settings.showErrors.call( this, this.errorMap, this.errorList )
				: this.defaultShowErrors();
		},
		
		// http://docs.jquery.com/Plugins/Validation/Validator/resetForm
		resetForm: function() {
			if ( $.fn.resetForm )
				$( this.currentForm ).resetForm();
			this.submitted = {};
			this.prepareForm();
			this.hideErrors();
			this.elements().removeClass( this.settings.errorClass );
		},
		
		numberOfInvalids: function() {
			return this.objectLength(this.invalid);
		},
		
		objectLength: function( obj ) {
			var count = 0;
			for ( var i in obj )
				count++;
			return count;
		},
		
		hideErrors: function() {
			this.addWrapper( this.toHide ).hide();
		},
		
		valid: function() {
			return this.size() == 0;
		},
		
		size: function() {
			return this.errorList.length;
		},
		
		focusInvalid: function() {
			if( this.settings.focusInvalid ) {
				try {
					$(this.findLastActive() || this.errorList.length && this.errorList[0].element || [])
					.filter(":visible")
					.focus()
					// manually trigger focusin event; without it, focusin handler isn't called, findLastActive won't have anything to find
					.trigger("focusin");
				} catch(e) {
					// ignore IE throwing errors when focusing hidden elements
				}
			}
		},
		
		findLastActive: function() {
			var lastActive = this.lastActive;
			return lastActive && $.grep(this.errorList, function(n) {
				return n.element.name == lastActive.name;
			}).length == 1 && lastActive;
		},
		
		elements: function() {
			var validator = this,
				rulesCache = {};
			
			// select all valid inputs inside the form (no submit or reset buttons)
			// workaround $Query([]).add until http://dev.jquery.com/ticket/2114 is solved
			return $([]).add(this.currentForm.elements)
			.filter(":input")
			.not(":submit, :reset, :image, [disabled]")
			.not( this.settings.ignore )
			.filter(function() {
				!this.name && validator.settings.debug && window.console && console.error( "%o has no name assigned", this);
			
				// select only the first element for each name, and only those with rules specified
				if ( this.name in rulesCache || !validator.objectLength($(this).rules()) )
					return false;
				
				rulesCache[this.name] = true;
				return true;
			});
		},
		
		clean: function( selector ) {
			return $( selector )[0];
		},
		
		errors: function() {
			return $( this.settings.errorElement + "." + this.settings.errorClass, this.errorContext );
		},
		
		reset: function() {
			this.successList = [];
			this.errorList = [];
			this.errorMap = {};
			this.toShow = $([]);
			this.toHide = $([]);
			this.currentElements = $([]);
		},
		
		prepareForm: function() {
			this.reset();
			this.toHide = this.errors().add( this.containers );
		},
		
		prepareElement: function( element ) {
			this.reset();
			this.toHide = this.errorsFor(element);
		},
	
		check: function( element ) {
			element = this.clean( element );
			
			// if radio/checkbox, validate first element in group instead
			if (this.checkable(element)) {
				element = this.findByName( element.name )[0];
			}
			
			var rules = $(element).rules();
			var dependencyMismatch = false;
			for( method in rules ) {
				var rule = { method: method, parameters: rules[method] };
				try {
					var result = $.validator.methods[method].call( this, element.value.replace(/\r/g, ""), element, rule.parameters );
					
					// if a method indicates that the field is optional and therefore valid,
					// don't mark it as valid when there are no other rules
					if ( result == "dependency-mismatch" ) {
						dependencyMismatch = true;
						continue;
					}
					dependencyMismatch = false;
					
					if ( result == "pending" ) {
						this.toHide = this.toHide.not( this.errorsFor(element) );
						return;
					}
					
					if( !result ) {
						this.formatAndAdd( element, rule );
						return false;
					}
				} catch(e) {
					this.settings.debug && window.console && console.log("exception occured when checking element " + element.id
						 + ", check the '" + rule.method + "' method", e);
					throw e;
				}
			}
			if (dependencyMismatch)
				return;
			if ( this.objectLength(rules) )
				this.successList.push(element);
			return true;
		},
		
		// return the custom message for the given element and validation method
		// specified in the element's "messages" metadata
		customMetaMessage: function(element, method) {
			if (!$.metadata)
				return;
			
			var meta = this.settings.meta
				? $(element).metadata()[this.settings.meta]
				: $(element).metadata();
			
			return meta && meta.messages && meta.messages[method];
		},
		
		// return the custom message for the given element name and validation method
		customMessage: function( name, method ) {
			var m = this.settings.messages[name];
			return m && (m.constructor == String
				? m
				: m[method]);
		},
		
		// return the first defined argument, allowing empty strings
		findDefined: function() {
			for(var i = 0; i < arguments.length; i++) {
				if (arguments[i] !== undefined)
					return arguments[i];
			}
			return undefined;
		},
		
		defaultMessage: function( element, method) {
			return this.findDefined(
				this.customMessage( element.name, method ),
				this.customMetaMessage( element, method ),
				// title is never undefined, so handle empty string as undefined
				!this.settings.ignoreTitle && element.title || undefined,
				$.validator.messages[method],
				"<strong>Warning: No message defined for " + element.name + "</strong>"
			);
		},
		
		formatAndAdd: function( element, rule ) {
			var message = this.defaultMessage( element, rule.method ),
				theregex = /\$?\{(\d+)\}/g;
			if ( typeof message == "function" ) {
				message = message.call(this, rule.parameters, element);
			} else if (theregex.test(message)) {
				message = jQuery.format(message.replace(theregex, '{$1}'), rule.parameters);
			}			
			this.errorList.push({
				message: message,
				element: element
			});
			
			this.errorMap[element.name] = message;
			this.submitted[element.name] = message;
		},
		
		addWrapper: function(toToggle) {
			if ( this.settings.wrapper )
				toToggle = toToggle.add( toToggle.parent( this.settings.wrapper ) );
			return toToggle;
		},
		
		defaultShowErrors: function() {
			for ( var i = 0; this.errorList[i]; i++ ) {
				var error = this.errorList[i];
				this.settings.highlight && this.settings.highlight.call( this, error.element, this.settings.errorClass, this.settings.validClass );
				this.showLabel( error.element, error.message );
			}
			if( this.errorList.length ) {
				this.toShow = this.toShow.add( this.containers );
			}
			if (this.settings.success) {
				for ( var i = 0; this.successList[i]; i++ ) {
					this.showLabel( this.successList[i] );
				}
			}
			if (this.settings.unhighlight) {
				for ( var i = 0, elements = this.validElements(); elements[i]; i++ ) {
					this.settings.unhighlight.call( this, elements[i], this.settings.errorClass, this.settings.validClass );
				}
			}
			this.toHide = this.toHide.not( this.toShow );
			this.hideErrors();
			this.addWrapper( this.toShow ).show();
		},
		
		validElements: function() {
			return this.currentElements.not(this.invalidElements());
		},
		
		invalidElements: function() {
			return $(this.errorList).map(function() {
				return this.element;
			});
		},
		
		showLabel: function(element, message) {
			var label = this.errorsFor( element );
			if ( label.length ) {
				// refresh error/success class
				label.removeClass().addClass( this.settings.errorClass );
			
				// check if we have a generated label, replace the message then
				label.attr("generated") && label.html(message);
			} else {
				// create label
				label = $("<" + this.settings.errorElement + "/>")
					.attr({"for":  this.idOrName(element), generated: true})
					.addClass(this.settings.errorClass)
					.html(message || "");
				if ( this.settings.wrapper ) {
					// make sure the element is visible, even in IE
					// actually showing the wrapped element is handled elsewhere
					label = label.hide().show().wrap("<" + this.settings.wrapper + "/>").parent();
				}
				if ( !this.labelContainer.append(label).length )
					this.settings.errorPlacement
						? this.settings.errorPlacement(label, $(element) )
						: label.insertAfter(element);
			}
			if ( !message && this.settings.success ) {
				label.text("");
				typeof this.settings.success == "string"
					? label.addClass( this.settings.success )
					: this.settings.success( label );
			}
			this.toShow = this.toShow.add(label);
		},
		
		errorsFor: function(element) {
			var name = this.idOrName(element);
    		return this.errors().filter(function() {
				return $(this).attr('for') == name;
			});
		},
		
		idOrName: function(element) {
			return this.groups[element.name] || (this.checkable(element) ? element.name : element.id || element.name);
		},

		checkable: function( element ) {
			return /radio|checkbox/i.test(element.type);
		},
		
		findByName: function( name ) {
			// select by name and filter by form for performance over form.find("[name=...]")
			var form = this.currentForm;
			return $(document.getElementsByName(name)).map(function(index, element) {
				return element.form == form && element.name == name && element  || null;
			});
		},
		
		getLength: function(value, element) {
			switch( element.nodeName.toLowerCase() ) {
			case 'select':
				return $("option:selected", element).length;
			case 'input':
				if( this.checkable( element) )
					return this.findByName(element.name).filter(':checked').length;
			}
			return value.length;
		},
	
		depend: function(param, element) {
			return this.dependTypes[typeof param]
				? this.dependTypes[typeof param](param, element)
				: true;
		},
	
		dependTypes: {
			"boolean": function(param, element) {
				return param;
			},
			"string": function(param, element) {
				return !!$(param, element.form).length;
			},
			"function": function(param, element) {
				return param(element);
			}
		},
		
		optional: function(element) {
			return !$.validator.methods.required.call(this, $.trim(element.value), element) && "dependency-mismatch";
		},
		
		startRequest: function(element) {
			if (!this.pending[element.name]) {
				this.pendingRequest++;
				this.pending[element.name] = true;
			}
		},
		
		stopRequest: function(element, valid) {
			this.pendingRequest--;
			// sometimes synchronization fails, make sure pendingRequest is never < 0
			if (this.pendingRequest < 0)
				this.pendingRequest = 0;
			delete this.pending[element.name];
			if ( valid && this.pendingRequest == 0 && this.formSubmitted && this.form() ) {
				$(this.currentForm).submit();
				this.formSubmitted = false;
			} else if (!valid && this.pendingRequest == 0 && this.formSubmitted) {
				$(this.currentForm).triggerHandler("invalid-form", [this]);
				this.formSubmitted = false;
			}
		},
		
		previousValue: function(element) {
			return $.data(element, "previousValue") || $.data(element, "previousValue", {
				old: null,
				valid: true,
				message: this.defaultMessage( element, "remote" )
			});
		}
		
	},
	
	classRuleSettings: {
		required: {required: true},
		email: {email: true},
		url: {url: true},
		date: {date: true},
		dateISO: {dateISO: true},
		dateDE: {dateDE: true},
		number: {number: true},
		numberDE: {numberDE: true},
		digits: {digits: true},
		creditcard: {creditcard: true},
		floatVal: {floatVal: true}
	},
	
	addClassRules: function(className, rules) {
		className.constructor == String ?
			this.classRuleSettings[className] = rules :
			$.extend(this.classRuleSettings, className);
	},
	
	classRules: function(element) {
		var rules = {};
		var classes = $(element).attr('class');
		classes && $.each(classes.split(' '), function() {
			if (this in $.validator.classRuleSettings) {
				$.extend(rules, $.validator.classRuleSettings[this]);
			}
		});
		return rules;
	},
	
	attributeRules: function(element) {
		var rules = {};
		var $element = $(element);
		
		for (method in $.validator.methods) {
			var value = $element.attr(method);
			if (value) {
				rules[method] = value;
			}
		}
		
		// maxlength may be returned as -1, 2147483647 (IE) and 524288 (safari) for text inputs
		if (rules.maxlength && /-1|2147483647|524288/.test(rules.maxlength)) {
			delete rules.maxlength;
		}
		
		return rules;
	},
	
	metadataRules: function(element) {
		if (!$.metadata) return {};
		
		var meta = $.data(element.form, 'validator').settings.meta;
		return meta ?
			$(element).metadata()[meta] :
			$(element).metadata();
	},
	
	staticRules: function(element) {
		var rules = {};
		var validator = $.data(element.form, 'validator');
		if (validator.settings.rules) {
			rules = $.validator.normalizeRule(validator.settings.rules[element.name]) || {};
		}
		return rules;
	},
	
	normalizeRules: function(rules, element) {
		// handle dependency check
		$.each(rules, function(prop, val) {
			// ignore rule when param is explicitly false, eg. required:false
			if (val === false) {
				delete rules[prop];
				return;
			}
			if (val.param || val.depends) {
				var keepRule = true;
				switch (typeof val.depends) {
					case "string":
						keepRule = !!$(val.depends, element.form).length;
						break;
					case "function":
						keepRule = val.depends.call(element, element);
						break;
				}
				if (keepRule) {
					rules[prop] = val.param !== undefined ? val.param : true;
				} else {
					delete rules[prop];
				}
			}
		});
		
		// evaluate parameters
		$.each(rules, function(rule, parameter) {
			rules[rule] = $.isFunction(parameter) ? parameter(element) : parameter;
		});
		
		// clean number parameters
		$.each(['minlength', 'maxlength', 'min', 'max'], function() {
			if (rules[this]) {
				rules[this] = Number(rules[this]);
			}
		});
		$.each(['rangelength', 'range'], function() {
			if (rules[this]) {
				rules[this] = [Number(rules[this][0]), Number(rules[this][1])];
			}
		});
		
		if ($.validator.autoCreateRanges) {
			// auto-create ranges
			if (rules.min && rules.max) {
				rules.range = [rules.min, rules.max];
				delete rules.min;
				delete rules.max;
			}
			if (rules.minlength && rules.maxlength) {
				rules.rangelength = [rules.minlength, rules.maxlength];
				delete rules.minlength;
				delete rules.maxlength;
			}
		}
		
		// To support custom messages in metadata ignore rule methods titled "messages"
		if (rules.messages) {
			delete rules.messages;
		}
		
		return rules;
	},
	
	// Converts a simple string to a {string: true} rule, e.g., "required" to {required:true}
	normalizeRule: function(data) {
		if( typeof data == "string" ) {
			var transformed = {};
			$.each(data.split(/\s/), function() {
				transformed[this] = true;
			});
			data = transformed;
		}
		return data;
	},
	
	// http://docs.jquery.com/Plugins/Validation/Validator/addMethod
	addMethod: function(name, method, message) {
		$.validator.methods[name] = method;
		$.validator.messages[name] = message != undefined ? message : $.validator.messages[name];
		if (method.length < 3) {
			$.validator.addClassRules(name, $.validator.normalizeRule(name));
		}
	},

	methods: {

		// http://docs.jquery.com/Plugins/Validation/Methods/required
		required: function(value, element, param) {
			// check if dependency is met
			if ( !this.depend(param, element) )
				return "dependency-mismatch";
			switch( element.nodeName.toLowerCase() ) {
			case 'select':
				// could be an array for select-multiple or a string, both are fine this way
				var val = $(element).val();
				return val && val.length > 0;
			case 'input':
				if ( this.checkable(element) )
					return this.getLength(value, element) > 0;
			default:
				return $.trim(value).length > 0;
			}
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/remote
		remote: function(value, element, param) {
			if ( this.optional(element) )
				return "dependency-mismatch";
			
			var previous = this.previousValue(element);
			if (!this.settings.messages[element.name] )
				this.settings.messages[element.name] = {};
			previous.originalMessage = this.settings.messages[element.name].remote;
			this.settings.messages[element.name].remote = previous.message;
			
			param = typeof param == "string" && {url:param} || param; 
			
			if ( previous.old !== value ) {
				previous.old = value;
				var validator = this;
				this.startRequest(element);
				var data = {};
				data[element.name] = value;
				$.ajax($.extend(true, {
					url: param,
					mode: "abort",
					port: "validate" + element.name,
					dataType: "json",
					data: data,
					success: function(response) {
						validator.settings.messages[element.name].remote = previous.originalMessage;
						var valid = response === true;
						if ( valid ) {
							var submitted = validator.formSubmitted;
							validator.prepareElement(element);
							validator.formSubmitted = submitted;
							validator.successList.push(element);
							validator.showErrors();
						} else {
							var errors = {};
							var message = (previous.message = response || validator.defaultMessage( element, "remote" ));
							errors[element.name] = $.isFunction(message) ? message(value) : message;
							validator.showErrors(errors);
						}
						previous.valid = valid;
						validator.stopRequest(element, valid);
					}
				}, param));
				return "pending";
			} else if( this.pending[element.name] ) {
				return "pending";
			}
			return previous.valid;
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/minlength
		minlength: function(value, element, param) {
			return this.optional(element) || this.getLength($.trim(value), element) >= param;
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/maxlength
		maxlength: function(value, element, param) {
			return this.optional(element) || this.getLength($.trim(value), element) <= param;
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/rangelength
		rangelength: function(value, element, param) {
			var length = this.getLength($.trim(value), element);
			return this.optional(element) || ( length >= param[0] && length <= param[1] );
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/min
		min: function( value, element, param ) {
			return this.optional(element) || value >= param;
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/max
		max: function( value, element, param ) {
			return this.optional(element) || value <= param;
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/range
		range: function( value, element, param ) {
			return this.optional(element) || ( value >= param[0] && value <= param[1] );
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/email
		email: function(value, element) {
			// contributed by Scott Gonzalez: http://projects.scottsplayground.com/email_address_validation/
			return this.optional(element) || /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i.test(value);
		},
	
		// http://docs.jquery.com/Plugins/Validation/Methods/url
		url: function(value, element) {
			// contributed by Scott Gonzalez: http://projects.scottsplayground.com/iri/
			return this.optional(element) || /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(value);
		},
        
		// http://docs.jquery.com/Plugins/Validation/Methods/date
		date: function(value, element) {
			return this.optional(element) || !/Invalid|NaN/.test(new Date(value));
		},
	
		// http://docs.jquery.com/Plugins/Validation/Methods/dateISO
		dateISO: function(value, element) {
			return this.optional(element) || /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/.test(value);
		},
	
		// http://docs.jquery.com/Plugins/Validation/Methods/number
		number: function(value, element) {
			return this.optional(element) || /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value);
		},
	
		// http://docs.jquery.com/Plugins/Validation/Methods/digits
		digits: function(value, element) {
			return this.optional(element) || /^\d+$/.test(value);
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/creditcard
		// based on http://en.wikipedia.org/wiki/Luhn
		creditcard: function(value, element) {
			if ( this.optional(element) )
				return "dependency-mismatch";
			// accept only digits and dashes
			if (/[^0-9-]+/.test(value))
				return false;
			var nCheck = 0,
				nDigit = 0,
				bEven = false;

			value = value.replace(/\D/g, "");

			for (var n = value.length - 1; n >= 0; n--) {
				var cDigit = value.charAt(n);
				var nDigit = parseInt(cDigit, 10);
				if (bEven) {
					if ((nDigit *= 2) > 9)
						nDigit -= 9;
				}
				nCheck += nDigit;
				bEven = !bEven;
			}

			return (nCheck % 10) == 0;
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/accept
		accept: function(value, element, param) {
			param = typeof param == "string" ? param.replace(/,/g, '|') : "png|jpe?g|gif";
			return this.optional(element) || value.match(new RegExp(".(" + param + ")$", "i")); 
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/equalTo
		equalTo: function(value, element, param) {
			// bind to the blur event of the target in order to revalidate whenever the target field is updated
			// TODO find a way to bind the event just once, avoiding the unbind-rebind overhead
			var target = $(param).unbind(".validate-equalTo").bind("blur.validate-equalTo", function() {
				$(element).valid();
			});
			return value == target.val();
		},
		
		floatVal: function(value, element) {
			// contributed by EviMed Online GmbH 
			return this.optional(element) || /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$|\.+-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value);
		},

		// The below line added by EviMed Online GmbH 
		// http://docs.jquery.com/Plugins/Validation/Methods/dateDE
		dateDE: function(value, element) {
			return this.optional(element) || /^\d\d?\.\d\d?\.\d\d\d?\d?$/.test(value);
		}
	}
	
});

// deprecated, use $.validator.format instead
$.format = $.validator.format;

})(jQuery);

// ajax mode: abort
// usage: $.ajax({ mode: "abort"[, port: "uniqueport"]});
// if mode:"abort" is used, the previous request on that port (port can be undefined) is aborted via XMLHttpRequest.abort() 
;(function($) {
	var ajax = $.ajax;
	var pendingRequests = {};
	$.ajax = function(settings) {
		// create settings for compatibility with ajaxSetup
		settings = $.extend(settings, $.extend({}, $.ajaxSettings, settings));
		var port = settings.port;
		if (settings.mode == "abort") {
			if ( pendingRequests[port] ) {
				pendingRequests[port].abort();
			}
			return (pendingRequests[port] = ajax.apply(this, arguments));
		}
		return ajax.apply(this, arguments);
	};
})(jQuery);

// provides cross-browser focusin and focusout events
// IE has native support, in other browsers, use event caputuring (neither bubbles)

// provides delegate(type: String, delegate: Selector, handler: Callback) plugin for easier event delegation
// handler is only called when $(event.target).is(delegate), in the scope of the jquery-object for event.target 
;(function($) {
	// only implement if not provided by jQuery core (since 1.4)
	// TODO verify if jQuery 1.4's implementation is compatible with older jQuery special-event APIs
	if (!jQuery.event.special.focusin && !jQuery.event.special.focusout && document.addEventListener) {
		$.each({
			focus: 'focusin',
			blur: 'focusout'	
		}, function( original, fix ){
			$.event.special[fix] = {
				setup:function() {
					this.addEventListener( original, handler, true );
				},
				teardown:function() {
					this.removeEventListener( original, handler, true );
				},
				handler: function(e) {
					arguments[0] = $.event.fix(e);
					arguments[0].type = fix;
					return $.event.handle.apply(this, arguments);
				}
			};
			function handler(e) {
				e = $.event.fix(e);
				e.type = fix;
				return $.event.handle.call(this, e);
			}
		});
	};
	$.extend($.fn, {
		validateDelegate: function(delegate, type, handler) {
			return this.bind(type, function(event) {
				var target = $(event.target);
				if (target.is(delegate)) {
					return handler.apply(target, arguments);
				}
			});
		}
	});
})(jQuery);

//     Underscore.js 1.3.3
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.
//     Portions of Underscore are inspired or borrowed from Prototype,
//     Oliver Steele's Functional, and John Resig's Micro-Templating.
//     For all details and documentation:
//     http://documentcloud.github.com/underscore

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var slice            = ArrayProto.slice,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) { return new wrapper(obj); };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root['_'] = _;
  }

  // Current version.
  _.VERSION = '1.3.3';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    if (obj.length === +obj.length) results.length = obj.length;
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var reversed = _.toArray(obj).reverse();
    if (context && !initial) iterator = _.bind(iterator, context);
    return initial ? _.reduce(reversed, iterator, memo, context) : _.reduce(reversed, iterator);
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    each(obj, function(value, index, list) {
      if (!iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if a given value is included in the array or object using `===`.
  // Aliased as `contains`.
  _.include = _.contains = function(obj, target) {
    var found = false;
    if (obj == null) return found;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    found = any(obj, function(value) {
      return value === target;
    });
    return found;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method || value : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Return the maximum element or (element-based computation).
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.max.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0]) return Math.min.apply(Math, obj);
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var shuffled = [], rand;
    each(obj, function(value, index, list) {
      rand = Math.floor(Math.random() * (index + 1));
      shuffled[index] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, val, context) {
    var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      if (a === void 0) return 1;
      if (b === void 0) return -1;
      return a < b ? -1 : a > b ? 1 : 0;
    }), 'value');
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, val) {
    var result = {};
    var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
    each(obj, function(value, index) {
      var key = iterator(value, index);
      (result[key] || (result[key] = [])).push(value);
    });
    return result;
  };

  // Use a comparator function to figure out at what index an object should
  // be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator) {
    iterator || (iterator = _.identity);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >> 1;
      iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj)                                     return [];
    if (_.isArray(obj))                           return slice.call(obj);
    if (_.isArguments(obj))                       return slice.call(obj);
    if (obj.toArray && _.isFunction(obj.toArray)) return obj.toArray();
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    return _.isArray(obj) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especcialy useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail`.
  // Especially useful on the arguments object. Passing an **index** will return
  // the rest of the values in the array from that index onward. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = function(array, index, guard) {
    return slice.call(array, (index == null) || guard ? 1 : index);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return _.reduce(array, function(memo, value) {
      if (_.isArray(value)) return memo.concat(shallow ? value : _.flatten(value));
      memo[memo.length] = value;
      return memo;
    }, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator) {
    var initial = iterator ? _.map(array, iterator) : array;
    var results = [];
    // The `isSorted` flag is irrelevant if the array only contains two elements.
    if (array.length < 3) isSorted = true;
    _.reduce(initial, function (memo, value, index) {
      if (isSorted ? _.last(memo) !== value || !memo.length : !_.include(memo, value)) {
        memo.push(value);
        results.push(array[index]);
      }
      return memo;
    }, []);
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays. (Aliased as "intersect" for back-compat.)
  _.intersection = _.intersect = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = _.flatten(slice.call(arguments, 1), true);
    return _.filter(array, function(value){ return !_.include(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) results[i] = _.pluck(args, "" + i);
    return results;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i, l;
    if (isSorted) {
      i = _.sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
    for (i = 0, l = array.length; i < l; i++) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item) {
    if (array == null) return -1;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
    var i = array.length;
    while (i--) if (i in array && array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, throttling, more, result;
    var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
    return function() {
      context = this; args = arguments;
      var later = function() {
        timeout = null;
        if (more) func.apply(context, args);
        whenDone();
      };
      if (!timeout) timeout = setTimeout(later, wait);
      if (throttling) {
        more = true;
      } else {
        result = func.apply(context, args);
      }
      whenDone();
      throttling = true;
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      if (immediate && !timeout) func.apply(context, args);
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      return memo = func.apply(this, arguments);
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func].concat(slice.call(arguments, 0));
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) { return func.apply(this, arguments); }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    return _.map(obj, _.identity);
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var result = {};
    each(_.flatten(slice.call(arguments, 1)), function(key) {
      if (key in obj) result[key] = obj[key];
    });
    return result;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (obj[prop] == null) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function.
  function eq(a, b, stack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a._chain) a = a._wrapped;
    if (b._chain) b = b._wrapped;
    // Invoke a custom `isEqual` method if one is provided.
    if (a.isEqual && _.isFunction(a.isEqual)) return a.isEqual(b);
    if (b.isEqual && _.isFunction(b.isEqual)) return b.isEqual(a);
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = stack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (stack[length] == a) return true;
    }
    // Add the first object to the stack of traversed objects.
    stack.push(a);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          // Ensure commutative equality for sparse arrays.
          if (!(result = size in a == size in b && eq(a[size], b[size], stack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent.
      if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) return false;
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], stack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    stack.pop();
    return result;
  }

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType == 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Is a given variable an arguments object?
  _.isArguments = function(obj) {
    return toString.call(obj) == '[object Arguments]';
  };
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Is a given value a function?
  _.isFunction = function(obj) {
    return toString.call(obj) == '[object Function]';
  };

  // Is a given value a string?
  _.isString = function(obj) {
    return toString.call(obj) == '[object String]';
  };

  // Is a given value a number?
  _.isNumber = function(obj) {
    return toString.call(obj) == '[object Number]';
  };

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return _.isNumber(obj) && isFinite(obj);
  };

  // Is the given value `NaN`?
  _.isNaN = function(obj) {
    // `NaN` is the only value for which `===` is not reflexive.
    return obj !== obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value a date?
  _.isDate = function(obj) {
    return toString.call(obj) == '[object Date]';
  };

  // Is the given value a regular expression?
  _.isRegExp = function(obj) {
    return toString.call(obj) == '[object RegExp]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Has own property?
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function (n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Escape a string for HTML interpolation.
  _.escape = function(string) {
    return (''+string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g,'&#x2F;');
  };

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object, ensuring that
  // they're correctly added to the OOP wrapper as well.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      addToWrapper(name, _[name] = obj[name]);
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /.^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    '\\': '\\',
    "'": "'",
    'r': '\r',
    'n': '\n',
    't': '\t',
    'u2028': '\u2028',
    'u2029': '\u2029'
  };

  for (var p in escapes) escapes[escapes[p]] = p;
  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
  var unescaper = /\\(\\|'|r|n|t|u2028|u2029)/g;

  // Within an interpolation, evaluation, or escaping, remove HTML escaping
  // that had been previously added.
  var unescape = function(code) {
    return code.replace(unescaper, function(match, escape) {
      return escapes[escape];
    });
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    settings = _.defaults(settings || {}, _.templateSettings);

    // Compile the template source, taking care to escape characters that
    // cannot be included in a string literal and then unescape them in code
    // blocks.
    var source = "__p+='" + text
      .replace(escaper, function(match) {
        return '\\' + escapes[match];
      })
      .replace(settings.escape || noMatch, function(match, code) {
        return "'+\n_.escape(" + unescape(code) + ")+\n'";
      })
      .replace(settings.interpolate || noMatch, function(match, code) {
        return "'+\n(" + unescape(code) + ")+\n'";
      })
      .replace(settings.evaluate || noMatch, function(match, code) {
        return "';\n" + unescape(code) + "\n;__p+='";
      }) + "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __p='';" +
      "var print=function(){__p+=Array.prototype.join.call(arguments, '')};\n" +
      source + "return __p;\n";

    var render = new Function(settings.variable || 'obj', '_', source);
    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for build time
    // precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' +
      source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // The OOP Wrapper
  // ---------------

  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.
  var wrapper = function(obj) { this._wrapped = obj; };

  // Expose `wrapper.prototype` as `_.prototype`
  _.prototype = wrapper.prototype;

  // Helper function to continue chaining intermediate results.
  var result = function(obj, chain) {
    return chain ? _(obj).chain() : obj;
  };

  // A method to easily add functions to the OOP wrapper.
  var addToWrapper = function(name, func) {
    wrapper.prototype[name] = function() {
      var args = slice.call(arguments);
      unshift.call(args, this._wrapped);
      return result(func.apply(_, args), this._chain);
    };
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      var wrapped = this._wrapped;
      method.apply(wrapped, arguments);
      var length = wrapped.length;
      if ((name == 'shift' || name == 'splice') && length === 0) delete wrapped[0];
      return result(wrapped, this._chain);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    wrapper.prototype[name] = function() {
      return result(method.apply(this._wrapped, arguments), this._chain);
    };
  });

  // Start chaining a wrapped Underscore object.
  wrapper.prototype.chain = function() {
    this._chain = true;
    return this;
  };

  // Extracts the result from a wrapped and chained object.
  wrapper.prototype.value = function() {
    return this._wrapped;
  };

}).call(this);
window.utils = {
	validations:{
		groupcheck:function(validations, value){
			var message = [];
			var result = true;
			for(var i in validations){
				var validation = validations[i];
				if(utils.validations[validation]){
					result_ = utils.validations[validation](value);
					if(!result_.isValid)
						message.push(result_.message);
					result = result&&result_.isValid;
				}
			}
			
			if(result)
				message =[];
			
			return utils.validations.message(result, message.join(','));
		},
		required:function(value){
			return utils.validations.message((value && (value+'').length > 0), "You must enter a Value");
		},
		time:function(value){
			if(!value)
				return utils.validations.message(true);
			return utils.validations.message((value.match(/^(\d{1,2}(.\d{2})?)([ap]m)?$/)), 'Not a valid Time!');
		},
		url:function(value){
			if(!value)
				return utils.validations.message(true);
			var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
			return utils.validations.message(regexp.test(value), "It has to be URL!");
			//return utils.validations.message((value && value.length > 0), "It has to be URL!");
		},
		colorcode:function(value){
			if(!value)
				return utils.validations.message(true);
			
			var regexp = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
			return utils.validations.message(regexp.test(value), "It has to be Hex color code!");
		},
		email:function(value){
			if(!value)
				return utils.validations.message(true);
			var regexp = /\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/;
			return utils.validations.message(regexp.test(value), "It has to be Email!");
		},
		message:function(result, message){
			return result ? {isValid: true} : {isValid: false, message: message};
		}
	},
    // Asynchronously load templates located in separate .html files
    loadTemplate: function(views, callback) {

        var deferreds = [];
        window.templates = window.templates||{};
        
        $.each(views, function(index, view) {
            //if (window[view]) {
            	if(view.indexOf('.html') == -1||view.indexOf('.htm') == -1)
	                deferreds.push($.get('templates/' + view + '.html', function(data) {
	                	window.templates[view] = data;
	                	if (window[view])
	                		window[view].prototype.template = _.template(data);
	                }));
            	else
            		deferreds.push($.get('templates/' + view, function(data) {
            			window.templates[view] = data;
            			if (window[view])
            				window[view].prototype.template = _.template(data);
 	                }));
            /*} else {
            	//
            	// we willa dd this to templates
            	//
            	window.templates[view] = data;
                //alert(view + " not found");
            }*/
        });

        $.when.apply(null, deferreds).done(callback);
    },
    
    getTemplate: function(view, callback) {
    	window.templates = window.templates||{};
    	if(window.templates[view])
    		callback(window.templates[view]);
    	else if(view.indexOf('.html') == -1||view.indexOf('.htm') == -1)
            $.get('templates/' + view + '.html', function(data) {
            	window.templates[view] = data;
            	callback(data);
            });
    	else{
    		$.get('templates/' + view, function(data) {
            	window.templates[view] = data;
            	callback(data);
            });
    	}
    },
    
    loadModels: function(models, callback) {
        var deferreds = [];
        window.templates = window.templates||{};
        $.each(views, function(index, view) {
        	if (window[view]) {
                deferreds.push($.get('js/models/' + view + '.js', function(data) {
                	window[view].prototype.template = _.template(data);
                }));
            } else {
                alert(view + " not found");
            }
        });

        $.when.apply(null, deferreds).done(callback);
    },

    uploadFile: function (url, file, callback) {
        var self = this;
        var data = new FormData();
        data.append('file', file);
        $.ajax({
            url: url,
            type: 'POST',
            data: data,
            processData: false,
            cache: false,
            contentType: false
        })
        .done(function (data) {
        	callback(null, data);
        })
        .fail(function () {
        	callback('An error occurred while uploading ' + file.name);
        });
    },
    getDayDifference: function(startDate, endDate) {
    	
    	var numberOfDays = -1;
    	
    	if(startDate != undefined && startDate != '' && startDate instanceof Date && 
    	   endDate != undefined && endDate != '' && endDate instanceof Date) {
    		
    		if(endDate >= startDate) {
            	var oneDay = 1000*60*60*24;
            	numberOfDays = Math.round((endDate.getTime() - startDate.getTime()) / oneDay) + 1;
            }
    	}
    	
    	return numberOfDays;
    },
    
    isValidURL: function(url) {
    	
    	// non-mandatory http 
    	var urlPattern = new RegExp("^(((ht|f)tp(s?))\://)?(www.|[a-zA-Z].)[a-zA-Z0-9\-\.]+\.(com|de|edu|gov|mil|net|org|biz|info|name|museum|us|ca|uk|be|bd|in|eu)(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\;\?\'\\\+&amp;%\$#\=~_\-]+))*$");
    	
    	// mandatory http
    	// var urlPattern = new RegExp("^(((ht|f)tp(s?))\://).+(www.|[a-zA-Z].)[a-zA-Z0-9\-\.]+\.(com|de|edu|gov|mil|net|org|biz|info|name|museum|us|ca|uk|be|bd|in|eu)(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\;\?\'\\\+&amp;%\$#\=~_\-]+))*$");
    	
    	if(url.search(urlPattern) != -1)
    		return true; 
    	
		return false;
    	
    },
    
    generateId: function(name) {
    	if (name) {
    		name = name.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
    	}
    	
    	return name;
    },
    capitaliseFirstLetter : function(string){
    	if(!string)
    		return string;
    	return string.charAt(0).toUpperCase() + string.slice(1);
    },
    lowercaseFirstLetter : function(string){
    	if(!string)
    		return string;
    	return string.charAt(0).toLowerCase() + string.slice(1);
    },
    createCookie : function(name,value,days) {
    	if (days) {
	        var date = new Date();
	        date.setTime(date.getTime()+(days*24*60*60*1000));
	        var expires = "; expires="+date.toGMTString();
    	}
    	else 
    		var expires = "";
		document.cookie = name+"="+value+expires+"; path=/";
	},
    readCookie : function(name) {
    	var nameEQ = name + "=";
    	var ca = document.cookie.split(';');
    	for(var i=0;i < ca.length;i++) {
	        var c = ca[i];
	        while (c.charAt(0)==' ') c = c.substring(1,c.length);
	        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    	}
    	return null;
    },
    eraseCookie : function(name) {
    	utils.createCookie(name,"",-1);
    },
    getLanguageId : function(){
        if(window.userprofile && window.userprofile.get('languageId')){
            var langkey = window.userprofile.get('languageId');
            
            var langid = langkey.split('_')[0];
            if(langid == 'en')
                return null;
            else
                return langid;
        }  else
            return null;            

     }
};

/**
 * date parsing tool from bootstrap datepicker code.
 */
window.utils.dateTools = {
	parseFormat: function(format){
		var separator = format.match(/[.\/-].*?/),
			parts = format.split(/\W+/);
		if (!separator || !parts || parts.length == 0){
			throw new Error("Invalid date format.");
		}
		return {separator: separator, parts: parts};
	},
	parseDate: function(date, format) {
		if(!date) return;
		
		var parts = date.split(format.separator),
			date = new Date(),
			val;
		if (parts.length == format.parts.length) {
			for (var i=0, cnt = format.parts.length; i < cnt; i++) {
				val = parseInt(parts[i], 10)||1;
				switch(format.parts[i]) {
					case 'dd':
					case 'd':
						date.setDate(val);
						break;
					case 'mm':
					case 'm':
						date.setMonth(val - 1);
						break;
					case 'yy':
						date.setFullYear(2000 + val);
						break;
					case 'yyyy':
						date.setFullYear(val);
						break;
				}
			}
		}
		return date;
	},
	formatDate: function(date, format){
		var val = {
			d: date.getDate(),
			m: date.getMonth() + 1,
			yy: date.getFullYear().toString().substring(2),
			yyyy: date.getFullYear()
		};
		val.dd = (val.d < 10 ? '0' : '') + val.d;
		val.mm = (val.m < 10 ? '0' : '') + val.m;
		var date = [];
		for (var i=0, cnt = format.parts.length; i < cnt; i++) {
			date.push(val[format.parts[i]]);
		}
		return date.join(format.separator);
	},
	parseFormat: function(format){
		var separator = format.match(/[.\/-].*?/),
			parts = format.split(/\W+/);
		if (!separator || !parts || parts.length == 0){
			throw new Error("Invalid date format.");
		}
		return {separator: separator, parts: parts};
	},
	addDays : function(someDate, days) { //someDate: Date, days: int
		var tempDate = someDate;
		tempDate.setTime(tempDate.getTime() +  (days * 24 * 60 * 60 * 1000));
		return tempDate;
	}
};

var today = new Date();

window.utils.datePicker = function(view, $dateField, options){
	var model = view.model;
	options = options||{};
	for(var i in options){
		if(typeof options[i] == 'string'){}
		else if(options[i].length > 1){
			//for(var j in options[i])
				options[i][0].on('changed', function(){
					$dateField.trigger('change');
				});
		}else
			options[i].on('changed', function(){
				$dateField.trigger('change');
			});
	}
	
	$dateField
	.datepicker({format:'dd.mm.yyyy'})
	.on('show', function(){
		var dp = $(this);
		if(dp.val() == ''||dp.val() == '01.02.1970')  {
			if(options && typeof options.fromdate == 'string'){
				dp.val(options.fromdate).datepicker('update');
			}else
				dp.val(today.getDate()+'.'+(today.getMonth() + 1)+'.'+today.getFullYear()).datepicker('update');
			return false;
		}
	}).on('changeDate', function(ev){
		view.change(ev);
		$dateField.trigger('changed');
		
		var dp = $(this);
		dp.datepicker('hide');
		
	}).on('hide', function(e){
		var dp = $(this);
		if(dp.val() == ''||dp.val() == '01.02.1970')
			$dateField.val('');
		view.change(e);
		$dateField.trigger('changed');
	});
}

if(utils)
	utils = window.utils;
/**
 * A plugin for loading the backbone templates and keeping it in local storage
 * uses a template Version so that any time any update in the template will reset the template
 * and will again fetch from the server.
 * 
 */

(function() {
	var templateLoader = {
		templateVersion: window.templateVersion||"0.0.0",
		templates: {},
		loadRemoteTemplate: function(templateName, filename, callback) {
			if (!this.templates[templateName]) {
				var self = this;
				if($('#' + templateName + '_tmpl') && $('#' + templateName + '_tmpl').length > 0){
					callback($('#' + templateName+'_tmpl').html());
					return;
				}else{
					var filename_ = filename.substring(filename.indexOf('/')+1)
					filename_ = filename_.replace('.html', '');
					filename_ = filename_.replace(/./g, '_');
					filename_ = filename_.replace(/\//g, '_');
					
					if($('#' + filename_ + '_tmpl') && $('#' + filename_ + '_tmpl').length > 0){
						callback($('#' + filename_ +'_tmpl').html());
						return;
					}else{
						jQuery.get(filename, function(data) {
							if(data){
								self.addTemplate(templateName, data);
								self.saveLocalTemplates();
							}
							if(callback)
								callback(data);
							else
								return data;
						}, 'text');
					}
				}	
			} else {
				if(callback)
					callback(this.templates[templateName]);
				else
					return this.templates[templateName];
			}
		}, 
		addTemplate: function(templateName, data) {
			this.templates[templateName] = data;
		},
		localStorageAvailable: function() {
			try {
				return 'localStorage' in window && window['localStorage'] !== null;
			} catch (e) {
				return false;
			}
		},
		saveLocalTemplates: function() {
			if (this.localStorageAvailable) {
				try{
					localStorage.setItem("templates", JSON.stringify(this.templates));
				}catch(err){
					
				}
				localStorage.setItem("templateVersion", this.templateVersion);
			}
		},
		loadLocalTemplates: function() {
			if (this.localStorageAvailable) {
				var templateVersion = localStorage.getItem("templateVersion");
				if (templateVersion && templateVersion == this.templateVersion) {
					var templates = localStorage.getItem("templates");
					if (templates) {
						templates = JSON.parse(templates);
						for (var x in templates) {
							if (!this.templates[x]) {
								this.addTemplate(x, templates[x]);
							}
						}
					}
				} else {
					localStorage.removeItem("templates");
					localStorage.removeItem("templateVersion");
				}
	        }
		},
		clearLocalTemplates:function(){
			localStorage.removeItem("templates");
			localStorage.removeItem("templateVersion");
		}
    };
    window.templateLoader = templateLoader;
})();
$(function(){
	templateLoader.loadLocalTemplates();
});
(function() {

var queryStringParam = /^\?(.*)/;
var namedParam    = /:([\w\d]+)/g;
var splatParam    = /\*([\w\d]+)/g;
var escapeRegExp  = /[-[\]{}()+?.,\\^$|#\s]/g;
var queryStrip = /(\?.*)$/;
var fragmentStrip = /^([^\?]*)/;
Backbone.Router.arrayValueSplit = '|';

var _getFragment = Backbone.History.prototype.getFragment;

_.extend(Backbone.History.prototype, {
  getFragment : function(fragment, forcePushState, excludeQueryString) {
    fragment = _getFragment.apply(this, arguments);
    if (excludeQueryString) {
      fragment = fragment.replace(queryStrip, '');
    }
    return fragment;
  },

  // this will not perform custom query param serialization specific to the router
  // but will return a map of key/value pairs (the value is a string or array)
  getQueryParameters : function(fragment, forcePushState) {
    fragment = _getFragment.apply(this, arguments);
    // if no query string exists, this will still be the original fragment
    var queryString = fragment.replace(fragmentStrip, '');
    var match = queryString.match(queryStringParam);
    if (match) {
      queryString = match[1];
      var rtn = {};
      iterateQueryString(queryString, function(name, value) {
        if (!rtn[name]) {
          rtn[name] = value;
        } else if (_.isString(rtn[name])) {
          rtn[name] = [rtn[name], value];
        } else {
          rtn[name].push(value);
        }
      });
      return rtn;
    } else {
      // no values
      return {};
    }
  }
});

_.extend(Backbone.Router.prototype, {
  initialize: function(options) {
    this.encodedSplatParts = options && options.encodedSplatParts;
  },

  getFragment : function(fragment, forcePushState, excludeQueryString) {
    fragment = _getFragment.apply(this, arguments);
    if (excludeQueryString) {
      fragment = fragment.replace(queryStrip, '');
    }
    return fragment;
  },

  _routeToRegExp : function(route) {
    var splatMatch = (splatParam.exec(route) || {index: -1});
    var namedMatch = (namedParam.exec(route) || {index: -1});

    route = route.replace(escapeRegExp, "\\$&")
                 .replace(namedParam, "([^\/?]*)")
                 .replace(splatParam, "([^\?]*)");
    route += '([\?]{1}.*)?';

    var rtn = new RegExp('^' + route + '$');

    // use the rtn value to hold some parameter data
    if (splatMatch.index >= 0) {
      // there is a splat
      if (namedMatch >= 0) {
        // negative value will indicate there is a splat match before any named matches
        rtn.splatMatch = splatMatch.index - namedMatch.index;
      } else {
        rtn.splatMatch = -1;
      }
    }

    return rtn;
  },

  /**
   * Given a route, and a URL fragment that it matches, return the array of
   * extracted parameters.
   */
  _extractParameters : function(route, fragment) {
    var params = route.exec(fragment).slice(1);

    // do we have an additional query string?
    var match = params.length && params[params.length-1] && params[params.length-1].match(queryStringParam);
    if (match) {
      var queryString = match[1];
      var data = {};
      if (queryString) {
        var self = this;
        iterateQueryString(queryString, function(name, value) {
          self._setParamValue(name, value, data);
        });
      }
      params[params.length-1] = data;
    }

    // decode params
    var length = params.length;
    if (route.splatMatch && this.encodedSplatParts) {
      if (route.splatMatch < 0) {
        // splat param is first
        return params;
      } else {
        length = length - 1;
      }
    }

    for (var i=0; i<length; i++) {
      if (_.isString(params[i])) {
        params[i] = decodeURIComponent(params[i]);
      }
    }

    return params;
  },

  /**
   * Set the parameter value on the data hash
   */
  _setParamValue : function(key, value, data) {
    // use '.' to define hash separators
    var parts = key.split('.');
    var _data = data;
    for (var i=0; i<parts.length; i++) {
      var part = parts[i];
      if (i === parts.length-1) {
        // set the value
        _data[part] = this._decodeParamValue(value, _data[part]);
      } else {
        _data = _data[part] = _data[part] || {};
      }
    }
  },

  /**
   * Decode an individual parameter value (or list of values)
   * @param value the complete value
   * @param currentValue the currently known value (or list of values)
   */
  _decodeParamValue : function(value, currentValue) {
    // '|' will indicate an array.  Array with 1 value is a=|b - multiple values can be a=b|c
    var splitChar = Backbone.Router.arrayValueSplit;
    if (value.indexOf(splitChar) >= 0) {
      var values = value.split(splitChar);
      // clean it up
      for (var i=values.length-1; i>=0; i--) {
        if (!values[i]) {
          values.splice(i, 1);
        } else {
          values[i] = decodeURIComponent(values[i]);
        }
      }
      return values;
    }
    if (!currentValue) {
      return decodeURIComponent(value);
    } else if (_.isArray(currentValue)) {
      currentValue.push(value);
      return currentValue;
    } else {
      return [currentValue, value];
    }
  },

  /**
   * Return the route fragment with queryParameters serialized to query parameter string
   */
  toFragment: function(route, queryParameters) {
    if (queryParameters) {
      if (!_.isString(queryParameters)) {
        queryParameters = this._toQueryString(queryParameters);
      }
      if(queryParameters) {
        route += '?' + queryParameters;
      }
    }
    return route;
  },

  /**
   * Serialize the val hash to query parameters and return it.  Use the namePrefix to prefix all param names (for recursion)
   */
  _toQueryString: function(val, namePrefix) {
    var splitChar = Backbone.Router.arrayValueSplit;
    function encodeSplit(val) { return val.replace(splitChar, encodeURIComponent(splitChar)); }

    if (!val) return '';
    namePrefix = namePrefix || '';
    var rtn = '';
    for (var name in val) {
      var _val = val[name];
      if (_.isString(_val) || _.isNumber(_val) || _.isBoolean(_val) || _.isDate(_val)) {
        // primitive type
        _val = this._toQueryParam(_val);
        if (_.isBoolean(_val) || _.isNumber(_val) || _val) {
          rtn += (rtn ? '&' : '') + this._toQueryParamName(name, namePrefix) + '=' + encodeSplit(encodeURIComponent(_val));
        }
      } else if (_.isArray(_val)) {
        // arrays use Backbone.Router.arrayValueSplit separator
        var str = '';
        for (var i in _val) {
          var param = this._toQueryParam(_val[i]);
          if (_.isBoolean(param) || param) {
            str += splitChar + encodeSplit(param);
          }
        }
        if (str) {
          rtn += (rtn ? '&' : '') + this._toQueryParamName(name, namePrefix) + '=' + str;
        }
      } else {
        // dig into hash
        var result = this._toQueryString(_val, this._toQueryParamName(name, namePrefix, true));
        if (result) {
          rtn += (rtn ? '&' : '') + result;
        }
      }
    }
    return rtn;
  },

  /**
   * return the actual parameter name
   * @param name the parameter name
   * @param namePrefix the prefix to the name
   * @param createPrefix true if we're creating a name prefix, false if we're creating the name
   */
  _toQueryParamName: function(name, prefix, isPrefix) {
    return (prefix + name + (isPrefix ? '.' : ''));
  },

  /**
   * Return the string representation of the param used for the query string
   */
  _toQueryParam: function (param) {
    if (_.isNull(param) || _.isUndefined(param)) {
      return null;
    }
    if (_.isDate(param)) {
      return param.getDate().getTime();
    }
    return param;
  }
});

function iterateQueryString(queryString, callback) {
  var keyValues = queryString.split('&');
  _.each(keyValues, function(keyValue) {
    var arr = keyValue.split('=');
    if (arr.length > 1 && arr[1]) {
      callback(arr[0], arr[1]);
    }
  });
}

})();
/*! backbone.routefilter - v0.1.0 - 2012-09-10
* https://github.com/boazsender/backbone.routefilter
* Copyright (c) 2012 Boaz Sender; Licensed MIT */
(function(a,b){var c=a.Router.prototype.route,d=function(){};b.extend(a.Router.prototype,{before:d,after:d,route:function(a,d,e){e||(e=this[d]);var f=b.bind(function(){if(this.before.apply(this,arguments)===!1)return;e&&e.apply(this,arguments),this.after.apply(this,arguments)},this);return c.call(this,a,d,f)}})})(Backbone,_);
// Backbone.Syphon, v0.3.0
// Copyright (c)2012 Derick Bailey, Muted Solutions, LLC.
// Distributed under MIT license
// http://github.com/derickbailey/backbone.syphon
Backbone.Syphon = (function(Backbone, $, _){
  var Syphon = {};

  // Ignore Element Types
  // --------------------

  // Tell Syphon to ignore all elements of these types. You can
  // push new types to ignore directly in to this array.
  Syphon.ignoredTypes = ["button", "submit", "reset"];

  // Syphon
  // ------

  // Get a JSON object that represents
  // all of the form inputs, in this view
  Syphon.serialize = function(view, options){
    var data = {};

    // Build the configuration
    var config = buildConfig(options);

    // Get all of the elements to process
    var elements = getInputElements(view, config);

    // Process all of the elements
    _.each(elements, function(el){
      var $el = $(el);
      var type = getElementType($el); 

      // Get the key for the input
      var keyExtractor = config.keyExtractors.get(type);
      var key = keyExtractor($el);

      // Get the value for the input
      var inputReader = config.inputReaders.get(type);
      var value = inputReader($el);

      // Get the key assignment validator and make sure
      // it's valid before assigning the value to the key
      var validKeyAssignment = config.keyAssignmentValidators.get(type);
      if (validKeyAssignment($el, key, value)){
        data[key] = value;
      }
    });

    // Done; send back the results.
    return data;
  };
  
  // Use the given JSON object to populate
  // all of the form inputs, in this view
  Syphon.deserialize = function(view, data, options){
    // Build the configuration
    var config = buildConfig(options);

    // Get all of the elements to process
    var elements = getInputElements(view, config);

    // Process all of the elements
    _.each(elements, function(el){
      var $el = $(el);
      var type = getElementType($el); 

      // Get the key for the input
      var keyExtractor = config.keyExtractors.get(type);
      var key = keyExtractor($el);

      // Write value to input
      var inputWriter = config.inputWriters.get(type);
      inputWriter($el, data[key]);
    });
  };

  // Helpers
  // -------

  // Retrieve all of the form inputs
  // from the view
  var getInputElements = function(view, config){
    var form = view.$el.is("form") ? view.el : view.$("form")[0];
    var elements = form.elements;

    elements = _.reject(elements, function(el){
      var reject;
      var type = getElementType(el);
      var extractor = config.keyExtractors.get(type);
      var identifier = extractor($(el));
     
      var foundInIgnored = _.include(config.ignoredTypes, type);
      var foundInInclude = _.include(config.include, identifier);
      var foundInExclude = _.include(config.exclude, identifier);

      if (foundInInclude){
        reject = false;
      } else {
        if (config.include){
          reject = true;
        } else {
          reject = (foundInExclude || foundInIgnored);
        }
      }

      return reject;
    });

    return elements;
  };

  // Determine what type of element this is. It
  // will either return the `type` attribute of
  // an `<input>` element, or the `tagName` of
  // the element when the element is not an `<input>`.
  var getElementType = function(el){
    var typeAttr;
    var $el = $(el);
    var tagName = $el[0].tagName;
    var type = tagName;

    if (tagName.toLowerCase() === "input"){
      typeAttr = $el.attr("type");
      if (typeAttr){
        type = typeAttr;
      } else {
        type = "text";
      }
    }
    
    // Always return the type as lowercase
    // so it can be matched to lowercase
    // type registrations.
    return type.toLowerCase();
  };
  
  // Build a configuration object and initialize
  // default values.
  var buildConfig = function(options){
    var config = _.clone(options) || {};
    
    config.ignoredTypes = _.clone(Syphon.ignoredTypes);
    config.inputReaders = config.inputReaders || Syphon.InputReaders;
    config.inputWriters = config.inputWriters || Syphon.InputWriters;
    config.keyExtractors = config.keyExtractors || Syphon.KeyExtractors;
    config.keyAssignmentValidators = config.keyAssignmentValidators || Syphon.KeyAssignmentValidators;
    
    return config;
  };

  return Syphon;
})(Backbone, jQuery, _);

// Type Registry
// -------------

// Type Registries allow you to register something to
// an input type, and retrieve either the item registered
// for a specific type or the default registration
Backbone.Syphon.TypeRegistry = function(){
  this.registeredTypes = {};
};

// Borrow Backbone's `extend` keyword for our TypeRegistry
Backbone.Syphon.TypeRegistry.extend = Backbone.Model.extend;

_.extend(Backbone.Syphon.TypeRegistry.prototype, {

  // Get the registered item by type. If nothing is
  // found for the specified type, the default is
  // returned.
  get: function(type){
    var item = this.registeredTypes[type];

    if (!item){
      item = this.registeredTypes["default"];
    }

    return item;
  },

  // Register a new item for a specified type
  register: function(type, item){
    this.registeredTypes[type] = item;
  },

  // Register a default item to be used when no
  // item for a specified type is found
  registerDefault: function(item){
    this.registeredTypes["default"] = item;
  },

  // Remove an item from a given type registration
  unregister: function(type){
    if (this.registeredTypes[type]){
      delete this.registeredTypes[type];
    }
  }
});




// Key Extractors
// --------------

// Key extractors produce the "key" in `{key: "value"}`
// pairs, when serializing.
Backbone.Syphon.KeyExtractorSet = Backbone.Syphon.TypeRegistry.extend();

// Built-in Key Extractors
Backbone.Syphon.KeyExtractors = new Backbone.Syphon.KeyExtractorSet();

// The default key extractor, which uses the
// input element's "id" attribute
Backbone.Syphon.KeyExtractors.registerDefault(function($el){
  return $el.prop("name");
});


// Input Readers
// -------------

// Input Readers are used to extract the value from
// an input element, for the serialized object result
Backbone.Syphon.InputReaderSet = Backbone.Syphon.TypeRegistry.extend();

// Built-in Input Readers
Backbone.Syphon.InputReaders = new Backbone.Syphon.InputReaderSet();

// The default input reader, which uses an input
// element's "value"
Backbone.Syphon.InputReaders.registerDefault(function($el){
  return $el.val();
});

// Checkbox reader, returning a boolean value for
// whether or not the checkbox is checked.
Backbone.Syphon.InputReaders.register("checkbox", function($el){
  var checked = $el.prop("checked");
  return checked;
});


// Input Writers
// -------------

// Input Writers are used to insert a value from an
// object into an input element.
Backbone.Syphon.InputWriterSet = Backbone.Syphon.TypeRegistry.extend();

// Built-in Input Writers
Backbone.Syphon.InputWriters = new Backbone.Syphon.InputWriterSet();

// The default input writer, which sets an input
// element's "value"
Backbone.Syphon.InputWriters.registerDefault(function($el, value){
  $el.val(value);
});

// Checkbox writer, set whether or not the checkbox is checked
// depending on the boolean value.
Backbone.Syphon.InputWriters.register("checkbox", function($el, value){
  $el.prop("checked", value);
});

// Radio button writer, set whether or not the radio button is
// checked.  The button should only be checked if it's value
// equals the given value.
Backbone.Syphon.InputWriters.register("radio", function($el, value){
  $el.prop("checked", $el.val() === value);
});

// Key Assignment Validators
// -------------------------

// Key Assignment Validators are used to determine whether or not a
// key should be assigned to a value, after the key and value have been
// extracted from the element. This is the last opportunity to prevent
// bad data from getting serialized to your object.

Backbone.Syphon.KeyAssignmentValidatorSet = Backbone.Syphon.TypeRegistry.extend();

// Build-in Key Assignment Validators
Backbone.Syphon.KeyAssignmentValidators = new Backbone.Syphon.KeyAssignmentValidatorSet();

// Everything is valid by default
Backbone.Syphon.KeyAssignmentValidators.registerDefault(function(){ return true; });

// But only the "checked" radio button for a given
// radio button group is valid
Backbone.Syphon.KeyAssignmentValidators.register("radio", function($el, key, value){ 
  return $el.prop("checked");
});


// Copyright (C) 2011 Neal Stewart
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is furnished to do
// so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.


(function(Backbone) {
// Premade Validators
Backbone.Validations = {};

var validators = {
  "custom" : function(methodName, attributeName, model, valueToSet) {
    return model[methodName](attributeName, valueToSet);
  },

  "required" : function(attributeName, model, valueToSet) {
    var currentValue = model.get(attributeName);
    var isNotAlreadySet = _.isUndefined(currentValue);
    var isNotBeingSet = _.isUndefined(valueToSet);
    if (_.isNull(valueToSet) || valueToSet === "" || (isNotBeingSet && isNotAlreadySet)) {
      return "required";
    } else {
      return false;
    }
  },

  "in" : function(whitelist, attributeName, model, valueToSet) {
    return _.include(whitelist, valueToSet) ? undefined : "in";
  },

  "email" : function(type, attributeName, model, valueToSet) {
    var emailRegex = new RegExp("[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?");

    if (_.isString(valueToSet) && !valueToSet.match(emailRegex)) {
      return "email";
    }
  },

  "url" : function(type, attributeName, model, valueToSet) {
    // taken from jQuery UI validation
    var urlRegex = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
    if (_.isString(valueToSet) && !valueToSet.match(urlRegex)) {
      return "url";
    }
  },

  "number" : function(type, attributeName, model, valueToSet) {
    return isNaN(valueToSet) ? 'number' : undefined;
  },

  "pattern" : function(pattern, attributeName, model, valueToSet) {
    if (_.isString(valueToSet)) {
      if (pattern.test(valueToSet)) {
        return false;
      } else {
        return "pattern";
      }
    }
  },

  "min" : function(minimumValue, attributeName, model, valueToSet) {
    if (valueToSet < minimumValue) {
      return "min";
    }
  },

  "max" : function(maximumValue, attributeName, model, valueToSet) {
    if (valueToSet > maximumValue) {
      return "max";
    }
  },

  "minlength" : function(minlength, attributeName, model, valueToSet) {
    if (_.isString(valueToSet)) {
      if (valueToSet.length < minlength) { return "minlength"; }
    }
  },

  "maxlength" : function(maxlength, attributeName, model, valueToSet) {
    if (_.isString(valueToSet)) {
      if (valueToSet.length > maxlength) { return "maxlength"; }
    }
  }
};

var customValidators = {};
var getCustomValidator = function(name) {
  var cv = customValidators[name];
  if (!cv) { throw "custom validator '"+name+"' could not be found."; }
  return cv;
};

Backbone.Validations.addValidator = function(name, validator) {
  if (validators.hasOwnProperty(name) || customValidators.hasOwnProperty(name)) {
    throw "existing validator";
  }
  customValidators[name] = validator;
};


/*
  The newValidate method overrides validate in Backbone.Model.
  It has the same interface as the validate function which you
  would provide.

  The returned object looks like this:

    {
      attributeName : ["required", "of", "errors"],
      otherAttributeName: ["and", "so", "on"]
    }

  */
function newValidate(attributes) {
  var errorsForAttribute,
      errorHasOccured,
      errors = {};

  for (var attrName in this._attributeValidators) {
    var valueToSet = attributes[attrName];
    var validateAttribute = this._attributeValidators[attrName];
    if (validateAttribute)  {
      errorsForAttribute = validateAttribute(this, valueToSet);
    }
    if (errorsForAttribute) {
      errorHasOccured = true;
      errors[attrName] = errorsForAttribute;
    }
  }

  return errorHasOccured ? errors : false;
}

function createMinValidator(attributeName, minimumValue) {
  return _.bind(validators.min, null, minimumValue);
}

function createMaxValidator(attributeName, maximumValue) {
  return _.bind(validators.max, null, maximumValue);
}


/* createValidator takes in:
    - the model
    - the name of the attribute
    - the type of validation
    - the description of the validation

   returns a function that takes in:
     - the value being set for the attribute

     and either returns nothing (undefined),
     or the error name (string).
  */
function createValidator(attributeName, type, description) {
  var validator,
      validatorMethod,
      customValidator;

  if (type === "type") {
    type = description;
  }
  validator = validators[type];

  if (!validator) { validator = getCustomValidator(type); }

  if (!validator) { throw "Improper validation type '"+type+"'" ; }

  if (type !== "required") { // doesn't need the description
    validator = _.bind(validator, null, description, attributeName);
  } else {
    validator = _.bind(validator, null, attributeName);
  }

  return validator;
}

function createAttributeValidator(attributeName, attributeDescription) {
  var validatorsForAttribute = [],
      type,
      desc;

  for (type in attributeDescription) {
    desc = attributeDescription[type];
    validatorsForAttribute.push(createValidator(attributeName, type, desc));
  }

  return function(model, valueToSet, hasOverridenError, options) {
    var validator,
        result,
        errors = [];

    for (var i = 0, length = validatorsForAttribute.length; i < length; i++) {
      validator = validatorsForAttribute[i];
      result = validator(model, valueToSet);
      if (result) {
        if (_.isArray(result)) {
          errors = errors.concat(result);
        } else {
          errors.push(result);
        }
      }
    }

    if (errors.length) {
      return errors;
    } else {
      return false;
    }
  };
}

function createValidators(modelValidations) {
  var attributeValidations,
      attributeValidators = {};

  for (var attrName in modelValidations) {
    attributeValidations = modelValidations[attrName];
    attributeValidators[attrName] = createAttributeValidator(attrName, attributeValidations);
  }

  return attributeValidators;
}

var oldPerformValidation = Backbone.Model.prototype._performValidation;
function newPerformValidation(attrs, options) {
  if (options.silent || !this.validate) return true;
  var errors = this.validate(attrs);
  if (errors) {
    if (options.error) {
      options.error(this, errors, options);
    } else {
      this.trigger('error', this, errors, options);
      _.each(errors, function(error, name) {
        this.trigger('error:' + name, this, errors, options);
      }, this);
    }
    return false;
  }
  return true;
}

// save the old backbone
var oldModel = Backbone.Model;

// Constructor for our new Validations Model
Backbone.Validations.Model = Backbone.Model.extend({
  constructor : function() {
    // if they pass an object, construct the new validations
    if (typeof this.validate === "object" && this.validate !== null) {
      if (!this.constructor.prototype._attributeValidators) {
        this.constructor.prototype._attributeValidators = createValidators(this.validate);
        this.constructor.prototype.validate = newValidate;
        this.constructor.prototype._validate = newPerformValidation;
      }
    }

    oldModel.apply(this, arguments);
  }
});

// Override Backbone.Model with our new Model
Backbone.Model = Backbone.Validations.Model;


// Requisite noConflict
Backbone.Validations.Model.noConflict =  function() {
  Backbone.Model = oldModel;
};

}(Backbone));

/* =========================================================
 * bootstrap-datepicker.js
 * http://www.eyecon.ro/bootstrap-datepicker
 * =========================================================
 * Copyright 2012 Stefan Petre
 * Improvements by Andrew Rowls
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================= */

!function( $ ) {

	function UTCDate(){
		return new Date(Date.UTC.apply(Date, arguments));
	}
	function UTCToday(){
		var today = new Date();
		return UTCDate(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
	}

	// Picker object

	var Datepicker = function(element, options) {
		var that = this;

		this.element = $(element);
		this.language = options.language||this.element.data('date-language')||"en";
		this.language = this.language in dates ? this.language : this.language.split('-')[0]; //Check if "de-DE" style date is available, if not language should fallback to 2 letter code eg "de"
		this.language = this.language in dates ? this.language : "en";
		this.isRTL = dates[this.language].rtl||false;
		this.format = DPGlobal.parseFormat(options.format||this.element.data('date-format')||dates[this.language].format||'mm/dd/yyyy');
		this.isInline = false;
		this.isInput = this.element.is('input');
		this.component = this.element.is('.date') ? this.element.find('.add-on') : false;
		this.hasInput = this.component && this.element.find('input').length;
		if(this.component && this.component.length === 0)
			this.component = false;

		this._attachEvents();

		this.forceParse = true;
		if ('forceParse' in options) {
			this.forceParse = options.forceParse;
		} else if ('dateForceParse' in this.element.data()) {
			this.forceParse = this.element.data('date-force-parse');
		}


		this.picker = $(DPGlobal.template)
							.appendTo(this.isInline ? this.element : 'body')
							.on({
								click: $.proxy(this.click, this),
								mousedown: $.proxy(this.mousedown, this)
							});

		if(this.isInline) {
			this.picker.addClass('datepicker-inline');
		} else {
			this.picker.addClass('datepicker-dropdown dropdown-menu');
		}
		if (this.isRTL){
			this.picker.addClass('datepicker-rtl');
			this.picker.find('.prev i, .next i')
						.toggleClass('icon-arrow-left icon-arrow-right');
		}
		$(document).on('mousedown', function (e) {
			// Clicked outside the datepicker, hide it
			if ($(e.target).closest('.datepicker.datepicker-inline, .datepicker.datepicker-dropdown').length === 0) {
				that.hide();
			}
		});

		this.autoclose = false;
		if ('autoclose' in options) {
			this.autoclose = options.autoclose;
		} else if ('dateAutoclose' in this.element.data()) {
			this.autoclose = this.element.data('date-autoclose');
		}

		this.keyboardNavigation = true;
		if ('keyboardNavigation' in options) {
			this.keyboardNavigation = options.keyboardNavigation;
		} else if ('dateKeyboardNavigation' in this.element.data()) {
			this.keyboardNavigation = this.element.data('date-keyboard-navigation');
		}

		this.viewMode = this.startViewMode = 0;
		switch(options.startView || this.element.data('date-start-view')){
			case 2:
			case 'decade':
				this.viewMode = this.startViewMode = 2;
				break;
			case 1:
			case 'year':
				this.viewMode = this.startViewMode = 1;
				break;
		}

		this.minViewMode = options.minViewMode||this.element.data('date-min-view-mode')||0;
		if (typeof this.minViewMode === 'string') {
			switch (this.minViewMode) {
				case 'months':
					this.minViewMode = 1;
					break;
				case 'years':
					this.minViewMode = 2;
					break;
				default:
					this.minViewMode = 0;
					break;
			}
		}

		this.viewMode = this.startViewMode = Math.max(this.startViewMode, this.minViewMode);

		this.todayBtn = (options.todayBtn||this.element.data('date-today-btn')||false);
		this.todayHighlight = (options.todayHighlight||this.element.data('date-today-highlight')||false);

		this.calendarWeeks = false;
		if ('calendarWeeks' in options) {
			this.calendarWeeks = options.calendarWeeks;
		} else if ('dateCalendarWeeks' in this.element.data()) {
			this.calendarWeeks = this.element.data('date-calendar-weeks');
		}
		if (this.calendarWeeks)
			this.picker.find('tfoot th.today')
						.attr('colspan', function(i, val){
							return parseInt(val) + 1;
						});

		this.weekStart = ((options.weekStart||this.element.data('date-weekstart')||dates[this.language].weekStart||0) % 7);
		this.weekEnd = ((this.weekStart + 6) % 7);
		this.startDate = -Infinity;
		this.endDate = Infinity;
		this.daysOfWeekDisabled = [];
		this.setStartDate(options.startDate||this.element.data('date-startdate'));
		this.setEndDate(options.endDate||this.element.data('date-enddate'));
		this.setDaysOfWeekDisabled(options.daysOfWeekDisabled||this.element.data('date-days-of-week-disabled'));
		this.fillDow();
		this.fillMonths();
		this.update();
		this.showMode();

		if(this.isInline) {
			this.show();
		}
	};

	Datepicker.prototype = {
		constructor: Datepicker,

		_events: [],
		_attachEvents: function(){
			this._detachEvents();
			if (this.isInput) { // single input
				this._events = [
					[this.element, {
						focus: $.proxy(this.show, this),
						keyup: $.proxy(this.update, this),
						keydown: $.proxy(this.keydown, this)
					}]
				];
			}
			else if (this.component && this.hasInput){ // component: input + button
				this._events = [
					// For components that are not readonly, allow keyboard nav
					[this.element.find('input'), {
						focus: $.proxy(this.show, this),
						keyup: $.proxy(this.update, this),
						keydown: $.proxy(this.keydown, this)
					}],
					[this.component, {
						click: $.proxy(this.show, this)
					}]
				];
			}
						else if (this.element.is('div')) {  // inline datepicker
							this.isInline = true;
						}
			else {
				this._events = [
					[this.element, {
						click: $.proxy(this.show, this)
					}]
				];
			}
			for (var i=0, el, ev; i<this._events.length; i++){
				el = this._events[i][0];
				ev = this._events[i][1];
				el.on(ev);
			}
		},
		_detachEvents: function(){
			for (var i=0, el, ev; i<this._events.length; i++){
				el = this._events[i][0];
				ev = this._events[i][1];
				el.off(ev);
			}
			this._events = [];
		},

		show: function(e) {
			this.picker.show();
			this.height = this.component ? this.component.outerHeight() : this.element.outerHeight();
			this.update();
			this.place();
			$(window).on('resize', $.proxy(this.place, this));
			if (e ) {
				e.stopPropagation();
				e.preventDefault();
			}
			this.element.trigger({
				type: 'show',
				date: this.date
			});
		},

		hide: function(e){
			if(this.isInline) return;
			if (!this.picker.is(':visible')) return;
			this.picker.hide();
			$(window).off('resize', this.place);
			this.viewMode = this.startViewMode;
			this.showMode();
			if (!this.isInput) {
				$(document).off('mousedown', this.hide);
			}

			if (
				this.forceParse &&
				(
					this.isInput && this.element.val() ||
					this.hasInput && this.element.find('input').val()
				)
			)
				this.setValue();
			this.element.trigger({
				type: 'hide',
				date: this.date
			});
		},

		remove: function() {
			this._detachEvents();
			this.picker.remove();
			delete this.element.data().datepicker;
		},

		getDate: function() {
			var d = this.getUTCDate();
			return new Date(d.getTime() + (d.getTimezoneOffset()*60000));
		},

		getUTCDate: function() {
			return this.date;
		},

		setDate: function(d) {
			this.setUTCDate(new Date(d.getTime() - (d.getTimezoneOffset()*60000)));
		},

		setUTCDate: function(d) {
			this.date = d;
			this.setValue();
		},

		setValue: function() {
			var formatted = this.getFormattedDate();
			if (!this.isInput) {
				if (this.component){
					this.element.find('input').val(formatted);
				}
				this.element.data('date', formatted);
			} else {
				this.element.val(formatted);
			}
		},

		getFormattedDate: function(format) {
			if (format === undefined)
				format = this.format;
			return DPGlobal.formatDate(this.date, format, this.language);
		},

		setStartDate: function(startDate){
			this.startDate = startDate||-Infinity;
			if (this.startDate !== -Infinity) {
				this.startDate = DPGlobal.parseDate(this.startDate, this.format, this.language);
			}
			this.update();
			this.updateNavArrows();
		},

		setEndDate: function(endDate){
			this.endDate = endDate||Infinity;
			if (this.endDate !== Infinity) {
				this.endDate = DPGlobal.parseDate(this.endDate, this.format, this.language);
			}
			this.update();
			this.updateNavArrows();
		},

		setDaysOfWeekDisabled: function(daysOfWeekDisabled){
			this.daysOfWeekDisabled = daysOfWeekDisabled||[];
			if (!$.isArray(this.daysOfWeekDisabled)) {
				this.daysOfWeekDisabled = this.daysOfWeekDisabled.split(/,\s*/);
			}
			this.daysOfWeekDisabled = $.map(this.daysOfWeekDisabled, function (d) {
				return parseInt(d, 10);
			});
			this.update();
			this.updateNavArrows();
		},

		place: function(){
						if(this.isInline) return;
			var zIndex = parseInt(this.element.parents().filter(function() {
							return $(this).css('z-index') != 'auto';
						}).first().css('z-index'))+10;
			var offset = this.component ? this.component.offset() : this.element.offset();
			var height = this.component ? this.component.outerHeight(true) : this.element.outerHeight(true);
			this.picker.css({
				top: offset.top + height,
				left: offset.left,
				zIndex: zIndex
			});
		},

		update: function(){
			var date, fromArgs = false;
			if(arguments && arguments.length && (typeof arguments[0] === 'string' || arguments[0] instanceof Date)) {
				date = arguments[0];
				fromArgs = true;
			} else {
				date = this.isInput ? this.element.val() : this.element.data('date') || this.element.find('input').val();
			}

			this.date = DPGlobal.parseDate(date, this.format, this.language);

			if(fromArgs) this.setValue();

			if (this.date < this.startDate) {
				this.viewDate = new Date(this.startDate);
			} else if (this.date > this.endDate) {
				this.viewDate = new Date(this.endDate);
			} else {
				this.viewDate = new Date(this.date);
			}
			this.fill();
		},

		fillDow: function(){
			var dowCnt = this.weekStart,
			html = '<tr>';
			if(this.calendarWeeks){
				var cell = '<th class="cw">&nbsp;</th>';
				html += cell;
				this.picker.find('.datepicker-days thead tr:first-child').prepend(cell);
			}
			while (dowCnt < this.weekStart + 7) {
				html += '<th class="dow">'+dates[this.language].daysMin[(dowCnt++)%7]+'</th>';
			}
			html += '</tr>';
			this.picker.find('.datepicker-days thead').append(html);
		},

		fillMonths: function(){
			var html = '',
			i = 0;
			while (i < 12) {
				html += '<span class="month">'+dates[this.language].monthsShort[i++]+'</span>';
			}
			this.picker.find('.datepicker-months td').html(html);
		},

		fill: function() {
			var d = new Date(this.viewDate),
				year = d.getUTCFullYear(),
				month = d.getUTCMonth(),
				startYear = this.startDate !== -Infinity ? this.startDate.getUTCFullYear() : -Infinity,
				startMonth = this.startDate !== -Infinity ? this.startDate.getUTCMonth() : -Infinity,
				endYear = this.endDate !== Infinity ? this.endDate.getUTCFullYear() : Infinity,
				endMonth = this.endDate !== Infinity ? this.endDate.getUTCMonth() : Infinity,
				currentDate = this.date && this.date.valueOf(),
				today = new Date();
			this.picker.find('.datepicker-days thead th.switch')
						.text(dates[this.language].months[month]+' '+year);
			this.picker.find('tfoot th.today')
						.text(dates[this.language].today)
						.toggle(this.todayBtn !== false);
			this.updateNavArrows();
			this.fillMonths();
			var prevMonth = UTCDate(year, month-1, 28,0,0,0,0),
				day = DPGlobal.getDaysInMonth(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth());
			prevMonth.setUTCDate(day);
			prevMonth.setUTCDate(day - (prevMonth.getUTCDay() - this.weekStart + 7)%7);
			var nextMonth = new Date(prevMonth);
			nextMonth.setUTCDate(nextMonth.getUTCDate() + 42);
			nextMonth = nextMonth.valueOf();
			var html = [];
			var clsName;
			while(prevMonth.valueOf() < nextMonth) {
				if (prevMonth.getUTCDay() == this.weekStart) {
					html.push('<tr>');
					if(this.calendarWeeks){
						// ISO 8601: First week contains first thursday.
						// ISO also states week starts on Monday, but we can be more abstract here.
						var
							// Start of current week: based on weekstart/current date
							ws = new Date(+prevMonth + (this.weekStart - prevMonth.getUTCDay() - 7) % 7 * 864e5),
							// Thursday of this week
							th = new Date(+ws + (7 + 4 - ws.getUTCDay()) % 7 * 864e5),
							// First Thursday of year, year from thursday
							yth = new Date(+(yth = UTCDate(th.getUTCFullYear(), 0, 1)) + (7 + 4 - yth.getUTCDay())%7*864e5),
							// Calendar week: ms between thursdays, div ms per day, div 7 days
							calWeek =  (th - yth) / 864e5 / 7 + 1;
						html.push('<td class="cw">'+ calWeek +'</td>');

					}
				}
				clsName = '';
				if (prevMonth.getUTCFullYear() < year || (prevMonth.getUTCFullYear() == year && prevMonth.getUTCMonth() < month)) {
					clsName += ' old';
				} else if (prevMonth.getUTCFullYear() > year || (prevMonth.getUTCFullYear() == year && prevMonth.getUTCMonth() > month)) {
					clsName += ' new';
				}
				// Compare internal UTC date with local today, not UTC today
				if (this.todayHighlight &&
					prevMonth.getUTCFullYear() == today.getFullYear() &&
					prevMonth.getUTCMonth() == today.getMonth() &&
					prevMonth.getUTCDate() == today.getDate()) {
					clsName += ' today';
				}
				if (currentDate && prevMonth.valueOf() == currentDate) {
					clsName += ' active';
				}
				if (prevMonth.valueOf() < this.startDate || prevMonth.valueOf() > this.endDate ||
					$.inArray(prevMonth.getUTCDay(), this.daysOfWeekDisabled) !== -1) {
					clsName += ' disabled';
				}
				html.push('<td class="day'+clsName+'">'+prevMonth.getUTCDate() + '</td>');
				if (prevMonth.getUTCDay() == this.weekEnd) {
					html.push('</tr>');
				}
				prevMonth.setUTCDate(prevMonth.getUTCDate()+1);
			}
			this.picker.find('.datepicker-days tbody').empty().append(html.join(''));
			var currentYear = this.date && this.date.getUTCFullYear();

			var months = this.picker.find('.datepicker-months')
						.find('th:eq(1)')
							.text(year)
							.end()
						.find('span').removeClass('active');
			if (currentYear && currentYear == year) {
				months.eq(this.date.getUTCMonth()).addClass('active');
			}
			if (year < startYear || year > endYear) {
				months.addClass('disabled');
			}
			if (year == startYear) {
				months.slice(0, startMonth).addClass('disabled');
			}
			if (year == endYear) {
				months.slice(endMonth+1).addClass('disabled');
			}

			html = '';
			year = parseInt(year/10, 10) * 10;
			var yearCont = this.picker.find('.datepicker-years')
								.find('th:eq(1)')
									.text(year + '-' + (year + 9))
									.end()
								.find('td');
			year -= 1;
			for (var i = -1; i < 11; i++) {
				html += '<span class="year'+(i == -1 || i == 10 ? ' old' : '')+(currentYear == year ? ' active' : '')+(year < startYear || year > endYear ? ' disabled' : '')+'">'+year+'</span>';
				year += 1;
			}
			yearCont.html(html);
		},

		updateNavArrows: function() {
			var d = new Date(this.viewDate),
				year = d.getUTCFullYear(),
				month = d.getUTCMonth();
			switch (this.viewMode) {
				case 0:
					if (this.startDate !== -Infinity && year <= this.startDate.getUTCFullYear() && month <= this.startDate.getUTCMonth()) {
						this.picker.find('.prev').css({visibility: 'hidden'});
					} else {
						this.picker.find('.prev').css({visibility: 'visible'});
					}
					if (this.endDate !== Infinity && year >= this.endDate.getUTCFullYear() && month >= this.endDate.getUTCMonth()) {
						this.picker.find('.next').css({visibility: 'hidden'});
					} else {
						this.picker.find('.next').css({visibility: 'visible'});
					}
					break;
				case 1:
				case 2:
					if (this.startDate !== -Infinity && year <= this.startDate.getUTCFullYear()) {
						this.picker.find('.prev').css({visibility: 'hidden'});
					} else {
						this.picker.find('.prev').css({visibility: 'visible'});
					}
					if (this.endDate !== Infinity && year >= this.endDate.getUTCFullYear()) {
						this.picker.find('.next').css({visibility: 'hidden'});
					} else {
						this.picker.find('.next').css({visibility: 'visible'});
					}
					break;
			}
		},

		click: function(e) {
			e.stopPropagation();
			e.preventDefault();
			var target = $(e.target).closest('span, td, th');
			if (target.length == 1) {
				switch(target[0].nodeName.toLowerCase()) {
					case 'th':
						switch(target[0].className) {
							case 'switch':
								this.showMode(1);
								break;
							case 'prev':
							case 'next':
								var dir = DPGlobal.modes[this.viewMode].navStep * (target[0].className == 'prev' ? -1 : 1);
								switch(this.viewMode){
									case 0:
										this.viewDate = this.moveMonth(this.viewDate, dir);
										break;
									case 1:
									case 2:
										this.viewDate = this.moveYear(this.viewDate, dir);
										break;
								}
								this.fill();
								break;
							case 'today':
								var date = new Date();
								date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);

								this.showMode(-2);
								var which = this.todayBtn == 'linked' ? null : 'view';
								this._setDate(date, which);
								break;
						}
						break;
					case 'span':
						if (!target.is('.disabled')) {
							this.viewDate.setUTCDate(1);
							if (target.is('.month')) {
								var day = 1;
								var month = target.parent().find('span').index(target);
								var year = this.viewDate.getUTCFullYear();
								this.viewDate.setUTCMonth(month);
								this.element.trigger({
									type: 'changeMonth',
									date: this.viewDate
								});
								if ( this.minViewMode == 1 ) {
									this._setDate(UTCDate(year, month, day,0,0,0,0));
								}
							} else {
								var year = parseInt(target.text(), 10)||0;
								var day = 1;
								var month = 0;
								this.viewDate.setUTCFullYear(year);
								this.element.trigger({
									type: 'changeYear',
									date: this.viewDate
								});
								if ( this.minViewMode == 2 ) {
									this._setDate(UTCDate(year, month, day,0,0,0,0));
								}
							}
							this.showMode(-1);
							this.fill();
						}
						break;
					case 'td':
						if (target.is('.day') && !target.is('.disabled')){
							var day = parseInt(target.text(), 10)||1;
							var year = this.viewDate.getUTCFullYear(),
								month = this.viewDate.getUTCMonth();
							if (target.is('.old')) {
								if (month === 0) {
									month = 11;
									year -= 1;
								} else {
									month -= 1;
								}
							} else if (target.is('.new')) {
								if (month == 11) {
									month = 0;
									year += 1;
								} else {
									month += 1;
								}
							}
							this._setDate(UTCDate(year, month, day,0,0,0,0));
						}
						break;
				}
			}
		},

		_setDate: function(date, which){
			if (!which || which == 'date')
				this.date = date;
			if (!which || which  == 'view')
				this.viewDate = date;
			this.fill();
			this.setValue();
			this.element.trigger({
				type: 'changeDate',
				date: this.date
			});
			var element;
			if (this.isInput) {
				element = this.element;
			} else if (this.component){
				element = this.element.find('input');
			}
			if (element) {
				element.change();
				if (this.autoclose && (!which || which == 'date')) {
					this.hide();
				}
			}
		},

		moveMonth: function(date, dir){
			if (!dir) return date;
			var new_date = new Date(date.valueOf()),
				day = new_date.getUTCDate(),
				month = new_date.getUTCMonth(),
				mag = Math.abs(dir),
				new_month, test;
			dir = dir > 0 ? 1 : -1;
			if (mag == 1){
				test = dir == -1
					// If going back one month, make sure month is not current month
					// (eg, Mar 31 -> Feb 31 == Feb 28, not Mar 02)
					? function(){ return new_date.getUTCMonth() == month; }
					// If going forward one month, make sure month is as expected
					// (eg, Jan 31 -> Feb 31 == Feb 28, not Mar 02)
					: function(){ return new_date.getUTCMonth() != new_month; };
				new_month = month + dir;
				new_date.setUTCMonth(new_month);
				// Dec -> Jan (12) or Jan -> Dec (-1) -- limit expected date to 0-11
				if (new_month < 0 || new_month > 11)
					new_month = (new_month + 12) % 12;
			} else {
				// For magnitudes >1, move one month at a time...
				for (var i=0; i<mag; i++)
					// ...which might decrease the day (eg, Jan 31 to Feb 28, etc)...
					new_date = this.moveMonth(new_date, dir);
				// ...then reset the day, keeping it in the new month
				new_month = new_date.getUTCMonth();
				new_date.setUTCDate(day);
				test = function(){ return new_month != new_date.getUTCMonth(); };
			}
			// Common date-resetting loop -- if date is beyond end of month, make it
			// end of month
			while (test()){
				new_date.setUTCDate(--day);
				new_date.setUTCMonth(new_month);
			}
			return new_date;
		},

		moveYear: function(date, dir){
			return this.moveMonth(date, dir*12);
		},

		dateWithinRange: function(date){
			return date >= this.startDate && date <= this.endDate;
		},

		keydown: function(e){
			if (this.picker.is(':not(:visible)')){
				if (e.keyCode == 27) // allow escape to hide and re-show picker
					this.show();
				return;
			}
			var dateChanged = false,
				dir, day, month,
				newDate, newViewDate;
			switch(e.keyCode){
				case 27: // escape
					this.hide();
					e.preventDefault();
					break;
				case 37: // left
				case 39: // right
					if (!this.keyboardNavigation) break;
					dir = e.keyCode == 37 ? -1 : 1;
					if (e.ctrlKey){
						newDate = this.moveYear(this.date, dir);
						newViewDate = this.moveYear(this.viewDate, dir);
					} else if (e.shiftKey){
						newDate = this.moveMonth(this.date, dir);
						newViewDate = this.moveMonth(this.viewDate, dir);
					} else {
						newDate = new Date(this.date);
						newDate.setUTCDate(this.date.getUTCDate() + dir);
						newViewDate = new Date(this.viewDate);
						newViewDate.setUTCDate(this.viewDate.getUTCDate() + dir);
					}
					if (this.dateWithinRange(newDate)){
						this.date = newDate;
						this.viewDate = newViewDate;
						this.setValue();
						this.update();
						e.preventDefault();
						dateChanged = true;
					}
					break;
				case 38: // up
				case 40: // down
					if (!this.keyboardNavigation) break;
					dir = e.keyCode == 38 ? -1 : 1;
					if (e.ctrlKey){
						newDate = this.moveYear(this.date, dir);
						newViewDate = this.moveYear(this.viewDate, dir);
					} else if (e.shiftKey){
						newDate = this.moveMonth(this.date, dir);
						newViewDate = this.moveMonth(this.viewDate, dir);
					} else {
						newDate = new Date(this.date);
						newDate.setUTCDate(this.date.getUTCDate() + dir * 7);
						newViewDate = new Date(this.viewDate);
						newViewDate.setUTCDate(this.viewDate.getUTCDate() + dir * 7);
					}
					if (this.dateWithinRange(newDate)){
						this.date = newDate;
						this.viewDate = newViewDate;
						this.setValue();
						this.update();
						e.preventDefault();
						dateChanged = true;
					}
					break;
				case 13: // enter
					this.hide();
					e.preventDefault();
					break;
				case 9: // tab
					this.hide();
					break;
			}
			if (dateChanged){
				this.element.trigger({
					type: 'changeDate',
					date: this.date
				});
				var element;
				if (this.isInput) {
					element = this.element;
				} else if (this.component){
					element = this.element.find('input');
				}
				if (element) {
					element.change();
				}
			}
		},

		showMode: function(dir) {
			if (dir) {
				this.viewMode = Math.max(this.minViewMode, Math.min(2, this.viewMode + dir));
			}
			/*
				vitalets: fixing bug of very special conditions:
				jquery 1.7.1 + webkit + show inline datepicker in bootstrap popover.
				Method show() does not set display css correctly and datepicker is not shown.
				Changed to .css('display', 'block') solve the problem.
				See https://github.com/vitalets/x-editable/issues/37

				In jquery 1.7.2+ everything works fine.
			*/
			//this.picker.find('>div').hide().filter('.datepicker-'+DPGlobal.modes[this.viewMode].clsName).show();
			this.picker.find('>div').hide().filter('.datepicker-'+DPGlobal.modes[this.viewMode].clsName).css('display', 'block');
			this.updateNavArrows();
		}
	};

	$.fn.datepicker = function ( option ) {
		var args = Array.apply(null, arguments);
		args.shift();
		return this.each(function () {
			var $this = $(this),
				data = $this.data('datepicker'),
				options = typeof option == 'object' && option;
			if (!data) {
				$this.data('datepicker', (data = new Datepicker(this, $.extend({}, $.fn.datepicker.defaults,options))));
			}
			if (typeof option == 'string' && typeof data[option] == 'function') {
				data[option].apply(data, args);
			}
		});
	};

	$.fn.datepicker.defaults = {
	};
	$.fn.datepicker.Constructor = Datepicker;
	var dates = $.fn.datepicker.dates = {
		en: {
			days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
			daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
			daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
			months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
			monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
			today: "Today"
		}
	};

	var DPGlobal = {
		modes: [
			{
				clsName: 'days',
				navFnc: 'Month',
				navStep: 1
			},
			{
				clsName: 'months',
				navFnc: 'FullYear',
				navStep: 1
			},
			{
				clsName: 'years',
				navFnc: 'FullYear',
				navStep: 10
		}],
		isLeapYear: function (year) {
			return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
		},
		getDaysInMonth: function (year, month) {
			return [31, (DPGlobal.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
		},
		validParts: /dd?|DD?|mm?|MM?|yy(?:yy)?/g,
		nonpunctuation: /[^ -\/:-@\[\u3400-\u9fff-`{-~\t\n\r]+/g,
		parseFormat: function(format){
			// IE treats \0 as a string end in inputs (truncating the value),
			// so it's a bad format delimiter, anyway
			var separators = format.replace(this.validParts, '\0').split('\0'),
				parts = format.match(this.validParts);
			if (!separators || !separators.length || !parts || parts.length === 0){
				throw new Error("Invalid date format.");
			}
			return {separators: separators, parts: parts};
		},
		parseDate: function(date, format, language) {
			if (date instanceof Date) return date;
			if (/^[\-+]\d+[dmwy]([\s,]+[\-+]\d+[dmwy])*$/.test(date)) {
				var part_re = /([\-+]\d+)([dmwy])/,
					parts = date.match(/([\-+]\d+)([dmwy])/g),
					part, dir;
				date = new Date();
				for (var i=0; i<parts.length; i++) {
					part = part_re.exec(parts[i]);
					dir = parseInt(part[1]);
					switch(part[2]){
						case 'd':
							date.setUTCDate(date.getUTCDate() + dir);
							break;
						case 'm':
							date = Datepicker.prototype.moveMonth.call(Datepicker.prototype, date, dir);
							break;
						case 'w':
							date.setUTCDate(date.getUTCDate() + dir * 7);
							break;
						case 'y':
							date = Datepicker.prototype.moveYear.call(Datepicker.prototype, date, dir);
							break;
					}
				}
				return UTCDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0);
			}
			var parts = date && date.match(this.nonpunctuation) || [],
				date = new Date(),
				parsed = {},
				setters_order = ['yyyy', 'yy', 'M', 'MM', 'm', 'mm', 'd', 'dd'],
				setters_map = {
					yyyy: function(d,v){ return d.setUTCFullYear(v); },
					yy: function(d,v){ return d.setUTCFullYear(2000+v); },
					m: function(d,v){
						v -= 1;
						while (v<0) v += 12;
						v %= 12;
						d.setUTCMonth(v);
						while (d.getUTCMonth() != v)
							d.setUTCDate(d.getUTCDate()-1);
						return d;
					},
					d: function(d,v){ return d.setUTCDate(v); }
				},
				val, filtered, part;
			setters_map['M'] = setters_map['MM'] = setters_map['mm'] = setters_map['m'];
			setters_map['dd'] = setters_map['d'];
			date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
			var fparts = format.parts.slice();
			// Remove noop parts
			if (parts.length != fparts.length) {
				fparts = $(fparts).filter(function(i,p){
					return $.inArray(p, setters_order) !== -1;
				}).toArray();
			}
			// Process remainder
			if (parts.length == fparts.length) {
				for (var i=0, cnt = fparts.length; i < cnt; i++) {
					val = parseInt(parts[i], 10);
					part = fparts[i];
					if (isNaN(val)) {
						switch(part) {
							case 'MM':
								filtered = $(dates[language].months).filter(function(){
									var m = this.slice(0, parts[i].length),
										p = parts[i].slice(0, m.length);
									return m == p;
								});
								val = $.inArray(filtered[0], dates[language].months) + 1;
								break;
							case 'M':
								filtered = $(dates[language].monthsShort).filter(function(){
									var m = this.slice(0, parts[i].length),
										p = parts[i].slice(0, m.length);
									return m == p;
								});
								val = $.inArray(filtered[0], dates[language].monthsShort) + 1;
								break;
						}
					}
					parsed[part] = val;
				}
				for (var i=0, s; i<setters_order.length; i++){
					s = setters_order[i];
					if (s in parsed && !isNaN(parsed[s]))
						setters_map[s](date, parsed[s]);
				}
			}
			return date;
		},
		formatDate: function(date, format, language){
			var val = {
				d: date.getUTCDate(),
				D: dates[language].daysShort[date.getUTCDay()],
				DD: dates[language].days[date.getUTCDay()],
				m: date.getUTCMonth() + 1,
				M: dates[language].monthsShort[date.getUTCMonth()],
				MM: dates[language].months[date.getUTCMonth()],
				yy: date.getUTCFullYear().toString().substring(2),
				yyyy: date.getUTCFullYear()
			};
			val.dd = (val.d < 10 ? '0' : '') + val.d;
			val.mm = (val.m < 10 ? '0' : '') + val.m;
			var date = [],
				seps = $.extend([], format.separators);
			for (var i=0, cnt = format.parts.length; i < cnt; i++) {
				if (seps.length)
					date.push(seps.shift());
				date.push(val[format.parts[i]]);
			}
			return date.join('');
		},
		headTemplate: '<thead>'+
							'<tr>'+
								'<th class="prev"><i class="icon-arrow-left"/></th>'+
								'<th colspan="5" class="switch"></th>'+
								'<th class="next"><i class="icon-arrow-right"/></th>'+
							'</tr>'+
						'</thead>',
		contTemplate: '<tbody><tr><td colspan="7"></td></tr></tbody>',
		footTemplate: '<tfoot><tr><th colspan="7" class="today"></th></tr></tfoot>'
	};
	DPGlobal.template = '<div class="datepicker">'+
							'<div class="datepicker-days">'+
								'<table class=" table-condensed">'+
									DPGlobal.headTemplate+
									'<tbody></tbody>'+
									DPGlobal.footTemplate+
								'</table>'+
							'</div>'+
							'<div class="datepicker-months">'+
								'<table class="table-condensed">'+
									DPGlobal.headTemplate+
									DPGlobal.contTemplate+
									DPGlobal.footTemplate+
								'</table>'+
							'</div>'+
							'<div class="datepicker-years">'+
								'<table class="table-condensed">'+
									DPGlobal.headTemplate+
									DPGlobal.contTemplate+
									DPGlobal.footTemplate+
								'</table>'+
							'</div>'+
						'</div>';

	$.fn.datepicker.DPGlobal = DPGlobal;

}( window.jQuery );

/*!
 * jQuery blockUI plugin
 * Version 2.50 (04-OCT-2012)
 * @requires jQuery v1.3 or later
 *
 * Examples at: http://malsup.com/jquery/block/
 * Copyright (c) 2007-2012 M. Alsup
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 * Thanks to Amir-Hossein Sobhi for some excellent contributions!
 */

;(function() {
"use strict";

	function setup($) {
		if (/^1\.(0|1|2)/.test($.fn.jquery)) {
			/*global alert:true */
			alert('blockUI requires jQuery v1.3 or later!  You are using v' + $.fn.jquery);
			return;
		}

		$.fn._fadeIn = $.fn.fadeIn;

		var noOp = $.noop || function() {};

		// this bit is to ensure we don't call setExpression when we shouldn't (with extra muscle to handle
		// retarded userAgent strings on Vista)
		var msie = /MSIE/.test(navigator.userAgent);
		var ie6  = /MSIE 6.0/.test(navigator.userAgent);
		var mode = document.documentMode || 0;
		// var setExpr = msie && (($.browser.version < 8 && !mode) || mode < 8);
		var setExpr = $.isFunction( document.createElement('div').style.setExpression );

		// global $ methods for blocking/unblocking the entire page
		$.blockUI   = function(opts) { install(window, opts); };
		$.unblockUI = function(opts) { remove(window, opts); };

		// convenience method for quick growl-like notifications  (http://www.google.com/search?q=growl)
		$.growlUI = function(title, message, timeout, onClose) {
			var $m = $('<div class="growlUI"></div>');
			if (title) $m.append('<h1>'+title+'</h1>');
			if (message) $m.append('<h2>'+message+'</h2>');
			if (timeout === undefined) timeout = 3000;
			$.blockUI({
				message: $m, fadeIn: 700, fadeOut: 1000, centerY: false,
				timeout: timeout, showOverlay: false,
				onUnblock: onClose,
				css: $.blockUI.defaults.growlCSS
			});
		};

		// plugin method for blocking element content
		$.fn.block = function(opts) {
			var fullOpts = $.extend({}, $.blockUI.defaults, opts || {});
			this.each(function() {
				var $el = $(this);
				if (fullOpts.ignoreIfBlocked && $el.data('blockUI.isBlocked'))
					return;
				$el.unblock({ fadeOut: 0 });
			});

			return this.each(function() {
				if ($.css(this,'position') == 'static')
					this.style.position = 'relative';
				this.style.zoom = 1; // force 'hasLayout' in ie
				install(this, opts);
			});
		};

		// plugin method for unblocking element content
		$.fn.unblock = function(opts) {
			return this.each(function() {
				remove(this, opts);
			});
		};

		$.blockUI.version = 2.50; // 2nd generation blocking at no extra cost!

		// override these in your code to change the default behavior and style
		$.blockUI.defaults = {
			// message displayed when blocking (use null for no message)
			message:  '<h1>Please wait...</h1>',

			title: null,		// title string; only used when theme == true
			draggable: true,	// only used when theme == true (requires jquery-ui.js to be loaded)

			theme: false, // set to true to use with jQuery UI themes

			// styles for the message when blocking; if you wish to disable
			// these and use an external stylesheet then do this in your code:
			// $.blockUI.defaults.css = {};
			css: {
				padding:	0,
				margin:		0,
				width:		'30%',
				top:		'40%',
				left:		'35%',
				textAlign:	'center',
				color:		'#000',
				border:		'3px solid #aaa',
				backgroundColor:'#fff',
				cursor:		'wait'
			},

			// minimal style set used when themes are used
			themedCSS: {
				width:	'30%',
				top:	'40%',
				left:	'35%'
			},

			// styles for the overlay
			overlayCSS:  {
				backgroundColor:	'#000',
				opacity:			0.6,
				cursor:				'wait'
			},

			// styles applied when using $.growlUI
			growlCSS: {
				width:		'350px',
				top:		'10px',
				left:		'',
				right:		'10px',
				border:		'none',
				padding:	'5px',
				opacity:	0.6,
				cursor:		'default',
				color:		'#fff',
				backgroundColor: '#000',
				'-webkit-border-radius':'10px',
				'-moz-border-radius':	'10px',
				'border-radius':		'10px'
			},

			// IE issues: 'about:blank' fails on HTTPS and javascript:false is s-l-o-w
			// (hat tip to Jorge H. N. de Vasconcelos)
			/*jshint scripturl:true */
			iframeSrc: /^https/i.test(window.location.href || '') ? 'javascript:false' : 'about:blank',

			// force usage of iframe in non-IE browsers (handy for blocking applets)
			forceIframe: false,

			// z-index for the blocking overlay
			baseZ: 1000,

			// set these to true to have the message automatically centered
			centerX: true, // <-- only effects element blocking (page block controlled via css above)
			centerY: true,

			// allow body element to be stetched in ie6; this makes blocking look better
			// on "short" pages.  disable if you wish to prevent changes to the body height
			allowBodyStretch: true,

			// enable if you want key and mouse events to be disabled for content that is blocked
			bindEvents: true,

			// be default blockUI will supress tab navigation from leaving blocking content
			// (if bindEvents is true)
			constrainTabKey: true,

			// fadeIn time in millis; set to 0 to disable fadeIn on block
			fadeIn:  200,

			// fadeOut time in millis; set to 0 to disable fadeOut on unblock
			fadeOut:  400,

			// time in millis to wait before auto-unblocking; set to 0 to disable auto-unblock
			timeout: 0,

			// disable if you don't want to show the overlay
			showOverlay: true,

			// if true, focus will be placed in the first available input field when
			// page blocking
			focusInput: true,

			// suppresses the use of overlay styles on FF/Linux (due to performance issues with opacity)
			// no longer needed in 2012
			// applyPlatformOpacityRules: true,

			// callback method invoked when fadeIn has completed and blocking message is visible
			onBlock: null,

			// callback method invoked when unblocking has completed; the callback is
			// passed the element that has been unblocked (which is the window object for page
			// blocks) and the options that were passed to the unblock call:
			//	onUnblock(element, options)
			onUnblock: null,

			// don't ask; if you really must know: http://groups.google.com/group/jquery-en/browse_thread/thread/36640a8730503595/2f6a79a77a78e493#2f6a79a77a78e493
			quirksmodeOffsetHack: 4,

			// class name of the message block
			blockMsgClass: 'blockMsg',

			// if it is already blocked, then ignore it (don't unblock and reblock)
			ignoreIfBlocked: false
		};

		// private data and functions follow...

		var pageBlock = null;
		var pageBlockEls = [];

		function install(el, opts) {
			var css, themedCSS;
			var full = (el == window);
			var msg = (opts && opts.message !== undefined ? opts.message : undefined);
			opts = $.extend({}, $.blockUI.defaults, opts || {});

			if (opts.ignoreIfBlocked && $(el).data('blockUI.isBlocked'))
				return;

			opts.overlayCSS = $.extend({}, $.blockUI.defaults.overlayCSS, opts.overlayCSS || {});
			css = $.extend({}, $.blockUI.defaults.css, opts.css || {});
			themedCSS = $.extend({}, $.blockUI.defaults.themedCSS, opts.themedCSS || {});
			msg = msg === undefined ? opts.message : msg;

			// remove the current block (if there is one)
			if (full && pageBlock)
				remove(window, {fadeOut:0});

			// if an existing element is being used as the blocking content then we capture
			// its current place in the DOM (and current display style) so we can restore
			// it when we unblock
			if (msg && typeof msg != 'string' && (msg.parentNode || msg.jquery)) {
				var node = msg.jquery ? msg[0] : msg;
				var data = {};
				$(el).data('blockUI.history', data);
				data.el = node;
				data.parent = node.parentNode;
				data.display = node.style.display;
				data.position = node.style.position;
				if (data.parent)
					data.parent.removeChild(node);
			}

			$(el).data('blockUI.onUnblock', opts.onUnblock);
			var z = opts.baseZ;

			// blockUI uses 3 layers for blocking, for simplicity they are all used on every platform;
			// layer1 is the iframe layer which is used to supress bleed through of underlying content
			// layer2 is the overlay layer which has opacity and a wait cursor (by default)
			// layer3 is the message content that is displayed while blocking
			var lyr1, lyr2, lyr3, s;
			if (msie || opts.forceIframe)
				lyr1 = $('<iframe class="blockUI" style="z-index:'+ (z++) +';display:none;border:none;margin:0;padding:0;position:absolute;width:100%;height:100%;top:0;left:0" src="'+opts.iframeSrc+'"></iframe>');
			else
				lyr1 = $('<div class="blockUI" style="display:none"></div>');

			if (opts.theme)
				lyr2 = $('<div class="blockUI blockOverlay ui-widget-overlay" style="z-index:'+ (z++) +';display:none"></div>');
			else
				lyr2 = $('<div class="blockUI blockOverlay" style="z-index:'+ (z++) +';display:none;border:none;margin:0;padding:0;width:100%;height:100%;top:0;left:0"></div>');

			if (opts.theme && full) {
				s = '<div class="blockUI ' + opts.blockMsgClass + ' blockPage ui-dialog ui-widget ui-corner-all" style="z-index:'+(z+10)+';display:none;position:fixed">';
				if ( opts.title ) {
					s += '<div class="ui-widget-header ui-dialog-titlebar ui-corner-all blockTitle">'+(opts.title || '&nbsp;')+'</div>';
				}
				s += '<div class="ui-widget-content ui-dialog-content"></div>';
				s += '</div>';
			}
			else if (opts.theme) {
				s = '<div class="blockUI ' + opts.blockMsgClass + ' blockElement ui-dialog ui-widget ui-corner-all" style="z-index:'+(z+10)+';display:none;position:absolute">';
				if ( opts.title ) {
					s += '<div class="ui-widget-header ui-dialog-titlebar ui-corner-all blockTitle">'+(opts.title || '&nbsp;')+'</div>';
				}  
				s += '<div class="ui-widget-content ui-dialog-content"></div>';
				s += '</div>';
			}
			else if (full) {
				s = '<div class="blockUI ' + opts.blockMsgClass + ' blockPage" style="z-index:'+(z+10)+';display:none;position:fixed"></div>';
			}
			else {
				s = '<div class="blockUI ' + opts.blockMsgClass + ' blockElement" style="z-index:'+(z+10)+';display:none;position:absolute"></div>';
			}
			lyr3 = $(s);

			// if we have a message, style it
			if (msg) {
				if (opts.theme) {
					lyr3.css(themedCSS);
					lyr3.addClass('ui-widget-content');
				}
				else
					lyr3.css(css);
			}

			// style the overlay
			if (!opts.theme /*&& (!opts.applyPlatformOpacityRules)*/)
				lyr2.css(opts.overlayCSS);
			lyr2.css('position', full ? 'fixed' : 'absolute');

			// make iframe layer transparent in IE
			if (msie || opts.forceIframe)
				lyr1.css('opacity',0.0);

			//$([lyr1[0],lyr2[0],lyr3[0]]).appendTo(full ? 'body' : el);
			var layers = [lyr1,lyr2,lyr3], $par = full ? $('body') : $(el);
			$.each(layers, function() {
				this.appendTo($par);
			});

			if (opts.theme && opts.draggable && $.fn.draggable) {
				lyr3.draggable({
					handle: '.ui-dialog-titlebar',
					cancel: 'li'
				});
			}

			// ie7 must use absolute positioning in quirks mode and to account for activex issues (when scrolling)
			var expr = setExpr && (!$.support.boxModel || $('object,embed', full ? null : el).length > 0);
			if (ie6 || expr) {
				// give body 100% height
				if (full && opts.allowBodyStretch && $.support.boxModel)
					$('html,body').css('height','100%');

				// fix ie6 issue when blocked element has a border width
				if ((ie6 || !$.support.boxModel) && !full) {
					var t = sz(el,'borderTopWidth'), l = sz(el,'borderLeftWidth');
					var fixT = t ? '(0 - '+t+')' : 0;
					var fixL = l ? '(0 - '+l+')' : 0;
				}

				// simulate fixed position
				$.each(layers, function(i,o) {
					var s = o[0].style;
					s.position = 'absolute';
					if (i < 2) {
						if (full)
							s.setExpression('height','Math.max(document.body.scrollHeight, document.body.offsetHeight) - (jQuery.support.boxModel?0:'+opts.quirksmodeOffsetHack+') + "px"');
						else
							s.setExpression('height','this.parentNode.offsetHeight + "px"');
						if (full)
							s.setExpression('width','jQuery.support.boxModel && document.documentElement.clientWidth || document.body.clientWidth + "px"');
						else
							s.setExpression('width','this.parentNode.offsetWidth + "px"');
						if (fixL) s.setExpression('left', fixL);
						if (fixT) s.setExpression('top', fixT);
					}
					else if (opts.centerY) {
						if (full) s.setExpression('top','(document.documentElement.clientHeight || document.body.clientHeight) / 2 - (this.offsetHeight / 2) + (blah = document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop) + "px"');
						s.marginTop = 0;
					}
					else if (!opts.centerY && full) {
						var top = (opts.css && opts.css.top) ? parseInt(opts.css.top, 10) : 0;
						var expression = '((document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop) + '+top+') + "px"';
						s.setExpression('top',expression);
					}
				});
			}

			// show the message
			if (msg) {
				if (opts.theme)
					lyr3.find('.ui-widget-content').append(msg);
				else
					lyr3.append(msg);
				if (msg.jquery || msg.nodeType)
					$(msg).show();
			}

			if ((msie || opts.forceIframe) && opts.showOverlay)
				lyr1.show(); // opacity is zero
			if (opts.fadeIn) {
				var cb = opts.onBlock ? opts.onBlock : noOp;
				var cb1 = (opts.showOverlay && !msg) ? cb : noOp;
				var cb2 = msg ? cb : noOp;
				if (opts.showOverlay)
					lyr2._fadeIn(opts.fadeIn, cb1);
				if (msg)
					lyr3._fadeIn(opts.fadeIn, cb2);
			}
			else {
				if (opts.showOverlay)
					lyr2.show();
				if (msg)
					lyr3.show();
				if (opts.onBlock)
					opts.onBlock();
			}

			// bind key and mouse events
			bind(1, el, opts);

			if (full) {
				pageBlock = lyr3[0];
				pageBlockEls = $(':input:enabled:visible',pageBlock);
				if (opts.focusInput)
					setTimeout(focus, 20);
			}
			else
				center(lyr3[0], opts.centerX, opts.centerY);

			if (opts.timeout) {
				// auto-unblock
				var to = setTimeout(function() {
					if (full)
						$.unblockUI(opts);
					else
						$(el).unblock(opts);
				}, opts.timeout);
				$(el).data('blockUI.timeout', to);
			}
		}

		// remove the block
		function remove(el, opts) {
			var full = (el == window);
			var $el = $(el);
			var data = $el.data('blockUI.history');
			var to = $el.data('blockUI.timeout');
			if (to) {
				clearTimeout(to);
				$el.removeData('blockUI.timeout');
			}
			opts = $.extend({}, $.blockUI.defaults, opts || {});
			bind(0, el, opts); // unbind events

			if (opts.onUnblock === null) {
				opts.onUnblock = $el.data('blockUI.onUnblock');
				$el.removeData('blockUI.onUnblock');
			}

			var els;
			if (full) // crazy selector to handle odd field errors in ie6/7
				els = $('body').children().filter('.blockUI').add('body > .blockUI');
			else
				els = $el.find('>.blockUI');

			if (full)
				pageBlock = pageBlockEls = null;

			if (opts.fadeOut) {
				els.fadeOut(opts.fadeOut);
				setTimeout(function() { reset(els,data,opts,el); }, opts.fadeOut);
			}
			else
				reset(els, data, opts, el);
		}

		// move blocking element back into the DOM where it started
		function reset(els,data,opts,el) {
			els.each(function(i,o) {
				// remove via DOM calls so we don't lose event handlers
				if (this.parentNode)
					this.parentNode.removeChild(this);
			});

			if (data && data.el) {
				data.el.style.display = data.display;
				data.el.style.position = data.position;
				if (data.parent)
					data.parent.appendChild(data.el);
				$(el).removeData('blockUI.history');
			}

			if (typeof opts.onUnblock == 'function')
				opts.onUnblock(el,opts);

			// fix issue in Safari 6 where block artifacts remain until reflow
			var body = $(document.body), w = body.width(), cssW = body[0].style.width;
			body.width(w-1).width(w);
			body[0].style.width = cssW;
		}

		// bind/unbind the handler
		function bind(b, el, opts) {
			var full = el == window, $el = $(el);

			// don't bother unbinding if there is nothing to unbind
			if (!b && (full && !pageBlock || !full && !$el.data('blockUI.isBlocked')))
				return;

			$el.data('blockUI.isBlocked', b);

			// don't bind events when overlay is not in use or if bindEvents is false
			if (!opts.bindEvents || (b && !opts.showOverlay))
				return;

			// bind anchors and inputs for mouse and key events
			var events = 'mousedown mouseup keydown keypress touchstart touchend touchmove';
			if (b)
				$(document).bind(events, opts, handler);
			else
				$(document).unbind(events, handler);

		// former impl...
		//		var $e = $('a,:input');
		//		b ? $e.bind(events, opts, handler) : $e.unbind(events, handler);
		}

		// event handler to suppress keyboard/mouse events when blocking
		function handler(e) {
			// allow tab navigation (conditionally)
			if (e.keyCode && e.keyCode == 9) {
				if (pageBlock && e.data.constrainTabKey) {
					var els = pageBlockEls;
					var fwd = !e.shiftKey && e.target === els[els.length-1];
					var back = e.shiftKey && e.target === els[0];
					if (fwd || back) {
						setTimeout(function(){focus(back);},10);
						return false;
					}
				}
			}
			var opts = e.data;
			// allow events within the message content
			if ($(e.target).parents('div.' + opts.blockMsgClass).length > 0)
				return true;

			// allow events for content that is not being blocked
			return $(e.target).parents().children().filter('div.blockUI').length === 0;
		}

		function focus(back) {
			if (!pageBlockEls)
				return;
			var e = pageBlockEls[back===true ? pageBlockEls.length-1 : 0];
			if (e)
				e.focus();
		}

		function center(el, x, y) {
			var p = el.parentNode, s = el.style;
			var l = ((p.offsetWidth - el.offsetWidth)/2) - sz(p,'borderLeftWidth');
			var t = ((p.offsetHeight - el.offsetHeight)/2) - sz(p,'borderTopWidth');
			if (x) s.left = l > 0 ? (l+'px') : '0';
			if (y) s.top  = t > 0 ? (t+'px') : '0';
		}

		function sz(el, p) {
			return parseInt($.css(el,p),10)||0;
		}

	}


	/*global define:true */
	if (typeof define === 'function' && define.amd && define.amd.jQuery) {
		define(['jquery'], setup);
	} else {
		setup(jQuery);
	}

})();
/*!
 * jQuery UI Effects 1.8.23
 *
 * Copyright 2012, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/Effects/
 */
;jQuery.effects || (function($, undefined) {

$.effects = {};



/******************************************************************************/
/****************************** COLOR ANIMATIONS ******************************/
/******************************************************************************/

// override the animation for color styles
$.each(['backgroundColor', 'borderBottomColor', 'borderLeftColor',
	'borderRightColor', 'borderTopColor', 'borderColor', 'color', 'outlineColor'],
function(i, attr) {
	$.fx.step[attr] = function(fx) {
		if (!fx.colorInit) {
			fx.start = getColor(fx.elem, attr);
			fx.end = getRGB(fx.end);
			fx.colorInit = true;
		}

		fx.elem.style[attr] = 'rgb(' +
			Math.max(Math.min(parseInt((fx.pos * (fx.end[0] - fx.start[0])) + fx.start[0], 10), 255), 0) + ',' +
			Math.max(Math.min(parseInt((fx.pos * (fx.end[1] - fx.start[1])) + fx.start[1], 10), 255), 0) + ',' +
			Math.max(Math.min(parseInt((fx.pos * (fx.end[2] - fx.start[2])) + fx.start[2], 10), 255), 0) + ')';
	};
});

// Color Conversion functions from highlightFade
// By Blair Mitchelmore
// http://jquery.offput.ca/highlightFade/

// Parse strings looking for color tuples [255,255,255]
function getRGB(color) {
		var result;

		// Check if we're already dealing with an array of colors
		if ( color && color.constructor == Array && color.length == 3 )
				return color;

		// Look for rgb(num,num,num)
		if (result = /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/.exec(color))
				return [parseInt(result[1],10), parseInt(result[2],10), parseInt(result[3],10)];

		// Look for rgb(num%,num%,num%)
		if (result = /rgb\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*\)/.exec(color))
				return [parseFloat(result[1])*2.55, parseFloat(result[2])*2.55, parseFloat(result[3])*2.55];

		// Look for #a0b1c2
		if (result = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/.exec(color))
				return [parseInt(result[1],16), parseInt(result[2],16), parseInt(result[3],16)];

		// Look for #fff
		if (result = /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/.exec(color))
				return [parseInt(result[1]+result[1],16), parseInt(result[2]+result[2],16), parseInt(result[3]+result[3],16)];

		// Look for rgba(0, 0, 0, 0) == transparent in Safari 3
		if (result = /rgba\(0, 0, 0, 0\)/.exec(color))
				return colors['transparent'];

		// Otherwise, we're most likely dealing with a named color
		return colors[$.trim(color).toLowerCase()];
}

function getColor(elem, attr) {
		var color;

		do {
				// jQuery <1.4.3 uses curCSS, in 1.4.3 - 1.7.2 curCSS = css, 1.8+ only has css
				color = ($.curCSS || $.css)(elem, attr);

				// Keep going until we find an element that has color, or we hit the body
				if ( color != '' && color != 'transparent' || $.nodeName(elem, "body") )
						break;

				attr = "backgroundColor";
		} while ( elem = elem.parentNode );

		return getRGB(color);
};

// Some named colors to work with
// From Interface by Stefan Petre
// http://interface.eyecon.ro/

var colors = {
	aqua:[0,255,255],
	azure:[240,255,255],
	beige:[245,245,220],
	black:[0,0,0],
	blue:[0,0,255],
	brown:[165,42,42],
	cyan:[0,255,255],
	darkblue:[0,0,139],
	darkcyan:[0,139,139],
	darkgrey:[169,169,169],
	darkgreen:[0,100,0],
	darkkhaki:[189,183,107],
	darkmagenta:[139,0,139],
	darkolivegreen:[85,107,47],
	darkorange:[255,140,0],
	darkorchid:[153,50,204],
	darkred:[139,0,0],
	darksalmon:[233,150,122],
	darkviolet:[148,0,211],
	fuchsia:[255,0,255],
	gold:[255,215,0],
	green:[0,128,0],
	indigo:[75,0,130],
	khaki:[240,230,140],
	lightblue:[173,216,230],
	lightcyan:[224,255,255],
	lightgreen:[144,238,144],
	lightgrey:[211,211,211],
	lightpink:[255,182,193],
	lightyellow:[255,255,224],
	lime:[0,255,0],
	magenta:[255,0,255],
	maroon:[128,0,0],
	navy:[0,0,128],
	olive:[128,128,0],
	orange:[255,165,0],
	pink:[255,192,203],
	purple:[128,0,128],
	violet:[128,0,128],
	red:[255,0,0],
	silver:[192,192,192],
	white:[255,255,255],
	yellow:[255,255,0],
	transparent: [255,255,255]
};



/******************************************************************************/
/****************************** CLASS ANIMATIONS ******************************/
/******************************************************************************/

var classAnimationActions = ['add', 'remove', 'toggle'],
	shorthandStyles = {
		border: 1,
		borderBottom: 1,
		borderColor: 1,
		borderLeft: 1,
		borderRight: 1,
		borderTop: 1,
		borderWidth: 1,
		margin: 1,
		padding: 1
	};

function getElementStyles() {
	var style = document.defaultView
			? document.defaultView.getComputedStyle(this, null)
			: this.currentStyle,
		newStyle = {},
		key,
		camelCase;

	// webkit enumerates style porperties
	if (style && style.length && style[0] && style[style[0]]) {
		var len = style.length;
		while (len--) {
			key = style[len];
			if (typeof style[key] == 'string') {
				camelCase = key.replace(/\-(\w)/g, function(all, letter){
					return letter.toUpperCase();
				});
				newStyle[camelCase] = style[key];
			}
		}
	} else {
		for (key in style) {
			if (typeof style[key] === 'string') {
				newStyle[key] = style[key];
			}
		}
	}
	
	return newStyle;
}

function filterStyles(styles) {
	var name, value;
	for (name in styles) {
		value = styles[name];
		if (
			// ignore null and undefined values
			value == null ||
			// ignore functions (when does this occur?)
			$.isFunction(value) ||
			// shorthand styles that need to be expanded
			name in shorthandStyles ||
			// ignore scrollbars (break in IE)
			(/scrollbar/).test(name) ||

			// only colors or values that can be converted to numbers
			(!(/color/i).test(name) && isNaN(parseFloat(value)))
		) {
			delete styles[name];
		}
	}
	
	return styles;
}

function styleDifference(oldStyle, newStyle) {
	var diff = { _: 0 }, // http://dev.jquery.com/ticket/5459
		name;

	for (name in newStyle) {
		if (oldStyle[name] != newStyle[name]) {
			diff[name] = newStyle[name];
		}
	}

	return diff;
}

$.effects.animateClass = function(value, duration, easing, callback) {
	if ($.isFunction(easing)) {
		callback = easing;
		easing = null;
	}

	return this.queue(function() {
		var that = $(this),
			originalStyleAttr = that.attr('style') || ' ',
			originalStyle = filterStyles(getElementStyles.call(this)),
			newStyle,
			className = that.attr('class') || "";

		$.each(classAnimationActions, function(i, action) {
			if (value[action]) {
				that[action + 'Class'](value[action]);
			}
		});
		newStyle = filterStyles(getElementStyles.call(this));
		that.attr('class', className);

		that.animate(styleDifference(originalStyle, newStyle), {
			queue: false,
			duration: duration,
			easing: easing,
			complete: function() {
				$.each(classAnimationActions, function(i, action) {
					if (value[action]) { that[action + 'Class'](value[action]); }
				});
				// work around bug in IE by clearing the cssText before setting it
				if (typeof that.attr('style') == 'object') {
					that.attr('style').cssText = '';
					that.attr('style').cssText = originalStyleAttr;
				} else {
					that.attr('style', originalStyleAttr);
				}
				if (callback) { callback.apply(this, arguments); }
				$.dequeue( this );
			}
		});
	});
};

$.fn.extend({
	_addClass: $.fn.addClass,
	addClass: function(classNames, speed, easing, callback) {
		return speed ? $.effects.animateClass.apply(this, [{ add: classNames },speed,easing,callback]) : this._addClass(classNames);
	},

	_removeClass: $.fn.removeClass,
	removeClass: function(classNames,speed,easing,callback) {
		return speed ? $.effects.animateClass.apply(this, [{ remove: classNames },speed,easing,callback]) : this._removeClass(classNames);
	},

	_toggleClass: $.fn.toggleClass,
	toggleClass: function(classNames, force, speed, easing, callback) {
		if ( typeof force == "boolean" || force === undefined ) {
			if ( !speed ) {
				// without speed parameter;
				return this._toggleClass(classNames, force);
			} else {
				return $.effects.animateClass.apply(this, [(force?{add:classNames}:{remove:classNames}),speed,easing,callback]);
			}
		} else {
			// without switch parameter;
			return $.effects.animateClass.apply(this, [{ toggle: classNames },force,speed,easing]);
		}
	},

	switchClass: function(remove,add,speed,easing,callback) {
		return $.effects.animateClass.apply(this, [{ add: add, remove: remove },speed,easing,callback]);
	}
});



/******************************************************************************/
/*********************************** EFFECTS **********************************/
/******************************************************************************/

$.extend($.effects, {
	version: "1.8.23",

	// Saves a set of properties in a data storage
	save: function(element, set) {
		for(var i=0; i < set.length; i++) {
			if(set[i] !== null) element.data("ec.storage."+set[i], element[0].style[set[i]]);
		}
	},

	// Restores a set of previously saved properties from a data storage
	restore: function(element, set) {
		for(var i=0; i < set.length; i++) {
			if(set[i] !== null) element.css(set[i], element.data("ec.storage."+set[i]));
		}
	},

	setMode: function(el, mode) {
		if (mode == 'toggle') mode = el.is(':hidden') ? 'show' : 'hide'; // Set for toggle
		return mode;
	},

	getBaseline: function(origin, original) { // Translates a [top,left] array into a baseline value
		// this should be a little more flexible in the future to handle a string & hash
		var y, x;
		switch (origin[0]) {
			case 'top': y = 0; break;
			case 'middle': y = 0.5; break;
			case 'bottom': y = 1; break;
			default: y = origin[0] / original.height;
		};
		switch (origin[1]) {
			case 'left': x = 0; break;
			case 'center': x = 0.5; break;
			case 'right': x = 1; break;
			default: x = origin[1] / original.width;
		};
		return {x: x, y: y};
	},

	// Wraps the element around a wrapper that copies position properties
	createWrapper: function(element) {

		// if the element is already wrapped, return it
		if (element.parent().is('.ui-effects-wrapper')) {
			return element.parent();
		}

		// wrap the element
		var props = {
				width: element.outerWidth(true),
				height: element.outerHeight(true),
				'float': element.css('float')
			},
			wrapper = $('<div></div>')
				.addClass('ui-effects-wrapper')
				.css({
					fontSize: '100%',
					background: 'transparent',
					border: 'none',
					margin: 0,
					padding: 0
				}),
			active = document.activeElement;

		// support: Firefox
		// Firefox incorrectly exposes anonymous content
		// https://bugzilla.mozilla.org/show_bug.cgi?id=561664
		try {
			active.id;
		} catch( e ) {
			active = document.body;
		}

		element.wrap( wrapper );

		// Fixes #7595 - Elements lose focus when wrapped.
		if ( element[ 0 ] === active || $.contains( element[ 0 ], active ) ) {
			$( active ).focus();
		}
		
		wrapper = element.parent(); //Hotfix for jQuery 1.4 since some change in wrap() seems to actually loose the reference to the wrapped element

		// transfer positioning properties to the wrapper
		if (element.css('position') == 'static') {
			wrapper.css({ position: 'relative' });
			element.css({ position: 'relative' });
		} else {
			$.extend(props, {
				position: element.css('position'),
				zIndex: element.css('z-index')
			});
			$.each(['top', 'left', 'bottom', 'right'], function(i, pos) {
				props[pos] = element.css(pos);
				if (isNaN(parseInt(props[pos], 10))) {
					props[pos] = 'auto';
				}
			});
			element.css({position: 'relative', top: 0, left: 0, right: 'auto', bottom: 'auto' });
		}

		return wrapper.css(props).show();
	},

	removeWrapper: function(element) {
		var parent,
			active = document.activeElement;
		
		if (element.parent().is('.ui-effects-wrapper')) {
			parent = element.parent().replaceWith(element);
			// Fixes #7595 - Elements lose focus when wrapped.
			if ( element[ 0 ] === active || $.contains( element[ 0 ], active ) ) {
				$( active ).focus();
			}
			return parent;
		}
			
		return element;
	},

	setTransition: function(element, list, factor, value) {
		value = value || {};
		$.each(list, function(i, x){
			var unit = element.cssUnit(x);
			if (unit[0] > 0) value[x] = unit[0] * factor + unit[1];
		});
		return value;
	}
});


function _normalizeArguments(effect, options, speed, callback) {
	// shift params for method overloading
	if (typeof effect == 'object') {
		callback = options;
		speed = null;
		options = effect;
		effect = options.effect;
	}
	if ($.isFunction(options)) {
		callback = options;
		speed = null;
		options = {};
	}
        if (typeof options == 'number' || $.fx.speeds[options]) {
		callback = speed;
		speed = options;
		options = {};
	}
	if ($.isFunction(speed)) {
		callback = speed;
		speed = null;
	}

	options = options || {};

	speed = speed || options.duration;
	speed = $.fx.off ? 0 : typeof speed == 'number'
		? speed : speed in $.fx.speeds ? $.fx.speeds[speed] : $.fx.speeds._default;

	callback = callback || options.complete;

	return [effect, options, speed, callback];
}

function standardSpeed( speed ) {
	// valid standard speeds
	if ( !speed || typeof speed === "number" || $.fx.speeds[ speed ] ) {
		return true;
	}
	
	// invalid strings - treat as "normal" speed
	if ( typeof speed === "string" && !$.effects[ speed ] ) {
		return true;
	}
	
	return false;
}

$.fn.extend({
	effect: function(effect, options, speed, callback) {
		var args = _normalizeArguments.apply(this, arguments),
			// TODO: make effects take actual parameters instead of a hash
			args2 = {
				options: args[1],
				duration: args[2],
				callback: args[3]
			},
			mode = args2.options.mode,
			effectMethod = $.effects[effect];
		
		if ( $.fx.off || !effectMethod ) {
			// delegate to the original method (e.g., .show()) if possible
			if ( mode ) {
				return this[ mode ]( args2.duration, args2.callback );
			} else {
				return this.each(function() {
					if ( args2.callback ) {
						args2.callback.call( this );
					}
				});
			}
		}
		
		return effectMethod.call(this, args2);
	},

	_show: $.fn.show,
	show: function(speed) {
		if ( standardSpeed( speed ) ) {
			return this._show.apply(this, arguments);
		} else {
			var args = _normalizeArguments.apply(this, arguments);
			args[1].mode = 'show';
			return this.effect.apply(this, args);
		}
	},

	_hide: $.fn.hide,
	hide: function(speed) {
		if ( standardSpeed( speed ) ) {
			return this._hide.apply(this, arguments);
		} else {
			var args = _normalizeArguments.apply(this, arguments);
			args[1].mode = 'hide';
			return this.effect.apply(this, args);
		}
	},

	// jQuery core overloads toggle and creates _toggle
	__toggle: $.fn.toggle,
	toggle: function(speed) {
		if ( standardSpeed( speed ) || typeof speed === "boolean" || $.isFunction( speed ) ) {
			return this.__toggle.apply(this, arguments);
		} else {
			var args = _normalizeArguments.apply(this, arguments);
			args[1].mode = 'toggle';
			return this.effect.apply(this, args);
		}
	},

	// helper functions
	cssUnit: function(key) {
		var style = this.css(key), val = [];
		$.each( ['em','px','%','pt'], function(i, unit){
			if(style.indexOf(unit) > 0)
				val = [parseFloat(style), unit];
		});
		return val;
	}
});



/******************************************************************************/
/*********************************** EASING ***********************************/
/******************************************************************************/

// based on easing equations from Robert Penner (http://www.robertpenner.com/easing)

var baseEasings = {};

$.each( [ "Quad", "Cubic", "Quart", "Quint", "Expo" ], function( i, name ) {
	baseEasings[ name ] = function( p ) {
		return Math.pow( p, i + 2 );
	};
});

$.extend( baseEasings, {
	Sine: function ( p ) {
		return 1 - Math.cos( p * Math.PI / 2 );
	},
	Circ: function ( p ) {
		return 1 - Math.sqrt( 1 - p * p );
	},
	Elastic: function( p ) {
		return p === 0 || p === 1 ? p :
			-Math.pow( 2, 8 * (p - 1) ) * Math.sin( ( (p - 1) * 80 - 7.5 ) * Math.PI / 15 );
	},
	Back: function( p ) {
		return p * p * ( 3 * p - 2 );
	},
	Bounce: function ( p ) {
		var pow2,
			bounce = 4;

		while ( p < ( ( pow2 = Math.pow( 2, --bounce ) ) - 1 ) / 11 ) {}
		return 1 / Math.pow( 4, 3 - bounce ) - 7.5625 * Math.pow( ( pow2 * 3 - 2 ) / 22 - p, 2 );
	}
});

$.each( baseEasings, function( name, easeIn ) {
	$.easing[ "easeIn" + name ] = easeIn;
	$.easing[ "easeOut" + name ] = function( p ) {
		return 1 - easeIn( 1 - p );
	};
	$.easing[ "easeInOut" + name ] = function( p ) {
		return p < .5 ?
			easeIn( p * 2 ) / 2 :
			easeIn( p * -2 + 2 ) / -2 + 1;
	};
});

})(jQuery);

/*!
 * jQuery UI Effects Bounce 1.8.23
 *
 * Copyright 2012, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/Effects/Bounce
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function( $, undefined ) {

$.effects.bounce = function(o) {

	return this.queue(function() {

		// Create element
		var el = $(this), props = ['position','top','bottom','left','right'];

		// Set options
		var mode = $.effects.setMode(el, o.options.mode || 'effect'); // Set Mode
		var direction = o.options.direction || 'up'; // Default direction
		var distance = o.options.distance || 20; // Default distance
		var times = o.options.times || 5; // Default # of times
		var speed = o.duration || 250; // Default speed per bounce
		if (/show|hide/.test(mode)) props.push('opacity'); // Avoid touching opacity to prevent clearType and PNG issues in IE

		// Adjust
		$.effects.save(el, props); el.show(); // Save & Show
		$.effects.createWrapper(el); // Create Wrapper
		var ref = (direction == 'up' || direction == 'down') ? 'top' : 'left';
		var motion = (direction == 'up' || direction == 'left') ? 'pos' : 'neg';
		var distance = o.options.distance || (ref == 'top' ? el.outerHeight(true) / 3 : el.outerWidth(true) / 3);
		if (mode == 'show') el.css('opacity', 0).css(ref, motion == 'pos' ? -distance : distance); // Shift
		if (mode == 'hide') distance = distance / (times * 2);
		if (mode != 'hide') times--;

		// Animate
		if (mode == 'show') { // Show Bounce
			var animation = {opacity: 1};
			animation[ref] = (motion == 'pos' ? '+=' : '-=') + distance;
			el.animate(animation, speed / 2, o.options.easing);
			distance = distance / 2;
			times--;
		};
		for (var i = 0; i < times; i++) { // Bounces
			var animation1 = {}, animation2 = {};
			animation1[ref] = (motion == 'pos' ? '-=' : '+=') + distance;
			animation2[ref] = (motion == 'pos' ? '+=' : '-=') + distance;
			el.animate(animation1, speed / 2, o.options.easing).animate(animation2, speed / 2, o.options.easing);
			distance = (mode == 'hide') ? distance * 2 : distance / 2;
		};
		if (mode == 'hide') { // Last Bounce
			var animation = {opacity: 0};
			animation[ref] = (motion == 'pos' ? '-=' : '+=')  + distance;
			el.animate(animation, speed / 2, o.options.easing, function(){
				el.hide(); // Hide
				$.effects.restore(el, props); $.effects.removeWrapper(el); // Restore
				if(o.callback) o.callback.apply(this, arguments); // Callback
			});
		} else {
			var animation1 = {}, animation2 = {};
			animation1[ref] = (motion == 'pos' ? '-=' : '+=') + distance;
			animation2[ref] = (motion == 'pos' ? '+=' : '-=') + distance;
			el.animate(animation1, speed / 2, o.options.easing).animate(animation2, speed / 2, o.options.easing, function(){
				$.effects.restore(el, props); $.effects.removeWrapper(el); // Restore
				if(o.callback) o.callback.apply(this, arguments); // Callback
			});
		};
		el.queue('fx', function() { el.dequeue(); });
		el.dequeue();
	});

};

})(jQuery);

(function($) {
	$.fn.paginate = function(options) {
		var opts = $.extend({}, $.fn.paginate.defaults, options);
		return this.each(function() {
			$this = $(this);
			var o = $.meta ? $.extend({}, opts, $this.data()) : opts;
			var selectedpage = o.start;
			$.fn.draw(o,$this,selectedpage);	
		});
	};
	var outsidewidth_tmp = 0;
	var insidewidth 	 = 0;
	var bName = navigator.appName;
	var bVer = navigator.appVersion;
	if(bVer.indexOf('MSIE 7.0') > 0)
		var ver = "ie7";
	$.fn.paginate.defaults = {
		count 		: 5,
		start 		: 12,
		display  	: 5,
		border					: true,
		border_color			: '#fff',
		text_color  			: '#8cc59d',
		background_color    	: 'black',	
		border_hover_color		: '#fff',
		text_hover_color  		: '#fff',
		background_hover_color	: '#fff', 
		rotate      			: true,
		images					: true,
		mouse					: 'slide',
		onChange				: function(){return false;}
	};
	$.fn.draw = function(o,obj,selectedpage){
		if(o.display > o.count)
			o.display = o.count;
		$this.empty();
		if(o.images){
			var spreviousclass 	= 'jPag-sprevious-img';
			var previousclass 	= 'jPag-previous-img';
			var snextclass 		= 'jPag-snext-img';
			var nextclass 		= 'jPag-next-img';
		}
		else{
			var spreviousclass 	= 'jPag-sprevious';
			var previousclass 	= 'jPag-previous';
			var snextclass 		= 'jPag-snext';
			var nextclass 		= 'jPag-next';
		}
		var _first		= $(document.createElement('a')).addClass('jPag-first').html('First');
		
		if(o.rotate){
			if(o.images) var _rotleft	= $(document.createElement('span')).addClass(spreviousclass);
			else var _rotleft	= $(document.createElement('span')).addClass(spreviousclass).html('&laquo;');		
		}
		
		var _divwrapleft	= $(document.createElement('div')).addClass('jPag-control-back');
		_divwrapleft.append(_first).append(_rotleft);
		
		/** fix for ie showing the second line as well - .css('height', '100%')-*/
		var _ulwrapdiv	= $(document.createElement('div')).css('overflow','hidden').css('height', '100%');
		var _ul			= $(document.createElement('ul')).addClass('jPag-pages')
		var c = (o.display - 1) / 2;
		var first = selectedpage - c;
		var selobj;
		for(var i = 0; i < o.count; i++){
			var val = i+1;
			if(val == selectedpage){
				var _obj = $(document.createElement('li')).html('<span class="jPag-current">'+val+'</span>');
				selobj = _obj;
				_ul.append(_obj);
			}	
			else{
				var _obj = $(document.createElement('li')).html('<a>'+ val +'</a>');
				_ul.append(_obj);
				}				
		}		
		_ulwrapdiv.append(_ul);
		
		if(o.rotate){
			if(o.images) var _rotright	= $(document.createElement('span')).addClass(snextclass);
			else var _rotright	= $(document.createElement('span')).addClass(snextclass).html('&raquo;');
		}
		
		var _last		= $(document.createElement('a')).addClass('jPag-last').html('Last');
		var _divwrapright	= $(document.createElement('div')).addClass('jPag-control-front');
		_divwrapright.append(_rotright).append(_last);
		
		//append all:
		$this.addClass('jPaginate').append(_divwrapleft).append(_ulwrapdiv).append(_divwrapright);
			
		if(!o.border){
			if(o.background_color == 'none') var a_css 				= {'color':o.text_color};
			else var a_css 											= {'color':o.text_color,'background-color':o.background_color};
			if(o.background_hover_color == 'none')	var hover_css 	= {'color':o.text_hover_color};
			else var hover_css 										= {'color':o.text_hover_color,'background-color':o.background_hover_color};	
		}	
		else{
			if(o.background_color == 'none') var a_css 				= {'color':o.text_color,'border':'1px solid '+o.border_color};
			else var a_css 											= {'color':o.text_color,'background-color':o.background_color,'border':'1px solid '+o.border_color};
			if(o.background_hover_color == 'none')	var hover_css 	= {'color':o.text_hover_color,'border':'1px solid '+o.border_hover_color};
			else var hover_css 										= {'color':o.text_hover_color,'background-color':o.background_hover_color,'border':'1px solid '+o.border_hover_color};
		}
		
		$.fn.applystyle(o,$this,a_css,hover_css,_first,_ul,_ulwrapdiv,_divwrapright);
		//calculate width of the ones displayed:
		var outsidewidth = outsidewidth_tmp - _first.parent().width() -3;
		if(ver == 'ie7'){
			_ulwrapdiv.css('width',outsidewidth+72+'px');
			_divwrapright.css('left',outsidewidth_tmp+6+72+'px');
		}
		else{
			_ulwrapdiv.css('width',outsidewidth+'px');
			_divwrapright.css('left',outsidewidth_tmp+6+'px');
		}
		
		if(o.rotate){
			_rotright.hover(
				function() {
				  thumbs_scroll_interval = setInterval(
					function() {
					  var left = _ulwrapdiv.scrollLeft() + 1;
					  _ulwrapdiv.scrollLeft(left);
					},
					20
				  );
				},
				function() {
				  clearInterval(thumbs_scroll_interval);
				}
			);
			_rotleft.hover(
				function() {
				  thumbs_scroll_interval = setInterval(
					function() {
					  var left = _ulwrapdiv.scrollLeft() - 1;
					  _ulwrapdiv.scrollLeft(left);
					},
					20
				  );
				},
				function() {
				  clearInterval(thumbs_scroll_interval);
				}
			);
			if(o.mouse == 'press'){
				_rotright.mousedown(
					function() {
					  thumbs_mouse_interval = setInterval(
						function() {
						  var left = _ulwrapdiv.scrollLeft() + 5;
						  _ulwrapdiv.scrollLeft(left);
						},
						20
					  );
					}
				).mouseup(
					function() {
					  clearInterval(thumbs_mouse_interval);
					}
				);
				_rotleft.mousedown(
					function() {
					  thumbs_mouse_interval = setInterval(
						function() {
						  var left = _ulwrapdiv.scrollLeft() - 5;
						  _ulwrapdiv.scrollLeft(left);
						},
						20
					  );
					}
				).mouseup(
					function() {
					  clearInterval(thumbs_mouse_interval);
					}
				);
			}
			else{
				_rotleft.click(function(e){
					var width = outsidewidth - 10;
					var left = _ulwrapdiv.scrollLeft() - width;
					_ulwrapdiv.animate({scrollLeft: left +'px'});
				});	
				
				_rotright.click(function(e){
					var width = outsidewidth - 10;
					var left = _ulwrapdiv.scrollLeft() + width;
					_ulwrapdiv.animate({scrollLeft: left +'px'});
				});
			}
		}
		
		//first and last:
		_first.click(function(e){
				_ulwrapdiv.animate({scrollLeft: '0px'});
				_ulwrapdiv.find('li').eq(0).click();
		});
		_last.click(function(e){
				_ulwrapdiv.animate({scrollLeft: insidewidth +'px'});
				_ulwrapdiv.find('li').eq(o.count - 1).click();
		});
		
		//click a page
		_ulwrapdiv.find('li').click(function(e){
			selobj.html('<a>'+selobj.find('.jPag-current').html()+'</a>'); 
			var currval = $(this).find('a').html();
			$(this).html('<span class="jPag-current">'+currval+'</span>');
			selobj = $(this);
			$.fn.applystyle(o,$(this).parent().parent().parent(),a_css,hover_css,_first,_ul,_ulwrapdiv,_divwrapright);	
			var left = (this.offsetLeft) / 2;
			var left2 = _ulwrapdiv.scrollLeft() + left;
			var tmp = left - (outsidewidth / 2);
			if(ver == 'ie7')
				_ulwrapdiv.animate({scrollLeft: left + tmp - _first.parent().width() + 52 + 'px'});	
			else
				_ulwrapdiv.animate({scrollLeft: left + tmp - _first.parent().width() + 'px'});	
			o.onChange(currval);	
		});
		
		var last = _ulwrapdiv.find('li').eq(o.start-1);
		last.attr('id','tmp');
		var left = document.getElementById('tmp').offsetLeft / 2;
		last.removeAttr('id');
		var tmp = left - (outsidewidth / 2);
		if(ver == 'ie7') _ulwrapdiv.animate({scrollLeft: left + tmp - _first.parent().width() + 52 + 'px'});	
		else _ulwrapdiv.animate({scrollLeft: left + tmp - _first.parent().width() + 'px'});	
	}
	
	$.fn.applystyle = function(o,obj,a_css,hover_css,_first,_ul,_ulwrapdiv,_divwrapright){
					obj.find('a').css(a_css);
					obj.find('span.jPag-current').css(hover_css);
					obj.find('a').hover(
					function(){
						$(this).css(hover_css);
					},
					function(){
						$(this).css(a_css);
					}
					);
					obj.css('padding-left',_first.parent().width() + 5 +'px');
					insidewidth = 0;
					
					obj.find('li').each(function(i,n){
						if(i == (o.display-1)){
							outsidewidth_tmp = this.offsetLeft + this.offsetWidth ;
						}
						insidewidth += this.offsetWidth;
					})
					_ul.css('width',insidewidth+'px');
	}
})(jQuery);
AppModel = Backbone.Model.extend({
	initialize : function(){
		var self = this;

		self.validationmessages = {};
		self.validators = {};
		this.bind("error", this.defaultErrorHandler);
	},
	url:function(uri){
		if(this.id)
			return '/api/' + this.modelName + '/'+ this.id;
		else
			return '/api/' + this.modelName + (uri ? '/' + uri : '');
	},
	defaultErrorHandler: function(model, error) {
		if (error.status == 401) {
			if(app)
				app.navigate('modal/login', {trigger:true});
        }else if (error.status == 403) {
        	if(app)
        		app.navigate('modal/status', {trigger:true});
        }
    },
	validationmessages:{
		
	},
	validations:{
		
	},
	validators:{
		
	},
	validateItem: function (key) {
        return (this.validators[key]) ? this.validators[key](this.get(key)) : {isValid: true};
    },

    validateAll: function () {
    	var self = this;
    	self.validationmessages = {};
        
        for (var key in self.validators) {
            if(self.validators.hasOwnProperty(key)) {
                var check = self.validators[key](self.get(key));
                if (!check.isValid) {
                	self.validationmessages[key] = check.message;
                }
            }
        }
        return _.size(self.validationmessages) > 0 ? {isValid: false, messages: self.validationmessages} : {isValid: true};
    },  
    fetch: function(options) {
    	var modelName = this.modelName;
    	var modelcollection = window[modelName + 'collection'];
    	if(this.id && modelcollection && modelcollection){
    		var modelobj = modelcollection.get(this.id);
    		this.set(modelobj.toJSON(), {silent:true});
    		if(options.success)
    			options.success();
    	}else{
    		options || (options = {});
    		options.beforeSend=function(xhr){
    			xhr.setRequestHeader('Content-Type', 'application/jsonp');
    			xhr.setRequestHeader('Accept', 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*');
    			
    			var evimedCookie = utils.readCookie('evimed-cookie');
    			if(evimedCookie)
    				xhr.setRequestHeader('evimed-cookie', evimedCookie);
    		};
            Backbone.Model.prototype.fetch.call(this, options);    		
    	}
    },
    sortFields:function(){
    	return this.attributes;
    },
	noOfPages:function(pageItemCount){
		if(this.get('info') && this.get('info').count > 0){
			var count = this.get('info').count;
			var pageLimit = pageItemCount||5;
			
		    var pageCount = Math.floor(count/pageLimit);
		    
			return pageCount;
		}else if(this.models){
			var pageLimit = pageItemCount||5;
			var count = this.models.length;
		    var pageCount = Math.floor(count/pageLimit);
		    
		    if(pageCount == 0)
		    	pageCount = 1;
			
		    return pageCount;
		}else 
			return 0;
	}
});

window.AppModelCollection = Backbone.Collection.extend({
    url:function(){
    	var url = new this.model().url();
    	
    	if(this.searchquery){
    		var query = [];
    		for(field in this.searchquery){
    			query.push(field + '=' + escape(this.searchquery[field]));
    		}
    		if(query.length > 0)
    			url = url + '?' + query.join('&');
    	}
    	return url;
	},
	initialize : function(options){
    	if(options && options.uri){
    		this.uri = options.uri;
	    	this.url = function(){
	    		return new this.model().url(options.uri);
	    	}
    	}
    	if(options && options.page)
    		this.searchquery.page = page;
    	if(window.pageItemCount)
    		this.searchquery.pagedelta = window.pageItemCount;
    	
    	this.bind("error", this.defaultErrorHandler);
	},
	defaultErrorHandler: function(model, error) {
		if (error.status == 401) {
			if(app)
				app.navigate('modal/login', {trigger:true});
        }else if (error.status == 403) {
        	if(app)
        		app.navigate('modal/status', {trigger:true});
        }
    },
    searchquery:{},
    pageCount : function(){
    	return Math.ceil(this.models.length/window.pageItemCount);
    },
    fetch: function(options, page) {
    	var modelName = new this.model().modelName;
    	var modelcollection = window[modelName + 'collection'];
    	if(page && modelcollection){
    		if(page > this.pageCount()){
    			this.searchquery.page = page||this.options.page;
    			options || (options = {});
    			options.beforeSend=function(xhr){
        			xhr.setRequestHeader('Content-Type', 'application/jsonp');
        			xhr.setRequestHeader('Accept', 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*');
        		};
                Backbone.Collection.prototype.fetch.call(this, options);  
    		}else if(options.success)
    			options.success();
    	} else {
			options || (options = {});
			options.beforeSend=function(xhr){
    			xhr.setRequestHeader('Content-Type', 'application/jsonp');
    			xhr.setRequestHeader('Accept', 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*');
    		};
    		
			Backbone.Collection.prototype.fetch.call(this, options);    		
    	}
    },
	noOfPages:function(pageItemCount){
		if(this.get('info') && this.get('info').count > 0){
			var count = this.get('info').count;
			var pageLimit = pageItemCount||5;
			
		    var pageCount = Math.ceil(count/pageLimit);
		    
			return pageCount;
		}else if(this.models){
			var pageLimit = pageItemCount||5;
			var count = this.models.length;
		    var pageCount = Math.ceil(count/pageLimit);
		    
		    if(pageCount == 0)
		    	pageCount = 1;
			
		    return pageCount;
		}else 
			return 0;
	}
});

window.Userprofile = AppModel.extend({
	url:'/profile',
	defaults:{
		id:'',
		userName:'',
		emailAddress:'',
		firstName: "",
		lastName: "",
		gender: "",
		dateOfBirth: "",
		country: "",
		city: "",
		emailAddress: "",
		phone: "",
		acceptTermsOfUse:false,
		loggedIn:false
	},
	validations:{
		emailAddress:'required,email', 
		password: 'required'
	}
});
window.LANG_KEYS = ['en', 'de'];

window.Language = AppModel.extend({
	initialize: function(options) {
	},
	
	defaults: {
		key: '',
		translations: ''
	},
	modelName:'language',
	sortFields:function(){return {key:'Language Key'}},
	toJSON:function(){
		if(this.get('languageTranslationCollection')){
			var languageTranslationCollection = this.get('languageTranslationCollection');
			var translations = [];
			for(var i = 0; i < languageTranslationCollection.models.length; i++){
				var languageTranslation = languageTranslationCollection.models[i];
				translations.push(languageTranslation.toJSON());
			}
			delete this.attributes.languageTranslationCollection;
			_.extend(this.attributes, {translations: translations});
		}
        return this.attributes;
	}
});

window.LanguageCollection = AppModelCollection.extend({
    model: window.Language
});

window.LanguageTranslation = Backbone.Model.extend({
	defaults:{
		id:null,
		language:'',
		value:''
	}
});

window.LanguageTranslationCollection = Backbone.Collection.extend({
	model:Language
});
window.BackbootAppRouter = Backbone.Router.extend({
	showNotification:function(message, classname, id){
		var self = this;
		
		var template = _.template($('#notification_tmpl').html());
        var html = template({'message':message});
        var $elem = $(html);

        $elem.addClass(classname ? classname + ' alert': 'alert alert-info');
        
        id = id||'#notification-header';
        $(id).html($elem);
        $(id).effect("bounce", { times:3 }, 500);
    },
    clearBreadcumb : function(){
    	var self = this;
    	if(self.headerView){
    		var $nav = $('.subnav .nav.brcms', $(self.headerView.el));
    		$nav.remove();
    	}
    },
    before:function(route, one){
    	this.hideNotification();
    },
    after:function(route){
    	this.clearBreadcumb();
    },
    hideNotification:function(id){
    	var self = this;
    	
    	id = id||'#notification-header';
    	$(id).html('');
    },
    highliteNavigation : function(url){
    	var self = this;
    	if(!self.headerView)
    		return false;
    	
    	var $nav = $('.subnav .nav:first', $(self.headerView.el));
    	$nav.find('.active').removeClass('active');
    	$nav.find('[href="'+url+'"]').parent().addClass('active');
    },
    clearBreadcumb : function(brcms){
    	var self = this;
    	if(self.headerView){
    		var $nav = $('.subnav .nav.brcms', $(self.headerView.el));
    		$nav.remove();
    	}
    },	
    updateBreadcumb : function(brcms){
    	var self = this;
    	
    	if(!self.headerView)
    		return false;
    	
    	if(brcms&&brcms.constructor === Array){
    		brcms = brcms||[];
    		var _tmpl = '<ul class="nav brcms"><li class="devider-veritcal"><span>&raquo;</span></li><%for(var i in brcms){var bc = brcms[i];%><%if(bc.active){%><li><span class="active"><%= bc.display %></span></li><%}else{%><li><a href="<%= bc.url %>"><%= bc.display %></a></li><%}%><%}%></ul>'
            	
    		var $nav = $('.subnav .nav.brcms', $(self.headerView.el));
    		if(!$nav||$nav.length==0){
    			$nav = $('.subnav .nav:first', $(self.headerView.el));
    			$nav.after(_.template(_tmpl)({brcms:brcms}));
    		} else{
    			$nav.html(_.template(_tmpl)({brcms:brcms}));
    		}
    	} else{
    		var $nav = $('.subnav .nav.brcms', $(self.headerView.el));
    		var _tmpl = '<li class="devider-veritcal"><span>&raquo;</span></li><%for(var i in brcms){var bc = brcms[i];%><%if(bc.active){%><li><span class="active"><%= bc.display %></span></li><%}else{%><li><a href="<%= bc.url %>"><%= bc.display %></a></li><%}%><%}%>'
            	
    		if(!$nav||$nav.length ==0){
    			$nav = $('.subnav .nav:first', $(self.headerView.el));
    			$nav.after(_.template(_tmpl)({brcms:[brcms]}));
    		}else{
    			$nav.append(_.template(_tmpl)({brcms:[brcms]}));
    		}
    	}
    },
    modalStaticPage:function(model, sub, page){
        this.dynamicPage(model, sub, page, true)
    },
    dynamicPage:function(model, sub, page, modalView){
        var self = this;

        model = model || 'Dashboard';
        var config = {accordion:false};
        
        if(!window.userprofile || !window.userprofile.get('loggedIn')){
    		model = "login";
    	} else if(!window.userprofile.get('currentcenterId')) {
    		app.showNotification('Your account is not configured propely, please contact Administrator.', 'alert-error');
    		return;
    	}
        
        var modelclass = utils.capitaliseFirstLetter(model);
           
        if(window[modelclass] && window[modelclass + 'View']){
            if((!sub||sub == 'page')&& window[modelclass + 'Collection'] && window[modelclass + 'ListView']){
            	var modelobjectList = new window[modelclass + 'Collection']();
    	        
            	var viewobject = new window[modelclass + 'ListView']({config:config, model: modelobjectList, page: p, modalView:modalView});
            	//$("#content").html(viewobject.el);
    			viewobject.loadTemplate(function(data){
    				viewobject.template = _.template(data);
    				
	    			var p = page ? parseInt(page, 10) : 1;
	    	        
	    	        modelobjectList.fetch({
	    	        	success: function(){
	    	        		viewobject.render();
	    				
	    	        		$("#content").html('').html(viewobject.el);
	    	        	}, error:{
	    	        		
	    	        	}
	    	        });
    			});
            } else if(sub && modelclass != 'PatientSearch'){
                var modelobject = new window[modelclass]();
                var p = page ? parseInt(page, 10) : 1;
                
                var viewobject = new window[modelclass + 'View']({el: '#content', model: modelobject, page:p, config:config});
                //$("#content").html(viewobject.el);
                
                var options = {};
                options[modelobject.idAttribute] = sub;
                modelobject.set(options);

                viewobject.loadTemplate(function(data){
                    viewobject.template = _.template(data);
                    modelobject.fetch({success: function(){
                        modelobject.set({sub_page:page});
                        viewobject.render();
                    }});
                });
            }else{
                var modelobject;
                if(model == 'myaccount')
                    modelobject = window.userprofile;
                else if(window[utils.capitaliseFirstLetter(model) + 'Object'])
                    modelobject = window[model + 'Object'];
                else
                    modelobject = new window[modelclass]();

                var p = page ? parseInt(page, 10) : 1;
                
                var template = modelclass;
                
                if(!window[modelclass + 'ViewObject']){
	                var view = new window[modelclass + 'View']({
	                    advanced:(sub=='advanced'), model:modelobject, modalView:modalView, page:p, config:config
	                });
	                //$("#content").html(view.el);
	                
	                view.loadTemplate(function(data){
	                    view.template = _.template(data);
	                    view.render(page);
	                    
	                    if(modalView){
	                        $("#modal").html('').html(view.el);
	                        $("#modal").modal('show');
	                    }else
	                        $("#content").html('').html(view.el);
	                });
                }else{
                	$("#content").html('').html(window[modelclass + 'ViewObject'].el);
                }
            }
        }else if(window[modelclass + 'View']){
        	if(!window[modelclass + 'ViewObject']){
            	var view = new window[modelclass + 'View']({model:window.userprofile, modalView:modalView, config:config});
            	//$("#content").html(view.el);
            	
            	view.loadTemplate(function(data){
					view.template = _.template(data);
					view.render();
					 
					if(modalView){
						$("#modal").html('').html(view.el);
						$("#modal").modal('show');
					}else
						$("#content").html('').html(view.el);
				});
            }else{
            	window[modelclass + 'ViewObject'].render();
            	$("#content").html('').html(window[modelclass + 'ViewObject'].el);
            }
        }else{
            self.staticPage(model);
            //$("#content").html('<div class="alert alert-error"><strong>Error!</strong> Some thing wrong Page not found!!');
        }
    },
    staticPage: function(page, modalView){
        page = page || 'Dashboard';
        var modelObject = window.userprofile;
        
        page = utils.capitaliseFirstLetter(page);
        var view = new DefaultPageView({model:window.userprofile, modalView:modalView});
        //$("#content").html(view.el);
        
        view.loadTemplate(function(data){
        	view.template = _.template(data);
        	view.render();
            
            if(modalView){
                $("#modal").html('').html(view.el);
                $("#modal").modal('show');
            }else{
                $("#content").html('').html(view.el);
            }
        });
    }
});
window.Sidebar = Backbone.Model.extend({
    initialize : function(){
    },
    
    defaults: {
        entity: null,
        entities: ""
    }
});

window.SidebarCollection = Backbone.Collection.extend({
    model: Sidebar
});
var Autocomplete = Backbone.View.extend({
  render: function() {
    var choices = this.options.choices,
        selected = this.options.selected,
        iterator = this.options.iterator,
        label = this.options.label,
        allowDupes = this.options.allowDupes,
        $el = $(this.el);
    $el.autocomplete({
      source: function(request, response) {
        var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), 'i');
        response(choices.filter(function(model) {
          return iterator(model, matcher);
        }));
      },
      focus: function(event, ui) {
        $el.val(label(ui.item));
        return false;
      },
      select: function(event, ui) {
        selected.add(ui.item);
        if (!allowDupes) {
          choices.remove(ui.item);
        }
        $el.val('');
        return false;
      }
    }).data('autocomplete')._renderItem = function(ul, item) {
      return $('<li/>')
        .data('item.autocomplete', item)
        .append($('<a/>').text(label(item)))
        .appendTo(ul);
    };
    return this;
  }
});

window.Breadcrumb = Backbone.View.extend({
	initialize:function () {
    	this.model.bind("reset", this.render, this);
        
        if(this.model && !this.options.title){
        	this.options.title = 'New';
        }
        if(this.options.data)
        	this.options.count = this.options.data.length;
        else if(this.model && this.model.models)
        	this.options.count = this.model.models.length;
        else
        	this.options.count = 0;
        this.render();
    },

    render:function () {
        $(this.el).html('<ul class="breadcrumb"/>');
        
        $('ul', this.el).append('<li><a href="#">Home</a> <span class="divider">/</span></li>');
        
        if(this.model && !this.model.models) {
        	$('ul', this.el).append('<li><a href="#'+this.options.urlRoot+'">'+this.options.root+'</a> <span class="divider">/</span></li>');
        }
        
        $('ul', this.el).append('<li class="active">'+this.options.title+'('+this.options.count+')</li>');
        
        return this;
    }
});
var ModalView = Backbone.View.extend({
	title:'Modal Header',
	footer:false,
	initialize:function (options) {
        if(options && options.title)
        	this.title = options.title;
        if(options && options.footer)
        	this.footer = options.footer;
        if(options && options.template)
            this.template = options.template;
    },
    
    render:function () {
    	if($(modal)){
    		$(this.el).html(this.modal());
    	}
    	
    	$(".help-search", $(this.el)).popover({content:function(obj, next){
			return $(this).attr('data-content');
		}});
    	
        return this;
    },
    
    modal:function(){
    	var $body = $('<div class="modal"/>');
        
    	$body.append('<div class="modal-header"><button class="close" data-dismiss="modal">&times;</button><h3>'+this.title+'</h3></div>');
    	$body.append('<div class="modal-body"><p>..</p></div>');
		
		if(this.footer)
			$body.append('<div class="modal-footer"><a href="#" class="btn">Close</a></div>');
		
		return $body;
    }
});

var ModelView = Backbone.View.extend({
	modelName:'Model',
    urlRoot:null,
    modalView:false,
    cssstyle:'',
    config:{
    	accordion:false
    },
    initialize: function (options) {
    	var self = this;
    	if(options && options.modelName)
    		this.modelName = options.modelName;
    	if(options && options.displayName)
    		this.displayName = options.displayName;
    	if(options && options.title)
    		this.title = options.title;
    	if(options && options.templateName)
    		this.templateName = options.templateName;
    	if(options && options.urlRoot)
    		this.urlRoot = options.urlRoot;
    	if(options && options.modalView)
    		this.modalView = options.modalView;
    	if(options && options.template){
        	this.template = options.template;
        }
    	
    	if(options && options.config)
    		for(var i in options.config){
    			this.config[i] = options.config[i];
    		}
    	
    	this.events = $.extend(true, {}, this.events_, this.events);
        
        this.model.bind("destroy", this.close, this);
        
        //var model = this.model;
    	
    	if(!(this.model.validators && this.model.validators.length > 0) && this.model.validations){
    		this.model.validators = {};
			for(field in this.model.validations){
				var validation = this.model.validations[field];
				if(typeof validation == 'string'){
					if(validation.indexOf(',') == -1 && utils.validations.hasOwnProperty(validation)){
						this.model.validators[field] =(function(validation, field) {
						  return function(value) {
							  return utils.validations[validation](value);
						  }
						})(validation, field);
					}else{
						var vals = validation.split(',');
						
						this.model.validators[field] =(function(vals, field) {
						  return function(value) {
							  return utils.validations['groupcheck'](vals, value);
						  }
						})(vals, field);
					}
				}else if(typeof this.model.validations[validation] == 'function'){
					this.model.validators[validation] = self.validations[validation]; 
				}
			}
		}
    	this.afterInitialize();
    },

    plugins:{
    	
    },
    onError:function(){
    	
    },
    afterRender : function(){
    	
    },
    afterInitialize : function(){
    	
    },
    render: function (options) {
    	var self = this;

        $(self.el).addClass('loading');

    	var afterRender = true;
    	if(options)
    		afterRender = !options.disableAfterRender;
    	
        if(this.cssstyle)
            $(this.el).css(this.cssstyle);
        
    	if(!this.modalView){
			var json = this.model.toJSON();
			if(window.userprofile)
				json.userprofile = window.userprofile.toJSON();
			
	    	if(self.config.accordion){
	    		var id = $(self.el).attr('id') || Math.ceil(Math.random()*100);
	    		var iconclass = self.config.accordion_iconclass||window.accordion_iconclass||'icon-white';
	        	var elm = '<div class="accordion-group">'
		        	+'<div class="accordion-heading">'
			        	+'<a class="accordion-toggle" data-toggle="collapse" href="#'+id+'_accordion" data-original-title="">'
			        		+'<i class="icon-chevron-down '+iconclass+' pull-right"></i>'
			        		+'<i class="icon-th '+iconclass+'"></i>'
			        		+'<span class="divider-vertical"></span>'  
			        		+this.title
		        		+'</a>'
		        	+'</div>'
			        +'<div id="'+id+'_accordion" class="accordion-body collapse in">'
			        +'<div class="accordion-inner paddind">'
			        +'</div>'
			        +'</div>';
	        	
	        	$(this.el).html(elm);
	        	$('.accordion-inner:first', $(this.el)).html(this.template(json));
	        }else{
	        	$(this.el).html(this.template(json));
	        }
	    	
			var frmactions = $('form:first .form-actions', $(this.el));
			
			if(!frmactions||frmactions.length <= 0){
				frmactions = $('<div class="form-actions"></div>');
				$('form:first', $(this.el)).append(frmactions);
				//frmactions.append('<div class="form-actions"></div>');
    			//$('form .form-actions', $(this.el)).append('<a href="#" class="btn btn-primary back"><i class="icon-white icon-back"></i>Back</a>&nbsp;');
				frmactions.append('<a href="#" class="btn btn-primary save"><i class="icon-white icon-edit"></i>'+(this.model.id ? 'Update&raquo;' : 'Save&raquo;') + '</a>&nbsp;');
				//frmactions.append('<a href="#" class="btn btn-primary save next"><i class="icon-white icon-edit"></i>'+(this.model.id ? 'Update and Add Next&raquo;' : 'Save and Add Next&raquo;') + '</a>&nbsp;');
    			
    			if(this.model.toJSON().id){
    				//frmactions.append('<a href="#'+this.urlRoot+'/copy/'+this.model.toJSON().id+'" class="btn btn-primary"><i class="icon-white  icon-share"></i>Copy</a>&nbsp;');
    				frmactions.append('<a href="#" class="btn btn-primary delete"><i class="icon-white icon-trash"></i>Delete</a>');
    			}
			}
			
			$('.delete', $(self.el)).click(function(){
				self.remove_();
			});
		} else{
			var display = this.displayName||this.title||this.modelName;
			$(this.el).html(new ModalView({title: display}).modal());

			$('.modal .modal-body', $(this.el)).html(this.template(this.model.toJSON()));
		}
    		
    	$('form', $(this.el)).submit(function(event){
			$(':password', $(self.el)).each(function(){
				var value = $(this).val();
				var encvalue = Base64.encode(value);
				$(this).val(encvalue);
			});
		});
    	
        $('.help-inline', $(this.el)).hide();
        if(afterRender)
    		this.afterRender();

	    $(self.el).removeClass('loading');

        return this;
    },
    
    updateValidation:function(){
    	var model = this.model;
    	if(model.validations){
    		for(i in model.validations){
    			var validation = model.validations[i];
    			if(validation.contains('required')){
    				var label = $('label[for='+i+']').html();
    				$('label[for='+i+']').html(label+ '(Required)');
    			}
    		}
    	}
    },
    
    events_: {
        "change"        : "change",
        "click .save"   : "beforeSave",
        /*"click .delete" : "remove_",*/
        'click .back'	:function(){
        },
        'click .modal-link' : function(event){
        	event.stopPropagation();
            event.preventDefault();
            
            var target = event.target;
            var link = $(target).attr('href');
            var prev = window.location.hash;
            app.navigate(link.replace('#', ''),{trigger:true, replace: true});
            app.navigate(prev, {trigger:false, replace: true});
        }
    },
    change: function (event) {
        // Remove any existing alert message
        this.hideAlert();

        // Apply the change to the model
        var target = event.target;
        var change = {};
        
        var value = null;
        if($(target).is(':radio')){
        	value = $(target).val();
        }else if($(target).is(':checkbox')){
        	value = target.checked;
        }else{
        	value = target.value;
        
	        if(value && value.lastIndexOf(', ') != -1 && value.lastIndexOf(', ') == value.length-2)
	    		value = value.substring(0, value.lastIndexOf(', '));
	
	        if(value && value.lastIndexOf(',') != -1 && value.lastIndexOf(',') == value.length-1)
	    		value = value.substring(0, value.lastIndexOf(','));
        }
        change[target.name] = value;
        this.model.set(change);

        // Run validation rule (if any) on changed item
        if(this.model.validateItem){
	        var check = this.model.validateItem(target.id);
	        if (check.isValid === false) {
	            this.addValidationError(target.id, check.message);
	        } else {
	            this.removeValidationError(target.id);
	        }
        }
    },
    validate:function(){
    	var self = this;
    	var check = self.model.validateAll();
    	
    	if (check.isValid === false) {
    		self.displayValidationErrors(check.messages);
            return false;
        }else
        	return true;
    },
    beforeSave: function (event) {
        var self = this;
        
        $('select', $(self.el)).trigger('change');
        $(':hidden', $(self.el)).trigger('change');
        
        var target = event.target;
        var next = $(target).hasClass('next');
        if(self.validate()){
        	this.save(next);
        	return false;
        }else
        	return false;
    },
    afterSave:function(next){
    	var self = this;
    	var display = self.displayName||self.modelName||self.title;
    	
    	if(next){
    		var callback = function(self){
    			/*
    			//var change = {};
    			//change['id'] = '';
    			//self.model.set(change);
    			//self.model = new self.model();
    			//self.render();
    			*/
    			if(self.modalView && window.currentviewobject){
        			window.currentviewobject.trigger('datafrompopup');
        		}
    			
    			if(self.updateurl && !self.modalView)
    				app.navigate(self.urlRoot + '/copy/' + model.id, true);
    			else
    				app.navigate('modal/' + self.urlRoot + '/copy/' + model.id, true);
            }
    		self.showAlert('Success!', display + ' '+(self.model.isNew()? 'saved' : 'updated')+' successfully', 'alert-success', true, 2000, callback);
    		callback(self);
    	}else{
    		self.showAlert('Success!', display + ' '+(self.model.isNew()? 'saved' : 'updated')+' successfully', 'alert-success');
    	}
    },
    save: function (next) {
        var self = this;
        var oldid = this.model.id;
        
        $(self.el).block({ 
            message: '<h1>Saving</h1>', 
            css: { border: '3px solid #a00' } 
        });
        
        this.model.save(null, {
            success: function (model, response, options) {
            	var display = self.displayName||self.modelName||self.title;
            	if(next){
            		var callback = function(self){
            			/*
            			//var change = {};
            			//change['id'] = '';
            			//self.model.set(change);
            			//self.model = new self.model();
            			//self.render();
            			*/
            			if(self.modalView && window.currentviewobject){
                			window.currentviewobject.trigger('datafrompopup');
                		}
            			
            			if(self.updateurl && !self.modalView)
            				app.navigate(self.urlRoot + '/copy/' + model.id, true);
            			else
            				app.navigate('modal/' + self.urlRoot + '/copy/' + model.id, true);
                    }
            		self.showAlert('Success!', display + ' '+(self.model.isNew()? 'saved' : 'updated')+' successfully', 'alert-success', true, 2000, callback);
            		callback(self);
        			$(self.el).unblock();
            	}else{
            		if(self.modalView && window.currentviewobject){
            			window.currentviewobject.trigger('datafrompopup');
            		}
            		
	            	//self.render();
            		if(self.updateurl && !self.modalView){
            			app.navigate(self.urlRoot + '/' + model.id, false);
            		}
        			$(self.el).unblock();
            		self.afterSave(false);
	                //self.showAlert('Success!', display + ' saved successfully', 'alert-success');
            	}
            	
    			var modelcollection = window[self.urlRoot + 'collection'];
    			if(modelcollection){
    				var modelobj = modelcollection.get(oldid);
    				if(modelobj){
    					modelobj.set(model.toJSON());
    				}else
    					modelcollection.add(model);
    			}
            },
            error: function (error, data) {
            	self.processResponseError(data);

                $(self.el).unblock();
            }
        });
    },

    remove_: function () {
    	var self = this;
    	var display = self.displayName||self.modelName||self.title;
    	
    	if(confirm('are you sure! you want to delete this record'))
	        this.model.destroy({
	            success: function () {
	                alert(display + ' deleted successfully');
	                window.history.back();
	            }
	        });
        return false;
    },
    fileHandlerCallback:function(){},
    fileHandler:function(event, image){
    	event.stopPropagation();
        event.preventDefault();
        var e = event.originalEvent;

        var self = this;
        
        var target = event.target;
        var targetfieldname = $(target).attr('targetfilename');
        if(!targetfieldname){
        	targetfieldname = $(target).attr('name'); 
        	if(targetfieldname){
        		targetfieldname = targetfieldname.replace('File', '');
            }
        }
        
        self[target.name]  = e.target.files[0];
        if(image){
        	if(targetfieldname){
                // Read the image file from the local file system and display it in the img tag
                var reader = new FileReader();
                reader.onloadend = function () {
                    $('#' + targetfieldname).attr('src', reader.result);
                    self[target.name + 'Data'] = reader.result;
                };
                reader.readAsDataURL(self[target.name]);
            }else{
            	//@TODO- should work in all browsers. console.log('File upload is not properly configured!!');
            }
        }
        self.fileHandlerCallback(target.name);
    },
    fileDropHandler: function (event, image) {
        event.stopPropagation();
        event.preventDefault();
        
        var self = this;
        
        var e = event.originalEvent;

        var target = event.target;
        if($(target).hasClass('disabled'))
        	return false;
        var targetfieldname = $(target).attr('targetname');
        if(!targetfieldname)
        	targetfieldname = $(target).attr('id') + 'File';
        
        if(targetfieldname){
            e.dataTransfer.dropEffect = 'copy';
            self[targetfieldname] = e.dataTransfer.files[0];

            // Read the image file from the local file system and display it in the img tag
            if(image){
            	var reader = new FileReader();
	            reader.onloadend = function () {
	                $(target).attr('src', reader.result);
	                self[targetfieldname + 'Data'] = reader.result;
	            };
	            reader.readAsDataURL(self[targetfieldname]);
            }
        }else{
        	//@TODOD -Should work in all browsers. console.log('Drag is not properly configured!!');
        }
        self.fileHandlerCallback(targetfieldname);
    },
    imageFileHandler: function(event){
    	var self = this;
    	
    	self.fileHandler(event, true);
    },
    imageDropHandler: function (event) {
    	var self = this;
    	
    	self.fileDropHandler(event, true);
    },displayValidationErrors: function (messages) {
    	for (var key in messages) {
            if (messages.hasOwnProperty(key)) {
                this.addValidationError(key, messages[key]);
            }
        }
        this.showAlert('Warning!', 'Fix validation errors and try again', 'alert-error');
    },addValidationError: function (field, message) {
    	if(field){
    		var controlGroup = $('#' + field, $(this.el)).parent().parent();
	        controlGroup.addClass('error');
	        if($('.validation-message', controlGroup).length <= 0)
	        	$('#' + field, $(this.el)).parent().append('<div class="validation-message help-inline"></div>');
	        $('.validation-message', controlGroup).html(message);
    	}
    }, removeValidationError: function (field) {
    	if(field){
	    	var controlGroup = $('#' + field, $(this.el)).parent().parent();
	        controlGroup.removeClass('error');
	        $('.validation-message', controlGroup).html('');
    	}
    },showAlert: function(title, text, klass, removable, timeout, callback) {
    	var self = this;
        if($('.alert', $(this.el)).length <= 0)
        	if(!self.modalView)
        		$(this.el).append('<div class="alert"></div>');
        	else
        		$('.modal-body', this.el).append('<div class="alert"></div>');
        
    	$('.alert', $(this.el)).removeClass("alert-error alert-warning alert-success alert-info");
        $('.alert', $(this.el)).addClass(klass);
        
        $('.alert', $(this.el)).html('');
        
        if(removable)
        	$('.alert', $(this.el)).append('<button type="button" class="close" data-dismiss="alert">x</button>');
        
        $('.alert', $(this.el)).append('<h4 class="alert-heading">'+title+'</h4>');
        $('.alert', $(this.el)).append('<p>' + text+ '</p>');
        $('.alert', $(this.el)).show();
        if(timeout > 0){
        	window.setTimeout(function(){
        		if($('.alert', $(self.el)).length > 0){
        			$('.alert', $(self.el)).hide();
        		}
        		if(callback)
        			callback(self);	
        	}, timeout);
        }

        $('.alert', $(this.el)).effect("bounce", { times:3 }, 500);
    },hideAlert: function() {
        $('.alert', $(this.el)).hide();
    },processResponseError: function (data) {
    	if(data && data.status){
    		errormessage = '';
    		if(data.responseText){
    			try{
    				var jsonResponse = JSON.parse(data.responseText);
        			if(jsonResponse.exception && jsonResponse.exception && typeof jsonResponse.exception == 'string'){
        				errormessage = jsonResponse.exception;
        			}else{
        				var messages = {};
        				if(typeof jsonResponse.exception.length == 'undefined'){
        					var message =jsonResponse.exception;
        					for(key in message){
        						errormessage += '*' + key + ' -' + message[key];
        						messages[key] = {isValid:false, message:message[key]};
        					}
        				} else{
        					for(i in jsonResponse.exception){
	        					var message =jsonResponse.exception[i];
	        					for(key in message){
	        						errormessage += '*' + key + ' -' + message[key];
	        						messages[key] = {isValid:false, message:message[key]};
	        					}
	        				}
        				}
        				this.displayValidationErrors(messages);
        			}
    			} catch(error){
    			}
    		}
    		this.showAlert('Error - '+ data.status, 'An error occurred while trying to save/update this item<br/>'+ errormessage, 'alert-error');

        	this.onError(messages);
    	} else	
    		this.showAlert('Error', 'An error occurred while trying to save/update this item', 'alert-error');
    },
    convertJSONtoHTML : function(item, display){
    	var self = this;
    	var $display = '';
    	if(display == 'table'){
    		$display = $('<table></table>');
    		for(key in item){
    			if(typeof item[key] == "object"){
    				$display.append(self.convertJSONtoHTML(item[key], 'table'));
    			}else
    				$display.append('<tr><td>' + key + ' == ' + item[key] + '</td></tr>');
    		}
    	}else{
    		var $display = $('<ul></ul>');
        	for(key in item){
    			if(typeof item[key] == "object"){
    				$display.append(self.convertJSONtoHTML(item[key], 'table'));
    			}else
    				$display.append('<li>' + key + ' == ' + item[key] + '</li>');
    		}
        	
    	}
    	return $display;
    },
    convertJSONtoTable : function(items, display){
    	var self = this;
    	var $display = $('<table class="table table-striped table-condensed"><thead><tr></tr></thead><tbody></tbody></table>');
    	var ths = [];
    	if(typeof items.length != 'undefined'){
    		$('thead tr', $display).append('<th>#</th>');
	    	for(var key in items[0]){
	    		ths.push(key);
	    		$('thead tr', $display).append('<th>' + utils.capitaliseFirstLetter(key) + '</th>');
	    	}
    	}
    	for(var itemIndex in items){
    		var item  = items[itemIndex];
    		var $tr = $('<tr></tr>');

    		$tr.append('<td>'+(Number(itemIndex)+1)+'</td>');
	    	for(var thindex in ths){
	    		var th = ths[thindex];
	    		$tr.append('<td>' + item[th] + '</td>');
	    	}
	    	$('tbody', $display).append($tr);
    	}
    	
    	return $display;
    },
    uploadFile:function(url, file, callback){
    	utils.uploadFile(url, file, callback);
    },loadTemplate : function(templateName, fileName, callback){
    	/**
         * Used to load  the template using TemplateManager
         * then only create the view/render method
         */
    	if(typeof templateName == 'function'){
    		var tmplname = this.templateName||this.modelName;
    		var modelName = this.modelName||this.templateName;
    		
    		callback = templateName;
            
//    		fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
//            templateName = utils.capitaliseFirstLetter(modelName);
            if(this.capitalizeTemplate){
    			fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
    			templateName = utils.capitaliseFirstLetter(modelName);
            } else{
    			fileName = this.templatedir + tmplname + '.html';
    			templateName = modelName;
    		}
            
        }else if(typeof fileName == 'function'){
            callback = fileName;
            fileName = this.templatedir + templateName + '.html';
        }else if(fileName == '')
            fileName = 'templates/'+ fileName+ '.html';

        templateLoader.loadRemoteTemplate(templateName, fileName, callback);
    }, templatedir : 'templates/',updateurl:true, capitalizeTemplate:true
});

window.DefaultPageView = Backbone.View.extend({

    initialize: function (options) {
    	if(options && options.template){
        	this.template = options.template;
        }
    	if(options && options.modalView)
    		this.modalView = options.modalView;
    	if(options && options.modelName){
        	this.modelName = options.modelName;
        }
    	if(options && options.displayName)
    		this.displayName = options.displayName;
    	if(options && options.title)
    		this.title = options.title;
    	if(options && options.templateName)
    		this.title = options.templateName;
    },

    render: function () {
        var self = this;
        
        if(!this.modalView){
        	if(this.model) {
            	$(this.el).html(this.template(this.model.toJSON()));
            } else
        		$(this.el).html(this.template());
        } else{
			$(this.el).html(new ModalView({title: this.modelName}).modal());

			$('.modal .modal-body', $(this.el)).html(this.template(this.model.toJSON()));
		}
        
        
        $('form', $(this.el)).submit(function(event){
			$(':password', $(self.el)).each(function(){
				var value = $(this).val();
				var encvalue = Base64.encode(value);
				$(this).val(encvalue);
			});
		});
        return this;
    },loadTemplate : function(templateName, fileName, callback){
    	/**
         * Used to load  the template using TemplateManager
         * then only create the view/render method
         */
    	if(typeof templateName == 'function'){
    		var tmplname = this.templateName||this.modelName;
    		var modelName = this.modelName||this.templateName;
    		
    		callback = templateName;
//            fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
//            templateName = utils.capitaliseFirstLetter(modelName);
            if(this.capitalizeTemplate){
    			fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
    			templateName = utils.capitaliseFirstLetter(modelName);
            } else{
    			fileName = this.templatedir + tmplname + '.html';
    			templateName = modelName;
    		}
            
        }else if(typeof fileName == 'function'){
            callback = fileName;
            fileName = this.templatedir + templateName + '.html';
        }else if(fileName == '')
            fileName = 'templates/'+ fileName+ '.html';

        templateLoader.loadRemoteTemplate(templateName, fileName, callback);
    }, templatedir : 'templates/', capitalizeTemplate:true
});

window.StaticView = Backbone.View.extend({
	initialize: function (options) {
        if(options && options.template){
        	this.template = options.template;
        }
        if(options && options.config)
    		for(var i in options.config){
    			this.config[i] = options.config[i];
    		}
    },
    config:{
    	accordion:false
    },
    render: function () {
    	var self = this;
    	
        $(self.el).addClass('loading');

        var json =  {};
        if(this.model)
            json = this.model.toJSON();
        if(window.userprofile)
            json.userprofile = window.userprofile.toJSON();
        
    	if(self.config.accordion){
    		var id = $(self.el).attr('id');
    		var iconclass = self.config.accordion_iconclass||window.accordion_iconclass||'icon-white';
         	var elm = '<div class="accordion-group">'
 	        	+'<div class="accordion-heading">'
 		        	+'<a class="accordion-toggle" data-toggle="collapse" href="#'+id+'_accordion" data-original-title="">'
 		        		+'<i class="icon-chevron-down '+iconclass+' pull-right"></i>'
 		        		+'<i class="icon-th '+iconclass+'"></i>'
 		        		+'<span class="divider-vertical"></span>'
 		        		+this.title
	        		+'</a>'
	        	+'</div>'
 		        +'<div id="'+id+'_accordion" class="accordion-body collapse in">'
 		        +'<div class="accordion-inner paddind">'
 		        +'</div>'
 		        +'</div>';
         	
         	$(this.el).html(elm);
         	$('.accordion-inner:first', $(this.el)).html(this.template(json));

         	if(this.model && this.model.models && this.model.models.length == 0)
 				$('.accordion-inner:first', $(this.el)).append('<div class="alert"><strong>Info!</strong> No '+this.title+' found!!!');
         }else{
        	 $(this.el).html(this.template(json));
         	
         	if(this.model && this.model.models && this.model.models.length == 0)
             	$(this.el).append('<div class="alert"><strong>Info!</strong> No '+this.title+' found!!!');
         }
    	
        $('form', $(this.el)).submit(function(event){
			$(':password', $(self.el)).each(function(){
				var value = $(this).val();
				var encvalue = Base64.encode(value);
				if($(this).attr('encrypted') != 'true'){
					$(this).val(encvalue);
					$(this).attr('encrypted', 'true');
				}
			});
		});
        if(self.afterRender)
        	self.afterRender();

        $(self.el).removeClass('loading');

        return this;
    },loadTemplate : function(templateName, fileName, callback){
    	/**
         * Used to load  the template using TemplateManager
         * then only create the view/render method
         */
    	if(typeof templateName == 'function'){
    		var tmplname = this.templateName||this.modelName;
    		var modelName = this.modelName||this.templateName;
    		
    		callback = templateName;
            
//    		fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
//            templateName = utils.capitaliseFirstLetter(modelName);
            if(this.capitalizeTemplate){
    			fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
    			templateName = utils.capitaliseFirstLetter(modelName);
            } else{
    			fileName = this.templatedir + tmplname + '.html';
    			templateName = modelName;
    		}
            
        }else if(typeof fileName == 'function'){
            callback = fileName;
            fileName = this.templatedir + templateName + '.html';
        }else if(fileName == '')
            fileName = 'templates/'+ fileName+ '.html';

        templateLoader.loadRemoteTemplate(templateName, fileName, callback);
    }, templatedir : 'templates/', capitalizeTemplate:true
});

var ModelTableView = Backbone.View.extend({
	urlRoot:'',
    title:'',
    rowClass:ModelTableRowView,
    initialize: function (options) {
       // this.render();
    	this.events = $.extend(true, {}, this.events_, this.events);
    	if(options && options.template)
    		this.template = options.template;
    },
    afterRender : function(){
    	
    },
    render: function (data) {
        var self = this;
        
        var models = this.model.models;
        
        if(data){
        	models = data;
        }
        
        var pageItemCount = this.options.pageItemCount||window.pageItemCount||15;
        var page = this.options.page||1;
        
        var len = models.length;
        var startPos = (page - 1) * (pageItemCount);
        var endPos = Math.min(startPos + (pageItemCount), len);

        $(this.el).html('<div><div><table class="table table-bordered"><thead></tr></thead><tbody class="thumbnails"></tbody></table>');
        /*
        for (var i = startPos; i < endPos; i++) {
            $('.thumbnails', this.el).append(new self.rowClass({model: models[i], urlRoot:this.urlRoot}).render().el);
        }
        */
        if(models.length == 0)
        	$('.thumbnails', this.el).append('<div class="alert"><strong>Info!</strong> Kein '+this.title+' gefunden!!!');
        
        $(this.el).append(new Paginator({model: this.model, page: this.options.page, urlRoot: this.urlRoot, data:data}).render().el);
        
        $(this.el).prepend(new Breadcrumb({model:this.model, title: this.title, data:data}).render().el);

        var $navigation = $('<div class="navbar">'+
        		'<div class="navbar-inner">'+
        		'<div class="container">'+
        			'<a class="btn btn-navbar" data-toggle="collapse" data-target=".nav-collapse">'+
        				'<span class="icon-bar"></span>'+
        			'</a>'+
        	   	   	'<div class="nav-collapse">'+
        				'<form class="navbar-search pull-right" onSubmit="return false;">'+
        				'<input type="text" name="searchinput" class="search-query searchinput" placeholder="Search">'+
        				'</form>'+
        			'</div>'+
        		'</div>'+
        	'</div>'+
        '</div>');
        
        $(this.el).prepend($navigation);
        var $search_sort = $('<ul class="nav nav-pills  pull-right"></ul>');
        //$search_sort.append('<li><input type="text" class="searchinput" name="searchinput"/></li>');
        //$search_sort.append('<li><input type="button" class="searchbutton" value ="Search"/></li>');
        
        //var sortFields = new this.model.model().attributes;
        var sortFields = new this.model.model().sortFields();//attributes;
        
        if(sortFields){
        	//var $elem = $('<select class="sort" name="sortinput"></select>');
        	//$elem.append('<option value="">Select</option>');

        	var $elem = $('<ul class="nav nav-pills"></ul>');
        	$elem.append('<li class="dropdown sortmenu"><a class="dropdown-toggle" data-toggle="dropdown" href="#">Sort<b class="caret"></b></a><ul class="dropdown-menu"></ul></li>');
        	
        	for(var sortField in sortFields){
        		if(sortFields[sortField] != null) {
	        		var displayField = utils.capitaliseFirstLetter(sortField);
        			$('.dropdown-menu', $elem).append('<li><a class="sort" href="#'+sortField+'"><i class="icon-chevron-up"></i>'+displayField+'</a></li>');
        			$('.dropdown-menu', $elem).append('<li><a class="sort" href="#'+sortField+'-ASC"><i class="icon-chevron-down"></i>'+displayField+' - Ascending</a></li>');
        			//$elem.append('<option value="'+ sortField +'">'+ sortField +'</option>');
	        		//$elem.append('<option value="'+ sortField +'-ASC">ASC -'+ sortField +'</option>');
        		}
        	}
        	
        	$search_sort.append($elem);
        }
  
        $search_sort.append('<br/><div class="message"></div>');
        
        $('.nav-collapse', $navigation).append($search_sort);
        this.afterRender();
        return this;
    },
    events_: {
        "change"        : "change",
    	".searchbutton:click"        : "change",
    	".sort:change" : "sort",
    	"click .sort":'sortClick'
    }, sortClick: function(event){
    	event.stopPropagation();
        event.preventDefault();
        
        var target = event.target;
        var href = $(target).attr('href');
        if(href.indexOf("-") != -1)
    		this.sort(href.split("-")[0], true);
    	else
    		this.sort(href);
    	$(target).parent().addClass('active');
    	
		return false;
    }, sort: function(field, asc){
    	if(field)
    		field = field.replace('#', '');
    	this.model.sortVar = field;
    	this.model.sortAsc = asc || false;
        
    	this.model.comparator = function(model1, model2) {

    		var that = this;
    		var str1 = model1.get(that.sortVar);
    		var str2 = model2.get(that.sortVar);
    		
    		if(!str2 || !str2)
    			return 0;
    		else{
    			str1 = String(str1).toLowerCase();
    			str2 = String(str2).toLowerCase();
    			
	    		if(that.sortAsc){
	    			return (str1 > str2) ? 1 : (str1 < str2) ? -1 : 0 ;
				}else
					return (str1 > str2) ? -1 : (str1 < str2) ? 1 : 0 ;
    		}
    	}
    	
    	var new_result = new Array();
    	
    	this.model.sort().each(function(obj){
    		new_result.push(obj);
    	});
    	
    	this.render(new_result);
    }, change:function(event){
    	var target = event.target;
        
        if(target.name == 'searchinput'){
        	this.search(target.value);
        	$('[name='+target.name+']', $(this.el)).val(target.value);
        }else if(target.name == 'sortinput'){
        	if(target.value.indexOf("-") != -1)
        		this.sort(target.value.split("-")[0], true);
        	else
        		this.sort(target.value);
        	$('[name='+target.name+']', $(this.el)).val(target.value);
        }
        
        return false;
    }, search:function(quer){
    	var pattern = new RegExp(quer,"gi");
		
    	var searchresult = this.model.models.filter(function(data) {
    		return pattern.test(data.get("title"));
		});

    	this.options.page =1;
    	this.render(searchresult);

    	return false;
    },loadTemplate : function(templateName, fileName, callback){
    	/**
         * Used to load  the template using TemplateManager
         * then only create the view/render method
         */
    	if(typeof templateName == 'function'){
    		var tmplname = this.templateName||this.modelName;

    		var modelName = this.modelName||this.templateName;
    		
    		callback = templateName;
//            fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
//            templateName = utils.capitaliseFirstLetter(modelName);
            if(this.capitalizeTemplate){
    			fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
    			templateName = utils.capitaliseFirstLetter(modelName);
            } else{
    			fileName = this.templatedir + tmplname + '.html';
    			templateName = modelName;
    		}
            
        }else if(typeof fileName == 'function'){
            callback = fileName;
            fileName = this.templatedir + templateName + '.html';
        }else if(fileName == '')
            fileName = 'templates/'+ fileName+ '.html';

        templateLoader.loadRemoteTemplate(templateName, fileName, callback);
    }, templatedir : 'templates/', capitalizeTemplate:true
});

var ModelTableRowView = Backbone.View.extend({

    tagName: "tr",

    className: "",

    initialize: function (options) {
    	if(options && options.urlRoot)
    		this.urlRoot = options.urlRoot;
        if(options && options.template)
        	this.template = options.template;
    	this.model.bind("change", this.render, this);
        this.model.bind("destroy", this.close, this);
    },
    events: {
		"click .delete" : "remove_"
    },
    remove_: function () {
    	var self = this;
    	if(confirm('are you sure! you want to delete this record')){
    		var title = this.model.id;
    		this.model.destroy({
	            success: function () {
	                alert(title + ' deleted successfully');
	                self.remove();
	                //window.history.back();
	                return false;
	            }
	        });   
    	}
        return false;
    },
    render: function () {
        $(this.el).html('<td>' + this.template(this.model.toJSON()) + '</td>' );
        
        if(this.model.id && $('.buttongroups', this.el)){
        	var $container = $('.buttongroups', this.el);
        	
        	$container.append('<a class="btn edit" href="#'+this.urlRoot+'/'+this.model.id+'"><i class="icon-edit"></i>Edit</a>&nbsp;');
        	$container.append('<a class="btn copy" href="#'+this.urlRoot+'/copy/'+this.model.id+'"><i class="icon-share"></i>Copy</a>&nbsp;');
        	$container.append('<a class="btn delete" href="#"><i class="icon-trash"></i>Delete</a>');
        }	
        return this;
    },loadTemplate : function(templateName, fileName, callback){
    	/**
         * Used to load  the template using TemplateManager
         * then only create the view/render method
         */
    	if(typeof templateName == 'function'){
    		var tmplname = this.templateName||this.modelName;
    		var modelName = this.modelName||this.templateName;
    		
    		callback = templateName;
//            fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
//            templateName = utils.capitaliseFirstLetter(modelName);
            
            if(this.capitalizeTemplate){
    			fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
    			templateName = utils.capitaliseFirstLetter(modelName);
            } else{
    			fileName = this.templatedir + tmplname + '.html';
    			templateName = modelName;
    		}
        }else if(typeof fileName == 'function'){
            callback = fileName;
            fileName = this.templatedir + templateName + '.html';
        }else if(fileName == '')
            fileName = 'templates/'+ fileName+ '.html';

        templateLoader.loadRemoteTemplate(templateName, fileName, callback);
    }, templatedir : 'templates/', capitalizeTemplate:true

});

var ModelListView = Backbone.View.extend({
	urlRoot:'',
    title:'',
    config:{
    	pagination:false,
    	breadcrum:false,
    	searchfilter:false,
    	accordion:false
    },
    initialize: function (options) {
    	var self = this;
    	this.events = $.extend(true, {}, this.events_, this.events);
    	if(options && options.template)
    		this.template = options.template;
    	
    	if(options && options.config)
    		for(var i in options.config){
    			self.config[i] = options.config[i];
    		}
    },
    afterRender : function(){
    	
    },
    paginationJSON:function(data){
    	var self = this;

        var models = this.model ? this.model.models : [];
        if(data && typeof data =='object'){
        	models = data;
        }
        
    	var pageItemCount = this.options.pageItemCount||window.pageItemCount||15;
        var page = this.options.page||1;
        
        var len = models.length;
        var startPos = (page - 1) * (pageItemCount);
        var endPos = Math.min(startPos + (pageItemCount), len);
        
        var json = {};
        json['results'] = this.model ? this.model.toJSON() : [];;
        
        json.page = page;
        json.startPos = startPos;
        json.endPos = endPos;
        json.pageItemCount = pageItemCount;
        json.noOfPages = self.model.noOfPages(pageItemCount);
        
        return json;
    },
    render: function (data) {
        var self = this;
        
        $(self.el).addClass('loading');
        var models = this.model ? this.model.models : [];
        if(data && typeof data =='object'){
        	models = data;
        }
        /*
        var pageItemCount = this.options.pageItemCount||window.pageItemCount||15;
        var page = this.options.page||1;
        
        var len = models.length;
        var startPos = (page - 1) * (pageItemCount);
        var endPos = Math.min(startPos + (pageItemCount), len);
        
        var json = {};
        json['results'] = this.model ? this.model.toJSON() : [];;
        
        json.startPos = startPos;
        json.endPos = endPos;
        json.pageItemCount = pageItemCount;
        */
        var json = self.paginationJSON();;
        
        if(self.config.accordion){
        	var iconclass = self.config.accordion_iconclass||window.accordion_iconclass||'icon-white';
        	var id = $(self.el).attr('id') || Math.ceil(Math.random()*100);
        	var elm = '<div class="accordion-group">'
	        	+'<div class="accordion-heading">'
		        	+'<a class="accordion-toggle" data-toggle="collapse" href="#'+id+'_accordion" data-original-title="">'
		        		+'<i class="icon-chevron-down '+iconclass+' pull-right"></i>'
		        		+'<i class="icon-th '+iconclass+'"></i>'
		        		+'<span class="divider-vertical"></span>'  
		        		+this.title
	        		+'</a>'
	        	+'</div>'
		        +'<div id="'+id+'_accordion" class="accordion-body collapse in">'
		        +'<div class="accordion-inner paddind">'
		        +'</div>'
		        +'</div>';
        	
        	$(this.el).html(elm);
        	$('.accordion-inner:first', $(this.el)).html(this.template(json));

			if(models.length == 0)
				$('.accordion-inner:first', $(this.el)).append('<div class="alert"><strong>Info!</strong> No '+this.title+' found!!!');
        }else{
        	$(this.el).html(this.template(json));
        	
        	if(models.length == 0)
            	$(this.el).append('<div class="alert"><strong>Info!</strong> No '+this.title+' found!!!');
        }
        
        if(self.config.pagination)
        	$(this.el).append(new Paginator({model: this.model, page: this.options.page, urlRoot: this.urlRoot, data:data}).render().el);
        
        if(self.config.breadcrum)
        	$(this.el).prepend(new Breadcrumb({model:this.model, title: this.title, data:data}).render().el);

        if(self.config.searchfilter){
	        var $navigation = $('<div class="navbar">'+
	        		'<div class="navbar-inner">'+
	        		'<div class="container">'+
	        			'<a class="btn btn-navbar" data-toggle="collapse" data-target=".nav-collapse">'+
	        				'<span class="icon-bar"></span>'+
	        			'</a>'+
	        	   	   	'<div class="nav-collapse">'+
	        				'<form class="navbar-search pull-right" onSubmit="return false;">'+
	        				'<input type="text" name="searchinput" class="search-query searchinput" placeholder="Search">'+
	        				'</form>'+
	        			'</div>'+
	        		'</div>'+
	        	'</div>'+
	        '</div>');
        
	        $(this.el).prepend($navigation);
	        
	        var $search_sort = $('<ul class="nav nav-pills  pull-right"></ul>');
	        //$search_sort.append('<li><input type="text" class="searchinput" name="searchinput"/></li>');
	        //$search_sort.append('<li><input type="button" class="searchbutton" value ="Search"/></li>');
	        
	        //var sortFields = new this.model.model().attributes;
	        var sortFields = new this.model.model().sortFields();//attributes;
	        
	        if(sortFields){
	        	//var $elem = $('<select class="sort" name="sortinput"></select>');
	        	//$elem.append('<option value="">Select</option>');
	
	        	var $elem = $('<ul class="nav nav-pills"></ul>');
	        	$elem.append('<li class="dropdown sortmenu"><a class="dropdown-toggle" data-toggle="dropdown" href="#">Sort<b class="caret"></b></a><ul class="dropdown-menu"></ul></li>');
	        	
	        	for(var sortField in sortFields){
	        		if(sortFields[sortField] != null) {
		        		var displayField = utils.capitaliseFirstLetter(sortField);
	        			$('.dropdown-menu', $elem).append('<li><a class="sort" href="#'+sortField+'"><i class="icon-chevron-up"></i>'+displayField+'</a></li>');
	        			$('.dropdown-menu', $elem).append('<li><a class="sort" href="#'+sortField+'-ASC"><i class="icon-chevron-down"></i>'+displayField+' - Ascending</a></li>');
	        			//$elem.append('<option value="'+ sortField +'">'+ sortField +'</option>');
		        		//$elem.append('<option value="'+ sortField +'-ASC">ASC -'+ sortField +'</option>');
	        		}
	        	}
	        	
	        	$search_sort.append($elem);
	        }
	  
	        $search_sort.append('<br/><div class="message"></div>');
	        
	        $('.nav-collapse', $navigation).append($search_sort);
        }
        this.afterRender();
        
        $(self.el).removeClass('loading');
        
        return this;
    },
    events_: {
        "change"        : "change",
    	".searchbutton:click"        : "change",
    	".sort:change" : "sort",
    	"click .sort":'sortClick'
    }, sortClick: function(event){
    	event.stopPropagation();
        event.preventDefault();
        
        var target = event.target;
        var href = $(target).attr('href');
        if(href.indexOf("-") != -1)
    		this.sort(href.split("-")[0], true);
    	else
    		this.sort(href);
    	$(target).parent().addClass('active');
    	
		return false;
    }, sort: function(field, asc){
    	if(field)
    		field = field.replace('#', '');
    	this.model.sortVar = field;
    	this.model.sortAsc = asc || false;
        
    	this.model.comparator = function(model1, model2) {

    		var that = this;
    		var str1 = model1.get(that.sortVar);
    		var str2 = model2.get(that.sortVar);
    		
    		if(!str2 || !str2)
    			return 0;
    		else{
    			str1 = String(str1).toLowerCase();
    			str2 = String(str2).toLowerCase();
    			
	    		if(that.sortAsc){
	    			return (str1 > str2) ? 1 : (str1 < str2) ? -1 : 0 ;
				}else
					return (str1 > str2) ? -1 : (str1 < str2) ? 1 : 0 ;
    		}
    	}
    	
    	var new_result = new Array();
    	
    	this.model.sort().each(function(obj){
    		new_result.push(obj);
    	});
    	
    	this.render(new_result);
    }, change:function(event){
    	var target = event.target;
        
        if(target.name == 'searchinput'){
        	this.search(target.value);
        	$('[name='+target.name+']', $(this.el)).val(target.value);
        }else if(target.name == 'sortinput'){
        	if(target.value.indexOf("-") != -1)
        		this.sort(target.value.split("-")[0], true);
        	else
        		this.sort(target.value);
        	$('[name='+target.name+']', $(this.el)).val(target.value);
        }
        
        return false;
    }, search:function(quer){
    	var pattern = new RegExp(quer,"gi");
		
    	var searchresult = this.model.models.filter(function(data) {
    		return pattern.test(data.get("title"));
		});

    	this.options.page =1;
    	this.render(searchresult);

    	return false;
    },loadTemplate : function(templateName, fileName, callback){
        /**
         * Used to load  the template using TemplateLoader
         * then only create the view/render method
         */
        if(typeof templateName == 'function'){
        	var tmplname = this.templateName||this.modelName;
        	var modelName = this.modelName||this.templateName;
        	
            callback = templateName;
//            fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
//            templateName = utils.capitaliseFirstLetter(modelName);
            if(this.capitalizeTemplate){
    			fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
    			templateName = utils.capitaliseFirstLetter(modelName);
            } else{
    			fileName = this.templatedir + tmplname + '.html';
    			templateName = modelName;
    		}
        }else if(typeof fileName == 'function'){
            callback = fileName;
            fileName = this.templatedir + templateName + '.html';
        }else if(!fileName == '')
            fileName = 'templates/'+ fileName+ '.html';

        templateLoader.loadRemoteTemplate(templateName, fileName, callback);
    }, templatedir : 'templates/', capitalizeTemplate:true
});
window.DashboardView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    render: function () {
        $(this.el).html(this.template());
        return this;
    }
});

window.DashboardAppDataView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    render: function () {
        $(this.el).html(this.template());
        return this;
    }

});
window.HeaderView = Backbone.View.extend({

    initialize: function () {
        //this.render();
    },

    render: function () {
        if(this.model)
            $(this.el).html(this.template(this.model.toJSON()));
        else
            $(this.el).html(this.template());

        if(this.afterRender)
            this.afterRender();

        $('.dropdown-toggle', $(this.el)).dropdown();

        return this;
    },

    selectMenuItem: function (menuItem) {
        $('.nav li').removeClass('active');
        if (menuItem) {
            $('.' + menuItem).addClass('active');
        }
    },loadTemplate : function(templateName, fileName, callback){
        /**
         * Used to load  the template using TemplateManager
         * then only create the view/render method
         */
        if(typeof templateName == 'function'){
            callback = templateName;
            
            var tmplname = this.templateName||this.modelName;
    		var modelName = this.modelName||this.templateName;
    		
//    		callback = templateName;
    		
//            fileName = this.templatedir + utils.capitaliseFirstLetter(this.modelName) + '.html';
//            templateName = utils.capitaliseFirstLetter(this.modelName);
            
            if(this.capitalizeTemplate){
    			fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
    			templateName = utils.capitaliseFirstLetter(modelName);
            } else{
    			fileName = this.templatedir + tmplname + '.html';
    			templateName = modelName;
    		}
            
        }else if(typeof fileName == 'function'){
            callback = fileName;
            fileName = this.templatedir + templateName + '.html';
        }else if(fileName == '')
            fileName = 'templates/'+ fileName+ '.html';

        templateLoader.loadRemoteTemplate(templateName, fileName, callback);
    }, templatedir : 'templates/',modelName:'HeaderView', capitalizeTemplate:true

});
window.LanguageListView = ModelListView.extend({
    urlRoot:'language',
    title:'Language'
});

window.LanguageView = ModelView.extend({
	modelName:'Language',
    urlRoot:'language',
    events: {
    	'click #add-lang-translation'			: 'addTranslation'
    },
    afterInitialize: function(){
    	var languageTranslationCollection = new LanguageTranslationCollection();
    	this.languageTranslationListView = new window.LanguageTranslationListView({model:languageTranslationCollection});
	},
    afterRender:function(){
    	var self = this;
    	this.languageTranslationListView.render();
		
		$('.language-translation-block', $(self.el)).html(self.languageTranslationListView.el);
		
		var translations = {};
		
    	if(this.model.get('translations')){
    		var translations_ = this.model.get('translations');
    		for(var i = 0; i < translations_.length; i++){
    			var translation = translations_[i];
    			translations[translation.language] = translation;
    		}
    	}
		for(var i = 0; i < window.LANG_KEYS.length; i++){
			var language = window.LANG_KEYS[i];
			var translation = translations[language]||{language:language, value:''};
			
			var languageTranslation = new LanguageTranslation();
			var index = this.languageTranslationListView.model.models.length;
			translation['index'] = index;
			
			languageTranslation.set(translation);
			
			this.languageTranslationListView.addTranslation(languageTranslation);
        	this.model.set({languageTranslationCollection:this.languageTranslationListView.model});
		}
    },
    addTranslation: function(e) {
    	var self = this;
    	
    	var languageTranslation = new LanguageTranslation();
    	
		this.languageTranslationListView.addTranslation(languageTranslation);
    }
});

/**
 * List View for Language Translation Collection used inside Language View
 * 
 * template - No template
 */
window.LanguageTranslationListView = Backbone.View.extend({
	render:function(){
		var models = this.model.models;
		$(this.el).html('');
		for(var i = 0; i< models.length; i++){
			var languageTranslationview = new window.LanguageTranslationView({model:models[i], parentmodel:this.model});
			
			languageTranslationview.render();
			
			$(this.el).append(languageTranslationview.el)
		}
	},
	addTranslation: function(languageTranslation) {
    	var self = this;
    	this.model.add(languageTranslation);
    	var languageTranslationView = new window.LanguageTranslationView({model:languageTranslation, parentmodel:this.model});
    	
    	var index = this.model.models.length;
    	languageTranslation.set({index:index});
		
    	languageTranslationView.render();
    	$(this.el).append(languageTranslationView.el);
    }
});

/**
 * View for Language Translation 
 * 
 * events - remove 
 * template - AnswerView.html
 */
window.LanguageTranslationView = Backbone.View.extend({
	render:function(){
		$(this.el).html(this.template(this.model.toJSON()));
	},
	events:{
		'change' 		: 'change',
		'click .clear' : 'clear_'
	},
	clear_: function () {
    	var self = this;
    	
    	if(this.options && this.options.parentmodel)
    		this.options.parentmodel.reset();
    	
	    this.remove();
        return false;
    },
    change:function(){
    	var $field = $(event.target);
    	var field = $field.attr('name');
    	if(_.has(this.model.attributes, field)){
	    	var values = {};
	    	values[field] = $field.val();
	    	this.model.set(values);
    	}
    }
});
window.Paginator = Backbone.View.extend({

    className: "pagination pagination-centered",

    initialize:function () {
    	this.model.bind("reset", this.render, this);        
        this.render();
    },

    render:function () {
    	
    	var items = this.model.models;
    	if(this.options.data)
    		items = this.options.data;
       
        var totalItems = items.length;
        var pagesCount = Math.ceil(totalItems / (window.pageItemCount||15));
        var pageCount = (window.pageCount||14)
        var delta = Math.floor((window.pageCount||14)/2);
        var currentpage = this.options.page;
        
        startIndex = 0; 
        endIndex = pageCount;
        
        startIndex = (currentpage - delta) > 0 ? (currentpage - delta) : 1; 
        endIndex = (currentpage + delta) <= pageCount ? pageCount : (currentpage + delta);
        
        endIndex = endIndex <= pagesCount ? endIndex : pagesCount;

        if(startIndex > pageCount && currentpage >= pagesCount - delta)
        	startIndex = (endIndex - pageCount); 
        	
        $(this.el).html('');
        var $ul = $('<ul/>');
        
        if(startIndex > 1)
    		$ul.append("<li><a href='#"+ this.options.urlRoot +"/page/"+(startIndex-1)+"'>&larr; Previous</a></li>");
    	
        for (var i = startIndex; i <= endIndex; i++) {
        	$ul.append("<li" + (i == currentpage ? " class='active'" : "") + "><a href='#"+ this.options.urlRoot +"/page/"+i+"'>" + i + "</a></li>");
        }
        
        if(endIndex > pageCount && endIndex < pagesCount)
    		$ul.append("<li><a href='#"+ this.options.urlRoot +"/page/"+(endIndex+1)+"'>Next &rarr;</a></li>");
    	
        $(this.el).append($ul); 
        
        return this;
    }
});
window.SelectView = Backbone.View.extend({
	tagName: "div",
	initialize:function () {
		
		this.model.bind("reset", this.render, this);
        this.render();
        
        if(!this.options.name)
        	this.options.name = '';
       
        if(!this.options.startNumber)
        	this.options.startNumber = 0;
        
        if(!this.options.endNumber)
        	this.options.endNumber = 0;
        
        if(!this.options.defaultValue)
        	this.options.defaultValue = 0;
    },
    
    render:function () {
    	
    	this.select();
        return this;
    },
    
    select:function(){
    	if(this.options.name && this.options.startNumber && this.options.endNumber) {
    		if($(this.el).is('.controls'))
    			$(this.el).prepend('<select name="'+this.options.name+'" id="'+this.options.name+'" ></select>');
    		else
    			$(this.el).html('<select name="'+this.options.name+'" id="'+this.options.name+'" ></select>');
	    	var startNumber = this.options.startNumber;
	       	var endNumber = this.options.endNumber;
	       	
	       	var defaultValue = this.options.defaultValue;
	       	
	       	$('select', this.el).append('<option value="">Select</option>');
	       	
	       	if(startNumber > 0 && startNumber > 0 &&  startNumber <= endNumber) {
	        	for(; startNumber<=endNumber; startNumber++) {
	        		$('select', this.el).append('<option value="'+startNumber+'" '+(this.options.defaultValue && this.options.defaultValue==startNumber ? 'selected="selected"' : '' )+' >'+startNumber+'</option>');
	        	}
	        }
    	}
    	
    	return $('select', this.el);
    }
});
window.SidebarView = Backbone.View.extend({

    initialize: function () {
        this.render();
        /*var self = this;
        $('.nav li a', this.el).click(function(){
        	var hash = $(this).attr('href').trim();
        	self.selectMenuItem(hash);
        });*/
    },

    render: function () {
    	if(this.model)
    		$(this.el).html(this.template(this.model.toJSON()));
    	else
    		$(this.el).html(this.template());
    	
        var self = this;
        $('.nav li a', this.el).click(function(){
        	var hash = $(this).attr('href').trim();
        	self.selectMenuItem(hash);
        });
        return this;
    },

    selectMenuItem: function (hash) {
    	$('.nav li', this.el).removeClass('active');
    	
        if(hash){
        	if(hash.indexOf('#') == -1)
        		hash = '#' + hash;
        } else
    		hash = window.location.hash;
        
    	$('[href="'+hash+'"]', this.el).parent().addClass('active');
    },loadTemplate : function(templateName, fileName, callback){
        /**
         * Used to load  the template using TemplateManager
         * then only create the view/render method
         */
        if(typeof templateName == 'function'){
            callback = templateName;
            
//            fileName = this.templatedir + utils.capitaliseFirstLetter(this.modelName) + '.html';
//            templateName = utils.capitaliseFirstLetter(this.modelName);
            var tmplname = this.templateName||this.modelName;
    		var modelName = this.modelName||this.templateName;
    		
            if(this.capitalizeTemplate){
    			fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
    			templateName = utils.capitaliseFirstLetter(modelName);
            } else{
    			fileName = this.templatedir + tmplname + '.html';
    			templateName = modelName;
    		}
            
        }else if(typeof fileName == 'function'){
            callback = fileName;
            fileName = this.templatedir + templateName + '.html';
        }else if(!fileName == '')
            fileName = 'templates/'+ fileName+ '.html';

        templateLoader.loadRemoteTemplate(templateName, fileName, callback);
    }, templatedir : 'templates/', capitalizeTemplate:true

});

window.SidebarAppDataView = Backbone.View.extend({

    initialize: function () {
        this.render();
        /*var self = this;
        
        $('.nav li a', this.el).click(function(){
        	var hash = $(this).attr('href').trim();
        	self.selectMenuItem(hash);
        });*/
    },

    render: function () {
        $(this.el).html(this.template());
        var self = this;
        
        $('.nav li a', this.el).click(function(){
        	var hash = $(this).attr('href').trim();
        	self.selectMenuItem(hash);
        });

        //self.selectMenuItem();
        return this;
    },

    selectMenuItem: function (hash) {
    	$('.nav li', this.el).removeClass('active');
    	
        if(hash){
        	if(hash.indexOf('#') == -1)
        		hash = '#' + hash;
        } else
    		hash = window.location.hash;
        
    	$('[href="'+hash+'"]', this.el).parent().addClass('active');
    }

});