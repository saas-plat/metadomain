const {
  MetaTable,
  SumTable,
} = require('../../lib');

module.exports = MetaTable.create(SumTable, 'WarehouseTable', {
  ID: {
    type: 'string',
    mapping: 'id'
  },
  Name: 'string',
  Code: 'string',
  Status: 'string',
  DetailID: {
    type: 'string',
    mapping: 'detailId'
  },
  InventoryName: 'string',
  InventoryCode: 'string',
});
