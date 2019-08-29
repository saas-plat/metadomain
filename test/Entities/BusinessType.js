const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'BusinessType', {
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
  "IdRdStyleIn": "string",
  "BusinessVoucher": "string",
  "Disabled": "bool",
  "MadeDate": "date",
  "CreatedTime": "date",
  "IdRdStyleOut": "number",
  "RdStyleOut": {
    "IsEndNode": "bool",
    "Depth": "number",
    "Disabled": "bool",
    "MadeDate": "date",
    "CreatedTime": "date",
    "Idparent": "number",
    "Parent": "string",
    "InId": "string",
    "WeakTypeDtoName": "string",
    "DtoClassName": "string",
    "IsWeakType": "bool",
    "AliName": "string",
    "Status": "number",
    "EnableHasChanged": "bool",
    "ChangedProperty": ["string"],
    "DynamicPropertyKeys": ["string"],
    "DynamicPropertyValues": ["string"],

    "DeleteID": "number",
    "Name": "string",
    "Code": "string",
    "Updated": "date",
    "UpdatedBy": "string",
    "InnerSearchLevel": "number",
    "RecordChange": "bool",
    "InnerPropInParentRecure": "string",

    "CaseSensitive": "bool",
    "RecordDynamicNullValue": "bool",
    "data": "object"
  },
  "RdStyleIn": "string",
  "IsSystem": "number",
  "WeakTypeDtoName": "string",
  "DtoClassName": "string",
  "IsWeakType": "bool",
  "AliName": "string",
  "Status": "number",
  "EnableHasChanged": "bool",
  "ChangedProperty": ["string"],
  "DynamicPropertyKeys": ["string"],
  "DynamicPropertyValues": ["string"],
  "DeleteID": "number",
  "Updated": "date",
  "UpdatedBy": "string",
  "InnerSearchLevel": "number",
  "RecordChange": "bool",
  "InnerPropInParentRecure": "string",

  "CaseSensitive": "bool",
  "RecordDynamicNullValue": "bool",
  "data": "object"
})
