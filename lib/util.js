const _ = require('lodash');
const mapper = require('automapper');
const i18n = require('./i18n');
const debug = require('debug')('saas-plat:util');
const shortid = require('shortid');

global.gid = global.gid || 0;

// 分配全局id
const assignId = exports.assignId = (pre) => {
  // 每次加一
  global.gid = global.gid + 1;
  return (pre || '') + global.gid;
}

// 只能比较两个同样结构的对象
const diff = exports.diff = (target, compare) => {
  //console.debug(target,compare)
  if (Array.isArray(target)) {
    compare = compare || [];
    return target.map((it, i) => diff(it, compare[i]));
  } else if (typeof target === 'object') {
    compare = compare || {};
    const right = _.omitBy(compare, (val, key) => target.hasOwnProperty(key));
    let v = _.omitBy(target, (val, key) => _.isEqual(val, compare[key]));
    v = _.mapValues(v, (val, key) => diff(val, compare[key]));
    v = _.assign(v, right);
    //console.debug(v);
    return v;
  } else {
    if (target !== compare) {
      return target;
    }
  }
}

const toFloat = exports.toFloat =(target) => {
  if (Array.isArray(target)) {
    return target.map(it => toFloat(it));
  } else if (typeof target === 'object') {
    const floatobj = {};
    _.keys(target).forEach(key => {
      const f = toFloat(target[key]);
      if (Array.isArray(f)) {
        floatobj[key] = f;
      } else if (typeof f === 'object') {
        _.keys(f).forEach(kk => {
          floatobj[_.camelCase(key + ' ' + kk)] = f[kk];
        });
      } else {
        floatobj[key] = f;
      }
    });
    return floatobj;
  } else {
    return target;
  }
}

