const {
  BizEntity
} = require('./BizEntity');
const {
  generateTs,
} = require('../util');
const debug = require('debug')('saas-plat:CompositeData');

// 带有子孙表的复合对象
const CompositeData = exports.CompositeData = class CompositeData extends BizEntity {

  async _executeDefault(params) {
    const changes = await super._executeDefault(params);

    // // 明细表的ts
    // if ('details' in changes) {
    //   changes.details.forEach(it => {
    //     it.ts = generateTs();
    //   });
    // }

    // 理论上还有可能是多个明细表，或者子孙表结构
    //this.constructor.fields

    return changes;
  }

  async _save(params) {
    params = await super._save(params);
    if ('status' in params && params.status === 'draft') {
      delete params.status;
    }
    return params;
  }

  async _saveDraft(params) {
    if (this.status !== 'invalid') {
      throw new BizError(t('状态无效，只有未生效状态可以保存为草稿'));
    }
    if ('status' in params && params.status !== this.status) {
      throw new BizError(t('保存的状态无效，保存草稿时不能更新状态'));
    }
    params.status = 'draft';
    return params;
  }

  async saveDraft(params) {
    debug('%s saveDraft...', this.id, params);
    await this._executeAction('saveDrafting', 'saveDraft', 'draftSaved', params, {
      required: false,
      unique: false
    });
  }

  async generate(from) {
    debug('%s generate from %s...', this.id, from);
    await this._executeAction('generating', 'generate', 'generated', from);
  }

  draftSaved(data) {
    this._executeHandler('draftSaved', data);
  }

  generated(data) {
    this._executeHandler('generated', data);
  }

}

CompositeData.actionMethods = [...BizEntity.actionMethods, 'saveDraft', 'generate'];
CompositeData.eventTypes = [...BizEntity.eventTypes, 'draftSaved', 'generated'];
CompositeData.fields = {
  ...BizEntity.fields,

  // 明细表必须提供
  details: {
    type: 'array',
    fields: {
      id: 'string',
      // 子表不需要ts，每次都是按照实体操作，每次实体的ts都会改变
      // // 时间戳，用来控制数据有效性，每次修改时间戳都会改变
      // ts: 'string'
    }
  },

  // 审核人
  auditedBy: 'string',
  // 审核日期
  auditedAt: 'date',

  // 转换的单ID
  toId: 'string',
  // 来源单ID，从其他单保存过程生成
  srcId: 'string'
}
