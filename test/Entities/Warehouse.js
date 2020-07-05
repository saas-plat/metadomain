const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = createModel(BaseData, 'Warehouse', {
  "Code": {
    _mapping: 'code'
  },
  "Name": {
    _mapping: 'name'
  },
})
