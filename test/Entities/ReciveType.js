const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = createModel(BaseData, 'ReciveType', {
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
  "Position": "number",
  "CustomUse": "boolean",
  "IsDelete": "number",
  "IsExtend": "number",
  "remark": "string",
  "DefaultValue": "string",
  "EnumId": "string"
})
