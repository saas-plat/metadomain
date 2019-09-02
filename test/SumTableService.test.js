const {
  SumTableService
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');

describe('明细汇总数据服务', () => {

  it('将业务实体按照明细维度进行保存，查询', async () => {

    const SaleOrderSumTable = require('./Tables/SaleOrderSumTable');

    const sumservice = new SumTableService(SaleOrderSumTable);
    await sumservice.onSaved({
      ID: 'aaaa',
      Name: 'test001',
      Code: '0001',
      Details: [{
        ID: '001',
        Name: 'aaaaaaaa'
      }, {
        ID: '002',
        Name: 'bbbbbbbbbb'
      }, {
        ID: '003',
        Name: 'cccccccccccccc'
      }],
      Ts: new Date().getTime().toString()
    });

    await sumservice.onSaved({
      ID: 'aaaa',
      Details: [{
          ID: '001',
        }, {
          ID: '002',
          Name: 'bbbbbbbbbb22222222'
        }
        // 003被删除
      ],
      Ts: new Date().getTime().toString()
    });

  });

})
