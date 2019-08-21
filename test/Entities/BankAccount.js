const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'PartnerCategory',{

  "Code": "string",
  "Name": "string",
  "NewBalance": "number"
})
