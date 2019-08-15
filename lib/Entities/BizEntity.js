const _ = require('lodash');
const {
  handler,
  MetaEntity,
  DataObject
} = require('../MetaEntity');
const {
  BizError
} = require('../Error');
const {
  diff,
  merge,
  toFloat,
  generateTs,
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

  async _executeDefault(doing, params) {
    await this._checkTs();
    const changes = await super._executeDefault(doing, params);
    if (!this.createAt) {
      changes.createAt = new Date();
      changes.createBy = params.createBy;
    }
    if (!this.updateAt) {
      changes.updateAt = new Date();
      changes.updateBy = params.createBy;
    }
    if (this.createAt) {
      changes.updateAt = new Date();
      changes.updateBy = params.createBy;
    }
    changes.ts = generateTs();
    return changes;
  }

  async save(params) {
    debug('%s saving...', this.id, params);
    await this._executeAction('saving', 'save', 'saved', params);
  }

  // 有效
  // 无效
  async setStatus({
    updateBy,
    status
  }) {
    debug('%s setStatus...', this.id, status);
    await this._executeAction('statusUpdating', 'statusUpdate', 'statusUpdated', {
      updateBy,
      status
    });
  }

  async delete(params) {
    debug('delete...', this.id);
    await this._executeAction('deleting', 'delete', 'deleted', {
      ...params
    });
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
    // 这里是一个差异的更新，还不是简单的合并
    // 尤其是数组可以需要差异更新和删除
    merge(changes, this);
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

  generated(data) {
    debug('handle generated...');
    merge(data, this);
  }

  statusUpdated({
    status,
    updateAt,
    updateBy,
    ...other
  }) {
    debug('handle statusUpdated...');
    merge(other, this);
    this.status = status;
    this.updateAt = updateAt;
    this.updateBy = updateBy;
  }

  deleted({
    status,
    deleteAt,
    deleteBy,
    ...other
  }) {
    debug('handle deleted...');
    merge(other, this);
    this.status = status;
    this.deleteAt = deleteAt;
    this.deleteBy = deleteBy;
  }
}

BizEntity.actionMethods = ['save', 'setStatus', 'delete'];
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
