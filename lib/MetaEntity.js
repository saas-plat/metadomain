const Entity = require('sourced').Entity;
const i18n = require('./i18n');
const debug = require('debug')('saas-plat:MetaEntity');
const shortid = require('shortid');
const moment = require('moment');
const {
  Action
} = require('./Event');
const {
  BizError
} = require('./Error');
const {
  entityTypes,
  getMeta,
  createMapping,
  createObj,
  getRefrences,
  getFieldMapings,
  checkRequiredFieldMap,
  checkKeys,
  findField,
  getKeyPaths,
  createMappingProps,
  unionFields,
  filterValues,
  mapto,
  none,
  readonly,
  noenumerable,
  toFloat,
  diff
} = require('./util');
const _ = require('lodash');
const {
  RuleSet
} = require('./RuleSet');
const {
  t
} = require('./i18n');
const Inflectors = require("en-inflectors").Inflectors;

const EventDataObject = exports.EventDataObject = class EventDataObject {

  toJS() {
    return _.cloneDeep(this);
  }

  fromJS(data) {
    _.merge(this, data);
  }

  constructor(data) {
    this.fromJS(data);
  }

}

const initedSymbol = Symbol();
const syskeys = [
  'eventsToEmit', 'newEvents', 'replaying', 'snapshotVersion', 'timestamp', 'version', '_events', '_eventsCount', '_maxListeners',
  '_type', // 为了保存时存储一个类型
  '_id' // 为了保护id不能更新
];

