const {
  BaseEntity
} = require('./BaseEntity');
const {
  generateTs,
} = require('../util');
const debug = require('debug')('saas-plat:CompositeData');

// 带有子孙表的复合对象
const CompositeData = exports.CompositeData = class CompositeData extends BaseEntity {

  async _saving(eventData) {
    await super._saving(eventData);
    if ('status' in eventData && eventData.status === 'draft') {
      delete eventData.status;
    }
  }

  async _saveDraft(eventData) {
    if (this.status !== 'invalid') {
      throw new BizError(t('状态无效,只有未生效状态可以保存为草稿'));
    }
    if (eventData.status !== 'draft') {
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

  async draftSaved(params) {
    await this._executeHandler('draftSaved', params);
  }

  async generated(params) {
    await this._executeHandler('generated', params);
  }

  async suspend(params) {
    await this._executeHandler('suspend', params);
  }

  async resume(params) {
    await this._executeHandler('resume', params);
  }

}

CompositeData.actionMethods = [...BaseEntity.actionMethods, 'saveDraft', 'generate'];
CompositeData.eventTypes = [...BaseEntity.eventTypes, 'draftSaved', 'generated'];
