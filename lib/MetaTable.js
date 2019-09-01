const nools = require('nools');
const debug = require('debug')('saas-plat:MetaTable');
const _ = require('lodash');
const i18n = require('./i18n');
const mongoose = require('mongoose');
const moment = require('moment');
const {
  RuleSet
} = require('./RuleSet');
const {
  Action
} = require('./Event');
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
  const schema = {};
  obj && obj.forEach(item => {
    const type = item.type;
    const key = item.key;
    const defValue = item.defValue;
    const rules = item.rules || {};
    switch (type) {
    case 'id':
      schema[key] = {
        type: mongoose.Schema.Types.ObjectId,
      };
      break;
    case 'string':
      schema[key] = {
        type: String,
        default: defValue && String(defValue),
        lowercase: rules.lowercase && Boolean(rules.lowercase),
        uppercase: rules.uppercase && Boolean(rules.uppercase),
        trim: rules.trim && Boolean(rules.trim),
        match: rules.match && new RegExp(rules.match || rules.pattern),
        enum: rules.enum && Array(rules.enum)
      };
      break;
    case 'object':
      schema[key] = createDbSchema(item.fields)
      break;
    case 'array':
      const subtype = (item.subtype) || (
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
      schema[key] = [itemtype];
      break;
    case 'number':
      schema[key] = {
        type: Number,
        default: defValue && Number(defValue),
        min: rules.min && Number(rules.min),
        max: rules.max && Number(rules.max)
      };
      break;
    case 'date':
      schema[key] = {
        type: Date,
        min: rules.min && Number(moment(rules.min).format()),
        max: rules.max && Number(moment(rules.max).format())
      };
      if (defValue === 'now') {
        schema[key].default = Date.now;
      } else {
        schema[key].default = moment(defValue).toDate();
      }
      break;
    case 'buffer':
      schema[key] = {
        type: Buffer
      };
      break;
    case 'boolean':
      schema[key] = {
        type: Boolean,
        default: Boolean(defValue)
      };
      break;
    case 'mixed':
    default:
      schema[key] = {
        type: mongoose.Schema.Types.Mixed,
        default: defValue
      };
      break;
    }
    if (type === 'string' || type === 'number' || type === 'date' || type === 'boolean') {
      schema[key].index = item.index;
      schema[key].unique = item.unique;
      schema[key].sparse = item.sparse;
    }
    schema[key] = _.omitBy(schema[key], _.isUndefined);
  });
  return schema;
}

exports.MetaTable = class MetaTable {

  static createSchema(BaseTable, name, meta, ns) {
    name = name || assignId('Table');
    debug('----- %s(%s) -----', name, BaseTable.name);
    const fields = getMeta(meta, tableTypes).concat([
      ...Object.keys(BaseTable.fields).map(key => ({
        key,
        type: BaseTable.fields[key]
      }))
    ]);
    //debug(fields);
    createMapping(fields, name);
    const sche = createDbSchema(fields);
    //debug(sche._mid);
    //debug(_.merge(getMeta(schame), defaultFields))

    //debug(sche)
    const schema = mongoose.Schema(sche, {
      //timestamps: true,
      //versionKey: '__v'
    });
    return schema;
  }

  static create(BaseTable, name, meta, rules, scope = {}, ns) {
    const schema = MetaTable.createSchema(BaseTable, name, meta, ns);
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
      debug('on %s action...', action, doc);
      const nsEvents = ns ? [
        ns + '.' + action, // 特定范围所有行为
        ns + '.' + BaseTable.name + '.' + action, // 特定范围一类行为
        ns + '.' + name + '.' + action // 特定范围特定行为
      ] : [];
      const events = [
        action, // 所有行为
        BaseTable.name + '.' + action, // 一类行为
        name + '.' + action // 特定行为
      ].concat(nsEvents).map(name => (new Action(name)));
      await ruleset.execute([doc]);
    }
    schema.pre('init', async function () {
      await fireAction('initing', this);
    });
    schema.pre('validate', async function () {
      await fireAction('validating', this);
    });
    schema.pre('save', async function () {
      await fireAction('saving', this);
    });
    schema.pre('remove', async function () {
      await fireAction('removing', this);
    });
    schema.post('init', async (doc) => {
      await fireAction('inited', doc);
    });
    schema.post('validate', async (doc) => {
      await fireAction('validated', doc);
    });
    schema.post('save', async (doc) => {
      await fireAction('saved', doc);
    });
    schema.post('remove', async (doc) => {
      await fireAction('removed', doc);
    });

    // 保存和删除统一提交，但是findAndUpdate啥的是直接提交
    // const commits = [];
    // schema.pre('save', true, function (next, done) {
    //   next();
    //   commits.push(done);
    // });
    // schema.pre('remove', true, function (next, done) {
    //   next();
    //   commits.push(done);
    // });
    // schema.pre('find', true, function (next, done) {
    //   next();
    //   commits.push(done);
    // });
    const model = mongoose.model(name, schema, (ns ? ns + '.' : '') + name, {
      cache: false // 没有传入版本号
    });
    // model.commitAll = async () => {
    //   commits.forEach(done => done());
    // };

    const ruleset = new RuleSet(name, rules, {
      Action,
      Document: mongoose.Document,
      [name]: model, //  这里就需要特定名称，这样能把所有规则执行不需要区分上下文环境
    }, scope);

    debug('--------------- END ------------------');

    return model;
  }
}
