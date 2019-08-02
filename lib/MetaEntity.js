const Entity = require('sourced').Entity;
const i18n = require('./i18n');
const debug = require('debug')('saas-plat:MetaEntity');
const shortid = require('shortid');
const {
  Event
} = require('./Event');
const {
  getMeta,
  createMapping,
  createObj,
  mapto,
  fieldsSymbol,
  dataKeySymbol,
  actionSymbol,
  none,
  readonly,
  noenumerable,
} = require('./util');
const _ = require('lodash');
const {
  RuleSet
} = require('./RuleSet');

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

exports.MetaEntity = class MetaEntity extends Entity {
  // [dataKeySymbol];
  // [fieldsSymbol];
  // [actionSymbol];

  _createObj() {
    return createObj({}, this[fieldsSymbol]);
  }

  _merge(data, target) {
    mapto('dto', this[dataKeySymbol], data, target || this);
  }

  async onAction(action, ...objs) {
    debug('on', action, ...objs)
    const fn = this[actionSymbol];
    await fn(action, this, ...objs);
  }

  merge(snapshot) {
    this._init();
    super.merge(snapshot);
  }

  replay(evnts) {
    this._init();
    super.replay(evnts);
  }

  _init() {
    noenumerable(this, 'eventsToEmit', 'newEvents', 'replaying', 'snapshotVersion', 'timestamp', 'version', '_events', '_eventsCount', '_maxListeners');
  }

  constructor(...args) {
    super(...args);
    this._init();
  }

  static create(BaseType, name, schame, rules, eventHandler = {}) {
    debug('%s(%s)', name, BaseType.name, schame);

    const fields = getMeta({
      ...schame,
      ...(BaseType.fields || {})
    });
    debug('create', name, fields);
    createMapping(fields, name);
    const defaultProps = createObj({}, fields);
    debug('defaultProps', defaultProps);

    const handleAction = async (action, ...datas) => {
      await ruleset.execute([
        ...[action, // 所有行为
          BaseType.name + '.' + action, // 特定类型行为
          BaseType.name + '.' + name + '.' + action, // 特定对象行为
          name + '.' + action // 特定对象行为
        ].map(action => (new Event(action))),
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
        readonly(this, dataKeySymbol, name);
        readonly(this, fieldsSymbol, fields);
        readonly(this, actionSymbol, handleAction);
        Object.keys(eventHandler).forEach(key => {
          this.on(key, eventHandler[key]);
        });
        (BaseType.eventTypes || []).forEach(key => {
          this.on(key, (...args) => eventHandler.on(key, ...args));
        })
        _.merge(this, defaultProps);
        debug('%s created', name);
      }

      static create(id) {
        const obj = new SpecificEntity();
        const initObj = DataObject.create('init', id ? {
          id
        } : {});
        obj.onAction('creating', initObj);
        obj.id = id || shortid.generate();
        obj.onAction('created', initObj);
        mapto('dto', obj[dataKeySymbol], initObj.toJS(), obj);
        debug('%s instance', name, obj.id);
        return obj;
      }
    }

    // 规则引擎可以通过模型名获取模型
    readonly(SpecificEntity, 'name', name, true);
    const ruleset = new RuleSet(name, rules, {
      Event,
      Object: DataObject,
      Entity: SpecificEntity,
      //[name]: SpecificModel,
    });

    return SpecificEntity;
  }
}
