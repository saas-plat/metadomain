const {
  DataTableService
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');

describe('数据表存储服务', () => {

  it('接收业务对象(简单对象、层级关系对象、带分类列表对象、复合对象)事件生成数据对象，可以查询数据', async () => {
    const WarehouseTable = require('./Tables/WarehouseTable');
    const service = new DataTableService(WarehouseTable);
    service.onSaved({
      id: 'aaaa',
      Name: 'test001',
      Code: '0001',
      ts: new Date().getTime().toString()
    });
    let table = WarehouseTable.findOne({
      id: 'aaaa'
    });
    expect(table.Name).to.be.eql('test001');
    await service.onStatusUpdated({
      id: 'aaaa',
      status: 'ok',
      ts: new Date().getTime().toString()
    });
    table = WarehouseTable.findOne({
      id: 'aaaa'
    });
    expect(table.status).to.be.eql('ok');
    await service.onDeleted({
      id: 'aaaa',
    });
    table = WarehouseTable.findOne({
      id: 'aaaa'
    });
    expect(table).to.be.null;
  });

  it('对于单据对象，明细表可以增删改，查询可以按照明细查询分页', async () => {

  })

})
