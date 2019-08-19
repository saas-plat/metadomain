const {
  env,
  Event,
  RuleSet,
  Repository,
  MetaEntity,
  BaseData,
  BaseService
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');

describe('基础档案', () => {

  it('创建一个仓库档案，增删改仓库基础数据', async () => {
    let eventbus = [];

    const Warehouse = MetaEntity.create(BaseData, 'Warehouse', {
      "Code": {
        type: "string",
        required: true // 必录
      }, // 字符串
      "Name": "string",
      "Status": 'number', // 数值
      "Shorthand": "string",
      "Address": "string",
      "FloorStocks": 'bool', // 布尔
      "Memo": "string",
      "AllowZeroStockOut": 'bool',
      "Disabled": 'bool',
      "HasPosition": 'bool',
      // "Admin": 'Persion',    // 引用员工档案
      // "WarehouseType": {     // 引用 另一种写法
      //   type: 'reference',
      //   reference: 'WarehouseType'
      // },
      "MarketingOrgan": { // 对象类型
        "Code": "string",
        "Name": "string"
      },
      'TestArrayData': [{ // 对象数组
        "Code": "string",
        "Name": "string"
      }]
    }, [`rule required_onsave {
      when{
        e: Action e.name == 'save';
        o: Entity
      }
      then{
        if (!o.Name && !e.data.Name){
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
    let warehouse = await Warehouse.create();

    let onsaved = false;
    warehouse.on('saved', args => {
      onsaved = true;
      expect(args).to.be.eql({
        //id: 'ZjEQMSG2T',
        Code: '001',
        Name: 'test001',
        createBy: undefined,
        status: 'addnew'
      })
    });

    try {
      await warehouse.save({
        Name: 'test001',
      });
      expect.fail();
    } catch (err) {

    }
    expect(onsaved).to.be.false;

    try {
      await warehouse.save({
        Code: '001',
        //Name: 'test001',
      });
      expect.fail();
    } catch (err) {

    }
    expect(onsaved).to.be.false;

    await warehouse.save({
      Code: '001',
      Name: 'test001',
      //Persion: persion
    });
    //console.log(warehouse)
    await WarehouseRep.commitAll(warehouse);
    expect(onsaved).to.be.true;

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

  it('创建一个仓库档案，并引用了人员和部门档案等信息', async () => {
    let eventbus = [];
    const Department = MetaEntity.create(BaseData, "Department", {
      "Code": "string",
      "Name": "string"
    })
    const Persion = MetaEntity.create(BaseData, 'Persion', {
      "Code": "string",
      "Status": 'bool',
      "Name": "string",
      "Shorthand": "string",
      "Department": 'Department', // 引用部门
      "Position": "string",
      "IsSalesman": 'date',
      "VisitManage": 'date',
      "IsNavigator": 'date',
      "CreditDate": 'date',
      "CreditQuantity": "string",
      "ARBalance": 'number',
      "APBalance": 'number',
      "AutoCreateOperator": 'date',
      "UserGroup": "string",
      "Disabled": 'date',
      "Birthday": 'date',
      "NativePlace": "string",
      "Education": "string",
      "IdentificationType": "string",
      "IdentityNo": "string",
      "OfficePhoneNo": "string",
      "FamilyPhoneNo": "string",
      "MobilePhoneNo": "string",
      "EmailAddr": "string",
      "Qqcode": "string",
      "MsnAddr": "string",
      "UuNo": "string",
      "PostCode": "string",
      "PostAddr": "string"
    });
    const WarehouseType = MetaEntity.create(BaseData, 'WarehouseType', {
      "Code": "string",
      "Name": "string"
    });
    const Warehouse = MetaEntity.create(BaseData, 'Warehouse', {
      "Code": {
        type: "string",
        required: true // 必录
      }, // 字符串
      "Name": "string",
      "Status": 'number', // 数值
      "Shorthand": "string",
      "Address": "string",
      "FloorStocks": 'bool', // 布尔
      "Memo": "string",
      "AllowZeroStockOut": 'bool',
      "Disabled": 'bool',
      "HasPosition": 'bool',
      "Admin": 'Persion', // 引用员工档案
      "WarehouseType": { // 引用 另一种写法
        type: 'reference',
        src: 'WarehouseType'
      },
      "MarketingOrgan": { // 对象类型
        "Code": "string",
        "Name": "string"
      },
      'TestArrayData': [{ // 对象数组
        "Code": "string",
        "Name": "string"
      }]
    }, [], {
      on: (name, args) => {
        console.log(name, args);
        eventbus.push({
          name,
          args
        })
      }
    });

    const DepartmentRep = Repository.create(Department);
    const WarehouseTypenRep = Repository.create(WarehouseType);
    const WarehouseRep = Repository.create(Warehouse);
    const PersionRep = Repository.create(Persion);

    const reps = {
      Department: DepartmentRep,
      WarehouseType: WarehouseTypenRep,
      Warehouse: WarehouseRep,
      Persion: PersionRep,
    }

    env.getRepsitory = (entityName) => {
      return reps[entityName];
    }

    console.log('------------------------------')

    let department = await Department.create();
    await department.save({
      Code: '111',
      Name: '111'
    })

    await WarehouseRep.commitAll(department);

    console.log('------------------------------')

    let warehouseType = await WarehouseType.create();
    let persion = await Persion.create();
    await persion.save({
      "Code": "2-2",
      "Ts": "0000000000b05a3a",
      "Status": 0,
      "Name": "导购2-2",
      "Shorthand": "DG2-2",
      "Department": {
        id: department.id
      },
      "Position": null,
      "IsSalesman": false,
      "VisitManage": false,
      "IsNavigator": true,
      "CreditDate": null,
      "CreditQuantity": null,
      "ARBalance": 0,
      "APBalance": 0,
      "AutoCreateOperator": false,
      "UserGroup": null,
      "Disabled": false,
      "Birthday": new Date('2019-1-1'),
      "NativePlace": "",
      "Education": null,
      "IdentificationType": null,
      "IdentityNo": "",
      "OfficePhoneNo": null,
      "FamilyPhoneNo": null,
      "MobilePhoneNo": null,
      "EmailAddr": null,
      "Qqcode": "",
      "MsnAddr": "",
      "UuNo": "",
      "PostCode": "",
      "PostAddr": ""
    });
    await warehouseType.save({
      Code: 'type1',
      Name: 'type1'
    })
    await WarehouseRep.commitAll(persion, warehouseType);

    console.log('------------------------------')

    let warehouse = await Warehouse.create();
    await warehouse.save({
      Code: '001',
      Name: 'test001',
      Persion: {
        id: persion.id
      },
      WarehouseType: {
        id: warehouseType.id
      }
    });
    //console.log(warehouse)
    await WarehouseRep.commitAll(warehouse);

  })

})
