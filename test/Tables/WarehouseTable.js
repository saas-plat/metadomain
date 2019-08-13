const {
	MetaTable,
	DataTable,
} = require('../lib');

module.exports =  MetaTable.create(DataTable, 'WarehouseTable', {
  Name: 'string',
  Code: {
    type:'string',
    unique: true
  }
});
