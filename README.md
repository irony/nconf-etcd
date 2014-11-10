nconf-etcd
==========

An etcd store for nconf

## Installation

    npm install nconf-etcd

## Usage

    var nconf = require('nconf');
    // requiring nconf will register it to nconf
    require('nconf-etcd');
    
    // tell nconf to use etcd and specify hostname and port etc
    // below are the default values..
    nconf.use('etcd', {host: 'localhost', port: '4001', namespace:'nconf'});
    


## Cache

When using nconf, beware that the built-in api enforces a usage of cache to enable the syncronous nconf.get('key') behaviour. If you want to turn off cache to be sure to always get the actual etcd value - set options.cache = false and always use the asynchronous nconf.get('key', function(err, value){..}) instead.
    
    nconf.use('etcd', {host: 'localhost', port: '4001', cache: false});

## Limitations

In the current alpha version, only async get operations are supported. Meaning this is NOT supported yet:

    var host = nconf.get('host');

currently you have to write like this:

    nconf.get('host', function(err, host){
        ...
    })

## Maintainer

Original implementation by [@meetearnest](https://github.com/meetearnest) - forked and released on NPM by [@irony](https://github.com/irony).


## License

MIT
