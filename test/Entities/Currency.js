const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.createModel(BaseData, 'Currency', {
  "CurrencySign": "string",
  "IsNative": "boolean",
  "MaxError": "number",
  "ExchangeRate": "number",
  "CalDirection": {

    "Code": "string",
    "Name": "string",
    "Position": "number",
    "CustomUse": "boolean",
    "IsDelete": "number",
    "IsExtend": "number",
    "remark": "string",
    "DefaultValue": "string",
    "EnumId": "string"
  },
  "Disabled": "boolean",
  "MadeDate": "date",
  "AccountDate": {

    "Code": "string",
    "Name": "string",
    "Position": "number",
    "CustomUse": "boolean",
    "IsDelete": "number",
    "IsExtend": "number",
    "remark": "string",
    "DefaultValue": "string",
    "EnumId": "string"
  },
  "AccountYear": {

    "Code": "string",
    "Name": "string",
    "Position": "number",
    "CustomUse": "boolean",
    "IsDelete": "number",
    "IsExtend": "number",
    "remark": "string",
    "DefaultValue": "string",
    "EnumId": "string"
  },
  "ExChangeRateType": {

    "Code": "string",
    "Name": "string",
    "Position": "number",
    "CustomUse": "boolean",
    "IsDelete": "number",
    "IsExtend": "number",
    "remark": "string",
    "DefaultValue": "string",
    "EnumId": "string"
  },
  "CreatedTime": "date",
  "ExChangeRateDTOs": ["string"],
  "WeakTypeDtoName": "string",
  "DtoClassName": "string",
  "IsWeakType": "boolean",
  "AliName": "string",
  "Status": "number",
  "EnableHasChanged": "boolean",
  "ChangedProperty": ["string"],
  "DynamicPropertyKeys": ["string"],
  "DynamicPropertyValues": ["string"],
  //"id": "number",
  "DeleteID": "number",
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
  "Updated": "date",
  "UpdatedBy": "string",
  "InnerSearchLevel": "number",
  "RecordChange": "boolean",
  "InnerPropInParentRecure": "string",

  "CaseSensitive": "boolean",
  "RecordDynamicNullValue": "boolean",
  "data": "object"
})
