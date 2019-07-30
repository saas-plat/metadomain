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
  //
  // id;

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

  constructor(...args) {
    super(...args);

    noenumerable(this, 'eventsToEmit');
    noenumerable(this, 'newEvents');
    noenumerable(this, 'replaying');
    noenumerable(this, 'snapshotVersion');
    noenumerable(this, 'timestamp');
    noenumerable(this, 'version');
    noenumerable(this, '_events');
    noenumerable(this, '_eventsCount');
    noenumerable(this, '_maxListeners');
  }

  static create(BaseType, name, schame, rules, eventHandler = {}) {
    debug('%s(%s)', name, BaseType.name, schame);

    const fields = getMeta({
      ...schame,
      ...(BaseType.fields || {})
    });
    debug(name, fields);
    createMapping(fields, name);
    const data = createObj({}, fields);
    debug(data);

    const handleAction = async (action, ...datas) => {
      await ruleset.execute([
        new Event(name + '.' + action, {}),
        ...datas
      ]);
    }

    const SpecificModel = class extends BaseType {
      constructor(snapshot, evnts, ...args) {
        super(snapshot, evnts, ...args);
        readonly(this, dataKeySymbol, name);
        readonly(this, fieldsSymbol, fields);
        readonly(this, actionSymbol, handleAction);
        Object.keys(eventHandler).forEach(key => {
          this.on(key, eventHandler[key]);
        });
        (BaseType.eventTypes || []).forEach(key => {
          this.on(key, (...args) => eventHandler.on(key, ...args));
        })
        let initObj;
        if (!snapshot && !evnts) {
          initObj = new DataObject('init', data);
          this.onAction('creating', initObj);
        }
        if (!this.id) {
          this.id = shortid.generate();
        }
        readonly2(this, 'id');
        if (!snapshot && !evnts) {
          this.onAction('created', initObj);
        }
        let inits;
        if (initObj) {
          inits = createObj({}, this[fieldsSymbol]);
          mapto('dto', this[dataKeySymbol], initObj.toJS(), inits);
        } else {
          inits = data;
        }
        _.merge(this, inits);
        debug('create %s instance', name, this.id);
      }

      static create() {
        return new SpecificModel();
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
