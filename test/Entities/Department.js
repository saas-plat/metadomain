const {
  MetaEntity,
  LevelData,
} = require('../../lib');

// 订单
module.exports = MetaEntity.create(LevelData, 'Department', {
  "Code": 'string',
  "Name": 'string',
  "StoreType_Name": 'string',
  "Person_Name": 'string',
  "Warehouse_Name": 'string',
  "Department_Name": 'string',
  "District_Name": 'string',
  "CashShieldNum": 'int',
  "Customer_Name": 'string',
  "Person_id": 'int',
  "Warehouse_id": 'int',
  "Department_id": 'int',
  "Customer_id": 'int',
  "District_id": 'int'
}, [`rule use_not_be_modify {
  when{
    a: Action a.name == 'save';
    e: Entity;
  }
  then{

  }
}`]);
