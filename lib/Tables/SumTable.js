const {
  BaseTable
} = require('./BaseTable');

// 对明细进行汇总的数据对象
const SumTable = exports.SumTable = class SumTable extends BaseTable {

}

SumTable.fields = {
  ...BaseTable.fields,
  // 实体的id
  id: 'string',
  // 明细行的id
  detailId: 'string',
}
