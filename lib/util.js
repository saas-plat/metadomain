const _ = require('lodash');
const mapper = require('automapper');
const moment = require('moment');
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

const generateTs = exports.generateTs = () => {
  return new Date().getTime().toString();
}

const parseData = exports.parseData = (data) => {
  return _.mapValues(data, (it) => {
    // $开头系统字段
    if (it.$dataType === 'BigArray' || (Array.isArray(it.$fields) && Array.isArray(it.$data))) {
      const {
        fields = [], data = []
        $fields = fields, $data = data,
      } = it;
      return $data.map(row => {
        return $fields.reduce((obj, key, i) => ({
          ...obj,
          [key]: row[i]
        }), {});
      });
    }
  });
}

const entityTypes = exports.entityTypes = ['string', 'object', 'array', 'number', 'boolean', 'date', 'reference'];
const tableTypes = exports.tableTypes = ['string', 'object', 'array', 'number', 'boolean', 'date', 'buffer', 'mixed', 'id'];

const getMeta = exports.getMeta = (obj, types) => {
  const meta = [];
  obj && Object.keys(obj).forEach(key => {
    let type;
    let fields;
    let defValue;
    let src;
    let rules;
    if (typeof obj[key] === 'string') {
      type = types.indexOf(obj[key].toLowerCase()) > -1 ?
        obj[key].toLowerCase() :
        'reference';
      if (type === 'reference') {
        src = obj[key];
      }
    } else if ('type' in obj[key] || 'Type' in obj[key]) {
      let {
        type,
        Type,
        fileds,
        Fields,
        defaultValue,
        defValue,
        //default,
        DefValue,
        DefaultValue,
        ...other
      } = obj[key];
      type = type || Type;
      //debug(type,fields)
      type = type === 'ref' ? 'reference' : type;
      fields = type === 'obj' || type === 'object' || type === 'reference' || type === 'array' ?
        getMeta(fields || Fields, types) :
        undefined;
      defValue = defValue || DefValue || defaultValue || DefaultValue;
      src = src;
      rules = {
        type,
        ...other
      };
    } else if (Array.isArray(obj[key])) {
      type = 'array';
      if (obj[key].length > 0) {
        const arrobj = obj[key][0];
        if (arrobj.type) {
          fields = getMeta(arrobj.fields, types);
        } else {
          fields = getMeta(arrobj, types);
        }
      }
    } else if (typeof obj[key] === 'object') {
      type = 'object';
      fields = getMeta(obj[key], types);
    } else {
      console.warn('not support type', key);
      return;
    }
    // 不允许$开头的key，系统字段
    if (key.startsWith('$') || key.startsWith('_')) {
      debug(key + ' skip!!');
      return;
    }
    meta.push({
      key,
      type,
      fields,
      defValue,
      src, // 引用类型对象
      rules, // 校验规则
    });
  });
  return meta;
}

const findFields = exports.findFields = (fields, path, i = 0) => {
  let key = path[i];
  if (key.endsWith(']')) {
    key = key.substr(0, key.indexOf('['))
  }
  const sub = fields.find(it => it.key === key);
  if (i + 1 < path.length) {
    return findFields(sub.fields, path, i + 1);
  }
  if (!sub) {
    throw new Error(key + ' not defined!');
  }
  return sub.fields;
}

const getRefrences = exports.getRefrences = (fields, pname = '') => {
  return (fields || []).reduce((refs, it) => {
    const key = [pname, it.key].join('.');
    if (it.type === 'reference') {
      return {
        ...refs,
        [key]: it.src
      }
    } else if (it.type === 'object') {
      return {
        ...refs,
        ...getRefrences(it.fileds, it.key)
      }
    } else if (it.type === 'array') {
      return {
        ...refs,
        ...getRefrences(it.fileds, it.key + '[]')
      }
    }
    return refs;
  }, {});
}

