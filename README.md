nconf-etcd
==========

An etcd store for nconf


## Usage

    var nconf = require('nconf');
    // requiring nconf will register it to nconf
    require('nconf-etcd');
    
    // tell nconf to use etcd and specify hostname and port etc
    // below are the default values..
    nconf.use('etcd', {host: 'localhost', port: '4001', namespace:'nconf'});
    


## Limitations

In the current alpha version, only async get operations are supported. Meaning this is NOT supported yet:

    var host = nconf.get('host');

currently you have to write like this:

    nconf.get('host', function(err, host){
        ...
    })


