const {
  MetaTable,
  SumTable,
} = require('../../lib');

module.exports = MetaTable.createModel(SumTable, 'SaleOrderSumTable', {
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
