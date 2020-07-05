const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = createModel(BaseData, 'BankAccount',{

  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
  "NewBalance": "number"
})
