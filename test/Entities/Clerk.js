const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'PartnerCategory', {
  "ID": {
    "Type": "number"
  },
  "Code": {
    "Type": "string"
  },
  "Name": {
    "Type": "string"
  }
})
