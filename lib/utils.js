'use strict';

// Return a clousre next function 
// Expect an array
exports.iterator = function iterator(coll) {
  let i = -1;
  let len = coll.length;
  return function next() {
      return ++i < len ? coll[i] : null;
  };
};