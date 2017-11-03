'use strict';

const Cache = require('./lib/cache');

let cache = new Cache('redis', {maxAge: 10 * 60 * 1000, reset: {interval: 10 * 1000}});

let opts = {
  'columns': ['id', 'price']
};

let fetchData = function fetchData(ids, opts, cb) {
  let response = {};
  ids.forEach((id) => {
    response[id] = {
      'price': 1000,
      'id': id
    };
  });

  let t = Math.floor(Math.random() * 10 + 1);
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
    fastFetchData([123, 126, 125], opts, (err, res) => {
      console.log('Second Response ', err, res);
    });
  }, 2 * 1000);
});