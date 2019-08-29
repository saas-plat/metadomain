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
  }
}
