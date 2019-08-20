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
const mongo = require('sourced-repo-mongo/mongo');

describe('层级数据', () => {



  before(async () => {
    const db = mongo.db;
    const snapshots = db.collection('Department.snapshots');
    const events = db.collection('Department.events');
    if (await events.count() > 0) {
      await events.drop();
      await snapshots.drop();
    }
  })

  it('创建部门档案，添加部门分类和部门数据', async () => {

    const Department = require('./entities/Department');
    const DepartmentRep = Repository.create(Department);

    const user = {
      id: 'xxxx'
    };

    const reps = {
      Department: DepartmentRep,
    }

    const levelService = new LevelService(Department, {
      user,
    }, (entityName) => reps[entityName]);

    const dats = await levelService.save({
      Code: '001',
      Name: '销售部',
    }, {
      Code: '003',
      Name: '市场部',
    });
    await levelService.save({
      Code: '001001',
      Name: '销售一部',
      pid: dats[0].id
    }, {
      Code: '002002',
      Name: '销售二部',
      pid: dats[0].id
    });
    await levelService.delete(dats[1].id);
    const depall = await util.promisify(DepartmentRep.getAll)();
    console.log(depall);
    expect(depall).to.be.eql([]);
  })
})
