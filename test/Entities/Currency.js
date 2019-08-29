const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'Currency', {
  "CurrencySign": "string",
  "IsNative": "bool",
  "MaxError": "number",
  "ExchangeRate": "number",
  "CalDirection": {

    "Code": "string",
    "Name": "string",
    "Position": "number",
    "CustomUse": "bool",
    "IsDelete": "number",
    "IsExtend": "number",
    "remark": "string",
    "DefaultValue": "string",
    "EnumId": "string"
  },
  "Disabled": "bool",
  "MadeDate": "date",
  "AccountDate": {

    "Code": "string",
    "Name": "string",
    "Position": "number",
    "CustomUse": "bool",
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
    "CustomUse": "bool",
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
    "CustomUse": "bool",
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
  "IsWeakType": "bool",
  "AliName": "string",
  "Status": "number",
  "EnableHasChanged": "bool",
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
  "RecordChange": "bool",
  "InnerPropInParentRecure": "string",

  "CaseSensitive": "bool",
  "RecordDynamicNullValue": "bool",
  "data": "object"
})
