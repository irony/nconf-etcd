var
  nconf = require('nconf'),
  Etcd  = require('node-etcd'),
  _     = require('lodash')
  ;

/**
 * Creates a new instance of the nconf etcd store
 * @class
 * @param {string} [host] Hostname of etcd server
 * @param {string} [port] Port of etcd server
 * @param {object} [options] Options passed to the etcd connection. See https://github.com/stianeikeland/node-etcd
 */
var NconfEtcd = exports.Etcd = function(host, port, options) {
  if (typeof host === 'object') {
    options = host;
    host = undefined;
  } else if (typeof port === 'object') {
    options = port;
    port = undefined;
  }

  this.type      = 'etcd';
  this.namespace = (options && options.namespace) || 'nconf';
  this.host      = host;
  this.port      = port;
  this.etcd      = new Etcd(this.host, this.port, options);
};

NconfEtcd.prototype.etcdKey = function(key) {
  return key.replace(/:/g, '/');
};

/**
 * Gets a key from the
 * @param key
 * @param callback
 */
NconfEtcd.prototype.get = function(key, callback) {
  key = nconf.key(this.namespace, key);
  key = this.etcdKey(key);

  this.etcd.get(key, {recursive: true}, function(err, resp) {
    if (err) {
      // Rather than throwin errors, an unknown key will returned undefined
      if (err.errorCode === 100) {
        return callback();
      }
      return callback(err);
    }

    var val = resp.node.value;
    try {
      val = JSON.parse(val);
    } catch (e) {}

    return callback(null, val);
  });
};

NconfEtcd.prototype.set = function(key, value, callback) {
  key = nconf.key(this.namespace, key);
  key = this.etcdKey(key);

  // TODO - This will not work for setting nested objects. I might need to add that

  var val = value;
  if (typeof val === 'object') {
    val = JSON.stringify(val);
  }
  this.etcd.set(key, val, callback);
};

NconfEtcd.prototype.clear = function(key, callback) {
  key = nconf.key(this.namespace, key);
  key = this.etcdKey(key);

  this.etcd.del(key, {recursive: true}, function(err, res) {
    callback(err, res);
  });
};

NconfEtcd.prototype.merge = function(key, value, callback) {
  var self = this;
  function setAndDone(value) {
    return self.set(key, value, callback);
  }

  if (!_.isArray(value) && _.isObject(value)) {
    this.get(key, function(err, origVal) {
      if (err) { return callback(err); }

      if (!_.isArray(origVal) && _.isObject(origVal)) {
        // TODO - This will not work for merging nested objects. I might need to add that
        _.assign(origVal, value);
        value = origVal;
      }

      return setAndDone(value);
    });
  } else {
    return setAndDone(value);
  }
};

NconfEtcd.prototype.reset = function(callback) {
  // delete everything in the namespace
};

