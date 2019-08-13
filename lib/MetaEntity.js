const Entity = require('sourced').Entity;
const i18n = require('./i18n');
const debug = require('debug')('saas-plat:MetaEntity');
const shortid = require('shortid');
const moment = require('moment');
const {
  Event
} = require('./Event');
const {
  entityTypes,
  getMeta,
  createMapping,
  createObj,
  getRefrences,
  mapto,
  none,
  readonly,
  noenumerable,
} = require('./util');
const _ = require('lodash');
const {
  RuleSet
} = require('./RuleSet');
const {
  Repository
} = require('./Repository');
const {
  t
} = require('./i18n');
const Inflectors = require("en-inflectors").Inflectors;

const DataObject = exports.DataObject = class DataObject {

  toJS() {
    return _.cloneDeep(this);
  }

  fromJS(data) {
    _.merge(this, data);
  }

  constructor(data) {
    this.fromJS(data);
  }

  static create(name, data) {
    // class SpecificDataObject extends DataObject {};
    // readonly(SpecificDataObject, 'name', name);
    const obj = new DataObject(data);
    readonly(obj, '$name', name);
    return obj;
  }
}

const initedSymbol = Symbol();
const actionSymbol = Symbol();
const handlerSymbol = Symbol();

exports.action = (target, name) => {
  target[actionSymbol].push(name);
}
exports.handler = (target, name) => {
  target[handlerSymbol].push(name);
}

