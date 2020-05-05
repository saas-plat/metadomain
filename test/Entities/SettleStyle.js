const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.createModel(BaseData, 'SettleStyle',{
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
})
