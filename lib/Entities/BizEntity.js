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

  async _checkTs(paramsObj) {
    if (this.ts !== paramsObj.ts) {
      throw new BizError(t('数据已变更，请刷新后重试!'));
    }
  }

  async _internalSave(before, doing, after, params) {
    // before
    const paramsObj = DataObject.create('params', params);
    await this.onAction(before, paramsObj);
    // doing
    await this._checkTs();
    if (doing === 'generate'){
      await this._checkStatus(paramsObj);
    }
    let saves = this._createObj();
    this._merge(paramsObj.toJS(), saves);
    saves = _.omitBy(saves, _.isUndefined);
    // 转换数据类型
    saves = this.formatData(saves);
    //debug(saves)
    // 计算更新差异
    let changes = diff(saves, this);
    if (!this.createAt) {
      changes.createAt = new Date();
      changes.createBy = paramsObj.createBy.id;
    } else {
      changes.updateAt = new Date();
      changes.updateBy = paramsObj.createBy.id;
    }
    if (!this.status) {
      changes.status = 'addnew';
    },
    changes.ts = generateTs();
    // 不同的实体需要而外的更新信息
    changes = this._save ? await this._save(changes, saves) : changes;
    const changesObj = DataObject.create('saved', changes);
    await this.onAction(doing, changesObj, paramsObj);
    changes = changesObj.toJS();
    // 规则校验
    changes = this.checkData(changes);
    // after 触发回溯事件
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

  async _checkStatus({status}){
    if (status !== 'effective'){
      throw new BizError(t('数据为生效无法后续操作'))；
    }
  }

  async generate(from) {
    debug('%s generate...', this.id, from);
    await this._internalSave('generating', 'generate', 'generated', {
      ...from.toJS(),
      srcId: from.id
    });
  }

  // 有效
  // 无效
  async setStatus({
    updateBy,
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
      updateBy: paramsObj.updateBy.id,
      ts: generateTs()
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
      deleteBy: paramsObj.uid,
      ts: generateTs()
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

  generated(...args) {
    this.saved(...args);
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
  status: {
    type: 'string',
    // 默认无效状态
    defaultValue: 'invalid'
  },

  // 基本信息
  createBy: 'string',
  createAt: 'date',
  updateBy: 'string',
  updateAt: 'date',
  deleteBy: 'string',
  deleteAt: 'date',

  // 时间戳，用来控制数据有效性，每次修改时间戳都会改变
  ts: 'string'
}
