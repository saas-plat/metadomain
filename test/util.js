const _ = require('lodash');

// 裁剪调变量例如id,ts,updateat...
const cutObj = exports.cutObj = (target) => {
  if (Array.isArray(target)) {
    return target.map(it => cutObj(it))
  } else if (_.isDate(target)) {
    return target;
  } else if (_.isObject(target)) {
    const r = _.omitBy(_.mapValues(target, cutObj), (v, k) => {
      return !v || (['id', 'ts', 'createAt', 'updateAt', 'deleteAt'].indexOf(k) > -1)
    });
    return r;
  } else if (target) {
    return target;
  } else {
    return null;
  }
}

const wait = exports.wait = (timeout = 0) => {
  console.log('waiting...', timeout);
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  })
}
