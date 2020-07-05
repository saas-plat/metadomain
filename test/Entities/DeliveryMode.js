const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = createModel(BaseData, 'DeliveryMode', {
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
})
