'use strict';

const Debug = require('debug')('multicache');
const Sigmund = require('sigmund');
const Inherits = require('util').inherits;

const iterator = require('./utils').iterator;
const Stores = require('./stores');
const Stats = require('./stats');

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

    this.stats = {
      hit: 0,
      miss: 0,
      total_tranx: 0,
      full_hit: 0,
      full_miss: 0,
      reset: 0,
      nextResetTime: this.nextResetTime || 0
    };
  }

  wrap(fn) {
    let self = this;
    let fname = (fn.name || '_' ) + this.anonFnId++;
    let stats = this.stats;

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
        stats.reset++;
        stats.nextResetTime = self.nextResetTime += self.resetInterval;
      }

      let missed = [];
      let response = {};
      let elemKeysMap = {};
      let keysElemMap = {};

      function finalize() {
        stats.total_tranx++;

        if(missed.length == 0) {
          Debug('Cache full hit ', fname);
          process.nextTick(() => {
            callback.call(self, null, response); // found in cache
          });
          stats.full_hit++;
          return;
        }

        if(elements.length === missed.length) {
          Debug('Cache full miss ', fname);
          stats.full_miss++;
        }

        args.unshift(missed);

        args.push((err, res) => {
          if(!err) {
            let keys = [];
            let vals = [];

            Object.keys(res).forEach(elem => {
              let key = keysElemMap[elem];
              Debug('saving key ' + key);

              vals.push(res[elem]);
              keys.push(key);
            });

            self.store.mset(keys, vals);
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
      
      // generate cache keys from ids given
      elements.forEach(elem => {
        let key = self._keygen(fname, elem, args);
        elemKeysMap[key] = elem;
        keysElemMap[elem] = key;
      });

      let keys = Object.keys(elemKeysMap);

      Debug('fetching from cache ' + keys);

      self.store.mget(keys, (err, res) => {
        if(!err && res !== undefined) {
          keys.forEach((key, i) => {
            let elem = elemKeysMap[key];
            let data = res[i];

            if(data !== null && data !== undefined) {
              Debug('cache hit '+ key);
              stats.hit++;

              response[elem] = data;
            } else {
              Debug('cache miss ' + key);
              stats.miss++;

              missed.push(elemKeysMap[key]);
            }
          });
          return finalize();
        }

        finalize();
      });
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
Cache.stats = Stats;

exports.default = Cache;

module.exports = exports['default'];