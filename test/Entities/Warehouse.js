const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.createModel(BaseData, 'Warehouse', {
  "Code": {
    _mapping: 'code'
  },
  "Name": {
    _mapping: 'name'
  },
})
