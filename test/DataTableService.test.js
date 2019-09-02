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
   await mongoose.connection.dropCollection('WarehouseTable');
  })

  it('接收业务对象(简单对象、层级关系对象、带分类列表对象、复合对象)事件生成数据对象，可以查询数据', async () => {
    const WarehouseTable = require('./Tables/WarehouseTable');
    const service = new DataTableService(WarehouseTable);
    await service.onSaved({
      ID: 'aaaa001',
      Name: 'test001',
      Code: '0001',
      Ts: new Date().getTime().toString()
    });
    let doc = await WarehouseTable.findOne({
      ID: 'aaaa001'
    });
    expect(doc.Name).to.be.eql('test001');
    await service.onStatusUpdated({
      ID: 'aaaa001',
      Status: 'ok',
      Ts: new Date().getTime().toString()
    });
    doc = await WarehouseTable.findOne({
      ID: 'aaaa001'
    });
    expect(doc.Status).to.be.eql('ok');
    await service.onDeleted({
      ID: 'aaaa001',
    });
    doc = await WarehouseTable.findOne({
      ID: 'aaaa001'
    });
    expect(doc).to.be.null;
  });

  it('对于单据对象，明细表可以增删改，查询可以按照明细查询分页', async () => {

  })

})
