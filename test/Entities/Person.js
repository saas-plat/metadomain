const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'Person',{

  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
})
