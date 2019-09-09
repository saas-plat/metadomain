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
  cutFields
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

const defOptions = {
  strict: true,
  useNestedStrict: true,
  minimize: false, // 保存空对象
  timestamps: false, // 不生成
  versionKey: false, // 不需要
  toJSON: {
    virtuals: false,
    transform: function (doc, ret, options) {
      syskeys.forEach((prop) => {
        delete ret[prop];
      });
      return ret;
    }
  },
  toObject: {
    virtuals: false,
    transform: function (doc, ret, options) {
      cutFields(ret, doc.schema.get('fields'), syskeys);
      return ret;
    }
  }
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
  const schema = {};
  obj && obj.forEach(item => {
    const type = item.type;
    const key = item.key;
    const defValue = item.defValue;
    const rules = item.rules || {};
    const description = item.description;
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
      schema[key] = createDbSchema(item.fields);
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
        itemtype = new mongoose.Schema(createDbSchema(item.fields, defOptions));
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
      const subsche = {
        type: itemtype
      }
      if (type === 'string' || type === 'number' || type === 'date' || type === 'boolean') {
        subsche.index = item.index;
        subsche.unique = item.unique;
        subsche.sparse = item.sparse;
      }
      subsche.description = description;
      schema[key] = [subsche];
      return; // 数组不需要额外处理
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
    schema[key].description = description;
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

  static createSchema(BaseTable, meta) {
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
    const sche = createDbSchema(fields);
    //debug(sche._mid);
    //debug(_.merge(getMeta(schame), defaultFields))
    const schema = new mongoose.Schema(sche, defOptions);
    //debug(sche)

    return {
      fields,
      schema,
      conflicts,
      mappings
    };
  }

  static create(BaseTable, name, meta, rules, opts = {}) {
    if (!name) {
      throw new Error(t('数据对象名称无效'))
    }
    const {
      scope = {},
        version = 'v0',
        ns,
        onlyQuery = false,
        description
    } = opts;
    // 如果缓存有，版本一致不重建啦
    const collectionName = (ns ? (ns + '.') : '') + name;
    if (mongoose.modelNames().indexOf(name) > -1) {
      const model = mongoose.model(name);
      if (model.schema.version === version) {
        if (collectionName !== model.collection.name) {
          // 创建不同集合名称的子类
          const newSchema = model.schema.clone();
          newSchema.set('ns', ns);
          return mongoose.model(name, newSchema, collectionName);
        }
        return model;
      }
    }
    debug('----- %s(%s)%s -----', name, BaseTable.name, version);
    const {
      schema,
      fields,
      conflicts,
      mappings
    } = MetaTable.createSchema(BaseTable, meta);

    if (!onlyQuery) {
      if (conflicts.length > 0) {
        throw new Error(t('系统字段{{keys}}冲突，请修改成其他名称!', {
          keys: conflicts.map(it => it.key).join(',')
        }))
      }

      // 需要mapto，doc.set即可
      //createMapping(fields, name);
      createVirtualProps(schema, mappings);
      schema.loadClass(BaseTable);
      schema.set('name', name);
      schema.set('basename', BaseTable.name);
      schema.set('mappings', mappings);
      schema.set('version', version);
      schema.set('fields', fields);
      schema.set('ns', ns);
      schema.set('description', description);

      const ruleset = new RuleSet(name, rules, {
        Action,
        Document: mongoose.Document,
      }, {
        ...scope,
        // Table: model,
        // [name]: model, //  这里就需要特定名称，这样能把所有规则执行不需要区分上下文环境
      });

      //debug(schema)
      const fireAction = async (ns, action, doc) => {
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
        await fireAction(this.schema.get('ns'), 'initing', this);
      });
      schema.pre('validate', async function () {
        await fireAction(this.schema.get('ns'), 'validating', this);
      });
      schema.pre('save', async function () {
        await fireAction(this.schema.get('ns'), 'saving', this);
      });
      schema.pre('remove', async function () {
        await fireAction(this.schema.get('ns'), 'removing', this);
      });
      schema.post('init', async (doc) => {
        await fireAction(doc.schema.get('ns'), 'inited', doc);
      });
      schema.post('validate', async (doc) => {
        await fireAction(doc.schema.get('ns'), 'validated', doc);
      });
      schema.post('save', async (doc) => {
        await fireAction(doc.schema.get('ns'), 'saved', doc);
      });
      schema.post('remove', async (doc) => {
        await fireAction(doc.schema.get('ns'), 'removed', doc);
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
    }

    // 这里collectionName是第一创建的model的集合，要是不同租户不同需要改成model子类保证集合不同
    const model = mongoose.model(name, schema, collectionName, {
      cache: false // 重建会报错
    });
    // model.commitAll = async () => {
    //   commits.forEach(done => done());
    // };

    debug('--------------- END ------------------');

    return model;
  }
}
