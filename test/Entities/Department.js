const {
  MetaEntity,
  LevelData,
} = require('../../lib');

// 订单
module.exports = MetaEntity.createModel(LevelData, 'Department', {
  "Code": {type:"string",mapping:'code'},
  "Name": {type:"string",mapping:'name'},
  // "StoreType_Name": 'string',
  // "Person_Name": 'string',
  // "Warehouse_Name": 'string',
  // "Department_Name": 'string',
  // "District_Name": 'string',
  // "CashShieldNum": 'int',
  // "Customer_Name": 'string',
  "Person": 'Person',
  "Warehouse": 'Warehouse',
  "Department": {
    type: 'Department',
    mapping: 'parent'
  }, // 父部门
  "Customer": 'Partner',
  "District": 'string',
  "Departments": {
    type: 'array',
    subtype: 'Department',
    mapping: 'childs'
  },
}, [`rule use_not_be_modify {
  when{
    a: Action a.name == 'save';
    e: Entity;
  }
  then{

  }
}`]);
