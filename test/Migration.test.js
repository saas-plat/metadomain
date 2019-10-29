const {
  db,
  MetaEntity,
  BaseData,
  Repository,
  Migration,
  MetaTable,
  BaseTable,
  DataMigration
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');
const mongo = require('sourced-repo-mongo/mongo');

describe('数据迁移', () => {

  before(async () => {
    const db = mongo.db;
    const keys = [ns + '.Department2', ns + '.Warehouse2'];
    for (const key of keys) {
      const snapshots = db.collection(key + '.snapshots');
      const events = db.collection(key + '.events');
      if (await events.count() > 0) {
        await events.deleteMany();
        await snapshots.deleteMany();
      }
    }
    const tkeys = [ns + '.DataTable2'];
    for (const key of tkeys) {
      const tables = db.collection(key + '.tables');
      if (await tables.count() > 0) {
        await tables.deleteMany();
      }
    }
  })

  const ns = 'test001'

  it('实体字段修改，增加、删除、更新类型', async () => {

    // 创建初始数据
    const Department1 = MetaEntity.create(BaseData, "Department2", {
      "Code": "string",
      "Name": "string"
    })
    const Warehouse1 = MetaEntity.create(BaseData, "Warehouse2", {
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
    const Department2 = MetaEntity.create(BaseData, "Department2", {
      "Code": "number",
      "Name2": "string"
    }, null, {
      version: 'v2'
    })
    const Department2Rep = await Repository.create(Department2, {
      ns
    });

    // 给每个实体的event进行迁移， 每个实体可以写一个升级脚本
    // 通常对一个组织下的所有实体开始升级，升级时需要锁定数据提交
    const migration = new Migration([Department1Rep, WarehouseRep], [Department2Rep, WarehouseRep]);
    await db.lock(ns);
    await migration.up([`rule update_sciprt1{
      when{
        e: Action e.name == 'Department2.migrate' && e.event == 'saved';
        d: Event
      }
      then{
          d.Name2 = e.data.Name+'xxxxx';
          console.log('d.Name2 =', d.Name2);
      }
    }`]);
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

  it('数据表字段修改和数据迁移', async () => {
    const DataTable1 = MetaTable.create(BaseTable, 'DataTable2', {
      "id": "string",
      "Name": "string",
      "Str1": {
        type: 'string',
      },
      "Date": "date",
      "Value": {
        type: 'number',
      },
      "Bool1": 'bool', // 布尔
      "Ref": 'mixed',
      "Obj1": { // 对象类型
        "Code": "string",
        "Name": "string"
      },
      'Details': [{ // 子表
        "Value": "number",
        "REF": {
          "id": "string",
          "Code": "string",
          "Name": "string"
        }
      }]
    }, null, {
      ns
    });

    const dt1 = new DataTable1({
      id: 'aaaa',
      Name: 'test001',
      Str1: 'abcxyz',
      Bool1: true,
      Obj1: {
        Code: 'eeeeeeeeee',
        Name: 'nnnn'
      },
      Value: 100,
      Ref1: {
        id: '100'
      },
      Details: [{
        REF: {
          id: 'xxxxx',
          Name: 'aaaa'
        },
        Value: 100
      }]
    });
    await dt1.save();
    expect(dt1.get('Details')).to.not.undefined;

    // 修改schame
    const DataTable2 = MetaTable.create(BaseTable, "DataTable2", {
      "id": "string",
      "Code": "string",
      "Obj1": {
        "Code": "string",
        "Name2": "string"
      },
      "Value": 'string',
      'Details': [{ // 子表
        "REF": {
          "Name": "string"
        }
      }]
    }, null, {
      ns,
      version: 'v2'
    })

    const migration = new DataMigration([DataTable1], [DataTable2]);
    await db.lock(ns);
    await migration.up([`rule update_sciprt1{
      when{
        e: Action e.name == 'DataTable2.migrate' ;
        d: Document  ;
      }
      then{
          console.log('===>',e.data);
          d.Code = e.data.Name ;
      }
    }`]);
    await db.unlock(ns);

    // 检查升级效果
    const d12 = await DataTable2.findOne({
      id: dt1.id
    });
    console.log(JSON.stringify(d12.toObject(), null, 1))
    expect(d12.Code).to.be.eql('test001');
    expect(d12.toObject().Details[0]).to.be.eql({
      "REF": {
        "Name": "aaaa"
      }
    });

  })

  it('升级时锁定禁止提交和修改数据表', async () => {})

  // it('实体和数据表对象可以缓存，在版本更新后可以重建', async () => {})

  it('实体版本更新，由一个实体拆分多个实体，或有多个实体合并成一个实体', async () => {

  })

  it('数据表更新，拆分多个表，或合并一张表', async () => {

  })

  it('备份升级失败后可以恢复正常使用', async () => {
    const Department1 = MetaEntity.create(BaseData, "Department2", {
      "Code": "string",
      "Name": "string"
    })
    const Department1Rep = await Repository.create(Department1, {
      ns
    });
    const d = await Department1.create({
      Code: '000',
      Name: 'aaaaaaaaaa'
    }, {
      ns
    });
    for (let i = 0; i < 20; i++) {
      await d.save({
        Code: '00' + i,
        ts: d.ts,
        updateBy: 'ccc'
      });
    }
    await Department1Rep.commitAll(d);

    const DataTable1 = MetaTable.create(BaseTable, "DataTable2", {
      "id": "string",
      "Code": "string",
      "Obj1": {
        "Code": "string",
        "Name2": "string"
      },
      'Details': [{ // 子表
        "REF": {
          "Name": "string"
        }
      }]
    }, null, {
      ns
    })

    // ----------- v2 ---------------
    const Department2 = MetaEntity.create(BaseData, "Department2", {
      "Code": "number",
      "Name2": "string"
    }, null, {
      version: 'v2'
    })
    const Department2Rep = await Repository.create(Department2, {
      ns
    });

    const DataTable2 = MetaTable.create(BaseTable, "DataTable2", {
      "id": "string",
      "Code": "string",
      "Obj1": {
        "Code": "string",
        "Name2": "string"
      },
      'Details': [{ // 子表
        "REF": {
          "Name": "string"
        }
      }]
    }, null, {
      ns,
      version: 'v2'
    })

    const migration = new Migration([Department1Rep], [Department2Rep]);
    await migration.backup();
    try {
      await migration.up([`rule update_sciprt1{
      when{
        e: Action e.name == 'Department2.migrate' && e.event == 'saved';
      }
      then{
         throw 'error'
      }
    }`]);
    } catch (err) {
      console.log(err)
      await migration.rollback();
    }

    const datamigration = new DataMigration([DataTable1], [DataTable2]);
    await datamigration.backup();
    try {
      await datamigration.up([`rule update_sciprt1{
      when{
        e: Action e.name == 'DataTable2.migrate';
        d: Document;
      }
      then{
        throw 'error'
      }
    }`]);
    } catch (err) {
      console.log(err)
      await datamigration.rollback();
    }

    const data = await Department1Rep.getAll();
    expect(data.length).to.equal(3);
    expect(data.map(it=>it.Code)).to.include('0019');
  })
})
