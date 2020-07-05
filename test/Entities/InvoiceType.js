const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = createModel(BaseData, 'InvoiceType', {

  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
})