const MetaEntity = exports.MetaEntity = class MetaEntity extends Entity {

  _createObj(withDefault = false) {
    return createObj({}, this.constructor.fields, {
      withDefault
    });
  }

  _merge(data, target) {
    mapto('dto', this.constructor.name, data, target || this);
    return target || this;
  }

  // 检查数据规则
  async checkData(data, opts = {}) {
    // todo https://github.com/yiminghe/async-validator?
    const rep = this.constructor.repository;
    for (let it of this.constructor.fields) {
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
        const exists = await (rep().getByIndex(it.key, val));
        if (exists) {
          throw new Error(r.message || (it.key + t('字段已经存在不能重复')));
        }
      }
    }
  }

  merge(snapshot) {
    this.id = snapshot.id;
    this._init();
    super.merge(snapshot);
  }

  isCustomMethod(method) {
    return this.constructor.actionMethods.indexOf(method) === -1;
  }

  replay(events) {
    this.id = events[0].id;
    this._init();
    // 自动生成自定义的事件处理器
    const customMethods = Array.from(new Set(events.map(evt => evt.method))).filter(method => typeof this[method] !== 'function');
    //debug('add handler...', customMethods);
    customMethods.forEach(method => {
      this[method] = this.customHandler.bind(this, method);
    });
    super.replay(events);
  }

  async _executeAction(before, doing, after, params, opts = {}) {
    debug('%s(%s) execute %s', this.constructor.name, this.id, doing, params);
    // before
    createMappingProps(params, this.constructor.mappings);
    await this.onAction(before, params);
    if ('id' in params && this.id){
      throw new BizError(t('实体id不能修改'));
    }
    // 需要在规则之后执行before默认行为
    let fnbefore = this['_' + before];
    if (fnbefore) {
      //debug('execute %s...', '_' + doing, changes);
      fnbefore = fnbefore.bind(this);
    }
    params = fnbefore ? (await fnbefore(params) || params) : params;

    // 自定义的行为不自动更新模型，需要规则触发更新数据
    let changes = {};
    const isCustom = this.isCustomMethod(doing);
    if (!isCustom) {
      changes = await this._executeDefault(params);
      // doing
      let fn = this['_' + doing];
      if (fn) {
        //debug('execute %s...', '_' + doing, changes);
        fn = fn.bind(this);
      }
      changes = fn ? (await fn(changes, params) || changes) : changes;
    }
    const changesObj = new EventDataObject(changes);
    await this.onAction(doing, params, changesObj);
    changes = changesObj.toJS();

    // 规则校验，把差异更新到实体上后检查实体对象是否符合schame规则
    const checkDatas = filterValues(this._merge(changes, this.toJS()));
    await this.checkData(checkDatas, opts);
    // after 触发回溯事件
    this.digest(after, changes);
    const handle = (!isCustom ? this[after].bind(this) : null) || this.customHandler.bind(this, after);
    handle(changes);

    // 不要调用emit，由commit保存成功后调用发送
    // event用扁平的对象发送
    // 这里做了引用类型数据裁剪是否合适？
    //changes = this._merge(changes, this._createObj());
    changes = toFloat({
      // id 必须提供
      id: this.id,
      ...changes,
    });
    this.enqueue(after, changes);
    debug('%s(%s) fire %s...', this.constructor.name, this.id, after, changes);
  }

  async _executeDefault(params) {
    let changes = filterValues(this._merge(params, this._createObj()));
    // 不需要计算差异需要保留所有的有用字段包括相同值的字段
    const diffs = changes; //diff(changes, this.toJS());
    // debug(11,params,changes)
    createMappingProps(diffs, this.constructor.mappings);
    return diffs;
  }

  // 自定义行为
  async customAction(method, args) {
    // 这里有个问题，这个method可以随意调用都会导致业务数据修改
    // 所以设计了默认自定义行为不自动生成changes，触发特性的规则里说需要修改才更新模型
    const doing = new Inflectors(method).toPresent();
    const before = new Inflectors(method).toGerund();
    const after = new Inflectors(method).toPast();
    await this._executeAction(before, doing, after, args);
  }

  async _executeHandler(method, data) {
    //  delete data.id; // id不能修改
    debug('%s(%s) handle %s...', this.constructor.name, this.id || '*REPLAY*', method, data);
    this._merge(data);
    await this.onAction(method, data);
  }

  customHandler(method, data) {
    this._executeHandler(method, data);
  }

  _init() {
    noenumerable(this, ...syskeys);
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
    const json = createObj({}, this.constructor.fields, {
      withDefault: false
    });
    mapto(this.constructor.name, 'dto', this, json);
    return json;
  }

  formJS(data) {
    mapto('dto', this.constructor.name, data, this);
  }

  toString() {
    return this.id;
  }

  static createSchame(BaseType, schame) {
    // 支持mapping字段对必要字段映射
    const defFields = getMeta(BaseType.fields, entityTypes);
    let fields = getMeta(schame, entityTypes);
    const mappings = getFieldMapings(fields, defFields);
    // 检查是否有字段缺失
    const {
      defectFields,
      errFields
    } = checkRequiredFieldMap(defFields, mappings, fields);
    if (errFields.length > 0) {
      debug(errFields)
      throw new Error(t('{{entityName}}类型实体缺少必要字段{{fields}}，或者{{checkKeys}}字段配置信息冲突', {
        entityName: BaseType.name,
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
    const references = getRefrences(fields);
    return {
      fields,
      conflicts,
      mappings,
      references
    };
  }

  static create(BaseType, name, schame, rules, eventHandler = {}, findRepository = none) {
    debug('----- %s(%s) -----', name, BaseType.name);
    const {
      fields,
      conflicts,
      references,
      mappings
    } = MetaEntity.createSchame(BaseType, schame);
    if (conflicts.length > 0) {
      throw new Error(t('系统字段{{keys}}冲突，请修改成其他名称!', {
        keys: conflicts.map(it => it.key).join(',')
      }))
    }
    createMapping(fields, name);
    const defaultProps = createObj({}, fields);
    //debug('defaultProps', defaultProps);

    debug('{', ...fields.map(it => it.key + ((it.key in references) ? ('(' + references[it.key] + ')') : '')), '}');

    const handleAction = async (action, data, ...datas) => {
      return await ruleset.execute([
        ...[action, // 所有行为
          BaseType.name + '.' + action, // 特定类型行为
          name + '.' + action // 特定对象行为
        ].map(action => (new Action(action, data))),
        ...datas
      ]);
    }

    const SpecificEntity = class extends BaseType {
      _init() {
        if (this[initedSymbol]) {
          return;
        }
        readonly(this, initedSymbol, true);
        super._init();
        // 绑定业务事件
        eventHandler = eventHandler || {};
        Object.keys(eventHandler).forEach(key => {
          this.on(key, eventHandler[key]);
        });
        (BaseType.eventTypes || []).forEach(key => {
          this.on(key, (...args) => eventHandler.on && eventHandler.on(key, ...args));
        })
        // 生成字段
        _.merge(this, defaultProps);
        // 生成快捷的mapping字段
        createMappingProps(this, mappings);
        // id不能修改
        this._protected(mappings.id || 'id');
      }

      async onAction(action, data, ...objs) {
        //  debug('%s(%s) on %s action...', this.constructor.name, this.id || '*REPLAY*', action)
        const fn = handleAction;
        return await fn(action, data, this, ...objs);
      }

      static async create(data = {}) {
        const {
          id,
          ...params
        } = data;
        const obj = new SpecificEntity();
        obj.id = id || shortid.generate();
        debug('----- %s(%s) instance -----', name, obj.id);
        // 创建默认值
        if (obj.create) {
          await obj.create(params);
        }
        return obj;
      }
    }

    readonly(SpecificEntity, 'fields', fields);
    readonly(SpecificEntity, 'references', references);
    readonly(SpecificEntity, 'mappings', mappings);
    readonly(SpecificEntity, 'repository', findRepository);

    // 规则引擎可以通过模型名获取模型
    readonly(SpecificEntity, 'name', name, true);

    // 注意这里是未每个类型创建一个ruleset，不是为每个实例创建
    // 实体本身的规则，但是这里需要测试一下看看性能问题，实体很多会创建很多引擎实例
    const ruleset = new RuleSet(name, rules, {
      Action,
      EventData: EventDataObject,
      Entity: SpecificEntity,
      [name]: SpecificEntity, //  这里就需要特定名称，这样能把所有规则执行不需要区分上下文环境
    });

    debug('--------------- END ------------------');

    return SpecificEntity;
  }
}
