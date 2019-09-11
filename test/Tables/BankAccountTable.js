const {
  MetaTable,
  DataTable,
} = require('../../lib');

module.exports =  MetaTable.create(DataTable, 'BankAccountTable',{
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
  "NewBalance": "number"
})
