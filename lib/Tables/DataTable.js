const {BaseTable} = require('./BaseTable');

// 基本的数据查询对象，对业务实体数据进行记录生成一个数据列表
const DataTable = exports.DataTable = class DataTable extends BaseTable {
  static onSaved({id,...data}){

  }

  static onStatusUpdated({id,...data}){

  }

  static onDeleted({id}){

  }
}

DataTable.fields = {
  ...BaseTable.fields,
  // 实体id
  id: 'string',
}
