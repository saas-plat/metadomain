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
  getRefrences,
  mapto,
  none,
  cutFields
} = require('./util');
const NodeCache = require("node-cache");
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('mongodb connected.');
});

const connect = async () => {
  const url = 'mongodb://' + (process.env.MONGO_USER ? (encodeURIComponent(process.env.MONGO_USER) + ':' + encodeURIComponent(process.env.MONGO_PASSWORD) + '@') : '') +
    (process.env.MONGO_URL || (process.env.MONGO_PORT_27017_TCP_ADDR ? (process.env.MONGO_PORT_27017_TCP_ADDR + ':27017/query') : '') || "localhost/query");
  debug('connectting...', url);
  await mongoose.connect(url, {
    useNewUrlParser: true
  });
}

const disconnect = async () => {
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
      // 查询模式是没有定义fields
      cutFields(ret, doc.schema.get('fields') || [], syskeys);
      return ret;
    }
  }
}

const cache = exports.TableCache = new NodeCache({
  stdTTL: process.env.TABLE_TIMEOUT || 60 * 60, // 1h
  useClones: false,
});
cache.on("expired", function (key, value) {
  debug('%s table expired...', key);
  delete mongoose.modelSchemas[key];
});
cache.on("flush", function () {
  debug('table flush...');
});

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
      // 这个是 mixed
      // schema[key] = {
      //   type:   createDbSchema(item.fields),
      //   default: undefined
      // };
      schema[key] = createDbSchema(item.fields);
      break;
    case 'reference':
      schema[key] = {
        type: mongoose.Schema.Types.ObjectId,
        ref: item.src,
      };
      break;
    case 'array':
      const subtype = (item.subtype) || (
        item.fields && item.fields.length > 0 ?
        'object' :
        'mixed');
      let subsche;
      switch (subtype) {
      case 'id':
        subsche = {
          type: mongoose.Schema.Types.ObjectId
        };
        break;
      case 'string':
        subsche = {
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
        // mixed改成子文档，要不gql无法查询子字段
        subsche = new mongoose.Schema(createDbSchema(item.fields), defOptions);
        break;
      case 'reference':
        subsche = {
          type: {
            type: mongoose.Schema.Types.ObjectId,
            ref: item.src,
          }
        };
        break;
      case 'array':
        subsche = {
          type: []
        };
        break;
      case 'number':
        subsche = {
          type: Number,
          default: defValue && Number(defValue),
          min: rules.min && Number(rules.min),
          max: rules.max && Number(rules.max)
        };
        break;
      case 'date':
        subsche = {
          type: Date,
          default: defValue && new Date(defValue),
          min: rules.min && Number(moment(rules.min).format()),
          max: rules.max && Number(moment(rules.max).format())
        };
        if (defValue === 'now') {
          subsche.default = Date.now;
        } else if (defValue) {
          subsche.default = moment(defValue).toDate();
        }
        break;
      case 'buffer':
        subsche = {
          type: Buffer
        };
        break;
      case 'boolean':
        subsche = {
          type: Boolean,
          default: Boolean(defValue)
        };
        break;
      case 'mixed':
      default:
        subsche = {
          type: mongoose.Schema.Types.Mixed,
          default: defValue
        };
        break;
      }
      // if (type === 'string' || type === 'number' || type === 'date' || type === 'boolean') {
      //   subsche.index = item.index;
      //   subsche.unique = item.unique;
      //   subsche.sparse = item.sparse;
      // }
      schema[key] = {
        type: [subsche],
        default: undefined,
        description: description,
      };
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
      } else if (defValue) {
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

const reduceSubPath = async (references, populateService, doc, subpaths, index = 0) => {
  const subpath = subpaths[index];
  if (index === subpaths.length - 1) {
    // 对象属性
    const kpath = subpath.startsWith('.') ? subpath.substr(1) : subpath;
    const id = _.get(doc, kpath);
    if (id) {
      const refdoc = await (await populateService(references[subpaths.join('[]')])).findById(id);
      doc.set(kpath, refdoc);
      if (doc[kpath] !== refdoc) {
        throw new Error(i18n.t('{{kpath}}引用类型无效', {
          kpath
        }));
      }
      debug('set %s=%o', kpath, refdoc);
    }
  } else {
    const docarr = _.get(doc, subpath);
    if (docarr) {
      if (subpaths[index + 1]) {
        // 数组中的对象的子属性
        for (const it of docarr) {
          await reduceSubPath(references, populateService, it, subpaths, index + 1);
        }
      } else {
        // 数组引用
        for (let i = 0; i < docarr.length; i++) {
          const id = docarr[i];
          if (id) {
            const refdoc = await (await populateService(references[subpaths.join('[]')])).findById(id);
            docarr[i] = refdoc;
            if (docarr[i] !== refdoc) {
              throw new Error(i18n.t('{{subpath}}[{{i}}]引用类型无效', {
                subpath,
                i
              }));
            }
            debug('populate %s[%n]=%o', subpath, i, refdoc);
          }
        }
      }
    }
  }
}

const populateReferencesHandler = async (references, populateService, ...docs) => {
  const paths = _.keys(references);
  for (const doc of docs) {
    if (doc) {
      debug('---- {%s} populate ----', doc._id);
      for (const path of paths) {
        // 这里是真对数组的拆分不是对象，拆分的每一项可以是一个对象路径
        const subpaths = path.split('[]')
        debug('%s populate...', path);
        await reduceSubPath(references, populateService, doc, subpaths);
        debug(doc)
      }
      debug('---- {%s} END ----', doc._id);
    }
  }
}

const getReferenceModel = async (refName, ns, getReferenceVersion, checkVersion = false) => {
  const refVersion = getReferenceVersion ? (await getReferenceVersion(refName)) : null;
  if (checkVersion && !refVersion) {
    throw new Error(t('引用对象{{refName}}无法获取版本号', {
      refName
    }));
  }
  debug('find %s_%s reference...', refName, refVersion, ns);
  const versionedName = refName + (refVersion ? '_' + refVersion : '');
  const model = cache.get(versionedName);
  const collectionName = (ns ? (ns + '.') : '') + refName;
  if (collectionName !== model.collection.name) {
    debug('%s subclass...', versionedName, collectionName);
    const newSchema = model.schema.clone();
    newSchema.set('ns', ns);
    newSchema.set('getReferenceVersion', getReferenceVersion);
    return model.__subclass(mongoose.connection, newSchema, collectionName);
  } else {
    return model;
  }
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
    const references = getRefrences(fields);
     if (!sche){
       throw new Error(i18n.t('数据Schema加载失败'));
     }
    const schema = new mongoose.Schema(sche, defOptions);
    //debug(sche)

    return {
      fields,
      schema,
      conflicts,
      mappings,
      references
    };
  }

  static create(BaseTable, name, meta, rules, opts = {}) {
    if (!name) {
      throw new Error(t('数据对象名称无效'))
    }
    const {
      scope,
      version,
      ns,
      query, // 查询模式
      populateReferences, // 填充引用对象
      getReferenceVersion, // 如果没有自定义populateService需要查询版本
      populateService,
      description
    } = {
      scope: {},
      query: false,
      populateReferences: false,
      ...opts
    };
    // 如果缓存有，版本一致不重建啦
    const versionedName = name + (version ? '_' + version : '');
    const collectionName = (ns ? (ns + '.') : '') + name;
    let model = cache.get(versionedName);
    if (model) {
      cache.ttl(versionedName);
      if (collectionName !== model.collection.name) {
        // 创建不同集合名称的子类
        debug('%s subclass...', versionedName, collectionName);
        // return mongoose.model(versionedName, newSchema, collectionName);
        // 这里采用创建subclass应该比新建model要快很多？
        model = model.__subclass(mongoose.connection, null, collectionName);
        model.ns = ns;
        model.getReferenceVersion = getReferenceVersion;
      }
      return model;
    }
    debug('----- %s(%s) -----', versionedName, BaseTable.name);
    const {
      schema,
      fields,
      conflicts,
      mappings,
      references
    } = MetaTable.createSchema(BaseTable, meta);

    if (!query) {
      if (conflicts.length > 0) {
        throw new Error(t('系统字段{{keys}}冲突，请修改成其他名称!', {
          keys: conflicts.map(it => it.key).join(',')
        }))
      }

      // 需要mapto，doc.set即可
      //createMapping(fields, name);
      createVirtualProps(schema, mappings);
      schema.loadClass(BaseTable);
      schema.set('key', versionedName);
      schema.set('name', name);
      schema.set('basename', BaseTable.name);
      schema.set('mappings', mappings);
      schema.set('references', references);
      schema.set('version', version);
      schema.set('fields', fields);
      schema.set('description', description);

      // 每个model不同，需要存储到model中
      // schema.set('ns', ns);
      // schema.set('getReferenceVersion', getReferenceVersion);

      schema.static('getReferenceModel', function (name) {
        return getReferenceModel(name, this.ns, this.getReferenceVersion, !!version);
      });

      const ruleset = new RuleSet(versionedName, rules, {
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
        await fireAction(this.ns, 'initing', this);
      });
      schema.pre('validate', async function () {
        await fireAction(this.ns, 'validating', this);
      });
      schema.pre('save', async function () {
        await fireAction(this.ns, 'saving', this);
      });
      schema.pre('remove', async function () {
        await fireAction(this.ns, 'removing', this);
      });
      schema.post('init', async (doc) => {
        await fireAction(this.ns, 'inited', doc);
      });
      schema.post('validate', async (doc) => {
        await fireAction(this.ns, 'validated', doc);
      });
      schema.post('save', async (doc) => {
        await fireAction(this.ns, 'saved', doc);
      });
      schema.post('remove', async (doc) => {
        await fireAction(this.ns, 'removed', doc);
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
    if (populateReferences) {
      // 自动填充引用类型
      // 由于没有cache model，mongoose的填充找不到model，所以我们自己做了个填充
      // schema.plugin(autopopulatePlugin);
      const populateServiceFn = populateService || (function (name) {
        return getReferenceModel(name, this.model.ns, this.model.getReferenceVersion, !!version)
      });
      schema.
      post('find', async function (docs) {
        await populateReferencesHandler(references, populateServiceFn.bind(this), ...docs);
        debug(docs)
      }).
      post('findOne', async function (doc) {
        await populateReferencesHandler(references, populateServiceFn.bind(this), doc);
      }).
      post('findOneAndUpdate', async function (doc) {
        await populateReferencesHandler(references, populateServiceFn.bind(this), doc);
      });
    }

    // 这里collectionName是第一创建的model的集合，要是不同租户不同需要改成model子类保证集合不同
    // name 不能是 versionedName，要不引用类型填充失败
    model = mongoose.model(name, schema, collectionName, {
      cache: false // 重建会报错
    });

    model.ns = ns;
    model.getReferenceVersion = getReferenceVersion;
    // model.commitAll = async () => {
    //   commits.forEach(done => done());
    // };

    cache.set(versionedName, model);
    debug('--------------- END ------------------');

    return model;
  }
}

exports.MetaTable.disconnect = disconnect;
exports.MetaTable.connect = connect;
