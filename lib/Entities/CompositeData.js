const {
  BizEntity
} = require('./BizEntity');

// 业务过程对象
const CompositeData = exports.CompositeData = class CompositeData extends BizEntity {

  _save(changes, params) {

    if (!params.uid) {
      throw new BizError(t('制单人未知，无法保存单据'));
    }

  }

  // 生单
  generate() {

  }

  // 转换
  transform() {

  }
}

CompositeData.eventTypes = BizEntity.eventTypes.concat(['generated', 'transformed']);
CompositeData.fields = {
  ...BizEntity.fields,

  // 审核人
  auditedBy: 'string',
  // 审核日期
  auditedAt: 'date',

  // 转换的单据号
  transformTo: 'string',

}
