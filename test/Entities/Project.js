const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'PartnerCategory', {
  "Name": {
    "Type": "string"
  },

  "Code": {
    "Type": "string"
  }
})
