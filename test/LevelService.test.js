const {
  Event,
  RuleSet,
  Repository,
  MetaEntity,
  BaseData,
  LevelService,
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

describe('层级数据', () => {



  it('创建部门档案，添加部门分类和部门数据', async () => {

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
    }, [`rule use_not_be_modify {
      when{
        evt: Event e.name == 'save';
        a: Object d.$name == 'saved';
        e: Entity
      }
      then{

      }
    }`]);

    const user = {
      id: 'xxxx'
    };
    const DepartmentRep = Repository.create(Department);

    // 清理数据
    await DepartmentRep.events.drop();
    await DepartmentRep.snapshots.drop();

    const levelService = new LevelService({
      data: DepartmentRep,
      user,
    });

    const dats = await levelService.saveData({
      Code: '001',
      Name: '销售部',
    }, {
      Code: '003',
      Name: '市场部',
      cid: cn.id
    });
    const dats = await levelService.saveData({
      Code: '001001',
      Name: '销售一部',
      pid: dats[0].id
    }, {
      Code: '002002',
      Name: '销售二部',
      pid: dats[0].id
    });
    await levelService.deleteData(dats[1].id);
    const getAllDepartment = util.promisify(DepartmentRep.getAll);
    const depall = await getAllDepartment();
    console.log(depall);
    expect(depall).to.be.eql([]);
  })


})
