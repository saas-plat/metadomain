const nools = require('nools');
const debug = require('debug')('saas-plat:MetaTable');
const _ = require('lodash');
const i18n = require('./i18n');
const mongoose = require('mongoose');
const {
  tableTypes,
  getMeta,
  createMapping,
  createObj,
  mapto,
  none,
} = require('./util');

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
    const key = item.key;
    const defValue = item.defValue;
    switch (type) {
    case 'id':
      meta[key] = {
        type: mongoose.Schema.Types.ObjectId,
      };
      break;
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
      case 'id':
        itemtype = mongoose.Schema.Types.ObjectId;
        break;
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

exports.Table = class Table {

  static createSchema(BaseTable, name, schema, scope = {}) {
    name = name || assignId('Table');
    debug('create Table', name);
    const fields = getMeta(schema, tableTypes).concat([
      ...BaseTable.fields,
      ...Object.keys(scope).map(key => ({
        key: '_' + key,
        type: 'string',
        index: true
      }))
    ]);
    //debug(fields);
    createMapping(fields, name);
    const sche = createDbSchema(fields);
    //debug(sche._mid);
    //debug(_.merge(getMeta(schame), defaultFields))
    const schema = mongoose.Schema(sche, {
      //timestamps: true,
      //versionKey: '__v'
    });
    return schema;
  }

  static create(BaseTable, name, schema, scope = {}, actionHandler = {}) {
    const schema = Table.createSchema(BaseTable, name, schame, scope);
    schema.static({
      merge: function (doc, dto) {
        // 把dto转成model
        mapper.map('dto', name, dto, doc);
        return doc;
      },
      ...Object.keys(BaseTable).reduce((fns, key) => {
        if (typeof BaseTable[key] === 'function') {
          return {
            ...fns,
            [key]: BaseTable[key]
          }
        }
        return fns;
      }, {})
    });

    //debug(schema)
    const fireAction = async (action, doc) => {
      if (typeof actionHandler[action] === 'function') {
        await actionHandler[action](doc);
      }
      if (typeof actionHandler['on'] === 'function') {
        await actionHandler['on'](action, doc);
      }
    }
    schema.pre('init', async (doc) => {
      await fireAction('init.before', doc);
    });
    schema.pre('validate', async (doc) => {
      await fireAction('validate.before', doc);
    });
    schema.pre('save', async (doc) => {
      await fireAction('save.before', doc);
    });
    schema.pre('remove', async (doc) => {
      await fireAction('remove.before', doc);
    });
    schema.post('init', async (doc) => {
      await fireAction('init.after', doc);
    });
    schema.post('validate', async (doc) => {
      await fireAction('validate.after', doc);
    });
    schema.post('save', async (doc) => {
      await fireAction('save.after', doc);
    });
    schema.post('remove', async (doc) => {
      await fireAction('remove.after', doc);
    });

    // 保存和删除统一提交，但是findAndUpdate啥的是直接提交
    const commits = [];
    // schema.pre('save', true, function (next, done) {
    //   next();
    //   commits.push(done);
    // });
    // schema.pre('remove', true, function (next, done) {
    //   next();
    //   commits.push(done);
    // });

    const model = mongoose.model(name, schema, name, {
      cache: false
    });
    model.commitAll = async () => {
      commits.forEach(done => done());
    };

    return model;
  }
}
