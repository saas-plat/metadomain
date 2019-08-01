const {
  Event,
  RuleSet,
  Repository,
  MetaEntity,
  BaseData,
  CategoryDataService,
  LevelDataService,
  VoucherService,
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');

before(async () => {
  await Repository.connect();
})

after(async () => {
  await Repository.close();
})

describe('基础档案', () => {

  it('创建一个仓库档案，增删改仓库基础数据', async () => {
    let eventbus = [];
    const Warehouse = MetaEntity.create(BaseData, 'Warehouse', {
      "Code": 'string',
      "Name": 'string',
      "Name": 'string',
      "Address": 'string',
      "InvolveATP": 'bool',
      "hasPosition": 'bool',
      "Memo": 'string',
      "Disabled": 'bool',
      "AllowZeroStockOut": 'bool',
      "MarketingOrgan_Name": 'string',
      "MarketingOrgan_id": 'int',
      "Admin_name": 'string',
      "Admin_id": 'int'
    }, [`rule required_onsave {
      when{
        e: Event e.name == 'save';
        d: Object d.$name == 'saved';
        o: Entity
      }
      then{
        if (!o.Name && !d.Name){
          throw new Error(t('仓库编码不能为空'))
        }
      }
    }`], {
      on: (name, args) => {
        console.log(name, args);
        eventbus.push({
          name,
          args
        })
      }
    });

    console.log('------------------------------')

    const WarehouseRep = Repository.create(Warehouse);
    let warehouse = Warehouse.create();
    try {
      await warehouse.save({
        Code: '001',
        //Name: 'test001',
      });
      expect.fail();
    } catch (err) {

    }
    await warehouse.save({
      Code: '001',
      Name: 'test001',
    });
    //console.log(warehouse)
    await WarehouseRep.commitAll(warehouse);

    console.log('------------------------------')

    warehouse = await WarehouseRep.get(warehouse.id);
    expect(warehouse).to.not.be.null;
    await warehouse.save({
      Address: 'xxxxxxxxxxxxxxxxxx',
      NONONO: '111',
    });
    await WarehouseRep.commitAll(warehouse);

    console.log('------------------------------')

    warehouse = await WarehouseRep.get(warehouse.id);
    expect(warehouse.Name).to.be.eql('test001');
    //expect(warehouse.Code).to.be.eql('001');
    expect(warehouse.Address).to.be.eql('xxxxxxxxxxxxxxxxxx');
    expect(warehouse.NONONO).to.be.undefined;
    await warehouse.delete();
    await WarehouseRep.commitAll(warehouse);

    expect(eventbus.map(({
      name,
      args
    }) => {
      const {
        id,
        ...other
      } = args;
      return {
        name,
        args: other
      };
    })).to.be.eql([{
      name: 'saved',
      args: {
        //id: 'ZjEQMSG2T',
        Code: '001',
        Name: 'test001',
        createBy: undefined,
        status: 'addnew'
      }
    }, {
      name: 'saved',
      args: {
        //id: 'ZjEQMSG2T',
        Address: 'xxxxxxxxxxxxxxxxxx',
        updateBy: undefined
      }
    }, {
      name: 'deleted',
      args: {
        //id: 'ZjEQMSG2T',
        status: 'abandoned',
        deleteBy: undefined
      }
    }]);
  })

 
})
