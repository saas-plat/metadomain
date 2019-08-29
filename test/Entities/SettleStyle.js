const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'SettleStyle',{
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
})
