const {
  BizEntity
} = require('./BizEntity');

// 业务单据对象
const Voucher = exports.Voucher = class Voucher extends BizEntity {

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

Voucher.eventTypes = BizEntity.eventTypes.concat(['generated', 'transformed']);
Voucher.fields = {
  ...BizEntity.fields,

  // 审核人
  auditedBy: 'string',
  // 审核日期
  auditedAt: 'date',

  // 转换的单据号
  transformTo: 'string',

}
