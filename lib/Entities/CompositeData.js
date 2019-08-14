const {
  BizEntity
} = require('./BizEntity');
const {
  generateTs,
} = require('../util');

// 业务过程的复合对象
const CompositeData = exports.CompositeData = class CompositeData extends BizEntity {

  async _executeDefault(doing, params) {
    const changes = await super._executeDefault(doing, params);
    // 明细表的ts
    if ('details' in changes) {
      changes.details.forEach(it => {
        it.ts = generateTs();
      });
    }
    return changes;
  }

  _save(changes, params) {

    if (!changes.createBy) {
      throw new BizError(t('制单人未知，无法保存单据'));
    }

  }

  _setStatus(updates) {
    return {
      ...updates,
      auditedBy: updates.updateBy,
      auditedAt: updates.updateAt,
    }
  }

}

CompositeData.eventTypes = BizEntity.eventTypes.concat(['generated', 'transformed']);
CompositeData.fields = {
  ...BizEntity.fields,

  // 审核人
  auditedBy: 'string',
  // 审核日期
  auditedAt: 'date',

  details: {
    type: 'array',
    fields: {
      id: 'string',
      // 时间戳，用来控制数据有效性，每次修改时间戳都会改变
      ts: 'string'
    }
  },

  // 转换的单ID
  toId: 'string',
  // 来源单ID，从其他单保存过程生成
  srcId: 'string'
}
