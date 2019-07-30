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
  readonly2,
  noenumerable,
} = require('./util');
const _ = require('lodash');
const {
  RuleSet
} = require('./RuleSet');

const DataObject = exports.DataObject = class DataObject {
  //$name;

  toJS() {
    return _.cloneDeep(this);
  }

  fromJS(data) {
    _.merge(this, data);
  }

  constructor(name, data) {
    readonly(this, '$name', name);
    this.fromJS(data);
  }
}

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

  onAction(action, ...objs) {
    debug('on', action, ...objs)
    this[actionSymbol](action, this, ...objs);
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
    debug(name, fields);
    createMapping(fields, name);
    const defaultProps = createObj({}, fields);
    debug(defaultProps);

    const handleAction = async (action, ...datas) => {
      await ruleset.execute([
        new Event(name + '.' + action, {}),
        ...datas
      ]);
    }

    const SpecificModel = class extends BaseType {
      _init() {
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
        debug('create %s', name);
      }

      static create(id) {
        const obj = new SpecificModel();
        const initObj = new DataObject('init', {id});
        obj.onAction('creating', initObj);
        obj.id = id || shortid.generate();
        obj.onAction('created', initObj);
        mapto('dto', obj[dataKeySymbol], initObj.toJS(), obj);
        debug('%s instance', name, obj.id);
        return obj;
      }
    }

    // 规则引擎可以通过模型名获取模型
    readonly(SpecificModel, 'name', name);

    const ruleset = new RuleSet(name, rules, {
      Event,
      Object: DataObject,
      Entity: SpecificModel,
      [name]: SpecificModel,
    });

    return SpecificModel;
  }
}
