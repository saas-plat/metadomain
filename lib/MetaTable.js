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
  checkRequiredFieldMap,
  createMappingProps,
  getFieldMapings,
  unionFields,
  createMapping,
  createObj,
  mapto,
  none,
} = require('./util');
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('mongodb connected.');
});

exports.connect = async () => {
  const url = 'mongodb://' + (process.env.MONGO_USER ? (encodeURIComponent(process.env.MONGO_USER) + ':' + encodeURIComponent(process.env.MONGO_PASSWORD) + '@') : '') +
    (process.env.MONGO_URL || (process.env.MONGO_PORT_27017_TCP_ADDR ? (process.env.MONGO_PORT_27017_TCP_ADDR + ':27017/query') : '') || "localhost/query");
  debug('connectting...', url);
  await mongoose.connect(url, {
    useNewUrlParser: true
  });
}

exports.close = async () => {
  await mongoose.disconnect();
}

const syskeys = [
  '_id'
];

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

const createVirtualProps = (schema, mappings) => {
  _.keys(mappings).forEach(mkey => {
    const userkey = mappings[mkey];
    let getfn, setfn;
    getfn = () => {
      // debug(mkey, '<=', userkey)
      return this[userkey];
    }
    if (typeof userkey === 'string') {
      // 不需要映射
      if (userkey === mkey) {
        return;
      }
      setfn = (value) => {
        // debug(mkey, '=>', userkey)
        this[userkey] = value;
      }
    } else if (_.isArray(userkey)) {
      const submapping = userkey[0];
      setfn = (value) => {
        // debug(mkey, '=>', userkey)
        if (!value) {
          this[mkey] = value;
        } else {
          // 在model上设置虚拟key但是在子对象上需要采用get和set属性
          this[mkey] = _.toArray(value).map(it => createMappingProps(it, submapping));
        }
      }
    } else if (_.isPlainObject(userkey)) {
      setfn = (value) => {
        // debug(mkey, '=>', userkey)
        // 在model上设置虚拟key但是在子对象上需要采用get和set属性
        this[mkey] = createMappingProps(_.toPlainObject(value), userkey);
      }
    }
    const virtual = schema.virtual(mkey);
    virtual.get(getfn);
    virtual.set(setfn);
  });
}

exports.MetaTable = class MetaTable {

  static createSchema(BaseTable, name, meta, ns) {
    const defFields = getMeta(BaseTable.fields, tableTypes);
    let fields = getMeta(meta, tableTypes);
    const mappings = getFieldMapings(fields, defFields);
    // 检查是否有字段缺失
    const {
      defectFields,
      errFields
    } = checkRequiredFieldMap(defFields, mappings, fields);
    if (errFields.length > 0) {
      debug(errFields)
      throw new Error(t('{{entityName}}类型数据缺少必要字段{{fields}}，或者{{checkKeys}}字段配置信息冲突', {
        entityName: BaseTable.name,
        fields: getKeyPaths(errFields).join(','),
        checkKeys: checkKeys.join(',')
      }));
    }
    // 缺失字段要是能补全自动补充
    if (defectFields.length > 0) {
      fields = unionFields(fields, defectFields);
    }
    // 检查是否有系统字段冲突情况
    const conflicts = fields.filter(it => {
      return syskeys.some(key => it.key === key);
    });
    //debug(fields);
    const sche = createDbSchema(fields);
    //debug(sche._mid);
    //debug(_.merge(getMeta(schame), defaultFields))
    const schema = mongoose.Schema(sche, {
      strict: true,
      useNestedStrict: true,
      minimize: false, // 保存空对象
      timestamps: false, // 不生成
      versionKey: false, // 不需要
      toJSON: {
        virtuals: false
      },
      toObject: {
        virtuals: false
      }
    });
    //debug(sche)

    return {
      fields,
      schema,
      conflicts,
      mappings
    };
  }

  static create(BaseTable, name, meta, rules, scope = {}, ns) {
    debug('----- %s(%s) -----', name, BaseTable.name);
    const {
      schema,
      fields,
      conflicts,
      mappings
    } = MetaTable.createSchema(BaseTable, name, meta, ns);
    if (conflicts.length > 0) {
      throw new Error(t('系统字段{{keys}}冲突，请修改成其他名称!', {
        keys: conflicts.map(it => it.key).join(',')
      }))
    }
    // 需要mapto，doc.set即可
    //createMapping(fields, name);
    createVirtualProps(schema, mappings);
    schema.loadClass(BaseTable);
    schema.name = (ns ? (ns + '.') : '') + name;
    schema.basename = (ns ? (ns + '.') : '') + BaseTable.name;
    schema.type = name;
    schema.basetype = BaseTable.name;
    schema.mappings = mappings;

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

    // this==Query对象
    // schema.pre('find', async function () {
    //   await fireAction('find', this);
    // });
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
      Table: model,
      [name]: model, //  这里就需要特定名称，这样能把所有规则执行不需要区分上下文环境
    }, scope);

    debug('--------------- END ------------------');

    return model;
  }
}
