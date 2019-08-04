const _ = require('lodash');
const {
  MetaEntity,
  DataObject
} = require('../MetaEntity');
const {
  BizError
} = require('../Error');
const {
  diff,
  toFloat,
} = require('../util');
const debug = require('debug')('saas-plat:BizEntity');
const {
  t
} = require('../i18n');

const BizEntity = exports.BizEntity = class BizEntity extends MetaEntity {

  async _internalSave(before, doing, after, params) {
    const paramsObj = DataObject.create('params', params);
    await this.onAction(before, paramsObj);
    let saves = this._createObj();
    this._merge(paramsObj.toJS(), saves);
    saves = _.omitBy(saves, _.isUndefined);
    // 转换数据类型
    saves = this.formatData(saves);
    //debug(saves)
    // 计算更新差异
    let changes = diff(saves, this.data);
    if (!this.createAt) {
      changes.createAt = new Date();
      changes.createBy = paramsObj.uid;
    } else {
      changes.updateAt = new Date();
      changes.updateBy = paramsObj.uid;
    }
    if (!this.status) {
      changes.status = 'addnew';
    }
    // 不同的实体需要而外的更新信息
    changes = this._save ? await this._save(changes, saves) : changes;
    const changesObj = DataObject.create('saved', changes);
    await this.onAction(doing, changesObj, paramsObj);
    changes = changesObj.toJS();
    // 规则校验
    changes = this.checkData(changes);
    // 触发回溯事件
    this.digest(after, changes);
    this.saved(changes);
    // event用扁平的对象发送
    // 不要调用emit，由commit保存成功后调用发送
    this.enqueue(after, toFloat({
      id: this.id,
      ...changes
    }));
    debug('fire ' + after);
  }

  async save(params) {
    debug('%s saving...', this.id, params);
    await this._internalSave('saving', 'save', 'saved', params);
  }

  async saveDraft(params) {
    debug('%s saveDraft...', this.id, params);
    await this._internalSave('saveDrafting', 'saveDraft', 'draftSaved', params);
  }

  // 有效
  // 无效
  async setStatus({
    uid,
    status
  }) {
    debug('setStatus...', this.id, status);
    const paramsObj = DataObject.create('params', {
      uid,
      status
    });
    await this.onAction('setStatusing', paramsObj);
    const updateObj = DataObject.create('status', {
      ...paramsObj.toJS(),
      updateAt: new Date(),
      updateBy: paramsObj.uid
    });
    await this.onAction('setStatus', updateObj, paramsObj);
    const updates = updateObj.toJS();

    // 触发回溯事件
    this.digest('statusUpdated', updates);
    this.saved(updates);

    this.enqueue('statusUpdated', toFloat({
      id: this.id,
      ...updates
    }));
    debug('fire status updated');
  }

  async delete(params) {
    debug('delete...', this.id);
    const paramsObj = DataObject.create('params', params);
    await this.onAction('deleting', paramsObj);
    const delObj = DataObject.create('deleted', {
      ...paramsObj.toJS(),
      status: 'abandoned', // 作废
      deleteAt: new Date(),
      deleteBy: paramsObj.uid
    });
    await this.onAction('delete', delObj, paramsObj);
    const deletes = delObj.toJS();

    // 触发回溯事件
    this.digest('deleted', deletes);
    this.saved(deletes);

    this.enqueue('deleted', toFloat({
      id: this.id,
      ...deletes
    }));
    debug('fire deleted');
  }

  // --------------------- handler ---------------------

  saved({
    createAt,
    createBy,
    updateAt,
    updateBy,
    status,
    ...changes
  }) {
    //debug('%s saved', this.id);
    debug('handle saved...');
    this._merge(changes, this);
    if (createBy !== undefined) {
      this.createAt = createAt;
      this.createBy = createBy;
    }
    if (updateBy !== undefined) {
      this.updateAt = updateAt;
      this.updateBy = updateBy;
    }
    if (status) {
      this.status = status;
    }
    //debug(this)
  }

  statusUpdated({
    status,
    updateAt,
    updateBy
  }) {
    debug('handle statusUpdated...');
    this.status = status;
    this.updateAt = updateAt;
    this.updateBy = updateBy;
  }

  deleted({
    status,
    deleteAt,
    deleteBy
  }) {
    debug('handle deleted...');
    this.status = status;
    this.deleteAt = deleteAt;
    this.deleteBy = deleteBy;
  }
}

BizEntity.eventTypes = ['saved', 'statusUpdated', 'deleted'];
BizEntity.fields = {
  id: 'string',
  // 实体状态
  status: 'string',
  createBy: 'string',
  createAt: 'date',
  updateBy: 'string',
  updateAt: 'date',
  deleteBy: 'string',
  deleteAt: 'date',
}