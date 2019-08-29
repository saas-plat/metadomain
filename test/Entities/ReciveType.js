const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'ReciveType', {
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
  "Position": "number",
  "CustomUse": "bool",
  "IsDelete": "number",
  "IsExtend": "number",
  "remark": "string",
  "DefaultValue": "string",
  "EnumId": "string"
})
