var
  should      = require('chai').should(),
  nconf       = require('nconf'),
  data        = require('nconf/test/fixtures/data').data,
  merge       = require('nconf/test/fixtures/data').merge;

var SERVER = process.env.ETCD_SERVER;
var PORT = process.env.ETCD_PORT;
if (!SERVER) {
  console.log('No server specified. Using default. Specify a server and port by setting the ' +
    'ETCD_SERVER and ETCD_PORT environment variables');
}

//
// Require `nconf-etcd` to extend `nconf`
//
var Etcd = require('../lib/nconf-etcd').Etcd;

describe('nconf/stores/etcd', function() {
  describe('When using the nconf etcd store', function() {
    var store = new Etcd(SERVER, PORT);

    before(function (done) {
      store.reset(done);
    });

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

      describe('with null', function() {
        it('should respond with the correct value', function(done) {
          store.get('falsy:object', function(err, value) {
            should.equal(null, value);
            done();
          });
        });
      });
    });

    describe('the clear() method', function() {
      it('should actually remove the value from etcd', function(done) {
        store.clear('foo', function(err) {
          should.not.exist(err);
          store.get('foo', function(err, value) {
            should.not.exist(err);
            should.not.exist(value);
            done();
          });
        });
      });
    });

    describe('the merge() method', function() {
      describe('when overriding an existing literal value', function() {
        it('should merge correctly', function(done) {
          store.set('merge:literal', 'string-value', function (err) {
            should.not.exist(err);

            store.merge('merge:literal', merge, function (err) {
              should.not.exist(err);

              store.get('merge:literal', function(err, merged) {
                should.not.exist(err);

                merge.should.deep.equal(merged);
                done();
              });
            });
          });
        });
      });

      describe('when overriding an existing Array value', function() {
        it('should merge correctly', function(done) {
          store.set('merge:array', [1, 2, 3, 4], function (err) {
            should.not.exist(err);

            store.merge('merge:array', merge, function (err) {
              should.not.exist(err);

              store.get('merge:array', function(err, merged) {
                should.not.exist(err);

                merge.should.deep.equal(merged);
                done();
              });
            });
          });
        });
      });

      describe('when merging into an existing Object value', function() {
        it('should merge correctly', function(done) {
          var current = {
            prop1: 2,
            prop2: 'prop2',
            prop3: {
              bazz: 'bazz'
            },
            prop4: ['foo', 'bar']
          };
          store.set('merge:object', current, function (err) {
            should.not.exist(err);

            store.merge('merge:object', merge, function (err) {
              should.not.exist(err);

              store.get('merge:object', function(err, merged) {
                should.not.exist(err);

                merged.prop1.should.equal(1);
                merged.prop2.should.have.lengthOf(3);
                merged.prop3.should.deep.equal({
                  foo: 'bar',
                  bar: 'foo',
                  bazz: 'bazz'
                });
                merged.prop4.should.have.lengthOf(2);
                done();
              });
            });
          });
        });
      });
    });

    describe('the reset() method', function() {
      it('should remove all keys from etcd', function(done) {
        store.reset(function(err) {
          should.not.exist(err);

          store.get('obj', function(err, val) {
            should.not.exist(err);

            should.not.exist(val);
            done();
          });
        })
      });
    });
  });
});

describe('nconf use()', function () {
  it('should not throw error when using etcd', function (done) {
    nconf.use('etcd', {host: SERVER, port: PORT});
    done();
  });

});

describe('cache', function () {
  before(function () {
    nconf.use('etcd', {host: SERVER, port: PORT});
  });

  it('should be able to get the same value directly', function (done) {
    nconf.set('foo', 'barz');
    nconf.get('foo', function(err, value){
      should.not.exist(err);
      value.should.equal('barz');
      done()
    })
  });

  it('should be able to use the sync get', function (done) {
    nconf.set('foo', 'barz2');
    var value = nconf.get('foo');
    value.should.equal('barz2');
    done();
  });

  it('should be able to use without cache enabled', function (done) {
    nconf.use('etcd', {host: SERVER, port: PORT, cache: false });
    var value = nconf.set('foo', 'bache', function(err){
      should.not.exist(err);
      var value = nconf.get('foo', function(err, value){
        should.not.exist(err);
        value.should.equal('bache');
        done();
      });
    });
  });

});

describe('subsets', function () {
  
  before(function () {
    nconf.use('etcd', {host: SERVER, port: PORT});
  });

  it('should save objects', function (done) {
    nconf.set('test', {mongo:{host:'124', port:'333'}}, done);
  });

  it('should overwrite subvalues within set objects', function(){
    nconf.set('test', { mongo: { host:'124', port:'333' }});
    nconf.set('test:mongo:host', 'mongo');
    var host = nconf.get('test:mongo:host');
    host.should.equal('mongo');
    var port = nconf.get('test:mongo:port', function(err, port) {
      port.should.equal('333');
    });
  })
});

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