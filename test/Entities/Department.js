const {
  MetaEntity,
  LevelData,
} = require('../../lib');

// 订单
module.exports = MetaEntity.create(LevelData, 'Department', {
  "Code": 'string',
  "Name": 'string',
  // "StoreType_Name": 'string',
  // "Person_Name": 'string',
  // "Warehouse_Name": 'string',
  // "Department_Name": 'string',
  // "District_Name": 'string',
  // "CashShieldNum": 'int',
  // "Customer_Name": 'string',
  "Person": 'Person',
  "Warehouse": 'Warehouse',
  "Department": 'Department',  // 父部门
  "Customer": 'Customer',
  "District": 'District'
}, [`rule use_not_be_modify {
  when{
    a: Action a.name == 'save';
    e: Entity;
  }
  then{

  }
}`]);
