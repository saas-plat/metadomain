const Entity = require('sourced').Entity;
const i18n = require('./i18n');
const debug = require('debug')('saas-plat:MetaEntity');
const shortid = require('shortid');
const {
  Action,
  Event
} = require('./Event');
const {
  BizError
} = require('./Error');
const {
  filterValues,
  toFloat,
  diff,
  none,
  readonly,
  noenumerable,
} = require('./util');
const _ = require('lodash');
const {
  t
} = require('./i18n');
const Inflectors = require("en-inflectors").Inflectors;
const NodeCache = require("node-cache");

const initedSymbol = Symbol();

const cache = exports.EntityCache = new NodeCache({
  stdTTL: process.env.ENTITY_TIMEOUT || 60 * 60, // 1h
  useClones: false,
});
cache.on("expired", function (key, value) {
  debug('%s entity expired...', key);
});
cache.on("flush", function () {
  debug('entity flush...');
});

const entities = new Map();

const getType = exports.getType = (type) => {
  const Model = entities.get(type) || MetaEntity;
  return Model;
}

exports.register = (Entities) => {
  const keys = Object.keys(Entities);
  for (const name of keys) {
    if (!name) {
      console.error('entity can not be register');
      return;
    }
  }
  for (const name of keys) {
    let type = name;
    // 首字母大写
    type = type[0].toUpperCase() + type.substr(1);
    entities.set(type, Entities[name]);
  }
}

