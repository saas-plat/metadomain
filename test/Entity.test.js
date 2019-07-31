const {
  Event,
  RuleSet,
  Repository,
  MetaEntity,
  BaseData
} = require('../lib');
const {
  expect
} = require('chai');

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
        //Name: 'test001',
      });
      expect.fail();
    } catch (err) {

    }
    await warehouse.save({
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
        //  Code: '001',
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

  it('创建部门档案，添加部门分类和部门数据', async () => {

    const DepartmentCategory = MetaEntity.create(CategoryData, 'DepartmentCategory', {

    }, [`rule has_date_cant_be_delete {
      when{
        evt: Event e.name == 'delete';
        e: Entity
      }
      then{

      }
    }`]);

    const Department = MetaEntity.create(BaseData, 'Department', {
      "Code": 'string',
      "Name": 'string',
      "StoreType_Name": 'string',
      "Person_Name": 'string',
      "Warehouse_Name": 'string',
      "Department_Name": 'string',
      "District_Name": 'string',
      "CashShieldNum": 'int',
      "Customer_Name": 'string',
      "Person_id": 'int',
      "Warehouse_id": 'int',
      "Department_id": 'int',
      "Customer_id": 'int',
      "District_id": 'int'
    }, [`rule not_end_cant_be_add {
      when{
        evt: Event e.name == 'save';
        a: Object d.$name == 'saved';
        e: Entity
      }
      then{

      }
    }`]); 

    const DepartmentRep = Repository.create(Department);
    let department = Department.create();

    await department.save({
      Name: 'test001',
    });
    //console.log(warehouse)
    await DepartmentRep.commitAll(department);

  })

  it('创建采购订单，保存同时生成订金的付款单 ', async () => {

  })
  it('采购订单，保存审核生效、生成进货单，保存审核', async () => {

  })

  it('实体字段修改，增加、删除、更新类型', async () => {

  })
})