//
////
//// ### function set (key, value, callback)
//// #### @key {string} Key to set in this instance
//// #### @value {literal|Object} Value for the specified key
//// #### @callback {function} Continuation to respond to when complete.
//// Sets the `value` for the specified `key` in this instance.
////
//Redis.prototype.set = function (key, value, callback) {
//
//  this._addKeys(key, function (err) {
//    if (err) {
//      return callback(err);
//    }
//
//    var fullKey = nconf.key(self.namespace, key);
//
//    if (!Array.isArray(value) && value !== null && typeof value === 'object') {
//      //
//      // If the value is an `Object` (and not an `Array`) then
//      // nest into the value and set the child keys appropriately.
//      // This is done for efficient lookup when setting Object keys.
//      // (i.e. If you set and Object then wish to later retrieve only a
//      // member of that Object, the entire Object need not be retrieved).
//      //
//      self.cache.set(key, value);
//      self._setObject(fullKey, value, callback);
//    }
//    else {
//      //
//      // If the value is a simple literal (or an `Array`) then JSON
//      // stringify it and put it into Redis.
//      //
//      self.cache.set(key, value);
//      value = JSON.stringify(value);
//      self.redis.set(fullKey, value, callback);
//    }
//  });
//};
//
////
//// ### function merge (key, value, callback)
//// #### @key {string} Key to merge the value into
//// #### @value {literal|Object} Value to merge into the key
//// #### 2callback {function} Continuation to respond to when complete.
//// Merges the properties in `value` into the existing object value
//// at `key`. If the existing value `key` is not an Object, it will be
//// completely overwritten.
////
//Redis.prototype.merge = function (key, value, callback) {
//  //
//  // If the key is not an `Object` or is an `Array`,
//  // then simply set it. Merging is for Objects.
//  //
//  if (typeof value !== 'object' || Array.isArray(value)) {
//    return this.set(key, value, callback);
//  }
//
//  var self    = this,
//    path    = nconf.path(key),
//    fullKey = nconf.key(this.namespace, key);
//
//  // Set the callback if not provided for "fire and forget"
//  callback = callback || function () { };
//
//  //
//  // Get the set of all children keys for the `key` supplied. If the value
//  // to be returned is an Object, this list will not be empty.
//  //
//  this._addKeys(key, function (err) {
//    self.redis.smembers(nconf.key(fullKey, 'keys'), function (err, keys) {
//      function nextMerge (nested, next) {
//        var keyPath = nconf.key.apply(null, path.concat([nested]));
//        self.merge(keyPath, value[nested], next);
//      }
//
//      if (keys && keys.length > 0) {
//        //
//        // If there are existing keys then we must do a recursive merge
//        // of the two Objects.
//        //
//        return async.forEach(Object.keys(value), nextMerge, callback);
//      }
//
//      //
//      // Otherwise, we can simply invoke `set` to override the current
//      // literal or Array value with our new Object value
//      //
//      self.set(key, value, callback);
//    });
//  });
//};
//
////
//// ### function clear (key, callback)
//// #### @key {string} Key to remove from this instance
//// #### @callback {function} Continuation to respond to when complete.
//// Removes the value for the specified `key` from this instance.
////
//Redis.prototype.clear = function (key, callback) {
//  var self    = this,
//    result  = {},
//    path    = [this.namespace].concat(nconf.path(key)),
//    last    = path.pop(),
//    fullKey = nconf.key(this.namespace, key);
//
//  // Set the callback if not provided for "fire and forget"
//  callback = callback || function () { };
//
//  //
//  // Clear the key from the cache for this instance
//  //
//  this.cache.clear(key);
//
//  //
//  // Remove the `key` from the parent set of keys.
//  //
//  this.redis.srem(nconf.key.apply(null, path.concat(['keys'])), last, function (err) {
//    //
//    // Remove the value from redis by iterating over the set of keys (if any)
//    // and deleting each value. If no keys, then just delete the simple literal.
//    //
//    self.redis.smembers(nconf.key(fullKey, 'keys'), function (err, keys) {
//      function removeValue (child, next) {
//        //
//        // Recursively call `self.clear` here to ensure we remove any
//        // nested Objects completely from this instance.
//        //
//        self.clear(nconf.key(key, child), next);
//      }
//
//      if (keys && keys.length > 0) {
//        //
//        // If there are child keys then iterate over them,
//        // removing each child along the way.
//        //
//        async.forEach(keys, removeValue, callback);
//      }
//      else {
//        //
//        // Otherwise if this is just a simple literal, then
//        // simply remove it from Redis directly.
//        //
//        self.redis.del(fullKey, callback);
//      }
//    });
//  });
//};
//
////
//// ### function reset (callback)
//// #### @callback {function} Continuation to respond to when complete.
//// Clears all keys associated with this instance.
////
//Redis.prototype.reset = function (callback) {
//  var self = this;
//
//  // Set the callback if not provided for "fire and forget"
//  callback = callback || function () { };
//
//  //
//  // Get the list of of top-level keys, then clear each of them
//  //
//  this.redis.smembers(nconf.key(this.namespace, 'keys'), function (err, existing) {
//    if (err) {
//      return callback(err);
//    }
//
//    existing = existing || [];
//    async.forEach(existing, function (key, next) {
//      self.clear(key, next);
//    }, callback);
//  });
//};
//
////
//// ### @private function _addKeys (key, callback)
//// #### @key {string} Key to add parent keys for
//// #### @callback {function} Continuation to respond to when complete.
//// Adds the full `key` path to Redis via `sadd`.
////
//Redis.prototype._addKeys = function (key, callback) {
//  var self = this,
//    path = nconf.path(key);
//
//  function addKey (partial, next) {
//    var index  = path.indexOf(partial),
//      base   = [self.namespace].concat(path.slice(0, index)),
//      parent = nconf.key.apply(null, base.concat(['keys']));
//
//    self.redis.sadd(parent, partial, next);
//  };
//
//  //
//  // Iterate over the entire key path and add each key to the
//  // parent key-set if it doesn't exist already.
//  //
//  async.forEach(path, addKey, callback);
//};
//
////
//// ### @private function _setObject (key, value, callback)
//// #### @key {string} Key to set in this instance
//// #### @value {Object} Value for the specified key
//// #### @callback {function} Continuation to respond to when complete.
//// Internal helper function for setting all keys of a nested object.
////
//Redis.prototype._setObject = function (key, value, callback) {
//  var self = this,
//    keys = Object.keys(value);
//
//  function addValue (child, next) {
//    //
//    // Add the child key to the parent key-set, then set the value.
//    // Recursively call `_setObject` in the event of nested Object(s).
//    //
//    self.redis.sadd(nconf.key(key, 'keys'), child, function (err) {
//      if (err) {
//        return next(err);
//      }
//
//      var fullKey = nconf.key(key, child),
//        childValue = value[child];
//
//      if (!Array.isArray(childValue) && typeof childValue === 'object') {
//        self._setObject(fullKey, childValue, next);
//      }
//      else {
//        childValue = JSON.stringify(childValue);
//        self.redis.set(fullKey, childValue, next);
//      }
//    });
//  }
//
//  //
//  // Iterate over the keys of the Object and set the appropriate values.
//  //
//  async.forEach(keys, addValue, function (err) {
//    return err ? callback(err) : callback();
//  });
//};