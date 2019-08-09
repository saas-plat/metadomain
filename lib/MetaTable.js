const nools = require('nools');
const log = require('debug')('saas-plat-store');
const _ = require('lodash');
const i18n = require('./i18n');
const mongoose = require('mongoose');
const moment = require('moment');
const mapper = require('automapper');

global.gid = global.gid || 0;

// 分配全局id
const assignId = (pre) => {
  // 每次加一
  global.gid = global.gid + 1;
  return (pre || '') + global.gid;
}

const Event = exports.Event = class Event {
  constructor(name, args = {}) {
    _.merge(this, args);
    this.name = name;
  }
}

const RuleSet = exports.RuleSet = class RuleSet {

  constructor(name, noolsSource = [], define, scope) {
    this.name = name || assignId('RuleSet');
    // 这里没找到问题根源，在单元测试反复执行时不触发规则
    if (process.env.NODE_ENV !== 'production') {
      nools.hasFlow(this.name) && nools.deleteFlow(this.name);
    }
    this.flow = nools.getFlow(name) || nools.compile(noolsSource.join('\n'), {
      define,
      scope,
      name: this.name
    });
    log('create rule flow', this.name);
  }

  async execute(facts, filter) {
    log('execute flow session');
    const session = this.flow.getSession(...facts);
    await session.match();
    const result = session.getFacts(filter)
    log('dispose flow session');
    session.dispose();
    return result;
  }

  dispose() {
    log('dispose rule flow');
    nools.deleteFlow(this.name);
    this.flow = null;
  }
}

const getMeta = (obj) => {
  const meta = [];
  obj && Object.keys(obj).forEach(key => {
    let type;
    let fields;
    let defValue;
    let opts = {};
    if (typeof obj[key] === 'string') {
      type = types.indexOf(obj[key].toLowerCase()) > -1 ?
        obj[key].toLowerCase() :
        'mixed';
    } else if (obj[key].type) {
      const o = obj[key];
      type = o.type;
      fields = type === 'object' ?
        getMeta(o.fields) :
        undefined;
      defValue = o.defValue || o.default;
      Object.keys(o).filter(key => ['defValue', 'type', 'fields'].indexOf(key) < 0).forEach(key => {
        opts[key] = o[key];
      })
    } else if (Array.isArray(obj[key])) {
      type = 'array';
      if (obj[key].length > 0) {
        fields = getMeta(obj[key][0]);
      }
    } else if (typeof obj[key] === 'object') {
      type = 'object';
      fields = getMeta(obj[key]);
    } else {
      type = 'mixed';
      return;
    }
    meta.push(_.merge({
      key,
      type,
      fields,
      defValue
    }, opts));
  });
  return meta;
}

const define = (fields) => {
  const defineObj = {};
  fields.forEach(it => {
    const key = it.key.replace('$', '_');
    switch (it.type) {
      case 'array':
        defineObj[key] = it.defValue || [];
        break;
      case 'object':
        const subobj = define(it.fields);
        defineObj[key] = subobj;
        break;
      case 'string':
        defineObj[key] = it.defValue || '';
        break;
      case 'date':
        defineObj[key] = it.defValue || new Date(0);
        break;
      case 'boolean':
        defineObj[key] = it.defValue || false;
        break;
      case 'number':
        defineObj[key] = it.defValue || 0;
        break;
      default:
        defineObj[key] = it.defValue || null;
    }
  });
  return defineObj;
}

const createMapto = (fields, name) => {
  const dtom = mapper.createMap('dto', name);
  fields.forEach(it => {
    const key = it.key.replace('$', '_');
    switch (it.type) {
      case 'array':
        dtom.forMember(key, function() {
          const sourceValue = this.__sourceValue[it.key];
          const destinationValue = this.__destinationValue[key];
          if (Array.isArray(sourceValue)) {
            // 如果是数组就循环赋值
            for (var i = 0; i < sourceValue.length; i += 1) {
              if (!destinationValue[i]) {
                createMapto(it.fields, name + '_' + it.key);
                destinationValue[i] = define(it.fields);
              }
              mapper.map('dto', name + '_' + it.key, sourceValue[i], destinationValue[i]);
            }
          } else {
            // 可以是一个对象，直接赋给数组的第一个元素上
            destinationValue.length = 0;
            createMapto(it.fields, name + '_obj' + it.key);
            destinationValue[0] = define(it.fields);
            mapper.map('dto', name + '_obj' + it.key, sourceValue, destinationValue[0]);
          }
        });

        break;
      case 'object':
        createMapto(it.fields, name + '_' + it.key);
        dtom.forMember(key, function() {
          let sourceValue = this.__sourceValue[it.key];
          if (sourceValue) {
            //console.log(sourceValue,this.__destinationValue[it.key])
            mapper.map('dto', name + '_' + it.key, sourceValue, this.__destinationValue[key]);
          } else {
            // 对象支持把层级拉平赋值
            //console.log(it.key, this.__sourceValue)
            const destinationValue = this.__destinationValue[key];
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
            //  console.log(it.key,'=',flatValue)
            mapper.map('dto', name + '_' + it.key, flatValue, destinationValue);
          }
        });
        break;
      default:
        [dtom].forEach(atob => atob.forMember(key, function() {
          if (this.__sourceValue.hasOwnProperty(it.key)) {
            this.__destinationValue[key] = this.__sourceValue[it.key];
            // }else{
            //   this.__destinationValue[it.key] = null;
          }
        }));
    }
  });
}

