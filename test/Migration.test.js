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
    const keys = ['Department2', 'Warehouse2'];
    for (const key of keys) {
      const snapshots = db.collection(key + '.snapshots');
      const events = db.collection(key + '.events');
      if (await events.count() > 0) {
        await events.drop();
        await snapshots.drop();
      }
    }
    const tkeys = ['DataTable2'];
    for (const key of tkeys) {
      const tables = db.collection(key);
      if (await tables.count() > 0) {
        await tables.drop();
      }
    }
  })

  const scope = 'test001'

  it('实体字段修改，增加、删除、更新类型', async () => {

    // 创建初始数据
    const Department2 = MetaEntity.create(BaseData, "Department2", {
      "Code": "string",
      "Name": "string"
    })
    const Warehouse2 = MetaEntity.create(BaseData, "Warehouse2", {
      "Code": "string",
      "Name": "string"
    })
    const DepartmentRep = await Repository.create(Department2, scope);
    const WarehouseRep = await Repository.create(Warehouse2, scope);
    const d = await Department2.create();
    await d.save({
      Code: '111',
      Name: 'aaaaaaaaaa',
      ts: d.ts,
      updateBy: 'ccc'
    });
    const d2 = await Department2.create();
    await d2.save({
      Code: '222',
      Name: 'bbbbbbbb',
      ts: d2.ts,
      updateBy: 'ccc'
    });
    const d3 = await Warehouse2.create();
    await d3.save({
      Code: 'qqqq',
      Name: 'ccccccccc',
      ts: d3.ts,
      updateBy: 'ccc'
    });
    await DepartmentRep.commitAll(d, d2, d3);

    // 修改schame
    const Department2_v2 = MetaEntity.create(BaseData, "Department2", {
      "Code": "number",
      "Name2": "string"
    }, null, {
      version: 'v2'
    })

    // 给每个实体的event进行迁移， 每个实体可以写一个升级脚本
    // 通常对一个组织下的所有实体开始升级，升级时需要锁定数据提交
    const migration = new Migration();
    await db.lock(scope);
    await migration.up(
      [Department2_v2, Warehouse2], [`rule update_sciprt1{
      when{
        e: Action e.name == 'Department2.migrate' && e.event == 'saved';
      }
      then{
          e.data.Name2 = e.data.Name+'xxxxx';
          console.log('e.data.Name2 =',e.data.Name2);
      }
    }`]);
    await db.unlock(scope);

    // 检查升级效果
    const DepartmentRep_v2 = await Repository.create(Department2_v2, scope);
    const d12 = await DepartmentRep_v2.get(d.id);
    expect(d12.Code).to.be.eql(111);
    expect(d12.Name2).to.be.eql('aaaaaaaaaaxxxxx');
  })

  it('数据表字段修改和数据迁移', async () => {
    const DataTable = MetaTable.create(BaseTable, 'DataTable2', {
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
    });

    const dt1 = new DataTable({
      id: 'aaaa',
      Name: 'test001',
      Str1: 'abcxyz',
      Bool1: true,
      Obj1: {
        Code: 'eeeeeeeeee',
        Name: 'nnnn'
      },
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
      'Details': [{ // 子表
        "REF": {
          "Name": "string"
        }
      }]
    }, null, {
      version: 'v2'
    })

    const migration = new DataMigration();
    await db.lock(scope);
    await migration.up(
      [DataTable2], [`rule update_sciprt1{
      when{
        e: Action e.name == 'DataTable2.migrate' ;
        d: Document  ;
      }
      then{
          console.log('===>',e.data);
          d.Code = e.data.Name;
      }
    }`]);
    await db.unlock(scope);

    // 检查升级效果
    const d12 = await DataTable2.findOne({
      id: dt1.id
    });
    expect(d12.Code).to.be.eql('test001');
    expect(d12.toObject().Details[0]).to.be.eql({
      "REF": {
        "Name": "aaaa"
      }
    });

  })

  it('升级时锁定禁止提交和修改数据表', async () => {})

  it('实体和数据表对象可以缓存，在版本更新后可以重建', async () => {})

})
