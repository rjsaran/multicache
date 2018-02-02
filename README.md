MultiCache
=======

MultiCache is an Multiple Object caching module for node.js. Objects are cached via a backing store.

(Inspired by [obcache](https://github.com/qzaidi/obcache))

Currently 2 stores are supported.

 - Memory
 - Redis
 
 Multicache First check for each item in cache parallely, Than do only one singlr call to fetch data from underlying datastore for which no data is present in cache. Respond with data from both Cache and Main data store merged.


 Usage
 -----
 
 ```
 const Cache = require('./lib/cache');
 
 // Create a Redis cache
 const cache = new Cache('redis', {port: 6379, host: '127.0.0.1'});
 ```
 
 To cache response of a function:
 1) Wrap original function like below
 ```
 var wrapper = cache.wrap(original);
 ```
 2) Now call the wrapped function
 ```
 wrapper(arg1,arg2...argn,function(err,res) {
   if (!err) {
      // do something with res
   }
 });
 ```
 
 API
---

 ### cache.wrap 
 Wraps a given function and returns a cached version of it.
 Functions to be wrapped must have a callback function as the last argument. The callback function is expected to recieve 2 arguments - err and data. data gets stored in the cache.

 The first n-1 arguments are used to create the key. Subsequently, when the wrapped function is called with the same n arguments, it would lookup the key in cache, and if found, call the callback with the associated data.
 
Notes: 
In case of memory store, It is expected that the callback will never modified the returned data, as any modifications of the original will change the object in cache.

Lets Say input ids are : [123, 143];

Response of orignal function should always be:
```
{
  123: {},
  143: {}
}
```

Memory Store:

| Key           | Type          | Description            |
|:-------------:|:-------------:| :---------------------:|
| max           | Integer       | Maximum no of keys in LRU store|
| maxAge        | Integer       | TTL in miliseconds     |

Redis Store:

| Key           | Type          | Description            | Default |
|:-------------:|:-------------:| :---------------------:|:--------:|
| maxAge        | Integer       | TTL in miliseconds             | 60 Seconds|
| db            | Integer       | Redis Server DB                | 0         |
| prefix        | String        | Prefix to be used for redis key| mbc:      |
| twemproxy     | Boolean       | Redis server is behind twemproxy or not| false |
| host          | String        | Redis Host                     | 127.0.0.1 |
| port          | Integer       | Redis Port                     | 6379 |
