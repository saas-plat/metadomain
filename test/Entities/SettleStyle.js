const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'PartnerCategory',{
  "Code": {
    "Type": "string"
  },

  "Name": {
    "Type": "string"
  }
})
