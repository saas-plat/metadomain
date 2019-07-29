const Entity = require('sourced').Entity;
const i18n = require('./i18n');
const debug = require('debug')('saas-plat:MetaEntity');
const shortid = require('shortid');
const Event = require('./Event');
const {
  getFields,
  createObj,
  mapto
} = require('./util');
const _ = require('lodash');

const fieldsSymbol = Symbol();
const dataKeySymbol = Symbol();
const actionSymbol = Symbol();

const none = () => {}

function readonly(target, key, initValue) {
  Object.defineProperty(target, key, {
    writable: true
  });
  if (initValue !== undefined) {
    target[key] = initValue;
  }
  Object.defineProperty(target, key, {
    writable: false,
    enumerable: false
  });
}

exports.DataObject = class DataObject {
  $type;

  constructor(type, data) {
    readonly(this, '$type', type);
    _.merge(this, data);
  }
}

exports.MetaEntity = class MetaEntity extends Entity {
  [dataKeySymbol];
  [fieldsSymbol];
  [actionSymbol];

  id;

  constructor(snapshot, evnts) {
    super(snapshot, evnts);
    if (!snapshot && !evnts) {
      this.onAction('creating');
    }
    if (!this.id) {
      this.id = shortid.generate();
    }
    readonly(this, 'id');
    if (!snapshot && !evnts) {
      this.onAction('created');
    }
    debug('create instance', this.id);
  }

  onAction(action, ...objs) {
    this[actionSymbol](action, this, ...objs);
  }

  static create(BaseType, name, schame, rules, onCreated = none) {
    debug('create %s model', BaseType, name, schame);

    const fields = getFields(schame);
    const data = createObj(fields, name);

    const onAction = async (action, ...datas) => {
      await ruleset.execute([
        new Event(name + '.' + action, {}),
        ...datas
      ]);
    }

    const SpecificModel = class extends BaseType {
      constructor(...args) {
        super(...args);
        readonly(this, dataKeySymbol, name);
        readonly(this, fieldsSymbol, fields);
        readonly(this, actionSymbol, onAction);
        _.merge(this, data);
        onCreated();
      }

      static create() {
        return new SpecificModel();
      }
    }

    // 规则引擎可以通过模型名获取模型
    readonly(SpecificModel, 'name', name);

    const ruleset = new RuleSet(name + '_rules', rules, {
      Event,
      Object: DataObject,
      Entity: SpecificModel,
      [name]: SpecificModel,
    });

    return SpecificModel;
  }
}

exports.BizEntity = class BizEntity extends MetaEntity {

  async save(params = {}) {
    debug('saving for instance %s...', this.id);
    // 基本单据规则
    if (!this.id) {
      debug(this)
      throw new BizError(i18n.t('无法保存，业务对象ID不存在'));
    }

    const saveObj = new DataObject('Params', params);
    await this.onAction('saving', saveObj);
    const saves = createObj(this.fieldsSymbol, this.dataKeySymbol);
    mapto(this.dataKeySymbol, 'dto', saveObj.toJS(), data);
    // 计算更新差异
    let changes = diff(saves, this.data);
    changes = this.saveExtends ? await this.saveExtends(changes) : changes;
    const changesObj = new DataObject('Changes', changes);
    await this.onAction('save', saveObj, changesObj);
    changes = changesObj.toJS();

    // 触发回溯事件
    this.digest('saved', changes);
    this.saved(changes);

    // event用扁平的对象发送
    // 不要调用emit，由commit保存成功后调用发送
    this.enqueue('saved', toFloat({
      $id: this.id,
      ...changes
    }));
    debug('fire saved');
  }

  async delete() {}

  async validate({
    status: true
  }) {

  }

  // ------------------------------------------

  saved(changes) {
    debug('%s saved', this.id);
    //console.debug(value, this.data)
    _.merge(this, changes);
    //debug('saved', this.data);
  }

  deleted() {
    debug('%s deleted', this.constructor.name);
  }

}
