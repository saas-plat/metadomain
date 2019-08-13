const {
  BaseTable
} = require('./BaseTable');

// 对明细进行汇总的数据对象
const SumTable = exports.SumTable = class SumTable extends BaseTable {

}

SumTable.fields = {
  ...BaseTable.fields,
  id: 'string',
  did: 'string',
}
