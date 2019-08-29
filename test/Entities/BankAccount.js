const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'BankAccount',{

  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
  "NewBalance": "number"
})
