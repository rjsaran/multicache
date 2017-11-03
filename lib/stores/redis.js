'use strict';

var Redis = require('redis');

class RedisStore {

  constructor(opts) {
    opts = opts || {};

    this.maxAge = opts.maxAge || 60 * 1000;
    this.ttl = this.maxAge / 1000;
    this.db = opts.db || 0;
    this.prefix = (opts.prefix || 'mbc:') + this.db + ':';
    this.twemproxy = !!opts.twemproxy;

    let host = opts.host;
    let port = opts.port;

    let redisOpts = {};

    redisOpts.no_ready_check = this.twemproxy;

    this.redisClient = Redis.createClient(port, host, redisOpts);

    if(!opts.twemproxy) {
      this.redisClient.select(this.db);
    }
  }

  get(key, cb) {
    key = this.prefix + key;

    this.redisClient.get(key, (err, data) => {
      if (err || !data) {
        return cb(err);
      }

      data = data.toString();
      try {
        data = JSON.parse(data); 
      } catch(Ex) {
        return cb(Ex);
      }
      return cb(null, data);
    });
  }

  set(key, val, cb) {
    key = this.prefix + key;
    let obj;
    try {
      obj = JSON.stringify(val);
    } catch(Ex) {
      cb && cb(Ex);
      return;
    }
    this.redisClient.setex(key, this.ttl, obj, (err) => {
      cb && cb(err);
    });
  }

  expire(key, cb) {
    key = this.prefix + key;
    this.redisClient.expire(key, 0, cb || function() {});
  }

  reset() {
    if (this.twemproxy) {
      throw new Error('Reset is not possible in twemproxy compat mode');
    }
    this.redisClient.flushdb();
  }
}

exports.default = RedisStore;

module.exports = exports['default'];