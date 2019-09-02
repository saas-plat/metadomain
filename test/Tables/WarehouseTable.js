const {
	MetaTable,
	DataTable,
} = require('../../lib');

module.exports =  MetaTable.create(DataTable, 'WarehouseTable', {
	ID: {
		type: 'string',
		mapping: 'id'
	},
  Name: 'string',
  Code: {
    type:'string',
    unique: true
  },
	Status: 'string',
	Ts: {
		type: 'string',
		mapping: 'ts'
	},
});