const MetaEntity = exports.MetaEntity = class MetaEntity extends Entity {

  _createObj(withDefault = false) {
    return this.constructor.schema.createObject({
      withDefault
    });
  }

  _merge(data, target) {
    this.constructor.maptoModel(data, target || this);
    return target || this;
  }

  // 检查数据规则
  async validate(data, opts = {}) {
    // todo https://github.com/yiminghe/async-validator?
    const rep = this.constructor.repository;
    for (let it of this.constructor.schema.fields) {
      const val = data[it.key];
      const rules = it.rules || {};
      const r = _.keys(rules).filter(key => opts[key] !== false).reduce((ret, key) => ({
        ...ret,
        [key]: rules[key]
      }), {});
      if (r.required || r.unique) {
        if (val === undefined || val === null) {
          throw new Error(r.message || (it.key + t('字段不能为空')))
        }
      }
      // 其他类型为空不需要检查
      if (val === undefined || val === null) {
        return;
      }
      if (r.type) {
        let ok = true;
        if (r.type === 'reference') {
          ok = typeof val === 'object';
        } else if (r.type === 'array') {
          ok = Array.isArray(val);
        } else {
          ok = typeof val === r.type;
        }
        if (!ok) {
          throw new Error(r.message || (it.key + t('字段类型必须是') + r.type))
        }
      }
      if (r.enum) {
        if (r.enum.indexOf(val) === -1) {
          throw new Error(r.message || (it.key + t('字段必须包含在') + r.enum.join(',')))
        }
      }
      if (r.len) {
        if (val.length !== r.len) {
          throw new Error(r.message || (it.key + t('字段长度不等于') + r.len))
        }
      }
      if (r.pattern) {
        if (!val && !val.toString().match(Regex(r.pattern))) {
          throw new Error(r.message || (it.key + t('字段格式不符合规则')))
        }
      }
      const isString = typeof val === 'string';
      if (r.min) {
        if (isString ? val.length < r.min : val < r.min) {
          throw new Error(r.message || (it.key + (isString ? t('字段长度不能小于最小长度') : t('字段值不能小于最小值')) + r.min))
        }
      }
      if (r.max) {
        if (isString ? val.length > r.max : val > r.max) {
          throw new Error(r.message || (it.key + (isString ? t('字段长度不能大于最大长度') : t('字段值不能超过最大值')) + r.max))
        }
      }
      //采用mongodb的createIndex
      if (r.unique) {
        if (!rep) {
          throw new Error((it.key + t('字段重复性无法检测')));
        }
        const exists = await (rep({
          ns: this._ns
        }).getByIndex(it.key, val));
        if (exists) {
          throw new Error(r.message || (it.key + t('字段已经存在不能重复')));
        }
      }
    }
  }

  merge(snapshot) {
    this.id = snapshot.id;
    this._ns = snapshot._ns;
    this._init();
    super.merge(snapshot);
  }

  snapshot() {
    const snap = super.snapshot();
    snap.version = this.version;
    snap.snapshotVersion = this.snapshotVersion;
    snap._ns = this._ns;
    return snap;
  }

  isCustomMethod(method) {
    return this.constructor.actionMethods.indexOf(method) === -1;
  }

  replay(events) {
    if (events.length > 0) {
      this.id = events[0].id;
      this._ns = events[0]._ns;
    }
    this._init();
    // 自动生成自定义的事件处理器
    const customMethods = Array.from(new Set(events.map(evt => evt.method))).filter(method => typeof this[method] !== 'function');
    //debug('add handler...', customMethods);
    customMethods.forEach(method => {
      Object.defineProperty(this, method, {
        configrable: true,
        enumerable: false,
        writable: true,
        value: this.customHandler.bind(this, method)
      })
    });
    super.replay(events);
  }

  async _executeAction(before, doing, after, params, opts = {}) {
    debug('%s(%s) execute %s...%o', this.constructor.key, this.id, doing, params);
    // before
    this.constructor.schema.createMappingProps(params);
    await this.onAction(before, params);
    if (params.id && this.id) {
      debug(params)
      throw new BizError(t('实体id不能修改'));
    }
    // 需要在规则之后执行before默认行为
    let fnbefore = this['_' + before];
    if (fnbefore) {
      //debug('execute %s...', '_' + doing, params);
      fnbefore = fnbefore.bind(this);
    }
    params = fnbefore ? (await fnbefore(params) || params) : params;

    // 自定义的行为不自动更新模型，需要规则触发更新数据
    let eventData = {};
    const isCustom = this.isCustomMethod(doing);
    if (!isCustom) {
      eventData = await this._executeDefault(params);
    }
    // doing
    let fn = this['_' + doing];
    if (fn) {
      //debug('execute %s...', '_' + doing, eventData);
      fn = fn.bind(this);
    }
    eventData = fn ? (await fn(eventData, params) || eventData) : eventData;
    // 规则引擎需要通过类型获取对象，所以这里包装了一下
    // doing不应该触发规则执行，规则应该只能附加在前处理和后处理，行为才是执行中
    // const eventObj = new EventData(eventData);
    // await this.onAction(doing, params, eventObj);
    // eventData = eventObj.toJS();

    // 规则校验，把差异更新到实体上后检查实体对象是否符合schema规则
    const checkDatas = filterValues(this._merge(eventData, this.toJS()));
    await this.validate(checkDatas, opts);
    // after 触发回溯事件
    this.digest(after, eventData);
    const handle = (!isCustom ? this[after].bind(this) : null) || this.customHandler.bind(this, after);
    handle(eventData);

    // 不要调用emit，由commit保存成功后调用发送
    // event用扁平的对象发送
    // 这里做了引用类型数据裁剪是否合适？
    //const cutEventData = this._merge(eventData, this._createObject());
    const floatEventData = toFloat({
      // id 必须提供
      id: this.id,
      ...eventData,
    });
    this.enqueue(after, floatEventData);
    debug('%s(%s) fire %s...%o', this.constructor.key, this.id, after, floatEventData);
  }

  // 默认的行为就是把相同字段更新到eventdata上
  async _executeDefault(params) {
    params = this._executeDefaulting ? await this._executeDefaulting(params) : params;
    // 自动将同名参数装车eventData
    const eventData = filterValues(this._merge(params, this._createObj()));
    //  debug(44,eventData)
    // 不需要计算差异需要保留所有的有用字段包括相同值的字段
    //const diffs = eventData; //diff(eventData, this.toJS());
    this.constructor.schema.createMappingProps(eventData);
    return this._executeDefaulted ? (await this._executeDefaulted(eventData) || eventData) : eventData;
  }

  // 自定义行为
  async customAction(method, args) {
    if (method.startsWith('_')) {
      throw new Error(t('实体行为{{method}}不能以"_"开头', {
        method
      }))
    }
    // 这里有个问题，这个method可以随意调用都会导致业务数据修改
    // 所以设计了默认自定义行为不自动生成eventData，触发特性的规则里说需要修改才更新模型
    const doing = new Inflectors(method).toPresent();
    const before = new Inflectors(method).toGerund();
    const after = new Inflectors(method).toPast();
    await this._executeAction(before, doing, after, args);
  }

  // 默认的handle行为，把同名eventdata更新到entity上
  async _executeHandler(method, eventData) {
    //  delete eventData.id; // id不能修改
    debug('%s(%s) handle %s...%o', this.constructor.key, this.id || '*REPLAY*', method, eventData);
    this._merge(eventData);
    // 规则需要类型判断所以包装了一下
    const eventObj = new Event(method, eventData);
    await this.onAction(method, eventData, eventObj);
  }

  customHandler(method, data) {
    this._executeHandler(method, data);
  }

  _init() {
    noenumerable(this, ...this.constructor.schema.syskeys);
  }

  _protected(idMapping) {
    delete this[idMapping];
    Object.defineProperty(this, idMapping, {
      get: () => {
        return this._id;
      },
      set: (id) => {
        if (this._id !== undefined && this._id !== id) {
          debug(this._id, '<=', id)
          throw new BizError(t('实体id不能修改', {
            cur: this._id,
            val: id
          }));
        }
        this._id = id;
      },
      enumerable: true,
      configurable: false
    });
  }

  constructor(...args) {
    super(...args);
    this._init();
  }

  toJS() {
    const dto = this.constructor.schema.createObject({
      withDefault: false
    });
    this.constructor.shcema.maptoDto(this, dto);
    return dto;
  }

  formJS(dto) {
    this.constructor.shcema.maptoModel(dto, this);
  }

  toString() {
    return this.id;
  }

  static createModel(name, schema, opts = {}) {
    if (!name) {
      throw new Error(t('实体名称无效'))
    }
    const {
      onBeforeExecute,
      onAfterExecute,
      eventHandler = {},
      actionHandler,
      findRepository = none,
      version,
      strongNs = false
    } = opts;
    const ukey = name + (version ? '_' + version : '');
    debug('----- %s(%s) -----', ukey, schema.type);
    const entityType = cache.get(ukey);
    if (entityType) {
      cache.ttl(ukey);
      debug('--------------- From Cache ------------------');
      return entityType;
    }
    if (schema.conflicts.length > 0) {
      throw new Error(t('系统字段{{keys}}冲突，请修改成其他名称!', {
        keys: schema.conflicts.map(it => it.key).join(',')
      }))
    }

    debug('{', ...schema.fields.map(it => it.key + ((it.key in schema.references) ? ('(' + schema.references[it.key] + ')') : '')), '}');

    schema.createMapping(ukey);
    const defaultProps = schema.createObject();
    //debug('props', props);

    const BaseType = getType(schema.type);
    if (!BaseType) {
      throw new Error(t('实体类型{{type}}尚未支持', schema));
    }
    const SpecificEntity = class extends BaseType {
      _init() {
        if (this[initedSymbol]) {
          return;
        }
        readonly(this, initedSymbol, true);
        super._init();
        // 绑定业务事件
        Object.keys(eventHandler).forEach(key => {
          this.on(key, eventHandler[key]);
        });
        (BaseType.eventTypes || []).forEach(key => {
          this.on(key, (...args) => eventHandler.on && eventHandler.on(key, ...args));
        })
        // 生成字段
        _.merge(this, defaultProps);
        // 生成快捷的mapping字段
        schema.createMappingProps(this);
        // id不能修改
        this._protected(schema.mappings.id || 'id');
      }

      async _executeAction(before, doing, after, params, opts = {}) {
        if (onBeforeExecute) {
          await onBeforeExecute(this, doing, params, opts);
        }
        await super._executeAction(before, doing, after, params, opts);
        if (onAfterExecute) {
          await onAfterExecute(this, doing, params, opts);
        }
      }

      async onAction(action, data, ...objs) {
        //  debug('%s(%s) on %s action...', this.constructor.key, this.id || '*REPLAY*', action)
        if (!actionHandler) {
          return
        }
        let ns = this._ns;
        // 规则key不需要带环境，环境取决加载的规则范围
        ns = ns ? ns.split('/')[0] : ns;
        const actions = [action, // 所有行为
          schema.type + '.' + action, // 特定类型行为
          name + '.' + action, // 特定对象行为
        ];
        const nsActions = ns ? [
          ns + '.' + action, // 特定范围所有行为
          ns + '.' + schema.type + '.' + action, // 特定范围类型行为
          ns + '.' + name + '.' + action, // 特定范围内行为
        ] : [];
        await actionHandler([
          ...actions.concat(nsActions).map(action => (new Action(action, data))),
          this, ...objs
        ]);
      }

      static async create(data = {}, options = {}) {
        if (strongNs && (!options || !options.ns)) {
          throw new Error(t('实体命名空间未知'))
        }
        const idKey = schema.mappings.id || 'id';
        const id = data[idKey];
        delete data[idKey];
        const obj = new SpecificEntity();
        obj._ns = options.ns;
        obj.id = id || shortid.generate();
        debug('----- %s(%s) instance -----', ukey, obj.id);
        // 创建默认值
        if (obj.create) {
          await obj.create(data);
        }
        return obj;
      }
    }

    // 把第一级的自定义行为放在原型上,减少创建次数
    for (const {
        key,
        handle
      } of schema.actions) {
      if (key.startsWith('_')) {
        throw new Error(t('实体行为{{key}}不能以"_"开头', {
          key
        }));
      }
      if (_.hasIn(SpecificEntity.prototype, key)) {
        throw new Error(t('自定义行为{{key}}和系统行为冲突', {
          key
        }));
      }
      if (_.hasIn(SpecificEntity.prototype, '_' + key)) {
        throw new Error(t('自定义行为{{key}}和系统行为冲突', {
          key: '_' + key
        }));
      }
      const doing = new Inflectors(key).toPresent();
      const before = new Inflectors(key).toGerund();
      const after = new Inflectors(key).toPast();
      SpecificEntity.prototype['_' + doing] = handle;
      SpecificEntity.prototype[key] = async function (...args) {
        await this._executeAction(before, doing, after, ...args);
      }
      debug('carete custom action: %s ...', key);
    }

    readonly(SpecificEntity, 'schema', schema);
    readonly(SpecificEntity, 'actionMethods', BaseType.actionMethods);
    readonly(SpecificEntity, 'eventTypes', BaseType.eventTypes);
    readonly(SpecificEntity, 'repository', findRepository);

    // 规则引擎可以通过模型名获取模型
    readonly(SpecificEntity, 'version', version);
    readonly(SpecificEntity, 'name', name);
    readonly(SpecificEntity, 'key', ukey);
    readonly(SpecificEntity, 'service', schema.type.replace('Data', 'Service'));

    // if (rules) {
    //   // 注意这里是未每个类型创建一个ruleset，不是为每个实例创建
    //   // 实体本身的规则，但是这里需要测试一下看看性能问题，实体很多会创建很多引擎实例
    //   ruleset = new RuleSet(ukey, rules, {
    //     Action,
    //     Event: Event, // event data不是event没有name，而且可以修改
    //     Entity: SpecificEntity,
    //     [name]: SpecificEntity, //  这里就需要特定名称，这样能把所有规则执行不需要区分上下文环境
    //   }, scope);
    // }

    cache.set(ukey, SpecificEntity);
    debug('--------------- END ------------------');

    return SpecificEntity;
  }
}
