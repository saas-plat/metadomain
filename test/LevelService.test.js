const {
  Repository,
  LevelService,
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');
const mongo = require('sourced-repo-mongo/mongo');
const {
  wait
} = require('./util');

describe('层级数据', () => {

  before(async () => {
    console.log('wait...')
    //await wait(1000);

    const db = mongo.db;
    const snapshots = db.collection('Department.snapshots');
    const events = db.collection('Department.events');
    if ((await events.count()) > 0) {
      console.log('-------clear-------');
      await events.deleteMany();
      await snapshots.deleteMany();
    }
  })

  it('创建部门档案，添加部门分类和部门数据', async () => {

    const Department = require('./entities/Department');
    const DepartmentRep = await Repository.create(Department);

    const user = {
      id: 'xxxx'
    };

    const reps = {
      Department: DepartmentRep,
    }

    const levelService = new LevelService(Department, {
      user,
    }, (entityName) => reps[entityName], {
      parent: 'Department'
    });

    const dats = await levelService.save({
      Code: '001',
      Name: '销售部',
    }, {
      Code: '003',
      Name: '市场部',
    });
    await DepartmentRep.commitAll();

    console.log('-----------2--------------')
    await levelService.save({
      Code: '001001',
      Name: '销售一部',
      Department: {
        id: dats[0].id
      }
    }, {
      Code: '002002',
      Name: '销售二部',
      Department: {
        id: dats[0].id
      }
    });
    await DepartmentRep.commitAll();

    console.log('-----------3--------------')
    let depall = await DepartmentRep.getAll();
    //console.log(depall);
    expect(depall.map(it => it.Name)).to.have.members(['销售部', '市场部', '销售一部', '销售二部']);

    console.log('-----------4--------------')
    await levelService.delete(dats[1].id);
    await DepartmentRep.commitAll();

      console.log('-----------5--------------')
    depall = await DepartmentRep.getAll();
    //console.log(depall);
    expect(depall.filter(it => it.status !== 'abandoned').map(it => it.Name)).to.have.members(['销售部', '销售一部', '销售二部']);
  })
})
