const {
  BizEntity
} = require('./BizEntity');

// 业务单据对象
const Voucher = exports.Voucher = class Voucher extends BizEntity {

  _save(changes) {

    // 补充审批人、制单人、单据日期信息
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