const types = ['string', 'object', 'array', 'number', 'boolean', 'date'];
const getFileds = exports.getFileds =(obj) => {
  const meta = [];
  obj && Object.keys(obj).forEach(key => {
    let type;
    let fields;
    let defValue;
    if (typeof obj[key] === 'string') {
      type = types.indexOf(obj[key].toLowerCase()) > -1 ?
        obj[key].toLowerCase() :
        'string';
    } else if (obj[key].type) {
      type = obj[key].type;
      fields = type === 'object' ?
        getFileds(obj[key].fields) :
        undefined;
      defValue = obj[key].defValue;
    } else if (Array.isArray(obj[key])) {
      type = 'array';
      if (obj[key].length > 0) {
        fields = getFileds(obj[key][0]);
      }
    } else if (typeof obj[key] === 'object') {
      type = 'object';
      fields = getFileds(obj[key]);
    } else {
      console.warn('not support type', key);
      return;
    }
    meta.push({
      key,
      type,
      fields,
      defValue
    });
  });
  return meta;
}
const mapto = exports.mapto = mapper.map;
const createObj = exports.createObj =(fields, name) => {
  const dtom = mapper.createMap('dto', name);
  const mtom = mapper.createMap(name, 'dto');
  const defineObj = {};
  fields.forEach(it => {
    switch (it.type) {
    case 'array':
      defineObj[it.key] = it.defValue || [];
      dtom.forMember(it.key, function () {
        const sourceValue = this.__sourceValue[it.key];
        const destinationValue = this.__destinationValue[it.key];
        if (Array.isArray(sourceValue)) {
          // 如果是数组就循环赋值
          for (var i = 0; i < sourceValue.length; i += 1) {
            if (!destinationValue[i]) {
              destinationValue[i] = createObj(it.fields, name + '_' + it.key);
            }
            mapper.map('dto', name + '_' + it.key, sourceValue[i], destinationValue[i]);
          }
        } else {
          // 可以是一个对象，直接赋给数组的第一个元素上
          destinationValue.length = 0;
          destinationValue[0] = createObj(it.fields, name + '_obj' + it.key);
          mapper.map('dto', name + '_obj' + it.key, sourceValue, destinationValue[0]);
        }
      });
      mtom.forMember(it.key, function () {
        const sourceValue = this.__sourceValue[it.key];
        const destinationValue = this.__destinationValue[it.key];
        if (Array.isArray(sourceValue)) {
          for (var i = 0; i < sourceValue.length; i += 1) {
            if (!destinationValue[i]) {
              destinationValue[i] = createObj(it.fields, 'mm:' + name + '_' + it.key);
            }
            mapper.map('mm:' + name + '_' + it.key, 'mm:' + name + '_' + it.key, sourceValue[i], destinationValue[i]);
          }
        } else {
          destinationValue.length = 0;
        }
      });
      break;
    case 'object':
      const subobj = createObj(it.fields, name + '_' + it.key);
      defineObj[it.key] = subobj;
      dtom.forMember(it.key, function () {
        let sourceValue = this.__sourceValue[it.key];
        if (sourceValue) {
          mapper.map('dto', name + '_' + it.key, sourceValue, this.__destinationValue[it.key]);
        } else {
          // 对象支持把层级拉平赋值
          //console.debug(it.key, this.__sourceValue)
          const destinationValue = this.__destinationValue[it.key];
          const sourceKeys = Object.keys(this.__sourceValue);
          const flatValue = {};
          for (let key in destinationValue) {
            if (!destinationValue.hasOwnProperty(key)) {
              continue;
            }
            // 把当前级别的subkey拉平成一个子对象
            const flatKeys = sourceKeys.filter(key => key.toUpperCase().indexOf(it.key.toUpperCase()) > -1);
            flatKeys.forEach(key => {
              // 这里需要对大小写格式化
              flatValue[_.camelCase(key.substr(it.key.length))] = this.__sourceValue[key];
            });
          }
          //console.debug(it.key,'=',flatValue)
          mapper.map('dto', name + '_' + it.key, flatValue, destinationValue);
        }
      });
      mtom.forMember(it.key, function () {
        let sourceValue = this.__sourceValue[it.key];
        if (sourceValue) {
          mapper.map(name + '_' + it.key, name + '_' + it.key, sourceValue, this.__destinationValue[it.key]);
          // } else {
          //   this.__destinationValue[it.key] = sourceValue;
        }
      });
      break;
    case 'string':
      defineObj[it.key] = String(it.defValue || '');
      [dtom, mtom].forEach(atob => atob.forMember(it.key, function () {
        if (this.__sourceValue.hasOwnProperty(it.key)) {
          this.__destinationValue[it.key] = this.__sourceValue[it.key];
          // }else{
          //   this.__destinationValue[it.key] = '';
        }
      }));
      break;
    case 'number':
      defineObj[it.key] = Number(it.defValue || 0);
      [dtom, mtom].forEach(atob => atob.forMember(it.key, function () {
        if (this.__sourceValue.hasOwnProperty(it.key)) {
          this.__destinationValue[it.key] = this.__sourceValue[it.key];
          // }else{
          //   this.__destinationValue[it.key] = 0;
        }
      }));
      break;
    case 'boolean':
      defineObj[it.key] = Boolean(it.defValue || false);
      [dtom, mtom].forEach(atob => atob.forMember(it.key, function () {
        if (this.__sourceValue.hasOwnProperty(it.key)) {
          this.__destinationValue[it.key] = this.__sourceValue[it.key];
          // }else{
          //   this.__destinationValue[it.key] = 0;
        }
      }));
      break;
    case 'date':
      if (defValue === 'now') {
        defineObj[it.key] = Date.now;
      } else {
        defineObj[it.key] = moment(defValue).toDate();
      }
      [dtom, mtom].forEach(atob => atob.forMember(it.key, function () {
        if (this.__sourceValue.hasOwnProperty(it.key)) {
          if (this.__sourceValue[it.key]) {
            // 支持字符串自动转换
            this.__destinationValue[it.key] = moment(this.__sourceValue[it.key]).toDate();
          } else {
            this.__destinationValue[it.key] = null;
          }
          // }else{
          //   this.__destinationValue[it.key] = 0;
        }
      }));
      break;
    default:
      defineObj[it.key] = it.defValue || null;
      [dtom, mtom].forEach(atob => atob.forMember(it.key, function () {
        if (this.__sourceValue.hasOwnProperty(it.key)) {
          this.__destinationValue[it.key] = this.__sourceValue[it.key];
          // }else{
          //   this.__destinationValue[it.key] = null;
        }
      }));
    }
  });
  return defineObj;
}
