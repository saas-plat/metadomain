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

  async _checkTs(paramsObj) {
    if (this.ts !== paramsObj.ts) {
      debug(this.ts, paramsObj.ts)
      throw new BizError(t('实体已变更，请刷新后重试!'));
    }
  }

  async _executeDefault(params) {
    await this._checkTs(params);
    params = await super._executeDefault(params);
    if (!this.createAt) {
      params.createAt = new Date();
      params.createBy = params.createBy || null;
    }
    if (!this.updateAt) {
      params.updateAt = new Date();
      params.updateBy = params.createBy || null;
    }
    if (this.createAt) {
      params.updateAt = new Date();
      params.updateBy = params.updateBy || null;
    }
    params.ts = generateTs();
    return params;
  }

  async create(params) {
    debug('create...');
    const inits = this._merge(params, this._createObj(true));
    await this._executeAction('creating', 'create', 'created', inits, {
      required: this.status === 'valid' || params.status === 'valid',
      unique: this.status === 'valid' || params.status === 'valid'
    });
  }

  async save(params) {
    debug('save...');
    await this._executeAction('saving', 'save', 'saved', params, {
      required: this.status === 'valid' || params.status === 'valid',
      unique: this.status === 'valid' || params.status === 'valid'
    });
  }

  // 有效
  // 无效
  async setStatus({
    updateBy,
    status
  }) {
    debug('setStatus...');
    // 检查必录项
    await this._executeAction('statusUpdating', 'statusUpdate', 'statusUpdated', {
      updateBy,
      status
    }, {
      required: status === 'valid',
      unique: status === 'valid',
    });
  }

  _delete(params) {
    params.deleteAt = new Date();
    params.deleteBy = params.deleteBy || null;
    params.status = 'abandoned';
    return params;
  }

  async delete(params) {
    debug('delete...');
    await this._executeAction('deleting', 'delete', 'deleted', {
      ...params
    }, {
      required: false,
      unique: false
    });
  }

  // --------------------- handler ---------------------
  created(inits) {
    debug('handle created...');
    this._merge(inits);
  }

  saved(data) {
    //debug('%s saved', this.id);
    debug('handle saved...');
    const {
      createAt,
      createBy,
      updateAt,
      updateBy,
      status,
      ...changes
    } = data;
    // 这里是一个差异的更新，还不是简单的合并
    // 尤其是数组可以需要差异更新和删除
    this._merge(changes);
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
    this._merge(data);
  }

  statusUpdated({
    status,
    updateAt,
    updateBy,
    ...other
  }) {
    debug('handle statusUpdated...');
    this._merge(other);
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
    debug('handle deleted...', );
    this._merge(other);
    this.status = status;
    this.deleteAt = deleteAt;
    this.deleteBy = deleteBy;
  }
}

BizEntity.actionMethods = ['create', 'save', 'setStatus', 'delete'];
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
