const {
  BizEntity
} = require('./BizEntity');

// 业务过程的复合对象
const CompositeData = exports.CompositeData = class CompositeData extends BizEntity {


  _save(changes, params) {

    if (!changes.createBy) {
      throw new BizError(t('制单人未知，无法保存单据'));
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

  // 转换的单ID
  toId: 'string',
  // 来源单ID，从其他单保存过程生成
  srcId: 'string'
}
