const {
  BaseTable
} = require('./BaseTable');

// 基本的数据查询对象，对业务实体数据进行记录生成一个数据列表
const DataTable = exports.DataTable = class DataTable extends BaseTable {
  static async upsert({
    id,
    ...data
  }) {
    const dataTable = await this.findOne({
      id
    });
    this.merge(dataTable, data);
    await dataTable.save();
    return dataTable;
  }

  static async delete({
    id
  }) {
    const dataTable = await this.findOne({
      id
    });
    if (!dataTable) {
      return;
    }
    await dataTable.remove();
    return dataTable;
  }
}

DataTable.fields = {
  ...BaseTable.fields,
  // 实体id
  id: 'string',
  ts: 'string',
}
