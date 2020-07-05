const {
  BaseEntity
} = require('./BaseEntity');
const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');

// 基础数据对象
const BaseData = exports.BaseData = class BaseData extends BaseEntity {

  async _save(eventData) {
    if (this.status === 'abandoned') {
      throw new BizError(t('数据已经删除,无法再次操作'));
    }
    // if (!eventData.createBy) {
    //   throw new BizError(t('编制人未知,无法保存数据'));
    // }
    await super._save(eventData);
  }

  _statusUpdate(updates) {
    //updates = super._statusUpdate ? await super._statusUpdate(updates) : updates;
    let audites = {};
    if (!updates.status) {
      throw new BizError(t('状态无效,无法更新'));
    }
    if (updates.status === 'effective') {
      if (!updates.updateBy) {
        throw new BizError(t('审核人未知,无法更新状态'));
      }
      audites = {
        auditedBy: updates.updateBy,
        auditedAt: updates.updateAt,
      }
    }

    return {
      ...updates,
      ...audites
    }
  }
}

BaseData.actionMethods = [...BaseEntity.actionMethods];
BaseData.eventTypes = [...BaseEntity.eventTypes];
 
