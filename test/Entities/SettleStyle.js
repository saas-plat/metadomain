const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = createModel(BaseData, 'SettleStyle',{
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
})
