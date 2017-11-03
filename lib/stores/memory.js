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

  set(key, val, cb) {
    this.lru.set(key, val);
    cb && cb(null, val);
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