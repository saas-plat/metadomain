const {
	MetaTable,
	SumTable,
} = require('../../lib');

module.exports =  MetaTable.create(SumTable, 'WarehouseTable', {
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

});
