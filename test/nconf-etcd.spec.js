var
  should      = require('chai').should(),
  nconf       = require('nconf'),
  data        = require('nconf/test/fixtures/data').data,
  merge       = require('nconf/test/fixtures/data').merge;

//
// Require `nconf-etcd` to extend `nconf`
//
var Etcd = require('../lib/nconf-etcd').Etcd;

describe('nconf/stores/etcd', function() {
  describe('When using the nconf etcd store', function() {
    // TODO - make this configurable
    var store = new Etcd('192.168.59.103', '5001');

    describe('the set() method', function() {
      describe('with a literal', function() {
        it('should respond without an error', function(done) {
          store.set('foo:literal', data.literal, done);
        });
      });

      describe('with an Array', function() {
        it('should respond without an error', function(done) {
          store.set('foo:array', data.arr, done);
        });
      });

      describe('with an Object', function() {
        it('should respond without an error', function(done) {
          store.set('foo:object', data.obj, done);
        });
      });

      describe('with null', function() {
        it('should respond without an error', function(done) {
          store.set('falsy:object', null, done);
        });
      });
    });

    describe('the get() method', function() {
      describe('with a literal value', function() {
        it('should respond with the correct value', function(done) {
          store.get('foo:literal', function(err, value) {
            value.should.equal(data.literal);
            done();
          });
        });
      });

      describe('with an Array', function() {
        it('should respond with the correct value', function(done) {
          store.get('foo:array', function(err, value) {
            data.arr.should.deep.equal(value);
            done();
          });
        });
      });

      describe('with an Object', function() {
        it('should respond with the correct value', function(done) {
          store.get('foo:object', function(err, value) {
            data.obj.should.deep.equal(value);
            done();
          });
        });
      });

      describe('with a nested Object value', function() {
        it('should respond with the correct value', function(done) {
          store.get('foo:object:auth', function(err, value) {
            data.obj.auth.should.deep.equal(value);
            done();
          });
        });
      });

      describe('with null', function() {
        it('should respond with the correct value', function(done) {
          store.get('falsy:object', function(err, value) {
            should.equal(null, value);
            done();
          });
        });
      });
    });
  });
});

//vows.describe('nconf/stores/redis').addBatch({
//}).addBatch({
//  "When using the nconf redis store": {
//    topic: new nconf.Redis(),
//    "the get() method": {
//      "with an Array value": {
//        topic: function (store) {
//          store.get('foo:array', this.callback);
//        },
//        "should respond with the correct value": function (err, value) {
//          assert.deepEqual(value, data.arr);
//        }
//      },
//      "with an Object value": {
//        topic: function (store) {
//          store.get('foo:object', this.callback);
//        },
//        "should respond with the correct value": function (err, value) {
//          assert.deepEqual(value, data.obj);
//        }
//      },
//      "with a nested Object value": {
//        topic: function (store) {
//          store.get('foo:object:auth', this.callback);
//        },
//        "should respond with the correct value": function (err, value) {
//          assert.deepEqual(value, data.obj.auth);
//        }
//      },
//      "with null": {
//        topic: function(store) {
//          store.get('falsy:object', this.callback);
//        },
//        "should respond with the correct value": function(err, value) {
//          assert.equal(value, null);
//        }
//      }
//    }
//  }
//}).addBatch({
//  "When using the nconf redis store": {
//    topic: new nconf.Redis(),
//    "the clear() method": {
//      topic: function (store) {
//        var that = this;
//        store.clear('foo', function (err) {
//          if (err) {
//            return that.callback(err);
//          }
//
//          store.get('foo', that.callback);
//        });
//      },
//      "should actually remove the value from Redis": function (err, value) {
//        assert.isNull(err);
//        assert.isNull(value);
//      }
//    }
//  }
//}).addBatch({
//  "When using the nconf redis store": {
//    topic: new nconf.Redis(),
//    "the save() method": {
//      topic: function (store) {
//        var that = this;
//        store.save(data, function (err) {
//          if (err) {
//            return that.callback(err);
//          }
//
//          store.get('obj', that.callback);
//        });
//      },
//      "should set all values correctly": function (err, value) {
//        assert.isNull(err);
//        assert.deepEqual(value, data.obj);
//      }
//    }
//  }
//}).addBatch({
//  "When using the nconf redis store": {
//    topic: new nconf.Redis(),
//    "the load() method": {
//      topic: function (store) {
//        store.load(this.callback);
//      },
//      "should respond with the correct object": function (err, value) {
//        assert.isNull(err);
//        assert.deepEqual(value, data);
//      }
//    }
//  }
//}).addBatch({
//  "when using the nconf redis store": {
//    topic: new nconf.Redis(),
//    "the merge() method": {
//      "when overriding an existing literal value": {
//        topic: function (store) {
//          var that = this;
//          store.set('merge:literal', 'string-value', function () {
//            store.merge('merge:literal', merge, function () {
//              store.get('merge:literal', that.callback);
//            });
//          });
//        },
//        "should merge correctly": function (err, data) {
//          assert.deepEqual(data, merge);
//        }
//      },
//      "when overriding an existing Array value": {
//        topic: function (store) {
//          var that = this;
//          store.set('merge:array', [1, 2, 3, 4], function () {
//            store.merge('merge:array', merge, function () {
//              store.get('merge:array', that.callback);
//            });
//          });
//        },
//        "should merge correctly": function (err, data) {
//          assert.deepEqual(data, merge);
//        }
//      },
//      "when merging into an existing Object value": {
//        topic: function (store) {
//          var that = this, current;
//          current = {
//            prop1: 2,
//            prop2: 'prop2',
//            prop3: {
//              bazz: 'bazz'
//            },
//            prop4: ['foo', 'bar']
//          };
//
//          store.set('merge:object', current, function () {
//            store.merge('merge:object', merge, function () {
//              store.get('merge:object', that.callback);
//            });
//          });
//        },
//        "should merge correctly": function (err, data) {
//          assert.equal(data['prop1'], 1);
//          assert.equal(data['prop2'].length, 3);
//          assert.deepEqual(data['prop3'], {
//            foo: 'bar',
//            bar: 'foo',
//            bazz: 'bazz'
//          });
//          assert.equal(data['prop4'].length, 2);
//        }
//      }
//    }
//  }
//}).addBatch({
//  "When using the nconf redis store": {
//    topic: new nconf.Redis(),
//    "the reset() method": {
//      topic: function (store) {
//        var that = this;
//        this.store = store;
//
//        store.reset(function (err) {
//          if (err) {
//            return that.callback(err);
//          }
//
//          store.get('obj', that.callback);
//        });
//      },
//      "should remove all keys from redis": function (err, value) {
//        assert.isNull(err);
//        assert.isNull(value);
//        assert.length(Object.keys(this.store.cache.store), 0);
//      }
//    }
//  }
//}).export(module);