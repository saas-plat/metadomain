const _ = require('lodash');
const mapper = require('automapper');
const moment = require('moment');
const {
  t
} = require('./i18n');
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

const parseBigData = (data) => {
  // $开头系统字段
  if (_.isPlainObject(data) && (data.$type === 'BigArray' || data._type === 'BigArray' || (Array.isArray(data.$fields) && Array.isArray(data.$data)))) {
    const fields = data.$fields || data._fields || data.fields;
    const datalist = data.$data || data._fields || data.data;
    const bigarr = datalist.map(row => {
      return fields.reduce((obj, key, i) => ({
        ...obj,
        [key]: parseBigData(row[i])
      }), {});
    });
    return bigarr;
  } else if (_.isArray(data)) {
    return data.map(sit => parseBigData(sit));
  } else if (_.isPlainObject(data)) {
    return _.mapValues(data, (it) => parseBigData(it));
  } else {
    return data;
  }
}
const parseData = exports.parseData = (data, mappings = null) => {
  const retobj = parseBigData(data);
  //debug(retobj)
  if (mappings) {
    // 将有可能是mapping字段转换成用户自定义字段名称
    _.keys(mappings).forEach(mkey => {
      if (mkey in retobj) {
        const userkey = mappings[mkey];
        if (typeof userkey === 'string') {
          // 不需要映射
          if (userkey === mkey) {
            return;
          }
          retobj[userkey] = retobj[mkey];
        } else if (_.isArray(userkey)) {
          const submapping = userkey[0];
          const arrobj = _.toArray(retobj[mkey]);
          retobj[userkey] = parseData(arrobj, submapping);
        } else if (_.isPlainObject(userkey)) {
          retobj[userkey] = parseData(_.toPlainObject(retobj[mkey]), userkey);
        }
        delete retobj[mkey];
      }
    })
  }
  return retobj;
}
const toFloat = exports.toFloat = (target) => {
  if (Array.isArray(target)) {
    if (target.length > 1 && process.env.BigArrayFloatable) {
      const fields = new Array(target.reduce((sets, it) => {
        _.keys(it).forEach(sets.add);
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
  } else if (_.isDate(target)) {
    return target;
  } else if (_.isObject(target)) {
    return _.keys(target).reduce((ret, key) => {
      const v = toFloat(target[key]);
      if (!_.isUndefined(v)) {
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
  } else if (_.isDate(target)) {
    return target;
  } else if (_.isObject(target)) {
    const obj = _.omitBy(_.mapValues(target, filterValues), _.isUndefined);
    if (_.keys(obj).length <= 0) {
      return undefined;
    }
    return obj;
  } else {
    return target;
  }
}

const entityTypes = exports.entityTypes = ['string', 'object', 'array', 'number', 'bool', 'date', 'reference'];
const tableTypes = exports.tableTypes = ['string', 'object', 'array', 'number', 'bool', 'date', 'buffer', 'mixed', 'id'];

const getMetaItem = (it, types) => {
  let type;
  let subtype;
  let fields;
  let defValue;
  let src;
  let rules;
  let mapping;
  let index;
  if (typeof it === 'string') {
    type = types.indexOf(it) > -1 ? it : 'reference';
    if (type === 'reference' && it !== type) {
      src = it;
    }
  } else if ('type' in it || _.keys(it).some(key => key.startsWith('_') || key.startsWith('$'))) {
    let {
      //type,
      fields,
      defaultValue,
      //defValue,
      //default,
      // 系统字段以$和_开头
      $type,
      $subtype,
      $fields,
      $defValue,
      $default,
      $defaultValue,
      $src,
      $rules,
      $mapping,
      $index,
      _type = $type,
      _subtype = $subtype,
      _fields = $fields,
      _defValue = $defValue,
      _default = $default,
      _defaultValue = $defaultValue,
      _src = $src,
      _rules = $rules,
      _mapping = $mapping,
      _index = $index,
      ...other
    } = it;
    type = _type || it.type || 'string';
    type = type === 'ref' ? 'reference' : type;
    type = type === 'obj' ? 'object' : type;
    type = types.indexOf(type) > -1 ? type : 'reference';
    if (type === 'reference' && it.type !== type) {
      src = it.type;
    }
    fields = _fields || fields;
    fields = type === 'object' || type === 'array' ? getMeta(fields, types) : undefined;
    subtype = _subtype || it.subtype;
    subtype = subtype === 'ref' ? 'reference' : subtype;
    subtype = subtype === 'obj' ? 'object' : subtype;
    subtype = subtype ? (types.indexOf(subtype) > -1 ? subtype : 'reference') : subtype;
    if (subtype === 'reference' && it.subtype !== subtype) {
      src = it.subtype;
    }
    defValue = _defValue || _default || _defaultValue || it['default'] || it.defValue || defaultValue;
    src = _src || it.src || src;
    index = _index || it.index;
    delete other.type;
    delete other.subtype;
    delete other['default'];
    delete other.defValue;
    delete other.mapping;
    delete other.src;
    delete other.index;
    delete other.rules;
    rules = _rules || it.rules || {
      type,
      ...other
    };
    // 映射字段名称，比如模型的必要字段可以映射改名
    mapping = _mapping || it.mapping;
  } else if (Array.isArray(it)) {
    type = 'array';
    let sub;
    if (it) {
      sub = getMetaItem(it[0], types);
      if (!sub) {
        sub = {
          type: 'object',
          fields: getMeta(it[0], types)
        };
      }
    } else {
      sub = {
        type: 'object',
        fields: getMeta(it.fields, types)
      };
    }
    subtype = sub.type;
    fields: sub.fields;
    src = sub.src;
    rules = sub.rules;
  } else if (typeof it === 'object') {
    type = 'object';
    fields = getMeta(it, types);
  } else {
    return null;
  }
  return {
    type,
    subtype, // 数组的元素对象类型
    fields,
    defValue,
    src, // 引用类型对象
    rules, // 校验规则
    mapping,
    index, // 查找索引
  };
}
const getMeta = exports.getMeta = (obj, types) => {
  const fields = [];
  _.isPlainObject(obj) && _.keys(obj).forEach(key => {
    // 不允许$和_开头的key，系统字段
    if (key.startsWith('$') || key.startsWith('_')) {
      debug(key + ' skip!!');
      return;
    }
    const it = obj[key];
    const field = getMetaItem(it, types);
    if (!field) {
      console.warn('not support type', key);
    }
    fields.push({
      key,
      ...field
    });
  });
  return fields;
}
const findField = exports.findField = (fields, path, i = 0) => {
  let key = path[i];
  if (key.endsWith(']')) {
    key = key.substr(0, key.indexOf('['))
  }
  const sub = fields.find(it => it.key === key);
  if (i + 1 < path.length) {
    return findField(sub.fields, path, i + 1);
  }
  if (!sub) {
    throw new Error(key + ' not defined!');
  }
  return sub;
}

const getFieldMapings = exports.getFieldMapings = (fields = [], defFields = []) => {
  return fields.reduce((maps, it) => {
    if (it.type === 'object') {
      const ret = getFieldMapings(it.fields, defFields[it.key] || []);
      if (_.keys(ret).length > 0) {
        maps[it.key] = ret;
      }
    } else if (it.subtype === 'object') {
      const ret = getFieldMapings(it.fields, defFields[it.key] || []);
      if (_.keys(ret).length > 0) {
        maps[it.key] = [ret];
      }
    } else if (it.mapping) {
      maps[it.mapping] = it.key;
    } else if (defFields.some(dit => dit.key === it.key)) {
      // 如果没有设置mapping字段，自动按照名称匹配
      const exists = defFields.find(dit => dit.key === it.key);
      if (it.type !== undefined && exists.type !== it.type) {
        debug(it)
        throw new Error(t('{{key}}字段类型冲突，必须是{{type}}类型', exists));
      }
      maps[it.key] = it.key;
    }
    return maps;
  }, {});
}

const checkKeys = exports.checkKeys = ['type', 'subtype', 'defValue', 'src'];

const checkRequiredFieldMap = exports.checkRequiredFieldMap = (fields, mappings, mapFields) => {
  const errFields = [];
  const defectFields = [];
  fields.forEach(it => {
    // 不在mapping里自动补充
    if (it.type === 'object' || it.subtype === 'object') {
      const rfm = checkRequiredFieldMap(it.fields || [], mappings[it.key], mapFields[mappings[it.key]]);
      defectFields.push({
        ...it,
        fields: rfm.defectFields
      });
      errFields.push({
        ...it,
        fields: rfm.defectFields
      });
    } else if (it.key in mappings) {
      // WHY 这里不创建pkey下面find不好使??
      const pkey = mappings[it.key];
      const pFields = mapFields.find(it => it.key === pkey);
      const nKey = _.keys(it).find(key => {
        if (checkKeys.indexOf(key) === -1) {
          return false;
        }
        if (!_.isUndefined(it[key]) && pFields[key] !== it[key]) {
          return true;
        }
      });
      if (nKey) {
        //  检查mapping是否包含比配置信息，比如默认值，subtype等
        if (!_.isUndefined(pFields[nKey])) {
          debug('conflict %s: %s != %s', nKey, pFields[nKey], it[nKey]);
          errFields.push(it);
        } else {
          defectFields.push({
            ...it,
            key: pkey
          });
        }
      }
    } else if (it.type === 'reference' || it.subtype === 'reference') {
      if (it.src) {
        defectFields.push(it);
      } else {
        debug('defect %s src', it.key);
        // 引用类型无法自动补充
        errFields.push(it);
      }
    } else {
      defectFields.push(it);
    }
  });
  return {
    defectFields,
    errFields
  };
}

const getKeyPaths = exports.getKeyPaths = (fields = [], pname = '') => {
  return fields.reduce((paths, it) => {
    const key = [pname, it.key].filter(it => it).join('.');
    if (it.type === 'object') {
      return paths.concat(...getKeyPaths(it.fields, it.key));
    } else if (it.subtype === 'object') {
      return paths.concat(...getKeyPaths(it.fields, it.key));
    }
    return paths.concat(key);
  }, []);
}

const unionFields = exports.unionFields = (...fieldsList) => {
  return fieldsList.reduce((ret, fields) => {
    for (const it of fields) {
      const exists = ret.find(rit => rit.key === it.key);
      if (!exists) {
        ret.push(it);
        continue;
      }
      if (exists.type === 'object') {
        //debug(it,exists)
        exists.fields = unionFields(exists.fields || [], it.fields || []);
        // } else if (exists.subtype === 'object') {
        //   exists.fields = unionFields(exists.fields, it.fields);
      } else {
        _.assign(exists, _.omitBy(it, _.isUndefined));
      }
    }
    return ret;
  }, []);
}

const createMappingProps = exports.createMappingProps = (target, mappings) => {
  _.keys(mappings).forEach(mkey => {
    const userkey = mappings[mkey];
    let getfn, setfn;
    getfn = () => {
      debug(mkey, '<=', userkey)
      return target[userkey];
    }
    if (typeof userkey === 'string') {
      // 不需要映射
      if (userkey === mkey) {
        return;
      }
      setfn = (value) => {
        debug(mkey, '=>', userkey)
        target[userkey] = value;
      }
    } else if (_.isArray(userkey)) {
      const submapping = userkey[0];
      setfn = (value) => {
        debug(mkey, '=>', userkey)
        if (!value) {
          target[mkey] = value;
        } else {
          target[mkey] = _.toArray(value).map(it => createMappingProps(it, submapping));
        }
      }
    } else if (_.isPlainObject(userkey)) {
      setfn = (value) => {
        debug(mkey, '=>', userkey)
        target[mkey] = createMappingProps(_.toPlainObject(value), userkey);
      }
    }
    Object.defineProperty(target, mkey, {
      get: getfn,
      set: setfn,
      enumerable: false,
      configurable: false
    });
  });
}

const getRefrences = exports.getRefrences = (fields = [], pname = '') => {
  return fields.reduce((refs, it) => {
    const key = [pname, it.key].filter(it => it).join('.');
    if (it.type === 'reference') {
      return {
        ...refs,
        [key]: it.src
      }
    } else if (it.subtype === 'reference') {
      return {
        ...refs,
        [key + '[]']: it.src
      }
    } else if (it.type === 'object') {
      return {
        ...refs,
        ...getRefrences(it.fields, it.key)
      }
    } else if (it.subtype === 'object') {
      return {
        ...refs,
        ...getRefrences(it.fields, it.key + '[]')
      }
    }
    return refs;
  }, {});
}

const createObj = exports.createObj = (defineObj = {}, fields, opts) => {
  opts = {
    withDefault: false,
    ...opts
  };
  const createDefaultValue = (defValue) => {
    if (opts.withDefault) {
      return defValue;
    }
    return undefined;
  };
  fields.forEach(it => {
    switch (it.type) {
    case 'array':
      defineObj[it.key] = createDefaultValue(it.defValue || undefined);
      break;
    case 'reference':
      defineObj[it.key] = undefined;
      break;
    case 'object':
      const props = createObj({}, it.fields || [], opts);
      // debug(defineObj,{
      //   [it.key]: props
      // },subDecs)
      defineObj[it.key] = props;
      break;
    case 'string':
      defineObj[it.key] = createDefaultValue(it.defValue !== undefined ? String(it.defValue || '') : undefined);
      break;
    case 'number':
      defineObj[it.key] = createDefaultValue(it.defValue !== undefined ? Number(it.defValue || 0) : undefined);
      break;
    case 'boolean':
      defineObj[it.key] = createDefaultValue(it.defValue !== undefined ? Boolean(it.defValue || false) : undefined);
      break;
    case 'date':
      if (it.defValue === 'now') {
        defineObj[it.key] = createDefaultValue(Date.now);
      } else {
        defineObj[it.key] = createDefaultValue(it.defValue !== undefined ? moment(it.defValue).toDate() : undefined);
      }
      break;
    default:
      defineObj[it.key] = createDefaultValue(it.defValue || undefined);
    }
  });
  return defineObj;
}

const createMapping = exports.createMapping = (fields, name) => {
  const dtom = mapper.createMap('dto', name);
  const mtod = mapper.createMap(name, 'dto');
  //console.log('Type', name, fields);
  fields.forEach(it => {
    switch (it.type) {
    case 'array':
      createMapping(it.fields || [], name + '_' + it.key);
      dtom.forMember(it.key, function () {
        const sourceValue = this.__sourceValue[it.key];
        let destinationValue = this.__destinationValue[it.key];
        if (sourceValue instanceof Array) {
          if (!destinationValue) {
            this.__destinationValue[it.key] = destinationValue = [];
          }
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
              // 简单对象赋值
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
        let destinationValue = this.__destinationValue[it.key];
        if (Array.isArray(sourceValue)) {
          if (!destinationValue) {
            this.__destinationValue[it.key] = destinationValue = [];
          }
          destinationValue.length = sourceValue.length;
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
          // 要是source=undefined保持dest一致
          this.__destinationValue[it.key] = destinationValue = sourceValue;
        }
      });
      break;
    case 'reference':
      dtom.forMember(it.key, function () {
        let sourceValue = this.__sourceValue[it.key];
        if (_.isObject(sourceValue)) {
          this.__destinationValue[it.key] = sourceValue;
        } else if (_.isString(sourceValue)) {
          const refVal = {
            id: sourceValue
          }
          //debug(refVal)
          this.__destinationValue[it.key] = refVal;
        } else if (_.isNull(sourceValue)) {
          this.__destinationValue[it.key] = null;
        }
      });
      mtod.forMember(it.key, function () {
        let sourceValue = this.__sourceValue[it.key];
        if (sourceValue) {
          // 引用类型只保留id和ts
          this.__destinationValue[it.key] = {
            id: sourceValue.id,
            // ts 没有用，引用的对象就是可以独立更新
            //ts: sourceValue.ts
          };
        }
      });
      break;
    case 'object':
      // object的fields未定义表示是mixed任意类型数据
      it.fields && createMapping(it.fields, name + '_' + it.key);
      dtom.forMember(it.key, function () {
        let sourceValue = this.__sourceValue[it.key];
        if (!it.fields) {
          // mixed任意类型数据直接赋值
          this.__destinationValue[it.key] = sourceValue;
          return;
        }
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

          mapper.map('dto', name + '_' + it.key, flatValue, destinationValue);
        }
      });
      mtod.forMember(it.key, function () {
        let sourceValue = this.__sourceValue[it.key];
        if (!it.fields) {
          // mixed任意类型数据直接赋值
          this.__destinationValue[it.key] = sourceValue;
          return;
        }
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
          this.__destinationValue[it.key] = _.toString(this.__sourceValue[it.key]);
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
            //console.log(this.__sourceValue[it.key],it.key)
            if (mtod === atob) {
              this.__destinationValue[it.key] = moment(this.__sourceValue[it.key]).toDate();
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
  if (_.isArray(target)) {
    compare = compare || [];
    return target.map((it, i) => diff(it, compare[i]));
  } else if (_.isDate(target)) {
    if (target !== compare) {
      return target;
    }
  } else if (_.isObjectLike(target)) {
    compare = compare || {};
    // 不等的字段，但是undefined不算不等
    let v = _.omitBy(target, (val, key) =>
      _.isFunction(val) ||
      _.isUndefined(val) ||
      _.isEqual(val, compare[key]) ||
      key.startsWith('_'));
    v = _.mapValues(v, (val, key) => diff(val, compare[key]));
    // 如果是引用类型需要保留id否则无法更新
    const refid = {};
    if (target.id) {
      refid.id = target.id;
    }
    v = _.assign(v, refid);
    if (_.keys(v).length <= 0) {
      return undefined;
    }
    return v;
  } else {
    if (target !== compare) {
      return target;
    }
  }
}

// const fieldsSymbol = exports.fieldsSymbol = Symbol();
// const dataKeySymbol = exports.dataKeySymbol = Symbol();
// const actionSymbol = exports.actionSymbol = Symbol();

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
    enumerable: false,
    configurable: false
  });
}
