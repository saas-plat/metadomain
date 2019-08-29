const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'Warehouse', {
  "Code": {
    _mapping: 'code'
  },
  "Name": {
    _mapping: 'name'
  },
})
