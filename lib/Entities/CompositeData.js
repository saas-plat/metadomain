const {
  BizEntity
} = require('./BizEntity');
const {
  generateTs,
} = require('../util');
const debug = require('debug')('saas-plat:CompositeData');

// 带有子孙表的复合对象
const CompositeData = exports.CompositeData = class CompositeData extends BizEntity {

  async _saving(params) {
    await super._saving(params);
    if ('status' in params && params.status === 'draft') {
      delete params.status;
    }
  }

  async _saveDraft(changes) {
    if (this.status !== 'invalid') {
      throw new BizError(t('状态无效,只有未生效状态可以保存为草稿'));
    }
    if (changes.status !== 'draft') {
      throw new BizError(t('保存的状态无效,保存草稿时不能更新状态'));
    }
  }

  async saveDraft(params) {
    debug('%s saveDraft...', this.id, params);
    await this._executeAction('saveDrafting', 'saveDraft', 'draftSaved', {
      status: 'draft',
      ...params,
    }, {
      required: false,
      unique: false
    });
  }

  async generate(from) {
    debug('%s generate from %s...', this.id, from);
    await this._executeAction('generating', 'generate', 'generated', from);
  }

  async draftSaved(data) {
    await this._executeHandler('draftSaved', data);
  }

  async generated(data) {
    await this._executeHandler('generated', data);
  }

  async suspend(data) {
    await this._executeHandler('suspend', data);
  }

  async resume(data) {
    await this._executeHandler('resume', data);
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
      // 子表不需要ts,每次都是按照实体操作,每次实体的ts都会改变
      // // 时间戳,用来控制数据有效性,每次修改时间戳都会改变
      // ts: 'string'
    }
  },

  // 审核人
  auditedBy: 'string',
  // 审核日期
  auditedAt: 'date',

  // 转换的单ID
  toId: 'string',
  // 来源单ID,从其他单保存过程生成
  srcId: 'string'
}
