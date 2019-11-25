const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'MarketingOrgan', {
  "Disabled": "boolean",
  "Depth": "number",
  "CreatedTime": "date",
  "SequenceNumber": "number",
  "Parent": "string",
  "IsEndNode": "boolean",
  "IsHeaderQuaters": "boolean",
  "InId": "string",
  "WeakTypeDtoName": "string",
  "DtoClassName": "string",
  "IsWeakType": "boolean",
  "AliName": "string",
  "Status": "number",
  "EnableHasChanged": "boolean",
  "ChangedProperty": ["string"],
  "DynamicPropertyKeys": ["string"],
  "DynamicPropertyValues": ["string"],

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
