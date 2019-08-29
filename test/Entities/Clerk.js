const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'Clerk', {

  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
})
