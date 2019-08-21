const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'PartnerCategory', {
  "id": {
    "Type": "number"
  },
  "Code": {
    "Type": "string"
  },
  "Name": {
    "Type": "string"
  }
})
