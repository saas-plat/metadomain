const {
  MetaEntity,
  CategoryTree,
} = require('../../lib');

module.exports = MetaEntity.createModel(CategoryTree, 'PartnerCategory', {
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},

  "Parent": {
    type: 'reference',
    src: 'PartnerCategory',
    mapping: 'parent'
  },

  "Subs": {
    type: 'array',
    subtype: 'PartnerCategory',
    mapping: 'childs'
  },

  "Partners": {
    type: 'array',
    subtype: 'Partner',
    mapping: 'details'
  },

  "IsEndNode": "boolean",
  "MadeDate": "date",
  "CreatedTime": "date",
  "Depth": "number",
  "Disabled": "boolean",

  "InId": "string",
  "MarketingOrgan": "string",
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

  "Updated": "date",
  "UpdatedBy": "string",
  "InnerSearchLevel": "number",
  "RecordChange": "boolean",
  "InnerPropInParentRecure": "string",

  "CaseSensitive": "boolean",
  "RecordDynamicNullValue": "boolean",
  "data": "object"

}, [`rule has_date_cant_be_delete {
  when{
    e: Action e.name == 'delete';
    o: Entity
  }
  then{

  }
}`]);
