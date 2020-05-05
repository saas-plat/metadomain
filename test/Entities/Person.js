const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.createModel(BaseData, 'Person',{

  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
})
