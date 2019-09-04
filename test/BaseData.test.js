const {
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
const mongo = require('sourced-repo-mongo/mongo');

describe('基础数据结构对象', () => {

  before(async () => {
    const db = mongo.db;
    const keys = ['Warehouse3', 'Department3', 'Department4', 'Persion3', 'WarehouseType3'];
    for (const key of keys) {
      const snapshots = db.collection(key + '.snapshots');
      const events = db.collection(key + '.events');
      if (await events.count() > 0) {
        await events.deleteMany();
        await snapshots.deleteMany();
      }
    }
  })

  it('创建一个仓库档案，增删改仓库基础数据', async () => {
    let eventbus = [];

    const Warehouse = MetaEntity.create(BaseData, 'Warehouse3', {

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
      //   reference: 'WarehouseType3'
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
          throw new Error(t('仓库名称不能为空'))
        }
      }
    }`], {
      eventHandler: {
        on: (name, args) => {
          console.log(name, args);
          eventbus.push({
            name,
            args
          })
        }
      }
    });

    console.log('--------------1----------------')

    const WarehouseRep = await Repository.create(Warehouse);
    let warehouse = await Warehouse.create({
      createBy: 'user1',
    });

    let onsaved = false;
    warehouse.on('saved', args => {
      onsaved = true;
      //console.log(args)
      expect(args).to.include({
        //id: 'ZjEQMSG2T',
        Code: '001',
        Name: 'test001',
        // status 是默认值，并没有修改所以不包含
        //status: 'invalid'
      })
    });

    let err = false;
    try {
      await warehouse.save({
        Name: 'test001',
        ts: warehouse.ts
      });
      err = true;
    } catch (err) {

    }
    if (err) {
      expect.fail();
    }
    expect(onsaved).to.be.false;

    try {
      await warehouse.save({
        Code: '001',
        //Name: 'test001',
        ts: warehouse.ts
      });
      err = true;
    } catch (err) {

    }
    if (err) {
      expect.fail();
    }
    expect(onsaved).to.be.false;

    await warehouse.save({
      Code: '001',
      Name: 'test001',
      //Persion: persion,
      ts: warehouse.ts,
      updateBy: 'aaa'
    });
    //console.log(warehouse)
    await WarehouseRep.commitAll(warehouse);
    expect(onsaved).to.be.true;

    console.log('-------------2-----------------')

    warehouse = await WarehouseRep.get(warehouse.id);
    expect(warehouse).to.not.be.null;
    await warehouse.save({
      Address: 'xxxxxxxxxxxxxxxxxx',
      NONONO: '111',
      ts: warehouse.ts,
      updateBy: 'aaa'
    });
    await WarehouseRep.commitAll(warehouse);

    console.log('--------------3----------------')

    warehouse = await WarehouseRep.get(warehouse.id);
    expect(warehouse.Name).to.be.eql('test001');
    //expect(warehouse.Code).to.be.eql('001');
    expect(warehouse.Address).to.be.eql('xxxxxxxxxxxxxxxxxx');
    expect(warehouse.NONONO).to.be.undefined;
    await warehouse.delete({
      ts: warehouse.ts
    });
    await WarehouseRep.commitAll(warehouse);

    expect(eventbus.map(({
      name,
      args
    }) => {
      const {
        // 这些都是动态值排除
        id,
        updateAt,
        createAt,
        deleteAt,
        ts,
        ...other
      } = args;
      return {
        name,
        args: other
      };
    })).to.be.eql([{
      args: {
        // "createAt": [Date: 2019-08-20T07:00:30.126Z]
        "createBy": 'user1',
        "status": "invalid",
        // "ts": "1566284430126"
        // "updateAt": [Date: 2019-08-20T07:00:30.126Z]
        "createBy": 'user1',
      },
      name: "created"
    }, {
      name: 'saved',
      args: {
        //id: 'ZjEQMSG2T',
        Code: '001',
        Name: 'test001',
        updateBy: 'aaa'
      }
    }, {
      name: 'saved',
      args: {
        //id: 'ZjEQMSG2T',
        Address: 'xxxxxxxxxxxxxxxxxx',
        updateBy: 'aaa'
      }
    }, {
      name: 'deleted',
      args: {
        //id: 'ZjEQMSG2T',
        status: 'abandoned',
        deleteBy: null
      }
    }]);
  })

  it('创建一个仓库档案，并引用了人员和部门档案等信息', async () => {
    let eventbus = [];
    const Department = MetaEntity.create(BaseData, "Department3", {
      "Code": "string",
      "Name": "string"
    })
    const Persion = MetaEntity.create(BaseData, 'Persion3', {
      "Code": "string",
      "Status": 'bool',
      "Name": "string",
      "Shorthand": "string",
      "Department": 'Department3', // 引用部门
      "Position": "string",
      "IsSalesman": 'bool',
      "VisitManage": 'bool',
      "IsNavigator": 'bool',
      "CreditDate": 'date',
      "CreditQuantity": "string",
      "ARBalance": 'number',
      "APBalance": 'number',
      "AutoCreateOperator": 'bool',
      "UserGroup": "string",
      "Disabled": 'bool',
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
    const WarehouseType = MetaEntity.create(BaseData, 'WarehouseType3', {
      "Code": "string",
      "Name": "string"
    });
    const Warehouse = MetaEntity.create(BaseData, 'Warehouse4', {
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
      "Admin": 'Persion3', // 引用员工档案
      "WarehouseType": { // 引用 另一种写法
        type: 'reference',
        src: 'WarehouseType3'
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

    const DepartmentRep = await Repository.create(Department);
    const WarehouseTypenRep = await Repository.create(WarehouseType);
    const WarehouseRep = await Repository.create(Warehouse);
    const PersionRep = await Repository.create(Persion);

    const reps = {
      Department3: DepartmentRep,
      WarehouseType3: WarehouseTypenRep,
      Warehouse4: WarehouseRep,
      Persion3: PersionRep,
    }

    const getRepsitory = (entityName) => {
      return reps[entityName];
    }

    console.log('------------------------------')

    let department = await Department.create();
    await department.save({
      Code: '111',
      Name: '111',
      updateBy: 'aaa',
      ts: department.ts
    })

    await WarehouseRep.commitAll(department);

    console.log('------------------------------')

    let warehouseType = await WarehouseType.create();
    let persion = await Persion.create();
    await persion.save({
      "Code": "2-2",
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
      "PostAddr": "",
      updateBy: 'aaa',
      ts: persion.ts
    });
    await warehouseType.save({
      Code: 'type1',
      Name: 'type1',
      updateBy: 'aaa',
      ts: warehouseType.ts
    })
    await WarehouseRep.commitAll(persion, warehouseType);

    console.log('------------------------------')

    let warehouse = await Warehouse.create();
    await warehouse.save({
      Code: '001',
      Name: 'test001',
      updateBy: 'aaa',
      Persion3: {
        id: persion.id
      },
      WarehouseType3: {
        id: warehouseType.id
      },
      ts: warehouse.ts
    });
    //console.log(warehouse)
    await WarehouseRep.commitAll(warehouse);

  })

})
