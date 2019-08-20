const {
  DataTable
} = require('./DataTable');

// 将层级数据存储时多增加树检索字段，比如层级和深度等字段
const TreeTable = exports.DataTable = class TreeTable extends DataTable {
  static async upsert({
    id,
    ...data
  }) {
    // const dataTable = await this.findOne({
    //   id
    // }) || new this();
    // this.merge(dataTable, data);
    // await dataTable.save();
    // return dataTable;
  }

  static async delete({
    id
  }) {
    // const dataTable = await this.findOne({
    //   id
    // });
    // if (!dataTable) {
    //   return;
    // }
    // await dataTable.remove();
    // return dataTable;
  }
}

TreeTable.fields = {
  ...DataTable.fields,

}
