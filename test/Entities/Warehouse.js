const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'Warehouse', {
  "Code": {
    mapping: 'code'
  },
  "Name": {
    mapping: 'name'
  },
})
