const Entity = require('sourced').Entity;
const i18n = require('./i18n');
const debug = require('debug')('saas-plat:MetaEntity');
const shortid = require('shortid');
const {getFields, createObj} = require('./util');

const fieldsSymbol = Symbol();
const dataKeySymbol = Symbol();
const actionSymbol = Symbol();

exports.MetaEntity = class MetaEntity extends Entity {
  id;

  constructor(snapshot, evnts) {
    super(snapshot, evnts);
    if (!this.id) {
      this.id = shortid.generate();
    }
    debug('create instance', this.id);
  }

  static create(BaseType, name, schame, onAction, onCreated) {
    debug('create specific model', name);

    const fields = getFields(schame);
    const data = createObj(fields, name);

    const SpecificModel = class extends BaseType {
      [dataKeySymbol] = name;
      [fieldsSymbol] = fields;
      [actionSymbol] = onAction;

      data;

      constructor(...args) {
        super(...args);
        onCreated();
      }

      static create() {
        return new SpecificModel();
      }
    }

    // SpecificModel.DataModel = class DataModel {
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
    return SpecificModel;
  }
}

exports.BizEntity = class BizEntity extends MetaEntity {

  async save(params = {}) {
    debug('saving for instance %s...', this.id);
    // 基本单据规则
    if (!this.id) {
      console.debug(this)
      throw new BizError(i18n.t('无法保存，业务对象ID不存在'));
    }
    // 执行业务规则
    // const data = new this.constructor.DataModel();
    // mapper.map('dto', this.constructor.name, params, data);
    // this.onHandling && await this.onHandling('saving', dataModel);

    // 触发回溯事件
    const changes = diff(data, this.data);
    this.digest('saved', changes);
    this.saved(changes);

    // event用扁平的对象发送
    // 不要调用emit，由commit保存成功后调用发送
    this.enqueue('saved', toFloat({
      $id: this.id,
      ...changes
    }));
    debug('saved');
  }

  async delete() {}

  saved(value) {
    debug('%s saved', this.constructor.name);
    //console.debug(value, this.data)
    mapper.map(this.constructor.name, this.constructor.name, value, this.data);
    //debug('saved', this.data);
  }

  deleted() {
    debug('%s deleted', this.constructor.name);
  }

}
