const Entity = require('sourced').Entity;
const i18n = require('./i18n');
const debug = require('debug')('saas-plat:MetaEntity');
const shortid = require('shortid');
const Event = require('./Event');
const {
  getFields,
  createObj
} = require('./util');
const _ = require('lodash');

const fieldsSymbol = Symbol();
const dataKeySymbol = Symbol();
const actionSymbol = Symbol();

const none = () => {}

exports.DataObject = class DataObject {
  constructor(data) {
    _.merge(this, data);
  }
}

exports.MetaEntity = class MetaEntity extends Entity {
  [dataKeySymbol] = name;
  [fieldsSymbol] = fields;
  [actionSymbol] = onAction;

  id;

  constructor(snapshot, evnts) {
    super(snapshot, evnts);
    if (!snapshot && !evnts) {
      this.onAction('creating');
    }
    if (!this.id) {
      this.id = shortid.generate();
    }
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
        this.[dataKeySymbol] = name;
        this.[fieldsSymbol] = fields;
        this.[actionSymbol] = onAction;
        _.merge(this, data);
        onCreated();
      }

      static create() {
        return new SpecificModel();
      }
    }

    // SpecificModel.Data = class Data {
    //   constructor(obj) {
    //     _.merge(this, _.cloneDeep(data));
    //     if (obj) {
    //       mapper.map('dto', name, obj, this);
    //     }
    //   }
    // }
    // 规则引擎可以通过模型名获取模型
    Object.defineProperty(SpecificModel, 'name', {
      writable: true
    });
    SpecificModel.name = name;
    Object.defineProperty(SpecificModel, 'name', {
      writable: false
    });

    const ruleset = new RuleSet(name + '_rules', rules, {
      Event,
      Data: DataObject,
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

    const saveObj = new DataObject(params);
    this.onAction('saving', saveObj);
    // 计算更新差异
    let changes = diff(params, this.data);
    // 补充审批人、制单人、单据日期信息
    const changesObj = new DataObject(changes);
    this.onAction('save', saveObj, changesObj);
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
