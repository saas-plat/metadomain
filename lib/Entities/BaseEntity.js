const _ = require('lodash');
const {
  BizError
} = require('../Error');
const {
  createObj,
  filterValues,
  generateTs,
} = require('../util');
const debug = require('debug')('saas-plat:BaseEntity');
const {
  t
} = require('../i18n');
const {
  MetaEntity
} = require('../MetaEntity');

const BaseEntity = exports.BaseEntity = class BaseEntity extends MetaEntity {

  async _checkTs(params) {
    if (this.ts !== params.ts) {
      debug(this.ts, params.ts)
      throw new BizError(t('实体已变更,请刷新后重试!'));
    }
  }

  async _executeDefaulting(params) {
    await this._checkTs(params);
    return params;
  }

  async _executeDefaulted(eventData) {
    eventData.ts = generateTs();
    return eventData;
  }

  async _creating(eventData) {
    eventData.createAt = new Date();
    eventData.createBy = eventData.createBy || null;
    // eventData.updateAt = new Date();
    // eventData.updateBy = eventData.createBy || null;
  }

  async create(params) {
    // debug('start create...');
    // 合并默认值过程
    const defVals = this.constructor.schema.createObject({
      withDefault: true
    });
    // 需要把默认值合并到params上,不是parms合并到默认值上
    const inits = _.merge(params, filterValues(defVals));
    await this._executeAction('creating', 'create', 'created', inits, {
      required: false,
      unique: false
    });
  }

  async _saving(eventData) {
    eventData.updateAt = new Date();
    eventData.updateBy = eventData.updateBy || null;
  }

  async _save(changes) {
    if (!changes.updateBy) {
      throw new BizError(t('更新人不存在,无法保存'));
    }
  }

  async save(params) {
    // debug('start save...');
    await this._executeAction('saving', 'save', 'saved', params);
  }

  // 有效
  // 无效
  async saveStatus(params) {
    // debug('start saveStatus...');
    // 检查必录项
    await this._executeAction('statusUpdating', 'statusUpdate', 'statusUpdated', params);
  }

  _deleting(eventData) {
    eventData.deleteAt = new Date();
    eventData.deleteBy = eventData.deleteBy || null;
    eventData.status = 'abandoned';
    return eventData;
  }

  async delete(params) {
    // debug('start delete...');
    await this._executeAction('deleting', 'delete', 'deleted', {
      ...params
    }, {
      required: false,
      unique: false
    });
  }

  async saveAttachment() {

  }

  async deleteAttachment() {

  }

  // --------------------- handler ---------------------
  created(inits) {
    this._executeHandler('created', inits);
  }

  saved(data) {
    // 这里是一个差异的更新,还不是简单的合并
    // 尤其是数组可以需要差异更新和删除
    this._executeHandler('saved', data);
  }

  statusUpdated(data) {
    this._executeHandler('statusUpdated', data);
  }

  deleted(data) {
    this._executeHandler('deleted', data);
  }
}

BaseEntity.actionMethods = ['create', 'save', 'statusUpdate', 'delete'];
BaseEntity.eventTypes = ['created', 'saved', 'statusUpdated', 'deleted'];
