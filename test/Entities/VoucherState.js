const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'PartnerCategory', {

  "Code": "string",
  "Name": "string",
  "Position": "number",
  "CustomUse": "bool",
  "IsDelete": "number",
  "IsExtend": "number",
  "remark": "string",
  "DefaultValue": "string",
  "EnumId": "string"
})
