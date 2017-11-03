'use strict';

const Debug = require('debug')('multicache');
const Sigmund = require('sigmund');
const Inherits = require('util').inherits;

const iterator = require('./utils').iterator;
const Stores = require('./stores');

function CacheError() {
  Error.captureStackTrace(this, CacheError);
}

Inherits(CacheError, Error);

class Cache {

  constructor(store, opts) {
    store = store || 'memory';
    opts = opts || {};

    if(typeof store == 'string') {
      try {
        store =  new Stores[`${store}`](opts);
      } catch(Ex) {
        console.log(Ex.stack);
        throw new Error(`There is no caching store named ${store}`);
      }
    }

    this.store = store;
    this.anonFnId = 0;

    if(opts && opts.reset) {
      this.resetInterval = opts.reset.interval;
      this.nextResetTime = opts.reset.firstReset || (Date.now() + opts.reset.interval);
    }
  }

  wrap(fn) {
    let self = this;
    let fname = (fn.name || '_' ) + this.anonFnId++;

    Debug('wrapping function ' + fname);

    let cachedfunc = function cachedfunc() {
      let args = Array.prototype.slice.apply(arguments);
      let elements = args.shift();
      let callback = args.pop();

      if(!Array.isArray(elements)) {
        throw new Error(`first argument to ${fname} should be a array`);
      }

      if (typeof callback !== 'function') {
        throw new Error('last argument to ' + fname + ' should be a function');
      }

      if(self.nextResetTime && self.nextResetTime < Date.now()) {
        Debug('resetting cache function ' + fname + ' nextResetTime ' + self.nextResetTime);
        self.store.reset();
        self.nextResetTime += self.resetInterval;
      }

      let running = 0;
      let misses = {};
      let response = {};

      function finalize() {
        args.unshift(Object.keys(misses).map(id => misses[id].elem));

        args.push((err, res) => {
          if(!err) {
            Object.keys(res).forEach((elem) => {
              let key = misses[elem].key;
              let data = {};

              Debug('saving key ' + key);
              data[elem] = res[elem];
              self.store.set(key, data);
            });
          }

          if (err && (err instanceof CacheError)) {
            Debug('skipping from cache, overwriting error');
            err = null;
          }

          Object.assign(response, res);
          callback.call(self, err, response);
        });

        fn.apply(self, args);
      }
      
      let nextElem = iterator(elements);
      let done = false;

      while(!done) {
        let elem = nextElem();
        done = elem === null;

        if(done) {
          if(running <= 0) finalize();
          return;
        }

        running += 1;

        let key = self._keygen(fname, elem, args);

        Debug('fetching from cache ' + key);

        self.store.get(key, (err, data) => {
          running -= 1;

          if(!err && data !== undefined) {
            Debug('cache hit ' + key);
            Object.assign(response, data);
          } else {
            Debug('cache miss ' + key);
            misses[elem] = {
              'elem': elem,
              'key': key
            };
          }

          if(done && running <= 0) {
            finalize();
            return;
          }
        });
      }
    };

    Debug('created new cache function with name ' + fname);

    cachedfunc.cacheName = fname;
    return cachedfunc;
  }

  invalidate() {
    let args = Array.prototype.slice.apply(arguments);
    let func = args.shift();
    let elem = args.shift();

    if (!func || typeof(func) != 'function' || !func.cacheName) {
      throw new Error('Not a valid multicache function');
    }

    let fname = func.cacheName;
    let key = this._keygen(fname, elem, args);

    Debug('invalidating cache for ' + fname + ' with key ' + key);
    this.store.expire(key);
  }

  _keygen(name, elem, args) {
    let input = {
      f: name,
      e: elem,
      a: args
    };
    return Sigmund(input, 8);
  }
}

Cache.Error = CacheError;

exports.default = Cache;

module.exports = exports['default'];

// if(queue) {
//   if(queue[key] == undefined) queue[key] = [];
//   else {
//     Debug('fetch is pending, queuing up for ' + key);
//     queue[key].push(callback);
//     return;
//   }
// }
        
// if(queue && queue[key]) {
//   Debug('fetch completed, processing queue for ' + key);

//   process.nextTick(() => {
//     queue[key].forEach((cb) => {
//       cb.call(self, err, res);
//     });

//     Debug('pending queue cleared for ' + key + 'length: ' + queue[key].length);
//     delete queue[key];
//   });
// }