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

  if (typeof options !== 'object') options = {};

  this.type      = 'etcd';
  this.logger    = options.logger;
  this.level     = options.loggerLevel || 'debug';
  this.namespace = options.namespace;
  this.host      = host || options.host || 'localhost';
  this.port      = port || options.port || '4001';
  this.sslopts   = options.sslopts;
  this.cache     = (options.cache !== false) && new nconf.Memory();
  this.ttl       = options.ttl  || 60 * 60 * 1000;
  this.etcd      = new Etcd(this.host, this.port, this.sslopts);

  //Make namespace optional but with backwards compatibility behavior.
  if (!this.namespace && this.namespace !== null) {
    this.namespace = 'nconf'
  }
  return this;
};

//
// Define a getter so that `nconf.Etcd` 
// is available and thus backwards compatible.
//
nconf.Etcd = NconfEtcd;

NconfEtcd.prototype.etcdKey = function(key) {
  //Add support for empty key. This gives us all values.
  return key && key.replace(/:/g, '/') || '/';
};

/**
 * Formats a key to full path making sure to considerate both
 * the namespace or the key being null.
 *
 * @param key
 */
NconfEtcd.prototype.fullKey = function(key) {
  if (this.namespace && key) return nconf.key(this.namespace, key);
  if (this.namespace) return this.namespace;
  return key;
}

/**
 * Gets a key from the
 * @param key
 * @param callback
 */
NconfEtcd.prototype.get = function(key, callback) {
  var now     = Date.now(),
      self    = this,
      fullkey = this.fullKey(key),
      mtime   = this.cache && this.cache.mtimes[fullkey];

  key = this.etcdKey(fullkey);

  // Set the callback if not provided for "fire and forget"
  callback = callback || function (err, value) { return value; };

  // If the key exists in the cache and the ttl is less than 
  // the value set for this instance, return from the cache.
  //
  if (mtime && now - mtime < this.ttl) {
    if (this.logger) this.logger[this.level]('[nconf-etcd] GET: %s from cache', fullkey);
    return callback(null, this.cache.get(fullkey));
  }

  if (this.logger) this.logger[this.level]('[nconf-etcd] GET: %s', fullkey);
  this.etcd.get(key, {recursive: true}, function(err, resp) {
    if (err) {
      // Rather than throwin errors, an unknown key will returned undefined
      if (err.errorCode === 100) {
        if (self.cache) self.cache.set(fullkey, null);
        return callback();
      }
      if (self.logger) self.logger.warn(err, '[nconf-etcd] GET ERROR: %s', fullkey);
      return callback(err);
    }

    var val = resp.node.value;
    try {
      val = JSON.parse(val);
    } catch (e) {}

    if (self.cache) self.cache.set(fullkey, val);

    return callback(null, val);
  });
};

NconfEtcd.prototype.set = function(key, value, callback) {
  var fullkey = this.fullKey(key)

  key = this.etcdKey(fullkey);

  // TODO - This will not work for setting nested objects. I might need to add that
  // In the nconf-redis module it stores each js key as a path separator. This does not
  if (this.cache) this.cache.set(fullkey, value);
  if (this.logger) this.logger[this.level]('[nconf-etcd] SET: %s', fullkey);

  if (typeof value === 'object') {
    value = JSON.stringify(value);
  }
  this.etcd.set(key, value, callback);
};

NconfEtcd.prototype.clear = function(key, callback) {
  var self = this,
      fullkey = this.fullKey(key);

  //If etcd happens to share instance with other services
  //we don't want to accidentally delete and/or remove
  //everything if namespace and key was accidentally forgotten.
  if (!fullkey) {
    return callback(new Error('Clearing etcd without a namespace and key can have destructive effect.'));
  }

  key = this.etcdKey(fullkey);

  if (this.logger) this.logger[this.level]('[nconf-etcd] CLEAR: %s', fullkey);
  this.etcd.del(key, {recursive: true}, function(err, res) {
    if (!err && self.cache) self.cache.clear();
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
        _.merge(origVal, value);
        value = origVal;
      }

      return setAndDone(value);
    });
  } else {
    return setAndDone(value);
  }
};

NconfEtcd.prototype.reset = function(callback) {
  //If etcd happens to share instance with other services
  //we don't want to accidentally delete and/or remove
  //everything if namespace was accidentally forgotten.
  if (!this.namespace) {
    if (this.logger) this.logger.warn('[nconf-etcd] CLEAR ERROR: Will not clear etcd when namespace is empty');
    return callback(new Error('Clearing etcd without a namespace can have destructive effect.'));
  }

  if (this.logger) this.logger[this.level]('[nconf-etcd] RESET');

  var self = this;
  this.etcd.del(this.namespace + '/', {recursive: true}, function(err){
    if (self.cache) self.cache.reset();
    // when no keys are found, just ignore the error
    if (!err || err.errorCode === 100) return callback();
    return callback(err);
  });
};



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