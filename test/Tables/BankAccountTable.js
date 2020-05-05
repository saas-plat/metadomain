const {
  MetaTable,
  DataTable,
} = require('../../lib');

module.exports = (options)=> MetaTable.createModel(DataTable, 'BankAccountTable',{
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
  "NewBalance": "number"
}, null, options)
