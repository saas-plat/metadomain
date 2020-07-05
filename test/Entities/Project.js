const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = createModel(BaseData, 'Project', {
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
})
