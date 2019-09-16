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
    await mongoose.connection.db.collection('SaleOrderTable').deleteMany();
  })

  it('实体数据对象可以进行引用保存和自动填充查询', async () => {
    const WarehouseTable = require('./Tables/WarehouseTable')();
    const BankAccountTable = require('./Tables/BankAccountTable')();
    const SaleOrderTable = require('./Tables/SaleOrderTable')({
      populateReferences: true
    });
    const warehouseService = new DataTableService(WarehouseTable);
    const warehouse = await warehouseService.onSaved({
      ID: 'aaaa001',
      Name: 'test001',
      Code: '0001',
    });
    const bankAccountTableService = new DataTableService(BankAccountTable);
    const bankAccount = await bankAccountTableService.onSaved({
      id: 'bbb002',
      Name: 'bbbbb',
      Code: '002',
    });
    const models = {
      WarehouseTable,
      SaleOrderTable,
      BankAccountTable
    }
    const service = new DataTableService(SaleOrderTable);
    await service.onSaved({
      id: 'aaaa001',
      Name: 'test001',
      Code: '0001',
      Warehouse: {
        ID: warehouse.ID
      },
      Subscriptions: [{
        BankAccount: {
          id: bankAccount.id
        }
      }]
    });
    let doc = await SaleOrderTable.findOne({
      id: 'aaaa001'
    });
    let docs = await SaleOrderTable.find({
      id: 'aaaa001'
    });
    // console.log(doc.toObject())
    expect(docs.length).to.be.eql(1);
    expect(doc.toObject()).to.be.eql({
      id: 'aaaa001',
      Name: 'test001',
      Code: '0001',
      "DataSource": {},
      "DirectCallSource": {},
      Warehouse: {
        ID: warehouse.ID,
        "Code": "0001",
        "Name": "test001",
      },
      Subscriptions: [{
        BankAccount: {
          id: bankAccount.id,
          "Code": "002",
          "Name": "bbbbb",
        }
      }]
    });
  })

  it('测试不同租户相同数据对象，后加装的租户数据对象不会填充成【之前】租户的数据', async () => {
    const exeScope = async (ns, version) => {
      const WarehouseTable = require('./Tables/WarehouseTable')({
        ns,
        version,
      });
      const BankAccountTable = require('./Tables/BankAccountTable')({
        ns,
        version,
      });
      const SaleOrderTable = require('./Tables/SaleOrderTable')({
        populateReferences: true,
        getReferenceVersion: () => version,
        version,
        ns
      });
      const warehouseService = new DataTableService(WarehouseTable);
      const bankAccountTableService = new DataTableService(BankAccountTable);
      const service = new DataTableService(SaleOrderTable);
      const warehouse = await warehouseService.onSaved({
        ID: ns+'001',
        Name: 'test001',
        Code: '0001',
      });
      const bankAccount = await bankAccountTableService.onSaved({
        id: ns+'002',
        Name: 'bbbbb',
        Code: '002',
      });
      await service.onSaved({
        id: ns+'001',
        Name: 'test001',
        Code: '0001',
        Warehouse: {
          ID: warehouse.ID
        },
        Subscriptions: [{
          BankAccount: {
            id: bankAccount.id
          }
        }]
      });
    }

    await exeScope('aaa', '1');
    await exeScope('bbb', '1');
    await exeScope('aaa', '2');
    await exeScope('bbb', '2');

    const SaleOrderTable = require('./Tables/SaleOrderTable')({
      populateReferences: true,
      getReferenceVersion: () => version,
      version:'1',
      ns:'bbb'
    });
    let docs = await SaleOrderTable.find({
      id: 'bbb001'
    });
    expect(doc.toObject()).to.be.eql({
      id: 'bbb001',
      Name: 'test001',
      Code: '0001',
      "DataSource": {},
      "DirectCallSource": {},
      Warehouse: {
        ID: 'bbb001',
        "Code": "0001",
        "Name": "test001",
      },
      Subscriptions: [{
        BankAccount: {
          id: 'bbb002',
          "Code": "002",
          "Name": "bbbbb",
        }
      }]
    });
  })

  it('对于单据对象，明细表可以增删改，查询可以按照明细查询分页', async () => {

  })

})
