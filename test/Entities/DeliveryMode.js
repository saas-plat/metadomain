const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'DeliveryMode', {
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
})
