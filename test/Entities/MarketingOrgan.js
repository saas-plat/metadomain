const {
  MetaEntity,
  BaseData,
} = require('../../lib');

module.exports = MetaEntity.create(BaseData, 'MarketingOrgan', {
  "Disabled": "bool",
  "Depth": "number",
  "CreatedTime": "date",
  "SequenceNumber": "number",
  "Parent": "string",
  "IsEndNode": "bool",
  "IsHeaderQuaters": "bool",
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
