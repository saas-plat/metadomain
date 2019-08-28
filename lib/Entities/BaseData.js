const {
  BizEntity
} = require('./BizEntity');
const {
  BizError
} = require('../Error');
const {
  t
} = require('../i18n');

// 基础数据对象
const BaseData = exports.BaseData = class BaseData extends BizEntity {

  _save(changes) {
    if (this.status === 'abandoned') {
      throw new BizError(t('数据已经删除，无法再次操作'));
    }
    // if (!changes.createBy) {
    //   throw new BizError(t('编制人未知，无法保存数据'));
    // }
    return changes;
  }

  _setStatus(updates) {
    let audites = {};
    if (updates.status === 'effective') {
      if (!updates.updateBy) {
        throw new BizError(t('审核人未知，无法更新状态'));
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

BaseData.actionMethods = [...BizEntity.actionMethods];
BaseData.eventTypes = [...BizEntity.eventTypes];
BaseData.fields = {
  ...BizEntity.fields,
  name: 'string',
  code: 'string',
}