// The permitted SchemaTypes are:
// String
// Number
// Date
// Buffer
// Boolean
// Mixed
// ObjectId
// Array
const createDbSchema = (obj) => {
  const meta = {};
  obj && obj.forEach(item => {
    const type = item.type;
    const key = item.key.replace('$', '_');
    const defValue = item.defValue;
    switch (type) {
      case 'string':
        meta[key] = {
          type: String,
          default: defValue && String(defValue),
          lowercase: item.lowercase && Boolean(item.lowercase),
          uppercase: item.uppercase && Boolean(item.uppercase),
          trim: item.trim && Boolean(item.trim),
          match: item.match && new RegExp(item.match),
          enum: item.enum && Array(item.enum)
        };
        break;
      case 'object':
        meta[key] = createDbSchema(item.fields)
        break;
      case 'array':
        const subtype = (item.itemType && item.itemType.toLowerCase()) || (
          item.fields && item.fields.length > 0 ?
          'object' :
          'mixed');
        let itemtype;
        switch (subtype) {
          case 'string':
            itemtype = String;
            break;
          case 'object':
            itemtype = createDbSchema(item.fields);
            break;
          case 'array':
            itemtype = [];
            break;
          case 'number':
            itemtype = Number;
            break;
          case 'date':
            itemtype = Date;
            break;
          case 'buffer':
            itemtype = Buffer;
            break;
          case 'boolean':
            itemtype = Boolean;
            break;
          case 'mixed':
          default:
            itemtype = mongoose.Schema.Types.Mixed;
            break;
        }
        meta[key] = [itemtype];
        break;
      case 'number':
        meta[key] = {
          type: Number,
          default: defValue && Number(defValue),
          min: item.min && Number(item.min),
          max: item.max && Number(item.max)
        };
        break;
      case 'date':
        meta[key] = {
          type: Date,
          min: item.min && Number(moment(item.min).format()),
          max: item.max && Number(moment(item.max).format())
        };
        if (defValue === 'now') {
          meta[key].default = Date.now;
        } else {
          meta[key].default = moment(defValue).toDate();
        }
        break;
      case 'buffer':
        meta[key] = {
          type: Buffer
        };
        break;
      case 'boolean':
        meta[key] = {
          type: Boolean,
          default: Boolean(defValue)
        };
        break;
      case 'mixed':
      default:
        meta[key] = {
          type: mongoose.Schema.Types.Mixed,
          default: defValue
        };
        break;
    }
    if (type === 'string' || type === 'number' || type === 'date' || type === 'boolean') {
      meta[key].index = item.index;
      meta[key].unique = item.unique;
      meta[key].sparse = item.sparse;
    }
  });
  return meta;
}

const defaultFields = [{
  key: '$id',
  type: 'number',
  //key: true,
  unique: true
}, {
  key: '$orgid',
  type: 'string',
  index: true
}, {
  key: '$mid',
  type: 'string',
  index: true
}];

const types = [
  'string',
  'object',
  'array',
  'number',
  'date',
  'buffer',
  'boolean',
  'mixed'
];

exports.Table = class Table {

  static create(name, schema,   orgid, callback) {
    name = name || assignId('Table');
    log('create Table', name);
    const fields = getMeta(schema).concat(defaultFields);
    //console.log(fields);
    createMapto(fields, name);
    const sche = createDbSchema(fields);
    //console.log(sche._mid);
    //console.log(_.merge(getMeta(schame), defaultFields))
    const Schema = mongoose.Schema(sche, {
      timestamps: true,
      versionKey: '_ver'
    });
    Schema.static({
      mapDto: function(dto) {
        // 把dto转成model
        const data = define(fields);
        mapper.map('dto', name, dto, data);
        data._orgid = orgid;
        return data;
      },
      upsert: function(data) {
        assert(data.$id, i18n.t('系统ID不存在')); // 系统id不需带
        //console.log(this.mapDto(data))
        return this.update({
          _id: data.$id,
          _orgid: orgid, // 所有查询都要带有orgid
        }, this.mapDto(data), {
          upsert: true
        }).exec();
      }
    });

    //console.log(Schema)
    Schema.pre('init', function(doc) {
      callback('beforeInit', doc);
    });
    Schema.pre('validate', function(doc) {
      callback('beforeValidate', doc);
    });
    Schema.pre('save', function(doc) {
      callback('beforeSave', doc);
    });
    Schema.pre('remove', function(doc) {
      callback('beforeRemove', doc);
    });
    Schema.post('init', function(doc) {
      callback('afterInit', doc);
    });
    Schema.post('validate', function(doc) {
      callback('afterValidate', doc);
    });
    Schema.post('save', function(doc) {
      callback('afterSave', doc);
    });
    Schema.post('remove', function(doc) {
      callback('afterRemove', doc);
    });

    const Model = mongoose.model(name, Schema, name, {
      cache: false
    });
    return Model;
  }
}
