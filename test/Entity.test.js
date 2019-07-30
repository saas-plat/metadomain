const {
  Event,
  RuleSet,
  Repository,
  MetaEntity,
  BaseData
} = require('../lib');

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
    }, [`rule code_required_onsave {
      when{
        e: Event e.name == 'save';
        saved: Object arg.$name == 'saved'
      }
      then{
        if (!saved.Code){
          return new Error('仓库编码不能为空')
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

    const WarehouseRep = Repository.create(Warehouse);
    let warehouse = Warehouse.create();
    await warehouse.save({
      Name: 'test001',
      Code: '001'
    });
    console.log(warehouse)
    await WarehouseRep.commitAll(warehouse);

    warehouse = await WarehouseRep.get(warehouse.id);
    expect(warehouse).to.not.be.null;
    await exists.save({
      Address: 'xxxxxxxxxxxxxxxxxx',
    });
    await WarehouseRep.commitAll(warehouse);

    warehouse = await WarehouseRep.find(warehouse.id);
    expect(warehouse.Name).to.be.eql('test001');
    expect(warehouse.Code).to.be.eql('001');
    expect(warehouse.Address).to.be.eql('xxxxxxxxxxxxxxxxxx');
    warehouse.delete();
    await WarehouseRep.commitAll(warehouse);

    expect(eventbus.length).to.be.eql(3);
  })

  it('创建部门档案，添加部门分类和部门数据', async () => {

    // const Department = MetaEntity.create(BaseData, 'Department', {
    //   "ID":'int',
    //   "Code":'string',
    //   "Name":'string',
    //   "StoreType_Name":'string',
    //   "Person_Name":'string',
    //   "Warehouse_Name":'string',
    //   "Department_Name":'string',
    //   "District_Name":'string',
    //   "CashShieldNum":'int',
    //   "Customer_Name":'string',
    //   "Person_id":'int',
    //   "Warehouse_id":'int',
    //   "Department_id":'int',
    //   "Customer_id":'int',
    //   "District_id":'int'
    // }, handleActionRule, handleCreated);

  })

  it('创建采购订单，保存、审核生效、生成进货单，保存审核', async () => {

  })

})
