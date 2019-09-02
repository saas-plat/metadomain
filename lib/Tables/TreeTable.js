const {
  DataTable
} = require('./DataTable');

// 将层级数据存储时多增加树检索字段，比如层级和深度等字段
const TreeTable = exports.TreeTable = class TreeTable extends DataTable {

}

TreeTable.fields = {
  ...DataTable.fields,

}
