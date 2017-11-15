'use strict';

const hostname = require('os').hostname();

let Stats = {
  anonId: 0,
  caches: {}
};

Stats.register = function register(cache, name) {
  let self = this;
  name = name || ('anon_' + self.anonId++);

  self.caches[name] = cache;
  return cache;
};

Stats.view = function view(req, res, next) {
  let self = this;
  let data = [];
  let cnames = Object.keys(self.caches);

  cnames.forEach((cname) => {
    let cache = self.caches[cname];

    data.push(cache.stats);
  });

  res.json({
    pid: process.pid,
    uptime: process.uptime(),
    host: hostname,
    data: data 
  });
};

exports.default = Stats;

module.exports = exports['default'];