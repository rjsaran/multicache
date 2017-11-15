'use strict';

const Cache = require('./lib/cache');

let cache = Cache.stats.register(new Cache('redis', {maxAge: 10 * 60 * 1000, reset: {interval: 100 * 1000}}), 'mycache');

let opts = {
  'columns': ['id', 'price']
};

let fetchData = function fetchData(ids, opts, cb) {
  let response = {};
  ids.forEach((id) => {
    response[id] = {
      'price': 100 * id,
      'id': id
    };
  });

  let t = Math.floor(Math.random() * 5 + 1);
  console.log('Responding after Time: ', t, ' For ids: ', ids);
  setTimeout(() => {
    cb(null, response);
  }, t * 1000);
};

let fastFetchData = cache.wrap(function fastFetchData(ids, opts, cb) {
  fetchData(ids, opts, (err, data) => {
    if(err) {
      return cb(err);
    }
    cb(err, data);
  });
});

fastFetchData([123, 124, 125], opts,  (err, res) => {
  console.log('First Response ', err, res);
  setTimeout(() => {
    fastFetchData([123, 124, 125, 118, 12], opts, (err, res) => {
      console.log('Second Response ', err, res);
    });
  }, 2 * 1000);
});