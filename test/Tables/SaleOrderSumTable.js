const {
  MetaTable,
  SumTable,
} = require('../../lib');

module.exports = MetaTable.create(SumTable, 'SaleOrderSumTable', {
  ID: {
    type: 'string',
    mapping: 'entityId'
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
