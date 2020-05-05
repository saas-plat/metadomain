const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.createModel(BaseData, 'InvoiceType', {

  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
})