exports.MetaEntity = class MetaEntity extends Entity {

  _createObj() {
    return createObj({}, this.constructor.fields);
  }

  _merge(data, target) {
    mapto('dto', this.constructor.name, data, target || this);
  }

  merge(snapshot) {
    this._init();
    super.merge(snapshot);
  }

  isCustomMethod(method) {
    return this[actionSymbol].indexOf(method) === -1;
  }

  replay(evnts) {
    this._init();
    // 自动生成自定义的事件处理器
    const customMethods = Array.from(new Set(events.map(evt => evt.method))).filter(method => typeof this[method] !== 'function');
    debug('create handler...', customMethods);
    customMethods.forEach(method => {
      this[method] = this.customHandler.bind(method);
    });
    super.replay(evnts);
  }

  async _executeAction(before, doing, after, params) {
    debug('action...', before, doing, after);
    // before
    const paramsObj = DataObject.create('params', params);
    await this.onAction(before, paramsObj);

    // 自定义的行为不自动更新模型，需要规则触发更新数据
    let changes = {};
    const isCustom = this.isCustomMethod(doing);
    if (!isCustom) {
      // doing
      changes = await this._executeDefault(doing, paramsObj.toJS());
    }
    const changesObj = DataObject.create('changes', changes);
    await this.onAction(doing, changesObj, paramsObj);
    changes = changesObj.toJS();
    // 规则校验
    changes = this.checkData(changes);
    // after 触发回溯事件
    this.digest(after, changes);
    const handle = (!isCustom ? this[after] : null) || this.customHandler.bind(after);
    handle(changes);
    // event用扁平的对象发送
    // 不要调用emit，由commit保存成功后调用发送
    this.enqueue(after, toFloat({
      $id: this.id,
      ...changes
    }));
    debug('fire ' + after);
  }

  async _executeDefault(doing, params) {
    let saves = this._createObj();
    this._merge(paramsObj, saves);
    saves = _.omitBy(saves, _.isUndefined);
    // 转换数据类型
    saves = this.formatData(saves);
    //debug(saves)
    // 计算更新差异
    return diff(saves, this);
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

  customHandler(method, data) {
    debug('handle %s...', method);
    this._merge(data, this);
  }

  // 转换数据类型
  formatData(data) {
    const formatData = {};
    for (let it of this.constructor.fields) {
      switch (it.type) {
      case 'string':
        formatData[it.key] = _.toString(data[it.key]);
        break;
      case 'object':
      case 'reference':
        formatData[it.key] = _.toPlainObject(data[it.key]);
        break;
      case 'array':
        formatData[it.key] = _.toArray(data[it.key]);
        break;
      case 'number':
        formatData[it.key] = _.toNumber(data[it.key]);
        break;
      case 'boolean':
        formatData[it.key] = !!data[it.key];
        break;
      case 'date':
        formatData[it.key] = moment(data[it.key]).toDate();
        break;
      default:
        formatData[it.key] = data[it.key];
      }
    }
    return formatData;
  }

  // 检查数据规则
  checkData(data) {
    // todo https://github.com/yiminghe/async-validator?
    for (let it of this.constructor.fields) {
      const val = data[it.key]
      const r = it.rules;
      if (r.required) {
        if (val === undefined || val === null) {
          throw new Error(r.message || (it.key + t('字段不能为空')))
        }
      }
      if (r.type) {
        if (typeof val !== r.type === 'reference' ? 'object' : r.type) {
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
          throw new Error(r.message || (it.key + isString ? t('字段长度不能小于最小长度') : t('字段值不能小于最小值') + r.min))
        }
      }
      if (r.max) {
        if (isString ? val.length > r.max : val > r.max) {
          throw new Error(r.message || (it.key + isString ? t('字段长度不能大于最大长度') : t('字段值不能超过最大值') + r.max))
        }
      }
      if (r.unique) {
        const exists = Repository.create(this.constructor).getAll().some(it => it[it.key] === val);
        if (exists) {
          throw new Error(r.message || (it.key + t('字段已经存在不能重复')));
        }
      }
    }
  }

  _init() {
    readonly(this, actionSymbol, []);
    readonly(this, handlerSymbol, []);
    noenumerable(this, 'eventsToEmit', 'newEvents', 'replaying', 'snapshotVersion', 'timestamp', 'version', '_events', '_eventsCount', '_maxListeners');
  }

  constructor(...args) {
    super(...args);
    this._init();
  }

  toJS() {
    const json = createObj({}, this.constructor.fields);
    mapto(this.constructor.name, 'dto', this, json);
    return json;
  }

  formJS(data) {
    mapto('dto', this.constructor.name, data, this);
  }

  static create(BaseType, name, schame, ruleHandler = {}, eventHandler = {}) {
    debug('%s(%s)', name, BaseType.name, schame);
    const fields = getMeta({
      ...schame,
      ...(BaseType.fields || {})
    },entityTypes);
    debug('create', name, fields);
    createMapping(fields, name);
    const defaultProps = createObj({}, fields);
    debug('defaultProps', defaultProps);
    const references = getRefrences(fields);
    debug('references', references);

    const handleAction = async (action, ...datas) => {
      const fn = ruleHandler[action];
      if (typeof fn === 'function'){
        await fn(...datas);
      }
      await ruleHandler.on(action, ...datas);
    }

    const SpecificEntity = class extends BaseType {
      _init() {
        if (this[initedSymbol]) {
          return;
        }
        readonly(this, initedSymbol, true);
        super._init();
        // 绑定业务事件
        Object.keys(eventHandler || {}).forEach(key => {
          this.on(key, eventHandler[key]);
        });
        (BaseType.eventTypes || []).forEach(key => {
          this.on(key, (...args) => eventHandler.on(key, ...args));
        })
        // 生成字段
        _.merge(this, defaultProps);
        // 生成业务行为和事件处理

        debug('%s created', name);
      }

      async onAction(action, ...objs) {
        debug('on', action, ...objs)
        const fn = handleAction;
        await fn(action, this, ...objs);
      }

      static create(id) {
        const obj = new SpecificEntity();
        const initObj = DataObject.create('init', id ? {
          id
        } : {});
        obj.onAction('creating', initObj);
        obj.id = id || shortid.generate();
        obj.onAction('created', initObj);
        mapto('dto', name, initObj.toJS(), obj);
        debug('%s instance', name, obj.id);
        return obj;
      }
    }

    readonly(SpecificEntity, 'fields', fields);
    readonly(SpecificEntity, 'references', references);

    // 规则引擎可以通过模型名获取模型
    readonly(SpecificEntity, 'name', name, true);

    return SpecificEntity;
  }
}
