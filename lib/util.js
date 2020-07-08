const keys = require('lodash/keys');
const mapKeys = require('lodash/mapKeys');
const mapValues = require('lodash/mapValues');
const omitBy = require('lodash/omitBy');
const assign = require('lodash/assign');
const camelCase = require('lodash/camelCase');
const toArray = require('lodash/toArray');
const toString = require('lodash/toString');
const toNumber = require('lodash/toNumber');
const isString = require('lodash/isString');
const isNull = require('lodash/isNull');
const isDate = require('lodash/isDate');
const isUndefined = require('lodash/isUndefined');
const isPlainObject = require('lodash/isPlainObject');
const isEqual = require('lodash/isEqual');
const isArray = require('lodash/isArray');
const isObject = require('lodash/isObject');

const generateTs = exports.generateTs = () => {
  return new Date().getTime().toString();
}

const toFloat = exports.toFloat = (target) => {
  if (Array.isArray(target)) {
    if (target.length > 1 && process.env.BigArrayFloatable) {
      const fields = new Array(target.reduce((sets, it) => {
        keys(it).forEach(sets.add);
        return sets;
      }, new Set()));
      return {
        $type: 'BigArray',
        $fields: fields,
        $data: target.map(it => fields.map(key => toFloat(it[key])))
      }
    } else {
      return target;
    }
  } else if (isDate(target)) {
    return target;
  } else if (isObject(target)) {
    return keys(target).reduce((ret, key) => {
      const v = toFloat(target[key]);
      if (!isUndefined(v)) {
        if (!ret) {
          ret = {};
        }
        ret[key] = toFloat(target[key]);
      }
      return ret;
    }, undefined);
    return floatobj;
  } else {
    return target;
  }
}

const filterValues = exports.filterValues = (target) => {
  if (Array.isArray(target)) {
    return target.map(it => filterValues(it))
  } else if (isDate(target)) {
    return target;
  } else if (isObject(target)) {
    const obj = omitBy(mapValues(target, filterValues), isUndefined);
    if (keys(obj).length <= 0) {
      return undefined;
    }
    return obj;
  } else {
    return target;
  }
}


// 只能比较两个同样结构的对象
const diff = exports.diff = (target, compare) => {
  //console.debug(target,compare)
  if (isArray(target)) {
    compare = compare || [];
    return target.map((it, i) => diff(it, compare[i]));
  } else if (isDate(target)) {
    if (target !== compare) {
      return target;
    }
  } else if (isObjectLike(target)) {
    compare = compare || {};
    // 不等的字段，但是undefined不算不等
    let v = omitBy(target, (val, key) =>
      isFunction(val) ||
      isUndefined(val) ||
      isEqual(val, compare[key]) ||
      key.startsWith('_'));
    v = mapValues(v, (val, key) => diff(val, compare[key]));
    // 如果是引用类型需要保留id否则无法更新
    const refid = {};
    if (target.id) {
      refid.id = target.id;
    }
    v = assign(v, refid);
    // 对象和数组不能设置undefined会导致完全一个返回undefined报错
    // if (keys(v).length <= 0) {
    //   return undefined;
    // }
    return v;
  } else {
    if (target !== compare) {
      return target;
    }
  }
}


const none = exports.none = () => {}

exports.noenumerable = function (target, ...keys) {
  keys.forEach(key => {
    Object.defineProperty(target, key, {
      enumerable: false,
      writable: true,
      configurable: false
    });
  })
}

exports.readonly = function readonly(target, key, initValue, enumerable = false) {
  // 修改函数的name需要先改成writable
  Object.defineProperty(target, key, {
    writable: true
  });
  if (initValue !== undefined) {
    target[key] = initValue;
  }
  Object.defineProperty(target, key, {
    writable: false,
    //enumerable: enumerable,
    configurable: false
  });
}

const readonlyDeep = exports.readonlyDeep = function readonly(target, key, initValue, enumerable = false) {
  // 修改函数的name需要先改成writable
  Object.defineProperty(target, key, {
    writable: true
  });
  if (initValue !== undefined) {
    target[key] = isPlainObject(initValue) ? keys(initValue).reduce((obj, key) => {
      readonlyDeep(obj, key, initValue[key], enumerable);
      return obj;
    }, {}) : initValue;
  }
  Object.defineProperty(target, key, {
    writable: false,
    //enumerable: enumerable,
    configurable: false
  });
}


const parseBigData = exports.parseBigData = (data) => {
  // $开头系统字段
  if (isPlainObject(data) && (data.$type === 'BigArray' || data._type === 'BigArray' || (Array.isArray(data.$fields) && Array.isArray(data.$data)))) {
    const fields = data.$fields || data._fields || data.fields;
    const datalist = data.$data || data._fields || data.data;
    const bigarr = datalist.map(row => {
      return fields.reduce((obj, key, i) => ({
        ...obj,
        [key]: parseBigData(row[i])
      }), {});
    });
    return bigarr;
  } else if (isArray(data)) {
    return data.map(sit => parseBigData(sit));
  } else if (isPlainObject(data)) {
    return mapValues(data, (it) => parseBigData(it));
  } else {
    return data;
  }
}
const parseUserData = exports.parseUserData = (retobj, mappings) => {
  // 将有可能是mapping字段转换成用户自定义字段名称
  keys(mappings).forEach(mkey => {
    if (mkey in retobj) {
      const userkey = mappings[mkey];
      if (typeof userkey === 'string') {
        // 不需要映射
        if (userkey === mkey) {
          return;
        }
        retobj[userkey] = retobj[mkey];
      } else if (isArray(userkey)) {
        const submapping = userkey[0];
        const arrobj = toArray(retobj[mkey]);
        retobj[userkey] = parseUserData(arrobj, submapping);
      } else if (isPlainObject(userkey)) {
        retobj[userkey] = parseUserData(toPlainObject(retobj[mkey]), userkey);
      }
      delete retobj[mkey];
    }
  })
  return retobj;
}


const omitByDeep = exports.omitByDeep = (data, fields) => {
  if (keys(data).length <= 0) {
    return data;
  }
  return omitBy(data, (val, key) => {
    if (fields[key]) {
      return true;
    }
    isPlainObject(val) && omitByDeep(val, fields[key]);
  })
}

const unset = exports.unset = (data, fields) => {
  let unsetobj = {};
  keys(data).forEach(key => {
    const field = fields.find(it => it.key === key);
    if (!field) {
      unsetobj[key] = 1;
    } else if (field.fields) {
      if (field.type === 'array') {
        toArray(data[key]).forEach((it, i) => {
          unsetobj = {
            ...unsetobj,
            ...mapKeys(unset(it, field.fields), (v, subkey) => key + '.' + i + '.' + subkey)
          };
        })
      } else {
        unsetobj = {
          ...unsetobj,
          ...mapKeys(unset(data[key], field.fields), (v, subkey) => key + '.' + subkey)
        };
      }
    }
  });
  return unsetobj;
}

exports.dropCollection = async (collection) => {
  try {
    await collection.drop();
  } catch (err) {
    if (!err.message.match(/ns not found/)) {
      throw err;
    }
  }
}
