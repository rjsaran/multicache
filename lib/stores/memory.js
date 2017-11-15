'use strict';

const LRU = require('lru-cache');

class MemoryStore {

  constructor(opts) {
    opts = opts || {};

    let lruOpts = {};

    lruOpts.max = opts.max;
    lruOpts.maxAge = opts.maxAge;

    this.lru = LRU(lruOpts);
  }

  get(key, cb) {
    let data = this.lru.get(key);
    cb && cb(null, data);
  }

  mget(keys, cb) {
    let self = this;
    let data = keys.map(key => {
      return self.lru.get(key);
    });

    cb && cb(null, data);
  }

  set(key, val, cb) {
    this.lru.set(key, val);
    cb && cb(null, val);
  }

  mset(keys, vals, cb) {
    let self = this;
    keys.forEach((key, index) => {
      self.lru.set(key, vals[index]);
    });
    cb && cb(null, vals);
  }

  expire(key, cb) {
    this.lru.del(key);
    cb && cb(null);
  }

  reset() {
    this.lru.reset();
  }

  keycount() {
    return this.lru.itemCount;
  }
}

exports.default = MemoryStore;

module.exports = exports['default'];