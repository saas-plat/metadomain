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
  generateTs,
} = require('../util');
const debug = require('debug')('saas-plat:BizEntity');
const {
  t
} = require('../i18n');

const BizEntity = exports.BizEntity = class BizEntity extends MetaEntity {

  async _checkTs(params) {
    if (this.ts !== params.ts) {
      params.ts = '111'
      debug( params)
      debug(this.ts, params.ts)
      throw new BizError(t('实体已变更，请刷新后重试!'));
    }
  }

  async _executeDefault(params) {
    await this._checkTs(params);
    params = await super._executeDefault(params);
    if (this.createAt) {
      params.updateAt = new Date();
      params.updateBy = params.updateBy || null;
    }
    params.ts = generateTs();
    return params;
  }

  async _create(params) {
    params.createAt = new Date();
    params.createBy = params.createBy || null;
    params.updateAt = new Date();
    params.updateBy = params.createBy || null;
    return params;
  }

  async create(params) {
    debug('start create...');
    const inits = this._merge(params, this._createObj(true));
    await this._executeAction('creating', 'create', 'created', inits, {
      required: false,
      unique: false
    });
  }

  async save(params) {
    debug('start save...');
    await this._executeAction('saving', 'save', 'saved', params, {
      required: true,
      unique: true
    });
  }

  // 有效
  // 无效
  async saveStatus({
    updateBy,
    status
  }) {
    debug('start saveStatus...');
    // 检查必录项
    await this._executeAction('statusUpdating', 'statusUpdate', 'statusUpdated', {
      updateBy,
      status
    }, {
      required: true,
      unique: true
    });
  }

  _delete(params) {
    params.deleteAt = new Date();
    params.deleteBy = params.deleteBy || null;
    params.status = 'abandoned';
    return params;
  }

  async delete(params) {
    debug('start delete...');
    await this._executeAction('deleting', 'delete', 'deleted', {
      ...params
    }, {
      required: false,
      unique: false
    });
  }

  // --------------------- handler ---------------------
  created(inits) {
    this._executeHandler('created', inits);
  }

  saved(data) {
    // 这里是一个差异的更新，还不是简单的合并
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

BizEntity.actionMethods = ['create', 'save', 'saveStatus', 'delete'];
BizEntity.eventTypes = ['created', 'saved', 'statusUpdated', 'deleted'];
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
