const {
  MetaEntity,
  CategoryTree,
} = require('../../lib');

module.exports = MetaEntity.create(CategoryTree, 'PartnerCategory', {
  "Name": "string",
  "Code": "string",

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

  "IsEndNode": "bool",
  "MadeDate": "date",
  "CreatedTime": "date",
  "Depth": "number",
  "Disabled": "bool",

  "InId": "string",
  "MarketingOrgan": "string",
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

}, [`rule has_date_cant_be_delete {
  when{
    e: Action e.name == 'delete';
    o: Entity
  }
  then{

  }
}`]);
