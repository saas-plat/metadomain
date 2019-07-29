const {BizEntity} = require('./MetaEntity');

// 业务单据对象
exports.Voucher = class Voucher extends BizEntity {
  saveExtends(changes){
   
    // 补充审批人、制单人、单据日期信息
  }
}
