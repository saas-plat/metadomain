const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = createModel(BaseData, 'VoucherType', {
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},

})
