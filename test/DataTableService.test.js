const {
  DataTableService
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');
const mongoose = require('mongoose');

describe('数据表存储服务', () => {

  before(async () => {
   await mongoose.connection.db.collection('WarehouseTable').deleteMany();
  })
 

  it('对于单据对象，明细表可以增删改，查询可以按照明细查询分页', async () => {

  })

})
