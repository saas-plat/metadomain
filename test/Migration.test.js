const {
  db,
  Event,
  MetaEntity,
  BaseData,
  Repository,
  Migration,
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');
const mongo = require('sourced-repo-mongo-hotfix/mongo');

describe('数据迁移', () => {

  before(async () => {
    const db = mongo.db;
    const keys = [ns + '.Department2', ns + '.Warehouse2'];
    for (const key of keys) {
      const snapshots = db.collection(key + '.snapshots');
      const events = db.collection(key + '.events');
      if (await events.countDocuments() > 0) {
        await events.deleteMany();
        await snapshots.deleteMany();
      }
    }
    const tkeys = [ns + '.DataTable2'];
    for (const key of tkeys) {
      const tables = db.collection(key + '.tables');
      if (await tables.countDocuments() > 0) {
        await tables.deleteMany();
      }
    }
  })

  const ns = 'test001'

  it('实体字段修改，增加、删除、更新类型', async () => {

    // 创建初始数据
    const Department1 = createModel(BaseData, "Department2", {
      "Code": "string",
      "Name": "string"
    })
    const Warehouse1 = createModel(BaseData, "Warehouse2", {
      "Code": "string",
      "Name": "string"
    })
    const Department1Rep = await Repository.create(Department1, {
      ns
    });
    const WarehouseRep = await Repository.create(Warehouse1, {
      ns
    });
    const d = await Department1.create({}, {
      ns
    });
    await d.save({
      Code: '111',
      Name: 'aaaaaaaaaa',
      ts: d.ts,
      updateBy: 'ccc'
    });
    const d2 = await Department1.create({}, {
      ns
    });
    await d2.save({
      Code: '222',
      Name: 'bbbbbbbb',
      ts: d2.ts,
      updateBy: 'ccc'
    });
    const w = await Warehouse1.create({}, {
      ns
    });
    await w.save({
      Code: 'qqqq',
      Name: 'ccccccccc',
      ts: w.ts,
      updateBy: 'ccc'
    });
    await Department1Rep.commitAll(d, d2);
    await WarehouseRep.commitAll(w);

    // 修改schame
    const Department2 = createModel(BaseData, "Department2", {
      "Code": "number",
      "Name2": "string"
    }, {
      version: 'v2'
    })
    const Department2Rep = await Repository.create(Department2, {
      ns
    });

    // 给每个实体的event进行迁移， 每个实体可以写一个升级脚本
    // 通常对一个组织下的所有实体开始升级，升级时需要锁定数据提交
    const migration = new Migration([Department1Rep, WarehouseRep], [Department2Rep, WarehouseRep]);
    await db.lock(ns);
    migration.onAction(objs => {
      if (objs.some(e => e.name === 'Department2.migrate' && e.event == 'saved')) {
        objs.find(d => d instanceof Event).data.Name2 =
          objs.find(e => e.name === 'Department2.migrate' && e.event == 'saved').data.Name + 'xxxxx';
      }
    })
    await migration.up();
    // [`rule update_sciprt1{
    //   when{
    //     e: Action e.name == 'Department2.migrate' && e.event == 'saved';
    //     d: EventData
    //   }
    //   then{
    //       d.Name2 = e.data.Name+'xxxxx';
    //       console.log('d.Name2 =', d.Name2);
    //   }
    // }`]
    await db.unlock(ns);
    // 只修改了部门的2个save事件
    expect(migration.upCounter).to.equal(2);

    // 检查升级效果
    const d12 = await Department2Rep.get(d.id);
    console.log(d12)
    expect(d12.Code).to.be.eql(111);
    expect(d12.Name).to.be.undefined;
    expect(d12.Name2).to.be.eql('aaaaaaaaaaxxxxx');
  })
 
})
