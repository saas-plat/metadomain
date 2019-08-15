const {
  MetaEntity,
  BaseData,
  Repository,
  Migration
} = require('../lib');
const {
  expect
} = require('chai');
const util = require('util');

describe('数据迁移', () => {

  const scope = {
    orgid: 'test001'
  }

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
    const DepartmentRep = Repository.create(Department2, scope);
    const WarehouseRep = Repository.create(Warehouse2, scope);
    const d = Department2.create();
    await d.save({
      Code: '111',
      Name: 'aaaaaaaaaa'
    });
    const d2 = Department2.create();
    await d2.save({
      Code: '222',
      Name: 'bbbbbbbb'
    });
    const d3 = Warehouse2.create();
    await d3.save({
      Code: 'qqqq',
      Name: 'ccccccccc'
    });
    DepartmentRep.commitAll(d, d2, d3);

    // 修改schame
    const Department2_v2 = MetaEntity.create(BaseData, "Department2", {
      "Code": "number",
      "Name2": "string"
    })

    // 给每个实体的event进行迁移， 每个实体可以写一个升级脚本
    // 通常对一个组织下的所有实体开始升级，升级时需要锁定数据提交
    const migration = new Migration(scope);
    await migration.lock();
    await migration.up([Department2_v2, Warehouse2], [`rule update_sciprt1{
      when{
        e: Event e.method == 'saved' && e.type == 'Department2';
      }
      then{
          e.data.Code2 = e.data.Code+'xxxxx';
          modify(e);
      }
    }`]);
    await migration.unlock();

    // 检查升级效果
    const DepartmentRep_v2 = Repository.create(Department2_v2, scope);
    const d12 = DepartmentRep_v2.get(d.id);
    expect(d12.Code).to.be.eql(111);
    expect(d12.Name2).to.be.eql('aaaaaaaaaa');
  })

  it('数据表字段修改和数据迁移', async () => {

  })

})
