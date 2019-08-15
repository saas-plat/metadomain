const {
  SumTableService
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');
const SaleOrderSumTable = require('./Tables/SaleOrderSumTable');

describe('明细汇总数据服务', () => {

  it('将业务实体按照明细维度进行保存，查询', async () => {
    const sumservice = new SumTableService(SaleOrderSumTable);
    await sumservice.onSaved({
      id: 'aaaa',
      Name: 'test001',
      Code: '0001',
      details: [{
        id: '001',
        Name: 'aaaaaaaa'
      },{
        id: '002',
        Name: 'bbbbbbbbbb'
      },{
        id: '003',
        Name: 'cccccccccccccc'
      }]
      ts: new Date().getTime().toString()
    });

    await sumservice.onSaved({
      id: 'aaaa',
      details: [{
        id: '001',
      },{
        id: '002',
        Name: 'bbbbbbbbbb22222222'
      }
      // 003被删除
     ]
      ts: new Date().getTime().toString()
    });

  });

})