const createObj = exports.createObj = (defineObj = {}, fields, cutRef = false) => {
  (fields || []).forEach(it => {
    switch (it.type) {
    case 'array':
      defineObj[it.key] = it.defValue || undefined;
      break;
    case 'reference':
    case 'object':
      if (cutRef && it.type === 'reference') {
        const idField = it.fields.find(it => it.key.toLowerCase() === 'id');
        if (idField) {
          defineObj[it.key] = {
            [idField.key]: undefined
          };
        } else {
          defineObj[it.key] = undefined;
        }
      } else {
        const props = createObj({}, it.fields, cutRef);
        // debug(defineObj,{
        //   [it.key]: props
        // },subDecs)
        defineObj[it.key] = props;
      }

      break;
    case 'string':
      defineObj[it.key] = it.defValue !== undefined ? String(it.defValue || '') : undefined;
      break;
    case 'number':
      defineObj[it.key] = it.defValue !== undefined ? Number(it.defValue || 0) : undefined;
      break;
    case 'boolean':
      defineObj[it.key] = it.defValue !== undefined ? Boolean(it.defValue || false) : undefined;
      break;
    case 'date':
      if (it.defValue === 'now') {
        defineObj[it.key] = Date.now;
      } else {
        defineObj[it.key] = it.defValue !== undefined ? moment(it.defValue).toDate() : undefined;
      }
      break;
    default:
      defineObj[it.key] = it.defValue || undefined;
    }
  });
  return defineObj;
}

const createMapping = exports.createMapping = (fields, name) => {
  const dtom = mapper.createMap('dto', name);
  const mtod = mapper.createMap(name, 'dto');
  //console.log('Type', name, fields);
  (fields || []).forEach(it => {
    switch (it.type) {
    case 'array':
      createMapping(it.fields, name + '_' + it.key);
      dtom.forMember(it.key, function () {
        const sourceValue = this.__sourceValue[it.key];
        const destinationValue = this.__destinationValue[it.key];
        if (sourceValue instanceof Array) {
          destinationValue.length = sourceValue.length;
          // 如果是数组就循环赋值
          for (var i = 0; i < sourceValue.length; i += 1) {
            if (it.fields && it.fields.length > 0) {
              // map前必须定义结构
              if (destinationValue.length <= i || !destinationValue[i]) {
                createMapping(it.fields, name + '_' + it.key);
                destinationValue[i] = createObj({}, it.fields);
              }
              mapper.map('dto', name + '_' + it.key, sourceValue[i], destinationValue[i]);
            } else {
              destinationValue[i] = sourceValue[i];
            }
          }
        } else if (sourceValue !== undefined) {
          // 可以是一个对象，直接赋给数组的第一个元素上
          destinationValue.length = 0;
          if (it.fields && it.fields.length > 0) {
            createMapping(it.fields, name + '_obj' + it.key);
            destinationValue[0] = createObj({}, it.fields);
            mapper.map('dto', name + '_obj' + it.key, sourceValue, destinationValue[0]);
          } else {
            destinationValue[0] = sourceValue;
          }
        }
      });
      mtod.forMember(it.key, function () {
        const sourceValue = this.__sourceValue[it.key];
        const destinationValue = this.__destinationValue[it.key];
        if (Array.isArray(sourceValue)) {
          for (var i = 0; i < sourceValue.length; i += 1) {
            if (it.fields && it.fields.length > 0) {
              if (!destinationValue[i]) {
                createMapping(it.fields, name + '_' + it.key, {});
                destinationValue[i] = createObj({}, it.fields, true);
              }
              mapper.map(name + '_' + it.key, 'dto', sourceValue[i], destinationValue[i]);
            } else {
              destinationValue[i] = sourceValue[i];
            }
          }
        } else {
          destinationValue.length = 0;
        }
      });
      break;
    case 'reference':
    case 'object':
      createMapping(it.fields, name + '_' + it.key);
      dtom.forMember(it.key, function () {
        let sourceValue = this.__sourceValue[it.key];
        if (sourceValue) {
          mapper.map('dto', name + '_' + it.key, sourceValue, this.__destinationValue[it.key]);
        } else {
          // 对象支持把层级拉平赋值
          //console.debug(it.key, this.__sourceValue)
          const destinationValue = this.__destinationValue[it.key];
          const sourceKeys = Object.keys(this.__sourceValue);
          // ref引用类型支持
          //debug(it.fields.map(it => it.key));
          const flatValue = {};
          //for (let key in it.fields.map(it => it.key)) {
          // if (!destinationValue.hasOwnProperty(key)) {
          //   continue;
          // }
          // 把当前级别的subkey拉平成一个子对象
          const flatKeys = sourceKeys.filter(key => key.toUpperCase().indexOf(it.key.toUpperCase()) > -1);
          flatKeys.forEach(key => {
            // 这里需要对大小写格式化
            flatValue[_.camelCase(key.substr(it.key.length))] = this.__sourceValue[key];
          });
          //}
          //debug(name + '_' + it.key, '=', flatValue)
          if (it.type === 'reference') {
            // destinationValue对象结构不是定义的结构导致map时获取props不对
            const refVal = createObj({}, it.fields);
            //debug(refVal)
            mapper.map('dto', name + '_' + it.key, flatValue, refVal);
            // 引用类型保存id
            this.__destinationValue[it.key] = refVal.id;
          } else {
            mapper.map('dto', name + '_' + it.key, flatValue, destinationValue);
          }
        }
      });
      mtod.forMember(it.key, function () {
        let sourceValue = this.__sourceValue[it.key];
        if (sourceValue) {
          mapper.map(name + '_' + it.key, 'dto', sourceValue, this.__destinationValue[it.key]);
          // } else {
          //   this.__destinationValue[it.key] = sourceValue;
        }
      });
      break;
    case 'string':
      [dtom, mtod].forEach(atob => atob.forMember(it.key, function () {
        if (this.__sourceValue.hasOwnProperty(it.key)) {
          this.__destinationValue[it.key] = this.__sourceValue[it.key];
          // }else{
          //   this.__destinationValue[it.key] = '';
        }
      }));
      break;
    case 'number':
      [dtom, mtod].forEach(atob => atob.forMember(it.key, function () {
        if (this.__sourceValue.hasOwnProperty(it.key)) {
          this.__destinationValue[it.key] = this.__sourceValue[it.key];
          // }else{
          //   this.__destinationValue[it.key] = 0;
        }
      }));
      break;
    case 'boolean':
      [dtom, mtod].forEach(atob => atob.forMember(it.key, function () {
        if (this.__sourceValue.hasOwnProperty(it.key)) {
          this.__destinationValue[it.key] = !!this.__sourceValue[it.key];
          // }else{
          //   this.__destinationValue[it.key] = 0;
        }
      }));
      break;
    case 'date':
      [dtom, mtod].forEach(atob => atob.forMember(it.key, function () {
        if (this.__sourceValue.hasOwnProperty(it.key)) {
          if (this.__sourceValue[it.key]) {
            // 支持字符串自动转换
            if (mtod === atob) {
              this.__destinationValue[it.key] = moment(this.__sourceValue[it.key]).format();
            } else {
              this.__destinationValue[it.key] = moment(this.__sourceValue[it.key]).toDate();
            }
          } else {
            this.__destinationValue[it.key] = undefined;
          }
          // }else{
          //   this.__destinationValue[it.key] = 0;
        }
      }));
      break;
    default:
      [dtom, mtod].forEach(atob => atob.forMember(it.key, function () {
        if (this.__sourceValue.hasOwnProperty(it.key)) {
          this.__destinationValue[it.key] = this.__sourceValue[it.key];
          // }else{
          //   this.__destinationValue[it.key] = null;
        }
      }));
    }
  });
}

exports.mapto = mapper.map;

// 只能比较两个同样结构的对象
const diff = exports.diff = (target, compare) => {
  //console.debug(target,compare)
  if (Array.isArray(target)) {
    compare = compare || [];
    return target.map((it, i) => diff(it, compare[i]));
  } else if (typeof target === 'object' && target) {
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

const toFloat = exports.toFloat = (target) => {
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

// const fieldsSymbol = exports.fieldsSymbol = Symbol();
// const dataKeySymbol = exports.dataKeySymbol = Symbol();
// const actionSymbol = exports.actionSymbol = Symbol();

const none = exports.none = () => {}

exports.noenumerable = function (target, ...keys) {
  keys.forEach(key => {
    Object.defineProperty(target, key, {
      enumerable: false
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
    enumerable
  });
}
